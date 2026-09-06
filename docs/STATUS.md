# STATUS

Append one entry per working session, dated that day. Never backdate. A logged
gap is fine; a fabricated date is not.

---

## 2026-09-05 — Planning

**Done**

- Read the training program repo (`training-ai-fde`), askpbot, and
  `pandai.question.uiux` for prior art and DS grounding.
- Four architectural decisions taken: internal content-team tool; separate repo
  with week write-ups linking to tagged releases; constrained GameSpec JSON with
  a deterministic renderer; Cloudflare Workers via OpenNext.
- Docs pack written: PROJECT, SCOPE, TECHNICAL-PLAN, GAMESPEC,
  AUTHORING-GUIDELINES, DESIGN-SYSTEM-SYNC, BUILD-GUIDE, this file.

**Built:** nothing. No code exists yet.

**Live blockers**

1. **Design-system publication is uncleared.** This repo will hold Pandai DS 1.5
   token values and two internal Figma file keys. The training program assumes
   anything committed is public. Needs a yes from someone at Pandai who can give
   one — or the tokens go behind a private submodule with redacted fixtures.
   *Blocks Phase 2, and blocks the first public push.*
2. **Language convention unconfirmed.** The program defaults to Python; this is
   TypeScript. Proposal to put to the teaching team: the eval harness and the
   token-sync scripts are the Python surface.
   *Does not block building. Blocks the first week write-up.*
3. **Repo-structure convention unconfirmed.** Week folders will carry write-ups
   linking to tagged releases here. Confirm that satisfies "submit is to push the
   work to this repo and share the link".
   *Does not block building.*
4. **API key source and billing owner undecided.**
   *Blocks Phase 4.*

**Assumed, not verified**

- Weeks 1–12 briefs are unpublished, so nothing here has been checked against an
  actual assignment. The scope check in PROJECT.md is against the program's
  stated rules only.
- The cost figures in TECHNICAL-PLAN.md are estimates from token counts, not
  measurements. No generation has been run.
- The askpbot build gotchas are carried over from that repo's CLAUDE.md and have
  not yet been re-hit here.

**Next:** Phase 0 — get blocker 1 answered. Then Phase 1.

---

## 2026-09-05 — Phase 1, all but the deploy

**Done**

- Scaffolded Next.js 16.3.4 / React 19.2.8 / TypeScript / Tailwind v4, merged
  into the repo without clobbering the docs pack.
- Installed `@anthropic-ai/sdk` 0.124.0, `zod` 4.5.4,
  `@opennextjs/cloudflare` 1.20.6, `wrangler` 4.129.0.
- Wired all four inherited build gotchas: `build` is
  `opennextjs-cloudflare build`, `open-next.config.ts` carries
  `buildCommand: "npm run build:next"`, `initOpenNextCloudflareForDev()` is
  guarded by `NODE_ENV === "development"`, and `.open-next/` + `.wrangler/` are
  in the ESLint ignore list.
- `wrangler.jsonc` written from OpenNext's own template. D1, KV, R2 and the
  incremental-cache bindings are deliberately deferred to the phases that need
  them, with comments saying which.
- `.env.example` committed, carrying the `.dev.vars` vs `.env.local` trap.
- Landing page replaced with a Phase-1 status page. No features, by design.
- **Two new gotchas found and fixed here**, now recorded in CLAUDE.md and
  TECHNICAL-PLAN.md: `next.config.ts` cannot be a top-level-await module
  (`ERR_REQUIRE_ASYNC_MODULE`, error names the compiled file not the line), and
  `npm run check` needs a prior build for the generated `LayoutProps` type.

**Verified, by running it**

- `npm run build` succeeds and emits `.open-next/worker.js`.
- `npm run check` (typecheck + lint) is clean, zero warnings.
- `npx wrangler dev --local` serves the page on real `workerd`: HTTP 200,
  `<title>gamerator</title>`, page content correct.

**Not done — Phase 1 is not complete**

- **`wrangler deploy` has not been run.** `wrangler whoami` reports not
  authenticated, and `wrangler login` needs a browser. Phase 1's exit criterion
  is a live `*.workers.dev` URL, so **Phase 1 stays open** until someone logs in
  and deploys. The deploy command itself is therefore unverified on this repo.
