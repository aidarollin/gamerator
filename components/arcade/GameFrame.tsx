"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ArcadeSpec } from "@/lib/arcade/schema";
import { WORLD } from "@/lib/arcade/schema";
import { loadCharacter, CHARACTERS, type Mood } from "./characters";
import { loadArt } from "./art";
import { shade, type Palette } from "./paint";
import { paletteFor } from "./palette-for";
import { formatClock } from "@/lib/arcade/round";
import * as sound from "./sound";
import a from "./arcade.module.css";

/**
 * The shell every engine shares: canvas, palette, fixed-timestep loop, input,
 * lives, and the title / game-over screens.
 *
 * Written once so an engine is only its own logic. It also means a fix to the
 * feel - and there were several - lands on all ten engines at once instead of
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
  /**
   * Play an effect. Most sounds fire from the host calls above rather than from
   * here - scoring already means a chirp, losing a life already means a thud -
   * so an engine only reaches for this when it does something the shared verbs
   * cannot express.
   */
  sfx: (name: sound.Sfx) => void;
};

export type Engine = {
  step: (dt: number) => void;
  draw: () => void;
  /** A pointer or key press. `where` is in world coordinates for pointers. */
  input: (kind: "press" | "release", where?: { x: number; y: number }) => void;
  reset: () => void;
};

