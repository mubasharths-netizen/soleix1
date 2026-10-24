import { readFlash } from "@/components/dashboard/Bits";
import ShopsView from "@/components/dashboard/views/ShopsView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Shop management · SOLEIX" };
const NEXT = "/superadmin/shops";

export default async function Page({ searchParams }) {
  const user = await requireUser("superadmin");
  const params = await searchParams;
  return <ShopsView user={user} base="/superadmin" next={NEXT} flash={readFlash(params)} params={params} />;
}
