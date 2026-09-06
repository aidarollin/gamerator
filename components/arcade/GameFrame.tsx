"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ArcadeSpec } from "@/lib/arcade/schema";
import { WORLD } from "@/lib/arcade/schema";
import {
  subjectRamp,
  accentRamp,
  SUBJECT_KEYS,
  VAR_VALUES,
} from "@/lib/ds/tokens.generated";
import { loadCharacter, CHARACTERS, type Mood } from "./characters";
import { shade, type Palette } from "./paint";
import a from "./arcade.module.css";

/**
 * The shell every engine shares: canvas, palette, fixed-timestep loop, input,
 * lives, and the title / game-over screens.
 *
 * Written once so an engine is only its own logic. It also means a fix to the
 * feel - and there were several - lands on all five engines at once instead of
 * being reimplemented four times and drifting.
 */

const STEP = 1 / 120;

export type Phase = "ready" | "playing" | "dead";

export type EngineHost = {
  ctx: CanvasRenderingContext2D;
  palette: Palette;
  paint: ReturnType<typeof shade>;
  sprites: () => Record<Mood, HTMLImageElement> | null;
  addScore: (n: number) => void;
  score: () => number;
  loseLife: () => void;
  finish: () => void;
  shake: (amount?: number) => void;
  phase: () => Phase;
};

export type Engine = {
  step: (dt: number) => void;
  draw: () => void;
  /** A pointer or key press. `where` is in world coordinates for pointers. */
  input: (kind: "press" | "release", where?: { x: number; y: number }) => void;
  reset: () => void;
};

export type EngineFactory = (host: EngineHost, spec: ArcadeSpec) => Engine;

function readToken(el: HTMLElement, cssVar: string) {
  const name = cssVar.startsWith("var(")
    ? cssVar.slice(4, -1).split(",")[0].trim()
    : cssVar;
  return getComputedStyle(el).getPropertyValue(name).trim() || VAR_VALUES[name] || "transparent";
}

