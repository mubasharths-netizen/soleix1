"use client";

import { useState } from "react";
import Link from "next/link";
import ProductCard from "./ProductCard";
import Carousel from "./Carousel";
import Reveal from "./Reveal";
import StaggerText from "./StaggerText";
import Icon from "./Icon";
import { useCatalog } from "./StoreProvider";

export default function FeaturedProducts() {
  const { products, ready } = useCatalog();
  const [collection, setCollection] = useState("Best Sellers");
  const shown = products.filter((product) => product.collections.includes(collection)).slice(0, 6);
  return <section className="section featured-section" id="collections">
    <Reveal><div className="section-header"><div><p className="eyebrow">IN GOOD COMPANY</p><h2 className="section-heading"><StaggerText as="span" text="YOUR NEXT ROTATION." /></h2></div><Link href={`/shop?collection=${encodeURIComponent(collection)}`} className="text-link">Shop all sneakers <Icon name="arrow" size={17} /></Link></div></Reveal>
    <div className="collection-tabs" role="group" aria-label="Featured collections">{["Best Sellers", "New Arrivals", "Trending Sneakers"].map((name) => <button key={name} className={collection === name ? "active" : ""} aria-pressed={collection === name} onClick={() => setCollection(name)}>{name === "Trending Sneakers" ? "Trending now" : name}</button>)}<span className="collection-note">Considered design. Uncompromising comfort.</span></div>
    {ready ? <Carousel key={collection} label={`${collection} products`}>{shown.map((product) => <ProductCard key={product.id} product={product} />)}</Carousel> : <p className="muted text-center" role="status">Loading this collection…</p>}
  </section>;
}
