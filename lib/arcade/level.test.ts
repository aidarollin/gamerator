import { describe, expect, it } from "vitest";
import { buildLevel, jumpArc, maxRise, reachAtRise, steps, LEVEL } from "./level";
import { PlatformerRules, platformerVerdict } from "./engines";
import { makeRng } from "@/lib/game/random";
import valid from "./fixtures/platformer.valid.json";
import hard from "./fixtures/platformer.hard.json";

/**
 * The old generator picked each platform's height independently of the last:
 * `H - 120 - rng() * 150`. A jump in `platformer.valid` peaks at 144px, so a
 * 150px step was unreachable and some seeds produced an unfinishable level.
 * `platformerVerdict` never noticed, because it only compared a running jump
 * against the horizontal gap - it had no idea the level also climbed.
 *
 * These tests are about the level, not the spec: a spec can be perfectly legal
 * and still be built into something nobody can finish.
 */

const RULES: [string, PlatformerRules][] = [
  ["valid", valid.rules as PlatformerRules],
  ["hard", hard.rules as PlatformerRules],
];

/** Legal rules across the schema's own bounds, for fuzzing. */
function fuzzRules(i: number): PlatformerRules {
  const f = (lo: number, hi: number, k: number) =>
    lo + ((Math.sin(i * k) + 1) / 2) * (hi - lo);
  return PlatformerRules.parse({
    gravity: f(900, 4000, 1.1),
    jumpVelocity: -f(350, 1300, 2.3),
    moveSpeed: f(80, 340, 3.7),
    platforms: Math.round(f(4, 14, 5.1)),
    maxGap: f(40, 220, 7.3),
    coins: Math.round(f(0, 20, 11.2)),
    lives: Math.round(f(1, 5, 13.7)),
  });
}

describe("platformer levels", () => {
  it.each(RULES)("every step of %s is crossable", (_n, r) => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const s of steps(r, buildLevel(r, seed))) {
        expect(s.rise).toBeLessThanOrEqual(maxRise(r) + 0.001);
        expect(s.gap).toBeLessThanOrEqual(s.room - LEVEL.margin + 0.001);
      }
    }
  });

  it("every step is crossable for any legal spec the checker accepts", () => {
    let checked = 0;
    for (let i = 0; i < 400; i++) {
      const r = fuzzRules(i);
      if (!platformerVerdict(r).ok) continue;
      checked++;
      for (const s of steps(r, buildLevel(r, i))) {
        expect(s.gap).toBeLessThanOrEqual(s.room - LEVEL.margin + 0.001);
      }
    }
    // A fuzz that never produced an accepted spec would assert nothing at all.
    expect(checked).toBeGreaterThan(50);
  });

  /**
   * Proof the check above can fail. Rebuilding the old placement rule - heights
   * drawn independently, gaps sized as if the ground were flat - must produce
   * steps that no jump reaches.
   */
  it("rejects the old generator, which sized gaps as if levels were flat", () => {
    const r = valid.rules as PlatformerRules;
    let impossible = 0;
    for (let seed = 1; seed <= 120; seed++) {
      // The old rule, replayed with the real RNG in the original draw order:
      // width, then gap sized against a FLAT jump, then a height unrelated to
      // the one before it.
      const rng = makeRng(seed);
      let prevY = 0;
      for (let i = 0; i < r.platforms; i++) {
        rng(); // width
        const gap = i === 0 ? 0 : 40 + rng() * (r.maxGap - 40);
        const y = 540 - 120 - rng() * 150;
        if (i > 0 && gap > reachAtRise(r, prevY - y)) impossible++;
        prevY = y;
      }
    }
    expect(impossible).toBeGreaterThan(0);
  });

  it("reachAtRise agrees with the flat reach at rise 0, and shrinks as you climb", () => {
    const r = valid.rules as PlatformerRules;
    expect(reachAtRise(r, 0)).toBeCloseTo(jumpArc(r).reach, 6);
    expect(reachAtRise(r, 60)).toBeLessThan(reachAtRise(r, 0));
    // Dropping buys distance, which is why levels may fall further than climb.
    expect(reachAtRise(r, -60)).toBeGreaterThan(reachAtRise(r, 0));
    // Above the peak there is no reach at all, at any speed.
    expect(reachAtRise(r, jumpArc(r).peak + 1)).toBe(0);
  });

  it("keeps platforms on screen and coins above them", () => {
    for (const [, r] of RULES) {
      const level = buildLevel(r, 7);
      expect(level.plats).toHaveLength(r.platforms);
      for (const p of level.plats) {
        expect(p.y).toBeGreaterThanOrEqual(LEVEL.ceilY);
        expect(p.y).toBeLessThanOrEqual(LEVEL.floorY);
        expect(p.w).toBeGreaterThanOrEqual(LEVEL.minWidth);
      }
      for (const c of level.coins) {
        const over = level.plats.some((p) => c.x >= p.x && c.x <= p.x + p.w);
        expect(over).toBe(true);
      }
      expect(level.goal).toBeGreaterThan(0);
    }
  });

  it("is deterministic - the same spec and seed build the same level", () => {
    const r = valid.rules as PlatformerRules;
    expect(buildLevel(r, 3)).toEqual(buildLevel(r, 3));
    expect(buildLevel(r, 3)).not.toEqual(buildLevel(r, 4));
  });
});
