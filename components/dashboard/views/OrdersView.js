import { Card, Notice, PageHead, StatusBadge, Table } from "@/components/dashboard/Bits";
import { listOrders, listProducts, money, getOrderItems } from "@/lib/queries.mjs";
import { recordOrderAction, saveOrderStatusAction } from "@/lib/dashboard-actions";
import { can, shopIdsFor } from "@/lib/session.mjs";

const ALL = ["pending", "paid", "shipped", "delivered", "cancelled"];
const PERMITTED = {
  superadmin: ALL,
  admin: ["paid", "shipped", "delivered", "cancelled"],
  shop: ["paid", "shipped", "delivered", "cancelled"],
};

export default function OrdersView({ user, base, next, flash, params }) {
  const ids = shopIdsFor(user);
  const status = typeof params.status === "string" ? params.status : "";
  const search = typeof params.q === "string" ? params.q : "";
  const orders = listOrders(ids, { status, search });
  const permitted = can(user, "orders") ? PERMITTED[user.role] : [];
  const products = listProducts(ids);
  const selectedProduct = typeof params.product === "string" ? params.product : "";
  const detail = params.view ? orders.find((order) => order.id === Number(params.view)) : null;

  return (
    <>
      <PageHead
        title="Orders"
        subtitle={
          can(user, "orders")
            ? `Statuses your role can set: ${permitted.join(", ")}.`
            : "Read-only: your account does not have the order-management permission."
        }
      />
      {flash && <Notice kind={flash.kind} text={flash.text} />}

      <Card title="Orders">
        <form action={`${base}/orders`} className="toolbar">
          <input className="input" name="q" defaultValue={search} placeholder="Customer name or email" />
          <select className="select" name="status" defaultValue={status}>
            <option value="">Any status</option>
            {ALL.map((option) => (
              <option key={option} value={option}>
                {option[0].toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
          <button className="btn-solid" type="submit">Filter</button>
          <a className="link-quiet" href={`${base}/orders`}>Reset</a>
        </form>

        <Table
          columns={["Order", "Shop", "Customer", "Items", "Total", "Placed", "Status", "Update"]}
          rows={orders.map((order) => (
            <tr key={order.id}>
              <td className="num">
                <a className="link-quiet" href={`${base}/orders?view=${order.id}`}>#{order.id}</a>
              </td>
              <td>{order.shop_name || "—"}</td>
              <td>
                <strong>{order.customer_name}</strong>
                <div className="muted" style={{ fontSize: 12.5 }}>{order.customer_email || "No email"}</div>
              </td>
              <td className="num">{order.item_count}</td>
              <td className="num">{money(order.total)}</td>
              <td className="num">{order.created_at}</td>
              <td><StatusBadge status={order.status} /></td>
              <td>
                {permitted.length ? (
                  <form action={saveOrderStatusAction} className="inline-form">
                    <input type="hidden" name="next" value={next} />
                    <input type="hidden" name="id" value={order.id} />
                    <select className="select" name="status" defaultValue={order.status}>
                      {[...new Set([order.status, ...permitted])].map((option) => (
                        <option key={option} value={option}>
                          {option[0].toUpperCase() + option.slice(1)}
                        </option>
                      ))}
                    </select>
                    <button className="btn-ghost" type="submit">Save</button>
                  </form>
                ) : (
                  <span className="muted" style={{ fontSize: 12.5 }}>No permission</span>
                )}
              </td>
            </tr>
          ))}
          empty={ids.length ? "No orders match these filters." : "No shop is assigned to your account yet."}
          emptyHint={ids.length ? "Orders are written here by the storefront checkout." : "Ask the Super Admin to assign a shop to your account."}
        />
      </Card>

      {permitted.length && products.length ? (
        <Card title="Record a sale" description="Writes a real order row — used for counter and phone orders.">
          <form action={recordOrderAction} className="form-grid">
            <input type="hidden" name="next" value={next} />
            <label className="field full">
              <span className="form-label">Product</span>
              <select className="select" name="product_id" required defaultValue={selectedProduct}>
                <option value="">Choose a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — {product.shop_name} · {money(product.price)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="form-label">Customer name</span>
              <input className="input" name="customer_name" required placeholder="Walk-in customer" />
            </label>
            <label className="field">
              <span className="form-label">Email (optional)</span>
              <input className="input" type="email" name="customer_email" />
            </label>
            <label className="field">
              <span className="form-label">Size</span>
              <input className="input" name="size" placeholder="42" />
            </label>
            <label className="field">
              <span className="form-label">Colour</span>
              <input className="input" name="color" placeholder="Ivory" />
            </label>
            <label className="field">
              <span className="form-label">Quantity</span>
              <input className="input" type="number" name="qty" min="1" max="99" defaultValue="1" required />
            </label>
            <div className="full form-actions">
              <button className="btn-solid" type="submit">Add order</button>
            </div>
          </form>
        </Card>
      ) : null}

      {detail && (
        <Card title={`Order #${detail.id} · ${detail.customer_name}`} description={`${detail.created_at} · ${money(detail.total)}`}>
          <Table
            columns={["Product", "Size", "Color", "Quantity", "Unit price", "Line total"]}
            rows={getOrderItems(detail.id).map((item) => (
              <tr key={item.id}>
                <td>{item.product_name}</td>
                <td>{item.size || "—"}</td>
                <td>{item.color || "—"}</td>
                <td className="num">{item.qty}</td>
                <td className="num">{money(item.price)}</td>
                <td className="num">{money(item.qty * item.price)}</td>
              </tr>
            ))}
            empty="This order has no line items."
          />
          <div className="form-actions">
            <a className="btn-ghost" href={`${base}/orders`}>Back to orders</a>
          </div>
        </Card>
      )}
    </>
  );
}
