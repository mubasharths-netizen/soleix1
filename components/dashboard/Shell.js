"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import { signOutAction } from "@/lib/auth-actions";
import { clientSignOut } from "@/lib/firebase/client";

const NAV = [
  { slug: "", label: "Dashboard", icon: "grid", roles: ["superadmin", "admin", "shop"] },
  { slug: "admins", label: "Staff & admins", icon: "users", roles: ["superadmin"] },
  { slug: "customers", label: "Customers", icon: "user", roles: ["superadmin"] },
  { slug: "shops", label: "Shop management", icon: "store", roles: ["superadmin", "admin"] },
  { slug: "products", label: "Products", icon: "box", roles: ["superadmin", "admin", "shop"] },
  { slug: "categories", label: "Categories", icon: "tag", roles: ["superadmin"] },
  { slug: "orders", label: "Orders", icon: "receipt", roles: ["superadmin", "admin", "shop"] },
  { slug: "inventory", label: "Inventory", icon: "layers", roles: ["superadmin", "admin", "shop"], flag: "canManageInventory" },
  { slug: "delivery", label: "Delivery", icon: "truck", roles: ["superadmin", "admin", "shop"], flag: "canUpdateDelivery" },
  { slug: "cod", label: "Cash collection", icon: "check", roles: ["superadmin", "admin", "shop"], flag: "canCollectCod" },
  { slug: "reports", label: "Reports", icon: "chart", roles: ["superadmin", "admin", "shop"] },
  { slug: "activity", label: "Activity log", icon: "shield", roles: ["superadmin"] },
  { slug: "settings", label: "Settings", icon: "gear", roles: ["superadmin", "admin", "shop"] },
];

const ROLE_LABEL = { superadmin: "Super Admin", admin: "Admin", shop: "Shop" };

export default function Shell({ base, user, children }) {
  const pathname = usePathname();
  // Permission flags come from the verified session row, so a deactivated permission hides the screen.
  const links = NAV.filter((item) => item.roles.includes(user.role) && (!item.flag || user[item.flag]));

  async function signOut() {
    await clientSignOut();
    await signOutAction();
  }

  return (
    <div className="app-shell">
      <div className="app-bg" aria-hidden="true" />
      <div className="app-grid">
        <aside className="app-sidebar glass">
          <div className="app-brand">
            <Link href="/" className="app-wordmark">
              SOLEIX
            </Link>
            <span className="app-role">{ROLE_LABEL[user.role]}</span>
          </div>

          <nav className="app-nav" aria-label="Dashboard sections">
            {links.map((item) => {
              const href = item.slug ? `${base}/${item.slug}` : base;
              const active = pathname === href || (item.slug !== "" && pathname.startsWith(`${href}/`));
              return (
                <Link key={href} href={href} className="app-nav-link" aria-current={active ? "page" : undefined}>
                  <Icon name={item.icon} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="app-sidebar-foot">
            <Link href={user.role === "shop" ? "/shop" : "/"} className="app-nav-link">
              <Icon name="store" />
              View storefront
            </Link>
            <button type="button" className="app-nav-link" onClick={signOut}>
              <Icon name="logout" />
              Logout
            </button>
            <div className="app-signer">
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
          </div>
        </aside>

        <main className="app-main" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
