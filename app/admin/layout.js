import Shell from "@/components/dashboard/Shell";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Admin · SOLEIX" };
export const instant = false;

export default async function DashboardLayout({ children }) {
  const user = await requireUser("admin");
  return (
    <Shell base="/admin" user={user}>
      {children}
    </Shell>
  );
}
