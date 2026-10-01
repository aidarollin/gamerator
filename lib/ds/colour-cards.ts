/**
 * The DS 1.5 colour cards, card by card, as they sit on the "🎨 Colors" page
 * of the DS file (TLVKe3bgJTdVvuPAzgDq2f). Read 2026-10-02 with
 * scripts/figma-colour-cards-resolver.js.
 *
 * NAMES ONLY. Every value comes from the generated token layer:
 *   primitive cards -> PRIMITIVES
 *   semantic cards  -> the CSS variable (Light, what this site renders) and
 *                      DARK_VALUES (Dark, display only)
 * lib/ds/colour-cards.test.ts fails if a card names a token the layer lacks.
 *
 * Order is Figma's. `node` is the card's Figma node id, so a card can be
 * traced back to the frame it was read from.
 */

export type ColourCard = { node: string; title: string; tokens: string[] };

/** One page of semantic cards: a frame on the "🎨 Colors" page. */
export type SemanticSet = {
  slug: string;
  title: string;
  /** The Figma frame holding every card in the set. */
  frame: string;
  lede: string;
  cards: ColourCard[];
};

/** Primitive Colors - 43 cards. The first 24 are palettes, the last 19 subjects. */
export const PRIMITIVE_CARDS: ColourCard[] = [
  { node: "1898:12523", title: "OG Green", tokens: ["OG-Green/50", "OG-Green/100", "OG-Green/200", "OG-Green/300", "OG-Green/400", "OG-Green/500 (Base)", "OG-Green/600", "OG-Green/700", "OG-Green/800", "OG-Green/900"] },
  { node: "1898:12876", title: "Lime", tokens: ["Lime/50", "Lime/100", "Lime/200", "Lime/300", "Lime/400", "Lime/500 (Base)", "Lime/600", "Lime/700", "Lime/800", "Lime/900"] },
  { node: "1898:13344", title: "Teal", tokens: ["Teal/50", "Teal/100", "Teal/200", "Teal/300", "Teal/400", "Teal/500 (Base)", "Teal/600", "Teal/700", "Teal/800", "Teal/900"] },
  { node: "1898:13656", title: "Pink", tokens: ["Pink/50", "Pink/100", "Pink/200", "Pink/300", "Pink/400", "Pink/500 (Base)", "Pink/600", "Pink/700", "Pink/800", "Pink/900"] },
  { node: "1898:13968", title: "Yellow", tokens: ["Yellow/50", "Yellow/100", "Yellow/200", "Yellow/300", "Yellow/400", "Yellow/500 (Base)", "Yellow/600", "Yellow/700", "Yellow/800", "Yellow/900"] },
  { node: "1898:14280", title: "Purple", tokens: ["Purple/50", "Purple/100", "Purple/200", "Purple/300", "Purple/400", "Purple/500 (Base)", "Purple/600", "Purple/700", "Purple/800", "Purple/900"] },
  { node: "1898:14592", title: "Sky", tokens: ["Sky/50", "Sky/100", "Sky/200", "Sky/300", "Sky/400", "Sky/500 (Base)", "Sky/600", "Sky/700", "Sky/800", "Sky/900"] },
  { node: "1898:14904", title: "Neon", tokens: ["Neon/50", "Neon/100", "Neon/200", "Neon/300", "Neon/400", "Neon/500 (Base)", "Neon/600", "Neon/700", "Neon/800", "Neon/900"] },
  { node: "1898:15372", title: "Orange", tokens: ["Orange/100", "Orange/200", "Orange/300", "Orange/400", "Orange/500 (Base)", "Orange/600", "Orange/700", "Orange/800", "Orange/900"] },
  { node: "1898:15684", title: "Red", tokens: ["Red/100", "Red/200", "Red/300", "Red/400", "Red/500 (Base)", "Red/600", "Red/700", "Red/800", "Red/900"] },
  { node: "1898:15996", title: "Blue", tokens: ["Blue/100", "Blue/200", "Blue/300", "Blue/400", "Blue/500 (Base)", "Blue/600", "Blue/700", "Blue/800", "Blue/900"] },
  { node: "1898:16308", title: "Grey", tokens: ["Grey/50", "Grey/100", "Grey/150", "Grey/200", "Grey/250", "Grey/300", "Grey/350", "Grey/400", "Grey/450", "Grey/500", "Grey/550", "Grey/600", "Grey/650", "Grey/700", "Grey/750", "Grey/800", "Grey/850", "Grey/900", "Grey/950"] },
  { node: "7508:2", title: "Slate", tokens: ["Slate/50", "Slate/100", "Slate/200", "Slate/300", "Slate/400", "Slate/500 (Base)", "Slate/600", "Slate/700", "Slate/800", "Slate/900"] },
  { node: "7508:175", title: "Green", tokens: ["Green/50", "Green/100", "Green/200", "Green/300", "Green/400", "Green/500 (Base)", "Green/600", "Green/700", "Green/800", "Green/900"] },
  { node: "7508:348", title: "Butter", tokens: ["Butter/100", "Butter/200", "Butter/300", "Butter/400", "Butter/500 (Base)", "Butter/600", "Butter/700", "Butter/800", "Butter/900"] },
  { node: "7508:504", title: "Minion", tokens: ["Minion/100", "Minion/200", "Minion/300", "Minion/400", "Minion/500 (Base)", "Minion/600", "Minion/700", "Minion/800", "Minion/900"] },
  { node: "7508:660", title: "Azure", tokens: ["Azure/100", "Azure/200", "Azure/300", "Azure/400", "Azure/500 (Base)", "Azure/600", "Azure/700", "Azure/800", "Azure/900"] },
  { node: "7508:816", title: "Pumpkin", tokens: ["Pumpkin/100", "Pumpkin/200", "Pumpkin/300", "Pumpkin/400", "Pumpkin/500 (Base)", "Pumpkin/600", "Pumpkin/700", "Pumpkin/800", "Pumpkin/900"] },
  { node: "7510:2", title: "Gold", tokens: ["Gold/100", "Gold/200", "Gold/300", "Gold/400", "Gold/500 (Base)", "Gold/600", "Gold/700", "Gold/800", "Gold/900"] },
  { node: "7510:158", title: "Silver", tokens: ["Silver/100", "Silver/200", "Silver/300", "Silver/400", "Silver/500 (Base)", "Silver/600", "Silver/700", "Silver/800", "Silver/900"] },
  { node: "7510:314", title: "Bronze", tokens: ["Bronze/100", "Bronze/200", "Bronze/300", "Bronze/400", "Bronze/500 (Base)", "Bronze/600", "Bronze/700", "Bronze/800", "Bronze/900"] },
  { node: "7510:470", title: "Pink Secondary", tokens: ["Pink-Secondary/50", "Pink-Secondary/100", "Pink-Secondary/200", "Pink-Secondary/300", "Pink-Secondary/400", "Pink-Secondary/500 (Base)", "Pink-Secondary/600", "Pink-Secondary/700", "Pink-Secondary/800", "Pink-Secondary/900"] },
  { node: "7510:643", title: "Pink Tertiary", tokens: ["Pink-Tertiary/50", "Pink-Tertiary/100", "Pink-Tertiary/200", "Pink-Tertiary/300", "Pink-Tertiary/400", "Pink-Tertiary/500 (Base)", "Pink-Tertiary/600", "Pink-Tertiary/700", "Pink-Tertiary/800", "Pink-Tertiary/900"] },
  { node: "7510:816", title: "Foundation", tokens: ["Foundation/white", "Foundation/white 50", "Foundation/black", "Foundation/black 50", "Foundation/slate"] },
  { node: "7514:2", title: "Account", tokens: ["Subject/account/50", "Subject/account/100", "Subject/account/200", "Subject/account/300", "Subject/account/400", "Subject/account/500 (Base)", "Subject/account/600", "Subject/account/700", "Subject/account/800", "Subject/account/900"] },
  { node: "7514:175", title: "Add Math", tokens: ["Subject/add-math/50", "Subject/add-math/100", "Subject/add-math/200", "Subject/add-math/300", "Subject/add-math/400", "Subject/add-math/500 (Base)", "Subject/add-math/600", "Subject/add-math/700", "Subject/add-math/800", "Subject/add-math/900"] },
  { node: "7514:348", title: "Biology", tokens: ["Subject/biology/50", "Subject/biology/100", "Subject/biology/200", "Subject/biology/300", "Subject/biology/400", "Subject/biology/500 (Base)", "Subject/biology/600", "Subject/biology/700", "Subject/biology/800", "Subject/biology/900"] },
  { node: "7514:521", title: "Bahasa Melayu", tokens: ["Subject/b-melayu/50", "Subject/b-melayu/100", "Subject/b-melayu/200", "Subject/b-melayu/300", "Subject/b-melayu/400", "Subject/b-melayu/500 (Base)", "Subject/b-melayu/600", "Subject/b-melayu/700", "Subject/b-melayu/800", "Subject/b-melayu/900"] },
  { node: "7514:694", title: "Business", tokens: ["Subject/business/50", "Subject/business/100", "Subject/business/200", "Subject/business/300", "Subject/business/400", "Subject/business/500 (Base)", "Subject/business/600", "Subject/business/700", "Subject/business/800", "Subject/business/900"] },
  { node: "7514:867", title: "Chemistry", tokens: ["Subject/chemistry/50", "Subject/chemistry/100", "Subject/chemistry/200", "Subject/chemistry/300", "Subject/chemistry/400", "Subject/chemistry/500 (Base)", "Subject/chemistry/600", "Subject/chemistry/700", "Subject/chemistry/800", "Subject/chemistry/900"] },
  { node: "7514:1040", title: "Chinese Language", tokens: ["Subject/chi-lang/50", "Subject/chi-lang/100", "Subject/chi-lang/200", "Subject/chi-lang/300", "Subject/chi-lang/400", "Subject/chi-lang/500 (Base)", "Subject/chi-lang/600", "Subject/chi-lang/700", "Subject/chi-lang/800", "Subject/chi-lang/900"] },
  { node: "7515:2", title: "Computer Science", tokens: ["Subject/comp-science/50", "Subject/comp-science/100", "Subject/comp-science/200", "Subject/comp-science/300", "Subject/comp-science/400", "Subject/comp-science/500 (Base)", "Subject/comp-science/600", "Subject/comp-science/700", "Subject/comp-science/800", "Subject/comp-science/900"] },
  { node: "7515:175", title: "Economy", tokens: ["Subject/economy/50", "Subject/economy/100", "Subject/economy/200", "Subject/economy/300", "Subject/economy/400", "Subject/economy/500 (Base)", "Subject/economy/600", "Subject/economy/700", "Subject/economy/800", "Subject/economy/900"] },
  { node: "7515:348", title: "English", tokens: ["Subject/english/50", "Subject/english/100", "Subject/english/200", "Subject/english/300", "Subject/english/400", "Subject/english/500 (Base)", "Subject/english/600", "Subject/english/700", "Subject/english/800", "Subject/english/900"] },
  { node: "7515:521", title: "Geography", tokens: ["Subject/geo/50", "Subject/geo/100", "Subject/geo/200", "Subject/geo/300", "Subject/geo/400", "Subject/geo/500 (Base)", "Subject/geo/600", "Subject/geo/700", "Subject/geo/800", "Subject/geo/900"] },
  { node: "7515:694", title: "History", tokens: ["Subject/history/50", "Subject/history/100", "Subject/history/200", "Subject/history/300", "Subject/history/400", "Subject/history/500 (Base)", "Subject/history/600", "Subject/history/700", "Subject/history/800", "Subject/history/900"] },
  { node: "7515:867", title: "Islamic Studies", tokens: ["Subject/islamic/50", "Subject/islamic/100", "Subject/islamic/200", "Subject/islamic/300", "Subject/islamic/400", "Subject/islamic/500 (Base)", "Subject/islamic/600", "Subject/islamic/700", "Subject/islamic/800", "Subject/islamic/900"] },
  { node: "7515:1040", title: "KAFA", tokens: ["Subject/kafa/50", "Subject/kafa/100", "Subject/kafa/200", "Subject/kafa/300", "Subject/kafa/400", "Subject/kafa/500 (Base)", "Subject/kafa/600", "Subject/kafa/700", "Subject/kafa/800", "Subject/kafa/900"] },
  { node: "7516:2", title: "Mathematics", tokens: ["Subject/math/50", "Subject/math/100", "Subject/math/200", "Subject/math/300", "Subject/math/400", "Subject/math/500 (Base)", "Subject/math/600", "Subject/math/700", "Subject/math/800", "Subject/math/900"] },
  { node: "7516:175", title: "Moral", tokens: ["Subject/moral/50", "Subject/moral/100", "Subject/moral/200", "Subject/moral/300", "Subject/moral/400", "Subject/moral/500 (Base)", "Subject/moral/600", "Subject/moral/700", "Subject/moral/800", "Subject/moral/900"] },
  { node: "7516:348", title: "Physics", tokens: ["Subject/physics/50", "Subject/physics/100", "Subject/physics/200", "Subject/physics/300", "Subject/physics/400", "Subject/physics/500 (Base)", "Subject/physics/600", "Subject/physics/700", "Subject/physics/800", "Subject/physics/900"] },
  { node: "7516:521", title: "RBT", tokens: ["Subject/rbt/50", "Subject/rbt/100", "Subject/rbt/200", "Subject/rbt/300", "Subject/rbt/400", "Subject/rbt/500 (Base)", "Subject/rbt/600", "Subject/rbt/700", "Subject/rbt/800", "Subject/rbt/900"] },
  { node: "7521:2", title: "Science", tokens: ["Subject/science/50", "Subject/science/100", "Subject/science/200", "Subject/science/300", "Subject/science/400", "Subject/science/500 (Base)", "Subject/science/600", "Subject/science/700", "Subject/science/800", "Subject/science/900"] },
];