export function GameFrame({
  spec,
  hint,
  factory,
}: {
  spec: ArcadeSpec;
  hint: string;
  factory: EngineFactory;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(spec.rules.lives);

  const art = CHARACTERS[spec.theme.character];
  const sprites = useRef<Record<Mood, HTMLImageElement> | null>(null);
  const state = useRef({ phase: "ready" as Phase, score: 0, lives: spec.rules.lives, shake: 0 });
  const engineRef = useRef<Engine | null>(null);
  const pending = useRef<{ kind: "press" | "release"; where?: { x: number; y: number } }[]>([]);

  const enter = useCallback((p: Phase) => {
    state.current.phase = p;
    setPhase(p);
  }, []);

  const start = useCallback(() => {
    if (state.current.phase === "dead") {
      state.current = { phase: "ready", score: 0, lives: spec.rules.lives, shake: 0 };
      setScore(0);
      setLives(spec.rules.lives);
      engineRef.current?.reset();
      enter("ready");
      return;
    }
    if (state.current.phase === "ready") enter("playing");
  }, [enter, spec.rules.lives]);

  useEffect(() => {
    let live = true;
    loadCharacter(spec.theme.character).then((s) => {
      if (live) sprites.current = s;
    });
    return () => {
      live = false;
    };
  }, [spec.theme.character]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isSubject = (SUBJECT_KEYS as readonly string[]).includes(spec.theme.palette);
    const ramp = isSubject
      ? subjectRamp(spec.theme.palette as (typeof SUBJECT_KEYS)[number])
      : accentRamp(spec.theme.palette as never);

    // The saturated end of the ramp, not the pale end. This one choice is most
    // of the difference between "a game" and "a component demo".
    const palette: Palette = {
      deep: readToken(host, ramp.focus),
      mid: readToken(host, ramp.default),
      light: readToken(host, ramp.subtleHover),
      edge: readToken(host, ramp.hover),
      ink: readToken(host, "--text-default-heading"),
      white: readToken(host, "--surface-general-default"),
      gold: readToken(host, "--status-coins-default"),
      danger: readToken(host, "--surface-warning-default"),
    };

    const hostApi: EngineHost = {
      ctx,
      palette,
      paint: shade(ctx),
      sprites: () => sprites.current,
      addScore: (n) => {
        state.current.score += n;
        setScore(state.current.score);
        setBest((b) => (state.current.score > b ? state.current.score : b));
      },
      score: () => state.current.score,
      loseLife: () => {
        state.current.lives -= 1;
        setLives(state.current.lives);
        if (state.current.lives <= 0) enter("dead");
      },
      finish: () => enter("dead"),
      shake: (amount = 1) => {
        state.current.shake = amount;
      },
      phase: () => state.current.phase,
    };

    const engine = factory(hostApi, spec);
    engineRef.current = engine;
    engine.reset();

    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      acc += Math.min(0.25, (now - last) / 1000);
      last = now;
      while (acc >= STEP) {
        for (const ev of pending.current) engine.input(ev.kind, ev.where);
        pending.current = [];
        state.current.shake = Math.max(0, state.current.shake - STEP * 3);
        if (state.current.phase === "playing") engine.step(STEP);
        acc -= STEP;
      }
      ctx.save();
      if (state.current.shake > 0) {
        const s = state.current.shake;
        ctx.translate((Math.random() - 0.5) * 11 * s, (Math.random() - 0.5) * 11 * s);
      }
      engine.draw();
      ctx.restore();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [spec, factory, enter]);

  const toWorld = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * WORLD.width,
      y: ((e.clientY - r.top) / r.height) * WORLD.height,
    };
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (["Space", "ArrowUp", "Enter", "ArrowLeft", "ArrowRight", "ArrowDown"].includes(e.code)) {
        e.preventDefault();
        if (state.current.phase !== "playing") return start();
        const map: Record<string, { x: number; y: number }> = {
          ArrowLeft: { x: 0, y: WORLD.height / 2 },
          ArrowRight: { x: WORLD.width, y: WORLD.height / 2 },
          ArrowUp: { x: WORLD.width / 2, y: 0 },
          ArrowDown: { x: WORLD.width / 2, y: WORLD.height },
        };
        pending.current.push({ kind: "press", where: map[e.code] });
      }
    };
    const up = () => pending.current.push({ kind: "release" });
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [start]);

  const beat = score >= spec.scoring.targetScore;

  return (
    <div className={a.frame} ref={hostRef}>
      <div className={a.stage}>
        <canvas
          ref={canvasRef}
          width={WORLD.width}
          height={WORLD.height}
          className={a.canvas}
          aria-label={spec.meta.description || spec.meta.title}
        />

        <div className={a.lives} aria-label={`${lives} lives left`}>
          {Array.from({ length: spec.rules.lives }).map((_, i) => (
            <span key={i} className={i < lives ? a.heart : a.heartSpent}>♥</span>
          ))}
        </div>

        {phase === "playing" ? (
          <div
            className={a.tapZone}
            onPointerDown={(e) => pending.current.push({ kind: "press", where: toWorld(e) })}
            onPointerMove={(e) => {
              if (e.buttons > 0 || e.pointerType === "touch")
                pending.current.push({ kind: "press", where: toWorld(e) });
            }}
            onPointerUp={() => pending.current.push({ kind: "release" })}
          />
        ) : (
          <div className={a.overlay}>
            <div className={a.panel}>
              {phase === "ready" ? (
                <>
                  <span className={a.panelTitle}>{spec.meta.title}</span>
                  <span className={a.panelBody}>{spec.meta.description}</span>
                  <span className={a.panelHint}>{hint}</span>
                </>
              ) : (
                <>
                  <span className={a.panelTitle}>{beat ? "Target beaten!" : "Game over"}</span>
                  <span className={a.bigScore}>{score}</span>
                  <span className={a.panelBody}>
                    best {best} · target {spec.scoring.targetScore}
                  </span>
                </>
              )}
              <button className={a.cta} onClick={start} autoFocus>
                {phase === "ready" ? "Play" : "Play again"}
              </button>
            </div>
          </div>
        )}
      </div>

      {spec.contentTwist && <p className={a.twist}>{spec.contentTwist.prompt}</p>}
      <p className={a.credit}>{art.label} · {spec.theme.palette}</p>
    </div>
  );
}
