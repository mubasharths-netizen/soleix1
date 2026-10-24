import { readFlash } from "@/components/dashboard/Bits";
import InventoryView from "@/components/dashboard/views/InventoryView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Inventory · SOLEIX" };
const NEXT = "/superadmin/inventory";

export default async function Page({ searchParams }) {
  const user = await requireUser("superadmin");
  const params = await searchParams;
  return <InventoryView user={user} base="/superadmin" next={NEXT} flash={readFlash(params)} params={params} />;
}
