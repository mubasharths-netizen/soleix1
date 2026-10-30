import { readFlash } from "@/components/dashboard/Bits";
import ReviewsView from "@/components/dashboard/views/ReviewsView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Reviews · SOLEIX" };
const NEXT = "/superadmin/reviews";

export default async function Page({ searchParams }) {
  const user = await requireUser("superadmin");
  const params = await searchParams;
  return <ReviewsView user={user} base="/superadmin" next={NEXT} flash={readFlash(params)} params={params} />;
}
