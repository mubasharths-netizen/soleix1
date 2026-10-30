import { brand } from "@/lib/site.js";

export default function manifest() {
  return {
    id: "/",
    name: `${brand.name} — ${brand.tagline}`,
    short_name: brand.name,
    description: brand.description,
    lang: "en-PK",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: brand.backgroundColor,
    theme_color: brand.themeColor,
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Shop the collection", url: "/shop" },
      { name: "Your bag", url: "/cart" },
      { name: "Favourites", url: "/wishlist" },
      { name: "Track an order", url: "/track" },
    ],
  };
}
