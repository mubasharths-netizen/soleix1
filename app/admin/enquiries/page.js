import { readFlash } from "@/components/dashboard/Bits";
import EnquiriesView from "@/components/dashboard/views/EnquiriesView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Inbox · SOLEIX" };
const NEXT = "/admin/enquiries";

export default async function Page({ searchParams }) {
  const user = await requireUser("admin");
  const params = await searchParams;
  return <EnquiriesView user={user} base="/admin" next={NEXT} flash={readFlash(params)} params={params} />;
}
