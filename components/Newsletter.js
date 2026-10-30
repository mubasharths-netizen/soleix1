"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { subscribeNewsletter } from "@/lib/storefront-actions";
import Icon from "./Icon";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, submit, pending] = useActionState(subscribeNewsletter, {});
  const done = Boolean(state?.ok);
  const button = useRef(null);

  useEffect(() => {
    if (done) button.current?.blur();
  }, [done]);

  return (
    <section className="newsletter" aria-labelledby="newsletter-title">
      <div>
        <p className="eyebrow">STAY ONE STEP AHEAD</p>
        <h2 id="newsletter-title">GOOD THINGS. FIRST.</h2>
        <p>Fresh drops, restock alerts and the occasional run club invite. In your inbox, not in a tracker.</p>
      </div>

      {done ? (
        <p className="newsletter-form newsletter-thanks" role="status">
          <Icon name="check" size={22} />
          <span>
            {state.again ? "Welcome back — this address is on the list again." : "You are on the list. Nothing else is needed."}{" "}
            <Link className="text-link" href="/unsubscribe">Unsubscribe</Link> any time, in one click.
          </span>
        </p>
      ) : (
        <form className="newsletter-form" action={submit} noValidate>
          {/* Bots fill everything; people never see this field. */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hp-field" />
          <input type="hidden" name="source" value="footer" />
          <div className="newsletter-field">
            <label className="sr-only" htmlFor="newsletter-email">Your email address</label>
            <input id="newsletter-email" name="email" type="email" required maxLength={254} autoComplete="email" placeholder="Your email address"
              value={email} onChange={(event) => setEmail(event.target.value)} />
            <button ref={button} type="submit" aria-label="Sign up for SOLEIX updates" disabled={pending}>
              <Icon name={pending ? "pause" : "arrow"} size={23} />
            </button>
          </div>
          <p className="newsletter-disclaimer">
            By signing up you agree to our <Link href="/info/privacy">Privacy Policy</Link>. One email address, stored in
            our own database, removed the moment you use the unsubscribe link.
          </p>
          {state?.error && <p className="form-error" role="alert">{state.error}</p>}
        </form>
      )}
    </section>
  );
}
