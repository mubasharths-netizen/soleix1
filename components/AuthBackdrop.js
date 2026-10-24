"use client";

import { useEffect, useState } from "react";

export default function AuthBackdrop() {
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const frame = requestAnimationFrame(() => setShowVideo(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <div className="auth-bg" aria-hidden="true" />
      {showVideo && <video className="auth-video" src="/videos/sneakers-walking-201.mp4" poster="/images/campaign.webp" autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />}
      <div className="auth-grain" aria-hidden="true" />
    </>
  );
}
