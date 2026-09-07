import { describe, expect, it } from "vitest";
import {
  activate,
  initPowers,
  magnetPull,
  obstaclesRetracted,
  POWER,
  powerRng,
  stepPowers,
  type PowerKind,
} from "./powerups";

const STEP = 1 / 120;

/** Run the clock forward, spawning wherever asked. */
function run(seconds: number, opts: { collect?: boolean } = {}) {
  const s = initPowers();
  const rng = powerRng();
  const spawned: PowerKind[] = [];
  const activated: PowerKind[] = [];
  for (let i = 0; i < seconds / STEP; i++) {
    const before = s.pending;
    stepPowers(s, STEP, rng, (kind) => {
      spawned.push(kind);
      return { x: 0, y: 0 };
    });
    if (!before && s.pending && opts.collect) {
      activated.push(s.pending.kind);
      activate(s, s.pending.kind);
    }
  }
  return { s, spawned, activated };
}

describe("power-ups", () => {
  it("rolls on an interval rather than continuously", () => {
    const { s } = run(60);
    // A roll every 8s over 60s is 7; each roll is a 70% chance, so the number
    // that SPAWN is lower - the point here is that rolls are paced.
    expect(s.rolls).toBe(Math.floor(60 / POWER.interval));
  });

  it("spawns sometimes and not always", () => {
    const { spawned } = run(600);
    expect(spawned.length).toBeGreaterThan(0);
    // 70% of 75 rolls, minus the rolls skipped while one is already pending.
    expect(spawned.length).toBeLessThan(Math.floor(600 / POWER.interval));
  });

  it("produces both kinds over a long enough run", () => {
    const { spawned } = run(1200, { collect: true });
    expect(new Set(spawned)).toEqual(new Set(["magnet", "rush"]));
  });

  it("never runs two at once, and never stacks a bubble on an active effect", () => {
    const s = initPowers();
    const rng = powerRng();
    activate(s, "rush");
    for (let i = 0; i < 3 / STEP; i++) {
      stepPowers(s, STEP, rng, () => {
        throw new Error("spawned while an effect was running");
      });
    }
    expect(s.active).toBe("rush");
  });

  it("expires on its own", () => {
    const s = initPowers();
    const rng = powerRng();
    activate(s, "magnet");
    expect(s.active).toBe("magnet");
    for (let i = 0; i < (POWER.magnet.duration + 0.2) / STEP; i++) {
      stepPowers(s, STEP, rng, () => null);
    }
    expect(s.active).toBe(null);
    expect(s.left).toBe(0);
  });

  /**
   * The rule the whole design rests on.
   *
   * `flyerPlayability` proves a perfect player survives the spec's OWN physics.
   * If a power-up sped the world up or narrowed a gap, that proof would be
   * describing a game that no longer exists - the same failure as the flyer's
   * fixed simulation window and brick-breaker's dead check. So Power Rush
   * RETRACTS obstacles rather than accelerating anything, and the only states
   * that exist are "no obstacles" and "normal".
   */
  it("only ever makes a run easier: rush removes obstacles, nothing speeds up", () => {
    const s = initPowers();
    expect(obstaclesRetracted(s)).toBe(false);
    activate(s, "rush");
    expect(obstaclesRetracted(s)).toBe(true);
    activate(s, "magnet");
    expect(obstaclesRetracted(s)).toBe(false);
    // There is deliberately no speed multiplier anywhere in the module.
    expect(Object.keys(POWER.rush)).toEqual(["duration", "buffer"]);
  });

  describe("magnet", () => {
    const player = { x: 100, y: 100 };

    it("does nothing when inactive", () => {
      const s = initPowers();
      const from = { x: 200, y: 100 };
      expect(magnetPull(s, from, player, STEP)).toEqual(from);
    });

    it("pulls a nearby collectible toward the player", () => {
      const s = initPowers();
      activate(s, "magnet");
      const from = { x: 200, y: 100 };
      const to = magnetPull(s, from, player, STEP);
      expect(to.x).toBeLessThan(from.x);
      expect(to.x).toBeGreaterThan(player.x);
    });

    it("ignores anything beyond its radius", () => {
      const s = initPowers();
      activate(s, "magnet");
      const far = { x: player.x + POWER.magnet.radius + 50, y: player.y };
      expect(magnetPull(s, far, player, STEP)).toEqual(far);
    });

    it("never overshoots the player", () => {
      const s = initPowers();
      activate(s, "magnet");
      let at = { x: 130, y: 100 };
      for (let i = 0; i < 200; i++) at = magnetPull(s, at, player, STEP);
      expect(Math.hypot(at.x - player.x, at.y - player.y)).toBeLessThan(2);
    });
  });

  it("is deterministic - the same seed rolls the same way", () => {
    const a = run(400);
    const b = run(400);
    expect(a.spawned).toEqual(b.spawned);
  });
});
