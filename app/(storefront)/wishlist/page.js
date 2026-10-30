import Link from "next/link";
import JsonLd, { breadcrumb } from "@/components/JsonLd";
import WishlistGrid from "@/components/WishlistGrid";

export const metadata = {
  title: "Your favourites",
  description: "The pairs you saved on SOLEIX. Favourites are kept in this browser, so you can come back to them any time.",
  alternates: { canonical: "/wishlist" },
};

export default function WishlistPage() {
  return (
    <section className="section page-shell wishlist-page">
      <JsonLd data={breadcrumb([{ name: "Home", href: "/" }, { name: "Favourites", href: "/wishlist" }])} />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Favourites</span>
      </nav>
      <p className="eyebrow">KEEP THE GOOD ONES CLOSE</p>
      <h1 className="page-title">YOUR FAVOURITES.</h1>
      <p className="page-intro">A little inspiration for your next move.</p>
      <WishlistGrid />
    </section>
  );
}
