"use client";

import { useEffect, useRef, useState } from "react";
import s from "./deck.module.css";

/**
 * A live demo exactly as big as the game inside it, and never scrollable.
 *
 * The first deck gave every iframe a guessed height, so a demo either scrolled
 * inside its own box or sat in a slab of empty page. This frame reads the
 * height off the embedded page's `[data-fit]` box (same origin, so it can) and
 * follows it with a ResizeObserver - fonts and sprites arriving, or a thumb pad
 * appearing on a touch screen.
 */

/** /embed's padding: room round the game for its drop shadow. */
const ROOM = 24;

/** Until the frame reports: a 2:3 stage, the credit line under it, the room. */
const guess = (width: number) => Math.round((width - 2 * ROOM) * 1.5 + 26 + 2 * ROOM);

type Win = Window & typeof globalThis;

export function LiveGame({ src, title, width = 316 }: { src: string; title: string; width?: number }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const stop = useRef<(() => void) | null>(null);
  const [height, setHeight] = useState(() => guess(width));
  const [shown, setShown] = useState(false);

  const fit = () => {
    stop.current?.();
    stop.current = null;
    setShown(true);
    let win: Win | null = null;
    let box: HTMLElement | null = null;
    try {
      win = frame.current?.contentWindow as Win | null;
      box = win?.document.querySelector<HTMLElement>("[data-fit]") ?? null;
    } catch {
      return; // Not same-origin after all: keep the guess rather than throw.
    }
    const wrap = box?.parentElement;
    // Measured, never styled from here: touching the embedded page's DOM
    // before React hydrates it is a hydration mismatch.
    if (!win || !box || !wrap) return;
    const measure = () => {
      const cs = win.getComputedStyle(wrap);
      const h =
        box.getBoundingClientRect().height + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      setHeight(Math.ceil(h));
    };
    measure();
    const ro = new win.ResizeObserver(measure);
    ro.observe(box);
    stop.current = () => ro.disconnect();
  };

  // The first slide is server-rendered, so its frame can finish loading before
  // React is listening for `load`. Catch that one on mount.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const doc = frame.current?.contentDocument;
      if (doc?.readyState === "complete" && doc.querySelector("[data-fit]")) fit();
    });
    return () => {
      cancelAnimationFrame(id);
      stop.current?.();
    };
  }, []);

  return (
    <iframe
      ref={frame}
      src={src}
      title={title}
      width={width}
      height={height}
      className={s.game}
      style={{ opacity: shown ? 1 : 0 }}
      onLoad={fit}
      scrolling="no"
      allow="autoplay; fullscreen"
      allowFullScreen
    />
  );
}
