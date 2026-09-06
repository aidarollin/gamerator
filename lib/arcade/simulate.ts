import { makeRng } from "@/lib/game/random";

/**
 * Headless playability simulation.
 *
 * A perfect-play agent is run over the opening obstacles using the same physics
 * the renderer uses. If it cannot survive, the spec is impossible and the
 * validator rejects it with a reason the repair turn can act on.
 *
 * This is only possible because the engine is ours and the spec is data. You
 * cannot ask "is this playable?" of generated code without running it and
 * watching, and a model cannot answer it about its own output - it has no idea
 * whether gravity 2800 with a -220 flap can clear a 95px gap. Arithmetic does.
 *
 * Pure and deterministic: no canvas, no timers, no randomness beyond a fixed
 * seed. It runs in milliseconds inside `safeParse`.
 */

export const SIM = {
  /** Physics step. Smaller than a frame so the verdict does not depend on FPS. */
  dt: 1 / 120,
  /** Obstacles the agent must clear to count as playable. */
  obstacles: 12,
  /** Fixed seed - the same spec must always get the same verdict. */
  seed: 0x5eed,
  /**
   * Seconds between taps the agent is allowed.
   *
   * Load-bearing. Without it the agent flaps every physics step - 120 times a
   * second - which is effectively a jetpack: it can hover against any gravity,
   * so almost no spec is ever rejected and the whole check is theatre. The
   * first version of this file had exactly that bug, and the tests caught it.
   *
   * 0.1s is ten taps a second, which is generous for a human thumb.
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
  scrollSpeed: number;
  gapHeight: number;
  gapSpacing: number;
  gapDrift: number;
};

export type Verdict =
  | { playable: true; trivial: boolean; cleared: number }
  | { playable: false; trivial: false; cleared: number; reason: string };

/**
 * Gap centres. The renderer generates its level exactly this way from the same
 * seed, so the simulation is not testing a different game from the one played -
 * which would make the whole check theatre.
 */
export function gapCentres(rules: FlyerRules, count: number, seed = SIM.seed) {
  const rng = makeRng(seed);
  const half = rules.gapHeight / 2;
  const margin = 12;
  const min = half + margin;
  const max = SIM.worldHeight - half - margin;
  const centres: number[] = [];
  let prev = SIM.worldHeight / 2;
  for (let i = 0; i < count; i++) {
    const drift = (rng() * 2 - 1) * rules.gapDrift;
    prev = Math.min(max, Math.max(min, prev + drift));
    centres.push(prev);
  }
  return centres;
}

export function flyerPlayability(rules: FlyerRules): Verdict {
  const centres = gapCentres(rules, SIM.obstacles + 1);

  let y = SIM.worldHeight / 2;
  let vy = 0;
  let x = 0;
  let cleared = 0;
  let flaps = 0;
  let elapsed = 0;
  let sinceFlap: number = SIM.flapCooldown;
  let minClearance = Number.POSITIVE_INFINITY;

  // A generous ceiling: enough time for every obstacle at this scroll speed,
  // plus slack. Without it a pathological spec could spin here forever, and a
  // validator that hangs is worse than one that rejects.
  const maxTime = ((SIM.obstacles + 2) * rules.gapSpacing) / rules.scrollSpeed + 5;

  while (cleared < SIM.obstacles) {
    elapsed += SIM.dt;
    if (elapsed > maxTime) {
      return {
        playable: false,
        trivial: false,
        cleared,
        reason: `the player cannot reach obstacle ${cleared + 1} in a reasonable time - check scrollSpeed against gapSpacing`,
      };
    }

    const nextIndex = Math.min(cleared, centres.length - 1);
    const target = centres[nextIndex];

    // The controller. A naive "flap whenever below centre" agent overshoots by
    // a full flap impulse and punches through the top of a tight gap - it
    // reported missing by exactly the impulse size, which is what gave the bug
    // away. A real player anticipates, so this one does too: it only flaps when
    // the resulting apex still lands inside the gap, and flaps regardless when
    // the alternative is falling out of the bottom or hitting the floor.
    sinceFlap += SIM.dt;
    const half = rules.gapHeight / 2;
    const gapTop = target - half + SIM.birdRadius;
    const gapBottom = target + half - SIM.birdRadius;
    const climb = (rules.flapVelocity * rules.flapVelocity) / (2 * rules.gravity);
    const climbLeft = vy < 0 ? (vy * vy) / (2 * rules.gravity) : 0;

    const wouldOvershoot = y - climbLeft - climb < gapTop;
    const mustFlap =
      y >= gapBottom || y + SIM.birdRadius >= SIM.worldHeight - SIM.birdRadius;

    if (
      sinceFlap >= SIM.flapCooldown &&
      (mustFlap || (y - climbLeft > target && !wouldOvershoot))
    ) {
      vy = rules.flapVelocity;
      sinceFlap = 0;
      flaps++;
    }

    vy += rules.gravity * SIM.dt;
    y += vy * SIM.dt;
    x += rules.scrollSpeed * SIM.dt;

    if (y - SIM.birdRadius <= 0 || y + SIM.birdRadius >= SIM.worldHeight) {
      return {
        playable: false,
        trivial: false,
        cleared,
        reason: `a perfect player hits the ${y <= SIM.birdRadius ? "ceiling" : "ground"} before obstacle ${cleared + 1}; gravity ${Math.round(rules.gravity)} against a ${Math.round(rules.flapVelocity)} flap cannot hold a line`,
      };
    }

    if (x >= rules.gapSpacing) {
      x -= rules.gapSpacing;
      const top = target - half;
      const bottom = target + half;
      minClearance = Math.min(
        minClearance,
        Math.min(y - SIM.birdRadius - top, bottom - (y + SIM.birdRadius)),
      );
      if (y - SIM.birdRadius < top || y + SIM.birdRadius > bottom) {
        const off = Math.round(Math.abs(y - target));
        return {
          playable: false,
          trivial: false,
          cleared,
          reason: `a perfect player misses obstacle ${cleared + 1} by ${off}px - a ${Math.round(rules.gapHeight)}px gap is too tight for these physics at ${Math.round(rules.scrollSpeed)}px/s`,
        };
      }
      cleared++;
    }
  }

  // Trivial two ways: the agent barely had to act, or it never came close to an
  // edge. Either means the player cannot lose, and a game you cannot lose is a
  // screensaver.
  const lazy = flaps < SIM.obstacles * 0.5;
  const roomy = minClearance > rules.gapHeight * 0.3;
  return { playable: true, trivial: lazy || roomy, cleared };
}
