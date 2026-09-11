import { Fragment } from "react";
import { Deck, type Slide } from "@/components/deck/Deck";
import { checkDemos, describeDemos, gameDemos, skinDemos, specDemo, verdictDemos } from "@/lib/deck";
import { ENGINES } from "@/lib/arcade/schema";
import { TEMPLATES } from "@/lib/spec/schema";
import { GALLERY } from "@/lib/gallery";

/**
 * The project presentation. The script that goes with it, slide for slide, is
 * `docs/PRESENTATION.md` - change one and change the other.
 *
 * Rebuilt on 2026-09-11 (second time that day) to be SIMPLE, CLEAN AND
 * HANDS-ON: a title, a line, and something to click. Every demo is produced by
 * `lib/deck.ts` from the real router, tuner and validator, and `deck.test.ts`
 * pins that each still shows what its slide claims.
 *
 * UNLISTED, NOT PRIVATE. Left out of `SiteNav` and marked `noindex`, but this
 * site has no authentication and the repository is public, so anyone with the
 * URL can open it.
 *
 * Nothing here calls a model. `/create` is not embedded at all any more: it
 * generates from its query string, so a prompt in a slide would have been a
 * model call every time the slide opened.
 */

export const metadata = {
  title: "gamerator - presentation",
  description: "What gamerator is, how it works, and what the FDE programme taught.",
  other: { robots: "noindex, nofollow" },
};

const b = (key: number, bold: string, rest: string) => (
  <Fragment key={key}>
    <strong>{bold}</strong> {rest}
  </Fragment>
);

const quote = (s: string) => `“${s}”`;

