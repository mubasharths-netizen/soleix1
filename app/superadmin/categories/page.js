import { readFlash } from "@/components/dashboard/Bits";
import CategoriesView from "@/components/dashboard/views/CategoriesView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Categories · SOLEIX" };
const NEXT = "/superadmin/categories";

export default async function Page({ searchParams }) {
  const user = await requireUser("superadmin");
  const params = await searchParams;
  return <CategoriesView user={user} base="/superadmin" next={NEXT} flash={readFlash(params)} params={params} />;
}
