/**
 * NOT a Node script. This is the payload for the Figma MCP `use_figma` tool -
 * it runs inside the Figma file via the Plugin API. `node` cannot execute it;
 * there is no `figma` global outside Figma.
 *
 * It is committed because it is the exact code that produced
 * lib/ds/tokens.raw.json, and a sync you cannot reproduce is a sync you cannot
 * review. See scripts/sync-tokens.md for how to run it.
 *
 * The interesting part is `MODE_PREF`. Pandai DS 1.5 resolves through a
 * three-level alias chain:
 *
 *     Semantic (Light | Dark)
 *        -> Product (Student | Teacher | Parent)
 *           -> Primitives (Value)
 *
 * Each level has its OWN modes, so a value is only meaningful once you pin a
 * mode per collection. Reading each collection's default mode instead would
 * silently mix a Light semantic with whatever Product's default happens to be -
 * which is how a Student (green) build ends up wearing a Teacher (pink) value
 * with nothing in the output to indicate it.
 */

const collections = await figma.variables.getLocalVariableCollectionsAsync();
const colById = {};
collections.forEach((c) => {
  colById[c.id] = c;
});

const MODE_PREF = {
  Semantic: "Light",
  Product: "Student",
  Responsives: "Desktop",
  Primitives: "Value",
  Typography: "Value",
};

function modeFor(c) {
  const want = MODE_PREF[c.name];
  const m = want && c.modes.find((x) => x.name === want);
  return m ? m.modeId : c.defaultModeId;
}

const vars = await figma.variables.getLocalVariablesAsync();
const varById = {};
vars.forEach((v) => {
  varById[v.id] = v;
});

function hex(c) {
  const h = (n) => Math.round(n * 255).toString(16).padStart(2, "0");
  const base = "#" + h(c.r) + h(c.g) + h(c.b);
  return c.a !== undefined && c.a < 1 ? base + h(c.a) : base;
}

function resolve(v, depth) {
  if (depth > 10) return "!depth";
  const col = colById[v.variableCollectionId];
  const val = v.valuesByMode[modeFor(col)];
  if (val && val.type === "VARIABLE_ALIAS") {
    const next = varById[val.id];
    return next ? resolve(next, depth + 1) : "!missing-alias";
  }
  if (v.resolvedType === "COLOR" && val && typeof val === "object") {
    return hex(val);
  }
  return val;
}

const COLOR_GROUPS = [
  "Surface/",
  "Text/",
  "Border/",
  "Icon/",
  "Status/",
  "Accents/",
  "Subjects/",
];
const DIM_GROUPS = ["Radius/", "Spacing/", "Border Width/"];

const semantic = collections.find((c) => c.name === "Semantic");
const color = {};
const dimension = {};

for (const v of vars) {
  if (v.variableCollectionId !== semantic.id) continue;
  const isDim = DIM_GROUPS.some((p) => v.name.startsWith(p));
  const isColor =
    !isDim && COLOR_GROUPS.some((p) => v.name.startsWith(p));
  if (!isDim && !isColor) continue;
  (isDim ? dimension : color)[v.name] = resolve(v, 0);
}

// Returned shape matches lib/ds/tokens.raw.json's `color` and `dimension` keys.
return {
  counts: {
    color: Object.keys(color).length,
    dimension: Object.keys(dimension).length,
  },
  collections: collections.map((c) => ({
    name: c.name,
    vars: c.variableIds.length,
    modes: c.modes.map((m) => m.name),
  })),
  color,
  dimension,
};
