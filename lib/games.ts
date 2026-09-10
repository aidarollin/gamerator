import { SUBJECT_KEYS } from "@/lib/ds/tokens.generated";
import { chooseGame, type ArcadeBrief } from "@/lib/arcade/brief";
import { generateArcade, readLanguage, type ArcadeOutcome } from "@/lib/arcade/generate";
import { Brief } from "@/lib/spec/brief";
import { generateSpec } from "@/lib/generate";
import type { GameSpec } from "@/lib/spec/schema";

/**
 * ONE DOOR, TWO HALVES OF THE PRODUCT.
 *
 * `/create` used to reach only the arcade engines, and the five Pandai Design
 * System learning templates - which were built first, are fully tested, and are
 * the only games here made entirely of DS tokens - were reachable only from
 * `/play/preview`. So "a quiz about photosynthesis" got a flyer, and the games
 * that were ALREADY pure Pandai were the ones nobody could ask for.
 *
 * This is the layer that knows about both. It does not merge them: an
 * `ArcadeSpec` and a `GameSpec` are different families with different
 * validators and different renderers, and pretending otherwise would mean one
 * schema that is loose enough for both. It just answers the question "what did
 * this person ask for" once, and sends it to whichever pipeline owns it.
 */

export type GameOutcome =
  | ArcadeOutcome
  /**
   * A learning template. `source` matters more here than it does for the
   * arcade, and the reason is uncomfortable: the free tuner DERIVES arcade
   * physics from the words you typed, but the free path for a learning spec
   * returns a canned FIXTURE - the template is right and the content is not
   * yours. Saying so is the whole difference between a demo and a lie.
   */
  | {
      status: "ok-learning";
      spec: GameSpec;
      requested: string;
      source: "fixture" | "model" | "model-repaired";
    };

/**
 * Which subject a request is about.
 *
 * The DS subject keys are the vocabulary - the same ones `theme.palette` uses -
 * so a quiz about photosynthesis and a flyer about photosynthesis end up the
 * same colour. Matched on the words a person would type rather than on the key
 * itself: nobody writes "b-melayu".
 */
const SUBJECT_WORDS: [RegExp, string][] = [
  [/photosynthes|biolog|cell|organism|plant|animal|haiwan|tumbuh/i, "biology"],
  [/chemi|kimia|molecule|atom|reaction|acid/i, "chemistry"],
  [/physic|fizik|force|motion|gravity|energy/i, "physics"],
  [/add.?math|additional math/i, "add-math"],
  [/\bmath|matemat|algebra|fraction|geometry|number|kira/i, "math"],
  [/bahasa melayu|\bbm\b|melayu|jawi/i, "b-melayu"],
  [/english|inggeris|grammar|vocabulary|\bverb|\bnoun/i, "english"],
  [/histor|sejarah|timeline|merdeka/i, "history"],
  [/geograph|geografi|climate|river|mountain/i, "geo"],
  [/islam|agama|quran|solat/i, "islamic"],
  [/moral|nilai murni/i, "moral"],
  [/econom|ekonomi/i, "economy"],
  [/business|perniagaan|perdagangan/i, "business"],
  [/computer sci|komputer|coding|programming|algorithm/i, "comp-science"],
  [/chinese|mandarin|cina/i, "chi-lang"],
  [/\brbt\b|reka bentuk/i, "rbt"],
  [/\bkafa\b/i, "kafa"],
  [/scien|sains/i, "science"],
];

export function guessSubject(prompt: string): (typeof SUBJECT_KEYS)[number] {
  for (const [re, key] of SUBJECT_WORDS) {
    if (re.test(prompt) && (SUBJECT_KEYS as readonly string[]).includes(key)) {
      return key as (typeof SUBJECT_KEYS)[number];
    }
  }
  return "science" as (typeof SUBJECT_KEYS)[number];
}

/**
 * "for Year 5", "Tahun 4", "Form 2". Defaults to 5 - the middle of the range
 * this is for, and a number the author can see and change rather than a hidden
 * assumption.
 */
export function guessYear(prompt: string): number {
  const m = prompt.match(/\b(?:year|tahun|darjah|standard)\s*(\d{1,2})\b/i);
  if (m) return Math.min(13, Math.max(1, Number(m[1])));
  // Form 1-5 are secondary, so they sit above the six primary years.
  const f = prompt.match(/\b(?:form|tingkatan)\s*(\d{1,2})\b/i);
  if (f) return Math.min(13, Math.max(1, Number(f[1]) + 6));
  return 5;
}

/**
 * The learning brief, derived from the same one free-text box the arcade uses.
 *
 * `lib/spec/brief.ts` asks for a subject, a year, an objective and rules; the
 * arcade asks for a sentence. Rather than show a person two different forms
 * depending on a word they have not typed yet, the sentence IS the objective
 * and everything else is read out of it.
 */
export function learningBriefFrom(brief: ArcadeBrief): Brief {
  const objective = brief.prompt.trim();
  return Brief.parse({
    subject: guessSubject(objective),
    yearLevel: guessYear(objective),
    language: brief.language ?? readLanguage(objective) ?? "en",
    // The schema wants at least ten characters of intent. A shorter prompt is
    // padded with what was actually asked rather than rejected, because the
    // person did type something and the box promised it would work.
    learningObjective:
      objective.length >= 10 ? objective.slice(0, 300) : `A game about: ${objective}`.slice(0, 300),
    rules: "",
  });
}

export async function generateGame(
  brief: ArcadeBrief,
  client = "anonymous",
): Promise<GameOutcome> {
  const choice = chooseGame(brief.prompt);

  if (choice.kind === "template") {
    const outcome = await generateSpec(learningBriefFrom(brief), {
      actor: client,
    });
    switch (outcome.status) {
      case "ok":
      case "repaired":
        return {
          status: "ok-learning",
          spec: outcome.spec,
          requested: choice.requested,
          // `audit.provider` is the honest answer to "who wrote this", and the
          // stub returns a canned fixture rather than anything derived from the
          // prompt. The page says so.
          source:
            outcome.audit.provider === "stub"
              ? "fixture"
              : outcome.status === "repaired"
                ? "model-repaired"
                : "model",
        };
      case "invalid":
        return { status: "invalid", issues: outcome.issues };
      case "refused":
        return { status: "error", code: "refused", message: outcome.reason };
      case "error":
        return { status: "error", code: outcome.code, message: outcome.message };
    }
  }

  // Everything else - an engine, an adaptation, or an honest no - is the
  // arcade pipeline's, and it re-runs the same deterministic routing itself.
  return generateArcade(brief, client);
}
