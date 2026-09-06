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

| id | The machine | Sprite need | Effort |
| --- | --- | --- | --- |
| `endless-flyer` | Flappy Bird. One input, gravity, procedural gaps | One static image, rotated | Small |
| `endless-runner` | Jump and duck past obstacles, ground-based | One image, bob and rotate | Small |
| `brick-breaker` | Breakout. Paddle, ball, brick grid | **None** — pure DS shapes | Small |
| `snake` | Grid movement, grow on pickup | **None** — pure DS shapes | Small |
| `platformer` | Tile levels, enemies, goal | Real animation frames | **Large** |

The sprite column is not incidental. Pandai's avatars are, by their own audit,
**single whole PNGs — not layered, not sprite sheets**. So a bird that rotates
works today; a character with run, jump and idle cycles does not, and the
platformer needs art that does not currently exist. It is in the catalog because
it was asked for, and it is last for that reason.

`brick-breaker` and `snake` need no art at all: they can be drawn entirely from
DS tokens. They are the cheapest and the safest, and they are the right place to
prove the pipeline.

### When the request has no engine

A brief asking for a fighting game, a racer, or a tower defence has no engine to
run on. That is a **first-class outcome**, not an error and not a silent
substitution:

```
status: "no-engine"
  requested: "a Mortal Kombat style fighter"
  nearest:   "endless-runner"
  message:   what the catalog does have, and that an engine is a pull request
```

The alternative — quietly generating the nearest thing and calling it done —
produces a user who asked for a fighter and got a runner with no explanation.
Adding an engine is code, tests and a DS review; it is a change to this
repository, not a prompt.

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
