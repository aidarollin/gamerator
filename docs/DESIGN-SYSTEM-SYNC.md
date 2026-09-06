# DESIGN SYSTEM SYNC — where Figma belongs, and where it does not

## The correction, first

The obvious mental model is "the app calls Figma MCP to build the game with real
Pandai components." **That model does not work, and building toward it would
waste weeks.** Three reasons, each sufficient on its own:

1. **Figma MCP authenticates per seat, not per application.** It carries a
   person's Figma identity. A Cloudflare Worker serving a content designer has
   no seat and cannot borrow one.
2. **It is rate limited per seat.** A Full or Dev seat on the Professional plan
   in Pandai Workspace v2 gets roughly 200 calls a day, 10 a minute. That is
   generous for design work and nowhere near a request path.
3. **It is an agent tool, not an HTTP API.** It is designed to be driven by a
   coding agent in a session, not called synchronously inside a user's request.

So Figma is a **design-time dependency**, and it earns its place twice:

| Direction | What it does | When it runs |
| --- | --- | --- |
| **Figma to code** | Extract DS 1.5 tokens and component geometry into typed constants the renderer uses | On demand, when the DS changes |
| **Code to Figma** | Push generated game screens into the Screens file so designers can review them | On demand, v1.1 |

Neither runs when a content designer clicks Generate. The renderer ships with
tokens already compiled in.

## The Figma files

| File | Key | What it is |
| --- | --- | --- |
| Pandai Design System 1.5 | `TLVKe3bgJTdVvuPAzgDq2f` | Components, variants, variables, tokens. Source of truth for values. |
| Pandai Screen 1.5 | `hkyIerTAdwtaN3edlp3iz8` | Product screens by feature. Where generated screens get pushed for review. |

Two things that have already cost people time in `pandai.question.uiux`, carried
here so they do not cost it again:

- **The DS file was renamed** from "[WEB] Pandai Design System 1.5" to "Pandai
  Design System 1.5". A rename does not change the file key. If a tool or a
  memory holds the bracketed name, it is stale — the key is what resolves.
- **A second library answers variable searches**: "Mobile - Design System (UI
  KIT)", whose names are generic (`Primary Color/Blue`, `Background/Primary`). A
  loose query returns hits from both libraries. **Match on `libraryName` before
  trusting a result**, or you will silently wire a token from the wrong system.

And the rule that governs every lookup: **resolve every DS value in Student
(green) mode.** DS colour families are mode-scoped, so a flat lookup quietly
returns a Teacher (pink) or Parent value. If a token you pulled reads pink or
maroon, it is wrong — go back and resolve it in the right mode.

Before rationing DS reads on a hunch about limits, run `whoami` — it is exempt
from the rate limit and reports the actual plan and seat.

## Direction one: Figma to code

The renderer must not read `pandai.question.uiux/resources/css/pandai/tokens.css`
at runtime — that is another repo's file and this project cannot depend on its
path. Instead, tokens are **vendored and compiled**.

```
Figma DS 1.5  --(Figma MCP, human-run)-->  scripts/sync-tokens.mjs
                                                    |
                                     +--------------+--------------+
                                     v                             v
                        lib/ds/tokens.generated.ts        app/ds/tokens.css
                        (typed constants + the            (CSS custom
                         Accent -> token mapping)          properties)
```

Rules for the sync:

1. **`tokens.generated.ts` is generated. Never hand-edit it.** It carries a
   header saying so and the date and DS version it came from.
2. **The `Accent` enum in the schema and the accent-to-token map are a pair.**
   Adding an accent means touching both, and a test asserts every `Accent` member
   resolves to a real token. A dangling accent renders as nothing, which looks
   like a renderer bug and is not one.
3. **Never hardcode a colour value in a component.** Same rule as
   `pandai.question.uiux`, same reason. Drive everything from a token.
4. **Padding and gaps are 16.** The DS house rule: a first-elevated card pads 16
   on all four sides, and cards sit 16 apart — `--spacing-space-m`. The known
   exceptions are the 8px horizontal gap beside a side navbar, and a group of
   boxes that reads as a single object. A game board that needs something else
   moves to another *token* and says why in a comment, never to a hand-picked
   number.
5. **Re-run the sync when the DS changes, and commit the diff on its own.** A
   token change mixed into a feature commit is a token change nobody reviewed.

## Direction two: code to Figma (v1.1)

Once games are being generated, designers need to see them without playing every
one in a browser. The push renders a generated game's screens as frames in the
Screens file, built from real DS components.

Rules:

1. **Never write to the Design System file.** Screens only. The DS is the source
   of truth and this tool is a consumer of it — a generator that can edit its own
   source of truth is a generator that can corrupt the product.
2. **Reuse existing components. Do not create near-duplicates.** If a component
   nearly fits, use it and note the gap; do not fork it.
3. **One frame per game version**, named with the game id and version, so a
   designer reviewing a frame can find the spec that produced it.
4. **Human-triggered only.** A button in the library, not a step in generation.

## Working with Figma MCP in this repo

The MCP skills have a mandatory prerequisite that is not optional and is the
usual cause of hard-to-debug failures: **load `/figma-use` before any
`use_figma` call**, and `/figma-design-to-code` before `get_design_context`.
`/figma-generate-library` covers building or reconciling DS structure.

Batch reads — 10 a minute is a real ceiling — but do not skip them. Inspect the
real node before coding a value. No magic numbers.
