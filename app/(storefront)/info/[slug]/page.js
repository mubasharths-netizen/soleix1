import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";

const pages = {
  delivery: {
    title: "Shipping & Delivery",
    intro: "Sample delivery terms for the SOLEIX concept storefront.",
    body: <>
      <h2>How much does delivery cost?</h2><p>Delivery is free on merchandise totals of PKR 15,000 or more. For smaller orders, a flat sample fee of PKR 250 applies at checkout preview.</p>
      <h2>How long will it take?</h2><p>Estimated delivery is 3–5 business days within major cities in Pakistan. Remote areas may need a little longer.</p>
      <h2>Where do you deliver?</h2><p>This concept storefront imagines nationwide delivery across Pakistan. All prices are shown in Pakistani Rupees (PKR) and include applicable taxes.</p>
      <div className="notice"><Icon name="truck" size={22} /><p><strong>Please note:</strong> SOLEIX is a frontend demo. No real orders are placed, shipped or delivered.</p></div>
    </>,
  },
  returns: {
    title: "Returns & Exchanges",
    intro: "A little room to change your mind.",
    body: <>
      <h2>14-day sample policy</h2><p>If a pair isn&apos;t the one, the sample policy allows returns within 14 days of delivery for unworn shoes in their original packaging, with all tags attached.</p>
      <h2>Exchanges</h2><p>Size exchanges follow the same conditions. Because this is a demo storefront, no actual returns or exchanges can be processed — but the flow is here to show how we&apos;d handle it.</p>
      <h2>Good to know</h2><ul><li>Try shoes indoors on carpet or a mat to keep soles clean.</li><li>Keep the box and paperwork until you&apos;re sure.</li><li>Items returned without original packaging may not qualify.</li></ul>
    </>,
  },
  "size-guide": {
    title: "Size Guide",
    intro: "All SOLEIX sizes are European (EU) sizes.",
    body: <>
      <h2>Find your EU size</h2><p>Start with the EU size printed inside a well-fitting pair you already own. If you&apos;re between sizes, we generally suggest going up — feet swell during the day and during runs.</p>
      <h2>Measure up</h2><ul><li>Measure both feet while standing, wearing the socks you plan to use.</li><li>Use the longer foot when comparing against a brand&apos;s chart.</li><li>Leave about a thumb&apos;s width in front of your longest toe.</li></ul>
      <h2>Available sample sizes</h2><p>Men&apos;s and running styles: EU 39–45 · Women&apos;s styles: EU 36–41 · Kids&apos; styles: EU 28–34.</p>
      <p className="muted mt-6">This demo does not publish a verified cm/UK/US conversion chart. Fit varies by style.</p>
    </>,
  },
  faq: {
    title: "FAQs",
    intro: "Quick answers to the questions we hear most.",
    body: <>
      <h2>Is this a real store?</h2><p>SOLEIX is a concept storefront built to showcase a premium shopping experience. Browsing, filtering, favourites and the bag all work — but checkout and payments are not connected, and no orders are placed.</p>
      <h2>Where is my data stored?</h2><p>Your bag and favourites are saved in this browser&apos;s local storage only. Nothing is sent to a server, and no account or email is required.</p>
      <h2>What currency do you use?</h2><p>All prices are shown in Pakistani Rupees (PKR), taxes included.</p><h2>Do you ship internationally?</h2><p>The sample delivery terms cover Pakistan only, with free delivery on orders of PKR 15,000+.</p>
      <h2>How do I save a pair for later?</h2><p>Tap the heart on any product. Saved pairs live under <Link href="/wishlist" className="text-link">Favourites</Link>.</p>
    </>,
  },
  about: {
    title: "Our Story",
    intro: "A fresh perspective on everyday movement.",
    body: <>
      <h2>Why SOLEIX exists</h2><p>We believe the right pair does more than complete a look. It opens a door — to a new place, a new pace, a new version of you. SOLEIX started with a simple question: what if everyday sneakers felt as considered as they look?</p>
      <h2>What we make</h2><p>Thoughtfully designed footwear for running, trails and the in-between. Breathable uppers, sculpted cushioning, and palettes built to live with what you already wear.</p>
      <h2>Where we&apos;re going</h2><p>SOLEIX is an independent concept brand — a design study of a premium sneaker storefront. Every product, price and policy here is a sample, made to show what care in the details feels like.</p>
    </>,
  },
  approach: {
    title: "Our Approach",
    intro: "Comfort, considered. Design, honest.",
    body: <>
      <h2>Design in the open</h2><p>Quiet colours, clean lines, and silhouettes meant to last a season or five. We design for the everyday — the commute, the long walk, the early start.</p>
      <h2>Comfort first, always</h2><p>Every sample pair pairs breathable mesh with responsive cushioning, because a shoe you don&apos;t notice is the shoe you&apos;ll reach for again.</p>
      <h2>Try before the real thing</h2><p>This storefront is a working demo: explore filters, build a bag, switch colourways. No payments, no pressure — just the experience.</p>
    </>,
  },
  contact: {
    title: "Contact Us",
    intro: "Here to help — in spirit.",
    body: <>
      <h2>Get in touch</h2><p>SOLEIX is a concept storefront, so there&apos;s no support inbox to open yet. Questions about sizing, delivery or returns are answered on our <Link href="/info/faq" className="text-link">FAQs</Link> and <Link href="/info/size-guide" className="text-link">Size Guide</Link> pages.</p>
      <h2>Showroom hours (imagined)</h2><ul><li>Monday – Saturday · 11:00 – 21:00</li><li>Sunday · 12:00 – 18:00</li></ul>
      <div className="notice"><Icon name="pin" size={22} /><p>A real SOLEIX flagship would be somewhere with good light and better floors. Until then, the whole collection lives here.</p></div>
    </>,
  },
  community: {
    title: "Community",
    intro: "Where movers find each other.",
    body: <>
      <h2>#FindYourNextMove</h2><p>In a full launch, this is where the SOLEIX crew would share early starts, city laps and off-duty fits. This demo has no live social connections — the links below are placeholders for the storefront structure.</p>
      <h2 id="instagram">Instagram</h2><p>Placeholder — not connected.</p>
      <h2 id="tiktok">TikTok</h2><p>Placeholder — not connected.</p>
    </>,
  },
  privacy: {
    title: "Privacy Policy",
    intro: "Short, because the demo is simple.",
    body: <>
      <h2>What we collect</h2><p>Nothing. SOLEIX is a frontend demo with no accounts, no tracking scripts and no server. Your bag, favourites and newsletter interest are stored only in this browser&apos;s local storage and never leave your device.</p>
      <h2>Clearing your data</h2><p>Empty the bag, unsave favourites, or clear this site&apos;s stored data in your browser settings to remove everything.</p>
      <h2>Cookies</h2><p>No cookies are set by this storefront.</p>
    </>,
  },
  terms: {
    title: "Terms of Use",
    intro: "The fine print, in plain language.",
    body: <>
      <h2>This is a demo</h2><p>SOLEIX is an independent concept storefront for design and development purposes. Product names, prices, colours and policies are illustrative samples. No orders can be placed, and no payments are collected.</p>
      <h2>Imagery</h2><p>All sneaker and campaign imagery was generated for SOLEIX. SOLEIX is not affiliated with, endorsed by, or connected to any existing footwear brand.</p>
      <h2>Your use</h2><p>Browse, experiment and enjoy the flow. Nothing here constitutes an offer of sale.</p>
    </>,
  },
};

export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) return {};
  return { title: page.title, description: page.intro };
}

export default async function InfoPage({ params }) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) notFound();

  return <section className="page-shell info-page">
    <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">{page.title}</span></nav>
    <p className="eyebrow">SOLEIX SUPPORT</p>
    <h1 className="page-title">{page.title}</h1>
    <p className="page-intro">{page.intro}</p>
    <div className="info-content mt-10">{page.body}</div>
  </section>;
}
