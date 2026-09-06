import { describe, expect, it } from "vitest";
import {
  flyerPlayability,
  flyerAt,
  gapCentres,
  simulatedObstacles,
  type FlyerRules,
} from "./simulate";

const flat = (n: number) => ({ start: n, end: n });

const playable: FlyerRules = {
  gravity: 1500,
  flapVelocity: -420,
  scrollSpeed: flat(150),
  gapHeight: flat(160),
  gapSpacing: flat(260),
  gapDrift: flat(70),
  rampOverObstacles: 12,
};

describe("the ramp", () => {
  const ramped: FlyerRules = {
    ...playable,
    scrollSpeed: { start: 140, end: 260 },
    gapHeight: { start: 200, end: 130 },
    rampOverObstacles: 10,
  };

  it("starts at the start values", () => {
    const at = flyerAt(ramped, 0);
    expect(at.scrollSpeed).toBe(140);
    expect(at.gapHeight).toBe(200);
  });

  it("reaches the end values when the ramp completes", () => {
    const at = flyerAt(ramped, 10);
    expect(at.scrollSpeed).toBe(260);
    expect(at.gapHeight).toBe(130);
  });

  it("does not overshoot past the end of the ramp", () => {
    expect(flyerAt(ramped, 500)).toEqual(flyerAt(ramped, 10));
  });

  it("is halfway at the midpoint", () => {
    expect(flyerAt(ramped, 5).gapHeight).toBeCloseTo(165, 5);
  });
});

describe("gap generation", () => {
  it("is deterministic - the sim must test the game that is played", () => {
    expect(gapCentres(playable, 10)).toEqual(gapCentres(playable, 10));
  });

  it("keeps every gap inside the world even as the ramp narrows it", () => {
    const ramped = { ...playable, gapHeight: { start: 280, end: 90 }, rampOverObstacles: 8 };
    gapCentres(ramped, 40).forEach((c, i) => {
      const half = flyerAt(ramped, i).gapHeight / 2;
      expect(c - half).toBeGreaterThan(0);
      expect(c + half).toBeLessThan(540);
    });
  });
});

describe("playability", () => {
  it("accepts sane physics", () => {
    const v = flyerPlayability(playable);
    expect(v.playable).toBe(true);
  });

  it("simulates the whole ramp, not a fixed window", () => {
    // A short ramp needs fewer obstacles than a long one. If this were fixed,
    // a long ramp's hardest point would never be reached.
    expect(simulatedObstacles({ ...playable, rampOverObstacles: 4 })).toBe(8);
    expect(simulatedObstacles({ ...playable, rampOverObstacles: 40 })).toBe(44);
  });

  it("REJECTS a spec that is gentle at the start and impossible at the end", () => {
    // The whole reason the ramp forced a change to the simulation. Obstacle one
    // is a 240px gap at 100px/s - trivial. By obstacle 20 it is 85px at 390px/s
    // with heavy drift, which no player can hold. Sampling the start, or an
    // average, would pass this.
    const v = flyerPlayability({
      gravity: 2600,
      flapVelocity: -300,
      scrollSpeed: { start: 100, end: 390 },
      gapHeight: { start: 240, end: 85 },
      gapSpacing: { start: 420, end: 150 },
      gapDrift: { start: 20, end: 200 },
      rampOverObstacles: 20,
    });
    expect(v.playable).toBe(false);
    if (v.playable) return;
    // It should fail LATE - proving it got through the gentle opening first.
    expect(v.cleared).toBeGreaterThan(3);
    expect(v.reason).toMatch(/into the ramp/);
  });

  it("names how far into the ramp it failed", () => {
    const v = flyerPlayability({
      ...playable,
      gapHeight: { start: 220, end: 82 },
      scrollSpeed: { start: 120, end: 380 },
      gapDrift: { start: 40, end: 220 },
      rampOverObstacles: 15,
    });
    if (v.playable) return;
    expect(v.reason).toMatch(/\d+% into the ramp/);
  });

  it("still rejects flat physics that were never possible", () => {
    const v = flyerPlayability({
      gravity: 3000,
      flapVelocity: -150,
      scrollSpeed: flat(400),
      gapHeight: flat(80),
      gapSpacing: flat(140),
      gapDrift: flat(240),
      rampOverObstacles: 10,
    });
    expect(v.playable).toBe(false);
  });

  it("flags physics so gentle the player cannot lose", () => {
    const v = flyerPlayability({
      gravity: 400,
      flapVelocity: -160,
      scrollSpeed: flat(60),
      gapHeight: flat(300),
      gapSpacing: flat(600),
      gapDrift: flat(0),
      rampOverObstacles: 5,
    });
    if (v.playable) expect(v.trivial).toBe(true);
  });

  it("always terminates, even on a long ramp", () => {
    const started = Date.now();
    flyerPlayability({ ...playable, rampOverObstacles: 60 });
    expect(Date.now() - started).toBeLessThan(3000);
  });

  it("is deterministic", () => {
    expect(flyerPlayability(playable)).toEqual(flyerPlayability(playable));
  });
});
