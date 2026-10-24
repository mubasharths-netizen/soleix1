import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { db } from "../lib/db.mjs";

const SHOPS = [
  { name: "Soleix Downtown", address: "Booti Hub, Clifton Block 5, Karachi", phone: "+92 21 3529 0001" },
  { name: "Soleix Trail House", address: "Kohsar Market, F-6, Islamabad", phone: "+92 51 2345 0002" },
  { name: "Soleix Harbour", address: "Darbar Shopping Mall, Gulberg, Lahore", phone: "+92 42 3576 0003" },
];

// lib/products.js is authored as ESM but package.json is not type:module, so load it through a temporary .mjs copy.
const source = readFileSync(join(process.cwd(), "lib/products.js"), "utf8").replace(/export const/g, "const") + "\nexport { products, collections };\n";
const temp = join(tmpdir(), "soleix-catalogue-load.mjs");
writeFileSync(temp, source);
const { products } = await import(pathToFileURL(temp).href);

const existingShops = db.prepare("SELECT id, name FROM shops").all();
if (existingShops.length && !process.argv.includes("--force")) {
  console.log(`Database already has ${existingShops.length} shop(s). Re-run with --force to add the catalogue again.`);
  process.exit(0);
}

const insertShop = db.prepare("INSERT OR IGNORE INTO shops (name, address, phone) VALUES (?, ?, ?)");
for (const shop of SHOPS) insertShop.run(shop.name, shop.address, shop.phone);
const shopIds = db.prepare("SELECT id, name FROM shops ORDER BY id").all();

const insertCategory = db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)");
const categoryIds = new Map();
for (const name of [...new Set(products.map((product) => product.category))]) {
  insertCategory.run(name);
  categoryIds.set(name, db.prepare("SELECT id FROM categories WHERE name = ?").get(name).id);
}

const insertProduct = db.prepare("INSERT INTO products (shop_id, category_id, name, description, price, image, active) VALUES (?, ?, ?, ?, ?, ?, 1)");
const insertStock = db.prepare("INSERT OR IGNORE INTO inventory (product_id, size, color, qty) VALUES (?, ?, ?, ?)");

let created = 0;
products.forEach((product, index) => {
  const shop = shopIds[index % shopIds.length];
  const result = insertProduct.run(
    shop.id,
    categoryIds.get(product.category) ?? null,
    `${product.name} (${shop.name.split(" ").slice(-1)[0]})`,
    product.description,
    product.price,
    product.image
  );
  const productId = Number(result.lastInsertRowid);
  const color = product.colors[0];
  for (const size of product.sizes) {
    let quantity = 8;
    if (product.outOfStock?.includes(size)) quantity = 0;
    else if (product.lowStock && size === product.sizes[0]) quantity = product.lowStock;
    insertStock.run(productId, String(size), color, quantity);
  }
  created += 1;
});

console.log(`Seeded ${shopIds.length} shops, ${categoryIds.size} categories, ${created} products and their stock lines.`);
console.log("Sign in as the Super Admin to see them under Products, Inventory and Reports.");
