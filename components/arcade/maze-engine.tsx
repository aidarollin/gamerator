"use client";

import { WORLD } from "@/lib/arcade/schema";
import {
  buildMaze,
  chaserStep,
  distanceCache,
  isScattering,
  type Cell,
  type Maze,
} from "@/lib/arcade/maze";
import { makeRng } from "@/lib/game/random";
import { spawnBurst, stepParticles, type Particle } from "./paint";
import { drawCharacter } from "./engines";
import { CHARACTERS } from "./characters";
import type { EngineFactory } from "./GameFrame";

/**
 * The maze chase.
 *
 * EVERY RULE THIS RENDERER OBEYS COMES FROM `lib/arcade/maze.ts` - the maze
 * itself, where the dots are, how a chaser picks its next cell, and when the
 * chasers break off to scatter. That is not tidiness. `mazeVerdict` proves a
 * perfect player can clear THIS board against THESE chasers, and the proof is
 * worth nothing the moment the renderer generates its own.
 *
 * The one thing that is only here is the interpolation between cells. The
 * simulation moves in whole cells because that is what the rules are written
 * in; the screen slides between them because a piece that teleports one cell at
 * a time looks broken. Both agree on where things ARE at the moment a step
 * completes, which is the only moment anything is decided.
 */

const W = WORLD.width;
const H = WORLD.height;

type Mover = { at: Cell; came: Cell | null; from: Cell; slide: number };

