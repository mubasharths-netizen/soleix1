import { db } from "./db.mjs";
import { siteSettings } from "./storefront.mjs";

export const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

export const STATUS_LABEL = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped / out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// One forward step at a time. Cancellation is only possible before the parcel has left the shop.
export const TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export const CUSTOMER_CANCEL_STATUSES = ["pending", "confirmed"];

export const SHIPPING_STATUSES = ["shipped", "delivered"];
export const OPEN_STATUSES = ["pending", "confirmed", "processing", "shipped"];

// Which statuses a signed-in staff member may move an order to, from verified DB permissions.
export function statusesFor(user) {
  if (user.role === "superadmin") return ORDER_STATUSES.filter((status) => status !== "pending");
  const allowed = [];
  if (user.canManageOrders) allowed.push("confirmed", "processing", "shipped", "cancelled");
  if (user.canUpdateDelivery) allowed.push("delivered");
  return [...new Set(allowed)];
}

export function canCollectCash(user) {
  return user.role === "superadmin" || user.canManageOrders || user.canCollectCod;
}

export function nextReference(shopId) {
  const settings = siteSettings();
  const prefix = String(settings.orderPrefix || "SOL").toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const last = db.prepare("SELECT id FROM orders ORDER BY id DESC LIMIT 1").get()?.id || 0;
  return `${prefix}-${String(shopId).padStart(2, "0")}-${String(last + 1).padStart(5, "0")}`;
}

// Server-side money: the browser sends product ids and quantities only.
export function priceLines(lines) {
  const settings = siteSettings();
  const detailed = [];
  const problems = [];
  for (const line of lines) {
    const product = db
      .prepare(
        `SELECT p.id, p.slug, p.name, p.price, p.shop_id, p.active, p.archived, s.active AS shop_active
         FROM products p JOIN shops s ON s.id = p.shop_id WHERE p.slug = ?`
      )
      .get(String(line.id));
    if (!product || !product.active || product.archived || !product.shop_active) {
      problems.push(`“${line.id}” is no longer available.`);
      continue;
    }
    const size = String(line.size ?? "");
    const color = String(line.color ?? "");
    const stock = db.prepare("SELECT id, qty FROM inventory WHERE product_id = ? AND size = ? AND color = ?").get(product.id, size, color);
    if (!stock) {
      problems.push(`“${product.name}” is not sold in size ${size} / ${color}.`);
      continue;
    }
    const requested = Number(line.qty);
    if (!Number.isInteger(requested) || requested < 1) {
      problems.push(`“${product.name}” has an invalid quantity.`);
      continue;
    }
    if (requested > stock.qty) {
      problems.push(stock.qty === 0
        ? `“${product.name}” (EU ${size}, ${color}) is sold out.`
        : `Only ${stock.qty} pair(s) of “${product.name}” (EU ${size}, ${color}) are left.`);
      continue;
    }
    detailed.push({ productId: product.id, shopId: product.shop_id, name: product.name, size, color, qty: Math.min(requested, 10), price: Number(product.price), stockId: stock.id });
  }
  return { lines: detailed, problems, settings };
}

// A discount only exists once the shopper's entered code matches the campaign the shop is
// running — the code itself never travels to the browser.
export function totalsFor(lines, settings = siteSettings(), coupon = "") {
  const subtotal = lines.reduce((total, line) => total + line.price * line.qty, 0);
  const fee = Number(settings.deliveryFee) || 0;
  const threshold = Number(settings.freeDeliveryOver) || 0;
  const delivery = !subtotal || (threshold && subtotal >= threshold) ? 0 : fee;
  const running = String(settings.discountCode || "").trim().toUpperCase();
  const entered = String(coupon || "").trim().toUpperCase();
  let discount = 0;
  if (running && entered === running && subtotal >= (Number(settings.discountMinimum) || 0)) {
    const percent = Number(settings.discountPercent) || 0;
    const flat = Number(settings.discountFlat) || 0;
    discount = percent ? Math.round((subtotal * percent) / 100) : Math.min(flat, subtotal);
  }
  return { subtotal, delivery, discount, total: Math.max(0, subtotal + delivery - discount) };
}

export function logActivity(user, { action, entity = "", entityId = "", detail = "", shopId = null }) {
  db.prepare(
    `INSERT INTO activity_logs (user_id, user_label, user_role, shop_id, action, entity, entity_id, detail)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(user?.id ?? null, user?.name || user?.email || "Guest", user?.role || "customer", shopId ?? null,
    String(action), String(entity), String(entityId ?? ""), String(detail).slice(0, 500));
}

export function addOrderEvent(orderId, { type = "status", actor = "system", detail = "" }) {
  db.prepare("INSERT INTO order_events (order_id, type, actor, detail) VALUES (?, ?, ?, ?)").run(Number(orderId), type, String(actor).slice(0, 80), String(detail).slice(0, 300));
}

// Cancelling returns the stock to the exact inventory rows the order took.
export function restockOrder(orderId) {
  const lines = db.prepare("SELECT product_id, size, color, qty FROM order_items WHERE order_id = ?").all(Number(orderId));
  for (const line of lines) {
    if (!line.product_id) continue;
    db.prepare("UPDATE inventory SET qty = qty + ? WHERE product_id = ? AND size = ? AND color = ?")
      .run(line.qty, line.product_id, line.size, line.color);
  }
  return lines.length;
}
