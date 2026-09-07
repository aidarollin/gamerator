import { ArcadeSpec, type Engine } from "./schema";
import { chooseEngine, renderArcadeBrief, type ArcadeBrief } from "./brief";
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
  | { status: "ok"; spec: ArcadeSpec; guessed: boolean; note?: string }
  | { status: "invalid"; issues: Issue[] }
  /** No engine exists for the genre asked for, and none is planned. */
  | { status: "no-engine"; requested: string; nearest: string }
  | { status: "error"; code: string; message: string };

// Rounded, because float arithmetic leaks values like 90.80000000000001 into
// the exported JSON that a Pandai engineer reads. Physics do not need the
// precision and a spec is a document people look at.
const clamp = (n: number, lo: number, hi: number) =>
  Math.round(Math.min(hi, Math.max(lo, n)) * 10) / 10;

type Tone = {
  /** -1 easy, 0 normal, 1 hard. */
  scale: number;
  difficulty: "easy" | "normal" | "hard";
  lives: number;
};

function readTone(p: string, override?: ArcadeBrief["difficulty"]): Tone {
  const hard = /hard|difficult|brutal|fast|insane|punishing|tough|susah|laju|expert/.test(p);
  const easy = /easy|gentle|slow|beginner|kid|young|calm|senang|mudah|perlahan/.test(p);
  const difficulty = override ?? (hard ? "hard" : easy ? "easy" : "normal");
  const scale = difficulty === "hard" ? 1 : difficulty === "easy" ? -1 : 0;
  return {
    scale,
    difficulty,
    lives: difficulty === "hard" ? 1 : difficulty === "easy" ? 5 : 3,
  };
}

/**
 * Physics per engine, derived from words.
 *
 * Every knob maps to something a person would actually type. This is not
 * pretending to be a model - it is a defensible default so the page works and
 * costs nothing.
 */
function rulesFor(engine: Engine, p: string, tone: Tone) {
  const s = tone.scale;
  switch (engine) {
    case "endless-flyer": {
      const tight = /tight|narrow|sempit/.test(p) ? 1 : 0;
      const floaty = /floaty|light|slow fall/.test(p) ? 1 : 0;

      // How much the run escalates. A request that says nothing still ramps a
      // little, because a flat run repeats; asking for a build makes it steep,
      // and asking for steady makes it nearly flat.
      const builds = /build|escalat|ramp|get.*harder|tense|intense|makin/.test(p);
      const steady = /steady|constant|same|flat|consistent/.test(p);
      const climb = steady ? 0.25 : builds ? 1.6 : 1;

      const startSpeed = clamp(145 + s * 70, 60, 400);
      const startGap = clamp(180 - s * 30 - tight * 15, 80, 300);
      const startSpacing = clamp(285 - s * 45, 140, 600);
      const startDrift = clamp(55 + s * 25, 0, 240);

      return {
        gravity: clamp(1500 + s * 500 - floaty * 400, 400, 3000),
        flapVelocity: clamp(-420 - s * 50 + floaty * 60, -800, -150),
        scrollSpeed: {
          start: startSpeed,
          end: clamp(startSpeed + 75 * climb, 60, 400),
        },
        gapHeight: {
          start: startGap,
          end: clamp(startGap - 38 * climb, 80, 300),
        },
        gapSpacing: {
          start: startSpacing,
          end: clamp(startSpacing - 55 * climb, 140, 600),
        },
        gapDrift: {
          start: startDrift,
          end: clamp(startDrift + 38 * climb, 0, 240),
        },
        rampOverObstacles: steady ? 30 : builds ? 12 : 16,
        lives: tone.lives,
      };
    }
    case "endless-runner":
      return {
        gravity: clamp(2200 + s * 400, 800, 4000),
        jumpVelocity: clamp(-720 - s * 40, -1200, -300),
        scrollSpeed: clamp(190 + s * 90, 80, 460),
        spacing: clamp(300 - s * 60, 120, 600),
        obstacleHeight: clamp(38 + s * 14, 18, 90),
        lives: tone.lives,
      };
    case "brick-breaker":
      return {
        ballSpeed: clamp(250 + s * 110, 120, 560),
        paddleWidth: clamp(96 - s * 26, 40, 160),
        paddleSpeed: clamp(620 + s * 80, 200, 900),
        rows: clamp(3 + (s > 0 ? 2 : 0), 2, 7),
        cols: /wide|many|banyak/.test(p) ? 8 : 6,
        lives: tone.lives,
      };
    case "snake": {
      const big = /big|large|besar/.test(p) ? 4 : 0;
      return {
        gridCols: clamp(14 + big, 8, 24),
        gridRows: clamp(14 + big, 8, 24),
        startSpeed: clamp(5 + s * 2.5, 2, 12),
        speedUp: clamp(0.15 + s * 0.1, 0, 0.6),
        wallsKill: !/wrap|no wall|tiada dinding/.test(p),
        foodTarget: clamp(12 + s * 6, 3, 60),
        lives: tone.lives,
      };
    }
    case "platformer":
      return {
        gravity: clamp(2000 + s * 350, 900, 4000),
        jumpVelocity: clamp(-760 - s * 30, -1300, -350),
        moveSpeed: clamp(190 + s * 40, 80, 340),
        platforms: clamp(8 + (s > 0 ? 3 : 0), 4, 14),
        maxGap: clamp(95 + s * 30, 40, 220),
        coins: clamp(8 + (s > 0 ? 4 : 0), 0, 20),
        lives: tone.lives,
      };
  }
}

