import { readFlash } from "@/components/dashboard/Bits";
import OrdersView from "@/components/dashboard/views/OrdersView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Orders · SOLEIX" };
const NEXT = "/superadmin/orders";

export default async function Page({ searchParams }) {
  const user = await requireUser("superadmin");
  const params = await searchParams;
  return <OrdersView user={user} base="/superadmin" next={NEXT} flash={readFlash(params)} params={params} />;
}
