"use server";

import { redirect } from "next/navigation";
import { firebaseAdminEnabled, ensureProfile } from "@/lib/firebase/admin.mjs";
import {
  adoptFirebaseSession,
  authenticate,
  endSession,
  homeFor,
  safeNext,
  staffByEmail,
  startSession,
} from "@/lib/session.mjs";

// Staff accounts live in SQLite with scrypt-hashed passwords and roles. This is the
// fallback path for the dashboards and stays exactly as it was.
export async function loginAction(_previous, formData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) return { error: "Enter both your email and password." };

  const user = authenticate(email, password);
  if (!user) return { error: "Those credentials do not match our records." };

  await startSession(user.id);
  redirect(next || homeFor(user.role));
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
