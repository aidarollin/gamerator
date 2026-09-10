"use client";

import { useEffect, useRef } from "react";
import { WORLD, type ArcadeSpec } from "@/lib/arcade/schema";
import { FACTORIES } from "./engines";
import { loadArt } from "./art";
import { loadCharacter, type Mood } from "./characters";
import { shade } from "./paint";
import { paletteFor } from "./palette-for";
import type { Engine, EngineHost } from "./GameFrame";

/**
 * A small canvas playing itself, so the gallery shows the GAME rather than a
 * word for it.
 *
 * It runs the real factory against the real spec through the real palette - a
 * preview drawn any other way is a picture of a game that may not exist any
 * more, which is the whole problem with screenshotting a renderer into the
 * repository. `palette-for.ts` was extracted so this and `GameFrame` cannot
 * disagree about colour.
 *
 * WHAT IT IS NOT: a player. The input below is an arcade cabinet's attract
 * mode - a jittered press wandering the screen - and it is deliberately not
 * trying to play well. Playing well is what `simulate.ts`, `duel.ts` and
 * `maze.ts` do, under test, where being wrong about it is caught. A preview
 * only has to move and look like itself. (`docs/SCREENSHOTS.md` records the
 * session where a metronomic scripted pilot was mistaken for a measurement.)
 *
 * THREE THINGS ARE SILENCED, and each would otherwise be a bug on a page
 * showing ten of these:
 *
 * 1. NO SOUND. Ten canvases playing chirps at once, unprompted, from a page
 *    the reader has not chosen to play.
 * 2. NO DEATH. Losing a life or finishing resets instead, so a card never
 *    settles on a game-over screen and stops moving.
 * 3. NO WORK OFF SCREEN. An IntersectionObserver stops the loop the moment the
 *    card scrolls away, so a ten-card grid costs whatever is actually visible.
 */

/**
 * Where the attract mode taps, per engine, as a fraction of the canvas.
 *
 * `null` means "press with no coordinates", which is the keyboard shape - the
 * flyer and the runner want exactly that, and `falling-blocks` needs almost
 * nothing because gravity is already doing the work.
 */
const DRIVE: Partial<Record<ArcadeSpec["engine"], (i: number) => { x: number; y: number } | null>> = {
  "endless-flyer": () => null,
  "endless-runner": () => null,
  duel: (i) => [{ x: 0.5, y: 0.2 }, { x: 0.75, y: 0.6 }, { x: 0.5, y: 0.2 }, { x: 0.3, y: 0.6 }][i % 4],
  platformer: (i) => [{ x: 0.8, y: 0.6 }, { x: 0.5, y: 0.15 }, { x: 0.8, y: 0.6 }, { x: 0.2, y: 0.6 }][i % 4],
  "brick-breaker": (i) => ({ x: 0.2 + ((i * 0.17) % 0.6), y: 0.9 }),
  shooter: (i) => ({ x: 0.15 + ((i * 0.23) % 0.7), y: 0.9 }),
  snake: (i) => [{ x: 0.9, y: 0.5 }, { x: 0.5, y: 0.9 }, { x: 0.1, y: 0.5 }, { x: 0.5, y: 0.1 }][i % 4],
  "maze-chase": (i) => [{ x: 0.9, y: 0.5 }, { x: 0.5, y: 0.1 }, { x: 0.1, y: 0.5 }, { x: 0.5, y: 0.9 }][i % 4],
  "falling-blocks": (i) => [{ x: 0.5, y: 0.15 }, { x: 0.25, y: 0.5 }, { x: 0.75, y: 0.5 }][i % 3],
  /**
   * A sweep, not a cycle - and the difference is the whole card.
   *
   * The first version tapped five x positions across four rows, twenty cells in
   * all, over and over. Every consecutive pair was a legal ATTEMPT and none of
   * them happened to be a legal MOVE on this particular board, so nothing ever
   * matched, nothing ever collapsed, and the board could never change into one
   * where they would - a closed loop that left the most colourful card in the
   * gallery sitting perfectly still through eighty taps.
   *
   * This walks the entire board a cell at a time, wrapping down a row at the
   * end, so consecutive taps are neighbours and every pair on the board gets
   * tried. A swap that matches nothing is refused and costs nothing, which is
   * what makes brute force the right tool here.
   */
  "match-3": (i) => {
    // Roughly one cell, as a fraction of the 360x540 world. It does not have to
    // be exact: a tap that lands two cells away is simply a re-selection.
    const stepX = 0.128;
    const acrossPerRow = Math.floor(0.72 / stepX);
    return {
      x: 0.12 + (i % acrossPerRow) * stepX,
      y: 0.24 + ((Math.floor(i / acrossPerRow) * 0.085) % 0.48),
    };
  },
};

/**
 * Seconds between taps, per engine, before the jitter is added.
 *
 * `match-3` is the outlier and the reason this exists. Its board only moves
 * when a swap actually MATCHES something, and the attract mode finds those by
 * trying rather than by looking - two taps per attempt, and most attempts are
 * refused. At the shared rate it managed nine tries in eight seconds and the
 * most colourful card in the gallery sat perfectly still. Tapping four times as
 * often makes a cascade a certainty rather than a coin flip.
 */
const TAP_EVERY: Partial<Record<ArcadeSpec["engine"], number>> = {
  "match-3": 0.1,
};
const DEFAULT_TAP = 0.26;

const STEP = 1 / 120;

