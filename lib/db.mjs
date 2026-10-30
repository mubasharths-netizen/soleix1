import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.SOLEIX_DATA_DIR || path.join(path.dirname(here), "data");
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "soleix.db"));
db.exec("PRAGMA foreign_keys = ON;");

// Columns added after the first release. Existing databases get them with ALTER TABLE so
// no shop, account or order data is ever rebuilt or lost.
const ADDED_COLUMNS = {
  orders: ["checkout_token TEXT NOT NULL DEFAULT ''"],
  products: [
    "slug TEXT UNIQUE",
    "original_price REAL",
    "alt_image TEXT NOT NULL DEFAULT ''",
    "audience TEXT NOT NULL DEFAULT 'Men'",
    "badge TEXT NOT NULL DEFAULT ''",
    "collections TEXT NOT NULL DEFAULT ''",
    "low_stock INTEGER NOT NULL DEFAULT 3",
    "archived INTEGER NOT NULL DEFAULT 0",
  ],
  users: [
    "can_manage_inventory INTEGER NOT NULL DEFAULT 0",
    "can_update_delivery INTEGER NOT NULL DEFAULT 0",
    "can_collect_cod INTEGER NOT NULL DEFAULT 0",
  ],
  customers: ["password_hash TEXT NOT NULL DEFAULT ''"],
};

const columns = (table) => db.prepare(`SELECT name FROM pragma_table_info(?)`).all(table).map((row) => row.name);

function addMissingColumns() {
  for (const [table, definitions] of Object.entries(ADDED_COLUMNS)) {
    const existing = new Set(columns(table));
    if (!existing.size) continue;
    for (const definition of definitions) {
      const name = definition.split(" ")[0];
      if (existing.has(name)) continue;
      // A UNIQUE column cannot be added with ALTER TABLE, so it is created as an index instead.
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition.replace(" UNIQUE", "")}`);
      if (definition.includes(" UNIQUE")) db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS uq_${table}_${name} ON ${table}(${name})`);
    }
  }
}

// The first release stored orders with a 5-value status CHECK and no payment, address or
// reference columns. SQLite cannot alter a CHECK, so that table is rebuilt in place while
// every row and every order_item link is preserved.
function rebuildLegacyOrders() {
  if (!columns("orders").length || columns("orders").includes("reference")) return;
  const schema = readFileSync(path.join(here, "schema.sql"), "utf8");
  const definition = schema.match(/CREATE TABLE IF NOT EXISTS orders \([\s\S]*?\n\);/)[0].replace("IF NOT EXISTS ", "");
  const totals = `SELECT order_id, SUM(qty * price) AS total FROM order_items GROUP BY order_id`;

  db.exec("PRAGMA foreign_keys = OFF;");
  db.exec("BEGIN");
  try {
    // legacy_alter_table keeps order_items pointing at "orders" across the rename.
    db.exec("PRAGMA legacy_alter_table = ON;");
    db.exec("ALTER TABLE orders RENAME TO orders_legacy");
    db.exec(definition);
    db.exec(`INSERT INTO orders (id, reference, shop_id, customer_name, customer_email, status, payment_status, subtotal, delivery_fee, total, created_at, updated_at)
      SELECT id, 'SOL-' || printf('%06d', id), shop_id, customer_name, customer_email,
             CASE WHEN status = 'paid' THEN 'delivered' ELSE status END,
             CASE WHEN status = 'paid' THEN 'collected' ELSE 'pending' END,
             COALESCE((SELECT total FROM (${totals}) t WHERE t.order_id = o.id), 0), 0,
             COALESCE((SELECT total FROM (${totals}) t WHERE t.order_id = o.id), 0), created_at, created_at
      FROM orders_legacy o`);
    db.exec("DROP TABLE orders_legacy");
    db.exec("PRAGMA legacy_alter_table = OFF;");
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    db.exec("PRAGMA legacy_alter_table = OFF;");
    throw error;
  }
  db.exec("PRAGMA foreign_keys = ON;");
}

addMissingColumns();
rebuildLegacyOrders();
db.exec(readFileSync(path.join(here, "schema.sql"), "utf8"));
