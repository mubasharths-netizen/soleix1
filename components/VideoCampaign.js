"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import Icon from "./Icon";

function useEnterProps(eager) {
  const reduce = useReducedMotion();
  if (reduce) return {};
  return eager
    ? { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }
    : { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" } };
}

export default function VideoCampaign({ as: Heading = "h2", src, poster, posterAlt = "", kicker, headline, description, cta, theme = "dark", eager = false, className = "", overlays, children }) {
  const wrapRef = useRef(null);
  const videoRef = useRef(null);
  const [state, setState] = useState("idle");
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const inView = useRef(false);
  const enter = useEnterProps(eager);

  useEffect(() => {
    if (reduce) return;
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(([entry]) => {
      inView.current = entry.isIntersecting;
      if (!entry.isIntersecting) { video.pause(); return; }
      if (!video.src) {
        video.src = src;
        setState("loading");
      }
      if (entry.intersectionRatio >= 0.25 && !video.dataset.userPaused) video.play().catch(() => {});
      else video.pause();
    }, { rootMargin: "600px 0px", threshold: [0, 0.25] });
    observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, [src, reduce]);

  function onCanPlay() {
    setState("ready");
    const video = videoRef.current;
    if (video && inView.current && !video.dataset.userPaused) video.play().catch(() => {});
  }

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { delete video.dataset.userPaused; video.play().catch(() => {}); setPaused(false); }
    else { video.dataset.userPaused = "1"; video.pause(); setPaused(true); }
  }

  return (
    <motion.section
      ref={wrapRef}
      className={`video-campaign ${theme} ${className}`}
      initial={eager || reduce ? false : { opacity: 0.25, scale: 1.02 }}
      whileInView={eager || reduce ? undefined : { opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-120px" }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      <Image src={poster} alt={posterAlt} fill sizes="100vw" priority={eager} className={`campaign-poster ${state === "ready" && !reduce ? "is-hidden" : ""}`} />
      {!reduce && (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          autoPlay={eager}
          preload="none"
          aria-hidden="true"
          tabIndex={-1}
          className={`campaign-video ${state === "ready" ? "is-ready" : ""}`}
          onCanPlay={onCanPlay}
          onError={() => setState("failed")}
        />
      )}
      {state === "loading" && <span className="video-loading" role="status" aria-label="Loading video">Loading</span>}
      {state === "ready" && !reduce && (
        <button type="button" className="video-toggle" onClick={togglePlayback} aria-label={paused ? "Play campaign video" : "Pause campaign video"} aria-pressed={paused}>
          <Icon name={paused ? "play" : "pause"} size={14} />
        </button>
      )}
      <div className="campaign-shade" />
      <div className="campaign-content">
        {kicker && <motion.p className="eyebrow" {...enter} transition={{ duration: 0.5 }}>{kicker}</motion.p>}
        {headline && <motion.h2 as={Heading} {...enter} transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}>{headline}</motion.h2>}        {description && <motion.p className="campaign-copy" {...enter} transition={{ duration: 0.6, delay: 0.16 }}>{description}</motion.p>}
        {(cta || children) && (
          <motion.div className="campaign-actions" {...enter} transition={{ duration: 0.55, delay: 0.24 }}>
            {cta && <Link href={cta.href} className={`button ${theme === "dark" ? "button-white" : "button-dark"}`}>{cta.label} <Icon name="arrow" size={17} /></Link>}
            {children}
          </motion.div>
        )}
      </div>
      {overlays}
    </motion.section>
  );
}
