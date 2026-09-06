import { z } from "zod";
import { ACCENT_FAMILIES, SUBJECT_KEYS } from "@/lib/ds/tokens.generated";
import { Character, ENGINES, PLANNED_ENGINES } from "./schema";

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
});

export type ArcadeBrief = z.infer<typeof ArcadeBrief>;

/**
 * Which engine a prompt is asking for, decided in code rather than by the model.
 *
 * Zul asked for engines AND for "other types of games if prompted", which pull
 * against each other. This is where that tension is resolved honestly: a
 * request with no engine gets told so, with the nearest thing named, instead of
 * being silently handed a flyer and left to wonder why.
 *
 * Keyword matching, deliberately - a model asked "which engine?" will always
 * pick one, because picking is what it does. Being unable to answer is the
 * whole point here.
 */
const ENGINE_HINTS: { engine: string; words: RegExp; built: boolean }[] = [
  { engine: "endless-flyer", built: true, words: /flappy|flyer|fly|bird|terbang|wing|jetpack|helicopter/i },
  { engine: "endless-runner", built: false, words: /runner|running|run|dino|jump over|side.?scroll|lari/i },
  { engine: "platformer", built: false, words: /mario|platform|jump.*level|world \d|super mario/i },
  { engine: "brick-breaker", built: false, words: /breakout|brick|arkanoid|paddle|bata/i },
  { engine: "snake", built: false, words: /snake|nokia|ular/i },
];

const UNSUPPORTED = /fight|mortal kombat|street fighter|combat|shooter|racing|race|tower defen[cs]e|rpg|puzzle|tetris|chess/i;

export type EngineChoice =
  | { kind: "engine"; engine: (typeof ENGINES)[number] }
  | { kind: "not-built"; requested: string; nearest: string }
  | { kind: "no-engine"; nearest: string };

export function chooseEngine(prompt: string): EngineChoice {
  for (const hint of ENGINE_HINTS) {
    if (!hint.words.test(prompt)) continue;
    if (hint.built) return { kind: "engine", engine: "endless-flyer" };
    return {
      kind: "not-built",
      requested: hint.engine,
      nearest: "endless-flyer",
    };
  }
  if (UNSUPPORTED.test(prompt)) {
    return { kind: "no-engine", nearest: "endless-flyer" };
  }
  // No signal either way. The catalog has one engine, so use it rather than
  // refusing a prompt that simply did not name a genre.
  return { kind: "engine", engine: "endless-flyer" };
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
