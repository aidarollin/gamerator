import { describe, expect, it } from "vitest";
import {
  BrickBreakerRules,
  SnakeRules,
  EndlessRunnerRules,
  PlatformerRules,
  brickBreakerVerdict,
  snakeVerdict,
  endlessRunnerVerdict,
  platformerVerdict,
} from "./engines";
import { ShooterRules, shooterVerdict } from "./shooter";
import { MazeRules, mazeVerdict } from "./maze";
import { BlocksRules, blocksVerdict } from "./blocks";
import { MatchThreeRules, match3Verdict } from "./match3";
import { WORLD } from "./schema";
import { makeRng } from "@/lib/game/random";

/**
 * The property that matters for every playability check.
 *
 * A check that can never reject anything inside its own field bounds is worse
 * than no check: it reads as coverage, passes review, and quietly lets broken
 * games through. The brick-breaker check shipped in exactly that state - the
 * fastest legal ball against the slowest legal paddle still passed - and only a
 * fixture that refused to be rejected gave it away.
 *
 * So each check is fuzzed across its own declared bounds and must both accept
 * and reject somewhere in that space.
 */

type Bounds = Record<string, [number, number] | boolean[] | number[]>;

/**
 * `ranged` names the fields that are `{start, end}` rather than a scalar.
 *
 * Both ends are drawn INDEPENDENTLY, on purpose: the worst combination a ramp
 * produces - the tallest obstacle against the shortest spacing - can sit in the
 * middle rather than at either end, and a fuzz that only ever drew matched
 * pairs would never build one.
 */
function sampleFrom(bounds: Bounds, rng: () => number, ranged: string[] = []) {
  const out: Record<string, unknown> = {};
  const draw = (lo: number, hi: number) => {
    const v = lo + rng() * (hi - lo);
    return Number.isInteger(lo) && Number.isInteger(hi) ? Math.round(v) : v;
  };
  for (const [key, spec] of Object.entries(bounds)) {
    if (Array.isArray(spec) && typeof spec[0] === "boolean") {
      out[key] = rng() > 0.5;
      continue;
    }
    const [lo, hi] = spec as [number, number];
    out[key] = ranged.includes(key) ? { start: draw(lo, hi), end: draw(lo, hi) } : draw(lo, hi);
  }
  return out;
}

function fuzz(
  name: string,
  bounds: Bounds,
  parse: (v: unknown) => { success: boolean; data?: unknown },
  verdict: (r: never) => { ok: boolean },
  ranged: string[] = [],
  /**
   * `maze-chase` runs a full simulation per candidate rather than arithmetic,
   * so it gets fewer draws. Still hundreds of boards, and it still has to both
   * accept and reject somewhere in them.
   */
  runs = 800,
) {
  const rng = makeRng(4242);
  let accepted = 0;
  let rejected = 0;
  for (let i = 0; i < runs; i++) {
    const candidate = sampleFrom(bounds, rng, ranged);
    const parsed = parse(candidate);
    if (!parsed.success) continue;
    const v = verdict(parsed.data as never);
    if (v.ok) accepted++;
    else rejected++;
  }
  it(`${name}: accepts some in-bounds settings`, () => {
    expect(accepted, "every legal combination was rejected - the check is too strict").toBeGreaterThan(0);
  });
  it(`${name}: can reject something in bounds`, () => {
    expect(
      rejected,
      "no legal combination was rejected - this check is dead code that looks like coverage",
    ).toBeGreaterThan(0);
  });
}

