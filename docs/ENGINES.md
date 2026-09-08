# ENGINES — the arcade catalog and the ArcadeSpec

> **Supersedes the template catalog in [GAMESPEC.md](GAMESPEC.md).** That
> document described five *learning* templates — quiz-race, match-pairs and
> friends — built on the assumption that a Pandai game is a curriculum exercise.
> That assumption was wrong, and it was mine. The product is **arcade games
> wearing a Pandai skin**: Flappy Bird, an endless runner, Breakout, Snake, a
> platformer. Learning content is an *optional twist*, not the point.
>
> GAMESPEC.md is kept because the learning templates still work and still
> demonstrate the architecture. See [SCOPE.md](SCOPE.md) for what happens to
> them.

## What did not change

The architecture. **The model emits data, not code**, and a hand-written
deterministic engine plays it. If anything the case is stronger here: generated
arcade code can hang in an infinite loop, produce `NaN` physics, or be flatly
unplayable, and none of that is checkable by looking at it.

What changes is the catalog: five *engines* instead of five *templates*, and a
spec that carries physics and difficulty instead of questions and answers.

## Who plays these

**Students, inside Pandai** — as a reward or a break between lessons. That
choice sets the constraints, and they are different from the old ones:

- **Mobile first, touch first.** One thumb. No keyboard assumed, ever.
- **Short.** A round is under ninety seconds. Anything longer is a different
  product.
- **No reading required to play.** Instructions are a picture and one verb.
  Games are for the pupil who did not want to read today either.
- **Fun is the requirement, not a nice-to-have.** A boring game that is on-brand
  and validates cleanly has failed.
- Still exported for a human to place into Pandai proper. The review gate
  stays — see [SCOPE.md](SCOPE.md).

## The engines

Ten of them, each one a distinct set of VERBS — what your hands do. That is the
axis the catalog is organised on, and it is the one that decides whether a new
request needs a new engine or can wear an existing one.

| id | The machine | What your hands do |
| --- | --- | --- |
| `endless-flyer` | Flappy Bird. One input, gravity, procedural gaps | tap to stay up, thread a gap |
| `endless-runner` | Jump obstacles on the ground, speeding up | go forward, jump what is in the way |
| `platformer` | One generated level, reachable by construction | run, jump between ground, reach the end |
| `brick-breaker` | Breakout. Paddle, ball, brick grid | slide along the bottom, bounce, clear a wall |
| `snake` | Grid movement, grow on pickup | steer a growing line, avoid yourself |
| `duel` | A timed sparring match, won on points | close distance, time a strike, block one back |
| `shooter` | A fleet descends; you slide and fire up | slide, fire upward, dodge what comes back |
| `maze-chase` | Pac-Man. Dots, corridors, pursuers that scatter | run a maze, clear dots, stay away |
| `falling-blocks` | Tetris. A well, seven pieces, line clears | steer a falling piece, rotate, complete a row |
| `match-3` | Candy Crush. Swap neighbours, cascade | swap two neighbours, line up three |

**None of them needs art that does not exist.** The sprite question dominated
the first version of this table and it was answered wrong: Pandai's avatars
really are single whole PNGs with no frames, and the conclusion drawn from that
— that a platformer and a fighting game were therefore off the table — did not
follow. This renderer animates static sprites procedurally, and a lunge, a
recoil and a run cycle are all the same class of transform. Both engines exist
now, and neither needed a single new asset.

### Three answers, not two

Every prompt gets exactly one of these, and which one is decided in code by
`lib/arcade/brief.ts` reading the catalog in `lib/arcade/catalogue.ts`.

| Outcome | When | Example |
| --- | --- | --- |
| **An engine** | the prompt names one | "a flappy bird" |
| **An adaptation** | no engine of its own, but a built one shares the VERBS | "a racing game" → `endless-runner` |
| **No engine** | nothing shares a verb | "a tower defence game" |

An adaptation is **always said out loud**, to the reader and to the model.
Silently handing someone a runner when they asked for a race is the exact
failure this layer exists to prevent.

### The catalogue

`lib/arcade/catalogue.ts` is the list of every genre somebody plausibly types,
with its words, its verbs and its disposition. It is code rather than a document
because it IS the routing table — a document would drift.

