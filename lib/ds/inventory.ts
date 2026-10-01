/**
 * Every component in Pandai Design System 1.5, and what has happened to it
 * here.
 *
 * Same idea as `lib/arcade/catalogue.ts`: the list of things somebody might
 * ask for is written down IN FULL, with an honest state against each, so
 * "not built yet" is something the showcase says out loud instead of
 * something a missing page implies.
 *
 * WHERE THE LIST CAME FROM
 *
 * Figma MCP `search_design_system` against the DS file
 * (`TLVKe3bgJTdVvuPAzgDq2f`), restricted to the "Pandai Design System 1.5"
 * library, on 2026-10-02. `componentKey` is what that search returned. An
 * entry without one was NOT returned by the search and is named elsewhere -
 * the `source` says where. The search returns at most 20 results per query and
 * one query per call, so this list is what was found, not proof that nothing
 * else exists. Icons, illustrations and the "Parts" sub-components are left
 * out on purpose: they are pieces of the components below, not components a
 * page would use on their own.
 *
 * WHAT THE STATES MEAN
 *
 *   built    geometry read off the Figma node, every variant this site needs
 *   partial  built from SOME variants - `missing` says which are not read yet
 *   planned  not built. The showcase still gives it a page, saying so
 *
 * A `figma: null` entry is COMPOSED here from DS tokens because the DS has no
 * node for it (the game timer). It must say what it borrowed and from where.
 *
 * Adding a component: docs/DESIGN-SYSTEM-COMPONENTS.md.
 */

export type DsStatus = "built" | "partial" | "planned";

export const DS_GROUPS = [
  { key: "actions", label: "Actions" },
  { key: "badges", label: "Badges and tags" },
  { key: "cards", label: "Cards and layout" },
  { key: "forms", label: "Form fields" },
  { key: "progress", label: "Progress" },
  { key: "feedback", label: "Feedback" },
  { key: "people", label: "People" },
  { key: "composed", label: "Composed for games" },
] as const;

export type DsGroup = (typeof DS_GROUPS)[number]["key"];

export type DsEntry = {
  /** URL segment: `/ds/components/<slug>`. Kebab-case, stable. */
  slug: string;
  /** What the showcase calls it. */
  name: string;
  /** The component set's exact name in the DS library, or null if composed. */
  figma: string | null;
  /** From the 2026-10-02 library search. Absent = not returned by it. */
  componentKey?: string;
  /** How we know it exists, when the search did not return it. */
  source?: string;
  group: DsGroup;
  status: DsStatus;
  /** One sentence: what it is. */
  summary: string;
  /** Where it appears in a generated game, or where it would. */
  inGames: string;
  /** partial / planned: what is not built yet. */
  missing?: string;
  /** Names exported from `@/components/ds` that implement it. */
  exports?: string[];
};