- No `.dev.vars` yet. Nothing needs a secret before Phase 4.

**Blockers** — 1, 2 and 3 from the previous entry stand unchanged. Blocker 4
(API key source and billing owner) is still open and still blocks Phase 4. New:

5. **Nobody is authenticated to Cloudflare.** Run `npx wrangler login`, then
   `npm run deploy`. *Blocks the close of Phase 1.*

**Next:** deploy, confirm the URL, then Phase 2 — which needs blocker 1 answered
first, since Phase 2 is where DS token values enter the repo.

---

## 2026-09-06 — Phase 1 closed

**Deployed.** https://gamerator.aidaasofiah.workers.dev/

Verified against the live URL, not assumed:

- HTTP 200, ~0.97s, 14,493 bytes — byte-identical to the local build.
- `<title>gamerator</title>` and all four page-content probes present.
- `x-opennext: 1`, `Server: cloudflare`, `CF-RAY` edge `SIN` (Singapore) — the
  right region for Malaysian users.

**Phase 1 exit criterion met.** A live `*.workers.dev` URL returns the page.
Blocker 5 (Cloudflare authentication) is closed. `npm run deploy` is now a
verified command and no longer carries the unverified marker in the README.

**New operational fact, worth deciding on rather than drifting into:** the Worker
is deployed under the **`aidaasofiah` Cloudflare account**, not Zul's. That
account is now where the deployment, the Worker secrets, the D1 database, the KV
namespace, the R2 bucket and the Cloudflare Access policy will all live — so it
also answers "who owns this in production" and half of blocker 4. If that is the
intended long-term home, nothing to do beyond writing it down here. If it was
just the account that happened to be logged in, move it before Phase 6 puts a
database in it — moving a Worker after it has bindings and data is materially
harder than moving it now.

**Blockers**

1. **Design-system publication is uncleared.** Unchanged, and now the immediate
   one — Phase 2 is where DS 1.5 token values and the two Figma file keys enter
   the repo. *Blocks Phase 2.*
2. Language convention unconfirmed with the teaching team. *Blocks the first
   week write-up, not the build.*
3. Repo-structure convention unconfirmed. *Blocks the first week write-up.*
4. API key source and billing owner. Partly answered by the deploy account
   above; the Anthropic side is still open. *Blocks Phase 4.*
6. **Cloudflare account ownership needs a decision**, per the note above.
   *Blocks nothing today; blocks cheaply only until Phase 6.*

**Next:** Phase 2 — the design system in code. Do not start it until blocker 1
has an answer from a person.

---

## 2026-09-06 — Phase 2, token layer

Zul confirmed `aidaasofiah` is the intended Cloudflare account (blocker 6
closed) and directed the token fetch to proceed **without** the publication
clearance in blocker 1 being obtained first. Recorded as his call. Note the
tokens are committed locally and **not pushed** — the repo has an `origin`
(`github.com/aidarollin/gamerator`) whose visibility was not verifiable from
here, so the publication question is deferred, not resolved.

**Done**

- Extracted Pandai DS 1.5 tokens via Figma MCP: **336 colours, 30 dimensions**,
  fully resolved through the alias chain.
- `lib/ds/tokens.raw.json` — the extraction, verbatim, with provenance.
- `scripts/figma-token-resolver.js` — the exact `use_figma` payload that
  produced it. Committed so the sync is reproducible and reviewable.
- `scripts/sync-tokens.md` — the two-half procedure (agent fetch, script
  generate) and why it cannot be one script.
- `scripts/generate-tokens.mjs` — real, runnable, deterministic. Emits
  `app/ds/tokens.css` (366 custom properties) and `lib/ds/tokens.generated.ts`
  (typed constants, `token()`, `subjectRamp()`, `accentRamp()`).
- `scripts/check-ds.mjs` + `npm run check:ds`, now part of `npm run check`.
- `app/globals.css` shell colours moved onto DS tokens.

**Verified, by running it**

- `npm run tokens` regenerates cleanly; collision detection active.
- `npm run check` green: typecheck, lint, check:ds.
- `npm run build` green, `.open-next/worker.js` emitted.
- **`check:ds` was tested against deliberate drift** — a planted `#ff0000` and
  `rgba(0,0,0,0.5)` both caught, exit 1, clean again after restore. A gate that
  has never failed is not evidence.

