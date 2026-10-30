import { absolute, STOREFRONT_ROUTES } from "@/lib/site.js";
import { ALL_INFO_PAGES } from "@/lib/info-pages.js";
import { db } from "@/lib/db.mjs";

// One place that knows every URL a shopper (or a crawler) should be able to land on.
export default function sitemap() {
  const now = new Date();
  const statics = STOREFRONT_ROUTES.map(([path, , priority, changeFrequency]) => ({
    url: absolute(path),
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const help = ALL_INFO_PAGES.map((page) => ({
    url: absolute(`/info/${page.slug}`),
    lastModified: now,
    changeFrequency: "yearly",
    priority: page.slug === "contact" ? 0.7 : 0.5,
  }));

  const products = db
    .prepare(
      `SELECT p.slug, p.image, p.alt_image, p.created_at FROM products p
       JOIN shops s ON s.id = p.shop_id
       WHERE p.archived = 0 AND p.active = 1 AND s.active = 1 AND p.slug IS NOT NULL`
    )
    .all()
    .map((row) => ({
      url: absolute(`/product/${row.slug}`),
      lastModified: row.created_at ? new Date(`${String(row.created_at).replace(" ", "T")}Z`) : now,
      changeFrequency: "daily",
      priority: 0.9,
      images: [absolute(row.image), absolute(row.alt_image)].filter(Boolean),
    }));

  return [...statics, ...help, ...products];
}
