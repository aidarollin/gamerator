import type { ProviderUsage } from "./provider";

/**
 * One row per generation, on every path - success and failure alike.
 *
 * This table is what answers the questions that actually get asked: what does a
 * game cost, which templates fail validation most, whose briefs need better
 * guidelines, and is the cache working. It is wired in now rather than "later"
 * because a system that has been running blind for a month cannot be
 * retroactively measured.
 *
 * NOT YET PERSISTED. D1 arrives in Phase 6; until then `record` writes one
 * structured line to the log so the shape is exercised and the call sites are
 * real. Swapping the sink for an INSERT is then a one-function change rather
 * than a retrofit through the whole pipeline.
 */

export type AuditStatus = "ok" | "repaired" | "invalid" | "refused" | "error";

export type AuditEvent = {
  status: AuditStatus;
  provider: "stub" | "live";
  model: string;
  actor: string;
  subject: string;
  template: string | null;
  /** 1 for a clean generation, 2 when a repair turn ran. */
  attempts: number;
  usage: ProviderUsage;
  durationMs: number;
  createdAt: string;
  errorCode?: string;
};

/** Anthropic list price. Indicative only through a gateway - trust the bill. */
const RATE_PER_MTOK = { input: 5, output: 25 };

export function estimateCostUsd(usage: ProviderUsage): number {
  return (
    (usage.inputTokens * RATE_PER_MTOK.input) / 1e6 +
    (usage.outputTokens * RATE_PER_MTOK.output) / 1e6
  );
}

export function record(event: AuditEvent): void {
  // The stub spends nothing, so reporting an estimate for it would be a lie
  // that later shows up in a cost dashboard as real money.
  const costUsd = event.provider === "live" ? estimateCostUsd(event.usage) : 0;
  console.log(
    JSON.stringify({ type: "generation", ...event, costUsd, persisted: false }),
  );
}
