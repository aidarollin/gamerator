"use client";

import { WORLD } from "@/lib/arcade/schema";
import { FLEET, fleetSize } from "@/lib/arcade/shooter";
import { makeRng } from "@/lib/game/random";
import { spawnBurst, stepParticles, type Particle } from "./paint";
import { drawCharacter } from "./engines";
import type { EngineFactory } from "./GameFrame";

/**
 * The space shooter. Kept in its own file for the same reason the duel is:
 * `engines.tsx` is already the longest thing in the repo, and an engine with a
 * fleet, two kinds of projectile and a wave counter does not belong bolted onto
 * the end of it.
 *
 * The fleet's shape, its descent and the timing the playability check reasons
 * about all come from `lib/arcade/shooter.ts`. Nothing about the geometry is
 * decided here - if it were, the check would be certifying a different game.
 */

const W = WORLD.width;
const H = WORLD.height;

type Shot = { x: number; y: number };

export const shooterFactory: EngineFactory = (h, spec) => {
  if (spec.engine !== "shooter") throw new Error("wrong engine");
  const r = spec.rules;
  const size = fleetSize(r);

  let px = W / 2;
  let targetX = W / 2;
  let fleetX = (W - size.width) / 2;
  let fleetY = FLEET.top;
  let dir = 1;
  let alive: boolean[] = [];
  let shots: Shot[] = [];
  let incoming: Shot[] = [];
  let cool = 0;
  let enemyCool = 0;
  let parts: Particle[] = [];
  let wave = 1;
  let t = 0;
  let pop = 0;

  // Seeded from the spec's identity, never from `JSON.stringify(rules)` - key
  // order in a parsed Zod object follows the schema, so reordering two fields
  // would silently change which alien shoots.
  const rng = makeRng(0x5107 ^ (spec.meta.title.length * 2654435761));

  const alienX = (col: number) => fleetX + col * FLEET.cellX + FLEET.size / 2;
  const alienY = (row: number) => fleetY + row * FLEET.cellY + FLEET.size / 2;

  const layout = () => {
    alive = Array(r.fleetCols * r.fleetRows).fill(true);
    fleetX = (W - size.width) / 2;
    fleetY = FLEET.top;
    dir = 1;
  };

  /** The lowest surviving alien in each column - the only ones that can fire. */
  const front = () => {
    const out: { col: number; row: number }[] = [];
    for (let col = 0; col < r.fleetCols; col++)
      for (let row = r.fleetRows - 1; row >= 0; row--)
        if (alive[row * r.fleetCols + col]) {
          out.push({ col, row });
          break;
        }
    return out;
  };

  const hitPlayer = () => {
    h.shake(1);
    spawnBurst(parts, px, FLEET.playerY);
    incoming = [];
    h.loseLife();
  };

  return {
    reset() {
      layout();
      px = W / 2;
      targetX = W / 2;
      shots = [];
      incoming = [];
      parts = [];
      cool = 0;
      enemyCool = 0;
      wave = 1;
    },
    input(kind, where) {
      // A drag steers exactly like a press: the ship follows the finger.
      if (kind === "release") return;
      // With a pointer the ship follows the finger. Without one it is the
      // keyboard, which must still fire - the brick breaker shipped unplayable
      // by keyboard for exactly this reason and only a screenshot found it.
      if (where) targetX = where.x;
      else if (kind === "press") cool = 0;
    },
    step(dt) {
      t += dt;
      pop = Math.max(0, pop - dt * 4);
      parts = stepParticles(parts, dt);

      const dx = targetX - px;
      px += Math.sign(dx) * Math.min(Math.abs(dx), r.playerSpeed * dt);
      px = Math.max(18, Math.min(W - 18, px));

      // Firing is automatic and cooldown-limited, which is what the check
      // measures. A fire button would make the real rate the player's thumb.
      cool -= dt;
      if (cool <= 0) {
        cool = r.fireCooldown;
        shots.push({ x: px, y: FLEET.playerY - 16 });
        h.sfx("flap");
      }

      for (const s of shots) s.y -= r.shotSpeed * dt;
      shots = shots.filter((s) => s.y > -10);

      fleetX += r.fleetSpeed * dir * dt;
      if (fleetX <= 0 || fleetX + size.width >= W) {
        fleetX = Math.max(0, Math.min(W - size.width, fleetX));
        dir *= -1;
        fleetY += r.fleetDescent;
      }

      // Player shots against the fleet.
      for (const s of shots) {
        for (let i = 0; i < alive.length; i++) {
          if (!alive[i]) continue;
          const col = i % r.fleetCols;
          const row = Math.floor(i / r.fleetCols);
          const ax = alienX(col);
          const ay = alienY(row);
          if (Math.abs(s.x - ax) < FLEET.size / 2 + 4 && Math.abs(s.y - ay) < FLEET.size / 2 + 4) {
            alive[i] = false;
            s.y = -100;
            pop = 1;
            spawnBurst(parts, ax, ay, 8);
            h.addScore(spec.scoring.pointsPerObstacle);
            break;
          }
        }
      }
      shots = shots.filter((s) => s.y > -10);

      // Return fire, only from the front rank.
      enemyCool -= dt;
      if (r.enemyFireRate > 0 && enemyCool <= 0) {
        enemyCool = 1 / r.enemyFireRate;
        const rank = front();
        if (rank.length) {
          const pick = rank[Math.floor(rng() * rank.length) % rank.length];
          incoming.push({ x: alienX(pick.col), y: alienY(pick.row) + FLEET.size / 2 });
        }
      }
      for (const s of incoming) s.y += r.enemyShotSpeed * dt;
      incoming = incoming.filter((s) => {
        const struck =
          s.y > FLEET.playerY - 14 && s.y < FLEET.playerY + 14 && Math.abs(s.x - px) < 16;
        if (struck) hitPlayer();
        return !struck && s.y < H + 20;
      });

      if (fleetY + size.height >= FLEET.contactY) {
        hitPlayer();
        layout();
      }

      if (alive.every((a) => !a)) {
        // A cleared wave is worth a bonus and then a fresh fleet, one step
        // lower. The check certifies clearing ONE wave; every wave after it is
        // the same fleet against a player who has already proved they can.
        wave++;
        h.addScore(spec.scoring.pointsPerObstacle * 3);
        h.sfx("win");
        h.shake(0.4);
        layout();
        fleetY = FLEET.top + Math.min(60, (wave - 1) * 12);
      }
    },
    draw() {
      const { ctx, paint: p, palette } = h;
      p.sky(palette, W, H, spec.theme.background !== "sky");

      /**
       * Stars, not clouds.
       *
       * The first version reused the shared `clouds`, and a screenshot showed
       * why that was two mistakes at once: this is a space game, and the
       * biggest cloud parked itself directly behind the score. A drifting
       * starfield costs one loop, reads as space, and leaves the top of the
       * screen clear for the HUD.
       */
      ctx.save();
      ctx.fillStyle = palette.white;
      for (let i = 0; i < 34; i++) {
        const sx = (i * 97.13) % W;
        const sy = ((i * 61.7 + t * (6 + (i % 3) * 5)) % (H + 40)) - 20;
        ctx.globalAlpha = 0.25 + (i % 4) * 0.14;
        ctx.fillRect(sx, sy, 1.8, 1.8);
      }
      ctx.restore();

      for (let i = 0; i < alive.length; i++) {
        if (!alive[i]) continue;
        const col = i % r.fleetCols;
        const row = Math.floor(i / r.fleetCols);
        const x = alienX(col);
        const y = alienY(row) + Math.sin(t * 3 + col) * 2;
        // A body, a darker underside and two eyes - enough to read as a ship
        // rather than a square, which is most of what makes a canvas a game.
        p.block(palette, x - FLEET.size / 2, y - FLEET.size / 2, FLEET.size, FLEET.size * 0.8, 7);
        // The outline is load-bearing, not decoration. On a night scene the
        // solid family and the sky family can both be dark - the palette is
        // free to pick any pair - and without a rim the fleet vanished into
        // the backdrop in the very first screenshot of this engine.
        ctx.strokeStyle = palette.white;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - FLEET.size / 2, y - FLEET.size / 2, FLEET.size, FLEET.size * 0.8);
        ctx.fillStyle = palette.white;
        ctx.beginPath();
        ctx.arc(x - 5, y - 2, 2.6, 0, Math.PI * 2);
        ctx.arc(x + 5, y - 2, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = palette.gold;
      for (const s of shots) ctx.fillRect(s.x - 2, s.y - 9, 4, 14);
      ctx.fillStyle = palette.danger;
      for (const s of incoming) ctx.fillRect(s.x - 2.5, s.y - 6, 5, 12);

      p.burst(palette, parts);
      p.block(palette, px - 20, FLEET.playerY + 6, 40, 12, 6);
      drawCharacter(h, spec, px, FLEET.playerY - 8, { scale: 0.62, bob: Math.sin(t * 4) * 1.5 });

      if (h.phase() === "playing")
        p.score(palette, String(h.score()), W / 2, 48, 40, pop);
    },
  };
};
