import { z } from "zod";
import type { Verdict } from "./engines";

/**
 * Falling blocks: steer a piece down a well, complete a row, clear it.
 *
 * Tetris was the single most-named refusal, and the reason recorded for it -
 * "tetris and snake share only a grid" - was right about the ADAPTATION and
 * wrong as a permanent answer. Sharing only a grid is exactly why it needed its
 * own engine, not why it could never have one.
 *
 * The pieces and the rotation live here rather than in the renderer's closure,
 * so `blocksVerdict` can reason about the same shapes the player is given. A
 * check that assumed four-cell pieces while the renderer dealt something else
 * would be the `collect.ts` mistake again.
 */

/** Each rotation as offsets from the piece's origin. */
export type Piece = { name: string; cells: [number, number][][]; span: number };

const rot = (cells: [number, number][], turns: number): [number, number][] =>
  turns === 0 ? cells : rot(cells.map(([x, y]) => [-y, x] as [number, number]), turns - 1);

const piece = (name: string, cells: [number, number][], turns: number): Piece => ({
  name,
  cells: Array.from({ length: turns }, (_, i) => rot(cells, i)),
  span: Math.max(...cells.map(([x]) => x)) - Math.min(...cells.map(([x]) => x)) + 1,
});

/**
 * The four kind pieces and the three cruel ones.
 *
 * O, I, L and J can all be placed flat against a flat surface. S, Z and T
 * cannot - they leave a hole unless the surface already has the right notch,
 * which is the difference between Tetris and Tetris for someone who has never
 * played it. `easyPieces` is that difference, and it is a real difficulty dial
 * rather than a cosmetic one.
 */
export const EASY_PIECES: Piece[] = [
  piece("O", [[0, 0], [1, 0], [0, 1], [1, 1]], 1),
  piece("I", [[-1, 0], [0, 0], [1, 0], [2, 0]], 2),
  piece("L", [[-1, 0], [0, 0], [1, 0], [1, 1]], 4),
  piece("J", [[-1, 0], [0, 0], [1, 0], [-1, 1]], 4),
];

export const HARD_PIECES: Piece[] = [
  piece("S", [[0, 0], [1, 0], [-1, 1], [0, 1]], 2),
  piece("Z", [[-1, 0], [0, 0], [0, 1], [1, 1]], 2),
  piece("T", [[-1, 0], [0, 0], [1, 0], [0, 1]], 4),
];

export const pieceSet = (easy: boolean): Piece[] =>
  easy ? EASY_PIECES : [...EASY_PIECES, ...HARD_PIECES];

export const BlocksRules = z.object({
  cols: z.number().int().min(6).max(12),
  rows: z.number().int().min(10).max(20),
  /** Cells per second the piece falls on its own. */
  dropSpeed: z.number().min(0.6).max(8),
  /** Cells/s added per line cleared. */
  speedUp: z.number().min(0).max(0.35),
  linesToWin: z.number().int().min(3).max(40),
  /** O, I, L and J only. S, Z and T are what make it hard. */
  easyPieces: z.boolean(),
  lives: z.number().int().min(1).max(5),
});
export type BlocksRules = z.infer<typeof BlocksRules>;

/** How long a piece takes to reach the floor, at the end of the run. */
export function placementTime(r: BlocksRules) {
  const finalSpeed = r.dropSpeed + r.speedUp * r.linesToWin;
  return { finalSpeed, seconds: r.rows / finalSpeed };
}

/**
 * Is there time to place a piece, and room to place it?
 *
 * The failure this catches is the one that field bounds cannot: every number
 * legal, and by the thirtieth line the piece hits the floor before a human has
 * finished deciding where it goes. `speedUp` is what makes that invisible -
 * the opening is comfortable, and the game becomes unplayable somewhere the
 * author never looked. Same shape as the flyer's ramp, and caught the same way:
 * judge it at the END.
 */
export function blocksVerdict(r: BlocksRules): Verdict {
  const { finalSpeed, seconds } = placementTime(r);

  // 0.9s is not arbitrary: it is about two deliberate taps, which is the
  // minimum to rotate a piece once and slide it a couple of columns.
  if (seconds < 0.9) {
    return {
      ok: false,
      reason:
        `by line ${r.linesToWin} the drop is ${finalSpeed.toFixed(1)} cells/s, so a piece crosses ` +
        `${r.rows} rows in ${seconds.toFixed(2)}s - there is no time to rotate it and steer it. ` +
        `Lower speedUp, lower dropSpeed, or make the well taller`,
    };
  }

  if (!r.easyPieces && r.cols <= 6) {
    return {
      ok: false,
      reason: `the S, Z and T pieces need somewhere to go, and a ${r.cols}-column well leaves almost none - widen it or set easyPieces`,
    };
  }

  /**
   * A chimney. The first version of this third check compared `linesToWin *
   * cols` against `cols * rows * 8`, which reduces to `linesToWin > rows * 8` -
   * at most 40 lines against at least 80, so it could never fire under any
   * legal spec. It was dead code that read as coverage, which is the failure
   * `engines.test.ts` exists to catch, and it caught this one.
   *
   * This is the real version. Deep and narrow is survivable with the four kind
   * pieces, because every one of them lies flat. Add S and Z, which cannot,
   * and each awkward piece buries a hole that only a full row can dig out -
   * in a well with barely a row's worth of width to work in.
   */
  if (!r.easyPieces && r.rows / r.cols > 2.4) {
    return {
      ok: false,
      reason:
        `a ${r.cols}x${r.rows} well is a chimney, and the S and Z pieces bury a hole every time ` +
        `they land badly - there is no room to dig one out. Widen it, make it shallower, or set easyPieces`,
    };
  }

  const trivial = r.dropSpeed < 1.2 && r.speedUp === 0 && r.linesToWin <= 5 && r.easyPieces;
  return { ok: true, trivial };
}
