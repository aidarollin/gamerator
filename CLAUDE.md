# CLAUDE.md

**gamerator** — a generator for **Pandai-skinned arcade games**. Someone
describes a game ("a hard flappy bird with PBot through chemistry pink pipes")
and gets a playable one, wearing the real Pandai mascots and the real design
system, with an export a Pandai engineer can drop in.

Read [docs/STATUS.md](docs/STATUS.md) at the start of every session — it is the
dated log and carries the live blockers.

Live: <https://gamerator.aidaasofiah.workers.dev> ·
`/create` (describe a game) · `/play/arcade` (fixtures) · `/ds` (design system)

## The rule the whole system rests on

**The model emits data, not code.** A prompt produces an `ArcadeSpec` —
validated JSON naming an engine, its physics, its palette and its character — and
a hand-written deterministic engine plays it. If you find yourself generating
JavaScript from a model call, stop: [docs/SCOPE.md](docs/SCOPE.md) excludes it.

## Where things are

| Path | What |
| --- | --- |
| `lib/arcade/catalogue.ts` | **Every game somebody might prompt**, and what happens to it |
| `lib/games.ts` | One door: arcade engines AND the DS learning templates |
| `lib/inputs/` | Reading a pasted link and an uploaded picture, safely |
| `lib/arcade/schema.ts` | `ArcadeSpec` 2.0, ten engines, all validation |
| `lib/arcade/simulate.ts` | The **playability simulation** for the flyer |
| `lib/arcade/engines.ts` | Playability checks for the other four engines |
| `lib/arcade/ramp.ts` | Ranged physics — `{start, end}` over obstacles |
| `lib/arcade/collect.ts` | Collectible geometry, **outside the closure so it can be tested** |
| `lib/arcade/level.ts` | Platformer levels, built reachable **by construction** |
| `lib/arcade/round.ts` | The round budget, **shared across retries** |
| `lib/arcade/powerups.ts` | Magnet and Power Rush. **May only make a run easier** |
| `lib/arcade/duel.ts` | The fighting engine's rules and its simulated match |
| `lib/arcade/shooter.ts` | Space invaders: fleet geometry and its three timings |
| `lib/arcade/maze.ts` | Pac-Man: the maze, the chasers, and a **full simulation** |
| `lib/arcade/blocks.ts` | Tetris: the seven pieces and the placement-time check |
| `lib/arcade/match3.ts` | Match-3: board, matches, collapse, "is there a move" |
| `components/arcade/*-engine.tsx` | One renderer per newer engine, out of `engines.tsx` |
| `lib/gallery.ts` | The fifteen cards on `/create`, **derived** from the catalogue |
| `components/arcade/EnginePreview.tsx` | An arcade card playing itself. Real engine, attract mode |
| `components/arcade/TemplatePreview.tsx` | A learning-template card: the real renderer, scaled |
| `components/arcade/palette-for.ts` | Scene-then-DS colour, shared by the game and its preview |
| `lib/arcade/generate.ts` | The **stub tuner**: words → physics, in code, free. `tuneArcade` cannot reach a model |
| `lib/deck.ts` | Every demo in `/deck`, **computed** by the real router, tuner and validator |
| `lib/arcade/live.ts` | The model provider. Strict tool use |
| `lib/arcade/live-generate.ts` | guard → cache → model → validate → repair → validate |
| `lib/arcade/guard.ts` | **The spending wall.** Nothing paid runs without it |
| `lib/arcade/brief.ts` | Engine routing: an engine, an **adaptation**, or an honest no |
| `components/arcade/` | `GameFrame` (shell) + `engines.tsx` (the first six) |
| `components/arcade/paint.ts` | Shared drawing: sky, parallax, blocks, ground |
| `components/arcade/art.ts` | Authored SVGs, tinted from the palette at draw time |
| `components/arcade/sound.ts` | Synthesised audio. **No files** - Web Audio at runtime |
| `lib/arcade/palettes.ts` | The **arcade scenes**. The one file allowed hand-picked colour |
| `lib/ds/tokens.generated.ts` | 366 Pandai DS 1.5 tokens from Figma. **Generated** |
| `app/ds/pandai-app.css` | The Pandai **product's** layer: Poppins type scale, motion, aliases. **Generated** |
| `scripts/sync-app-ds.mjs` | Reads `../pandai.question.uiux` (read-only) and writes the file above |
| `lib/spec/`, `components/game/` | The **legacy learning templates**. Still work, not the product |

