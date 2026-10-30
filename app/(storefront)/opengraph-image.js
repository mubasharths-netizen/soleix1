import { OG_CONTENT_TYPE, OG_SIZE, ogResponse } from "@/lib/og.js";
import { brand } from "@/lib/site.js";

export const alt = "SOLEIX — premium sneakers, Cash on Delivery across Pakistan";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpengraphImage() {
  return ogResponse({
    eyebrow: "Vol. 01",
    headline: "Find your next move.",
    detail: "Live per-shop stock, honest pricing and Cash on Delivery across Pakistan.",
    footnote: brand.description.slice(0, 64),
  });
}
