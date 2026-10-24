import { notFound } from "next/navigation";
import ProductDetail from "@/components/ProductDetail";
import { getCatalogProduct, loadCatalog } from "@/lib/storefront.mjs";

export function generateStaticParams() {
  return loadCatalog(true).map((product) => ({ slug: product.id }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = getCatalogProduct(slug);
  if (!product) notFound();

  return {
    title: product.name,
    description: `${product.description} Explore ${product.audience.toLowerCase()}’s ${product.category.toLowerCase()} shoes at SOLEIX, with live stock and delivery across Pakistan.`,
    openGraph: {
      title: `${product.name} | SOLEIX`,
      description: product.description,
      images: [{ url: product.image, width: 900, height: 900, alt: `${product.name} in ${product.colors[0]}` }],
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

  return <ProductDetail key={product.id} product={product} relatedProducts={relatedProducts} />;
}