**Findings that changed the plan**

1. **`Accent` in GAMESPEC.md was wrong.** The first draft guessed `purple` and
   `sky`; neither exists as a semantic token. GAMESPEC.md revised.
2. **The DS ships 19 subject identities** with full ramps, so **colour is now
   derived from `meta.subject` rather than chosen by the model.** One less field
   to get wrong, and generated games match the product for free. `meta.subject`
   became an enum in the same change.
3. **The DS already has game-status tokens** — `score`, `streak`, `lives`,
   `coins`, `ruby`. `quiz-race`'s streak multiplier has a token waiting for it.
4. **The inherited "resolve in Student mode" rule was mechanically wrong.**
   Semantic has no Student mode; Student is a *Product* mode one level down.
   Correct rule is pin-a-mode-per-collection. DESIGN-SYSTEM-SYNC.md corrected.
5. **Two drifts in `pandai.question.uiux/resources/css/pandai/tokens.css`** vs
   the live DS: `Surface/secondary/default-subtle-hover` (`#d1f7d1` vs
   `#baf3b9`), and corner radius `4xl` (24 vs 54). Recorded, not acted on —
   different repo. Worth telling whoever owns `fe/`.

**Operational notes on Figma MCP**

- Seat confirmed: **Full on Pandai Workspace v2 (pro)** → 200/day, 10/min. The
  doc's claim held.
- **`search_design_system` batching does not work as documented** — an 8-query
  batch was clamped to 1 by a server limit, silently dropping 7.
- **Search returns names and keys, never values.** Resolved values require the
  variables API through `use_figma`.

**Not done**

- No DS primitives yet (`Card`, `Button`, `Chip`, `ProgressBar`, `Timer`), and
  no `/ds` page. Phase 2's exit criterion is therefore **not** met — the token
  half is done, the component half is not.
- Dark mode, Teacher/Parent modes, Typography and Responsives not vendored.
  Recorded in `tokens.raw.json` → `$meta.notVendoredYet`.

**Blockers** — 1 (DS publication, now deferred by decision rather than
answered), 2, 3 (teaching-team conventions; Zul asked that no messages be sent),
4 (Anthropic key + billing) unchanged.

**Next:** finish Phase 2 — the primitives and the `/ds` page — then Phase 3.

---

## 2026-09-06 — Phase 2 complete

Instruction: finish Phase 2, and change nothing outside this repo. Honoured —
Figma was read but never written, and no other repo was touched.

**Done**

- Read real geometry for Button, Cards, Progress Bar and Tag off their Figma
  nodes. No value in the primitives was hand-picked; `components/ds/ds.module.css`
  names the source node above every block.
- `components/ds/` — `Card` (+ `CardStack`), `Button`, `Chip`, `ProgressBar`,
  `Timer`, `StatusPill`, plus `tokens.ts` carrying `rampStyle` / `resolveRamp` /
  `statusStyle`.
- Accent theming works by projecting a ramp onto `--ramp-*` inline, so one class
  set renders all 19 subject identities with no component ever naming a colour.
- `app/ds/page.tsx` — every primitive, all 19 subjects, all 10 accent families,
  spacing and radius scales.
- `scripts/check-tokens.mjs` + `npm run check:tokens`, now in `npm run check`.

**Verified, by running it**

- `npm run check` green: typecheck, lint, check:ds, check:tokens.
- `npm run build` green.
- `/ds` served from real `workerd`: HTTP 200, 138KB, **19 distinct subject
  token vars referenced**, and **zero raw hex in the rendered HTML**.
- **Both gates tested against planted failures.** `check:tokens` catches a
  dangling `--subjects-bahasa-melayu-default` (the DS key is `b-melayu` — the
  exact mistake it exists for); `check:ds` catches a planted `#ff0000`.

**Two false positives found and fixed in the gates themselves**

- `check:tokens` flagged `var(--status-${key}-default)` — a template literal,
  not a typo. Interpolated names are now skipped, which is exhaustive rather
  than a hole because the STATUS_KEYS ramp check already covers every value the
  interpolation can take.
