import { readFlash } from "@/components/dashboard/Bits";
import InventoryView from "@/components/dashboard/views/InventoryView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Inventory · SOLEIX" };
const NEXT = "/admin/inventory";

export default async function Page({ searchParams }) {
  const user = await requireUser("admin");
  const params = await searchParams;
  return <InventoryView user={user} base="/admin" next={NEXT} flash={readFlash(params)} params={params} />;
}
