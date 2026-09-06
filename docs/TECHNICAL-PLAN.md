# TECHNICAL PLAN

## The one decision everything else follows from

**The model emits data, not code.**

A prompt does not produce a game. It produces a `GameSpec` — a JSON document
naming a template, its rules, its content, and which Pandai DS tokens to wear.
A deterministic React renderer, written by hand and reviewed like any other
code, plays any valid spec.

Everything good about this system is downstream of that choice:

| Property | Why it holds |
| --- | --- |
| Safe | Model output is data. Nothing is `eval`'d or injected as HTML. The blast radius of a bad generation is a rejected spec. |
| On-brand | The model picks token *names* from an enum. It cannot express a raw colour value, so it cannot drift from the DS. |
| Testable | A spec is a fixture. The renderer is tested against hand-written specs with no model in the loop. |
| Fast and cheap | Two to four thousand output tokens, not eight hundred lines of JavaScript. |
| Debuggable | A broken game is a readable JSON document, not a stack trace inside generated code. |
| Reversible | Improving the renderer improves every game ever generated, retroactively. |

The cost is that a game can only be as novel as the template catalog. That is
the trade, taken deliberately, and [SCOPE.md](SCOPE.md) records that "AI writes
game code" is not a later phase.

## Architecture

```
                        Cloudflare Access (Zero Trust)
                        identity gate on every route
                                    |
+-----------------------------------v----------------------------------+
|  Next.js 15 App Router . React 19 . TypeScript . Tailwind v4          |
|  deployed as a Worker via @opennextjs/cloudflare                      |
|                                                                       |
|  /            authoring form + guidelines panel                       |
|  /library     saved games                                             |
|  /play/[id]   the renderer, standalone                                |
|                                                                       |
|  -- server --------------------------------------------------------   |
|  POST /api/generate   SSE: stage -> spec | error                      |
|    |                                                                  |
|    +- lib/prompt.ts    system prompt: template catalog + DS token      |
|    |                   enum + authoring rules      [cache_control]     |
|    +- lib/generate.ts  claude-opus-5, messages.parse + zodOutputFormat |
|    +- lib/validate.ts  GameSpec.safeParse -> one repair turn -> fail   |
|    +- lib/audit.ts     usage, cost, duration, outcome                  |
|                                                                       |
|  GET/POST /api/games   library, versions, export                      |
+--------+--------------+---------------+-------------------------------+
         |              |               |
     +---v---+      +---v---+      +----v----+          +---------------+
     |  D1   |      |  KV   |      |   R2    |          | Anthropic API |
     | specs |      | idem- |      | export  |          | claude-opus-5 |
     | vers. |      | potcy |      | bundles |          +---------------+
     | audit |      | cache |      | images  |
     +-------+      +-------+      +---------+

  -- design time only, never inside a user request --------------------
  Figma MCP  -->  scripts/sync-tokens.mjs  -->  lib/ds/tokens.generated.ts
  (run by Claude Code, by a human, on demand - see DESIGN-SYSTEM-SYNC.md)
```

## Stack, and why each piece

