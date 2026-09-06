# GAMESPEC — the schema and the template catalog

The `GameSpec` is the contract between the model and the renderer. It is the
single most important file in the project: the model's output format, the
server's validation gate, and the renderer's prop types are all one Zod schema.
Change it and you change all three at once, which is exactly the point.

Source of truth for the schema is `lib/spec/schema.ts`. This doc is the
rulebook. If the two disagree, the code wins — fix this doc.

## Design rules for the schema

1. **No free-form colour, ever.** `accent` is an enum of semantic names that
   code maps to Pandai DS tokens. The model cannot express a hex value, so it
   cannot drift from the DS. This is how NFR4 is enforced structurally instead
   of by review.
2. **Every field the model fills is either constrained or content.** Constrained
   means an enum, a bounded integer, or a bounded-length string. If a field is
   neither, ask why it exists.
3. **Rules and content are separate.** `rules` is how the machine behaves;
   `content` is what it is about. A designer editing questions should never risk
   changing the timer.
4. **Keep it small.** Output tokens dominate the bill (see
   [TECHNICAL-PLAN.md § Cost](TECHNICAL-PLAN.md#cost)). Every optional field you
   add is paid for on every generation, forever. Add a field when a template
   cannot work without it.
5. **Discriminate on `template`.** A `z.discriminatedUnion("template", [...])`
   means an invalid rules/content combination is a parse error rather than a
   runtime surprise in the renderer.
6. **Version the spec.** `specVersion` is present from day one. Adding it later
   means writing a migration with no way to tell what you are migrating from.

## Shared envelope

> **Revised 2026-09-06, after the Phase 2 sync.** The first draft of this
> section guessed an `Accent` enum containing `purple` and `sky`. Neither exists
> as a semantic DS token — they are Primitives only, and binding to a primitive
> is exactly the drift this schema exists to prevent. The real DS turned out to
> offer something better; what follows is grounded in
> [`lib/ds/tokens.raw.json`](../lib/ds/tokens.raw.json).

```typescript
import { z } from "zod";
import { SUBJECT_KEYS, ACCENT_FAMILIES } from "@/lib/ds/tokens.generated";

// The 19 subject identities the DS actually ships, each with a full
// default / hover / subtle / subtle-hover / focus ramp.
export const Subject = z.enum(SUBJECT_KEYS);

// Semantic families carrying the complete Surface ramp. Used ONLY when a game
// has no subject to derive from.
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
  // No accent field. Colour is DERIVED from meta.subject - see below.
  accentOverride: AccentFamily.optional(),
  mascot: z.boolean(),
});

export const Scoring = z.object({
  pointsCorrect: z.number().int().min(0).max(100),
  pointsIncorrect: z.number().int().min(-50).max(0),
  passThreshold: z.number().min(0).max(1),   // fraction of max score
});
```

`yearLevel` runs to 13 rather than 12 on purpose: Malaysian schooling covers
Tingkatan 1–5 on top of Tahun 1–6, and a bound that rejects a real year level is
a bug that only shows up in front of a user.

### Colour is derived, not chosen

The DS ships a **per-subject colour identity** — 19 subjects, each with a full
five-step ramp (`Subjects/b-melayu/default` is `#4d77ff`, and so on). Pandai
already wears these everywhere else in the product.

So `accent` is not a field the model fills. It is computed:

```typescript
const ramp = spec.presentation.accentOverride
  ? accentRamp(spec.presentation.accentOverride)
  : subjectRamp(spec.meta.subject);
```

Three things follow, and each one is worth more than the field it replaced:

1. **One less thing the model can get wrong.** A generated Bahasa Melayu game
   cannot come back wearing Chemistry pink, because nothing in the pipeline is
   choosing.
2. **Games match the product for free.** A BM game is BM-blue in the generator
   for the same reason it is BM-blue in Pandai — same token.
3. **`meta.subject` is now an enum, not a free string.** "Bahasa Melayu",
   "bahasa melayu" and "BM" were three different values a moment ago; now there
   is one, and it is the same key the DS uses.

`accentOverride` exists for the case a game genuinely has no subject. Expect it
to be unused, and treat a spec that sets it as worth a second look.

### Game status colours already exist

The DS carries a `Status/` group: `score`, `streak`, `lives`, `coins`, `ruby` —
each with `default`, `focus` and `on color`. That is not a coincidence of
naming; Pandai already has game-shaped surfaces, and `quiz-race`'s streak
multiplier has a token waiting for it. Renderers must use these rather than
reaching for `Surface/success` because it happens to be green.

## Template catalog — v1

Five templates ship in v1. Each is a renderer plus a rules shape plus a content
shape. Adding a sixth is a pull request with tests and a DS review, not a
prompt — see [SCOPE.md](SCOPE.md).

| id | The machine | Content unit | Good for |
| --- | --- | --- | --- |
| `quiz-race` | Multiple choice against a clock, with a streak multiplier | question + options + one correct index | Recall, definitions, quick checks |
| `match-pairs` | Reveal two cards, keep them if they pair | left and right of a pair | Vocabulary, term/definition, symbol/name |
| `sort-buckets` | Drag each item into one of 2–4 labelled buckets | item + which bucket it belongs to | Classification, sorting, "which group" |
| `sequence-order` | Arrange shuffled steps into the right order | step + its position | Processes, timelines, method steps |
| `fill-blank` | Cloze sentences with a shared word bank | sentence with one blank + the answer | Grammar, formulae, key terms |

`label-diagram` — drop labels onto hotspots of an image — is v1.1. It needs an
image-asset pipeline, and shipping a template whose content the model cannot
supply would be shipping a broken option.

### quiz-race

```typescript
const QuizRace = z.object({
  template: z.literal("quiz-race"),
  meta: Meta,
  presentation: Presentation,
  scoring: Scoring,
  rules: z.object({
    secondsTotal: z.number().int().min(30).max(600),
    shuffleQuestions: z.boolean(),
    shuffleOptions: z.boolean(),
    streakMultiplier: z.boolean(),
    revealAnswer: z.enum(["immediately", "at-end", "never"]),
  }),
  content: z.object({
    questions: z.array(z.object({
      prompt: z.string().min(3).max(240),
      options: z.array(z.string().min(1).max(120)).min(2).max(4),
      correctIndex: z.number().int().min(0).max(3),
      hint: z.string().max(160).optional(),
    })).min(4).max(20),
  }),
});
```

`correctIndex` bounded at 3 is not enough on its own — a two-option question
with `correctIndex: 2` still parses. Add a `.superRefine` that checks
`correctIndex < options.length` per question. **Bounds that only look right are
the most expensive kind of bug**, because they pass review and fail in play.

### match-pairs

```typescript
const MatchPairs = z.object({
  template: z.literal("match-pairs"),
  meta: Meta,
  presentation: Presentation,
  scoring: Scoring,
  rules: z.object({
    secondsTotal: z.number().int().min(30).max(600).nullable(),  // null = untimed
    maxAttempts: z.number().int().min(1).max(99).nullable(),
    gridColumns: z.union([z.literal(3), z.literal(4), z.literal(5)]),
  }),
  content: z.object({
    pairs: z.array(z.object({
      left: z.string().min(1).max(80),
      right: z.string().min(1).max(80),
    })).min(4).max(12),
  }),
});
```

Twelve pairs is twenty-four cards, which is the practical ceiling for a phone
screen at DS card sizing. The bound is a layout fact, not a preference.

### sort-buckets

```typescript
const SortBuckets = z.object({
  template: z.literal("sort-buckets"),
  meta: Meta,
  presentation: Presentation,
  scoring: Scoring,
  rules: z.object({
    secondsTotal: z.number().int().min(30).max(600).nullable(),
    feedback: z.enum(["per-drop", "at-end"]),
  }),
  content: z.object({
    buckets: z.array(z.object({
      id: z.string().min(1).max(24),
      label: z.string().min(1).max(40),
    })).min(2).max(4),
    items: z.array(z.object({
      text: z.string().min(1).max(80),
      bucketId: z.string().min(1).max(24),
    })).min(6).max(24),
  }),
});
```

Refine: every `item.bucketId` must exist in `buckets`, and every bucket must
receive at least one item. An empty bucket is a game that looks broken.

### sequence-order

```typescript
const SequenceOrder = z.object({
  template: z.literal("sequence-order"),
  meta: Meta,
  presentation: Presentation,
  scoring: Scoring,
  rules: z.object({
    secondsTotal: z.number().int().min(30).max(600).nullable(),
    orientation: z.enum(["vertical", "horizontal"]),
    partialCredit: z.boolean(),
  }),
  content: z.object({
    steps: z.array(z.object({
      text: z.string().min(1).max(120),
      position: z.number().int().min(1).max(10),
    })).min(3).max(10),
  }),
});
```

Refine: `position` values must be exactly 1..n with no gaps and no duplicates.

### fill-blank

```typescript
const FillBlank = z.object({
  template: z.literal("fill-blank"),
  meta: Meta,
  presentation: Presentation,
  scoring: Scoring,
  rules: z.object({
    secondsTotal: z.number().int().min(30).max(600).nullable(),
    wordBank: z.enum(["shared", "per-sentence", "none"]),
    caseSensitive: z.boolean(),
  }),
  content: z.object({
    sentences: z.array(z.object({
      before: z.string().max(160),
      answer: z.string().min(1).max(40),
      after: z.string().max(160),
      distractors: z.array(z.string().min(1).max(40)).max(4),
    })).min(4).max(15),
  }),
});
```

Splitting the sentence into `before` / `answer` / `after` rather than embedding
a `____` marker is deliberate: there is no delimiter for the model to get
wrong, no escaping question, and the renderer never parses a string.

## The union

```typescript
export const GameSpec = z.object({
  specVersion: z.literal("1.0"),
}).and(z.discriminatedUnion("template", [
  QuizRace, MatchPairs, SortBuckets, SequenceOrder, FillBlank,
]));

export type GameSpec = z.infer<typeof GameSpec>;
```

## How the renderer consumes it

```typescript
function GameRenderer({ spec }: { spec: GameSpec }) {
  switch (spec.template) {
    case "quiz-race":      return <QuizRace spec={spec} />;
    case "match-pairs":    return <MatchPairs spec={spec} />;
    case "sort-buckets":   return <SortBuckets spec={spec} />;
    case "sequence-order": return <SequenceOrder spec={spec} />;
    case "fill-blank":     return <FillBlank spec={spec} />;
  }
}
```

The prop type is `GameSpec`, the parsed type — not `unknown`, not `any`, not a
hand-written interface. An unvalidated object cannot be passed to this component
without a type error, which is what makes O3 a property of the code rather than
a promise in a document.

## Fixtures

`lib/spec/fixtures/` holds at least three hand-written specs per template:

- **`*.valid.json`** — plays correctly. The renderer tests run against these
  with no model in the loop.
- **`*.edge.json`** — the bounds: minimum items, maximum items, longest strings,
  every optional field absent.
- **`*.invalid.json`** — must be rejected. Wrong `correctIndex`, an item naming
  a bucket that does not exist, duplicate `position` values.

Write the fixtures **before** the renderer, and the renderer before any model
call. A renderer that has only ever been fed model output has never been tested
against anything you controlled.
