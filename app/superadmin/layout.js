import Shell from "@/components/dashboard/Shell";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Super Admin · SOLEIX" };
export const instant = false;

export default async function DashboardLayout({ children }) {
  const user = await requireUser("superadmin");
  return (
    <Shell base="/superadmin" user={user}>
      {children}
    </Shell>
  );
}
