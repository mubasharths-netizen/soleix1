"use client";

import { useEffect, useId, useMemo, useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { orderTotals, formatPrice, stockFor } from "@/lib/catalog.mjs";
import { placeOrder } from "@/lib/storefront-actions";
import { useCatalog, useStore } from "@/components/StoreProvider";
import Icon from "@/components/Icon";

const FIELDS = [
  { key: "full_name", label: "Full name", type: "text", autoComplete: "name", placeholder: "Amina Yusuf", required: true },
  { key: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "name@example.com", required: true },
  { key: "phone", label: "Phone", type: "tel", autoComplete: "tel", placeholder: "+92 300 1234567", required: true },
  { key: "address", label: "Delivery address", type: "text", autoComplete: "street-address", placeholder: "House, street, area", required: true, wide: true },
  { key: "city", label: "City", type: "text", autoComplete: "address-level2", placeholder: "Karachi", required: true },
  { key: "postal_code", label: "Postal code", type: "text", autoComplete: "postal-code", placeholder: "75600" },
  { key: "notes", label: "Order notes", type: "text", autoComplete: "off", placeholder: "Landmark, delivery time, colour preference", wide: true },
];

export default function CheckoutForm() {
  const uid = useId();
  const { cart, ready: cartReady } = useStore();
  const { get, settings, ready } = useCatalog();
  const [values, setValues] = useState({ full_name: "", email: "", phone: "", address: "", city: "", postal_code: "", notes: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [intent] = useState(() => (typeof sessionStorage === "undefined" ? "" : sessionStorage.getItem("soleix-checkout-intent") || ""));
  const [state, submit, pending] = useActionState(placeOrder, {});

  // Signed-in shoppers get their saved details filled in; the server re-checks every field anyway.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/session")
      .then((response) => (response.ok ? response.json() : null))
      .then((session) => {
        if (cancelled || !session?.signedIn || !session.email) return;
        const saved = session.address || {};
        setValues((current) => ({
          ...current,
          full_name: current.full_name || session.name || "",
          email: current.email || session.email,
          phone: current.phone || session.phone || saved.phone || "",
          address: current.address || saved.address || "",
          city: current.city || saved.city || "",
          postal_code: current.postal_code || saved.postal_code || "",
        }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // One intent per bag so a double click or a back-button resubmit cannot create a second order.
  const token = useMemo(() => intent || globalThis.crypto?.randomUUID?.() || "", [intent]);

  useEffect(() => {
    if (token) sessionStorage.setItem("soleix-checkout-intent", token);
  }, [token]);

  const lines = useMemo(
    () => cart.map((item) => ({ ...item, product: get(item.id) })).filter((item) => item.product),
    [cart, get]
  );
  const totals = useMemo(() => orderTotals(lines.map((line) => ({ price: line.product.price, quantity: line.quantity })), settings), [lines, settings]);
  const shortStock = lines.filter((line) => stockFor(line.product, line.size, line.color) < line.quantity);

  const validationError = state?.error || null;

  function validate() {
    const found = {};
    if (values.full_name.trim().length < 2) found.full_name = "Enter your full name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(values.email.trim())) found.email = "Enter a valid email address.";
    if (values.phone.replace(/\D/g, "").length < 7) found.phone = "Enter a reachable phone number.";
    if (values.address.trim().length < 8) found.address = "Enter the complete delivery address.";
    if (values.city.trim().length < 2) found.city = "Enter your city.";
    setFieldErrors(found);
    return Object.keys(found).length === 0;
  }

  function onSubmit(event) {
    if (!validate()) {
      event.preventDefault();
    }
  }

  if (!ready || !cartReady) return <div className="empty-state" role="status">Getting your checkout ready…</div>;
  if (!lines.length) {
    return <div className="empty-state"><span className="empty-icon"><Icon name="bag" size={36} /></span><h2>Nothing to check out.</h2><p>Your bag is empty, so there is nothing to pay for yet.</p><Link href="/shop" className="button button-dark">Browse the rotation <Icon name="arrow" size={18} /></Link></div>;
  }

  return (
    <form className="checkout-layout" action={submit} onSubmit={onSubmit} noValidate>
      {/* The browser only ever sends product ids and quantities — prices and stock are re-read server-side. */}
      <input type="hidden" name="cart" value={JSON.stringify(cart.map((item) => ({ id: item.id, size: item.size, color: item.color, qty: item.quantity })))} />
      <input type="hidden" name="intent" value={token} />
      <div className="checkout-fields">
        <section className="checkout-block">
          <h2 className="checkout-heading"><span aria-hidden="true">1</span> Delivery details</h2>
          <div className="checkout-grid">
            {FIELDS.map((field) => (
              <div className={`field${field.wide ? " checkout-span" : ""}`} key={field.key}>
                <label className="auth-label" htmlFor={`${uid}-${field.key}`}>{field.label}{field.required && <span aria-hidden="true"> *</span>}</label>
                <input
                  id={`${uid}-${field.key}`}
                  name={field.key}
                  type={field.type}
                  className={`auth-input${fieldErrors[field.key] ? " is-invalid" : ""}`}
                  autoComplete={field.autoComplete}
                  placeholder={field.placeholder}
                  required={field.required}
                  value={values[field.key]}
                  onChange={(event) => { setValues((current) => ({ ...current, [field.key]: event.target.value })); setFieldErrors((current) => ({ ...current, [field.key]: "" })); }}
                />
                {fieldErrors[field.key] && <p className="auth-field-error">{fieldErrors[field.key]}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="checkout-block">
          <h2 className="checkout-heading"><span aria-hidden="true">2</span> Payment method</h2>
          <label className="checkout-payment is-selected">
            <input type="radio" name="payment_method" value="cod" checked readOnly />
            <span className="checkout-payment-body">
              <strong><Icon name="truck" size={18} /> Cash on Delivery</strong>
              <p>Pay the rider in cash when your parcel arrives. No card details are collected on this site, and nothing is charged online.</p>
            </span>
          </label>
        </section>

        <section className="checkout-block">
          <h2 className="checkout-heading"><span aria-hidden="true">3</span> Your bag</h2>
          <ul className="checkout-lines">
            {lines.map((line) => (
              <li key={line.key}>
                <Image src={line.product.image} alt={line.product.name} width={64} height={64} />
                <span>
                  <strong>{line.product.name}</strong>
                  <small>EU {line.size} · {line.color} · Qty {line.quantity}</small>
                  {shortStock.includes(line) && <em className="checkout-line-warning">Only {stockFor(line.product, line.size, line.color)} left — we will ask you to adjust if it sells out.</em>}
                </span>
                <b>{formatPrice(line.product.price * line.quantity)}</b>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="checkout-summary glass-field">
        <h2>Order summary</h2>
        <div className="summary-row"><span>Subtotal</span><span>{formatPrice(totals.subtotal)}</span></div>
        <div className="summary-row"><span>Delivery</span><span>{totals.delivery ? formatPrice(totals.delivery) : "On us"}</span></div>
        {totals.discount > 0 && <div className="summary-row"><span>Discount</span><span>− {formatPrice(totals.discount)}</span></div>}
        <div className="summary-row summary-total"><strong>Total</strong><strong>{formatPrice(totals.total)}</strong></div>
        <p className="sample-note">Prices include taxes. The shop confirms the order by phone before it ships.</p>

        {validationError && <p className="auth-error" role="alert">{validationError}</p>}

        <button type="submit" className="auth-submit glass-btn" disabled={pending}>
          {pending ? (<><span className="auth-spinner" aria-hidden="true" /> Placing your order</>) : (<>Place COD order <Icon name="arrow" size={18} /></>)}
        </button>
        <p className="checkout-fine-print">By placing this order you agree to the <Link className="text-link" href="/info/terms">terms</Link>. Cash on Delivery only — we never ask for card numbers.</p>
      </aside>
    </form>
  );
}