export function EnginePreview({ spec }: { spec: ArcadeSpec }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    /**
     * The backing store is sized to the CARD, not to the world.
     *
     * The engines all draw in the world's 360x540 logical space, and the first
     * version simply allocated that at device pixel ratio - 720x1080 per canvas,
     * to be displayed in a box about 110px across. Ten of those cost roughly ten
     * times the pixels they show, and it measured as 47ms of main-thread jank on
     * a page whose whole job is to sit still and look inviting.
     *
     * So the store is the displayed size, and `ctx.scale` maps world coordinates
     * onto it. Physics tuned to 360x540 still means exactly the same thing; only
     * the number of pixels it lands on changes.
     */
    const dpr = Math.min(2, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
    const box = canvas.getBoundingClientRect();
    // Never larger than the world itself, and never zero - a card measured
    // before layout would otherwise produce a 0x0 canvas that silently draws
    // nothing at all.
    const w = Math.min(WORLD.width, Math.max(60, Math.round(box.width * dpr)));
    const h = Math.min(WORLD.height, Math.max(90, Math.round(box.height * dpr)));
    canvas.width = w;
    canvas.height = h;
    ctx.scale(w / WORLD.width, h / WORLD.height);

    let live = true;
    let sprites: Record<Mood, HTMLImageElement> | null = null;

    let engine: Engine | null = null;
    let score = 0;
    /** Guards against a reset inside a reset when an engine finishes on spawn. */
    let resetting = false;
    const restart = () => {
      if (resetting) return;
      resetting = true;
      score = 0;
      engine?.reset();
      resetting = false;
    };

    const host: EngineHost = {
      ctx,
      palette: paletteFor(canvas, spec),
      paint: shade(ctx),
      sprites: () => sprites,
      // The score is really kept, even though nothing outside the canvas reads
      // it. Several engines draw it themselves, and a preview stuck on a
      // permanent 0 reads as a frozen screenshot rather than a game in play -
      // which is the one thing these cards exist to disprove.
      addScore: (n) => {
        score += n;
      },
      score: () => score,
      // Dying and winning both just start again. A card that stops moving reads
      // as broken, and a card showing "Game over" is advertising the wrong thing.
      loseLife: restart,
      finish: restart,
      shake: () => {},
      phase: () => "playing",
      sfx: () => {},
    };

    engine = FACTORIES[spec.engine](host, spec);
    engine.reset();

    const drive = DRIVE[spec.engine];
    const tapEvery = TAP_EVERY[spec.engine] ?? DEFAULT_TAP;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let nextTap = 0.4;
    let taps = 0;
    let t = 0;
    let running = false;

    /** One physics step, with the attract mode's input folded in. */
    const advance = () => {
      t += STEP;
      if (t >= nextTap) {
        // Jittered, not metronomic. A fixed interval settles the flyer into one
        // altitude band and it flies a flat line forever - the exact failure
        // recorded in CLAUDE.md, costing nothing worse here than a dull picture.
        nextTap = t + tapEvery + Math.random() * tapEvery * 1.3;
        const where = drive?.(taps++);
        engine?.input(
          "press",
          where ? { x: where.x * WORLD.width, y: where.y * WORLD.height } : undefined,
        );
      }
      engine?.step(STEP);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      acc += Math.min(0.25, (now - last) / 1000);
      last = now;
      while (acc >= STEP) {
        advance();
        acc -= STEP;
      }
      engine?.draw();
    };

    /**
     * FOUR SECONDS OF PLAY, NOW, before anything about visibility is decided.
     *
     * Two reasons, and the first is a bug a screenshot found. The gallery drew
     * two previews and eight empty grey boxes: the cards below the fold had
     * never intersected, so their loops had never started and their canvases
     * had never been painted. A card nobody has scrolled to still has to show
     * the game - the picture is the only thing on it that says what the game IS.
     *
     * The second is that a preview frozen at t=0 is every game's least
     * interesting moment: an empty well, a snake two cells long, a fleet on its
     * start line. Running the attract input through the warm-up rather than
     * bare physics means the well has blocks in it and the board has been
     * played on by the time anybody looks.
     */
    // Eight seconds, not one. `match-3` needs the longest run-up of the ten:
    // its board only moves when a swap actually matches something, and the
    // attract mode finds those by trying rather than by looking, so a short
    // warm-up left the most colourful card in the gallery sitting perfectly
    // still. Ten engines x 960 steps is a few thousand sums, once.
    for (let i = 0; i < 960; i++) advance();
    engine.draw();

    /**
     * Somebody who has asked for no motion gets no motion, and the frame above
     * is all they get. Ten looping canvases is precisely what that setting is
     * for, and the CSS cannot honour it - the movement is inside the canvas.
     */
    const still =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (still) {
      return () => {
        live = false;
      };
    }

    /**
     * REPAINT WHEN THE ART ARRIVES.
     *
     * Found on the deployed site, not locally, and only because the shot was
     * taken a second sooner: the warm-up frame is drawn synchronously at mount,
     * and the pipes and the character sprites load over the network. A card
     * below the fold therefore froze on a frame with no obstacles and a blank
     * white disc where PBot should be - and since its loop only starts when it
     * is scrolled to, it kept that frame indefinitely.
     *
     * The same class of bug as the empty grey boxes: drawing once is only
     * correct if everything you draw with is already there.
     */
    const repaint = () => {
      if (live && !running) engine?.draw();
    };
    void loadArt().then(repaint);
    void loadCharacter(spec.theme.character).then((loaded) => {
      if (!live) return;
      sprites = loaded;
      repaint();
    });

    /**
     * Only while it is on screen. Ten engines running their fixed-timestep loops
     * behind a scrolled-past card is work nobody can see, on phones.
     */
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true;
          last = performance.now();
          acc = 0;
          raf = requestAnimationFrame(loop);
        } else if (!entry.isIntersecting && running) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { rootMargin: "120px" },
    );
    io.observe(canvas);

    return () => {
      live = false;
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [spec]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
