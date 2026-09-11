"use client";

import { WORLD, type Character } from "@/lib/arcade/schema";
import { DUEL } from "@/lib/arcade/duel";
import { CHARACTERS, loadCharacter, type Mood } from "./characters";
import { spawnBurst, stepParticles, type Particle } from "./paint";
import type { EngineFactory } from "./GameFrame";

/**
 * A sparring match - and the answer to "why is there no fighting game?".
 *
 * The whole thing is drawn from the SAME static sprites every other engine
 * uses. There are no animation frames anywhere in this repo and there did not
 * need to be: a lunge is a translate, a block is a crouch and a lean away, a
 * hit is a recoil, a knockdown is a rotation. `drawCharacter` already did this
 * for the flyer's tilt; the duel just asks more of it. The recorded reason for
 * refusing a fighting game - "Pandai's avatars are single static PNGs" - was a
 * true fact with a false conclusion attached.
 *
 * It lives in its own file rather than in `engines.tsx` because that file was
 * already 850 lines of engines, and one more with its own vocabulary of
 * windups and blocks would have made it the place nobody wants to open.
 *
 * The opponent has a stated REACTION TIME and obeys it. An AI that reads inputs
 * frame-perfectly is unbeatable and feels like cheating; one that must SEE a
 * windup before it can block is beatable, learnable, and - the reason it is
 * built this way - checkable, because "can a player land a hit?" becomes a
 * question `duelPlayability` can answer before anyone plays.
 *
 * This renderer and that simulation must stay in step. They share the same
 * exchange: windup, land-or-block, recovery; and the same two delayed
 * observations, one for the windup and one for the opening. If they drift, the
 * check is describing a game nobody plays - the mistake this repo has caught
 * itself making four times.
 */

const W = WORLD.width;
const H = WORLD.height;

/** The other mascot, so a duel never has someone fighting themselves. */
function otherCharacter(who: Character): Character {
  return who === "pbot" ? "aidan" : who === "aidan" ? "nadia" : "pbot";
}

type Side = {
  x: number;
  windup: number;
  recovery: number;
  blocking: number;
  blockCooldown: number;
  hurt: number;
  hits: number;
  facing: 1 | -1;
};

const side = (x: number, facing: 1 | -1): Side => ({
  x,
  windup: 0,
  recovery: 0,
  blocking: 0,
  blockCooldown: 0,
  hurt: 0,
  hits: 0,
  facing,
});

