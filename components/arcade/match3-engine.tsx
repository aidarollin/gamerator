"use client";

import { WORLD } from "@/lib/arcade/schema";
import { buildBoard, collapse, findMatches, hasMove, type Board } from "@/lib/arcade/match3";
import { makeRng } from "@/lib/game/random";
import { spawnBurst, stepParticles, type Particle } from "./paint";
import { drawCharacter } from "./engines";
import { CHARACTERS } from "./characters";
import type { EngineFactory } from "./GameFrame";

/**
 * Match three.
 *
 * The board, the match rule, the collapse and the "is there a legal move"
 * question all come from `lib/arcade/match3.ts`, which is what lets
 * `match3Verdict` build the exact opening board the player is dealt. A copy of
 * the match rule living in here would be a rule nobody can test - the mistake
 * `lib/arcade/collect.ts` was extracted to fix.
 *
 * The engine's clock is MOVES, not seconds. That is unusual here and it is
 * deliberate: this is the one genre in the catalogue that is thought about
 * rather than reacted to, and putting a stopwatch on it would turn the only
 * calm game in the set into another test of reflexes.
 */

const W = WORLD.width;
const H = WORLD.height;

/** Six distinct gem shapes. Colour alone is not enough to tell them apart. */
const SHAPES = ["circle", "square", "diamond", "flower", "triangle", "heart"] as const;

