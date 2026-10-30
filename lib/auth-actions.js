"use server";

import { redirect } from "next/navigation";
import { firebaseAdminEnabled, ensureProfile } from "@/lib/firebase/admin.mjs";
import { normalizeEmail } from "@/lib/password.mjs";
import {
  adoptFirebaseSession,
  authenticate,
  authenticateCustomer,
  endSession,
  homeFor,
  registerCustomer,
  safeNext,
  staffByEmail,
  startCustomerSession,
  startSession,
} from "@/lib/session.mjs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Staff accounts live in SQLite with scrypt-hashed passwords and roles, and so do the shoppers
// who registered on this site. This is the first path tried, so a sign-in never depends on the
// Firebase project being reachable.
export async function loginAction(_previous, formData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) return { error: "Enter both your email and password." };

  const user = authenticate(email, password);
  if (user) {
    await startSession(user.id);
    redirect(next || homeFor(user.role));
  }

  const shopper = authenticateCustomer(email, password);
  if (shopper) {
    await startCustomerSession(shopper.uid);
    redirect(next || "/account");
  }

  return { error: "Those credentials do not match our records." };
}

// Anyone can open a customer account here without Firebase: the row and its scrypt password
// live in this site's own database. Google and Firebase sign-ins keep using firebaseAuthAction.
export async function signUpAction(_previous, formData) {
  const email = normalizeEmail(String(formData.get("email") || ""));
  const fullName = String(formData.get("fullName") || "").trim().slice(0, 120);
  const password = String(formData.get("password") || "");
  const next = safeNext(formData.get("next"));

  if (fullName.length < 2) return { error: "Enter your full name." };
  if (!EMAIL_PATTERN.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Use a password of at least 8 characters." };
  if (password !== String(formData.get("confirm") || "")) return { error: "The two passwords do not match." };

  let uid;
  try {
    uid = registerCustomer(email, fullName, password);
  } catch (error) {
    return { error: error.message };
  }

  await startCustomerSession(uid);
  redirect(next || "/account");
}

// Firebase is the customer identity provider: the ID token is verified on the server with
// the Admin SDK, then a Firebase session cookie is issued. When the same email belongs to a
// staff account, the role session is started too so the dashboards keep working.
export async function firebaseAuthAction({ idToken, next, fullName } = {}) {
  const target = safeNext(next);
  if (typeof idToken !== "string" || !idToken) return { error: "Sign-in failed. Please try again." };
  if (!firebaseAdminEnabled()) {
    return { error: "Your Firebase sign-in worked, but this site cannot open a session because the server credentials are missing. Run `npm run check:firebase` to see which FIREBASE_* value to add, then restart." };
  }

  let profile;
  try {
    profile = await adoptFirebaseSession(idToken);
  } catch {
    return { error: "We could not verify that sign-in with Firebase. Please try again, or sign in with email and password." };
  }

  const staff = staffByEmail(profile.email);
  if (staff) {
    await startSession(staff.id);
    redirect(target || homeFor(staff.role));
  }

  await ensureProfile(profile.uid, {
    fullName: typeof fullName === "string" && fullName.trim() ? fullName.trim() : profile.name,
    email: profile.email,
    picture: profile.picture,
    provider: profile.provider,
  });

  redirect(target || "/account");
}

export async function signOutAction() {
  await endSession();
  redirect("/login?signedout=1");
}
