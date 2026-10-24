import Link from "next/link";
import { Suspense } from "react";
import Icon from "@/components/Icon";
import AccountSession from "@/components/AccountSession";

export const metadata = { title: "Your SOLEIX" };

export default function AccountPage() {
  return (
    <section className="section page-shell account-page">
      <p className="eyebrow">MAKE YOURSELF AT HOME</p>
      <h1 className="page-title">YOUR CORNER OF SOLEIX.</h1>
      <Suspense
        fallback={
          <>
            <p className="page-intro">Loading your account…</p>
            <div className="account-details glass-field is-loading" aria-hidden="true">
              <div><span className="account-detail-label">Email</span><strong>&nbsp;</strong></div>
              <div><span className="account-detail-label">Signing in with</span><strong>&nbsp;</strong></div>
              <div><span className="account-detail-label">Member since</span><strong>&nbsp;</strong></div>
            </div>
          </>
        }
      >
        <AccountSession />
      </Suspense>
      <div className="account-grid">
        {[
          { icon: "bag", title: "Your orders", description: "Track a parcel, request a cancellation, re-order a favourite.", href: "/account/orders" },
          { icon: "user", title: "Profile and addresses", description: "The details checkout fills in for you.", href: "/account/profile" },
          { icon: "heart", title: "Your favourites", description: "The pairs you keep coming back to.", href: "/wishlist" },
          { icon: "bag", title: "Your bag", description: "One step closer to your next rotation.", href: "/cart" },
        ].map((item) => (
          <Link href={item.href} className="account-card" key={item.title}>
            <Icon name={item.icon} size={28} />
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <Icon name="arrow" />
          </Link>
        ))}
      </div>
    </section>
  );
}
