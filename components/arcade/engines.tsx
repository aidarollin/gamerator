"use client";

import { WORLD, type ArcadeSpec } from "@/lib/arcade/schema";
import { gapCentres, flyerAt, SIM } from "@/lib/arcade/simulate";
import { buildLevel, LEVEL, type Plat } from "@/lib/arcade/level";
import { runnerAt, runnerObstacleX } from "@/lib/arcade/engines";
import { duelFactory } from "./duel-engine";
import { shooterFactory } from "./shooter-engine";
import { mazeFactory } from "./maze-engine";
import { blocksFactory } from "./blocks-engine";
import { match3Factory } from "./match3-engine";
import {
  activate,
  initPowers,
  magnetPull,
  obstaclesRetracted,
  POWER,
  powerRng,
  stepPowers,
} from "@/lib/arcade/powerups";
import {
  coinOffsets as flyerCoinOffsets,
  coinPos as flyerCoinPos,
  obstacleX as flyerObstacleX,
  COIN_REACH,
} from "@/lib/arcade/collect";
import { makeRng } from "@/lib/game/random";
import { CHARACTERS } from "./characters";
import { spawnBurst, stepParticles, type Particle } from "./paint";
import { makeRng as rngFor } from "@/lib/game/random";
import type { ControlLayout, Engine, EngineFactory, EngineHost } from "./GameFrame";

/**
 * The ten engines. Each is only its own logic - the canvas, palette, loop,
 * input and screens all live in GameFrame.
 *
 * Every one of them generates its level from a seeded RNG so the same spec
 * always produces the same game, and so the validator's checks describe the
 * game that actually gets played.
 */

const W = WORLD.width;
const H = WORLD.height;

/* ---------------------------------------------------------- endless-flyer */

