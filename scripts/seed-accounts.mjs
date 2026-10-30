// Adds the owner's real accounts. Staff roles (superadmin/admin/shop) live in the SQLite users
// table; customers live in Firebase Authentication with a mirrored row in `customers`.
// Re-running updates the same emails instead of creating duplicates.
import { db } from "../lib/db.mjs";
import { hashPassword, normalizeEmail } from "../lib/password.mjs";
import { randomUUID } from "node:crypto";

const PASSWORD = process.env.SEED_ACCOUNT_PASSWORD || "mubasharali123";

const ACCOUNTS = [
  { email: "mubashaerths@gmail.com", name: "Mubashar Ali", role: "admin", allShops: true },
  { email: "mubashartha@gmail.com", name: "Mubashar Ali", role: "admin", allShops: true },
  { email: "mubasharthe@gmail.com", name: "Mubashar Ali", role: "shop", shop_id: 1 },
  { email: "mubasharthm@gmail.com", name: "Mubashar Ali", role: "customer" },
];

const PERMISSIONS = {
  admin: { can_create_shops: 1, can_manage_products: 1, can_manage_inventory: 1, can_manage_orders: 1, can_manage_settings: 1, can_update_delivery: 1, can_collect_cod: 1 },
  shop: { can_create_shops: 0, can_manage_products: 1, can_manage_inventory: 1, can_manage_orders: 1, can_manage_settings: 0, can_update_delivery: 1, can_collect_cod: 1 },
};

// Spread into the statements below, which list the can_* columns in this same order.
const permissionValues = (perms) => [
  perms.can_create_shops, perms.can_manage_products, perms.can_manage_inventory, perms.can_manage_orders,
  perms.can_manage_settings, perms.can_update_delivery, perms.can_collect_cod,
];

const allShopIds = db.prepare("SELECT id FROM shops WHERE active = 1").all().map((row) => row.id);

function saveStaff(account) {
  const email = normalizeEmail(account.email);
  const hash = hashPassword(PASSWORD);
  const perms = PERMISSIONS[account.role];
  const shopId = account.shop_id ?? null;
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  let id;
  if (existing) {
    db.prepare(
      `UPDATE users SET name = ?, role = ?, password_hash = ?, active = 1, shop_id = ?,
         can_create_shops = ?, can_manage_products = ?, can_manage_inventory = ?, can_manage_orders = ?,
         can_manage_settings = ?, can_update_delivery = ?, can_collect_cod = ? WHERE id = ?`
    ).run(account.name, account.role, hash, shopId, ...permissionValues(perms), existing.id);
    id = existing.id;
  } else {
    id = Number(
      db
        .prepare(
          `INSERT INTO users (email, name, password_hash, role, active, shop_id,
             can_create_shops, can_manage_products, can_manage_inventory, can_manage_orders,
             can_manage_settings, can_update_delivery, can_collect_cod)
           VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(email, account.name, hash, account.role, shopId, ...permissionValues(perms)).lastInsertRowid
    );
  }

  db.prepare("DELETE FROM shop_admins WHERE user_id = ?").run(id);
  const shopIds = account.allShops ? allShopIds : account.shop_id ? [account.shop_id] : [];
  for (const shopId of shopIds) db.prepare("INSERT OR IGNORE INTO shop_admins (user_id, shop_id) VALUES (?, ?)").run(id, shopId);
  return `${existing ? "Updated" : "Created"} ${account.role.padEnd(6)} in SQLite: ${email} · shops [${shopIds.join(", ")}]`;
}

async function mirrorToFirebase() {
  const notes = [];
  const admin = await import("../lib/firebase/admin.mjs");
  if (!admin.firebaseAdminEnabled()) return { enabled: false, notes: [
    "Firebase skipped — FIREBASE_SERVICE_ACCOUNT (or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY) is missing from .env.local.",
    "Add it from Firebase console → Project settings → Service accounts → Generate new private key, then run `npm run check:firebase` and re-run this script.",
  ] };

  const { getAuth } = await import("firebase-admin/auth");
  const auth = getAuth();
  for (const account of ACCOUNTS) {
    const email = normalizeEmail(account.email);
    try {
      let uid = "";
      const current = await auth.getUser(email).catch(() => null);
      if (current) {
        await auth.updateUser(current.uid, { password: PASSWORD, displayName: account.name, emailVerified: true });
        uid = current.uid;
      } else {
        uid = (await auth.createUser({ email, password: PASSWORD, displayName: account.name, emailVerified: true })).uid;
      }
      if (account.role !== "customer") {
        notes.push(`${uid ? "Updated" : "Created"} ${account.role.padEnd(6)} in Firebase Auth: ${email}`);
        continue;
      }
      await admin.ensureProfile(uid, { fullName: account.name, email, picture: "", provider: "password" });
      db.prepare(
        `INSERT INTO customers (uid, email, name, provider, active) VALUES (?, ?, ?, 'password', 1)
         ON CONFLICT(uid) DO UPDATE SET email = excluded.email, name = excluded.name, updated_at = datetime('now')`
      ).run(uid, email, account.name);
      notes.push(`Created customer in Firebase Auth + Firestore profile + SQLite customers: ${email}`);
    } catch (error) {
      notes.push(`Firebase ${email} failed — ${String(error?.message).split("\n")[0]}`);
    }
  }
  return { enabled: true, notes };
}

// Shoppers can always sign in with an email and password this site stores itself, so the
// customer account is created locally whenever Firebase cannot be reached.
function saveLocalCustomer(account) {
  const email = normalizeEmail(account.email);
  const existing = db.prepare("SELECT uid FROM customers WHERE email = ?").get(email);
  const uid = existing?.uid || randomUUID();
  db.prepare(
    `INSERT INTO customers (uid, email, name, provider, password_hash, active) VALUES (?, ?, ?, 'password', ?, 1)
     ON CONFLICT(uid) DO UPDATE SET email = excluded.email, name = excluded.name, password_hash = excluded.password_hash, active = 1, updated_at = datetime('now')`
  ).run(uid, email, account.name, hashPassword(PASSWORD));
  return `${existing ? "Updated" : "Created"} customer in SQLite (signs in on this site): ${email}`;
}

for (const account of ACCOUNTS.filter((entry) => entry.role !== "customer")) console.log(saveStaff(account));
const { enabled, notes } = await mirrorToFirebase();
for (const line of notes) console.log(line);
if (!enabled) for (const account of ACCOUNTS.filter((entry) => entry.role === "customer")) console.log(saveLocalCustomer(account));
console.log("\nStaff sign in at /login, customers at /signup and /login with Google or email + password.");
