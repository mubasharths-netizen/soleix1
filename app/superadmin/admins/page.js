import { readFlash } from "@/components/dashboard/Bits";
import AdminsView from "@/components/dashboard/views/AdminsView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Admin management · SOLEIX" };
const NEXT = "/superadmin/admins";

export default async function Page({ searchParams }) {
  const user = await requireUser("superadmin");
  const params = await searchParams;
  return <AdminsView user={user} base="/superadmin" next={NEXT} flash={readFlash(params)} params={params} />;
}