export const flyerFactory: EngineFactory = (h, spec) => {
  if (spec.engine !== "endless-flyer") throw new Error("wrong engine");
  const r = spec.rules;
  const art = CHARACTERS[spec.theme.character];
  const centres = gapCentres(r, 400);
  const GROUND = 42;
  const floor = H - GROUND;

  let y = H / 2, vy = 0, dist = 0, dead = false, t = 0, pop = 0, flapAnim = 0;
  let passed = 0, tilt = 0;
  let parts: Particle[] = [];

  /**
   * Collectibles, adopted from Flying Sushi.
   *
   * Without them the flight path has nothing to aim at - you survive, you do
   * not play. They sit offset from the flight line so taking one costs a little
   * safety, which is the whole point. Deterministic, and OPTIONAL: they never
   * gate progress, so the playability simulation does not need to know.
   *
   * The GEOMETRY lives in lib/arcade/collect.ts rather than here, for the same
   * reason gapCentres does: a rule trapped in a closure cannot be measured, and
   * this one was silently wrong for a whole session because of it. No coin was
   * collectable and nothing said so - a coin nobody takes looks exactly like a
   * coin nobody wanted.
   */
  const coinOffsets = flyerCoinOffsets(400);
  const taken = new Set<number>();

  /**
   * Power-ups. They may only ever make the run EASIER - see
   * lib/arcade/powerups.ts - because the playability simulation proved a
   * perfect player survives THESE physics, and a power-up that sped the world
   * up would leave that proof describing a game that no longer exists.
   *
   * `pulled` holds coins the magnet has dragged off their generated position.
   * The geometry stays pure; this is the displacement on top of it.
   */
  const powers = initPowers();
  /**
   * Seeded from the spec's IDENTITY, not from `JSON.stringify(rules)`.
   *
   * The stringify version worked and was quietly fragile: key order in a parsed
   * Zod object follows the schema definition, so reordering two fields in
   * `EndlessFlyer` would have silently changed the power-up sequence of every
   * game ever generated. A seed has to be stable under refactors that do not
   * change meaning.
   *
   * Engine plus title: distinctive per game, stable forever, and readable.
   */
  const pRng = powerRng(`${spec.engine}:${spec.meta.title}`);
  const pulled = new Map<number, { x: number; y: number }>();
  let rushCoins: { x: number; y: number; got: boolean }[] = [];
  const coinNow = (i: number) => pulled.get(i) ?? coinPos(i);

  // The physics in force RIGHT NOW, from the same function the validator
  // simulates. If the renderer ramped any other way the playability check would
  // be verifying a game nobody plays.
  const at = () => flyerAt(r, passed);

  // Declared HERE, above the return, and that placement is load-bearing. These
  // replaced two hoisted `function` declarations that sat below it, which was
  // fine for functions and fatal for consts: `return` runs first, the consts
  // are never evaluated, and every draw threw on the temporal dead zone. The
  // canvas rendered sky and hills and then stopped, the bird never appeared,
  // and `npm run check` was green throughout - TypeScript does not track
  // use-before-init across a closure, and no test renders.
  const obstacleX = (n: number) => flyerObstacleX(r, n);
  const coinPos = (n: number) => flyerCoinPos(r, centres, coinOffsets, n);

  const die = () => {
    if (dead) return;
    dead = true;
    h.shake(1);
    spawnBurst(parts, SIM.birdX, y);
    h.loseLife();
    if (h.phase() === "playing") {
      window.setTimeout(() => { y = H / 2; vy = 0; dead = false; }, 600);
    }
  };

  return {
    reset() {
      y = H / 2; vy = 0; dist = 0; passed = 0; dead = false; parts = [];
      taken.clear(); pulled.clear(); rushCoins = [];
      Object.assign(powers, initPowers());
    },
    input(kind) {
      if (kind === "press" && !dead && h.phase() === "playing") {
        vy = r.flapVelocity;
        flapAnim = 1;
        h.sfx("flap");
      }
    },
    step(dt) {
      t += dt; pop = Math.max(0, pop - dt * 4); flapAnim = Math.max(0, flapAnim - dt * 5);
      parts = stepParticles(parts, dt);
      if (dead) return;
      const now = at();
      vy += r.gravity * dt; y += vy * dt; dist += now.scrollSpeed * dt;

      // Lerped tilt, borrowed from Flying Sushi. Assigning the target angle
      // directly - which this did - reads stiff; easing into it reads alive.
      const targetTilt = Math.max(-0.45, Math.min(1, vy / 650));
      tilt += (targetTilt - tilt) * Math.min(1, dt * 10);

      if (y - art.radius <= 0) { y = art.radius; vy = 0; }
      if (y + art.radius >= floor) { y = floor - art.radius; die(); return; }

      /**
       * Power-ups. A bubble is placed a few gaps ahead, on the flight line, so
       * it is reachable without abandoning the run - the whole point is a
       * reward for playing well, not a detour that kills you.
       */
      stepPowers(powers, dt, pRng, () => {
        // Just over a gap ahead - roughly a screen and a half - so it enters
        // view within a couple of seconds and can be LINED UP FOR. The first
        // version spawned three and a half gaps out, about eleven seconds of
        // travel: far enough that most rolls were spent on a bubble the run
        // ended before reaching, and a player never saw it coming.
        const c = coinPos(passed + 1);
        return { x: c.x + at().gapSpacing * 0.5, y: c.y };
      });

      if (powers.pending) {
        const bx = SIM.birdX + powers.pending.x - dist;
        if (Math.hypot(bx - SIM.birdX, powers.pending.y - y) < COIN_REACH + 10) {
          const kind = powers.pending.kind;
          activate(powers, kind);
          h.sfx("power");
          spawnBurst(parts, bx, powers.pending?.y ?? y, 14);
          if (kind === "rush") {
            // The frenzy: a sine wave of coins along the flight line, in the
            // stretch the retracted obstacles have just cleared.
            rushCoins = Array.from({ length: 26 }, (_, k) => ({
              x: dist + 120 + k * 26,
              y: H / 2 + Math.sin(k * 0.5) * 110,
              got: false,
            }));
          }
        } else if (powers.pending.x < dist - 60) {
          powers.pending = null; // missed, and gone
        }
      }

      // The magnet drags nearby coins toward the player.
      if (powers.active === "magnet") {
        for (let i = passed - 1; i <= passed + 4; i++) {
          if (i <= 0 || taken.has(i)) continue;
          pulled.set(i, magnetPull(powers, coinNow(i), { x: dist, y }, dt));
        }
        for (const c of rushCoins) {
          if (c.got) continue;
          const moved = magnetPull(powers, c, { x: dist, y }, dt);
          c.x = moved.x; c.y = moved.y;
        }
      }

      for (const c of rushCoins) {
        if (c.got) continue;
        if (Math.hypot(c.x - dist, c.y - y) < COIN_REACH) {
          c.got = true; pop = 1;
          spawnBurst(parts, SIM.birdX + c.x - dist, c.y, 5);
          h.sfx("coin");
          h.addScore(spec.scoring.pointsPerObstacle);
        }
      }

      // Collect any coin the player is overlapping.
      for (let i = passed; i <= passed + 3; i++) {
        if (i <= 0 || taken.has(i)) continue;
        const c = coinNow(i);
        const cx = SIM.birdX + c.x - dist;
        if (Math.hypot(c.x - dist, c.y - y) < COIN_REACH) {
          taken.add(i);
          pop = 1;
          spawnBurst(parts, cx, c.y, 7);
          h.sfx("coin");
          h.addScore(spec.scoring.pointsPerObstacle);
        }
      }

      // Obstacles are spaced by the ramp, so their x positions are a running
      // sum rather than index * spacing.
      const nextX = obstacleX(passed + 1);
      if (nextX - dist <= 0) {
        const c = centres[(passed + 1) % centres.length];
        const half = flyerAt(r, passed + 1).gapHeight / 2;
        // Power Rush retracts the obstacles instead of speeding the world up.
        // Retracting can only ever make a run easier, which is what keeps the
        // playability proof true; speeding it up would invalidate it.
        const clear = obstaclesRetracted(powers);
        if (!clear && (y - art.radius < c - half || y + art.radius > c + half)) return die();
        passed += 1;
        pop = 1;
        h.addScore(spec.scoring.pointsPerObstacle);
      }
    },
    draw() {
      const { ctx, paint: p, palette } = h;
      const night = spec.theme.background === "night";
      p.sky(palette, W, H, night);
      p.clouds(palette, W, H, dist);
      p.hills(palette, W, floor, dist);
      p.bushes(palette, W, floor, dist);

      // Coins are drawn behind the pipes so a pipe edge never hides one.
      for (let i = passed; i <= passed + 5; i++) {
        if (i <= 0 || taken.has(i)) continue;
        const c = coinNow(i);
        const cx = SIM.birdX + c.x - dist;
        if (cx < -30 || cx > W + 30) continue;
        p.coin(palette, cx, c.y, 22, Math.abs(Math.cos(t * 3 + i)) * 0.8 + 0.2);
      }
      for (const c of rushCoins) {
        if (c.got) continue;
        const cx = SIM.birdX + c.x - dist;
        if (cx < -30 || cx > W + 30) continue;
        p.coin(palette, cx, c.y, 20, Math.abs(Math.cos(t * 4 + c.x)) * 0.8 + 0.2);
      }
      if (powers.pending) {
        const bx = SIM.birdX + powers.pending.x - dist;
        if (bx > -40 && bx < W + 40)
          p.bubble(palette, bx, powers.pending.y, 17, powers.pending.kind, t);
      }

      // Obstacles SLIDE out of frame during a rush rather than vanishing: a
      // pipe that blinks out reads as a glitch, one that retracts reads as the
      // power-up doing something.
      const retract = obstaclesRetracted(powers)
        ? Math.min(1, (POWER.rush.duration - powers.left) / 0.5)
        : 0;
      for (let i = passed; i <= passed + 5; i++) {
        if (i <= 0) continue;
        const c = centres[i % centres.length];
        const half = flyerAt(r, i).gapHeight / 2;
        const x = SIM.birdX + obstacleX(i) - dist;
        if (x < -80 || x > W + 80) continue;
        const w = 54;
        const lift = retract * (H * 0.75);
        p.block(palette, x - w / 2, -30 - lift, w, c - half + 30, 8);
        p.block(palette, x - w / 2, c + half + lift, w, floor - (c + half), 8);
        p.cap(palette, x - w / 2, c - half - 18 - lift, w, 18);
        p.cap(palette, x - w / 2, c + half + lift, w, 18);
      }
      p.ground(palette, W, floor, GROUND, dist);
      p.burst(palette, parts);
      void ctx;
      drawCharacter(h, spec, SIM.birdX, y, {
        tilt: tilt + (dead ? t * 2 : 0),
        bob: h.phase() === "ready" ? Math.sin(t * 3) * 6 : 0,
        squash: 1 + flapAnim * 0.12,
        dead,
      });
      if (h.phase() === "playing") p.score(palette, String(h.score()), W / 2, 76, 50, pop);
      if (powers.active && h.phase() === "playing") {
        // Drawn through the score painter, which strokes white behind an ink
        // fill. Plain ink text was invisible on a night scene - the same bug
        // the hearts had, and for the same reason: the canvas can be any
        // colour, so anything on it carries its own contrast.
        p.score(
          palette,
          `${powers.active === "magnet" ? "MAGNET" : "RUSH"}  ${powers.left.toFixed(1)}s`,
          W / 2,
          120,
          17,
        );
      }
    },
  };
};

