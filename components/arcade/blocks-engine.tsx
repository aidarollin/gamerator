"use client";

import { WORLD } from "@/lib/arcade/schema";
import { pieceSet, type Piece } from "@/lib/arcade/blocks";
import { makeRng } from "@/lib/game/random";
import { spawnBurst, stepParticles, type Particle } from "./paint";
import { drawCharacter } from "./engines";
import { CHARACTERS } from "./characters";
import type { EngineFactory } from "./GameFrame";

/**
 * Falling blocks.
 *
 * The pieces, their rotations and which set is in play all come from
 * `lib/arcade/blocks.ts`, so `blocksVerdict` reasons about the same shapes that
 * get dealt. The renderer owns the well, the input and the line-clear feel.
 */

const W = WORLD.width;
const H = WORLD.height;

export const blocksFactory: EngineFactory = (h, spec) => {
  if (spec.engine !== "falling-blocks") throw new Error("wrong engine");
  const r = spec.rules;
  const pieces = pieceSet(r.easyPieces);

  const cell = Math.floor(Math.min((W - 40) / r.cols, (H - 130) / r.rows));
  const ox = (W - cell * r.cols) / 2;
  const oy = 92;

  /** -1 is empty; anything else is the index of the piece that landed there. */
  let well: number[][] = [];
  let piece: Piece = pieces[0];
  let kind = 0;
  let turn = 0;
  let cx = 0;
  let cy = 0;
  let fall = 0;
  let cleared = 0;
  let rng = makeRng(0xb10c ^ (spec.meta.title.length * 40503));
  let parts: Particle[] = [];
  let flash: number[] = [];
  let flashLeft = 0;
  let pop = 0;
  let t = 0;

  const speed = () => r.dropSpeed + r.speedUp * cleared;
  const shape = () => piece.cells[turn % piece.cells.length];

  const fits = (x: number, y: number, cells: [number, number][]) =>
    cells.every(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      return nx >= 0 && nx < r.cols && ny < r.rows && (ny < 0 || well[ny][nx] === -1);
    });

  const spawn = () => {
    kind = Math.floor(rng() * pieces.length) % pieces.length;
    piece = pieces[kind];
    turn = 0;
    cx = Math.floor(r.cols / 2);
    cy = 0;
    fall = 0;
    if (!fits(cx, cy, shape())) {
      // The well is full. A life, not a loss - the stack is cleared and the
      // player carries on against the same target, the way lives work in every
      // other engine here.
      h.shake(1);
      spawnBurst(parts, W / 2, oy + (r.rows * cell) / 2, 18);
      well = Array.from({ length: r.rows }, () => Array(r.cols).fill(-1));
      h.loseLife();
    }
  };

  const lock = () => {
    for (const [dx, dy] of shape()) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (ny >= 0 && ny < r.rows && nx >= 0 && nx < r.cols) well[ny][nx] = kind;
    }
    const full = well.flatMap((row, y) => (row.every((c) => c !== -1) ? [y] : []));
    if (full.length) {
      flash = full;
      flashLeft = 0.18;
      for (const y of full) {
        for (let x = 0; x < r.cols; x++) spawnBurst(parts, ox + x * cell + cell / 2, oy + y * cell + cell / 2, 3);
        well.splice(y, 1);
        well.unshift(Array(r.cols).fill(-1));
      }
      cleared += full.length;
      pop = 1;
      h.sfx(full.length > 1 ? "win" : "score");
      // A double or triple is worth more than two singles, which is the only
      // reason anybody ever risks stacking one more row.
      h.addScore(spec.scoring.pointsPerObstacle * full.length * full.length);
      if (cleared >= r.linesToWin) {
        h.finish();
        return;
      }
    }
    spawn();
  };

  /** One column, if there is room. */
  const shift = (d: number) => {
    if (fits(cx + d, cy, shape())) cx += d;
  };

  /** Turn, with a wall kick: in place, then nudged one or two either way. */
  const rotate = () => {
    const next = (turn + 1) % piece.cells.length;
    for (const nudge of [0, -1, 1, -2, 2])
      if (fits(cx + nudge, cy, piece.cells[next])) {
        cx += nudge;
        turn = next;
        return;
      }
  };

  /** All the way down, now. */
  const drop = () => {
    while (fits(cx, cy + 1, shape())) cy++;
    lock();
  };

  return {
    reset() {
      well = Array.from({ length: r.rows }, () => Array(r.cols).fill(-1));
      cleared = 0;
      parts = [];
      flash = [];
      rng = makeRng(0xb10c ^ (spec.meta.title.length * 40503));
      spawn();
    },
    control(c, down) {
      if (!down) return;
      if (c === "left") shift(-1);
      else if (c === "right") shift(1);
      else if (c === "up" || c === "a") rotate();
      else if (c === "down") drop();
    },
    input(kind_, where) {
      if (kind_ !== "press") return;
      // The screen is the pad too: left and right halves move, the top turns
      // and the bottom drops. A key press with no coordinates turns.
      if (!where) return rotate();
      if (where.y > oy + r.rows * cell * 0.72) return drop();
      if (where.y < oy + r.rows * cell * 0.28) return rotate();
      shift(where.x < ox + (r.cols * cell) / 2 ? -1 : 1);
    },
    step(dt) {
      t += dt;
      pop = Math.max(0, pop - dt * 4);
      flashLeft = Math.max(0, flashLeft - dt);
      if (flashLeft === 0) flash = [];
      parts = stepParticles(parts, dt);

      fall += dt * speed();
      while (fall >= 1) {
        fall -= 1;
        if (fits(cx, cy + 1, shape())) cy++;
        else {
          lock();
          return;
        }
      }
    },
    draw() {
      const { ctx, paint: p, palette } = h;
      p.sky(palette, W, H, spec.theme.background !== "sky");

      // The well, with column rules. At 0.3 alpha and no grid it was a slightly
      // darker patch of the same pink as the sky, and on a phone you could not
      // tell which column a piece was over - which is the only spatial judgement
      // this game asks you to make.
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = palette.deep;
      ctx.fillRect(ox - 5, oy - 5, r.cols * cell + 10, r.rows * cell + 10);
      ctx.globalAlpha = 0.13;
      ctx.strokeStyle = palette.white;
      ctx.lineWidth = 1;
      for (let x = 1; x < r.cols; x++) {
        ctx.beginPath();
        ctx.moveTo(ox + x * cell, oy);
        ctx.lineTo(ox + x * cell, oy + r.rows * cell);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = palette.edge;
      ctx.lineWidth = 2;
      ctx.strokeRect(ox - 5, oy - 5, r.cols * cell + 10, r.rows * cell + 10);

      for (let y = 0; y < r.rows; y++)
        for (let x = 0; x < r.cols; x++)
          if (well[y][x] !== -1) p.block(palette, ox + x * cell + 1, oy + y * cell + 1, cell - 2, cell - 2, 4);

      ctx.save();
      ctx.fillStyle = palette.white;
      ctx.globalAlpha = flashLeft > 0 ? 0.75 : 0;
      for (const y of flash) ctx.fillRect(ox, oy + y * cell, r.cols * cell, cell);
      ctx.restore();

      // The landing shadow. Without it the well is a guessing game on a phone,
      // and it costs one loop.
      let ghost = cy;
      while (fits(cx, ghost + 1, shape())) ghost++;
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = palette.ink;
      for (const [dx, dy] of shape()) {
        const nx = cx + dx;
        const ny = ghost + dy;
        if (ny >= 0) ctx.fillRect(ox + nx * cell + 2, oy + ny * cell + 2, cell - 4, cell - 4);
      }
      ctx.restore();

      for (const [dx, dy] of shape()) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (ny >= 0) p.block(palette, ox + nx * cell + 1, oy + ny * cell + 1, cell - 2, cell - 2, 4);
      }

      p.burst(palette, parts);
      drawCharacter(h, spec, 30, H - 30, {
        scale: 44 / CHARACTERS[spec.theme.character].size,
        bob: Math.sin(t * 3) * 2,
      });

      if (h.phase() === "playing")
        p.score(palette, `${cleared}/${r.linesToWin}`, W / 2, 52, 28, pop);
    },
  };
};
