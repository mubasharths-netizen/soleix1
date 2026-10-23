"use client";

import { Fragment } from "react";
import { motion, useReducedMotion } from "framer-motion";

const word = { hidden: { y: "112%" }, show: { y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } } };

export default function StaggerText({ as: Tag = "h2", text, className = "", delay = 0 }) {
  const reduce = useReducedMotion();
  if (reduce) return <Tag className={className}>{text}</Tag>;
  return (
    <Tag className={className}>
      <motion.span
        className="stagger-line"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        transition={{ staggerChildren: 0.07, delayChildren: delay }}
      >
        {text.split(" ").map((wordText, index) => (
          <Fragment key={index}>{index > 0 ? " " : ""}<span className="stagger-word"><motion.span variants={word}>{wordText}</motion.span></span></Fragment>
        ))}
      </motion.span>
    </Tag>
  );
}
