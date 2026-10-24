// Copies the launch catalogue (lib/products.js) into the database so the storefront, the
// dashboards and checkout all read the same products, prices and stock.
// Safe to re-run: existing products keep their edits and their stock levels.
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { db } from "../lib/db.mjs";

const FORCE = process.argv.includes("--force");

const source = readFileSync(join(process.cwd(), "lib/products.js"), "utf8").replace(/export const/g, "const") + "\nexport { products, collections };\n";
const temp = join(tmpdir(), "soleix-catalogue-load.mjs");
writeFileSync(temp, source);
const { products } = await import(pathToFileURL(temp).href);

const shops = db.prepare("SELECT id, name FROM shops WHERE active = 1 ORDER BY id").all();
if (!shops.length) {
  console.error("No active shops found. Run `npm run seed:demo` (or create a shop in the Super Admin panel) first.");
  process.exit(1);
}

const insertCategory = db.prepare("INSERT INTO categories (name) VALUES (?)");
const category = (name) => {
  const found = db.prepare("SELECT id FROM categories WHERE name = ?").get(name);
  if (found) return found.id;
  return Number(insertCategory.run(name).lastInsertRowid);
};

const defaultStock = (product, size) => {
  if (product.outOfStock?.includes(size)) return 0;
  if (product.lowStock && size === product.sizes[0]) return product.lowStock;
  return 8;
};

const findExisting = (product) =>
  db.prepare("SELECT id FROM products WHERE slug = ?").get(product.id) ||
  db.prepare("SELECT id FROM products WHERE slug IS NULL AND (name = ? OR name LIKE ?)").get(product.name, `${product.name} (%`);

let created = 0;
let updated = 0;
let stockLines = 0;

db.exec("BEGIN");
try {
  for (const [index, product] of products.entries()) {
    const shop = shops[index % shops.length];
    const fields = {
      slug: product.id,
      category_id: category(product.category),
      name: product.name,
      description: product.description,
      price: product.price,
      original_price: product.originalPrice ?? null,
      image: product.image,
      alt_image: product.altImage || product.image,
      audience: product.audience,
      badge: product.badge || "",
      collections: (product.collections || []).join(","),
      low_stock: product.lowStock || 3,
    };

    const existing = findExisting(product);
    const productId = existing
      ? Number(existing.id)
      : Number(db.prepare(
          `INSERT INTO products (slug, shop_id, category_id, name, description, price, original_price, image, alt_image, audience, badge, collections, low_stock, active, archived)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`
        ).run(
          fields.slug, shop, fields.category_id, fields.name, fields.description, fields.price, fields.original_price,
          fields.image, fields.alt_image, fields.audience, fields.badge, fields.collections, fields.low_stock
        ).lastInsertRowid);

    if (existing) {
      updated += 1;
      // Fill in the storefront columns for rows created by the first release. Prices and names
      // stay as the shop set them unless --force is passed; stock is never overwritten.
      const pairs = [
        ["category_id", fields.category_id],
        ["description", fields.description],
        ["original_price", fields.original_price],
        ["image", fields.image],
        ["alt_image", fields.alt_image],
        ["audience", fields.audience],
        ["badge", fields.badge],
        ["collections", fields.collections],
        ["low_stock", fields.low_stock],
        ["slug", fields.slug],
      ];
      if (FORCE) pairs.unshift(["name", fields.name], ["price", fields.price]);
      db.prepare(`UPDATE products SET ${pairs.map(([column]) => `${column} = ?`).join(", ")} WHERE id = ?`)
        .run(...pairs.map(([, value]) => value), productId);
    } else {
      created += 1;
    }

    const insertStock = db.prepare("INSERT OR IGNORE INTO inventory (product_id, size, color, qty) VALUES (?, ?, ?, ?)");
    for (const color of product.colors) {
      for (const size of product.sizes) {
        if (insertStock.run(productId, String(size), color, defaultStock(product, size)).changes) stockLines += 1;
      }
    }
  }

  const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  for (const [key, value] of Object.entries({ delivery_fee: "250", free_delivery_over: "15000", order_prefix: "SOL" })) insertSetting.run(key, value);

  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
}

console.log(`Catalogue ready: ${created} new, ${updated} linked, ${stockLines} stock lines added across ${shops.length} shop(s).`);
console.log("The storefront now reads these products from the database.");
