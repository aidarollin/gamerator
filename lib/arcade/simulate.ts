import { makeRng } from "@/lib/game/random";
import { lerp, rampT, type Range } from "./ramp";

/**
 * Headless playability simulation.
 *
 * A perfect-play agent is run over the opening obstacles using the same physics
 * and the same level generator the renderer uses. If it cannot survive, the
 * spec is impossible and the validator rejects it with a reason the repair turn
 * can act on.
 *
 * This is only possible because the engine is ours and the spec is data. You
 * cannot ask "is this playable?" of generated code without running it and
 * watching, and a model cannot answer it about its own output - it has no idea
 * whether gravity 2800 with a -220 flap can clear a 95px gap. Arithmetic does.
 *
 * Since physics now RAMP, the simulation must reach the hardest point of the
 * ramp rather than sampling an average: a spec whose opening is gentle and
 * whose end is impossible would otherwise validate and then break in play. It
 * runs the whole ramp plus a margin, which is why the obstacle count is derived
 * from the spec instead of fixed.
 */

export const SIM = {
  dt: 1 / 120,
  seed: 0x5eed,
  /** Obstacles simulated beyond the end of the ramp. */
  marginObstacles: 4,
  /** Ceiling on simulated obstacles, so a long ramp cannot stall validation. */
  maxObstacles: 60,
  /**
   * Seconds between taps the agent is allowed.
   *
   * Load-bearing. Without it the agent flaps every physics step - 120 times a
   * second - which is effectively a jetpack: it can hover against any gravity,
   * so almost no spec is ever rejected and the whole check is theatre. The
   * first version of this file had exactly that bug, and the tests caught it.
   */
  flapCooldown: 0.1,
  worldHeight: 540,
  worldWidth: 360,
  birdRadius: 14,
  birdX: 90,
} as const;

export type FlyerRules = {
  gravity: number;
  flapVelocity: number;
  scrollSpeed: Range;
  gapHeight: Range;
  gapSpacing: Range;
  gapDrift: Range;
  rampOverObstacles: number;
};

export type Verdict =
  | { playable: true; trivial: boolean; cleared: number }
  | { playable: false; trivial: false; cleared: number; reason: string };

/** Enough obstacles to have covered the whole ramp, plus a margin. */
export function simulatedObstacles(rules: FlyerRules): number {
  return Math.min(SIM.maxObstacles, rules.rampOverObstacles + SIM.marginObstacles);
}

/** The physics in force at a given obstacle. Shared with the renderer. */
export function flyerAt(rules: FlyerRules, obstacleIndex: number) {
  const t = rampT(obstacleIndex, rules.rampOverObstacles);
  return {
    scrollSpeed: lerp(rules.scrollSpeed, t),
    gapHeight: lerp(rules.gapHeight, t),
    gapSpacing: lerp(rules.gapSpacing, t),
    gapDrift: lerp(rules.gapDrift, t),
  };
}

/**
 * Gap centres. The renderer generates its level exactly this way from the same
 * seed, so the simulation is not testing a different game from the one played -
 * which would make the whole check theatre.
 */
export function gapCentres(rules: FlyerRules, count: number, seed = SIM.seed) {
  const rng = makeRng(seed);
  const centres: number[] = [];
  let prev = SIM.worldHeight / 2;
  for (let i = 0; i < count; i++) {
    const at = flyerAt(rules, i);
    const half = at.gapHeight / 2;
    const margin = 12;
    const min = half + margin;
    const max = SIM.worldHeight - half - margin;
    const drift = (rng() * 2 - 1) * at.gapDrift;
    prev = Math.min(max, Math.max(min, prev + drift));
    centres.push(prev);
  }
  return centres;
}

