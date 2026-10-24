import { readFlash } from "@/components/dashboard/Bits";
import ReportsView from "@/components/dashboard/views/ReportsView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Reports · SOLEIX" };
const NEXT = "/superadmin/reports";

export default async function Page({ searchParams }) {
  const user = await requireUser("superadmin");
  const params = await searchParams;
  return <ReportsView user={user} base="/superadmin" next={NEXT} flash={readFlash(params)} params={params} />;
}
