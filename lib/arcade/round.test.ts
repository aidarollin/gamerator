import { describe, expect, it } from "vitest";
import { formatClock, maxPointsPerSecond, roundVerdict } from "./round";
import { ArcadeSpec, ENGINES, type ArcadeSpecInput } from "./schema";
import { readArcadeFixture, ARCADE_FIXTURE_NAMES } from "./fixtures";

/**
 * `engines.test.ts` established the rule this follows: a check that cannot
 * reject is not coverage, it only reads as coverage. brick-breaker shipped one.
 * So every assertion here is paired - the same check must accept a sane spec
 * and reject a broken one, for every engine.
 */

/** A minimal legal spec per engine, with a timer bolted on. */
function specFor(engine: (typeof ENGINES)[number], timeLimit?: number, targetScore = 10) {
  const base = {
    specVersion: "2.0" as const,
    meta: { title: "Probe", description: "probe", language: "en" as const, difficulty: "normal" as const },
    theme: { palette: "math", character: "pbot" as const, background: "sky" as const },
    scoring: { pointsPerObstacle: 1, targetScore, ...(timeLimit ? { timeLimit } : {}) },
  };
  const rules = {
    "endless-flyer": {
      gravity: 1500, flapVelocity: -420, rampOverObstacles: 12, lives: 3,
      scrollSpeed: { start: 150, end: 190 }, gapHeight: { start: 190, end: 150 },
      gapSpacing: { start: 320, end: 280 }, gapDrift: { start: 30, end: 70 },
    },
    "endless-runner": {
      gravity: 2200, jumpVelocity: -720,
      scrollSpeed: { start: 190, end: 255 },
      spacing: { start: 320, end: 255 },
      obstacleHeight: { start: 34, end: 44 },
      rampOverObstacles: 16, lives: 3,
    },
    "brick-breaker": { ballSpeed: 260, paddleWidth: 100, paddleSpeed: 620, rows: 4, cols: 7, lives: 3 },
    snake: {
      gridCols: 14, gridRows: 14, startSpeed: 5, speedUp: 0.15,
      wallsKill: true, foodTarget: 12, lives: 3,
    },
    platformer: {
      gravity: 2000, jumpVelocity: -760, moveSpeed: 190,
      platforms: 8, maxGap: 95, coins: 8, lives: 3,
    },
  }[engine] as Record<string, unknown>;
  return { ...base, engine, rules } as unknown as ArcadeSpecInput;
}

describe("round budget", () => {
  it("a spec with no timeLimit is always fine - there is always more time", () => {
    for (const engine of ENGINES) {
      expect(roundVerdict(specFor(engine)).ok).toBe(true);
    }
  });

  it.each(ENGINES)("%s: accepts a generous budget and rejects an impossible one", (engine) => {
    // Generous: the target is one point, with the maximum budget.
    const easy = roundVerdict(specFor(engine, 300, 5));
    expect(easy.ok).toBe(true);

    // Impossible: the highest target the schema allows, in the shortest budget.
    const hard = roundVerdict(specFor(engine, 20, 200));
    expect(hard.ok).toBe(false);
    if (!hard.ok) expect(hard.reason).toMatch(/cannot be scored in 20s/);
  });

  it("every engine reports a positive scoring rate", () => {
    for (const engine of ENGINES) {
      const rate = maxPointsPerSecond(specFor(engine));
      expect(rate).toBeGreaterThan(0);
      expect(Number.isFinite(rate)).toBe(true);
    }
  });

  /**
   * The estimate is deliberately an OVER-estimate, so it under-fires rather
   * than turning away winnable games. This pins that direction: no bundled
   * fixture, all of which are known good, may be rejected by adding a clock
   * long enough to be reasonable.
   */
  it("does not reject any bundled fixture given a three-minute round", () => {
    for (const name of ARCADE_FIXTURE_NAMES) {
      const raw = readArcadeFixture(name) as Record<string, unknown>;
      const parsed = ArcadeSpec.safeParse(raw);
      if (!parsed.success) continue; // the deliberately-invalid fixtures
      const scoring = raw.scoring as Record<string, unknown>;
      const timed = { ...raw, scoring: { ...scoring, timeLimit: 180 } } as ArcadeSpecInput;
      expect(roundVerdict(timed), `${name} rejected`).toEqual({ ok: true });
    }
  });

  it("the schema rejects an unreachable target, with the clock named in the path", () => {
    const spec = specFor("endless-flyer", 20, 200);
    const parsed = ArcadeSpec.safeParse(spec);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const paths = parsed.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("scoring.timeLimit");
    }
  });

  it("formatClock counts down in minutes and seconds, never past zero", () => {
    expect(formatClock(180)).toBe("3:00");
    expect(formatClock(95)).toBe("1:35");
    expect(formatClock(9)).toBe("0:09");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(-4)).toBe("0:00");
  });
});
