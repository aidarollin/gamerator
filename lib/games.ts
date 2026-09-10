import { SUBJECT_KEYS } from "@/lib/ds/tokens.generated";
import { chooseGame, routableText, type ArcadeBrief } from "@/lib/arcade/brief";
import { readLink, wordsFromUrl, type LinkRead } from "@/lib/inputs/link";
import { readImage } from "@/lib/inputs/image";
import { hashString } from "@/lib/game/random";
import { generateArcade, readLanguage, type ArcadeOutcome } from "@/lib/arcade/generate";
import { providerMode } from "@/lib/config";
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

/**
 * What the extra inputs actually contributed, for the page to say out loud.
 *
 * A link that could not be fetched, or a picture the free tuner cannot look at,
 * has to be REPORTED rather than silently ignored. An input that appears to be
 * accepted and does nothing is the same class of lie as an adaptation nobody
 * announces - the person changes the picture, gets the same game, and concludes
 * the product is broken rather than that the feature was never applied.
 */
export type InputNotes = {
  link?: { url: string; used: boolean; detail: string };
  picture?: { used: boolean; detail: string };
  notes?: { chars: number };
};

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
export function learningBriefFrom(brief: ArcadeBrief, routable = brief.prompt): Brief {
  const objective = brief.prompt.trim();
  return Brief.parse({
    // Read from EVERYTHING the author said. The subject and the year level are
    // far more likely to be in a pasted document than in the one-line box.
    subject: guessSubject(routable),
    yearLevel: guessYear(routable),
    language: brief.language ?? readLanguage(routable) ?? "en",
    // The schema wants at least ten characters of intent. A shorter prompt is
    // padded with what was actually asked rather than rejected, because the
    // person did type something and the box promised it would work.
    learningObjective:
      objective.length >= 10 ? objective.slice(0, 300) : `A game about: ${objective}`.slice(0, 300),
    // The long field maps straight onto the one this schema already had for it.
    rules: (brief.notes ?? "").slice(0, 4000),
  });
}

export async function generateGame(
  brief: ArcadeBrief,
  client = "anonymous",
  /** The reference picture, straight off the form. Validated here, not there. */
  picture?: File,
): Promise<{ outcome: GameOutcome; inputs: InputNotes }> {
  const inputs: InputNotes = {};
  if (brief.notes?.trim()) inputs.notes = { chars: brief.notes.trim().length };

  /**
   * The link, read before anything is routed - because what the page turns out
   * to be about is part of the request, not decoration on it.
   *
   * A failed fetch is NOT a failed generation. Half the interesting links on
   * the internet are behind a login or a JavaScript shell, and the URL's own
   * words ("itch.io/games/flappy-bird-clone") are often the whole answer
   * anyway. So it degrades to those and says which it used.
   */
  let linkWords = "";
  if (brief.link) {
    const read: LinkRead = await readLink(brief.link);
    if (read.ok) {
      linkWords = read.words;
      inputs.link = { url: read.url, used: true, detail: read.title || read.description };
    } else {
      linkWords = wordsFromUrl(brief.link);
      inputs.link = {
        url: brief.link,
        used: linkWords.length > 0,
        detail: linkWords
          ? `${read.reason}, so only the words in the address were used`
          : read.reason,
      };
    }
  }

  /**
   * The picture. Only a model can look at one, and this deployment may not be
   * calling a model - in which case the honest answer is that it was ignored,
   * printed above the game rather than left for the author to work out.
   */
  let shot: { mediaType: string; base64: string; fingerprint: string } | undefined;
  if (picture && picture.size > 0) {
    if (providerMode() !== "live") {
      inputs.picture = {
        used: false,
        detail:
          "nothing here is calling a model, and a picture is the one input only a model can read - it was not used",
      };
    } else {
      const read = await readImage(picture);
      if (read.ok) {
        shot = {
          mediaType: read.mediaType,
          base64: read.base64,
          // Fingerprinted rather than hashed whole: the base64 runs to
          // megabytes, and name+size+type+the first kilobyte separates two
          // different uploads without walking four million characters.
          fingerprint: String(
            hashString(`${picture.name}:${picture.size}:${read.mediaType}:${read.base64.slice(0, 1024)}`),
          ),
        };
        inputs.picture = {
          used: true,
          detail: `read as a reference, about ${read.estimatedTokens} tokens`,
        };
      } else {
        inputs.picture = { used: false, detail: read.reason };
      }
    }
  }

  const routable = routableText({ prompt: brief.prompt, notes: brief.notes, linkWords });
  const choice = chooseGame(routable);

  if (choice.kind === "template") {
    const outcome = await generateSpec(learningBriefFrom(brief, routable), {
      actor: client,
    });
    switch (outcome.status) {
      case "ok":
      case "repaired":
        return {
          inputs,
          outcome: {
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
          },
        };
      case "invalid":
        return { inputs, outcome: { status: "invalid", issues: outcome.issues } };
      case "refused":
        return { inputs, outcome: { status: "error", code: "refused", message: outcome.reason } };
      case "error":
        return {
          inputs,
          outcome: { status: "error", code: outcome.code, message: outcome.message },
        };
    }
  }

  // Everything else - an engine, an adaptation, or an honest no - is the arcade
  // pipeline's. It is handed the SAME routable text so its own routing cannot
  // reach a different conclusion from the one taken above.
  return {
    inputs,
    outcome: await generateArcade(brief, client, { routable, picture: shot }),
  };
}
