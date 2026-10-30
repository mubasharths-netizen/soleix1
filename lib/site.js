// Everything SOLEIX publishes about itself lives here so metadata, the sitemap, the web
// manifest and the structured data can never disagree with each other.

export const SITE_URL = String(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

export const brand = {
  name: "SOLEIX",
  legalName: "SOLEIX",
  tagline: "Find Your Next Move",
  title: "SOLEIX — Find Your Next Move",
  description:
    "A fresh perspective on everyday movement. Explore the SOLEIX collection of premium running, trail and lifestyle sneakers, with live stock and Cash on Delivery across Pakistan. Prices in PKR.",
  locale: "en_PK",
  currency: "PKR",
  email: "hello@soleix.test",
  themeColor: "#111110",
  backgroundColor: "#f3f2ef",
  accentColor: "#c2451d",
};

export const absolute = (path = "/") => `${SITE_URL}${String(path).startsWith("/") ? String(path) : `/${path}`}`;

// Routes a crawler should never see, and routes the storefront links to.
export const STOREFRONT_ROUTES = [
  ["/", "Home", 1, "daily"],
  ["/shop", "Shop all sneakers", 0.95, "daily"],
  ["/wishlist", "Favourites", 0.5, "weekly"],
  ["/cart", "Shopping bag", 0.4, "weekly"],
  ["/checkout", "Checkout", 0.3, "monthly"],
  ["/track", "Track an order", 0.55, "monthly"],
  ["/stores", "Store locations", 0.6, "monthly"],
  ["/login", "Log in", 0.3, "monthly"],
  ["/signup", "Create an account", 0.35, "monthly"],
];
