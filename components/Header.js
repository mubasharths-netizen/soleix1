"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "./Icon";
import Modal from "./Modal";
import { useStore } from "./StoreProvider";

const navigation = [
  ["New Releases", "/shop?collection=New%20Arrivals"],
  ["Men", "/shop?audience=Men"],
  ["Women", "/shop?audience=Women"],
  ["Kids", "/shop?audience=Kids"],
  ["Sale", "/shop?collection=Sale%20Collection"],
];

export default function Header() {
  const { count, setCartOpen } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  function search(event) {
    event.preventDefault();
    setSearchOpen(false);
    router.push(`/shop${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`);
  }
  return <>
    <div className="promo-bar"><span>Good moves. Better delivery. <span className="promo-extra">Free shipping on orders over PKR 15,000.</span></span><Link href="/info/delivery">Details <Icon name="arrow" size={12} /></Link></div>
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <Link href="/" aria-label="SOLEIX home" className="wordmark">SOLEIX<span className="wordmark-dot">®</span></Link>
      <nav className="desktop-nav" aria-label="Main navigation">{navigation.map(([label, href]) => <Link key={label} href={href} className={label === "Sale" ? "sale-link" : ""}>{label}</Link>)}</nav>
      <div className="header-actions">
        <form onSubmit={search} className="header-search"><button type="submit" aria-label="Search products"><Icon name="search" size={18} /></button><input aria-label="Search sneakers" placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} /></form>
        <button className="icon-button mobile-search-toggle" onClick={() => setSearchOpen(true)} aria-label="Open search"><Icon name="search" /></button>
        <Link className="icon-button account-link" href="/account" aria-label="Your account" aria-current={pathname === "/account" ? "page" : undefined}><Icon name="user" /></Link>
        <button className="icon-button bag-button" onClick={() => setCartOpen(true)} aria-label={`Shopping bag, ${count} items`}><Icon name="bag" /><span className="bag-count">{count}</span></button>
        <button className="icon-button mobile-menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen}><Icon name="menu" /></button>
      </div>
    </header>
    <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="Explore SOLEIX" drawer><nav className="mobile-nav" aria-label="Mobile navigation">{navigation.map(([label, href]) => <Link key={label} href={href} onClick={() => setMenuOpen(false)}>{label}<Icon name="arrow" /></Link>)}<Link href="/wishlist" onClick={() => setMenuOpen(false)}>Favourites <Icon name="heart" /></Link><Link href="/account" onClick={() => setMenuOpen(false)}>Your account <Icon name="user" /></Link><Link href="/info/about" onClick={() => setMenuOpen(false)}>Our story <Icon name="diagonal" /></Link></nav><p className="muted mt-8">A fresh perspective on everyday movement.</p></Modal>
    <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Find your next pair"><form onSubmit={search} className="search-dialog-form"><label className="sr-only" htmlFor="mobile-search">Search products</label><input id="mobile-search" className="input" placeholder="Try Velocity, running, or Court…" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="button button-dark" type="submit"><Icon name="search" />Search</button></form><p className="muted mt-6">Explore the full collection or search by product name.</p></Modal>
  </>;
}