export const DS_INVENTORY: DsEntry[] = [
  /* ------------------------------------------------------------ Actions */
  {
    slug: "button",
    name: "Button",
    figma: "Button - 1.5",
    componentKey: "bc6374c26991619b77d3d58844f66a04c0e74229",
    group: "actions",
    status: "partial",
    summary:
      "The pill button. Primary, Secondary and Tertiary, with the DS's one shared hover treatment.",
    inGames:
      "The Check button in sequence-order. The arcade Play button is GameFrame's own styled button and does not use it yet.",
    missing:
      "Only Type=Student, Size=L was read. Sizes M and S scale padding and are not DS-exact; the semantic colour variants (warning, error) and the leading-icon slot are not built.",
    exports: ["Button"],
  },
  {
    slug: "button-icon",
    name: "Button Icon",
    figma: "Button Icon - 1.5",
    componentKey: "f74ddba75b7d0bcf154ce2454ffb173aa8b9180f",
    group: "actions",
    status: "planned",
    summary: "A round, icon-only button.",
    inGames:
      "Pause, mute and full screen on the game frame, and the arrow keys of the thumb pad.",
    missing: "Not read from Figma yet.",
  },
  {
    slug: "button-group",
    name: "Button Group",
    figma: "Button Group - 1.5",
    componentKey: "dcb0ca1d71eb69327bf71e17ccc266e717c7b9b0",
    group: "actions",
    status: "planned",
    summary: "Buttons joined into one segmented control.",
    inGames: "The Easy / Normal / Hard choice on /create, which is a select today.",
    missing: "Not read from Figma yet.",
  },
  {
    slug: "link",
    name: "Link",
    figma: "Link - 1.5",
    componentKey: "41ab4578f318aab0fa06d5724c1cfc56afd62090",
    group: "actions",
    status: "planned",
    summary: "An inline text link.",
    inGames: "Links in game instructions and in the export panel.",
    missing:
      "Not built. The product repo audited this node on 2026-09-05 (docs/DESIGN-SYSTEM.md section 13 there) - start from that.",
  },
  {
    slug: "pagination",
    name: "Pagination",
    figma: "Pagination - 1.5",
    componentKey: "a51f430d087a1ccd554992b4849b54c53123125a",
    group: "actions",
    status: "planned",
    summary: "Page numbers with previous and next.",
    inGames: "Paging through a long question bank in a quiz template.",
    missing: "Not read from Figma yet.",
  },

  /* ----------------------------------------------------- Badges and tags */
  {
    slug: "tag",
    name: "Tag",
    figma: "Tag - 1.5",
    componentKey: "b29bf252498f01531acd6730363e8664bceae26f",
    group: "badges",
    status: "partial",
    summary:
      "A small pill label. Exported as Chip, which is what the generator calls it.",
    inGames:
      "The subject, year level and template name above a learning game; the fixture picker on /play.",
    missing:
      "Only Size=S was read. The hover and pressed states exist in the CSS comment but nothing here is interactive yet.",
    exports: ["Chip"],
  },
  {
    slug: "label-badge",
    name: "Label Badge",
    figma: "Label Badge - 1.5",
    componentKey: "0a6c793bcfdbeda11d35fc29de926da973dcc854",
    group: "badges",
    status: "planned",
    summary: "A coloured label in seven types and two sizes.",
    inGames: "NEW, HARD or BONUS on a gallery card.",
    missing:
      "Not built. Its stroke is INSIDE the frame, unlike the other badges - CSS padding is DS padding minus the border (product repo, DESIGN-SYSTEM.md section 9).",
  },
  {
    slug: "pill-badge",
    name: "Pill Badge",
    figma: "Pill Badge - 1.5",
    componentKey: "f76db29ac9508ff2304ca8007e3e3325ec1d0086",
    group: "badges",
    status: "planned",
    summary: "A rounded badge for a short value.",
    inGames: "A multiplier such as x2 next to the score.",
    missing: "Not read from Figma yet.",
  },
  {
    slug: "icon-badge",
    name: "Icon Badge",
    figma: "Icon Badge - 1.5",
    componentKey: "5c54a1a46cf30a29fef785dc3c38ea6ff0bd1f64",
    group: "badges",
    status: "planned",
    summary: "An icon on a coloured disc, in S, M and L.",
    inGames: "The power-up indicator: magnet, Power Rush.",
    missing:
      "Not built. Its stroke is OUTSIDE the frame - the ring is an outset box-shadow, not a border.",
  },
  {
    slug: "number-badge",
    name: "Number Badge",
    figma: "Number Badge - 1.5",
    componentKey: "3c17dd110818039802080c23cc7f7dc6cad684cf",
    group: "badges",
    status: "planned",
    summary: "A count on a small disc.",
    inGames: "Lives left, or coins carried, on a HUD icon.",
    missing: "Not built. Stroke OUTSIDE, like Icon Badge - a 20px box paints 22.",
  },
  {
    slug: "status-badge",
    name: "Status Badge",
    figma: "Status Badge - 1.5",
    componentKey: "d7f72880080f271cca9d9247244f277be0b44dc1",
    group: "badges",
    status: "planned",
    summary:
      "The DS's game-status badge - score, streak, lives, coins, ruby - with an Orientation axis.",
    inGames:
      "The in-game HUD. Today the Status pill below stands in for it, using the same Status tokens.",
    missing:
      "Not read. Status pill is the placeholder; replace it when this node is built.",
  },

  /* ---------------------------------------------------- Cards and layout */
  {
    slug: "primary-card",
    name: "Primary Card",
    figma: "Primary Card - 1.5",
    componentKey: "25ebd3ddf23af32c45caae564f8ce59e0dc28264",
    group: "cards",
    status: "built",
    summary:
      "The first-elevated card: radius 24, padding 16 on all four sides, gap 12.",
    inGames:
      "Every panel on /create and /play, and the frame round a learning game.",
    exports: ["Card", "CardStack"],
  },
  {
    slug: "quiz-card",
    name: "Quiz Card",
    figma: "Quiz Card - 1.5",
    componentKey: "e608316282a9467297b7755ca4b436dba48184a5",
    group: "cards",
    status: "partial",
    summary: "A card that wears a subject's colour on its stroke. Radius 18.",
    inGames: "A question in quiz-race; a subject swatch in the showcase.",
    missing:
      "Only Type=Subjects was read, and it is reached as Card variant=\"subject\". The thumbnail, loading and answered states are not built.",
    exports: ["Card"],
  },
  {
    slug: "divider",
    name: "Divider",
    figma: "Divider - 1.5",
    componentKey: "61b0f077ead48d906398843504d97a4dfbfcd7c8",
    group: "cards",
    status: "planned",
    summary: "A horizontal or vertical rule.",
    inGames: "Between sections of the result panel on /create.",
    missing: "Not read from Figma yet.",
  },
  {
    slug: "scroll-bar",
    name: "Scroll Bar",
    figma: "Scroll Bar - 1.5",
    componentKey: "e5f90611f97574cdb47eadf3af48633f1c6615e9",
    group: "cards",
    status: "planned",
    summary: "The DS-styled scroll bar.",
    inGames: "A long word list in fill-blank or sort-buckets.",
    missing: "Not read from Figma yet.",
  },

  /* ---------------------------------------------------------- Form fields */
  {
    slug: "input-field",
    name: "Input Field",
    figma: "Input Field 1.5",
    componentKey: "e7ab5a57e33fe0e25393ee5813323e1c5cb486c4",
    group: "forms",
    status: "planned",
    summary:
      "A text field with label, helper text and an error state. The Figma name has no dash.",
    inGames:
      "The prompt box and notes on /create; the answer box in fill-blank.",
    missing:
      "Not built. The product repo read Type=Error node by node on 2026-08-28 - one .is-error class.",
  },
  {
    slug: "radio-button",
    name: "Radio Button",
    figma: "Radio Button - 1.5",
    componentKey: "305de30831346ce92fde339e9ed93917efb1ece2",
    group: "forms",
    status: "planned",
    summary: "The bare radio control.",
    inGames: "Inside Radio Field.",
    missing: "Not read from Figma yet.",
  },
  {
    slug: "radio-field",
    name: "Radio Field",
    figma: "Radio Field - 1.5",
    componentKey: "3171146975aaf2861a14f5db15539a60660d3147",
    group: "forms",
    status: "planned",
    summary: "A full-width answer option: the radio plus its label, in a box.",
    inGames:
      "The answer options in quiz-race - the most game-relevant component not yet built.",
    missing:
      "Not built. Measured by the product repo on 2026-07-14 (node 1608:37182).",
  },
  {
    slug: "date-picker",
    name: "Date Picker",
    figma: "Date Picker - 1.5",
    source:
      "Named in the description of its part, Date Picker Cell - Parts, which the search did return.",
    group: "forms",
    status: "planned",
    summary: "A month calendar with single and range selection.",
    inGames: "None. Listed so the inventory is complete, not because a game needs it.",
    missing: "Not built, and no game needs it.",
  },

  /* ------------------------------------------------------------- Progress */
  {
    slug: "progress-bar",
    name: "Progress Bar",
    figma: "Progress Bar - 1.5",
    componentKey: "989a288994af676ba74d27afa6b3c5725f6e304b",
    group: "progress",
    status: "built",
    summary: "A pill track in S, M and L - 4, 8 and 16 high. The fill takes the accent.",
    inGames: "Questions answered, under every learning game.",
    exports: ["ProgressBar"],
  },
  {
    slug: "progress-bar-value",
    name: "Progress Bar Value",
    figma: "Progress Bar Value - 1.5",
    source:
      "Not returned by the library search. Named in pandai.question.uiux docs/DESIGN-SYSTEM.md section 10, node 11091:41.",
    group: "progress",
    status: "planned",
    summary: "A Progress Bar with its value written beside it.",
    inGames: "Level progress on a results screen.",
    missing:
      "Not built. The product repo's note: floor the fill's width at the track height, or a small value is not a pill.",
  },
  {
    slug: "progress-donut",
    name: "Progress Donut",
    figma: "Progress Donut - 1.5",
    componentKey: "a9f10ec9846d24d22a5b0a1cc009cc47e8a19ed8",
    group: "progress",
    status: "planned",
    summary: "A circular gauge with the value and a label in the middle.",
    inGames: "Accuracy on the end-of-game summary.",
    missing: "Not read from Figma yet.",
  },
  {
    slug: "progress-half-donut",
    name: "Progress Half Donut",
    figma: "Progress Half Donut - 1.5",
    componentKey: "e66d9acc0851b510a7cbe69233d2f665315b2540",
    group: "progress",
    status: "planned",
    summary: "A semicircular gauge; the number sits in the dial's opening.",
    inGames: "A speed or power meter.",
    missing: "Not read from Figma yet.",
  },
  {
    slug: "skeleton",
    name: "Skeleton",
    figma: "Skeleton - 1.5",
    componentKey: "c36b74cb73a9625d3146d46ec8dd95e67a3cc550",
    group: "progress",
    status: "planned",
    summary:
      "Loading placeholders - Line, Block, Circle, Pill - with one sweep across all of them.",
    inGames: "While /create waits on the model in live mode.",
    missing:
      "Not built. The Figma description carries the full spec, including timing: nothing for 250ms, then at least 400ms, then a message after 8s.",
  },
  {
    slug: "spinner",
    name: "Spinner",
    figma: "Spinner - 1.5",
    source:
      "Not returned by the library search. Named in the Skeleton - 1.5 description: \"Keep Spinner - 1.5 for actions that stay on the page\".",
    group: "progress",
    status: "planned",
    summary: "A spinner for an action that keeps you on the page.",
    inGames: "The Generate button while it works.",
    missing: "Not found by the search; confirm the node before building.",
  },

  /* ------------------------------------------------------------- Feedback */
  {
    slug: "alert",
    name: "Alert",
    figma: "Alert - 1.5",
    componentKey: "c78528185394ddf99f6cbe04b5c9ae948cc7b153",
    group: "feedback",
    status: "planned",
    summary: "An inline message bar.",
    inGames:
      "The adaptation notice on /create (\"a racing game is the runner\") and an input that did nothing.",
    missing: "Not read from Figma yet.",
  },
  {
    slug: "modal-alerts",
    name: "Modal Alerts",
    figma: "Modal Alerts - 1.5",
    componentKey: "a8a4d924ff6b65b0bf4eb4c634e0fa95f4de64fd",
    group: "feedback",
    status: "planned",
    summary: "A modal that asks or tells, with actions.",
    inGames: "Game over, with Retry and Back.",
    missing: "Not read from Figma yet.",
  },
  {
    slug: "status-modal-alerts",
    name: "Status Modal Alerts",
    figma: "Status Modal Alerts - 1.5",
    componentKey: "a5c776504d5d9c1ac602df37c4dc995c4604fae5",
    group: "feedback",
    status: "planned",
    summary: "A modal led by a success, warning or error state.",
    inGames: "You won / time's up at the end of a round.",
    missing: "Not read from Figma yet.",
  },
  {
    slug: "tooltip",
    name: "Tooltip",
    figma: "Tooltip - 1.5",
    componentKey: "fa2ed3af5280ad79298f44a89bde119cdb238c2f",
    group: "feedback",
    status: "planned",
    summary: "A short hint pointing at what it explains.",
    inGames: "What a gallery card's engine is; what a control does.",
    missing: "Not built. The product repo keeps a 16px gap to its target.",
  },

  /* --------------------------------------------------------------- People */
  {
    slug: "avatar",
    name: "Avatar",
    figma: "Avatar - 1.5",
    componentKey: "0c97ceee276242397eade9662a9bfe8726eb35b6",
    group: "people",
    status: "planned",
    summary: "A round portrait with the DS ring.",
    inGames: "The player and the opponent in the duel; the mascot on a card.",
    missing:
      "Not built. Watch the white box: the battle avatars are PNGs with an opaque background (docs/SCREENSHOTS.md).",
  },
  {
    slug: "avatar-stacked",
    name: "Avatar Stacked",
    figma: "Avatar Stacked - 1.5",
    componentKey: "b5228f6522c565775b4876d5976aab682b6d3c35",
    group: "people",
    status: "planned",
    summary: "Overlapping avatars for a group.",
    inGames: "Who played this game.",
    missing: "Not read from Figma yet.",
  },

  /* ---------------------------------------------------- Composed for games */
  {
    slug: "timer",
    name: "Timer",
    figma: null,
    group: "composed",
    status: "built",
    summary:
      "A countdown pill. The DS has no Timer node, so this borrows Tag geometry and the informative and warning tokens.",
    inGames: "The time limit in quiz-race and any learning game that has one.",
    exports: ["Timer"],
  },
  {
    slug: "status-pill",
    name: "Status pill",
    figma: null,
    group: "composed",
    status: "built",
    summary:
      "Score, streak, lives, coins or ruby on the DS Status colours. A stand-in until Status Badge - 1.5 is read.",
    inGames: "Score and streak above every learning game.",
    exports: ["StatusPill"],
  },
];

export function entryFor(slug: string): DsEntry | undefined {
  return DS_INVENTORY.find((e) => e.slug === slug);
}

/** How much of the DS this site has, counted the same way everywhere. */
export function coverage() {
  const fromDs = DS_INVENTORY.filter((e) => e.figma !== null);
  const count = (s: DsStatus) => fromDs.filter((e) => e.status === s).length;
  return {
    total: fromDs.length,
    built: count("built"),
    partial: count("partial"),
    planned: count("planned"),
    composed: DS_INVENTORY.length - fromDs.length,
  };
}
