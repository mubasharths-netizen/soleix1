"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { completeInvitationAction } from "@/lib/dashboard-actions";

export default function SetPasswordForm({ token: initialToken, error }) {
  const [token, setToken] = useState(initialToken || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, submit, pending] = useActionState(async (_previous, form) => (await completeInvitationAction(form)) || {}, {});

  const message = state?.error || error || null;
  const weak = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <form className="auth-card glass-dark" action={submit}>
      <p className="eyebrow">SOLEIX TEAM ACCESS</p>
      <h1 className="auth-title">Set your password.</h1>
      <p className="auth-note">
        Your shop created the account and sent this one-time link. Choose a password — it is stored hashed, never in plain text, and the link stops working as soon as you use it.
      </p>

      <div>
        <label className="auth-label" htmlFor="setup-token">Setup link token</label>
        <input id="setup-token" className="auth-input" name="token" value={token} onChange={(event) => setToken(event.target.value)} required autoComplete="off" spellCheck={false} />
      </div>
      <div>
        <label className="auth-label" htmlFor="setup-password">New password</label>
        <input id="setup-password" className="auth-input" type="password" name="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="new-password" />
      </div>
      {weak && <p className="auth-field-error">Use at least 8 characters.</p>}
      <div>
        <label className="auth-label" htmlFor="setup-confirm">Repeat password</label>
        <input id="setup-confirm" className="auth-input" type="password" name="confirm" value={confirm} onChange={(event) => setConfirm(event.target.value)} required minLength={8} autoComplete="new-password" />
      </div>
      {mismatch && <p className="auth-field-error">The two passwords do not match.</p>}

      {message && <p className="auth-error" role="alert">{message}</p>}

      <button type="submit" className="auth-submit glass-btn" disabled={pending || weak || mismatch}>
        {pending ? "Saving…" : "Set password and continue"}
      </button>
      <p className="auth-switch">Already have a password? <Link className="text-link" href="/login">Sign in</Link></p>
    </form>
  );
}
