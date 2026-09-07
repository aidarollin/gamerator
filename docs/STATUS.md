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

---

## 2026-09-06 — Pivot: arcade games, and the first engine

Zul: *"I want a game generator that generates games like Flappy Bird or Mario
World or Mortal Kombat but with Pandai Theme, not necessarily about the content
in pandai."*

**The premise was wrong and it was my assumption.** From "game generator" I
inferred curriculum quiz games and wrote it into PROJECT.md, the five templates
and fifteen fixtures. Zul never said it. Recorded rather than quietly replaced,
because the learning code only makes sense with this note attached.

**Decided** — arcade games with a Pandai skin; audience is **students inside
Pandai**; engines rather than generated code; learning content an optional
twist. Full re-scope entry in SCOPE.md, catalog design in the new ENGINES.md.

**What survived the pivot: about 70%.** Deploy pipeline, gates, the 366-token DS
layer, the primitives, and the whole generation pipeline (provider seam, stub,
validate-repair, SSE, audit) are all engine-agnostic. What was replaced is the
template catalog and its renderers.

**Built — `endless-flyer`, the one actually asked for**

- `lib/arcade/schema.ts` — ArcadeSpec 2.0. Palette is a DS subject or accent
  key, so the model still cannot express a colour.
- `lib/arcade/simulate.ts` — **the playability simulation**, the important new
  idea. A perfect-play agent is run headlessly over twelve obstacles; a spec it
  cannot survive is rejected with a reason the repair turn can use.
- `components/arcade/EndlessFlyer.tsx` — canvas engine, fixed-timestep physics,
  DS colours read from the live stylesheet.
- 8 fixtures including two new categories the learning specs never needed:
  **unplayable** and **trivial**.
- `/play/arcade`.

**Verified on the deployed site** — all 8 fixtures: five playable, three
rejected, each with a reason that explains itself:

> *a perfect player misses obstacle 2 by 114px - a 80px gap is too tight for
> these physics at 400px/s*

79 tests, `npm run check` exit 0.

**Three times the tests caught me being wrong, in one session**

1. **The simulated agent was a jetpack.** It could flap every physics step —
   120 times a second — so it hovered against any gravity and almost nothing was
   ever rejected. The check was theatre. Fixed with a 0.1s tap cooldown.
2. **My test expectation was wrong, not the code.** I asserted gravity 2800 with
   a -220 flap through a 90px gap was impossible. The arithmetic said otherwise
   and the arithmetic was right. That case is now a named test, kept because it
   is the argument for the simulation: this judgement is not reliable by eye —
   not the model's, and not mine.
3. **The agent overshot by exactly one flap impulse.** A naive "flap when below
   centre" controller punches through the top of a tight gap. The 48px miss it
   reported *was* the impulse size, which is what gave it away. The agent now
   declines to flap when the resulting apex would leave the gap.

**Two gate false positives found and fixed**, both by narrowing what is skipped
rather than what is matched: `check:ds` read the HTML entity `&#9201;` as a
colour, and `check:tokens` flagged `var(--x)` written as prose in a comment.
Both still catch real failures — re-verified against planted ones.

**Not done**

- Four engines still unbuilt: `brick-breaker`, `snake`, `endless-runner`,
  `platformer`. The last needs sprite art that does not exist.
- The generation pipeline still produces *learning* specs. Pointing it at
  ArcadeSpec is the next piece of real work, and the no-engine outcome needs
  wiring into it.
- No authoring UI. Still Phase 5.
- The Pandai mascot PNG and `pbot.riv` are not used yet — the bird is drawn from
  DS tokens, which is why the engine shipped without waiting on art.

**Next:** point the generator at ArcadeSpec so a typed sentence produces a
flyer, then add `brick-breaker` and `snake` (no art needed).

---

## 2026-09-06 — Real characters, real game feel, the prompt page, and export

Four things asked for at once. All four done, still at zero model spend.

**1. Real Pandai characters.** The hero was a drawn disc, which is most of why
the game read as a prototype. Copied into `public/characters/` (this repo only):
six PBot expression SVGs plus the Aidan and Nadia battle avatars.

PBot ships as an expression set, which turned out to be a gift: the same
character reacts. `pbot-awe` on the start screen, `pbot` while flying,
`pbot-dizzy` on a crash, `pbot-mastery` in reserve for beating a target. A
character that reacts is most of the distance between a prototype and a game.
Aidan and Nadia have one pose each, so they tilt and squash instead — handled by
the same interface rather than a special case.

`theme.skin` became `theme.character`, typed to the real cast.

**2. The UI felt mock, and it was.** Fixes, in rough order of how much each
mattered:

- Score and lives moved **inside** the game. The old chrome framed the canvas
  like a form field, which is what made it read as a mock-up.
- Parallax hills at a third of world speed, and a ground that scrolls at world
  speed so motion reads even mid-gap.
- Particles, screen shake and a tumble on death; a squash on flap; an idle bob
  on the start screen; the score pops when it changes.
- A proper start and game-over panel, with a big score and the target.
- The hitbox is **smaller than the sprite**, deliberately. Pixel-accurate
  collision against a character with ears feels unfair.

**3. The prompt page — `/create`.** It did not exist; this was the honest gap.
Type a sentence, get a playable game. It is wired to a deterministic tuner in
`lib/arcade/generate.ts` that maps words to physics in code, so **the page works
and costs nothing**. Pointing it at the model is a swap behind the same seam.

The no-engine answer is wired in and is the interesting part: asking for a
fighting game gets told there is no engine, what the catalog does have, and that
an engine is a pull request — instead of silently receiving a flyer.

