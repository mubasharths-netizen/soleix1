import { getApp, getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Client-side SDK: browser only, and only the public config that Firebase exposes to the web.
// The Admin SDK credentials stay in lib/firebase/admin.mjs.
export const firebaseEnabled = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

function instance() {
  if (!firebaseEnabled) throw new Error("Firebase is not configured.");
  const app = getApps().length ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  void setPersistence(auth, browserLocalPersistence).catch(() => {});
  return auth;
}

export async function finishSignUp({ email, password, fullName }) {
  const credential = await createUserWithEmailAndPassword(instance(), email, password);
  await updateProfile(credential.user, { displayName: fullName });
  await credential.user.reload();
  return credential.user.getIdToken();
}

export async function signInWithPassword({ email, password }) {
  const credential = await signInWithEmailAndPassword(instance(), email, password);
  return credential.user.getIdToken();
}

// Popup first; full redirect when the browser blocks popups (mobile, private windows).
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    const credential = await signInWithPopup(instance(), provider);
    return { user: credential.user, method: "popup" };
  } catch (error) {
    if (["auth/popup-blocked", "auth/operation-not-supported-in-environment", "auth/cancelled-popup-request"].includes(error.code)) {
      await signInWithRedirect(instance(), provider);
      return { user: null, method: "redirect" };
    }
    throw error;
  }
}

export async function completeRedirectSignIn() {
  if (!firebaseEnabled || typeof window === "undefined") return null;
  const result = await getRedirectResult(instance()).catch((error) => {
    if (["auth/cancelled-popup-request", "auth/user-cancelled", "auth/popup-closed-by-user"].includes(error.code)) return null;
    throw error;
  });
  return result?.user ?? null;
}

export async function sendResetLink(email) {
  await sendPasswordResetEmail(instance(), email);
}

export async function clientSignOut() {
  if (!firebaseEnabled) return;
  await signOut(instance()).catch(() => {});
}