const PALETTE_WORDS: [RegExp, string][] = [
  [/pink|chemistry|kimia/i, "chemistry"],
  [/blue|bahasa melayu|\bbm\b|melayu/i, "b-melayu"],
  [/green|math|matematik/i, "math"],
  [/purple|biology|biologi/i, "biology"],
  [/yellow|science|sains/i, "science"],
  [/red|english|inggeris/i, "english"],
  [/orange|economy|ekonomi/i, "economy"],
  [/dark|black|gelap|\brbt\b/i, "rbt"],
  [/gold|coin|emas/i, "gold"],
];

function guessPalette(p: string) {
  for (const [re, key] of PALETTE_WORDS) if (re.test(p)) return key;
  return undefined;
}

const NOUN = {
  "endless-flyer": ["Flight", "Terbang"],
  "endless-runner": ["Run", "Lari"],
  "brick-breaker": ["Blocks", "Bata"],
  snake: ["Snake", "Ular"],
  platformer: ["Jump", "Lompat"],
} as const;

/**
 * A round budget, in seconds, if the words asked for one.
 *
 * ONLY when asked. An endless run stays the default, because that is what most
 * of these engines are and a clock nobody requested turns an idle-minute game
 * into a test. Bahasa is matched alongside English - "dua minit", "seminit" -
 * because the audience types in both, often in one sentence.
 */
export function readTimeLimit(prompt: string): number | undefined {
  const p = prompt.toLowerCase();

  // An explicit duration wins: "90 seconds", "2 minutes", "3 minit".
  const mins = p.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|minit)\b/);
  if (mins) return clampRound(Number(mins[1]) * 60);
  const secs = p.match(/(\d+)\s*(?:seconds?|secs?|saat)\b/);
  if (secs) return clampRound(Number(secs[1]));

  if (/\b(?:one|a)\s+minute\b|\bseminit\b/.test(p)) return 60;
  if (/\btwo\s+minutes\b|\bdua\s+minit\b/.test(p)) return 120;
  if (/\bthree\s+minutes\b|\btiga\s+minit\b/.test(p)) return 180;

  // Asking for a bounded session without naming a number.
  if (/\btimed\b|\btimer\b|\bcountdown\b|\bagainst the clock\b|\bbermasa\b/.test(p)) return 120;
  // "quick" alone is about pace, not length - it has to say what is quick.
  if (/\b(?:quick|short)\s+(?:round|game|break|match|session)\b/.test(p)) return 60;

  return undefined;
}

