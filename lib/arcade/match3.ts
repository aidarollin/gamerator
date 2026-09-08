import { z } from "zod";
import { makeRng } from "@/lib/game/random";
import type { Verdict } from "./engines";

/**
 * Match three: swap two neighbours, line up three of a colour, watch it fall in.
 *
 * The second most-named refusal after tetris, and the one children actually ask
 * for by name. It was refused under "a puzzle game", alongside sudoku - which
 * conflated two completely different things. Sudoku is won by deduction with no
 * clock and no simulated player to check it with. A match-three board is a
 * grid, a clock and a legal-move rule: every part of it can be simulated, and
 * the guarantee every other engine here ships with applies unchanged.
 *
 * THE BOARD RULES LIVE HERE, NOT IN THE RENDERER. `findMatches`, `collapse` and
 * `hasMove` are the game; a copy of them trapped in a closure could not be
 * tested, and `buildBoard` would be approving a board nobody plays.
 */

export const MatchThreeRules = z.object({
  cols: z.number().int().min(5).max(8),
  rows: z.number().int().min(5).max(8),
  /** More colours means rarer matches, and it is the real difficulty dial. */
  colours: z.number().int().min(3).max(6),
  /** Swaps allowed. The clock of this engine. */
  moveLimit: z.number().int().min(8).max(60),
  /** Tiles that must be cleared to win. */
  clearTarget: z.number().int().min(10).max(120),
  /** Which board. In the spec so the check and the renderer agree. */
  boardSeed: z.number().int().min(1).max(999),
  lives: z.number().int().min(1).max(5),
});
export type MatchThreeRules = z.infer<typeof MatchThreeRules>;

export type Board = number[][];

const at = (b: Board, x: number, y: number) => (b[y] ? (b[y][x] ?? -1) : -1);

/** Every tile in a run of three or more, horizontally or vertically. */
export function findMatches(b: Board): Set<string> {
  const hit = new Set<string>();
  const rows = b.length;
  const cols = b[0]?.length ?? 0;

  for (let y = 0; y < rows; y++) {
    let run = 1;
    for (let x = 1; x <= cols; x++) {
      if (x < cols && at(b, x, y) === at(b, x - 1, y) && at(b, x, y) >= 0) run++;
      else {
        if (run >= 3) for (let k = x - run; k < x; k++) hit.add(`${k},${y}`);
        run = 1;
      }
    }
  }
  for (let x = 0; x < cols; x++) {
    let run = 1;
    for (let y = 1; y <= rows; y++) {
      if (y < rows && at(b, x, y) === at(b, x, y - 1) && at(b, x, y) >= 0) run++;
      else {
        if (run >= 3) for (let k = y - run; k < y; k++) hit.add(`${x},${k}`);
        run = 1;
      }
    }
  }
  return hit;
}

/**
 * Remove the matched tiles, drop what is above them, refill from the top.
 * Returns the number cleared so a cascade can be scored.
 */
export function collapse(b: Board, hit: Set<string>, rng: () => number, colours: number): number {
  const rows = b.length;
  const cols = b[0]?.length ?? 0;
  for (const k of hit) {
    const [x, y] = k.split(",").map(Number);
    b[y][x] = -1;
  }
  for (let x = 0; x < cols; x++) {
    let write = rows - 1;
    for (let y = rows - 1; y >= 0; y--) {
      if (b[y][x] !== -1) {
        b[write][x] = b[y][x];
        write--;
      }
    }
    for (let y = write; y >= 0; y--) b[y][x] = Math.floor(rng() * colours);
  }
  return hit.size;
}

/** Is there any swap that makes a match? A board without one is a dead end. */
export function hasMove(b: Board): boolean {
  const rows = b.length;
  const cols = b[0]?.length ?? 0;
  const swap = (x1: number, y1: number, x2: number, y2: number) => {
    [b[y1][x1], b[y2][x2]] = [b[y2][x2], b[y1][x1]];
    const found = findMatches(b).size > 0;
    [b[y1][x1], b[y2][x2]] = [b[y2][x2], b[y1][x1]];
    return found;
  };
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      if (x + 1 < cols && swap(x, y, x + 1, y)) return true;
      if (y + 1 < rows && swap(x, y, x, y + 1)) return true;
    }
  return false;
}

/**
 * A board with no match already on it and at least one legal swap available.
 *
 * Both conditions matter and for opposite reasons: a board that starts mid-
 * cascade gives away free points before the player has touched it, and a board
 * with no legal swap is a loss the player had no part in.
 *
 * Returns null when neither can be satisfied - which is a real outcome, not an
 * error, and is what `match3Verdict` turns into a readable rejection. Six
 * colours on a 5x5 board is roughly four tiles of each, and matches stop being
 * findable and start being lucky.
 */
export function buildBoard(r: MatchThreeRules): Board | null {
  const rng = makeRng(r.boardSeed * 6151 + r.cols * 97 + r.rows * 13 + r.colours);
  for (let attempt = 0; attempt < 60; attempt++) {
    const b: Board = Array.from({ length: r.rows }, () =>
      Array.from({ length: r.cols }, () => Math.floor(rng() * r.colours)),
    );
    if (findMatches(b).size === 0 && hasMove(b)) return b;
  }
  return null;
}

/**
 * A deliberately GENEROUS estimate of tiles cleared per swap.
 *
 * Same direction of error as `round.ts` and for the same reason: an
 * over-estimate only fails to reject something borderline, while an
 * under-estimate turns away games that are perfectly winnable, and the person
 * sees the rejection. Three tiles is the floor for any match; the rest is the
 * cascade, which falls as colours rise.
 *
 * THE FIRST VERSION WAS AN UNDER-ESTIMATE, which is the dangerous direction. It
 * used `1.4 / colours` and predicted 3.8 tiles a swap at five colours. A real
 * board, played and photographed, cleared 67 tiles in 7 swaps - about 9.6,
 * because a collapse refills from the top and lands another match far more
 * often than the arithmetic suggested. Reasoning about cascades from first
 * principles was simply wrong, and one screenshot settled it.
 */
export const perSwap = (colours: number) => 3 * (1 + 6 / colours);

/**
 * Can the target be cleared inside the moves given, and is the board dense
 * enough that finding a match is skill rather than luck?
 */
export function match3Verdict(r: MatchThreeRules): Verdict {
  const density = (r.cols * r.rows) / r.colours;
  if (density < 4.6) {
    return {
      ok: false,
      reason:
        `${r.colours} colours on a ${r.cols}x${r.rows} board is ${density.toFixed(1)} tiles of each - ` +
        `too few for a match to be findable rather than lucky. Use fewer colours or a bigger board`,
    };
  }

  if (!buildBoard(r)) {
    return {
      ok: false,
      reason: `no opening board with these settings had a legal swap and no free match already on it - fewer colours, or a bigger board`,
    };
  }

  const ceiling = r.moveLimit * perSwap(r.colours);
  if (r.clearTarget > ceiling) {
    return {
      ok: false,
      reason:
        `clearing ${r.clearTarget} tiles in ${r.moveLimit} swaps needs ${(r.clearTarget / r.moveLimit).toFixed(1)} ` +
        `tiles a swap, and ${r.colours} colours yield about ${perSwap(r.colours).toFixed(1)} even when every ` +
        `swap lands well - raise moveLimit or lower clearTarget`,
    };
  }

  return { ok: true, trivial: ceiling > r.clearTarget * 3 };
}
