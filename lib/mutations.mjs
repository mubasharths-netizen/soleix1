import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { db } from "./db.mjs";
import { hashPassword, normalizeEmail, sha256 } from "./password.mjs";
import { assertShopAccess, can, shopIdsFor } from "./session.mjs";
import { addOrderEvent, logActivity, nextReference, ORDER_STATUSES, restockOrder, statusesFor, totalsFor, TRANSITIONS } from "./orders.mjs";
import { STATUS_LABEL } from "./orders.mjs";

export const UPLOAD_DIR = join(process.env.SOLEIX_DATA_DIR || join(process.cwd(), "data"), "uploads");
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export { ORDER_STATUSES };

const value = (form, key, fallback = "") => String(form.get(key) ?? fallback).trim();
const flag = (form, key) => (form.get(key) === "on" || form.get(key) === "1" ? 1 : 0);

function required(text, message) {
  if (!text) throw new Error(message);
  return text;
}

async function storeUpload(file) {
  if (!file || typeof file.size !== "number" || file.size === 0) return "";
  if (file.size > 4 * 1024 * 1024) throw new Error("Product image must be 4 MB or smaller.");
  if (!/^image\/(png|jpe?g|webp|avif)$/i.test(file.type)) throw new Error("Product image must be a PNG, JPG, WEBP or AVIF file.");
  mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}${extname(file.name || "").slice(0, 8) || ".png"}`;
  writeFileSync(join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

export function saveShop(user, form) {
  if (user.role !== "superadmin" && !can(user, "shops")) throw new Error("You are not allowed to manage shops.");
  const id = Number(value(form, "id") || 0);
  const name = required(value(form, "name"), "Shop name is required.");
  const description = value(form, "description");
  const address = value(form, "address");
  const phone = value(form, "phone");
  const active = flag(form, "active");

  if (id) {
    assertShopAccess(user, id);
    const clash = db.prepare("SELECT id FROM shops WHERE name = ? AND id <> ?").get(name, id);
    if (clash) throw new Error("Another shop already uses this name.");
    db.prepare("UPDATE shops SET name = ?, description = ?, address = ?, phone = ?, active = ? WHERE id = ?")
      .run(name, description, address, phone, active, id);
    return id;
  }

  const clash = db.prepare("SELECT id FROM shops WHERE name = ?").get(name);
  if (clash) throw new Error("Another shop already uses this name.");
  const result = db.prepare("INSERT INTO shops (name, description, address, phone, active) VALUES (?, ?, ?, ?, ?)")
    .run(name, description, address, phone, active);
  const shopId = Number(result.lastInsertRowid);
  logActivity(user, { action: "shop.created", entity: "shop", entityId: shopId, detail: name, shopId });
  if (user.role !== "superadmin") db.prepare("INSERT OR IGNORE INTO shop_admins (user_id, shop_id) VALUES (?, ?)").run(user.id, shopId);
  return shopId;
}

export function deleteShop(user, form) {
  if (user.role !== "superadmin") throw new Error("Only the Super Admin can delete shops.");
  const id = Number(value(form, "id"));
  assertShopAccess(user, id);
  db.prepare("DELETE FROM shops WHERE id = ?").run(id);
  logActivity(user, { action: "shop.deleted", entity: "shop", entityId: id });
  return id;
}

const INVITATION_TTL = 1000 * 60 * 60 * 24 * 7;

// A single-use, hashed setup link. Invitation recipients choose their own password, so a
// shared plaintext password is never stored or displayed anywhere.
function createInvitation(userId, createdBy) {
  const token = randomBytes(24).toString("hex");
  db.prepare("INSERT INTO invitations (token_hash, user_id, expires_at, created_by) VALUES (?, ?, ?, ?)")
    .run(sha256(token), userId, Date.now() + INVITATION_TTL, createdBy);
  return token;
}

export function completeInvitation(form) {
  const token = value(form, "token");
  const password = String(form.get("password") || "");
  const confirm = String(form.get("confirm") || "");
  if (!token) throw new Error("This setup link is missing its token.");
  if (password.length < 8) throw new Error("Choose a password of at least 8 characters.");
  if (password !== confirm) throw new Error("The two passwords do not match.");
  const row = db.prepare("SELECT * FROM invitations WHERE token_hash = ?").get(sha256(token));
  if (!row) throw new Error("This setup link has already been used or is not valid.");
  if (row.expires_at < Date.now()) {
    db.prepare("DELETE FROM invitations WHERE token_hash = ?").run(row.token_hash);
    throw new Error("This setup link expired. Ask the shop admin to send a new one.");
  }
  const account = db.prepare("SELECT id, name, email, role, active FROM users WHERE id = ?").get(row.user_id);
  if (!account) throw new Error("The account for this link no longer exists.");
  if (!account.active) throw new Error("This account is deactivated. Ask the Super Admin to activate it.");
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), account.id);
  db.prepare("DELETE FROM invitations WHERE token_hash = ?").run(row.token_hash);
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(account.id);
  logActivity({ id: account.id, name: account.name, role: account.role, email: account.email }, { action: "account.password_set", entity: "account", entityId: account.id });
  return account;
}

export function pendingInvitations() {
  return db
    .prepare(`SELECT u.id, u.name, u.email, u.role, s.name AS shop_name, i.expires_at
              FROM invitations i JOIN users u ON u.id = i.user_id LEFT JOIN shops s ON s.id = u.shop_id
              ORDER BY i.expires_at DESC`)
    .all();
}

export function revokeInvitation(user, form) {
  if (user.role !== "superadmin" && !can(user, "shops")) throw new Error("You are not allowed to revoke invitations.");
  const userId = Number(value(form, "id"));
  db.prepare("DELETE FROM invitations WHERE user_id = ?").run(userId);
  logActivity(user, { action: "account.invitation_revoked", entity: "account", entityId: userId });
  return userId;
}

export function saveUser(user, form) {
  if (user.role !== "superadmin" && !can(user, "shops")) throw new Error("You are not allowed to create accounts.");
  const id = Number(value(form, "id") || 0);
  const name = required(value(form, "name"), "Name is required.");
  const email = normalizeEmail(required(value(form, "email"), "Email is required."));
  if (!EMAIL_PATTERN.test(email)) throw new Error("Enter a valid email address.");
  const password = String(form.get("password") || "");
  const role = value(form, "role", "admin");
  const shopIds = form.getAll("shops").map(Number).filter((n) => Number.isFinite(n));
  const assignedShop = Number(value(form, "shop_id") || 0) || null;

  if (user.role === "superadmin") {
    if (!["superadmin", "admin", "shop"].includes(role)) throw new Error("Choose a valid role.");
  } else {
    if (role !== "shop") throw new Error("Admins can only create shop accounts.");
    const allowed = shopIdsFor(user);
    if (assignedShop && !allowed.includes(assignedShop)) throw new Error("You can only attach a shop account to your own shops.");
    if (!shopIds.length && !allowed.includes(assignedShop)) throw new Error("Pick one of your assigned shops.");
  }

  if (id === user.id && role !== "superadmin") throw new Error("You cannot remove your own Super Admin role.");
  if (id === user.id && !flag(form, "active")) throw new Error("You cannot deactivate your own account.");

  if (id && user.role !== "superadmin") {
    const target = db.prepare("SELECT id, role FROM users WHERE id = ?").get(id);
    if (!target || target.role !== "shop") throw new Error("You can only edit shop accounts.");
  }

  const existing = db.prepare("SELECT id, role FROM users WHERE email = ?").get(email);
  if (existing && existing.id !== id) throw new Error("That email is already registered.");
  if (existing && existing.role === "superadmin" && user.role !== "superadmin") throw new Error("Super Admin accounts can only be changed by a Super Admin.");

  const active = flag(form, "active");
  const permissions = {
    create: user.role === "superadmin" ? flag(form, "can_create_shops") : 0,
    products: flag(form, "can_manage_products"),
    orders: flag(form, "can_manage_orders"),
    settings: flag(form, "can_manage_settings"),
    inventory: flag(form, "can_manage_inventory"),
    delivery: flag(form, "can_update_delivery"),
    cod: flag(form, "can_collect_cod"),
  };

  let userId = id;
  let invitation = "";
  if (id) {
    if (password) {
      if (password.length < 8) throw new Error("Password must be at least 8 characters.");
      db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), id);
      db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
    }
    db.prepare(
      `UPDATE users SET name = ?, email = ?, role = ?, active = ?, shop_id = ?,
        can_create_shops = ?, can_manage_products = ?, can_manage_orders = ?, can_manage_settings = ?,
        can_manage_inventory = ?, can_update_delivery = ?, can_collect_cod = ? WHERE id = ?`
    ).run(name, email, role, active, role === "shop" ? assignedShop : null, permissions.create, permissions.products, permissions.orders,
      permissions.settings, permissions.inventory, permissions.delivery, permissions.cod, id);
  } else {
    if (password && password.length < 8) throw new Error("Password must be at least 8 characters.");
    userId = Number(
      db.prepare(
        `INSERT INTO users (name, email, password_hash, role, active, shop_id, can_create_shops, can_manage_products, can_manage_orders,
           can_manage_settings, can_manage_inventory, can_update_delivery, can_collect_cod)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(name, email, password ? hashPassword(password) : "", role, active, role === "shop" ? assignedShop : null,
        permissions.create, permissions.products, permissions.orders, permissions.settings, permissions.inventory, permissions.delivery, permissions.cod).lastInsertRowid
    );
    if (!Number.isFinite(userId)) throw new Error("Account could not be created.");
    // No password means the account can only be activated through a hashed setup link.
    if (!password) invitation = createInvitation(userId, user.id);
  }

  const shops = role === "admin" ? shopIds : [];
  db.prepare("DELETE FROM shop_admins WHERE user_id = ?").run(userId);
  for (const shopId of shops) {
    if (user.role !== "superadmin") assertShopAccess(user, shopId);
    db.prepare("INSERT OR IGNORE INTO shop_admins (user_id, shop_id) VALUES (?, ?)").run(userId, shopId);
  }
  logActivity(user, {
    action: id ? "account.updated" : invitation ? "account.invited" : "account.created",
    entity: "account", entityId: userId, detail: `${role} · ${email}`, shopId: assignedShop,
  });
  return { id: userId, invitation };
}

