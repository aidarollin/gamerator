import valid from "./fixtures/endless-flyer.valid.json";
import easy from "./fixtures/endless-flyer.easy.json";
import hard from "./fixtures/endless-flyer.hard.json";
import twist from "./fixtures/endless-flyer.twist.json";
import edge from "./fixtures/endless-flyer.edge.json";
import invalid from "./fixtures/endless-flyer.invalid.json";
import unplayable from "./fixtures/endless-flyer.unplayable.json";
import trivial from "./fixtures/endless-flyer.trivial.json";

/**
 * Static imports, not a directory read - a Cloudflare Worker has no
 * filesystem. See docs/TECHNICAL-PLAN.md gotcha 9.
 *
 * Note the two categories the learning fixtures never needed: `unplayable` and
 * `trivial`. Both hold specs where every field is inside its bound and the game
 * is still broken, and both are rejected by the simulation rather than by a
 * bound. They are the reason the simulation exists.
 */
export const ARCADE_FIXTURES: Record<string, unknown> = {
  "endless-flyer.valid": valid,
  "endless-flyer.easy": easy,
  "endless-flyer.hard": hard,
  "endless-flyer.twist": twist,
  "endless-flyer.edge": edge,
  "endless-flyer.invalid": invalid,
  "endless-flyer.unplayable": unplayable,
  "endless-flyer.trivial": trivial,
};

export const ARCADE_FIXTURE_NAMES = Object.keys(ARCADE_FIXTURES);

/** Fixtures the schema must ACCEPT. Everything else must be rejected. */
export const ARCADE_ACCEPTED = [
  "endless-flyer.valid",
  "endless-flyer.easy",
  "endless-flyer.hard",
  "endless-flyer.twist",
  "endless-flyer.edge",
];

export function readArcadeFixture(name: string): unknown {
  const f = ARCADE_FIXTURES[name];
  if (f === undefined) throw new Error(`no such arcade fixture: ${name}`);
  return f;
}
