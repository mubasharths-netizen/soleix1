import Link from "next/link";
import { notFound } from "next/navigation";
import ClearCart from "@/components/ClearCart";
import Icon from "@/components/Icon";
import { findOrdersByCheckoutToken } from "@/lib/queries.mjs";
import { formatPrice } from "@/lib/catalog.mjs";

export const instant = false;
export const metadata = { title: "Order confirmed" };

export default async function CheckoutSuccessPage({ searchParams }) {
  const { token } = await searchParams;
  if (!token || typeof token !== "string") notFound();
  const orders = findOrdersByCheckoutToken(token);
  if (!orders.length) notFound();

  const grand = orders.reduce((total, order) => total + Number(order.total), 0);

  return (
    <section className="section page-shell order-page light-panel">
      <ClearCart />
      <p className="eyebrow">THANK YOU</p>
      <h1 className="page-title">ORDER PLACED.</h1>
      <p className="page-intro">
        {orders.length > 1
          ? `Your bag held items from ${orders.length} SOLEIX shops, so it was split into ${orders.length} orders. Pay each rider on arrival.`
          : "Your order is with the shop now. Pay in cash when the parcel arrives."}
      </p>

      <div className="order-cards">
        {orders.map((order) => (
          <article className="order-card glass-field" key={order.reference}>
            <header>
              <div>
                <p className="order-card-label">Order number</p>
                <h2>{order.reference}</h2>
              </div>
              <span className={`order-status is-${order.status}`}>{order.status}</span>
            </header>
            <p className="order-card-shop">{order.shop_name}</p>
            <ul className="order-lines">
              {order.items.map((item) => (
                <li key={item.id}><span>{item.product_name} · EU {item.size} · {item.color} × {item.qty}</span><b>{formatPrice(item.price * item.qty)}</b></li>
              ))}
            </ul>
            <div className="summary-row"><span>Delivery</span><span>{order.delivery_fee ? formatPrice(order.delivery_fee) : "On us"}</span></div>
            {order.discount > 0 && <div className="summary-row"><span>Discount</span><span>− {formatPrice(order.discount)}</span></div>}
            <div className="summary-row summary-total"><strong>Total due on delivery</strong><strong>{formatPrice(order.total)}</strong></div>
            <Link className="text-link" href={`/order/${order.reference}`}>Track this order <Icon name="arrow" size={16} /></Link>
          </article>
        ))}
      </div>

      <div className="notice">
        <Icon name="shield" size={24} />
        <div>
          <strong>Cash on Delivery · {formatPrice(grand)} in total</strong>
          <p>Keep the parcel sealed until you have checked it. The shop will call the phone number you gave before it ships. <Link className="text-link" href="/account/orders">Create an account</Link> to keep every order in one place.</p>
        </div>
      </div>

      <p className="order-next"><Link href="/shop" className="button button-dark">Keep shopping <Icon name="arrow" size={18} /></Link><Link href="/" className="button button-ghost">Back to home</Link></p>
    </section>
  );
}
