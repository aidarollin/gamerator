import { z } from "zod";
import { ACCENT_FAMILIES, SUBJECT_KEYS } from "@/lib/ds/tokens.generated";
import { Character, ENGINES, PLANNED_ENGINES } from "./schema";
import { ADAPTED, ENGINE_WORDS, TEMPLATE_WORDS, UNSUPPORTED } from "./catalogue";
import type { TEMPLATES } from "@/lib/spec/schema";

/**
 * What a person types to get a game.
 *
 * One free-text field carries the intent; everything else is a constrained
 * choice with a sane default, so the form can be submitted without touching any
 * of it. A form that must be filled in completely before it does anything is a
 * form people abandon.
 */
export const ArcadeBrief = z.object({
  /** "a hard flappy bird with PBot, chemistry pink, tight gaps" */
  prompt: z.string().min(3).max(600),
  character: Character.optional(),
  palette: z.enum([...SUBJECT_KEYS, ...ACCENT_FAMILIES] as [string, ...string[]]).optional(),
  difficulty: z.enum(["easy", "normal", "hard"]).optional(),
  language: z.enum(["ms", "en"]).default("en"),
  /**
   * `arcade` (default) gives the game its own art direction; `pandai` renders
   * it through the DS token ramp so it sits next to real Pandai chrome. The
   * author's call, never the model's - see `theme.skin` in schema.ts.
   */
  skin: z.enum(["arcade", "pandai"]).optional(),

  /* ------------------------------------------- the other ways to say it */

  /**
   * A design document, a game-flow description, a pasted brief. The long field.
   *
   * `prompt` stays short because it is the one line that NAMES the thing, and a
   * 600-character limit is what keeps it that. This is where everything else
   * goes, and 4000 characters is the same allowance `lib/spec/brief.ts` gives
   * the learning templates, for the same reason.
   */
  notes: z.string().max(4000).optional(),

  /**
   * A link to a game, a video, a page describing one. Read, never rendered.
   *
   * `z.url()` rather than the deprecated `z.string().url()`. The shape check is
   * only the first gate anyway - `lib/inputs/link.ts` re-parses it and refuses
   * anything that is not http(s) or points somewhere a server should not be
   * talked into fetching.
   */
  link: z.url().max(2000).optional(),
});

export type ArcadeBrief = z.infer<typeof ArcadeBrief>;

type Engine = (typeof ENGINES)[number];

export type EngineChoice =
  | {
      kind: "engine";
      engine: Engine;
      confident: boolean;
      /** Present when this engine is standing in for a genre of its own. */
      adapted?: { requested: string; how: string };
    }
  | {
      kind: "no-engine";
      requested: string;
      nearest: Engine;
      /** What is actually missing. "No engine yet" tells nobody anything. */
      why?: string;
    };

/**
 * Which engine a prompt is asking for, decided in code rather than by the model.
 *
 * Deliberately not a model call. A model asked "which engine?" always picks
 * one, because picking is what it does - and being unable to answer is exactly
 * the outcome that matters here. Keyword scoring can genuinely return "no idea".
 *
 * THE ORDER OF THE FOUR ANSWERS, and why it is this order:
 *
 * 1. AN ENGINE, if the prompt names one. An explicit request beats every table
 *    below it - "a racing game like flappy bird" is a flyer, because the author
 *    said so and knows better than a keyword list does.
 * 2. AN ADAPTATION, if a built engine shares the VERBS. Said out loud.
 * 3. A REFUSAL, naming what is missing.
 * 4. A flyer, ADMITTED AS A GUESS.
 *
 * Refusals used to come first, which was wrong in a way that only showed once
 * engines started arriving: "a tetris puzzle" matched the refusal list and was
 * turned away on the day the falling-blocks engine shipped. Scoring the engines
 * first means building an engine is all it takes to start answering a genre.
 */
