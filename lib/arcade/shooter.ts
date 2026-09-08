import { z } from "zod";
import type { Verdict } from "./engines";

/**
 * The space shooter: a fleet descends, you slide along the bottom and fire up.
 *
 * This engine exists because the adaptation it replaces was dishonest. "A space
 * invaders game" used to be answered with BRICK-BREAKER and the sentence "you
 * fire from the bottom of the screen and clear the formation above you" - which
 * describes a paddle bouncing a ball, not a gun. The two share a silhouette and
 * nothing else: in Breakout the thing above you is inert and the danger is
 * losing the ball, and here the thing above you SHOOTS BACK and the danger is
 * standing still. An adaptation has to match the verbs, and those do not.
 *
 * The geometry lives here rather than in the renderer's closure - the same
 * reason `collect.ts` exists - because `shooterVerdict` has to reason about the
 * fleet the player actually meets. A check describing a differently-shaped
 * fleet is theatre.
 */

/** Fixed layout the renderer and the check both build from. */
export const FLEET = {
  /** px between alien centres, horizontally and vertically. */
  cellX: 38,
  cellY: 32,
  /** px across an alien's hitbox. */
  size: 24,
  /** y of the topmost row at the start of a wave. */
  top: 104,
  /** y the player's ship sits at. */
  playerY: 486,
  /** The fleet has landed when its bottom row reaches this. */
  contactY: 456,
} as const;

export const ShooterRules = z.object({
  /** px/s the ship slides. A human dragging, not teleporting. */
  playerSpeed: z.number().min(120).max(520),
  /** px/s a player shot travels upward. */
  shotSpeed: z.number().min(200).max(800),
  /** Seconds between shots. The whole difficulty of clearing a wave. */
  fireCooldown: z.number().min(0.12).max(1.2),
  fleetCols: z.number().int().min(3).max(8),
  fleetRows: z.number().int().min(2).max(5),
  /** px/s the fleet drifts sideways. */
  fleetSpeed: z.number().min(10).max(140),
  /** px the fleet drops each time it reaches an edge. */
  fleetDescent: z.number().min(4).max(44),
  /** Shots per second across the WHOLE fleet, not per alien. */
  enemyFireRate: z.number().min(0).max(2),
  enemyShotSpeed: z.number().min(80).max(420),
  lives: z.number().int().min(1).max(5),
});
export type ShooterRules = z.infer<typeof ShooterRules>;

/** Fleet dimensions in pixels. Both the renderer and the check start here. */
export function fleetSize(r: ShooterRules) {
  return {
    width: (r.fleetCols - 1) * FLEET.cellX + FLEET.size,
    height: (r.fleetRows - 1) * FLEET.cellY + FLEET.size,
  };
}

/**
 * How long the player has before the fleet lands, and how long clearing it
 * takes. Shared so the failure message can quote both numbers.
 */
export function shooterTiming(r: ShooterRules, worldWidth: number) {
  const size = fleetSize(r);
  /** How far the fleet may descend before it reaches the player's line. */
  const room = FLEET.contactY - (FLEET.top + size.height);
  const drops = Math.max(0, Math.floor(room / r.fleetDescent));
  /** One traverse of the free width, which is what earns each drop. */
  const sweep = Math.max(0.05, (worldWidth - size.width) / r.fleetSpeed);
  const before = drops * sweep;

  /** Every alien needs a shot, and shots are gated by the cooldown. */
  const aliens = r.fleetCols * r.fleetRows;
  const flight = (FLEET.playerY - FLEET.top) / r.shotSpeed;
  const clear = aliens * r.fireCooldown + flight;

  return { room, drops, sweep, before, aliens, clear };
}

/**
 * Can a perfect player clear the wave before it lands on them, and can they
 * dodge what is fired back?
 *
 * Three failures, all of which a set of individually legal numbers can produce:
 *
 * 1. THE FLEET LANDS FIRST. A big slow-firing loadout against a fleet that
 *    drops 44px at a time reaches the floor long before forty aliens can be
 *    shot down, and nothing on screen says so.
 * 2. THE FLEET CANNOT BE HIT. A shot takes time to arrive, and the fleet moves
 *    while it is in the air. Past about two cells of drift the player is aiming
 *    at where the fleet was, and no amount of skill fixes that.
 * 3. THE PLAYER CANNOT DODGE. At the fleet's closest approach an incoming shot
 *    is visible for a fraction of a second. If the ship cannot clear its own
 *    width in that time, every shot that is aimed at it lands.
 */
export function shooterVerdict(r: ShooterRules, worldWidth: number): Verdict {
  const t = shooterTiming(r, worldWidth);

  if (t.drops < 1) {
    return {
      ok: false,
      reason: `a ${r.fleetRows}-row fleet dropping ${Math.round(r.fleetDescent)}px at a time is already on top of the player - there is only ${Math.round(t.room)}px of room above them`,
    };
  }

  if (t.clear > t.before) {
    return {
      ok: false,
      reason:
        `the fleet lands in about ${t.before.toFixed(1)}s but clearing ${t.aliens} aliens at ` +
        `${r.fireCooldown.toFixed(2)}s a shot takes ${t.clear.toFixed(1)}s - slow the descent, ` +
        `shorten the cooldown, or use a smaller fleet`,
    };
  }

  // A shot fired at the bottom row spends this long in the air, and the fleet
  // keeps moving through all of it.
  const size = fleetSize(r);
  const gap = FLEET.playerY - (FLEET.top + size.height);
  const drift = r.fleetSpeed * (gap / r.shotSpeed);
  if (drift > FLEET.cellX * 2) {
    return {
      ok: false,
      reason:
        `the fleet slides ${Math.round(drift)}px while a shot is in the air, which is more than two ` +
        `columns - the player would be aiming at where it used to be. Slow the fleet or speed up the shot`,
    };
  }

  if (r.enemyFireRate > 0.05) {
    // Judged at the fleet's CLOSEST approach, not its start: a wave that is
    // dodgeable at the top and undodgeable at the bottom is undodgeable.
    const warning = 90 / r.enemyShotSpeed;
    const sidestep = r.playerSpeed * warning;
    if (sidestep < 30) {
      return {
        ok: false,
        reason:
          `at the fleet's closest approach an incoming shot is visible for ${warning.toFixed(2)}s, ` +
          `in which a ${Math.round(r.playerSpeed)}px/s ship moves ${Math.round(sidestep)}px - not far ` +
          `enough to get out of its own way. Slow the enemy shots or speed up the ship`,
      };
    }
  }

  // A wave that never shoots and barely moves is a shooting gallery.
  const trivial = r.enemyFireRate < 0.15 && r.fleetSpeed < 30 && r.fleetRows <= 2;
  return { ok: true, trivial };
}
