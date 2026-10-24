import { readFlash } from "@/components/dashboard/Bits";
import CodView from "@/components/dashboard/views/CodView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Cash on delivery · SOLEIX" };
const NEXT = "/superadmin/cod";

export default async function Page({ searchParams }) {
  const user = await requireUser("superadmin");
  const params = await searchParams;
  return <CodView user={user} base="/superadmin" next={NEXT} flash={readFlash(params)} params={params} />;
}