/** The schema allows 20..300; outside that is a typo, not an instruction. */
function clampRound(seconds: number): number {
  return Math.max(20, Math.min(300, Math.round(seconds)));
}

function titleFor(engine: Engine, character: string, lang: "ms" | "en") {
  const who = character === "pbot" ? "PBot" : character[0].toUpperCase() + character.slice(1);
  return `${who} ${NOUN[engine][lang === "ms" ? 1 : 0]}`.slice(0, 40);
}

function describe(engine: Engine, character: string, lang: "ms" | "en") {
  const who = character === "pbot" ? "PBot" : character[0].toUpperCase() + character.slice(1);
  const en: Record<Engine, string> = {
    "endless-flyer": `Tap to keep ${who} in the air and through the gaps.`,
    "endless-runner": `Jump ${who} over everything in the way.`,
    "brick-breaker": `Steer the paddle and clear every brick.`,
    snake: `Grow as long as you can without biting yourself.`,
    platformer: `Run, jump and collect coins to reach the flag.`,
  };
  const ms: Record<Engine, string> = {
    "endless-flyer": `Ketik untuk terbangkan ${who} melalui celah.`,
    "endless-runner": `Lompatkan ${who} melepasi halangan.`,
    "brick-breaker": `Kawal pemukul dan pecahkan semua bata.`,
    snake: `Jadi sepanjang mungkin tanpa menggigit diri sendiri.`,
    platformer: `Berlari, melompat dan kutip syiling ke bendera.`,
  };
  return (lang === "ms" ? ms : en)[engine];
}

export async function generateArcade(brief: ArcadeBrief): Promise<ArcadeOutcome> {
  const choice = chooseEngine(brief.prompt);

  // Answered before any generation happens: there is nothing to generate for a
  // genre with no engine, and pretending otherwise wastes a call and the
  // person's time.
  if (choice.kind === "no-engine") {
    return { status: "no-engine", requested: choice.requested, nearest: choice.nearest };
  }

  if (providerMode() === "live") {
    return {
      status: "error",
      code: "live_arcade_not_wired",
      message:
        "Live arcade generation is not wired yet. Unset GAMERATOR_PROVIDER to use the stub.",
    };
  }

  const p = brief.prompt.toLowerCase();
  const tone = readTone(p, brief.difficulty);
  const timeLimit = readTimeLimit(p);
  const character =
    brief.character ?? (/aidan/i.test(p) ? "aidan" : /nadia/i.test(p) ? "nadia" : "pbot");
  const engine = choice.engine;

  const candidate = {
    specVersion: "2.0" as const,
    engine,
    meta: {
      title: titleFor(engine, character, brief.language),
      description: describe(engine, character, brief.language),
      language: brief.language,
      difficulty: tone.difficulty,
    },
    theme: {
      palette: brief.palette ?? guessPalette(p) ?? "b-melayu",
      character,
      background: /night|dark|malam/.test(p) ? ("night" as const) : ("sky" as const),
    },
    scoring: {
      pointsPerObstacle: tone.difficulty === "hard" ? 2 : 1,
      targetScore: tone.difficulty === "hard" ? 40 : tone.difficulty === "easy" ? 15 : 25,
      ...(timeLimit !== undefined ? { timeLimit } : {}),
    },
    rules: rulesFor(engine, p, tone),
  };

  const parsed = ArcadeSpec.safeParse(candidate);

  if (parsed.success) {
    return {
      status: "ok",
      spec: parsed.data,
      guessed: !choice.confident,
      note: renderArcadeBrief(brief),
    };
  }

  // The tuning is deterministic, so a failure here is a bug in the tuning rather
  // than a model mistake - and it is surfaced, not swallowed.
  return {
    status: "invalid",
    issues: parsed.error.issues.map((i) => ({
      path: i.path.map(String).join("."),
      message: i.message,
    })),
  };
}
