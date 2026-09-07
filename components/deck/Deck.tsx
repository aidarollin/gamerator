"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import s from "./deck.module.css";

/**
 * The slide runner for the internal deck.
 *
 * Two things it deliberately does NOT do:
 *
 * 1. **It never calls `preventDefault` on Space or Enter.** That is precisely
 *    the bug that made `/create` unusable - a global key handler that assumed
 *    nothing else on the page wanted those keys. Arrows and PageUp/PageDown
 *    move the deck; everything else is left alone.
 * 2. **It ignores keys aimed at the embedded demos.** Each demo is a real
 *    iframe of the live site, so once it has focus its own key handling belongs
 *    to it - pressing space there should fly the bird, not advance the slide.
 *    An iframe swallows its own keydown events, so this comes for free; the
 *    check on `document.activeElement` covers the moment focus lands on it.
 */

export type Demo = {
  src: string;
  caption: string;
  width: number;
  height: number;
};

export type Slide = {
  kicker: string;
  title: string;
  lead?: string;
  points?: ReactNode[];
  note?: { tone: "plain" | "warn"; body: ReactNode };
  demo?: Demo;
  table?: { head: [string, string]; rows: [string, ReactNode][] };
};

export function Deck({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const go = useCallback(
    (n: number) => setI((cur) => Math.max(0, Math.min(slides.length - 1, cur + n))),
    [slides.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Never steal a key from a field, and never from a focused demo.
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "IFRAME") return;
      if (document.activeElement?.tagName === "IFRAME") return;

      if (e.key === "ArrowRight" || e.key === "PageDown") go(1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
      else if (e.key === "Home") setI(0);
      else if (e.key === "End") setI(slides.length - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, slides.length]);

  const slide = slides[i];

  return (
    <div className={s.shell}>
      <header className={s.bar}>
        <span className={s.brand}>gamerator</span>
        <span className={s.unlisted}>internal · unlisted</span>
        <span className={s.spacer} />
        <span className={s.count}>
          {i + 1} / {slides.length}
        </span>
        <div className={s.nav}>
          <button className={s.btn} onClick={() => go(-1)} disabled={i === 0} aria-label="Previous slide">
            ←
          </button>
          <button
            className={s.btn}
            onClick={() => go(1)}
            disabled={i === slides.length - 1}
            aria-label="Next slide"
          >
            →
          </button>
        </div>
      </header>

      <main className={s.stage}>
        <section className={s.slide} aria-label={`Slide ${i + 1}: ${slide.title}`}>
          <span className={s.kicker}>{slide.kicker}</span>
          <h1 className={s.title}>{slide.title}</h1>
          {slide.lead && <p className={s.lead}>{slide.lead}</p>}

          <div className={slide.demo ? s.split : undefined}>
            <div style={{ display: "grid", gap: "var(--spacing-component-md)" }}>
              {slide.points && (
                <ul className={s.points}>
                  {slide.points.map((p, n) => (
                    <li key={n} className={s.point}>
                      <span className={s.dot}>▸</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}

              {slide.table && (
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>{slide.table.head[0]}</th>
                      <th>{slide.table.head[1]}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slide.table.rows.map(([k, v], n) => (
                      <tr key={n}>
                        <td className={s.mono}>{k}</td>
                        <td>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {slide.note && (
                <div className={slide.note.tone === "warn" ? `${s.note} ${s.warn}` : s.note}>
                  {slide.note.body}
                </div>
              )}
            </div>

            {slide.demo && (
              <figure className={s.demo} style={{ margin: 0 }}>
                <span className={s.live}>
                  <span className={s.pip} /> live
                </span>
                <div className={s.frame} style={{ width: slide.demo.width }}>
                  {/* A real iframe of the deployed route, not a screenshot. A
                      picture of a working demo is not a working demo. */}
                  <iframe
                    key={slide.demo.src}
                    src={slide.demo.src}
                    width={slide.demo.width}
                    height={slide.demo.height}
                    title={slide.demo.caption}
                    loading="lazy"
                  />
                </div>
                <figcaption className={s.caption}>{slide.demo.caption}</figcaption>
              </figure>
            )}
          </div>
        </section>
      </main>

      <nav className={s.rail} aria-label="Slides">
        {slides.map((sl, n) => (
          <button
            key={n}
            className={n === i ? `${s.tick} ${s.tickOn}` : s.tick}
            onClick={() => setI(n)}
            aria-label={`Go to slide ${n + 1}: ${sl.title}`}
            aria-current={n === i ? "true" : undefined}
          />
        ))}
      </nav>
    </div>
  );
}
