import { randomUUID } from "node:crypto";
import { db } from "./db.mjs";
import { normalizeEmail } from "./password.mjs";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export const isEmail = (value) => EMAIL.test(String(value || "").trim());

export function enquiriesThisHour(email) {
  const address = normalizeEmail(String(email || ""));
  return Number(db.prepare("SELECT COUNT(*) AS c FROM contact_messages WHERE lower(email) = ? AND created_at > datetime('now','-1 hour')").get(address).c);
}

export function saveEnquiry({ name, email, phone = "", subject = "", message, orderReference = "" }) {
  const result = db
    .prepare(
      `INSERT INTO contact_messages (name, email, phone, subject, message, order_reference)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(String(name).slice(0, 120), normalizeEmail(email), String(phone).slice(0, 32), String(subject).slice(0, 80), String(message).slice(0, 2000), String(orderReference).slice(0, 40));
  return Number(result.lastInsertRowid);
}

// Re-subscribing after an unsubscribe puts the address back on the list instead of failing.
export function subscribe(email, source = "storefront") {
  const address = normalizeEmail(email);
  const existing = db.prepare("SELECT id, active, token FROM subscribers WHERE email = ?").get(address);
  if (existing) {
    if (!existing.active) {
      db.prepare("UPDATE subscribers SET active = 1, unsubscribed_at = NULL, source = ? WHERE id = ?").run(source, existing.id);
    }
    return { id: existing.id, token: existing.token, again: true };
  }
  const token = randomUUID();
  const result = db.prepare("INSERT INTO subscribers (email, token, source) VALUES (?, ?, ?)").run(address, token, source);
  return { id: Number(result.lastInsertRowid), token, again: false };
}

export function unsubscribe(token) {
  const row = db.prepare("SELECT id, active FROM subscribers WHERE token = ?").get(String(token || "").slice(0, 64));
  if (!row) return "unknown";
  if (!row.active) return "gone";
  db.prepare("UPDATE subscribers SET active = 0, unsubscribed_at = datetime('now') WHERE id = ?").run(row.id);
  return "done";
}
