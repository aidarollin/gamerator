import { z } from "zod";
import { ACCENT_FAMILIES, SUBJECT_KEYS } from "@/lib/ds/tokens.generated";

/**
 * The GameSpec: the contract between the model and the renderer.
 *
 * One schema serves three jobs - the model's output format, the server's
 * validation gate, and the renderer's prop types. Nothing renders that has not
 * passed `safeParse`, and the renderer's prop type is the parsed type, so an
 * unvalidated object cannot reach it without a type error. That is objective O3
 * expressed as code rather than as a promise in a document.
 *
 * Rulebook and rationale: docs/GAMESPEC.md.
 */

/* ------------------------------------------------------------- envelope */

export const Subject = z.enum(SUBJECT_KEYS);
export const AccentFamily = z.enum(ACCENT_FAMILIES);

export const Meta = z.object({
  title: z.string().min(3).max(60),
  description: z.string().max(200),
  language: z.enum(["ms", "en"]),
  subject: Subject,
  yearLevel: z.number().int().min(1).max(13),
  learningObjective: z.string().max(200),
  estimatedMinutes: z.number().int().min(1).max(20),
});

export const Presentation = z.object({
  // No accent field. Colour is derived from meta.subject - docs/GAMESPEC.md.
  accentOverride: AccentFamily.optional(),
  mascot: z.boolean(),
});

export const Scoring = z.object({
  pointsCorrect: z.number().int().min(0).max(100),
  pointsIncorrect: z.number().int().min(-50).max(0),
  passThreshold: z.number().min(0).max(1),
});

const base = {
  specVersion: z.literal("1.0"),
  meta: Meta,
  presentation: Presentation,
  scoring: Scoring,
};

/** Null means untimed. Absent would mean "the model forgot". */
const secondsTotal = z.number().int().min(30).max(600);

/* ------------------------------------------------------------ templates */

export const QuizRace = z.object({
  ...base,
  template: z.literal("quiz-race"),
  rules: z.object({
    secondsTotal,
    shuffleQuestions: z.boolean(),
    shuffleOptions: z.boolean(),
    streakMultiplier: z.boolean(),
    revealAnswer: z.enum(["immediately", "at-end", "never"]),
  }),
  content: z.object({
    questions: z
      .array(
        z.object({
          prompt: z.string().min(3).max(240),
          options: z.array(z.string().min(1).max(120)).min(2).max(4),
          correctIndex: z.number().int().min(0).max(3),
          hint: z.string().max(160).optional(),
        }),
      )
      .min(4)
      .max(20),
  }),
});

export const MatchPairs = z.object({
  ...base,
  template: z.literal("match-pairs"),
  rules: z.object({
    secondsTotal: secondsTotal.nullable(),
    maxAttempts: z.number().int().min(1).max(99).nullable(),
    gridColumns: z.union([z.literal(3), z.literal(4), z.literal(5)]),
  }),
  content: z.object({
    pairs: z
      .array(
        z.object({
          left: z.string().min(1).max(80),
          right: z.string().min(1).max(80),
        }),
      )
      .min(4)
      .max(12),
  }),
});

export const SortBuckets = z.object({
  ...base,
  template: z.literal("sort-buckets"),
  rules: z.object({
    secondsTotal: secondsTotal.nullable(),
    feedback: z.enum(["per-drop", "at-end"]),
  }),
  content: z.object({
    buckets: z
      .array(
        z.object({
          id: z.string().min(1).max(24),
          label: z.string().min(1).max(40),
        }),
      )
      .min(2)
      .max(4),
    items: z
      .array(
        z.object({
          text: z.string().min(1).max(80),
          bucketId: z.string().min(1).max(24),
        }),
      )
      .min(6)
      .max(24),
  }),
});

export const SequenceOrder = z.object({
  ...base,
  template: z.literal("sequence-order"),
  rules: z.object({
    secondsTotal: secondsTotal.nullable(),
    orientation: z.enum(["vertical", "horizontal"]),
    partialCredit: z.boolean(),
  }),
  content: z.object({
    steps: z
      .array(
        z.object({
          text: z.string().min(1).max(120),
          position: z.number().int().min(1).max(10),
        }),
      )
      .min(3)
      .max(10),
  }),
});

export const FillBlank = z.object({
  ...base,
  template: z.literal("fill-blank"),
  rules: z.object({
    secondsTotal: secondsTotal.nullable(),
    wordBank: z.enum(["shared", "per-sentence", "none"]),
    caseSensitive: z.boolean(),
  }),
  content: z.object({
    // before / answer / after rather than an embedded "____" marker: no
    // delimiter for the model to get wrong, no escaping question, and the
    // renderer never parses a string.
    sentences: z
      .array(
        z.object({
          before: z.string().max(160),
          answer: z.string().min(1).max(40),
          after: z.string().max(160),
          distractors: z.array(z.string().min(1).max(40)).max(4),
        }),
      )
      .min(4)
      .max(15),
  }),
});

