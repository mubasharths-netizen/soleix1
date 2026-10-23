import Link from "next/link";
import Icon from "@/components/Icon";

export const metadata = { title: "Your SOLEIX" };
export default function AccountPage() {
  return <section className="section page-shell account-page"><p className="eyebrow">MAKE YOURSELF AT HOME</p><h1 className="page-title">YOUR CORNER OF SOLEIX.</h1><p className="page-intro">You&apos;re exploring as a guest. Your bag and favourites stay with you on this browser — no account needed.</p><div className="account-grid">{[{icon:"heart",title:"Your favourites",description:"The pairs you keep coming back to.",href:"/wishlist"},{icon:"bag",title:"Your bag",description:"One step closer to your next rotation.",href:"/cart"},{icon:"user",title:"Here to help",description:"Delivery, sizing, returns and more.",href:"/info/faq"}].map((item) => <Link href={item.href} className="account-card" key={item.title}><Icon name={item.icon} size={28} /><h2>{item.title}</h2><p>{item.description}</p><Icon name="arrow" /></Link>)}</div><div className="notice"><Icon name="shield" /><p>This concept storefront does not offer sign-in, order history or account creation. No password or payment information is collected.</p></div></section>;
}