/* ----------------------------------------------------------- brick-breaker */

export const brickFactory: EngineFactory = (h, spec) => {
  if (spec.engine !== "brick-breaker") throw new Error("wrong engine");
  const r = spec.rules;
  const PAD_Y = H - 54, PAD_H = 14, BALL = 8;
  const top = 90, brickH = 22, pad = 6;
  const bw = (W - pad * (r.cols + 1)) / r.cols;

  let bricks: { x: number; y: number; alive: boolean }[] = [];
  let px = W / 2, targetX = W / 2, bx = W / 2, by = PAD_Y - 40, bvx = 0, bvy = 0;
  let launched = false, parts: Particle[] = [], pop = 0, t = 0;

  /**
   * Some bricks drop a coin when they break.
   *
   * A coin lying on a Breakout board would be unreachable - nothing on this
   * screen moves except the ball and the paddle - so the collectible has to
   * fall. That turns out to be the better idea anyway: catching a drop pulls
   * the paddle out from under the ball, so a bonus is paid for in safety
   * rather than in patience. Missing one costs nothing, which is what keeps it
   * optional and keeps the playability check honest.
   *
   * Which bricks drop is seeded, so the same spec always plays the same way.
   */
  const dropRng = rngFor(0xd1);
  const dropPlan = Array.from({ length: 200 }, () => dropRng());
  const DROP_SPEED = 145;
  let drops: { x: number; y: number }[] = [];

  const layout = () => {
    bricks = [];
    for (let row = 0; row < r.rows; row++)
      for (let col = 0; col < r.cols; col++)
        bricks.push({ x: pad + col * (bw + pad), y: top + row * (brickH + pad), alive: true });
  };
  const serve = () => {
    bx = px; by = PAD_Y - 30; launched = false;
    const a = (-60 - Math.random() * 60) * (Math.PI / 180);
    bvx = Math.cos(a) * r.ballSpeed; bvy = Math.sin(a) * r.ballSpeed;
  };

  return {
    reset() { layout(); px = W / 2; targetX = W / 2; serve(); parts = []; drops = []; },
    input(kind, where) {
      if (kind === "release") return;
      // A press with no pointer position is the keyboard. It must still launch,
      // or the game is unplayable without a mouse - which is how it shipped,
      // and only a screenshot showing a stuck score of 0 revealed it. A DRAG
      // steers but never launches.
      if (where) targetX = where.x;
      if (kind === "press") launched = true;
    },
    step(dt) {
      t += dt;
      pop = Math.max(0, pop - dt * 4);
      parts = stepParticles(parts, dt);
      // The paddle chases the finger at a bounded speed - it does not teleport,
      // which is the assumption the playability check is built on.
      const dx = targetX - px;
      px += Math.sign(dx) * Math.min(Math.abs(dx), r.paddleSpeed * dt);
      px = Math.max(r.paddleWidth / 2, Math.min(W - r.paddleWidth / 2, px));
      if (!launched) { bx = px; by = PAD_Y - 30; return; }

      bx += bvx * dt; by += bvy * dt;
      if (bx < BALL) { bx = BALL; bvx = Math.abs(bvx); }
      if (bx > W - BALL) { bx = W - BALL; bvx = -Math.abs(bvx); }
      if (by < BALL) { by = BALL; bvy = Math.abs(bvy); }

      if (by + BALL >= PAD_Y && by - BALL <= PAD_Y + PAD_H && Math.abs(bx - px) < r.paddleWidth / 2 + BALL) {
        by = PAD_Y - BALL;
        // Angle depends on where it hits: the control that makes it a game.
        const hit = (bx - px) / (r.paddleWidth / 2);
        const ang = (-90 + hit * 55) * (Math.PI / 180);
        bvx = Math.cos(ang) * r.ballSpeed; bvy = Math.sin(ang) * r.ballSpeed;
      }

      for (let bi = 0; bi < bricks.length; bi++) {
        const b = bricks[bi];
        if (!b.alive) continue;
        if (bx > b.x - BALL && bx < b.x + bw + BALL && by > b.y - BALL && by < b.y + brickH + BALL) {
          b.alive = false; bvy = -bvy; pop = 1;
          spawnBurst(parts, bx, by, 6);
          h.addScore(spec.scoring.pointsPerObstacle);
          if (dropPlan[bi % dropPlan.length] < 0.16)
            drops.push({ x: b.x + bw / 2, y: b.y + brickH });
          break;
        }
      }

      for (const d of drops) d.y += DROP_SPEED * dt;
      drops = drops.filter((d) => {
        const caught =
          d.y >= PAD_Y - 8 && d.y <= PAD_Y + PAD_H + 8 &&
          Math.abs(d.x - px) < r.paddleWidth / 2 + 10;
        if (caught) {
          spawnBurst(parts, d.x, d.y, 9);
          h.sfx("coin");
          h.addScore(spec.scoring.pointsPerObstacle * 2);
        }
        return !caught && d.y < H + 20;
      });

      if (bricks.every((b) => !b.alive)) { layout(); serve(); h.shake(0.4); }
      if (by > H + 30) { h.shake(1); spawnBurst(parts, bx, H - 10); h.loseLife(); serve(); }
    },
    draw() {
      const { paint: p, palette, ctx } = h;
      p.sky(palette, W, H, spec.theme.background === "night");
      for (const b of bricks) if (b.alive) p.block(palette, b.x, b.y, bw, brickH, 6);
      for (const d of drops) p.coin(palette, d.x, d.y, 18, Math.abs(Math.cos(t * 4 + d.x)) * 0.8 + 0.2);
      p.burst(palette, parts);
      p.block(palette, px - r.paddleWidth / 2, PAD_Y, r.paddleWidth, PAD_H, 7);
      ctx.fillStyle = palette.ink;
      ctx.beginPath(); ctx.arc(bx, by, BALL, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = palette.white;
      ctx.beginPath(); ctx.arc(bx - 2.5, by - 2.5, BALL * 0.35, 0, Math.PI * 2); ctx.fill();
      drawCharacter(h, spec, 30, H - 26, { scale: 0.55 });
      if (h.phase() === "playing") p.score(palette, String(h.score()), W / 2, 48, 40, pop);
    },
  };
};

/* --------------------------------------------------------------------- snake */

export const snakeFactory: EngineFactory = (h, spec) => {
  if (spec.engine !== "snake") throw new Error("wrong engine");
  const r = spec.rules;
  const cell = Math.floor(Math.min(W / r.gridCols, (H - 90) / r.gridRows));
  const ox = (W - cell * r.gridCols) / 2, oy = 78;

  let snake = [{ x: 4, y: 4 }], dir = { x: 1, y: 0 }, next = { x: 1, y: 0 };
  let food = { x: 8, y: 8 }, acc = 0, eaten = 0, rng = makeRng(1337), pop = 0;

  /**
   * A timed bonus, the way Nokia's snake did it.
   *
   * The food IS the collectible here, so a second permanent one would just be
   * more food. What snake actually lacks is a reason to take a RISK: the safe
   * play is a slow spiral, and it works. A bonus that is worth triple, sits
   * somewhere awkward, and EXPIRES is what makes cutting across your own body
   * worth considering.
   *
   * It does not grow the snake and does not count toward foodTarget - so it
   * cannot shorten the run, and the playability check still describes the game
   * being played.
   */
  const BONUS_EVERY = 4;
  const bonusLife = () =>
    Math.min(12, Math.max(4, (2 * (r.gridCols + r.gridRows)) / (r.startSpeed + r.speedUp * eaten)));
  let bonusMax = 6;
  let bonus: { x: number; y: number; left: number } | null = null;

  const free = (x: number, y: number) =>
    !snake.some((s) => s.x === x && s.y === y) && !(food.x === x && food.y === y);

  const placeFood = () => {
    for (let i = 0; i < 400; i++) {
      const f = { x: Math.floor(rng() * r.gridCols), y: Math.floor(rng() * r.gridRows) };
      if (!snake.some((s) => s.x === f.x && s.y === f.y)) return (food = f);
    }
  };

  const placeBonus = () => {
    for (let i = 0; i < 400; i++) {
      const x = Math.floor(rng() * r.gridCols), y = Math.floor(rng() * r.gridRows);
      if (free(x, y)) {
        bonusMax = bonusLife();
        return (bonus = { x, y, left: bonusMax });
      }
    }
  };

  return {
    reset() {
      snake = [{ x: 3, y: 3 }, { x: 2, y: 3 }];
      dir = { x: 1, y: 0 }; next = { x: 1, y: 0 };
      eaten = 0; acc = 0; bonus = null; rng = makeRng(1337); placeFood();
    },
    control(c, down) {
      if (!down || c === "a") return;
      const want = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } }[c];
      // Reversing into your own neck is instant death and always a misinput.
      if (want.x !== -dir.x || want.y !== -dir.y) next = want;
    },
    input(kind, where) {
      if (kind !== "press" || !where) return;
      // Swipe-free steering: tap the side of the head you want to turn towards.
      const head = snake[0];
      const hx = ox + head.x * cell + cell / 2, hy = oy + head.y * cell + cell / 2;
      const dx = where.x - hx, dy = where.y - hy;
      const want = Math.abs(dx) > Math.abs(dy)
        ? { x: Math.sign(dx), y: 0 }
        : { x: 0, y: Math.sign(dy) };
      // Reversing into your own neck is instant death and always a misinput.
      if (want.x !== -dir.x || want.y !== -dir.y) next = want;
    },
    step(dt) {
      pop = Math.max(0, pop - dt * 4);
      // The bonus expires in REAL time, not in moves, so it must tick before
      // the early return below - otherwise a slow snake would get a longer
      // window than a fast one for the same six seconds on the clock.
      if (bonus) {
        bonus.left -= dt;
        if (bonus.left <= 0) bonus = null;
      }
      const speed = r.startSpeed + r.speedUp * eaten;
      acc += dt;
      if (acc < 1 / speed) return;
      acc = 0;
      dir = next;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (r.wallsKill && (head.x < 0 || head.y < 0 || head.x >= r.gridCols || head.y >= r.gridRows)) {
        h.shake(1); h.loseLife(); this.reset(); return;
      }
      head.x = (head.x + r.gridCols) % r.gridCols;
      head.y = (head.y + r.gridRows) % r.gridRows;
      if (snake.some((s) => s.x === head.x && s.y === head.y)) {
        h.shake(1); h.loseLife(); this.reset(); return;
      }
      snake.unshift(head);
      // Checked separately from the food, and deliberately does not touch the
      // grow / pop branch below: a bonus is points, never length.
      if (bonus && head.x === bonus.x && head.y === bonus.y) {
        bonus = null; pop = 1;
        h.sfx("coin");
        h.addScore(spec.scoring.pointsPerObstacle * 3);
      }
      if (head.x === food.x && head.y === food.y) {
        eaten++; pop = 1; placeFood();
        h.addScore(spec.scoring.pointsPerObstacle);
        if (eaten % BONUS_EVERY === 0 && !bonus) placeBonus();
        if (eaten >= r.foodTarget) h.finish();
      } else snake.pop();
    },
    draw() {
      const { ctx, paint: p, palette } = h;
      p.sky(palette, W, H);
      p.board(palette, ox, oy, r.gridCols, r.gridRows, cell);
      ctx.fillStyle = palette.gold;
      ctx.beginPath();
      ctx.arc(ox + food.x * cell + cell / 2, oy + food.y * cell + cell / 2, cell * 0.32, 0, Math.PI * 2);
      ctx.fill();
      if (bonus)
        p.sparkle(
          palette,
          ox + bonus.x * cell + cell / 2,
          oy + bonus.y * cell + cell / 2,
          cell * 0.9,
          1 - bonus.left / bonusMax,
        );
      snake.forEach((s, i) => {
        const inset = i === 0 ? 1 : 2.5;
        p.block(palette, ox + s.x * cell + inset, oy + s.y * cell + inset, cell - inset * 2, cell - inset * 2, 5);
      });
      drawCharacter(h, spec, ox + snake[0].x * cell + cell / 2, oy + snake[0].y * cell + cell / 2, {
        scale: (cell * 1.4) / CHARACTERS[spec.theme.character].size,
      });
      if (h.phase() === "playing")
        p.score(palette, `${eaten}/${r.foodTarget}`, W / 2, 42, 30, pop);
    },
  };
};

