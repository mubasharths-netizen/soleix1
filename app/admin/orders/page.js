import { readFlash } from "@/components/dashboard/Bits";
import OrdersView from "@/components/dashboard/views/OrdersView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Orders · SOLEIX" };
const NEXT = "/admin/orders";

export default async function Page({ searchParams }) {
  const user = await requireUser("admin");
  const params = await searchParams;
  return <OrdersView user={user} base="/admin" next={NEXT} flash={readFlash(params)} params={params} />;
}