**4. Export — `docs/EXPORT.md`, and `/embed` is live.** Three forms from one
spec: an iframe embed that works today with zero integration, the same as a
Blade partial with the spec from a controller, and the raw JSON as the source of
truth. The spec travels inside the URL (base64url, ~550 chars for a flyer), so
nothing has to be stored on either side for an embed to work.

Recommended next and deliberately not built: a **web component**. It would
inherit Pandai's own DS tokens from the host page and raise DOM events Alpine
could listen to, but it needs the engine extracted from React, its own build
target and a versioning story. The iframe covers the same ground today at a
fraction of the cost.

**Verified on the deployed site**

- All five character assets serve 200.
- `/create` renders; "hard flappy bird with PBot through chemistry pink pipes"
  produces a hard chemistry PBot game; "easy gentle flyer, Nadia" produces an
  easy Nadia game with 5 lives.
- The mortal-kombat prompt returns the no-engine answer.
- A real spec round-trips through `/embed`: 546 chars encoded, renders the game.
- 79 tests, `npm run check` exit 0.

**Two more gate false positives**, both fixed by narrowing what is *skipped*
rather than what is matched, and both re-verified against planted failures:
`check:ds` flagged prose in a CSS comment, and the drop shadows. Shadows now
derive from a DS ink token via `color-mix` rather than a hand-picked black,
because the DS expresses elevation as Figma effect styles this build has not
vendored.

**Not done**

- Still one engine. `brick-breaker` and `snake` need no art and are next.
- `/create` runs on the deterministic tuner, not the model. Real generation is a
  provider swap plus wiring `ArcadeSpec` into `lib/generate` — a live request is
  currently **refused** rather than silently served by the stub, so a "live"
  deployment cannot quietly be a lie.
- No storage, so no library and no short embed links. D1 is Phase 6.
- `pbot.riv` (Rive animation) unused — the SVG expression set was enough.

**Next:** `brick-breaker` and `snake`, or wire `/create` to the model.

---

## 2026-09-06 — Five engines, real game feel, and the model wired

**"It still feels mock"** — it did, and the diagnosis was not the physics. Four
things, in order of how much each mattered: debug chips (`gravity 1500`) under a
player-facing game, a washed-out `subtle` palette for the sky, flat
single-colour rectangles for obstacles, and a DS dialog card as the title
screen. That is a design-system demo, not a game.

Fixed by a shared `components/arcade/paint.ts`: the saturated end of the ramp,
four-layer solids (body, inner shade, highlight, cap), drifting clouds, a
scrolling ground, heavy outlined numerals. And the chips are gone from every
player-facing surface.

**All five engines built.** `endless-flyer`, `endless-runner`, `brick-breaker`,
`snake`, `platformer`. A shared `GameFrame` owns canvas, palette,
fixed-timestep loop, input and screens, so an engine is only its own logic and a
feel fix lands on all five at once instead of drifting across four copies. 21
fixtures, all verified live: 15 playable, 6 rejected.

**Random input.** Engine routing is weighted keyword scoring, not first-match.
Genuine nonsense ("asdfgh") and genre-less requests ("a fun game for year 3")
get a flyer AND are told it was a guess. Named-but-absent genres — racing,
fighting, tetris — get the honest no-engine answer.

**Every playability check now proves it can fire.** The brick-breaker check
shipped as dead code: the fastest legal ball against the slowest legal paddle
still passed, so it could never reject anything. A fixture that refused to be
rejected gave it away. There is now a fuzz test asserting each check both
accepts and rejects somewhere inside its own bounds — a check that cannot fire
is worse than no check, because it reads as coverage.

### The model is wired, and the smoke test had misled me

**`output_config.format` is NOT enforced through OpenRouter.** The earlier smoke
test said it was; that verdict was wrong. The two-field probe schema happened to
come back as bare JSON, which looked like enforcement. With a real schema the
model replied with a markdown-fenced code block and the SDK threw an unexpected
backtick. **A capability probe has to use a payload the size of the real thing.**

Generation now uses **strict tool use**, which the same smoke test showed
returning schema-exact arguments, and which is genuinely enforced. The model is
also handed ONE engine schema rather than the five-branch union — `chooseEngine`
already decides the engine in code, so the union was both wasteful and fragile
(the first live attempt came back missing `rules` and `scoring` entirely).

**Three paid calls, not the one asked for.** The first two each failed and each
revealed a real defect — the union, then the unenforced structured output. The
third succeeded. Roughly $0.05 total. Neither failure was avoidable by reading
documentation, because the documentation says the feature is supported.

**The result**, from a prompt asking for a snake game that starts gentle and gets
genuinely tense, wrapping walls, Nadia, in Bahasa Melayu:

    title:  "Nadia Cari Buah"
    desc:   "Bantu Nadia makan semua buah dan elak daripada melanggar
             badannya sendiri."
    rules:  startSpeed 4, speedUp 0.35, wallsKill false, foodTarget 18

`startSpeed` 4 rising to 10.3 by the eighteenth fruit is a difficulty CURVE. The
keyword tuner has one flat scale and cannot express it. That single field is the
clearest argument for the model over the tuner. Saved as a fixture and playable
at `/play/arcade?game=model-generated`.

**Two process failures worth recording**

1. vitest suppresses stdout for passing tests, so the successful call's exact
   token usage was never captured. The cost above is an estimate. Log to a file,
   not `console.log`.
2. The first version of this very entry was written with `python -c "..."`, so
   bash expanded every backtick as command substitution and blanked out half the
   technical terms. Use a quoted heredoc for prose containing backticks. This is
   the third time shell quoting has corrupted content in this project — the
   earlier one silently turned `` into literal backspace characters in a
   regex, which would have stopped "snake" ever matching the snake engine.

**Not done**

