"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { actionUser } from "./session.mjs";
import { db } from "./db.mjs";
import { logActivity } from "./orders.mjs";
import { saveSetting } from "./storefront.mjs";
import * as m from "./mutations.mjs";

function target(form, params = {}) {
  const raw = String(form.get("next") || "/");
  const base = raw.startsWith("/") && !raw.startsWith("//") ? raw.split("?")[0] : "/";
  const query = new URLSearchParams(params).toString();
  return query ? `${base}?${query}` : base;
}

// `forward` names result keys the screen needs after the redirect (a one-time setup token, a
// fresh order reference). Everything else stays server-side.
async function run(form, roles, mutate, forward = []) {
  let outcome;
  try {
    const user = await actionUser(...roles);
    const result = await mutate(user, form);
    outcome = { saved: "1" };
    for (const key of forward) {
      if (result && result[key]) outcome[key] = String(result[key]).slice(0, 80);
    }
  } catch (error) {
    outcome = { error: error.message || "Something went wrong." };
  }
  const path = String(form.get("next") || "/").split("?")[0];
  revalidatePath(path.startsWith("/") && !path.startsWith("//") ? path : "/");
  redirect(target(form, outcome));
}

export async function saveShopAction(form) {
  return run(form, ["superadmin", "admin"], (user, data) => m.saveShop(user, data));
}

export async function deleteShopAction(form) {
  return run(form, ["superadmin"], (user, data) => m.deleteShop(user, data));
}

export async function saveUserAction(form) {
  return run(form, ["superadmin", "admin"], (user, data) => m.saveUser(user, data), ["invitation"]);
}

export async function toggleUserAction(form) {
  return run(form, ["superadmin"], (user, data) => m.setUserActive(user, data));
}

export async function saveCategoryAction(form) {
  return run(form, ["superadmin"], (user, data) => m.saveCategory(user, data));
}

export async function deleteCategoryAction(form) {
  return run(form, ["superadmin"], (user, data) => m.deleteCategory(user, data));
}

export async function saveProductAction(form) {
  return run(form, ["superadmin", "admin", "shop"], (user, data) => m.saveProduct(user, data));
}

export async function deleteProductAction(form) {
  return run(form, ["superadmin", "admin", "shop"], (user, data) => m.deleteProduct(user, data));
}

export async function saveStockAction(form) {
  return run(form, ["superadmin", "admin", "shop"], (user, data) => m.saveStockRow(user, data));
}

export async function deleteStockAction(form) {
  return run(form, ["superadmin", "admin", "shop"], (user, data) => m.deleteStockRow(user, data));
}

export async function saveOrderStatusAction(form) {
  return run(form, ["superadmin", "admin", "shop"], (user, data) => m.setOrderStatus(user, data));
}

export async function collectCashAction(form) {
  return run(form, ["superadmin", "admin", "shop"], (user, data) => m.recordCashCollection(user, data));
}

export async function assignDeliveryAction(form) {
  return run(form, ["superadmin", "admin", "shop"], (user, data) => m.assignDeliveryStaff(user, data));
}

export async function resolveCancellationAction(form) {
  return run(form, ["superadmin", "admin", "shop"], (user, data) => m.resolveCancellation(user, data));
}

export async function orderNoteAction(form) {
  return run(form, ["superadmin", "admin", "shop"], (user, data) => m.addOrderNote(user, data));
}

export async function revokeInvitationAction(form) {
  return run(form, ["superadmin", "admin"], (user, data) => m.revokeInvitation(user, data));
}

// Delivery fee, free-delivery threshold, discount rule and order prefix.
export async function savePlatformSettingsAction(form) {
  return run(form, ["superadmin"], async (user, data) => {
    const fields = ["delivery_fee", "free_delivery_over", "discount_code", "discount_percent", "discount_flat", "discount_minimum", "order_prefix"];
    for (const key of fields) {
      if (data.get(key) === null) continue;
      saveSetting(key, String(data.get(key)).trim());
    }
    logActivity(user, { action: "settings.updated", entity: "platform", entityId: "settings", detail: fields.filter((key) => data.get(key) !== null).join(", ") });
  });
}

export async function toggleCustomerAction(form) {
  return run(form, ["superadmin"], async (user, data) => {
    const uid = String(data.get("uid") || "");
    const customer = db.prepare("SELECT uid, active, email FROM customers WHERE uid = ?").get(uid);
    if (!customer) throw new Error("Customer not found.");
    db.prepare("UPDATE customers SET active = 1 - active, updated_at = datetime('now') WHERE uid = ?").run(uid);
    logActivity(user, { action: customer.active ? "customer.deactivated" : "customer.activated", entity: "customer", entityId: uid, detail: customer.email });
    return uid;
  });
}

export async function completeInvitationAction(form) {
  try {
    m.completeInvitation(form);
    redirect("/login?set=1");
  } catch (error) {
    redirect(`/set-password?error=${encodeURIComponent(error.message || "The link is not valid.")}&token=${String(form.get("token") || "").slice(0, 80)}`);
  }
}

export async function recordOrderAction(form) {
  return run(form, ["superadmin", "admin", "shop"], (user, data) => m.recordDashboardOrder(user, data), ["reference"]);
}

export async function saveProfileAction(form) {
  return run(form, ["superadmin", "admin", "shop"], (user, data) => m.updateProfile(user, data));
}

export async function saveShopSettingsAction(form) {
  return run(form, ["superadmin", "admin", "shop"], (user, data) => m.updateShopSettings(user, data));
}
