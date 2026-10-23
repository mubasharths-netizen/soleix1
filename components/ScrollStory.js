"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import Icon from "./Icon";

export default function ScrollStory() {
  const reduce = useReducedMotion();
  const wrapRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ["start start", "end end"] });
  const shoeX = useTransform(scrollYProgress, [0.05, 0.5, 0.95], ["36%", "4%", "-16%"]);
  const shoeRotate = useTransform(scrollYProgress, [0.05, 0.5, 0.95], [-9, 4, 16]);
  const lineFast = useTransform(scrollYProgress, [0.1, 0.55], [90, -40]);
  const lineMid = useTransform(scrollYProgress, [0.18, 0.62], [60, -24]);
  const lineSlow = useTransform(scrollYProgress, [0.26, 0.7], [40, -10]);
  const numberY = useTransform(scrollYProgress, [0, 1], ["18%", "-14%"]);

  if (reduce) {
    return (
      <section className="scroll-story static-story">
        <div className="story-stage">
          <p className="eyebrow">AN ANATOMY OF MOVEMENT</p>
          <h2>EVERY LAYER<br />HAS A JOB.</h2>
          <ol className="story-lines"><li>01 / Sculpted midsole — returns energy with every stride.</li><li>02 / Breathable mesh — keeps the day feeling light.</li><li>03 / Textured outsole — grip for the path less travelled.</li></ol>
          <Image src="/images/product-dark.webp" alt="Terra Form sneaker on a dark backdrop" width={640} height={640} className="story-shoe" />
        </div>
      </section>
    );
  }

  return (
    <section className="scroll-story" ref={wrapRef} aria-label="Anatomy of movement">
      <div className="story-stage">
        <motion.span className="story-number" aria-hidden="true" style={{ y: numberY }}>01</motion.span>
        <motion.h2 className="story-heading" style={{ y: lineSlow }}>EVERY LAYER<br />HAS A JOB.</motion.h2>
        <motion.ol className="story-lines" style={{ y: lineMid }}>
          <li><span>01</span> Sculpted midsole — returns energy with every stride.</li>
          <li><span>02</span> Breathable mesh — keeps the day feeling light.</li>
          <li><span>03</span> Textured outsole — grip for the path less travelled.</li>
        </motion.ol>
        <motion.div className="story-cta" style={{ y: lineFast }}>
          <Link href="/shop?collection=Running%20Shoes" className="button button-white">EXPLORE THE BUILD <Icon name="arrow" size={17} /></Link>
        </motion.div>
        <motion.div className="story-shoe" style={{ x: shoeX, rotate: shoeRotate }}>
          <Image src="/images/product-dark.webp" alt="Terra Form sneaker moving through the frame as you scroll" width={560} height={560} sizes="60vw" />
        </motion.div>
        <p className="story-hint">KEEP SCROLLING</p>
      </div>
    </section>
  );
}
