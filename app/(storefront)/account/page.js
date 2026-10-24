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
      <Suspense fallback={<p className="page-intro">Loading your account…</p>}>
        <AccountSession />
      </Suspense>
      <div className="account-grid">
        {[
          { icon: "heart", title: "Your favourites", description: "The pairs you keep coming back to.", href: "/wishlist" },
          { icon: "bag", title: "Your bag", description: "One step closer to your next rotation.", href: "/cart" },
          { icon: "user", title: "Here to help", description: "Delivery, sizing, returns and more.", href: "/info/faq" },
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