- `check:ds` flagged `&#9201;` (a stopwatch entity) as `#9201`. Numeric HTML
  entities are now stripped before the colour scan, rather than narrowing the
  colour pattern — narrowing would have started letting real values through.

**Findings**

1. **Card radius drift, and it is the consequential one.** The other repo's
   `DESIGN-SYSTEM.md` radius table says cards are 16 (`corner-xl`); every card
   in the live DS binds `Radius/3xl` = **24**. A card built to that table is
   visibly squarer than the DS it claims to follow. Recorded, not acted on.
2. **All three Button variants share one hover treatment** in the DS — Primary,
   Secondary and Tertiary all resolve to `Surface/secondary/default` +
   `Border/secondary/focus` + `Text/secondary/focus` on State=Hover. Verified
   across all three nodes so nobody later "fixes" it.
3. **Quiz Card binds its stroke to `Subject/default`** — subject theming is
   already a real component behaviour in the DS, not an idea we invented.
4. Button set carries **198 variants**; only Type=Student / Size=L was read.

**Known gaps, deliberately**

- Button sizes M and S scale padding and keep every colour identical. Their DS
  nodes were **not** read, and both the CSS and the `/ds` page say so. Read them
  before treating those two as DS-exact.
- `Timer` is **not** a DS component — the DS has no Timer node. Composed from
  Tag geometry plus Status tokens, and labelled as such in code.
- Dark mode, Teacher/Parent modes, Typography and Responsives still not
  vendored.

**Blockers** — 1 (DS publication, deferred by decision), 2, 3 (teaching-team
conventions; no messages to be sent), 4 (Anthropic key + billing) unchanged.
Nothing pushed; all work is local.

**Next:** Phase 3 — schema, fixtures, renderer. Still no AI, by design.

---

## 2026-09-06 — Phase 3 complete

**Done**

- `lib/spec/schema.ts` — all five templates plus the envelope, with cross-field
  refinements on the union (a `.superRefine` on a member would change its type
  and break the discriminated union).
- 15 fixtures, three per template, **written before the renderer**.
- `lib/game/random.ts` — seeded PRNG and shuffle.
- `components/game/` — `QuizRace`, `MatchPairs`, `SortBuckets`,
  `SequenceOrder`, `FillBlank`, `GameShell`, and `GameRenderer`.
- `app/play/preview` — plays any fixture; shows validation issues for the ones
  that are supposed to fail.
- vitest added; `npm test` is now part of `npm run check`.

**Verified, by running it**

- 38 tests pass with no API key and no network.
- `npm run check` green; `npm run build` green.
- **All 15 fixtures checked against `wrangler dev`**: ten valid/edge render real
  game content (probed for actual prompts, options, subject tokens), five
  invalid are refused with their issues listed. 15/15.

**Two failures `next dev` would have hidden**

1. **A Worker has no filesystem.** The first fixture loader used
   `readdirSync`. It worked fine locally and every preview page 500'd on the
   Worker with `ENOENT ... readdir '/bundle/lib/spec/fixtures'`. Fixtures are now
   a generated barrel of static imports, bundled at build time, with a test that
   fails if the barrel drifts from the directory.
   *My first run of the fixture check reported 5 failures. That reading was
   wrong — every page was 500ing, so neither expected string appeared and the
   probe defaulted to "rendered". The real fault was all 15, not 5.*
2. **`esbuild` was silently de-hoisted.** `@opennextjs/cloudflare` imports it
   without declaring it. Installing vitest reorganised the tree and the build
   died with `Cannot find package 'esbuild'`. Now an explicit devDependency at
   0.28 — note `@opennextjs/aws` wants 0.25.x and vite 8 wants ^0.27||^0.28, so
   only 0.28 satisfies the tree; the build is verified working on it.

Both are recorded as gotchas 9 and 10 in TECHNICAL-PLAN.md and in CLAUDE.md.

**Design decisions worth keeping**

- **Shuffling is seeded from the spec.** NFR2 requires determinism, and
  `Math.random()` would also break hydration by drawing different orders on
  server and client. A reported bug is now replayable from the spec alone.
