import { readFlash } from "@/components/dashboard/Bits";
import ActivityView from "@/components/dashboard/views/ActivityView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Activity log · SOLEIX" };
const NEXT = "/superadmin/activity";

export default async function Page({ searchParams }) {
  const user = await requireUser("superadmin");
  const params = await searchParams;
  return <ActivityView user={user} base="/superadmin" next={NEXT} flash={readFlash(params)} params={params} />;
}
