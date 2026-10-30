// firebase-admin is CommonJS that require()s the ESM-only `jose`, and a serverless Node runtime
// can refuse that combination with ERR_REQUIRE_ESM. Loading it only when Firebase credentials
// exist — and never at module scope — keeps /login and /signup rendering on local accounts.
let sdk;
let sdkError = "";

async function loadSdk() {
  if (sdk) return sdk;
  if (sdkError) return null;
  try {
    const [app, auth, firestore] = await Promise.all([
      import("firebase-admin/app"),
      import("firebase-admin/auth"),
      import("firebase-admin/firestore"),
    ]);
    sdk = {
      getApps: app.getApps,
      initializeApp: app.initializeApp,
      cert: app.cert,
      getAuth: auth.getAuth,
      getFirestore: firestore.getFirestore,
      FieldValue: firestore.FieldValue,
    };
  } catch (error) {
    sdkError = String(error?.message).split("\n")[0];
    console.error("Firebase Admin cannot load on this server:", sdkError);
    return null;
  }
  return sdk;
}

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
  const account = readServiceAccount();
  return Boolean(account?.projectId && account.clientEmail && account.privateKey);
}

export function firebaseAdminError() {
  return sdkError;
}

// Returns the initialised Admin SDK, or null when credentials are missing or the package
// cannot load. Callers that already checked firebaseAdminEnabled() get null only for the
// broken-package case, which they surface as "try email and password".
export async function firebaseAdmin() {
  if (!firebaseAdminEnabled()) return null;
  const loaded = await loadSdk();
  if (!loaded) return null;
  if (!loaded.getApps().length) {
    const account = readServiceAccount();
    try {
      loaded.initializeApp({
        credential: loaded.cert({
          projectId: account.projectId,
          clientEmail: account.clientEmail,
          privateKey: account.privateKey,
        }),
        projectId: account.projectId,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
      });
    } catch (error) {
      console.error("Firebase Admin init failed:", String(error?.message).split("\n")[0]);
      return null;
    }
  }
  return loaded;
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
  const loaded = await firebaseAdmin();
  if (!loaded) throw new Error("Firebase Admin is not configured on this server.");
  const decoded = await loaded.getAuth().verifyIdToken(idToken, true);
  return normalise(decoded);
}

export async function issueSessionCookie(idToken) {
  const loaded = await firebaseAdmin();
  if (!loaded) throw new Error("Firebase Admin is not configured on this server.");
  return loaded.getAuth().createSessionCookie(idToken, { expiresIn: FIVE_DAYS_MS });
}

export async function readSessionCookie(value) {
  if (!value) return null;
  const loaded = await firebaseAdmin();
  if (!loaded) return null;
  try {
    return normalise(await loaded.getAuth().verifySessionCookie(value, false));
  } catch {
    return null;
  }
}

export async function profileStore() {
  const loaded = await firebaseAdmin();
  return loaded ? loaded.getFirestore() : null;
}

// Firestore holds the customer profile (name, provider, timestamps). Staff accounts stay
// in SQLite with their roles — neither store duplicates the other.
export async function ensureProfile(uid, { fullName, email, picture, provider }) {
  const loaded = await firebaseAdmin();
  if (!loaded) return null;
  const db = loaded.getFirestore();
  const ref = db.collection("profiles").doc(uid);
  const snapshot = await ref.get();
  const name = fullName || "";
  if (!snapshot.exists) {
    const doc = { uid, email: email || "", fullName: name, picture: picture || "", provider: provider || "password", createdAt: loaded.FieldValue.serverTimestamp() };
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
  if (!uid) return null;
  const loaded = await firebaseAdmin();
  if (!loaded) return null;
  const snapshot = await loaded.getFirestore().collection("profiles").doc(uid).get();
  return snapshot.exists ? { uid, ...snapshot.data() } : null;
}
