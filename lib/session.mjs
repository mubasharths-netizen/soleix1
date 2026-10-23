import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { db } from "./db.mjs";
import { normalizeEmail, verifyPassword, sha256 } from "./password.mjs";

const COOKIE = "soleix_session";
const TTL_SECONDS = 60 * 60 * 24 * 7;

export const homeFor = (role) => (role === "superadmin" ? "/superadmin" : role === "admin" ? "/admin" : "/panel");

export function authenticate(email, password) {
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(normalizeEmail(email));
  const ok = row && row.active && verifyPassword(password, row.password_hash);
  return ok ? row : null;
}

export async function startSession(userId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + TTL_SECONDS * 1000;
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(sha256(token), userId, expiresAt);
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: TTL_SECONDS });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
  store.delete(COOKIE);
}

export async function getSessionUser() {
  await connection();
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.shop_id, u.can_create_shops, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`
    )
    .get(sha256(token));
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
    return null;
  }
  return { id: row.id, email: row.email, name: row.name, role: row.role, shopId: row.shop_id, canCreateShops: !!row.can_create_shops };
}

export async function requireUser(...roles) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

export function shopIdsFor(user) {
  if (user.role === "superadmin") return db.prepare("SELECT id FROM shops").all().map((row) => row.id);
  if (user.role === "admin") return db.prepare("SELECT shop_id FROM shop_admins WHERE user_id = ?").all(user.id).map((row) => row.shop_id);
  return user.shopId ? [user.shopId] : [];
}

export function assertShopAccess(user, shopId) {
  if (!shopIdsFor(user).includes(Number(shopId))) throw new Error("You do not have access to this shop.");
}
