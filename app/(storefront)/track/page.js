import Link from "next/link";
import Icon from "@/components/Icon";
import JsonLd, { breadcrumb } from "@/components/JsonLd";
import OrderTrack, { OrderEvents } from "@/components/OrderTrack";
import { findOrderByReference } from "@/lib/queries.mjs";
import { formatPrice } from "@/lib/catalog.mjs";
import { STATUS_LABEL } from "@/lib/orders.mjs";
import { normalizeEmail } from "@/lib/password.mjs";

export const instant = false;

export const metadata = {
  title: "Track your order",
  description: "Enter a SOLEIX order reference and the email it was placed with to see its status, packing progress and Cash on Delivery total.",
  alternates: { canonical: "/track" },
};

// A reference alone is never enough to show order detail: the email has to match too, so an
// orderly guesser cannot read other people's parcels.
function lookup(reference, email) {
  const order = findOrderByReference(reference);
  if (!order) return { state: "not-found" };
  if (!email) return { state: "needs-email", order };
  if (normalizeEmail(order.customer_email) !== normalizeEmail(email)) return { state: "no-match", order };
  return { state: "matched", order };
}

export default async function TrackPage({ searchParams }) {
  const params = await searchParams;
  const reference = String(params.ref || "").trim().toUpperCase().slice(0, 40);
  const email = String(params.email || "").trim().slice(0, 160);
  const result = reference ? lookup(reference, email) : { state: "idle" };

  return (
    <section className="page-shell track-page">
      <JsonLd data={breadcrumb([{ name: "Home", href: "/" }, { name: "Track an order", href: "/track" }])} />

      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Track an order</span>
      </nav>

      <p className="eyebrow">WHERE IS MY PAIR?</p>
      <h1 className="page-title">TRACK AN ORDER.</h1>
      <p className="page-intro">
        Every order gets a reference such as SOL-01-00042 the moment it is placed, and it is printed on the
        confirmation you saw at checkout. Put it here with the email you ordered with.
      </p>

      <form className="track-form glass-field" action="/track" method="get">
        <div className="field">
          <label className="auth-label" htmlFor="track-ref">Order reference</label>
          <input id="track-ref" name="ref" className="auth-input" maxLength={40} placeholder="SOL-01-00042" defaultValue={reference} autoComplete="off" required />
        </div>
        <div className="field">
          <label className="auth-label" htmlFor="track-email">Email used at checkout</label>
          <input id="track-email" name="email" type="email" className="auth-input" maxLength={160} placeholder="you@example.com" defaultValue={email} autoComplete="email" />
        </div>
        <button className="button button-dark" type="submit"><Icon name="search" size={18} />Find my order</button>
      </form>

      {(result.state === "not-found" || result.state === "no-match") && (
        <div className="notice" role="status">
          <Icon name="info" size={22} />
          <p>
            {result.state === "not-found"
              ? "No order carries that reference. Check the letters and numbers — the shop code sits in the middle, like SOL-01-00042."
              : "That reference exists, but this email is not the one it was placed with. Use the address you checked out with, or the phone number on the order confirmation."}
            {" "}If the parcel was ordered by someone else, ask them for the email they used.
          </p>
        </div>
      )}

      {result.state === "needs-email" && (
        <div className="notice" role="status">
          <Icon name="shield" size={22} />
          <p>We found order <strong>{reference}</strong>. Add the email it was placed with so we know it is yours before showing what is inside it.</p>
        </div>
      )}

      {result.state === "matched" && (
        <article className="track-result glass-field">
          <header className="track-result-head">
            <div>
              <p className="order-card-label">Order {result.order.reference}</p>
              <h2>{STATUS_LABEL[result.order.status]}</h2>
              <p className="muted">{result.order.shop_name} · placed {String(result.order.created_at).slice(0, 10)}</p>
            </div>
            <span className={`order-status is-${result.order.status}`}>{result.order.status}</span>
          </header>

          <OrderTrack status={result.order.status} />

          <ul className="order-lines">
            {result.order.items.map((item) => (
              <li key={item.id}>
                <span>{item.product_name} · EU {item.size} · {item.color} × {item.qty}</span>
                <b>{formatPrice(item.price * item.qty)}</b>
              </li>
            ))}
          </ul>

          <div className="summary-row"><span>Subtotal</span><span>{formatPrice(result.order.subtotal)}</span></div>
          <div className="summary-row"><span>Delivery</span><span>{result.order.delivery_fee ? formatPrice(result.order.delivery_fee) : "On us"}</span></div>
          {result.order.discount > 0 && <div className="summary-row"><span>Discount</span><span>− {formatPrice(result.order.discount)}</span></div>}
          <div className="summary-row summary-total">
            <strong>{result.order.payment_status === "collected" ? "Paid in cash" : "Due on delivery"}</strong>
            <strong>{formatPrice(result.order.total)}</strong>
          </div>

          <OrderEvents events={result.order.events} />

          <div className="track-result-foot">
            <Link className="button button-dark" href={`/order/${result.order.reference}`}>Full order detail<Icon name="arrow" size={18} /></Link>
            <Link className="button button-outline" href="/info/contact">Something looks wrong</Link>
          </div>
          <p className="sample-note">
            Signed in with this email? The same order is always in <Link className="text-link" href="/account/orders">My orders</Link>,
            where you can request a cancellation while it is still open.
          </p>
        </article>
      )}

      {result.state === "idle" && (
        <div className="track-tips">
          <article><Icon name="receipt" size={22} /><h2>Where is my reference?</h2><p>It is on the confirmation screen right after checkout and in the account area under My orders. One bag from two shops means two references.</p></article>
          <article><Icon name="truck" size={22} /><h2>How long does it take?</h2><p>Most cities are served in 3–5 business days. The rider calls before arriving, so keep the phone number you ordered with free.</p></article>
          <article><Icon name="return" size={22} /><h2>Changed your mind?</h2><p>Cancellation works while an order is pending or confirmed. After that, the returns page explains the 14-day window.</p></article>
        </div>
      )}
    </section>
  );
}
