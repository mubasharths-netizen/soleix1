import { readFlash } from "@/components/dashboard/Bits";
import EnquiriesView from "@/components/dashboard/views/EnquiriesView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Inbox · SOLEIX" };
const NEXT = "/superadmin/enquiries";

export default async function Page({ searchParams }) {
  const user = await requireUser("superadmin");
  const params = await searchParams;
  return <EnquiriesView user={user} base="/superadmin" next={NEXT} flash={readFlash(params)} params={params} />;
}