/* ---------------------------------------------------------- endless-runner */

export const runnerFactory: EngineFactory = (h, spec) => {
  if (spec.engine !== "endless-runner") throw new Error("wrong engine");
  const r = spec.rules;
  const GROUND = 64, floor = H - GROUND, RX = 76, RH = 30;
  let y = floor - RH, vy = 0, dist = 0, onGround = true, dead = false;
  let parts: Particle[] = [], pop = 0, t = 0, passed = 0;

  /**
   * The runner ramps now, so obstacle positions are a RUNNING SUM of the
   * ramped spacing rather than `index * spacing`, and each obstacle has its own
   * height. Both come from `runnerAt`, the same function the playability check
   * walks - if the renderer spaced them any other way the check would be
   * describing a game nobody plays.
   */
  const at = (n: number) => runnerAt(r, n);
  const obstacleX = (n: number) => runnerObstacleX(r, n);

  /**
   * Coins between obstacles. Roughly half sit at running height and cost
   * nothing; the rest sit inside the jump arc, so taking one means leaving the
   * ground - which is also where the obstacles are.
   *
   * Deterministic, and OPTIONAL: they never gate progress, so the simulation
   * does not need to know they exist.
   */
  const coinRng = rngFor(0xc1);
  const coinPlan = Array.from({ length: 400 }, () => coinRng());
  const taken = new Set<number>();
  const apex = (r.jumpVelocity * r.jumpVelocity) / (2 * r.gravity);
  const hasCoin = (i: number) => coinPlan[i % coinPlan.length] < 0.8;
  const coinAt = (i: number) => ({
    x: obstacleX(i) + at(i).spacing / 2,
    y: coinPlan[i % coinPlan.length] < 0.45 ? floor - RH / 2 : floor - RH / 2 - apex * 0.55,
  });

  return {
    reset() {
      y = floor - RH; vy = 0; dist = 0; onGround = true; dead = false;
      parts = []; taken.clear(); passed = 0;
    },
    input(kind) {
      if (kind === "press" && onGround && !dead && h.phase() === "playing") {
        vy = r.jumpVelocity; onGround = false; h.sfx("flap");
      }
    },
    step(dt) {
      t += dt; pop = Math.max(0, pop - dt * 4);
      parts = stepParticles(parts, dt);
      if (dead) return;
      const now = at(passed);
      vy += r.gravity * dt; y += vy * dt; dist += now.scrollSpeed * dt;
      if (y >= floor - RH) { y = floor - RH; vy = 0; onGround = true; }

      // The obstacle currently arriving is the next one, `passed + 1`.
      const nextIndex = passed + 1;
      const nx = RX + obstacleX(nextIndex) - dist;
      const nh = at(nextIndex).obstacleHeight;
      if (nx < RX + 22 && nx > RX - 22 && y + RH > floor - nh) {
        dead = true; h.shake(1); spawnBurst(parts, RX, y); h.loseLife();
        if (h.phase() === "playing")
          window.setTimeout(() => { dead = false; dist += now.spacing * 0.6; }, 600);
        return;
      }
      if (nx <= RX - 22) {
        passed = nextIndex;
        pop = 1;
        h.addScore(spec.scoring.pointsPerObstacle);
      }

      // From passed - 1: the coin the player is currently passing through
      // belongs to the obstacle BEFORE the one arriving.
      for (let k = passed - 1; k <= passed + 2; k++) {
        if (k < 0 || taken.has(k) || !hasCoin(k)) continue;
        const c = coinAt(k);
        const cx = RX + c.x - dist;
        if (Math.abs(cx - RX) < 20 && Math.abs(c.y - (y + RH / 2)) < 24) {
          taken.add(k); pop = 1;
          spawnBurst(parts, cx, c.y, 7);
          h.sfx("coin");
          h.addScore(spec.scoring.pointsPerObstacle);
        }
      }
    },
    draw() {
      const { paint: p, palette } = h;
      p.sky(palette, W, H, spec.theme.background === "night");
      p.clouds(palette, W, H, dist);
      p.hills(palette, W, floor, dist);
      p.bushes(palette, W, floor, dist);
      // Coins behind the obstacles, so an obstacle edge never hides one.
      for (let k = passed - 1; k <= passed + 4; k++) {
        if (k < 0 || taken.has(k) || !hasCoin(k)) continue;
        const c = coinAt(k);
        const cx = RX + c.x - dist;
        if (cx < -30 || cx > W + 30) continue;
        p.coin(palette, cx, c.y, 22, Math.abs(Math.cos(t * 3 + k)) * 0.8 + 0.2);
      }
      for (let i = passed; i <= passed + 5; i++) {
        if (i <= 0) continue;
        const x = RX + obstacleX(i) - dist;
        if (x < -60 || x > W + 60) continue;
        const oh = at(i).obstacleHeight;
        p.block(palette, x - 16, floor - oh, 32, oh, 6);
      }
      p.ground(palette, W, floor, GROUND, dist);
      p.burst(palette, parts);
      drawCharacter(h, spec, RX, y + RH / 2, {
        tilt: onGround ? Math.sin(t * 14) * 0.08 : Math.max(-0.3, Math.min(0.4, vy / 900)),
        dead,
      });
      if (h.phase() === "playing") p.score(palette, String(h.score()), W / 2, 70, 48, pop);
    },
  };
};