- `/create` still runs the tuner, not the model. `lib/arcade/live.ts` is wired
  and correct but nothing calls it — flipping `GAMERATOR_PROVIDER=live` needs a
  spend ceiling and a rate limit first (Phase 7).
- No storage, so the model's game lives as a committed fixture, not a record.
- `pbot.riv` still unused.

**Next:** a spend ceiling and rate limit, then `/create` can go live.

---

## 2026-09-06 — Ranged physics: runs that build instead of repeat

Adopted item 1 from [REFERENCE-FLYING-SUSHI.md](REFERENCE-FLYING-SUSHI.md). The
model stays off, unchanged.

**What changed.** `endless-flyer` physics were four fixed numbers for a whole
run. Four of them are now `{ start, end }` ranges interpolated over
`rampOverObstacles`:

| field | was | now |
| --- | --- | --- |
| `scrollSpeed` | one value | range, usually rising |
| `gapHeight` | one value | range, usually narrowing |
| `gapSpacing` | one value | range, usually shortening |
| `gapDrift` | one value | range, usually widening |
| `gravity`, `flapVelocity` | one value | **still constant** |

Gravity and flap stay constant deliberately: they are the *feel of the
character*, and a hero whose weight changes mid-run reads as a bug rather than
as escalation. Everything the world does to the player ramps instead.

**Two differences from the reference.** It ramps on **obstacles passed**, not
wall-clock — difficulty should track progress, and a player hovering in an empty
gap is not getting better. And there is no round timer yet; that is the next
item, not this change.

**The simulation had to change with it, and this is the important part.** A
fixed twelve-obstacle window would sample only the gentle opening of a ramped
spec. The simulation now runs `rampOverObstacles + 4`, so it always reaches the
hardest point. The new `endless-flyer.unplayable` fixture exists to prove it:

> a perfect player misses obstacle 20 by 72px — 95% into the ramp the gap is
> 93px at 376px/s, too tight for these physics

It cleared **nineteen** obstacles before failing. Under the old fixed window
that spec would have validated and shipped an impossible game. The failure
message now names how far into the ramp it happened, so a repair turn knows
whether to soften the end or the whole curve.

**Also adopted:** the lerped tilt. The character now eases toward its
velocity-derived angle instead of being assigned it every frame — one line, and
it reads noticeably less stiff.

**The tuner learned to ramp.** "starts easy and builds to something tense" now
produces speed 75→195, gap 210→149, spacing 330→242, drift 30→91 over 12
obstacles. "steady, the same difficulty throughout" flattens the climb and
stretches the ramp to 30. Values are rounded to one decimal, because float
arithmetic was leaking `90.80000000000001` into the JSON a Pandai engineer reads.

**The system prompt gained the range rules**, including the point that a flat
run repeats and that the ramp's END is what gets simulated. Not spent against
the model — recorded for when it goes back on.

**Verified live:** 21/21 fixtures correct, 50 tests, `npm run check` clean.

**Not done**

- Only `endless-flyer` ramps. The runner, breaker, snake and platformer are
  still flat; snake has `speedUp`, which is a ramp in all but name.
- No round timer, no collectibles, no power-ups, no sound — items 2 to 5 on the
  adopt list.
- One deploy failed on a DNS resolution error mid-session and succeeded on
  retry; nothing to fix, noted so it is not mistaken for a code fault later.

---

## 2026-09-06 — Real art, and screenshots that found three bugs

Model still off.

**Authored art.** Five SVGs in `public/art`: cloud, hill, bush, coin, sparkle.
All drawn as **white silhouettes** and tinted from DS tokens at draw time
(`components/arcade/art.ts`, offscreen canvas plus `source-in`, cached per
asset/colour/size). Baking colour into the SVGs would have broken palette
theming - a Bahasa Melayu game and a chemistry game would share one green bush.

**A real background.** Sky gradient with a light source, drifting clouds, far
hills and near bushes at different parallax rates, and a ground with soil, turf
and a lit lip. Solids gained a lit face, rim light and inner shade instead of a
single fill.

**Collectibles**, adopted from the reference. Coins sit offset from the gap
centre so taking one costs a little safety. Deterministic from a seed, and
optional - they never gate progress, so the playability simulation does not need
to know about them.

### Screenshots found three bugs that curl could not

Captured with Playwright (imported by absolute path from a sibling repo's
`node_modules`; nothing installed here, nothing there modified).

1. **Nadia and Aidan had a white box.** The battle avatars are PNGs with an
   opaque white background - cut for a UI card, not for a game. Now clipped to a
   circle with a rim, which reads as a deliberate badge. PBot's SVGs are
   transparent and are still drawn whole.
2. **brick-breaker was unplayable by keyboard.** A press only launched the ball
   if it carried a pointer position, so Space started the game and then nothing
   happened. A stuck score of 0 in the shot is what gave it away. Same class of
   bug in the platformer - Space could not jump.
3. **The platformer floated in empty space.** No ground, no scenery below the
   platforms. It has both now.

None of these were visible to HTTP checks. Every previous verification said 200
and matched the expected strings.

**Not done**

- Only the flyer has collectibles; the other four engines do not.
- Still no sound, no round timer, no power-ups.
- Snake and runner still have flat physics.

---

## 2026-09-06 — Context saved to docs

Written down so the state survives a compaction. Nothing built in this entry.

**What changed**

- `CLAUDE.md` **rewritten**. It still described the learning-game product and
  `GameSpec`, which would have misled anyone reading it after a compact. It now
  describes the arcade generator, says where everything is, and states the
  model-off contract.
- `README.md` rewritten: live URLs, five engines, and a docs index that marks
  `GAMESPEC.md` and `AUTHORING-GUIDELINES.md` as **legacy**.
- `docs/SCREENSHOTS.md` added — the Playwright procedure, and the three bugs
  that HTTP checks passed clean.

