import type { ArcadeSpecInput } from "./schema";

/**
 * The round budget.
 *
 * Adopted from Flying Sushi, which runs three minutes with the budget SHARED
 * ACROSS CONTINUES - each retry starts with whatever time is left. That one
 * detail is what makes it a round rather than a per-attempt stopwatch: three
 * lives stop being three fresh chances and become a resource you spend against
 * the same clock.
 *
 * It also fits what this is for. These are meant to be a break between lessons,
 * and a break wants an ending. An endless run has none.
 *
 * The timer is OPTIONAL and does not gate anything: it bounds the session, it
 * is not a win condition. A round that ends on the clock still shows what you
 * scored against the target.
 */

/**
 * A deliberately GENEROUS upper bound on points per second.
 *
 * Every figure below is the best case and then some - the fastest the world
 * ever moves, every collectible taken, no mistakes. That direction is chosen on
 * purpose: an over-estimate only ever fails to reject a spec that was already
 * borderline, while an under-estimate would reject games that are perfectly
 * winnable. A check that wrongly rejects is worse than one that occasionally
 * lets something through, because the rejection is what a person sees.
 *
 * These are estimates and are documented as estimates. They exist for one
 * question only: is the target so far out of reach in the time given that
 * nobody could ever see "Target beaten"?
 */
export function maxPointsPerSecond(spec: ArcadeSpecInput): number {
  const pts = spec.scoring.pointsPerObstacle;

  switch (spec.engine) {
    case "endless-flyer": {
      const r = spec.rules;
      // Fastest scroll against the shortest spacing the ramp ever reaches.
      const fastest = Math.max(r.scrollSpeed.start, r.scrollSpeed.end);
      const tightest = Math.min(r.gapSpacing.start, r.gapSpacing.end);
      // One obstacle plus one coin per gap, both scoring.
      return (fastest / tightest) * pts * 2;
    }
    case "endless-runner": {
      const r = spec.rules;
      // Fastest scroll against the tightest spacing the ramp reaches - the same
      // best case the flyer is measured at.
      const fastest = Math.max(r.scrollSpeed.start, r.scrollSpeed.end);
      const tightest = Math.min(r.spacing.start, r.spacing.end);
      return (fastest / tightest) * pts * 2;
    }
    case "brick-breaker": {
      const r = spec.rules;
      // A brick per traversal of the board, plus a caught drop. The ball has
      // to cross most of the height between hits, so this is already optimistic.
      const traversals = r.ballSpeed / 540;
      return traversals * pts * 2;
    }
    case "snake": {
      const r = spec.rules;
      // Food never appears adjacent, so a quarter of the board is a kind
      // estimate of the trip; the top speed is used rather than the start.
      const top = r.startSpeed + r.speedUp * r.foodTarget;
      const trip = (r.gridCols + r.gridRows) / 4;
      // Plus the bonus, which is worth triple and appears every fourth food.
      return (top / trip) * pts * 1.75;
    }
    case "platformer": {
      const r = spec.rules;
      // Not a rate: a platformer has a fixed purse. Every coin plus the goal
      // bonus, spread across the shortest plausible run.
      const purse = r.coins * pts + 5 * pts;
      const shortest = (r.platforms * 140) / r.moveSpeed;
      return purse / Math.max(1, shortest);
    }
  }
}

export type RoundVerdict = { ok: true } | { ok: false; reason: string };

/**
 * Can the target be reached inside the budget?
 *
 * Only fires on the clearly impossible - see `maxPointsPerSecond`. A spec with
 * no `timeLimit` is always fine, because without a clock there is always more
 * time.
 */
export function roundVerdict(spec: ArcadeSpecInput): RoundVerdict {
  const limit = spec.scoring.timeLimit;
  if (limit === undefined) return { ok: true };

  const ceiling = maxPointsPerSecond(spec) * limit;
  if (spec.scoring.targetScore > ceiling) {
    return {
      ok: false,
      reason:
        `a target of ${spec.scoring.targetScore} cannot be scored in ${limit}s - ` +
        `even playing perfectly this engine yields about ${Math.floor(ceiling)} points in that time`,
    };
  }
  return { ok: true };
}

/** `95` -> `1:35`. Clamped at zero so a late frame cannot show a negative. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