export function setUserActive(user, form) {
  if (user.role !== "superadmin") throw new Error("Only the Super Admin can activate or deactivate accounts.");
  const id = Number(value(form, "id"));
  if (id === user.id) throw new Error("You cannot deactivate your own account.");
  const target = db.prepare("SELECT active FROM users WHERE id = ?").get(id);
  if (!target) throw new Error("Account not found.");
  db.prepare("UPDATE users SET active = 1 - active WHERE id = ?").run(id);
  if (target.active === 1) db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  logActivity(user, { action: target.active === 1 ? "account.deactivated" : "account.activated", entity: "account", entityId: id });
  return id;
}

export function saveCategory(user, form) {
  if (user.role !== "superadmin") throw new Error("Only the Super Admin manages categories.");
  const id = Number(value(form, "id") || 0);
  const name = required(value(form, "name"), "Category name is required.");
  if (id) {
    if (db.prepare("SELECT id FROM categories WHERE name = ? AND id <> ?").get(name, id)) throw new Error("That category name already exists.");
    db.prepare("UPDATE categories SET name = ? WHERE id = ?").run(name, id);
    logActivity(user, { action: "category.updated", entity: "category", entityId: id, detail: name });
    return id;
  }
  if (db.prepare("SELECT id FROM categories WHERE name = ?").get(name)) throw new Error("That category name already exists.");
  const createdId = Number(db.prepare("INSERT INTO categories (name) VALUES (?)").run(name).lastInsertRowid);
  logActivity(user, { action: "category.created", entity: "category", entityId: createdId, detail: name });
  return createdId;
}

