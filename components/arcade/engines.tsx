"use client";

import { WORLD, type ArcadeSpec } from "@/lib/arcade/schema";
import { gapCentres, flyerAt, SIM } from "@/lib/arcade/simulate";
import { makeRng } from "@/lib/game/random";
import { CHARACTERS } from "./characters";
import { spawnBurst, stepParticles, type Particle } from "./paint";
import { makeRng as rngFor } from "@/lib/game/random";
import type { Engine, EngineFactory, EngineHost } from "./GameFrame";

/**
 * The five engines. Each is only its own logic - the canvas, palette, loop,
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
   * not play. They sit offset from the gap centre so taking one costs a little
   * safety, which is the whole point. Deterministic from a seed, like
   * everything else, and OPTIONAL: they never gate progress, so the
   * playability simulation does not need to know about them.
   */
  const coinRng = rngFor(0xc0);
  const coinOffsets = Array.from({ length: 400 }, () => (coinRng() * 2 - 1) * 0.34);
  const taken = new Set<number>();

  // The physics in force RIGHT NOW, from the same function the validator
  // simulates. If the renderer ramped any other way the playability check would
  // be verifying a game nobody plays.
  const at = () => flyerAt(r, passed);

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
    reset() { y = H / 2; vy = 0; dist = 0; passed = 0; dead = false; parts = []; taken.clear(); },
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

      // Collect any coin the player is overlapping.
      for (let i = passed; i <= passed + 3; i++) {
        if (i <= 0 || taken.has(i)) continue;
        const c = coinPos(i);
        const cx = SIM.birdX + c.x - dist;
        if (Math.abs(cx - SIM.birdX) < 20 && Math.abs(c.y - y) < 22) {
          taken.add(i);
          pop = 1;
          spawnBurst(parts, cx, c.y, 7);
          h.addScore(spec.scoring.pointsPerObstacle);
        }
      }

      // Obstacles are spaced by the ramp, so their x positions are a running
      // sum rather than index * spacing.
      const nextX = obstacleX(passed + 1);
      if (nextX - dist <= 0) {
        const c = centres[(passed + 1) % centres.length];
        const half = flyerAt(r, passed + 1).gapHeight / 2;
        if (y - art.radius < c - half || y + art.radius > c + half) return die();
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
        const c = coinPos(i);
        const cx = SIM.birdX + c.x - dist;
        if (cx < -30 || cx > W + 30) continue;
        p.coin(palette, cx, c.y, 22, Math.abs(Math.cos(t * 3 + i)) * 0.8 + 0.2);
      }

      for (let i = passed; i <= passed + 5; i++) {
        if (i <= 0) continue;
        const c = centres[i % centres.length];
        const half = flyerAt(r, i).gapHeight / 2;
        const x = SIM.birdX + obstacleX(i) - dist;
        if (x < -80 || x > W + 80) continue;
        const w = 54;
        p.block(palette, x - w / 2, -30, w, c - half + 30, 8);
        p.block(palette, x - w / 2, c + half, w, floor - (c + half), 8);
        p.cap(palette, x - w / 2, c - half - 18, w, 18);
        p.cap(palette, x - w / 2, c + half, w, 18);
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
    },
  };

  /** Distance from the start to obstacle `n`, accumulating the ramped spacing. */
  function obstacleX(n: number) {
    let d = 0;
    for (let i = 1; i <= n; i++) d += flyerAt(r, i - 1).gapSpacing;
    return d;
  }

  /** A coin sits between two obstacles, offset from the gap centre. */
  function coinPos(n: number) {
    const here = obstacleX(n);
    const next = here + flyerAt(r, n).gapSpacing;
    const centre = centres[n % centres.length];
    const half = flyerAt(r, n).gapHeight / 2;
    return {
      x: (here + next) / 2,
      y: centre + coinOffsets[n % coinOffsets.length] * half,
    };
  }
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
  let launched = false, parts: Particle[] = [], pop = 0;

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
    reset() { layout(); px = W / 2; targetX = W / 2; serve(); parts = []; },
    input(kind, where) {
      if (kind !== "press") return;
      // A press with no pointer position is the keyboard. It must still launch,
      // or the game is unplayable without a mouse - which is how it shipped,
      // and only a screenshot showing a stuck score of 0 revealed it.
      if (where) targetX = where.x;
      launched = true;
    },
    step(dt) {
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

      for (const b of bricks) {
        if (!b.alive) continue;
        if (bx > b.x - BALL && bx < b.x + bw + BALL && by > b.y - BALL && by < b.y + brickH + BALL) {
          b.alive = false; bvy = -bvy; pop = 1;
          spawnBurst(parts, bx, by, 6);
          h.addScore(spec.scoring.pointsPerObstacle);
          break;
        }
      }
      if (bricks.every((b) => !b.alive)) { layout(); serve(); h.shake(0.4); }
      if (by > H + 30) { h.shake(1); spawnBurst(parts, bx, H - 10); h.loseLife(); serve(); }
    },
    draw() {
      const { paint: p, palette, ctx } = h;
      p.sky(palette, W, H, spec.theme.background === "night");
      for (const b of bricks) if (b.alive) p.block(palette, b.x, b.y, bw, brickH, 6);
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

  const placeFood = () => {
    for (let i = 0; i < 400; i++) {
      const f = { x: Math.floor(rng() * r.gridCols), y: Math.floor(rng() * r.gridRows) };
      if (!snake.some((s) => s.x === f.x && s.y === f.y)) return (food = f);
    }
  };

  return {
    reset() {
      snake = [{ x: 3, y: 3 }, { x: 2, y: 3 }];
      dir = { x: 1, y: 0 }; next = { x: 1, y: 0 };
      eaten = 0; acc = 0; rng = makeRng(1337); placeFood();
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
      if (head.x === food.x && head.y === food.y) {
        eaten++; pop = 1; placeFood();
        h.addScore(spec.scoring.pointsPerObstacle);
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
  let parts: Particle[] = [], pop = 0, t = 0;

  return {
    reset() { y = floor - RH; vy = 0; dist = 0; onGround = true; dead = false; parts = []; },
    input(kind) {
      if (kind === "press" && onGround && !dead && h.phase() === "playing") {
        vy = r.jumpVelocity; onGround = false; h.sfx("flap");
      }
    },
    step(dt) {
      t += dt; pop = Math.max(0, pop - dt * 4);
      parts = stepParticles(parts, dt);
      if (dead) return;
      vy += r.gravity * dt; y += vy * dt; dist += r.scrollSpeed * dt;
      if (y >= floor - RH) { y = floor - RH; vy = 0; onGround = true; }
      const i = Math.floor(dist / r.spacing);
      const ox = RX + (i + 1) * r.spacing - dist;
      if (ox < RX + 22 && ox > RX - 22 && y + RH > floor - r.obstacleHeight) {
        dead = true; h.shake(1); spawnBurst(parts, RX, y); h.loseLife();
        if (h.phase() === "playing") window.setTimeout(() => { dead = false; dist += r.spacing * 0.6; }, 600);
        return;
      }
      if (dist - i * r.spacing < r.scrollSpeed * dt && i > 0) {
        pop = 1; h.addScore(spec.scoring.pointsPerObstacle);
      }
    },
    draw() {
      const { paint: p, palette } = h;
      p.sky(palette, W, H, spec.theme.background === "night");
      p.clouds(palette, W, H, dist);
      p.hills(palette, W, floor, dist);
      p.bushes(palette, W, floor, dist);
      const first = Math.floor(dist / r.spacing);
      for (let i = first; i <= first + 4; i++) {
        const x = RX + (i + 1) * r.spacing - dist;
        if (x < -60 || x > W + 60) continue;
        p.block(palette, x - 16, floor - r.obstacleHeight, 32, r.obstacleHeight, 6);
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
  const PH = 18, PW = 34;
  type Plat = { x: number; y: number; w: number };
  let plats: Plat[] = [], coins: { x: number; y: number; got: boolean }[] = [];
  let x = 40, y = 0, vx = 0, vy = 0, onGround = false, camX = 0, dead = false;
  let parts: Particle[] = [], pop = 0, goal = 0, hold = 0;

  const build = () => {
    const rng = makeRng(9001);
    plats = []; coins = [];
    let cx = 0;
    for (let i = 0; i < r.platforms; i++) {
      const w = 90 + rng() * 90;
      const gap = i === 0 ? 0 : 40 + rng() * (r.maxGap - 40);
      cx += gap + (i === 0 ? 0 : 0);
      const py = H - 120 - rng() * 150;
      plats.push({ x: cx, y: py, w });
      cx += w;
    }
    goal = cx;
    for (let i = 0; i < r.coins; i++) {
      const p = plats[1 + Math.floor(rng() * (plats.length - 1))];
      coins.push({ x: p.x + p.w / 2, y: p.y - 34, got: false });
    }
    x = plats[0].x + 20; y = plats[0].y - PH * 2; vx = 0; vy = 0; camX = 0;
  };

  return {
    reset() { build(); dead = false; parts = []; },
    input(kind, where) {
      if (kind === "release") { hold = 0; return; }
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
      // Scenery and a floor, so the level does not float in empty space.
      p.hills(palette, W, H - 26, camX);
      p.bushes(palette, W, H - 14, camX);
      p.ground(palette, W, H - 26, 26, camX);
      ctx.save();
      ctx.translate(-camX, 0);
      for (const pl of plats) p.block(palette, pl.x, pl.y, pl.w, PH, 6);
      for (const c of coins) {
        if (c.got) continue;
        ctx.fillStyle = palette.gold;
        ctx.beginPath(); ctx.arc(c.x, c.y, 9, 0, Math.PI * 2); ctx.fill();
      }
      // The goal flag.
      p.block(palette, goal - 20, H - 240, 8, 160, 3);
      ctx.fillStyle = palette.gold;
      ctx.beginPath();
      ctx.moveTo(goal - 12, H - 238); ctx.lineTo(goal + 30, H - 224); ctx.lineTo(goal - 12, H - 210);
      ctx.closePath(); ctx.fill();
      p.burst(palette, parts);
      ctx.restore();
      drawCharacter(h, spec, x - camX, y, { tilt: Math.max(-0.25, Math.min(0.35, vy / 1200)), dead });
      if (h.phase() === "playing") p.score(palette, String(h.score()), W / 2, 46, 38, pop);
    },
  };
};

/* ------------------------------------------------------------------ shared */

function drawCharacter(
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
};

export const HINTS: Record<ArcadeSpec["engine"], string> = {
  "endless-flyer": "Tap, click or press space to fly",
  "brick-breaker": "Drag or move to steer the paddle",
  snake: "Tap the side you want to turn towards",
  "endless-runner": "Tap to jump",
  platformer: "Tap left or right to move, tap the top to jump",
};

export type { Engine };