export type EngineFactory = (host: EngineHost, spec: ArcadeSpec) => Engine;

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
  // Read straight from the sound module, which owns the preference. See
  // sound.ts for why this is a store subscription rather than mirrored state.
  const mutedUi = useSyncExternalStore(
    sound.subscribeMute,
    sound.mutedSnapshot,
    sound.mutedServerSnapshot,
  );

  const art = CHARACTERS[spec.theme.character];
  const sprites = useRef<Record<Mood, HTMLImageElement> | null>(null);
  const [left, setLeft] = useState(spec.scoring.timeLimit ?? 0);
  const state = useRef({
    phase: "ready" as Phase,
    score: 0,
    lives: spec.rules.lives,
    shake: 0,
    combo: 0,
    // The round budget, in seconds. Deliberately NOT reset by loseLife: the
    // clock is shared across retries, which is what makes three lives a
    // resource spent against one budget rather than three fresh chances.
    left: spec.scoring.timeLimit ?? 0,
  });
  const engineRef = useRef<Engine | null>(null);
  const pending = useRef<{ kind: "press" | "release"; where?: { x: number; y: number } }[]>([]);

  const enter = useCallback((p: Phase) => {
    state.current.phase = p;
    setPhase(p);
  }, []);

  const start = useCallback(() => {
    // A browser will only let an AudioContext start from a user gesture, and
    // this is that gesture - the press or click that begins a run. Called
    // before anything else here so the first sound of the game is not the one
    // that gets swallowed.
    sound.unlock();

    if (state.current.phase === "dead") {
      // A full restart is the ONLY thing that refills the clock.
      state.current = {
        phase: "ready",
        score: 0,
        lives: spec.rules.lives,
        shake: 0,
        combo: 0,
        left: spec.scoring.timeLimit ?? 0,
      };
      setScore(0);
      setLives(spec.rules.lives);
      setLeft(spec.scoring.timeLimit ?? 0);
      engineRef.current?.reset();
      enter("ready");
      return;
    }
    if (state.current.phase === "ready") {
      sound.play("start");
      sound.startMusic(spec.meta.difficulty === "hard");
      enter("playing");
    }
  }, [enter, spec.rules.lives, spec.meta.difficulty, spec.scoring.timeLimit]);

  useEffect(() => {
    let live = true;
    // Art loads alongside the character; both degrade to procedural shapes on
    // failure rather than blocking the game.
    void loadArt();
    loadCharacter(spec.theme.character).then((s) => {
      if (live) sprites.current = s;
    });
    // Music must not outlive the component. Navigating away from a game while
    // it plays would otherwise leave a scheduler running against a context
    // nothing on screen owns any more.
    return () => {
      live = false;
      sound.stopMusic();
    };
  }, [spec.theme.character]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Colour: the game's own scene first, the design system as the backup.
    // Shared with the gallery's previews - see ./palette-for.ts.
    const palette: Palette = paletteFor(host, spec);

    const hostApi: EngineHost = {
      ctx,
      palette,
      paint: shade(ctx),
      sprites: () => sprites.current,
      /**
       * Sound rides on the shared verbs rather than on fifteen call sites in
       * `engines.tsx`. Scoring already means a chirp and losing a life already
       * means a thud, in every engine, so wiring it here gives all five sound
       * at once - the same reason the loop and the input live here.
       */
      addScore: (n) => {
        state.current.score += n;
        setScore(state.current.score);
        setBest((b) => (state.current.score > b ? state.current.score : b));
        sound.play("score", state.current.combo++);
      },
      score: () => state.current.score,
      loseLife: () => {
        state.current.lives -= 1;
        state.current.combo = 0;
        setLives(state.current.lives);
        if (state.current.lives <= 0) {
          sound.play("die");
          sound.stopMusic();
          enter("dead");
        } else {
          sound.play("hit");
        }
      },
      finish: () => {
        sound.play(state.current.score >= spec.scoring.targetScore ? "win" : "die");
        sound.stopMusic();
        enter("dead");
      },
      shake: (amount = 1) => {
        state.current.shake = amount;
      },
      phase: () => state.current.phase,
      sfx: (name) => sound.play(name),
    };

    const timed = spec.scoring.timeLimit !== undefined;
    let lastShown = Math.ceil(state.current.left);
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
        if (state.current.phase === "playing") {
          engine.step(STEP);
          // Counted in the fixed timestep rather than from wall clock, so the
          // round lasts the same number of simulated seconds on every machine -
          // the same reason the physics live here.
          if (timed) {
            state.current.left -= STEP;
            if (state.current.left <= 0) {
              state.current.left = 0;
              sound.play(state.current.score >= spec.scoring.targetScore ? "win" : "die");
              sound.stopMusic();
              enter("dead");
            }
          }
        }
        acc -= STEP;
      }
      // Only when the displayed SECOND changes. Calling setLeft every frame
      // would re-render the whole component sixty times a second to paint a
      // number that changes once.
      if (timed) {
        const shown = Math.ceil(state.current.left);
        if (shown !== lastShown) {
          lastShown = shown;
          setLeft(shown);
        }
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
    /**
     * Is the person typing rather than playing?
     *
     * The listener below is on WINDOW, because a canvas game has to respond to
     * the keyboard without the player first clicking on it. The cost is that it
     * sees every keystroke on the page - and on `/create` the game renders
     * directly beneath the prompt box, so Space and Enter were being swallowed
     * before the textarea ever saw them. Type a prompt, get a game, and you
     * could no longer put a space in your own sentence to edit it.
     *
     * Reported by Zul, and entirely my doing: `preventDefault` on a global
     * handler is a promise that nothing else on the page needs that key.
     */
    const typing = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el || !el.tagName) return false;
      const tag = el.tagName.toUpperCase();
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable === true
      );
    };

    const down = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
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
    /**
     * Only a MOVEMENT key releases.
     *
     * This used to fire on every keyup, including the jump. The platformer
     * reads `release` as "stop walking", so on a keyboard every jump also
     * stopped you dead - you could run, or you could jump, never both, and the
     * character simply never left the first platform. The other four engines
     * ignore `release` entirely, which is why it went unnoticed for so long.
     */
    const up = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      if (["ArrowLeft", "ArrowRight", "ArrowDown"].includes(e.code))
        pending.current.push({ kind: "release" });
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [start]);

  const beat = score >= spec.scoring.targetScore;
  const outOfTime = spec.scoring.timeLimit !== undefined && left <= 0;

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

        {spec.scoring.timeLimit !== undefined && (
          <div
            className={left <= 10 ? `${a.clock} ${a.clockLow}` : a.clock}
            aria-label={`${left} seconds left in the round`}
          >
            {formatClock(left)}
          </div>
        )}

        <div className={a.lives} aria-label={`${lives} lives left`}>
          {Array.from({ length: spec.rules.lives }).map((_, i) => (
            <span key={i} className={i < lives ? a.heart : a.heartSpent}>♥</span>
          ))}
        </div>

        <button
          type="button"
          className={a.mute}
          aria-pressed={mutedUi}
          aria-label={mutedUi ? "Unmute" : "Mute"}
          onClick={(e) => {
            // Stops the click reaching the tap zone underneath, which would
            // otherwise flap the moment you reached for the volume.
            e.stopPropagation();
            const next = !sound.isMuted();
            sound.setMuted(next);
            if (!next && state.current.phase === "playing") {
              sound.unlock();
              sound.startMusic(spec.meta.difficulty === "hard");
            }
          }}
        >
          {mutedUi ? "\u{1F507}" : "\u{1F50A}"}
        </button>

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
                  {spec.scoring.timeLimit !== undefined && (
                    <span className={a.panelHint}>
                      {formatClock(spec.scoring.timeLimit)} for the whole round -
                      the clock keeps running when you lose a life
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className={a.panelTitle}>
                    {beat ? "Target beaten!" : outOfTime ? "Time!" : "Game over"}
                  </span>
                  <span className={a.bigScore}>{score}</span>
                  <span className={a.panelBody}>
                    best {best} · target {spec.scoring.targetScore}
                  </span>
                  {spec.scoring.timeLimit !== undefined && !outOfTime && (
                    <span className={a.panelHint}>
                      {formatClock(left)} left on the clock
                    </span>
                  )}
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