describe("every check can reject something in bounds", () => {
  fuzz(
    "brick-breaker",
    { ballSpeed: [120, 560], paddleWidth: [40, 160], paddleSpeed: [200, 900], rows: [2, 7], cols: [4, 10], lives: [1, 5] },
    (v) => BrickBreakerRules.safeParse(v),
    (r) => brickBreakerVerdict(r, WORLD),
  );
  fuzz(
    "snake",
    { gridCols: [8, 24], gridRows: [8, 24], startSpeed: [2, 12], speedUp: [0, 0.6], wallsKill: [true, false], foodTarget: [3, 60], lives: [1, 5] },
    (v) => SnakeRules.safeParse(v),
    (r) => snakeVerdict(r),
  );
  fuzz(
    "endless-runner",
    {
      gravity: [800, 4000], jumpVelocity: [-1200, -300],
      scrollSpeed: [80, 460], spacing: [120, 600], obstacleHeight: [18, 90],
      rampOverObstacles: [1, 60], lives: [1, 5],
    },
    (v) => EndlessRunnerRules.safeParse(v),
    (r) => endlessRunnerVerdict(r, 30),
    ["scrollSpeed", "spacing", "obstacleHeight"],
  );
  fuzz(
    "platformer",
    { gravity: [900, 4000], jumpVelocity: [-1300, -350], moveSpeed: [80, 340], platforms: [4, 14], maxGap: [40, 220], coins: [0, 20], lives: [1, 5] },
    (v) => PlatformerRules.safeParse(v),
    (r) => platformerVerdict(r),
  );
  fuzz(
    "shooter",
    {
      playerSpeed: [120, 520], shotSpeed: [200, 800], fireCooldown: [0.12, 1.2],
      fleetCols: [3, 8], fleetRows: [2, 5], fleetSpeed: [10, 140], fleetDescent: [4, 44],
      enemyFireRate: [0, 2], enemyShotSpeed: [80, 420], lives: [1, 5],
    },
    (v) => ShooterRules.safeParse(v),
    (r) => shooterVerdict(r, WORLD.width),
  );
  fuzz(
    "maze-chase",
    {
      gridCols: [9, 21], gridRows: [9, 21], playerSpeed: [2, 10], chaserSpeed: [1, 9],
      chasers: [1, 4], chaserSmarts: [0, 1], dotTarget: [5, 120], powerPellets: [0, 4],
      scaredSeconds: [2, 10], mazeSeed: [1, 999], lives: [1, 5],
    },
    (v) => MazeRules.safeParse(v),
    (r) => mazeVerdict(r),
    [],
    150,
  );
  fuzz(
    "falling-blocks",
    {
      cols: [6, 12], rows: [10, 20], dropSpeed: [0.6, 8], speedUp: [0, 0.35],
      linesToWin: [3, 40], easyPieces: [true, false], lives: [1, 5],
    },
    (v) => BlocksRules.safeParse(v),
    (r) => blocksVerdict(r),
  );
  fuzz(
    "match-3",
    {
      cols: [5, 8], rows: [5, 8], colours: [3, 6], moveLimit: [8, 60],
      clearTarget: [10, 120], boardSeed: [1, 999], lives: [1, 5],
    },
    (v) => MatchThreeRules.safeParse(v),
    (r) => match3Verdict(r),
  );
});

describe("reasons are actionable", () => {
  it("names the numbers that conflict", () => {
    const v = endlessRunnerVerdict(
      {
        gravity: 4000, jumpVelocity: -400,
        scrollSpeed: { start: 300, end: 300 },
        spacing: { start: 200, end: 200 },
        obstacleHeight: { start: 90, end: 90 },
        rampOverObstacles: 10, lives: 1,
      },
      30,
    );
    expect(v.ok).toBe(false);
    if (v.ok) return;
    // A repair turn can only act on a reason that says which fields to change.
    expect(v.reason).toMatch(/\d/);
    expect(v.reason.length).toBeGreaterThan(30);
  });
});

describe("the runner's ramp is checked at its hardest point", () => {
  /**
   * The flyer's lesson, transplanted: a spec that opens gently and ends
   * impossible must be rejected, or the check is verifying only the tutorial.
   */
  const base = {
    gravity: 2000,
    jumpVelocity: -700,
    rampOverObstacles: 14,
    lives: 3,
  };

  it("accepts a run that stays clearable all the way", () => {
    const v = endlessRunnerVerdict(
      {
        ...base,
        scrollSpeed: { start: 180, end: 250 },
        spacing: { start: 320, end: 260 },
        obstacleHeight: { start: 34, end: 46 },
      },
      30,
    );
    expect(v.ok).toBe(true);
  });

  it("rejects a run that is fine at the start and impossible at the end", () => {
    const v = endlessRunnerVerdict(
      {
        ...base,
        // Heavier gravity, so the jump peaks at 700^2/(2*2600) = 94px. The
        // schema caps obstacleHeight at 90, so with `base` gravity NO legal
        // height is unclearable - the first version of this test asserted a
        // rejection that arithmetic says cannot happen, and arithmetic won.
        gravity: 2600,
        scrollSpeed: { start: 180, end: 250 },
        spacing: { start: 320, end: 260 },
        // 34px leaves 60px of clearance; 90px leaves 4px, which is under the
        // 6px floor. Only the END of this ramp is impossible.
        obstacleHeight: { start: 34, end: 90 },
      },
      30,
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/into the ramp/);
  });

  it("rejects a run whose spacing closes faster than a jump can land", () => {
    const v = endlessRunnerVerdict(
      {
        ...base,
        scrollSpeed: { start: 180, end: 460 },
        spacing: { start: 320, end: 120 },
        obstacleHeight: { start: 30, end: 34 },
      },
      30,
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/still airborne/);
  });
});
