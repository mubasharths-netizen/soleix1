import { readFlash } from "@/components/dashboard/Bits";
import ProductsView from "@/components/dashboard/views/ProductsView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Products · SOLEIX" };
const NEXT = "/superadmin/products";

export default async function Page({ searchParams }) {
  const user = await requireUser("superadmin");
  const params = await searchParams;
  return <ProductsView user={user} base="/superadmin" next={NEXT} flash={readFlash(params)} params={params} />;
}
