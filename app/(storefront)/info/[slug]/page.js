import Link from "next/link";
import { notFound } from "next/navigation";
import ContactForm from "@/components/ContactForm";
import Icon from "@/components/Icon";
import JsonLd, { breadcrumb, faqPage } from "@/components/JsonLd";
import { ALL_INFO_PAGES, CONTACT_PAGE, HELP_NAV, infoBySlug } from "@/lib/info-pages.js";
import { formatPrice } from "@/lib/catalog.mjs";
import { absolute, brand } from "@/lib/site.js";
import { publicShops, siteSettings } from "@/lib/storefront.mjs";

export const instant = false;

const PATH = (slug) => (slug === "contact" ? "/info/contact" : `/info/${slug}`);

export function generateStaticParams() {
  return ALL_INFO_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = infoBySlug(slug);
  if (!page) return {};
  const path = PATH(slug);
  return {
    title: `${page.title} · Help & Support`,
    description: page.description,
    alternates: { canonical: path },
    openGraph: { title: page.title, description: page.description, url: absolute(path), type: "article" },
  };
}

// The delivery page quotes the numbers the shop actually set, so the policy and the checkout can
// never drift apart.
function DeliveryCosts() {
  const settings = siteSettings();
  return (
    <ul className="info-facts">
      <li><span>Delivery fee</span><strong>{settings.deliveryFee ? formatPrice(settings.deliveryFee) : "Free"}</strong></li>
      <li><span>Free delivery on orders over</span><strong>{settings.freeDeliveryOver ? formatPrice(settings.freeDeliveryOver) : "Every order"}</strong></li>
      {settings.discountCode && (
        <li>
          <span>Live campaign</span>
          <strong>
            {settings.discountPercent ? `${settings.discountPercent}% off` : `${formatPrice(settings.discountFlat)} off`}
            {settings.discountMinimum ? ` at ${formatPrice(settings.discountMinimum)}` : ""}
          </strong>
        </li>
      )}
      <li><span>Payment method</span><strong>Cash on Delivery</strong></li>
      <li><span>Order prefix</span><strong>{settings.orderPrefix}-</strong></li>
    </ul>
  );
}

function Section({ section }) {
  return (
    <section className="info-section">
      <h2 id={section.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}>{section.heading}</h2>
      {section.paragraphs?.map((text) => <p key={text}>{text}</p>)}
      {section.settings && <DeliveryCosts />}
      {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
    </section>
  );
}

export default async function InfoPage({ params }) {
  const { slug } = await params;
  const page = infoBySlug(slug);
  if (!page) notFound();
  const isContact = slug === "contact";
  const path = PATH(slug);
  const shops = isContact ? publicShops() : [];

  return (
    <section className="page-shell info-page">
      <JsonLd
        data={[
          breadcrumb([{ name: "Home", href: "/" }, { name: "Help", href: "/info/faq" }, { name: page.title, href: path }]),
          ...(page.faqs ? [faqPage(page.faqs)] : []),
        ]}
      />

      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/info/faq">Help</Link><span aria-hidden="true">/</span>
        <span aria-current="page">{page.title}</span>
      </nav>

      <p className="eyebrow">SOLEIX SUPPORT</p>
      <h1 className="page-title">{page.title}</h1>
      <p className="page-intro">{page.intro}</p>

      <div className="info-layout mt-10">
        <div className="info-content">
          {page.sections?.map((section) => <Section key={section.heading} section={section} />)}

          {page.faqs && (
            <section className="info-section">
              {page.faqs.map((faq) => (
                <details key={faq.question} className="faq-item">
                  <summary>{faq.question}</summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </section>
          )}

          {page.channels && (
            <section className="info-section">
              <h2>Channels</h2>
              <ul className="channel-list">
                {page.channels.map((channel) => (
                  <li key={channel.id} id={channel.id}>
                    <Icon name={channel.id === "whatsapp" ? "phone" : channel.id === "instagram" ? "instagram" : "globe"} size={20} />
                    <div><strong>{channel.name}</strong><span className="muted">{channel.status}</span></div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {isContact && (
            <>
              <section className="info-section">
                <h2 id="form">Send a message</h2>
                <p>
                  Fill this in and it lands in the shop inbox straight away. Quote your order reference and the person
                  who packed your pair can answer without asking you for it again.
                </p>
                <ContactForm subjects={CONTACT_PAGE.subjects} />
              </section>

              <section className="info-section">
                <h2 id="shops">Or phone the shop that holds your pair</h2>
                <p>Each SOLEIX shop answers its own line. A shop floor person takes it during opening hours.</p>
                <div className="contact-shops">
                  {shops.map((shop) => (
                    <article key={shop.id} className="contact-shop glass-field">
                      <h3>{shop.name}</h3>
                      {shop.description && <p className="muted">{shop.description}</p>}
                      <p>{shop.address || "Address on request"}</p>
                      {shop.phone && (
                        <a className="text-link" href={`tel:${String(shop.phone).replace(/[^\d+]/g, "")}`}>
                          <Icon name="phone" size={16} />{shop.phone}
                        </a>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}

          {page.notice && (
            <div className="notice">
              <Icon name={page.notice.icon || "info"} size={22} />
              <p>{page.notice.text}</p>
            </div>
          )}

          {page.related?.length > 0 && (
            <nav className="info-related" aria-label="Related pages">
              {page.related.map(([label, href]) => (
                <Link key={href} href={href} className="info-related-link">
                  {label}<Icon name="arrow" size={16} />
                </Link>
              ))}
            </nav>
          )}
        </div>

        <aside className="info-side glass-field" aria-label="Help topics">
          <h2>Help centre</h2>
          <nav>
            {HELP_NAV.map(([label, href]) => (
              <Link key={href} href={href} className={href === path ? "is-current" : ""} aria-current={href === path ? "page" : undefined}>
                {label}
              </Link>
            ))}
          </nav>
          <p className="info-side-foot">
            Can't find it? <Link className="text-link" href="/info/contact">Write to the shop</Link> — {brand.email} is
            read by a person, not a bot.
          </p>
        </aside>
      </div>
    </section>
  );
}
