import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { db } from "./db.mjs";
import { hashPassword, normalizeEmail } from "./password.mjs";
import { assertShopAccess, can, shopIdsFor } from "./session.mjs";

export const UPLOAD_DIR = join(process.env.SOLEIX_DATA_DIR || join(process.cwd(), "data"), "uploads");
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"];

const PERMITTED_STATUSES = {
  superadmin: ORDER_STATUSES,
  admin: ["paid", "shipped", "delivered", "cancelled"],
  shop: ["paid", "shipped", "delivered", "cancelled"],
};

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
  if (user.role !== "superadmin") db.prepare("INSERT OR IGNORE INTO shop_admins (user_id, shop_id) VALUES (?, ?)").run(user.id, shopId);
  return shopId;
}

export function deleteShop(user, form) {
  if (user.role !== "superadmin") throw new Error("Only the Super Admin can delete shops.");
  const id = Number(value(form, "id"));
  assertShopAccess(user, id);
  db.prepare("DELETE FROM shops WHERE id = ?").run(id);
  return id;
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
  };

  let userId = id;
  if (id) {
    if (password) {
      if (password.length < 8) throw new Error("Password must be at least 8 characters.");
      db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), id);
    }
    db.prepare(
      `UPDATE users SET name = ?, email = ?, role = ?, active = ?, shop_id = ?,
        can_create_shops = ?, can_manage_products = ?, can_manage_orders = ?, can_manage_settings = ? WHERE id = ?`
    ).run(name, email, role, active, role === "shop" ? assignedShop : null, permissions.create, permissions.products, permissions.orders, permissions.settings, id);
  } else {
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");
    userId = Number(
      db.prepare(
        `INSERT INTO users (name, email, password_hash, role, active, shop_id, can_create_shops, can_manage_products, can_manage_orders, can_manage_settings)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(name, email, hashPassword(password), role, active, role === "shop" ? assignedShop : null,
        permissions.create, permissions.products, permissions.orders, permissions.settings).lastInsertRowid
    );
    if (!Number.isFinite(userId)) throw new Error("Account could not be created.");
  }

  const shops = role === "admin" ? shopIds : [];
  db.prepare("DELETE FROM shop_admins WHERE user_id = ?").run(userId);
  for (const shopId of shops) {
    if (user.role !== "superadmin") assertShopAccess(user, shopId);
    db.prepare("INSERT OR IGNORE INTO shop_admins (user_id, shop_id) VALUES (?, ?)").run(userId, shopId);
  }
  return userId;
}

export function setUserActive(user, form) {
  if (user.role !== "superadmin") throw new Error("Only the Super Admin can activate or deactivate accounts.");
  const id = Number(value(form, "id"));
  if (id === user.id) throw new Error("You cannot deactivate your own account.");
  const target = db.prepare("SELECT active FROM users WHERE id = ?").get(id);
  if (!target) throw new Error("Account not found.");
  db.prepare("UPDATE users SET active = 1 - active WHERE id = ?").run(id);
  if (target.active === 1) db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  return id;
}

export function saveCategory(user, form) {
  if (user.role !== "superadmin") throw new Error("Only the Super Admin manages categories.");
  const id = Number(value(form, "id") || 0);
  const name = required(value(form, "name"), "Category name is required.");
  if (id) {
    if (db.prepare("SELECT id FROM categories WHERE name = ? AND id <> ?").get(name, id)) throw new Error("That category name already exists.");
    db.prepare("UPDATE categories SET name = ? WHERE id = ?").run(name, id);
    return id;
  }
  if (db.prepare("SELECT id FROM categories WHERE name = ?").get(name)) throw new Error("That category name already exists.");
  return Number(db.prepare("INSERT INTO categories (name) VALUES (?)").run(name).lastInsertRowid);
}

export function deleteCategory(user, form) {
  if (user.role !== "superadmin") throw new Error("Only the Super Admin manages categories.");
  db.prepare("DELETE FROM categories WHERE id = ?").run(Number(value(form, "id")));
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
    return id;
  }
  const created = db.prepare("INSERT INTO products (shop_id, category_id, name, description, price, image, active) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(shopId, categoryId, name, description, price, image, active);
  return Number(created.lastInsertRowid);
}

export function deleteProduct(user, form) {
  if (!can(user, "products")) throw new Error("You do not have permission to manage products.");
  const product = db.prepare("SELECT id, shop_id FROM products WHERE id = ?").get(Number(value(form, "id")));
  if (!product) throw new Error("Product not found.");
  assertShopAccess(user, product.shop_id);
  db.prepare("DELETE FROM products WHERE id = ?").run(product.id);
}

export function setOrderStatus(user, form) {
  if (!can(user, "orders")) throw new Error("You do not have permission to change order statuses.");
  const id = Number(value(form, "id"));
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
  if (!order) throw new Error("Order not found.");
  assertShopAccess(user, order.shop_id);
  const status = value(form, "status");
  const permitted = PERMITTED_STATUSES[user.role] || [];
  if (!permitted.includes(status)) throw new Error("Your role is not allowed to set this status.");
  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
  return id;
}

export function saveStockRow(user, form) {
  if (!can(user, "products")) throw new Error("You do not have permission to change inventory.");
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
  return productId;
}

export function deleteStockRow(user, form) {
  if (!can(user, "products")) throw new Error("You do not have permission to change inventory.");
  const row = db.prepare("SELECT i.id, p.shop_id FROM inventory i JOIN products p ON p.id = i.product_id WHERE i.id = ?")
    .get(Number(value(form, "id")));
  if (!row) throw new Error("Stock row not found.");
  assertShopAccess(user, row.shop_id);
  db.prepare("DELETE FROM inventory WHERE id = ?").run(row.id);
}

export function updateProfile(user, form) {
  const name = required(value(form, "name"), "Name is required.");
  const password = String(form.get("password") || "");
  db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, user.id);
  if (password) {
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), user.id);
  }
}

export function updateShopSettings(user, form) {
  if (!can(user, "settings")) throw new Error("You do not have permission to edit shop settings.");
  return saveShop(user, form);
}

export function recordStoreOrder({ shopId, customerName, customerEmail, lines }) {
  const shop = db.prepare("SELECT id, active FROM shops WHERE id = ?").get(Number(shopId));
  if (!shop || !shop.active) throw new Error("This shop is not accepting orders right now.");
  const name = String(customerName || "").trim();
  if (!name) throw new Error("Customer name is required.");
  const items = (lines || [])
    .map((line) => ({
      productId: Number(line.productId) || null,
      productName: String(line.productName || "").trim(),
      size: String(line.size || "").trim(),
      color: String(line.color || "").trim(),
      qty: Number(line.qty),
      price: Number(line.price),
    }))
    .filter((line) => line.productName && Number.isInteger(line.qty) && line.qty > 0 && Number.isFinite(line.price) && line.price >= 0);
  if (!items.length) throw new Error("Add at least one product before placing the order.");

  const order = db.prepare("INSERT INTO orders (shop_id, customer_name, customer_email) VALUES (?, ?, ?)")
    .run(shop.id, name.slice(0, 120), String(customerEmail || "").trim().slice(0, 160));
  const orderId = Number(order.lastInsertRowid);
  const insert = db.prepare("INSERT INTO order_items (order_id, product_id, product_name, size, color, qty, price) VALUES (?, ?, ?, ?, ?, ?, ?)");
  for (const line of items) {
    const known = line.productId
      ? db.prepare("SELECT id, name, price FROM products WHERE id = ? AND shop_id = ?").get(line.productId, shop.id)
      : db.prepare("SELECT id, name, price FROM products WHERE shop_id = ? AND name = ?").get(shop.id, line.productName);
    insert.run(orderId, known ? known.id : null, known ? known.name : line.productName, line.size, line.color, Math.min(line.qty, 99), known ? known.price : line.price);
  }
  return orderId;
}

export function recordDashboardOrder(user, form) {
  if (!can(user, "orders")) throw new Error("You do not have permission to record orders.");
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(Number(value(form, "product_id")));
  if (!product) throw new Error("Choose a product from your shops.");
  assertShopAccess(user, product.shop_id);
  const qty = Number(value(form, "qty") || 1);
  return recordStoreOrder({
    shopId: product.shop_id,
    customerName: value(form, "customer_name"),
    customerEmail: value(form, "customer_email"),
    lines: [{ productId: product.id, productName: product.name, size: value(form, "size"), color: value(form, "color"), qty, price: product.price }],
  });
}
