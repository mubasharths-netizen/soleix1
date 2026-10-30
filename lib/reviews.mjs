import { db } from "./db.mjs";

// Reviews are written by shoppers and read by everybody, so anything that could identify a
// reviewer (email, order reference) stays inside these queries and never reaches a payload.

export function productRating(productId) {
  const id = Number(productId);
  const totals = db
    .prepare("SELECT COUNT(*) AS count, AVG(rating) AS average FROM reviews WHERE product_id = ? AND visible = 1")
    .get(id);
  const buckets = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of db.prepare("SELECT rating, COUNT(*) AS count FROM reviews WHERE product_id = ? AND visible = 1 GROUP BY rating").all(id)) {
    buckets[row.rating] = row.count;
  }
  return {
    count: Number(totals.count) || 0,
    average: totals.count ? Math.round(Number(totals.average) * 10) / 10 : 0,
    buckets,
    recent: listProductReviews(id, { limit: 5 }),
  };
}

export function listProductReviews(productId, { limit = 50, offset = 0, sort = "recent" } = {}) {
  const order = sort === "helpful" || sort === "rating"
    ? "ORDER BY rating DESC, created_at DESC"
    : sort === "lowest"
      ? "ORDER BY rating ASC, created_at DESC"
      : "ORDER BY created_at DESC, id DESC";
  return db
    .prepare(
      `SELECT id, author, rating, fit, title, body, verified, created_at FROM reviews
       WHERE product_id = ? AND visible = 1 ${order} LIMIT ? OFFSET ?`
    )
    .all(Number(productId), Number(limit), Number(offset));
}

// A shopper is only a verified buyer of a pair once an order holding that product has been
// delivered to the email they are reviewing with.
export function purchaseFor(email, productId) {
  const address = String(email || "").trim().toLowerCase();
  if (!address) return null;
  return db
    .prepare(
      `SELECT o.reference FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE lower(o.customer_email) = ? AND oi.product_id = ? AND o.status = 'delivered'
       ORDER BY o.id DESC LIMIT 1`
    )
    .get(address, Number(productId));
}

export function hasReviewed(email, productId) {
  const address = String(email || "").trim().toLowerCase();
  if (!address) return false;
  return Boolean(db.prepare("SELECT id FROM reviews WHERE lower(email) = ? AND product_id = ?").get(address, Number(productId)));
}

export function reviewsThisHour(email) {
  const address = String(email || "").trim().toLowerCase();
  if (!address) return 0;
  return Number(db.prepare("SELECT COUNT(*) AS c FROM reviews WHERE lower(email) = ? AND created_at > datetime('now', '-1 hour')").get(address).c);
}
