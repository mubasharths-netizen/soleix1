import { readFlash } from "@/components/dashboard/Bits";
import DashboardView from "@/components/dashboard/views/DashboardView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Admin dashboard · SOLEIX" };
const NEXT = "/admin";

export default async function Page({ searchParams }) {
  const user = await requireUser("admin");
  const params = await searchParams;
  return <DashboardView user={user} base="/admin" next={NEXT} flash={readFlash(params)} params={params} />;
}
