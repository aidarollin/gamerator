import { describe, expect, it } from "vitest";
import { DUEL, DuelRules, duelPlayability } from "./duel";
import { makeRng } from "@/lib/game/random";
import valid from "./fixtures/duel.valid.json";

/**
 * The same rule every other check here follows: it must be able to REJECT, and
 * it must be able to ACCEPT, somewhere inside its own declared bounds.
 * brick-breaker once shipped a check that could do neither, and read as
 * coverage for weeks.
 *
 * A duel adds a second failure mode the other engines do not have. A flyer is
 * either survivable or not; a duel can be perfectly survivable and still
 * unwinnable, because the opponent scores too. So "the player loses" and "the
 * match never ends" are separate verdicts with separate reasons.
 */

const base = valid.rules as DuelRules;

describe("duel playability", () => {
  it("accepts the bundled fixture, and calls it a real contest", () => {
    const v = duelPlayability(base);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.trivial).toBe(false);
      expect(v.hits).toBe(base.hitsToWin);
      // A contest the player can lose: the opponent lands something.
      expect(v.taken).toBeGreaterThan(0);
      expect(v.taken).toBeLessThan(base.lives);
    }
  });

  it("rejects an opponent that reacts faster than the strike telegraphs", () => {
    const v = duelPlayability(
      DuelRules.parse({ ...base, strikeWindup: 0.58, opponentReaction: 0.09, strikeRecovery: 0.85 }),
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/no hits at all|opponent wins first/);
  });

  it("names losing and stalling as different faults", () => {
    // Loses: a relentless opponent against a single life.
    const loses = duelPlayability(
      DuelRules.parse({ ...base, opponentAggression: 1, lives: 1, hitsToWin: 12 }),
    );
    expect(loses.ok).toBe(false);
    if (!loses.ok) expect(loses.reason).toMatch(/opponent wins first/);

    // Stalls: nine hits needed, with a slow strike cycle against an opponent
    // that blocks often enough to eat the clock. Taken from the fuzz rather
    // than invented - my hand-picked attempt at this case lost instead, which
    // is what the separate reasons exist to distinguish. It is a RARE branch
    // (about one legal spec in a thousand), so it is pinned to a known case.
    const stalls = duelPlayability(
      DuelRules.parse({
        moveSpeed: 304.49, reach: 63.22,
        strikeWindup: 0.5495, strikeRecovery: 0.5124,
        opponentReaction: 0.5275, opponentAggression: 0.419,
        hitsToWin: 9, lives: 4,
      }),
    );
    expect(stalls.ok).toBe(false);
    if (!stalls.ok) expect(stalls.reason).toMatch(/cannot be finished in a sitting/);
  });

  it("calls a passive opponent trivial", () => {
    const v = duelPlayability(DuelRules.parse({ ...base, opponentAggression: 0 }));
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.trivial).toBe(true);
  });

  /**
   * The property that makes the check worth having. Fuzzed across the schema's
   * own bounds, it must land on both answers - and on a spread of reasons, so
   * one runaway condition is not doing all the rejecting.
   */
  it("both accepts and rejects across its own bounds", () => {
    const rng = makeRng(4242);
    let accepted = 0;
    let rejected = 0;
    let good = 0;
    const reasons = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const parsed = DuelRules.safeParse({
        moveSpeed: 60 + rng() * 260,
        reach: 40 + rng() * 90,
        strikeWindup: 0.08 + rng() * 0.52,
        strikeRecovery: 0.1 + rng() * 0.8,
        opponentReaction: 0.08 + rng() * 0.82,
        opponentAggression: rng(),
        hitsToWin: 3 + Math.floor(rng() * 10),
        lives: 1 + Math.floor(rng() * 5),
      });
      if (!parsed.success) continue;
      const v = duelPlayability(parsed.data);
      if (v.ok) {
        accepted++;
        if (!v.trivial) good++;
      } else {
        rejected++;
        reasons.add(v.reason.replace(/[\d.]+/g, "N").slice(0, 34));
      }
    }
    expect(accepted).toBeGreaterThan(20);
    expect(rejected).toBeGreaterThan(20);
    // Not all the accepted ones may be screensavers.
    expect(good).toBeGreaterThan(10);
    // And rejection is not one condition wearing three hats.
    expect(reasons.size).toBeGreaterThanOrEqual(2);
  });

  it("is deterministic - the same rules give the same verdict", () => {
    expect(duelPlayability(base)).toEqual(duelPlayability(base));
  });

  it("terminates even on the most stalemated legal spec", () => {
    const v = duelPlayability(
      DuelRules.parse({
        moveSpeed: 60,
        reach: 40,
        strikeWindup: 0.6,
        strikeRecovery: 0.9,
        opponentReaction: 0.08,
        opponentAggression: 0,
        hitsToWin: 12,
        lives: 5,
      }),
    );
    // Whatever it decides, it must decide - a validator that hangs is worse
    // than one that rejects.
    expect(typeof v.ok).toBe("boolean");
    expect(DUEL.simSeconds).toBeGreaterThan(0);
  });
});
