import { readFlash } from "@/components/dashboard/Bits";
import SettingsView from "@/components/dashboard/views/SettingsView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Settings · SOLEIX" };
const NEXT = "/superadmin/settings";

export default async function Page({ searchParams }) {
  const user = await requireUser("superadmin");
  const params = await searchParams;
  return <SettingsView user={user} base="/superadmin" next={NEXT} flash={readFlash(params)} params={params} />;
}
