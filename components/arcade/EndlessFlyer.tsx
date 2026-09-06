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
import { CHARACTERS, loadCharacter, type Mood } from "./characters";
import a from "./arcade.module.css";

/**
 * Flappy Bird, Pandai-skinned.
 *
 * Three rules this engine follows that are easy to get wrong:
 *
 * 1. **The level comes from `gapCentres`, the same function the validator
 *    simulates.** Generate obstacles any other way and the playability check is
 *    verifying a game nobody plays.
 * 2. **No colour is written here.** Canvas needs real values, so they are read
 *    from the DS custom properties, with generated literals as the fallback.
 * 3. **Physics runs on a fixed timestep**, so the game is not harder on a slow
 *    phone than on a fast laptop.
 */

const STEP = 1 / 120;

type Phase = "ready" | "playing" | "dead";
type Particle = { x: number; y: number; vx: number; vy: number; life: number };

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

  const art = CHARACTERS[spec.theme.character];

  const game = useRef({
    y: WORLD.height / 2,
    vy: 0,
    dist: 0,
    dead: false,
    phase: "ready" as Phase,
    shake: 0,
    pop: 0,
    flapAnim: 0,
    particles: [] as Particle[],
    t: 0,
  });
  const flapQueued = useRef(false);
  const sprites = useRef<Record<Mood, HTMLImageElement> | null>(null);
  const scoreRef = useRef(0);

  const enter = useCallback((next: Phase) => {
    game.current.phase = next;
    setPhase(next);
  }, []);

  const isSubject = (SUBJECT_KEYS as readonly string[]).includes(
    spec.theme.palette,
  );
  const ramp = isSubject
    ? subjectRamp(spec.theme.palette as (typeof SUBJECT_KEYS)[number])
    : accentRamp(spec.theme.palette as never);

  const reset = useCallback(() => {
    game.current = {
      y: WORLD.height / 2, vy: 0, dist: 0, dead: false, phase: "ready",
      shake: 0, pop: 0, flapAnim: 0, particles: [], t: 0,
    };
    scoreRef.current = 0;
    setScore(0);
    setLives(spec.rules.lives);
    enter("ready");
  }, [spec.rules.lives, enter]);

  const flap = useCallback(() => {
    if (phase === "dead") return reset();
    if (phase === "ready") enter("playing");
    flapQueued.current = true;
  }, [phase, reset, enter]);

  useEffect(() => {
    let alive = true;
    loadCharacter(spec.theme.character).then((imgs) => {
      if (alive) sprites.current = imgs;
    });
    return () => {
      alive = false;
    };
  }, [spec.theme.character]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const c = {
      obstacle: readToken(host, ramp.default),
      obstacleEdge: readToken(host, ramp.focus),
      sky: readToken(host, ramp.subtle),
      skyDeep: readToken(host, ramp.subtleHover),
      ground: readToken(host, "--surface-tertiary-default"),
      groundEdge: readToken(host, "--surface-tertiary-focus"),
      ink: readToken(host, "--text-default-heading"),
      spark: readToken(host, "--status-coins-default"),
      white: readToken(host, "--surface-general-default"),
    };

    const centres = gapCentres(spec.rules, 400);
    const r = spec.rules;
    const GROUND = 34;
    const floor = WORLD.height - GROUND;

    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const die = () => {
      const g = game.current;
      if (g.dead) return;
      g.dead = true;
      g.shake = 1;
      for (let i = 0; i < 14; i++) {
        g.particles.push({
          x: SIM.birdX,
          y: g.y,
          vx: (Math.random() - 0.5) * 260,
          vy: (Math.random() - 0.7) * 260,
          life: 1,
        });
      }
      setLives((l) => {
        const left = l - 1;
        if (left <= 0) enter("dead");
        else
          window.setTimeout(() => {
            const gg = game.current;
            gg.y = WORLD.height / 2;
            gg.vy = 0;
            gg.dead = false;
          }, 600);
        return left;
      });
    };

    const step = () => {
      const g = game.current;
      g.t += STEP;
      g.shake = Math.max(0, g.shake - STEP * 3);
      g.pop = Math.max(0, g.pop - STEP * 4);
      g.flapAnim = Math.max(0, g.flapAnim - STEP * 5);

      for (const p of g.particles) {
        p.vy += 900 * STEP;
        p.x += p.vx * STEP;
        p.y += p.vy * STEP;
        p.life -= STEP * 1.4;
      }
      g.particles = g.particles.filter((p) => p.life > 0);

      if (flapQueued.current) {
        flapQueued.current = false;
        if (!g.dead && g.phase === "playing") {
          g.vy = r.flapVelocity;
          g.flapAnim = 1;
        }
      }
      if (g.phase !== "playing" || g.dead) return;

      g.vy += r.gravity * STEP;
      g.y += g.vy * STEP;
      g.dist += r.scrollSpeed * STEP;

      if (g.y - art.radius <= 0) {
        g.y = art.radius;
        g.vy = 0;
      }
      if (g.y + art.radius >= floor) {
        g.y = floor - art.radius;
        die();
        return;
      }

      const idx = Math.floor(g.dist / r.gapSpacing);
      const crossing =
        g.dist - idx * r.gapSpacing < r.scrollSpeed * STEP && idx > 0;
      if (crossing) {
        const centre = centres[idx % centres.length];
        const half = r.gapHeight / 2;
        if (g.y - art.radius < centre - half || g.y + art.radius > centre + half) {
          die();
          return;
        }
        g.pop = 1;
        scoreRef.current += spec.scoring.pointsPerObstacle;
        const next = scoreRef.current;
        setScore(next);
        setBest((b) => (next > b ? next : b));
      }
    };

    const roundRect = (x: number, y: number, w: number, h: number, rad: number) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, rad);
      ctx.fill();
    };

    const draw = () => {
      const g = game.current;
      ctx.save();
      if (g.shake > 0) {
        ctx.translate(
          (Math.random() - 0.5) * 10 * g.shake,
          (Math.random() - 0.5) * 10 * g.shake,
        );
      }

      const grad = ctx.createLinearGradient(0, 0, 0, WORLD.height);
      grad.addColorStop(0, c.sky);
      grad.addColorStop(1, c.skyDeep);
      ctx.fillStyle = grad;
      ctx.fillRect(-20, -20, WORLD.width + 40, WORLD.height + 40);

      // Parallax hills at a third of world speed - depth for almost nothing.
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = c.obstacle;
      const hillOff = (g.dist * 0.3) % 180;
      for (let i = -1; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(i * 180 - hillOff + 90, floor + 44, 92, Math.PI, 0);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const first = Math.floor(g.dist / r.gapSpacing);
      for (let i = first; i <= first + 4; i++) {
        if (i <= 0) continue;
        const centre = centres[i % centres.length];
        const half = r.gapHeight / 2;
        const x = SIM.birdX + i * r.gapSpacing - g.dist;
        if (x < -70 || x > WORLD.width + 70) continue;
        const w = 52;
        ctx.fillStyle = c.obstacle;
        roundRect(x - w / 2, -20, w, centre - half + 20, 10);
        roundRect(x - w / 2, centre + half, w, floor - (centre + half), 10);
        ctx.fillStyle = c.obstacleEdge;
        roundRect(x - w / 2 - 4, centre - half - 16, w + 8, 16, 6);
        roundRect(x - w / 2 - 4, centre + half, w + 8, 16, 6);
      }

      // Ground scrolls at world speed, so motion reads even mid-gap.
      ctx.fillStyle = c.ground;
      ctx.fillRect(0, floor, WORLD.width, GROUND);
      ctx.fillStyle = c.groundEdge;
      const tick = g.dist % 24;
      for (let x = -tick; x < WORLD.width; x += 24) ctx.fillRect(x, floor, 12, 4);

      for (const p of g.particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = c.spark;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5 * p.life + 1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const mood: Mood = g.dead ? "dead" : g.phase === "ready" ? "idle" : "flying";
      const img = sprites.current?.[mood];
      const tilt = Math.max(-0.45, Math.min(1.0, g.vy / 650));
      const bob = g.phase === "ready" ? Math.sin(g.t * 3) * 6 : 0;
      const squash = 1 + g.flapAnim * 0.12;

      ctx.save();
      ctx.translate(SIM.birdX, g.y + bob);
      ctx.rotate(g.dead ? tilt + g.t * 2 : tilt);
      ctx.scale(1 / squash, squash);
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, -art.size / 2, -art.size / 2, art.size, art.size);
      } else {
        // Asset missing: a shape, not a blank frame.
        ctx.fillStyle = c.white;
        ctx.strokeStyle = c.obstacleEdge;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, art.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      // Score is drawn in-world, so it belongs to the game rather than the page.
      if (g.phase === "playing") {
        const scale = 1 + g.pop * 0.35;
        ctx.save();
        ctx.translate(WORLD.width / 2, 78);
        ctx.scale(scale, scale);
        ctx.textAlign = "center";
        ctx.font = "700 46px system-ui, sans-serif";
        ctx.lineWidth = 8;
        ctx.strokeStyle = c.white;
        ctx.strokeText(String(scoreRef.current), 0, 0);
        ctx.fillStyle = c.ink;
        ctx.fillText(String(scoreRef.current), 0, 0);
        ctx.restore();
      }

      ctx.restore();
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
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
  }, [spec, ramp, enter, art]);

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

  const beatTarget = score >= spec.scoring.targetScore;

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
            <span key={i} className={i < lives ? a.heart : a.heartSpent}>
              ♥
            </span>
          ))}
        </div>

        {phase === "playing" ? (
          <button className={a.tapZone} onClick={flap} aria-label="Flap" />
        ) : (
          <div className={a.overlay}>
            <div className={a.panel}>
              {phase === "ready" ? (
                <>
                  <span className={a.panelTitle}>{spec.meta.title}</span>
                  <span className={a.panelBody}>{spec.meta.description}</span>
                  <span className={a.panelHint}>
                    Tap, click or press space to fly {art.label}
                  </span>
                </>
              ) : (
                <>
                  <span className={a.panelTitle}>
                    {beatTarget ? "Target beaten" : "Game over"}
                  </span>
                  <span className={a.bigScore}>{score}</span>
                  <span className={a.panelBody}>
                    best {best} · target {spec.scoring.targetScore}
                  </span>
                </>
              )}
              <button className={a.cta} onClick={flap} autoFocus>
                {phase === "ready" ? "Play" : "Play again"}
              </button>
            </div>
          </div>
        )}
      </div>

      {spec.contentTwist && <p className={a.twist}>{spec.contentTwist.prompt}</p>}
    </div>
  );
}
