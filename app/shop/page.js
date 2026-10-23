import { Suspense } from "react";
import ShopBrowser from "@/components/ShopBrowser";

export const metadata = {
  title: "Shop the rotation",
  description: "Explore SOLEIX running, trail and lifestyle shoes for men, women and kids. Find your next pair by style, size, colour and price. Demo storefront.",
};

export default function ShopPage() {
  return (
    <Suspense fallback={
      <section className="page-shell catalog-page" aria-busy="true" aria-label="Loading shop">
        <p className="eyebrow">THE SOLEIX ROTATION</p>
        <h1 className="page-title">Find your next move.</h1>
        <p className="muted" role="status">Getting the rotation ready…</p>
      </section>
    }>
      <ShopBrowser />
    </Suspense>
  );
}
