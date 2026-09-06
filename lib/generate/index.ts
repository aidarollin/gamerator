import { GameSpec } from "@/lib/spec/schema";
import type { Brief } from "@/lib/spec/brief";
import { MAX_REPAIR_ATTEMPTS, providerMode } from "@/lib/config";
import type { Provider, ProviderUsage } from "./provider";
import { NO_USAGE } from "./provider";
import { StubProvider } from "./stub";
import { LiveProvider } from "./live";
import type { AuditEvent } from "./audit";

/**
 * Generate a spec, validate it, repair it once if it fails, then stop.
 *
 * One repair turn, deliberately. A second failure means the prompt or the
 * schema is wrong, and retrying is a way of not finding that out - it converts
 * a signal into latency and cost. The failed spec and its issues go to the
 * audit event, which is the raw material for improving the prompt.
 */

export type Issue = { path: string; message: string };

export type GenerateOutcome =
  | { status: "ok"; spec: GameSpec; audit: AuditEvent }
  | { status: "repaired"; spec: GameSpec; audit: AuditEvent }
  /** Parsed twice and failed twice. Surfaced honestly, never rendered. */
  | { status: "invalid"; issues: Issue[]; audit: AuditEvent }
  | { status: "refused"; reason: string; audit: AuditEvent }
  | { status: "error"; code: string; message: string; audit: AuditEvent };

/** Stage names are a public contract - the SSE route streams them verbatim. */
export type Stage = "briefing" | "generating" | "validating" | "repairing";

export function makeProvider(): Provider {
  return providerMode() === "live" ? new LiveProvider() : new StubProvider();
}

function issuesOf(error: { issues: readonly { path: PropertyKey[]; message: string }[] }): Issue[] {
  return error.issues.map((i) => ({
    path: i.path.map(String).join("."),
    message: i.message,
  }));
}

const addUsage = (a: ProviderUsage, b: ProviderUsage): ProviderUsage => ({
  inputTokens: a.inputTokens + b.inputTokens,
  outputTokens: a.outputTokens + b.outputTokens,
  cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
  cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
});

export async function generateSpec(
  brief: Brief,
  opts: {
    provider?: Provider;
    onStage?: (stage: Stage) => void;
    actor?: string;
  } = {},
): Promise<GenerateOutcome> {
  const provider = opts.provider ?? makeProvider();
  const stage = opts.onStage ?? (() => {});
  const startedAt = Date.now();
  let usage = NO_USAGE;
  let attempts = 0;

  // Every path below builds its audit row from this, so no outcome can slip
  // through unrecorded - including the failures, which are the interesting ones.
  const audit = (
    status: AuditEvent["status"],
    extra: Partial<AuditEvent> = {},
  ): AuditEvent => ({
    status,
    provider: provider.name,
    model: extra.model ?? "unknown",
    actor: opts.actor ?? "anonymous",
    template: brief.templateHint ?? null,
    subject: brief.subject,
    attempts,
    usage,
    durationMs: Date.now() - startedAt,
    createdAt: new Date().toISOString(),
    ...extra,
  });

  stage("briefing");
  stage("generating");

  attempts = 1;
  const first = await provider.generate({ brief });

  if (first.kind === "error") {
    return {
      status: "error",
      code: first.code,
      message: first.message,
      audit: audit("error", { model: first.model, errorCode: first.code }),
    };
  }
  if (first.kind === "refusal") {
    usage = addUsage(usage, first.usage);
    return {
      status: "refused",
      reason: first.reason,
      audit: audit("refused", { model: first.model }),
    };
  }

  usage = addUsage(usage, first.usage);

  stage("validating");
  const parsed = GameSpec.safeParse(first.raw);
  if (parsed.success) {
    return { status: "ok", spec: parsed.data, audit: audit("ok", { model: first.model }) };
  }

  if (MAX_REPAIR_ATTEMPTS < 1) {
    return {
      status: "invalid",
      issues: issuesOf(parsed.error),
      audit: audit("invalid", { model: first.model }),
    };
  }

  stage("repairing");
  attempts = 2;
  const second = await provider.generate({
    brief,
    repair: { previous: first.raw, issues: issuesOf(parsed.error) },
  });

  if (second.kind === "error") {
    return {
      status: "error",
      code: second.code,
      message: second.message,
      audit: audit("error", { model: second.model, errorCode: second.code }),
    };
  }
  if (second.kind === "refusal") {
    usage = addUsage(usage, second.usage);
    return {
      status: "refused",
      reason: second.reason,
      audit: audit("refused", { model: second.model }),
    };
  }

  usage = addUsage(usage, second.usage);

  stage("validating");
  const repaired = GameSpec.safeParse(second.raw);
  if (repaired.success) {
    return {
      status: "repaired",
      spec: repaired.data,
      audit: audit("repaired", { model: second.model }),
    };
  }

  // Failed twice. Report it; never render a spec that did not parse.
  return {
    status: "invalid",
    issues: issuesOf(repaired.error),
    audit: audit("invalid", { model: second.model }),
  };
}
