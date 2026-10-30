import { notFound } from "next/navigation";
import { OG_CONTENT_TYPE, OG_SIZE, ogResponse } from "@/lib/og.js";
import { formatPrice } from "@/lib/catalog.mjs";
import { db } from "@/lib/db.mjs";

export const alt = "SOLEIX sneaker product card";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Read straight from the database: React's cache() has no request scope in a metadata route.
const row = (slug) =>
  db
    .prepare(
      `SELECT p.name, p.description, p.price, p.audience, p.category_id,
              (SELECT COALESCE(SUM(qty), 0) FROM inventory i WHERE i.product_id = p.id) AS stock,
              c.name AS category
       FROM products p JOIN shops s ON s.id = p.shop_id LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.slug = ? AND p.archived = 0 AND p.active = 1 AND s.active = 1`
    )
    .get(String(slug));

export function generateStaticParams() {
  return db.prepare("SELECT slug FROM products WHERE slug IS NOT NULL AND archived = 0 AND active = 1").all();
}

export default async function OpengraphImage({ params }) {
  const { slug } = await params;
  const product = row(slug);
  if (!product) notFound();

  return ogResponse({
    eyebrow: product.stock ? `${product.audience} · ${product.category || "Sneakers"}` : "Sold out",
    headline: product.name,
    detail: String(product.description || "").slice(0, 118),
    price: formatPrice(product.price),
    footnote: "Cash on Delivery · Live stock",
  });
}
