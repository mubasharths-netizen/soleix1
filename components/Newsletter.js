"use client";

import Link from "next/link";
import { useState } from "react";
import Icon from "./Icon";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  function submit(event) {
    event.preventDefault();
    try {
      localStorage.setItem("soleix-newsletter-interest", email.trim());
      setMessage("Your interest is saved on this device. Email updates aren’t connected in this demo.");
      setEmail("");
    } catch { setMessage("Browser storage is unavailable. No email has been saved or sent."); }
  }
  return <section className="newsletter" aria-labelledby="newsletter-title"><div><p className="eyebrow">STAY ONE STEP AHEAD</p><h2 id="newsletter-title">GOOD THINGS. FIRST.</h2><p>Fresh drops, new perspectives, and a little inspiration. In your inbox.</p></div><form onSubmit={submit} className="newsletter-form"><div className="newsletter-field"><label className="sr-only" htmlFor="newsletter-email">Your email address</label><input id="newsletter-email" type="email" required maxLength={254} autoComplete="email" placeholder="Your email address" value={email} onChange={(event) => setEmail(event.target.value)} /><button type="submit" aria-label="Sign up for SOLEIX updates"><Icon name="arrow" size={23} /></button></div><p className="newsletter-disclaimer">By signing up, you agree to our <Link href="/info/privacy">Privacy Policy</Link>. Demo signup, stored only on this device.</p>{message && <p className="newsletter-message" role="status">{message}</p>}</form></section>;
}
