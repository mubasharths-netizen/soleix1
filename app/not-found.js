import Link from "next/link";
import Icon from "@/components/Icon";

export default function NotFound() {
  return <section className="section empty-state page-shell"><p className="eyebrow">404 / OFF THE BEATEN PATH</p><h1 className="page-title">LET’S FIND YOUR WAY.</h1><p>This page or pair is no longer here. There&apos;s plenty more to explore.</p><Link href="/shop" className="button button-dark">Explore the collection <Icon name="arrow" size={18} /></Link></section>;
}
