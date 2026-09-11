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

And the rule that governs every lookup. The inherited form of it was **"resolve
every DS value in Student (green) mode"**, which is right in spirit and wrong in
mechanism. Verified against the live file on 2026-09-06:

**Pin a mode per collection.** The variables resolve through a three-level alias
chain, and each level has its own modes:

| Collection | Vars | Modes | This build pins |
| --- | --- | --- | --- |
| Semantic | 386 | Light, Dark | **Light** |
| Product | 90 | Student, Teacher, Parent | **Student** |
| Primitives | 542 | Value | Value |
| Responsives | 70 | Desktop, Tablet, Mobile | Desktop |
| Typography | 57 | Value | Value |

`Surface/primary/default` is a Semantic token that aliases `Product:Primary/Base`
which aliases `Primitives:OG-Green/500`. **Semantic has no Student mode at all** —
Student lives one level down, in Product. So "resolve in Student mode" cannot be
applied to a Semantic lookup directly; what you actually do is pin Semantic to
Light *and* Product to Student, and let the chain resolve.

Read each collection's *default* mode instead and you mix levels, with nothing
in the output to show it happened. That is the failure the old phrasing was
reaching for.

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

### Drift found on the first sync — 2026-09-06

Two values in `pandai.question.uiux/resources/css/pandai/tokens.css` disagree
with the live DS. **Recorded, not acted on** — that file belongs to another repo
and another branch, and this project is not the right place to change it.

| Token | The other repo says | Live DS says |
| --- | --- | --- |
| `Surface/secondary/default-subtle-hover` | `#d1f7d1` (comment: "Lime.200") | `#baf3b9` (Lime/**300**) |
| Corner radius `4xl` | `24` | `54` — the live `3xl` is 24 |
| Card radius | `--corner-radius-corner-xl` = **16** ("cards") | `Primary Card - 1.5` binds **`Radius/3xl` = 24** |

The third one was found on 2026-09-06 while reading the Button and Card nodes
for the primitives, and it is the most consequential: their `DESIGN-SYSTEM.md`
radius table says cards are 16, and every card in the live DS is 24. A card
built to that table is visibly squarer than the design system it claims to
follow.

Neither is dramatic on its own. Both are exactly what vendoring a stylesheet by
hand produces over time, and both are the argument for generating this layer
from Figma instead of copying it. Worth telling whoever owns `fe/` — the radius
one in particular, since a component asking for `4xl` would land more than twice
as round as intended.

### Rules for the sync

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

## As built, and the second source (2026-09-11)

The fetch is `scripts/figma-token-resolver.js`, run through Figma MCP's
`use_figma`; generation is `scripts/generate-tokens.mjs` (`npm run tokens`). The
`sync-tokens.mjs` in the diagram above was the plan's name. The procedure and
its digest check are in [scripts/sync-tokens.md](../scripts/sync-tokens.md).

Re-verified 2026-09-10: Primitives 545, Product 94, and three new collections
(`Subjects (A-E)`, `Subjects (G-S)`, `Platform (Mobile)`) - and none of the 366
tokens this build reads changed.

**The second source is the Pandai product repo.** `pandai.question.uiux` holds
what the Figma extract skips: **Poppins**, the 19 type roles (size, line-height
AND weight) with their tablet and mobile steps, motion tokens, and the alias
names the product team writes. `npm run tokens:app` reads it - read-only - and
writes `app/ds/pandai-app.css`, loaded after the Figma layer. Where the product
and Figma disagree, **the product wins** and the script says so on every run;
`--radius-xl` is refused because the product uses that name for an 8px nav
button while the DS's is the 16px card radius. This does not change the rule
above: nothing reads the product repo at runtime - its values are vendored.

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
