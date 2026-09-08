import { z } from "zod";
import { makeRng } from "@/lib/game/random";
import type { Verdict } from "./engines";

/**
 * The maze chase: clear every dot without being caught.
 *
 * Pac-Man is the most-named game with no engine here, and it is not an
 * adaptation of anything: snake is the only other grid engine and its verbs are
 * "grow, and do not hit yourself". Nothing was chasing you.
 *
 * EVERYTHING IN THIS FILE IS SHARED BY THE RENDERER AND THE CHECK, including
 * the maze itself and the chasers' dice. That is why `mazeSeed` is a field of
 * the spec rather than something the renderer picks: a check that approves one
 * maze while the player is given another is not a check. With the seed in the
 * spec, `mazeVerdict` simulates the exact board, the exact dot placement and
 * the exact chaser rolls that the person will meet.
 */

export const MazeRules = z.object({
  /** Forced odd when the maze is carved - see `oddify`. */
  gridCols: z.number().int().min(9).max(21),
  gridRows: z.number().int().min(9).max(21),
  /** Cells per second. */
  playerSpeed: z.number().min(2).max(10),
  chaserSpeed: z.number().min(1).max(9),
  chasers: z.number().int().min(1).max(4),
  /** 0 wanders, 1 always takes the step that closes the distance. */
  chaserSmarts: z.number().min(0).max(1),
  /** Dots to clear to win. Must fit in the maze's open cells. */
  dotTarget: z.number().int().min(5).max(120),
  /** Eating one sends the chasers running for `scaredSeconds`. */
  powerPellets: z.number().int().min(0).max(4),
  scaredSeconds: z.number().min(2).max(10),
  /** Which maze. Part of the spec so the check and the renderer agree. */
  mazeSeed: z.number().int().min(1).max(999),
  lives: z.number().int().min(1).max(5),
});
export type MazeRules = z.infer<typeof MazeRules>;

export type Cell = { x: number; y: number };

/** A maze needs odd dimensions to have walls on both sides of every corridor. */
export const oddify = (n: number) => (n % 2 === 1 ? n : n - 1);

export type Maze = {
  cols: number;
  rows: number;
  /** `wall[y][x]`. */
  wall: boolean[][];
  open: Cell[];
  start: Cell;
  dens: Cell[];
  dots: Cell[];
  pellets: Cell[];
};

/**
 * A perfect maze, carved by recursive backtracking, and then DELIBERATELY
 * SPOILED.
 *
 * A perfect maze is all dead ends, and a dead end with something chasing you is
 * not a decision, it is a coin flip you already lost. Knocking roughly a fifth
 * of the interior walls back out turns the corridors into a loop network, which
 * is what every real maze-chase board is: somewhere to run to.
 */