export function deleteCategory(user, form) {
  if (user.role !== "superadmin") throw new Error("Only the Super Admin manages categories.");
  const id = Number(value(form, "id"));
  db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  logActivity(user, { action: "category.deleted", entity: "category", entityId: id });
}

export async function saveProduct(user, form) {
  if (!can(user, "products")) throw new Error("You do not have permission to manage products.");
  const id = Number(value(form, "id") || 0);
  const shopId = Number(required(value(form, "shop_id"), "Choose the shop that owns this product."));
  assertShopAccess(user, shopId);
  const name = required(value(form, "name"), "Product name is required.");
  const price = Number(value(form, "price"));
  if (!Number.isFinite(price) || price < 0) throw new Error("Enter a price in PKR greater than or equal to zero.");
  const categoryId = Number(value(form, "category_id") || 0) || null;
  const description = value(form, "description");
  const active = flag(form, "active");
  const image = (await storeUpload(form.get("image_file"))) || value(form, "image");

  if (id) {
    const current = db.prepare("SELECT shop_id FROM products WHERE id = ?").get(id);
    if (!current) throw new Error("Product not found.");
    assertShopAccess(user, current.shop_id);
    db.prepare("UPDATE products SET shop_id = ?, category_id = ?, name = ?, description = ?, price = ?, image = ?, active = ? WHERE id = ?")
      .run(shopId, categoryId, name, description, price, image, active, id);
    logActivity(user, { action: "product.updated", entity: "product", entityId: id, detail: name, shopId });
    return id;
  }
  const created = db.prepare("INSERT INTO products (shop_id, category_id, name, description, price, image, active) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(shopId, categoryId, name, description, price, image, active);
  logActivity(user, { action: "product.created", entity: "product", entityId: created.lastInsertRowid, detail: name, shopId });
  return Number(created.lastInsertRowid);
}

export function deleteProduct(user, form) {
  if (!can(user, "products")) throw new Error("You do not have permission to manage products.");
  const product = db.prepare("SELECT id, shop_id FROM products WHERE id = ?").get(Number(value(form, "id")));
  if (!product) throw new Error("Product not found.");
  assertShopAccess(user, product.shop_id);
  db.prepare("DELETE FROM products WHERE id = ?").run(product.id);
  logActivity(user, { action: "product.deleted", entity: "product", entityId: product.id, detail: product.name, shopId: product.shop_id });
}

function loadOrder(user, form) {
  const order = db.prepare("SELECT * FROM orders WHERE id = ? OR reference = ?").get(
    Number(value(form, "id") || 0) || Number.MAX_SAFE_INTEGER,
    value(form, "reference").toUpperCase()
  );
  if (!order) throw new Error("Order not found.");
  assertShopAccess(user, order.shop_id);
  return order;
}

export function setOrderStatus(user, form) {
  if (!can(user, "orders") && !can(user, "delivery")) throw new Error("You do not have permission to change order statuses.");
  const order = loadOrder(user, form);
  const status = value(form, "status");
  if (!ORDER_STATUSES.includes(status)) throw new Error("Choose a valid status.");
  if (order.status === status) throw new Error(`This order is already ${STATUS_LABEL[status].toLowerCase()}.`);
  if (!statusesFor(user).includes(status)) throw new Error("Your permissions do not allow moving an order to this status.");

  // Delivery staff may only touch parcels assigned to them (or unassigned ones in their shop).
  if (!can(user, "orders") && can(user, "delivery") && order.assigned_staff_id && order.assigned_staff_id !== user.id) {
    throw new Error("This delivery belongs to another staff member.");
  }

  const next = TRANSITIONS[order.status];
  if (!next.includes(status)) throw new Error(`An order that is ${STATUS_LABEL[order.status].toLowerCase()} cannot move straight to ${STATUS_LABEL[status].toLowerCase()}.`);

  db.exec("BEGIN IMMEDIATE");
  try {
    if (status === "cancelled") restockOrder(order.id);
    db.prepare(
      `UPDATE orders SET status = ?, cancelled_at = ${status === "cancelled" ? "datetime('now')" : "cancelled_at"},
         cancel_requested = ${status === "cancelled" ? "0" : "cancel_requested"}, updated_at = datetime('now') WHERE id = ?`
    ).run(status, order.id);
    addOrderEvent(order.id, { type: "status", actor: `${user.name} (${user.role})`, detail: `${STATUS_LABEL[order.status]} → ${STATUS_LABEL[status]}` });
    db.exec("COMMIT");
  } catch (failure) {
    db.exec("ROLLBACK");
    throw failure;
  }
  logActivity(user, { action: "order.status", entity: "order", entityId: order.reference, detail: `${order.status} → ${status}`, shopId: order.shop_id });
  return order.id;
}

export function recordCashCollection(user, form) {
  if (!can(user, "cod")) throw new Error("You are not allowed to confirm COD collections.");
  const order = loadOrder(user, form);
  if (order.payment_status === "collected") throw new Error("The cash for this order is already recorded.");
  if (order.status === "cancelled") throw new Error("A cancelled order has nothing to collect.");
  if (order.status !== "delivered") throw new Error("Record the cash after the parcel is marked delivered.");
  db.prepare(`UPDATE orders SET payment_status = 'collected', collected_at = datetime('now'), collected_by = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(user.id, order.id);
  addOrderEvent(order.id, { type: "payment", actor: `${user.name} (${user.role})`, detail: `COD ${order.total} collected` });
  logActivity(user, { action: "order.cod_collected", entity: "order", entityId: order.reference, detail: `Collected ${order.total}`, shopId: order.shop_id });
  return order.id;
}

export function assignDeliveryStaff(user, form) {
  if (!can(user, "orders") && !can(user, "delivery")) throw new Error("You are not allowed to assign deliveries.");
  const order = loadOrder(user, form);
  const staffId = Number(value(form, "staff_id") || 0) || null;
  if (staffId) {
    const staff = db.prepare("SELECT id, role, shop_id, active FROM users WHERE id = ?").get(staffId);
    if (!staff || !staff.active) throw new Error("Choose an active account.");
    if (staff.role !== "shop" || staff.shop_id !== order.shop_id) throw new Error("Staff must belong to the same shop as the order.");
    assertShopAccess(user, order.shop_id);
  }
  db.prepare("UPDATE orders SET assigned_staff_id = ?, updated_at = datetime('now') WHERE id = ?").run(staffId, order.id);
  addOrderEvent(order.id, { type: "note", actor: `${user.name} (${user.role})`, detail: staffId ? "Delivery assigned to a staff member" : "Delivery assignment cleared" });
  logActivity(user, { action: "order.assigned", entity: "order", entityId: order.reference, detail: staffId ? `staff ${staffId}` : "cleared", shopId: order.shop_id });
  return order.id;
}

export function resolveCancellation(user, form) {
  if (!can(user, "orders")) throw new Error("You are not allowed to handle cancellation requests.");
  const order = loadOrder(user, form);
  if (!order.cancel_requested) throw new Error("This order has no cancellation request.");
  const decision = value(form, "decision") === "reject" ? "rejected" : "approved";
  db.exec("BEGIN IMMEDIATE");
  try {
    if (decision === "approved") {
      if (["shipped", "delivered"].includes(order.status)) throw new Error("A parcel that already left the shop must be returned before it can be cancelled.");
      restockOrder(order.id);
      db.prepare(`UPDATE orders SET status = 'cancelled', cancel_requested = 0, cancelled_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(order.id);
      db.prepare(`UPDATE orders SET payment_status = 'refunded' WHERE id = ? AND payment_status = 'collected'`).run(order.id);
    } else {
      db.prepare(`UPDATE orders SET cancel_requested = 0, updated_at = datetime('now') WHERE id = ?`).run(order.id);
    }
    addOrderEvent(order.id, { type: "cancellation", actor: `${user.name} (${user.role})`, detail: decision === "approved" ? "Cancellation approved, stock returned" : "Cancellation request rejected" });
    db.exec("COMMIT");
  } catch (failure) {
    db.exec("ROLLBACK");
    throw failure;
  }
  logActivity(user, { action: "order.cancellation_resolved", entity: "order", entityId: order.reference, detail: decision, shopId: order.shop_id });
  return order.id;
}

