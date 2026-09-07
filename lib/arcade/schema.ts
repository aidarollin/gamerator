import { z } from "zod";
import { ACCENT_FAMILIES, SUBJECT_KEYS } from "@/lib/ds/tokens.generated";
import { flyerPlayability, simulatedObstacles } from "./simulate";
import { Range } from "./ramp";
import { roundVerdict } from "./round";
import { DuelRules, duelPlayability } from "./duel";
import {
  BrickBreakerRules,
  SnakeRules,
  EndlessRunnerRules,
  PlatformerRules,
  brickBreakerVerdict,
  snakeVerdict,
  endlessRunnerVerdict,
  platformerVerdict,
} from "./engines";

/**
 * The ArcadeSpec: the contract between the model and the game engines.
 *
 * specVersion 2.0 because this is a different family from the learning specs in
 * lib/spec, not a revision of them. Rulebook: docs/ENGINES.md.
 */

/** Every colour identity the DS offers. The model cannot express a hex value. */
export const Palette = z.enum([...SUBJECT_KEYS, ...ACCENT_FAMILIES] as [
  string,
  ...string[],
]);

export const Meta = z.object({
  title: z.string().min(3).max(40),
  description: z.string().max(160),
  language: z.enum(["ms", "en"]),
  difficulty: z.enum(["easy", "normal", "hard"]),
});

/**
 * The playable cast, and they are real Pandai characters rather than invented
 * ones - PBot from the mascot set, Aidan and Nadia from the battle avatars.
 * A game whose hero is a generic disc does not feel like Pandai; it feels like
 * a prototype, which is exactly what it was.
 */
export const Character = z.enum(["pbot", "aidan", "nadia"]);
export type Character = z.infer<typeof Character>;

export const Theme = z.object({
  palette: Palette,
  character: Character,
  background: z.enum(["sky", "night", "forest", "plain"]),
  /**
   * The other fighter. Only the duel engine reads it, and it is optional
   * everywhere so no existing spec changes meaning. When absent the duel picks
   * whoever the player is not.
   */
  opponent: Character.optional(),
});

export const Scoring = z.object({
  pointsPerObstacle: z.number().int().min(1).max(100),
  targetScore: z.number().int().min(5).max(200),
  /**
   * Optional round budget, in seconds. The clock is SHARED ACROSS RETRIES -
   * losing a life does not refill it - which is what makes it a round rather
   * than a stopwatch, and turns three lives into a resource spent against one
   * budget. See lib/arcade/round.ts.
   *
   * Absent means an endless run, which stays the default: the timer bounds a
   * session, it is not a win condition.
   */
  timeLimit: z.number().int().min(20).max(300).optional(),
});

/**
 * Optional. Arcade first: the twist decorates a game that is already fun
 * without it, and is never the reason the game exists.
 */
export const ContentTwist = z.object({
  prompt: z.string().min(3).max(120),
  correct: z.string().min(1).max(60),
  distractors: z.array(z.string().min(1).max(60)).min(1).max(3),
});

const base = {
  specVersion: z.literal("2.0"),
  meta: Meta,
  theme: Theme,
  scoring: Scoring,
  contentTwist: ContentTwist.optional(),
};

/**
 * The world is a fixed logical size; the canvas scales to fit. Physics is
 * therefore resolution-independent, and a spec plays identically on a phone and
 * a desktop rather than being accidentally tuned to one screen.
 */
export const WORLD = { width: 360, height: 540, birdRadius: 14 } as const;

