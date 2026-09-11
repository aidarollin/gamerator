"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { LiveGame } from "./LiveGame";
import s from "./deck.module.css";

/**
 * The slide runner for the project deck.
 *
 * Rebuilt on 2026-09-11 to be calm and hands-on: one idea a slide, and on most
 * slides something to click - a sentence that becomes a game, a prompt the
 * router answers, a subject that re-skins a game - so a claim is shown rather
 * than read out. Every demo's content comes from `lib/deck.ts`, which runs the
 * real system.
 *
 * THE SLIDE IS A FIXED 1120x630 CANVAS SCALED TO THE SCREEN, like any deck, so
 * a laptop and a projector show the same slide and the DS type roles (the
 * largest is 28px) grow with the room instead of being overridden with sizes
 * the DS does not have. Below 900px wide it stops scaling and flows as a page:
 * a 16:9 slide shrunk onto a phone is unreadable.
 *
 * Kept from the first version, for the same reasons:
 * 1. It never calls `preventDefault` on Space or Enter. A global handler that
 *    assumed nothing else wanted those keys is the bug that once broke /create.
 * 2. It ignores keys aimed at an embedded demo. Each demo is a real iframe of
 *    the live site; once one has focus, its keys belong to the game.
 */

export type Tone = "engine" | "adapt" | "template" | "refuse";

export type Panel =
  | { kind: "game"; src: string; caption: string; tag?: { tone: Tone; text: string } }
  | { kind: "verdict"; asked: string; tone: Tone; label: string; head: string; body: string }
  | { kind: "reject"; reasons: string[]; caption: string }
  | { kind: "code"; code: string; caption: string }
  | { kind: "step"; n: number; who: string; ai?: boolean; title: string; body: string };

export type Slide = {
  kicker: string;
  title: string;
  lead?: string;
  points?: ReactNode[];
  cards?: { k: string; v: string }[];
  cols?: 2 | 3 | 4;
  note?: ReactNode;
  /** Choices on the left that switch the panel on the right. */
  options?: { label: string; panel: Panel }[];
  /** One choice per line - for choices that are whole sentences. */
  stack?: boolean;
  /** Numbered, with arrows between - for choices that are steps. */
  flow?: boolean;
  /** A fixed panel, for a slide without choices. */
  panel?: Panel;
};

const W = 1120;
const H = 630;

const TONE: Record<Tone, string> = {
  engine: s.tEngine,
  adapt: s.tAdapt,
  template: s.tTemplate,
  refuse: s.tRefuse,
};
const COLS = { 2: s.cols2, 3: s.cols3, 4: s.cols4 } as const;
const two = (n: number) => String(n).padStart(2, "0");

