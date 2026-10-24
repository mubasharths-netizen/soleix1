import { readFlash } from "@/components/dashboard/Bits";
import CustomersView from "@/components/dashboard/views/CustomersView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Customers · SOLEIX" };
const NEXT = "/superadmin/customers";

export default async function Page({ searchParams }) {
  const user = await requireUser("superadmin");
  const params = await searchParams;
  return <CustomersView user={user} base="/superadmin" next={NEXT} flash={readFlash(params)} params={params} />;
}
