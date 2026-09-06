import type { Brief } from "@/lib/spec/brief";

/**
 * The seam between "how a spec is obtained" and "what happens to it".
 *
 * Everything downstream - validation, the repair turn, the audit row, the SSE
 * route, the UI - runs identically whether the spec came from a model or from
 * a recorded fixture. That is what lets the whole pipeline be exercised with no
 * network and no spend, and it is why the stub is not a testing afterthought
 * but the default (see lib/config.ts).
 */

export type ProviderUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

export type ProviderResult =
  | { kind: "ok"; raw: unknown; usage: ProviderUsage; model: string }
  /** The model declined. Distinct from an error: nothing is broken. */
  | { kind: "refusal"; reason: string; usage: ProviderUsage; model: string }
  /** Transport, auth, rate limit, upstream outage. */
  | { kind: "error"; code: string; message: string; model: string };

export type GenerateArgs = {
  brief: Brief;
  /** Present on the repair turn: the prior attempt and why it failed. */
  repair?: {
    previous: unknown;
    issues: { path: string; message: string }[];
  };
};

export interface Provider {
  readonly name: "stub" | "live";
  generate(args: GenerateArgs): Promise<ProviderResult>;
}

export const NO_USAGE: ProviderUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};
