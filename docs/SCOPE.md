# SCOPE — what is being built, and what deliberately is not

> **Re-scoped 2026-09-06.** The product is **Pandai-skinned arcade games**, not
> curriculum quiz games. See [ENGINES.md](ENGINES.md) and the re-scope log at
> the bottom of this file.

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

### 2026-09-06 — arcade, not quizzes

**Agreed by Zul.** The product is arcade games wearing a Pandai skin — Flappy
Bird, an endless runner, Breakout, Snake, a platformer. Learning content is an
*optional twist*, not the point.

The previous scope (curriculum quiz games for the content team) came from an
assumption I made from the words "game generator". It was never stated by Zul,
and it shaped PROJECT.md, five templates and fifteen fixtures before it was
caught.

Decided with it:

- **Audience: students, inside Pandai**, as a reward or break. Not the content
  team. Mobile first, one thumb, under ninety seconds a round, no reading
  required to play.
- **Engines, not generated code** — the same architecture as before, and a
  stronger case for it: generated arcade code can hang, produce NaN physics, or
  be unplayable, none of which is checkable by looking.
- **An unsupported genre is a first-class outcome.** Zul asked for "other types
  of games if prompted", which pulls against engines. Rather than silently
  substituting the nearest engine, a request with no engine is answered
  honestly. See ENGINES.md.

**On the learning templates:** kept, not deleted. They work, they are tested,
and they are the proof that the spec-and-renderer architecture holds. Deleting
working code before its replacement is proven is how a pivot loses twice. They
move to the not-building list once the arcade engines cover the ground, and
`/play/preview` stays until then.

### Now also not being built

| Not building | Why |
| --- | --- |
| **A fighting game (Mortal Kombat)** | Needs animation states, hitboxes and opponent AI, and Pandai's avatars are single static PNGs by their own audit. It is a project, not an engine. Recorded because it was asked for by name. |
| **AI-generated game code** | Unchanged from above, and the reasoning is stronger for arcade than it was for quizzes. |
| **Leaderboards or saved scores** | Pandai owns the student record. Duplicating it here forks the source of truth. |

### 2026-09-06 — Sound moved from not-building to built

The reason on the not-building list was "no asset library, and a game that
autoplays audio in a classroom is a support ticket." The first half was wrong
and the second was addressable.

**Wrong:** Zul's own Flying Sushi has music and effects, so the constraint was
mine, not Pandai's. And no asset library is needed - every sound is synthesised
by the Web Audio API at runtime, which costs zero bytes in the Worker bundle,
carries no licence, and can be re-keyed per spec.

**Addressed:** nothing plays until the press that starts a game, because a
browser will not let an AudioContext start any earlier. Mute is one tap, it is
reachable before the first press, and it persists across visits.

Still not building: sound ASSETS. Recorded voice, licensed music, anything that
ships a file.

### 2026-09-06 — Game art is no longer bound to the design system

Zul: "use whatever style for the game, keep Pandai DS as a backup and reference
(minor)."

The canvas now paints from authored arcade scenes in `lib/arcade/palettes.ts`,
each carrying a sky family and a solid family. The DS token ramp remains the
live fallback for any palette key with no scene, and the surrounding UI chrome
is still pure DS. `check:ds` still holds every other file to the token layer;
`palettes.ts` is named in its allowlist so the exception stays one file wide.

This also closes the open question about the two DS Figma files. It no longer
decides anything urgent: a hand-built Pandai game and a generated one were never
going to share a palette once generated games got their own art direction.

### 2026-09-07 — A fighting game: what it would actually take

Zul asked what he needs to PROVIDE for a Mortal Kombat-style game, having hit
the honest no-engine answer twice. The short version: **nothing.** No assets are
needed. The blocker recorded above was mine, and it was wrong.

**What the old reason said:** "Needs animation states, hitboxes and opponent AI,
and Pandai's avatars are single static PNGs by their own audit."

**What is actually true.** The asset claim is accurate — `public/characters` has
six PBot expression SVGs and two single-pose avatar PNGs, no fighting frames.
But the conclusion drawn from it does not follow, because this renderer already
animates static sprites procedurally: `drawCharacter` translates, rotates and
squashes them, and the flyer's tilt and the runner's gait are convincing enough
that nobody has asked where the frames are. A lunge, a block, a recoil and a KO
are all the same class of transform. PBot even ships real reaction art -
`dizzy` for a knockdown, `mastery` for a win.

So a fighter here is **code, not art**:

| Piece | Effort | Notes |
| --- | --- | --- |
| A second character on screen | Schema change: `theme.opponent` | Everything else assumes one |
| Animation states | Procedural, ~100 lines | idle / advance / strike / block / hit / KO, tweened |
| Hitboxes | Trivial | Two positions on a line, a reach and a timing window - simpler than the platformer's collision |
| Opponent AI | A state machine with a reaction delay | Difficulty maps to reaction time and aggression |
| Playability check | Real and simulatable | Can a player land a hit before the counter, given both reaction times? Must be able to reject, like every other check |

