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

/** A button on the on-screen controller - or the key that stands for it. */
export type Control = "left" | "right" | "up" | "down" | "a";

/** What the controller looks like for one engine. See CONTROLS in engines.tsx. */
export type ControlLayout = {
  /** A four-way pad, or just left and right. */
  pad: "dpad" | "sides";
  /** Held left/right fire again and again - sliding a falling piece along. */
  repeat?: boolean;
  actions: { c: Control; label: string }[];
};

export type Engine = {
  step: (dt: number) => void;
  draw: () => void;
  /**
   * A pointer on the game itself: pressed, DRAGGED, lifted. `where` is in world
   * coordinates; a keyboard press arrives without one.
   *
   * `move` is its own kind because a drag used to arrive as a stream of
   * presses - so a finger that wobbled during one tap flapped the bird three
   * times, and match-3 re-picked a piece under every pixel of a swipe.
   */
  input: (kind: "press" | "move" | "release", where?: { x: number; y: number }) => void;
  /**
   * A controller button or its key, held (`down`) or let go. Only engines with
   * a layout in CONTROLS implement it; without it the arrow keys fall back to
   * the old edge-of-screen presses.
   */
  control?: (c: Control, down: boolean) => void;
  reset: () => void;
};

/** The key that stands for each controller button. */
const KEY_CONTROL: Record<string, Control> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  Space: "a",
  Enter: "a",
};

export type EngineFactory = (host: EngineHost, spec: ArcadeSpec) => Engine;

