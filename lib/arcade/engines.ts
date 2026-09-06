import { z } from "zod";

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
  gravity: z.number().min(800).max(4000),
  jumpVelocity: z.number().min(-1200).max(-300),
  scrollSpeed: z.number().min(80).max(460),
  /** px between obstacles. */
  spacing: z.number().min(120).max(600),
  /** px tall; the runner must be able to clear it. */
  obstacleHeight: z.number().min(18).max(90),
  lives: z.number().int().min(1).max(5),
});
export type EndlessRunnerRules = z.infer<typeof EndlessRunnerRules>;

export function endlessRunnerVerdict(r: EndlessRunnerRules, runnerHeight: number): Verdict {
  // Peak of a jump, and how long it lasts.
  const peak = (r.jumpVelocity * r.jumpVelocity) / (2 * r.gravity);
  const airTime = (2 * -r.jumpVelocity) / r.gravity;
  const clearance = peak - r.obstacleHeight;
  if (clearance < 6) {
    return {
      ok: false,
      reason: `a jump peaks at ${Math.round(peak)}px and the obstacle is ${Math.round(r.obstacleHeight)}px - the runner cannot get over it`,
    };
  }
  // Landing must happen before the next obstacle arrives, or a jump commits the
  // player to a collision they cannot avoid.
  const timeBetween = r.spacing / r.scrollSpeed;
  if (airTime > timeBetween * 1.6) {
    return {
      ok: false,
      reason: `a jump lasts ${airTime.toFixed(2)}s but obstacles arrive every ${timeBetween.toFixed(2)}s - the runner is still airborne when the next one hits`,
    };
  }
  const trivial = clearance > runnerHeight * 3 && timeBetween > 2.2;
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
