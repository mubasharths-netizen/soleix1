"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { colorValues, formatPrice } from "@/lib/products";
import Icon from "./Icon";
import ProductCard from "./ProductCard";
import { useStore } from "./StoreProvider";

// All views use the same source photograph. The detail views are labelled crops.
const galleryViews = [
  { id: "profile", label: "Full profile", caption: "Full profile · original photograph", scale: 1, position: "50% 50%" },
  { id: "toe", label: "Toe crop", caption: "Toe detail · cropped from the same photograph", scale: 1.85, position: "20% 65%" },
  { id: "heel", label: "Heel crop", caption: "Heel detail · cropped from the same photograph", scale: 1.85, position: "85% 50%" },
];

function imageStyle(view) {
  return { objectFit: "cover", objectPosition: view.position, transform: `scale(${view.scale})`, transformOrigin: view.position };
}

export default function ProductDetail({ product, relatedProducts = [] }) {
  const { addItem, toggleWishlist, wishlist } = useStore();
  const [selectedView, setSelectedView] = useState(0);
  const [color, setColor] = useState(product.colors[0]);
  const [size, setSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [sizeError, setSizeError] = useState(false);
  const firstSize = useRef(null);
  const outOfStock = product.outOfStock || [];
  const view = galleryViews[selectedView];
  const saved = wishlist.includes(product.id);

  function addToBag(event) {
    event.preventDefault();
    if (!size) {
      setSizeError(true);
      setError("Please select an EU size before adding this pair to your bag.");
      firstSize.current?.focus();
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      setError("Choose a quantity between 1 and 10.");
      return;
    }
    if (addItem(product.id, size, color, quantity)) {
      setError("");
      setSizeError(false);
    } else {
      setError("We couldn’t add this quantity. Your bag can hold up to 10 of each size and colour combination; check your bag or choose a smaller quantity.");
    }
  }

  return (
    <section className="page-shell product-detail-page">
      <nav className="breadcrumb flex flex-wrap" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span aria-hidden="true">/</span>
        <Link href="/shop">Shop</Link><span aria-hidden="true">/</span>
        <Link href={`/shop?audience=${encodeURIComponent(product.audience)}`}>{product.audience}</Link><span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className="product-detail-layout">
        <div className="product-gallery min-w-0">
          <figure>
            <div id="product-gallery-image" className="product-main-image" style={{ position: "relative", aspectRatio: "1 / 1", overflow: "hidden" }}>
              <Image src={product.image} alt={`${product.name} in ${product.colors[0]} — ${view.label.toLowerCase()}`} fill sizes="(max-width: 900px) 100vw, 55vw" preload style={imageStyle(view)} />
              {product.badge && <span className={`product-badge ${product.badge === "SALE" ? "sale" : ""}`}>{product.badge}</span>}
            </div>
            <figcaption className="muted mt-3 text-xs" aria-live="polite">{view.caption}</figcaption>
          </figure>
          <div className="gallery-thumbnails mt-4" role="group" aria-label="Product gallery views">
            {galleryViews.map((item, index) => (
              <button key={item.id} type="button" className={selectedView === index ? "active" : ""} aria-label={`Show ${item.label.toLowerCase()}`} aria-pressed={selectedView === index} aria-controls="product-gallery-image" onClick={() => setSelectedView(index)}>
                <span className="relative block aspect-square overflow-hidden">
                  <Image src={product.image} alt="" fill sizes="(max-width: 600px) 28vw, 140px" style={imageStyle(item)} />
                </span>
                <span className="block px-1 py-2 text-xs">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="product-information">
          <p className="eyebrow">{product.audience.toUpperCase()} / {product.category.toUpperCase()}</p>
          <h1 className="page-title">{product.name}</h1>
          <div className="product-detail-price mb-3 flex flex-wrap items-baseline gap-3">
            <span className="text-2xl font-semibold">{formatPrice(product.price)}</span>
            {product.originalPrice && <del className="muted text-lg"><span className="sr-only">Original price: </span>{formatPrice(product.originalPrice)}</del>}
          </div>
          <p className="muted mb-5 text-xs">No customer reviews yet. This is a demo product.</p>
          <p className="mb-6 leading-relaxed">{product.description}</p>
          <div className="notice mb-6" role="note">
            <strong className="block">Storefront demo — no orders are placed.</strong>
            <p className="mt-1 text-sm">Explore the sample collection and try the bag. No payment is collected.</p>
          </div>

          <form onSubmit={addToBag} noValidate>
            <fieldset className="mb-6">
              <legend className="option-label mb-3 text-sm font-semibold">Colour: <span className="font-normal">{color}</span></legend>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((item) => (
                  <button key={item} type="button" className={`colour-option ${color === item ? "active" : ""}`} aria-pressed={color === item} aria-label={`Colour ${item}`} onClick={() => { setColor(item); if (!sizeError) setError(""); }}>
                    <span className="color-dot" style={{ backgroundColor: colorValues[item] }} aria-hidden="true" />{item}
                  </button>
                ))}
              </div>
              <p className="sample-note muted mt-3 text-xs leading-relaxed">Gallery shows {product.colors[0]}; other colourways are illustrative sample options.</p>
            </fieldset>

            <fieldset className="mb-3" aria-invalid={sizeError} aria-describedby={sizeError ? "product-selection-error" : "product-size-hint"}>
              <legend className="option-label mb-3 text-sm font-semibold">Select size <span className="muted font-normal">EU · required{size ? ` · ${size} selected` : ""}</span></legend>
              <div className="size-grid">
                {product.sizes.map((item, index) => (
                  <button key={item} ref={index === 0 ? firstSize : undefined} type="button" className={`size-button ${size === item ? "active" : ""} ${outOfStock.includes(item) ? "is-out" : ""}`} disabled={outOfStock.includes(item)} aria-pressed={size === item} aria-label={`EU ${item}${outOfStock.includes(item) ? " — sold out" : ""}`} title={outOfStock.includes(item) ? "Sold out in this size" : undefined} onClick={() => { setSize(item); setSizeError(false); setError(""); }}>EU {item}</button>
                ))}
              </div>
              <p id="product-size-hint" className="muted mt-2 text-xs">Only the listed EU sizes are available for this sample.{product.lowStock ? ` Just ${product.lowStock} pairs left in the size run.` : ""}{outOfStock.length ? " Struck-through sizes are sold out." : ""}</p>
            </fieldset>

            <details className="size-guide mb-6 border-b border-black/10 pb-4">
              <summary className="text-link cursor-pointer py-2 text-sm">Size guide — EU sizing</summary>
              <div className="muted mt-2 space-y-2 text-sm leading-relaxed">
                <p>All sizes on SOLEIX are European (EU) sizes, not UK or US sizes. Start with the EU size printed inside a well-fitting pair of your own shoes.</p>
                <p>Measure both feet while standing, wearing the socks you plan to use. Use the longer foot when comparing a manufacturer’s size chart.</p>
                <p>This demo does not include a verified centimetre, UK or US conversion chart. Fit varies by style; these sample options are not a fit guarantee.</p>
                <p>Available for {product.name}: {product.sizes.map((item) => `EU ${item}`).join(", ")}.</p>
              </div>
            </details>

            <div className="mb-5 flex flex-wrap items-center gap-4">
              <label htmlFor="product-quantity" className="text-sm font-semibold">Quantity</label>
              <div className="quantity-control">
                <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity(Math.max(1, Number(quantity) - 1))}><Icon name="minus" size={16} /></button>
                <input id="product-quantity" type="number" min="1" max="10" step="1" inputMode="numeric" value={quantity} aria-describedby="product-quantity-hint" onChange={(event) => {
                  const value = event.target.value;
                  setQuantity(value === "" ? "" : Math.max(1, Math.min(10, Math.trunc(Number(value)))));
                }} onBlur={() => { if (quantity === "") setQuantity(1); }} />
                <button type="button" aria-label="Increase quantity" disabled={quantity >= 10} onClick={() => setQuantity(Math.min(10, Number(quantity) + 1))}><Icon name="plus" size={16} /></button>
              </div>
              <span id="product-quantity-hint" className="muted text-xs">Maximum 10 per option</span>
            </div>

            {error && <p id="product-selection-error" className="form-error mb-4 text-sm" style={{ color: "#a12e26" }} role="alert">{error}</p>}
            <div className="product-actions flex flex-wrap gap-3">
              <button type="submit" className="button button-dark flex-1">Add to Bag<Icon name="plus" size={18} /></button>
              <button type="button" className={`button button-outline ${saved ? "is-saved" : ""}`} aria-label={`${saved ? "Remove" : "Save"} ${product.name} ${saved ? "from" : "to"} wishlist`} aria-pressed={saved} onClick={() => toggleWishlist(product.id)}>
                <Icon name="heart" size={18} /><span>{saved ? "Saved" : "Save"}</span>
              </button>
            </div>
          </form>

          <div className="product-accordions mt-8 border-t border-black/10">
            <details className="border-b border-black/10 py-4" open>
              <summary className="cursor-pointer text-sm font-semibold">The details</summary>
              <div className="muted mt-3 space-y-3 text-sm leading-relaxed">
                <p>{product.description}</p>
                <p>{product.audience} · {product.category} · Style {product.id.toUpperCase()}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {product.collections.map((collection) => <Link key={collection} href={`/shop?collection=${encodeURIComponent(collection)}`} className="text-link">{collection}</Link>)}
                </div>
              </div>
            </details>
            <details className="border-b border-black/10 py-4">
              <summary className="cursor-pointer text-sm font-semibold"><span className="inline-flex items-center gap-2"><Icon name="truck" size={18} />Delivery — sample terms</span></summary>
              <p className="muted mt-3 text-sm leading-relaxed">Free delivery on merchandise totals of {formatPrice(15000)} or more; otherwise {formatPrice(250)}. Estimated delivery is 3–5 business days. These are illustrative Pakistan delivery terms only: this storefront demo does not place or fulfil orders.</p>
            </details>
            <details className="border-b border-black/10 py-4">
              <summary className="cursor-pointer text-sm font-semibold"><span className="inline-flex items-center gap-2"><Icon name="return" size={18} />Returns — sample terms</span></summary>
              <p className="muted mt-3 text-sm leading-relaxed">The sample policy allows returns within 14 days of delivery for unworn shoes in their original packaging. No real purchases or returns are processed through this demo.</p>
            </details>
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="related-products mt-16 border-t border-black/10 pt-12" aria-labelledby="related-products-heading">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div><p className="eyebrow">KEEP YOUR ROTATION FRESH</p><h2 id="related-products-heading" className="section-heading">You might also like.</h2></div>
            <Link href="/shop" className="text-link inline-flex items-center gap-2">Explore all pairs<Icon name="arrow" size={17} /></Link>
          </div>
          <div className="catalog-grid">{relatedProducts.slice(0, 4).map((item) => <ProductCard key={item.id} product={item} />)}</div>
        </section>
      )}
    </section>
  );
}
