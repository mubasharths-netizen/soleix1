import Image from "next/image";
import Link from "next/link";
import FeaturedProducts from "@/components/FeaturedProducts";
import Newsletter from "@/components/Newsletter";
import VideoCampaign from "@/components/VideoCampaign";
import Reveal from "@/components/Reveal";
import StaggerText from "@/components/StaggerText";
import SneakerShowcase from "@/components/SneakerShowcase";
import ScrollStory from "@/components/ScrollStory";
import Icon from "@/components/Icon";

export default function Home() {
  return <>
    <VideoCampaign
      as="h1"
      eager
      theme="light"
      className="hero-campaign"
      src="/videos/sneakers-walking-201.mp4"
      poster="/images/hero.webp"
      posterAlt="Original ivory SOLEIX sneakers, styled with ribbed socks on sunlit limestone"
      kicker="THE EVERYDAY, REIMAGINED."
      headline={<>FIND YOUR<br />NEXT MOVE<span className="headline-period">.</span></>}
      description={<>Premium sneakers. Everyday performance.<br />Made to move with you, wherever you go.</>}
      cta={{ label: "SHOP NOW", href: "/shop" }}
      overlays={<>
        <Link href="/product/velocity-01" className="hero-product-label"><div><span>THE VELOCITY 01</span><p>A new pace. A fresh perspective.</p></div><span className="round-arrow"><Icon name="diagonal" size={20} /></span></Link>
        <span className="hero-edition">SOLEIX / VOL. 01</span>
      </>}
    >
      <Link href="#collections" className="button button-glass">EXPLORE COLLECTION</Link>
      <p className="hero-footnote">LESS ORDINARY. MORE YOU.</p>
    </VideoCampaign>
    <div className="benefits-strip"><Link href="/info/delivery"><Icon name="truck" /><span>FREE DELIVERY <small>On orders PKR 15,000+</small></span></Link><Link href="/info/returns"><Icon name="return" /><span>EASY RETURNS <small>A little room to change your mind</small></span></Link><Link href="/info/approach"><Icon name="shield" /><span>COMFORT, CONSIDERED <small>Designed for your every day</small></span></Link></div>
    <SneakerShowcase />
    <FeaturedProducts />
    <section className="section category-section"><Reveal><div className="section-header"><div><p className="eyebrow">A PAIR FOR EVERY PERSPECTIVE</p><h2 className="section-heading"><StaggerText as="span" text="YOUR WORLD. YOUR WAY." /></h2></div><p className="section-description">Different paths. Same forward energy.</p></div></Reveal><Reveal delay={0.1}><div className="category-grid">{[{name:"Men",line:"For your everyday and beyond.",image:"men"},{name:"Women",line:"Move on your own terms.",image:"women"},{name:"Kids",line:"Small steps. Big possibilities.",image:"kids"}].map((category) => <Link key={category.name} href={`/shop?audience=${category.name}`} className="category-card"><Image src={`/images/${category.image}.webp`} alt={`${category.name}'s original SOLEIX sneakers in a sunlit urban setting`} fill sizes="(max-width: 600px) 100vw, 33vw" /><div className="category-shade" /><span className="category-top">THE {category.name.toUpperCase()}&apos;S EDIT</span><div className="category-content"><div><h3>{category.name}</h3><p>{category.line}</p></div><span className="category-shop">Shop <Icon name="arrow" size={18} /></span></div></Link>)}</div></Reveal></section>
    <VideoCampaign
      className="run-campaign"
      src="/videos/seaside-morning-run.mp4"
      poster="/images/campaign.webp"
      posterAlt="Runner in original cream sneakers moving through a sunlit concrete cityscape"
      kicker="BUILT FOR THE IN-BETWEEN"
      headline={<StaggerText as="span" text="NOT JUST A SHOE. A WAY FORWARD." />}
      description={<>From the early starts to the long way home.<br />Find your rhythm in the SOLEIX running collection.</>}
      cta={{ label: "FIND YOUR STRIDE", href: "/shop?collection=Running%20Shoes" }}
      overlays={<span className="campaign-caption">KEEP YOUR OWN PACE. / SOLEIX RUNNING</span>}
    />
    <ScrollStory />
    <section className="section collection-edit"><Reveal><div className="section-header"><div><p className="eyebrow">FOLLOW YOUR INSTINCT</p><h2 className="section-heading"><StaggerText as="span" text="THE EDIT." /></h2></div><Link href="/shop" className="text-link">Explore every pair <Icon name="arrow" size={17} /></Link></div></Reveal><Reveal delay={0.1}><div className="edit-grid"><Link href="/shop?collection=Lifestyle%20Sneakers" className="edit-card"><div><p className="eyebrow">01 / OFF-DUTY ESSENTIALS</p><h3>Everyday,<br />anything but ordinary.</h3><span className="text-link">Shop lifestyle <Icon name="arrow" size={17} /></span></div><Image src="/images/product-sage.webp" alt="Sage Court Classic lifestyle sneaker" width={500} height={500} /></Link><Link href="/shop?collection=Sale%20Collection" className="edit-card sale-edit"><div><p className="eyebrow">02 / GOOD FINDS</p><h3>Great pairs.<br />Even better prices.</h3><span className="text-link">Explore the sale <Icon name="arrow" size={17} /></span></div><Image src="/images/product-blush.webp" alt="Blush sneaker from the SOLEIX sale collection" width={500} height={500} /></Link></div></Reveal></section>
    <VideoCampaign
      className="trail-campaign"
      src="/videos/sneakers-walking-through-a-forest-8127.mp4"
      poster="/images/product-dark.webp"
      posterAlt="Original black SOLEIX trail sneakers on rough ground"
      kicker="WHERE THE PAVEMENT ENDS"
      headline={<StaggerText as="span" text="OFF THE USUAL PATH." />}
      description={<>Grippy outsoles, grounded cushioning and a silhouette that feels at home on the path less travelled.<br />Built for the way out.</>}
      cta={{ label: "SHOP TRAIL", href: "/shop?category=Trail" }}
      overlays={<span className="campaign-caption">NO DESTINATION REQUIRED. / SOLEIX TRAIL</span>}
    />
    <section className="brand-story"><Reveal><div className="story-mark" aria-hidden="true">S<span>↗</span></div></Reveal><Reveal delay={0.12}><div className="story-copy"><p className="eyebrow">THE SOLEIX PERSPECTIVE</p><h2>GOOD SHOES.<br />GREATER POSSIBILITIES.</h2><p>We believe the right pair does more than complete a look. It opens a door. To a new place, a new pace, a new version of you. So we bring thoughtful design and everyday comfort together — for wherever life takes you next.</p><Link href="/info/about" className="text-link">A little more about us <Icon name="arrow" size={18} /></Link></div></Reveal><span className="story-side">INDEPENDENT SPIRIT. EVERYDAY MOVEMENT.</span></section>
    <Newsletter />
  </>;
}
