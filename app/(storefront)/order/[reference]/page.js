import Link from "next/link";
import { notFound } from "next/navigation";
import CancelOrderForm from "@/components/CancelOrderForm";
import Icon from "@/components/Icon";
import OrderTrack, { OrderEvents } from "@/components/OrderTrack";
import { findOrderByReference } from "@/lib/queries.mjs";
import { getAccountUser } from "@/lib/session.mjs";
import { formatPrice } from "@/lib/catalog.mjs";
import { CUSTOMER_CANCEL_STATUSES, STATUS_LABEL } from "@/lib/orders.mjs";

export const instant = false;
export const metadata = { title: "Track your order" };

const mask = (value) => (value ? `${String(value).slice(0, 2)}${"•".repeat(Math.max(4, String(value).length - 2))}` : "");

export default async function OrderPage({ params }) {
  const { reference } = await params;
  const order = findOrderByReference(reference);
  if (!order) notFound();

  const viewer = await getAccountUser();
  const owns = Boolean(viewer) && (
    (viewer.uid && order.user_uid === viewer.uid) ||
    (viewer.email && String(viewer.email).toLowerCase() === String(order.customer_email).toLowerCase())
  );
  const canCancel = owns && CUSTOMER_CANCEL_STATUSES.includes(order.status);

  return (
    <section className="section page-shell order-page light-panel">
      <p className="eyebrow">ORDER {order.reference}</p>
      <h1 className="page-title">{STATUS_LABEL[order.status].toUpperCase()}.</h1>
      <p className="page-intro">{order.shop_name} is handling this order. Cash on Delivery means nothing is charged until the parcel is in your hands.</p>

      <OrderTrack status={order.status} />

      <div className="order-layout">
        <article className="order-card glass-field">
          <header>
            <div>
              <p className="order-card-label">Order number</p>
              <h2>{order.reference}</h2>
            </div>
            <span className={`order-status is-${order.status}`}>{order.status}</span>
          </header>
          <ul className="order-lines">
            {order.items.map((item) => (
              <li key={item.id}><span>{item.product_name} · EU {item.size} · {item.color} × {item.qty}</span><b>{formatPrice(item.price * item.qty)}</b></li>
            ))}
          </ul>
          <div className="summary-row"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
          <div className="summary-row"><span>Delivery</span><span>{order.delivery_fee ? formatPrice(order.delivery_fee) : "On us"}</span></div>
          {order.discount > 0 && <div className="summary-row"><span>Discount</span><span>− {formatPrice(order.discount)}</span></div>}
          <div className="summary-row summary-total"><strong>{order.payment_status === "collected" ? "Paid" : "Total due on delivery"}</strong><strong>{formatPrice(order.total)}</strong></div>
          <p className="order-payment">Payment: Cash on Delivery · <span className={`order-payment-status is-${order.payment_status}`}>{order.payment_status}</span></p>
          {order.cancel_requested > 0 && order.status !== "cancelled" && (
            <p className="auth-notice">Your cancellation request is with the shop. Nothing further is due until they confirm it.</p>
          )}
          {canCancel
            ? <CancelOrderForm reference={order.reference} />
            : owns ? null : <p className="sample-note">Sign in with the email this order was placed with to cancel it or see the full delivery address.</p>}
        </article>

        <aside className="order-side glass-field">
          <h2>Delivery</h2>
          <p className="order-detail-label">Placed by</p>
          <p>{owns ? order.customer_name : mask(order.customer_name)}</p>
          <p className="order-detail-label">Contact</p>
          <p>{owns ? `${order.customer_email} · ${order.customer_phone}` : `${mask(order.customer_email)} · ${mask(order.customer_phone)}`}</p>
          {owns && (
            <>
              <p className="order-detail-label">Address</p>
              <p>{order.address}, {order.city}{order.postal_code ? ` ${order.postal_code}` : ""}</p>
            </>
          )}
          {order.notes && <><p className="order-detail-label">Notes</p><p>{order.notes}</p></>}
          <p className="order-detail-label">Placed</p>
          <p>{order.created_at} UTC</p>
          <p className="order-detail-label">Shop</p>
          <p>{order.shop_name}<br /><span className="muted">{order.shop_address}</span></p>
        </aside>
      </div>

      <OrderEvents events={order.events} />

      <p className="order-next"><Link href="/shop" className="button button-dark">Back to the rotation <Icon name="arrow" size={18} /></Link>{owns && <Link href="/account/orders" className="button button-ghost">My orders</Link>}</p>
    </section>
  );
}
