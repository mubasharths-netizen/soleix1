import Link from "next/link";
import { Card, Notice, PageHead, Stat, StatusBadge, Table } from "@/components/dashboard/Bits";
import { collectCashAction } from "@/lib/dashboard-actions";
import { codSummary, money } from "@/lib/queries.mjs";
import { can, shopIdsFor } from "@/lib/session.mjs";

export default function CodView({ user, base, next, flash }) {
  const ids = shopIdsFor(user);
  const cod = codSummary(ids);
  const writable = can(user, "cod");

  return (
    <>
      <PageHead
        title="Cash on delivery"
        subtitle={
          writable
            ? "Cash only counts as collected when a person on your team confirms the notes are in hand."
            : "Read-only: your account does not have the COD-collection permission."
        }
      />
      {flash && <Notice kind={flash.kind} text={flash.text} />}

      <div className="stat-grid">
        <Stat label="Cash collected" value={money(cod.collected)} hint={`${cod.collectedOrders} order${cod.collectedOrders === 1 ? "" : "s"} confirmed`} />
        <Stat label="Outstanding" value={money(cod.outstanding)} hint={`${cod.pendingOrders} parcel${cod.pendingOrders === 1 ? "" : "s"} delivered or on the way`} />
        <Stat label="Awaiting across all orders" value={money(cod.pendingValue)} hint="Includes orders still being prepared" />
        <Stat label="Shops in scope" value={ids.length} hint="Every figure is summed from real order rows" />
      </div>

      <Card title="Collections to record" description="Orders that are out for delivery or delivered but still unpaid.">
        <Table
          columns={["Order", "Shop", "Customer", "City", "Total", "Status", "Cash"]}
          rows={cod.awaiting.map((order) => (
            <tr key={order.id}>
              <td className="num">
                <Link className="link-quiet" href={`${base}/orders?view=${order.id}`}>
                  {order.reference}
                </Link>
              </td>
              <td>{order.shop_name}</td>
              <td>
                <strong>{order.customer_name}</strong>
                <div className="muted" style={{ fontSize: 12.5 }}>{order.customer_phone || "No phone"}</div>
              </td>
              <td>{order.city || "—"}</td>
              <td className="num">{money(order.total)}</td>
              <td><StatusBadge status={order.status} /></td>
              <td>
                {writable ? (
                  order.status === "delivered" ? (
                    <form action={collectCashAction} className="inline-form">
                      <input type="hidden" name="next" value={next} />
                      <input type="hidden" name="id" value={order.id} />
                      <button className="btn-solid" type="submit">Record {money(order.total)}</button>
                    </form>
                  ) : (
                    <span className="muted" style={{ fontSize: 12.5 }}>Collect after delivery</span>
                  )
                ) : (
                  <span className="muted" style={{ fontSize: 12.5 }}>No permission</span>
                )}
              </td>
            </tr>
          ))}
          empty="No COD is waiting on you."
          emptyHint="Collections appear here as soon as an order is shipped with cash to collect."
        />
      </Card>

      <Card title="Collected by staff" description="Who confirmed the cash, and how much passed through their hands.">
        <Table
          columns={["Staff member", "Orders", "Cash collected"]}
          rows={cod.byStaff.map((row) => (
            <tr key={row.staff}>
              <td>{row.staff}</td>
              <td className="num">{row.orders}</td>
              <td className="num">{money(row.value)}</td>
            </tr>
          ))}
          empty="Nothing has been confirmed as collected yet."
          emptyHint="Recording a collection writes the staff member, the amount and a timestamp to the order."
        />
        <div className="form-actions" style={{ marginTop: 16 }}>
          <Link className="btn-ghost" href={`${base}/orders?status=cod_awaiting`}>Open the COD orders list</Link>
          <Link className="btn-ghost" href={`${base}/reports`}>See cash in reports</Link>
        </div>
      </Card>
    </>
  );
}