## The model is ON, behind a wall

Zul switched it on. `lib/arcade/live-generate.ts` is the path:

    guard -> cache -> model -> VALIDATE -> repair once -> VALIDATE -> give up

**`lib/arcade/guard.ts` is the only thing between a bug and a real bill.**
Nothing may reach a paid model without passing it. It counts CALLS and TOKENS,
not dollars, because a ceiling built on a guessed per-token price fails in
whichever direction the guess was wrong. Defaults: 120 generations a day, 12 per
client per hour, `MAX_OUTPUT_TOKENS` 2500.

**It is a speed bump, not a guarantee.** A Worker has no shared memory, so each
isolate holds its own counters. The real ceiling has to be a hard credit limit
on the OpenRouter key, which lives in their dashboard and not in this repo.

**The cache is a cost control, not an optimisation.** `/create` reads its brief
from the QUERY STRING, so a refresh, a shared link, the back button or a preview
crawler each re-render it - every one of those was a fresh paid call until
identical briefs started returning the identical spec.

**Production is still stub** unless a Worker secret and `GAMERATOR_PROVIDER=live`
are both set. Deploying this code does not spend anything.

**The model never sees three fields.** Strict tool use requires every property,
so an "optional" field becomes one the model is compelled to invent - a gentle
snake game for Year 1 came back with a countdown nobody asked for. So
`contentTwist`, `theme.opponent` and `scoring.timeLimit` are dropped from its
schema and derived in code.

**Where a relationship keeps getting missed, enforce it rather than explain
it.** Three paid repair turns went on "a brutal two minute duel" before
`playableDuel` clamped the numbers into the region the simulation accepts. The
model chooses the character of a game; code enforces what makes it winnable.
Same idea as `lib/arcade/level.ts`.

Provider is **OpenRouter**. Two settings move together and the base URL stops at
`/api` - the SDK appends `/v1/messages` itself. And **`output_config.format` is
NOT enforced through OpenRouter**; generation uses **strict tool use**.

## Things that will bite you

**Verify by LOOKING, not just by HTTP.** Three real bugs shipped past checks
that returned 200 with the right strings: a white box around the Nadia and Aidan
avatars, brick-breaker being unplayable by keyboard, and a platformer floating in
empty space. See [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md) — capturing a screen
is two commands and it finds what grep cannot.

**The renderer and the simulation must generate the level the same way.** Both
call `gapCentres` and `flyerAt`. If a renderer ramps or spawns any other way,
the playability check is verifying a game nobody plays, and the whole guarantee
is theatre.

**A hoisted `function` and a `const` arrow are not interchangeable.** The engine
factories `return` an object and then declare helpers *below* it — legal, because
`function` declarations hoist. Replace one with `const fn = () => …` in the same
place and it is never evaluated: the return runs first, every call hits the
temporal dead zone, and the canvas renders the sky and then stops. `npm run
check` stayed green — TypeScript does not track use-before-init across a
closure, and no test renders. Only a screenshot showed the missing bird.

**Your measuring instrument can share a signal with the thing it measures.**
Three of these in one session, each producing a confident wrong number:

- Counting the 440 Hz score chirp counted the **music**, which plays 440 too.
- Finding the ball by "lowest dark pixel" found **PBot's visor**, which is the
  same ink and sits lower — the paddle parked in the corner for an entire run.
- Chasing gold to catch a coin chased the **burst particles**, which are also
  gold and also fall.

Before trusting a probe, ask what else produces the signal it keys on.

**A scripted pilot is not a player.** Tapping on a fixed interval settles the
flyer into one altitude band; if that band misses the coin line it misses
*every* coin, forever, and reports zero. Jitter the cadence, or read the canvas.

**Optional things hide their own bugs.** A coin nobody collects looks exactly
like a coin nobody wanted, so a broken collectible ships silently. That is why
the geometry moved out of the closure into `lib/arcade/collect.ts` — a rule
trapped in a closure cannot be measured, only played and watched.

**A wrong rejection is worse than a missed one.** The person sees the
rejection. `duelPlayability` went through three versions that turned away 84%,
then 77%, then most-as-trivial of perfectly legal specs, each because the
SIMULATED PLAYER was modelled badly - too passive, then defenceless, then facing
an opponent that only reacted. When a check rejects most of its own bounds,
suspect the agent before the spec.

