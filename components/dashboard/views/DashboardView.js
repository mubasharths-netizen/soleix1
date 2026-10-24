import Link from "next/link";
import { Card, Notice, PageHead, PayBadge, Stat, StatusBadge, Table } from "@/components/dashboard/Bits";
import { dashboardStats, listOrders, money } from "@/lib/queries.mjs";
import { shopIdsFor } from "@/lib/session.mjs";

const SHOP_LABEL = { superadmin: "Shops on the platform", admin: "Shops you manage", shop: "Your shop" };

export default function DashboardView({ user, base, flash }) {
  const ids = shopIdsFor(user);
  const stats = dashboardStats(ids);
  const cod = stats.cod;
  const orders = listOrders(ids).slice(0, 8);
  const plural = (count) => (count === 1 ? "" : "s");

  const cards = [
    { label: SHOP_LABEL[user.role], value: ids.length, hint: ids.length ? "Live scope for this account" : "Nothing assigned yet" },
    { label: "Sales booked", value: money(stats.revenue), hint: "Confirmed through delivered, cancellations excluded" },
    { label: "Orders", value: stats.orders, hint: `${stats.units} units sold` },
    { label: "Cash collected", value: money(cod.collected), hint: `${cod.collectedOrders} order${plural(cod.collectedOrders)} marked collected` },
    { label: "COD outstanding", value: money(cod.outstanding), hint: `${cod.pendingOrders} order${plural(cod.pendingOrders)} owed on delivery` },
    { label: "Products", value: stats.products, hint: `${stats.openOrders} order${plural(stats.openOrders)} still open` },
  ];
  if (user.role !== "shop") {
    cards.push({ label: "Customer accounts", value: stats.customers, hint: "Signed up through the storefront" });
  }
  if (user.role === "superadmin") {
    cards.push({ label: "Staff accounts", value: stats.staff, hint: "Active admins, shop staff and super admins" });
  }

  const alerts = [
    stats.pendingOrders && {
      label: `${stats.pendingOrders} order${plural(stats.pendingOrders)} still pending`,
      text: "Confirm the cash reached you, then move them to Confirmed.",
      href: `${base}/orders?status=pending`,
    },
    stats.cancelRequests && {
      label: `${stats.cancelRequests} cancellation request${plural(stats.cancelRequests)} to resolve`,
      text: "Approve or reject before the parcel leaves the shop.",
      href: `${base}/orders?status=cancel_requests`,
    },
    cod.pendingOrders && {
      label: `${money(cod.outstanding)} of cash on delivery still outstanding`,
      text: "Recorded against orders that are out for delivery or delivered.",
      href: `${base}/orders?status=cod_awaiting`,
    },
    stats.outOfStockCount && {
      label: `${stats.outOfStockCount} stock line${plural(stats.outOfStockCount)} sold out`,
      text: "Customers can no longer order these sizes and colours.",
      href: `${base}/inventory`,
    },
    stats.lowStockCount && {
      label: `${stats.lowStockCount} stock line${plural(stats.lowStockCount)} running low`,
      text: "Reorder or raise the quantity before the next sale.",
      href: `${base}/inventory`,
    },
  ].filter(Boolean);

  return (
    <>
      <PageHead
        title={user.role === "shop" ? "Shop dashboard" : user.role === "admin" ? "Admin dashboard" : "Super Admin dashboard"}
        subtitle={
          ids.length
            ? `Live figures from ${ids.length} shop${plural(ids.length)} in the database.`
            : "No shop is linked to this account yet, so every shop-scoped figure below reads zero."
        }
      />
      {flash && <Notice kind={flash.kind} text={flash.text} />}

      <div className="stat-grid">
        {cards.map((card) => (
          <Stat key={card.label} label={card.label} value={card.value} hint={card.hint} />
        ))}
      </div>

      <Card title="Needs your attention" description="Counts come from the order and inventory tables, not from a demo fixture.">
        {alerts.length ? (
          <ul className="alert-list">
            {alerts.map((alert) => (
              <li key={alert.label}>
                <div>
                  <strong>{alert.label}</strong>
                  <span>{alert.text}</span>
                </div>
                <Link className="btn-ghost" href={alert.href}>
                  Open
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted" style={{ fontSize: 14 }}>Nothing is waiting on you — every open order, stock line and COD collection is clear.</p>
        )}
      </Card>

      <Card title="Latest orders" description="Every row is an order record.">
        <Table
          columns={["Order", "Shop", "Customer", "Placed", "Total", "Payment", "Status"]}
          rows={orders.map((order) => (
            <tr key={order.id}>
              <td className="num">
                <Link className="link-quiet" href={`${base}/orders?view=${order.id}`}>
                  {order.reference}
                </Link>
              </td>
              <td>{order.shop_name || "—"}</td>
              <td>{order.customer_name}</td>
              <td className="num">{order.created_at}</td>
              <td className="num">{money(order.total)}</td>
              <td><PayBadge status={order.payment_status} /></td>
              <td><StatusBadge status={order.status} /></td>
            </tr>
          ))}
          empty="No orders recorded yet."
          emptyHint="Orders appear here as soon as a customer completes checkout, or when you add one from the Orders screen."
        />
        <div className="form-actions">
          <Link className="btn-ghost" href={`${base}/orders`}>Open orders</Link>
          <Link className="btn-ghost" href={`${base}/reports`}>Open reports</Link>
        </div>
      </Card>

      {stats.lowStock.length ? (
        <Card title="Low stock alerts" description="Sizes and colours at or below each product's reorder level.">
          <Table
            columns={["Product", "Size", "Colour", "Qty left", "Level"]}
            rows={stats.lowStock.map((row) => (
              <tr key={`${row.product_id}-${row.size}-${row.color}`}>
                <td>{row.product}</td>
                <td>{row.size || "—"}</td>
                <td>{row.color || "—"}</td>
                <td className="num">{row.qty}</td>
                <td>
                  <span className={`badge ${row.level === "out" ? "badge-warn" : "badge-info"}`}>
                    {row.level === "out" ? "Sold out" : "Low"}
                  </span>
                </td>
              </tr>
            ))}
            empty="Every stock line is above its reorder level."
          />
        </Card>
      ) : null}

      <Card title="Quick actions">
        <div className="form-actions">
          {user.role === "superadmin" && <Link className="btn-solid" href={`${base}/admins`}>Create a staff account</Link>}
          {user.role === "superadmin" && <Link className="btn-ghost" href={`${base}/customers`}>View customers</Link>}
          {(user.role === "superadmin" || user.canCreateShops) && <Link className="btn-ghost" href={`${base}/shops`}>Add a shop</Link>}
          {user.canManageProducts && <Link className="btn-ghost" href={`${base}/products?new=1`}>Add a product</Link>}
          {user.canManageInventory && <Link className="btn-ghost" href={`${base}/inventory`}>Update stock</Link>}
          {user.canManageOrders && <Link className="btn-ghost" href={`${base}/orders`}>Update an order</Link>}
          {user.canCollectCod && <Link className="btn-ghost" href={`${base}/cod`}>Cash collection</Link>}
          {user.canUpdateDelivery && <Link className="btn-ghost" href={`${base}/delivery`}>Delivery tasks</Link>}
        </div>
        {!user.canManageProducts && (
          <p className="muted" style={{ fontSize: 13.5 }}>
            Product editing is switched off for your account. Ask the Super Admin to grant the products permission.
          </p>
        )}
      </Card>
    </>
  );
}