export const EndlessFlyer = z.object({
  ...base,
  engine: z.literal("endless-flyer"),
  rules: z.object({
    /**
     * Gravity and flap stay constant - they are the FEEL of the character, and
     * a hero whose weight changes mid-run reads as a bug rather than as
     * escalation. Everything the world does to the player ramps instead.
     */
    gravity: z.number().min(400).max(3000),
    /** px/s, negative is upward. Applied instantly on tap. */
    flapVelocity: z.number().min(-800).max(-150),

    /** px/s the world moves left. Usually rises. */
    scrollSpeed: Range(60, 400),
    /** Vertical opening, px. Usually narrows. */
    gapHeight: Range(80, 300),
    /** Horizontal distance between gap centres, px. Usually shortens. */
    gapSpacing: Range(140, 600),
    /** How far a gap centre may move between obstacles, px. Usually widens. */
    gapDrift: Range(0, 240),
    /** Obstacles until the ramp reaches its end values. */
    rampOverObstacles: z.number().int().min(1).max(60),

    lives: z.number().int().min(1).max(5),
  }),
});

export const BrickBreaker = z.object({
  ...base,
  engine: z.literal("brick-breaker"),
  rules: BrickBreakerRules,
});

export const Snake = z.object({
  ...base,
  engine: z.literal("snake"),
  rules: SnakeRules,
});

export const EndlessRunner = z.object({
  ...base,
  engine: z.literal("endless-runner"),
  rules: EndlessRunnerRules,
});

export const Platformer = z.object({
  ...base,
  engine: z.literal("platformer"),
  rules: PlatformerRules,
});

export const Duel = z.object({
  ...base,
  engine: z.literal("duel"),
  rules: DuelRules,
});

export const ArcadeSpecShape = z.discriminatedUnion("engine", [
  EndlessFlyer,
  BrickBreaker,
  Snake,
  EndlessRunner,
  Platformer,
  Duel,
]);

/**
 * The full schema: shape plus the rules a field bound cannot express.
 *
 * The playability check is the important one. Every value in a spec can be in
 * range and the game still impossible - a bird that cannot climb fast enough to
 * reach the next gap before it arrives. That is invisible in the JSON and would
 * otherwise need a human to play it to find out.
 *
 * As with the learning schema, the model is handed `ArcadeSpecShape` (JSON
 * Schema cannot express any of this) and the server validates `ArcadeSpec`.
 */
