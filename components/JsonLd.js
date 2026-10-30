// Structured data for search engines and AI crawlers. Values come from the database or from
// product content, so every payload escapes "<" before it reaches a raw <script> tag.
import { absolute } from "@/lib/site.js";

const esc = (value) => JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028|\u2029/g, "");

export default function JsonLd({ data }) {
  const graph = Array.isArray(data) ? data : [data];
  return graph.map((entry, index) => (
    <script
      key={index}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: esc({ "@context": "https://schema.org", ...entry }) }}
    />
  ));
}

export const organization = () => ({
  "@type": "Organization",
  "@id": `${absolute("/")}#organization`,
  name: "SOLEIX",
  url: absolute("/"),
  logo: absolute("/icon.svg"),
  description: "Independent concept sneaker storefront with live per-shop stock and Cash on Delivery across Pakistan.",
  currenciesAccepted: "PKR",
  paymentAccepted: "Cash on Delivery",
});

export const webSite = () => ({
  "@type": "WebSite",
  "@id": `${absolute("/")}#website`,
  url: absolute("/"),
  name: "SOLEIX",
  inLanguage: "en-PK",
  publisher: { "@id": `${absolute("/")}#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${absolute("/shop")}?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
});

export const breadcrumb = (trail) => ({
  "@type": "BreadcrumbList",
  itemListElement: trail.filter((item) => item.href).map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: absolute(item.href),
  })),
});

export const collectionPage = ({ name, description, path, products }) => ({
  "@type": "CollectionPage",
  name,
  description,
  url: absolute(path),
  mainEntity: {
    "@type": "ItemList",
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absolute(`/product/${product.id}`),
      name: product.name,
      image: absolute(product.image),
    })),
  },
});

export const faqPage = (faqs) => ({
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
});

export const productSchema = ({ product, rating }) => ({
  "@type": "Product",
  name: product.name,
  description: product.description,
  sku: String(product.id).toUpperCase(),
  url: absolute(`/product/${product.id}`),
  image: [...new Set([product.image, product.altImage].filter(Boolean))].map(absolute),
  category: product.category,
  brand: { "@type": "Brand", name: "SOLEIX" },
  offers: {
    "@type": "Offer",
    priceCurrency: "PKR",
    price: product.price,
    url: absolute(`/product/${product.id}`),
    availability: product.totalStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
  },
  ...(rating && rating.count
    ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: rating.average,
          reviewCount: rating.count,
          bestRating: 5,
          worstRating: 1,
        },
        review: rating.recent.slice(0, 5).map((review) => ({
          "@type": "Review",
          author: { "@type": "Person", name: review.author },
          datePublished: String(review.created_at).slice(0, 10),
          reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5, worstRating: 1 },
          name: review.title || undefined,
          reviewBody: review.body,
        })),
      }
    : {}),
});
