import { z } from "zod";
import { lerp, Range, rampT } from "./ramp";

/**
 * Per-engine rules and their playability checks.
 *
 * Every engine gets the same treatment the flyer got: bounds on each field, and
 * then a check for the failure bounds cannot see - a game where every number is
 * legal and the game is still impossible or pointless. That check is arithmetic
 * or a short simulation, never a guess, and it always returns a reason a repair
 * turn can act on.
 */

export type Verdict = { ok: true; trivial: boolean } | { ok: false; reason: string };

/* ------------------------------------------------------------ brick-breaker */

export const BrickBreakerRules = z.object({
  /** px/s the ball travels. */
  ballSpeed: z.number().min(120).max(560),
  /** px. */
  paddleWidth: z.number().min(40).max(160),
  /** px/s the paddle can travel - a human dragging, not teleporting. */
  paddleSpeed: z.number().min(200).max(900),
  rows: z.number().int().min(2).max(7),
  cols: z.number().int().min(4).max(10),
  lives: z.number().int().min(1).max(5),
});
export type BrickBreakerRules = z.infer<typeof BrickBreakerRules>;

export function brickBreakerVerdict(r: BrickBreakerRules, world: { width: number; height: number }): Verdict {
  // How long the player has to reach the ball: it returns from the brick field,
  // not from the very top, and only part of its speed is vertical.
  //
  // The first version of this used the full board height and 0.75 of the speed,
  // which made the worst legal combination - the fastest ball against the
  // slowest paddle - still pass. A check that cannot fire inside its own bounds
  // is not a lenient check, it is dead code that looks like coverage.
  // `every check can reject something in bounds` in the test suite exists to
  // stop that happening again.
  const fallTime = (world.height * 0.55) / (r.ballSpeed * 0.7);
  const paddleTravel = r.paddleSpeed * fallTime;
  if (paddleTravel < world.width * 0.6) {
    return {
      ok: false,
      reason: `the paddle cannot cross the board in time - at ${Math.round(r.ballSpeed)}px/s the ball returns in ${fallTime.toFixed(2)}s and a ${Math.round(r.paddleSpeed)}px/s paddle only covers ${Math.round(paddleTravel)}px of ${world.width}`,
    };
  }
  if (r.paddleWidth > world.width * 0.55) {
    return { ok: true, trivial: true };
  }
  const trivial = r.ballSpeed < 200 && r.paddleWidth > 120;
  return { ok: true, trivial };
}

/* --------------------------------------------------------------------- snake */

export const SnakeRules = z.object({
  gridCols: z.number().int().min(8).max(24),
  gridRows: z.number().int().min(8).max(24),
  /** Cells per second. Above ~12 no human reacts in time. */
  startSpeed: z.number().min(2).max(12),
  /** Cells per second added per food eaten. */
  speedUp: z.number().min(0).max(0.6),
  wallsKill: z.boolean(),
  foodTarget: z.number().int().min(3).max(60),
  /** Every engine carries lives - the HUD is shared, so the field is too. */
  lives: z.number().int().min(1).max(5),
});
export type SnakeRules = z.infer<typeof SnakeRules>;

export function snakeVerdict(r: SnakeRules): Verdict {
  const cells = r.gridCols * r.gridRows;
  // The snake grows by one per food; it cannot be longer than the board.
  if (r.foodTarget + 3 > cells * 0.6) {
    return {
      ok: false,
      reason: `a target of ${r.foodTarget} food fills most of a ${r.gridCols}x${r.gridRows} board - the snake runs out of room before it can finish`,
    };
  }
  const finalSpeed = r.startSpeed + r.speedUp * r.foodTarget;
  if (finalSpeed > 16) {
    return {
      ok: false,
      reason: `speed reaches ${finalSpeed.toFixed(1)} cells/s by the end, which is past human reaction time - lower speedUp or foodTarget`,
    };
  }
  return { ok: true, trivial: r.startSpeed < 3 && r.speedUp === 0 && !r.wallsKill };
}

/* ------------------------------------------------------------ endless-runner */

export const EndlessRunnerRules = z.object({
  /** Constant: gravity and jump are the feel of the character, not the ramp. */
  gravity: z.number().min(800).max(4000),
  jumpVelocity: z.number().min(-1200).max(-300),
  /** Ranged, like the flyer: a run that repeats is the commonest way to bore. */
  scrollSpeed: Range(80, 460),
  /** px between obstacles. */
  spacing: Range(120, 600),
  /** px tall; the runner must be able to clear it at every point of the ramp. */
  obstacleHeight: Range(18, 90),
  /** Obstacles until every range reaches its end value. */
  rampOverObstacles: z.number().int().min(1).max(60),
  lives: z.number().int().min(1).max(5),
});

/**
 * The runner's physics at a given obstacle. The renderer and the check both
 * call this - if the renderer ramped any other way the check would be
 * describing a game nobody plays, which is the mistake this repo keeps
 * catching itself making.
 */
