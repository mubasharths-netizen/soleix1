"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { sendEnquiry } from "@/lib/storefront-actions";
import Icon from "./Icon";
import { useStore } from "./StoreProvider";

// A real ticket number is returned so a shopper can quote it when they phone a shop.
export default function ContactForm({ subjects = [], defaultSubject = "" }) {
  const { notify } = useStore();
  const [state, submit, pending] = useActionState(sendEnquiry, {});
  const [length, setLength] = useState(0);
  const [values, setValues] = useState({ name: "", email: "", phone: "", order_reference: "" });
  const firstField = useRef(null);

  useEffect(() => {
    if (state?.ok && !state.ignored) {
      notify("Your message is in the shop inbox.");
      firstField.current?.focus();
    }
  }, [state, notify]);

  if (state?.ok && !state.ignored) {
    return (
      <motion.div className="contact-done glass-field" ref={firstField} tabIndex={-1} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <span className="contact-done-mark"><Icon name="check" size={22} /></span>
        <div>
          <h2>Message sent.</h2>
          <p>
            Your reference for this enquiry is <strong>SOL-ENQ-{state.ticket}</strong>. A human from the shop reads every
            message and replies to {values.email || "the address you gave"} — usually the same day.
          </p>
          <div className="contact-done-actions">
            <Link className="button button-dark" href="/track"><Icon name="truck" size={18} />Track an order</Link>
            <Link className="button button-outline" href="/info/faq">Read the FAQs</Link>
          </div>
        </div>
      </motion.div>
    );
  }

  const field = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }));

  return (
    <form className="contact-form glass-field" action={submit} noValidate aria-label="Contact SOLEIX">
      <input type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hp-field" />
      <div className="contact-form-grid">
        <div className="field">
          <label className="auth-label" htmlFor="contact-name">Your name<span aria-hidden="true"> *</span></label>
          <input id="contact-name" name="name" className="auth-input" maxLength={120} autoComplete="name" placeholder="Aisha Khan" value={values.name} onChange={field("name")} required />
        </div>
        <div className="field">
          <label className="auth-label" htmlFor="contact-email">Email<span aria-hidden="true"> *</span></label>
          <input id="contact-email" name="email" type="email" className="auth-input" maxLength={160} autoComplete="email" placeholder="you@example.com" value={values.email} onChange={field("email")} required />
        </div>
        <div className="field">
          <label className="auth-label" htmlFor="contact-phone">Phone (optional)</label>
          <input id="contact-phone" name="phone" className="auth-input" maxLength={32} autoComplete="tel" placeholder="03xx xxxxxxx" value={values.phone} onChange={field("phone")} />
        </div>
        <div className="field">
          <label className="auth-label" htmlFor="contact-subject">What is it about?</label>
          <select id="contact-subject" name="subject" className="auth-input" defaultValue={defaultSubject}>
            {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
          </select>
        </div>
        <div className="field full">
          <label className="auth-label" htmlFor="contact-reference">Order reference (optional)</label>
          <input id="contact-reference" name="order_reference" className="auth-input" maxLength={40} placeholder="SOL-01-00042" value={values.order_reference} onChange={field("order_reference")} />
        </div>
      </div>

      <div className="field mt-4">
        <label className="auth-label" htmlFor="contact-message">Your message<span aria-hidden="true"> *</span></label>
        <textarea id="contact-message" name="message" className="auth-input contact-textarea" rows={6} maxLength={2000} required
          placeholder="Tell us the size, the pair and what went wrong — details save a round trip."
          onChange={(event) => setLength(event.target.value.length)} />
        <p className="muted text-xs mt-1">{length}/2000 characters. Nothing is sent until you press Send.</p>
      </div>

      <AnimatePresence initial={false}>
        {state?.error && (
          <motion.p key="error" className="form-error contact-error" role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Icon name="info" size={17} />{state.error}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="contact-form-foot">
        <button className="button button-dark" type="submit" disabled={pending}>
          {pending ? <span className="auth-spinner" aria-hidden="true" /> : <Icon name="send" size={18} />}
          {pending ? "Sending…" : "Send message"}
        </button>
        <p className="sample-note">We answer from a real inbox. Your email is used only to reply to this message.</p>
      </div>
    </form>
  );
}
