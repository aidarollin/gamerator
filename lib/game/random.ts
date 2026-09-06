/**
 * Deterministic randomness.
 *
 * NFR2 says the same spec produces the same game, always. `shuffleQuestions`
 * and `shuffleOptions` are in direct tension with that if they call
 * `Math.random()`: the game would differ per render, per player, and per
 * server/client pass - which in React also means the markup the server sent
 * disagrees with what the client draws, and hydration breaks.
 *
 * So shuffling is seeded from the spec's own content. A given spec always
 * shuffles the same way; change the spec and the order changes with it. That
 * keeps the rules honoured and the renderer reproducible, and it makes a
 * reported bug replayable from the spec alone.
 */

/** FNV-1a. Small, stable across platforms, and good enough to seed with. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 - one 32-bit state, uniform enough for shuffling a quiz. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates. Returns a new array; never mutates the input. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = items.slice();
  const rng = makeRng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A seed derived from the spec itself, plus a label so that questions and
 * options do not shuffle in lockstep.
 */
export function specSeed(specTitle: string, label: string): number {
  return hashString(`${specTitle}::${label}`);
}