export default function DeckPage() {
  const spec = specDemo();

  const slides: Slide[] = [
    {
      kicker: "AI Forward Deployed Engineer · project",
      title: "gamerator",
      lead: "Type a sentence. Get a playable Pandai game.",
      points: [
        b(1, `${GALLERY.length} kinds of game:`, `${ENGINES.length} arcade, ${TEMPLATES.length} for learning.`),
        b(2, "Real Pandai", "mascots and design system."),
        b(3, "Live", "on Cloudflare, and free to try."),
      ],
      panel: { kind: "game", src: spec.src, caption: "A real game, running in this slide. Press Play." },
    },

    {
      kicker: "The problem",
      title: "Every game needs an engineer",
      lead: "Pandai uses short games as breaks between lessons.",
      cards: [
        { k: "Slow", v: "Each game is an engineering ticket." },
        { k: "Strict", v: "It has to look exactly like Pandai." },
        { k: "Stuck", v: "A designer can describe a game, but can't ship one." },
      ],
      cols: 3,
      note: "The players: Malaysian schoolkids on phones, in two languages. So: one thumb, short rounds, nothing scary.",
    },

    {
      kicker: "The idea · try it",
      title: "Describe it. Play it.",
      lead: "Pick a sentence. The game beside it was made from exactly those words - by the free tuner, with no AI call.",
      stack: true,
      options: describeDemos().map((d) => ({
        label: quote(d.prompt),
        panel: {
          kind: "game",
          src: d.src,
          caption: "Made from these words.",
          tag: { tone: d.tone, text: d.tag },
        },
      })),
      note: "You can also add a link, a picture, or notes like a design doc.",
    },

    {
      kicker: "The one rule",
      title: "The AI writes data, not code",
      points: [
        b(4, "Checkable:", "we test a game before anyone plays it."),
        b(5, "Safe:", "a bad answer fails validation. It can't break the app."),
        b(6, "Cheap:", "one small AI call."),
        b(7, "Readable:", "an engineer reads it and knows what will happen."),
      ],
      options: [
        {
          label: "The data",
          panel: { kind: "code", code: spec.code, caption: "What the AI fills in. The real spec, trimmed." },
        },
        {
          label: "The game",
          panel: { kind: "game", src: spec.src, caption: "The same data, played by a hand-written engine." },
        },
      ],
    },

    {
      kicker: "How it works",
      title: "Five steps. Only one uses AI.",
      flow: true,
      options: [
        {
          label: "Describe",
          panel: { kind: "step", n: 1, who: "You", title: "Describe", body: "A sentence - plus, if you like, a link, a picture or a design doc." },
        },
        {
          label: "Route",
          panel: { kind: "step", n: 2, who: "Code", title: "Route", body: `Code, not AI, decides which of the ${GALLERY.length} games you meant - or says no, with the reason.` },
        },
        {
          label: "Tune",
          panel: { kind: "step", n: 3, who: "AI", ai: true, title: "Tune", body: "The AI picks the numbers: speed, gaps, colours, difficulty. Only numbers." },
        },
        {
          label: "Check",
          panel: { kind: "step", n: 4, who: "Code", title: "Check", body: "A simulated player plays it. Too hard or too easy goes back to the AI once, with the reason." },
        },
        {
          label: "Play",
          panel: { kind: "step", n: 5, who: "Engine", title: "Play", body: "A hand-written engine runs it, on a laptop or a phone. Export is one iframe tag." },
        },
      ],
    },

    {
      kicker: "What it makes · try it",
      title: `${GALLERY.length} games`,
      lead: `${ENGINES.length} arcade games you can play right here - and ${TEMPLATES.length} Pandai learning games.`,
      options: gameDemos().map((g) => ({
        label: g.name,
        panel: { kind: "game", src: g.src, caption: g.verbs },
      })),
      note: "The learning games: quiz, pairs, sorting, ordering, fill the blank.",
    },

    {
      kicker: "When we can't",
      title: "An honest answer, never a wrong game",
      lead: "The router is code, not AI. These are its real answers.",
      options: verdictDemos().map((v) => ({
        label: quote(v.prompt),
        panel: { kind: "verdict", asked: v.prompt, tone: v.tone, label: v.label, head: v.head, body: v.body },
      })),
    },

    {
      kicker: "Quality · try it",
      title: "Every game is played before you see it",
      points: [
        b(8, "A simulated player", "plays every game first."),
        b(9, "Too hard, or too easy?", "Rejected, with the reason."),
        b(10, "The AI gets one retry,", "with that reason."),
      ],
      options: checkDemos().map((c) => ({
        label: c.label,
        panel: c.ok
          ? { kind: "game", src: c.src, caption: "Passed. Press Play." }
          : { kind: "reject", reasons: c.reasons, caption: "The validator's own words, not a paraphrase." },
      })),
    },

    {
      kicker: "Looks like Pandai · try it",
      title: "The real design system, enforced",
      points: [
        b(11, "Colour", "from Pandai's Figma: 366 tokens."),
        b(12, "Type", "from the Pandai app: Poppins, 19 roles."),
        b(13, "A build check fails", "on any colour from outside."),
      ],
      options: skinDemos().map((k) => ({
        label: k.label,
        panel: { kind: "game", src: k.src, caption: "Same game, same numbers. New colours." },
      })),
    },

    {
      kicker: "Safety and cost",
      title: "The AI costs money, so it sits behind a wall",
      cards: [
        { k: "Limits", v: "120 games a day, and 12 an hour per person." },
        { k: "Cache", v: "Asking for the same game twice is free." },
        { k: "Free mode", v: "The live site cannot spend anything." },
        { k: "The key", v: "On my machine only. Never committed." },
      ],
      cols: 4,
    },

    {
      kicker: "Built with",
      title: "Frameworks and tools",
      cards: [
        { k: "Next.js + React", v: "The web app" },
        { k: "TypeScript", v: "One set of types, schema to game" },
        { k: "Zod", v: "The AI's contract, the validator and the types" },
        { k: "Claude via OpenRouter", v: "Picks the numbers, with strict tool use" },
        { k: "Cloudflare Workers", v: "Hosting" },
        { k: "Canvas + Web Audio", v: "The game engines and the sound" },
        { k: "Vitest + Playwright", v: "379 tests, plus screenshots" },
        { k: "Figma + Claude Code", v: "Design system sync, and the build itself" },
      ],
      cols: 4,
    },

    {
      kicker: "What the programme taught",
      title: "Week 0, applied to a real system",
      cards: [
        { k: "Reject bad input clearly", v: "Every game is validated, and rejected with a reason." },
        { k: "Secrets live in the environment", v: "The API key has never been committed." },
        { k: "Ship by pushing a link", v: "Public repo, live site." },
        { k: "Read code by breaking it", v: "Every check is fuzzed to prove it can pass and fail." },
      ],
      cols: 2,
      note: (
        <>
          <strong>Two open questions for the teaching team:</strong> TypeScript instead of
          the default Python, and its own repo instead of a week folder.
        </>
      ),
    },

    {
      kicker: "Honestly",
      title: "What's not done, and what's next",
      cards: [
        { k: "Export", v: "The 5 learning games can't be exported yet." },
        { k: "AI on the live site", v: "Needs a credit limit on the key first." },
        { k: "Real players", v: "No students have played it yet. The biggest gap." },
      ],
      cols: 3,
      note: (
        <>
          Next: export for learning games, then real playtests. Try it at{" "}
          <strong>gamerator.aidaasofiah.workers.dev/create</strong>
        </>
      ),
    },
  ];

  return <Deck slides={slides} />;
}
