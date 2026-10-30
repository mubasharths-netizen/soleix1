"use client";

import Link from "next/link";
import { useCatalog, useStore } from "@/components/StoreProvider";
import ProductCard from "@/components/ProductCard";
import Icon from "./Icon";

export default function WishlistGrid() {
  const { wishlist, ready } = useStore();
  const { products, ready: catalogReady } = useCatalog();
  const saved = products.filter((product) => wishlist.includes(product.id));

  if (!ready || !catalogReady) return <p className="muted" role="status">Loading your favourites…</p>;

  if (!saved.length) {
    return (
      <div className="empty-state">
        <span className="empty-icon"><Icon name="heart" size={36} /></span>
        <h2>Room for a new favourite.</h2>
        <p>Tap the heart on a pair you love. We&apos;ll keep it here for you.</p>
        <Link href="/shop" className="button button-dark">Find your pair <Icon name="arrow" size={18} /></Link>
      </div>
    );
  }

  return (
    <>
      <p className="muted mb-6" role="status">
        {saved.length} pair{saved.length === 1 ? "" : "s"} saved on this device. Favourites live in this browser only —
        {" "}<Link className="text-link" href="/signup">make an account</Link> to keep your orders in one place.
      </p>
      <div className="product-grid">{saved.map((product) => <ProductCard product={product} key={product.id} />)}</div>
    </>
  );
}
