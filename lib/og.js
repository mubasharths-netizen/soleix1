// Shared social-card renderer for the opengraph-image routes. Built with createElement so this
// stays a plain .js module, and drawn entirely with typography — no font or image files to load,
// which keeps generation reliable at build time.
import { createElement as h } from "react";
import { ImageResponse } from "next/og";
import { brand } from "./site.js";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const ink = "#111110";
const paper = "#f3f2ef";
const accent = brand.accentColor;

const stack = (children, style = {}) =>
  h("div", { style: { display: "flex", flexDirection: "column", ...style } }, ...children);

export function ogResponse({ eyebrow = "", headline = "", detail = "", price = "", footnote = "" }) {
  return new ImageResponse(
    h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: ink,
          color: paper,
          padding: "64px 72px",
          position: "relative",
          overflow: "hidden",
          fontFamily: "Geist Sans",
        },
      },
      // Ruled backdrop: the same grid language the storefront uses.
      h("div", {
        style: {
          position: "absolute",
          top: "-180px",
          right: "-120px",
          width: "620px",
          height: "620px",
          borderRadius: "9999px",
          border: `2px solid rgba(243,242,239,0.16)`,
          display: "flex",
        },
      }),
      h("div", {
        style: {
          position: "absolute",
          bottom: "-260px",
          right: "120px",
          width: "420px",
          height: "420px",
          borderRadius: "9999px",
          background: `rgba(194,69,29,0.22)`,
          display: "flex",
        },
      }),
      h(
        "div",
        { style: { display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" } },
        h("div", { style: { fontSize: 40, fontWeight: 700, letterSpacing: 8 } }, "SOLEIX"),
        h(
          "div",
          {
            style: {
              display: "flex",
              fontSize: 22,
              letterSpacing: 4,
              padding: "10px 22px",
              border: `1px solid rgba(243,242,239,0.35)`,
              borderRadius: 999,
            },
          },
          eyebrow.toUpperCase()
        )
      ),
      stack(
        [
          h(
            "div",
            { style: { fontSize: headline.length > 22 ? 84 : 108, lineHeight: 0.94, fontWeight: 700, letterSpacing: -1, textTransform: "uppercase", maxWidth: 900 } },
            headline
          ),
          detail ? h("div", { style: { fontSize: 30, marginTop: 22, color: "rgba(243,242,239,0.72)", maxWidth: 860, lineHeight: 1.35 } }, detail) : null,
        ],
        { position: "relative" }
      ),
      h(
        "div",
        { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", position: "relative" } },
        h("div", { style: { fontSize: 26, letterSpacing: 2, color: "rgba(243,242,239,0.6)" } }, footnote || brand.tagline),
        price ? h("div", { style: { fontSize: 54, fontWeight: 700, letterSpacing: -1 } }, price) : null
      ),
      h("div", { style: { position: "absolute", left: 0, bottom: 0, width: "100%", height: 10, background: accent, display: "flex" } })
    ),
    { ...OG_SIZE }
  );
}
