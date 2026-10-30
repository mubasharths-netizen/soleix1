import { SITE_URL, absolute } from "@/lib/site.js";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Staff areas, the shopper's own data and anything behind a session never belong in a index.
        disallow: ["/api/", "/account/", "/admin/", "/panel/", "/superadmin/", "/checkout", "/set-password", "/uploads/"],
      },
    ],
    sitemap: absolute("/sitemap.xml"),
    host: SITE_URL,
  };
}
