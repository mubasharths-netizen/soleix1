"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function Template({ children }) {
  const reduce = useReducedMotion();
  if (reduce) return children;
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.2, 0.8, 0.25, 1] }}>
      {children}
    </motion.div>
  );
}
