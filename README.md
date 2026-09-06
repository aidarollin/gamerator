# gamerator

An internal game generator for the Pandai content team. A content designer
describes a learning game in plain language — subject, year level, objective,
and the rules they want — and gets back a **playable, Pandai Design System 1.5
faithful game** in under three minutes, plus an export the product team can drop
into Pandai proper.

The AI never writes game code. It emits a schema-validated **GameSpec** (JSON);
a deterministic React renderer built from Pandai DS components plays any valid
spec. That one constraint is what makes the output safe, on-brand, testable and
cheap. See [docs/GAMESPEC.md](docs/GAMESPEC.md).

## Status

**Phases 1 and 2 complete.** Live at
<https://gamerator.aidaasofiah.workers.dev/>; the DS primitives are at `/ds`.
366 Pandai DS 1.5 tokens are vendored and every primitive renders in all 19
subject identities. Phase 3 (schema, fixtures, renderer — still no AI) is next.
Read [docs/STATUS.md](docs/STATUS.md) first in every session.

## The docs pack

`docs/` is this project's working memory. Read the relevant page before changing
anything structural, and keep it true afterwards.

| Doc | Read it when |
| --- | --- |
| [PROJECT.md](docs/PROJECT.md) | You need the problem, the objectives, and the requirements |
| [SCOPE.md](docs/SCOPE.md) | Before adding anything — it names what is deliberately not being built |
| [TECHNICAL-PLAN.md](docs/TECHNICAL-PLAN.md) | Before changing architecture, the stack, or deployment |
| [GAMESPEC.md](docs/GAMESPEC.md) | Before touching the schema, the template catalog, or the renderer |
| [AUTHORING-GUIDELINES.md](docs/AUTHORING-GUIDELINES.md) | The rules shown to the person describing a game |
| [DESIGN-SYSTEM-SYNC.md](docs/DESIGN-SYSTEM-SYNC.md) | Before any Figma MCP work — it says where Figma belongs and where it does not |
| [BUILD-GUIDE.md](docs/BUILD-GUIDE.md) | The phased build, start to finish |
| [STATUS.md](docs/STATUS.md) | Start of every session, to see the live blockers |

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
npm run tokens     # regenerate the DS token layer from lib/ds/tokens.raw.json
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
