# Reference — Flying Sushi

Zul's own Phaser game: `github.com/aidarollin/test`, locally at
`D:/PC/Documents/VSCode/Websites/test`. A finished Flappy Bird with sound,
power-ups, a difficulty ramp and real art.

**Read-only reference.** Nothing is copied from it; this file records what it
does better than gamerator does, so the gaps are decisions rather than
oversights.

## What it has that we do not

### 1. Difficulty ramps across a round — the big one

```js
export const DIFFICULTY = {
  rampCompleteAt:   0.85,
  pipeSpeed:        { start: 234,  end: 410  },
  pipeGap:          { start: 230,  end: 160  },
  pipeSpawnEveryMs: { start: 1700, end: 1100 },
};
```

Every value is linearly interpolated from `start` to `end` as the round
elapses, finishing at 85% so the last stretch plays at a steady maximum.

**Our `ArcadeSpec` physics are flat.** A flyer has one `gravity`, one
`gapHeight`, one `scrollSpeed`, for the whole run. That is the difference
between a game that builds and a game that repeats.

Worth noting: when the model was asked for a snake that "starts gentle and gets
genuinely tense", it produced `startSpeed 4, speedUp 0.35` — a ramp — because
snake's schema happens to have a `speedUp` field. The flyer's does not, so the
same request against a flyer could not have been honoured. **The schema is the
ceiling on what a prompt can ask for**, which is an argument for adding ranges
rather than more adjectives to the system prompt.

### 2. A round timer, not an endless run

Three minutes, and the budget is shared across continues — each retry starts
with whatever time is left. That makes a session finite, which matters for
"a break between lessons" far more than a high score does.

### 3. Collectibles separate from obstacles

Sushi are picked up for score; pipes are only hazards. They spawn in
formations — a line, an S-wave, a ring — so the flight path has shape. Ours
scores by passing obstacles, which gives the player nothing to aim at.

### 4. Power-ups

- **Magnet**: every 8s, a 70% roll spawns a bubble; collecting it pulls all
  on-screen sushi toward the player at 560px/s for 5s.
- **Power Rush**: a 7s frenzy — pillars retract out of frame, world speed
  ×1.6, background ×10, and fifty sushi pour in along a sine wave, with a
  1.2s clear-sky buffer before the pillars drop back.

Both are *designed*, with spawn intervals, chances and durations. This is the
clearest thing separating a real game from a mechanic.

### 5. Sound

Looping BGM, a separate rush track, and six sound effects (jump, collect,
game-over, power-up, two hit variants), plus a mute button with a persisted
preference. gamerator has none — [SCOPE.md](SCOPE.md) excluded it for lack of
assets, and this repo disproves that reason.

### 6. Smoothed tilt

```js
const target = Phaser.Math.Clamp(vy * 0.08, -25, 70);
this.smiley.angle += (target - this.smiley.angle) * 0.1;
```

A lerp toward the target angle, not a direct assignment. Ours snaps to the
velocity-derived angle every frame, which reads as stiffer. A one-line fix.

## Where we independently agreed

**Placeholder art generated at runtime.** Their `BootScene` builds shape
textures under the same asset keys the real files will use, so dropping in art
is a one-line change. We draw the character from DS tokens when the sprite is
missing, for the same reason. Two people reaching the same pattern separately
is usually a sign it is the right one.

**Parallax at a fraction of world speed.** They use `BG_SCROLL_FACTOR = 0.35`;
we use 0.3. Close enough to call it agreement.

## One thing to resolve

Their palette cites a **different Figma file**:

```
Pandai Design System 1.5 (WIP - BACKUP)   Y0DLhf2MGdGwG0jyjN7EbQ
```

gamerator synced from `TLVKe3bgJTdVvuPAzgDq2f`, which
`pandai.question.uiux/docs/DESIGN-SYSTEM.md` names as the source of truth. And
the Flying Sushi colours — navy `#020d26`, royal blue `#1535a8`, sushi red
`#b81c26`, yellow `#fdd83d` — **do not appear anywhere in the 336 tokens
extracted from that file**.

So either it is a genuinely separate game palette that happens to be filed
under the DS name, or there are two DS files in circulation and we are reading
different ones. Worth answering before any more colour work, because it decides
whether generated games and hand-built games will match.

## What to adopt, in order

1. **Ranged physics** — `{ start, end }` instead of a single number, with
   `rampCompleteAt`. Biggest gameplay win, and it widens what a prompt can ask
   for. Needs the playability simulation to check the *hardest* point of the
   ramp, not the average, or a spec could validate and become impossible.
2. **Round timer** with a shared budget across retries.
3. **Collectibles and formations** — gives the flight path a shape.
4. **Sound** — reverse the SCOPE exclusion; the assets exist.
5. **Power-ups** — the most work, and the most game.
