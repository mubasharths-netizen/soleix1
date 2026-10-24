import { readFlash } from "@/components/dashboard/Bits";
import DashboardView from "@/components/dashboard/views/DashboardView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Shop dashboard · SOLEIX" };
const NEXT = "/panel";

export default async function Page({ searchParams }) {
  const user = await requireUser("shop");
  const params = await searchParams;
  return <DashboardView user={user} base="/panel" next={NEXT} flash={readFlash(params)} params={params} />;
}
