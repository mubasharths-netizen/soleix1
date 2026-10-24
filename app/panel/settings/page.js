import { readFlash } from "@/components/dashboard/Bits";
import SettingsView from "@/components/dashboard/views/SettingsView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Settings · SOLEIX" };
const NEXT = "/panel/settings";

export default async function Page({ searchParams }) {
  const user = await requireUser("shop");
  const params = await searchParams;
  return <SettingsView user={user} base="/panel" next={NEXT} flash={readFlash(params)} params={params} />;
}
