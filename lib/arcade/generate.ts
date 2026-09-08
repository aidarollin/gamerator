import { ArcadeSpec, type Engine } from "./schema";
import { chooseEngine, renderArcadeBrief, type ArcadeBrief } from "./brief";
import { generateArcadeLive } from "./live-generate";
import { providerMode } from "@/lib/config";
import { hashString } from "@/lib/game/random";

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
  | {
      status: "ok";
      spec: ArcadeSpec;
      guessed: boolean;
      note?: string;
      /**
       * Where the numbers came from. Surfaced to the reader, because "a model
       * chose this" and "a keyword table chose this" are different claims and
       * conflating them would make the whole product a lie.
       */
      source?: "tuner" | "model" | "model-repaired" | "cache";
      /**
       * Set when this engine is standing in for a genre it is not. Shown to the
       * reader: handing someone a runner when they asked for a race and saying
       * nothing is the failure this whole routing layer exists to avoid.
       */
      adapted?: { requested: string; how: string };
    }
  | { status: "invalid"; issues: Issue[] }
  /**
   * No engine exists for the genre asked for. `why` names what is actually
   * missing - a refusal that only says "not yet" gives the reader nothing to
   * act on and nothing to argue with.
   */
  | { status: "no-engine"; requested: string; nearest: string; why?: string }
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
    case "endless-runner": {
      // The runner ramps now, read from the same words as the flyer so the two
      // answer a request the same way.
      const builds = /build|escalat|ramp|get.*harder|tense|intense|makin/.test(p);
      const steady = /steady|constant|same|flat|consistent/.test(p);
      const climb = steady ? 0.25 : builds ? 1.6 : 1;

      const startSpeed = clamp(180 + s * 70, 80, 460);
      const startSpacing = clamp(320 - s * 50, 120, 600);
      const startHeight = clamp(34 + s * 12, 18, 90);

      return {
        gravity: clamp(2200 + s * 400, 800, 4000),
        jumpVelocity: clamp(-720 - s * 40, -1200, -300),
        scrollSpeed: { start: startSpeed, end: clamp(startSpeed + 70 * climb, 80, 460) },
        spacing: { start: startSpacing, end: clamp(startSpacing - 70 * climb, 120, 600) },
        // Obstacles grow, but far more gently than the speed: a jump has to
        // keep clearing them at every point of the ramp, and height is the
        // field most likely to make that impossible.
        obstacleHeight: { start: startHeight, end: clamp(startHeight + 10 * climb, 18, 90) },
        rampOverObstacles: steady ? 30 : builds ? 12 : 16,
        lives: tone.lives,
      };
    }
    case "duel": {
      /**
       * THIS ENGINE HAD NEVER PRODUCED A VALID SPEC FROM THE FREE TUNER, at any
       * difficulty, and nothing said so - the duel fixtures are hand-written and
       * the model was on, so every duel anyone had seen came from a paid call.
       * `catalogue.test.ts` tunes every engine at every difficulty, which is
       * what finally asked the question.
       *
       * Two bugs, both from the same root. The comment above this block used to
       * say "`s` is 0 easy, 1 normal, 2 hard"; `tone.scale` is -1, 0, 1. Every
       * coefficient here was tuned against a scale that does not exist, so easy
       * came out with an opponent reacting 0.88s after a 0.36s windup - a
       * punchbag, rejected as trivial - and hard came out needing 6 hits with
       * `tone.lives` of 1, which the prompt's own HARD RULE forbids.
       *
       * LIVES MEAN SOMETHING DIFFERENT HERE. Everywhere else a life is a retry;
       * in a duel it is a hit you can take, and the match is a race to land
       * `hitsToWin` first. One life is not "hard", it is "lose to the first
       * exchange", so this engine sets its own floor instead of taking the
       * shared one. Numbers are from the measured playable region in prompt.ts.
       */
      const lives = s > 0 ? 3 : s < 0 ? 5 : 4;
      const windup = clamp(0.29 - s * 0.03, 0.08, 0.6);
      return {
        moveSpeed: clamp(150 + s * 40, 60, 320),
        reach: clamp(88 - s * 5, 40, 130),
        strikeWindup: windup,
        strikeRecovery: clamp(0.3 - s * 0.03, 0.1, 0.9),
        // Just above the windup, which is where the simulation says a strike
        // can land but is not free. Below it, every strike is read and blocked.
        opponentReaction: clamp(windup + 0.03, 0.08, 0.9),
        opponentAggression: clamp(0.42 + s * 0.1, 0, 1),
        // The hard rule from prompt.ts, enforced rather than hoped for: both
        // fighters land at about the same rate, so needing more hits than you
        // can take is losing by arithmetic instead of by skill.
        hitsToWin: lives,
        lives,
      };
    }
    case "brick-breaker":
      return {
        // 280 rather than 250, because at easy the old base gave a 140px/s ball
        // behind a 122px paddle, which `brickBreakerVerdict` correctly called a
        // screensaver - the free tuner could not make an easy Breakout either.
        ballSpeed: clamp(280 + s * 80, 120, 560),
        paddleWidth: clamp(96 - s * 22, 40, 160),
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
    case "shooter": {
      // A bigger, faster, more aggressive fleet as it gets harder - but the
      // COOLDOWN comes down with it, because a wave that lands before it can
      // be cleared is rejected rather than hard.
      const swarm = /swarm|many|banyak|horde|fleet/.test(p) ? 1 : 0;
      return {
        playerSpeed: clamp(360 - s * 40, 120, 520),
        shotSpeed: clamp(640 + s * 40, 200, 800),
        fireCooldown: clamp(0.24 - s * 0.05, 0.12, 1.2),
        fleetCols: Math.round(clamp(5 + s + swarm, 3, 8)),
        fleetRows: Math.round(clamp(3 + s, 2, 5)),
        fleetSpeed: clamp(60 + s * 28, 10, 140),
        fleetDescent: clamp(16 + s * 7, 4, 44),
        // An easy wave still shoots back. Below 0.15 with a slow fleet the
        // check calls it a shooting gallery, and it is right to.
        enemyFireRate: clamp(0.6 + s * 0.35, 0, 2),
        enemyShotSpeed: clamp(200 + s * 55, 80, 420),
        lives: tone.lives,
      };
    }
    case "maze-chase": {
      const big = /big|large|besar|huge/.test(p) ? 2 : 0;
      return {
        gridCols: Math.round(clamp(15 + s * 2 + big, 9, 21)),
        gridRows: Math.round(clamp(15 + s * 2 + big, 9, 21)),
        playerSpeed: clamp(6 + s * 0.5, 2, 10),
        chaserSpeed: clamp(3.9 + s * 0.8, 1, 9),
        chasers: Math.round(clamp(2 + s, 1, 4)),
        chaserSmarts: clamp(0.4 + s * 0.1, 0, 1),
        dotTarget: Math.round(clamp(28 + s * 8, 5, 120)),
        // Two pellets at every difficulty. Hard gets a SHORTER scare rather
        // than fewer escapes: taking the escape away is what the simulation
        // kept refusing to certify, and it was right - three pursuers with
        // nowhere to run is not difficulty, it is arithmetic.
        powerPellets: 2,
        scaredSeconds: clamp(6 - s * 2, 2, 10),
        // Stable per prompt, so the same words always give the same maze - and
        // so the check simulates the board the person is handed.
        mazeSeed: (hashString(p) % 999) + 1,
        // Like the duel, a single life means something harsher here than
        // elsewhere: one mistake against three chasers ends the board, and the
        // simulation says so by refusing to certify it.
        lives: Math.max(3, tone.lives),
      };
    }
    case "falling-blocks":
      return {
        cols: Math.round(clamp(8 + (/wide|lebar/.test(p) ? 2 : 0), 6, 12)),
        rows: 16,
        dropSpeed: clamp(2.4 + s * 1.1, 0.6, 8),
        speedUp: clamp(0.1 + s * 0.05, 0, 0.35),
        linesToWin: Math.round(clamp(10 + s * 5, 3, 40)),
        // The S, Z and T pieces are the difficulty, so they arrive with it.
        easyPieces: s <= 0,
        lives: tone.lives,
      };
    case "match-3": {
      const size = Math.round(clamp(7 + (s > 0 ? 0 : -1), 5, 8));
      const colours = Math.round(clamp(5 + s, 3, 6));
      const moveLimit = Math.round(clamp(28 - s * 4, 8, 60));
      return {
        cols: size,
        rows: size,
        colours,
        moveLimit,
        // Derived from the ceiling rather than picked, so it is always both
        // reachable and worth reaching - two thirds of a perfect run.
        clearTarget: Math.round(clamp(moveLimit * (3 * (1 + 1.4 / colours)) * 0.66, 10, 120)),
        boardSeed: (hashString(p) % 999) + 1,
        lives: tone.lives,
      };
    }
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
  duel: ["Duel", "Lawan"],
  shooter: ["Blaster", "Tembak"],
  "maze-chase": ["Maze", "Sesat"],
  "falling-blocks": ["Stack", "Susun"],
  "match-3": ["Match", "Padan"],
} as const;

