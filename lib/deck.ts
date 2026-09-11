import { ArcadeBrief, chooseGame, routableText } from "@/lib/arcade/brief";
import { encodeSpec } from "@/lib/arcade/embed";
import { readArcadeFixture } from "@/lib/arcade/fixtures";
import { tuneArcade } from "@/lib/arcade/generate";
import { ArcadeSpec, type Engine } from "@/lib/arcade/schema";
import { GALLERY } from "@/lib/gallery";

/**
 * EVERYTHING THE DECK SHOWS, computed by the real system rather than typed out.
 *
 * The deck makes claims - "a racing game is adapted and it says so", "chess
 * gets a no", "this impossible game is rejected" - and a slide that asserts a
 * behaviour in prose is a slide that goes stale the day the behaviour changes.
 * So every demo is produced here by the same code `/create` runs: the router,
 * the free tuner, the validator. `deck.test.ts` pins that each one still shows
 * what its slide says it shows.
 *
 * NEVER A MODEL CALL. The tuner is reached through `tuneArcade`, which has no
 * path to a provider; going through `generateArcade` would make a paid call
 * every time the slide rendered under `npm run dev:live`.
 */

export type Tone = "engine" | "adapt" | "template" | "refuse";

export const embedUrl = (spec: unknown) => `/embed?s=${encodeSpec(spec)}`;

const nameOf = (id: string) => GALLERY.find((g) => g.id === id)?.name ?? id;
const verbsOf = (id: string) => GALLERY.find((g) => g.id === id)?.verbs ?? "";

/* ------------------------------------------------ a sentence becomes a game */

export const DESCRIBE_PROMPTS = [
  "a hard flappy bird with PBot through chemistry pink pipes",
  "a pac man style game in a science lab",
  "a sparring match with Aidan",
  "a racing game at night",
];

export type Described = { prompt: string; engine: Engine; tone: Tone; tag: string; src: string };

export function describeDemos(): Described[] {
  return DESCRIBE_PROMPTS.map((prompt) => {
    const out = tuneArcade(ArcadeBrief.parse({ prompt }), routableText({ prompt }));
    if (out.status !== "ok") throw new Error(`deck: "${prompt}" did not tune (${out.status})`);
    return {
      prompt,
      engine: out.spec.engine,
      tone: out.adapted ? "adapt" : "engine",
      tag: out.adapted
        ? `${out.adapted.requested}, played as ${nameOf(out.spec.engine).toLowerCase()}`
        : nameOf(out.spec.engine),
      src: embedUrl(out.spec),
    };
  });
}

/* ---------------------------------------------------- the router's answers */

export const ASK_PROMPTS = [
  "pac-man",
  "a racing game",
  "a quiz about photosynthesis",
  "a chess board game",
  "a scary horror game",
];

export type Verdict = { prompt: string; tone: Tone; label: string; head: string; body: string };

export function verdictDemos(): Verdict[] {
  return ASK_PROMPTS.map((prompt): Verdict => {
    const c = chooseGame(routableText({ prompt }));
    if (c.kind === "template") {
      return {
        prompt,
        tone: "template",
        label: "Pandai learning game",
        head: nameOf(c.template),
        body: verbsOf(c.template),
      };
    }
    if (c.kind === "no-engine") {
      return {
        prompt,
        tone: "refuse",
        label: "An honest no",
        head: `No engine for ${c.requested}`,
        body: c.why ?? "Nothing built plays that way yet.",
      };
    }
    if (c.adapted) {
      return {
        prompt,
        tone: "adapt",
        label: "Adapted, and it says so",
        head: `Played as ${nameOf(c.engine).toLowerCase()}`,
        body: c.adapted.how,
      };
    }
    return {
      prompt,
      tone: c.confident ? "engine" : "adapt",
      label: c.confident ? "A built engine" : "A guess, and it says so",
      head: nameOf(c.engine),
      body: verbsOf(c.engine),
    };
  });
}

/* ------------------------------------------------------------ the ten games */

export function gameDemos() {
  return GALLERY.flatMap((g) =>
    g.kind === "arcade" ? [{ id: g.id, name: g.name, verbs: g.verbs, src: embedUrl(g.spec) }] : [],
  );
}

/* ---------------------------------------------------- the playability check */

export type Checked =
  | { label: string; ok: true; src: string }
  | { label: string; ok: false; reasons: string[] };

const CHECKS: [string, string][] = [
  ["Impossible", "endless-flyer.unplayable"],
  ["Too easy", "endless-flyer.trivial"],
  ["Just right", "endless-flyer.valid"],
];

/** The validator's own words, run on the bundled fixtures - not a paraphrase. */
export function checkDemos(): Checked[] {
  return CHECKS.map(([label, fixture]): Checked => {
    const parsed = ArcadeSpec.safeParse(readArcadeFixture(fixture));
    return parsed.success
      ? { label, ok: true, src: embedUrl(parsed.data) }
      : { label, ok: false, reasons: parsed.error.issues.map((i) => i.message) };
  });
}

/* ------------------------------------------------------ one game, re-skinned */

const SKINS: [label: string, palette: string, pandai?: true][] = [
  ["Chemistry", "chemistry"],
  ["Biology", "biology"],
  ["Physics", "physics"],
  ["English", "english"],
  ["Pandai skin", "chemistry", true],
];

/** The same flyer, the same numbers - only `theme` changes. */
export function skinDemos() {
  const base = ArcadeSpec.parse(readArcadeFixture("endless-flyer.valid"));
  return SKINS.map(([label, palette, pandai]) => {
    const spec = ArcadeSpec.parse({
      ...base,
      theme: { ...base.theme, palette, ...(pandai ? { skin: "pandai" } : {}) },
    });
    return { label, src: embedUrl(spec) };
  });
}

/* ------------------------------------------------ the data behind one game */

/**
 * What the AI fills in, as the reader would see it: the real fixture, trimmed
 * to the fields that decide the game, with each `{start, end}` range on one
 * line so it fits a slide.
 */
export function specDemo() {
  const spec = ArcadeSpec.parse(readArcadeFixture("endless-flyer.valid"));
  const shown = {
    engine: spec.engine,
    meta: { title: spec.meta.title, difficulty: spec.meta.difficulty },
    theme: spec.theme,
    rules: spec.rules,
  };
  const code = JSON.stringify(shown, null, 2).replace(
    /\{\n\s*("start": [^,\n]+),\n\s*("end": [^\n]+)\n\s*\}/g,
    "{ $1, $2 }",
  );
  return { code, src: embedUrl(spec) };
}
