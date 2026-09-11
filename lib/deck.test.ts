import { describe, expect, it } from "vitest";
import { checkDemos, describeDemos, gameDemos, skinDemos, specDemo, verdictDemos } from "./deck";
import { ENGINES } from "@/lib/arcade/schema";

/**
 * The deck may only say true things.
 *
 * Every slide below makes a claim about behaviour, and every demo on it is
 * produced by the real router, tuner and validator. These pin that each one
 * still demonstrates what its slide says it does - so the day the router
 * starts answering "chess" differently, this fails instead of the talk.
 */

describe("the deck", () => {
  it("turns every sentence on the Describe slide into the game its tag names", () => {
    const d = describeDemos();
    expect(d.map((x) => x.engine)).toEqual(["endless-flyer", "maze-chase", "duel", "endless-runner"]);
    // The racing game is the adaptation, and says so.
    expect(d.map((x) => x.tone)).toEqual(["engine", "engine", "engine", "adapt"]);
  });

  it("shows one of each kind of answer on the Honest Answers slide", () => {
    expect(verdictDemos().map((v) => v.tone)).toEqual([
      "engine",
      "adapt",
      "template",
      "refuse",
      "refuse",
    ]);
    // A refusal always carries the reason, never just "not yet".
    for (const v of verdictDemos().filter((x) => x.tone === "refuse")) {
      expect(v.body.length).toBeGreaterThan(20);
    }
  });

  it("rejects the impossible and the too-easy game, with reasons, and plays the good one", () => {
    const [impossible, easy, good] = checkDemos();
    expect(impossible.ok).toBe(false);
    expect(easy.ok).toBe(false);
    expect(good.ok).toBe(true);
    if (!impossible.ok) expect(impossible.reasons.join(" ").length).toBeGreaterThan(20);
    if (!easy.ok) expect(easy.reasons.join(" ").length).toBeGreaterThan(20);
  });

  it("has a live demo for every arcade engine, and a valid spec for every skin", () => {
    expect(gameDemos().map((g) => g.id).sort()).toEqual([...ENGINES].sort());
    expect(skinDemos()).toHaveLength(5);
    expect(specDemo().code).toContain('"engine": "endless-flyer"');
  });
});