export function addOrderNote(user, form) {
  if (!can(user, "orders") && !can(user, "delivery")) throw new Error("You are not allowed to add order notes.");
  const order = loadOrder(user, form);
  const note = required(value(form, "note"), "Write something in the note first.").slice(0, 300);
  addOrderEvent(order.id, { type: "note", actor: `${user.name} (${user.role})`, detail: note });
  logActivity(user, { action: "order.note", entity: "order", entityId: order.reference, detail: note, shopId: order.shop_id });
  return order.id;
}

export function saveStockRow(user, form) {
  if (!can(user, "inventory")) throw new Error("You do not have permission to change inventory.");
  const productId = Number(required(value(form, "product_id"), "Product is missing."));
  const product = db.prepare("SELECT shop_id FROM products WHERE id = ?").get(productId);
  if (!product) throw new Error("Product not found.");
  assertShopAccess(user, product.shop_id);
  const size = required(value(form, "size"), "Size is required.");
  const color = required(value(form, "color"), "Color is required.");
  const qty = Number(value(form, "qty"));
  if (!Number.isInteger(qty) || qty < 0) throw new Error("Stock must be a whole number of 0 or more.");
  db.prepare(
    `INSERT INTO inventory (product_id, size, color, qty) VALUES (?, ?, ?, ?)
     ON CONFLICT(product_id, size, color) DO UPDATE SET qty = excluded.qty`
  ).run(productId, size, color, qty);
  logActivity(user, { action: "inventory.updated", entity: "stock", entityId: productId, detail: `${size} / ${color} = ${qty}`, shopId: product.shop_id });
  return productId;
}

