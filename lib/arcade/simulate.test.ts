import { describe, expect, it } from "vitest";
import { flyerPlayability, gapCentres, type FlyerRules } from "./simulate";

const playable: FlyerRules = {
  gravity: 1500,
  flapVelocity: -420,
  scrollSpeed: 150,
  gapHeight: 160,
  gapSpacing: 260,
  gapDrift: 70,
};

describe("gap generation", () => {
  it("is deterministic - the sim must test the game that is played", () => {
    expect(gapCentres(playable, 10)).toEqual(gapCentres(playable, 10));
  });

  it("keeps every gap fully inside the world", () => {
    const half = playable.gapHeight / 2;
    for (const c of gapCentres(playable, 60)) {
      expect(c - half).toBeGreaterThan(0);
      expect(c + half).toBeLessThan(540);
    }
  });
});

describe("playability", () => {
  it("accepts sane physics", () => {
    const v = flyerPlayability(playable);
    expect(v.playable).toBe(true);
    expect(v.cleared).toBeGreaterThanOrEqual(12);
  });

  it("rejects a gap the player cannot reach in the time available", () => {
    // Every value below is inside its own bound. This is the failure the field
    // bounds cannot see, and the whole reason the simulation exists: gaps can
    // jump 240px, but at 400px/s with 140px between them there is 0.35s to make
    // that climb, and no flap in range is strong enough.
    const v = flyerPlayability({
      gravity: 3000,
      flapVelocity: -150,
      scrollSpeed: 400,
      gapHeight: 80,
      gapSpacing: 140,
      gapDrift: 240,
    });
    expect(v.playable).toBe(false);
    if (v.playable) return;
    expect(v.reason).toMatch(/gap is too tight|cannot hold a line|misses obstacle/);
  });

  it("accepts physics that LOOK brutal but are actually threadable", () => {
    // Kept because it caught me being wrong. I asserted this was impossible
    // from intuition; the arithmetic disagreed and the arithmetic was right.
    // With a 0.1s tap cooldown a -220 flap against gravity 2800 nets about 8px
    // of climb per cycle, and a 90px gap leaves 62px of slack for a 28px bird.
    // The simulation exists precisely because this judgement is not reliable
    // by eye - not the model's, and not mine.
    const v = flyerPlayability({
      ...playable,
      gravity: 2800,
      flapVelocity: -220,
      gapHeight: 90,
      scrollSpeed: 380,
    });
    expect(v.playable).toBe(true);
  });

  it("rejects gravity a flap cannot fight", () => {
    const v = flyerPlayability({ ...playable, gravity: 3000, flapVelocity: -160 });
    expect(v.playable).toBe(false);
  });

  it("flags physics so gentle the player cannot lose", () => {
    const v = flyerPlayability({
      ...playable,
      gravity: 400,
      flapVelocity: -160,
      gapHeight: 300,
      gapSpacing: 600,
      gapDrift: 0,
    });
    if (v.playable) expect(v.trivial).toBe(true);
  });

  it("always terminates, even on pathological input", () => {
    // A validator that hangs is worse than one that rejects.
    const started = Date.now();
    flyerPlayability({ ...playable, scrollSpeed: 60, gapSpacing: 600 });
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("is deterministic - the same spec always gets the same verdict", () => {
    expect(flyerPlayability(playable)).toEqual(flyerPlayability(playable));
  });
});
