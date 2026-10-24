import { cache } from "react";
import { db } from "./db.mjs";
import { variantKey } from "./catalog.mjs";

const SETTING_DEFAULTS = {
  delivery_fee: "250",
  free_delivery_over: "15000",
  order_prefix: "SOL",
  discount_code: "",
  discount_percent: "",
  discount_flat: "",
  discount_minimum: "",
};

// Shop settings live in the database so the Main Admin can change delivery and discount rules
// without a redeploy. Anything unset falls back to the launch defaults.
export function siteSettings() {
  const rows = db.prepare("SELECT key, value FROM settings").all();
  const stored = new Map(rows.map((row) => [row.key, row.value]));
  return {
    deliveryFee: Number(stored.get("delivery_fee") ?? SETTING_DEFAULTS.delivery_fee) || 0,
    freeDeliveryOver: Number(stored.get("free_delivery_over") ?? SETTING_DEFAULTS.free_delivery_over) || 0,
    orderPrefix: stored.get("order_prefix") || SETTING_DEFAULTS.order_prefix,
    discountCode: stored.get("discount_code") || "",
    discountPercent: Number(stored.get("discount_percent") || 0) || 0,
    discountFlat: Number(stored.get("discount_flat") || 0) || 0,
    discountMinimum: Number(stored.get("discount_minimum") || 0) || 0,
  };
}

export function saveSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  ).run(String(key), String(value ?? ""));
}

const CATALOG_SELECT = `
  SELECT p.id, p.slug, p.name, p.description, p.price, p.original_price, p.image, p.alt_image,
         p.audience, p.badge, p.collections, p.low_stock, p.active, p.archived,
         p.shop_id, s.name AS shop_name, s.active AS shop_active, c.name AS category_name
  FROM products p
  JOIN shops s ON s.id = p.shop_id
  LEFT JOIN categories c ON c.id = p.category_id
`;

function build(rows, stockRows) {
  const byProduct = new Map();
  for (const row of stockRows) {
    const list = byProduct.get(row.product_id) || [];
    list.push(row);
    byProduct.set(row.product_id, list);
  }
  return rows.map((row) => {
    const stock = {};
    const sizes = new Set();
    const colors = new Set();
    let totalStock = 0;
    for (const line of byProduct.get(row.id) || []) {
      stock[variantKey(line.size, line.color)] = line.qty;
      sizes.add(Number(line.size));
      colors.add(line.color);
      totalStock += line.qty;
    }
    return {
      id: row.slug || String(row.id),
      dbId: row.id,
      name: row.name,
      description: row.description,
      category: row.category_name || "Uncategorised",
      categoryId: null,
      audience: row.audience || "Men",
      price: Number(row.price),
      originalPrice: row.original_price ? Number(row.original_price) : undefined,
      image: row.image,
      altImage: row.alt_image || row.image,
      badge: row.badge || "",
      collections: String(row.collections || "").split(",").filter(Boolean),
      sizes: [...sizes].filter(Number.isFinite).sort((a, b) => a - b),
      colors: [...colors],
      lowStock: Number(row.low_stock) || 3,
      stock,
      totalStock,
      shopId: row.shop_id,
      shopName: row.shop_name,
      available: Boolean(row.active) && !row.archived && row.shop_active,
    };
  });
}

// Only products from active shops reach shoppers; staff dashboards keep seeing everything.
export const loadCatalog = cache((includeUnavailable = false) => {
  const where = includeUnavailable ? "" : "WHERE p.archived = 0 AND p.active = 1 AND s.active = 1";
  const rows = db.prepare(`${CATALOG_SELECT} ${where} ORDER BY p.name`).all();
  const ids = rows.map((row) => row.id);
  if (!ids.length) return [];
  const marks = ids.map(() => "?").join(",");
  const stockRows = db.prepare(`SELECT product_id, size, color, qty FROM inventory WHERE product_id IN (${marks})`).all(...ids);
  return build(rows, stockRows);
});

export function getCatalogProduct(slug) {
  return loadCatalog(true).find((product) => product.id === String(slug));
}

export function publicShops() {
  return db.prepare("SELECT id, name, description, address, phone FROM shops WHERE active = 1 ORDER BY name").all();
}

export function publicCategories() {
  return db
    .prepare(
      `SELECT c.id, c.name, COUNT(p.id) AS product_count FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.archived = 0 AND p.active = 1
       LEFT JOIN shops s ON s.id = p.shop_id AND s.active = 1
       GROUP BY c.id ORDER BY c.name`
    )
    .all();
}
