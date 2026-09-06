# gamerator

A generator for **Pandai-skinned arcade games**. Describe a game — *"a hard
flappy bird with PBot through chemistry pink pipes"* — and get a playable one,
wearing the real Pandai mascots and design system, with an export a Pandai
engineer can drop into the product.

The AI never writes game code. It emits a schema-validated **ArcadeSpec**;
hand-written deterministic engines play it. That one constraint is what makes
the output safe, on-brand, testable and cheap — and it is what allows a
generated game to be **simulated for playability before anyone sees it**.

## Live

<https://gamerator.aidaasofiah.workers.dev>

| Page | What |
| --- | --- |
| [/create](https://gamerator.aidaasofiah.workers.dev/create) | Describe a game, play it, export it |
| [/play/arcade](https://gamerator.aidaasofiah.workers.dev/play/arcade) | All 21 fixtures across five engines |
| [/ds](https://gamerator.aidaasofiah.workers.dev/ds) | Every DS primitive in all 19 subject palettes |
| [/embed](https://gamerator.aidaasofiah.workers.dev/embed) | The embeddable surface Pandai drops into Blade |

## Status

Five engines built: `endless-flyer`, `endless-runner`, `brick-breaker`, `snake`,
`platformer`. 366 Pandai DS 1.5 tokens vendored. Flyer physics ramp across a
run. **The model is deliberately off** — `/create` runs a free deterministic
tuner; see [CLAUDE.md](CLAUDE.md). Read [docs/STATUS.md](docs/STATUS.md) first in
every session.

## The docs pack

`docs/` is this project's working memory. Read the relevant page before changing
anything structural, and keep it true afterwards.

| Doc | Read it when |
| --- | --- |
| [STATUS.md](docs/STATUS.md) | **Start of every session** — dated log and live blockers |
| [ENGINES.md](docs/ENGINES.md) | The arcade catalog and the ArcadeSpec |
| [SCOPE.md](docs/SCOPE.md) | Before adding anything — names what is deliberately not built |
| [EXPORT.md](docs/EXPORT.md) | Getting a game into Pandai |
| [SCREENSHOTS.md](docs/SCREENSHOTS.md) | After any visual change — verify by looking |
| [REFERENCE-FLYING-SUSHI.md](docs/REFERENCE-FLYING-SUSHI.md) | Zul's own game, and what to adopt from it |
| [TECHNICAL-PLAN.md](docs/TECHNICAL-PLAN.md) | Architecture, stack, and the ten build gotchas |
| [PROJECT.md](docs/PROJECT.md) | Problem, users, objectives, program fit |
| [DESIGN-SYSTEM-SYNC.md](docs/DESIGN-SYSTEM-SYNC.md) | Before any Figma work |
| [BUILD-GUIDE.md](docs/BUILD-GUIDE.md) | The phased build |
| [GAMESPEC.md](docs/GAMESPEC.md) | **Legacy** — the learning templates, superseded by ENGINES.md |
| [AUTHORING-GUIDELINES.md](docs/AUTHORING-GUIDELINES.md) | **Legacy** — written for the learning product |

## Relationship to the training program

This is a product repo. The twelve-week
[training-ai-fde](https://github.com/) submissions live in their own repo, one
folder per week; each week's folder carries the write-up and links to a tagged
release here. See [PROJECT.md § Program fit](docs/PROJECT.md#program-fit) for the
three places this arrangement needs a decision from the teaching team.

## Run it

```bash
npm install
npm run build      # opennextjs-cloudflare build; stop the dev server first
npm run check      # typecheck + lint + DS gates. Needs one prior build.
npm test           # 38 tests: schema, fixtures, seeded shuffle. No API key.
npm run tokens     # regenerate the DS token layer from lib/ds/tokens.raw.json
npm run fixtures   # regenerate the bundled fixture index after adding one
npm run dev        # Next dev server
npx wrangler dev   # the real Worker runtime, against .open-next/
```

To deploy:

```bash
npx wrangler login
npm run deploy
```

Deploys to the `aidaasofiah` Cloudflare account — see
[docs/STATUS.md](docs/STATUS.md) for why that is written down rather than
assumed.
