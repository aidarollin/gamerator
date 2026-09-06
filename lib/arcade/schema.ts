import { z } from "zod";
import { ACCENT_FAMILIES, SUBJECT_KEYS } from "@/lib/ds/tokens.generated";
import { flyerPlayability } from "./simulate";

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

export const Theme = z.object({
  palette: Palette,
  skin: z.enum(["pbot", "panda", "abstract"]),
  background: z.enum(["sky", "night", "forest", "plain"]),
});

export const Scoring = z.object({
  pointsPerObstacle: z.number().int().min(1).max(100),
  targetScore: z.number().int().min(5).max(200),
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
    /** px/s^2 downward. */
    gravity: z.number().min(400).max(3000),
    /** px/s, negative is upward. Applied instantly on tap. */
    flapVelocity: z.number().min(-800).max(-150),
    /** px/s the world moves left. */
    scrollSpeed: z.number().min(60).max(400),
    /** Vertical opening, px. */
    gapHeight: z.number().min(80).max(300),
    /** Horizontal distance between gap centres, px. */
    gapSpacing: z.number().min(140).max(600),
    /** How far a gap centre may move between obstacles, px. */
    gapDrift: z.number().min(0).max(240),
    lives: z.number().int().min(1).max(5),
  }),
});

export const ArcadeSpecShape = z.discriminatedUnion("engine", [EndlessFlyer]);

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
  if (spec.engine === "endless-flyer") {
    const r = spec.rules;

    // A gap the player physically cannot fit through.
    const minGap = WORLD.birdRadius * 2 + 24;
    if (r.gapHeight < minGap) {
      ctx.addIssue({
        code: "custom",
        path: ["rules", "gapHeight"],
        message: `gapHeight ${r.gapHeight} leaves no room for the player; needs at least ${minGap}`,
      });
    }

    // Drift beyond what the opening allows puts gaps off-world.
    if (r.gapDrift > WORLD.height - r.gapHeight) {
      ctx.addIssue({
        code: "custom",
        path: ["rules", "gapDrift"],
        message: `gapDrift ${r.gapDrift} exceeds the vertical room left by a ${r.gapHeight}px gap`,
      });
    }

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
        message:
          "these physics are trivially easy - the player cannot lose, so there is no game",
      });
    }
  }
});

export type ArcadeSpec = z.infer<typeof ArcadeSpec>;
export type EndlessFlyerSpec = z.infer<typeof EndlessFlyer>;
export type Engine = ArcadeSpec["engine"];

export const ENGINES = ["endless-flyer"] as const;

/** Engines named in ENGINES.md but not yet built. Drives the no-engine reply. */
export const PLANNED_ENGINES = [
  "brick-breaker",
  "snake",
  "endless-runner",
  "platformer",
] as const;
