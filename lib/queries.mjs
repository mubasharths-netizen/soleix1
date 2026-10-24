import { db } from "./db.mjs";

export const money = (value) => `PKR ${Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;

// Orders that count as booked sales: everything the shop is working on or has delivered.
// Pending and cancelled orders stay out of revenue, and COD collection is reported separately.
const REVENUE = "('confirmed','processing','shipped','delivered')";
const OPEN = "('pending','confirmed','processing','shipped')";

export function listShops(scopeIds = null) {
  const ids = scopeIds === null ? null : [...new Set(scopeIds.map(Number))].filter((id) => Number.isFinite(id));
  if (ids && !ids.length) return [];
  return db
    .prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM products p WHERE p.shop_id = s.id) AS product_count,
              (SELECT COUNT(*) FROM orders o WHERE o.shop_id = s.id) AS order_count,
              (SELECT COALESCE(GROUP_CONCAT(u.name, ', '), '') FROM shop_admins sa JOIN users u ON u.id = sa.user_id WHERE sa.shop_id = s.id) AS admins
       FROM shops s ${ids ? `WHERE s.id IN (${ids.map(() => "?").join(",")})` : ""} ORDER BY s.name`
    )
    .all(...(ids || []));
}

export function getShop(id) {
  return db.prepare("SELECT * FROM shops WHERE id = ?").get(Number(id));
}

// Never select password_hash: no screen needs it and it must not reach a serialized payload.
export function listUsers() {
  return db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.active, u.shop_id, u.created_at,
              u.can_create_shops, u.can_manage_products, u.can_manage_orders, u.can_manage_settings,
              u.can_manage_inventory, u.can_update_delivery, u.can_collect_cod,
              (u.password_hash <> '') AS has_password, s.name AS shop_name
       FROM users u LEFT JOIN shops s ON s.id = u.shop_id
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
      `SELECT i.*, p.name AS product_name, p.shop_id, p.price, s.name AS shop_name
       FROM inventory i JOIN products p ON p.id = i.product_id LEFT JOIN shops s ON s.id = p.shop_id
       WHERE p.shop_id IN (${ids.map(() => "?").join(",")})
       ORDER BY p.name, i.size, i.color`
    )
    .all(...ids);
}

export function listOrders(shopIds, { status = "", search = "", payment = "", cancellations = false, openOnly = false } = {}) {
  const ids = [...new Set(shopIds.map(Number))].filter((id) => Number.isFinite(id));
  if (!ids.length) return [];
  let sql = `SELECT o.*, s.name AS shop_name, u.name AS assigned_staff_name,
              (SELECT COUNT(*) FROM order_items t WHERE t.order_id = o.id) AS item_count,
              (SELECT COALESCE(SUM(t.qty), 0) FROM order_items t WHERE t.order_id = o.id) AS unit_count
             FROM orders o LEFT JOIN shops s ON s.id = o.shop_id LEFT JOIN users u ON u.id = o.assigned_staff_id
             WHERE o.shop_id IN (${ids.map(() => "?").join(",")})`;
  const params = [...ids];
  if (status === "cod_awaiting") {
    sql += " AND o.payment_status = 'pending' AND o.status IN ('shipped','delivered')";
  } else if (status === "cancel_requests") {
    sql += " AND o.cancel_requested = 1 AND o.status != 'cancelled'";
  } else if (status) {
    sql += " AND o.status = ?";
    params.push(status);
  }
  if (payment) {
    sql += " AND o.payment_status = ?";
    params.push(payment);
  }
  if (cancellations) {
    sql += " AND o.cancel_requested = 1 AND o.status != 'cancelled'";
  }
  if (openOnly) {
    sql += ` AND o.status IN ${OPEN}`;
  }
  const term = String(search || "").trim();
  if (term) {
    sql += " AND (o.customer_name LIKE ? OR o.customer_email LIKE ? OR o.customer_phone LIKE ? OR o.reference LIKE ?)";
    const like = `%${term}%`;
    params.push(like, like, like, term.toUpperCase());
  }
  sql += " ORDER BY o.id DESC LIMIT 250";
  return db.prepare(sql).all(...params);
}

