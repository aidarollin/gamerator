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
| `lib/arcade/schema.ts` | `ArcadeSpec` 2.0, six engines, all validation |
| `lib/arcade/simulate.ts` | The **playability simulation** for the flyer |
| `lib/arcade/engines.ts` | Playability checks for the other four engines |
| `lib/arcade/ramp.ts` | Ranged physics — `{start, end}` over obstacles |
| `lib/arcade/collect.ts` | Collectible geometry, **outside the closure so it can be tested** |
| `lib/arcade/level.ts` | Platformer levels, built reachable **by construction** |
| `lib/arcade/round.ts` | The round budget, **shared across retries** |
| `lib/arcade/powerups.ts` | Magnet and Power Rush. **May only make a run easier** |
| `lib/arcade/duel.ts` | The fighting engine's rules and its simulated match |
| `components/arcade/duel-engine.tsx` | The duel renderer, kept out of `engines.tsx` |
| `lib/arcade/generate.ts` | The **stub tuner**: words → physics, in code, free |
| `lib/arcade/live.ts` | The model provider. Strict tool use |
| `lib/arcade/live-generate.ts` | guard → cache → model → validate → repair → validate |
| `lib/arcade/guard.ts` | **The spending wall.** Nothing paid runs without it |
| `lib/arcade/brief.ts` | Engine routing, including the honest no-engine answer |
| `components/arcade/` | `GameFrame` (shell) + `engines.tsx` (five factories) |
| `components/arcade/paint.ts` | Shared drawing: sky, parallax, blocks, ground |
| `components/arcade/art.ts` | Authored SVGs, tinted from the palette at draw time |
| `components/arcade/sound.ts` | Synthesised audio. **No files** - Web Audio at runtime |
| `lib/arcade/palettes.ts` | The **arcade scenes**. The one file allowed hand-picked colour |
| `lib/ds/tokens.generated.ts` | 366 Pandai DS 1.5 tokens. **Generated** |
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

**Anything drawn OVER the canvas needs its own contrast.** The hearts are DS
pink and were invisible on a chemistry game, which is pink. The canvas can be
any colour now; DOM overlays cannot assume a DS surface behind them.

**Shell quoting has corrupted content three times.** `python -c "..."` lets bash
expand backticks; a heredoc without quoting turned `\b` into literal backspace
characters and silently broke a routing regex. **Use `<<'EOF'` for any content
with backticks or backslashes**, or the Write tool.

**Build gotchas** — full list in
[docs/TECHNICAL-PLAN.md](docs/TECHNICAL-PLAN.md), numbered 1–10. The ones that
cost the most: `npm run build` must stay `opennextjs-cloudflare build`;
`open-next.config.ts` needs `buildCommand: "npm run build:next"`;
`next.config.ts` cannot be top-level-await; **a Worker has no filesystem**, so
anything read at runtime must be a static import; `esbuild` must stay an
explicit devDependency; stop the dev server before building.

**Never pipe `npm run check` into `tail`** — you get `tail`'s exit code and a
failing gate looks green. That happened, and a broken typecheck was committed.

## Commands

```bash
npm run check     # typecheck + lint + check:ds + check:tokens + tests
npm run build     # opennextjs-cloudflare build (stop the dev server first)
npx wrangler deploy
npm run tokens    # regenerate the DS token layer
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
