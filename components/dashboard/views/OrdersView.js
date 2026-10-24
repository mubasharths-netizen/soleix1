import { Card, Notice, PageHead, PayBadge, StatusBadge, Table } from "@/components/dashboard/Bits";
import OrderTrack, { OrderEvents } from "@/components/OrderTrack";
import { assignDeliveryAction, collectCashAction, orderNoteAction, recordOrderAction, resolveCancellationAction, saveOrderStatusAction } from "@/lib/dashboard-actions";
import { findOrderById, listDeliveryStaff, listInventory, listOrders, money } from "@/lib/queries.mjs";
import { can, shopIdsFor } from "@/lib/session.mjs";
import { CUSTOMER_CANCEL_STATUSES, ORDER_STATUSES, STATUS_LABEL, TRANSITIONS, statusesFor } from "@/lib/orders.mjs";

const FILTERS = [
  { value: "", label: "All orders" },
  { value: "open", label: "Still open" },
  ...ORDER_STATUSES.map((status) => ({ value: status, label: STATUS_LABEL[status] })),
  { value: "cancel_requests", label: "Cancellation requests" },
  { value: "cod_awaiting", label: "COD to collect" },
];

const label = (value) => FILTERS.find((item) => item.value === value)?.label || value;

export default function OrdersView({ user, base, next, flash, params }) {
  const ids = shopIdsFor(user);
  const status = typeof params.status === "string" ? params.status : "";
  const search = typeof params.q === "string" ? params.q : "";
  const orders = listOrders(ids, { status: status === "open" ? "" : status, search, openOnly: status === "open" });
  const counts = listOrders(ids, {});
  const permitted = statusesFor(user);
  const requested = Number(params.view || 0);
  // The detail row is re-read by id and then checked against the viewer's own shops.
  const found = requested ? findOrderById(requested) : null;
  const detail = found && ids.includes(found.shop_id) ? found : null;
  const events = detail ? detail.events : [];
  const staff = detail ? listDeliveryStaff(ids) : [];
  const variants = listInventory(ids).filter((row) => row.qty > 0);
  const canWrite = can(user, "orders") || can(user, "delivery");

  const byStatus = ORDER_STATUSES.map((entry) => ({ entry, n: counts.filter((order) => order.status === entry).length }));

  return (
    <>
      <PageHead
        title="Orders"
        subtitle={canWrite
          ? `Cash on Delivery only. Your account can move orders to: ${permitted.join(", ") || "nothing yet"}.`
          : "Read-only: your account has no order or delivery permission."}
      />
      {flash && <Notice kind={flash.kind} text={flash.text} />}

      <Card title="Orders">
        <form action={`${base}/orders`} className="toolbar">
          <input className="input" name="q" defaultValue={search} placeholder="Reference, name, email or phone" />
          <select className="select" name="status" defaultValue={status}>
            {FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <button className="btn-solid" type="submit">Filter</button>
          <a className="link-quiet" href={`${base}/orders`}>Reset</a>
        </form>

        <div className="stat-grid" style={{ marginBottom: 14 }}>
          {byStatus.map(({ entry, n }) => (
            <a key={entry} className="stat-card glass" href={`${base}/orders?status=${entry}`}>
              <span className="stat-label">{STATUS_LABEL[entry]}</span>
              <span className="stat-value">{n}</span>
            </a>
          ))}
        </div>

        <Table
          columns={["Order", "Shop", "Customer", "Items", "Total", "Payment", "Placed", "Status", "Update"]}
          rows={orders.map((order) => {
            const options = TRANSITIONS[order.status].filter((option) => permitted.includes(option));
            return (
              <tr key={order.id}>
                <td className="num">
                  <a className="link-quiet" href={`${base}/orders?view=${order.id}`}>{order.reference}</a>
                  {order.cancel_requested ? <div className="badge badge-warn">Cancel requested</div> : null}
                </td>
                <td>{order.shop_name || "—"}</td>
                <td>
                  <strong>{order.customer_name}</strong>
                  <div className="muted" style={{ fontSize: 12.5 }}>{order.customer_phone || order.customer_email || "No contact"}</div>
                </td>
                <td className="num">{order.unit_count ?? order.item_count}</td>
                <td className="num">{money(order.total)}</td>
                <td><PayBadge status={order.payment_status} /></td>
                <td className="num">{String(order.created_at).slice(0, 16)}</td>
                <td>
                  <StatusBadge status={order.status} />
                  {order.assigned_staff_name ? <div className="muted" style={{ fontSize: 12 }}>Rider: {order.assigned_staff_name}</div> : null}
                </td>
                <td>
                  {options.length && can(user, "orders") ? (
                    <form action={saveOrderStatusAction} className="inline-form">
                      <input type="hidden" name="next" value={next} />
                      <input type="hidden" name="id" value={order.id} />
                      <select className="select" name="status" defaultValue="" required>
                        <option value="" disabled>Next step</option>
                        {options.map((option) => <option key={option} value={option}>{STATUS_LABEL[option]}</option>)}
                      </select>
                      <button className="btn-ghost" type="submit">Move</button>
                    </form>
                  ) : <span className="muted" style={{ fontSize: 12.5 }}>No next step</span>}
                </td>
              </tr>
            );
          })}
          empty={ids.length ? "No orders match these filters." : "No shop is assigned to your account yet."}
          emptyHint={ids.length ? "Orders arrive here from the storefront checkout and from recorded counter sales." : "Ask the Super Admin to assign a shop to your account."}
        />
      </Card>

      {detail && (
        <Card title={`Order ${detail.reference} · ${detail.customer_name}`} description={`${detail.shop_name || ""} · placed ${detail.created_at}`}>
          <OrderTrack status={detail.status} />
          <div className="table-wrap" style={{ marginTop: 18 }}>
            <table className="data-table">
              <thead><tr><th>Product</th><th>Size</th><th>Colour</th><th className="num">Qty</th><th className="num">Unit</th><th className="num">Line</th></tr></thead>
              <tbody>
                {(detail.items || []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_name}</td>
                    <td>{item.size || "—"}</td>
                    <td>{item.color || "—"}</td>
                    <td className="num">{item.qty}</td>
                    <td className="num">{money(item.price)}</td>
                    <td className="num">{money(item.qty * item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="form-grid" style={{ marginTop: 14 }}>
            <div className="field"><span className="form-label">Subtotal</span><strong>{money(detail.subtotal)}</strong></div>
            <div className="field"><span className="form-label">Delivery</span><strong>{detail.delivery_fee ? money(detail.delivery_fee) : "Free"}</strong></div>
            <div className="field"><span className="form-label">Discount</span><strong>{detail.discount ? `− ${money(detail.discount)}` : "None"}</strong></div>
            <div className="field"><span className="form-label">Total</span><strong>{money(detail.total)}</strong></div>
            <div className="field"><span className="form-label">Payment</span><PayBadge status={detail.payment_status} /></div>
            <div className="field"><span className="form-label">Collected by</span><strong>{detail.collected_by_name || (detail.collected_at ? detail.collected_at : "Not yet")}</strong></div>
          </div>

          <div className="form-grid" style={{ marginTop: 14 }}>
            <div className="field full"><span className="form-label">Deliver to</span>
              <strong style={{ fontWeight: 500 }}>{detail.customer_name} · {detail.customer_phone || "no phone"}<br />{detail.address || "No address recorded"}, {detail.city}{detail.postal_code ? ` ${detail.postal_code}` : ""}</strong>
              {detail.notes ? <p className="muted" style={{ fontSize: 13 }}>Note: {detail.notes}</p> : null}
            </div>
          </div>

          {detail.cancel_requested > 0 && detail.status !== "cancelled" && can(user, "orders") && (
            <div className="card-alert">
              <strong>The customer asked to cancel.</strong>
              <p className="muted" style={{ fontSize: 13 }}>Reason: {detail.cancellation_reason || "not given"} · requested {detail.cancel_requested_at}</p>
              <div className="form-actions">
                <form action={resolveCancellationAction}>
                  <input type="hidden" name="next" value={next} />
                  <input type="hidden" name="id" value={detail.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <button className="btn-solid" type="submit">Approve and return stock</button>
                </form>
                <form action={resolveCancellationAction}>
                  <input type="hidden" name="next" value={next} />
                  <input type="hidden" name="id" value={detail.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <button className="btn-ghost" type="submit">Keep the order</button>
                </form>
              </div>
            </div>
          )}

          <div className="form-grid" style={{ marginTop: 16 }}>
            {can(user, "orders") && TRANSITIONS[detail.status].some((option) => permitted.includes(option)) && (
              <form action={saveOrderStatusAction} className="inline-form">
                <input type="hidden" name="next" value={next} />
                <input type="hidden" name="id" value={detail.id} />
                <label className="field"><span className="form-label">Move order to</span>
                  <select className="select" name="status" required defaultValue="">
                    <option value="" disabled>Choose the next step</option>
                    {TRANSITIONS[detail.status].filter((option) => permitted.includes(option)).map((option) => (
                      <option key={option} value={option}>{STATUS_LABEL[option]}{option === "cancelled" ? " (returns stock)" : ""}</option>
                    ))}
                  </select>
                </label>
                <button className="btn-solid" type="submit">Save status</button>
              </form>
            )}

            {can(user, "cod") && detail.payment_status === "pending" && (
              <form action={collectCashAction} className="inline-form">
                <input type="hidden" name="next" value={next} />
                <input type="hidden" name="id" value={detail.id} />
                <button className="btn-solid" type="submit" disabled={detail.status !== "delivered"}>
                  Confirm {money(detail.total)} cash collected
                </button>
                {detail.status !== "delivered" && <span className="muted" style={{ fontSize: 12.5 }}>Mark the parcel delivered first.</span>}
              </form>
            )}

            {can(user, "orders") && staff.length > 0 && (
              <form action={assignDeliveryAction} className="inline-form">
                <input type="hidden" name="next" value={next} />
                <input type="hidden" name="id" value={detail.id} />
                <label className="field"><span className="form-label">Delivery staff</span>
                  <select className="select" name="staff_id" defaultValue={detail.assigned_staff_id || ""}>
                    <option value="">Unassigned</option>
                    {staff.filter((person) => person.shop_id === detail.shop_id).map((person) => (
                      <option key={person.id} value={person.id}>{person.name}</option>
                    ))}
                  </select>
                </label>
                <button className="btn-ghost" type="submit">Assign</button>
              </form>
            )}

            {canWrite && (
              <form action={orderNoteAction} className="inline-form">
                <input type="hidden" name="next" value={next} />
                <input type="hidden" name="id" value={detail.id} />
                <label className="field"><span className="form-label">Add an internal note</span>
                  <input className="input" name="note" maxLength={300} placeholder="Called the customer, rider changed…" required />
                </label>
                <button className="btn-ghost" type="submit">Add note</button>
              </form>
            )}
          </div>

          <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
            <a className="link-quiet" href={`/order/${detail.reference}`} target="_blank">Open the customer tracking page</a> · {label(detail.status)} ·
            {" "}{CUSTOMER_CANCEL_STATUSES.includes(detail.status) ? "the customer can still request a cancellation" : "cancellation is closed to the customer from here"}
          </p>

          <OrderEvents events={events} />

          <div className="form-actions">
            <a className="btn-ghost" href={`${base}/orders`}>Back to orders</a>
          </div>
        </Card>
      )}

      {can(user, "orders") && variants.length ? (
        <Card title="Record a counter sale" description="Writes a real COD order with server-side prices and live stock. Nothing is charged online.">
          <form action={recordOrderAction} className="form-grid">
            <input type="hidden" name="next" value={next} />
            <label className="field full">
              <span className="form-label">Product option (only in-stock variants)</span>
              <select className="select" name="stock_id" required>
                <option value="">Choose a size and colour</option>
                {variants.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.product_name} — EU {row.size} · {row.color} · {row.shop_name} · {money(row.price)} · {row.qty} left
                  </option>
                ))}
              </select>
            </label>
            <label className="field"><span className="form-label">Customer name</span><input className="input" name="customer_name" required placeholder="Walk-in customer" /></label>
            <label className="field"><span className="form-label">Phone</span><input className="input" name="customer_phone" placeholder="+92 300 1234567" /></label>
            <label className="field"><span className="form-label">Email (optional)</span><input className="input" type="email" name="customer_email" /></label>
            <label className="field"><span className="form-label">Quantity</span><input className="input" type="number" name="qty" min="1" max="99" defaultValue="1" required /></label>
            <label className="field full"><span className="form-label">Delivery address (optional for a pickup)</span><input className="input" name="address" maxLength={260} /></label>
            <label className="field"><span className="form-label">City</span><input className="input" name="city" maxLength={80} /></label>
            <label className="field"><span className="form-label">Notes</span><input className="input" name="notes" maxLength={280} /></label>
            <div className="full form-actions"><button className="btn-solid" type="submit">Add order</button></div>
          </form>
        </Card>
      ) : null}
    </>
  );
}