export function flyerPlayability(rules: FlyerRules): Verdict {
  const target = simulatedObstacles(rules);
  const centres = gapCentres(rules, target + 1);

  let y = SIM.worldHeight / 2;
  let vy = 0;
  let x = 0;
  let cleared = 0;
  let flaps = 0;
  let elapsed = 0;
  let sinceFlap: number = SIM.flapCooldown;
  let minClearance = Number.POSITIVE_INFINITY;

  // A generous ceiling based on the slowest the world ever scrolls. Without it
  // a pathological spec could spin here forever, and a validator that hangs is
  // worse than one that rejects.
  const slowest = Math.min(rules.scrollSpeed.start, rules.scrollSpeed.end);
  const widest = Math.max(rules.gapSpacing.start, rules.gapSpacing.end);
  const maxTime = ((target + 2) * widest) / slowest + 5;

  while (cleared < target) {
    elapsed += SIM.dt;
    if (elapsed > maxTime) {
      return {
        playable: false,
        trivial: false,
        cleared,
        reason: `the player cannot reach obstacle ${cleared + 1} in a reasonable time - check scrollSpeed against gapSpacing`,
      };
    }

    const at = flyerAt(rules, cleared);
    const targetY = centres[Math.min(cleared, centres.length - 1)];

    // The controller. A naive "flap whenever below centre" agent overshoots by
    // a full flap impulse and punches through the top of a tight gap - it
    // reported missing by exactly the impulse size, which is what gave that bug
    // away. A real player anticipates, so this one does too: it only flaps when
    // the resulting apex still lands inside the gap, and flaps regardless when
    // the alternative is falling out of the bottom or hitting the floor.
    sinceFlap += SIM.dt;
    const half = at.gapHeight / 2;
    const gapTop = targetY - half + SIM.birdRadius;
    const gapBottom = targetY + half - SIM.birdRadius;
    const climb = (rules.flapVelocity * rules.flapVelocity) / (2 * rules.gravity);
    const climbLeft = vy < 0 ? (vy * vy) / (2 * rules.gravity) : 0;

    const wouldOvershoot = y - climbLeft - climb < gapTop;
    const mustFlap =
      y >= gapBottom || y + SIM.birdRadius >= SIM.worldHeight - SIM.birdRadius;

    if (
      sinceFlap >= SIM.flapCooldown &&
      (mustFlap || (y - climbLeft > targetY && !wouldOvershoot))
    ) {
      vy = rules.flapVelocity;
      sinceFlap = 0;
      flaps++;
    }

    vy += rules.gravity * SIM.dt;
    y += vy * SIM.dt;
    x += at.scrollSpeed * SIM.dt;

    if (y - SIM.birdRadius <= 0 || y + SIM.birdRadius >= SIM.worldHeight) {
      return {
        playable: false,
        trivial: false,
        cleared,
        reason: `a perfect player hits the ${y <= SIM.birdRadius ? "ceiling" : "ground"} before obstacle ${cleared + 1}; gravity ${Math.round(rules.gravity)} against a ${Math.round(rules.flapVelocity)} flap cannot hold a line`,
      };
    }

    if (x >= at.gapSpacing) {
      x -= at.gapSpacing;
      const top = targetY - half;
      const bottom = targetY + half;
      minClearance = Math.min(
        minClearance,
        Math.min(y - SIM.birdRadius - top, bottom - (y + SIM.birdRadius)),
      );
      if (y - SIM.birdRadius < top || y + SIM.birdRadius > bottom) {
        const off = Math.round(Math.abs(y - targetY));
        const pct = Math.round(rampT(cleared, rules.rampOverObstacles) * 100);
        return {
          playable: false,
          trivial: false,
          cleared,
          reason: `a perfect player misses obstacle ${cleared + 1} by ${off}px - ${pct}% into the ramp the gap is ${Math.round(at.gapHeight)}px at ${Math.round(at.scrollSpeed)}px/s, too tight for these physics`,
        };
      }
      cleared++;
    }
  }

  // Trivial two ways: the agent barely had to act, or it never came close to an
  // edge. Either means the player cannot lose, and a game you cannot lose is a
  // screensaver. Measured against the tightest gap the ramp ever reaches, since
  // that is where a ramped spec is supposed to be hardest.
  const tightest = Math.min(rules.gapHeight.start, rules.gapHeight.end);
  const lazy = flaps < target * 0.5;
  const roomy = minClearance > tightest * 0.3;
  return { playable: true, trivial: lazy || roomy, cleared };
}
