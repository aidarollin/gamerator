# Presentation script — gamerator

**Slides:** `/deck` on the site (unlisted). ← → move between slides. On a slide
with choices, click one, or press 1–9.

**Every demo is live.** The games are real and playable. The answers on the
slides come from the real router, tuner and validator (`lib/deck.ts`), and a
test fails if a slide stops showing what it says.

**Length:** about 10 minutes, then questions.

> Tips:
> - Open `/deck` and click through once before you start, so every game has
>   loaded.
> - After you play a game, click the slide *outside* the game before you press
>   ← → again. A game you've clicked keeps the keys.

---

## 1. gamerator · 30s

**On screen:** the title, and a flying game.

- "gamerator turns a sentence into a playable Pandai game."
- **Do:** press Play. "This is real and running. It isn't a video."
- "It makes 15 kinds of game, and it's live on Cloudflare."

## 2. The problem · 45s

- "Pandai uses short games as breaks between lessons."
- "Right now each one is an engineering ticket. It has to look exactly like
  Pandai. And a designer who can describe a game can't ship one."
- "The players are Malaysian schoolkids on phones, in two languages. So: one
  thumb, short rounds, nothing scary."

## 3. Describe it. Play it. · 1 min · DEMO

**On screen:** four sentences, and the game made from the one that's selected.

- "You type what you want, and you get a game."
- **Do:** click each sentence, or press 1–4. "Each game was made from exactly
  those words."
- Point at the tag on the racing one: "We don't have a racing engine, so it
  plays as the runner, and it *tells you*."
- "These come from the free tuner, so there's no AI call. With the AI on, it
  reads the same words and picks better numbers."
- "You can also add a link, a picture or notes."

## 4. The one rule · 1 min · DEMO

- "This is the most important slide. **The AI writes data, not code.**"
- **Do:** "The data": "This is everything the AI fills in." Then "The game":
  "and this is the same data, played."
- "So we can check it, it can't break anything, it's cheap, and an engineer can
  read it."

## 5. Five steps · 1 min · DEMO

- **Do:** click through steps 1 to 5.
- "Only step 3 uses AI. Routing and checking are plain code, and that's why
  they're allowed to say no."

## 6. 15 games · 45s · DEMO

- **Do:** click two or three games. "10 arcade games, and each one is playable
  right here."
- "Plus 5 Pandai learning games: quiz, pairs, sorting, ordering and fill the
  blank."

## 7. An honest answer · 45s · DEMO

- "The router is code. These are its real answers."
- **Do:** click through them.
  - pac-man gets a built engine.
  - Racing gets adapted, and says so.
  - A quiz gets a learning game.
  - Chess gets an honest no, with the reason.
  - Horror gets a no, because it's for kids.
- "What we never do is quietly hand you the wrong game."

## 8. Every game is played first · 1 min · DEMO

- **Do:** "Impossible": "Every number is in range, and a perfect player still
  can't get through. That's the validator's own sentence."
- "Too easy": "Rejected too. A game you can't lose isn't a game."
- "Just right": "Passed. Play it."
- "When the AI's answer fails, it gets one more try, with that reason."

## 9. Looks like Pandai · 45s · DEMO

- **Do:** click the subjects. "It's the same game with the same numbers. Only
  the colours change, and each subject has its own look."
- "Colour comes from Pandai's Figma: 366 tokens. The font and type sizes come
  from the Pandai app itself."
- "A build check fails if any colour comes from anywhere else."

## 10. Safety and cost · 45s

- "The AI costs money, so nothing reaches it without passing a spending wall."
- "Limits per day and per person, and a cache so asking twice is free."
- "The live site is in free mode. It can't spend anything."
- "The key is only on my machine. It has never been committed."

## 11. Built with · 30s

- "Next.js and React, in TypeScript."
- "Zod: one schema is the AI's contract, the validator and the types."
- "Claude through OpenRouter, with strict tool use."
- "Cloudflare Workers for hosting, and Vitest and Playwright for testing."

## 12. What the programme taught · 1 min

Map week 0 onto the project, one card at a time:

- "**Reject bad input clearly.** Every game is validated, and rejected with a
  reason."
- "**Secrets live in the environment.** The key has never been committed."
- "**Ship by pushing a link.** The repo is public and the site is live."
- "**Read code by breaking it.** Every check is fuzzed to prove it can pass and
  fail."
- "There are two open questions for the teaching team: this is TypeScript, not
  Python, and it's its own repo, not a week folder."

## 13. What's next · 45s

- "Here's what isn't done yet:"
  - The 5 learning games can't be exported yet.
  - The live site doesn't use the AI yet, because it needs a credit limit first.
  - No real students have played it, and for a game that's the biggest gap.
- "Next: export for the learning games, then real playtests."
- **Close:** "Thank you. Happy to take questions, or you can try it yourself at
  the link."

---

## Likely questions

| Question | Answer |
| --- | --- |
| Why not let the AI write the game code? | You can't check generated code without running it, and it can break things. Numbers can be simulated before anyone plays. |
| What does one game cost? | One small AI call. Asking for the same game again comes from the cache for free. The live site runs in free mode. |
| What if someone asks for a game you don't have? | They get an adapted game, and are told so, or a clear "no" with the reason. Never a silent wrong game. |
| How do you know a game is playable? | A simulated perfect player plays it first. Impossible or too-easy games are rejected. |
| Where do the slide demos come from? | The real router, tuner and validator, run by `lib/deck.ts`. A test fails if a slide's claim stops being true. |
| Why TypeScript and not Python? | The product is a web app on Cloudflare Workers. I've raised it with the teaching team. |
| Is it safe for kids? | Nothing frightening is generated. The fighting game is a sparring match, and horror requests are refused. |
| Can Pandai use it today? | Arcade games export as an iframe tag or a Blade partial. The export hasn't been tried inside Pandai yet. |
| Does it work on phones? | Yes. Tapping Play goes full screen so the page can't scroll, and games that need directions get on-screen buttons. The fighting game has a Block button. |
| What font and colours does it use? | Pandai's: colours from the Figma design system, and the Poppins type scale from the Pandai app itself. |
