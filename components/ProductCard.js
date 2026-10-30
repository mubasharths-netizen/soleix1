"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { colorValues, formatPrice, stockFor } from "@/lib/catalog.mjs";
import { useStore } from "./StoreProvider";
import Icon from "./Icon";
import Modal from "./Modal";
import { StarCount } from "./StarRating";

export default function ProductCard({ product }) {
  const { wishlist, toggleWishlist, addItem } = useStore();
  const [quickAdd, setQuickAdd] = useState(false);
  const [size, setSize] = useState(null);
  const [color, setColor] = useState(product.colors[0]);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const addedTimer = useRef(null);
  const saved = wishlist.includes(product.id);
  const soldOut = (item) => stockFor(product, item, color) === 0;
  const fewest = Math.min(...Object.values(product.stock || {}).filter((qty) => qty > 0), 10);
  const scarce = fewest <= (product.lowStock || 3);

  useEffect(() => () => clearTimeout(addedTimer.current), []);

  function add() {
    if (!size) { setError("Choose your size to add this pair."); return; }
    if (addItem(product.id, size, color, 1)) {
      setQuickAdd(false); setError(""); setSize(null);
      setAdded(true);
      clearTimeout(addedTimer.current);
      addedTimer.current = setTimeout(() => setAdded(false), 1500);
    }
  }

  return <article className="product-card">
    <div className="product-card-image">
      <Link href={`/product/${product.id}`} aria-label={`View ${product.name}`}><Image src={product.image} alt={`${product.name} in ${product.colors[0]}`} fill sizes="(max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw" className="product-photo" />{product.altImage && <Image src={product.altImage} alt="" aria-hidden="true" fill sizes="(max-width: 600px) 50vw, (max-width: 1100px) 33vw, 25vw" className="product-photo alt" />}</Link>
      {product.badge && <span className={`product-badge ${product.badge === "SALE" ? "sale" : ""}`}>{product.badge}</span>}
      {scarce && <span className="stock-chip">Only {fewest} left</span>}
      <motion.button className={`favorite-button ${saved ? "is-saved" : ""}`} onClick={() => toggleWishlist(product.id)} aria-pressed={saved} aria-label={`${saved ? "Remove" : "Save"} ${product.name} ${saved ? "from" : "to"} favourites`} animate={saved ? { scale: [1, 1.35, 1] } : { scale: 1 }} transition={{ duration: 0.35 }}><Icon name="heart" size={19} fill={saved ? "currentColor" : "none"} /></motion.button>
      <motion.button className="quick-add" onClick={() => setQuickAdd(true)} aria-label={`Add ${product.name} to cart`} whileTap={{ scale: 0.95 }}>Add to Cart <Icon name="plus" size={16} /></motion.button>
      <AnimatePresence>
        {added && (
          <motion.span className="added-check" key="added" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.2, opacity: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <Icon name="check" size={22} /> Added
          </motion.span>
        )}
      </AnimatePresence>
    </div>
    <div className="product-card-info">
      <div className="flex items-start justify-between gap-2"><Link className="product-name" href={`/product/${product.id}`}>{product.name}</Link><div className="color-swatches" aria-label={`${product.colors.length} available colours`}>{product.colors.slice(0, 3).map((item) => <span key={item} className="color-dot" style={{ background: colorValues[item] }} title={item} />)}</div></div>
      <p className="product-category">{product.audience}&apos;s {product.category} Shoes</p>
      <div className="product-card-meta">
        <StarCount value={product.rating?.average} count={product.rating?.count} size={14} />
        {product.totalStock === 0 && <span className="badge badge-off">Sold out</span>}
      </div>
      <div className="product-price">{formatPrice(product.price)} {product.originalPrice && <span className="old-price">{formatPrice(product.originalPrice)}</span>}</div>
    </div>
    <Modal open={quickAdd} onClose={() => setQuickAdd(false)} title="Make them yours">
      <div className="quick-product"><Image src={product.image} alt={product.name} width={110} height={110} /><div><p className="eyebrow">{product.category}</p><h3>{product.name}</h3><p>{formatPrice(product.price)}</p></div></div>
      <p className="option-label">Colour: {color}</p>
      <div className="flex flex-wrap gap-2">{product.colors.map((item) => <button key={item} className={`colour-option ${item === color ? "active" : ""}`} onClick={() => { setColor(item); if (size && stockFor(product, size, item) === 0) setSize(null); }} aria-label={`Colour ${item}`} aria-pressed={item === color}><span className="color-dot" style={{ background: colorValues[item] }} />{item}</button>)}</div>
      <p className="option-label">Select size <span className="muted">EU</span> {size && <span className="size-selected">EU {size} selected</span>}</p>
      <div className="size-grid">{product.sizes.map((item) => <button key={item} className={`size-button ${item === size ? "active" : ""} ${soldOut(item) ? "is-out" : ""}`} disabled={soldOut(item)} onClick={() => { setSize(item); setError(""); }} aria-pressed={item === size} title={soldOut(item) ? "Sold out in this size" : undefined}>EU {item}</button>)}</div>
      {product.sizes.some(soldOut) && <p className="stock-note">Struck-through sizes are sold out.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="sample-note">Gallery shows {product.colors[0]}. Other colours are illustrative sample options.</p>
      <button className="button button-dark w-full" onClick={add}>Add to Bag <Icon name="bag" size={18} /></button>
      <Link className="quick-detail-link" href={`/product/${product.id}`} onClick={() => setQuickAdd(false)}>View full product details <Icon name="arrow" size={16} /></Link>
    </Modal>
  </article>;
}
