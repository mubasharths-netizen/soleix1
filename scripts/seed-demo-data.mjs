import { db } from "../lib/db.mjs";
import { hashPassword, normalizeEmail } from "../lib/password.mjs";

const STAFF = [
  { email: "manager@soleix.local", name: "Imran Sheikh", role: "admin", shops: [1, 2], perms: { can_manage_products: 1, can_manage_orders: 1, can_manage_settings: 1 }, password: process.env.SEED_ADMIN_PASSWORD || "SoleixManager!2026" },
  { email: "store.downtown@soleix.local", name: "Sana Khalid", role: "shop", shop_id: 1, perms: { can_manage_products: 1, can_manage_orders: 1 }, password: process.env.SEED_SHOP_PASSWORD || "SoleixStore!2026" },
  { email: "store.harbour@soleix.local", name: "Bilal Ahmed", role: "shop", shop_id: 3, perms: { can_manage_orders: 1 }, password: process.env.SEED_SHOP_PASSWORD || "SoleixStore!2026" },
];

for (const person of STAFF) {
  const email = normalizeEmail(person.email);
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  const id = existing
    ? (db.prepare("UPDATE users SET name = ?, role = ?, password_hash = ?, active = 1, shop_id = ? WHERE id = ?").run(person.name, person.role, hashPassword(person.password), person.shop_id ?? null, existing.id), existing.id)
    : Number(db.prepare("INSERT INTO users (email, name, password_hash, role, shop_id) VALUES (?, ?, ?, ?, ?)").run(email, person.name, hashPassword(person.password), person.role, person.shop_id ?? null).lastInsertRowid);
  db.prepare("UPDATE users SET can_manage_products = ?, can_manage_orders = ?, can_manage_settings = ?, can_create_shops = 0 WHERE id = ?").run(person.perms.can_manage_products ?? 0, person.perms.can_manage_orders ?? 0, person.perms.can_manage_settings ?? 0, id);
  db.prepare("DELETE FROM shop_admins WHERE user_id = ?").run(id);
  for (const shopId of person.shops ?? (person.shop_id ? [person.shop_id] : [])) db.prepare("INSERT OR IGNORE INTO shop_admins (user_id, shop_id) VALUES (?, ?)").run(id, shopId);
  console.log(`${existing ? "Updated" : "Created"} ${person.role}: ${email}`);
}

if (db.prepare("SELECT COUNT(*) c FROM orders").get().c && !process.argv.includes("--force")) {
  console.log("Orders already exist. Re-run with --force to add another demo cycle.");
} else {
  const customers = ["Ayaan Raza", "Mahnoor Fatima", "Hassan Javed", "Zara Sheikh", "Bilal Khan", "Emaan Malik", "Danish Iqbal", "Hira Nadeem"];
  const statuses = ["delivered", "delivered", "shipped", "paid", "pending", "cancelled"];
  const products = db.prepare("SELECT id, shop_id, name, price FROM products WHERE active = 1 ORDER BY id").all();
  const insertOrder = db.prepare("INSERT INTO orders (shop_id, customer_name, customer_email, status, created_at) VALUES (?, ?, ?, ?, datetime('now', ?))");
  const insertItem = db.prepare("INSERT INTO order_items (order_id, product_id, product_name, size, color, qty, price) VALUES (?, ?, ?, ?, ?, ?, ?)");
  for (let day = 1; day <= 18; day += 2) {
    for (const shopId of [1, 2, 3]) {
      if (shopId === 2 && day % 6 === 1) continue;
      const shopProducts = products.filter((product) => product.shop_id === shopId);
      if (!shopProducts.length) continue;
      const customer = customers[(day + shopId) % customers.length];
      const orderId = Number(insertOrder.run(shopId, customer, `${customer.split(" ")[0].toLowerCase()}@example.pk`, statuses[(day + shopId) % statuses.length], `-${day} days`).lastInsertRowid);
      for (const product of shopProducts.slice(0, 1 + ((day + shopId) % 2))) {
        insertItem.run(orderId, product.id, product.name, "42", "Ivory", 1 + ((day + shopId) % 2), product.price);
      }
    }
  }
  console.log(`Seeded ${db.prepare("SELECT COUNT(*) c FROM orders").get().c} demo orders across all shops (order records, not invented statistics).`);
}
console.log("Done. These are local demo credentials — change them from the Super Admin panel before any real deployment.");
