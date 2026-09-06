#!/usr/bin/env node
/**
 * Provider smoke test. Run with the env file so nothing is hardcoded:
 *
 *   node --env-file=.env.local scripts/smoke-openrouter.mjs
 *
 * SPENDS REAL MONEY - a few cents. Stages run cheapest-first so a
 * misconfiguration (wrong base URL, missing model prefix) costs almost nothing
 * before the expensive stage runs.
 *
 * It answers four questions that decide how Phase 4 is written:
 *   1. Does the connection work at all?
 *   2. Does strict tool use work?           <- the planned mechanism
 *   3. Does prompt caching work?            <- the cost model assumes it
 *   4. Does output_config.format work?      <- the open question
 *
 * Never prints the API key.
 */

import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.GAMERATOR_MODEL ?? "claude-opus-5";
const BASE = process.env.ANTHROPIC_BASE_URL ?? "(Anthropic direct)";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set. Did you pass --env-file=.env.local ?");
  process.exit(1);
}

const client = new Anthropic();

// Anthropic bills input/output separately; through a gateway the rate may
// differ, so treat this as indicative and trust the provider dashboard.
const RATE = { in: 5 / 1e6, out: 25 / 1e6 };
let spent = 0;

function report(label, usage) {
  if (!usage) return;
  const cost =
    (usage.input_tokens ?? 0) * RATE.in + (usage.output_tokens ?? 0) * RATE.out;
  spent += cost;
  console.log(
    `      usage: in=${usage.input_tokens} out=${usage.output_tokens}` +
      ` cache_read=${usage.cache_read_input_tokens ?? "n/a"}` +
      ` cache_write=${usage.cache_creation_input_tokens ?? "n/a"}` +
      `  ~$${cost.toFixed(4)}`,
  );
  return usage;
}

console.log(`model: ${MODEL}`);
console.log(`base : ${BASE}`);
console.log("");

/* ------------------------------------------------ 1. connectivity (cheap) */
console.log("1. connectivity");
try {
  const r = await client.messages.create({
    model: MODEL,
    max_tokens: 32,
    messages: [{ role: "user", content: "Reply with the single word: ready" }],
  });
  const text = r.content.find((b) => b.type === "text")?.text?.trim();
  console.log(`   ok - replied ${JSON.stringify(text)}  stop=${r.stop_reason}`);
  report("connect", r.usage);
} catch (err) {
  console.error(`   FAILED: ${err.name}: ${err.message}`);
  if (String(err.message).includes("404")) {
    console.error(
      "   A 404 here is almost always the base URL. It must stop at /api -\n" +
        "   the SDK appends /v1/messages itself.",
    );
  }
  if (/model/i.test(String(err.message))) {
    console.error("   Model not found: OpenRouter needs the anthropic/ prefix.");
  }
  process.exit(1);
}

/* ---------------------------------------------------- 2. strict tool use */
console.log("\n2. strict tool use (the planned mechanism)");
const miniTool = {
  name: "emit_mini_spec",
  description: "Emit a tiny game spec. Always call this tool.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      subject: { type: "string", enum: ["science", "math", "b-melayu"] },
      yearLevel: { type: "integer" },
      questionCount: { type: "integer" },
    },
    required: ["title", "subject", "yearLevel", "questionCount"],
    additionalProperties: false,
  },
};
let toolWorks = false;
try {
  const r = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [miniTool],
    tool_choice: { type: "tool", name: "emit_mini_spec" },
    messages: [
      {
        role: "user",
        content:
          "A Year 4 science quiz about the solar system with 5 questions. Emit the spec.",
      },
    ],
  });
  const call = r.content.find((b) => b.type === "tool_use");
  if (!call) throw new Error(`no tool_use block; stop_reason=${r.stop_reason}`);
  const keys = Object.keys(call.input).sort().join(",");
  const expected = "questionCount,subject,title,yearLevel";
  console.log(`   ok - tool_use received, keys: ${keys}`);
  console.log(`   schema-exact: ${keys === expected ? "yes" : `NO (expected ${expected})`}`);
  console.log(`   input: ${JSON.stringify(call.input)}`);
  report("tool", r.usage);
  toolWorks = keys === expected;
} catch (err) {
  console.error(`   FAILED: ${err.name}: ${err.message}`);
}

/* -------------------------------------------------------- 3. cache_control */
console.log("\n3. prompt caching");
// Must be byte-identical across both calls and long enough to be cacheable.
const bigSystem =
  "You are a game spec generator for Pandai.\n" +
  Array.from(
    { length: 220 },
    (_, i) =>
      `Rule ${i}: templates are quiz-race, match-pairs, sort-buckets, sequence-order and fill-blank; ` +
      `colour is derived from the subject and never chosen; every spec must validate before it renders.`,
  ).join("\n");

async function cacheCall(tag) {
  const r = await client.messages.create({
    model: MODEL,
    max_tokens: 32,
    system: [
      { type: "text", text: bigSystem, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: "Reply with the single word: ok" }],
  });
  console.log(`   ${tag}:`);
  report(tag, r.usage);
  return r.usage;
}
try {
  await cacheCall("first call (expect cache_write > 0)");
  const second = await cacheCall("second call (expect cache_read > 0)");
  const read = second?.cache_read_input_tokens ?? 0;
  console.log(
    read > 0
      ? `   ok - caching works, ${read} tokens read from cache`
      : "   NO CACHE HIT. Either the gateway drops cache_control, or the prefix moved.",
  );
} catch (err) {
  console.error(`   FAILED: ${err.name}: ${err.message}`);
}

/* --------------------------------------- 4. output_config (the open question) */
console.log("\n4. output_config.format (structured outputs)");
try {
  const { z } = await import("zod");
  const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");
  const Mini = z.object({
    title: z.string(),
    questionCount: z.number().int(),
  });
  const r = await client.messages.parse({
    model: MODEL,
    max_tokens: 512,
    messages: [
      { role: "user", content: "A Year 4 science quiz, 5 questions. Emit it." },
    ],
    output_config: { format: zodOutputFormat(Mini) },
  });
  console.log(
    r.parsed_output
      ? `   ok - supported. parsed: ${JSON.stringify(r.parsed_output)}`
      : "   returned no parsed_output - treat as unsupported",
  );
  report("output_config", r.usage);
} catch (err) {
  console.log(`   NOT SUPPORTED through this provider: ${err.name}: ${err.message}`);
  console.log("   -> Phase 4 uses strict tool use, which is why it was chosen.");
}

console.log(`\napprox total spend this run: $${spent.toFixed(4)}`);
console.log(
  toolWorks
    ? "VERDICT: strict tool use works - Phase 4 can proceed on this provider."
    : "VERDICT: strict tool use did NOT work - stop and investigate before Phase 4.",
);