export const mazeFactory: EngineFactory = (h, spec) => {
  if (spec.engine !== "maze-chase") throw new Error("wrong engine");
  const r = spec.rules;
  const m: Maze = buildMaze(r);
  const dist = distanceCache(m);

  const cell = Math.floor(Math.min(W / m.cols, (H - 96) / m.rows));
  const ox = (W - cell * m.cols) / 2;
  const oy = 82;

  let player: Mover = { at: { ...m.start }, came: null, from: { ...m.start }, slide: 1 };
  let want: Cell | null = null;
  let ghosts: Mover[] = [];
  let dots: { x: number; y: number; eaten: boolean }[] = [];
  let pellets: { x: number; y: number; eaten: boolean }[] = [];
  let scared = 0;
  let time = 0;
  let parts: Particle[] = [];
  let pop = 0;
  let rng = makeRng(r.mazeSeed * 104729 + 17);

  const px = (c: Cell, from: Cell, slide: number) =>
    ox + (from.x + (c.x - from.x) * slide) * cell + cell / 2;
  const py = (c: Cell, from: Cell, slide: number) =>
    oy + (from.y + (c.y - from.y) * slide) * cell + cell / 2;

  const open = (c: Cell) =>
    c.x >= 0 && c.y >= 0 && c.x < m.cols && c.y < m.rows && !m.wall[c.y][c.x];

  const place = () => {
    player = { at: { ...m.start }, came: null, from: { ...m.start }, slide: 1 };
    ghosts = m.dens.map((d) => ({ at: { ...d }, came: null, from: { ...d }, slide: 1 }));
    want = null;
    scared = 0;
  };

  const caught = () => {
    h.shake(1);
    spawnBurst(parts, px(player.at, player.from, player.slide), py(player.at, player.from, player.slide));
    h.loseLife();
    place();
  };

  return {
    reset() {
      dots = m.dots.map((d) => ({ ...d, eaten: false }));
      pellets = m.pellets.map((p) => ({ ...p, eaten: false }));
      parts = [];
      time = 0;
      rng = makeRng(r.mazeSeed * 104729 + 17);
      place();
    },
    input(kind, where) {
      if (kind !== "press" || !where) return;
      // The snake's steering, which works with one thumb and needs no swipe
      // detection: tap the side of yourself you want to head towards. The wish
      // is remembered and taken at the next junction that allows it.
      const cx = px(player.at, player.from, player.slide);
      const cy = py(player.at, player.from, player.slide);
      const dx = where.x - cx;
      const dy = where.y - cy;
      want =
        Math.abs(dx) > Math.abs(dy)
          ? { x: Math.sign(dx), y: 0 }
          : { x: 0, y: Math.sign(dy) };
    },
    step(dt) {
      time += dt;
      pop = Math.max(0, pop - dt * 4);
      parts = stepParticles(parts, dt);
      if (scared > 0) scared = Math.max(0, scared - dt);

      player.slide = Math.min(1, player.slide + dt * r.playerSpeed);
      if (player.slide >= 1) {
        const next = want ? { x: player.at.x + want.x, y: player.at.y + want.y } : null;
        if (next && open(next)) {
          player.from = player.at;
          player.at = next;
          player.slide = 0;
        }
      }

      for (const g of ghosts) {
        g.slide = Math.min(1, g.slide + dt * r.chaserSpeed);
        if (g.slide < 1) continue;
        const i = ghosts.indexOf(g);
        const target = isScattering(time) ? m.dens[i] : player.at;
        const next = chaserStep(m, g.at, g.came, target, r.chaserSmarts, scared > 0, rng(), dist);
        g.came = g.at;
        g.from = g.at;
        g.at = next;
        g.slide = 0;
      }

      for (const d of dots)
        if (!d.eaten && d.x === player.at.x && d.y === player.at.y) {
          d.eaten = true;
          pop = 1;
          h.addScore(spec.scoring.pointsPerObstacle);
        }
      for (const p of pellets)
        if (!p.eaten && p.x === player.at.x && p.y === player.at.y) {
          p.eaten = true;
          scared = r.scaredSeconds;
          h.sfx("power");
          h.addScore(spec.scoring.pointsPerObstacle * 2);
        }

      for (const g of ghosts) {
        if (g.at.x !== player.at.x || g.at.y !== player.at.y) continue;
        if (scared > 0) {
          spawnBurst(parts, px(g.at, g.from, g.slide), py(g.at, g.from, g.slide), 10);
          h.sfx("coin");
          h.addScore(spec.scoring.pointsPerObstacle * 5);
          g.at = { ...m.dens[ghosts.indexOf(g)] };
          g.from = g.at;
          g.slide = 1;
        } else {
          caught();
          return;
        }
      }

      // The win is a COUNT, not an empty board: every corridor carries a dot
      // and `dotTarget` is how many of them the run is worth. Same condition
      // the simulation uses, or the check certifies a different game.
      if (dots.length - dots.filter((d) => !d.eaten).length >= r.dotTarget) h.finish();
    },
    draw() {
      const { ctx, paint: p, palette } = h;
      p.sky(palette, W, H, spec.theme.background !== "sky");

      // The corridors, drawn as the FLOOR rather than the walls as blocks: a
      // maze painted wall-first at this cell size reads as a bar chart.
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = palette.deep;
      ctx.fillRect(ox - 4, oy - 4, m.cols * cell + 8, m.rows * cell + 8);
      ctx.restore();
      for (let y = 0; y < m.rows; y++)
        for (let x = 0; x < m.cols; x++)
          if (m.wall[y][x]) p.block(palette, ox + x * cell, oy + y * cell, cell, cell, 4);

      ctx.fillStyle = palette.gold;
      for (const d of dots) {
        if (d.eaten) continue;
        ctx.beginPath();
        ctx.arc(ox + d.x * cell + cell / 2, oy + d.y * cell + cell / 2, Math.max(2, cell * 0.13), 0, Math.PI * 2);
        ctx.fill();
      }
      for (const pl of pellets)
        if (!pl.eaten)
          p.sparkle(palette, ox + pl.x * cell + cell / 2, oy + pl.y * cell + cell / 2, cell * 0.9, 0);

      for (const g of ghosts) {
        const gx = px(g.at, g.from, g.slide);
        const gy = py(g.at, g.from, g.slide);
        // Scared chasers flash toward the end of the window, so the player can
        // see the escape closing rather than discovering it.
        const flashing = scared > 0 && scared < 1.6 && Math.floor(time * 8) % 2 === 0;
        ctx.fillStyle = scared > 0 && !flashing ? palette.edge : palette.danger;
        ctx.beginPath();
        ctx.arc(gx, gy - cell * 0.08, cell * 0.36, Math.PI, 0);
        ctx.lineTo(gx + cell * 0.36, gy + cell * 0.3);
        ctx.lineTo(gx, gy + cell * 0.14);
        ctx.lineTo(gx - cell * 0.36, gy + cell * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = palette.white;
        ctx.beginPath();
        ctx.arc(gx - cell * 0.13, gy - cell * 0.1, cell * 0.1, 0, Math.PI * 2);
        ctx.arc(gx + cell * 0.13, gy - cell * 0.1, cell * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }

      p.burst(palette, parts);
      drawCharacter(
        h,
        spec,
        px(player.at, player.from, player.slide),
        py(player.at, player.from, player.slide),
        { scale: (cell * 1.5) / CHARACTERS[spec.theme.character].size, squash: 1 + Math.sin(time * 12) * 0.05 },
      );

      if (h.phase() === "playing") {
        const got = dots.length - dots.filter((d) => !d.eaten).length;
        p.score(palette, `${Math.min(got, r.dotTarget)}/${r.dotTarget}`, W / 2, 46, 28, pop);
      }
    },
  };
};
