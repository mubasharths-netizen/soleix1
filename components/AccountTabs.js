"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "My orders" },
  { href: "/account/profile", label: "Profile & addresses" },
  { href: "/wishlist", label: "Favourites" },
];

export default function AccountTabs() {
  const pathname = usePathname();
  const tabs = TABS;
  return (
    <nav className="account-tabs" aria-label="Account sections">
      {tabs.map((tab) => {
        const active = tab.href === "/account" ? pathname === "/account" : pathname.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className={`account-tab${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
