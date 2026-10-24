import { readFlash } from "@/components/dashboard/Bits";
import DashboardView from "@/components/dashboard/views/DashboardView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Super Admin dashboard · SOLEIX" };
const NEXT = "/superadmin";

export default async function Page({ searchParams }) {
  const user = await requireUser("superadmin");
  const params = await searchParams;
  return <DashboardView user={user} base="/superadmin" next={NEXT} flash={readFlash(params)} params={params} />;
}
