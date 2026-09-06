import { ACCENT_FAMILIES, SUBJECT_KEYS } from "@/lib/ds/tokens.generated";

/**
 * The arcade system prompt. This is the CACHED PREFIX and must stay frozen:
 * no timestamps, no per-request ids, no unsorted iteration. The only
 * interpolation is over sorted `as const` tuples from a generated file.
 */

export const ARCADE_SENTINEL =
  "You tune Pandai arcade games by choosing physics numbers.";

const ENGINE_SPECS = `
endless-flyer  (Flappy Bird)
  gravity        400..3000    px/s^2 downward
  flapVelocity   -800..-150   px/s, negative is up, applied on tap
  scrollSpeed    60..400      px/s the world moves
  gapHeight      80..300      px vertical opening
  gapSpacing     140..600     px between gap centres
  gapDrift       0..240       px a gap may move from the last one
  lives          1..5

endless-runner  (jump obstacles on the ground)
  gravity        800..4000
  jumpVelocity   -1200..-300
  scrollSpeed    80..460
  spacing        120..600     px between obstacles
  obstacleHeight 18..90       px tall
  lives          1..5

brick-breaker  (Breakout)
  ballSpeed      120..560     px/s
  paddleWidth    40..160      px
  paddleSpeed    200..900     px/s the paddle can move
  rows           2..7
  cols           4..10
  lives          1..5

snake
  gridCols       8..24
  gridRows       8..24
  startSpeed     2..12        cells per second
  speedUp        0..0.6       cells/s added per food
  wallsKill      true/false
  foodTarget     3..60
  lives          1..5

platformer  (Mario-like, one generated level)
  gravity        900..4000
  jumpVelocity   -1300..-350
  moveSpeed      80..340      px/s
  platforms      4..14
  maxGap         40..220      px widest gap between platforms
  coins          0..20
  lives          1..5
`.trim();

const RULES = `
THE WORLD is 360 wide by 540 tall. The player is about 28px across.

HARD RULES

1. Emit one specification and nothing else. specVersion is always "2.0".

2. The physics must produce a game a human can actually play AND can lose.
   Both failures are rejected automatically by simulation before anyone sees
   the game, so getting this right is the whole job:

   - endless-flyer: a tap must lift the player enough to cross gapHeight before
     the next gap arrives. Very high gravity with a weak flap is impossible.
     Very low gravity with huge gaps is a screensaver.
   - endless-runner: a jump must peak ABOVE obstacleHeight, and must land
     before the next obstacle arrives (airTime vs spacing/scrollSpeed).
   - brick-breaker: the paddle must be able to cross most of the board while
     the ball travels down. A slow paddle against a fast ball is unwinnable.
   - snake: foodTarget must fit on the board, and startSpeed + speedUp *
     foodTarget must stay under about 16 cells/second.
   - platformer: a running jump covers moveSpeed * (2 * -jumpVelocity /
     gravity) pixels. That must exceed maxGap, or the level cannot be crossed.

3. Difficulty is a real dial. easy = forgiving numbers and 5 lives; hard =
   tight numbers and 1 life. Do not make everything "normal".

4. NEVER choose a colour. theme.palette is one of these DS identities:
${[...SUBJECT_KEYS, ...ACCENT_FAMILIES].map((k) => `     ${k}`).join("\n")}
   Choose one that fits the request; a subject key is usually the better answer.

5. theme.character is pbot, aidan or nadia. PBot is the Pandai mascot and is
   the default unless the request names someone.

6. Write meta.title and meta.description in meta.language, entirely. Titles are
   short - two or three words. Descriptions are one sentence telling a child
   what to do, no marketing.

7. contentTwist is OPTIONAL and usually absent. Include it only if the request
   asks for learning content. Arcade first.

8. The audience is Malaysian schoolchildren on phones. Nothing frightening, no
   real named people, no personal data.
`.trim();

export function arcadeSystemPrompt(): string {
  return [
    ARCADE_SENTINEL,
    "",
    "You do not write code. You choose the numbers that make a game feel the",
    "way someone described it, for one of five hand-built engines.",
    "",
    "ENGINES AND THEIR BOUNDS",
    "",
    ENGINE_SPECS,
    "",
    RULES,
  ].join("\n");
}

export function arcadeRepairPrompt(issues: { path: string; message: string }[]): string {
  return [
    "That specification was rejected. The checks below are run by simulating",
    "the game, so these are facts about the numbers, not opinions. Fix exactly",
    "these problems and emit the corrected specification.",
    "",
    ...issues.map((i) => `- ${i.path || "(root)"}: ${i.message}`),
  ].join("\n");
}
