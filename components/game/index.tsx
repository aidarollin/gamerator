"use client";

import type { GameSpec } from "@/lib/spec/schema";
import { QuizRace } from "./QuizRace";
import { MatchPairs } from "./MatchPairs";
import { SortBuckets } from "./SortBuckets";
import { SequenceOrder } from "./SequenceOrder";
import { FillBlank } from "./FillBlank";

/**
 * The one entry point into the renderer.
 *
 * The prop type is `GameSpec` - the PARSED type, not `unknown` and not a
 * hand-written interface. An unvalidated object cannot be passed here without a
 * type error, which is what makes objective O3 a property of the code rather
 * than a promise in a document. Do not widen this type to make a test easier.
 *
 * The switch has no default branch on purpose: `spec` narrows to `never` once
 * every template is handled, so adding a template to the schema without adding
 * a renderer is a compile error rather than a blank screen.
 */
export function GameRenderer({ spec }: { spec: GameSpec }) {
  switch (spec.template) {
    case "quiz-race":
      return <QuizRace spec={spec} />;
    case "match-pairs":
      return <MatchPairs spec={spec} />;
    case "sort-buckets":
      return <SortBuckets spec={spec} />;
    case "sequence-order":
      return <SequenceOrder spec={spec} />;
    case "fill-blank":
      return <FillBlank spec={spec} />;
  }
}

export { QuizRace, MatchPairs, SortBuckets, SequenceOrder, FillBlank };
