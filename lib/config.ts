import "server-only";

/**
 * Server-only configuration.
 *
 * Nothing here may reach a client component. Anything the browser also needs
 * goes in a separate module with a NEXT_PUBLIC_ variable, or its env override
 * silently resolves to undefined in the browser and you debug the wrong thing.
 */

export type ProviderMode = "stub" | "live";

/**
 * Defaults to `stub`, and that default is deliberate.
 *
 * `stub` makes no network calls and spends nothing. A deployment with no
 * provider configured therefore cannot run up a bill, and a test that forgets
 * to set the mode fails loudly on missing fixtures rather than quietly billing
 * someone. Going live is an explicit act.
 */
export function providerMode(): ProviderMode {
  return process.env.GAMERATOR_PROVIDER === "live" ? "live" : "stub";
}

export function model(): string {
  return process.env.GAMERATOR_MODEL ?? "claude-opus-5";
}

/** Present only in live mode; the stub never reads it. */
export function apiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY;
}

/**
 * Unset means Anthropic direct. Pointed at a gateway it must stop at `/api` -
 * the SDK appends `/v1/messages` itself. See docs/TECHNICAL-PLAN.md.
 */
export function baseUrl(): string | undefined {
  return process.env.ANTHROPIC_BASE_URL;
}

/** Output tokens dominate the bill, so this is the real cost control. */
export const MAX_OUTPUT_TOKENS = 8000;

/** One repair turn. Not a loop - see lib/generate/index.ts for why. */
export const MAX_REPAIR_ATTEMPTS = 1;
