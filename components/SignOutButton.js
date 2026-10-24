"use client";

import { useState } from "react";
import { signOutAction } from "@/lib/auth-actions";
import { clientSignOut } from "@/lib/firebase/client";

// Clears all three session states: Firebase browser persistence, the Firebase session cookie
// and the staff session row.
export default function SignOutButton({ className = "text-link", label = "Logout" }) {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    await clientSignOut();
    await signOutAction();
  }

  return (
    <button type="button" className={className} onClick={signOut} disabled={busy}>
      {busy ? "Signing out…" : label}
    </button>
  );
}
