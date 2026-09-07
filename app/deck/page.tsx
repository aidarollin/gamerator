import { Fragment } from "react";
import { Deck, type Slide } from "@/components/deck/Deck";
import { encodeSpec } from "@/lib/arcade/embed";
import { readArcadeFixture, ARCADE_FIXTURE_NAMES } from "@/lib/arcade/fixtures";
import { ENGINES } from "@/lib/arcade/schema";
import { SUBJECT_KEYS, ACCENT_FAMILIES } from "@/lib/ds/tokens.generated";

/**
 * The internal walkthrough deck.
 *
 * UNLISTED, NOT PRIVATE. It is left out of `SiteNav` and marked `noindex`, so
 * nobody reaches it by browsing or searching. It is not protected: this site
 * has no authentication at all, and the repository is public, so the route is
 * discoverable by anyone who reads the source. Saying "internal" on the page is
 * a signal to a reader, not a control - see the note on the last slide.
 *
 * Every demo is a REAL IFRAME of a live route, built from the same fixtures the
 * test suite validates. A screenshot of a working demo is not a working demo,
 * and this project has been caught out by that difference more than once.
 */

export const metadata = {
  title: "gamerator - internal walkthrough",
  description: "How the Pandai arcade generator is built, with live demos.",
  other: { robots: "noindex, nofollow" },
};

/** A live, chrome-free game, from a fixture the suite already validates. */
function embed(fixture: string): string {
  return `/embed?s=${encodeSpec(readArcadeFixture(fixture))}`;
}

const accepted = ARCADE_FIXTURE_NAMES.filter(
  (n) => !/\.(invalid|unplayable|trivial)$/.test(n),
).length;