## Current state, in one place

**Product:** arcade games with a Pandai skin, for students, as a break between
lessons. Learning content is an optional twist. Pivoted here on 2026-09-06 from
curriculum quiz games, which was my assumption and not Zul's.

**Built and live:**

- Five engines: `endless-flyer`, `endless-runner`, `brick-breaker`, `snake`,
  `platformer`. 21 fixtures, all verified live.
- 366 DS 1.5 tokens, 19 subject palettes, real PBot / Aidan / Nadia characters.
- Authored art tinted from tokens; parallax; collectibles in the flyer.
- Flyer physics **ramp** across a run; the simulation covers the hardest point.
- Playability simulation per engine, each fuzz-tested to prove it can fire.
- `/create` (free tuner), `/play/arcade`, `/ds`, `/embed`, `/api/generate`.
- Export: iframe, Blade partial, spec JSON. Spec travels in the URL.

**Off:** the model. Three-way locked, see CLAUDE.md. Turning it on needs a spend
ceiling and rate limit first. Total ever spent: about **$0.06**.

**Open questions for Zul**

1. **Two DS Figma files.** Flying Sushi cites `Y0DLhf2MGdGwG0jyjN7EbQ`; we
   synced `TLVKe3bgJTdVvuPAzgDq2f`. None of Flying Sushi's colours appear in our
   336 extracted tokens. Decides whether generated and hand-built games match.
2. **DS publication.** This repo holds DS token values and two internal Figma
   keys, and the training program assumes public. Deferred by Zul's decision,
   not resolved. Nothing has been pushed.
3. Teaching-team conventions: TypeScript vs the program's Python default, and
   the week-folder structure. No messages sent, per instruction.

**Next, in the order I would take them** — all from
[REFERENCE-FLYING-SUSHI.md](REFERENCE-FLYING-SUSHI.md):

1. **Sound.** BGM, effects, a mute toggle with a persisted preference. The
   largest remaining gap against Flying Sushi, and SCOPE's "no assets" reason is
   disproved by that repo.
2. Collectibles in the other four engines.
3. A round timer with a budget shared across retries.
4. Power-ups (magnet, rush).
5. Ranged physics for the runner; snake's `speedUp` is already a ramp.

---

## 2026-09-06 — The game gets its own look, and a voice

Model still off. Two decisions from Zul, both acted on.

### "Use whatever style for the game, keep Pandai DS as a backup"

Every pixel on the canvas came from a DS ramp until now, and it cost more than
it bought. A DS subject identity is **one hue in five quiet tints**, chosen to
sit behind text. A game needs the opposite, and it needs two families, not one:
Flappy Bird is a BLUE sky with GREEN pipes. With a single ramp the obstacles
were the sky in a darker tint, which is a large part of why the earlier versions
kept reading as diagrams of games.

`lib/arcade/palettes.ts` now holds ten authored **scenes** - dawn, forest,
night, dusk, candy, ocean, lava, mint, steel, sand - each carrying a `sky`
family and a `solid` family. `theme.palette` still names a DS identity, so
chemistry is still pink and physics is still after dark; only the rendered
values changed. `theme.background` finally does something: a spec that asked for
night gets night whatever its subject.

**The DS is a live fallback, not a comment.** A palette key with no scene - the
day the DS gains a subject and this map has not caught up - renders through the
token ramp exactly as before. `scripts/check-ds.mjs` names `palettes.ts` in its
allowlist, so the exception is exactly one file wide and every other component
is still held to the token layer.

This also **closes open question 1** (the two DS Figma files). It no longer
decides anything urgent: a hand-built Pandai game and a generated one were never
going to share a palette once generated games got their own art direction.

### Sound, synthesised

Item 1 on the adopt list. No audio files: every effect and the music are
generated by the Web Audio API at runtime. Zero bytes in the Worker bundle, no
licence, and because it is numbers rather than a recording a hard spec is keyed
lower than an easy one from the same code.

Effects ride on the **shared host verbs** rather than on fifteen call sites in
`engines.tsx` - `addScore` already means a chirp and `loseLife` already means a
thud in all five engines, so wiring it in `GameFrame` gave every engine sound at
once. Only the jump impulse needed engine-level calls. The score chirp climbs a
scale with a combo counter, so a long run sounds like progress.

Music is a bass-and-arpeggio bed scheduled **against the audio clock**, not a
`setInterval` firing notes. The timer only decides when to QUEUE; the audio
clock decides when a note sounds, so the tempo holds when a frame is late.

Mute persists in `localStorage` and is reachable **before** the first press.
It is a `useSyncExternalStore` subscription rather than state mirrored by an
effect - React's `set-state-in-effect` rule flagged the first attempt, and it
was right: the preference lives in the sound module, not in React.

### Verified by measuring, not by assuming

Screenshots cannot hear. So the AudioContext was instrumented in Playwright to
count oscillators and buffer sources, across one shared browser context:

| Check | Result |
| --- | --- |
| Silent before any gesture | ok - 0 contexts created |
| Plays while running | ok - 20 notes, 9 distinct pitches |
| Mute silences completely | ok - 0 |
| Mute survives a reload | ok - 0 |
| Unmute brings it back | ok - 30 |

**The first version of that harness reported a false failure.** It used
`browser.newPage()` per case, which creates a fresh context, so localStorage was
empty every time and "mute persists" failed for a reason that had nothing to do
with the code. The fix was in the test. Worth recording next to the
`output_config.format` probe: **a capability test that does not reproduce the
real conditions measures its own setup.**

### Three bugs the screenshots caught, all mine, all from the palette change

1. **`forest` was green on green.** The one scene where I broke my own
   sky/solid rule, and the platformer came out as a single flat sheet with the
   platforms barely findable. Solids are wood now.
