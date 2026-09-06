"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EndlessFlyerSpec } from "@/lib/arcade/schema";
import { WORLD } from "@/lib/arcade/schema";
import { gapCentres, SIM } from "@/lib/arcade/simulate";
import {
  subjectRamp,
  accentRamp,
  SUBJECT_KEYS,
  VAR_VALUES,
} from "@/lib/ds/tokens.generated";
import a from "./arcade.module.css";

/**
 * Flappy Bird, Pandai-skinned.
 *
 * Two rules this engine follows that are easy to get wrong:
 *
 * 1. **The level comes from `gapCentres`, the same function the validator
 *    simulates.** If the renderer generated its obstacles any other way, the
 *    playability check would be verifying a game nobody plays.
 *
 * 2. **No colour is written here.** Canvas needs real values, not `var(--x)`,
 *    so they are read from the DS custom properties at mount. That keeps
 *    `check:ds` honest and means a token change reaches the game for free.
 */

const STEP = 1 / 120;

type Phase = "ready" | "playing" | "dead";

/**
 * Canvas needs a real colour, not a var() reference.
 *
 * Read it from the live stylesheet so a token change reaches the game for free,
 * and fall back to the generated literal when the read comes back empty - which
 * happens on an unmounted node and in headless renders. The fallback is DS data
 * from lib/ds/tokens.generated.ts; no colour is written here, which is what
 * keeps `check:ds` honest.
 */
function readToken(el: HTMLElement, cssVar: string) {
  const name = cssVar.startsWith("var(")
    ? cssVar.slice(4, -1).split(",")[0].trim()
    : cssVar;
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  return value || VAR_VALUES[name] || "transparent";
}

