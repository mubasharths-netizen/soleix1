import { randomBytes } from "node:crypto";
import { googleAuthUrl, googleConfigured, makeCodeChallenge, signOauthState } from "@/lib/google.mjs";

const STATE_MAX_AGE = 600;

export async function GET(request) {
  if (!googleConfigured()) {
    return Response.redirect(new URL("/login?error=google_not_configured", request.url));
  }

  const state = randomBytes(24).toString("hex");
  const verifier = randomBytes(32).toString("hex");
  const challenge = makeCodeChallenge(verifier);
  const stateHash = signOauthState(verifier, state);
  const redirectUri = new URL("/api/auth/google/callback", request.url).toString();

  const res = Response.redirect(googleAuthUrl({ state, codeChallenge: challenge, redirectUri }));
  const opts = { httpOnly: true, sameSite: "lax", path: "/", maxAge: STATE_MAX_AGE };
  res.cookies.set("soleix_oauth_state", state, opts);
  res.cookies.set("soleix_oauth_verifier", `${verifier}.${stateHash}`, opts);
  return res;
}