export const match3Factory: EngineFactory = (h, spec) => {
  if (spec.engine !== "match-3") throw new Error("wrong engine");
  const r = spec.rules;

  const cell = Math.floor(Math.min((W - 36) / r.cols, (H - 150) / r.rows));
  const ox = (W - cell * r.cols) / 2;
  const oy = 104;

  let board: Board = [];
  let picked: { x: number; y: number } | null = null;
  let moves = r.moveLimit;
  let clearedTotal = 0;
  let settle = 0;
  let parts: Particle[] = [];
  let rng = makeRng(r.boardSeed * 2749 + 11);
  let pop = 0;
  let t = 0;

  const gx = (x: number) => ox + x * cell + cell / 2;
  const gy = (y: number) => oy + y * cell + cell / 2;

  /**
   * Resolve every match on the board, cascading until it is quiet.
   *
   * Scored per pass rather than per tile, so a cascade is worth more than the
   * same tiles cleared one swap at a time - which is the entire reason anybody
   * looks for the clever swap instead of the first legal one.
   */
  const resolve = () => {
    let pass = 1;
    for (;;) {
      const hit = findMatches(board);
      if (hit.size === 0) break;
      for (const k of hit) {
        const [x, y] = k.split(",").map(Number);
        spawnBurst(parts, gx(x), gy(y), 4);
      }
      clearedTotal += hit.size;
      h.addScore(spec.scoring.pointsPerObstacle * hit.size * pass);
      h.sfx(pass > 1 ? "coin" : "score");
      collapse(board, hit, rng, r.colours);
      pass++;
      pop = 1;
    }
    // A board with no legal swap is a loss nobody chose. Shuffle rather than
    // end the game - the swap that does not exist is the generator's fault.
    let guard = 0;
    while (!hasMove(board) && guard++ < 40) {
      for (let y = 0; y < r.rows; y++)
        for (let x = 0; x < r.cols; x++) board[y][x] = Math.floor(rng() * r.colours);
      const hit = findMatches(board);
      if (hit.size) collapse(board, hit, rng, r.colours);
    }
  };

  const done = () => {
    if (clearedTotal >= r.clearTarget) {
      h.finish();
      return true;
    }
    if (moves <= 0) {
      // Out of swaps is a life, not the end: the shared HUD counts lives and
      // the round budget is spent across them, exactly as everywhere else.
      h.shake(0.8);
      moves = r.moveLimit;
      h.loseLife();
      return true;
    }
    return false;
  };

  return {
    reset() {
      rng = makeRng(r.boardSeed * 2749 + 11);
      board = (buildBoard(r) ?? []).map((row) => [...row]);
      picked = null;
      moves = r.moveLimit;
      clearedTotal = 0;
      parts = [];
    },
    input(kind, where) {
      if (kind !== "press" || !where || settle > 0 || board.length === 0) return;
      const x = Math.floor((where.x - ox) / cell);
      const y = Math.floor((where.y - oy) / cell);
      if (x < 0 || y < 0 || x >= r.cols || y >= r.rows) return;

      if (!picked) {
        picked = { x, y };
        h.sfx("flap");
        return;
      }
      const adjacent = Math.abs(picked.x - x) + Math.abs(picked.y - y) === 1;
      if (!adjacent) {
        // Tapping somewhere far away is a change of mind, not a mis-swap.
        picked = x === picked.x && y === picked.y ? null : { x, y };
        return;
      }

      const a = picked;
      [board[a.y][a.x], board[y][x]] = [board[y][x], board[a.y][a.x]];
      if (findMatches(board).size === 0) {
        // A swap that matches nothing is refused rather than spent. Charging a
        // move for it would punish exploring the board, which is the game.
        [board[a.y][a.x], board[y][x]] = [board[y][x], board[a.y][a.x]];
        h.shake(0.25);
        picked = null;
        return;
      }
      picked = null;
      moves--;
      settle = 0.16;
      resolve();
      done();
    },
    step(dt) {
      t += dt;
      pop = Math.max(0, pop - dt * 4);
      settle = Math.max(0, settle - dt);
      parts = stepParticles(parts, dt);
    },
    draw() {
      const { ctx, paint: p, palette } = h;
      p.sky(palette, W, H, spec.theme.background !== "sky");
      p.board(palette, ox, oy, r.cols, r.rows, cell);

      const inks = [palette.gold, palette.danger, palette.deep, palette.white, palette.edge, palette.mid];

      for (let y = 0; y < r.rows; y++)
        for (let x = 0; x < r.cols; x++) {
          const v = board[y]?.[x];
          if (v === undefined || v < 0) continue;
          const cxp = gx(x);
          const cyp = gy(y);
          const on = picked && picked.x === x && picked.y === y;
          const rad = cell * (on ? 0.4 + Math.sin(t * 9) * 0.03 : 0.34);
          ctx.fillStyle = inks[v % inks.length];
          ctx.beginPath();
          // Shape as well as colour, because a board told apart only by hue is
          // unplayable for a colour-blind child and is the commonest accessibility
          // failure in this entire genre.
          switch (SHAPES[v % SHAPES.length]) {
            case "square":
              ctx.rect(cxp - rad, cyp - rad, rad * 2, rad * 2);
              break;
            case "diamond":
              ctx.moveTo(cxp, cyp - rad);
              ctx.lineTo(cxp + rad, cyp);
              ctx.lineTo(cxp, cyp + rad);
              ctx.lineTo(cxp - rad, cyp);
              ctx.closePath();
              break;
            case "triangle":
              ctx.moveTo(cxp, cyp - rad);
              ctx.lineTo(cxp + rad, cyp + rad * 0.8);
              ctx.lineTo(cxp - rad, cyp + rad * 0.8);
              ctx.closePath();
              break;
            case "flower":
              // A five-pointed star, not the ring of overlapping circles this
              // started as: outlining that path drew every internal arc and it
              // came out as a spirograph. One outline, one silhouette.
              for (let i = 0; i < 10; i++) {
                const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
                const rr = i % 2 === 0 ? rad : rad * 0.45;
                const fx = cxp + Math.cos(a) * rr;
                const fy = cyp + Math.sin(a) * rr;
                if (i === 0) ctx.moveTo(fx, fy);
                else ctx.lineTo(fx, fy);
              }
              ctx.closePath();
              break;
            case "heart":
              ctx.arc(cxp - rad * 0.45, cyp - rad * 0.2, rad * 0.55, 0, Math.PI * 2);
              ctx.arc(cxp + rad * 0.45, cyp - rad * 0.2, rad * 0.55, 0, Math.PI * 2);
              ctx.moveTo(cxp - rad, cyp);
              ctx.lineTo(cxp, cyp + rad);
              ctx.lineTo(cxp + rad, cyp);
              ctx.closePath();
              break;
            default:
              ctx.arc(cxp, cyp, rad, 0, Math.PI * 2);
          }
          ctx.fill();
          /**
           * EVERY gem is outlined, not just the selected one.
           *
           * A screenshot caught this: one of the five inks is `palette.white`,
           * and a white gem on the board's pale squares was completely
           * invisible - two cells in the shot read as empty holes in the board.
           * The same rule as the hearts over the canvas: anything drawn on top
           * of an arbitrary background has to carry its own contrast, because
           * the background can be any colour a scene chooses.
           */
          ctx.strokeStyle = palette.ink;
          ctx.lineWidth = on ? 3.5 : 1.5;
          ctx.stroke();
        }

      p.burst(palette, parts);
      drawCharacter(h, spec, 32, H - 34, {
        scale: 46 / CHARACTERS[spec.theme.character].size,
        bob: Math.sin(t * 3) * 2,
      });

      if (h.phase() === "playing") {
        p.score(palette, `${Math.min(clearedTotal, r.clearTarget)}/${r.clearTarget}`, W / 2, 46, 26, pop);
        p.score(palette, `${moves} swaps`, W / 2, H - 22, 20, 0);
      }
    },
  };
};
