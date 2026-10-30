"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { firebaseAuthAction, loginAction, signUpAction } from "@/lib/auth-actions";
import {
  completeRedirectSignIn,
  firebaseEnabled,
  signInWithGoogle,
  signInWithPassword,
} from "@/lib/firebase/client";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C33.5 6.1 29 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.5-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C33.5 6.1 29 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.5-.4-3.5z" />
    </svg>
  );
}

function EyeIcon({ shown }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      {shown ? (
        <>
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M4 4l16 16" />
          <path d="M9.6 5.9A9.6 9.6 0 0112 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 01-3.4 4.1M6.3 8.2A17.4 17.4 0 002.5 12S6 18.5 12 18.5c1 0 1.9-.2 2.7-.5" />
        </>
      )}
    </svg>
  );
}

// Firebase answers these when the email/password pair simply does not exist in its project. After
// SQLite has already refused the same pair, the neutral "credentials do not match" message is kept.
const CREDENTIAL_ERROR_CODES = [
  "auth/user-not-found",
  "auth/wrong-password",
  "auth/invalid-login-credentials",
  "auth/invalid-credential",
];

function friendlyAuthError(error) {
  switch (error?.code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Sign in instead.";
    case "auth/weak-password":
      return "Choose a stronger password — at least 8 characters.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a minute and try again.";
    case "auth/network-request-failed":
      return "We could not reach Firebase. Check your connection and try again.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact the SOLEIX Super Admin.";
    case "auth/account-exists-with-different-credential":
      return "That email already signs in another way. Use the method you created it with.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return "Google sign-in was cancelled.";
    case "auth/popup-blocked":
    case "auth/operation-not-supported-in-environment":
    case "auth/not-allowed":
      return "Your browser blocked the Google window. Try again — we will redirect you instead, or use email and password.";
    case "auth/operation-not-allowed":
      return "Google sign-in is not enabled in the Firebase project yet.";
    default: {
      const raw = String(error?.message || "");
      if (!raw.startsWith("Firebase:")) return raw || "Sign-in failed. Please try again.";
      if (raw.includes("api-key-not-valid") || raw.includes("invalid-api-key")) return "This site's Firebase key is not valid yet, so we checked our own records instead.";
      return "Sign-in could not be completed right now. Try again, or use another sign-in method.";
    }
  }
}