export function deleteStockRow(user, form) {
  if (!can(user, "inventory")) throw new Error("You do not have permission to change inventory.");
  const row = db.prepare("SELECT i.id, p.shop_id FROM inventory i JOIN products p ON p.id = i.product_id WHERE i.id = ?")
    .get(Number(value(form, "id")));
  if (!row) throw new Error("Stock row not found.");
  assertShopAccess(user, row.shop_id);
  db.prepare("DELETE FROM inventory WHERE id = ?").run(row.id);
  logActivity(user, { action: "inventory.deleted", entity: "stock", entityId: row.id, shopId: row.shop_id });
}

export function updateProfile(user, form) {
  const name = required(value(form, "name"), "Name is required.");
  const password = String(form.get("password") || "");
  db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, user.id);
  if (password) {
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), user.id);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
  }
  logActivity(user, { action: "profile.updated", entity: "account", entityId: user.id, detail: password ? "password changed, sessions cleared" : "name changed" });
}

export function updateShopSettings(user, form) {
  if (!can(user, "settings")) throw new Error("You do not have permission to edit shop settings.");
  return saveShop(user, form);
}

// Walk-in / phone orders recorded by staff go through the same rules as the storefront:
// server prices, real stock, a COD payment record and an audit entry.
export function recordStoreOrder({ user, shopId, customerName, customerEmail, customerPhone = "", address = "", city = "", notes = "", lines }) {
  const shop = db.prepare("SELECT id, active FROM shops WHERE id = ?").get(Number(shopId));
  if (!shop || !shop.active) throw new Error("This shop is not accepting orders right now.");
  const name = String(customerName || "").trim().slice(0, 120);
  if (!name) throw new Error("Customer name is required.");

  const items = (lines || [])
    .map((line) => ({
      productId: Number(line.productId) || null,
      stockId: Number(line.stockId) || null,
      productName: String(line.productName || "").trim(),
      size: String(line.size || "").trim(),
      color: String(line.color || "").trim(),
      qty: Number(line.qty),
      price: Number(line.price),
    }))
    .filter((line) => line.productName && Number.isInteger(line.qty) && line.qty > 0 && Number.isFinite(line.price) && line.price >= 0);
  if (!items.length) throw new Error("Add at least one product before placing the order.");

  const totals = totalsFor(items);
  const reference = nextReference(shop.id);
  let orderId;

  db.exec("BEGIN IMMEDIATE");
  try {
    const order = db.prepare(
      `INSERT INTO orders (reference, shop_id, customer_name, customer_email, customer_phone, address, city, notes,
         status, payment_method, payment_status, subtotal, delivery_fee, discount, total, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'cod', 'pending', ?, ?, ?, ?, datetime('now'))`
    ).run(reference, shop.id, name, String(customerEmail || "").trim().slice(0, 160), String(customerPhone || "").slice(0, 32),
      String(address || "").slice(0, 260), String(city || "").slice(0, 80), String(notes || "").slice(0, 280),
      totals.subtotal, totals.delivery, totals.discount, totals.total);
    orderId = Number(order.lastInsertRowid);
    const insert = db.prepare("INSERT INTO order_items (order_id, product_id, product_name, size, color, qty, price) VALUES (?, ?, ?, ?, ?, ?, ?)");
    const takeStock = db.prepare("UPDATE inventory SET qty = qty - ? WHERE id = ? AND qty >= ?");
    for (const line of items) {
      const known = line.productId
        ? db.prepare("SELECT id, name, price FROM products WHERE id = ? AND shop_id = ?").get(line.productId, shop.id)
        : db.prepare("SELECT id, name, price FROM products WHERE shop_id = ? AND name = ?").get(shop.id, line.productName);
      if (!known) throw new Error(`"${line.productName}" does not belong to this shop.`);
      if (line.stockId) {
        const taken = takeStock.run(Math.min(line.qty, 99), line.stockId, Math.min(line.qty, 99));
        if (!taken.changes) throw new Error(`Not enough stock of ${known.name} (EU ${line.size}, ${line.color}) for this order.`);
      }
      insert.run(orderId, known.id, known.name, line.size, line.color, Math.min(line.qty, 99), known.price);
    }
    addOrderEvent(orderId, { type: "status", actor: `${user?.name || "Staff"} (${user?.role || "staff"})`, detail: "Recorded in the shop dashboard · Cash on Delivery" });
    db.exec("COMMIT");
  } catch (failure) {
    db.exec("ROLLBACK");
    throw failure;
  }

  if (user) logActivity(user, { action: "order.recorded", entity: "order", entityId: reference, detail: `${items.length} line(s) · ${totals.total}`, shopId: shop.id });
  return { id: orderId, reference };
}

