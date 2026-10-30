"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "./Icon";

const KEY = "soleix-consent-v1";

// Nothing on this site tracks a shopper across the web, so there is no "accept analytics" to
// offer — the banner states what is actually stored and asks the visitor to acknowledge it.
export default function ConsentBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      /* private mode with storage blocked: show nothing rather than trap the banner on screen */
    }
  }, []);

  function close() {
    try { localStorage.setItem(KEY, new Date().toISOString()); } catch { /* the banner still closes */ }
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="consent-bar" role="region" aria-label="Privacy notice"
          initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 90, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.9 }}>
          <span className="consent-mark" aria-hidden="true"><Icon name="shield" size={20} /></span>
          <div className="consent-copy">
            <strong>Your move, your data.</strong>
            <p>We set one sign-in cookie and keep your bag and favourites in this browser. No trackers, no ad pixels, no third-party analytics.</p>
          </div>
          <div className="consent-actions">
            <button type="button" className="button button-dark" onClick={close}>Got it</button>
            <Link href="/info/privacy" className="text-link" onClick={close}>Read the policy</Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