/**
 * A round budget, in seconds, if the words asked for one.
 *
 * ONLY when asked. An endless run stays the default, because that is what most
 * of these engines are and a clock nobody requested turns an idle-minute game
 * into a test. Bahasa is matched alongside English - "dua minit", "seminit" -
 * because the audience types in both, often in one sentence.
 */
/**
 * Which language a request is written in, when the author did not say.
 *
 * The audience writes in both, often in one sentence, and the form's language
 * select defaults to English - so "permainan lari yang laju untuk Tahun 4" came
 * back from the model with an English title and description. Matching a few
 * unmistakable Malay function words is enough, and it cannot be fooled by an
 * English sentence that happens to contain the word "game".
 *
 * Returns undefined rather than "en" so a caller can tell "detected English"
 * from "could not tell" - only an explicit choice by the author should override
 * a detection, and a non-detection should not override anything.
 */
const MALAY =
  /\b(permainan|yang|untuk|dengan|tanpa|saya|anda|kita|boleh|tahun|lawan|senang|susah|laju|cepat|perlahan|ular|terbang|lari|lompat|bata|main)\b/i;

export function readLanguage(prompt: string): "ms" | undefined {
  return MALAY.test(prompt) ? "ms" : undefined;
}

export function readTimeLimit(prompt: string): number | undefined {
  const p = prompt.toLowerCase();

  // An explicit duration wins: "90 seconds", "2 minutes", "3 minit".
  const mins = p.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|minit)\b/);
  if (mins) return clampRound(Number(mins[1]) * 60);
  const secs = p.match(/(\d+)\s*(?:seconds?|secs?|saat)\b/);
  if (secs) return clampRound(Number(secs[1]));

  // The trailing "s" is optional, because "a two minute duel" is how people
  // write it. The plural-only version produced a live game whose own title
  // promised two minutes and whose clock was never there.
  if (/\b(?:one|a)\s+minutes?\b|\bseminit\b/.test(p)) return 60;
  if (/\btwo\s+minutes?\b|\bdua\s+minit\b/.test(p)) return 120;
  if (/\bthree\s+minutes?\b|\btiga\s+minit\b/.test(p)) return 180;

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
    duel: `Time your strikes and out-spar your opponent.`,
    shooter: `Slide, fire and clear the fleet before it lands.`,
    "maze-chase": `Clear every dot without getting caught.`,
    "falling-blocks": `Turn each falling piece and complete a row.`,
    "match-3": `Swap two neighbours to line up three of a colour.`,
  };
  const ms: Record<Engine, string> = {
    "endless-flyer": `Ketik untuk terbangkan ${who} melalui celah.`,
    "endless-runner": `Lompatkan ${who} melepasi halangan.`,
    "brick-breaker": `Kawal pemukul dan pecahkan semua bata.`,
    snake: `Jadi sepanjang mungkin tanpa menggigit diri sendiri.`,
    platformer: `Berlari, melompat dan kutip syiling ke bendera.`,
    duel: `Pilih masa serangan dan kalahkan lawan anda.`,
    shooter: `Tembak dan hapuskan armada sebelum ia mendarat.`,
    "maze-chase": `Kutip semua titik tanpa ditangkap.`,
    "falling-blocks": `Pusingkan setiap blok jatuh dan lengkapkan satu baris.`,
    "match-3": `Tukar dua jiran untuk padankan tiga warna sama.`,
  };
  return (lang === "ms" ? ms : en)[engine];
}