export function getOrderItems(orderId) {
  return db.prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id").all(Number(orderId));
}

const ORDER_DETAIL_SELECT = `
  SELECT o.*, s.name AS shop_name, s.phone AS shop_phone, s.address AS shop_address,
         u.name AS assigned_staff_name, c.name AS collected_by_name
  FROM orders o
  JOIN shops s ON s.id = o.shop_id
  LEFT JOIN users u ON u.id = o.assigned_staff_id
  LEFT JOIN users c ON c.id = o.collected_by
`;

export function findOrderByReference(reference) {
  const order = db.prepare(`${ORDER_DETAIL_SELECT} WHERE o.reference = ?`).get(String(reference || "").trim().toUpperCase());
  if (!order) return null;
  return { ...order, items: getOrderItems(order.id), events: listOrderEvents(order.id) };
}

export function findOrderById(id) {
  const order = db.prepare(`${ORDER_DETAIL_SELECT} WHERE o.id = ?`).get(Number(id) || 0);
  if (!order) return null;
  return { ...order, items: getOrderItems(order.id), events: listOrderEvents(order.id) };
}

export function findOrdersByCheckoutToken(token) {
  const rows = db.prepare(`${ORDER_DETAIL_SELECT} WHERE o.checkout_token = ? ORDER BY s.name`).all(String(token || "").trim());
  return rows.map((order) => ({ ...order, items: getOrderItems(order.id), events: listOrderEvents(order.id) }));
}

export function listOrderEvents(orderId) {
  return db.prepare("SELECT * FROM order_events WHERE order_id = ? ORDER BY id").all(Number(orderId));
}

// A customer's own orders: matched on the verified Firebase uid first, then on the email the
// order was placed with, so guest orders move into the account once the shopper signs in.
export function listCustomerOrders({ uid, email }) {
  if (!uid && !email) return [];
  const clauses = [];
  const params = [];
  if (uid) { clauses.push("o.user_uid = ?"); params.push(uid); }
  if (email) { clauses.push("lower(o.customer_email) = ?"); params.push(String(email).toLowerCase()); }
  return db
    .prepare(`${ORDER_DETAIL_SELECT} WHERE ${clauses.join(" OR ")} ORDER BY o.id DESC`)
    .all(...params)
    .map((order) => ({ ...order, items: getOrderItems(order.id) }));
}

export function codSummary(shopIds) {
  const ids = [...new Set(shopIds.map(Number))].filter((id) => Number.isFinite(id));
  if (!ids.length) return { awaiting: [], outstanding: 0, collected: 0, collectedOrders: 0, pendingOrders: 0, pendingValue: 0, byStaff: [] };
  const marks = ids.map(() => "?").join(",");
  const one = (sql, ...params) => db.prepare(sql).get(...params);
  return {
    awaiting: db.prepare(`SELECT o.id, o.reference, o.status, o.total, o.customer_name, o.customer_phone, o.city, s.name AS shop_name
      FROM orders o JOIN shops s ON s.id = o.shop_id
      WHERE o.shop_id IN (${marks}) AND o.payment_status = 'pending' AND o.status IN ('shipped','delivered') AND o.cancel_requested = 0
      ORDER BY o.id DESC LIMIT 40`).all(...ids),
    outstanding: one(`SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE shop_id IN (${marks}) AND payment_status = 'pending' AND status IN ('shipped','delivered') AND cancel_requested = 0`).n,
    collected: one(`SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE shop_id IN (${marks}) AND payment_status = 'collected'`).n,
    collectedOrders: one(`SELECT COUNT(*) AS n FROM orders WHERE shop_id IN (${marks}) AND payment_status = 'collected'`).n,
    pendingOrders: one(`SELECT COUNT(*) AS n FROM orders WHERE shop_id IN (${marks}) AND payment_status = 'pending' AND status IN ('shipped','delivered')`).n,
    pendingValue: one(`SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE shop_id IN (${marks}) AND payment_status = 'pending'`).n,
    byStaff: db.prepare(`SELECT u.name AS staff, COUNT(o.id) AS orders, COALESCE(SUM(o.total), 0) AS value
      FROM orders o JOIN users u ON u.id = o.collected_by WHERE o.shop_id IN (${marks}) AND o.payment_status = 'collected'
      GROUP BY u.id ORDER BY value DESC`).all(...ids),
  };
}