export function buildMaze(r: MazeRules): Maze {
  const cols = oddify(r.gridCols);
  const rows = oddify(r.gridRows);
  const rng = makeRng(r.mazeSeed * 7919 + cols * 31 + rows);
  const wall: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(true));

  const carve = (x: number, y: number) => {
    wall[y][x] = false;
    const dirs = [
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ];
    // Fisher-Yates on the four directions, from the seeded stream.
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx <= 0 || ny <= 0 || nx >= cols - 1 || ny >= rows - 1) continue;
      if (!wall[ny][nx]) continue;
      wall[y + dy / 2][x + dx / 2] = false;
      carve(nx, ny);
    }
  };
  carve(1, 1);

  // The loops. Only interior walls that separate two open cells are candidates,
  // so the outer border always survives and the board stays enclosed.
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (!wall[y][x]) continue;
      const horizontal = !wall[y][x - 1] && !wall[y][x + 1];
      const vertical = !wall[y - 1][x] && !wall[y + 1][x];
      if ((horizontal || vertical) && rng() < 0.22) wall[y][x] = false;
    }
  }

  const open: Cell[] = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) if (!wall[y][x]) open.push({ x, y });

  const start = { x: 1, y: rows - 2 };
  // The dens sit as far from the player's corner as the board allows, spread
  // across the far side so four chasers do not all start on one cell.
  const far = [...open].sort(
    (a, b) => b.x + b.y - (a.x + a.y) || (a.x % 3) - (b.x % 3),
  );
  const dens: Cell[] = [];
  for (const c of far) {
    if (dens.length >= r.chasers) break;
    if (dens.some((d) => d.x === c.x && d.y === c.y)) continue;
    if (Math.abs(c.x - start.x) + Math.abs(c.y - start.y) < 6) continue;
    dens.push(c);
  }
  while (dens.length < r.chasers) dens.push(far[0] ?? start);

  const taken = (c: Cell) =>
    (c.x === start.x && c.y === start.y) || dens.some((d) => d.x === c.x && d.y === c.y);

  /**
   * EVERY open cell gets a dot, and `dotTarget` is how many you have to eat.
   *
   * The first version laid exactly `dotTarget` dots on every third free cell,
   * which is what a screenshot showed to be wrong: 28 dots across 110 cells
   * left whole corridors bare, so a player could run for four seconds down a
   * perfectly reasonable route and score nothing. It looked like a broken
   * collectible, which is precisely the failure mode `collect.ts` was extracted
   * to make visible - "a coin nobody collects looks exactly like a coin nobody
   * wanted".
   *
   * Filling the corridors is also just what this genre looks like, and it makes
   * `dotTarget` a clean difficulty dial: how much of the board you must clear
   * before the chasers get you.
   */
  const spread = open.filter((c) => !taken(c));
  const dots: Cell[] = spread;

  // Pellets go where they are worth walking to: the cells furthest from home.
  const pellets = spread
    .slice()
    .sort(
      (a, b) =>
        Math.abs(b.x - start.x) + Math.abs(b.y - start.y) - (Math.abs(a.x - start.x) + Math.abs(a.y - start.y)),
    )
    .slice(0, r.powerPellets);

  return { cols, rows, wall, open, start, dens, dots, pellets };
}

/**
 * The chase/scatter cycle, and it is the mechanic that makes this genre
 * PLAYABLE rather than a detail of the original.
 *
 * The first version had every chaser beeline at the player forever, and
 * `mazeVerdict` refused to certify anything with three of them - correctly. The
 * instinct was to soften the numbers until the check went quiet. That would
 * have been fixing the thermometer: three identical pursuers that never let up
 * really is unwinnable, and the arcade original solved it in 1980 by having the
 * ghosts periodically break off and head for their own corner. It is what turns
 * a chase into a rhythm you can learn - and it means a genuinely fast chaser
 * can stay in the spec instead of being tuned down to a stroll.
 *
 * Seven seconds hunting, three seconds scattering, shared by the simulation and
 * the renderer so both play the same game.
 */
export const CHASE_SECONDS = 7;
export const SCATTER_SECONDS = 3;

export function isScattering(time: number): boolean {
  return time % (CHASE_SECONDS + SCATTER_SECONDS) >= CHASE_SECONDS;
}

const key = (c: Cell) => `${c.x},${c.y}`;

function neighbours(m: Maze, c: Cell): Cell[] {
  const out: Cell[] = [];
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const x = c.x + dx;
    const y = c.y + dy;
    if (x < 0 || y < 0 || x >= m.cols || y >= m.rows) continue;
    if (!m.wall[y][x]) out.push({ x, y });
  }
  return out;
}

/**
 * A memoised `distances`, and it is not an optimisation - it is the difference
 * between a check that runs and one that does not.
 *
 * The simulation asks for shortest paths several times per simulated tick, and
 * the uncached version cost roughly 8,000 breadth-first searches per run. The
 * board has at most ~250 open cells, so there are at most ~250 distinct answers
 * in the whole run. Caching by the origin cell turns a check that took minutes
 * under the fuzz suite into one that takes under a second.
 */
export function distanceCache(m: Maze) {
  const memo = new Map<string, Map<string, number>>();
  return (from: Cell) => {
    const k = key(from);
    let d = memo.get(k);
    if (!d) {
      d = distances(m, from);
      memo.set(k, d);
    }
    return d;
  };
}

