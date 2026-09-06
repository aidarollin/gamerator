import { makeRng } from "@/lib/game/random";
import { flyerAt, gapCentres, SIM, type FlyerRules } from "./simulate";

/**
 * Where the flyer's coins are, as a pure function.
 *
 * This lived inside the engine's closure, and that is why it was broken for a
 * whole session without anyone noticing: from outside a closure the only way to
 * ask "was a coin ever collected?" is to play the game and watch, and a coin is
 * OPTIONAL, so a missed one looks exactly like a player who did not want it.
 *
 * The measurement that forced this move: twenty obstacles cleared, zero coins
 * taken, in three separate runs. That is not a player choosing to skip them.
 *
 * The same rule the playability simulation follows applies here - the renderer
 * and the check must generate the level the SAME way, or the check is verifying
 * a game nobody plays. So the engine imports these functions rather than
 * keeping its own copy.
 */

/** Vertical offset from the flight line, as a fraction of the half-gap. */
const SPREAD = 0.22;

/** Radius within which the player takes a coin. Bird 14 + coin 11. */
export const COIN_REACH = 25;

export function coinOffsets(count: number, seed = 0xc0): number[] {
  const rng = makeRng(seed);
  return Array.from({ length: count }, () => (rng() * 2 - 1) * SPREAD);
}

/** Distance from the start to obstacle `n`, accumulating the ramped spacing. */
export function obstacleX(rules: FlyerRules, n: number): number {
  let d = 0;
  for (let i = 1; i <= n; i++) d += flyerAt(rules, i - 1).gapSpacing;
  return d;
}

/**
 * A coin between obstacle `n` and `n + 1`, on the line a player actually flies.
 *
 * Pinned to `centres[n]` - the gap just LEFT - it was never collectable: by the
 * midpoint the player is already climbing toward gap n + 1, and drift can put
 * that a long way from gap n. Horizontally the coin is halfway between the two,
 * so vertically it belongs halfway too.
 */
export function coinPos(
  rules: FlyerRules,
  centres: number[],
  offsets: number[],
  n: number,
): { x: number; y: number } {
  const here = obstacleX(rules, n);
  const at = flyerAt(rules, n);
  const a = centres[n % centres.length];
  const b = centres[(n + 1) % centres.length];
  return {
    x: here + at.gapSpacing / 2,
    y: (a + b) / 2 + offsets[n % offsets.length] * (at.gapHeight / 2),
  };
}

/**
 * How many coins a perfect player takes over `obstacles` obstacles.
 *
 * Deliberately reuses the playability agent's controller so the answer
 * describes the game as played, not an idealised bird that beelines for
 * collectibles. A player aiming at the next gap should sweep up a decent share
 * of coins on the way; if this returns zero the coins are in the wrong place.
 */
export function coinsCollected(rules: FlyerRules, obstacles: number): number {
  const centres = gapCentres(rules, obstacles + 2);
  const offsets = coinOffsets(400);
  const taken = new Set<number>();

  let y = SIM.worldHeight / 2;
  let vy = 0;
  let dist = 0;
  let passed = 0;
  let sinceFlap: number = SIM.flapCooldown;
  let elapsed = 0;

  const slowest = Math.min(rules.scrollSpeed.start, rules.scrollSpeed.end);
  const widest = Math.max(rules.gapSpacing.start, rules.gapSpacing.end);
  const maxTime = ((obstacles + 2) * widest) / slowest + 5;

  while (passed < obstacles && elapsed <= maxTime) {
    elapsed += SIM.dt;
    const at = flyerAt(rules, passed);
    const targetY = centres[Math.min(passed + 1, centres.length - 1)];
    const half = at.gapHeight / 2;

    // The same anticipating controller as flyerPlayability.
    sinceFlap += SIM.dt;
    const gapBottom = targetY + half - SIM.birdRadius;
    const gapTop = targetY - half + SIM.birdRadius;
    const climb = (rules.flapVelocity * rules.flapVelocity) / (2 * rules.gravity);
    const climbLeft = vy < 0 ? (vy * vy) / (2 * rules.gravity) : 0;
    const wouldOvershoot = y - climbLeft - climb < gapTop;
    const mustFlap = y >= gapBottom || y + SIM.birdRadius >= SIM.worldHeight - SIM.birdRadius;
    if (sinceFlap >= SIM.flapCooldown && (mustFlap || (y - climbLeft > targetY && !wouldOvershoot))) {
      vy = rules.flapVelocity;
      sinceFlap = 0;
    }

    vy += rules.gravity * SIM.dt;
    y += vy * SIM.dt;
    dist += at.scrollSpeed * SIM.dt;
    if (y - SIM.birdRadius <= 0) { y = SIM.birdRadius; vy = 0; }
    if (y + SIM.birdRadius >= SIM.worldHeight) break;

    for (let i = passed; i <= passed + 2; i++) {
      if (i <= 0 || taken.has(i)) continue;
      const c = coinPos(rules, centres, offsets, i);
      if (Math.hypot(c.x - dist, c.y - y) < COIN_REACH) taken.add(i);
    }

    if (obstacleX(rules, passed + 1) - dist <= 0) passed += 1;
  }
  return taken.size;
}