Writing it out found something worse than the missing engines. The old router
knew about twenty genres; everything else — pac-man, tetris, candy crush, doodle
jump, a penalty shootout, a horror game — matched nothing and fell through to
`endless-flyer` with `confident: false`. **A refusal is a bad answer somebody can
act on. A flyer they did not ask for, with one apologetic line above it, is a
wrong answer wearing the costume of a right one**, and it was the most common
outcome in the space of things people actually type.

`catalogue.test.ts` asserts every genre routes as declared, and that no genre in
the catalogue falls through to the unconfident default.

### When the request has no engine

A brief asking for a tower defence, a chess game or a rhythm game has no engine
to run on. That is a **first-class outcome**, not an error and not a silent
substitution:

```
status: "no-engine"
  requested: "a tower defence game"
  nearest:   "endless-flyer"
  why:       "nothing here has an economy, a build phase, or units that act
              without you - a tower defence is three systems, not a skin"
```

`why` matters as much as the refusal. "No engine for that yet" gives the reader
nothing to act on and nothing to disagree with — and **every one of these reasons
has been wrong before**. "A fighting game" was refused for months on a reason
that turned out to be false, and it is the `duel` engine now. A reason written
down is a reason that can be checked.

## The ArcadeSpec

`specVersion: "2.0"`, because this is a different family from the learning
specs, not a revision of them. Same rules as before, and one new one:

1. **No free-form colour, ever.** `theme.palette` is a DS subject key or accent
   family. The model cannot express a hex value.
2. **Every field is constrained or content.** Physics values carry real bounds.
3. **Rules and content are separate.** Physics is how the machine behaves; the
   optional twist is what it is about.
4. **Keep it small.** Output tokens dominate the bill.
5. **Discriminate on `engine`**, so a mismatched rules block is a parse error.
6. **NEW: a spec must be provably playable.** See below.

### The playability check — the important new idea

The learning schema's sharpest rules were the ones catching specs that passed
every field bound and were still broken: `correctIndex` past a short options
array, a bucket with no items. Arcade games have exactly the same class of
failure, and it is worse because it is invisible in the JSON:

```
gravity: 2800, flapVelocity: -220, gapHeight: 95, scrollSpeed: 380
```

Every value is in range. The game is impossible — the bird cannot climb fast
enough to cross a 95px gap before the next one arrives. A human would have to
play it to find out.

So the validator **simulates** it. A perfect-play agent is run over the first N
obstacles headlessly; if it cannot survive, the spec is rejected with a reason,
and that reason goes into the repair turn like any other validation issue.

This is the answer to "generated games might be unplayable", and it is cheap:
pure arithmetic, no rendering, milliseconds. It is only possible **because** the
engine is ours and the spec is data. It could not be done for generated code.

## Shape

```typescript
const base = {
  specVersion: z.literal("2.0"),
  meta: z.object({
    title: z.string().min(3).max(40),
    description: z.string().max(160),
    language: z.enum(["ms", "en"]),
    difficulty: z.enum(["easy", "normal", "hard"]),
  }),
  theme: z.object({
    palette: Palette,        // a DS subject key or accent family
    skin: z.enum(["pbot", "panda", "abstract"]),
    background: z.enum(["sky", "night", "forest", "plain"]),
  }),
  scoring: z.object({
    pointsPerObstacle: z.number().int().min(1).max(100),
    targetScore: z.number().int().min(5).max(200),
  }),
};
```

Per-engine `rules` carry the physics. The optional twist:

```typescript
contentTwist: z.object({
  prompt: z.string().max(120),          // "Fly through the correct meaning"
  correct: z.string().max(60),
  distractors: z.array(z.string().max(60)).min(1).max(3),
}).optional()
```

Absent by default. Arcade first — the twist is a decoration on a game that is
already fun without it, never the reason the game exists.

## Build order

1. **`endless-flyer`** — the one actually asked for. Art turned out not to be a
   blocker: the bird is drawn from DS tokens on a canvas, so no sprite is needed
   to ship it, and the mascot PNG becomes an upgrade rather than a dependency.
2. `brick-breaker` and `snake` — no art at all, cheapest to add.
3. `endless-runner` — same engine family as the flyer.
4. `platformer` — last, and only once the sprite question has an answer.

Each engine ships with fixtures — valid, edge, invalid, **and unplayable** —
before its renderer, for the same reason as before: an engine that has only ever
been fed generated specs has never been tested against anything you controlled.