/* ---------------------------------------------------------------- platformer */

export const platformerFactory: EngineFactory = (h, spec) => {
  if (spec.engine !== "platformer") throw new Error("wrong engine");
  const r = spec.rules;
  const PH = LEVEL.thickness, PW = 34;
  let plats: Plat[] = [], coins: { x: number; y: number; got: boolean }[] = [];
  let x = 40, y = 0, vx = 0, vy = 0, onGround = false, camX = 0, dead = false;
  let parts: Particle[] = [], pop = 0, goal = 0, hold = 0, t = 0;

  /**
   * The level comes from lib/arcade/level.ts, which sizes every gap against
   * what a jump reaches AT THAT RISE. The version that lived here picked
   * heights independently - up to 150px apart against a 144px jump - so some
   * seeds were simply impossible, and nothing said so.
   */
  const build = () => {
    const level = buildLevel(r);
    plats = level.plats;
    coins = level.coins.map((c) => ({ ...c, got: false }));
    goal = level.goal;
    x = plats[0].x + 20; y = plats[0].y - PH * 2; vx = 0; vy = 0; camX = 0;
  };

  return {
    reset() { build(); dead = false; parts = []; },
    control(c, down) {
      if (c === "left" || c === "right") {
        const d = c === "left" ? -1 : 1;
        // Only the button that set the direction may clear it, so letting go
        // of Jump - or of the other arrow - never stops you walking.
        if (down) hold = d;
        else if (hold === d) hold = 0;
        return;
      }
      if (down && (c === "a" || c === "up") && onGround && !dead) {
        vy = r.jumpVelocity; onGround = false; h.sfx("flap");
      }
    },
    input(kind, where) {
      if (kind === "release") { hold = 0; return; }
      // A drag re-aims the walk and never jumps: sliding a thumb up the screen
      // should not launch the character.
      if (kind === "move") {
        if (where && where.y >= H * 0.34) hold = where.x < W / 2 ? -1 : 1;
        return;
      }
      // Keyboard press with no position = jump, the primary action.
      if (!where) {
        if (onGround) { vy = r.jumpVelocity; onGround = false; h.sfx("flap"); }
        return;
      }
      // Left half walks left, right half walks right, top third jumps. One
      // thumb, no virtual d-pad to miss.
      if (where.y < H * 0.34) {
        if (onGround) { vy = r.jumpVelocity; onGround = false; h.sfx("flap"); }
      } else hold = where.x < W / 2 ? -1 : 1;
    },
    step(dt) {
      t += dt;
      pop = Math.max(0, pop - dt * 4);
      parts = stepParticles(parts, dt);
      if (dead) return;
      vx = hold * r.moveSpeed;
      vy += r.gravity * dt;
      x += vx * dt; y += vy * dt;
      onGround = false;
      for (const p of plats) {
        if (x + PW / 2 > p.x && x - PW / 2 < p.x + p.w && vy >= 0 && y + PH >= p.y && y + PH <= p.y + 26) {
          y = p.y - PH; vy = 0; onGround = true;
        }
      }
      for (const c of coins) {
        if (!c.got && Math.abs(c.x - x) < 24 && Math.abs(c.y - y) < 28) {
          c.got = true; pop = 1; spawnBurst(parts, c.x, c.y, 8);
          h.sfx("coin");
          h.addScore(spec.scoring.pointsPerObstacle);
        }
      }
      camX = Math.max(0, x - W * 0.35);
      if (y > H + 80) {
        dead = true; h.shake(1); h.loseLife();
        if (h.phase() === "playing") window.setTimeout(() => { build(); dead = false; }, 600);
      }
      if (x > goal - 40) { h.addScore(spec.scoring.pointsPerObstacle * 5); h.finish(); }
    },
    draw() {
      const { ctx, paint: p, palette } = h;
      p.sky(palette, W, H, spec.theme.background === "night");
      p.clouds(palette, W, H, camX);
      // Distant scenery only. There used to be a solid-looking ground strip
      // across the bottom that the player fell straight through to their death
      // - the level said "floor" and meant "pit", which is the least fair thing
      // a platformer can do. Now the platforms themselves are the terrain and
      // the gaps between them are visibly empty.
      p.hills(palette, W, H - 96, camX);
      ctx.save();
      ctx.translate(-camX, 0);
      // Each platform carries a pillar down out of frame, so a gap reads as a
      // hole in the ground rather than as a floating brick.
      for (const pl of plats) {
        p.block(palette, pl.x + 5, pl.y + PH - 4, pl.w - 10, H - pl.y, 4);
        p.block(palette, pl.x, pl.y, pl.w, PH, 6);
      }
      for (const c of coins) {
        if (c.got) continue;
        p.coin(palette, c.x, c.y, 20, Math.abs(Math.cos(t * 3 + c.x * 0.05)) * 0.8 + 0.2);
      }
      // The goal flag, standing ON the last platform rather than floating at a
      // fixed height near it.
      const last = plats[plats.length - 1];
      const poleTop = last.y - 150;
      p.block(palette, last.x + last.w - 26, poleTop, 8, 150, 3);
      ctx.fillStyle = palette.gold;
      ctx.beginPath();
      ctx.moveTo(last.x + last.w - 18, poleTop + 4);
      ctx.lineTo(last.x + last.w + 24, poleTop + 20);
      ctx.lineTo(last.x + last.w - 18, poleTop + 36);
      ctx.closePath(); ctx.fill();
      p.burst(palette, parts);
      ctx.restore();
      drawCharacter(h, spec, x - camX, y, { tilt: Math.max(-0.25, Math.min(0.35, vy / 1200)), dead });
      if (h.phase() === "playing") p.score(palette, String(h.score()), W / 2, 46, 38, pop);
    },
  };
};