export function deliveryTasks(userId, { superadmin = false, shopIds = [] } = {}) {
  const columns = `o.id, o.reference, o.status, o.total, o.customer_name, o.customer_phone, o.city, o.address,
    o.created_at, o.assigned_staff_id, s.name AS shop_name, u.name AS assigned_staff_name`;
  if (superadmin) {
    return db.prepare(`SELECT ${columns} FROM orders o JOIN shops s ON s.id = o.shop_id
      LEFT JOIN users u ON u.id = o.assigned_staff_id
      WHERE o.status = 'shipped' ORDER BY o.id DESC LIMIT 60`).all();
  }
  const ids = [...new Set(shopIds.map(Number))].filter((id) => Number.isFinite(id));
  if (!ids.length) return [];
  const marks = ids.map(() => "?").join(",");
  return db.prepare(`SELECT ${columns} FROM orders o JOIN shops s ON s.id = o.shop_id
    LEFT JOIN users u ON u.id = o.assigned_staff_id
    WHERE o.shop_id IN (${marks}) AND o.status = 'shipped' AND (o.assigned_staff_id = ? OR o.assigned_staff_id IS NULL)
    ORDER BY CASE WHEN o.assigned_staff_id = ? THEN 0 ELSE 1 END, o.id DESC`).all(...ids, userId, userId);
}

// Active shop staff inside the viewer's own shops — the only people a delivery can be assigned to.
export function listDeliveryStaff(shopIds) {
  const ids = [...new Set(shopIds.map(Number))].filter((id) => Number.isFinite(id));
  if (!ids.length) return [];
  return db.prepare(`SELECT id, name, email, shop_id, can_update_delivery FROM users
    WHERE role = 'shop' AND active = 1 AND shop_id IN (${ids.map(() => "?").join(",")}) ORDER BY shop_id, name`).all(...ids);
}

export function listCustomers() {
  return db.prepare(`SELECT c.*,
      (SELECT COUNT(*) FROM orders o WHERE o.user_uid = c.uid) AS order_count,
      (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.user_uid = c.uid AND o.payment_status = 'collected') AS spend,
      (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.user_uid = c.uid AND o.payment_status = 'pending' AND o.status != 'cancelled') AS cod_due,
      (SELECT MAX(o.created_at) FROM orders o WHERE o.user_uid = c.uid) AS last_order,
      (SELECT COUNT(*) FROM customer_addresses a WHERE a.uid = c.uid) AS address_count
      FROM customers c ORDER BY c.created_at DESC`).all();
}

export function getCustomer(uid) {
  return db.prepare("SELECT * FROM customers WHERE uid = ?").get(String(uid));
}

export function listAddresses(uid) {
  return db.prepare("SELECT * FROM customer_addresses WHERE uid = ? ORDER BY is_default DESC, id").all(String(uid));
}

export function activityLog(limit = 120) {
  return db.prepare(`SELECT a.*, s.name AS shop_name FROM activity_logs a LEFT JOIN shops s ON s.id = a.shop_id
    ORDER BY a.id DESC LIMIT ?`).all(Number(limit));
}

