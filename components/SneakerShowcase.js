"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { formatPrice } from "@/lib/catalog.mjs";
import Reveal from "./Reveal";
import Icon from "./Icon";
import { useCatalog } from "./StoreProvider";

const finePointer = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

export default function SneakerShowcase() {
  const { get } = useCatalog();
  const product = get("velocity-01");
  const reduce = useReducedMotion();
  const stageRef = useRef(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 140, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 140, damping: 18, mass: 0.6 });
  const rotateY = useTransform(sx, [-1, 1], [-10, 10]);
  const rotateX = useTransform(sy, [-1, 1], [8, -8]);
  const shadowX = useTransform(sx, [-1, 1], [26, -26]);
  const shadowY = useTransform(sy, [-1, 1], [-16, 22]);
  const glareX = useTransform(sx, [-1, 1], ["28%", "72%"]);

  function onMove(event) {
    if (reduce || !finePointer()) return;
    const rect = stageRef.current.getBoundingClientRect();
    px.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
    py.set(((event.clientY - rect.top) / rect.height) * 2 - 1);
  }

  function onLeave() { px.set(0); py.set(0); }

  return (
    <section className="section sneaker-showcase" aria-labelledby="showcase-title">
      <div className="showcase-grid">
        <Reveal className="showcase-copy">
          <p className="eyebrow">THE VELOCITY 01, IN THE ROUND</p>
          <h2 id="showcase-title" className="section-heading">SEE IT FROM<br />EVERY ANGLE.</h2>
          <p className="showcase-description">Sculpted cushioning, a breathable mesh upper and a silhouette that moves with you. Give it a hover — it likes the attention.</p>
          {product ? <>
            <div className="showcase-facts"><span>{product.audience}&apos;s {product.category}</span><span>EU {product.sizes[0]}–{product.sizes[product.sizes.length - 1]}</span><span>{formatPrice(product.price)}</span></div>
            <Link href={`/product/${product.id}`} className="button button-dark">SHOP VELOCITY 01 <Icon name="arrow" size={17} /></Link>
          </> : <p className="muted" role="status">Loading this pair…</p>}
        </Reveal>
        <div className="showcase-stage" ref={stageRef} onMouseMove={onMove} onMouseLeave={onLeave}>
          <motion.span className="showcase-shadow" aria-hidden="true" style={{ x: shadowX, y: shadowY }} />
          {product && <div className="showcase-float">
            <motion.div className="showcase-tilt" style={{ rotateX, rotateY }}>
              <Image src={product.image} alt={`${product.name} sneaker floating on a neutral backdrop`} width={760} height={760} priority={false} sizes="(max-width: 900px) 92vw, 46vw" />
              <motion.span className="showcase-glare" aria-hidden="true" style={{ left: glareX }} />
            </motion.div>
          </div>}
          <span className="showcase-badge">VOL. 01 / IVORY</span>
        </div>
      </div>
    </section>
  );
}
