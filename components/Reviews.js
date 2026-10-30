"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { submitReview } from "@/lib/storefront-actions";
import { FIT_OPTIONS } from "@/lib/fit-options.mjs";
import Icon from "./Icon";
import { StarMeter } from "./StarRating";
import { useStore } from "./StoreProvider";

const PAGE = 4;

const when = (value) => {
  const date = new Date(String(value).includes(" ") ? `${String(value).replace(" ", "T")}Z` : value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

export default function Reviews({ product, rating, reviews = [] }) {
  const router = useRouter();
  const { notify } = useStore();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [state, submit, pending] = useActionState(submitReview, {});
  const [values, setValues] = useState({ author: "", email: "", rating: 0, fit: "true", title: "", body: "" });
  const total = rating.count || reviews.length || 0;

  useEffect(() => {
    if (state?.ok && !state.ignored) {
      setOpen(false);
      setValues((current) => ({ ...current, rating: 0, title: "", body: "" }));
      notify(state.verified ? "Thank you — your review is live and marked Verified buyer." : "Thank you, your review is live on the pair.");
      router.refresh();
    }
  }, [state, notify, router]);

  const bars = useMemo(
    () => [5, 4, 3, 2, 1].map((score) => ({ score, count: Number(rating.buckets?.[score] || 0), percent: total ? Math.round((Number(rating.buckets?.[score] || 0) / total) * 100) : 0 })),
    [rating.buckets, total]
  );

  const field = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }));

  return (
    <section className="reviews" id="reviews" aria-labelledby="reviews-heading">
      <div className="reviews-head">
        <div>
          <p className="eyebrow">FROM THE PEOPLE WHO WEAR THEM</p>
          <h2 id="reviews-heading" className="section-heading">Reviews.</h2>
        </div>
        <button type="button" className="button button-outline" aria-expanded={open} aria-controls="review-form" onClick={() => setOpen((value) => !value)}>
          <Icon name="star" size={18} />{open ? "Close the form" : "Write a review"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.form id="review-form" className="review-form glass-field" key="form" action={submit} noValidate
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
            <input type="hidden" name="product" value={product.id} />
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hp-field" />
            <div className="review-form-grid">
              <div className="review-form-rating">
                <div className="star-picker" aria-invalid={values.rating ? undefined : true}>
                  <span className="option-label mb-2 text-sm font-semibold">Your rating</span>
                  <div className="star-picker-row">
                    {[5, 4, 3, 2, 1].map((score) => (
                      <button key={score} type="button" className={`star-option ${values.rating >= score ? "is-on" : ""}`} aria-pressed={values.rating === score}
                        aria-label={`${score} star${score === 1 ? "" : "s"}`} onClick={() => setValues((current) => ({ ...current, rating: score }))}>
                        <Icon name="star" size={26} fill={values.rating >= score ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                  <p className="muted text-xs mt-1">{values.rating ? `${values.rating} out of 5` : "Choose a rating"}</p>
                </div>
                <div className="field">
                  <label className="auth-label" htmlFor="review-fit">How does it fit?</label>
                  <select id="review-fit" name="fit" className="auth-input" value={values.fit} onChange={field("fit")}>
                    {FIT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="review-form-fields">
                <div className="field">
                  <label className="auth-label" htmlFor="review-author">Display name<span aria-hidden="true"> *</span></label>
                  <input id="review-author" name="author" className="auth-input" maxLength={60} autoComplete="name" placeholder="How your name appears" value={values.author} onChange={field("author")} required />
                </div>
                <div className="field">
                  <label className="auth-label" htmlFor="review-email">Email<span aria-hidden="true"> *</span></label>
                  <input id="review-email" name="email" type="email" className="auth-input" maxLength={160} autoComplete="email" placeholder="you@example.com" value={values.email} onChange={field("email")} required />
                  <p className="muted text-xs mt-1">Never published. It lets us mark the review Verified buyer when a delivered order matches.</p>
                </div>
                <div className="field">
                  <label className="auth-label" htmlFor="review-title">Headline</label>
                  <input id="review-title" name="title" className="auth-input" maxLength={90} placeholder="Six months in, still my first choice" value={values.title} onChange={field("title")} />
                </div>
                <div className="field">
                  <label className="auth-label" htmlFor="review-body">Your review<span aria-hidden="true"> *</span></label>
                  <textarea id="review-body" name="body" className="auth-input" minLength={15} maxLength={900} rows={4} placeholder="How did you wear them, and would you buy the pair again?" value={values.body} onChange={field("body")} required />
                  <p className="muted text-xs mt-1">{values.body.length}/900</p>
                </div>
              </div>
            </div>
            {state?.error && <p className="auth-error" role="alert">{state.error}</p>}
            <button type="submit" className="button button-dark" disabled={pending || !values.rating}>
              {pending ? (<><span className="auth-spinner" aria-hidden="true" /> Publishing</>) : (<>Publish review <Icon name="arrow" size={18} /></>)}
            </button>
            <p className="sample-note">By posting you agree that the review is your own experience with a pair you received. Read the <Link className="text-link" href="/info/terms">terms</Link>.</p>
          </motion.form>
        )}
      </AnimatePresence>

      {total ? (
        <div className="reviews-layout">
          <div className="reviews-summary">
            <p className="reviews-average">{Number(rating.average).toFixed(1)}</p>
            <StarMeter value={rating.average} size={20} />
            <p className="muted text-sm mt-1">{total} review{total === 1 ? "" : "s"}</p>
            <ul className="rating-bars">
              {bars.map((bar) => (
                <li key={bar.score}>
                  <span className="rating-bars-label">{bar.score}★</span>
                  <span className="rating-bars-track"><span style={{ width: `${bar.percent}%` }} /></span>
                  <span className="rating-bars-count">{bar.count}</span>
                </li>
              ))}
            </ul>
            <p className="muted text-xs mt-3">Only reviews from a delivered order are marked Verified buyer.</p>
          </div>

          <div className="reviews-list">
            {reviews.slice(0, shown).map((review) => (
              <article className="review-item" key={review.id}>
                <header>
                  <StarMeter value={review.rating} size={16} />
                  <strong className="review-item-author">{review.author}</strong>
                  {review.verified ? <span className="badge badge-ok"><Icon name="check" size={13} />Verified buyer</span> : <span className="badge">Shopper</span>}
                  <time className="muted text-xs" dateTime={String(review.created_at).slice(0, 10)}>{when(review.created_at)}</time>
                </header>
                {review.title && <h3 className="review-item-title">{review.title}</h3>}
                <p>{review.body}</p>
                {review.fit && <p className="muted text-xs">Fit: {FIT_OPTIONS.find((option) => option.value === review.fit)?.label}</p>}
              </article>
            ))}
            {reviews.length > shown && (
              <button type="button" className="button button-ghost" onClick={() => setShown((value) => value + PAGE)}>
                Show older reviews <Icon name="down" size={17} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="reviews-empty">
          <p className="lead">No reviews on this pair yet.</p>
          <p className="muted text-sm">Wear them first — a review can only be published against a pair you have actually received, and verified ones carry more weight here.</p>
          <button type="button" className="text-link" onClick={() => setOpen(true)}>Write the first one <Icon name="arrow" size={16} /></button>
        </div>
      )}
    </section>
  );
}
