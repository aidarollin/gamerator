import { describe, expect, it } from "vitest";
import { coinsCollected, coinPos, coinOffsets, obstacleX, COIN_REACH } from "./collect";
import { flyerAt, gapCentres, type FlyerRules } from "./simulate";
import valid from "./fixtures/endless-flyer.valid.json";
import hard from "./fixtures/endless-flyer.hard.json";
import easy from "./fixtures/endless-flyer.easy.json";

/**
 * Why this file exists.
 *
 * Collectibles are OPTIONAL by design - they never gate progress, so the
 * playability simulation ignores them. That is the right call, and it is also
 * exactly what let a broken one ship: a coin nobody collects looks identical to
 * a coin nobody wanted. Measurement in a browser said twenty obstacles cleared,
 * zero coins taken, three runs running, and no check anywhere objected.
 *
 * Same principle as `engines.test.ts`: a rule that cannot be observed failing is
 * not covered, it is only assumed.
 */

const RULES: [string, FlyerRules][] = [
  ["valid", valid.rules as FlyerRules],
  ["hard", hard.rules as FlyerRules],
  ["easy", easy.rules as FlyerRules],
];

describe("flyer coins", () => {
  it.each(RULES)("a perfect player collects some on %s", (_name, rules) => {
    const got = coinsCollected(rules, 20);
    // Not "all": a coin offset from the flight line is supposed to cost
    // something, so a player who never deviates should miss a share of them.
    expect(got).toBeGreaterThan(3);
    expect(got).toBeLessThanOrEqual(20);
  });

  /**
   * The failure this file was written for. The coin used to sit at the height
   * of the gap the player had just LEFT; by the time they reached it they were
   * climbing toward the next gap, which drift can put far away. Rebuilding that
   * placement here proves the test can fail, not merely that it passes.
   */
  it("rejects the old placement, pinned to the gap just left", () => {
    const rules = valid.rules as FlyerRules;
    const centres = gapCentres(rules, 24);
    const offsets = coinOffsets(400);

    let onLine = 0;
    let pinned = 0;
    for (let n = 1; n <= 20; n++) {
      const here = obstacleX(rules, n);
      const at = flyerAt(rules, n);
      const x = here + at.gapSpacing / 2;
      // Where a player actually is at that x: between the two gap centres.
      const flight = (centres[n] + centres[n + 1]) / 2;
      const good = coinPos(rules, centres, offsets, n);
      const old = centres[n] + offsets[n] * (at.gapHeight / 2);
      expect(good.x).toBeCloseTo(x, 5);
      if (Math.abs(good.y - flight) < COIN_REACH) onLine++;
      if (Math.abs(old - flight) < COIN_REACH) pinned++;
    }
    expect(onLine).toBe(20);
    expect(pinned).toBeLessThan(20);
  });

  it("is deterministic - the same spec places coins identically", () => {
    const rules = valid.rules as FlyerRules;
    const a = gapCentres(rules, 8);
    const one = coinPos(rules, a, coinOffsets(400), 3);
    const two = coinPos(rules, a, coinOffsets(400), 3);
    expect(one).toEqual(two);
    expect(coinsCollected(rules, 20)).toBe(coinsCollected(rules, 20));
  });

  it("never places a coin outside the world", () => {
    for (const [, rules] of RULES) {
      const centres = gapCentres(rules, 40);
      const offsets = coinOffsets(400);
      for (let n = 1; n < 30; n++) {
        const c = coinPos(rules, centres, offsets, n);
        expect(c.y).toBeGreaterThan(0);
        expect(c.y).toBeLessThan(540);
      }
    }
  });
});