**A power-up may only ever make a run EASIER.** `flyerPlayability` proves a
perfect player survives *the spec's own* physics. Anything that speeds the world
up or narrows a gap mid-run leaves that proof describing a game that no longer
exists. It is why Power Rush retracts obstacles instead of accelerating, unlike
the reference it was adopted from.

**Do not seed from `JSON.stringify` of a parsed object.** Key order follows the
Zod schema's field order, so reordering two fields silently changes every seed
derived from it. Seed from something explicit and stable - `engine:title`.

**A check on one axis is not a check.** `platformerVerdict` compared a running
jump against the horizontal gap and passed levels that climbed 150px against a
144px jump. Whenever a rule constrains one dimension, ask what the other one is
doing — `reachAtRise` in `lib/arcade/level.ts` is the honest version.

**A playability check must be able to fire.** brick-breaker's shipped as dead
code — the fastest legal ball against the slowest legal paddle still passed, so
it could never reject anything. `engines.test.ts` fuzzes every check across its
own bounds and asserts each both accepts and rejects. A check that cannot fire
is worse than none: it reads as coverage.

**The simulation must reach the hardest point of the ramp.** Physics ramp now, so
a fixed window would only sample the gentle opening. It runs
`rampOverObstacles + 4`.

**Colour is a palette, not a value.** `theme.palette` is still a DS subject or
accent key - it names an identity, never a hex. That key resolves to an
**arcade scene** (`lib/arcade/palettes.ts`), and only if none matches does it
fall back to the DS token ramp. Authored art is a white silhouette tinted at
draw time, so it follows whichever wins.

A scene carries TWO families - `sky` and `solid` - and that split is most of
why a game looks like a game. One ramp painting both is how the obstacles ended
up looking like the sky in a darker tint. If you add a scene, check the two
families read as different materials: the first `forest` was green on green and
the platformer came out as one flat sheet.

`palettes.ts` is the ONLY file outside the generated token layer allowed to
hold colour, by Zul's decision on 2026-09-06, and `scripts/check-ds.mjs` names
it explicitly. Everything else - all chrome, every component - is still held to
tokens. `check:tokens` catches dangling `var(--…)`.

**The DS has TWO sources, and they do different jobs.** Figma gives colour,
spacing and radius (`npm run tokens`). The Pandai product repo gives Poppins,
the nineteen type roles, the tablet/mobile steps and motion (`npm run
tokens:app`), and where the product has changed a Figma value on purpose, the
product wins - every such difference is printed on every sync. One product
alias is refused: its `--radius-xl` is an 8px nav button, the DS's is 16px, and
every card here uses the DS one.

**Type is a ROLE, not a size.** A role is size AND line-height AND weight -
`font-size: var(--type-b3); line-height: var(--type-b3-lh); font-weight: 400`,
or the `.type-b3` class. Citing one role's size with another's weight renders
fine today and breaks the day either is retuned. Raw `font-size` in pixels is
only for things that are not text: a heart glyph, the 56px score numeral.

**A NEW INPUT HAS TO REACH THE ROUTER, not just the model.** Notes and a
reference link were sent to the model while `chooseGame` still read only the one
short line, so pasting a design document and typing "make this" was a coin flip.
`routableText` is the whole request; every keyword decision reads it.

**An input that looks accepted and silently does nothing is the same lie as an
unannounced adaptation.** Every extra input reports what it actually did - a
link that 404ed, a picture in a deployment with no model. Otherwise the person
swaps the picture, gets the same game, and concludes the product is broken.

**Three answers to "what game is this?", not two.** An engine, an ADAPTATION
(a racing game is the runner wearing a different name - said out loud, to the
reader and to the model), or an honest no. A mapping earns a place only if the
VERBS match: racing and running are both "go forward, avoid things"; tetris and
snake share only a grid, which is why tetris got an engine instead of a mapping.
An explicitly named engine always wins over a mapping.

**A SILENT GUESS IS WORSE THAN A REFUSAL, and it is the failure that hides.**
Before `catalogue.ts`, anything the router did not recognise returned a flyer
with `confident: false` - pac-man, tetris, a penalty shootout, a horror game.
Nothing failed, every test passed, and it was the commonest outcome in the space
of things people actually type. A refusal is a bad answer somebody can act on; a
flyer they did not ask for is a wrong answer wearing the costume of a right one.
`catalogue.test.ts` now asserts no genre in the catalogue can fall through.

