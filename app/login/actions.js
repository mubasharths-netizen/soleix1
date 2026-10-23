"use server";

import { redirect } from "next/navigation";
import { authenticate, homeFor, startSession } from "@/lib/session.mjs";

export async function loginAction(_previous, formData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) return { error: "Enter both your email and password." };

  const user = authenticate(email, password);
  if (!user) return { error: "Those credentials do not match our records." };

  await startSession(user.id);
  redirect(homeFor(user.role));
}
