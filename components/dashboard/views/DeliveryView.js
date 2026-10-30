import Link from "next/link";
import { Card, Notice, PageHead, Stat, Table } from "@/components/dashboard/Bits";
import { assignDeliveryAction, saveOrderStatusAction } from "@/lib/dashboard-actions";
import { deliveryTasks, listDeliveryStaff, money } from "@/lib/queries.mjs";
import { can, shopIdsFor } from "@/lib/session.mjs";

export default function DeliveryView({ user, base, next, flash }) {
  const ids = shopIdsFor(user);
  const tasks = deliveryTasks(user.id, { superadmin: user.role === "superadmin", shopIds: ids });
  const staff = listDeliveryStaff(ids);
  const assignable = can(user, "orders") || can(user, "delivery");
  const canDeliver = can(user, "delivery") || can(user, "orders");
  const mine = tasks.filter((row) => row.assigned_staff_id === user.id);
  const unclaimed = tasks.filter((row) => !row.assigned_staff_id);
  const value = tasks.reduce((sum, row) => sum + row.total, 0);

  return (
    <>
      <PageHead
        title="Delivery tasks"
        subtitle={
          assignable
            ? "Parcels that have left the shop. Claim a delivery, hand it to a colleague, or confirm it arrived."
            : "Read-only: your account does not have the delivery-operations permission."
        }
      />
      {flash && <Notice kind={flash.kind} text={flash.text} />}

      <div className="stat-grid">
        <Stat label="Out for delivery" value={tasks.length} hint="Every row is a shipped order" />
        <Stat label="Assigned to you" value={mine.length} hint="Deliveries on your name" />
        <Stat label="Unclaimed" value={unclaimed.length} hint="Waiting for a staff member" />
        <Stat label="Cash riding on them" value={money(value)} hint="Collect on hand-over, then record it" />
      </div>

      <Card title="Parcels on the road" description="Only staff from the order's own shop can be assigned.">
        <Table
          columns={["Order", "Shop", "Customer", "Deliver to", "Total", "Assigned to", "Action"]}
          rows={tasks.map((row) => (
            <tr key={row.id}>
              <td className="num">
                <Link className="link-quiet" href={`${base}/orders?view=${row.id}`}>
                  {row.reference}
                </Link>
              </td>
              <td>{row.shop_name}</td>
              <td>
                <strong>{row.customer_name}</strong>
                <div className="muted" style={{ fontSize: 12.5 }}>{row.customer_phone || "No phone"}</div>
              </td>
              <td>
                {row.address || "No address recorded"}
                <div className="muted" style={{ fontSize: 12.5 }}>{row.city || ""}</div>
              </td>
              <td className="num">{money(row.total)}</td>
              <td>
                {row.assigned_staff_name || <span className="muted" style={{ fontSize: 12.5 }}>Unclaimed</span>}
                {row.assigned_staff_id === user.id ? " (you)" : ""}
              </td>
              <td>
                {assignable ? (
                  <div className="form-actions">
                    <form action={assignDeliveryAction} className="inline-form">
                      <input type="hidden" name="next" value={next} />
                      <input type="hidden" name="id" value={row.id} />
                      <select className="select" name="staff_id" defaultValue={row.assigned_staff_id ?? ""}>
                        <option value="">Unassigned</option>
                        {user.role !== "superadmin" && <option value={user.id}>Myself</option>}
                        {staff
                          // The server refuses a rider from another shop, so only same-shop staff are offered.
                          .filter((entry) => entry.shop_id === row.shop_id || entry.id === user.id)
                          .map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {entry.name}
                            </option>
                          ))}
                      </select>
                      <button className="btn-ghost" type="submit">Save</button>
                    </form>
                  </div>
                ) : (
                  <span className="muted" style={{ fontSize: 12.5 }}>No permission</span>
                )}
                {canDeliver && (
                  <form action={saveOrderStatusAction} className="inline-form" style={{ marginTop: 8 }}>
                    <input type="hidden" name="next" value={next} />
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="status" value="delivered" />
                    <button className="btn-solid" type="submit">Mark delivered</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
          empty="Nothing is out for delivery right now."
          emptyHint="Ship an order from the Orders screen and it appears here for the delivery team."
        />
        <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
          Marking a parcel delivered does not collect the cash — record that on the{" "}
          <Link className="link-quiet" href={`${base}/cod`}>
            cash page
          </Link>
          .
        </p>
      </Card>
    </>
  );
}
