# gamerator — system documentation

The short, plain version. For the day-by-day history read
[docs/STATUS.md](docs/STATUS.md); for scope decisions read
[docs/SCOPE.md](docs/SCOPE.md).

---

## 1. What it is

**gamerator turns a sentence into a playable Pandai game.**

You type something like *"a hard flappy bird with PBot through chemistry pink
pipes"*. A few seconds later you are playing it. It uses the real Pandai
mascots and the real Pandai Design System, and it comes with an export that a
Pandai engineer can paste into the product.

- **Live:** <https://gamerator.aidaasofiah.workers.dev/create>
- **Repo:** <https://github.com/aidarollin/gamerator>

## 2. Who it is for

| Who | What they get |
| --- | --- |
| **Students** (Malaysian K-12, mostly on phones) | Short arcade breaks between lessons. One thumb, under two minutes. |
| **Content designers** | A game from a description, without an engineering ticket. |
| **Pandai engineers** | A small, readable JSON spec and an embed tag — nothing to rewrite. |

## 3. What it can make — 15 games

**10 arcade games** (their own art style, or a Pandai skin):

| Game | You… |
| --- | --- |
| Flying game (Flappy Bird) | tap to stay up and fly through gaps |
| Endless runner | jump over what is in the way |
| Platformer (Mario) | run and jump to the flag |
| Brick breaker | bounce a ball to clear a wall |
| Snake | grow without hitting yourself |
| Fighting game | time strikes and blocks in a sparring match |
| Space shooter | slide, fire up, dodge what comes back |
| Maze chase (Pac-Man) | clear every dot, avoid the chasers |
| Falling blocks (Tetris) | turn pieces and complete rows |
| Match three (Candy Crush) | swap neighbours to line up colours |

**5 Pandai Design System learning games:** quiz race, matching pairs, sorting,
ordering, fill in the blank.

Asking for something else still gets you a clear answer:

- **Adapted:** "a racing game" becomes the runner, and the page tells you.
- **Refused, with a reason:** "a chess game" gets a no, and it says why (it needs turn-taking).

## 4. How it works — five steps

```
  1. You describe it      words, plus an optional link, picture or notes
          ↓
  2. The router picks     which of the 15 games you asked for (code, not AI)
          ↓
  3. The numbers          AI (or a free keyword tuner) picks speed, gravity,
                          gaps, colours, character, difficulty
          ↓
  4. The check            validate the numbers, then SIMULATE a perfect player.
                          Impossible or too easy? Rejected — and asked again once.
          ↓
  5. You play it          a hand-written engine runs it. Export it to Pandai.
```

## 5. The one rule everything rests on

> **The AI writes data, not code.**

The AI only fills in a small JSON form (an `ArcadeSpec`). Hand-written, tested
game engines do the playing. That one choice gives us four things:

| Because it is data… | …we get |
| --- | --- |
| It can be checked | We simulate the game before anyone sees it |
| It cannot break the app | A bad answer just fails validation |
| It is cheap | One small AI call, not a code-writing loop |
| It is readable | An engineer can read the JSON and know what will happen |

## 6. Frameworks and tools

### The stack

| Layer | Tool | Why this one |
| --- | --- | --- |
| Web app | **Next.js 16** (App Router) + **React 19** | Pages, server actions and API in one project |
| Language | **TypeScript** | Types shared from the schema all the way to the game |
| Schema & validation | **Zod 4** | One schema is the AI contract, the validator and the types |
| AI | **Claude** via the **Anthropic SDK**, through **OpenRouter** | Strict tool use gives structured output |
| Hosting | **Cloudflare Workers** via **OpenNext** | Fast, cheap, deployed from day one |
| Games | **HTML Canvas** + **Web Audio** | Hand-written engines; sound made in code, zero audio files |
| Styling | **Tailwind 4** + CSS modules + **Pandai DS 1.5** | Colours from Figma; the **Poppins** type scale from the Pandai product |
| Design system sync | **Figma** (via Figma MCP) + the **Pandai product repo** | Colour tokens from Figma; typography and motion from `pandai.question.uiux` |
| Tests | **Vitest** | 374 tests, including fuzzing every playability check |
| Visual checks | **Playwright** screenshots | Finds what tests cannot — "verify by looking" |
| Built with | **Claude Code** | The AI pair-programmer used for the whole build |

