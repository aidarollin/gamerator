import type { ReactNode } from "react";
import type { SubjectKey } from "./tokens";

/**
 * The contract between a DS component and the showcase at /ds.
 *
 * Every component folder exports one `ComponentDocs` from its `.docs.tsx`, and
 * `docs.ts` lists them. The showcase renders nothing it was not given here, and
 * `lib/ds/inventory.test.ts` fails if a built component has no docs or a docs
 * file names a component the inventory does not have.
 */

/** What a story is handed. The subject is the one picked on the page. */
export type StoryContext = { subject: SubjectKey };

export type Story = {
  name: string;
  /** Why this story exists - what it shows that the others do not. */
  note?: string;
  render: (ctx: StoryContext) => ReactNode;
  /** Lay the story's children out in a column instead of a wrapping row. */
  stack?: boolean;
};

export type PropDoc = {
  name: string;
  type: string;
  default?: string;
  note: string;
};

export type ComponentDocs = {
  /** Must match an entry in lib/ds/inventory.ts. */
  slug: string;
  /** True if the stories respond to the subject picker. */
  accented: boolean;
  /** The geometry read off the Figma node - one line per fact. */
  spec: string[];
  /** A short example, shown as code. */
  usage: string;
  props: PropDoc[];
  stories: Story[];
};
