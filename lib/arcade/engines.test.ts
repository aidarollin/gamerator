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

function sampleFrom(bounds: Bounds, rng: () => number) {
  const out: Record<string, number | boolean> = {};
  for (const [key, spec] of Object.entries(bounds)) {
    if (Array.isArray(spec) && typeof spec[0] === "boolean") {
      out[key] = rng() > 0.5;
    } else {
      const [lo, hi] = spec as [number, number];
      const v = lo + rng() * (hi - lo);
      out[key] = Number.isInteger(lo) && Number.isInteger(hi) ? Math.round(v) : v;
    }
  }
  return out;
}

function fuzz(
  name: string,
  bounds: Bounds,
  parse: (v: unknown) => { success: boolean; data?: unknown },
  verdict: (r: never) => { ok: boolean },
) {
  const rng = makeRng(4242);
  let accepted = 0;
  let rejected = 0;
  for (let i = 0; i < 800; i++) {
    const candidate = sampleFrom(bounds, rng);
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
    { gravity: [800, 4000], jumpVelocity: [-1200, -300], scrollSpeed: [80, 460], spacing: [120, 600], obstacleHeight: [18, 90], lives: [1, 5] },
    (v) => EndlessRunnerRules.safeParse(v),
    (r) => endlessRunnerVerdict(r, 30),
  );
  fuzz(
    "platformer",
    { gravity: [900, 4000], jumpVelocity: [-1300, -350], moveSpeed: [80, 340], platforms: [4, 14], maxGap: [40, 220], coins: [0, 20], lives: [1, 5] },
    (v) => PlatformerRules.safeParse(v),
    (r) => platformerVerdict(r),
  );
});

describe("reasons are actionable", () => {
  it("names the numbers that conflict", () => {
    const v = endlessRunnerVerdict(
      { gravity: 4000, jumpVelocity: -400, scrollSpeed: 300, spacing: 200, obstacleHeight: 90, lives: 1 },
      30,
    );
    expect(v.ok).toBe(false);
    if (v.ok) return;
    // A repair turn can only act on a reason that says which fields to change.
    expect(v.reason).toMatch(/\d/);
    expect(v.reason.length).toBeGreaterThan(30);
  });
});