2. **The snake board vanished.** It was `white` at 60% opacity, which was
   passable against a DS tint and invisible against a pale scene sky. There is a
   real playfield now - a solid border and a checker, which also shows how far
   one step moves you.
3. **The hearts disappeared on chemistry.** DS pink hearts on a pink canvas.
   Anything drawn over the canvas now carries its own outline, because the
   canvas is no longer guaranteed to be a DS surface.

**Not done**

- The platformer's generated level leaves a large empty middle and runs
  platforms off the right edge. Visible in every shot, pre-dates today, not
  touched.
- Collectibles are still flyer-only; no round timer; no power-ups; the runner
  and snake still have flat physics.

---

## 2026-09-06 (later) — Collectibles in every engine, and four ways I measured wrong

Model still off. Item 2 on the adopt list.

### What each engine got

The flyer and the platformer already had coins. The other three now have one
each, and in each case the genre decided the shape rather than the other way
round:

- **endless-runner** — coins between obstacles. Roughly half sit at running
  height and cost nothing; the rest sit inside the jump arc, derived from the
  same numbers the playability check uses, so a coin that looks reachable is.
- **brick-breaker** — some bricks DROP a coin. A coin lying on a Breakout board
  would be unreachable, so it has to fall — and that is the better idea anyway:
  catching one pulls the paddle out from under the ball, so the bonus is paid
  for in safety rather than patience.
- **snake** — a timed bonus, the way Nokia's did it. The food is already the
  collectible, so a second permanent one would just be more food; what snake
  lacks is a reason to take a RISK. It is worth triple, sits somewhere awkward,
  and expires. Its lifetime is two board crossings at the current speed, not a
  flat six seconds — six seconds means something different on every board.

All of them stay OPTIONAL: they never gate progress, so the playability
simulation still describes the game being played.

### The flyer's coins were on the wrong line

They were pinned to `centres[n]` — the gap just LEFT. By the time you reach the
midpoint you are climbing toward gap n + 1, which drift can put a long way from
gap n, so the coin was at a height nobody is at any more. Horizontally it is
halfway between two gaps, so vertically it belongs halfway too.

Measured against a perfect player over 20 obstacles: **hard went 5 → 8**, valid
10 → 11, easy 13 → 13.

### The geometry moved out of the closure

`lib/arcade/collect.ts`, with `collect.test.ts`. The reason is the same one
behind `gapCentres`: **a rule trapped in a closure cannot be measured.** From
outside, the only way to ask "was a coin ever collected?" is to play and watch —
and because a collectible is optional, a missed one looks exactly like a player
who did not want it. A broken one ships in silence.

The regression test rebuilds the old placement and asserts it fails, so the
check demonstrably fires rather than merely passing.

### Four measurement failures, all of which produced confident wrong numbers

This is the part worth keeping.

1. **The instrument shared a signal with the subject.** Coin pickups were
   counted by their 988 Hz chirp — unique, fine. Points were counted at 440 Hz,
   which is ALSO a note in the background music. Every "points: 20" was counting
   the soundtrack. Same family as the `output_config.format` probe: the test
   has to be checked against reality before its output is.
2. **A scripted pilot is not a player.** Tapping the flyer on a fixed interval
   settles the bird into one altitude band. If that band misses the coin line it
   misses every coin, forever, and reports a clean zero.
3. **The ball detector found the mascot.** Locating the brick-breaker ball as
   "lowest dark pixel" found PBot's visor — same ink, drawn lower. The paddle
   chased the corner for a whole run while I read the zero as a game bug.
4. **Chasing gold chased the sparks.** Burst particles are gold and fall, same
   as a dropped coin.

### And one real bug the screenshots caught

Extracting the geometry replaced two hoisted `function` declarations — which sat
BELOW the factory's `return`, legally — with `const` arrows in the same place.
`return` runs first, so they were never evaluated and every call hit the temporal
dead zone. **The flyer rendered sky, clouds and hills and then stopped:** no
pipes, no ground, no bird, no score, and no error anyone would see.

`npm run check` was green the whole time. TypeScript does not track
use-before-init across a closure, and nothing in the suite renders a canvas. It
took looking at a picture.

### Verified

| Engine | How | Result |
| --- | --- | --- |
| endless-runner | 988 Hz pickups, unique to a coin | 6 collected |
| snake | canvas pixels: two gold objects = bonus present | on screen at exactly food 4; 5 collected |
| brick-breaker | followed the ball, chased drops | drops spawn, fall, 1 caught |
| endless-flyer | after the TDZ fix | 8 coins, 10 points |
| flyer geometry | unit test, real perfect-play agent | 8-13 of 20, fails on the old placement |

**Not done**

- The platformer's generated level still leaves a large empty middle and runs
  platforms off the right edge. Unchanged, and now the most visible flaw.
- No round timer, no power-ups. The runner and snake still have flat physics.

---

## 2026-09-07 — The front door was still the Phase 1 skeleton

Zul opened the live site and saw the build plan. Not a bug in anything I had
built - a gap where the thing joining it together should have been.

`app/page.tsx` had never been touched since Phase 1. It said **"Phase 1 -
skeleton, deployed"**, **"it has no features and is not supposed to"**, listed
ten build phases with phase 1 marked *current*, and described the learning-game
product this stopped being on 2026-09-06. It linked to nothing.

And it was not alone: **no page linked to any other page.** `/create`,
`/play/arcade` and `/ds` were islands, reachable only by typing the URL. Six
sessions of work sat one URL away from a visitor who had no way to know it
existed, and every screenshot I took went straight to a deep link, so I never
once arrived the way a person does.

**Fixed**

