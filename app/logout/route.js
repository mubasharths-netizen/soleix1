import { endSession } from "@/lib/session.mjs";

export async function POST(request) {
  await endSession();
  return Response.redirect(new URL("/login?signedout=1", request.url), 303);
}
