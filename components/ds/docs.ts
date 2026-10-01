import { buttonDocs } from "./button/Button.docs";
import { primaryCardDocs } from "./card/Card.docs";
import { quizCardDocs } from "./card/QuizCard.docs";
import { progressBarDocs } from "./progress-bar/ProgressBar.docs";
import type { ComponentDocs } from "./story";
import { statusPillDocs } from "./status-pill/StatusPill.docs";
import { tagDocs } from "./tag/Chip.docs";
import { timerDocs } from "./timer/Timer.docs";

/**
 * Every component's showcase docs. Adding a component means adding its docs
 * here; `lib/ds/inventory.test.ts` fails until you do.
 */
export const COMPONENT_DOCS: ComponentDocs[] = [
  buttonDocs,
  tagDocs,
  primaryCardDocs,
  quizCardDocs,
  progressBarDocs,
  timerDocs,
  statusPillDocs,
];

export function docsFor(slug: string): ComponentDocs | undefined {
  return COMPONENT_DOCS.find((d) => d.slug === slug);
}

export type { ComponentDocs, PropDoc, Story, StoryContext } from "./story";
