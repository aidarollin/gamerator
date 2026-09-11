# SCREENSHOTS — verify by looking

## Why this exists

Every surface in this project was verified with `curl` and `grep` for weeks:
status 200, expected strings present, all green. Then a screenshot was taken and
found three bugs in one pass:

1. **Nadia and Aidan rendered inside a white box.** The battle avatars are PNGs
   with an opaque background — cut for a UI card, not for a game.
2. **brick-breaker was unplayable by keyboard.** A press only launched the ball
   if it carried a pointer position, so Space started the game and then nothing
   happened. A score stuck at 0 in the image is what gave it away.
3. **The platformer floated in empty space** with no ground beneath its
   platforms.

All three surfaces returned 200 and contained every string the checks looked
for. **Confirming a page responds is not the same as looking at it**, and for a
game — where the entire product is what appears on a canvas — the difference is
most of the quality.

Take screenshots after any visual change. It costs about a minute.

## How

Playwright and Chromium are already installed in a sibling repo. Nothing needs
installing here, and nothing in that repo is modified — it is only read.

Write a script anywhere (the scratchpad is fine) importing Playwright **by
absolute path**, because a bare `playwright` specifier will not resolve from
outside that repo's tree:

```js
import { chromium } from "file:///D:/PC/Documents/VSCode/Pandai/pandai.question.uiux/node_modules/playwright/index.mjs";

const B = "https://gamerator.aidaasofiah.workers.dev";
const OUT = process.argv[2];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 420, height: 820 },
  deviceScaleFactor: 2,
});

await page.goto(`${B}/play/arcade?game=endless-flyer.valid`, {
  waitUntil: "networkidle",
});
await page.waitForTimeout(1200);          // let art load and the loop settle

// Drive it, so the shot shows a game in motion rather than a title card.
await page.keyboard.press("Space");
await page.waitForTimeout(450);
for (let i = 0; i < 16; i++) {
  await page.keyboard.press("Space");
  await page.waitForTimeout(150);
}

await page.locator("canvas").first().screenshot({ path: `${OUT}/flyer.png` });
await browser.close();
```

```bash
node /path/to/shoot.mjs /path/to/output/dir
```

Then **open the images and look at them.** A script that writes PNGs and a
person who never opens them is the same as no screenshots at all.

## What to check in a game shot

- Is the character drawn cleanly — no box, no crop, right size against the
  obstacles?
- Does the score move? A score stuck at 0 after driving the game usually means
  input is not reaching the engine.
- Is there ground, or does the level float?
- Does the palette read as one deliberate scheme, or as two unrelated colours?
- Is anything invisible — a collectible behind an obstacle, text on a
  same-colour background?

## Phones and touch

Added 2026-09-11, after three probes in one session measured the wrong thing.

- Emulate a phone with `browser.newContext({ viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3, isMobile: true, hasTouch: true })`, and tap with
  `locator.tap()`. `(pointer: coarse)` then matches, so the thumb pad shows.
- For multi-touch use CDP `Input.dispatchTouchEvent`. **`touchEnd` releases the
  points you LIST**, not the ones you leave out - lift a second finger with
  `touchEnd` naming that finger only.
- **Headless Chromium here cannot scroll a page by simulated touch at all.**
  Raw touch events, `Input.synthesizeScrollGesture` and even a mouse wheel under
  mobile emulation all moved plain page text 0px. So "0px when swiping the
  game" proves nothing; check the computed `touch-action` instead (`pan-y`
  between runs, `none` mid-run), and check real scrolling on a real phone.
- Always run a **control** next to a check - a swipe that should scroll, a
  hint that should show - and make sure it lands where you think:
  `document.elementFromPoint` tells you whether a point is on the game or the page.
- Hints live in nested spans; the outer label's text contains BOTH the touch
  and the keyboard hint. Read leaf spans whose computed `display` is not `none`.
- Pad buttons carry `data-held="true"` while pressed, which is readable.

## Notes

- `deviceScaleFactor: 2` gives a retina image; text and edges are legible.
- Screenshot the `canvas` element rather than the page when you want the game
  alone, and the page when you want the surrounding UI — a rejected spec, for
  instance, has no canvas at all.
- Chromium is at `C:/Users/User/AppData/Local/ms-playwright`. If it is ever
  missing, `npx playwright install chromium` fetches it.
