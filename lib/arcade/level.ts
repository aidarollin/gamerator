import { makeRng } from "@/lib/game/random";
import type { PlatformerRules } from "./engines";

/**
 * Platformer level generation, outside the closure so it can be checked.
 *
 * The bug this was written for: platform heights were `H - 120 - rng() * 150`,
 * drawn independently of each other, so one platform could sit 150px above the
 * last. A jump in `platformer.valid` peaks at 144px. Some seeds produced a level
 * that simply could not be finished, and `platformerVerdict` said nothing
 * because it only ever compared a running jump against the HORIZONTAL gap.
 *
 * That is the same failure the flyer's fixed simulation window had, and the same
 * failure brick-breaker's dead check had: the validator was describing a game
 * nobody plays. Here it is fixed by construction rather than by rejection - a
 * level is built from what a jump can actually do, so there is no such thing as
 * an unreachable step to reject.
 */

export type Plat = { x: number; y: number; w: number };
export type Coin = { x: number; y: number };
export type Level = { plats: Plat[]; coins: Coin[]; goal: number };

/** The world the platformer is generated into. */
export const LEVEL = {
  height: 540,
  /** Platform thickness, and the character's height for clearance purposes. */
  thickness: 18,
  /** Lowest and highest a platform top may sit. */
  floorY: 430,
  ceilY: 210,
  minWidth: 90,
  maxWidth: 180,
  minGap: 40,
  /** Safety taken off every computed reach, in px. */
  margin: 22,
} as const;

/** Peak height of a jump, and how far a flat running jump carries. */
export function jumpArc(r: PlatformerRules) {
  const v0 = -r.jumpVelocity; // upward, positive
  return {
    v0,
    peak: (v0 * v0) / (2 * r.gravity),
    airTime: (2 * v0) / r.gravity,
    reach: (r.moveSpeed * 2 * v0) / r.gravity,
  };
}

/**
 * The furthest a running jump reaches while still at least `rise` px above its
 * launch height. `rise` may be negative, meaning the landing is BELOW the
 * launch - dropping is free, so that reaches further.
 *
 * Solving `rise = v0*t - g*t^2/2` for the later root gives the moment the jump
 * falls back through that height, which is the last instant it can still land.
 * Returns 0 when the height is simply out of reach.
 */
export function reachAtRise(r: PlatformerRules, rise: number): number {
  const { v0 } = jumpArc(r);
  const disc = v0 * v0 - 2 * r.gravity * rise;
  if (disc < 0) return 0;
  const t = (v0 + Math.sqrt(disc)) / r.gravity;
  return r.moveSpeed * t;
}

/** The highest step this character can land on, with clearance to spare. */
export function maxRise(r: PlatformerRules): number {
  return Math.max(0, jumpArc(r).peak - LEVEL.thickness - 12);
}

/**
 * Build a level every step of which is crossable.
 *
 * For each platform a RISE is chosen first, then the gap is capped by what a
 * jump reaches at that rise. Choosing them the other way round is what made the
 * old generator unsound: a horizontal gap that is fine on the flat is not fine
 * while also climbing, because climbing spends the same air time.
 */
export function buildLevel(r: PlatformerRules, seed = 9001): Level {
  const rng = makeRng(seed);
  const plats: Plat[] = [];

  // The opening platform is wide and low: somewhere to stand and understand the
  // controls before anything is asked of you.
  let y: number = LEVEL.floorY;
  let cx = 0;
  plats.push({ x: 0, y, w: LEVEL.maxWidth });
  cx = LEVEL.maxWidth;

  const climb = maxRise(r);
  for (let i = 1; i < r.platforms; i++) {
    // Rise is biased slightly upward so a level climbs rather than wanders,
    // and dropping is allowed to go further because falling costs nothing.
    const up = rng() < 0.55;
    const rise = up ? rng() * climb : -(rng() * Math.min(150, climb + 90));
    const nextY = Math.min(LEVEL.floorY, Math.max(LEVEL.ceilY, y - rise));
    // Recompute from the CLAMPED height: clamping can only ever make the step
    // easier, but the gap must be sized against the step actually built.
    const actualRise = y - nextY;
    const room = Math.max(0, reachAtRise(r, actualRise) - LEVEL.margin);
    // `minGap` is a preference, not a floor. A steep climb leaves almost no
    // horizontal room - all the air time is spent going up - and forcing a 40px
    // gap there would build exactly the unreachable step this file exists to
    // prevent. When room runs out the platforms simply abut, which reads as a
    // step up rather than a jump across, and is the correct shape for a climb.
    const cap = Math.min(r.maxGap, room);
    const gap = cap <= LEVEL.minGap ? cap : LEVEL.minGap + rng() * (cap - LEVEL.minGap);

    cx += gap;
    const w = LEVEL.minWidth + rng() * (LEVEL.maxWidth - LEVEL.minWidth);
    plats.push({ x: cx, y: nextY, w });
    cx += w;
    y = nextY;
  }

  // Coins: one per platform, spread rather than sampled with replacement. The
  // old version drew a random platform each time and stacked several coins in
  // the same spot while other platforms had none.
  const coins: Coin[] = [];
  const candidates = plats.slice(1);
  for (let i = 0; i < Math.min(r.coins, candidates.length * 2); i++) {
    const p = candidates[i % candidates.length];
    const nth = Math.floor(i / candidates.length);
    coins.push({
      x: p.x + p.w * (nth === 0 ? 0.5 : 0.25),
      y: p.y - 34 - nth * 4,
    });
  }

  return { plats, coins, goal: cx };
}

/**
 * Every step in a level, as `{ gap, rise, room }`. `room` is what a jump
 * reaches at that rise, so `gap <= room` is the whole playability question.
 */
export function steps(r: PlatformerRules, level: Level) {
  const out: { gap: number; rise: number; room: number }[] = [];
  for (let i = 1; i < level.plats.length; i++) {
    const a = level.plats[i - 1];
    const b = level.plats[i];
    out.push({
      gap: b.x - (a.x + a.w),
      rise: a.y - b.y,
      room: reachAtRise(r, a.y - b.y),
    });
  }
  return out;
}
