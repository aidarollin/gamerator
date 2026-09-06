import Anthropic from "@anthropic-ai/sdk";
import { toStrictJsonSchema } from "./tool-schema";
import { ENGINE_SCHEMAS, type Engine } from "./schema";
import { arcadeRepairPrompt, arcadeSystemPrompt } from "./prompt";
import { renderArcadeBrief, type ArcadeBrief } from "./brief";
import { MAX_OUTPUT_TOKENS, model as configuredModel } from "@/lib/config";

/**
 * The live arcade provider. Costs money on every call.
 *
 * The model is handed ONE engine schema - the engine is already chosen in code
 * by chooseEngine() - and via STRICT TOOL USE, not output_config.format. The
 * gateway accepts output_config as a hint and does not enforce it; see
 * lib/arcade/tool-schema.ts for how that was found out.
 *
 * The schema it sees has no playability rules in it, because JSON Schema cannot
 * express a simulation. The server validates the full `ArcadeSpec`, which runs
 * them. That gap is what the repair turn closes, and it is a real gap: a model
 * has no idea whether gravity 2800 against a -220 flap clears a 90px gap.
 */

export type LiveUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

export type LiveResult =
  | { kind: "ok"; raw: unknown; usage: LiveUsage; model: string }
  | { kind: "refusal"; reason: string; model: string }
  | { kind: "error"; code: string; message: string; model: string };

const ZERO: LiveUsage = {
  inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0,
};

export async function generateLive(
  brief: ArcadeBrief,
  engine: Engine,
  repair?: { previous: unknown; issues: { path: string; message: string }[] },
): Promise<LiveResult> {
  const client = new Anthropic();
  const model = configuredModel();

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `${renderArcadeBrief(brief)}\nEngine: ${engine}`,
    },
  ];
  if (repair) {
    messages.push(
      { role: "assistant", content: JSON.stringify(repair.previous) },
      { role: "user", content: arcadeRepairPrompt(repair.issues) },
    );
  }

  try {
    const response = await client.messages.create({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      thinking: { type: "adaptive" },
      system: [
        {
          type: "text",
          text: arcadeSystemPrompt(),
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [
        {
          name: "emit_game_spec",
          description: `Emit the specification for a ${engine} game. Always call this tool.`,
          strict: true,
          input_schema: toStrictJsonSchema(
            ENGINE_SCHEMAS[engine].omit({ contentTwist: true }),
          ) as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: "emit_game_spec" },
      messages,
    });

    const usage: LiveUsage = {
      inputTokens: response.usage.input_tokens ?? 0,
      outputTokens: response.usage.output_tokens ?? 0,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
      cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
    };

    // A decline arrives as HTTP 200 with stop_reason "refusal". Check it before
    // reading content, or a decline reads as an empty success.
    if (response.stop_reason === "refusal") {
      return {
        kind: "refusal",
        reason: response.stop_details?.explanation ?? "The model declined this request.",
        model,
      };
    }
    const block = response.content.find((b) => b.type === "tool_use");
    if (!block) {
      return {
        kind: "error",
        code: "no_tool_use",
        message: `The model returned no spec (stop_reason=${response.stop_reason}).`,
        model,
      };
    }

    return { kind: "ok", raw: block.input, usage, model };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = (err as { status?: number })?.status;
    // A gateway turns a policy decline into a thrown request; without this it
    // reaches the author as "something went wrong on our end".
    // The SDK THROWS when structured output does not match the schema; it does
    // not return a null parsed_output. Without this the failure is reported as
    // a transport error, which points the reader at the network instead of the
    // schema.
    if (/Failed to parse structured output/i.test(message)) {
      return { kind: "error", code: "schema_mismatch", message, model };
    }
    if (/content[_ ]policy|content_filter/i.test(message)) {
      return { kind: "refusal", reason: "The provider's filter blocked this request.", model };
    }
    const code =
      status === 401 || status === 403 ? "auth_failed"
      : status === 404 ? "not_found"
      : status === 429 ? "rate_limited"
      : status && status >= 500 ? "upstream_error"
      : "request_failed";
    const hint =
      code === "not_found"
        ? " Check ANTHROPIC_BASE_URL stops at /api and the model id has its provider prefix."
        : "";
    return { kind: "error", code, message: message + hint, model };
  }
}

export { ZERO as NO_LIVE_USAGE };
