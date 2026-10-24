import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import adminCredentials from "firebase-admin";

const { credential } = adminCredentials;

// Service account JSON is preferred; individual fields work too. Values starting with
// "-----BEGIN" are read as a PEM key, everything else as base64 — never logged, never
// bundled to the client.
function readServiceAccount() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (inline) {
    const text = inline.trim();
    const json = text.startsWith("{") ? text : Buffer.from(text, "base64").toString("utf8");
    const parsed = JSON.parse(json);
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: (parsed.private_key || "").replace(/\\n/g, "\n"),
    };
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  if (projectId && clientEmail && rawKey) {
    return { projectId, clientEmail, privateKey: rawKey.trim().replace(/\\n/g, "\n") };
  }
  return null;
}

export function firebaseAdminEnabled() {
  if (!getApps().length) {
    const account = readServiceAccount();
    if (!account?.projectId || !account.clientEmail || !account.privateKey) return false;
    try {
      initializeApp({
        credential: credential.cert({
          projectId: account.projectId,
          clientEmail: account.clientEmail,
          privateKey: account.privateKey,
        }),
        projectId: account.projectId,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
      });
    } catch {
      return false;
    }
  }
  return true;
}

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
export const SESSION_COOKIE = "soleix_firebase";
export const SESSION_MAX_AGE = 5 * 24 * 60 * 60;

export function cookieOptions(maxAge = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

function normalise(decoded) {
  return {
    uid: decoded.uid,
    email: (decoded.email || "").toLowerCase(),
    name: decoded.name || decoded.nickname || decoded.email || "",
    picture: decoded.picture || "",
    provider: decoded.firebase?.sign_in_provider || decoded.provider_id || "password",
    emailVerified: Boolean(decoded.email_verified),
  };
}

// Verifies the Firebase ID token with Google's signing keys before anything is trusted.
export async function readIdToken(idToken) {
  if (!firebaseAdminEnabled()) throw new Error("Firebase Admin is not configured on this server.");
  const decoded = await getAuth().verifyIdToken(idToken, true);
  return normalise(decoded);
}

export async function issueSessionCookie(idToken) {
  if (!firebaseAdminEnabled()) throw new Error("Firebase Admin is not configured on this server.");
  return getAuth().createSessionCookie(idToken, { expiresIn: FIVE_DAYS_MS });
}

export async function readSessionCookie(value) {
  if (!value || !firebaseAdminEnabled()) return null;
  try {
    return normalise(await getAuth().verifySessionCookie(value, false));
  } catch {
    return null;
  }
}

export function profileStore() {
  return getFirestore();
}

// Firestore holds the customer profile (name, provider, timestamps). Staff accounts stay
// in SQLite with their roles — neither store duplicates the other.
export async function ensureProfile(uid, { fullName, email, picture, provider }) {
  if (!firebaseAdminEnabled()) return null;
  const ref = getFirestore().collection("profiles").doc(uid);
  const snapshot = await ref.get();
  const name = fullName || "";
  if (!snapshot.exists) {
    const doc = { uid, email: email || "", fullName: name, picture: picture || "", provider: provider || "password", createdAt: FieldValue.serverTimestamp() };
    await ref.set(doc);
    return doc;
  }
  const current = snapshot.data() || {};
  const patch = {};
  if (name && current.fullName !== name) patch.fullName = name;
  if (picture && current.picture !== picture) patch.picture = picture;
  if (provider && current.provider !== provider) patch.provider = provider;
  if (Object.keys(patch).length) await ref.set(patch, { merge: true });
  return { ...current, ...patch };
}

export async function readProfile(uid) {
  if (!firebaseAdminEnabled() || !uid) return null;
  const snapshot = await getFirestore().collection("profiles").doc(uid).get();
  return snapshot.exists ? { uid, ...snapshot.data() } : null;
}