- `app/page.tsx` rewritten as a landing page: what this is, three doors, and an
  honest note that nothing here spends money. The build plan belongs in `docs/`,
  which is now the only place it lives.
- `components/SiteNav.tsx` - one header on every page, marking the current
  route, hidden on `/embed` because that gets pasted into other people's pages.
- The root `metadata.description` was still the learning-game copy. That is what
  search results and link previews use.

**Verified on the deployed site** by clicking, not by curl: Make → `/create`,
Play → `/play/arcade`, Design system → `/ds`, the card CTA → `/create`, and the
wordmark back to `/`. No page errors.

**The lesson, which is not a new one here.** `docs/SCREENSHOTS.md` says
confirming a page responds is not the same as looking at it. This is the next
turn of the same screw: **looking at a page you navigated to directly is not the
same as arriving.** Every check I ran, HTTP and visual alike, started at a deep
link. Not one started at `/` and tried to find the product.

---

## 2026-09-07 (later) — The platformer built levels nobody could finish

The most visible flaw in every screenshot, and underneath it a real one.

### Levels could be impossible, and nothing said so

Platform heights were `H - 120 - rng() * 150`, drawn **independently of each
other**. So one platform could sit 150px above the last. A jump in
`platformer.valid` peaks at **144px**. Some seeds produced a level that simply
could not be finished.

`platformerVerdict` said nothing, because it only ever compared a running jump
against the **horizontal** gap. It had no idea the level also climbed. Third
time this exact shape has appeared here — the flyer's fixed simulation window,
brick-breaker's dead check, and now this: **the validator describing a game
nobody plays.**

Fixed by construction rather than by rejection, in `lib/arcade/level.ts`. For
each platform a RISE is chosen first, then the gap is capped by
`reachAtRise(rules, rise)` — how far a jump carries while still at least that
high, from the later root of `rise = v0·t − g·t²/2`. Choosing them the other way
round is what made the old one unsound: a gap that is fine on the flat is not
fine while also climbing, because climbing spends the same air time.

`minGap` turned out to be a preference, not a floor. On a steep climb almost all
the air time goes upward, and forcing a 40px gap there rebuilds the very bug —
so when the room runs out the platforms abut, which reads as a step up rather
than a jump across, and is the right shape for a climb.

`level.test.ts` fuzzes 400 legal specs, keeps the ~50+ the checker accepts, and
asserts every step of every level is crossable. The can-it-fire test replays the
OLD generator with the real RNG in its original draw order and asserts it
produces unreachable steps.

### The ground was a lie

A solid-looking ground strip ran across the bottom, and the player fell straight
through it to their death. The level said "floor" and meant "pit", which is
about the least fair thing a platformer can do. Platforms now carry a pillar
down out of frame, so terrain is terrain and a gap is visibly a hole.

### You could run, or jump, never both

`GameFrame` pushed a `release` on **every** keyup, including the jump key. The
platformer reads `release` as "stop walking", so on a keyboard every jump
stopped you dead — the character never left the first platform. It survived this
long because the other four engines ignore `release` entirely.

Found by watching a screenshot and asking why the mascot was still standing
where it started after twenty-six presses of "walk right".

### Also

- The goal flag floated at a fixed height near the end of the level. It stands
  on the last platform now.
- Coins were sampled with replacement, stacking several on one platform while
  others had none. One per platform, spread.
- `cx += gap + (i === 0 ? 0 : 0)` — dead arithmetic, gone with the rest.

**Verified on the deployed site** by running and jumping: `platformer.valid` 5
coins over 9 jumps, `platformer.hard` 12 over 13, no page errors, and the flag
photographed standing on the final platform of a short probe level.

**Not done**

- No round timer, no power-ups. The runner and snake still have flat physics.
- The pit floor is pale sky; it reads as empty but a darker void would read as
  danger.

---

## 2026-09-07 (later still) — A round timer, and a barrel that lied

Model still off. Item 3 on the adopt list.

### The clock is shared across retries — that is the whole feature

Flying Sushi runs three minutes with the budget shared across continues: each
retry starts with whatever time is left. That one detail is what makes it a
**round** rather than a stopwatch. Three lives stop being three fresh chances
and become a resource spent against one budget.

It also suits what these are for. A break between lessons wants an ending, and
an endless run has none.

`scoring.timeLimit` is **optional**, 20–300s, and absent by default: it bounds a
session, it is not a win condition. A round that ends on the clock still shows
what you scored against the target — the panel says **"Time!"** rather than
"Game over", because a game that stops without saying why reads as a crash.

The countdown is ticked inside the **fixed timestep**, not from wall clock, so a
round lasts the same number of simulated seconds on every machine — the same
reason the physics live there. `setLeft` fires only when the displayed second
changes; the first version re-rendered the component sixty times a second to
paint a number that changes once.

The free tuner reads time words in both languages — "two minutes", "90 seconds",
"a quick round", "dua minit", "bermasa" — and only when asked. "Quick" alone is
about pace, not length, so it has to say *what* is quick.

### The check was unreachable, and its own unit test passed

`roundVerdict` rejects a target nobody could score inside the budget. Wired at
the tail of the union's `superRefine`, it was dead for the flyer — **several
engine branches `return` early**, so anything appended at the bottom silently
applies only to the engines that fall through. `roundVerdict`'s own test passed
the whole time; only the test that parsed a full spec caught it. Moved ahead of
the branches.

The estimate behind it is a deliberate **over-estimate** — fastest world speed,
every collectible taken, no mistakes. That direction is chosen: an over-estimate
only fails to reject something borderline, while an under-estimate turns away
winnable games, and the rejection is what a person sees. A test pins the
direction by asserting no bundled fixture is refused a three-minute round.

### The fixture barrel said "GENERATED" and was not