export function GameFrame({
  spec,
  hint,
  factory,
  controls,
}: {
  spec: ArcadeSpec;
  hint: { touch: string; keys: string };
  factory: EngineFactory;
  /** The thumb pad, for the engines that need directions. */
  controls?: ControlLayout;
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
  const ctaRef = useRef<HTMLButtonElement>(null);

  /**
   * Focus the Play button - but ONLY when this game is the whole page.
   *
   * It used to be `autoFocus`, and inside an iframe that pulls keyboard focus
   * out of the HOST page on load. Found in the presentation deck: the slide-1
   * demo took focus, so the presenter's arrow keys went into the game and the
   * deck would not advance. A Pandai page embedding a game would lose its
   * keyboard the same way - the same class of bug as the game eating the
   * `/create` prompt box. Embedded, the game takes focus when it is tapped.
   *
   * An effect rather than a render-time check, because `window` does not exist
   * on the server and a different answer on each side is a hydration mismatch.
   */
  useEffect(() => {
    if (phase === "playing" || window.self !== window.top) return;
    ctaRef.current?.focus({ preventScroll: true });
  }, [phase]);
  type Pending =
    | { kind: "press" | "move" | "release"; where?: { x: number; y: number } }
    | { kind: "control"; c: Control; down: boolean };
  const pending = useRef<Pending[]>([]);

  const enter = useCallback((p: Phase) => {
    state.current.phase = p;
    setPhase(p);
  }, []);

  /**
   * FULL SCREEN, in whichever form the device allows.
   *
   * "native" is the Fullscreen API. "css" is a fixed layer over a locked page,
   * for iPhone Safari - which offers the Fullscreen API to <video> and nothing
   * else - and for an embed whose iframe was not given `allow="fullscreen"`.
   * Both are drawn by the same `.frameFull` rules, and both stop the page
   * behind the game from scrolling.
   */
  const [full, setFull] = useState<"off" | "native" | "css">("off");
  const fullRef = useRef(full);
  useEffect(() => {
    fullRef.current = full;
  }, [full]);

  const enterFull = useCallback(async () => {
    const el = hostRef.current;
    if (!el || fullRef.current !== "off") return;
    if (document.fullscreenEnabled && typeof el.requestFullscreen === "function") {
      try {
        await el.requestFullscreen({ navigationUI: "hide" });
        setFull("native");
        // Keep a phone upright. Only possible in real full screen, only on some
        // browsers, and harmless to attempt everywhere else.
        const o = screen.orientation as unknown as { lock?: (to: string) => Promise<void> };
        o.lock?.("portrait").catch(() => {});
        return;
      } catch {
        // Refused - fall through to the layer, which always works.
      }
    }
    setFull("css");
  }, []);

  const exitFull = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    setFull("off");
  }, []);

  // Leaving real full screen by Escape or the system back gesture has to bring
  // the frame back too, or it stays a fixed layer over the page.
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement && fullRef.current === "native") setFull("off");
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // The page behind a full-screen game does not scroll (see globals.css), and
  // Escape leaves the layer form the way it leaves the real one.
  useEffect(() => {
    if (full === "off") return;
    const root = document.documentElement;
    root.dataset.gameFullscreen = "1";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullRef.current === "css") setFull("off");
    };
    window.addEventListener("keydown", onKey);
    return () => {
      delete root.dataset.gameFullscreen;
      window.removeEventListener("keydown", onKey);
    };
  }, [full]);

  const start = useCallback(() => {
    // A browser will only let an AudioContext start from a user gesture, and
    // this is that gesture - the press or click that begins a run. Called
    // before anything else here so the first sound of the game is not the one
    // that gets swallowed.
    sound.unlock();

    // On a phone, starting a run IS asking to play: take the whole screen, so a
    // stray swipe cannot scroll the page out from under the game. This click is
    // the user gesture the Fullscreen API insists on. A mouse keeps the page,
    // and has the button.
    if (window.matchMedia?.("(pointer: coarse)").matches) void enterFull();

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
  }, [enter, enterFull, spec.rules.lives, spec.meta.difficulty, spec.scoring.timeLimit]);

  /** From the thumb pad. Presses only count mid-run; a release always does. */
  const sendControl = useCallback((c: Control, down: boolean) => {
    if (down && state.current.phase !== "playing") return;
    pending.current.push({ kind: "control", c, down });
  }, []);

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

    /**
     * Draw at the screen's real resolution. The canvas was a fixed 360x540,
     * which is fine inline and visibly soft once full screen stretches it
     * across a phone at three device pixels per CSS pixel. The WORLD stays
     * 360x540; the transform maps it onto however many pixels there really are.
     */
    let sx = 1;
    let sy = 1;
    const fit = () => {
      const box = canvas.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const w = Math.round(box.width * dpr);
      const hgt = Math.round(box.height * dpr);
      if (canvas.width !== w || canvas.height !== hgt) {
        canvas.width = w;
        canvas.height = hgt;
      }
      sx = canvas.width / WORLD.width;
      sy = canvas.height / WORLD.height;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      acc += Math.min(0.25, (now - last) / 1000);
      last = now;
      while (acc >= STEP) {
        for (const ev of pending.current) {
          if (ev.kind === "control") engine.control?.(ev.c, ev.down);
          else engine.input(ev.kind, ev.where);
        }
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
      ctx.setTransform(sx, 0, 0, sy, 0, 0);
      if (state.current.shake > 0) {
        const s = state.current.shake;
        ctx.translate((Math.random() - 0.5) * 11 * s, (Math.random() - 0.5) * 11 * s);
      }
      engine.draw();
      ctx.restore();
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
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
        // An engine with a controller gets the real direction. Before this the
        // arrows were faked as taps at the EDGE of the screen, which snake read
        // relative to its own head - so near a corner, "left" could turn it up.
        if (engineRef.current?.control) {
          pending.current.push({ kind: "control", c: KEY_CONTROL[e.code], down: true });
          return;
        }
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
      if (engineRef.current?.control) {
        const c = KEY_CONTROL[e.code];
        if (c) pending.current.push({ kind: "control", c, down: false });
        return;
      }
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
    <div
      className={[a.frame, full !== "off" ? a.frameFull : "", controls ? a.hasPad : ""]
        .filter(Boolean)
        .join(" ")}
      ref={hostRef}
    >
      <div className={phase === "playing" || full !== "off" ? `${a.stage} ${a.stageLive}` : a.stage}>
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

        <button
          type="button"
          className={a.full}
          aria-pressed={full !== "off"}
          aria-label={full !== "off" ? "Leave full screen" : "Full screen"}
          onClick={(e) => {
            // Same reason as mute: the click must not reach the game under it.
            e.stopPropagation();
            if (full !== "off") exitFull();
            else void enterFull();
          }}
        >
          {full !== "off" ? <IconShrink /> : <IconExpand />}
        </button>

        {phase === "playing" ? (
          <div
            className={a.tapZone}
            onPointerDown={(e) => {
              // Captured, so a drag that leaves the game still steers, and
              // still ends in a release rather than a finger stuck down.
              e.currentTarget.setPointerCapture(e.pointerId);
              pending.current.push({ kind: "press", where: toWorld(e) });
            }}
            onPointerMove={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId))
                pending.current.push({ kind: "move", where: toWorld(e) });
            }}
            onPointerUp={() => pending.current.push({ kind: "release" })}
            onPointerCancel={() => pending.current.push({ kind: "release" })}
          />
        ) : (
          <div className={a.overlay}>
            <div className={a.panel}>
              {phase === "ready" ? (
                <>
                  <span className={a.panelTitle}>{spec.meta.title}</span>
                  <span className={a.panelBody}>{spec.meta.description}</span>
                  <span className={a.panelHint}>
                    <span className={a.hintTouch}>{hint.touch}</span>
                    <span className={a.hintKeys}>{hint.keys}</span>
                  </span>
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
              <button ref={ctaRef} className={a.cta} onClick={start}>
                {phase === "ready" ? "Play" : "Play again"}
              </button>
            </div>
          </div>
        )}
      </div>

      {controls && <Pad layout={controls} send={sendControl} />}

      {spec.contentTwist && <p className={a.twist}>{spec.contentTwist.prompt}</p>}
      <p className={a.credit}>{art.label} · {spec.theme.palette}</p>
    </div>
  );
}

