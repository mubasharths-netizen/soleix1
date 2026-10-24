"use client";

import Link from "next/link";
import { useCatalog, useStore } from "@/components/StoreProvider";
import ProductCard from "@/components/ProductCard";
import Icon from "@/components/Icon";

export default function WishlistPage() {
  const { wishlist, ready } = useStore();
  const { products, ready: catalogReady } = useCatalog();
  const saved = products.filter((product) => wishlist.includes(product.id));
  return <section className="section page-shell"><p className="eyebrow">KEEP THE GOOD ONES CLOSE</p><h1 className="page-title">YOUR FAVOURITES.</h1><p className="page-intro">A little inspiration for your next move. Saved on this device.</p>{!ready || !catalogReady ? <p role="status">Loading your favourites…</p> : saved.length ? <div className="product-grid">{saved.map((product) => <ProductCard product={product} key={product.id} />)}</div> : <div className="empty-state"><span className="empty-icon"><Icon name="heart" size={36} /></span><h2>Room for a new favourite.</h2><p>Tap the heart on a pair you love. We&apos;ll keep it here for you.</p><Link href="/shop" className="button button-dark">Find your pair <Icon name="arrow" size={18} /></Link></div>}</section>;
}