/* ----------------------------------------------------------- the union */

const Union = z.discriminatedUnion("template", [
  QuizRace,
  MatchPairs,
  SortBuckets,
  SequenceOrder,
  FillBlank,
]);

/**
 * Cross-field rules live here, on the union, rather than on each member -
 * `.superRefine` on a member would change its type and break the discriminated
 * union. One place for every rule that a per-field bound cannot express.
 *
 * These are the checks that matter most, because each one describes a spec that
 * PASSES every individual field bound and is still a broken game. A bound that
 * only looks right is the most expensive kind, since it survives review and
 * fails in play.
 */
export const GameSpec = Union.superRefine((spec, ctx) => {
  if (spec.template === "quiz-race") {
    spec.content.questions.forEach((q, i) => {
      // correctIndex is bounded 0..3, but a 2-option question with
      // correctIndex 2 satisfies that bound and has no correct answer.
      if (q.correctIndex >= q.options.length) {
        ctx.addIssue({
          code: "custom",
          path: ["content", "questions", i, "correctIndex"],
          message: `correctIndex ${q.correctIndex} is out of range for ${q.options.length} options`,
        });
      }
      const seen = new Set(q.options.map((o) => o.trim().toLowerCase()));
      if (seen.size !== q.options.length) {
        ctx.addIssue({
          code: "custom",
          path: ["content", "questions", i, "options"],
          message: "options must be distinct - a duplicate makes two answers correct",
        });
      }
    });
  }

  if (spec.template === "match-pairs") {
    const lefts = new Set(spec.content.pairs.map((p) => p.left.trim().toLowerCase()));
    if (lefts.size !== spec.content.pairs.length) {
      ctx.addIssue({
        code: "custom",
        path: ["content", "pairs"],
        message: "left sides must be distinct - a duplicate makes the match ambiguous",
      });
    }
    const rights = new Set(spec.content.pairs.map((p) => p.right.trim().toLowerCase()));
    if (rights.size !== spec.content.pairs.length) {
      ctx.addIssue({
        code: "custom",
        path: ["content", "pairs"],
        message: "right sides must be distinct - a duplicate makes the match ambiguous",
      });
    }
  }

  if (spec.template === "sort-buckets") {
    const ids = spec.content.buckets.map((b) => b.id);
    const idSet = new Set(ids);
    if (idSet.size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        path: ["content", "buckets"],
        message: "bucket ids must be unique",
      });
    }
    spec.content.items.forEach((item, i) => {
      if (!idSet.has(item.bucketId)) {
        ctx.addIssue({
          code: "custom",
          path: ["content", "items", i, "bucketId"],
          message: `bucketId "${item.bucketId}" does not match any bucket`,
        });
      }
    });
    // An empty bucket is a game that looks broken to the player.
    const used = new Set(spec.content.items.map((i) => i.bucketId));
    spec.content.buckets.forEach((b, i) => {
      if (!used.has(b.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["content", "buckets", i],
          message: `bucket "${b.id}" has no items`,
        });
      }
    });
  }

  if (spec.template === "sequence-order") {
    const positions = spec.content.steps.map((s) => s.position).sort((a, b) => a - b);
    const expected = positions.map((_, i) => i + 1);
    if (positions.join(",") !== expected.join(",")) {
      ctx.addIssue({
        code: "custom",
        path: ["content", "steps"],
        message: `positions must be exactly 1..${spec.content.steps.length} with no gaps or duplicates, got ${positions.join(",")}`,
      });
    }
  }

  if (spec.template === "fill-blank") {
    spec.content.sentences.forEach((s, i) => {
      if (spec.rules.wordBank === "none" && s.distractors.length > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["content", "sentences", i, "distractors"],
          message: "distractors are meaningless with wordBank 'none'",
        });
      }
      const clash = s.distractors.some(
        (d) => d.trim().toLowerCase() === s.answer.trim().toLowerCase(),
      );
      if (clash) {
        ctx.addIssue({
          code: "custom",
          path: ["content", "sentences", i, "distractors"],
          message: "a distractor equal to the answer makes two options correct",
        });
      }
    });
  }
});

export type GameSpec = z.infer<typeof GameSpec>;
export type Template = GameSpec["template"];
export type QuizRaceSpec = z.infer<typeof QuizRace>;
export type MatchPairsSpec = z.infer<typeof MatchPairs>;
export type SortBucketsSpec = z.infer<typeof SortBuckets>;
export type SequenceOrderSpec = z.infer<typeof SequenceOrder>;
export type FillBlankSpec = z.infer<typeof FillBlank>;

export const TEMPLATES = [
  "quiz-race",
  "match-pairs",
  "sort-buckets",
  "sequence-order",
  "fill-blank",
] as const;