`lib/arcade/fixtures.ts` carried `GENERATED - do not hand-edit. Regenerate: npm
run fixtures` while that command only ever wrote the legacy `lib/spec` barrel.
Adding an arcade fixture looked like one command and was a silent no-op followed
by a confusing 404. The generator now writes both, and derives `ARCADE_ACCEPTED`
from the filename — `.invalid`, `.unplayable` and `.trivial` exist to be
rejected — instead of a second hand-maintained list. Regenerating reproduced the
hand-written file exactly, which is what says the derivation is right.

### Verified on the deployed site

| Check | Result |
| --- | --- |
| Clock counts down while playing | 2:00 → 1:53 |
| **Losing a life never refills it** | 3 deaths, monotonic, never once refilled |
| Under ten seconds turns urgent | captured at 0:09 |
| Round ends on the clock | panel reads **Time!** |
| Panel reports time left when lives run out first | "0:06 left on the clock" |

Also fixed by looking: the clock was top-centre, straight through the canvas
score every engine draws there — a 0:09 pill across snake's "0/30". It sits
beside the mute button now.

**Pending, written down rather than remembered**

Before this repo is ever made public, a **deliberate scrub pass**: the two Figma
file keys (8 places, incl. `app/ds/tokens.css`, `lib/ds/tokens.generated.ts`,
`lib/ds/tokens.raw.json`, `docs/`), and the internal notes and names throughout
`docs/`. The 336 DS colour values are a separate decision and need Pandai's
sign-off, not a redaction. Repo is being made private first; nothing is pushed
until it is.

**Not done**

- Power-ups. The runner and snake still have flat physics.

---

## 2026-09-07 (later again) — Ranged runner physics, and power-ups

Model still off. The last two items on the adopt list.

### The runner ramps now

`scrollSpeed`, `spacing` and `obstacleHeight` are `{start, end}` over
`rampOverObstacles`, like the flyer. Obstacle positions became a **running sum**
rather than `index * spacing`, because once spacing ramps the two disagree and
the renderer would place obstacles somewhere the check never looked.

The check walks the whole ramp. Being accurate about why: for these two
quantities the extreme is provably at an END - `obstacleHeight` is linear in t,
and `spacing / scrollSpeed` is a ratio of linear functions, so monotonic - so
sampling the ends would be enough today. It is walked anyway so the failure can
say HOW FAR into the ramp it breaks, and so a future non-linear field does not
silently go unsampled. The first draft of that comment claimed the middle could
be worse, which is false; corrected rather than left to mislead.

Three runner fixtures migrated, the tuner reads the same escalation words as the
flyer, and the fuzz harness learned to draw `{start, end}` pairs with the two
ends drawn INDEPENDENTLY - a fuzz that only drew matched pairs would never build
the worst combination.

**One test of mine was wrong, not the code.** I asserted a 90px obstacle was
unclearable against a 700 flap under gravity 2000. That jump peaks at 122px, so
it clears comfortably; and since the schema caps height at 90, no legal height
is unclearable at that gravity. Fixed the test's physics, not the check.

### Power-ups: magnet and Power Rush

`lib/arcade/powerups.ts`, wired into the flyer. Rolls every 8s at 70%, one at a
time, deterministic from the spec.

**The rule the design rests on: a power-up may only ever make a run EASIER.**
That is not taste, it is what keeps the playability guarantee true.
`flyerPlayability` proves a perfect player survives *these* physics; a power-up
that sped the world up would leave that proof describing a game that no longer
exists - the exact failure this repo has now caught itself in four times. So
Power Rush **retracts obstacles** rather than accelerating the world, unlike the
reference, which has no such guarantee to protect. A test asserts there is no
speed multiplier anywhere in the module.

Three things fixed by measuring rather than assuming:

1. **The bubble spawned three and a half gaps ahead** - about eleven seconds of
   travel. Most rolls were spent on a bubble the run ended before reaching, and
   a player never saw it coming. Now just over one gap out.
2. **The HUD was dark ink on a night sky.** Same bug as the hearts, same cause:
   the canvas can be any colour now, so anything drawn on it carries its own
   contrast. It goes through the score painter, which strokes white behind ink.
3. **The seed was `JSON.stringify(rules)`.** Key order in a parsed Zod object
   follows the schema definition, so reordering two fields would have silently
   changed the power-up sequence of every game ever generated. Now
   `engine:title` - distinctive, and stable under refactors that change nothing.

A power-up also got its own sound, a rising four-note run at 1568Hz, because it
is a different KIND of thing from a coin - and because a unique pitch is what
made pickups countable in a probe.

### Verified on the deployed site

| Check | Result |
| --- | --- |
| Power-ups collected in play (1568Hz, unique) | **6** |
| Magnet drags coins to the player | photographed |
| HUD legible on a night scene | photographed |
| Ranged runner renders and plays | yes |
| Round clock still shared across deaths | 2:00 -> 1:52, never refilled |

**Not verified, and worth saying plainly:** the rush's obstacle-retraction was
not photographed in play. Its state is unit-tested and the renderer reads that
flag, but a scripted pilot has to fly into one specific bubble and kept missing.
I tried to predict a rush seed and got that wrong twice - the second time
because `JSON.stringify` of a parsed object was not reproducible outside the
app, which is what exposed the seeding flaw above. Worth a human playing
`/play/arcade?game=endless-flyer.valid` for a minute.

**Not done**

- Power-ups are flyer-only; the runner has coins but no bubbles.
- A fighting engine - see SCOPE, which now says what it would take rather than
  refusing.

---

## 2026-09-07 — The fighting game exists

Model still off. A sixth engine, `duel`.

### It was never about assets

