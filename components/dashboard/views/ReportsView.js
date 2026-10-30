import { Card, EmptyState, PageHead, Stat, StatusBadge, Table } from "@/components/dashboard/Bits";
import { codSummary, listShops, money, salesSummary } from "@/lib/queries.mjs";
import { shopIdsFor } from "@/lib/session.mjs";

export default function ReportsView({ user }) {
  const ids = shopIdsFor(user);
  const report = salesSummary(ids);
  const cod = codSummary(ids);
  const shops = listShops(user.role === "superadmin" ? null : ids);

  return (
    <>
      <PageHead
        title="Reports"
        subtitle="Aggregated directly from the orders and order_items tables. Revenue counts orders from Confirmed through Delivered and excludes cancellations."
      />

      <div className="stat-grid">
        <Stat label="Revenue booked" value={money(report.revenue)} hint="Server-recorded order totals" />
        <Stat label="Units sold" value={report.units} hint="Across all order lines" />
        <Stat label="Orders" value={report.orders} hint="All statuses" />
        <Stat label="Average order" value={money(report.orders ? report.revenue / report.orders : 0)} hint="Revenue ÷ orders" />
        <Stat label="Cash collected" value={money(cod.collected)} hint={`${cod.collectedOrders} order${cod.collectedOrders === 1 ? "" : "s"} confirmed by staff`} />
        <Stat label="Cash outstanding" value={money(cod.outstanding)} hint="Delivered or on the road, unpaid" />
      </div>

      <Card title="Sales by shop">
        <Table
          columns={["Shop", "Orders", "Revenue"]}
          rows={shops.map((shop) => {
            const row = report.byShop.find((entry) => entry.shop === shop.name) || { orders: 0, value: 0 };
            return (
              <tr key={shop.id}>
                <td>{shop.name}</td>
                <td className="num">{row.orders}</td>
                <td className="num">{money(row.value)}</td>
              </tr>
            );
          })}
          empty="No shops in scope."
          emptyHint="Create a shop to start recording orders."
        />
      </Card>

      <Card title="Order pipeline" description="Every status present in the database.">
        {report.byStatus.length ? (
          <div className="check-row">
            {report.byStatus.map((row) => (
              <span key={row.status} className="pill-toggle" style={{ padding: "8px 14px" }}>
                <StatusBadge status={row.status} />
                <strong className="num">{row.orders}</strong>
                <span className="muted">{money(row.value)}</span>
              </span>
            ))}
          </div>
        ) : (
          <EmptyState label="No orders recorded yet." hint="Statistics stay at zero until real checkout orders are written to the database." />
        )}
      </Card>

      <Card title="Best sellers">
        <Table
          columns={["Product", "Units", "Revenue"]}
          rows={report.byProduct.map((row) => (
            <tr key={row.product}>
              <td>{row.product}</td>
              <td className="num">{row.units}</td>
              <td className="num">{money(row.value)}</td>
            </tr>
          ))}
          empty="No product sales yet."
          emptyHint="This table fills up from order line items."
        />
      </Card>

      <Card title="Monthly revenue">
        <Table
          columns={["Month", "Orders", "Revenue"]}
          rows={report.byMonth.map((row) => (
            <tr key={row.month}>
              <td className="num">{row.month}</td>
              <td className="num">{row.orders}</td>
              <td className="num">{money(row.value)}</td>
            </tr>
          ))}
          empty="No months with confirmed sales."
        />
      </Card>

      <Card title="Low stock watchlist" description="Size and colour lines at or below each product's reorder level.">
        <Table
          columns={["Product", "Size", "Colour", "Left"]}
          rows={report.lowStock.map((row, index) => (
            <tr key={`${row.product}-${row.size}-${row.color}-${index}`}>
              <td>{row.product}</td>
              <td className="num">{row.size}</td>
              <td>{row.color}</td>
              <td className="num">
                <span className={`badge ${row.qty === 0 ? "badge-off" : "badge-warn"}`}>{row.qty}</span>
              </td>
            </tr>
          ))}
          empty="Nothing low on stock."
          emptyHint="Lines appear here as soon as their quantity reaches the product's reorder level."
        />
      </Card>
    </>
  );
}
