/* GENERATED - do not hand-edit.
 * Regenerate: node scripts/generate-fixture-index.mjs (npm run fixtures)
 *
 * Static imports, not a directory read: a Cloudflare Worker has no filesystem,
 * so readdirSync works in dev and fails in production.
 */

import f_brick_breaker_hard from "./fixtures/brick-breaker.hard.json";
import f_brick_breaker_unplayable from "./fixtures/brick-breaker.unplayable.json";
import f_brick_breaker_valid from "./fixtures/brick-breaker.valid.json";
import f_duel_unplayable from "./fixtures/duel.unplayable.json";
import f_duel_valid from "./fixtures/duel.valid.json";
import f_endless_flyer_easy from "./fixtures/endless-flyer.easy.json";
import f_endless_flyer_edge from "./fixtures/endless-flyer.edge.json";
import f_endless_flyer_hard from "./fixtures/endless-flyer.hard.json";
import f_endless_flyer_invalid from "./fixtures/endless-flyer.invalid.json";
import f_endless_flyer_timed from "./fixtures/endless-flyer.timed.json";
import f_endless_flyer_trivial from "./fixtures/endless-flyer.trivial.json";
import f_endless_flyer_twist from "./fixtures/endless-flyer.twist.json";
import f_endless_flyer_unplayable from "./fixtures/endless-flyer.unplayable.json";
import f_endless_flyer_valid from "./fixtures/endless-flyer.valid.json";
import f_endless_runner_hard from "./fixtures/endless-runner.hard.json";
import f_endless_runner_unplayable from "./fixtures/endless-runner.unplayable.json";
import f_endless_runner_valid from "./fixtures/endless-runner.valid.json";
import f_model_generated from "./fixtures/model-generated.json";
import f_platformer_hard from "./fixtures/platformer.hard.json";
import f_platformer_unplayable from "./fixtures/platformer.unplayable.json";
import f_platformer_valid from "./fixtures/platformer.valid.json";
import f_snake_easy from "./fixtures/snake.easy.json";
import f_snake_unplayable from "./fixtures/snake.unplayable.json";
import f_snake_valid from "./fixtures/snake.valid.json";

/** Raw, unvalidated fixture JSON. Callers must parse - that is the point. */
export const ARCADE_FIXTURES: Record<string, unknown> = {
  "brick-breaker.hard": f_brick_breaker_hard,
  "brick-breaker.unplayable": f_brick_breaker_unplayable,
  "brick-breaker.valid": f_brick_breaker_valid,
  "duel.unplayable": f_duel_unplayable,
  "duel.valid": f_duel_valid,
  "endless-flyer.easy": f_endless_flyer_easy,
  "endless-flyer.edge": f_endless_flyer_edge,
  "endless-flyer.hard": f_endless_flyer_hard,
  "endless-flyer.invalid": f_endless_flyer_invalid,
  "endless-flyer.timed": f_endless_flyer_timed,
  "endless-flyer.trivial": f_endless_flyer_trivial,
  "endless-flyer.twist": f_endless_flyer_twist,
  "endless-flyer.unplayable": f_endless_flyer_unplayable,
  "endless-flyer.valid": f_endless_flyer_valid,
  "endless-runner.hard": f_endless_runner_hard,
  "endless-runner.unplayable": f_endless_runner_unplayable,
  "endless-runner.valid": f_endless_runner_valid,
  "model-generated": f_model_generated,
  "platformer.hard": f_platformer_hard,
  "platformer.unplayable": f_platformer_unplayable,
  "platformer.valid": f_platformer_valid,
  "snake.easy": f_snake_easy,
  "snake.unplayable": f_snake_unplayable,
  "snake.valid": f_snake_valid,
};

export const ARCADE_FIXTURE_NAMES = Object.keys(ARCADE_FIXTURES);

/**
 * Fixtures the schema must ACCEPT. Everything else must be rejected.
 * Derived from the filename: .invalid, .unplayable and .trivial exist to fail.
 */
export const ARCADE_ACCEPTED = [
  "brick-breaker.hard",
  "brick-breaker.valid",
  "duel.valid",
  "endless-flyer.easy",
  "endless-flyer.edge",
  "endless-flyer.hard",
  "endless-flyer.timed",
  "endless-flyer.twist",
  "endless-flyer.valid",
  "endless-runner.hard",
  "endless-runner.valid",
  "model-generated",
  "platformer.hard",
  "platformer.valid",
  "snake.easy",
  "snake.valid",
];

export function readArcadeFixture(name: string): unknown {
  const f = ARCADE_FIXTURES[name];
  if (f === undefined) throw new Error(`no such arcade fixture: ${name}`);
  return f;
}
