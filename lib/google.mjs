import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "./db.mjs";
import { normalizeEmail } from "./password.mjs";

const GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";

const base64url = (buf) => buf.toString("base64url");
const decodeSegment = (segment) => JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleAuthUrl({ state, codeChallenge, redirectUri }) {
  const query = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_BASE}?${query}`;
}

async function fetchKeys() {
  const res = await fetch(GOOGLE_CERTS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Could not reach Google's signing keys.");
  return res.json();
}

function cryptoKeyFor(pem) {
  return crypto.subtle.importKey(
    "jwk",
    { kty: "RSA", n: base64urlToB64(pem.n), e: base64urlToB64(pem.e), alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

const base64urlToB64 = (value) => value.replaceAll("-", "+").replaceAll("_", "/");

// Verifies a Google-signed ID token: RS256 signature, iss, aud, exp, and a verified email.
export async function verifyGoogleIdToken(idToken) {
  const [headerB64, payloadB64, sigB64] = idToken.split(".");
  if (!headerB64 || !payloadB64 || !sigB64) throw new Error("Malformed ID token.");
  const header = decodeSegment(headerB64);
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported ID token algorithm.");

  const keys = await fetchKeys();
  const jwk = keys.keys.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Google signing key not found.");

  const key = await cryptoKeyFor(jwk);
  const signature = Uint8Array.from(Buffer.from(sigB64, "base64url"));
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, new TextEncoder().encode(`${headerB64}.${payloadB64}`));
  if (!valid) throw new Error("ID token signature is invalid.");

  const payload = decodeSegment(payloadB64);
  const now = Math.floor(Date.now() / 1000);
  if (!["https://accounts.google.com", "accounts.google.com"].includes(payload.iss)) throw new Error("ID token issuer is unexpected.");
  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error("ID token audience is unexpected.");
  if (!payload.exp || payload.exp < now) throw new Error("ID token has expired.");
  if (payload.email_verified !== true || !payload.email) throw new Error("Google email is not verified.");

  return { email: normalizeEmail(payload.email), name: payload.name || payload.email, picture: payload.picture || "" };
}

async function postForm(url, form) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form).toString(),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error_description || json.error || `Google token exchange failed (${res.status}).`);
  return json;
}

export function exchangeGoogleCode({ code, codeVerifier, redirectUri }) {
  return postForm(GOOGLE_TOKEN_URL, {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    code_verifier: codeVerifier,
  });
}

export async function fetchGoogleUser(accessToken) {
  const res = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error_description || "Could not read the Google account profile.");
  if (json.email_verified !== true || !json.email) throw new Error("Google email is not verified.");
  return { email: normalizeEmail(json.email), name: json.name || json.email };
}

// Google identities never grant dashboard access on their own: the verified email must
// already belong to an active staff user, otherwise the login is refused.
export function findStaffUserByEmail(email) {
  const row = db
    .prepare("SELECT id, email, name, role, active FROM users WHERE email = ?")
    .get(normalizeEmail(email));
  if (!row || !row.active) return null;
  return row;
}

export function verifyOauthState(cookieValue, providedState) {
  if (!cookieValue || !providedState) return false;
  const [verifier, stateHash] = String(cookieValue).split(".");
  if (!verifier || !stateHash) return false;
  const expected = createHmac("sha256", verifier).update(providedState).digest("base64url");
  const a = Buffer.from(stateHash);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signOauthState(secret, state) {
  return createHmac("sha256", secret).update(state).digest("base64url");
}

export function makeCodeChallenge(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}
