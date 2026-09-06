import { z } from "zod";

/**
 * Physics that change as a run progresses.
 *
 * Adopted from Flying Sushi (docs/REFERENCE-FLYING-SUSHI.md), which
 * interpolates speed, gap and spawn interval from a start value to an end value
 * across a round. Flat physics are the difference between a game that builds
 * and a game that repeats, and ours were flat.
 *
 * Two deliberate differences from the reference:
 *
 * 1. **The ramp runs on obstacles passed, not wall-clock.** Difficulty should
 *    track progress. A player hovering in an empty gap is not getting better
 *    and should not be getting a harder game; a player twenty pipes in is.
 * 2. **No round timer.** The reference has a three-minute budget, which suits a
 *    session-based game. Ours stay endless for now; the timer is the next item
 *    on the adopt list, not this change.
 */

export const Range = (min: number, max: number) =>
  z.object({
    start: z.number().min(min).max(max),
    end: z.number().min(min).max(max),
  });

export type Range = { start: number; end: number };

/** 0 at the first obstacle, 1 once the ramp is complete, never beyond. */
export function rampT(obstacleIndex: number, rampOver: number): number {
  if (rampOver <= 0) return 1;
  return Math.min(1, Math.max(0, obstacleIndex / rampOver));
}

export function lerp(range: Range, t: number): number {
  return range.start + (range.end - range.start) * t;
}

/**
 * A range is "harder at the end" for some fields and "harder at the start" for
 * others - a smaller gap is harder, a faster scroll is harder. The playability
 * simulation needs the hardest point, and it gets it by simulating the whole
 * ramp rather than by trying to reason about which end is worse. This helper
 * exists only for messages that want to name the extreme.
 */
export const hardest = (r: Range, lowerIsHarder: boolean) =>
  lowerIsHarder ? Math.min(r.start, r.end) : Math.max(r.start, r.end);
