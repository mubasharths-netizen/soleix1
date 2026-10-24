import { readFlash } from "@/components/dashboard/Bits";
import DeliveryView from "@/components/dashboard/views/DeliveryView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Delivery tasks · SOLEIX" };
const NEXT = "/superadmin/delivery";

export default async function Page({ searchParams }) {
  const user = await requireUser("superadmin");
  const params = await searchParams;
  return <DeliveryView user={user} base="/superadmin" next={NEXT} flash={readFlash(params)} params={params} />;
}
