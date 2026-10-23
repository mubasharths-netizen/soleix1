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

export default function LoginForm() {
  const [state, action] = useActionState(loginAction, null);

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

      {state?.error && (
        <p className="auth-error" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