/** Step counts from `from` to every reachable cell. Used by both sides. */
export function distances(m: Maze, from: Cell): Map<string, number> {
  const dist = new Map<string, number>([[key(from), 0]]);
  const queue: Cell[] = [from];
  for (let i = 0; i < queue.length; i++) {
    const c = queue[i];
    const d = dist.get(key(c))!;
    for (const n of neighbours(m, c)) {
      if (dist.has(key(n))) continue;
      dist.set(key(n), d + 1);
      queue.push(n);
    }
  }
  return dist;
}

/**
 * The chasers' move, shared by the simulation and the renderer.
 *
 * `smarts` is the chance of taking the step that closes the distance; the rest
 * of the time it wanders. Reversing is refused unless there is nowhere else,
 * because a chaser that oscillates in a corridor is not chasing anyone.
 */
export function chaserStep(
  m: Maze,
  at: Cell,
  came: Cell | null,
  target: Cell,
  smarts: number,
  scared: boolean,
  roll: number,
  /** Shared with the caller so one board's searches are computed once. */
  dist: (from: Cell) => Map<string, number>,
): Cell {
  let options = neighbours(m, at);
  if (options.length > 1 && came)
    options = options.filter((o) => !(o.x === came.x && o.y === came.y));
  if (options.length === 0) return at;

  const wander = roll >= smarts;
  if (wander && !scared) return options[Math.floor(roll * options.length) % options.length];

  const to = dist(target);
  const score = (c: Cell) => to.get(key(c)) ?? 999;
  return options.reduce((best, c) =>
    scared ? (score(c) > score(best) ? c : best) : score(c) < score(best) ? c : best,
  );
}

/**
 * Can a perfect player clear the board?
 *
 * A real simulation rather than arithmetic, because the answer depends on the
 * SHAPE of the maze and not only on the speeds: a fast chaser on a looping
 * board is survivable and a slow one in a corridor of dead ends is not, and no
 * formula over `chaserSpeed / playerSpeed` can tell those apart.
 *
 * The simulated player is deliberately competent but not clairvoyant. It walks
 * the shortest path to the nearest dot, refuses any step that puts it inside a
 * chaser's next move, and runs for the widest gap when boxed in. That is the
 * standard this repo has settled on after `duelPlayability` turned away 84% of
 * legal specs by modelling a bad player: when a check rejects most of its own
 * bounds, suspect the agent before the spec.
 *
 * WHAT THIS PROVES, EXACTLY: that this maze, with these dot positions and this
 * chaser dice-roll sequence, is clearable. Not that every maze of this size is.
 * That is a real guarantee rather than a statistical one only because
 * `mazeSeed` is part of the spec, so the board simulated here is the board that
 * gets played.
 */
