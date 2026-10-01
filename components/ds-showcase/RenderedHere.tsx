"use client";

import { useSyncExternalStore } from "react";
import { displayHex } from "@/lib/ds/colour";
import s from "./showcase.module.css";

const noop = () => () => {};

/** `rgb(209, 247, 209)`, `#d1f7d1` or `#fff` -> a full lower-case hex, for comparing like with like. */
function toHex(css: string): string {
  const v = css.trim().toLowerCase();
  // The CSS build minifies custom properties too - a long hex arrives short.
  const short = v.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/);
  if (short) return "#" + short.slice(1).filter(Boolean).map((c) => c + c).join("");
  const m = v.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
  if (!m) return v;
  const h = (n: number) => n.toString(16).padStart(2, "0");
  const a = m[4] === undefined ? "" : h(Math.round(Number(m[4]) * 255));
  return "#" + h(+m[1]) + h(+m[2]) + h(+m[3]) + (a === "ff" ? "" : a);
}

/**
 * Says so when this site renders a token differently from Figma.
 *
 * The cards document the DS. This site loads the Pandai product's layer after
 * Figma's (app/ds/pandai-app.css), and where the product changed a value on
 * purpose, the product wins - so a swatch showing Figma's value would otherwise
 * quietly disagree with every component on the site. Read from the live
 * stylesheet rather than a list, so a future override is caught too.
 */
export function RenderedHere({ cssVar, figma }: { cssVar: string; figma: string }) {
  const here = useSyncExternalStore(
    noop,
    () => toHex(getComputedStyle(document.documentElement).getPropertyValue(cssVar)),
    () => null,
  );
  if (!here || here === figma.toLowerCase()) return null;
  return (
    <span className={`${s.override} type-c1`}>
      <span className={s.overrideDot} style={{ background: `var(${cssVar})` }} aria-hidden="true" />
      This site renders {displayHex(here)} - the Pandai product overrides Figma here
    </span>
  );
}
