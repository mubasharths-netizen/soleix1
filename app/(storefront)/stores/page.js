import Link from "next/link";
import Icon from "@/components/Icon";
import JsonLd, { breadcrumb } from "@/components/JsonLd";
import { loadCatalog, publicShops } from "@/lib/storefront.mjs";

export const instant = false;

export const metadata = {
  title: "Store locations",
  description: "Every SOLEIX shop in Pakistan, what each one holds in stock and how to phone the counter directly.",
  alternates: { canonical: "/stores" },
};

// Stock is grouped from the same catalogue the product pages read, so a shop card can never claim
// a pair it does not actually list.
function shopsWithStock() {
  const products = loadCatalog(false);
  return publicShops().map((shop) => {
    const lines = products.filter((product) => product.shopId === shop.id);
    return {
      ...shop,
      pairs: lines.length,
      inStock: lines.reduce((sum, product) => sum + product.totalStock, 0),
      sample: lines[0],
    };
  });
}

export default function StoresPage() {
  const shops = shopsWithStock();

  return (
    <section className="page-shell stores-page">
      <JsonLd
        data={[
          breadcrumb([{ name: "Home", href: "/" }, { name: "Store locations", href: "/stores" }]),
          {
            "@type": "ItemList",
            itemListElement: shops.map((shop, index) => ({
              "@type": "ListItem",
              position: index + 1,
              item: {
                "@type": "Store",
                name: shop.name,
                description: shop.description || undefined,
                telephone: shop.phone || undefined,
                address: shop.address ? { "@type": "PostalAddress", streetAddress: shop.address, addressCountry: "PK" } : undefined,
              },
            })),
          },
        ]}
      />

      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Store locations</span>
      </nav>

      <p className="eyebrow">COME AND TRY THEM ON</p>
      <h1 className="page-title">THE SHOPS.</h1>
      <p className="page-intro">
        SOLEIX runs as a small chain rather than one anonymous warehouse. Each shop holds its own stock and answers its
        own line — which is why an order always says who is packing it.
      </p>

      {shops.length === 0 ? (
        <div className="empty-state">
          <Icon name="store" size={30} />
          <h2>No shop is open right now.</h2>
          <p className="muted">When a location is switched on in the dashboard it appears here with its stock.</p>
        </div>
      ) : (
        <div className="stores-grid">
          {shops.map((shop) => (
            <article key={shop.id} className="store-card glass-field">
              <div className="store-card-head">
                <h2>{shop.name}</h2>
                {shop.phone && <a className="store-phone" href={`tel:${String(shop.phone).replace(/[^\d+]/g, "")}`}><Icon name="phone" size={15} />{shop.phone}</a>}
              </div>
              {shop.description && <p className="store-desc">{shop.description}</p>}
              <p className="store-address"><Icon name="pin" size={17} />{shop.address || "Address at the counter"}</p>
              <dl className="store-facts">
                <div><dt>Pairs on the shelves</dt><dd>{shop.pairs}</dd></div>
                <div><dt>Pairs ready to go</dt><dd>{shop.inStock}</dd></div>
              </dl>
              <Link className="button button-outline" href={`/shop?shop=${shop.id}`}>
                Shop {shop.name}<Icon name="arrow" size={17} />
              </Link>
            </article>
          ))}
        </div>
      )}

      <div className="notice stores-foot">
        <Icon name="truck" size={22} />
        <p>
          Click and collect is not wired up in this build: every order is delivered to your door for Cash on Delivery.
          Visit a shop to try sizes, then order from wherever is convenient. Need something specific?{" "}
          <Link className="text-link" href="/info/contact">Ask the shop</Link>.
        </p>
      </div>
    </section>
  );
}
