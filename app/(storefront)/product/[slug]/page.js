import { notFound } from "next/navigation";
import JsonLd, { breadcrumb, productSchema } from "@/components/JsonLd";
import ProductDetail from "@/components/ProductDetail";
import { getCatalogProduct, loadCatalog } from "@/lib/storefront.mjs";
import { listProductReviews, productRating } from "@/lib/reviews.mjs";
import { absolute } from "@/lib/site.js";

export function generateStaticParams() {
  return loadCatalog(true).map((product) => ({ slug: product.id }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = getCatalogProduct(slug);
  if (!product) return {};
  const rating = productRating(product.dbId);

  return {
    title: rating.count ? `${product.name} (${rating.average.toFixed(1)})` : product.name,
    description: `${product.description} Explore ${product.audience.toLowerCase()}’s ${product.category.toLowerCase()} shoes at SOLEIX, with live stock and Cash on Delivery across Pakistan.`,
    alternates: { canonical: `/product/${product.id}` },
    openGraph: {
      type: "article",
      title: `${product.name} | SOLEIX`,
      description: product.description,
      url: absolute(`/product/${product.id}`),
    },
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = getCatalogProduct(slug);
  if (!product) notFound();

  const relatedProducts = loadCatalog()
    .filter((item) => item.id !== product.id)
    .sort((a, b) => {
      const relevance = (item) => Number(item.category === product.category) * 2 + Number(item.audience === product.audience);
      return relevance(b) - relevance(a) || b.dbId - a.dbId;
    })
    .slice(0, 4);

  const rating = productRating(product.dbId);

  return <>
    <JsonLd data={[
      breadcrumb([
        { name: "Home", href: "/" },
        { name: "Shop", href: "/shop" },
        { name: product.audience, href: `/shop?audience=${encodeURIComponent(product.audience)}` },
        { name: product.name, href: `/product/${product.id}` },
      ]),
      productSchema({ product, rating }),
    ]} />
    <ProductDetail key={product.id} product={product} relatedProducts={relatedProducts} rating={rating} reviews={listProductReviews(product.dbId, { limit: 20 })} />
  </>;
}
