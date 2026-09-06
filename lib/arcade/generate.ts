import { ArcadeSpec } from "./schema";
import { chooseEngine, renderArcadeBrief, type ArcadeBrief } from "./brief";
import { readArcadeFixture } from "./fixtures";
import { providerMode } from "@/lib/config";

/**
 * Arcade generation. Stub-first, exactly as the learning pipeline is.
 *
 * The stub derives a spec from the prompt with plain keyword tuning, so the
 * page is genuinely usable - and free - before a model is ever called. That is
 * not a placeholder for a demo: it is what lets the whole flow, including the
 * failure paths, be exercised at zero cost.
 */

export type Issue = { path: string; message: string };

export type ArcadeOutcome =
  | { status: "ok"; spec: ArcadeSpec; note?: string }
  | { status: "invalid"; issues: Issue[] }
  /** The genre has an engine in the catalog, but it is not built yet. */
  | { status: "not-built"; requested: string; nearest: string }
  /** The genre has no engine at all, and is not planned. */
  | { status: "no-engine"; nearest: string }
  | { status: "error"; code: string; message: string };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Turn a prompt into physics without a model.
 *
 * Every knob here maps to a word a person would actually type. It is not
 * pretending to be a model; it is a defensible default so the page works.
 */
function tuneFromPrompt(brief: ArcadeBrief) {
  const p = brief.prompt.toLowerCase();
  const base = readArcadeFixture("endless-flyer.valid") as ArcadeSpec;

  const hard = /hard|difficult|brutal|fast|insane|susah|laju|expert/.test(p);
  const easy = /easy|gentle|slow|beginner|kids|senang|mudah|perlahan/.test(p);
  const difficulty =
    brief.difficulty ?? (hard ? "hard" : easy ? "easy" : "normal");

  const scale = difficulty === "hard" ? 1 : difficulty === "easy" ? -1 : 0;
  const tight = /tight|narrow|sempit/.test(p) ? 1 : 0;
  const floaty = /floaty|slow fall|light/.test(p) ? 1 : 0;

  const rules = {
    gravity: clamp(1500 + scale * 500 - floaty * 400, 400, 3000),
    flapVelocity: clamp(-420 - scale * 50 + floaty * 60, -800, -150),
    scrollSpeed: clamp(150 + scale * 90, 60, 400),
    gapHeight: clamp(165 - scale * 35 - tight * 20, 80, 300),
    gapSpacing: clamp(265 - scale * 45, 140, 600),
    gapDrift: clamp(70 + scale * 30, 0, 240),
    lives: difficulty === "hard" ? 1 : difficulty === "easy" ? 5 : 3,
  };

  const character =
    brief.character ??
    (/aidan/i.test(p) ? "aidan" : /nadia/i.test(p) ? "nadia" : "pbot");

  const palette = brief.palette ?? guessPalette(p) ?? base.theme.palette;

  const title = titleFrom(p, character);

  return {
    specVersion: "2.0" as const,
    engine: "endless-flyer" as const,
    meta: {
      title,
      description:
        brief.language === "ms"
          ? `Terbangkan ${character === "pbot" ? "PBot" : character} melalui celah.`
          : `Fly ${character === "pbot" ? "PBot" : character} through the gaps.`,
      language: brief.language,
      difficulty,
    },
    theme: {
      palette,
      character,
      background: /night|dark|malam/.test(p) ? ("night" as const) : ("sky" as const),
    },
    scoring: {
      pointsPerObstacle: difficulty === "hard" ? 2 : 1,
      targetScore: difficulty === "hard" ? 40 : difficulty === "easy" ? 15 : 25,
    },
    rules,
  };
}

const PALETTE_WORDS: [RegExp, string][] = [
  [/pink|chemistry|kimia/i, "chemistry"],
  [/blue|bahasa|melayu|bm/i, "b-melayu"],
  [/green|math|matematik/i, "math"],
  [/purple|biology|biologi/i, "biology"],
  [/yellow|science|sains/i, "science"],
  [/red|english|bahasa inggeris/i, "english"],
  [/orange|economy|ekonomi/i, "economy"],
  [/dark|black|rbt/i, "rbt"],
];

function guessPalette(p: string): string | undefined {
  for (const [re, key] of PALETTE_WORDS) if (re.test(p)) return key;
  return undefined;
}

function titleFrom(prompt: string, character: string): string {
  const who = character === "pbot" ? "PBot" : character[0].toUpperCase() + character.slice(1);
  const words = prompt.trim().split(/\s+/).slice(0, 4).join(" ");
  const cleaned = words.replace(/[^\p{L}\p{N} ]/gu, "").trim();
  const title = cleaned ? `${who}: ${cleaned}` : `${who} Flight`;
  return title.slice(0, 40);
}

export async function generateArcade(brief: ArcadeBrief): Promise<ArcadeOutcome> {
  const choice = chooseEngine(brief.prompt);

  // Answered before any generation happens: there is nothing to generate for a
  // genre with no engine, and pretending otherwise wastes a call and the
  // person's time.
  if (choice.kind === "not-built") {
    return { status: "not-built", requested: choice.requested, nearest: choice.nearest };
  }
  if (choice.kind === "no-engine") {
    return { status: "no-engine", nearest: choice.nearest };
  }

  if (providerMode() === "live") {
    // Wiring the live provider to ArcadeSpec is the next piece of work; until
    // then a live request is refused rather than silently served by the stub,
    // which would make a "live" deployment quietly a lie.
    return {
      status: "error",
      code: "live_arcade_not_wired",
      message:
        "Live arcade generation is not wired yet. Unset GAMERATOR_PROVIDER to use the stub.",
    };
  }

  const candidate = tuneFromPrompt(brief);
  const parsed = ArcadeSpec.safeParse(candidate);

  if (parsed.success) {
    return { status: "ok", spec: parsed.data, note: renderArcadeBrief(brief) };
  }

  // The stub's tuning is deterministic, so a failure here is a bug in the
  // tuning rather than a model mistake - and it is surfaced, not swallowed.
  return {
    status: "invalid",
    issues: parsed.error.issues.map((i) => ({
      path: i.path.map(String).join("."),
      message: i.message,
    })),
  };
}
