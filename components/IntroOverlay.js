"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export default function IntroOverlay() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState("off");

  useEffect(() => {
    if (reduce) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem("soleix-intro") === "1";
      sessionStorage.setItem("soleix-intro", "1");
    } catch { seen = false; }
    if (seen) return;
    setPhase("in");
    const out = setTimeout(() => setPhase("out"), 1650);
    const off = setTimeout(() => setPhase("off"), 2450);
    return () => { clearTimeout(out); clearTimeout(off); };
  }, [reduce]);

  return (
    <AnimatePresence>
      {phase !== "off" && (
        <motion.div className="intro-overlay" exit={{ y: "-100%" }} transition={{ duration: 0.75, ease: [0.76, 0, 0.24, 1] }}>
          <motion.p className="intro-wordmark" aria-label="SOLEIX">
            {"SOLEIX".split("").map((letter, index) => (
              <motion.span key={index} initial={{ y: "110%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 + index * 0.07, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}>{letter}</motion.span>
            ))}
            <motion.span className="intro-dot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>®</motion.span>
          </motion.p>
          <motion.span className="intro-line" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.62, duration: 0.7, ease: [0.16, 1, 0.3, 1] }} />
          <motion.p className="intro-tag" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.95, duration: 0.5 }}>FIND YOUR NEXT MOVE</motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
