import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { GameSpecShape } from "@/lib/spec/schema";
import { renderBrief } from "@/lib/spec/brief";
import { MAX_OUTPUT_TOKENS, model as configuredModel } from "@/lib/config";
import { repairPrompt, systemPrompt } from "./prompt";
import { NO_USAGE, type GenerateArgs, type Provider, type ProviderResult } from "./provider";

/**
 * The real provider. Costs money on every call - see lib/config.ts for why the
 * stub is the default.
 *
 * Verified against OpenRouter's Anthropic-compatible endpoint on 2026-09-06:
 * strict structured output, prompt caching and adaptive thinking all work
 * through the gateway. See scripts/smoke-openrouter.mjs.
 */
export class LiveProvider implements Provider {
  readonly name = "live" as const;
  // The SDK reads ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL from the
  // environment; passing them explicitly here would just add a way to disagree.
  private client = new Anthropic();

  async generate(args: GenerateArgs): Promise<ProviderResult> {
    const model = configuredModel();

    // The model is handed GameSpecShape, NOT GameSpec. JSON Schema cannot
    // express a superRefine, so the cross-field rules cannot constrain
    // generation - they are stated in the system prompt and enforced by the
    // validator. Sending the refined schema here would silently drop them.
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: renderBrief(args.brief) },
    ];
    if (args.repair) {
      messages.push(
        { role: "assistant", content: JSON.stringify(args.repair.previous) },
        { role: "user", content: repairPrompt(args.repair.issues) },
      );
    }

    try {
      const response = await this.client.messages.parse({
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        thinking: { type: "adaptive" },
        system: [
          {
            type: "text",
            text: systemPrompt(),
            // The frozen prefix. Verify with usage.cache_read_input_tokens; a
            // zero across repeated requests means something in it is moving.
            cache_control: { type: "ephemeral" },
          },
        ],
        messages,
        output_config: { format: zodOutputFormat(GameSpecShape) },
      });

      const usage = {
        inputTokens: response.usage.input_tokens ?? 0,
        outputTokens: response.usage.output_tokens ?? 0,
        cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
      };

      // A policy decline arrives as HTTP 200 with stop_reason "refusal", not as
      // a thrown error. Check it BEFORE reading content, or a decline reads as
      // an empty success.
      if (response.stop_reason === "refusal") {
        return {
          kind: "refusal",
          reason:
            response.stop_details?.explanation ??
            "The model declined to generate this game.",
          usage,
          model,
        };
      }

      // parsed_output is null when parsing failed. Guard it; do not assert.
      if (response.parsed_output == null) {
        return {
          kind: "error",
          code: "unparsed_output",
          message: `Model returned no parsable spec (stop_reason=${response.stop_reason}).`,
          model,
        };
      }

      return { kind: "ok", raw: response.parsed_output, usage, model };
    } catch (err) {
      return { ...classify(err, model) };
    }
  }
}

/**
 * A gateway turns a policy decline into a thrown request.
 *
 * Anthropic direct declines in-band; through OpenRouter the upstream filter can
 * fail the whole request with `content_policy_violation`. Without this mapping
 * a decline reaches the author as "something went wrong on our end", which is
 * both wrong and unactionable.
 *
 * Keep it narrow: auth failures, rate limits and outages must still surface as
 * errors, because those are our problem and a decline is not.
 */
function classify(err: unknown, model: string): ProviderResult {
  const message = err instanceof Error ? err.message : String(err);
  const status = (err as { status?: number })?.status;

  if (/content[_ ]policy|content_filter/i.test(message)) {
    return {
      kind: "refusal",
      reason: "The provider's content filter blocked this request.",
      usage: NO_USAGE,
      model,
    };
  }

  const code =
    status === 401 || status === 403
      ? "auth_failed"
      : status === 404
        ? "not_found"
        : status === 429
          ? "rate_limited"
          : status && status >= 500
            ? "upstream_error"
            : "request_failed";

  // A 404 here is almost always configuration, not a missing model: the base
  // URL must stop at /api because the SDK appends /v1/messages itself.
  const hint =
    code === "not_found"
      ? " Check ANTHROPIC_BASE_URL stops at /api and the model id carries its provider prefix."
      : "";

  return { kind: "error", code, message: message + hint, model };
}
