import { db } from "./db.mjs";

export const money = (value) => `PKR ${Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;

export function listShops() {
  return db
    .prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM products p WHERE p.shop_id = s.id) AS product_count,
              (SELECT COUNT(*) FROM orders o WHERE o.shop_id = s.id) AS order_count
       FROM shops s ORDER BY s.name`
    )
    .all();
}

export function getShop(id) {
  return db.prepare("SELECT * FROM shops WHERE id = ?").get(Number(id));
}

export function listUsers() {
  return db
    .prepare(
      `SELECT u.*, s.name AS shop_name FROM users u LEFT JOIN shops s ON s.id = u.shop_id
       ORDER BY CASE u.role WHEN 'superadmin' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.name`
    )
    .all();
}

export function listAdminShops(userId) {
  return db.prepare("SELECT shop_id FROM shop_admins WHERE user_id = ?").all(Number(userId)).map((row) => row.shop_id);
}

export function listCategories() {
  return db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
       FROM categories c ORDER BY c.name`
    )
    .all();
}

const PRODUCT_SELECT = `
  SELECT p.*, s.name AS shop_name, c.name AS category_name,
         (SELECT COALESCE(SUM(i.qty), 0) FROM inventory i WHERE i.product_id = p.id) AS stock
  FROM products p
  LEFT JOIN shops s ON s.id = p.shop_id
  LEFT JOIN categories c ON c.id = p.category_id
`;

export function listProducts(shopIds, { search = "", categoryId = "", status = "" } = {}) {
  const ids = [...new Set(shopIds.map(Number))].filter((id) => Number.isFinite(id));
  if (!ids.length) return [];
  let sql = `${PRODUCT_SELECT} WHERE p.shop_id IN (${ids.map(() => "?").join(",")})`;
  const params = [...ids];
  if (search) {
    sql += " AND p.name LIKE ?";
    params.push(`%${search}%`);
  }
  if (categoryId) {
    sql += " AND p.category_id = ?";
    params.push(Number(categoryId));
  }
  if (status === "active") sql += " AND p.active = 1";
  if (status === "inactive") sql += " AND p.active = 0";
  if (status === "low") sql += " AND stock <= 3";
  sql += " ORDER BY p.name";
  return db.prepare(sql).all(...params);
}

export function getProduct(id) {
  return db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(Number(id));
}

export function listInventory(shopIds) {
  const ids = [...new Set(shopIds.map(Number))].filter((id) => Number.isFinite(id));
  if (!ids.length) return [];
  return db
    .prepare(
      `SELECT i.*, p.name AS product_name, p.shop_id, s.name AS shop_name
       FROM inventory i JOIN products p ON p.id = i.product_id LEFT JOIN shops s ON s.id = p.shop_id
       WHERE p.shop_id IN (${ids.map(() => "?").join(",")})
       ORDER BY p.name, i.size, i.color`
    )
    .all(...ids);
}

export function listOrders(shopIds, { status = "", search = "" } = {}) {
  const ids = [...new Set(shopIds.map(Number))].filter((id) => Number.isFinite(id));
  if (!ids.length) return [];
  let sql = `SELECT o.*, s.name AS shop_name, (SELECT COUNT(*) FROM order_items t WHERE t.order_id = o.id) AS item_count,
              (SELECT COALESCE(SUM(t.qty * t.price), 0) FROM order_items t WHERE t.order_id = o.id) AS total
             FROM orders o LEFT JOIN shops s ON s.id = o.shop_id WHERE o.shop_id IN (${ids.map(() => "?").join(",")})`;
  const params = [...ids];
  if (status) {
    sql += " AND o.status = ?";
    params.push(status);
  }
  if (search) {
    sql += " AND (o.customer_name LIKE ? OR o.customer_email LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += " ORDER BY o.id DESC";
  return db.prepare(sql).all(...params);
}

export function getOrderItems(orderId) {
  return db.prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id").all(Number(orderId));
}

export function salesSummary(shopIds) {
  const ids = [...new Set(shopIds.map(Number))].filter((id) => Number.isFinite(id));
  if (!ids.length) {
    return { revenue: 0, orders: 0, units: 0, byStatus: [], byShop: [], byProduct: [], byMonth: [], lowStock: [] };
  }
  const marks = ids.map(() => "?").join(",");
  return {
    revenue: db.prepare(`SELECT COALESCE(SUM(t.qty * t.price), 0) AS revenue FROM order_items t JOIN orders o ON o.id = t.order_id
      WHERE o.shop_id IN (${marks}) AND o.status IN ('paid','shipped','delivered')`).get(...ids).revenue,
    orders: db.prepare(`SELECT COUNT(*) AS n FROM orders WHERE shop_id IN (${marks})`).get(...ids).n,
    units: db.prepare(`SELECT COALESCE(SUM(t.qty), 0) AS n FROM order_items t JOIN orders o ON o.id = t.order_id
      WHERE o.shop_id IN (${marks}) AND o.status IN ('paid','shipped','delivered')`).get(...ids).n,
    byStatus: db.prepare(`SELECT status, COUNT(*) AS orders, COALESCE(SUM(sub.total), 0) AS value FROM orders o
      LEFT JOIN (SELECT order_id, SUM(qty * price) AS total FROM order_items GROUP BY order_id) sub ON sub.order_id = o.id
      WHERE o.shop_id IN (${marks}) GROUP BY status ORDER BY orders DESC`).all(...ids),
    byShop: db.prepare(`SELECT s.name AS shop, COUNT(o.id) AS orders,
        COALESCE(SUM(t.qty * t.price), 0) AS value
      FROM shops s LEFT JOIN orders o ON o.shop_id = s.id LEFT JOIN order_items t ON t.order_id = o.id
        AND o.status IN ('paid','shipped','delivered')
      WHERE s.id IN (${marks}) GROUP BY s.id ORDER BY value DESC`).all(...ids),
    byProduct: db.prepare(`SELECT t.product_name AS product, SUM(t.qty) AS units, SUM(t.qty * t.price) AS value
      FROM order_items t JOIN orders o ON o.id = t.order_id
      WHERE o.shop_id IN (${marks}) AND o.status IN ('paid','shipped','delivered')
      GROUP BY t.product_name ORDER BY value DESC LIMIT 8`).all(...ids),
    byMonth: db.prepare(`SELECT substr(o.created_at, 1, 7) AS month, COUNT(DISTINCT o.id) AS orders, SUM(t.qty * t.price) AS value
      FROM orders o JOIN order_items t ON t.order_id = o.id
      WHERE o.shop_id IN (${marks}) AND o.status IN ('paid','shipped','delivered')
      GROUP BY month ORDER BY month DESC LIMIT 12`).all(...ids),
    lowStock: db.prepare(`SELECT p.name AS product, i.size, i.color, i.qty FROM inventory i JOIN products p ON p.id = i.product_id
      WHERE p.shop_id IN (${marks}) AND i.qty <= 3 ORDER BY i.qty ASC LIMIT 10`).all(...ids),
  };
}

export function dashboardStats(shopIds) {
  const summary = salesSummary(shopIds);
  const ids = [...new Set(shopIds.map(Number))].filter((id) => Number.isFinite(id));
  const marks = ids.length ? ids.map(() => "?").join(",") : "NULL";
  const one = (sql, ...params) => db.prepare(sql).get(...params).n;
  return {
    ...summary,
    shops: ids.length,
    products: ids.length ? one(`SELECT COUNT(*) AS n FROM products WHERE shop_id IN (${marks})`, ...ids) : 0,
    admins: one("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'"),
    pendingOrders: ids.length ? one(`SELECT COUNT(*) AS n FROM orders WHERE status = 'pending' AND shop_id IN (${marks})`, ...ids) : 0,
    lowStockCount: ids.length ? one(`SELECT COUNT(*) AS n FROM inventory i JOIN products p ON p.id = i.product_id
      WHERE i.qty <= 3 AND p.shop_id IN (${marks})`, ...ids) : 0,
  };
}

export { db };
