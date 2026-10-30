"use client";

import { useState } from "react";
import { firebaseEnabled, sendResetLink } from "@/lib/firebase/client";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await sendResetLink(value);
      setSent(true);
    } catch (resetError) {
      setError(
        resetError.code === "auth/user-not-found" || resetError.code === "auth/invalid-email"
          ? "We could not find an account for that email. Check the address and try again."
          : resetError.code === "auth/too-many-requests"
            ? "Too many requests. Please wait a minute and try again."
            : resetError.code === "auth/network-request-failed"
              ? "We could not reach Firebase. Check your connection and try again."
              : resetError.message || "We could not send the reset email. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass-dark auth-card">
      <div>
        <p className="eyebrow">SOLEIX · Account recovery</p>
        <h1 className="auth-title">Reset your password</h1>
        <p className="auth-note">Enter the email on your account and Firebase will send a secure reset link. The link expires after an hour.</p>
        <p className="auth-note">Accounts you created on this site with an email and password are not in Firebase — ask the SOLEIX team to set a new password for you.</p>
      </div>

      {sent ? (
        <div className="auth-success" role="status">
          <p>
            <strong>Check your inbox.</strong> A password reset link is on its way to {email.trim()}. Spam folder counts too.
          </p>
          <button type="button" className="text-link" onClick={() => setSent(false)}>Send it again</button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label className="auth-label" htmlFor="reset-email">Email</label>
            <input id="reset-email" name="email" type="email" className="auth-input" autoComplete="username" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="auth-submit glass-btn" disabled={busy || !firebaseEnabled}>
            {busy ? (
              <>
                <span className="auth-spinner" aria-hidden="true" />
                Sending link
              </>
            ) : (
              "Email me a reset link"
            )}
          </button>

          {!firebaseEnabled && <p className="auth-field-error">Password reset needs the Firebase project to be connected to this server.</p>}
        </form>
      )}

      <p className="auth-switch">Remembered it? <a className="text-link" href="/login">Back to sign in</a></p>
    </div>
  );
}