| Layer | Choice | Why this one |
| --- | --- | --- |
| Framework | Next.js 15 App Router, TypeScript | Same as askpbot. Server routes and the renderer live in one deployable. |
| Styling | Tailwind v4 plus `pandai/tokens.css` | Tokens are the DS contract; Tailwind is only the layout mechanic. |
| Validation | Zod | One schema serves three jobs: the model's output format, the server's gate, and the renderer's prop types. |
| Model | `claude-opus-5` | Spec generation is structured reasoning over a large catalog, and quality shows up directly as fewer repair turns. Revisit only with measurements. |
| SDK | `@anthropic-ai/sdk` | Official. Gives per-turn `usage`, `stop_reason`, and the structured-output helpers. Do not substitute a wrapper. |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare` | Proven in askpbot, account already exists, and D1/KV/R2 are one binding away. |
| Auth | Cloudflare Access | Internal tool, free at this size. Building login would be building a liability. |
| DB | D1 (SQLite) | Specs are small documents with a version chain. This is not a workload that needs Postgres. |
| Cache | KV | Idempotency keys, and a prompt-hash cache for identical regenerations. |
| Blobs | R2 | Export bundles and any uploaded imagery. No egress fees. |

### Inherited gotchas from askpbot — read before the first build

These cost real days there. They will cost them again here.

1. `npm run build` must be `opennextjs-cloudflare build`, not `next build`.
   Cloudflare deploys `.open-next/`; `next build` only writes `.next/`.
2. `open-next.config.ts` needs `buildCommand: "npm run build:next"`. Without it
   the build script shells out to itself and Node dies on a stack overflow. The
   script name and that setting are a pair — change one, change the other.
3. `initOpenNextCloudflareForDev()` must stay guarded by
   `NODE_ENV === "development"`, or every build spawns a `workerd` that outlives
   it and the next build fails with a misleading `EPERM`.
4. Stop the dev server before building — a live `workerd` holds `.open-next`
   open and produces that same `EPERM`.
5. Local dev needs **`.env.local`** for the API key. `.dev.vars` populates
   `getCloudflareContext().env`, not `process.env`, and the dev server's
   "Using secrets defined in .dev.vars" line looks like it worked. Deployment is
   the opposite and needs no `.env.local`.
6. Add `.open-next/` and `.wrangler/` to the ESLint ignore list. Flat config does
   not read `.gitignore`, and without them lint reports around fifteen thousand
   problems from vendor bundles and the pre-commit gate becomes noise.

Two more, both hit and fixed during Phase 1 on this repo:

7. **`next.config.ts` must not be a top-level-await module.** Next 16 loads the
   compiled config with `require()`, so an `await import(...)` or an awaited
   `initOpenNextCloudflareForDev()` fails the build with
   `ERR_REQUIRE_ASYNC_MODULE`. Use a static import and `void` the call. The error
   names `next.config.compiled.js` and never mentions the line that caused it.
8. **`npm run check` needs a build to have run first, on a fresh clone.**
   `app/layout.tsx` uses `LayoutProps<"/">`, a Next 16 route type generated into
   `.next/types`. Before the first build, `tsc --noEmit` fails with
   `Cannot find name 'LayoutProps'` — which reads like a broken tsconfig and is
   just missing generated types. Order is build, then check.

## The AI layer

### Request shape

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { GameSpec } from "@/lib/spec/schema";

const client = new Anthropic();

const response = await client.messages.parse({
  model: "claude-opus-5",
  max_tokens: 16000,
  thinking: { type: "adaptive" },
  system: [
    // Stable prefix: template catalog + DS token enum + authoring rules.
    // Cached - it is ~4k tokens and byte-identical on every request.
    { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
  ],
  messages: [{ role: "user", content: renderBrief(form) }],
  output_config: { format: zodOutputFormat(GameSpec) },
});

// parsed_output is null when parsing failed - guard, never assert.
const spec = response.parsed_output;
```

Details that are easy to get wrong:

- **`output_config: { format: ... }`**, not the deprecated `output_format`.
- **`thinking: { type: "adaptive" }`** — `budget_tokens` is rejected with a 400
  on Opus 5. Do not carry that pattern in from older code.
- **No assistant prefill.** It returns a 400 on this model family. Shape the
  output with the schema, not with a primed opening turn.
- **Stream anything long.** The authoring route streams so the wait is legible.
  Use the SDK's `.stream()` and `finalMessage()` rather than hand-rolling
  promise wrappers around `.on()` events.
- **Check `stop_reason` before reading content.** A policy decline arrives as
  HTTP 200 with `stop_reason: "refusal"`, not as a thrown error.

### Caching

Render order is `tools`, then `system`, then `messages`, and caching is a prefix
match — one changed byte anywhere before the breakpoint invalidates everything
after it. So the system prompt must be **frozen**: no timestamps, no per-request
ids, no iteration over an unsorted object. Verify with
`usage.cache_read_input_tokens`; if it is zero across repeated requests,
something in the prefix is moving.

Be clear-eyed about the size of the win, though. At roughly 4k cached input
against 2–4k output tokens, **output dominates the bill**. Caching is worth
having and nearly free to set up, but the real cost lever is spec compactness —
a template whose spec carries forty fields per item costs more than one carrying
six, on every single generation, forever. Design the schema with that in mind.

### Validation and repair

```
model output --> GameSpec.safeParse
                      |
              success |            failure
                      v                v
                 render ok    one repair turn, carrying the Zod issues verbatim
                                       |
                               success |  failure
                                       v      v
                                  render ok   surface it, log it, stop
```

