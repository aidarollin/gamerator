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
| `lib/arcade/schema.ts` | `ArcadeSpec` 2.0, five engines, all validation |
| `lib/arcade/simulate.ts` | The **playability simulation** for the flyer |
| `lib/arcade/engines.ts` | Playability checks for the other four engines |
| `lib/arcade/ramp.ts` | Ranged physics — `{start, end}` over obstacles |
| `lib/arcade/generate.ts` | The **stub tuner**: words → physics, in code, free |
| `lib/arcade/live.ts` | The model provider. **Wired but unreachable** — see below |
| `lib/arcade/brief.ts` | Engine routing, including the honest no-engine answer |
| `components/arcade/` | `GameFrame` (shell) + `engines.tsx` (five factories) |
| `components/arcade/paint.ts` | Shared drawing: sky, parallax, blocks, ground |
| `components/arcade/art.ts` | Authored SVGs, tinted from DS tokens at draw time |
| `lib/ds/tokens.generated.ts` | 366 Pandai DS 1.5 tokens. **Generated** |
| `lib/spec/`, `components/game/` | The **legacy learning templates**. Still work, not the product |

## The model is OFF, deliberately

Zul asked for it to stay off until he says otherwise. It is off three ways:

1. Nothing imports `lib/arcade/live.ts`.
2. `providerMode()` returns `"stub"` unless `GAMERATOR_PROVIDER=live`.
3. The paid spec `lib/arcade/live-once.spec.ts` is excluded from `npm test` —
   the default include is `lib/**/*.test.ts` and it is `.spec.ts`. Running it
   needs `vitest.live.mts` named explicitly.

**Do not turn it on without being asked.** When asked, it also needs a spend
ceiling and a rate limit first (Phase 7), or a loop runs up a real bill.

Provider is **OpenRouter**. Two settings move together and the base URL stops at
`/api` — the SDK appends `/v1/messages` itself. And **`output_config.format` is
NOT enforced through OpenRouter**; generation uses **strict tool use**. See
[docs/STATUS.md](docs/STATUS.md) for how that was found out the expensive way.

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

**A playability check must be able to fire.** brick-breaker's shipped as dead
code — the fastest legal ball against the slowest legal paddle still passed, so
it could never reject anything. `engines.test.ts` fuzzes every check across its
own bounds and asserts each both accepts and rejects. A check that cannot fire
is worse than none: it reads as coverage.

**The simulation must reach the hardest point of the ramp.** Physics ramp now, so
a fixed window would only sample the gentle opening. It runs
`rampOverObstacles + 4`.

**Colour cannot be expressed as a value.** `theme.palette` is a DS subject or
accent key. Authored art is a white silhouette tinted at draw time. `check:ds`
enforces it; `check:tokens` catches dangling `var(--…)`.

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
