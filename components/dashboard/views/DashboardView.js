import Link from "next/link";
import { Card, Notice, PageHead, Stat, StatusBadge, Table } from "@/components/dashboard/Bits";
import { dashboardStats, listOrders, money } from "@/lib/queries.mjs";
import { shopIdsFor } from "@/lib/session.mjs";

const SHOP_LABEL = { superadmin: "Shops you control", admin: "Assigned shops", shop: "Your shop" };

export default function DashboardView({ user, base, flash }) {
  const ids = shopIdsFor(user);
  const stats = dashboardStats(ids);
  const orders = listOrders(ids).slice(0, 8);

  const cards = [
    { label: SHOP_LABEL[user.role], value: ids.length, hint: ids.length ? "Active scope for this account" : "Nothing assigned yet" },
    { label: "Recorded revenue", value: money(stats.revenue), hint: "Paid, shipped and delivered orders" },
    { label: "Orders", value: stats.orders, hint: `${stats.units} units sold` },
    { label: "Products", value: stats.products, hint: `${stats.admins} admin accounts` },
    { label: "Awaiting action", value: stats.pendingOrders, hint: "Orders still pending" },
    { label: "Low stock lines", value: stats.lowStockCount, hint: "3 units or fewer" },
  ];

  return (
    <>
      <PageHead
        title={user.role === "shop" ? "Shop dashboard" : user.role === "admin" ? "Admin dashboard" : "Super Admin dashboard"}
        subtitle={
          ids.length
            ? `Live figures from ${ids.length} shop${ids.length > 1 ? "s" : ""} in the database.`
            : "No shop is linked to this account yet, so every figure below reads zero."
        }
      />
      {flash && <Notice kind={flash.kind} text={flash.text} />}

      <div className="stat-grid">
        {cards.map((card) => (
          <Stat key={card.label} label={card.label} value={card.value} hint={card.hint} />
        ))}
      </div>

      <Card title="Latest orders" description="Every row is an order record, not a demo number.">
        <Table
          columns={["Order", "Shop", "Customer", "Placed", "Total", "Status"]}
          rows={orders.map((order) => (
            <tr key={order.id}>
              <td className="num">#{order.id}</td>
              <td>{order.shop_name || "—"}</td>
              <td>{order.customer_name}</td>
              <td className="num">{order.created_at}</td>
              <td className="num">{money(order.total)}</td>
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

      <Card title="Quick actions">
        <div className="form-actions">
          {user.role === "superadmin" && <Link className="btn-solid" href={`${base}/admins`}>Create an admin account</Link>}
          {(user.role === "superadmin" || user.canCreateShops) && <Link className="btn-ghost" href={`${base}/shops`}>Add a shop</Link>}
          {user.canManageProducts && <Link className="btn-ghost" href={`${base}/products?new=1`}>Add a product</Link>}
          <Link className="btn-ghost" href={`${base}/inventory`}>Update stock</Link>
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
