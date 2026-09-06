# BUILD GUIDE — start to finish

Ten phases. Each has a goal, the work, and an **exit criterion** — a thing that
is either true or not. Do not start the next phase until the current one's exit
criterion is actually true, not nearly true.

Two sequencing decisions run against instinct, and both are load-bearing:

- **Deploy in Phase 1, before the app does anything.** The Cloudflare/OpenNext
  failure modes are all deploy-time and all misleading. Meet them against a
  hello-world, not against five thousand lines of app.
- **The AI arrives in Phase 4, not Phase 1.** The renderer must play
  hand-written specs before a model ever produces one. A renderer that has only
  ever been fed model output has never been tested against anything you
  controlled — and when a game looks wrong you will not know which half is
  broken.

---

## Phase 0 — Groundwork

**Goal:** the decisions are made and written down, and nothing is blocked on a
permission you have not asked for.

- The docs pack exists (this is it). Read [SCOPE.md](SCOPE.md) once, properly.
- **Clear the design-system question with Pandai before the first push.** This
  repo will contain DS 1.5 token values and two internal Figma file keys. If it
  is going to be public — which the training program assumes — that needs a yes
  from someone who can give it. See
  [PROJECT.md § Program fit](PROJECT.md#program-fit).
- Raise the language and repo-structure questions with the teaching team, same
  section. Do not discover in week nine that TypeScript was a problem.
- Confirm the Anthropic API key source and who pays for it.

**Exit:** the DS publication question has an answer from a person, not an
assumption.

---

## Phase 1 — Skeleton, deployed

**Goal:** a live URL that renders one page, on the real stack.

```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint
npm install @opennextjs/cloudflare wrangler --save-dev
npm install @anthropic-ai/sdk zod
```

Wire the four things askpbot already proved, and get them right the first time
(the full explanations are in
[TECHNICAL-PLAN.md § Inherited gotchas](TECHNICAL-PLAN.md#inherited-gotchas-from-askpbot--read-before-the-first-build)):

- `package.json`: `"build": "opennextjs-cloudflare build"` and
  `"build:next": "next build"`.
- `open-next.config.ts`: spread `defineCloudflareConfig()` and set
  `buildCommand: "npm run build:next"` alongside it — without this the build
  recurses into itself until Node dies.
- `next.config.ts`: `initOpenNextCloudflareForDev()` guarded by
  `process.env.NODE_ENV === "development"`.
- `eslint.config.mjs`: ignore `.open-next/` and `.wrangler/`.

Then `wrangler.jsonc`, and deploy:

```bash
npm run build        # with the dev server stopped
npx wrangler deploy
```

**Exit:** a `*.workers.dev` URL returns your page. If the build fails with
`EPERM ... rm .open-next`, a `workerd` is still running — that is gotcha 3 or 4,
not a permissions problem.

**Done 2026-09-06** — https://gamerator.aidaasofiah.workers.dev/. Two gotchas
beyond the inherited four surfaced here and are recorded as 7 and 8 in
[TECHNICAL-PLAN.md](TECHNICAL-PLAN.md): `next.config.ts` cannot be a
top-level-await module, and `npm run check` needs a prior build for the
generated `LayoutProps` type. Deploying before the app did anything is what made
both cheap to isolate.

---

## Phase 2 — The design system in code

**Goal:** Pandai DS 1.5 tokens are compiled into this repo and a few primitives
render with them.

- Write `scripts/sync-tokens.mjs`. Pull values from the DS via Figma MCP — load
  `/figma-use` first, resolve in **Student (green) mode**, match on
  `libraryName` — and emit `lib/ds/tokens.generated.ts` plus `app/ds/tokens.css`.
  Read [DESIGN-SYSTEM-SYNC.md](DESIGN-SYSTEM-SYNC.md) before the first call.
- Build the primitives the templates need and nothing more: `Card`, `Button`,
  `Chip`, `ProgressBar`, `Timer`. Padding and gaps are 16.
- Add the test that every `Accent` member maps to a real token.

**Exit:** a `/ds` page shows every primitive in every accent, and
`grep -rE '#[0-9a-fA-F]{3,8}' components/` finds nothing outside the generated
token file.

**Done 2026-09-06.** 366 tokens vendored; `Card`, `Button`, `Chip`,
`ProgressBar`, `Timer`, `StatusPill` built from geometry read off the real Figma
nodes; `/ds` renders all 19 subjects and all 10 accent families. The grep became
two scripts in `npm run check` — `check:ds` (no colour value outside the
generated layer) and `check:tokens` (every `var(--…)` resolves). Both were
tested against planted failures. Three drifts against the other repo's vendored
CSS recorded in [DESIGN-SYSTEM-SYNC.md](DESIGN-SYSTEM-SYNC.md); none acted on.

---

## Phase 3 — Schema, fixtures, renderer — no AI

**Goal:** you can play a game that a human wrote by hand.

- `lib/spec/schema.ts` — the full Zod schema from
  [GAMESPEC.md](GAMESPEC.md), including the `superRefine` checks. The bounds that
  only look right are the ones that will bite: `correctIndex < options.length`,
  every `bucketId` exists and every bucket is non-empty, `position` values are
  exactly 1..n.
- `lib/spec/fixtures/` — three specs per template: valid, edge, invalid.
  **Write these before the renderer.**
- `components/game/` — one renderer per template, and `GameRenderer` switching
  on `spec.template`. The prop type is the parsed `GameSpec`.
- `/play/preview?fixture=...` renders any fixture.

**Exit:** all five templates are playable from fixtures; every `*.invalid.json`
is rejected by `safeParse`; the renderer test suite passes with no API key set.

This is the phase to not rush. Everything after it is plumbing; this is the
product.

**Done 2026-09-06.** Schema with cross-field refinements, 15 fixtures, five
renderers, and `/play/preview`. 38 tests, no API key, no network. All 15
fixtures verified against `wrangler dev`: the ten valid/edge ones render real
game content, the five invalid ones are refused with the issues listed.

Two things this phase caught that `next dev` would have hidden — both recorded
in [TECHNICAL-PLAN.md](TECHNICAL-PLAN.md) as gotchas 9 and 10: **a Worker has
no filesystem**, so the fixture loader had to become a bundled static import;
and **`esbuild` must be an explicit devDependency**, because adding vitest
de-hoisted it and broke the build.

---

## Phase 4 — Generation

**Goal:** a description becomes a validated spec.

- `lib/prompt.ts` — the system prompt: template catalog, the `Accent` enum, the
  authoring rules from [AUTHORING-GUIDELINES.md](AUTHORING-GUIDELINES.md), and
  two worked brief-to-spec examples. **Freeze it.** No timestamps, no
  per-request ids, no unsorted iteration — it is the cached prefix.
- `lib/generate.ts` — `claude-opus-5`, `messages.parse` with
  `zodOutputFormat(GameSpec)`, `thinking: { type: "adaptive" }`. Guard
  `parsed_output` for null; check `stop_reason` for `"refusal"` before reading
  content.
- `lib/validate.ts` — `safeParse`, then **one** repair turn carrying the Zod
  issues verbatim, then honest failure. Not a loop.
- `lib/audit.ts` — write a `generation_events` row on every path, including
  failures. Record `usage.cache_read_input_tokens` from the first day.
- `app/api/generate/route.ts` — SSE. Fail with an HTTP status before the stream
  opens; after the first byte, failures are error *events*. These two paths are
  not interchangeable.

**Exit:** ten real briefs produce ten specs that pass `safeParse`, and
`cache_read_input_tokens` is non-zero from the second call onward. If it is
zero, something in the prefix is moving — find it now, not in Phase 9.

---

## Phase 5 — The authoring UI

**Goal:** a content designer can use this without being told how.

- The form: subject, year level, language, objective, optional template hint,
  free-text rules.
- The guidelines panel, rendered from
  [AUTHORING-GUIDELINES.md](AUTHORING-GUIDELINES.md) so the two cannot drift.
- Streamed progress with real stages — briefing, generating, validating,
  repairing. A spinner that says nothing for twenty-five seconds reads as broken.
- Preview and play, in place.
- Form-based editing: reword an item, change a timer, drop a question — patching
  the spec locally, no regeneration.

**Exit:** someone on the content team who has not seen this before generates a
game they would actually use, without you sitting next to them.

That last clause is the whole test. Watch them do it and write down every place
they hesitate.

---

## Phase 6 — Persistence

**Goal:** games survive a refresh.

```bash
npx wrangler d1 create gamerator
npx wrangler d1 execute gamerator --file=./migrations/0001_init.sql
```

- Schema from [TECHNICAL-PLAN.md § Data model](TECHNICAL-PLAN.md#data-model-d1).
- Save, list, open, new version. **Versions are immutable** — an edit inserts,
  never updates.
- The library page: filter by subject, year, language.

**Exit:** generate, edit twice, reload — all three versions are there and the
version history reads correctly.

---

## Phase 7 — Access, audit, and a spending wall

**Goal:** it is internal, and it cannot run up a bill.

- Cloudflare Access in front of the Worker, restricted to the Pandai domain.
- Read identity from `Cf-Access-Jwt-Assertion`. **Never** trust an email in a
  request body.
- `ANTHROPIC_API_KEY` as a Worker secret: `npx wrangler secret put`.
- Per-identity rate limit in KV.
- A hard monthly spend ceiling, checked **before** each generation. A runaway
  loop should hit a wall, not a bill.
- A `/admin/usage` page over `generation_events`: cost per game, failure rate by
  template, cache hit rate.

**Exit:** a logged-out request cannot reach `/api/generate`, and the usage page
shows real numbers from real generations. Set the O6 cost ceiling here, from the
first fifty runs.

---

## Phase 8 — Export, and the rest of the catalog

**Goal:** a product engineer can take a game away.

- `GET /api/games/:id/export` — a zip in R2: `spec.json`, `brief.json`, and a
  `README.md` explaining the spec version and how to render it.
- Any templates not yet built.
- Internal share links.

**Exit:** hand one export to a Pandai product engineer and they integrate it
**without asking you anything**. If they ask a question, the answer belongs in
the bundle's README — put it there and hand it over again.

---

## Phase 9 — Evals and guardrails

**Goal:** you can tell whether a change helped.

Two suites, following askpbot's split:

- **`npm run eval:offline`** — no API key, no cost. Schema round-trips, every
  fixture, the renderer, the accent-to-token map, and a check that the system
  prompt still contains its sentinel line.
- **`npm run eval`** — real generations against a fixed set of briefs, scoring:
  schema-validity rate, repair rate, DS fidelity (no raw hex, accent in
  allow-list), language correctness (a BM brief yields BM content, diacritics
  intact), item counts honouring the stated rules, and refusal behaviour on
  off-scope briefs.

Then guardrails: reject briefs naming a student, briefs asking for content
outside a school context, and anything the model declines — surfacing the
decline as a decline, not as a server error.

**Exit:** `npm run check` gates the commit, the online suite has a recorded
baseline, and a deliberate regression in the prompt makes a case go red.

An eval that has never failed is not evidence. Break something on purpose and
confirm the suite notices.

---

## Phase 10 — Figma review loop, runbook, handoff (v1.1)

**Goal:** it survives you being on leave.

- Push generated screens into the **Screens** file for design review. Never
  write to the Design System file.
- `docs/RUNBOOK.md`: deploy, roll back, rotate the key, read the audit table,
  what each failure code means. **Never write a command nobody has run** — mark
  unverified steps as unverified.
- `docs/RELIABILITY.md`: what is actually known to work, and what is assumed.
- Append to [STATUS.md](STATUS.md) every working session, dated that day, never
  backdated.

**Exit:** someone else deploys a change using only the runbook.

---

## Working rules

Carried from askpbot because they are what keeps a docs pack honest:

1. **The docs describe what exists, not what is planned.** Anything unbuilt is
   marked unbuilt.
2. **Never write a command nobody has run.** Unverified steps carry a marker
   until someone executes them.
3. **Append to STATUS.md every session, dated that day.** A logged gap is fine;
   a fabricated date is not.
4. **Adding a feature means checking SCOPE.md first.** If it is on the
   not-building list, it needs a re-scope entry before any code.
5. **If code and docs disagree, that is a bug in the docs** — fix it in the same
   change, not later.
6. **An omission nobody wrote down is indistinguishable from a bug.**
