"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { actionUser } from "./session.mjs";
import * as m from "./mutations.mjs";

function target(form, params = {}) {
  const raw = String(form.get("next") || "/");
  const base = raw.startsWith("/") && !raw.startsWith("//") ? raw.split("?")[0] : "/";
  const query = new URLSearchParams(params).toString();
  return query ? `${base}?${query}` : base;
}

async function run(form, roles, mutate) {
  let outcome;
  try {
    const user = await actionUser(...roles);
    await mutate(user, form);
    outcome = { saved: "1" };
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
  return run(form, ["superadmin", "admin"], (user, data) => m.saveUser(user, data));
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

export async function recordOrderAction(form) {
  return run(form, ["superadmin", "admin", "shop"], (user, data) => m.recordDashboardOrder(user, data));
}

export async function saveProfileAction(form) {
  return run(form, ["superadmin", "admin", "shop"], (user, data) => m.updateProfile(user, data));
}

export async function saveShopSettingsAction(form) {
  return run(form, ["superadmin", "admin", "shop"], (user, data) => m.updateShopSettings(user, data));
}

export async function logoutAction() {
  const { endSession } = await import("./session.mjs");
  await endSession();
  redirect("/login?signedout=1");
}
