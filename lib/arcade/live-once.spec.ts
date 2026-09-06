import { expect, it } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import { toStrictJsonSchema } from "./tool-schema";
import { writeFileSync } from "node:fs";
import { ArcadeSpec, ENGINE_SCHEMAS } from "./schema";
import { arcadeSystemPrompt, arcadeRepairPrompt } from "./prompt";
import { chooseEngine } from "./brief";

/**
 * ONE live generation. SPENDS REAL MONEY - roughly one to three cents.
 *
 *   node --env-file=.env.local node_modules/vitest/vitest.mjs run --config vitest.live.mts
 *   (or: npm run generate:once)
 *
 * Deliberately not reachable from `npm test`: the default config's include
 * pattern is `lib/ **\/ *.test.ts` and this file is `.spec.ts`, so no ordinary
 * test run, gate or CI job can trigger a paid call. Running it requires naming
 * vitest.live.mts explicitly.
 *
 * It is written as a test rather than a script because the question it answers
 * IS a test: does the model produce a spec that passes bounds AND the
 * playability simulation? The result is written to a fixture so one paid call
 * leaves something permanent to play.
 */

const PROMPT =
  process.env.GAMERATOR_PROMPT ??
  "A snake game for a nine-year-old that starts gentle and gets genuinely tense by the end. Walls should not kill - let it wrap around. Nadia is the character, and write the title and description in Bahasa Melayu.";

const RATE = { in: 5 / 1e6, out: 25 / 1e6, cacheRead: 0.5 / 1e6 };

it("the model produces a valid, playable spec", async () => {
  expect(process.env.ANTHROPIC_API_KEY, "no API key - pass --env-file=.env.local").toBeTruthy();

  const model = process.env.GAMERATOR_MODEL ?? "claude-opus-5";
  const client = new Anthropic();
  let spent = 0;

  const usage = (label: string, u: Anthropic.Usage) => {
    const cost =
      (u.input_tokens ?? 0) * RATE.in +
      (u.output_tokens ?? 0) * RATE.out +
      ((u.cache_read_input_tokens ?? 0) as number) * RATE.cacheRead;
    spent += cost;
    console.log(
      `   ${label}: in=${u.input_tokens} out=${u.output_tokens} cache_read=${u.cache_read_input_tokens ?? 0} ~$${cost.toFixed(4)}`,
    );
  };

  const choice = chooseEngine(PROMPT);
  expect(choice.kind, "no engine for that prompt - nothing to spend on").toBe("engine");
  if (choice.kind !== "engine") return;

  console.log(`\nprompt : ${PROMPT}`);
  console.log(`engine : ${choice.engine}${choice.confident ? "" : "  (guessed)"}`);
  console.log(`model  : ${model}\n`);

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `Request: ${PROMPT}\nEngine: ${choice.engine}` },
  ];

  // Strict TOOL USE, not output_config.format. The gateway accepts
  // output_config as a hint and does not enforce it - the model replied with a
  // markdown-fenced code block and the SDK threw. Tool use is enforced.
  const tool: Anthropic.Tool = {
    name: "emit_game_spec",
    description: `Emit the specification for a ${choice.engine} game. Always call this tool.`,
    strict: true,
    input_schema: toStrictJsonSchema(
      ENGINE_SCHEMAS[choice.engine].omit({ contentTwist: true }),
    ) as Anthropic.Tool.InputSchema,
  };

  const call = async () => {
    const r = await client.messages.create({
      model,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      system: [
        { type: "text", text: arcadeSystemPrompt(), cache_control: { type: "ephemeral" } },
      ],
      tools: [tool],
      tool_choice: { type: "tool", name: "emit_game_spec" },
      messages,
    });
    const block = r.content.find((b) => b.type === "tool_use");
    return { response: r, spec: block ? block.input : null };
  };

  console.log("1. generating");
  let { response, spec: candidate } = await call();
  usage("call 1", response.usage);
  expect(response.stop_reason, "the model declined").not.toBe("refusal");
  expect(candidate, "no tool_use block came back").toBeTruthy();

  console.log("\n2. validating - bounds, then the playability simulation");
  let parsed = ArcadeSpec.safeParse(candidate);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({
      path: i.path.map(String).join("."),
      message: i.message,
    }));
    console.log("   REJECTED by the validator:");
    issues.forEach((i) => console.log(`     ${i.path || "(root)"}: ${i.message}`));

    console.log("\n3. one repair turn - not a loop");
    messages.push(
      { role: "assistant", content: JSON.stringify(candidate) },
      { role: "user", content: arcadeRepairPrompt(issues) },
    );
    const again = await call();
    response = again.response;
    candidate = again.spec;
    usage("call 2", response.usage);
    parsed = ArcadeSpec.safeParse(candidate);
    console.log(parsed.success ? "   repaired and valid" : "   still invalid - stopping");
  } else {
    console.log("   valid first time - playable, and losable");
  }

  console.log(`\napprox spend: $${spent.toFixed(4)}`);

  if (parsed.success) {
    writeFileSync(
      "lib/arcade/fixtures/model-generated.json",
      JSON.stringify(parsed.data, null, 2) + "\n",
      "utf8",
    );
    console.log("\nwrote lib/arcade/fixtures/model-generated.json");
    console.log(JSON.stringify(parsed.data, null, 2));
  } else {
    parsed.error.issues.forEach((i) =>
      console.log(`     ${i.path.map(String).join(".")}: ${i.message}`),
    );
  }

  expect(parsed.success, "the model could not produce a playable spec in two tries").toBe(true);
});
