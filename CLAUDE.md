# CLAUDE.md

**gamerator** — an internal game generator for the Pandai content team. A content
designer describes a learning game; the system produces a playable, Pandai
Design System 1.5 faithful game and an export the product team can consume.

Read [README.md](README.md) for the docs pack index and
[docs/STATUS.md](docs/STATUS.md) at the start of every session for live blockers.
Nothing is built yet — [docs/BUILD-GUIDE.md](docs/BUILD-GUIDE.md) is the order of
work.

## The rule the whole system rests on

**The model emits data, not code.** A prompt produces a `GameSpec` — validated
JSON — and a hand-written deterministic renderer plays it. If you find yourself
generating JavaScript, HTML, or CSS from a model call, stop: that is a different
architecture and [docs/SCOPE.md](docs/SCOPE.md) explicitly excludes it.

## Things that will bite you

**Nothing renders that has not passed `safeParse`.** The renderer's prop type is
the parsed `GameSpec`, not `unknown` and not a hand-written interface — an
unvalidated object cannot reach it without a type error. Do not weaken that type
to make a test easier. It is the property that makes this safe to point at
children's learning material.

**Model output is never `eval`'d, injected, or passed to
`dangerouslySetInnerHTML`.** Every string from a spec is a text node. There is no
performance argument that outweighs this.

**Colour cannot be expressed as a value.** `accent` is an enum of semantic names
that code maps to DS tokens. Never add a free-form colour field to the schema —
it would undo DS fidelity in one commit. The `Accent` enum and the
accent-to-token map are a pair; a test asserts every member resolves.

**Figma MCP is design-time only, never in the request path.** It is per-seat
authenticated and rate limited to roughly 200 calls a day. A Worker has no seat.
Tokens are synced into the repo by a human running a script. See
[docs/DESIGN-SYSTEM-SYNC.md](docs/DESIGN-SYSTEM-SYNC.md) — and load the
`/figma-use` skill before any `use_figma` call.

**Resolve every DS value in Student (green) mode.** DS colour families are
mode-scoped and a flat lookup silently returns a Teacher (pink) or Parent value.
A token that reads pink is wrong. Also: two Figma libraries answer variable
searches — match on `libraryName` before trusting a result.

**One repair turn, not a loop.** A spec that fails validation twice means the
prompt or the schema is wrong. Retrying is a way of not finding that out.

**The system prompt is a frozen cache prefix.** No timestamps, no per-request
ids, no unsorted iteration. Verify with `usage.cache_read_input_tokens`; a zero
across repeated requests means something in the prefix is moving.

**Two error paths in the SSE route, and they are not interchangeable.** Before
the stream opens, fail with an HTTP status. After the first byte the status is
locked at 200, so failures must be emitted as error stream events.

**Versions are immutable.** An edit inserts a `game_versions` row; it never
updates one.

**`ANTHROPIC_API_KEY` is server-only** — a Worker secret in production,
`.env.local` in development. Note that `.dev.vars` does *not* give `next dev` a
key: it populates `getCloudflareContext().env`, while the route reads
`process.env`. The dev server's "Using secrets defined in .dev.vars" line looks
like it worked and did not.

**Build gotchas carried from askpbot** — `npm run build` must stay
`opennextjs-cloudflare build`; `open-next.config.ts` needs
`buildCommand: "npm run build:next"` or the build recurses into itself;
`initOpenNextCloudflareForDev()` stays guarded by `NODE_ENV === "development"`;
stop the dev server before building. Full explanations in
[docs/TECHNICAL-PLAN.md](docs/TECHNICAL-PLAN.md).

**`next.config.ts` must not be top-level-await.** Next 16 `require()`s the
compiled config, so an `await import(...)` — or awaiting
`initOpenNextCloudflareForDev()` — fails the build with
`ERR_REQUIRE_ASYNC_MODULE`. Static import, `void` the call. The error names
`next.config.compiled.js` and never points at the line responsible. Hit and fixed
in Phase 1; do not reintroduce it while tidying that file.

**Build before check on a fresh clone.** `app/layout.tsx` uses
`LayoutProps<"/">`, a Next 16 route type generated into `.next/types`. Run
`npm run check` first and `tsc` fails with `Cannot find name 'LayoutProps'`,
which reads like a broken tsconfig and is only missing generated types.

**A Worker has no filesystem, and `next dev` will not tell you.** `node:fs` at
request time works in the dev server and throws `ENOENT ... readdir '/bundle/…'`
in the deployed Worker. Anything the server reads at runtime must be a static
import, bundled at build time — that is why `lib/spec/fixtures.generated.ts`
exists. **Verify server-side data access against `wrangler dev`.**

**`esbuild` stays an explicit devDependency.** `@opennextjs/cloudflare` imports
it while declaring it nowhere, relying on hoisting. Anything that reorganises
the dependency tree de-hoists it and the build dies with
`Cannot find package 'esbuild'`. Pinned at 0.28 to satisfy vite 8; verified
working. Do not remove it because nothing appears to import it.

**Shuffling is seeded from the spec, never `Math.random()`.** NFR2 requires the
same spec to produce the same game; unseeded shuffling also breaks hydration,
because the server and client draw different orders. Use `seededShuffle` with
`specSeed` from `lib/game/random.ts`.

**Do not use HTML5 drag and drop in a renderer.** It is not keyboard operable,
which puts NFR8 out of reach for the whole template. `SortBuckets` and
`SequenceOrder` use select-then-place and move-up/move-down for this reason.

## Model

`claude-opus-5` via the official `@anthropic-ai/sdk`. Structured output through
`client.messages.parse()` with `zodOutputFormat(GameSpec)` and
`output_config: { format: ... }` — not the deprecated `output_format`. Thinking
is `{ type: "adaptive" }`; `budget_tokens` returns a 400 on this model. Assistant
prefill also returns a 400 — shape output with the schema, not a primed turn.
Check `stop_reason` for `"refusal"` before reading content.

## Docs discipline

1. The docs describe what exists, not what is planned. Anything unbuilt is marked
   unbuilt.
2. Never write a command nobody has run.
3. Append to `docs/STATUS.md` every working session, dated that day. Never
   backdate.
4. Adding a feature means checking `docs/SCOPE.md` first.
5. If code and docs disagree, that is a bug in the docs — fix it in the same
   change.

## Secrets

No API keys, tokens, or `.env` files in version control. Credentials come from
environment variables at runtime. `.env.example` is the committed template and
must stay in sync when config options change.
