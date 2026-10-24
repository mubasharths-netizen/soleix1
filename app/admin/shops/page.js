import { readFlash } from "@/components/dashboard/Bits";
import ShopsView from "@/components/dashboard/views/ShopsView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Assigned shops · SOLEIX" };
const NEXT = "/admin/shops";

export default async function Page({ searchParams }) {
  const user = await requireUser("admin");
  const params = await searchParams;
  return <ShopsView user={user} base="/admin" next={NEXT} flash={readFlash(params)} params={params} />;
}
