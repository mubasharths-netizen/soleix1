"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db.mjs";
import { requireAccountUser } from "@/lib/session.mjs";
import { normalizeEmail } from "@/lib/password.mjs";

const text = (form, key, max = 200) => String(form.get(key) ?? "").trim().slice(0, max);

const ACCOUNT_PAGES = ["/account", "/account/profile", "/account/orders"];

function refresh() {
  ACCOUNT_PAGES.forEach((path) => revalidatePath(path));
}

// The account pages answer for staff too: their name lives on the users row and they have no
// customer record, so anything keyed on a customer uid has to say so instead of failing quietly.
async function accountScope(nextPath) {
  const user = await requireAccountUser(nextPath);
  if (user.kind === "staff") {
    const row = db.prepare("SELECT id, email, name FROM users WHERE id = ?").get(user.id);
    if (!row) throw new Error("Your staff account no longer exists.");
    return { kind: "staff", userId: row.id, uid: "", email: normalizeEmail(row.email), name: row.name };
  }
  return { kind: "customer", userId: null, uid: user.uid, email: normalizeEmail(user.email || ""), name: user.name || "" };
}

async function customerScope() {
  const scope = await accountScope("/account/profile");
  if (!scope.uid) return { error: "Saved addresses belong to a customer account. Sign in as a customer to use them." };
  return scope;
}

export async function saveProfileAction(form) {
  const scope = await accountScope("/account/profile");
  const name = text(form, "full_name", 120);
  const phone = text(form, "phone", 32);
  if (name.length < 2) return { error: "Enter your full name." };
  if (phone && phone.replace(/\D/g, "").length < 7) return { error: "Enter a reachable phone number." };
  if (scope.uid) {
    db.prepare(
      `INSERT INTO customers (uid, email, name, phone, provider, active) VALUES (?, ?, ?, ?, 'firebase', 1)
       ON CONFLICT(uid) DO UPDATE SET name = excluded.name, phone = excluded.phone, email = excluded.email, updated_at = datetime('now')`
    ).run(scope.uid, scope.email, name, phone);
  } else {
    db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, scope.userId);
  }
  refresh();
  return { saved: "Profile saved." };
}

export async function saveAddressAction(form) {
  const scope = await customerScope();
  if (scope.error) return scope;
  const id = Number(form.get("id") || 0);
  const address = {
    label: text(form, "label", 40) || "Home",
    full_name: text(form, "full_name", 120),
    phone: text(form, "phone", 32),
    address: text(form, "address", 260),
    city: text(form, "city", 80),
    postal_code: text(form, "postal_code", 24),
  };
  if (!address.full_name || address.address.length < 8 || address.city.length < 2) {
    return { error: "Fill in the name, the complete address and the city." };
  }
  if (id) {
    const row = db.prepare("SELECT id, uid FROM customer_addresses WHERE id = ?").get(id);
    if (!row || row.uid !== scope.uid) return { error: "That address is not on your account." };
  }
  const count = db.prepare("SELECT COUNT(*) AS n FROM customer_addresses WHERE uid = ?").get(scope.uid).n;
  const isDefault = count === 0 || form.get("is_default") === "on" ? 1 : 0;
  if (isDefault) db.prepare("UPDATE customer_addresses SET is_default = 0 WHERE uid = ?").run(scope.uid);

  if (id) {
    db.prepare(`UPDATE customer_addresses SET label = ?, full_name = ?, phone = ?, address = ?, city = ?, postal_code = ?, is_default = ? WHERE id = ?`)
      .run(address.label, address.full_name, address.phone, address.address, address.city, address.postal_code, isDefault, id);
  } else {
    db.prepare(`INSERT INTO customer_addresses (uid, label, full_name, phone, address, city, postal_code, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(scope.uid, address.label, address.full_name, address.phone, address.address, address.city, address.postal_code, isDefault);
  }
  // Checkout prefills from the default, so the book always keeps one.
  if (!isDefault) {
    const defaults = db.prepare("SELECT COUNT(*) AS n FROM customer_addresses WHERE uid = ? AND is_default = 1").get(scope.uid).n;
    if (!defaults) {
      const first = db.prepare("SELECT id FROM customer_addresses WHERE uid = ? ORDER BY id LIMIT 1").get(scope.uid);
      if (first) db.prepare("UPDATE customer_addresses SET is_default = 1 WHERE id = ?").run(first.id);
    }
  }
  refresh();
  return { saved: isDefault ? "Address saved and set as default." : "Address saved." };
}

export async function deleteAddressAction(form) {
  const scope = await customerScope();
  if (scope.error) return scope;
  const id = Number(form.get("id") || 0);
  const row = db.prepare("SELECT id, uid, is_default FROM customer_addresses WHERE id = ?").get(id);
  if (!row || row.uid !== scope.uid) return { error: "That address is not on your account." };
  db.prepare("DELETE FROM customer_addresses WHERE id = ?").run(id);
  if (row.is_default) {
    const next = db.prepare("SELECT id FROM customer_addresses WHERE uid = ? ORDER BY id LIMIT 1").get(scope.uid);
    if (next) db.prepare("UPDATE customer_addresses SET is_default = 1 WHERE id = ?").run(next.id);
  }
  refresh();
  return { saved: "Address removed." };
}

export async function setDefaultAddressAction(form) {
  const scope = await customerScope();
  if (scope.error) return scope;
  const id = Number(form.get("id") || 0);
  const row = db.prepare("SELECT id, uid FROM customer_addresses WHERE id = ?").get(id);
  if (!row || row.uid !== scope.uid) return { error: "That address is not on your account." };
  db.prepare("UPDATE customer_addresses SET is_default = 0 WHERE uid = ?").run(scope.uid);
  db.prepare("UPDATE customer_addresses SET is_default = 1 WHERE id = ?").run(id);
  refresh();
  return { saved: "Default address updated." };
}
