import { beforeEach, describe, expect, it } from "vitest";
import {
  GUARD,
  allowGeneration,
  cacheKey,
  cached,
  guardSnapshot,
  recordCall,
  remember,
  resetGuardsForTest,
} from "./guard";

/**
 * These tests exist because this module is the only thing between a bug and a
 * real bill. Everything else in the repo fails safe by doing nothing; this
 * fails expensive.
 *
 * The rule from `engines.test.ts` applies with more force than usual: a limit
 * that cannot refuse is not a limit. Every check here is paired - it must allow
 * the normal case and refuse the abusive one.
 */

const usage = { inputTokens: 1000, outputTokens: 300 };

beforeEach(resetGuardsForTest);

describe("rate limiting", () => {
  it("allows a normal number of games and then refuses", () => {
    const t = Date.now();
    for (let i = 0; i < GUARD.hourlyPerClient; i++) {
      expect(allowGeneration("a", t).ok, `call ${i + 1} should be allowed`).toBe(true);
      recordCall("a", usage, t);
    }
    const over = allowGeneration("a", t);
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.code).toBe("rate_limited");
  });

  it("limits each client separately - one heavy user does not lock everyone out", () => {
    const t = Date.now();
    for (let i = 0; i < GUARD.hourlyPerClient; i++) recordCall("greedy", usage, t);
    expect(allowGeneration("greedy", t).ok).toBe(false);
    expect(allowGeneration("someone-else", t).ok).toBe(true);
  });

  it("forgives after the window passes", () => {
    const t = Date.now();
    for (let i = 0; i < GUARD.hourlyPerClient; i++) recordCall("a", usage, t);
    expect(allowGeneration("a", t).ok).toBe(false);
    expect(allowGeneration("a", t + GUARD.windowMs + 1000).ok).toBe(true);
  });
});

describe("the daily ceiling", () => {
  it("stops everyone once the day's calls are spent, whoever spent them", () => {
    const t = Date.now();
    // Spread across many clients, so this cannot be reached by the per-client
    // limit alone - which is the whole point of having a second ceiling.
    for (let i = 0; i < GUARD.dailyCalls; i++) recordCall(`client-${i}`, usage, t);

    const fresh = allowGeneration("a-brand-new-client", t);
    expect(fresh.ok).toBe(false);
    if (!fresh.ok) {
      expect(fresh.code).toBe("daily_cap");
      // The message has to tell a person what still works.
      expect(fresh.message).toMatch(/free tuner/);
    }
  });

  it("rolls over after a day", () => {
    const t = Date.now();
    for (let i = 0; i < GUARD.dailyCalls; i++) recordCall(`client-${i}`, usage, t);
    expect(allowGeneration("x", t).ok).toBe(false);
    expect(allowGeneration("x", t + GUARD.dayMs + 1000).ok).toBe(true);
  });

  it("counts a repair turn as its own call, because it costs its own money", () => {
    const t = Date.now();
    recordCall("a", usage, t);
    recordCall("a", usage, t); // the repair
    expect(guardSnapshot(t).callsToday).toBe(2);
  });
});

describe("checking is separate from spending", () => {
  it("a refused request is never counted against anyone", () => {
    const t = Date.now();
    for (let i = 0; i < 50; i++) allowGeneration("a", t);
    expect(guardSnapshot(t).callsToday).toBe(0);
    expect(allowGeneration("a", t).ok).toBe(true);
  });
});

describe("the cache", () => {
  it("keys on the whole brief, order-independently", () => {
    expect(cacheKey({ prompt: "a flyer", language: "en" })).toBe(
      cacheKey({ language: "en", prompt: "a flyer" }),
    );
    expect(cacheKey({ prompt: "a flyer" })).not.toBe(cacheKey({ prompt: "a snake" }));
    // Empty and absent are the same thing - `/create` sends "" for untouched
    // selects, and those must not split the cache.
    expect(cacheKey({ prompt: "x", palette: "" })).toBe(cacheKey({ prompt: "x" }));
  });

  it("returns the same spec without a second call", () => {
    const key = cacheKey({ prompt: "a hard flyer" });
    expect(cached(key)).toBeUndefined();
    remember(key, { marker: 1 });
    expect(cached(key)).toEqual({ marker: 1 });
  });

  it("does not grow without bound", () => {
    for (let i = 0; i < 400; i++) remember(cacheKey({ prompt: `p${i}` }), i);
    // The oldest are gone; the newest survive.
    expect(cached(cacheKey({ prompt: "p0" }))).toBeUndefined();
    expect(cached(cacheKey({ prompt: "p399" }))).toBe(399);
  });
});

describe("the snapshot an operator reads", () => {
  it("reports tokens and calls", () => {
    const t = Date.now();
    recordCall("a", { inputTokens: 900, outputTokens: 250 }, t);
    const snap = guardSnapshot(t);
    expect(snap.callsToday).toBe(1);
    expect(snap.tokensIn).toBe(900);
    expect(snap.tokensOut).toBe(250);
    expect(snap.dailyCap).toBe(GUARD.dailyCalls);
  });
});
