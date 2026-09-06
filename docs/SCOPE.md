# SCOPE — what is being built, and what deliberately is not

Read this before adding anything. If a feature is on the not-building list, it
needs an agreed re-scope entry at the bottom of this file before any code.

## In scope — v1

- Guided authoring: form + free-text rules + guidelines panel
- Generation of a validated `GameSpec` from a description
- Five game templates: `quiz-race`, `match-pairs`, `sort-buckets`,
  `sequence-order`, `fill-blank`
- A deterministic renderer built from Pandai DS 1.5 tokens
- Immediate in-browser play of the generated game
- Form-based editing of a generated spec
- Library, versioning, export bundle, internal share link
- Cloudflare deployment behind Cloudflare Access
- Audit log with per-generation token counts and cost
- An eval suite, offline and online

## In scope — v1.1, after v1 is live and used

- `label-diagram` template (needs an image-asset pipeline, hence not v1)
- Push generated screens into the Figma Screens file for design review
- Bulk generation: one objective, several difficulty variants

## Not being built

Each of these is a real thing someone will ask for. Each is excluded for a
reason, and the reason is the part that matters.

| Not building | Why |
| --- | --- |
| **AI that writes game code** | The whole architecture rests on the model emitting data, not code. Generated code is unverifiable, off-brand, slow, and an XSS surface. This is not a v2 either — it is a different product. |
| **Student accounts, classes, assignment** | Pandai proper already does this. Games leave here as exports; the product owns delivery. Duplicating it would fork the source of truth for a child's progress. |
| **Student-facing hosting** | See above. A human review gate between the model and a child is the safety architecture, not a limitation to engineer around. |
| **Freeform template authoring by users** | A new template is a new renderer — code, tests, DS review. It is a pull request, not a prompt. |
| **A visual drag-and-drop game builder** | That is a different product with a different budget. The form plus a description covers the actual bottleneck. |
| **Multiplayer / realtime** | No template needs it, and it would pull in Durable Objects and a whole class of state bugs for zero current demand. |
| **Analytics on gameplay** | Games are played in Pandai proper, which already instruments play. Anything measured here would be measuring us testing. |
| **Figma MCP in the request path** | Per-seat auth, per-seat rate limits, agent-tool shaped. It is a design-time dependency. See [DESIGN-SYSTEM-SYNC.md](DESIGN-SYSTEM-SYNC.md). |
| **Auto-publishing to production** | Export hands a bundle to a person. An automatic path to students removes the review gate that O3 exists to protect. |
| **Our own auth system** | Cloudflare Access covers an internal tool of this size for free. Building login is building a liability. |

## Re-scope log

Anything moved on or off the lists above gets a dated line here, with who agreed
it and why. An undocumented scope change is how a three-month project becomes a
nine-month one.

_(empty)_