export const ArcadeSpec = ArcadeSpecShape.superRefine((spec, ctx) => {
  // FIRST, before the per-engine branches - several of them `return` early, so
  // anything appended at the tail of this function silently applies to only the
  // engines that fall through. That is exactly how the first version of this
  // check ended up unreachable for the flyer while its own unit test passed.
  //
  // A clock the target cannot be reached inside makes "Target beaten" a screen
  // nobody will ever see. Only the clearly impossible is rejected: the estimate
  // behind it is a deliberate over-estimate, so it under-fires rather than
  // turning away winnable games.
  /**
   * A duel ends the moment `hitsToWin` lands, so that is the entire purse.
   * A target above it is a screen nobody can ever reach - and a live run
   * produced exactly that: 3 hits at 10 points against a target of 100.
   */
  if (spec.engine === "duel") {
    const purse = spec.rules.hitsToWin * spec.scoring.pointsPerObstacle;
    if (spec.scoring.targetScore > purse) {
      ctx.addIssue({
        code: "custom",
        path: ["scoring", "targetScore"],
        message:
          `the match ends after ${spec.rules.hitsToWin} hits, so ${purse} points is all there is - ` +
          `a target of ${spec.scoring.targetScore} can never be reached`,
      });
    }
  }

  const round = roundVerdict(spec);
  if (!round.ok) {
    ctx.addIssue({
      code: "custom",
      path: ["scoring", "timeLimit"],
      message: round.reason,
    });
  }

  if (spec.engine === "endless-flyer") {
    const r = spec.rules;

    // A gap the player physically cannot fit through - checked at the
    // TIGHTEST point of the ramp, not the start.
    const minGap = WORLD.birdRadius * 2 + 24;
    const tightest = Math.min(r.gapHeight.start, r.gapHeight.end);
    if (tightest < minGap) {
      ctx.addIssue({
        code: "custom",
        path: ["rules", "gapHeight"],
        message: `the ramp reaches a ${tightest}px gap, which leaves no room for the player; needs at least ${minGap}`,
      });
    }

    // Drift beyond what the opening allows puts gaps off-world - again at the
    // worst combination the ramp produces.
    const widestDrift = Math.max(r.gapDrift.start, r.gapDrift.end);
    if (widestDrift > WORLD.height - tightest) {
      ctx.addIssue({
        code: "custom",
        path: ["rules", "gapDrift"],
        message: `gapDrift reaches ${widestDrift}, which exceeds the vertical room left by a ${tightest}px gap`,
      });
    }

    // The simulation runs the WHOLE ramp plus a margin, so the hardest point
    // is exercised rather than an average. A spec that opens gently and becomes
    // impossible at the end would otherwise validate and break in play.
    const verdict = flyerPlayability(r);
    if (!verdict.playable) {
      ctx.addIssue({
        code: "custom",
        path: ["rules"],
        message: verdict.reason,
      });
    }
    // A game a bot clears without ever failing is not a game, it is a screensaver.
    if (verdict.playable && verdict.trivial) {
      ctx.addIssue({
        code: "custom",
        path: ["rules"],
        message: `these physics are trivially easy even ${simulatedObstacles(r)} obstacles in - the player cannot lose, so there is no game`,
      });
    }
    return;
  }

  // Every other engine reports through the same shape, so the outcome handling
  // and the repair turn do not need to know which engine failed.
  const verdict =
    spec.engine === "brick-breaker"
      ? brickBreakerVerdict(spec.rules, WORLD)
      : spec.engine === "snake"
        ? snakeVerdict(spec.rules)
        : spec.engine === "endless-runner"
          ? endlessRunnerVerdict(spec.rules, 30)
          : spec.engine === "duel"
            ? duelPlayability(spec.rules)
            : platformerVerdict(spec.rules);

  if (!verdict.ok) {
    ctx.addIssue({ code: "custom", path: ["rules"], message: verdict.reason });
    return;
  }
  if (verdict.trivial) {
    ctx.addIssue({
      code: "custom",
      path: ["rules"],
      message:
        "these settings are trivially easy - the player cannot lose, so there is no game",
    });
  }

});

export type ArcadeSpec = z.infer<typeof ArcadeSpec>;
/** The shape before cross-field rules - what `roundVerdict` reasons about. */
export type ArcadeSpecInput = z.infer<typeof ArcadeSpecShape>;
export type EndlessFlyerSpec = z.infer<typeof EndlessFlyer>;
export type BrickBreakerSpec = z.infer<typeof BrickBreaker>;
export type SnakeSpec = z.infer<typeof Snake>;
export type EndlessRunnerSpec = z.infer<typeof EndlessRunner>;
export type PlatformerSpec = z.infer<typeof Platformer>;
export type Engine = ArcadeSpec["engine"];

/**
 * The concrete schema for one engine.
 *
 * The engine is chosen deterministically by chooseEngine() before generation,
 * so the model never needs the union - and must not be given it. A
 * discriminated union becomes a five-branch `anyOf` in JSON Schema, and the
 * first live call came back missing `rules` and `scoring` entirely because of
 * it. Handing over one concrete object schema is smaller, cheaper and does not
 * depend on how well a provider handles `anyOf`.
 */
export const ENGINE_SCHEMAS = {
  "endless-flyer": EndlessFlyer,
  "brick-breaker": BrickBreaker,
  snake: Snake,
  "endless-runner": EndlessRunner,
  platformer: Platformer,
  duel: Duel,
} as const;

export const ENGINES = [
  "endless-flyer",
  "brick-breaker",
  "snake",
  "endless-runner",
  "platformer",
  "duel",
] as const;

/** Nothing left in the catalog is unbuilt. Kept so the no-engine path, which
 *  handles genres with no engine at all, still has somewhere to point. */
export const PLANNED_ENGINES = [] as const;
