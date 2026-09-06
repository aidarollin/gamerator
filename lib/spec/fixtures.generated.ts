/* GENERATED - do not hand-edit.
 * Regenerate: node scripts/generate-fixture-index.mjs (npm run fixtures)
 *
 * Static imports, not a directory read: a Cloudflare Worker has no filesystem,
 * so readdirSync works in dev and fails in production.
 */

import f_fill_blank_edge from "./fixtures/fill-blank.edge.json";
import f_fill_blank_invalid from "./fixtures/fill-blank.invalid.json";
import f_fill_blank_valid from "./fixtures/fill-blank.valid.json";
import f_match_pairs_edge from "./fixtures/match-pairs.edge.json";
import f_match_pairs_invalid from "./fixtures/match-pairs.invalid.json";
import f_match_pairs_valid from "./fixtures/match-pairs.valid.json";
import f_quiz_race_edge from "./fixtures/quiz-race.edge.json";
import f_quiz_race_invalid from "./fixtures/quiz-race.invalid.json";
import f_quiz_race_valid from "./fixtures/quiz-race.valid.json";
import f_sequence_order_edge from "./fixtures/sequence-order.edge.json";
import f_sequence_order_invalid from "./fixtures/sequence-order.invalid.json";
import f_sequence_order_valid from "./fixtures/sequence-order.valid.json";
import f_sort_buckets_edge from "./fixtures/sort-buckets.edge.json";
import f_sort_buckets_invalid from "./fixtures/sort-buckets.invalid.json";
import f_sort_buckets_valid from "./fixtures/sort-buckets.valid.json";

/** Raw, unvalidated fixture JSON. Callers must parse - that is the point. */
export const FIXTURES: Record<string, unknown> = {
  "fill-blank.edge": f_fill_blank_edge,
  "fill-blank.invalid": f_fill_blank_invalid,
  "fill-blank.valid": f_fill_blank_valid,
  "match-pairs.edge": f_match_pairs_edge,
  "match-pairs.invalid": f_match_pairs_invalid,
  "match-pairs.valid": f_match_pairs_valid,
  "quiz-race.edge": f_quiz_race_edge,
  "quiz-race.invalid": f_quiz_race_invalid,
  "quiz-race.valid": f_quiz_race_valid,
  "sequence-order.edge": f_sequence_order_edge,
  "sequence-order.invalid": f_sequence_order_invalid,
  "sequence-order.valid": f_sequence_order_valid,
  "sort-buckets.edge": f_sort_buckets_edge,
  "sort-buckets.invalid": f_sort_buckets_invalid,
  "sort-buckets.valid": f_sort_buckets_valid,
};

export const FIXTURE_NAMES = [
  "fill-blank.edge",
  "fill-blank.invalid",
  "fill-blank.valid",
  "match-pairs.edge",
  "match-pairs.invalid",
  "match-pairs.valid",
  "quiz-race.edge",
  "quiz-race.invalid",
  "quiz-race.valid",
  "sequence-order.edge",
  "sequence-order.invalid",
  "sequence-order.valid",
  "sort-buckets.edge",
  "sort-buckets.invalid",
  "sort-buckets.valid",
] as const;