/* ------------------------------------------------------------------ shared */

export function drawCharacter(
  h: EngineHost,
  spec: ArcadeSpec,
  cx: number,
  cy: number,
  o: { tilt?: number; bob?: number; squash?: number; dead?: boolean; scale?: number } = {},
) {
  const { ctx, palette } = h;
  const art = CHARACTERS[spec.theme.character];
  const img = h.sprites()?.[o.dead ? "dead" : h.phase() === "ready" ? "idle" : "flying"];
  const size = art.size * (o.scale ?? 1);
  ctx.save();
  ctx.translate(cx, cy + (o.bob ?? 0));
  if (o.tilt) ctx.rotate(o.tilt);
  if (o.squash) ctx.scale(1 / o.squash, o.squash);
  if (img && img.complete && img.naturalWidth > 0) {
    if (art.circular) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
      // A rim so the clipped disc reads as a badge rather than a crop.
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
    ctx.beginPath(); ctx.arc(0, 0, size / 2.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

export const FACTORIES: Record<ArcadeSpec["engine"], EngineFactory> = {
  "endless-flyer": flyerFactory,
  "brick-breaker": brickFactory,
  snake: snakeFactory,
  "endless-runner": runnerFactory,
  platformer: platformerFactory,
  duel: duelFactory,
  shooter: shooterFactory,
  "maze-chase": mazeFactory,
  "falling-blocks": blocksFactory,
  "match-3": match3Factory,
};

/**
 * What to tell the player, and it depends on what they are holding.
 *
 * One string used to serve both, and it described TAP ZONES - "tap the top to
 * jump" - which mean nothing to someone holding a phone and are wrong for
 * someone at a keyboard. The frame shows `touch` where the main pointer is a
 * finger and `keys` everywhere else.
 */
export const HINTS: Record<ArcadeSpec["engine"], { touch: string; keys: string }> = {
  "endless-flyer": { touch: "Tap anywhere to fly", keys: "Space or ↑ to fly" },
  "brick-breaker": { touch: "Drag to steer the paddle", keys: "← → to steer, Space to launch" },
  snake: { touch: "Steer with the arrow pad", keys: "Arrow keys to steer" },
  "endless-runner": { touch: "Tap anywhere to jump", keys: "Space or ↑ to jump" },
  platformer: { touch: "Hold ◀ ▶ to run, tap Jump", keys: "← → to run, Space or ↑ to jump" },
  duel: { touch: "Hold ◀ ▶ to step, tap Strike", keys: "← → to step, Space or ↑ to strike" },
  shooter: { touch: "Drag to steer - you fire on your own", keys: "← → to steer - you fire on your own" },
  "maze-chase": { touch: "Steer with the arrow pad", keys: "Arrow keys to steer" },
  "falling-blocks": { touch: "◀ ▶ to move, then Turn or Drop", keys: "← → move, ↑ turn, ↓ drop" },
  "match-3": { touch: "Tap a piece and a neighbour, or swipe it", keys: "Click a piece, then a neighbour" },
};

/**
 * THE ON-SCREEN CONTROLLER, per engine - and only where one earns its place.
 *
 * The flyer, the runner and match-3 are played by tapping the game itself, and
 * brick-breaker and the shooter by dragging along it; a pad under those would
 * only be something to miss. These five need DIRECTIONS, and their tap zones
 * were invisible: nothing on a phone says "the top third of the screen jumps",
 * and the platformer could not walk and jump at once, because lifting the jump
 * finger also lifted the walk.
 *
 * Each button is its own pointer, so a thumb on ◀ and a thumb on Jump are two
 * separate holds. The arrow keys drive the same `control()` at a keyboard.
 */
export const CONTROLS: Partial<Record<ArcadeSpec["engine"], ControlLayout>> = {
  platformer: { pad: "sides", actions: [{ c: "a", label: "Jump" }] },
  duel: { pad: "sides", actions: [{ c: "a", label: "Strike" }] },
  snake: { pad: "dpad", actions: [] },
  "maze-chase": { pad: "dpad", actions: [] },
  "falling-blocks": {
    pad: "sides",
    // Held ◀ ▶ slide the piece along, like any falling-block game.
    repeat: true,
    actions: [
      { c: "up", label: "Turn" },
      { c: "down", label: "Drop" },
    ],
  },
};

export type { Engine };