export async function generateArcade(
  brief: ArcadeBrief,
  /** Identifies the caller for rate limiting. Ignored by the free tuner. */
  client = "anonymous",
): Promise<ArcadeOutcome> {
  const choice = chooseEngine(brief.prompt);

  // Answered before any generation happens: there is nothing to generate for a
  // genre with no engine, and pretending otherwise wastes a call and the
  // person's time.
  if (choice.kind === "no-engine") {
    return {
      status: "no-engine",
      requested: choice.requested,
      nearest: choice.nearest,
      why: choice.why,
    };
  }

  if (providerMode() === "live") {
    // Guarded, cached and validated inside - see live-generate.ts. A failure
    // here falls through to nothing: the stub is not a silent fallback, because
    // silently serving a keyword-tuned game while claiming the model made it is
    // the one dishonesty this whole design exists to avoid.
    const live = await generateArcadeLive(brief, choice.engine, client, choice.adapted);
    switch (live.status) {
      case "ok":
        return {
          status: "ok",
          spec: live.spec,
          guessed: !choice.confident,
          note: renderArcadeBrief(brief),
          source: live.cached ? "cache" : live.repaired ? "model-repaired" : "model",
          adapted: choice.adapted,
        };
      case "invalid":
        return { status: "invalid", issues: live.issues };
      case "refused":
        return { status: "error", code: "refused", message: live.reason };
      case "error":
        return { status: "error", code: live.code, message: live.message };
    }
  }

  const p = brief.prompt.toLowerCase();
  const tone = readTone(p, brief.difficulty);
  const timeLimit = readTimeLimit(p);
  const character =
    brief.character ?? (/aidan/i.test(p) ? "aidan" : /nadia/i.test(p) ? "nadia" : "pbot");
  const engine = choice.engine;

  const rules = rulesFor(engine, p, tone);
  // A duel hit is always worth two, because the whole purse is `hitsToWin`
  // hits and a three-hit match at one point each falls under the schema's
  // minimum target of five. The floor is the schema's; this is how the engine
  // meets it without inflating the match.
  const points = engine === "duel" ? 2 : tone.difficulty === "hard" ? 2 : 1;
  /**
   * The target, and the duel is not like the others.
   *
   * Every other engine here is open-ended enough that a flat 15/25/40 is
   * something you play towards. A duel ENDS on the winning hit, so the entire
   * purse is `hitsToWin * pointsPerObstacle` - and the flat target was above it
   * at every difficulty, which meant "Target beaten" was a screen no tuned duel
   * could ever show. The schema rejects that, correctly, so the free tuner
   * simply had no valid duel to give.
   */
  const target =
    engine === "duel" && "hitsToWin" in rules && typeof rules.hitsToWin === "number"
      ? rules.hitsToWin * points
      : tone.difficulty === "hard"
        ? 40
        : tone.difficulty === "easy"
          ? 15
          : 25;

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
      pointsPerObstacle: points,
      targetScore: target,
      ...(timeLimit !== undefined ? { timeLimit } : {}),
    },
    rules,
  };

  const parsed = ArcadeSpec.safeParse(candidate);

  if (parsed.success) {
    return {
      status: "ok",
      spec: parsed.data,
      guessed: !choice.confident,
      note: renderArcadeBrief(brief),
      source: "tuner",
      adapted: choice.adapted,
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
