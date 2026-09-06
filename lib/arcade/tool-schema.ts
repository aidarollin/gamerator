import { z } from "zod";

/**
 * Zod schema -> a JSON Schema that strict tool use will accept.
 *
 * Why tool use and not `output_config.format`:
 *
 * The provider smoke test suggested `output_config.format` worked through
 * OpenRouter. It does not - it is accepted and passed along as a hint, not
 * enforced. The trivial two-field schema in that test happened to come back as
 * bare JSON, which looked like enforcement. With a real schema the model
 * replied with a markdown-fenced code block and the SDK threw
 * `Unexpected token '`'`.
 *
 * Strict tool use IS enforced through the gateway - the same smoke test showed
 * schema-exact arguments - so that is what generation uses. The lesson is that
 * a capability probe has to use a payload the size of the real thing.
 *
 * Strict mode additionally requires, at every object level:
 *   - `additionalProperties: false`
 *   - every property listed in `required`
 * Optional fields therefore have to become nullable-and-required, which is why
 * `contentTwist` is stripped here rather than left optional.
 */
export function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { io: "input" }) as Record<string, unknown>;
  return harden(json) as Record<string, unknown>;
}

function harden(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(harden);
  if (!node || typeof node !== "object") return node;

  const obj = { ...(node as Record<string, unknown>) };

  // Strict mode rejects $schema and other metadata at the root.
  delete obj.$schema;

  if (obj.type === "object" && obj.properties && typeof obj.properties === "object") {
    const props = obj.properties as Record<string, unknown>;
    for (const key of Object.keys(props)) props[key] = harden(props[key]);
    obj.additionalProperties = false;
    // Strict requires every property to be required. Anything genuinely
    // optional must be dropped from the model's view, not left out of
    // `required` - the validator still accepts it being absent afterwards.
    obj.required = Object.keys(props);
  } else {
    for (const key of Object.keys(obj)) obj[key] = harden(obj[key]);
  }
  return obj;
}