**One constraint that is not technical.** The audience is Malaysian
schoolchildren and the system prompt already says nothing frightening. So this
would be a *duel* - a timed sparring match won on points, with bumps and stars,
not blood or fatalities. That is a design decision worth making deliberately
rather than discovering in review.

**Status: still not built, but no longer "not building".** It is a real engine's
worth of work - roughly the size of the platformer plus its level generator -
and it needs Zul to say go. The entry above is superseded by this one.

### 2026-09-08 — Adaptation: a third answer between yes and no

Zul typed "motorcycle racing game" and got a refusal. That was a bad answer. A
racing game **is** an endless runner in everything but the name: you go forward,
the track speeds up, and hitting something ends the run. The engine already
existed; only the label was missing.

So there are now three outcomes instead of two:

| Outcome | When | Example |
| --- | --- | --- |
| **An engine** | the prompt names one | "a flappy bird" |
| **An adaptation** | no engine of its own, but an existing one shares the VERBS | "a racing game" → endless-runner |
| **No engine** | nothing shares a verb | "a tetris puzzle" |

Adapted today: **racing → endless-runner**, **shooter → brick-breaker**,
**adventure/RPG → platformer**. Still refused: puzzle, tower defence, card and
board games, rhythm and typing games.

**The rule that keeps this honest: the adaptation is said out loud, to the
reader and to the model.** Silently handing someone a runner when they asked for
a race is exactly the failure `chooseEngine` was written to prevent - the whole
point of that file is that "none of them" is a real answer. Announcing it is a
different thing: "there is no racing engine, so this is the runner wearing it,
and here is why that works."

Telling the MODEL matters too. Without it a racing request came back titled
"Jump the Blocks" - mechanically right and answering a question nobody asked.
With it: *"Speed Rider - ride your motorcycle down the track and jump over every
obstacle in your lane."*

**A mapping earns a place only if the verbs match.** Racing and running are both
"go forward, avoid things". Tetris and snake are both on a grid and have nothing
else in common. An explicitly named engine always beats a genre mapping - "a
racing game like flappy bird" is a flyer, because the author said so.

### 2026-09-08 — Imagining every game, and four engines out of it

Zul: *"imagine every game possible for user to prompt, ready the engine for
every game."*

The imagining is now `lib/arcade/catalogue.ts` — every genre somebody plausibly
types, with the **verbs** it is made of and a disposition. It is code rather
than a document because it is the routing table itself, and `catalogue.test.ts`
asserts every entry routes the way it claims.

**What the exercise actually found was worse than the missing engines.** The
router knew about twenty genres. Everything else — pac-man, tetris, candy crush,
doodle jump, a penalty shootout, a horror game, "a 3d first person game" —
matched nothing at all and fell through to `endless-flyer` with
`confident: false`. A refusal is a bad answer somebody can act on. A flyer they
did not ask for, with one apologetic line above it, is a wrong answer wearing
the costume of a right one, and it was the commonest outcome in the space of
things people actually type. The catalogue's rule is that **no genre in it is
ever a silent guess.**

#### Four engines built, taking the catalogue to ten

| Engine | Genres it answers | Why it could not be an adaptation |
| --- | --- | --- |
| `shooter` | space invaders, galaga, asteroids, aliens, tanks, *tembak* | it was adapted to brick-breaker, which was dishonest: in Breakout the thing above you is inert and the danger is losing the ball; here it shoots back and the danger is standing still |
| `maze-chase` | pac-man, ghosts, chases, *kejar*, frogger | snake is the only other grid engine and its verbs are "grow, don't hit yourself" — nothing was chasing you |
| `falling-blocks` | tetris, block puzzles, stacking, columns | the most-named refusal. "Tetris and snake share only a grid" was right about the *adaptation* and wrong as a permanent answer |
| `match-3` | candy crush, bejeweled, gem swaps, bubble shooters | it was refused under "a puzzle game" alongside sudoku, which conflated two different things — a match-three board can be simulated, a sudoku cannot |

Each has bounds, a playability check that can both accept and reject inside
those bounds, a renderer, fixtures, and a place in the model's prompt.
`maze-chase` is checked by a **full simulation** — the maze is carved, the dots
are laid and a perfect player walks it against the chasers — which is why
`mazeSeed` is a field of the spec: a check that approves one maze while the
player is handed another is not a check.

#### Also adapted, and announced

pong and air hockey → `brick-breaker`; catching falling things →
`brick-breaker`; doodle jump and climbing → `platformer`; bubble shooter →
`match-3`; tower stacking → `falling-blocks`; frogger and crossy road →
`maze-chase`; war, tank and gun games → `shooter`, explicitly re-dressed as
ships and sparks because the audience is schoolchildren.

#### Still refused, now with a reason each

Tower defence, card and board games, logic puzzles (sudoku, minesweeper, tic tac
toe), rhythm and music games, typing and word games, sports, launcher games
(Angry Birds, archery), reaction and clicker games, memory matching,
simulations, fishing, **scary games**, gambling, multiplayer, and 3D.

