import { NextResponse } from "next/server";
import { connection } from "next/server";
import { loadCatalog, publicCategories, publicShops, siteSettings } from "@/lib/storefront.mjs";

// The storefront is statically rendered, so the browser asks for the live catalogue, prices and
// stock here. Checkout never trusts this response — it re-reads the same rows server-side.
export async function GET() {
  await connection();
  return NextResponse.json(
    { products: loadCatalog(), settings: siteSettings(), shops: publicShops(), categories: publicCategories() },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
