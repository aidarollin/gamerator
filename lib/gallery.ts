import { CATALOGUE } from "@/lib/arcade/catalogue";
import { ARCADE_FIXTURES } from "@/lib/arcade/fixtures";
import { ArcadeSpecShape, ENGINES, type ArcadeSpec, type Engine } from "@/lib/arcade/schema";
import { readFixture } from "@/lib/spec/fixtures";
import { GameSpec, TEMPLATES } from "@/lib/spec/schema";

/**
 * EVERY GAME YOU CAN ASK FOR, with a real one of each to look at.
 *
 * Zul: *"the available game is not clear, list all the available games with
 * preview so user could choose."* This is that list, and it now covers BOTH
 * halves of the product - ten arcade engines and the five Pandai Design System
 * learning templates that were reachable only from `/play/preview`.
 *
 * EVERY FIELD IS DERIVED, none of it typed out twice:
 *
 * - the name and the VERBS come from `catalogue.ts`, so a card cannot describe
 *   a game differently from the router that picks it;
 * - the example prompt is that entry's own first example, which is the string
 *   `catalogue.test.ts` asserts routes there - so clicking a card is guaranteed
 *   to produce the game on the card;
 * - the spec is the `.valid` fixture, which the schema tests already prove is
 *   playable.
 *
 * A gallery maintained by hand alongside the catalogue would be two lists that
 * agree only on the day they are written.
 */

export type GalleryEntry = {
  /** Stable per card, and unique across both families. */
  id: string;
  /** "Maze chase" - a name, for a card. */
  name: string;
  /** What your hands do. The most useful sentence on the card. */
  verbs: string;
  /** A prompt that reaches this game, from the catalogue's own examples. */
  prompt: string;
} & (
  | { kind: "arcade"; engine: Engine; spec: ArcadeSpec }
  | { kind: "template"; template: (typeof TEMPLATES)[number]; spec: GameSpec }
);

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
 * The arcade fixture, shape-checked but NOT re-simulated.
 *
 * `ArcadeSpec` runs the full playability check, and for `maze-chase` that means
 * carving a maze and walking a perfect player round it - a hundred milliseconds
 * or so, on every render of a page that shows fifteen of these. The value it
 * would add is zero: these are the bundled `.valid` fixtures and
 * `schema.test.ts` already asserts every one passes the real check.
 *
 * So the shape is parsed - which is what stops an unvalidated object reaching a
 * renderer - and the simulation is left to the test suite that owns it.
 */
function arcadeSpec(engine: Engine): ArcadeSpec {
  return ArcadeSpecShape.parse(ARCADE_FIXTURES[`${engine}.valid`]) as ArcadeSpec;
}

/**
 * The learning fixture, parsed in FULL.
 *
 * No shortcut here, and the asymmetry is deliberate rather than sloppy: a
 * `GameSpec` has no simulation behind it, so the complete parse is cheap and
 * there is nothing to trade away.
 */
function templateSpec(t: (typeof TEMPLATES)[number]): GameSpec {
  return GameSpec.parse(readFixture(`${t}.valid`));
}

export const GALLERY: GalleryEntry[] = CATALOGUE.flatMap((genre): GalleryEntry[] => {
  const d = genre.disposition;
  const base = {
    name: nameFrom(genre.label),
    verbs: genre.verbs,
    prompt: genre.examples[0],
  };
  // Only the weight-3 row names an engine outright; the weight-1 row is the
  // same game reached by a vaguer word, and two cards for it would be a lie
  // about how many games there are.
  if (d.kind === "engine" && d.weight === 3) {
    return [{ ...base, id: d.engine, kind: "arcade", engine: d.engine, spec: arcadeSpec(d.engine) }];
  }
  if (d.kind === "template") {
    return [
      { ...base, id: d.template, kind: "template", template: d.template, spec: templateSpec(d.template) },
    ];
  }
  return [];
});

/** Every built game is on a card, or the gallery is quietly lying about the catalogue. */
export const GALLERY_COVERS_EVERYTHING =
  ENGINES.every((e) => GALLERY.some((g) => g.id === e)) &&
  TEMPLATES.every((t) => GALLERY.some((g) => g.id === t));
