import { readFlash } from "@/components/dashboard/Bits";
import CodView from "@/components/dashboard/views/CodView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Cash on delivery · SOLEIX" };
const NEXT = "/panel/cod";

export default async function Page({ searchParams }) {
  const user = await requireUser("shop");
  const params = await searchParams;
  return <CodView user={user} base="/panel" next={NEXT} flash={readFlash(params)} params={params} />;
}
