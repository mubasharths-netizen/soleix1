import Link from "next/link";
import Icon from "./Icon";

const groups = [
  { title: "EXPLORE", links: [["New releases", "/shop?collection=New%20Arrivals"], ["Men", "/shop?audience=Men"], ["Women", "/shop?audience=Women"], ["Kids", "/shop?audience=Kids"], ["Sale", "/shop?collection=Sale%20Collection"]] },
  { title: "HERE TO HELP", links: [["Contact us", "/info/contact"], ["Shipping & delivery", "/info/delivery"], ["Returns & exchanges", "/info/returns"], ["Size guide", "/info/size-guide"], ["FAQs", "/info/faq"]] },
  { title: "THE SOLEIX WORLD", links: [["Our story", "/info/about"], ["Our approach", "/info/approach"], ["Your favourites", "/wishlist"], ["Instagram", "/info/community#instagram"], ["TikTok", "/info/community#tiktok"]] },
];

export default function Footer() {
  return <footer className="site-footer"><div className="footer-main"><div className="footer-brand"><Link href="/" className="wordmark">SOLEIX<span className="wordmark-dot">®</span></Link><p>Made for the everyday.<br />Ready for what&apos;s next.</p><Link className="footer-location" href="/info/delivery"><Icon name="globe" size={16} />Pakistan · PKR</Link></div>{groups.map((group) => <div className="footer-group" key={group.title}><h3>{group.title}</h3>{group.links.map(([name, href]) => <Link key={name} href={href}>{name}</Link>)}</div>)}</div><div className="footer-bottom"><span>© 2026 SOLEIX. All rights reserved.</span><span className="footer-demo">Independent concept storefront</span><div><Link href="/info/privacy">Privacy policy</Link><Link href="/info/terms">Terms of use</Link></div></div></footer>;
}
