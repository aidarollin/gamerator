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
type Engine = (typeof ENGINES)[number];

/**
 * Every word that points at an engine, weighted. Scored rather than
 * first-match-wins, because "a snake game where you fly" should not be decided
 * by whichever regex happens to sit higher in the array.
 */
const ENGINE_WORDS: { engine: Engine; words: RegExp; weight: number }[] = [
  { engine: "endless-flyer", weight: 3, words: /flappy|flyer|terbang|jetpack|helicopter/i },
  { engine: "endless-flyer", weight: 1, words: /\bfly\b|\bbird\b|\bwing|burung/i },
  { engine: "endless-runner", weight: 3, words: /endless runner|dino|side.?scroll/i },
  { engine: "endless-runner", weight: 1, words: /\brun\b|running|runner|\blari\b|jump over|obstacle/i },
  { engine: "platformer", weight: 3, words: /mario|platformer|platform game/i },
  { engine: "platformer", weight: 1, words: /platform|level|coins|world \d/i },
  { engine: "brick-breaker", weight: 3, words: /breakout|brick.?breaker|arkanoid/i },
  { engine: "brick-breaker", weight: 1, words: /brick|paddle|\bball\b|\bbata\b/i },
  { engine: "snake", weight: 3, words: /\bsnake\b|nokia|\bular\b/i },
  { engine: "snake", weight: 1, words: /grid|grow longer|eat food/i },
  { engine: "duel", weight: 3, words: /mortal kombat|street fighter|tekken|fighting game|\bbrawler\b/i },
  { engine: "duel", weight: 1, words: /\bfight|\bduel\b|\bspar|combat|\bpunch|\blawan\b|\bkick\b/i },
];

/**
 * Genres with no engine of their own that an existing engine can honestly WEAR.
 *
 * Zul asked for "motorcycle racing game" and got a refusal, which was a bad
 * answer: a racing game IS an endless runner in everything but the name. You
 * move forward, the track speeds up, and hitting something ends the run. The
 * engine was already there; only the label was missing.
 *
 * The rule that keeps this honest is that the ADAPTATION IS SAID OUT LOUD.
 * Silently handing someone a runner when they asked for a race is the exact
 * failure `chooseEngine` was written to avoid; telling them "there is no racing
 * engine, so this is the runner dressed as a race, and here is why that works"
 * is a different thing entirely. `how` is that sentence.
 *
 * A mapping earns a place here only if the VERBS match. Racing and running are
 * both "go forward, avoid things". Tetris and snake are both on a grid and have
 * nothing else in common, so a puzzle stays refused.
 */
const ADAPTED: { label: string; words: RegExp; engine: Engine; how: string }[] = [
  {
    label: "a racing game",
    words: /\brac(e|es|ing)\b|\bkart\b|driving|car game|motorbike|motorcycle|\bbike\b|\blumba\b/i,
    engine: "endless-runner",
    how: "you ride forward, the track gets faster as you go, and clipping an obstacle ends the run",
  },
  {
    label: "a shooter",
    words: /shooter|shoot.?em|\bfps\b|space invaders|galaga|asteroids/i,
    engine: "brick-breaker",
    how: "you fire from the bottom of the screen and clear the formation above you, one hit at a time",
  },
  {
    label: "an adventure game",
    words: /\brpg\b|role.?play|adventure|open world|minecraft|roblox|quest/i,
    engine: "platformer",
    how: "a level to cross - run, jump the gaps, collect what you find and reach the flag",
  },
];

/**
 * Genres with no engine and no honest adaptation. Named explicitly so the
 * answer can be specific about what was asked for.
 */
const UNSUPPORTED: { label: string; words: RegExp }[] = [
  // "a fighting game" lived here until 2026-09-07. The reason on record was
  // that Pandai's avatars are single static PNGs, which is true and was the
  // wrong conclusion: this renderer already animates static sprites
  // procedurally. It is the `duel` engine now. See docs/SCOPE.md.
  //
  // Racing, shooters and adventures moved to ADAPTED on 2026-09-08. What is
  // left is what genuinely has no shared verb with anything in the catalogue.
  { label: "a puzzle game", words: /tetris|puzzle|match.?3|candy crush|sudoku|2048|teka.?teki/i },
  { label: "a tower defence game", words: /tower defen[cs]e|\btd game\b/i },
  { label: "a card or board game", words: /card game|board game|chess|checkers|catur|poker|domino/i },
  { label: "a typing or music game", words: /typing game|rhythm game|guitar hero|osu\b/i },
];

export type EngineChoice =
  | {
      kind: "engine";
      engine: Engine;
      confident: boolean;
      /** Present when this engine is standing in for a genre of its own. */
      adapted?: { requested: string; how: string };
    }
  | { kind: "no-engine"; requested: string; nearest: Engine };

/**
 * Which engine a prompt is asking for, decided in code rather than by the model.
 *
 * Deliberately not a model call. A model asked "which engine?" always picks
 * one, because picking is what it does - and being unable to answer is exactly
 * the outcome that matters here. Keyword scoring can genuinely return "no idea".
 */
export function chooseEngine(prompt: string): EngineChoice {
  for (const u of UNSUPPORTED) {
    if (u.words.test(prompt)) {
      return { kind: "no-engine", requested: u.label, nearest: "endless-flyer" };
    }
  }

  const scores = new Map<Engine, number>();
  for (const { engine, words, weight } of ENGINE_WORDS) {
    if (words.test(prompt)) scores.set(engine, (scores.get(engine) ?? 0) + weight);
  }

  /**
   * An adaptation only applies when nothing NAMED an engine.
   *
   * "a racing game like flappy bird" names one, and the person who wrote it
   * knows what they want better than a keyword table does. Checking the scores
   * first means an explicit request always wins over a genre mapping.
   */
  if (scores.size === 0) {
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
  }

  if (scores.size === 0) {
    // Genuine nonsense, or a real request that simply names no genre - "a fun
    // game for Year 3", or "asdfgh". Both get a flyer, and both get TOLD it was
    // a guess, which is the difference between a default and a silent one.
    return { kind: "engine", engine: "endless-flyer", confident: false };
  }

  const best = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const tied = best.length > 1 && best[0][1] === best[1][1];
  return { kind: "engine", engine: best[0][0], confident: !tied && best[0][1] >= 1 };
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