export function runnerAt(r: EndlessRunnerRules, obstacleIndex: number) {
  const t = rampT(obstacleIndex, r.rampOverObstacles);
  return {
    scrollSpeed: lerp(r.scrollSpeed, t),
    spacing: lerp(r.spacing, t),
    obstacleHeight: lerp(r.obstacleHeight, t),
  };
}
export type EndlessRunnerRules = z.infer<typeof EndlessRunnerRules>;

/**
 * Distance from the start to obstacle `n`, accumulating the ramped spacing.
 *
 * A running sum, not `n * spacing`: once spacing ramps, the two disagree and
 * the renderer would place obstacles somewhere the check never looked. Same
 * shape as the flyer's `obstacleX`, for the same reason.
 */
export function runnerObstacleX(r: EndlessRunnerRules, n: number): number {
  let d = 0;
  for (let i = 1; i <= n; i++) d += runnerAt(r, i - 1).spacing;
  return d;
}

export function endlessRunnerVerdict(r: EndlessRunnerRules, runnerHeight: number): Verdict {
  // The jump is constant, so it is computed once.
  const peak = (r.jumpVelocity * r.jumpVelocity) / (2 * r.gravity);
  const airTime = (2 * -r.jumpVelocity) / r.gravity;

  /**
   * The whole ramp is walked, not just its opening.
   *
   * The flyer taught the important half: a fixed window sampled only the gentle
   * start and passed specs that became impossible later.
   *
   * Being accurate about the other half - for THESE two quantities the extreme
   * is provably at an end, not in the middle. `obstacleHeight` is linear in t,
   * and `spacing / scrollSpeed` is a ratio of two linear functions, which is
   * monotonic. So sampling the ends would be sufficient today.
   *
   * It is walked anyway for two reasons that are not about correctness now:
   * the failure message can say HOW FAR into the ramp it breaks, which is what
   * a repair turn acts on; and the day someone adds a field that is not linear
   * in t, this keeps working instead of silently sampling the wrong points.
   */
  const steps = Math.max(2, Math.min(60, r.rampOverObstacles + 4));
  for (let i = 0; i <= steps; i++) {
    const at = runnerAt(r, i);
    const clearance = peak - at.obstacleHeight;
    if (clearance < 6) {
      const pct = Math.round(rampT(i, r.rampOverObstacles) * 100);
      return {
        ok: false,
        reason: `a jump peaks at ${Math.round(peak)}px but ${pct}% into the ramp the obstacle is ${Math.round(at.obstacleHeight)}px - the runner cannot get over it`,
      };
    }
    const timeBetween = at.spacing / at.scrollSpeed;
    if (airTime > timeBetween * 1.6) {
      const pct = Math.round(rampT(i, r.rampOverObstacles) * 100);
      return {
        ok: false,
        reason: `a jump lasts ${airTime.toFixed(2)}s but ${pct}% into the ramp obstacles arrive every ${timeBetween.toFixed(2)}s - the runner is still airborne when the next one hits`,
      };
    }
  }

  // Trivial is judged at the HARDEST point the ramp reaches: a run that ends
  // easy is easy, however it started.
  const worstHeight = Math.max(r.obstacleHeight.start, r.obstacleHeight.end);
  const tightest =
    Math.min(r.spacing.start, r.spacing.end) / Math.max(r.scrollSpeed.start, r.scrollSpeed.end);
  const trivial = peak - worstHeight > runnerHeight * 3 && tightest > 2.2;
  return { ok: true, trivial };
}

/* ---------------------------------------------------------------- platformer */

export const PlatformerRules = z.object({
  gravity: z.number().min(900).max(4000),
  jumpVelocity: z.number().min(-1300).max(-350),
  moveSpeed: z.number().min(80).max(340),
  /** Number of platforms in the generated level. */
  platforms: z.number().int().min(4).max(14),
  /** Widest horizontal gap between platforms, px. */
  maxGap: z.number().min(40).max(220),
  coins: z.number().int().min(0).max(20),
  lives: z.number().int().min(1).max(5),
});
export type PlatformerRules = z.infer<typeof PlatformerRules>;

export function platformerVerdict(r: PlatformerRules): Verdict {
  // How far a running jump carries. If the widest gap is further than that, the
  // level cannot be completed - the classic generated-level failure.
  const airTime = (2 * -r.jumpVelocity) / r.gravity;
  const reach = r.moveSpeed * airTime;
  if (reach < r.maxGap + 12) {
    return {
      ok: false,
      reason: `a running jump covers ${Math.round(reach)}px but the level has a ${Math.round(r.maxGap)}px gap - it cannot be crossed`,
    };
  }
  const peak = (r.jumpVelocity * r.jumpVelocity) / (2 * r.gravity);
  if (peak < 40) {
    return {
      ok: false,
      reason: `a jump only reaches ${Math.round(peak)}px, which is not enough to land on a platform`,
    };
  }
  return { ok: true, trivial: reach > r.maxGap * 3.2 };
}