export function salesSummary(shopIds) {
  const ids = [...new Set(shopIds.map(Number))].filter((id) => Number.isFinite(id));
  if (!ids.length) {
    return { revenue: 0, orders: 0, units: 0, byStatus: [], byShop: [], byProduct: [], byMonth: [], lowStock: [] };
  }
  const marks = ids.map(() => "?").join(",");
  const booked = `o.status IN ${REVENUE} AND o.cancel_requested = 0`;
  return {
    // Server-computed totals only: delivery and discounts are part of sales, item prices are the
    // ones recorded at checkout.
    revenue: db.prepare(`SELECT COALESCE(SUM(o.total), 0) AS revenue FROM orders o WHERE o.shop_id IN (${marks}) AND ${booked}`).get(...ids).revenue,
    orders: db.prepare(`SELECT COUNT(*) AS n FROM orders WHERE shop_id IN (${marks})`).get(...ids).n,
    units: db.prepare(`SELECT COALESCE(SUM(t.qty), 0) AS n FROM order_items t JOIN orders o ON o.id = t.order_id
      WHERE o.shop_id IN (${marks}) AND ${booked}`).get(...ids).n,
    byStatus: db.prepare(`SELECT o.status, COUNT(*) AS orders, COALESCE(SUM(o.total), 0) AS value FROM orders o
      WHERE o.shop_id IN (${marks}) GROUP BY o.status ORDER BY orders DESC`).all(...ids),
    byShop: db.prepare(`SELECT s.name AS shop, COUNT(o.id) AS orders, COALESCE(SUM(o.total), 0) AS value
      FROM shops s LEFT JOIN orders o ON o.shop_id = s.id AND ${booked}
      WHERE s.id IN (${marks}) GROUP BY s.id ORDER BY value DESC`).all(...ids),
    byProduct: db.prepare(`SELECT t.product_name AS product, SUM(t.qty) AS units, SUM(t.qty * t.price) AS value
      FROM order_items t JOIN orders o ON o.id = t.order_id
      WHERE o.shop_id IN (${marks}) AND ${booked}
      GROUP BY t.product_name ORDER BY value DESC LIMIT 8`).all(...ids),
    byMonth: db.prepare(`SELECT substr(o.created_at, 1, 7) AS month, COUNT(DISTINCT o.id) AS orders, SUM(o.total) AS value
      FROM orders o WHERE o.shop_id IN (${marks}) AND ${booked}
      GROUP BY month ORDER BY month DESC LIMIT 12`).all(...ids),
    lowStock: db.prepare(`SELECT p.name AS product, p.id AS product_id, i.size, i.color, i.qty,
        CASE WHEN i.qty = 0 THEN 'out' ELSE 'low' END AS level
      FROM inventory i JOIN products p ON p.id = i.product_id
      WHERE p.shop_id IN (${marks}) AND p.archived = 0 AND i.qty <= COALESCE(NULLIF(p.low_stock, 0), 3)
      ORDER BY i.qty ASC LIMIT 12`).all(...ids),
  };
}

export function dashboardStats(shopIds) {
  const summary = salesSummary(shopIds);
  const cod = codSummary(shopIds);
  const ids = [...new Set(shopIds.map(Number))].filter((id) => Number.isFinite(id));
  const marks = ids.length ? ids.map(() => "?").join(",") : "NULL";
  const one = (sql, ...params) => db.prepare(sql).get(...params).n;
  const scope = ids.length ? ` AND shop_id IN (${marks})` : "";
  return {
    ...summary,
    cod,
    shops: ids.length,
    customers: one("SELECT COUNT(*) AS n FROM customers WHERE active = 1"),
    staff: one("SELECT COUNT(*) AS n FROM users WHERE active = 1"),
    products: ids.length ? one(`SELECT COUNT(*) AS n FROM products WHERE archived = 0 AND shop_id IN (${marks})`, ...ids) : 0,
    openOrders: ids.length ? one(`SELECT COUNT(*) AS n FROM orders WHERE status IN ${OPEN} AND shop_id IN (${marks})`, ...ids) : 0,
    pendingOrders: ids.length ? one(`SELECT COUNT(*) AS n FROM orders WHERE status = 'pending' AND shop_id IN (${marks})`, ...ids) : 0,
    cancelRequests: one(`SELECT COUNT(*) AS n FROM orders WHERE cancel_requested = 1 AND status != 'cancelled'${scope}`, ...ids),
    lowStockCount: ids.length ? one(`SELECT COUNT(*) AS n FROM inventory i JOIN products p ON p.id = i.product_id
      WHERE i.qty <= COALESCE(NULLIF(p.low_stock, 0), 3) AND p.archived = 0 AND p.shop_id IN (${marks})`, ...ids) : 0,
    outOfStockCount: ids.length ? one(`SELECT COUNT(*) AS n FROM inventory i JOIN products p ON p.id = i.product_id
      WHERE i.qty = 0 AND p.archived = 0 AND p.shop_id IN (${marks})`, ...ids) : 0,
  };
}

export { db };
