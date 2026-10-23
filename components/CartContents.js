"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice, getProduct, shippingCost } from "@/lib/products";
import { useStore } from "./StoreProvider";
import Icon from "./Icon";

export default function CartContents({ compact = false, checkout = false }) {
  const { cart, ready, subtotal, updateQuantity, removeItem, setCartOpen } = useStore();
  const delivery = shippingCost(subtotal);
  if (!ready) return <div className="empty-state" role="status">Loading your bag…</div>;
  if (!cart.length) return <div className="empty-state"><span className="empty-icon"><Icon name="bag" size={36} /></span><h2>Your next move starts here.</h2><p>Your bag is empty. Let&apos;s find your new favourite pair.</p><Link href="/shop" className="button button-dark" onClick={() => setCartOpen(false)}>Explore sneakers <Icon name="arrow" size={18} /></Link></div>;
  return <div className={`${compact ? "cart-compact" : "cart-layout"}`}>
    <div className="cart-items">
      <div className="delivery-progress"><Icon name="truck" size={19} /><p>{subtotal >= 15000 ? "Your bag qualifies for free delivery." : `You’re ${formatPrice(15000 - subtotal)} away from free delivery.`}</p><div className="progress-track"><span style={{ width: `${Math.min(100, subtotal / 150)}%` }} /></div></div>
      {cart.map((item) => {
        const product = getProduct(item.id);
        return <article className="cart-item" key={item.key}>
          <Link href={`/product/${product.id}`} className="cart-thumbnail" onClick={() => setCartOpen(false)}><Image src={product.image} alt={product.name} width={140} height={140} /></Link>
          <div className="cart-item-content"><div className="flex justify-between items-start gap-2"><Link href={`/product/${product.id}`} onClick={() => setCartOpen(false)} className="product-name">{product.name}</Link><button className="icon-button remove-item" aria-label={`Remove ${product.name}`} onClick={() => removeItem(item.key)}><Icon name="close" size={16} /></button></div><p className="muted">{product.audience}&apos;s {product.category}</p><p className="cart-variant">EU {item.size} <span>/</span> {item.color}</p><div className="cart-item-bottom"><div className="quantity-control"><button aria-label={`Decrease ${product.name} quantity`} disabled={item.quantity === 1} onClick={() => updateQuantity(item.key, item.quantity - 1)}><Icon name="minus" size={14} /></button><span aria-label={`${product.name} quantity`}>{item.quantity}</span><button aria-label={`Increase ${product.name} quantity`} disabled={item.quantity === 10} onClick={() => updateQuantity(item.key, item.quantity + 1)}><Icon name="plus" size={14} /></button></div><strong>{formatPrice(product.price * item.quantity)}</strong></div></div>
        </article>;
      })}
      {!compact && <Link href="/shop" className="text-link mt-6 inline-flex items-center gap-2">Continue shopping <Icon name="arrow" size={16} /></Link>}
    </div>
    <div className="cart-summary"><h2>Order summary</h2><div className="summary-row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div><div className="summary-row"><span>Delivery</span><span>{delivery ? formatPrice(delivery) : "On us"}</span></div><p className="sample-note">Sample prices include taxes. No additional fees.</p><div className="summary-row summary-total"><strong>Total</strong><strong>{formatPrice(subtotal + delivery)}</strong></div>
      {checkout ? <div className="notice"><Icon name="shield" size={24} /><div><strong>You&apos;re exploring a demo storefront.</strong><p>Payments and order placement aren&apos;t connected. No payment details are collected and no order will be placed.</p></div></div> : <Link href="/checkout" className="button button-dark w-full" onClick={() => setCartOpen(false)}>Checkout <Icon name="arrow" size={18} /></Link>}
      {compact && <Link href="/cart" className="quick-detail-link" onClick={() => setCartOpen(false)}>View your bag</Link>}
      {compact && <Link href="/shop" className="quick-detail-link" onClick={() => setCartOpen(false)}>Continue shopping</Link>}
      {!checkout && <p className="sample-note text-center mt-3">Demo storefront · No payment will be taken</p>}
    </div>
  </div>;
}