### The patterns (the "framework" of how it is built)

1. **Data, not code.** The AI fills a form; engines do the work.
2. **Stub first.** A free keyword tuner works without the AI, so everything can be built and tested at no cost. The AI is switched on later.
3. **Validate → simulate → repair once.** Never trust the AI's numbers. Check them, play them, give the AI the reasons and one more try, then stop.
4. **Honest routing.** Three answers only: *a game*, *an adapted game (said out loud)*, or *no, and here is why*. Never a silent wrong guess.
5. **A spending wall.** Nothing reaches the paid AI without passing `guard.ts` (call and token limits, plus a cache).
6. **The design system is enforced, not hoped for.** A build check fails if any colour appears outside the token layer.

## 7. Inputs you can give it

| Input | What happens |
| --- | --- |
| **A sentence** (required) | The main request. Up to 600 characters. |
| **Notes** | A design doc or game flow. Up to 4000 characters. |
| **A link** | We read only the page's title and description. |
| **A picture** | The AI looks at it for mood and colours. Only works when the AI is on. |

The page always tells you what each input actually did — for example *"the link
returned 404, so only the words in the address were used"*.

### Playing on a phone

- **Full screen.** Tapping Play on a phone takes the whole screen, so a swipe
  cannot scroll the page. A button beside mute goes in and out. On iPhone,
  where Safari has no full screen for web pages, the game covers the screen and
  the page behind it is locked.
- **A controller.** Games that need directions show buttons under the game on
  touch screens: an arrow pad (snake, maze chase), ◀ ▶ with Jump or Strike
  (platformer, fighting game), ◀ ▶ with Turn and Drop (falling blocks). Each
  button is its own finger, so you can walk and jump at once.
- **Touch where it is natural.** Tap to fly or jump, drag to steer the paddle
  or the ship, swipe a piece in match three.
- **Keyboard too.** Arrow keys and Space drive the same controls on a computer.

## 8. Safety and cost

| Control | State |
| --- | --- |
| API key | In `.env.local` only. Never committed, never on the live site. |
| Live site | **Free mode** — it cannot spend money. |
| Local AI mode | On, behind the wall: 120 generations a day, 12 per person per hour |
| Cache | The same request twice costs nothing the second time |
| Real limit | A hard credit limit on the OpenRouter key (needed before the live site uses AI) |

## 9. Run it

```bash
npm install
npm run dev        # free mode, http://localhost:3000
npm run dev:live   # AI on — costs real money, see lib/arcade/guard.ts
npm run check      # types + lint + design-system gates + all tests
npm run build && npx wrangler deploy
```

| Page | What |
| --- | --- |
| `/create` | Describe a game, play it, export it |
| `/play/arcade` | Every saved test game |
| `/ds` | The Pandai design system reference |
| `/embed` | The chrome-free game Pandai embeds |
| `/deck` | The project presentation (unlisted) |

## 10. Where things are

| Folder | What |
| --- | --- |
| `app/` | The pages: create, play, embed, ds, deck |
| `lib/arcade/` | The 10 arcade engines' rules, checks, router and AI calls |
| `lib/spec/` + `components/game/` | The 5 Pandai DS learning games |
| `lib/inputs/` | Reading a link and a picture safely |
| `lib/ds/` | The generated Pandai DS 1.5 tokens |
| `components/arcade/` | The game renderers and the shared game frame |
| `docs/` | Status log, scope, engine rules, technical plan |

## 11. Status and what is not done

**Done:** 15 games, AI generation behind a spending wall, playability
simulation, Pandai skin, link/picture/notes input, Poppins and the Pandai type
scale, full screen and touch controls on phones, deployed on Cloudflare.

**Not done yet:**

- The 5 learning games cannot be exported yet (only arcade games can).
- The live site does not use the AI yet — waiting on a credit limit and a
  decision about the public page.
- Picture input has not been tested with the AI actually on.
- No real students have played it yet — only the builder and scripted tests.
- No quality scoring ("is this game *fun*?") — only "is it playable?".
- Swiping on the game has not been checked on a real phone (the test browser
  cannot scroll by touch at all).
- In the fighting game the player cannot block, but the playability check
  assumes they can.