/**
 * THE THUMB PAD.
 *
 * Every button captures its own pointer on press, so two thumbs are two
 * independent holds - walk with one, jump with the other. That is the thing the
 * tap zones could not do: a single `release` from any finger stopped the walk.
 *
 * Hidden by CSS wherever the main pointer is not a finger; the arrow keys drive
 * the same `control()` there.
 */
function Pad({ layout, send }: { layout: ControlLayout; send: (c: Control, down: boolean) => void }) {
  return (
    <div className={a.pad} role="group" aria-label="Game controls">
      {layout.pad === "dpad" ? (
        <div className={a.dpad}>
          <span />
          <PadButton c="up" label={"\u25b2"} name="Up" send={send} />
          <span />
          <PadButton c="left" label={"\u25c0"} name="Left" send={send} />
          <span />
          <PadButton c="right" label={"\u25b6"} name="Right" send={send} />
          <span />
          <PadButton c="down" label={"\u25bc"} name="Down" send={send} />
          <span />
        </div>
      ) : (
        <div className={a.sides}>
          <PadButton c="left" label={"\u25c0"} name="Left" send={send} repeat={layout.repeat} />
          <PadButton c="right" label={"\u25b6"} name="Right" send={send} repeat={layout.repeat} />
        </div>
      )}
      <div className={a.actions}>
        {layout.actions.map((x) => (
          <PadButton key={x.c + x.label} c={x.c} label={x.label} name={x.label} send={send} action />
        ))}
      </div>
    </div>
  );
}

function PadButton({
  c,
  label,
  name,
  send,
  repeat = false,
  action = false,
}: {
  c: Control;
  label: string;
  name: string;
  send: (c: Control, down: boolean) => void;
  /** Fire again while held: 240ms, then every 90ms. */
  repeat?: boolean;
  action?: boolean;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const stop = (el: HTMLElement) => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (el.dataset.held === "true") {
      el.dataset.held = "false";
      send(c, false);
    }
  };

  return (
    <button
      type="button"
      className={action ? `${a.padBtn} ${a.actBtn}` : a.padBtn}
      aria-label={name}
      onPointerDown={(e) => {
        // No focus ring, no text selection, no long-press menu under a thumb.
        e.preventDefault();
        const el = e.currentTarget;
        el.setPointerCapture(e.pointerId);
        el.dataset.held = "true";
        send(c, true);
        if (repeat) {
          const again = (delay: number) => {
            timer.current = setTimeout(() => {
              if (el.dataset.held !== "true") return;
              send(c, true);
              again(90);
            }, delay);
          };
          again(240);
        }
      }}
      onPointerUp={(e) => stop(e.currentTarget)}
      onPointerCancel={(e) => stop(e.currentTarget)}
      onLostPointerCapture={(e) => stop(e.currentTarget)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

const IconExpand = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" />
  </svg>
);

const IconShrink = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M6 2v4H2M14 6h-4V2M10 14v-4h4M2 10h4v4" />
  </svg>
);
