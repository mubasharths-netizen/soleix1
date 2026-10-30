"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db.mjs";
import { addOrderEvent, CUSTOMER_CANCEL_STATUSES, logActivity, nextReference, priceLines, totalsFor } from "@/lib/orders.mjs";
import { getAccountUser, requireAccountUser } from "@/lib/session.mjs";
import { normalizeEmail } from "@/lib/password.mjs";
import { FIT_OPTIONS, hasReviewed, productRating, purchaseFor, reviewsThisHour } from "@/lib/reviews.mjs";
import { enquiriesThisHour, isEmail, saveEnquiry, subscribe, unsubscribe } from "@/lib/enquiries.mjs";
import { siteSettings } from "@/lib/storefront.mjs";

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

  // Shoppers get their orders attached to their account whichever way they signed in — this
  // site's own customer rows or Firebase. Staff browsing the storefront check out as guests.
  const account = await getAccountUser();
  const customer = account?.kind === "customer" ? account : null;
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
  const settings = siteSettings();
  const entered = text(form, "coupon", 40);
  const coupon = resolveCoupon(entered, settings);
  if (entered && !coupon.ok) return { error: coupon.error };
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
      const totals = totalsFor(shopLines, settings, coupon.code);
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

// The campaign code lives in the shop settings and is never sent to the browser, so a code is
// only ever worth money once it has been checked here.
function resolveCoupon(entered, settings = siteSettings()) {
  const code = String(entered || "").trim().toUpperCase();
  const running = String(settings.discountCode || "").trim().toUpperCase();
  if (!code) return { ok: false, code: "" };
  if (!running) return { ok: false, code: "", error: "No discount campaign is running right now." };
  if (code !== running) return { ok: false, code: "", error: "That code is not valid on this store." };
  return { ok: true, code, percent: Number(settings.discountPercent) || 0, flat: Number(settings.discountFlat) || 0, minimum: Number(settings.discountMinimum) || 0 };
}

export async function applyCoupon(entered) {
  const settings = siteSettings();
  const result = resolveCoupon(entered, settings);
  if (!result.ok) return { error: result.error || "Enter a discount code." };
  const value = result.percent ? `${result.percent}% off` : `PKR ${Number(result.flat).toLocaleString("en-PK")} off`;
  const minimum = result.minimum ? Number(result.minimum) : 0;
  return { ok: true, code: result.code, value, minimum };
}

export async function submitReview(_previous, form) {
  const slug = text(form, "product", 120);
  const product = db.prepare("SELECT id, name, slug FROM products WHERE slug = ? AND archived = 0 AND active = 1").get(slug);
  const email = normalizeEmail(text(form, "email", 160));
  const author = text(form, "author", 60);
  const rating = Number(form.get("rating"));
  const body = text(form, "body", 900);
  const title = text(form, "title", 90);
  const fit = FIT_OPTIONS.some((option) => option.value === form.get("fit")) ? text(form, "fit", 12) : "";

  // A filled-in field no human can see is a bot; answer politely and write nothing.
  if (text(form, "website", 40)) return { ok: true, ignored: true };
  if (!product) return { error: "We could not find that pair." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Choose a rating from 1 to 5 stars." };
  if (author.length < 2) return { error: "Add the display name you want under the review." };
  if (!EMAIL.test(email)) return { error: "We need a valid email to confirm the pair was yours." };
  if (body.length < 15) return { error: "Tell us a little more — 15 characters at minimum." };
  if (reviewsThisHour(email) >= 3) return { error: "That is enough reviews for one hour. Try again shortly." };
  if (hasReviewed(email, product.id)) return { error: "You have already reviewed this pair. Contact the shop if you need it changed." };

  const purchase = purchaseFor(email, product.id);
  db.prepare("INSERT INTO reviews (product_id, author, email, rating, fit, title, body, verified, order_reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(product.id, author, email, rating, fit, title, body, purchase ? 1 : 0, purchase?.reference || "");
  logActivity({ id: null, name: author, email, role: "customer" }, {
    action: "review.created", entity: "review", entityId: String(product.slug), detail: `${rating} star(s)${purchase ? " · verified buyer" : ""}`,
  });

  revalidatePath(`/product/${product.slug}`);
  revalidatePath("/shop");
  return { ok: true, verified: Boolean(purchase) };
}

export async function sendEnquiry(_previous, form) {
  const name = text(form, "name", 120);
  const email = text(form, "email", 160);
  const phone = text(form, "phone", 32);
  const subject = text(form, "subject", 80);
  const reference = text(form, "order_reference", 40);
  const message = text(form, "message", 2000);

  if (text(form, "company_website", 40)) return { ok: true, ignored: true };
  if (name.length < 2) return { error: "Tell us who you are." };
  if (!isEmail(email)) return { error: "Enter a valid email so we can reply." };
  if (message.length < 10) return { error: "Add a few more words to your message." };
  if (enquiriesThisHour(email) >= 5) return { error: "We have plenty from this address for now. Please try again in an hour." };

  const id = saveEnquiry({ name, email, phone, subject, message, orderReference: reference });
  logActivity({ id: null, name, email, role: "customer" }, { action: "enquiry.created", entity: "enquiry", entityId: String(id), detail: subject });
  revalidatePath("/superadmin/enquiries");
  return { ok: true, ticket: id };
}

export async function subscribeNewsletter(_previous, form) {
  const email = text(form, "email", 160);
  const source = text(form, "source", 40) || "storefront";
  if (text(form, "website", 40)) return { ok: true, ignored: true };
  if (!isEmail(email)) return { error: "Enter a valid email address." };
  const result = subscribe(email, source);
  logActivity({ id: null, name: "Newsletter", email, role: "customer" }, { action: "newsletter.subscribe", entity: "subscriber", entityId: String(result.id), detail: source });
  return { ok: true, again: result.again };
}

// Loss of the email link should not lock someone onto the list: the address alone is enough to
// leave, and the reply never confirms whether the address was ever on it.
export async function leaveNewsletter(_previous, form) {
  const token = text(form, "token", 64);
  const email = normalizeEmail(text(form, "email", 160));
  if (text(form, "website", 40)) return { ok: true, ignored: true };

  if (token) {
    const outcome = unsubscribe(token);
    if (outcome === "unknown") return { error: "That link is not on our list. It may already have been used." };
    revalidatePath("/superadmin/enquiries");
    return { ok: true, outcome };
  }

  if (!isEmail(email)) return { error: "Enter the email address you signed up with." };
  const row = db.prepare("SELECT id FROM subscribers WHERE email = ?").get(email);
  if (row) {
    db.prepare("UPDATE subscribers SET active = 0, unsubscribed_at = datetime('now') WHERE id = ?").run(row.id);
    logActivity({ id: null, name: "Newsletter", email, role: "customer" }, { action: "newsletter.unsubscribe", entity: "subscriber", entityId: String(row.id), detail: email });
  }
  revalidatePath("/superadmin/enquiries");
  return { ok: true, outcome: row ? "done" : "unknown" };
}
