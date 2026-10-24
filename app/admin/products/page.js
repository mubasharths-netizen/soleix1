import { readFlash } from "@/components/dashboard/Bits";
import ProductsView from "@/components/dashboard/views/ProductsView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Products · SOLEIX" };
const NEXT = "/admin/products";

export default async function Page({ searchParams }) {
  const user = await requireUser("admin");
  const params = await searchParams;
  return <ProductsView user={user} base="/admin" next={NEXT} flash={readFlash(params)} params={params} />;
}