export function EndlessFlyer({ spec }: { spec: EndlessFlyerSpec }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(spec.rules.lives);

  // Mutable game state lives in a ref: it changes 120 times a second and must
  // not drive React renders. Only score, lives and phase are state.
  // `phase` lives here as well as in state: the loop reads it 120 times a
  // second and must not re-subscribe, and React 19 rightly refuses a second ref
  // written from an effect just to mirror state.
  const game = useRef({
    y: WORLD.height / 2,
    vy: 0,
    dist: 0,
    passed: 0,
    dead: false,
    phase: "ready" as Phase,
  });

  const enter = useCallback((next: Phase) => {
    game.current.phase = next;
    setPhase(next);
  }, []);
  const flapQueued = useRef(false);

  const isSubject = (SUBJECT_KEYS as readonly string[]).includes(
    spec.theme.palette,
  );
  const ramp = isSubject
    ? subjectRamp(spec.theme.palette as (typeof SUBJECT_KEYS)[number])
    : accentRamp(spec.theme.palette as never);

  const reset = useCallback(() => {
    game.current = {
      y: WORLD.height / 2, vy: 0, dist: 0, passed: 0, dead: false, phase: "ready",
    };
    setScore(0);
    setLives(spec.rules.lives);
    enter("ready");
  }, [spec.rules.lives, enter]);

  const flap = useCallback(() => {
    if (phase === "dead") {
      reset();
      return;
    }
    if (phase === "ready") enter("playing");
    flapQueued.current = true;
  }, [phase, reset, enter]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colours = {
      obstacle: readToken(host, ramp.default),
      obstacleEdge: readToken(host, ramp.focus),
      sky: readToken(host, ramp.subtle),
      player: readToken(host, "--surface-general-default"),
      playerEdge: readToken(host, ramp.focus),
      ground: readToken(host, "--surface-tertiary-default"),
      ink: readToken(host, "--text-default-heading"),
    };

    // Enough centres for a long run; the level repeats past this, which no
    // player will reach and which keeps memory flat.
    const centres = gapCentres(spec.rules, 400);
    const r = spec.rules;

    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const step = () => {
      const g = game.current;
      if (flapQueued.current) {
        flapQueued.current = false;
        if (!g.dead) g.vy = r.flapVelocity;
      }
      if (g.phase !== "playing" || g.dead) return;

      g.vy += r.gravity * STEP;
      g.y += g.vy * STEP;
      g.dist += r.scrollSpeed * STEP;

      if (g.y - WORLD.birdRadius <= 0) {
        g.y = WORLD.birdRadius;
        g.vy = 0;
      }
      if (g.y + WORLD.birdRadius >= WORLD.height) {
        g.y = WORLD.height - WORLD.birdRadius;
        die();
        return;
      }

      // The obstacle whose plane the player is crossing this step.
      const idx = Math.floor(g.dist / r.gapSpacing);
      const withinPlane =
        g.dist - idx * r.gapSpacing < r.scrollSpeed * STEP && idx > 0;
      if (withinPlane) {
        const centre = centres[idx % centres.length];
        const half = r.gapHeight / 2;
        if (
          g.y - WORLD.birdRadius < centre - half ||
          g.y + WORLD.birdRadius > centre + half
        ) {
          die();
          return;
        }
        g.passed += 1;
        setScore((s) => {
          const next = s + spec.scoring.pointsPerObstacle;
          setBest((b) => (next > b ? next : b));
          return next;
        });
      }
    };

    const die = () => {
      const g = game.current;
      g.dead = true;
      setLives((l) => {
        const left = l - 1;
        if (left <= 0) {
          enter("dead");
        } else {
          // Respawn mid-screen and carry on, rather than ending the run.
          window.setTimeout(() => {
            game.current = { ...game.current, y: WORLD.height / 2, vy: 0, dead: false };
          }, 500);
        }
        return left;
      });
    };

    const draw = () => {
      const g = game.current;
      ctx.fillStyle = colours.sky;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);

      const first = Math.floor(g.dist / r.gapSpacing);
      for (let i = first; i <= first + 4; i++) {
        if (i <= 0) continue;
        const centre = centres[i % centres.length];
        const half = r.gapHeight / 2;
        const x = SIM.birdX + i * r.gapSpacing - g.dist;
        if (x < -60 || x > WORLD.width + 60) continue;
        const w = 46;
        ctx.fillStyle = colours.obstacle;
        ctx.fillRect(x - w / 2, 0, w, centre - half);
        ctx.fillRect(x - w / 2, centre + half, w, WORLD.height - (centre + half));
        ctx.fillStyle = colours.obstacleEdge;
        ctx.fillRect(x - w / 2 - 3, centre - half - 12, w + 6, 12);
        ctx.fillRect(x - w / 2 - 3, centre + half, w + 6, 12);
      }

      ctx.fillStyle = colours.ground;
      ctx.fillRect(0, WORLD.height - 6, WORLD.width, 6);

      // The player. A disc with an eye and a beak - readable at any size, and
      // drawn rather than sprited so the game needs no art to ship.
      const tilt = Math.max(-0.5, Math.min(1.1, g.vy / 600));
      ctx.save();
      ctx.translate(SIM.birdX, g.y);
      ctx.rotate(tilt);
      ctx.fillStyle = colours.player;
      ctx.strokeStyle = colours.playerEdge;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, WORLD.birdRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = colours.playerEdge;
      ctx.beginPath();
      ctx.arc(5, -4, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(WORLD.birdRadius - 2, 1);
      ctx.lineTo(WORLD.birdRadius + 7, 4);
      ctx.lineTo(WORLD.birdRadius - 2, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      // Fixed-timestep accumulator: physics must not depend on frame rate, or
      // the game is harder on a slow phone than on a fast laptop. Clamped so a
      // backgrounded tab does not resume by simulating ten seconds at once.
      acc += Math.min(0.25, (now - last) / 1000);
      last = now;
      while (acc >= STEP) {
        step();
        acc -= STEP;
      }
      draw();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [spec, ramp, enter]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "Enter") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flap]);

  return (
    <div className={a.frame} ref={hostRef}>
      <div className={a.hud}>
        <span className={a.score}>{score}</span>
        <span className={a.lives} aria-label={`${lives} lives left`}>
          {"♥".repeat(Math.max(0, lives))}
        </span>
        <span className={a.best}>best {best}</span>
      </div>

      <div className={a.stage}>
        <canvas
          ref={canvasRef}
          width={WORLD.width}
          height={WORLD.height}
          className={a.canvas}
          aria-label={spec.meta.description || spec.meta.title}
        />
        {phase !== "playing" && (
          <button className={a.overlay} onClick={flap} autoFocus>
            <span className={a.overlayTitle}>
              {phase === "ready" ? spec.meta.title : "Try again"}
            </span>
            <span className={a.overlayHint}>
              {phase === "ready"
                ? "Tap, click or press space to fly"
                : `You scored ${score}`}
            </span>
          </button>
        )}
        {phase === "playing" && (
          // Full-stage tap target: one thumb, no keyboard assumed.
          <button className={a.tapZone} onClick={flap} aria-label="Flap" />
        )}
      </div>

      {spec.contentTwist && (
        <p className={a.twist}>{spec.contentTwist.prompt}</p>
      )}
    </div>
  );
}