Two of those are decisions rather than gaps and will not change: **nothing
generated here may frighten a child**, and **no game of chance with a stake**.
The rest name what is missing, because every refusal reason in this project's
history that was left vague turned out to be wrong.

The nearest one to being wrong today is **reaction/tapping games** —
whack-a-mole is a grid, a timer and a spawn table, and it is the next engine
worth building rather than something to fake.

#### Three bugs the free tuner had been hiding

`catalogue.test.ts` tunes every engine at every difficulty and validates the
result, which nothing had ever done. It found that **the free tuner had never
produced a valid `duel` at any difficulty** — its coefficients were written
against a difficulty scale of 0/1/2 while `tone.scale` is -1/0/1 — and that an
easy `brick-breaker` was rejected as a screensaver. Both had been invisible
because the duel fixtures are hand-written and the model was on.

### 2026-09-10 — Three more ways to say it, and both halves of the product

Zul: *"can you add more mediums for user to include in the prompt/input (game
link, picture, docs for the game flow/description). and make more game templates
available to be generated but with pandai Design System(or a touch of Pandai),
and then fetch Pandai Design System 1.5."*

#### The DS re-sync found nothing to change, and proved it

Ran the committed resolver against `TLVKe3bgJTdVvuPAzgDq2f`. The file HAS moved
since 2026-09-06 — Primitives 542→545, Product 90→94, and three new collections
(`Subjects (A–E)`, `Subjects (G–S)`, `Platform (Mobile)`) — and **none of it
reaches the Semantic layer this build reads.** An FNV-1a digest over the sorted
name=value lines comes out `786f6dbc` on both sides across all 366 tokens, and
`npm run tokens` regenerates byte-identically.

`sync-tokens.md` now has that digest step, so a future sync can prove "nothing
changed" in one command rather than by reading a 366-line diff. It also records
what the extractor SKIPS: 20 Semantic variables under a `JDP/` prefix, dropped
in silence until now.

#### Three input mediums

| Medium | What happens to it |
| --- | --- |
| **A link** | Fetched server-side for its `<title>` and description only. Bounded at 128KB and six seconds, http(s) only, private and link-local addresses refused. A page behind a login degrades to the words in its own URL. |
| **A picture** | Sent to the vision model as its own content block. Capped on BYTES *and* on decoded pixel area, because tokens track area and area is invisible in a file size. |
| **Notes** | Up to 4000 characters — a design doc, a game flow, the rules. Maps onto the field `lib/spec/brief.ts` already had for exactly this. |

**All three feed the ROUTER, not just the model.** `routableText` is the prompt
plus the notes plus whatever the link turned out to be about, and every keyword
decision reads it. Before that, someone who pasted a design document and typed
"make this" got a coin flip: the document reached the model but was invisible to
the code choosing which engine the model was even asked about. It now correctly
produces a maze chase.

**Every input reports what it actually did.** An input that appears to be
accepted and silently does nothing is the same class of lie as an unannounced
adaptation: the person swaps the picture, gets the same game, and concludes the
product is broken rather than that the feature never applied.

#### `/create` is now GET *and* POST

A file cannot travel in a query string, and the query string was load-bearing:
shareable links, the back button, a free refresh because the cache key matches,
and gallery cards that are plain anchors. So a text brief still redirects to the
URL it would have had, and only a brief carrying an upload is answered inline —
and says it has no link of its own to share, because it genuinely has not.

#### The five learning templates are askable, and a Pandai skin exists

`quiz-race`, `match-pairs`, `sort-buckets`, `sequence-order` and `fill-blank`
were built first, are fully tested, are made entirely of DS tokens, and were
reachable only from `/play/preview`. They are a fourth disposition in the
catalogue now, and the gallery shows all fifteen games. One refusal became a
game; what is left of it (Simon says) is refused on its own terms.

`theme.skin: "pandai"` renders any arcade game through the DS ramp instead of an
authored scene. Its first version was pink-on-pink-on-pink and had to be fixed
before shipping — see STATUS.

**Still not built:** an export path for learning specs. `ExportPanel` and
`/embed` are arcade-only, so a generated quiz can be played and not yet handed
to an engineer. That is the next real gap.

### 2026-09-11 — The design system has two sources

**Agreed by Zul:** "fetch latest pandai design system 1.5 from
pandai.question.uiux repo, and apply to this website."

Figma stays the source for colour, spacing and radius. The Pandai product repo
becomes the source for typography (Poppins, the 19 roles, their responsive
steps) and motion, and where the product has changed a Figma value, the
product's value wins - it is what students actually see. The rule that nothing
reads another repo at runtime still holds: `npm run tokens:app` vendors the
values into `app/ds/pandai-app.css`. One product value is refused:
`--radius-xl`, whose name collides with a different DS token.

Also added the same day, as features rather than scope changes: full screen on
phones, and a thumb pad for the five engines that need directions.
