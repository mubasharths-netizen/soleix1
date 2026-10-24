import Shell from "@/components/dashboard/Shell";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Shop panel · SOLEIX" };
export const instant = false;

export default async function DashboardLayout({ children }) {
  const user = await requireUser("shop");
  return (
    <Shell base="/panel" user={user}>
      {children}
    </Shell>
  );
}