export function chooseEngine(prompt: string): EngineChoice {
  const scores = new Map<Engine, number>();
  for (const { engine, words, weight } of ENGINE_WORDS) {
    if (words.test(prompt)) scores.set(engine, (scores.get(engine) ?? 0) + weight);
  }

  if (scores.size > 0) {
    const best = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const tied = best.length > 1 && best[0][1] === best[1][1];
    return { kind: "engine", engine: best[0][0], confident: !tied && best[0][1] >= 1 };
  }

  for (const a of ADAPTED) {
    if (a.words.test(prompt)) {
      return {
        kind: "engine",
        engine: a.engine,
        confident: true,
        adapted: { requested: a.label, how: a.how },
      };
    }
  }

  for (const u of UNSUPPORTED) {
    if (u.words.test(prompt)) {
      return { kind: "no-engine", requested: u.label, nearest: "endless-flyer", why: u.why };
    }
  }

  // Genuine nonsense, or a real request that simply names no genre - "a fun
  // game for Year 3", or "asdfgh". Both get a flyer, and both get TOLD it was a
  // guess, which is the difference between a default and a silent one.
  return { kind: "engine", engine: "endless-flyer", confident: false };
}

/**
 * The whole answer, arcade engines AND Pandai DS learning templates.
 *
 * `chooseEngine` above stays arcade-only on purpose: `generateArcade` calls it
 * and must never be handed a template. This is the layer that knows about both
 * halves of the product, and it is what `/create` asks.
 *
 * TEMPLATES ARE CHECKED AFTER THE ENGINES AND BEFORE THE ADAPTATIONS. After the
 * engines, because "match 3" is an arcade engine and "match the pairs" is a
 * template, and the more specific arcade word should win when someone names
 * one. Before the adaptations, because "a quiz race about photosynthesis"
 * contains "race", and racing is adapted to the endless runner - a quiz would
 * otherwise come back as a jumping game.
 */
export type GameChoice =
  | EngineChoice
  | { kind: "template"; template: (typeof TEMPLATES)[number]; requested: string };

export function chooseGame(prompt: string): GameChoice {
  const arcade = chooseEngine(prompt);
  // A confident arcade answer wins outright. An unconfident one is the default
  // flyer, which is exactly the guess a template should be allowed to beat.
  if (arcade.kind === "engine" && arcade.confident && !arcade.adapted) return arcade;

  for (const t of TEMPLATE_WORDS) {
    if (t.words.test(prompt)) {
      return { kind: "template", template: t.template, requested: t.label };
    }
  }
  return arcade;
}

export const ALL_ENGINE_NAMES = [...ENGINES, ...PLANNED_ENGINES];

export function renderArcadeBrief(brief: ArcadeBrief): string {
  const lines = [`Request: ${brief.prompt}`];
  if (brief.character) lines.push(`Character: ${brief.character}`);
  if (brief.palette) lines.push(`Palette: ${brief.palette}`);
  if (brief.difficulty) lines.push(`Difficulty: ${brief.difficulty}`);
  lines.push(`Language: ${brief.language === "ms" ? "Bahasa Melayu" : "English"}`);
  if (brief.link) lines.push(`Reference link: ${brief.link}`);
  if (brief.notes?.trim()) lines.push("", "Notes from the author:", brief.notes.trim());
  return lines.join("\n");
}

/**
 * EVERY WORD THE AUTHOR GAVE US, for the router to read.
 *
 * The routing table matches on words, and before this it could only see the one
 * short line. Somebody who pastes a design document saying "the player runs
 * along the bottom and jumps over obstacles" and types "make this" in the box
 * was getting a coin flip - the notes were sent to the model but were invisible
 * to the code that decides which engine the model is even being asked about.
 *
 * `prompt` goes first AND is repeated, so an explicit one-line instruction
 * still outweighs a long document that mentions six genres in passing: the
 * router scores by weight, and doubling means a genre named in the box counts
 * twice for every once it is named in the notes.
 */
export function routableText(brief: {
  prompt: string;
  notes?: string;
  linkWords?: string;
}): string {
  return [brief.prompt, brief.prompt, brief.linkWords ?? "", brief.notes ?? ""]
    .filter(Boolean)
    .join("\n");
}