/** Where the palettes end and the subjects begin in PRIMITIVE_CARDS. */
export const FIRST_SUBJECT_CARD = PRIMITIVE_CARDS.findIndex((c) => c.tokens[0].startsWith("Subject/"));

/**
 * The eight semantic sets, in the order of the Figma page. Each is a page at
 * /ds/foundations/<slug>, drawn with the Light/Dark card.
 */
export const SEMANTIC_SETS: SemanticSet[] = [
  {
    slug: "surface",
    title: "Surface colours",
    frame: "3372:3291",
    lede: "Fills - what a component paints its background with.",
    cards: [
      { node: "3372:3301", title: "Primary", tokens: ["Surface/primary/default", "Surface/primary/default-hover", "Surface/primary/default-subtle", "Surface/primary/default-subtle-hover", "Surface/primary/focus"] },
      { node: "3372:3359", title: "Secondary", tokens: ["Surface/secondary/default", "Surface/secondary/default-hover", "Surface/secondary/default-subtle", "Surface/secondary/default-subtle-hover", "Surface/secondary/focus", "Surface/secondary/default-btn"] },
      { node: "3372:3417", title: "Tertiary", tokens: ["Surface/tertiary/default", "Surface/tertiary/default-hover", "Surface/tertiary/default-subtle", "Surface/tertiary/default-subtle-hover", "Surface/tertiary/focus"] },
      { node: "3372:3475", title: "General", tokens: ["Surface/general/page", "Surface/general/page-secondary", "Surface/general/default", "Surface/general/default-alpha", "Surface/general/default-secondary", "Surface/general/default-tertiary", "Surface/general/pandai-logo"] },
      { node: "11608:47966", title: "Menu Item", tokens: ["Surface/menu-item/hover"] },
      { node: "3372:3493", title: "Disabled", tokens: ["Surface/disabled/primary", "Surface/disabled/on color", "Surface/disabled/secondary"] },
      { node: "3372:3531", title: "Success", tokens: ["Surface/success/default", "Surface/success/default-hover", "Surface/success/default-subtle", "Surface/success/default-subtle-hover", "Surface/success/focus"] },
      { node: "3372:3579", title: "Alert", tokens: ["Surface/alert/default", "Surface/alert/default-hover", "Surface/alert/default-subtle", "Surface/alert/default-subtle-hover", "Surface/alert/focus"] },
      { node: "3372:3627", title: "Warning", tokens: ["Surface/warning/default", "Surface/warning/default-hover", "Surface/warning/default-subtle", "Surface/warning/default-subtle-hover", "Surface/warning/focus"] },
      { node: "3372:3675", title: "Informative", tokens: ["Surface/informative/default", "Surface/informative/default-hover", "Surface/informative/default-subtle", "Surface/informative/default-subtle-hover", "Surface/informative/focus"] },
      { node: "3372:4081", title: "Gold", tokens: ["Surface/gold/default", "Surface/gold/default-hover", "Surface/gold/default-subtle", "Surface/gold/default-subtle-hover", "Surface/gold/focus"] },
      { node: "3372:4190", title: "Silver", tokens: ["Surface/silver/default", "Surface/silver/default-hover", "Surface/silver/default-subtle", "Surface/silver/default-subtle-hover", "Surface/silver/focus"] },
      { node: "3372:4299", title: "Bronze", tokens: ["Surface/bronze/default", "Surface/bronze/default-hover", "Surface/bronze/default-subtle", "Surface/bronze/default-subtle-hover", "Surface/bronze/focus"] },
    ],
  },
  {
    slug: "text",
    title: "Text colours",
    frame: "3371:1242",
    lede: "Ink - headings, body, captions, and the colour of text sitting on a fill.",
    cards: [
      { node: "3371:1926", title: "Primary", tokens: ["Text/primary/default", "Text/primary/default-hover", "Text/primary/on-color", "Text/primary/on-color-hover", "Text/primary/focus"] },
      { node: "3371:2025", title: "Secondary", tokens: ["Text/secondary/default", "Text/secondary/default-hover", "Text/secondary/on-color", "Text/secondary/on-color-hover", "Text/secondary/focus"] },
      { node: "3371:2134", title: "Tertiary", tokens: ["Text/tertiary/default", "Text/tertiary/default-hover", "Text/tertiary/on-color", "Text/tertiary/on-color-hover", "Text/tertiary/focus"] },
      { node: "3371:1610", title: "Default", tokens: ["Text/default/heading", "Text/default/body", "Text/default/placeholder", "Text/default/caption"] },
      { node: "3371:1699", title: "Disabled", tokens: ["Text/disabled/default", "Text/disabled/on-color"] },
      { node: "3371:1837", title: "On-Color", tokens: ["Text/on-color/heading", "Text/on-color/body", "Text/on-color/caption", "Text/on-color/placeholder"] },
      { node: "3371:2243", title: "Success", tokens: ["Text/success/default", "Text/success/default-hover", "Text/success/on-color", "Text/success/on-color-hover"] },
      { node: "3371:1252", title: "Alert", tokens: ["Text/alert/default", "Text/alert/default-hover", "Text/alert/on-color", "Text/alert/on-color-hover"] },
      { node: "3371:2342", title: "Warning", tokens: ["Text/warning/default", "Text/warning/default-hover", "Text/warning/on-color", "Text/warning/on-color-hover"] },
      { node: "3371:1768", title: "Informative", tokens: ["Text/informative/default", "Text/informative/default-hover", "Text/informative/on-color", "Text/informative/on-color-hover"] },
    ],
  },
  {
    slug: "icon",
    title: "Icon colours",
    frame: "3371:2431",
    lede: "Icon ink. A button's leading icon takes this family, not the label's.",
    cards: [
      { node: "3371:2441", title: "Primary", tokens: ["Icon/primary/default", "Icon/primary/default-hover", "Icon/primary/on-color", "Icon/primary/on-color-hover", "Icon/primary/focus"] },
      { node: "3371:2499", title: "Secondary", tokens: ["Icon/secondary/default", "Icon/secondary/default-hover", "Icon/secondary/on-color", "Icon/secondary/on-color-hover", "Icon/secondary/focus"] },
      { node: "3371:2557", title: "Tertiary", tokens: ["Icon/tertiary/default", "Icon/tertiary/default-hover", "Icon/tertiary/on-color", "Icon/tertiary/on-color-hover", "Icon/tertiary/focus"] },
      { node: "3371:2615", title: "Default", tokens: ["Icon/default/default"] },
      { node: "11608:48007", title: "Grayscale", tokens: ["Icon/grayscale/ramp-1", "Icon/grayscale/ramp-2", "Icon/grayscale/ramp-3", "Icon/grayscale/ramp-4", "Icon/grayscale/ramp-5"] },
      { node: "3371:2663", title: "Disabled", tokens: ["Icon/disabled/default", "Icon/disabled/on-color", "Icon/disabled/on-icon"] },
      { node: "3371:2739", title: "Success", tokens: ["Icon/success/default", "Icon/success/default-hover", "Icon/success/on-color", "Icon/success/on-color-hover", "Icon/success/focus"] },
      { node: "3371:2787", title: "Alert", tokens: ["Icon/alert/default", "Icon/alert/default-hover", "Icon/alert/on-color", "Icon/alert/on-color-hover", "Icon/alert/focus"] },
      { node: "3371:2835", title: "Warning", tokens: ["Icon/warning/default", "Icon/warning/default-hover", "Icon/warning/on-color", "Icon/warning/on-color-hover", "Icon/warning/focus"] },
      { node: "3371:2883", title: "Informative", tokens: ["Icon/informative/default", "Icon/informative/default-hover", "Icon/informative/on-color", "Icon/informative/on-color-hover", "Icon/informative/focus"] },
    ],
  },
  {
    slug: "border",
    title: "Border colours",
    frame: "3372:4480",
    lede: "Strokes - card outlines, dividers, focus rings.",
    cards: [
      { node: "3372:4490", title: "Primary", tokens: ["Border/primary/default", "Border/primary/default-hover", "Border/primary/default-subtle", "Border/primary/default-subtle-hover", "Border/primary/focus"] },
      { node: "3372:4548", title: "Secondary", tokens: ["Border/secondary/default", "Border/secondary/default-hover", "Border/secondary/default-subtle", "Border/secondary/default-subtle-hover", "Border/secondary/focus"] },
      { node: "3372:4606", title: "Tertiary", tokens: ["Border/tertiary/default", "Border/tertiary/default-hover", "Border/tertiary/default-subtle", "Border/tertiary/default-subtle-hover", "Border/tertiary/focus"] },
      { node: "3372:4664", title: "General", tokens: ["Border/general/default", "Border/general/default-secondary", "Border/general/default-tertiary", "Border/general/page", "Border/general/page-secondary"] },
      { node: "3372:5595", title: "Default", tokens: ["Border/default", "Border/on-color"] },
      { node: "3372:5566", title: "Disabled", tokens: ["Border/disabled/primary", "Border/disabled/secondary"] },
      { node: "3372:4750", title: "Success", tokens: ["Border/success/default", "Border/success/default-hover", "Border/success/default-subtle", "Border/success/default-subtle-hover", "Border/success/focus"] },
      { node: "3372:4808", title: "Alert", tokens: ["Border/alert/default", "Border/alert/default-hover", "Border/alert/default-subtle", "Border/alert/default-subtle-hover", "Border/alert/focus"] },
      { node: "3372:4866", title: "Warning", tokens: ["Border/warning/default", "Border/warning/default-hover", "Border/warning/default-subtle", "Border/warning/default-subtle-hover", "Border/warning/focus"] },
      { node: "3372:4924", title: "Informative", tokens: ["Border/informative/default", "Border/informative/default-hover", "Border/informative/default-subtle", "Border/informative/default-subtle-hover", "Border/informative/focus"] },
      { node: "3372:4982", title: "Gold", tokens: ["Border/gold/default", "Border/gold/default-hover", "Border/gold/default-subtle", "Border/gold/default-subtle-hover", "Border/gold/focus"] },
      { node: "3372:5040", title: "Silver", tokens: ["Border/silver/default", "Border/silver/default-hover", "Border/silver/default-subtle", "Border/silver/default-subtle-hover", "Border/silver/focus"] },
      { node: "3372:5098", title: "Bronze", tokens: ["Border/bronze/default", "Border/bronze/default-hover", "Border/bronze/default-subtle", "Border/bronze/default-subtle-hover", "Border/bronze/focus"] },
    ],
  },
  {
    slug: "subjects",
    title: "Subject colours",
    frame: "3372:5766",
    lede: "Each subject's identity. A game's accent is derived from its subject, never chosen. Card titles are Figma's own, second names included.",
    cards: [
      { node: "3372:5776", title: "Account", tokens: ["Subjects/account/default", "Subjects/account/default-hover", "Subjects/account/default-subtle", "Subjects/account/default-subtle-hover", "Subjects/account/focus"] },
      { node: "3372:6441", title: "Additional Mathematics (Kancil)", tokens: ["Subjects/add-math/default", "Subjects/add-math/default-hover", "Subjects/add-math/default-subtle", "Subjects/add-math/default-subtle-hover", "Subjects/add-math/focus"] },
      { node: "3372:6449", title: "Bahasa Melayu", tokens: ["Subjects/b-melayu/default", "Subjects/b-melayu/default-hover", "Subjects/b-melayu/default-subtle", "Subjects/b-melayu/default-subtle-hover", "Subjects/b-melayu/focus"] },
      { node: "3372:6457", title: "Biology", tokens: ["Subjects/biology/default", "Subjects/biology/default-hover", "Subjects/biology/default-subtle", "Subjects/biology/default-subtle-hover", "Subjects/biology/focus"] },
      { node: "3372:6465", title: "Business (Kangaroo Math)", tokens: ["Subjects/business/default", "Subjects/business/default-hover", "Subjects/business/default-subtle", "Subjects/business/default-subtle-hover", "Subjects/business/focus"] },
      { node: "3372:6473", title: "Chemistry", tokens: ["Subjects/chemistry/default", "Subjects/chemistry/default-hover", "Subjects/chemistry/default-subtle", "Subjects/chemistry/default-subtle-hover", "Subjects/chemistry/focus"] },
      { node: "3372:6481", title: "Chinese Language (Kijang Economics)", tokens: ["Subjects/chi-lang/default", "Subjects/chi-lang/default-hover", "Subjects/chi-lang/default-subtle", "Subjects/chi-lang/default-subtle-hover", "Subjects/chi-lang/focus"] },
      { node: "3372:6489", title: "Computer Science", tokens: ["Subjects/comp-science/default", "Subjects/comp-science/default-hover", "Subjects/comp-science/default-subtle", "Subjects/comp-science/default-subtle-hover", "Subjects/comp-science/focus"] },
      { node: "3372:6497", title: "Economy", tokens: ["Subjects/economy/default", "Subjects/economy/default-hover", "Subjects/economy/default-subtle", "Subjects/economy/default-subtle-hover", "Subjects/economy/focus"] },
      { node: "3372:6505", title: "English", tokens: ["Subjects/english/default", "Subjects/english/default-hover", "Subjects/english/default-subtle", "Subjects/english/default-subtle-hover", "Subjects/english/focus"] },
      { node: "3372:6513", title: "Geography", tokens: ["Subjects/geo/default", "Subjects/geo/default-hover", "Subjects/geo/default-subtle", "Subjects/geo/default-subtle-hover", "Subjects/geo/focus"] },
      { node: "3372:6521", title: "History", tokens: ["Subjects/history/default", "Subjects/history/default-hover", "Subjects/history/default-subtle", "Subjects/history/default-subtle-hover", "Subjects/history/focus"] },
      { node: "3372:6529", title: "Islamic Studies", tokens: ["Subjects/islamic/default", "Subjects/islamic/default-hover", "Subjects/islamic/default-subtle", "Subjects/islamic/default-subtle-hover", "Subjects/islamic/focus"] },
      { node: "3372:6537", title: "KAFA (Olympiad - Earth Science)", tokens: ["Subjects/kafa/default", "Subjects/kafa/default-hover", "Subjects/kafa/default-subtle", "Subjects/kafa/default-subtle-hover", "Subjects/kafa/focus"] },
      { node: "3372:6545", title: "Mathematics (Beaver Computational)", tokens: ["Subjects/math/default", "Subjects/math/default-hover", "Subjects/math/default-subtle", "Subjects/math/default-subtle-hover", "Subjects/math/focus"] },
      { node: "3372:6553", title: "Moral Studies (Olympiad - Estronomy)", tokens: ["Subjects/moral/default", "Subjects/moral/default-hover", "Subjects/moral/default-subtle", "Subjects/moral/default-subtle-hover", "Subjects/moral/focus"] },
      { node: "3372:6561", title: "Physics", tokens: ["Subjects/physics/default", "Subjects/physics/default-hover", "Subjects/physics/default-subtle", "Subjects/physics/default-subtle-hover", "Subjects/physics/focus"] },
      { node: "3372:6569", title: "Reka Bentuk & Teknologi (Olympiad - Matematik)", tokens: ["Subjects/rbt/default", "Subjects/rbt/default-hover", "Subjects/rbt/default-subtle", "Subjects/rbt/default-subtle-hover", "Subjects/rbt/focus"] },
      { node: "3372:6577", title: "Science (Olympiad - Economics)", tokens: ["Subjects/science/default", "Subjects/science/default-hover", "Subjects/science/default-subtle", "Subjects/science/default-subtle-hover", "Subjects/science/focus"] },
    ],
  },
  {
    slug: "medals",
    title: "Medal colours",
    frame: "3334:2",
    lede: "Gold, silver and bronze - surface and border - for rankings and rewards.",
    cards: [
      { node: "3371:619", title: "Surface", tokens: ["Surface/gold/default", "Surface/gold/default-hover", "Surface/gold/default-subtle", "Surface/gold/default-subtle-hover", "Surface/gold/focus", "Surface/silver/default", "Surface/silver/default-hover", "Surface/silver/default-subtle", "Surface/silver/default-subtle-hover", "Surface/silver/focus", "Surface/bronze/default", "Surface/bronze/default-hover", "Surface/bronze/default-subtle", "Surface/bronze/default-subtle-hover", "Surface/bronze/focus"] },
      { node: "3371:933", title: "Border", tokens: ["Border/gold/default", "Border/gold/default-hover", "Border/gold/default-subtle", "Border/gold/default-subtle-hover", "Border/gold/focus", "Border/silver/default", "Border/silver/default-hover", "Border/silver/default-subtle", "Border/silver/default-subtle-hover", "Border/silver/focus", "Border/bronze/default", "Border/bronze/default-hover", "Border/bronze/default-subtle", "Border/bronze/default-subtle-hover", "Border/bronze/focus"] },
    ],
  },
  {
    slug: "status",
    title: "Status colours",
    frame: "3829:2",
    lede: "The game-status colours the DS already ships: score, coins, streak, lives, ruby.",
    cards: [
      { node: "3830:5", title: "Status", tokens: ["Status/score/default", "Status/score/focus", "Status/score/on color", "Status/coins/default", "Status/coins/focus", "Status/coins/on color", "Status/streak/default", "Status/streak/focus", "Status/streak/on color", "Status/lives/default", "Status/lives/focus", "Status/lives/on color", "Status/ruby/default", "Status/ruby/focus", "Status/ruby/on color"] },
    ],
  },
  {
    slug: "accents",
    title: "Accent colours",
    frame: "7494:2",
    lede: "Decorative accents with their own on-color.",
    cards: [
      { node: "7494:13", title: "Accents", tokens: ["Accents/Azure/default", "Accents/Azure/default-hover", "Accents/Azure/on-color", "Accents/Azure/on-color-hover", "Accents/Azure/focus", "Accents/Pumpkin/default", "Accents/Pumpkin/default-hover", "Accents/Pumpkin/on-color", "Accents/Pumpkin/on-color-hover", "Accents/Pumpkin/focus", "Accents/Minion/default", "Accents/Minion/default-hover", "Accents/Minion/on-color", "Accents/Minion/on-color-hover", "Accents/Minion/focus", "Accents/Butter/default", "Accents/Butter/default-hover", "Accents/Butter/on-color", "Accents/Butter/on-color-hover", "Accents/Butter/focus"] },
    ],
  },
];

export function semanticSet(slug: string): SemanticSet | undefined {
  return SEMANTIC_SETS.find((s) => s.slug === slug);
}
