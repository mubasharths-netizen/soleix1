import { readFlash } from "@/components/dashboard/Bits";
import ReviewsView from "@/components/dashboard/views/ReviewsView";
import { requireUser } from "@/lib/session.mjs";

export const metadata = { title: "Reviews · SOLEIX" };
const NEXT = "/admin/reviews";

export default async function Page({ searchParams }) {
  const user = await requireUser("admin");
  const params = await searchParams;
  return <ReviewsView user={user} base="/admin" next={NEXT} flash={readFlash(params)} params={params} />;
}
