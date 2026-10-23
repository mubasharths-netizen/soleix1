import { db } from "../lib/db.mjs";
import { hashPassword, normalizeEmail } from "../lib/password.mjs";

const email = normalizeEmail(process.env.SOLEIX_SUPERADMIN_EMAIL || "");
const password = process.env.SOLEIX_SUPERADMIN_PASSWORD || "";

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Set SOLEIX_SUPERADMIN_EMAIL to a valid email address (env var or .env file).");
  process.exit(1);
}
if (password.length < 10) {
  console.error("SOLEIX_SUPERADMIN_PASSWORD must be at least 10 characters long.");
  process.exit(1);
}

const existing = db.prepare("SELECT id, role FROM users WHERE email = ?").get(email);
if (existing) {
  db.prepare("UPDATE users SET role = 'superadmin', password_hash = ?, active = 1 WHERE id = ?").run(hashPassword(password), existing.id);
  console.log(`Super admin credentials reset for ${email}`);
} else {
  db.prepare("INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, 'superadmin')").run(email, process.env.SOLEIX_SUPERADMIN_NAME || "Super Admin", hashPassword(password));
  console.log(`Super admin created: ${email}`);
}
console.log("Done. Sign in at /login — this account now has the highest permissions.");