export const duelFactory: EngineFactory = (h, spec) => {
  if (spec.engine !== "duel") throw new Error("wrong engine");
  const r = spec.rules;
  const FLOOR = DUEL.floorY;
  /**
   * Fighters are drawn far larger than in the other engines.
   *
   * A flyer's character is a token you steer past obstacles, and 46px is
   * plenty. A duel is two characters LOOKING at each other, and the whole game
   * is reading a windup off the other one - at 46px on a 360px stage they were
   * two dots at the bottom of an empty sky, and the tell was invisible.
   */
  const SCALE = 1.9;
  const opponent = spec.theme.opponent ?? otherCharacter(spec.theme.character);

  let me = side(W / 2 - DUEL.startGap / 2, 1);
  let foe = side(W / 2 + DUEL.startGap / 2, -1);
  let hold = 0;
  let t = 0;
  let parts: Particle[] = [];
  let seen = -Infinity;
  let watching = false;
  let openSeen = -Infinity;
  let watchingOpen = false;
  let nextPoke = 1.2 - r.opponentAggression;

  /**
   * The opponent's sprites, loaded here rather than by GameFrame.
   *
   * `h.sprites()` only ever holds the PLAYER's character - every other engine
   * has exactly one fighter, so the shell had no reason to load a second. The
   * duel loads its own and degrades to a drawn shape if it never arrives, the
   * same rule the character loader follows everywhere else.
   */
  let foeSprites: Record<Mood, HTMLImageElement> | null = null;
  void loadCharacter(opponent).then((loaded) => {
    foeSprites = loaded;
  });

  const busy = (f: Side) => f.windup > 0 || f.recovery > 0;
  const gap = () => Math.abs(foe.x - me.x);

  const tick = (f: Side, dt: number) => {
    f.windup = Math.max(0, f.windup - dt);
    f.recovery = Math.max(0, f.recovery - dt);
    f.blocking = Math.max(0, f.blocking - dt);
    f.blockCooldown = Math.max(0, f.blockCooldown - dt);
    f.hurt = Math.max(0, f.hurt - dt);
  };

  const strike = (f: Side) => {
    f.windup = r.strikeWindup;
  };

  return {
    reset() {
      me = side(W / 2 - DUEL.startGap / 2, 1);
      foe = side(W / 2 + DUEL.startGap / 2, -1);
      hold = 0;
      t = 0;
      parts = [];
      nextPoke = 1.2 - r.opponentAggression;
      seen = -Infinity;
      watching = false;
      openSeen = -Infinity;
      watchingOpen = false;
    },

    control(c, down) {
      if (c === "left" || c === "right") {
        const d = c === "left" ? -1 : 1;
        // Only the arrow that set the step may end it, so tapping Strike
        // while holding a direction does not stop you.
        if (down) hold = d;
        else if (hold === d) hold = 0;
        return;
      }
      if (down && (c === "a" || c === "up") && !busy(me) && h.phase() === "playing") {
        strike(me);
        h.sfx("flap");
      }
    },

    input(kind, where) {
      if (kind === "release") {
        hold = 0;
        return;
      }
      // A drag re-aims the step and never strikes.
      if (kind === "move") {
        if (where && where.y >= H * 0.34) hold = where.x < W / 2 ? -1 : 1;
        return;
      }
      // A press with no pointer position is the keyboard, and the keyboard
      // strikes - the same rule the platformer needed. Arrow keys arrive WITH a
      // position, so they walk.
      if (!where) {
        if (!busy(me) && h.phase() === "playing") {
          strike(me);
          h.sfx("flap");
        }
        return;
      }
      if (where.y < H * 0.34) {
        if (!busy(me) && h.phase() === "playing") {
          strike(me);
          h.sfx("flap");
        }
      } else {
        hold = where.x < W / 2 ? -1 : 1;
      }
    },

    step(dt) {
      t += dt;
      parts = stepParticles(parts, dt);
      if (h.phase() !== "playing") return;

      // --- the player -----------------------------------------------------
      const wasWinding = me.windup > 0;
      tick(me, dt);
      if (wasWinding && me.windup === 0) {
        me.recovery = r.strikeRecovery;
        if (gap() <= r.reach && foe.blocking <= 0) {
          me.hits++;
          foe.hurt = 0.28;
          h.shake(0.5);
          spawnBurst(parts, foe.x, FLOOR - 70, 10);
          h.addScore(spec.scoring.pointsPerObstacle);
          if (me.hits >= r.hitsToWin) {
            h.finish();
            return;
          }
        } else if (gap() <= r.reach) {
          // Blocked. A duller sound than a clean hit, so the difference is
          // audible as well as visible - that is how a player learns the tell.
          h.shake(0.2);
          h.sfx("hit");
        }
      }
      if (!busy(me) && hold !== 0) me.x += hold * r.moveSpeed * dt;

      // --- the opponent ---------------------------------------------------
      const foeWasWinding = foe.windup > 0;
      tick(foe, dt);
      if (foeWasWinding && foe.windup === 0) {
        foe.recovery = r.strikeRecovery;
        if (gap() <= r.reach && me.blocking <= 0) {
          me.hurt = 0.28;
          h.shake(1);
          spawnBurst(parts, me.x, FLOOR - 70, 10);
          h.loseLife();
          return;
        }
      }

      // It acts only on what it has been watching long enough - never sooner.
      if (me.windup > 0) {
        if (!watching) {
          watching = true;
          seen = t;
        }
      } else watching = false;
      const canSee = watching && t - seen >= r.opponentReaction;

      if (me.recovery > 0) {
        if (!watchingOpen) {
          watchingOpen = true;
          openSeen = t;
        }
      } else watchingOpen = false;
      const canPunish = watchingOpen && t - openSeen >= r.opponentReaction;

      if (!busy(foe)) {
        if (canSee && foe.blocking <= 0 && foe.blockCooldown <= 0) {
          foe.blocking = me.windup + 0.06;
          foe.blockCooldown = foe.blocking + 0.28;
        } else if (
          gap() <= r.reach &&
          r.opponentAggression > 0.15 &&
          (canPunish || t >= nextPoke)
        ) {
          strike(foe);
          nextPoke = t + 1.4 - r.opponentAggression;
        } else if (gap() > r.reach * 0.9 && r.opponentAggression > 0.3) {
          foe.x += Math.sign(me.x - foe.x) * r.moveSpeed * dt * r.opponentAggression;
        }
      }

      me.x = Math.max(28, Math.min(W - 28, me.x));
      foe.x = Math.max(28, Math.min(W - 28, foe.x));
      me.facing = foe.x >= me.x ? 1 : -1;
      foe.facing = me.x >= foe.x ? 1 : -1;
    },

    draw() {
      const { ctx, paint: p, palette } = h;
      p.sky(palette, W, H, spec.theme.background === "night");
      p.clouds(palette, W, H, t * 14);
      p.hills(palette, W, FLOOR + 8, t * 7);
      p.bushes(palette, W, FLOOR + 12, t * 11);
      p.ground(palette, W, FLOOR, H - FLOOR, 0);

      // The opponent's health, as pips along the top. The player's is the row
      // of hearts GameFrame already draws, so only one bar belongs here.
      const pipW = 16;
      const pipGap = 5;
      const total = r.hitsToWin * pipW + (r.hitsToWin - 1) * pipGap;
      for (let i = 0; i < r.hitsToWin; i++) {
        const x = (W - total) / 2 + i * (pipW + pipGap);
        const alive = i < r.hitsToWin - me.hits;
        ctx.globalAlpha = alive ? 0.95 : 0.3;
        ctx.fillStyle = alive ? palette.danger : palette.white;
        ctx.beginPath();
        ctx.roundRect(x, 26, pipW, 9, 4);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      drawFighter(foe, opponent);
      drawFighter(me, spec.theme.character);
      p.burst(palette, parts);

      if (h.phase() === "playing") {
        p.score(palette, `${me.hits} / ${r.hitsToWin}`, W / 2, 74, 26);
      }

      function drawFighter(f: Side, who: Character) {
        const art = CHARACTERS[who];
        // Every pose is a transform of one static sprite.
        const lunge =
          f.windup > 0
            ? 1 - f.windup / r.strikeWindup
            : f.recovery > 0
              ? f.recovery / r.strikeRecovery
              : 0;
        const push = lunge * r.reach * 0.42 * f.facing;
        const guarding = f.blocking > 0 ? 1 : 0;
        const recoil = f.hurt > 0 ? (f.hurt / 0.28) * 15 * -f.facing : 0;
        const bob = Math.sin(t * 4 + (f === foe ? 1.6 : 0)) * 3;

        // A shadow anchors the fighter to the floor; without it both of them
        // hover, which is the single clearest tell that a thing was pasted on.
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = palette.ink;
        ctx.beginPath();
        ctx.ellipse(f.x + push, FLOOR - 3, art.size * SCALE * 0.42, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const sprites = f === me ? h.sprites() : foeSprites;
        const img = sprites?.[f.hurt > 0 ? "dead" : h.phase() === "ready" ? "idle" : "flying"];
        const size = art.size * SCALE * (guarding ? 0.92 : 1);

        ctx.save();
        // Placed by the FEET, not by a fixed offset: a bigger sprite has to
        // stand on the floor, not hover above it or sink into it.
        ctx.translate(f.x + push + recoil, FLOOR - size / 2 - 4 + bob + guarding * 8);
        ctx.rotate(guarding * -0.16 * f.facing + (f.hurt > 0 ? 0.22 * -f.facing : 0));
        // Mirrored so the two always face each other.
        ctx.scale(f.facing, 1);
        if (img && img.complete && img.naturalWidth > 0) {
          if (art.circular) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, -size / 2, -size / 2, size, size);
            ctx.restore();
            ctx.strokeStyle = palette.white;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, size / 2 - 1, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            ctx.drawImage(img, -size / 2, -size / 2, size, size);
          }
        } else {
          ctx.fillStyle = palette.white;
          ctx.strokeStyle = palette.deep;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, size / 2.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();

        // The strike: an arc sweeping out to `reach` while the windup runs, so
        // the tell is visible and the range is honest.
        if (f.windup > 0) {
          const k = 1 - f.windup / r.strikeWindup;
          ctx.save();
          ctx.globalAlpha = 0.25 + k * 0.55;
          ctx.strokeStyle = palette.white;
          ctx.lineWidth = 5;
          ctx.lineCap = "round";
          ctx.beginPath();
          const rad = r.reach * (0.45 + k * 0.55);
          const midY = FLOOR - art.size * SCALE * 0.5;
          if (f.facing > 0) ctx.arc(f.x, midY, rad, -0.8, 0.5);
          else ctx.arc(f.x, midY, rad, Math.PI - 0.5, Math.PI + 0.8);
          ctx.stroke();
          ctx.restore();
        }

        if (f.blocking > 0) {
          ctx.save();
          ctx.globalAlpha = 0.75;
          ctx.strokeStyle = palette.gold;
          ctx.lineWidth = 4;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.arc(f.x + 26 * f.facing, FLOOR - art.size * SCALE * 0.5, 32, -1.1, 1.1);
          ctx.stroke();
          ctx.restore();
        }
      }
    },
  };
};