export function Deck({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [fit, setFit] = useState({ flow: false, scale: 1 });
  const [ready, setReady] = useState(false);
  const viewport = useRef<HTMLElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const slide = slides[i];
  const options = slide.options;
  const pick = options ? Math.min(picks[i] ?? 0, options.length - 1) : 0;
  const panel = options ? options[pick].panel : slide.panel;

  const go = useCallback(
    (n: number) => setI((cur) => Math.max(0, Math.min(slides.length - 1, cur + n))),
    [slides.length],
  );
  const choose = useCallback((n: number) => setPicks((p) => ({ ...p, [i]: n })), [i]);

  // Scale the canvas to the room. The observer's first report is the initial
  // measurement, so nothing is set synchronously here.
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const measure = () => {
      if (window.innerWidth < 900 || window.innerHeight < 480) {
        setFit({ flow: true, scale: 1 });
      } else {
        const r = el.getBoundingClientRect();
        setFit({ flow: false, scale: Math.max(0.3, Math.min((r.width - 48) / W, (r.height - 16) / H)) });
      }
      setReady(true);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Never steal a key from a field, and never from a focused demo.
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "IFRAME") return;
      if (document.activeElement?.tagName === "IFRAME") return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      if (e.key === "ArrowRight" || e.key === "PageDown") go(1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
      else if (e.key === "Home") setI(0);
      else if (e.key === "End") setI(slides.length - 1);
      else if (options && /^[1-9]$/.test(e.key) && Number(e.key) <= options.length)
        choose(Number(e.key) - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, choose, options, slides.length]);

  return (
    <div className={fit.flow ? `${s.shell} ${s.shellFlow}` : s.shell}>
      <div className={s.progress} aria-hidden="true">
        <span style={{ width: `${((i + 1) / slides.length) * 100}%` }} />
      </div>

      <header className={s.bar}>
        <span className={s.brand}>gamerator</span>
        <span className={s.unlisted}>unlisted</span>
        <span className={s.spacer} />
        <span className={s.count}>
          {two(i + 1)} / {two(slides.length)}
        </span>
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
      </header>

      <main
        ref={viewport}
        className={fit.flow ? `${s.viewport} ${s.viewportFlow}` : s.viewport}
        style={{ visibility: ready ? "visible" : "hidden" }}
        // A sideways swipe changes slide on a touch screen. The demos are
        // iframes and keep their own touches, so playing never turns a page.
        onPointerDown={(e) => {
          if (e.pointerType !== "touch" || (e.target as HTMLElement).closest("button")) return;
          swipe.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const from = swipe.current;
          swipe.current = null;
          if (!from) return;
          const dx = e.clientX - from.x;
          const dy = e.clientY - from.y;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => {
          swipe.current = null;
        }}
      >
        <div
          className={s.scaler}
          style={fit.flow ? undefined : { width: W * fit.scale, height: H * fit.scale }}
        >
          <div
            className={fit.flow ? `${s.canvas} ${s.canvasFlow}` : s.canvas}
            style={fit.flow ? undefined : { width: W, height: H, transform: `scale(${fit.scale})` }}
          >
            <section
              key={i}
              className={`${panel ? s.split : s.single} ${s.enter}`}
              aria-label={`Slide ${i + 1}: ${slide.title}`}
            >
              <div className={s.copy}>
                <span className={s.kicker}>{slide.kicker}</span>
                <h1 className={s.title}>{slide.title}</h1>
                {slide.lead && <p className={s.lead}>{slide.lead}</p>}
                {slide.points && (
                  <ul className={s.points}>
                    {slide.points.map((p, n) => (
                      <li key={n} className={s.point}>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {slide.cards && (
                  <div className={`${s.cards} ${COLS[slide.cols ?? 3]}`}>
                    {slide.cards.map((c) => (
                      <div key={c.k} className={s.card}>
                        <span className={s.cardK}>{c.k}</span>
                        <span className={s.cardV}>{c.v}</span>
                      </div>
                    ))}
                  </div>
                )}
                {options && <Options slide={slide} pick={pick} choose={choose} />}
                {slide.note && <p className={s.note}>{slide.note}</p>}
              </div>

              {panel && (
                <div key={`${i}:${pick}`} className={`${s.panelCol} ${s.fade}`}>
                  <PanelView panel={panel} />
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <nav className={s.rail} aria-label="Slides">
        {slides.map((sl, n) => (
          <button
            key={n}
            className={n === i ? `${s.dot} ${s.dotOn}` : s.dot}
            onClick={() => setI(n)}
            aria-label={`Go to slide ${n + 1}: ${sl.title}`}
            aria-current={n === i ? "step" : undefined}
            title={sl.title}
          />
        ))}
        <span className={s.keys}>
          ← → to move{options ? ` · 1–${Math.min(9, options.length)} to try` : ""}
        </span>
      </nav>
    </div>
  );
}

function Options({ slide, pick, choose }: { slide: Slide; pick: number; choose: (n: number) => void }) {
  const options = slide.options ?? [];
  const chip = (label: string, n: number) => (
    <button
      key={n}
      type="button"
      className={n === pick ? `${s.chip} ${s.chipOn}` : s.chip}
      aria-pressed={n === pick}
      onClick={() => choose(n)}
    >
      {slide.flow && <span className={s.chipNum}>{n + 1}</span>}
      {label}
    </button>
  );

  if (slide.flow) {
    return (
      <div className={s.flow}>
        {options.map((o, n) => (
          <Fragment key={n}>
            {n > 0 && (
              <span className={s.arrow} aria-hidden="true">
                ↓
              </span>
            )}
            {chip(o.label, n)}
          </Fragment>
        ))}
      </div>
    );
  }
  return (
    <div className={slide.stack ? `${s.chips} ${s.stack}` : s.chips}>
      {options.map((o, n) => chip(o.label, n))}
    </div>
  );
}

function PanelView({ panel }: { panel: Panel }) {
  switch (panel.kind) {
    case "game":
      return (
        <figure className={s.figure}>
          <LiveGame key={panel.src} src={panel.src} title={panel.caption} />
          <figcaption className={s.caption}>
            {panel.tag && <span className={`${s.tag} ${TONE[panel.tag.tone]}`}>{panel.tag.text}</span>}
            <span>{panel.caption}</span>
          </figcaption>
        </figure>
      );
    case "verdict":
      return (
        <div className={`${s.box} ${TONE[panel.tone]}`}>
          <span className={s.asked}>You asked for “{panel.asked}”</span>
          <span className={s.label}>{panel.label}</span>
          <h2 className={s.head}>{panel.head}</h2>
          <p className={s.body}>{panel.body}</p>
        </div>
      );
    case "reject":
      return (
        <div className={`${s.box} ${s.tRefuse}`}>
          <span className={s.label}>Rejected before anyone played it</span>
          <ul className={s.reasons}>
            {panel.reasons.map((r, n) => (
              <li key={n}>{r}</li>
            ))}
          </ul>
          <p className={s.fine}>{panel.caption}</p>
        </div>
      );
    case "code":
      return (
        <figure className={s.figure}>
          <pre className={s.code}>
            {panel.code.split("\n").map((line, n) => (
              <CodeLine key={n} text={line} />
            ))}
          </pre>
          <figcaption className={s.caption}>
            <span>{panel.caption}</span>
          </figcaption>
        </figure>
      );
    case "step":
      return (
        <div className={s.box}>
          <div className={s.stepTop}>
            <span className={s.stepNum}>{panel.n}</span>
            <span className={panel.ai ? `${s.who} ${s.whoAi}` : s.who}>{panel.who}</span>
          </div>
          <h2 className={s.head}>{panel.title}</h2>
          <p className={s.body}>{panel.body}</p>
        </div>
      );
  }
}

/** One line of JSON, with its key picked out. */
function CodeLine({ text }: { text: string }) {
  const m = text.match(/^(\s*)("[^"]+")(:\s?)(.*)$/);
  if (!m) return <span className={s.codeLine}>{text}</span>;
  return (
    <span className={s.codeLine}>
      {m[1]}
      <span className={s.codeKey}>{m[2]}</span>
      {m[3]}
      <span className={s.codeVal}>{m[4]}</span>
    </span>
  );
}