One repair turn, not a loop. A second failure means the prompt or the schema is
wrong, and retrying is a way of not finding that out. The failed spec and its
issues go to the audit log — that log is the raw material for prompt
improvement.

### Cost

Rough shape per generation, at Opus 5 rates ($5 per MTok in, $25 per MTok out):

| Component | Tokens | Notes |
| --- | --- | --- |
| System prompt | ~4,000 in | cached after the first call of each window |
| Brief | ~300 in | the user's form and free text |
| Spec plus thinking | ~2,000–4,000 out | dominates; varies most with item count |

That lands somewhere around **$0.08–0.20 per game** — but treat it as an order of
magnitude, not a number. Record `usage` on every generation from day one, set the
O6 ceiling from the first fifty real runs, and hold it against measurements
rather than against this table.

## Data model (D1)

```sql
CREATE TABLE games (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  owner_email     TEXT NOT NULL,
  subject         TEXT,
  year_level      INTEGER,
  language        TEXT NOT NULL,
  current_version INTEGER NOT NULL,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE TABLE game_versions (
  id         TEXT PRIMARY KEY,
  game_id    TEXT NOT NULL REFERENCES games(id),
  version    INTEGER NOT NULL,
  spec_json  TEXT NOT NULL,
  brief_json TEXT NOT NULL,
  origin     TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (game_id, version)
);

CREATE TABLE generation_events (
  id                TEXT PRIMARY KEY,
  game_id           TEXT,
  actor_email       TEXT NOT NULL,
  status            TEXT NOT NULL,
  error_code        TEXT,
  model             TEXT NOT NULL,
  input_tokens      INTEGER,
  output_tokens     INTEGER,
  cache_read_tokens INTEGER,
  cost_usd          REAL,
  duration_ms       INTEGER,
  created_at        INTEGER NOT NULL
);
```

Column value sets: `games.language` is `ms` or `en`; `game_versions.origin` is
`generated`, `edited`, or `repaired`; `generation_events.status` is `ok`,
`repaired`, `invalid`, `refused`, or `error`.

Versions are immutable. An edit writes a new row; nothing is ever updated in
place. That is what turns "the game changed and nobody knows why" into a
five-second diff instead of an investigation.

## API

| Method | Path | Does |
| --- | --- | --- |
| POST | `/api/generate` | SSE stream. Emits `stage` events (briefing, generating, validating, repairing), then `spec` or `error`. |
| GET | `/api/games` | List, filtered by subject, year, language |
| POST | `/api/games` | Save a validated spec as v1 |
| GET | `/api/games/:id` | Game plus its current version |
| POST | `/api/games/:id/versions` | Save an edited spec as the next version |
| GET | `/api/games/:id/export` | Bundle: `spec.json`, `brief.json`, `README.md` |
| GET | `/play/:id` | The renderer, standalone, no chrome |

**Two error paths, and they are not interchangeable.** Before the stream opens,
fail with an HTTP status. After the first byte the status is locked at 200, so
every later failure must be emitted as an error stream event instead. Getting
this wrong produces a 200 that the client reads as success.

## Security

- **Model output is data.** No `eval`, no `new Function`, no
  `dangerouslySetInnerHTML`. Every string from a spec renders as a text node.
  This is NFR3 and it does not bend for a performance win.
- **The schema is the boundary.** Nothing renders that has not passed
  `safeParse`. Not "usually" — the render path takes the parsed type, so an
  unvalidated object cannot reach it without a type error.
- **Colour cannot be expressed as a value.** `accent` is an enum of DS token
  names, which makes NFR4 structural rather than a review checklist item.
- **`ANTHROPIC_API_KEY` is server-only.** A Worker secret in production,
  `.env.local` in development. It must never appear in a client component, in a
  `NEXT_PUBLIC_` variable, or in a log line.
- **Identity comes from Access**, read from the `Cf-Access-Jwt-Assertion` header.
  Never trust an email supplied in a request body.
- **Rate limit per identity** in KV, plus a hard monthly spend ceiling checked
  before each generation. A runaway loop should hit a wall, not a bill.

## Observability

Every generation writes one `generation_events` row — success and failure alike.
That table answers the questions that actually get asked: what a game costs,
which templates fail validation most, whose prompts need better guidelines, and
whether the cache is working. Wire it in Phase 3, not "later"; a system that has
been running blind for a month cannot be retroactively measured.
