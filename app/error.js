"use client";

import Link from "next/link";

export default function ErrorPage({ reset }) {
  return <section className="section empty-state page-shell"><p className="eyebrow">LET’S TRY THAT AGAIN</p><h1 className="page-title">A SMALL MISSTEP.</h1><p>We couldn&apos;t load this page. Your next pair is still out there.</p><div className="flex flex-wrap justify-center gap-3"><button className="button button-dark" onClick={() => reset()}>Try again</button><Link className="button button-outline" href="/">Back to SOLEIX</Link></div></section>;
}
