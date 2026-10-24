import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { randomBytes } from "node:crypto";
import { db } from "./db.mjs";
import { normalizeEmail, verifyPassword, sha256 } from "./password.mjs";
import { SESSION_COOKIE, cookieOptions, issueSessionCookie, readIdToken, readSessionCookie } from "./firebase/admin.mjs";

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
  store.delete(SESSION_COOKIE, { path: "/" });
}

export async function getSessionUser() {
  await connection();
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.shop_id, u.can_create_shops, u.can_manage_products, u.can_manage_orders,
              u.can_manage_settings, u.can_manage_inventory, u.can_update_delivery, u.can_collect_cod, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`
    )
    .get(sha256(token));
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    shopId: row.shop_id,
    canCreateShops: !!row.can_create_shops,
    canManageProducts: row.role === "superadmin" || !!row.can_manage_products,
    canManageOrders: row.role === "superadmin" || !!row.can_manage_orders,
    canManageSettings: row.role === "superadmin" || !!row.can_manage_settings,
    canManageInventory: row.role === "superadmin" || !!row.can_manage_inventory || !!row.can_manage_products,
    canUpdateDelivery: row.role === "superadmin" || !!row.can_update_delivery || !!row.can_manage_orders,
    canCollectCod: row.role === "superadmin" || !!row.can_collect_cod || !!row.can_manage_orders,
  };
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

export async function actionUser(...roles) {
  const user = await getSessionUser();
  if (!user) throw new Error("Your session ended. Please sign in again.");
  if (!roles.includes(user.role)) throw new Error("Your role is not allowed to perform this action.");
  return user;
}

export function can(user, kind) {
  if (user.role === "superadmin") return true;
  if (kind === "products") return user.canManageProducts;
  if (kind === "inventory") return user.canManageInventory;
  if (kind === "orders") return user.canManageOrders;
  if (kind === "delivery") return user.canUpdateDelivery;
  if (kind === "cod") return user.canCollectCod;
  if (kind === "shops") return user.role === "admin" ? user.canCreateShops : false;
  return false;
}

/* ---------- Firebase identity (customers) on the same cookie architecture ---------- */

// Only a path inside this site is accepted as a post-login destination.
export function safeNext(value) {
  const path = String(value || "");
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/api/auth")) return "";
  return path;
}

export const getFirebaseUser = cache(async () => {
  await connection();
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  const profile = await readSessionCookie(value);
  return profile ? { ...profile, kind: "customer", role: "customer" } : null;
});

// Staff sessions win so dashboard roles keep working; otherwise the Firebase profile is used.
export const getAccountUser = cache(async () => {
  const staff = await getSessionUser();
  if (staff) return { ...staff, kind: "staff" };
  return getFirebaseUser();
});

// Customers the Main Admin deactivated keep their Firebase token but lose account access, so the
// check runs on every account page and on the login page that signs them back in.
export function accountBlocked(user) {
  if (!user || user.kind !== "customer") return false;
  const row = db.prepare("SELECT active FROM customers WHERE uid = ?").get(user.uid);
  return Boolean(row && !row.active);
}

export async function requireAccountUser(nextPath) {
  const user = await getAccountUser();
  if (accountBlocked(user)) redirect("/login?revoked=1");
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNext(nextPath) || "/account")}`);
  return user;
}

export function staffByEmail(email) {
  const row = db.prepare("SELECT id, email, name, role, active FROM users WHERE email = ?").get(normalizeEmail(email));
  return row && row.active ? row : null;
}

// Verifies the ID token with the Admin SDK server-side before any cookie is issued.
export async function adoptFirebaseSession(idToken) {
  const profile = await readIdToken(idToken);
  (await cookies()).set(SESSION_COOKIE, await issueSessionCookie(idToken), cookieOptions());
  return profile;
}
