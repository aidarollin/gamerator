import { readFixture } from "@/lib/spec/fixtures";
import { NO_USAGE, type GenerateArgs, type Provider, type ProviderResult } from "./provider";

/**
 * A provider that returns canned specs. No network, no key, no spend.
 *
 * This is not a mock that only tests exist to satisfy - it is the default
 * provider, so the deployed app runs on it and the whole flow can be used and
 * demonstrated for free. Real spend is an explicit opt-in.
 *
 * It deliberately reproduces every outcome the live provider can produce, not
 * just the happy one. A pipeline only ever exercised against success is a
 * pipeline whose error paths have never run.
 */

/** Steer the stub from the brief, so the flow can be driven without a model. */
const TRIGGERS = {
  repair: "trigger:repair",
  refusal: "trigger:refusal",
  error: "trigger:error",
  unrepairable: "trigger:unrepairable",
} as const;

const FAKE_USAGE = {
  inputTokens: 4200,
  outputTokens: 2600,
  cacheReadTokens: 4000,
  cacheWriteTokens: 0,
};

/**
 * Which fixture answers a brief. Uses the author's template hint when given,
 * otherwise a fixed default - never random, so the same brief always yields the
 * same spec and a demo is reproducible.
 */
function fixtureFor(args: GenerateArgs): string {
  const hint = args.brief.templateHint;
  return hint ? `${hint}.valid` : "quiz-race.valid";
}

export class StubProvider implements Provider {
  readonly name = "stub" as const;

  async generate(args: GenerateArgs): Promise<ProviderResult> {
    const rules = args.brief.rules.toLowerCase();
    const model = "stub";

    if (rules.includes(TRIGGERS.error)) {
      return {
        kind: "error",
        code: "stub_forced_error",
        message: "Stub provider was asked to fail.",
        model,
      };
    }

    if (rules.includes(TRIGGERS.refusal)) {
      return {
        kind: "refusal",
        reason: "Stub provider was asked to decline.",
        usage: NO_USAGE,
        model,
      };
    }

    // The repair path. First call returns a spec that is structurally fine and
    // semantically broken - exactly the class of failure the refinements exist
    // for - and the repair turn returns the good one. `args.repair` being set
    // is what distinguishes the two, which is also how the real provider knows.
    if (rules.includes(TRIGGERS.repair)) {
      const name = args.repair ? "quiz-race.valid" : "quiz-race.invalid";
      return { kind: "ok", raw: readFixture(name), usage: FAKE_USAGE, model };
    }

    // Never recovers, so the honest-failure path gets exercised too.
    if (rules.includes(TRIGGERS.unrepairable)) {
      return {
        kind: "ok",
        raw: readFixture("sort-buckets.invalid"),
        usage: FAKE_USAGE,
        model,
      };
    }

    return {
      kind: "ok",
      raw: readFixture(fixtureFor(args)),
      usage: FAKE_USAGE,
      model,
    };
  }
}

export const STUB_TRIGGERS = TRIGGERS;