const slides: Slide[] = [
  {
    kicker: "AI Forward Deployed Engineer · project walkthrough",
    title: "gamerator",
    lead:
      "Describe an arcade game in a sentence and get a playable one back - wearing the real Pandai mascots and the real design system, with an export a Pandai engineer can drop into the site.",
    points: [
      <Fragment key={1}>
        <strong>Six hand-written engines.</strong> {ENGINES.join(", ")}.
      </Fragment>,
      <Fragment key={2}>
        <strong>{accepted} validated specs</strong> in the suite, plus deliberately
        broken ones that must be <em>rejected</em>.
      </Fragment>,
      <Fragment key={3}>
        <strong>Live at</strong>{" "}
        <span className="mono">gamerator.aidaasofiah.workers.dev</span>, deployed on
        Cloudflare Workers.
      </Fragment>,
    ],
    demo: {
      src: embed("endless-flyer.valid"),
      caption: "A real game running in this slide - not a recording.",
      width: 300,
      height: 520,
    },
  },

  {
    kicker: "The problem",
    title: "Pandai needs games faster than engineers can write them",
    lead:
      "Pandai is a Malaysian K-12 learning platform. Arcade breaks between lessons keep students on the platform, but every one of them is an engineering ticket - and every one has to look like Pandai.",
    points: [
      <Fragment key={4}>
        A content designer can describe a game in a sentence. They cannot ship one.
      </Fragment>,
      <Fragment key={5}>
        Anything shipped must be <strong>Design System 1.5 faithful</strong>, or it
        looks like it came from somewhere else.
      </Fragment>,
      <Fragment key={6}>
        The output has to be something the product team can actually consume - not a
        prototype that needs rewriting.
      </Fragment>,
    ],
    note: {
      tone: "plain",
      body: (
        <Fragment key={7}>
          <strong>The audience shapes the constraints.</strong> Malaysian
          schoolchildren, mostly on phones, in two languages. That is why the fighting
          engine is a sparring match rather than Mortal Kombat, and why every game is
          360×540 and playable with one thumb.
        </Fragment>
      ),
    },
  },

  {
    kicker: "The core decision",
    title: "The model emits data, not code",
    lead:
      "A prompt produces an ArcadeSpec - validated JSON naming an engine, its physics, its palette and its character. A hand-written deterministic engine plays it. No generated JavaScript ever runs.",
    points: [
      <Fragment key={8}>
        <strong>It can be checked.</strong> You cannot ask &quot;is this playable?&quot;
        of generated code without running it and watching. You can ask it of numbers.
      </Fragment>,
      <Fragment key={9}>
        <strong>It cannot break the app.</strong> The worst a bad spec does is fail
        validation.
      </Fragment>,
      <Fragment key={10}>
        <strong>It is cheap.</strong> A spec is ~600 bytes, so generation is one small
        structured call - not a code-generation loop.
      </Fragment>,
      <Fragment key={11}>
        <strong>It is reviewable.</strong> A Pandai engineer reads the JSON and knows
        exactly what will happen.
      </Fragment>,
    ],
    note: {
      tone: "warn",
      body: (
        <Fragment key={12}>
          This is the rule the whole system rests on, and it is written at the top of
          the repo&apos;s <span className="mono">CLAUDE.md</span>: if you find yourself
          generating JavaScript from a model call, stop.
        </Fragment>
      ),
    },
  },

  {
    kicker: "Demo · the authoring surface",
    title: "One text box, and a game comes back",
    lead:
      "Type a description. Engine choice, physics, palette, character and difficulty are all derived from the words.",
    points: [
      <Fragment key={13}>
        Engine routing is <strong>keyword scoring in code, not a model call</strong>.
        A model asked &quot;which engine?&quot; always picks one - and being able to
        answer &quot;none of them&quot; is the point.
      </Fragment>,
      <Fragment key={14}>
        A genre with no engine gets told so, by name, instead of being handed the
        nearest thing silently.
      </Fragment>,
      <Fragment key={15}>
        Everything on this page is <strong>free</strong>: the physics come from the
        words in code. See the cost slide.
      </Fragment>,
    ],
    demo: {
      src: "/create?prompt=a+hard+flappy+bird+with+PBot+through+chemistry+pink+pipes",
      caption: "The live /create page. Type in it - it works.",
      width: 380,
      height: 560,
    },
  },

  {
    kicker: "Structured output",
    title: "One schema, three jobs",
    lead:
      "A single Zod schema is the model's output contract, the server's validation gate, and the renderer's prop types. They cannot drift, because they are the same object.",
    table: {
      head: ["Layer", "What it does"],
      rows: [
        ["ArcadeSpecShape", "The shape a model can be asked for - JSON-Schema-able"],
        ["ENGINE_SCHEMAS", "One concrete schema per engine, never the union"],
        ["ArcadeSpec", "Shape + every rule a field bound cannot express"],
        ["z.infer<>", "The renderer's types, for free"],
      ],
    },
    note: {
      tone: "warn",
      body: (
        <Fragment key={16}>
          <strong>Learned the expensive way.</strong> A five-branch discriminated union
          became a five-way <span className="mono">anyOf</span> in JSON Schema, and the
          first live call came back missing <span className="mono">rules</span> and{" "}
          <span className="mono">scoring</span> entirely. The model is handed one
          concrete engine schema now. Also:{" "}
          <span className="mono">output_config.format</span> is <em>not</em> enforced
          through OpenRouter - generation uses strict tool use.
        </Fragment>
      ),
    },
  },

  {
    kicker: "The guarantee",
    title: "A headless simulation plays the game before anyone sees it",
    lead:
      "Every spec is played by a perfect-play agent using the same physics and the same level generator the renderer uses. A game that cannot be beaten - or cannot be lost - is rejected with a reason a repair turn can act on.",
    points: [
      <Fragment key={17}>
        <strong>Both directions matter.</strong> An impossible game is a bug; a game
        you cannot lose is a screensaver.
      </Fragment>,
      <Fragment key={18}>
        <strong>The reason names the numbers.</strong> &quot;A perfect player misses
        obstacle 20 by 72px - 95% into the ramp the gap is 93px at 376px/s.&quot;
      </Fragment>,
      <Fragment key={19}>
        <strong>Every check is fuzzed</strong> across its own bounds and must be shown
        to <em>both</em> accept and reject. brick-breaker once shipped a check that
        could never fire and read as coverage for weeks.
      </Fragment>,
    ],
    demo: {
      src: "/play/arcade?game=endless-flyer.unplayable",
      caption: "A spec every field of which is in range - and which the simulation refuses.",
      width: 380,
      height: 470,
    },
  },

  {
    kicker: "Demo · the catalogue",
    title: "Six engines, one spec format",
    lead:
      "Change the physics and the palette and you have a different game. The engines are hand-written and deterministic; only the numbers are generated.",
    points: [
      <Fragment key={20}>
        <strong>duel</strong> was the last one, and it exists because the recorded
        reason for refusing a fighting game was wrong: &quot;the avatars are static
        PNGs&quot; was true, and the conclusion was not. The renderer already animates
        static sprites procedurally.
      </Fragment>,
      <Fragment key={21}>
        Physics <strong>ramp</strong> across a run, so a game builds instead of
        repeating - and the check reaches the hardest point of the ramp, not the
        gentle opening.
      </Fragment>,
    ],
    demo: {
      src: embed("duel.valid"),
      caption: "PBot vs Aidan. Tap the top to strike, sides to step.",
      width: 300,
      height: 520,
    },
  },

  {
    kicker: "Design system fidelity",
    title: "366 tokens, generated from Figma, enforced by a gate",
    lead:
      "The Pandai DS 1.5 variables are read from Figma and generated into a token layer. No component may introduce a colour value - a build script fails if one does.",
    points: [
      <Fragment key={22}>
        <strong>{SUBJECT_KEYS.length} subject palettes</strong> and{" "}
        {ACCENT_FAMILIES.length} accent families, resolved through a three-level alias
        chain.
      </Fragment>,
      <Fragment key={23}>
        <span className="mono">check:ds</span> fails the build on any hex, rgb, hsl or
        oklch outside the generated layer. <span className="mono">check:tokens</span>{" "}
        catches a <span className="mono">var(--…)</span> that resolves to nothing.
      </Fragment>,
      <Fragment key={24}>
        <strong>One deliberate exception</strong>, on the record: the arcade scenes.
        A DS ramp is one hue in five quiet tints; a game needs a sky family and a
        solid family. Zul&apos;s call, one file wide.
      </Fragment>,
    ],
    demo: {
      src: "/ds",
      caption: "The live token and primitive reference.",
      width: 380,
      height: 500,
    },
  },

  {
    kicker: "How I know it works",
    title: "Verification, and four ways I measured wrong",
    lead:
      "154 tests behind four gates, plus something the tests cannot do: looking at it.",
    points: [
      <Fragment key={25}>
        <strong>Screenshots find what grep cannot.</strong> Three bugs shipped past
        checks that returned 200 with every expected string - a white box round an
        avatar, a game unplayable by keyboard, a platformer floating in empty space.
      </Fragment>,
      <Fragment key={26}>
        <strong>My instrument shared a signal with the subject.</strong> I counted
        power-ups by a 440 Hz chirp - which is also a note in the background music.
        Every &quot;points&quot; figure was counting the soundtrack.
      </Fragment>,
      <Fragment key={27}>
        <strong>A scripted pilot is not a player.</strong> Tapping on a fixed interval
        settles the bird into one altitude band; if that band misses the coins it
        misses <em>every</em> coin and reports a confident zero.
      </Fragment>,
      <Fragment key={28}>
        <strong>And the one that needed a person.</strong> Nothing in the suite renders
        a page, so nothing caught the game swallowing space and enter from the prompt
        box. Zul typed, and found it in a minute.
      </Fragment>,
    ],
  },

  {
    kicker: "Cost and safety",
    title: "The model is off, on purpose",
    lead:
      "Total spent on this project, ever: about six cents. What runs today derives physics from your words in code.",
    table: {
      head: ["Control", "State"],
      rows: [
        ["Provider seam", <Fragment key={29}>Wired, and imported by <em>nothing</em></Fragment>],
        ["providerMode()", "Returns \"stub\" unless explicitly set to live"],
        ["The one paid test", "Excluded from npm test; needs its own config"],
        ["Worker secret", "Not set - the deployed site cannot spend money"],
        ["Spend ceiling", <Fragment key={30}><strong>Not built.</strong> Blocks turning it on</Fragment>],
        ["Rate limit", <Fragment key={31}><strong>Not built.</strong> Blocks turning it on</Fragment>],
      ],
    },
    note: {
      tone: "warn",
      body: (
        <Fragment key={32}>
          This is the honest gap. The architecture that makes generation <em>safe</em>{" "}
          is built and tested; generation itself has been exercised once. Turning it on
          is a decision plus roughly a session of work on the two missing controls.
        </Fragment>
      ),
    },
  },

  {
    kicker: "Delivery",
    title: "Deployed, exportable, and readable by the team who inherits it",
    points: [
      <Fragment key={33}>
        <strong>Next.js → OpenNext → Cloudflare Workers.</strong> Deployed in week one,
        before the app did anything, so the stack was never a late surprise.
      </Fragment>,
      <Fragment key={34}>
        <strong>Three export shapes:</strong> an iframe tag, a Blade partial, and the
        raw spec JSON. The spec travels in the URL, so an embed needs no database.
      </Fragment>,
      <Fragment key={35}>
        <strong>The docs are the handover.</strong> A dated log of every session, the
        reasoning behind each decision, and ten numbered build gotchas that each cost
        real time to find.
      </Fragment>,
    ],
    demo: {
      src: embed("platformer.valid"),
      caption: "The same iframe tag Pandai would paste into a Blade template.",
      width: 300,
      height: 520,
    },
  },

  {
    kicker: "Program fit",
    title: "Against the program's stated rules",
    lead:
      "Weeks 1-12 in the submission repo are still placeholder READMEs, so there is no published syllabus to map onto. These are the rules the program has actually stated, in week-00 and its CLAUDE.md.",
    table: {
      head: ["Stated rule", "This project"],
      rows: [
        ["Submit by pushing and sharing a link", "Public repo, deployed URL, 23 commits"],
        ["Assume anything committed is public", "No key ever committed; verified across full history"],
        ["Credentials from the environment only", ".env.local, gitignored, never a Worker secret"],
        [
          "Python is the default language",
          <Fragment key={36}><strong>Diverges.</strong> TypeScript - the deliverable is a web app on Workers. Flagged for the teaching team, unanswered</Fragment>,
        ],
        [
          "One self-contained folder per week",
          <Fragment key={37}><strong>Diverges.</strong> This is a standing project in its own repo; week folders would link to a release here</Fragment>,
        ],
      ],
    },
    note: {
      tone: "warn",
      body: (
        <Fragment key={38}>
          Both divergences were recorded in <span className="mono">docs/PROJECT.md</span>{" "}
          before any code was written, and both still need a yes or no from the teaching
          team. Presenting them as settled would be the dishonest option.
        </Fragment>
      ),
    },
  },

  {
    kicker: "What an FDE actually did here",
    title: "The work that was not writing code",
    points: [
      <Fragment key={39}>
        <strong>Corrected the brief.</strong> I assumed curriculum quiz games and built
        toward them. Zul wanted arcade games with a Pandai skin. The pivot is dated in
        SCOPE.md rather than quietly rewritten.
      </Fragment>,
      <Fragment key={40}>
        <strong>Said no, in writing, with reasons.</strong> Fighting, shooters, racing
        and RPGs were declined by name - and when the fighting reason turned out to be
        wrong, it was reversed and the engine built.
      </Fragment>,
      <Fragment key={41}>
        <strong>Refused to spend the customer&apos;s money by default.</strong> One
        paid call, ever, and the deployed site physically cannot make another.
      </Fragment>,
      <Fragment key={42}>
        <strong>Stopped before publishing their design system.</strong> The repo holds
        Pandai&apos;s tokens, two internal Figma keys and mascot art. That went public
        only after Zul chose it, having been shown exactly what was in it.
      </Fragment>,
    ],
  },

  {
    kicker: "Honestly",
    title: "What is not done",
    points: [
      <Fragment key={43}>
        <strong>Generation is unproven.</strong> One model call, ever. The safety
        around it is real; the thing itself has barely run.
      </Fragment>,
      <Fragment key={44}>
        <strong>No persistence, no auth, no rate limit.</strong> D1 is commented out;{" "}
        <span className="mono">/api/generate</span> is open to anyone with the URL.
      </Fragment>,
      <Fragment key={45}>
        <strong>No evals.</strong> Nothing measures whether a generated game is{" "}
        <em>good</em> - only that it is playable.
      </Fragment>,
      <Fragment key={46}>
        <strong>Nobody has played it.</strong> Only me and scripted pilots. For a game,
        that is the largest hole on this list.
      </Fragment>,
      <Fragment key={47}>
        <strong>The export has never been dropped into Pandai.</strong> Untested where
        it actually matters.
      </Fragment>,
    ],
    note: {
      tone: "plain",
      body: (
        <Fragment key={48}>
          <strong>And this page is unlisted, not private.</strong> It is kept out of the
          navigation and marked noindex, but the site has no authentication and the
          repository is public. Anyone with the URL can open it. If it needs to be
          genuinely private, that is auth - and auth is on the not-done list above.
        </Fragment>
      ),
    },
  },
];

export default function DeckPage() {
  return <Deck slides={slides} />;
}
