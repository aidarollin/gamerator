import { hashString, makeRng } from "@/lib/game/random";

/**
 * Power-ups, adopted from Flying Sushi's magnet and Power Rush.
 *
 * THE RULE THAT KEEPS THE PLAYABILITY GUARANTEE INTACT: a power-up may only
 * ever make a run EASIER or richer, never harder.
 *
 * That is not a stylistic preference, it is what lets the simulation stay
 * honest. `flyerPlayability` proves a perfect player can survive the spec's
 * own physics; if a power-up could speed the world up or shrink a gap, the
 * simulation would be proving something about a game that no longer exists and
 * the whole guarantee would be theatre - the exact failure this repo has caught
 * itself in three times.
 *
 * So Power Rush here RETRACTS obstacles rather than accelerating the world.
 * The reference speeds the world up during its rush; ours does not, because the
 * reference has no such guarantee to protect. Everything else - the frenzy of
 * collectibles, the clear-sky buffer before obstacles return - is kept.
 *
 * Both are deterministic from a seed, like every other generated thing here, so
 * the same spec always plays the same way and a reported bug is replayable.
 */

export type PowerKind = "magnet" | "rush";

export const POWER = {
  /** Seconds between spawn rolls. */
  interval: 8,
  /** Chance a roll actually spawns something. */
  chance: 0.7,
  magnet: {
    duration: 5,
    /** px/s a collectible is dragged toward the player. */
    pull: 560,
    /** Only collectibles within this radius are pulled. */
    radius: 240,
  },
  rush: {
    duration: 7,
    /** Seconds of clear sky after a rush before obstacles return. */
    buffer: 1.2,
  },
} as const;

export type PowerState = {
  /** The bubble waiting to be collected, in world x/y, or null. */
  pending: { kind: PowerKind; x: number; y: number } | null;
  /** What is currently running, and for how much longer. */
  active: PowerKind | null;
  left: number;
  /** Seconds until the next spawn roll. */
  nextRoll: number;
  rolls: number;
};

export function initPowers(): PowerState {
  return { pending: null, active: null, left: 0, nextRoll: POWER.interval, rolls: 0 };
}

/**
 * Advance the power-up clock.
 *
 * `spawn` is called with the kind to place when a roll succeeds; the engine
 * decides WHERE, because only it knows where the player can reach.
 */
export function stepPowers(
  s: PowerState,
  dt: number,
  rng: () => number,
  spawn: (kind: PowerKind) => { x: number; y: number } | null,
): void {
  if (s.active) {
    s.left -= dt;
    if (s.left <= 0) {
      s.active = null;
      s.left = 0;
    }
  }

  s.nextRoll -= dt;
  if (s.nextRoll > 0) return;
  s.nextRoll = POWER.interval;
  s.rolls += 1;

  // One bubble at a time, and never while something is already running - two
  // overlapping rushes would read as a bug rather than as a reward.
  if (s.pending || s.active) return;
  if (rng() > POWER.chance) return;

  const kind: PowerKind = rng() < 0.5 ? "magnet" : "rush";
  const at = spawn(kind);
  if (at) s.pending = { kind, ...at };
}

/** Collect the pending bubble and start its effect. */
export function activate(s: PowerState, kind: PowerKind): void {
  s.pending = null;
  s.active = kind;
  s.left = kind === "magnet" ? POWER.magnet.duration : POWER.rush.duration;
}

/**
 * True while obstacles should be off the board: the rush itself plus the
 * clear-sky buffer that follows it, so they do not slam back the instant the
 * timer ends and kill a player who had no way to see it coming.
 */
export function obstaclesRetracted(s: PowerState): boolean {
  if (s.active === "rush") return true;
  return false;
}

/** How far through a rush, 0..1, for drawing the effect winding down. */
export function rushProgress(s: PowerState): number {
  if (s.active !== "rush") return 0;
  return 1 - s.left / POWER.rush.duration;
}

/**
 * Pull a collectible toward the player while the magnet runs.
 * Returns the new position; unchanged when no magnet is active or it is too far.
 */
export function magnetPull(
  s: PowerState,
  from: { x: number; y: number },
  player: { x: number; y: number },
  dt: number,
): { x: number; y: number } {
  if (s.active !== "magnet") return from;
  const dx = player.x - from.x;
  const dy = player.y - from.y;
  const d = Math.hypot(dx, dy);
  if (d < 1 || d > POWER.magnet.radius) return from;
  const step = Math.min(d, POWER.magnet.pull * dt);
  return { x: from.x + (dx / d) * step, y: from.y + (dy / d) * step };
}

/**
 * A seeded stream, so power-up rolls are replayable from the spec alone.
 *
 * Seeded FROM THE SPEC, not from a constant. A fixed seed made every game in
 * the catalogue roll the same kinds in the same order - deterministic, which
 * was the goal, but identical, which was not. Two different games should not
 * hand you a magnet at the same moment.
 */
export function powerRng(seed: number | string = 0x9017): () => number {
  return makeRng(typeof seed === "number" ? seed : hashString(seed));
}