- **No HTML5 drag and drop.** It is not keyboard operable, so it would put NFR8
  out of reach for two whole templates. `SortBuckets` uses select-then-place;
  `SequenceOrder` uses move-up/move-down.
- **Correct and wrong always carry a word, not just a colour.**
- `GameRenderer`'s switch has no `default` branch, so adding a template to the
  schema without a renderer is a compile error rather than a blank screen.
- `@types/node` bumped 20 → 24 to match the Node the project actually runs on.

**Not done**

- No component-level renderer tests — the suite covers the schema, the fixtures
  and the shuffle. Renderer behaviour is verified by playing the fixtures at
  `/play/preview`, which is integration rather than unit coverage. Adding
  `@testing-library/react` would close that gap.
- Nothing deployed since Phase 1; `/play/preview` has only been run locally.

**Blockers** — 1 (DS publication, deferred by decision), 2, 3 (teaching-team
conventions; no messages to be sent), 4 (Anthropic key + billing, which now
blocks the next phase) unchanged. Nothing pushed.

**Next:** Phase 4 — generation. This is where the AI finally arrives, and it
needs blocker 4 answered.

---

## 2026-09-06 — Provider verified, Phase 4 built stub-first

Blocker 4 is closed: the provider is **OpenRouter**, key in local `.env.local`
only. Zul asked that the build spend as little as possible and that the site be
usable, so Phase 4 was built stub-first and the app is deployed.

**Provider smoke test — total spend $0.0086, staged cheapest-first**

| Stage | Result |
| --- | --- |
| Connectivity | ok |
| Strict tool use | ok, schema-exact arguments |
| Prompt caching | ok — 14,757 tokens read from cache on the second call |
| `output_config.format` | **ok — supported** |

The last row corrects my own recommendation. I had argued for strict tool use
because I could not confirm the gateway passed `output_config` through; it does,
so the originally specced mechanism is what shipped. Caching working through the
gateway also means the cost model holds.

**The real integration question was not about the provider.** JSON Schema cannot
express a `superRefine`, so the model is handed `GameSpecShape` (structural)
while the server validates `GameSpec` (structural + cross-field). The gap
between them is exactly the repair turn's job. `GameSpecShape` is exported so
the generation layer cannot silently send the refined schema and drop the
refinements; a test pins the split.

**Built**

- `lib/spec/brief.ts`, `lib/config.ts`, `lib/generate/{prompt,provider,stub,live,index,audit}.ts`,
  `app/api/generate/route.ts`.
- **The stub is the default provider, not a test double.** A deployment with no
  provider configured cannot run up a bill, and going live is an explicit act
  (`GAMERATOR_PROVIDER=live`).
- The stub reproduces every outcome the live provider can: success, needs-repair,
  unrepairable, refusal, transport error — driven by `trigger:` strings in the
  brief's rules field.

**Verified, by running it**

- 56 tests, no key, no network. `npm run check` exit 0.
- Every SSE path exercised against `wrangler dev`: happy (3 stages → `spec`),
  repair (5 stages → `spec` with `repaired:true`), unrepairable (→ `invalid`,
  never a spec), refusal and error as distinct events, and malformed input
  failing with **HTTP 400 before the stream opens** while a valid brief gets
  200. Both error paths behave as specified.
- Deployed and confirmed live: a real POST to `/api/generate` streams a
  `match-pairs` spec. Costs nothing — the Worker has no API key.

**Phase 4 is NOT complete.** Its exit criterion is ten real briefs producing ten
valid specs with a non-zero cache read, and that needs live calls. The pipeline
is done and proven; the prompt is unproven. A stub demonstrates the plumbing,
not that Claude writes good Tahun 4 peribahasa.

**Not done**

- No authoring UI — that is Phase 5, so the generate flow currently has no page
  to drive it from.
- Audit events are logged, not persisted. D1 is Phase 6; `record()` is a
  one-function swap.
- No spend ceiling or rate limit yet (Phase 7).

**Blockers** — 1 (DS publication, deferred by decision), 2, 3 (teaching-team
conventions; no messages to be sent) unchanged. 4 closed.

**Next:** Phase 5 (authoring UI) so the flow is usable, or a live run of Phase
4's exit criterion when there is appetite to spend a few cents.
