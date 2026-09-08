import { CATALOGUE } from "./catalogue";
import { ARCADE_FIXTURES } from "./fixtures";
import { ArcadeSpecShape, ENGINES, type ArcadeSpec, type Engine } from "./schema";

/**
 * THE LIST OF GAMES YOU CAN ACTUALLY ASK FOR, with a real one of each to look at.
 *
 * Zul: *"the available game is not clear, list all the available games with
 * preview so user could choose."* He was right, and it had been true since the
 * first engine: `/create` was a text box, and the only way to find out that a
 * maze chase existed was to guess the word "maze". Ten engines is worse than
 * five for that - the more it can do, the less a blank box tells you.
 *
 * EVERY FIELD HERE IS DERIVED, none of it is typed out again:
 *
 * - the name and the VERBS come from `catalogue.ts`, so a card can never
 *   describe an engine differently from the router that picks it;
 * - the example prompt is the catalogue's own first example, which is the same
 *   string `catalogue.test.ts` asserts routes to that engine - so clicking a
 *   card is guaranteed to produce the game on the card;
 * - the spec is the engine's `.valid` fixture, which `schema.test.ts` already
 *   proves is playable.
 *
 * A gallery maintained by hand alongside the catalogue would be two lists that
 * agree on the day they are written.
 */

export type GalleryEntry = {
  engine: Engine;
  /** "Maze chase" - a name, for a card. */
  name: string;
  /** What your hands do. The most useful sentence on the card. */
  verbs: string;
  /** A prompt that reaches this engine, from the catalogue's own examples. */
  prompt: string;
  spec: ArcadeSpec;
};

/**
 * "a maze chase" -> "Maze chase".
 *
 * The catalogue writes labels the way a refusal reads them out ("there is no
 * engine for a tower defence game"), and a card wants a name. Deriving it keeps
 * one source; the alternative is a second label field that drifts.
 */
function nameFrom(label: string): string {
  const bare = label.replace(/^an?\s+/i, "");
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

/**
 * The fixture, shape-checked but NOT re-simulated.
 *
 * `ArcadeSpec` runs the full playability check, and for `maze-chase` that means
 * carving a maze and walking a perfect player round it - a hundred milliseconds
 * or so, on every render of a page that shows ten of these. The value it would
 * add here is zero: these are the bundled `.valid` fixtures, and
 * `schema.test.ts` already asserts every one of them passes the real check.
 *
 * So the shape is parsed - which is what stops an unvalidated object reaching a
 * renderer - and the simulation is left to the test suite that owns it.
 */
function previewSpec(engine: Engine): ArcadeSpec {
  const raw = ARCADE_FIXTURES[`${engine}.valid`];
  return ArcadeSpecShape.parse(raw) as ArcadeSpec;
}

export const GALLERY: GalleryEntry[] = ENGINES.map((engine) => {
  // The weight-3 row is the one that names the engine outright, and its label
  // and verbs are the definitive description of it.
  const genre = CATALOGUE.find(
    (g) => g.disposition.kind === "engine" && g.disposition.engine === engine && g.disposition.weight === 3,
  );
  if (!genre) throw new Error(`no catalogue entry names the ${engine} engine`);
  return {
    engine,
    name: nameFrom(genre.label),
    verbs: genre.verbs,
    prompt: genre.examples[0],
    spec: previewSpec(engine),
  };
});