The recorded reason for refusing a fighting game was that Pandai's avatars are
single static PNGs. That fact is true and the conclusion drawn from it was
wrong: **this renderer already animates static sprites procedurally.** A lunge
is a translate, a block is a crouch and a lean away, a hit is a recoil, a
knockdown is a rotation. `drawCharacter` had been doing exactly this for the
flyer's tilt since the first week, and nobody has ever asked where the frames
are. The blocker was code, and Zul had to ask twice before I checked instead of
repeating myself.

### A sparring match, not a fight to the death

The audience is Malaysian schoolchildren and the system prompt already forbids
anything frightening. Hits score points and knock the loser over. No blood, no
finisher, and the loser gets up.

### The opponent's reaction time IS the difficulty

An AI that reads inputs frame-perfectly is unbeatable and feels like cheating.
This one has a stated `opponentReaction` and obeys it: it must SEE a windup
before it can block, and see an opening before it can punish. Slower than
`strikeWindup` and the player lands clean hits; faster and every strike is read,
so the player has to bait a block and hit the gap behind it. Faster than about
half the windup is simply unwinnable, and rejected.

That design choice is also what makes the engine CHECKABLE, which is why it was
made: "can a player land a hit?" becomes a question a simulation can answer.

### Getting the check honest took four passes

`duelPlayability` runs a competent player against the specified opponent. The
first three versions were all wrong in instructive ways:

1. **Too passive.** The player waited for a "punishable" opening a defensive
   opponent never gives - **84% of legal specs rejected.** A wrong rejection is
   worse than a missed one, because the rejection is what a person sees.
2. **No defence.** The player never blocked, so it walked into every aggressive
   opponent and lost - still 77% rejected. It is credited with a fixed 0.22s
   human reaction now; fixed, not derived from the spec, or a check that scaled
   the player's reflexes to match could never reject anything.
3. **The opponent punished instantly.** `opponentReaction` gated only its
   blocks, so a slow, supposedly easy opponent still counter-hit flawlessly -
   and `opponentReaction` was not really the dial it claimed to be.
4. **The opponent only ever reacted.** Once punishing was gated properly, any
   opponent slower than the player's recovery never scored at all, so 332 of 348
   accepted specs came out "trivial". A fighter that only reacts is not a
   fighter; it takes the initiative on a tempo set by aggression now.

Final spread over 3000 fuzzed legal specs: 406 good, 399 trivial, 1848 lose,
344 land nothing, **3 stall**. That last branch is rare but real, and its test
is pinned to an actual fuzz case - my hand-written attempt at a stalling spec
lost instead, which is precisely why losing and stalling have separate reasons.

The bundled `duel.valid` was rejected on first run, correctly: a competent
player landed 4 of 5 while taking 3 of 3. Its numbers came from a search for a
spec the check calls playable AND not trivial, rather than from my judgement.

### And a bug two engines old

Putting two characters side by side finally explained something I had been
looking at for days. `pbot-dizzy.svg` was exported from an **error modal** in
Figma and brought the modal with it - a full-bleed dark scrim and a dialog
border, behind the robot, covering the whole viewBox. Every knocked-out PBot
appeared on a grey card. I had seen it in the flyer's death frame and read it as
a particle burst; only a frame with one boxed character and one clean one made
it obvious. `scripts/clean-character-svgs.mjs` strips the chrome from four
sprites. `pbot.svg` keeps a dashed Figma frame rect, which is stroke-only with
every edge outside the viewBox and therefore draws nothing - left alone rather
than edit a Pandai asset further than the bug required.

### Verified on the deployed site

| Check | Result |
| --- | --- |
| `duel.valid` renders and plays | yes, no page errors |
| "a mortal kombat style fighting game" | **makes a game** - the no-engine message is gone |
| `duel.unplayable` | rejected, no canvas |
| Knocked-out PBot | no box, in the duel and the flyer |

Play it: `/play/arcade?game=duel.valid`, or type a fighting prompt into
`/create`. Tap the top of the stage to strike, left or right to step; on a
keyboard, space strikes and the arrows walk.

**Not done**

- The duel has no round timer wired in, though `scoring.timeLimit` would work.
- The stage is one flat plane with a lot of empty sky above it.
- Power-ups are still flyer-only.

---

## 2026-09-07 — The game was eating the prompt box

Reported by Zul: on `/create`, once a game has been generated you cannot edit
your prompt any more. Space and Enter do nothing in the textarea.

**Cause, entirely mine.** `GameFrame` listens for keys on **window**, because a
canvas game has to respond to the keyboard without the player clicking it first.
It then calls `preventDefault()` on Space, Enter and the arrows. On `/play/arcade`
that is harmless - nothing else on the page wants those keys. On `/create` the
game renders directly beneath the prompt box, so every space in the sentence you
were trying to edit was swallowed before the textarea saw it.

`preventDefault` on a global handler is a promise that nothing else on the page
needs that key, and `/create` broke that promise the day it was built.

**Fix:** the handler now ignores keystrokes whose target is an `input`,
`textarea`, `select`, or anything `contenteditable`.

**Verified on the deployed site, both directions** - the second half matters,
because the obvious fix is to make the game stop listening and quietly break
every other page:

| Check | Result |
| --- | --- |
| Type "a hard duel with Nadia\nat night" after generating | lands intact, spaces and newline |
| Game stays on its title screen while typing | yes |
| `/play/arcade` - space still starts the game | yes |
| `/create` - click the canvas, then space plays | yes |

**A note on the test, not the code.** My first assertion for "did the game
start?" matched the word *Play* in the page text - which is now a link in the
site nav on every page, so it matched forever and reported a false failure. The
tell has to be the title panel's own hint text. Second time this session an
assertion has been wrong rather than the thing it measured.

**Worth knowing:** nothing in the suite renders a page, so no test would have
caught this. It needed a person typing, which is exactly what it got.
