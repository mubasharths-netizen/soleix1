import { cookies } from "next/headers";
import {
  exchangeGoogleCode,
  findStaffUserByEmail,
  googleConfigured,
  verifyGoogleIdToken,
  verifyOauthState,
} from "@/lib/google.mjs";
import { homeFor, startSession } from "@/lib/session.mjs";

const CLEAR = { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 };

async function fail(request, code, store) {
  store.set("soleix_oauth_state", "", CLEAR);
  store.set("soleix_oauth_verifier", "", CLEAR);
  return Response.redirect(new URL(`/login?error=${code}`, request.url));
}

export async function GET(request) {
  const store = await cookies();
  if (!googleConfigured()) return fail(request, "google_not_configured", store);

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");
  const verifierCookie = store.get("soleix_oauth_verifier")?.value;

  store.set("soleix_oauth_state", "", CLEAR);
  store.set("soleix_oauth_verifier", "", CLEAR);

  if (oauthError) return Response.redirect(new URL("/login?error=google_cancelled", request.url));
  if (!code || !state || !verifierCookie) return Response.redirect(new URL("/login?error=google_failed", request.url));
  if (store.get("soleix_oauth_state")?.value !== state || !verifyOauthState(verifierCookie, state)) {
    return Response.redirect(new URL("/login?error=google_failed", request.url));
  }

  const [verifier] = verifierCookie.split(".");
  let tokens;
  let identity;
  try {
    const redirectUri = new URL("/api/auth/google/callback", request.url).toString();
    tokens = await exchangeGoogleCode({ code, codeVerifier: verifier, redirectUri });
    if (!tokens.id_token) throw new Error("Google did not return an ID token.");
    identity = await verifyGoogleIdToken(tokens.id_token);
  } catch {
    return Response.redirect(new URL("/login?error=google_failed", request.url));
  }

  const staff = findStaffUserByEmail(identity.email);
  if (!staff) return Response.redirect(new URL("/login?error=google_no_account", request.url));

  await startSession(staff.id);
  return Response.redirect(new URL(homeFor(staff.role), request.url));
}
