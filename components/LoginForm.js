"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/app/login/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="auth-submit glass-btn" disabled={pending}>
      {pending ? (
        <>
          <span className="auth-spinner" aria-hidden="true" />
          Signing in
        </>
      ) : (
        "Login"
      )}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C33.5 6.1 29 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.5-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C33.5 6.1 29 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.5-.4-3.5z"/>
    </svg>
  );
}

export default function LoginForm({ authError, googleEnabled }) {
  const [state, action] = useActionState(loginAction, null);
  const error = state?.error || authError;

  return (
    <form className="glass-dark auth-card" action={action}>
      <div>
        <p className="eyebrow">SOLEIX · Staff access</p>
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-note">Accounts are created by the Super Admin. There is no public registration.</p>
      </div>

      <div className="field">
        <label className="auth-label" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          className="auth-input"
          autoComplete="username"
          placeholder="name@soleix.com"
          required
        />
      </div>

      <div className="field">
        <label className="auth-label" htmlFor="login-password">
          Password
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          className="auth-input"
          autoComplete="current-password"
          placeholder="Your password"
          required
        />
      </div>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <SubmitButton />

      {googleEnabled && (
        <>
          <p className="auth-or">OR</p>
          <a className="auth-google" href="/api/auth/google">
            <GoogleIcon />
            Continue with Google
          </a>
        </>
      )}
    </form>
  );
}