**A refusal needs a REASON, because refusal reasons here keep turning out to be
wrong.** "A fighting game" was refused for months on a claim about sprite sheets
that did not follow; it is the `duel` engine now. Every entry in the refused
list names what is actually missing, and that reason is shown to the reader.

**Anything the free tuner cannot produce is a feature only paying customers
have.** `catalogue.test.ts` tunes every engine at every difficulty and validates
it. First run: the tuner had NEVER produced a valid `duel`, at any difficulty,
because its coefficients were written against a difficulty scale that does not
exist - and nobody had noticed, because the duel fixtures are hand-written and
the model was on.

**Anything drawn OVER the canvas needs its own contrast.** The hearts are DS
pink and were invisible on a chemistry game, which is pink. The canvas can be
any colour now; DOM overlays cannot assume a DS surface behind them.

**Shell quoting has corrupted content three times.** `python -c "..."` lets bash
expand backticks; a heredoc without quoting turned `\b` into literal backspace
characters and silently broke a routing regex. **Use `<<'EOF'` for any content
with backticks or backslashes**, or the Write tool.

**Input is press / move / release, plus `control()`.** A drag used to arrive as
a stream of presses, so a wobbly tap flapped the bird three times. `move` is its
own kind now, and only brick-breaker, the shooter and match-3's swipe listen to
it. Engines that need directions implement `control(c, down)`, driven by the
thumb pad AND the arrow keys - arrows are no longer faked as taps at the screen
edge, which snake read relative to its head. Each pad button owns its pointer,
so walk-and-jump works; a release must only clear what THAT button set.

**A phone game must not share its finger with the page.** The stage is
`touch-action: pan-y` between runs, so a phone can still scroll past a game that
is nearly screen-wide, and `none` during a run. Tapping Play on a coarse pointer
takes the screen: the Fullscreen API where it exists, and on iPhone Safari -
which gives that API only to `<video>` - a fixed layer over a page locked by
`html[data-game-fullscreen]`. Headless Chromium here cannot scroll a page by
simulated touch AT ALL - a control swipe on plain text moved 0px - so check
scroll behaviour by the computed `touch-action`, or on a real phone.

**A new CSS file imported before it exists poisons the DEV cache.** Adding
`@import "./ds/pandai-app.css"` a moment before the sync first wrote the file
made every page 500 with `Can't resolve`, and it survived re-saving, a restart,
and clearing `.next/cache/turbopack` - because `next dev` in Next 16 keeps its
own on-disk cache in **`.next/dev/cache/turbopack`**, separate from the build's.
Tailwind run standalone resolved the file fine, which is what proved the CSS was
not the problem. Stop the dev server, delete `.next/dev/cache/turbopack`, start
it again. Better: generate a file before anything imports it.

**Build gotchas** — full list in
[docs/TECHNICAL-PLAN.md](docs/TECHNICAL-PLAN.md), numbered 1–11. The ones that
cost the most: `npm run build` must stay `opennextjs-cloudflare build`;
`open-next.config.ts` needs `buildCommand: "npm run build:next"`;
`next.config.ts` cannot be top-level-await; **a Worker has no filesystem**, so
anything read at runtime must be a static import; `esbuild` must stay an
explicit devDependency; stop the dev server before building.

**Never pipe `npm run check` into `tail`** — you get `tail`'s exit code and a
failing gate looks green. That happened, and a broken typecheck was committed.

## Commands

```bash
npm run dev       # free - physics derived from your words in code
npm run dev:live  # the model ON. Real money. See lib/arcade/guard.ts
npm run check     # typecheck + lint + check:ds + check:tokens + tests
npm run build     # opennextjs-cloudflare build (stop the dev server first)
npx wrangler deploy
npm run tokens    # regenerate the DS token layer (from Figma)
npm run tokens:app  # re-import the product's layer from ../pandai.question.uiux
npm run fixtures  # regenerate the bundled fixture index
```

`npm run check` needs one prior build on a fresh clone — `LayoutProps` is a
generated route type.

## Docs discipline

1. The docs describe what exists. Anything unbuilt is marked unbuilt.
2. Never write a command nobody has run.
3. Append to `docs/STATUS.md` every session, dated that day. Never backdate.
4. Check `docs/SCOPE.md` before adding a feature.
5. If code and docs disagree, that is a bug in the docs — fix it in the same
   change.

## Secrets

`ANTHROPIC_API_KEY` (an OpenRouter key) lives in `.env.local`, gitignored, never
committed and never echoed. It is not a Worker secret, so **the deployed site
cannot spend money**.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