export function mazeVerdict(r: MazeRules): Verdict {
  const m = buildMaze(r);
  const playable = m.open.length - r.chasers - 1;
  if (r.dotTarget > playable) {
    return {
      ok: false,
      reason: `a ${oddify(r.gridCols)}x${oddify(r.gridRows)} maze with this seed has ${playable} free cells, which is not enough for ${r.dotTarget} dots`,
    };
  }

  const rng = makeRng(r.mazeSeed * 104729 + 17);
  const dist = distanceCache(m);
  let lives = r.lives;
  let closest = 99;

  const run = () => {
    let player = { ...m.start };
    const ghosts = m.dens.map((d) => ({ at: { ...d }, came: null as Cell | null }));
    const dots = m.dots.map((d) => ({ ...d, eaten: false }));
    const pellets = m.pellets.map((p) => ({ ...p, eaten: false }));
    let scared = 0;
    let eaten = 0;
    let time = 0;
    let pAcc = 0;
    let gAcc = 0;
    const dt = 1 / 60;
    const BUDGET = 150;

    while (time < BUDGET) {
      time += dt;
      if (scared > 0) scared = Math.max(0, scared - dt);

      gAcc += dt;
      if (gAcc >= 1 / r.chaserSpeed) {
        gAcc = 0;
        const scatter = isScattering(time);
        for (let i = 0; i < ghosts.length; i++) {
          const g = ghosts[i];
          // Scattering sends each chaser to its OWN den rather than to a shared
          // corner, so they break apart instead of moving as one block.
          const target = scatter ? m.dens[i] : player;
          const next = chaserStep(m, g.at, g.came, target, r.chaserSmarts, scared > 0, rng(), dist);
          g.came = g.at;
          g.at = next;
        }
      }

      pAcc += dt;
      if (pAcc >= 1 / r.playerSpeed) {
        pAcc = 0;
        const dangerous = (c: Cell) => {
          if (scared > 0) return false;
          return ghosts.some(
            (g) =>
              (g.at.x === c.x && g.at.y === c.y) ||
              Math.abs(g.at.x - c.x) + Math.abs(g.at.y - c.y) <= 1,
          );
        };
        const options = neighbours(m, player);
        const safe = options.filter((o) => !dangerous(o));
        const from = dist(player);
        const want = [...dots.filter((d) => !d.eaten), ...pellets.filter((p) => !p.eaten)]
          .map((d) => ({ d, n: from.get(key(d)) ?? 999 }))
          .sort((a, b) => a.n - b.n)[0];

        /** How much room a cell buys. Ties toward a dot are broken on this. */
        const room = (c: Cell) =>
          Math.min(...ghosts.map((g) => Math.abs(g.at.x - c.x) + Math.abs(g.at.y - c.y)));

        let move: Cell | undefined;
        if (want && safe.length) {
          const to = dist(want.d);
          const near = (c: Cell) => to.get(key(c)) ?? 999;
          // Two equally good steps toward the same dot are not equally good:
          // the first version took whichever came first out of `neighbours`,
          // and walked into a pincer often enough to fail specs that a person
          // clears easily. A check that models a careless player rejects good
          // games, which is the mistake `duelPlayability` made three times.
          move = safe.reduce((best, c) =>
            near(c) < near(best) || (near(c) === near(best) && room(c) > room(best)) ? c : best,
          );
        } else if (safe.length) {
          move = safe.reduce((best, c) => (room(c) > room(best) ? c : best));
        } else if (options.length) {
          // Boxed in: take the step that buys the most room and hope.
          move = options.reduce((best, c) => (room(c) > room(best) ? c : best));
        }
        if (move) player = move;
      }

      const near = Math.min(
        ...ghosts.map((g) => Math.abs(g.at.x - player.x) + Math.abs(g.at.y - player.y)),
      );
      closest = Math.min(closest, near);

      if (scared > 0) {
        for (const g of ghosts)
          if (g.at.x === player.x && g.at.y === player.y) g.at = { ...m.dens[0] };
      } else if (near === 0) {
        return "caught" as const;
      }

      for (const d of dots)
        if (!d.eaten && d.x === player.x && d.y === player.y) {
          d.eaten = true;
          eaten++;
        }
      for (const p of pellets)
        if (!p.eaten && p.x === player.x && p.y === player.y) {
          p.eaten = true;
          scared = r.scaredSeconds;
        }
      if (eaten >= r.dotTarget) return "cleared" as const;
    }
    return "timeout" as const;
  };

  for (;;) {
    const outcome = run();
    if (outcome === "cleared") {
      // Never threatened once across a whole board is a walk, not a chase.
      return { ok: true, trivial: closest >= 4 };
    }
    if (outcome === "timeout") {
      return {
        ok: false,
        reason: `a perfect player could not clear ${r.dotTarget} dots in two and a half minutes at ${r.playerSpeed.toFixed(1)} cells/s - fewer dots, a smaller maze or a faster player`,
      };
    }
    lives -= 1;
    if (lives <= 0) {
      return {
        ok: false,
        reason:
          `${r.chasers} chaser${r.chasers > 1 ? "s" : ""} at ${r.chaserSpeed.toFixed(1)} cells/s ` +
          `with smarts ${r.chaserSmarts.toFixed(2)} caught a perfect player ${r.lives} time${r.lives > 1 ? "s" : ""} ` +
          `at ${r.playerSpeed.toFixed(1)} cells/s - slow the chasers, dull their smarts, or add a power pellet`,
      };
    }
  }
}
