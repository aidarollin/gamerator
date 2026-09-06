import { describe, expect, it } from "vitest";
import { hashString, makeRng, seededShuffle, specSeed } from "./random";

describe("seeded shuffle", () => {
  const items = ["a", "b", "c", "d", "e", "f", "g", "h"];

  it("is deterministic for a given seed", () => {
    expect(seededShuffle(items, 42)).toEqual(seededShuffle(items, 42));
  });

  it("differs across seeds", () => {
    expect(seededShuffle(items, 1)).not.toEqual(seededShuffle(items, 2));
  });

  it("never mutates the input", () => {
    const original = items.slice();
    seededShuffle(items, 7);
    expect(items).toEqual(original);
  });

  it("is a permutation - nothing lost, nothing duplicated", () => {
    const out = seededShuffle(items, 99);
    expect(out.slice().sort()).toEqual(items.slice().sort());
    expect(out).toHaveLength(items.length);
  });

  it("handles empty and single-item arrays", () => {
    expect(seededShuffle([], 1)).toEqual([]);
    expect(seededShuffle(["only"], 1)).toEqual(["only"]);
  });

  it("actually reorders - a shuffle that returns the input is not a shuffle", () => {
    // Guards the case where an off-by-one in the loop bound makes the whole
    // thing a no-op, which every other test above would still pass.
    const long = Array.from({ length: 40 }, (_, i) => i);
    expect(seededShuffle(long, 12345)).not.toEqual(long);
  });
});

describe("questions and options do not shuffle in lockstep", () => {
  it("gives different seeds for different labels", () => {
    expect(specSeed("Sistem Suria", "questions")).not.toBe(
      specSeed("Sistem Suria", "options"),
    );
  });

  it("gives the same seed for the same spec and label", () => {
    expect(specSeed("Sistem Suria", "questions")).toBe(
      specSeed("Sistem Suria", "questions"),
    );
  });
});

describe("rng", () => {
  it("stays within [0, 1)", () => {
    const rng = makeRng(hashString("bounds"));
    for (let i = 0; i < 5000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("is roughly uniform across ten buckets", () => {
    const rng = makeRng(12345);
    const buckets = new Array(10).fill(0);
    const n = 100000;
    for (let i = 0; i < n; i++) buckets[Math.floor(rng() * 10)]++;
    // A generator stuck in a corner of the range would fail this; the bound is
    // loose enough that a fair one never will.
    for (const count of buckets) {
      expect(count).toBeGreaterThan(n / 10 - n / 50);
      expect(count).toBeLessThan(n / 10 + n / 50);
    }
  });
});
