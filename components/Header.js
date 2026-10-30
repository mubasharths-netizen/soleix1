"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/catalog.mjs";
import Icon from "./Icon";
import Modal from "./Modal";
import SignOutButton from "./SignOutButton";
import { useCatalog, useStore } from "./StoreProvider";

const navigation = [
  ["New Releases", "/shop?collection=New%20Arrivals"],
  ["Men", "/shop?audience=Men"],
  ["Women", "/shop?audience=Women"],
  ["Kids", "/shop?audience=Kids"],
  ["Sale", "/shop?collection=Sale%20Collection"],
];

export default function Header() {
  const { count, setCartOpen } = useStore();
  const { settings } = useCatalog();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");
  const [session, setSession] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    let alive = true;
    fetch("/api/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => alive && setSession(data))
      .catch(() => alive && setSession({ signedIn: false }));
    return () => { alive = false; };
  }, [pathname]);
  useEffect(() => {
    if (!accountOpen) return undefined;
    const away = (event) => { if (!event.target.closest(".account-menu")) setAccountOpen(false); };
    const escape = (event) => event.key === "Escape" && setAccountOpen(false);
    document.addEventListener("click", away);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("click", away); document.removeEventListener("keydown", escape); };
  }, [accountOpen]);
  function search(event) {
    event.preventDefault();
    setSearchOpen(false);
    router.push(`/shop${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`);
  }
  const signedIn = Boolean(session?.signedIn);
  const authGuest = <>
    <Link className="auth-nav-link" href="/login">Log in</Link>
    <Link className="auth-nav-cta" href="/signup">Sign up</Link>
    <Link className="icon-button account-link auth-guest-icon" href="/login" aria-label="Log in"><Icon name="user" /></Link>
  </>;
  const accountMenu = <div className="account-menu">
    <button type="button" className="icon-button account-trigger" onClick={() => setAccountOpen((open) => !open)} aria-expanded={accountOpen} aria-label="Your account menu">
      {session?.picture ? <img src={session.picture} alt="" referrerPolicy="no-referrer" className="account-avatar" /> : <Icon name="user" />}
    </button>
    {accountOpen && <div className="account-pop glass">
      <p className="account-pop-name">{session?.name}</p>
      <p className="account-pop-email">{session?.email}</p>
      <Link href="/account" onClick={() => setAccountOpen(false)}>My account</Link>
      <Link href="/account/orders" onClick={() => setAccountOpen(false)}>My orders</Link>
      <Link href="/account/profile" onClick={() => setAccountOpen(false)}>Profile and addresses</Link>
      {session?.kind === "staff" && <Link href={session.home} onClick={() => setAccountOpen(false)}>Staff dashboard</Link>}
      <SignOutButton className="account-pop-out" label="Sign out" />
    </div>}
  </div>;
  return <>
    <div className="promo-bar"><span>Good moves. Better delivery. <span className="promo-extra">{settings.freeDeliveryOver ? `Free delivery over ${formatPrice(settings.freeDeliveryOver)}.` : "Delivery is on us."}</span></span><Link href="/info/delivery">Details <Icon name="arrow" size={12} /></Link></div>
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <Link href="/" aria-label="SOLEIX home" className="wordmark">SOLEIX<span className="wordmark-dot">®</span></Link>
      <nav className="desktop-nav" aria-label="Main navigation">{navigation.map(([label, href]) => <Link key={label} href={href} className={label === "Sale" ? "sale-link" : ""}>{label}</Link>)}</nav>
      <div className="header-actions">
        <form onSubmit={search} className="header-search"><button type="submit" aria-label="Search products"><Icon name="search" size={18} /></button><input aria-label="Search sneakers" placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} /></form>
        <button className="icon-button mobile-search-toggle" onClick={() => setSearchOpen(true)} aria-label="Open search"><Icon name="search" /></button>
        <div className="auth-nav">{session === null ? <Link className="icon-button account-link" href="/account" aria-label="Your account" aria-current={pathname === "/account" ? "page" : undefined}><Icon name="user" /></Link> : signedIn ? accountMenu : authGuest}</div>
        <button className="icon-button bag-button" onClick={() => setCartOpen(true)} aria-label={`Shopping bag, ${count} items`}><Icon name="bag" /><span className="bag-count">{count}</span></button>
        <button className="icon-button mobile-menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen}><Icon name="menu" /></button>
      </div>
    </header>
    <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="Explore SOLEIX" drawer><nav className="mobile-nav" aria-label="Mobile navigation">{navigation.map(([label, href]) => <Link key={label} href={href} onClick={() => setMenuOpen(false)}>{label}<Icon name="arrow" /></Link>)}<Link href="/wishlist" onClick={() => setMenuOpen(false)}>Favourites <Icon name="heart" /></Link><Link href="/track" onClick={() => setMenuOpen(false)}>Track an order <Icon name="truck" /></Link><Link href="/stores" onClick={() => setMenuOpen(false)}>Store locations <Icon name="store" /></Link><Link href="/info/contact" onClick={() => setMenuOpen(false)}>Help and contact <Icon name="mail" /></Link>{signedIn ? <><Link href="/account" onClick={() => setMenuOpen(false)}>My account <Icon name="user" /></Link>{session?.kind === "staff" && <Link href={session.home} onClick={() => setMenuOpen(false)}>Staff dashboard <Icon name="grid" /></Link>}</> : <><Link href="/login" onClick={() => setMenuOpen(false)}>Log in <Icon name="user" /></Link><Link href="/signup" onClick={() => setMenuOpen(false)}>Create account <Icon name="plus" /></Link></>}<Link href="/info/about" onClick={() => setMenuOpen(false)}>Our story <Icon name="diagonal" /></Link></nav><p className="muted mt-8">A fresh perspective on everyday movement.</p></Modal>
    <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Find your next pair"><form onSubmit={search} className="search-dialog-form"><label className="sr-only" htmlFor="mobile-search">Search products</label><input id="mobile-search" className="input" placeholder="Try Velocity, running, or Court…" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="button button-dark" type="submit"><Icon name="search" />Search</button></form><p className="muted mt-6">Explore the full collection or search by product name.</p></Modal>
  </>;
}

