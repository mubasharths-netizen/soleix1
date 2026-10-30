"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { leaveNewsletter } from "@/lib/storefront-actions";
import Icon from "./Icon";

// One click from the link in an email, or a typed address for anyone who lost the message.
export default function UnsubscribeForm({ token = "" }) {
  const [state, submit, pending] = useActionState(leaveNewsletter, {});
  const [email, setEmail] = useState("");

  if (state?.ok && !state.ignored) {
    return (
      <div className="unsubscribe-done glass-field" role="status">
        <Icon name="check" size={26} />
        <h2>You are off the list.</h2>
        <p>
          {state.outcome === "done"
            ? "Your address is removed from the SOLEIX newsletter. Nothing further will be sent."
            : "We have nothing to remove for that address — if it was never on the list, it certainly is not now."}
        </p>
        <p className="muted">
          Changed your mind? The footer form on the <Link className="text-link" href="/">home page</Link> puts you back on it.
        </p>
      </div>
    );
  }

  return (
    <form className="unsubscribe-form glass-field" action={submit} noValidate>
      {token && <input type="hidden" name="token" value={token} />}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hp-field" />

      {!token && (
        <div className="field">
          <label className="auth-label" htmlFor="unsub-email">Email address on the list</label>
          <input id="unsub-email" name="email" type="email" className="auth-input" maxLength={160} autoComplete="email"
            placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
      )}

      {state?.error && <p className="form-error" role="alert">{state.error}</p>}

      <button className="button button-dark" type="submit" disabled={pending}>
        <Icon name={pending ? "pause" : "close"} size={18} />
        {pending ? "Removing…" : token ? "Unsubscribe me" : "Remove my address"}
      </button>
      <p className="sample-note">
        We only remove the newsletter record. If you have ordered from us, the order itself stays on file — the{" "}
        <Link className="text-link" href="/info/privacy">privacy policy</Link> explains why.
      </p>
    </form>
  );
}
