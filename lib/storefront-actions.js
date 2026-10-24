"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db.mjs";
import { addOrderEvent, CUSTOMER_CANCEL_STATUSES, logActivity, nextReference, priceLines, totalsFor } from "@/lib/orders.mjs";
import { getFirebaseUser, requireAccountUser } from "@/lib/session.mjs";
import { normalizeEmail } from "@/lib/password.mjs";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const text = (form, key, max = 160) => String(form.get(key) ?? "").trim().slice(0, max);

function readDetails(form) {
  const details = {
    name: text(form, "full_name", 120),
    email: normalizeEmail(text(form, "email", 160)),
    phone: text(form, "phone", 32),
    address: text(form, "address", 260),
    city: text(form, "city", 80),
    postal: text(form, "postal_code", 24),
    notes: text(form, "notes", 280),
  };
  const errors = [];
  if (details.name.length < 2) errors.push("Enter your full name.");
  if (!EMAIL.test(details.email)) errors.push("Enter a valid email address.");
  if (details.phone.replace(/\D/g, "").length < 7) errors.push("Enter a reachable phone number.");
  if (details.address.length < 8) errors.push("Enter the complete delivery address.");
  if (details.city.length < 2) errors.push("Enter your city.");
  return { details, errors };
}

// One Firebase customer row per uid so the Main Admin can list and manage shoppers.
function upsertCustomer(uid, { email = "", name = "", phone = "", picture = "", provider = "password" } = {}) {
  if (!uid) return;
  const existing = db.prepare("SELECT uid, active FROM customers WHERE uid = ?").get(uid);
  if (!existing) {
    db.prepare("INSERT INTO customers (uid, email, name, phone, picture, provider) VALUES (?, ?, ?, ?, ?, ?)")
      .run(uid, email, name, phone, picture, provider);
    return;
  }
  if (existing.active) db.prepare("UPDATE customers SET email = ?, name = ?, phone = ?, picture = ? WHERE uid = ?")
    .run(email || existing.email, name, phone, picture, uid);
}

export async function placeOrder(_previous, form) {
  const { details, errors } = readDetails(form);
  if (errors.length) return { error: errors.join(" ") };

  const customer = await getFirebaseUser();
  if (customer?.email) details.email = normalizeEmail(customer.email);
  if (customer?.name && details.name.length < 2) details.name = customer.name;

  const intent = text(form, "intent", 80) || randomUUID();
  let parsed = [];
  try {
    const raw = JSON.parse(text(form, "cart", 12000) || "[]");
    parsed = Array.isArray(raw) ? raw.slice(0, 40) : [];
  } catch {
    return { error: "Your bag could not be read. Please refresh the page and try again." };
  }
  if (!parsed.length) return { error: "Your bag is empty." };

  const { lines, problems } = priceLines(parsed.map((line) => ({ id: line.id, size: line.size, color: line.color, qty: Number(line.qty) })));
  if (problems.length) return { error: `${problems.join(" ")} Update your bag and place the order again.` };
  if (!lines.length) return { error: "None of the items in your bag are available right now." };

  const token = randomUUID().slice(0, 18);
  upsertCustomer(customer?.uid, { email: details.email, name: details.name, phone: details.phone, picture: customer?.picture || "", provider: customer?.provider || "password" });

  const byShop = new Map();
  for (const line of lines) {
    const list = byShop.get(line.shopId) || [];
    list.push(line);
    byShop.set(line.shopId, list);
  }

  const references = [];
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const [shopId, shopLines] of byShop) {
      const totals = totalsFor(shopLines);
      const order = db.prepare(
        `INSERT INTO orders (reference, shop_id, user_uid, customer_name, customer_email, customer_phone, address, city, postal_code, notes,
           status, payment_method, payment_status, subtotal, delivery_fee, discount, total, checkout_token, idempotency_key, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'cod', 'pending', ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(idempotency_key) DO NOTHING`
      ).run(nextReference(shopId), shopId, customer?.uid || "", details.name, details.email, details.phone, details.address, details.city,
        details.postal, details.notes, totals.subtotal, totals.delivery, totals.discount, totals.total, token, `${intent}:${shopId}`);

      if (!order.changes) throw new Error("already placed");

      const orderId = Number(order.lastInsertRowid);
      const insertItem = db.prepare("INSERT INTO order_items (order_id, product_id, product_name, size, color, qty, price) VALUES (?, ?, ?, ?, ?, ?, ?)");
      const takeStock = db.prepare("UPDATE inventory SET qty = qty - ? WHERE id = ? AND qty >= ?");
      for (const line of shopLines) {
        const taken = takeStock.run(line.qty, line.stockId, line.qty);
        if (!taken.changes) throw new Error(`“${line.name}” (EU ${line.size}, ${line.color}) sold out while you were checking out.`);
        insertItem.run(orderId, line.productId, line.name, line.size, line.color, line.qty, line.price);
      }
      addOrderEvent(orderId, { type: "status", actor: details.name, detail: "Order placed with Cash on Delivery" });
      references.push(orderId);
    }
    db.exec("COMMIT");
  } catch (failure) {
    db.exec("ROLLBACK");
    return { error: failure.message.includes("already placed") ? "This order was already placed. Check your order history." : failure.message };
  }

  logActivity(customer ? { id: null, name: details.name, email: details.email, role: "customer" } : { id: null, name: details.name, email: details.email, role: "guest" }, {
    action: "order.placed", entity: "orders", entityId: references.join(","), detail: `${lines.length} line(s) across ${byShop.size} shop(s)`, shopId: [...byShop.keys()][0],
  });

  redirect(`/checkout/success?token=${token}`);
}

export async function requestCancellation(form) {
  const user = await requireAccountUser("/account/orders");
  const reference = text(form, "reference", 40);
  const reason = text(form, "reason", 280);
  const order = db.prepare("SELECT * FROM orders WHERE reference = ?").get(reference);
  if (!order) return { error: "We could not find that order." };
  const email = user.email ? normalizeEmail(user.email) : "";
  if (order.user_uid !== (user.uid || "") && normalizeEmail(order.customer_email) !== email) return { error: "That order belongs to another account." };
  if (!CUSTOMER_CANCEL_STATUSES.includes(order.status)) return { error: `An order that is already ${order.status} can no longer be cancelled here. Reply to your order confirmation email or contact the shop.` };
  if (order.cancel_requested) return { error: "We already have your cancellation request for this order." };

  db.prepare("UPDATE orders SET cancel_requested = 1, cancellation_reason = ?, cancel_requested_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
    .run(reason, order.id);
  addOrderEvent(order.id, { type: "cancellation", actor: user.name || user.email || "Customer", detail: reason || "Customer requested cancellation" });
  logActivity({ id: null, name: user.name || "Customer", email: user.email || "", role: "customer" }, { action: "order.cancel_requested", entity: "order", entityId: order.reference, detail: reason, shopId: order.shop_id });
  return { ok: true };
}