export default function AuthForm({ mode, next }) {
  const [values, setValues] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [shown, setShown] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState("");
  const started = useRef(false);

  const set = (key) => (event) => {
    setValues((current) => ({ ...current, [key]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  };

  // Finishes a Google sign-in that had to leave the page and come back.
  useEffect(() => {
    if (!firebaseEnabled || started.current) return;
    started.current = true;
    completeRedirectSignIn()
      .then((user) => (user ? user.getIdToken() : null))
      .then((idToken) => (idToken ? firebaseAuthAction({ idToken, next, fullName: values.fullName }) : null))
      .then((result) => result?.error && setError(result.error))
      .catch((redirectError) => setError(friendlyAuthError(redirectError)));
  }, [next, values.fullName]);

  function validate() {
    const found = {};
    if (mode === "signup" && values.fullName.trim().length < 2) found.fullName = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) found.email = "Enter a valid email address.";
    if (values.password.length < 8) found.password = "Use at least 8 characters.";
    if (mode === "signup" && values.confirm !== values.password) found.confirm = "Passwords do not match.";
    setFieldErrors(found);
    return Object.keys(found).length === 0;
  }

  // This site's own records answer first: staff roles from the users table, shoppers from the
  // customers table. Neither depends on the Firebase project being reachable or configured.
  async function serverSignIn(email) {
    const form = new FormData();
    form.set("email", email);
    form.set("password", values.password);
    if (next) form.set("next", next);
    return loginAction(null, form);
  }

  async function submit(event) {
    event.preventDefault();
    if (busy || !validate()) return;
    const email = values.email.trim();
    const fullName = values.fullName.trim();
    setError(null);
    setBusy("form");
    try {
      if (mode === "signup") {
        const form = new FormData();
        form.set("fullName", fullName);
        form.set("email", email);
        form.set("password", values.password);
        form.set("confirm", values.confirm);
        if (next) form.set("next", next);
        const result = await signUpAction(null, form);
        if (result?.error) setError(result.error);
        return;
      }
      if (!firebaseEnabled) {
        const result = await serverSignIn(email);
        if (result?.error) setError(result.error);
        return;
      }
      // Login: this site's own records first. Asking Firebase for a staff email would answer 400
      // on every sign-in, so the customer lookup only runs once the database has refused the pair.
      const staff = await serverSignIn(email);
      if (!staff?.error) return;
      try {
        const idToken = await signInWithPassword({ email, password: values.password });
        const result = await firebaseAuthAction({ idToken, next, fullName: fullName || undefined });
        if (result?.error) setError(result.error);
      } catch (authError) {
        setError(CREDENTIAL_ERROR_CODES.includes(authError.code) ? staff.error : friendlyAuthError(authError));
      }
    } finally {
      setBusy("");
    }
  }

  async function googleSignIn(event) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy("google");
    try {
      const { user, method } = await signInWithGoogle();
      if (method === "redirect") return;
      const result = await firebaseAuthAction({ idToken: await user.getIdToken(), next, fullName: values.fullName.trim() || undefined });
      if (result?.error) setError(result.error);
    } catch (googleError) {
      setError(friendlyAuthError(googleError));
    } finally {
      setBusy("");
    }
  }

  const isSignup = mode === "signup";
  const prefix = isSignup ? "signup" : "login";

  return (
    <div className="glass-dark auth-card">
      <div>
        <p className="eyebrow">SOLEIX · {isSignup ? "Join us" : "Welcome back"}</p>
        <h1 className="auth-title">{isSignup ? "Create your account" : "Sign in"}</h1>
        <p className="auth-note">
          {isSignup
            ? "One account for your favourites, bag and order history across every SOLEIX shop."
            : "Customers sign in with email or Google. Staff and shop teams use the same form — roles come from our records, never from this page."}
        </p>
      </div>

      <form onSubmit={submit} noValidate>
        {isSignup && (
          <div className="field">
            <label className="auth-label" htmlFor={`${prefix}-name`}>Full name</label>
            <input id={`${prefix}-name`} name="fullName" type="text" className={`auth-input${fieldErrors.fullName ? " is-invalid" : ""}`} autoComplete="name" placeholder="Amina Yusuf" value={values.fullName} onChange={set("fullName")} />
            {fieldErrors.fullName && <p className="auth-field-error">{fieldErrors.fullName}</p>}
          </div>
        )}

        <div className="field">
          <label className="auth-label" htmlFor={`${prefix}-email`}>Email</label>
          <input id={`${prefix}-email`} name="email" type="email" className={`auth-input${fieldErrors.email ? " is-invalid" : ""}`} autoComplete="username" placeholder="name@example.com" value={values.email} onChange={set("email")} />
          {fieldErrors.email && <p className="auth-field-error">{fieldErrors.email}</p>}
        </div>

        <div className="field">
          <div className="auth-label-row">
            <label className="auth-label" htmlFor={`${prefix}-password`}>Password</label>
            {!isSignup && <Link className="auth-forgot" href="/forgot-password">Forgot password?</Link>}
          </div>
          <div className="auth-password-wrap">
            <input id={`${prefix}-password`} name="password" type={shown ? "text" : "password"} className={`auth-input${fieldErrors.password ? " is-invalid" : ""}`} autoComplete={isSignup ? "new-password" : "current-password"} placeholder={isSignup ? "At least 8 characters" : "Your password"} value={values.password} onChange={set("password")} />
            <button type="button" className="auth-eye" onClick={() => setShown((v) => !v)} aria-label={shown ? "Hide password" : "Show password"} aria-pressed={shown}>
              <EyeIcon shown={shown} />
            </button>
          </div>
          {fieldErrors.password && <p className="auth-field-error">{fieldErrors.password}</p>}
        </div>

        {isSignup && (
          <div className="field">
            <label className="auth-label" htmlFor={`${prefix}-confirm`}>Confirm password</label>
            <input id={`${prefix}-confirm`} name="confirm" type={shown ? "text" : "password"} className={`auth-input${fieldErrors.confirm ? " is-invalid" : ""}`} autoComplete="new-password" placeholder="Repeat your password" value={values.confirm} onChange={set("confirm")} />
            {fieldErrors.confirm && <p className="auth-field-error">{fieldErrors.confirm}</p>}
          </div>
        )}

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="auth-submit glass-btn" disabled={Boolean(busy)}>
          {busy === "form" ? (
            <>
              <span className="auth-spinner" aria-hidden="true" />
              {isSignup ? "Creating account" : "Signing in"}
            </>
          ) : isSignup ? (
            "Sign Up"
          ) : (
            "Login"
          )}
        </button>
      </form>

      {firebaseEnabled && (
        <>
          <p className="auth-or">OR</p>
          <button type="button" className="auth-google" onClick={googleSignIn} disabled={Boolean(busy)}>
            {busy === "google" ? (
              <>
                <span className="auth-spinner" aria-hidden="true" />
                Opening Google
              </>
            ) : (
              <>
                <GoogleIcon />
                {isSignup ? "Sign up with Google" : "Continue with Google"}
              </>
            )}
          </button>
        </>
      )}

      <p className="auth-switch">
        {isSignup ? (
          <>Already have an account? <Link className="text-link" href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>Sign in</Link></>
        ) : (
          <>New to SOLEIX? <Link className="text-link" href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}>Create an account</Link></>
        )}
      </p>
    </div>
  );
}
