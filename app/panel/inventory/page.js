import { readFlash } from "@/components/dashboard/Bits";
import InventoryView from "@/components/dashboard/views/InventoryView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Inventory · SOLEIX" };
const NEXT = "/panel/inventory";

export default async function Page({ searchParams }) {
  const user = await requireUser("shop");
  const params = await searchParams;
  return <InventoryView user={user} base="/panel" next={NEXT} flash={readFlash(params)} params={params} />;
}
