import { describe, expect, it } from "vitest";
import { generateSpec, type Stage } from "./index";
import { StubProvider, STUB_TRIGGERS } from "./stub";
import { SENTINEL, systemPrompt, repairPrompt } from "./prompt";
import { estimateCostUsd } from "./audit";
import { NO_USAGE, type GenerateArgs, type Provider, type ProviderResult } from "./provider";
import { Brief } from "@/lib/spec/brief";
import { SUBJECT_KEYS } from "@/lib/ds/tokens.generated";

const brief = (rules = "", extra: Partial<Brief> = {}): Brief =>
  Brief.parse({
    subject: "science",
    yearLevel: 4,
    language: "ms",
    learningObjective: "Murid dapat mengenal pasti planet dalam Sistem Suria.",
    rules,
    ...extra,
  });

const run = (b: Brief, provider: Provider = new StubProvider()) => {
  const stages: Stage[] = [];
  return generateSpec(b, { provider, onStage: (s) => stages.push(s) }).then(
    (outcome) => ({ outcome, stages }),
  );
};

describe("system prompt", () => {
  it("is byte-identical across calls - it is the cache prefix", () => {
    // A timestamp or an unsorted iteration here would silently take the cache
    // hit rate to zero and roughly triple the input bill, with nothing failing.
    expect(systemPrompt()).toBe(systemPrompt());
  });

  it("contains the sentinel the output-leak check greps for", () => {
    expect(systemPrompt()).toContain(SENTINEL);
  });

  it("lists every DS subject key, so the model cannot invent one", () => {
    for (const key of SUBJECT_KEYS) {
      expect(systemPrompt()).toContain(key);
    }
  });

  it("states the cross-field rules JSON Schema cannot express", () => {
    const p = systemPrompt();
    expect(p).toMatch(/correctIndex must be a valid index/);
    expect(p).toMatch(/every bucket must receive at least one item/);
    expect(p).toMatch(/positions must be exactly 1\.\.n/);
  });

  it("carries validator messages into the repair turn verbatim", () => {
    const out = repairPrompt([
      { path: "content.questions.0.correctIndex", message: "out of range" },
    ]);
    expect(out).toContain("content.questions.0.correctIndex");
    expect(out).toContain("out of range");
  });
});

describe("happy path", () => {
  it("returns a validated spec", async () => {
    const { outcome, stages } = await run(brief());
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.spec.template).toBe("quiz-race");
    expect(stages).toEqual(["briefing", "generating", "validating"]);
    expect(outcome.audit.attempts).toBe(1);
    expect(outcome.audit.status).toBe("ok");
  });

  it("honours the template hint", async () => {
    const { outcome } = await run(brief("", { templateHint: "match-pairs" }));
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.spec.template).toBe("match-pairs");
  });
});

describe("repair path", () => {
  it("repairs once and reports that it did", async () => {
    const { outcome, stages } = await run(brief(STUB_TRIGGERS.repair));
    expect(outcome.status).toBe("repaired");
    if (outcome.status !== "repaired") return;
    expect(stages).toEqual([
      "briefing",
      "generating",
      "validating",
      "repairing",
      "validating",
    ]);
    expect(outcome.audit.attempts).toBe(2);
  });

  it("gives up after ONE repair instead of looping", async () => {
    const { outcome } = await run(brief(STUB_TRIGGERS.unrepairable));
    expect(outcome.status).toBe("invalid");
    if (outcome.status !== "invalid") return;
    // Two attempts, not three, not ten. A second failure is a signal, and
    // retrying past it converts that signal into latency and cost.
    expect(outcome.audit.attempts).toBe(2);
    expect(outcome.issues.length).toBeGreaterThan(0);
    expect(outcome.issues.map((i) => i.message).join(" ")).toMatch(
      /does not match any bucket|has no items/,
    );
  });

  it("never returns a spec alongside an invalid outcome", async () => {
    const { outcome } = await run(brief(STUB_TRIGGERS.unrepairable));
    expect("spec" in outcome).toBe(false);
  });
});

describe("refusal and error are distinct", () => {
  it("reports a refusal as a refusal, not an error", async () => {
    const { outcome } = await run(brief(STUB_TRIGGERS.refusal));
    expect(outcome.status).toBe("refused");
    expect(outcome.audit.status).toBe("refused");
  });

  it("reports a provider error as an error", async () => {
    const { outcome } = await run(brief(STUB_TRIGGERS.error));
    expect(outcome.status).toBe("error");
    if (outcome.status !== "error") return;
    expect(outcome.code).toBe("stub_forced_error");
    expect(outcome.audit.errorCode).toBe("stub_forced_error");
  });
});

describe("auditing", () => {
  it("emits an audit event on every outcome, failures included", async () => {
    for (const rules of [
      "",
      STUB_TRIGGERS.repair,
      STUB_TRIGGERS.unrepairable,
      STUB_TRIGGERS.refusal,
      STUB_TRIGGERS.error,
    ]) {
      const { outcome } = await run(brief(rules));
      expect(outcome.audit, `no audit for rules=${rules}`).toBeTruthy();
      expect(outcome.audit.durationMs).toBeGreaterThanOrEqual(0);
      expect(outcome.audit.subject).toBe("science");
    }
  });

  it("accumulates usage across the repair turn", async () => {
    const clean = await run(brief());
    const repaired = await run(brief(STUB_TRIGGERS.repair));
    expect(repaired.outcome.audit.usage.outputTokens).toBeGreaterThan(
      clean.outcome.audit.usage.outputTokens,
    );
  });

  it("costs nothing when the provider is the stub", () => {
    expect(estimateCostUsd(NO_USAGE)).toBe(0);
  });
});

describe("provider seam", () => {
  it("passes the prior spec and its issues into the repair call", async () => {
    const seen: GenerateArgs[] = [];
    const spy: Provider = {
      name: "stub",
      async generate(args) {
        seen.push(args);
        return new StubProvider().generate({
          ...args,
          brief: { ...args.brief, rules: STUB_TRIGGERS.repair },
        }) as Promise<ProviderResult>;
      },
    };
    await run(brief(STUB_TRIGGERS.repair), spy);
    expect(seen).toHaveLength(2);
    expect(seen[0].repair).toBeUndefined();
    expect(seen[1].repair).toBeDefined();
    expect(seen[1].repair?.issues.length).toBeGreaterThan(0);
    expect(seen[1].repair?.previous).toBeTruthy();
  });
});
