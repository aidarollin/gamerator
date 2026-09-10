import { z } from "zod";
import { ACCENT_FAMILIES, SUBJECT_KEYS } from "@/lib/ds/tokens.generated";
import { Character, ENGINES, PLANNED_ENGINES } from "./schema";
import { ADAPTED, ENGINE_WORDS, UNSUPPORTED } from "./catalogue";

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

export const ALL_ENGINE_NAMES = [...ENGINES, ...PLANNED_ENGINES];

export function renderArcadeBrief(brief: ArcadeBrief): string {
  const lines = [`Request: ${brief.prompt}`];
  if (brief.character) lines.push(`Character: ${brief.character}`);
  if (brief.palette) lines.push(`Palette: ${brief.palette}`);
  if (brief.difficulty) lines.push(`Difficulty: ${brief.difficulty}`);
  lines.push(`Language: ${brief.language === "ms" ? "Bahasa Melayu" : "English"}`);
  return lines.join("\n");
}
