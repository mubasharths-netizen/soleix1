import Link from "next/link";
import Icon from "@/components/Icon";
import { listCustomerOrders } from "@/lib/queries.mjs";
import { requireAccountUser, homeFor } from "@/lib/session.mjs";
import { formatPrice } from "@/lib/catalog.mjs";
import { STATUS_LABEL } from "@/lib/orders.mjs";

export const instant = false;
export const metadata = { title: "My orders" };

const OPEN = ["pending", "confirmed", "processing", "shipped"];

export default async function AccountOrdersPage() {
  const user = await requireAccountUser("/account/orders");
  const orders = listCustomerOrders({ uid: user.kind === "customer" ? user.uid : "", email: user.email || "" });
  const current = orders.filter((order) => OPEN.includes(order.status));
  const past = orders.filter((order) => !OPEN.includes(order.status));

  const card = (order) => (
    <article className="order-card glass-field" key={order.reference}>
      <header>
        <div>
          <p className="order-card-label">Order number</p>
          <h2>{order.reference}</h2>
          <p className="order-card-shop">{order.shop_name} · placed {String(order.created_at).slice(0, 10)}</p>
        </div>
        <span className={`order-status is-${order.status}`}>{STATUS_LABEL[order.status]}</span>
      </header>
      <ul className="order-lines">
        {order.items.map((item) => (
          <li key={item.id}><span>{item.product_name} · EU {item.size} · {item.color} × {item.qty}</span><b>{formatPrice(item.price * item.qty)}</b></li>
        ))}
      </ul>
      {order.cancel_requested > 0 && order.status !== "cancelled" && (
        <p className="auth-notice">Cancellation requested — the shop is confirming it now.</p>
      )}
      <div className="order-card-foot">
        <p className="order-card-meta">
          {order.payment_status === "collected"
            ? `Paid ${formatPrice(order.total)} in cash`
            : order.status === "cancelled"
              ? "Cash on Delivery · nothing due"
              : `${formatPrice(order.total)} due on delivery (Cash on Delivery)`}
        </p>
        <Link className="text-link" href={`/order/${order.reference}`}>Track this order <Icon name="arrow" size={16} /></Link>
      </div>
    </article>
  );

  return (
    <section className="section page-shell account-page light-panel">
      <p className="eyebrow">EVERY PAIR YOU BOUGHT</p>
      <h1 className="page-title">MY ORDERS.</h1>
      <p className="page-intro">
        {orders.length
          ? `Matched to ${user.email}. Open an order to follow it from the shop to your door.`
          : "Nothing here yet. Orders you place with Cash on Delivery appear here, even if you checked out as a guest with this email."}
      </p>
      {user.kind === "staff" && (
        <p className="auth-notice">You are browsing as staff. Order management lives in <Link className="text-link" href={homeFor(user.role)}>your dashboard</Link>.</p>
      )}

      {orders.length ? (
        <>
          {current.length > 0 && <h2 className="panel-subhead">In progress</h2>}
          <div className="orders-list">{current.map(card)}</div>
          {past.length > 0 && <h2 className="panel-subhead is-spaced">History</h2>}
          {past.length > 0 && <div className="orders-list">{past.map(card)}</div>}
        </>
      ) : (
        <div className="empty-state">
          <span className="empty-icon"><Icon name="bag" size={36} /></span>
          <h2>No orders yet.</h2>
          <p>Browse the rotation and pay the rider when your parcel arrives.</p>
          <Link href="/shop" className="button button-dark">Start shopping <Icon name="arrow" size={18} /></Link>
        </div>
      )}

      <p className="order-next">
        <Link href="/account/profile" className="button button-outline">Profile and addresses</Link>
        <Link href="/cart" className="button button-ghost">Your bag</Link>
      </p>
    </section>
  );
}