export function recordDashboardOrder(user, form) {
  if (!can(user, "orders")) throw new Error("You do not have permission to record orders.");
  const stockId = Number(value(form, "stock_id") || 0) || null;
  let product;
  let size = value(form, "size");
  let color = value(form, "color");

  if (stockId) {
    const variant = db.prepare(
      `SELECT i.id, i.size, i.color, i.qty, p.id AS product_id, p.shop_id, p.name, p.price, p.active, p.archived
       FROM inventory i JOIN products p ON p.id = i.product_id WHERE i.id = ?`
    ).get(stockId);
    if (!variant) throw new Error("Choose a product option from your shops.");
    if (!variant.active || variant.archived) throw new Error("This product is not on sale.");
    product = { id: variant.product_id, shop_id: variant.shop_id, name: variant.name, price: variant.price };
    size = variant.size;
    color = variant.color;
  } else {
    product = db.prepare("SELECT * FROM products WHERE id = ?").get(Number(value(form, "product_id")));
    if (!product) throw new Error("Choose a product from your shops.");
  }
  assertShopAccess(user, product.shop_id);

  const qty = Number(value(form, "qty") || 1);
  const order = recordStoreOrder({
    user,
    shopId: product.shop_id,
    customerName: value(form, "customer_name"),
    customerEmail: value(form, "customer_email"),
    customerPhone: value(form, "customer_phone"),
    address: value(form, "address"),
    city: value(form, "city"),
    notes: value(form, "notes"),
    lines: [{ productId: product.id, stockId: stockId || undefined, productName: product.name, size, color, qty, price: product.price }],
  });
  return order;
}
