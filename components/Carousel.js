"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Icon from "./Icon";

export default function Carousel({ label, children }) {
  const trackRef = useRef(null);
  const reduce = useReducedMotion();
  const [edges, setEdges] = useState({ prev: false, next: false });
  const drag = useRef({ on: false, x0: 0, left0: 0, moved: false });

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setEdges({ prev: el.scrollLeft > 8, next: el.scrollLeft < el.scrollWidth - el.clientWidth - 8 });
  }, []);

  useEffect(() => {
    update();
    const el = trackRef.current;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { el.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [update, children]);

  function onPointerDown(event) {
    if (event.pointerType !== "mouse" || !event.isPrimary) return;
    drag.current = { on: true, x0: event.clientX, left0: trackRef.current.scrollLeft, moved: false };
  }
  function onPointerMove(event) {
    const state = drag.current;
    if (!state.on) return;
    const delta = event.clientX - state.x0;
    if (Math.abs(delta) > 6) {
      state.moved = true;
      trackRef.current.scrollLeft = state.left0 - delta;
    }
  }
  function endDrag() { drag.current.on = false; }
  function onClickCapture(event) {
    if (drag.current.moved) { event.preventDefault(); event.stopPropagation(); drag.current.moved = false; }
  }

  function scroll(direction) {
    const el = trackRef.current;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <div className="carousel">
      <motion.div
        className="carousel-track"
        ref={trackRef}
        role="group"
        aria-label={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
      <div className="carousel-controls">
        <button type="button" className="carousel-arrow" onClick={() => scroll(-1)} disabled={!edges.prev} aria-label={`Scroll ${label} backward`}><Icon name="chevron" size={18} style={{ transform: "rotate(180deg)" }} /></button>
        <button type="button" className="carousel-arrow" onClick={() => scroll(1)} disabled={!edges.next} aria-label={`Scroll ${label} forward`}><Icon name="chevron" size={18} /></button>
      </div>
    </div>
  );
}
