import { Suspense } from "react";
import JsonLd, { breadcrumb, collectionPage } from "@/components/JsonLd";
import ShopBrowser from "@/components/ShopBrowser";
import { loadCatalog } from "@/lib/storefront.mjs";

export const metadata = {
  title: "Shop the rotation",
  description: "Explore SOLEIX running, trail and lifestyle shoes for men, women and kids. Find your next pair by style, size, colour and price — live stock, Cash on Delivery across Pakistan.",
  alternates: { canonical: "/shop" },
};

export default function ShopPage() {
  // The grid itself is client-filtered, but the catalogue is read here so the structured data
  // lists the same pairs a crawler can reach.
  const products = loadCatalog(false).slice(0, 60);

  return (
    <>
      <JsonLd data={[
        breadcrumb([{ name: "Home", href: "/" }, { name: "Shop", href: "/shop" }]),
        collectionPage({
          name: "SOLEIX collection",
          description: "Every sneaker SOLEIX currently holds, grouped by the shop that stocks it.",
          path: "/shop",
          products,
        }),
      ]} />
      <Suspense fallback={
        <section className="page-shell catalog-page" aria-busy="true" aria-label="Loading shop">
          <p className="eyebrow">THE SOLEIX ROTATION</p>
          <h1 className="page-title">Find your next move.</h1>
          <p className="muted" role="status">Getting the rotation ready…</p>
        </section>
      }>
        <ShopBrowser />
      </Suspense>
    </>
  );
}
