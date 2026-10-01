/**
 * NOT a Node script - the payload for Figma MCP `use_figma`, like
 * figma-token-resolver.js. Read-only: it changes nothing in the file.
 *
 * Reads the DS 1.5 colour documentation cards on the "🎨 Colors" page and the
 * values behind them. Produced, on 2026-10-02:
 *   lib/ds/colour-cards.ts       which card shows which tokens, in order
 *   lib/ds/tokens.raw.json       `primitive` and `colorDark`
 *
 * use_figma truncates a result at 20KB, and the full answer is larger, so set
 * PART and run it once per part:
 *
 *   "cards"     card id, title and token order for all three card sets, plus
 *               any card whose PRINTED hex disagrees with its variable
 *   "primitive" every Primitive shown on a card, name -> value
 *   "light"     Semantic=Light for every semantic card token - to diff against
 *               tokens.raw.json `color`, which should already hold them all
 *   "dark"      Semantic=Dark (Product=Student) for every semantic card token
 *
 * Every part also returns an FNV-1a digest over its sorted `name=value` lines.
 * Compute the same over what you paste (scripts/sync-tokens.md shows the hash)
 * - equal digests are the proof the paste is exact. 2026-10-02: primitive
 * c182789 (424), dark a9e8220b (103, Surface and Text only). Later the same
 * day the six other semantic sets were added; see tokens.raw.json $meta.
 */
const PART = "cards";
// null reads every set. A list reads only those semantic sets (and skips the
// primitive cards) - the way to stay under 20KB when adding a few sets.
const CARD_SETS = null;

const PRIMITIVE_CARDS = ["1898:12523","1898:12876","1898:13344","1898:13656","1898:13968","1898:14280","1898:14592","1898:14904","1898:15372","1898:15684","1898:15996","1898:16308","7508:2","7508:175","7508:348","7508:504","7508:660","7508:816","7510:2","7510:158","7510:314","7510:470","7510:643","7510:816","7514:2","7514:175","7514:348","7514:521","7514:694","7514:867","7514:1040","7515:2","7515:175","7515:348","7515:521","7515:694","7515:867","7515:1040","7516:2","7516:175","7516:348","7516:521","7521:2"];
// One frame per semantic set on the "🎨 Colors" page. Every card in a frame is
// read, in canvas order.
const SEMANTIC_FRAMES = {
  surface: "3372:3291",
  text: "3371:1242",
  icon: "3371:2431",
  border: "3372:4480",
  subjects: "3372:5766",
  medals: "3334:2",
  status: "3829:2",
  accents: "7494:2",
};

const collections = await figma.variables.getLocalVariableCollectionsAsync();
const colById = {}; collections.forEach((c) => (colById[c.id] = c));
const vars = await figma.variables.getLocalVariablesAsync();
const varById = {}, semByName = {};
const sem = collections.find((c) => c.name === "Semantic");
vars.forEach((v) => { varById[v.id] = v; if (v.variableCollectionId === sem.id) semByName[v.name] = v; });

const hex = (c) => { const h = (n) => Math.round(n * 255).toString(16).padStart(2, "0"); const b = "#" + h(c.r) + h(c.g) + h(c.b); return c.a !== undefined && c.a < 1 ? b + h(c.a) : b; };
// Pin a mode per collection - see scripts/sync-tokens.md.
function modeFor(c, semanticMode) {
  const want = { Semantic: semanticMode, Product: "Student", Primitives: "Value" }[c.name];
  const m = want && c.modes.find((x) => x.name === want);
  return m ? m.modeId : c.defaultModeId;
}
function resolve(v, semanticMode, depth = 0) {
  if (depth > 10) return "!depth";
  const val = v.valuesByMode[modeFor(colById[v.variableCollectionId], semanticMode)];
  if (val && val.type === "VARIABLE_ALIAS") { const n = varById[val.id]; return n ? resolve(n, semanticMode, depth + 1) : "!missing"; }
  return v.resolvedType === "COLOR" && val && typeof val === "object" ? hex(val) : val;
}
const text = (n) => ("characters" in n ? n.characters.trim() : "");
const norm = (s) => String(s).toLowerCase().replace("#", "");
function digest(map) {
  const s = Object.entries(map).map(([k, v]) => k + "=" + v).sort().join("\n");
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16);
}

const cards = { primitive: [] };
for (const set of Object.keys(SEMANTIC_FRAMES)) cards[set] = [];
const values = { primitive: {}, light: {}, dark: {} };
const mismatch = [];

for (const id of CARD_SETS ? [] : PRIMITIVE_CARDS) {
  const n = await figma.getNodeByIdAsync(id);
  const title = n.children.find((c) => c.type === "TEXT");
  const tokens = [];
  for (const sw of n.findAll((c) => c.type === "FRAME" && c.name === "swatch")) {
    const bound = sw.boundVariables && sw.boundVariables.fills && sw.boundVariables.fills[0];
    const v = bound && varById[bound.id];
    if (!v) { mismatch.push(id + " unbound swatch " + sw.parent.parent.name); continue; }
    const real = resolve(v, "Light");
    const shown = sw.parent.findOne((c) => c.type === "TEXT" && c.name === "{hex-value}");
    if (shown && norm(text(shown)) !== norm(real)) mismatch.push(v.name + " shown=" + text(shown) + " real=" + real);
    tokens.push(v.name);
    values.primitive[v.name] = real;
  }
  cards.primitive.push([id, title ? text(title) : n.name, tokens]);
}

for (const [set, frameId] of Object.entries(SEMANTIC_FRAMES)) {
  if (CARD_SETS && !CARD_SETS.includes(set)) continue;
  const f = await figma.getNodeByIdAsync(frameId);
  const byCard = new Map();
  for (const row of f.findAll((n) => n.name === "Semantic Color")) {
    if (!byCard.has(row.parent.id)) byCard.set(row.parent.id, { card: row.parent, rows: [] });
    byCard.get(row.parent.id).rows.push(row);
  }
  for (const { card, rows } of byCard.values()) {
    const header = card.children[0];
    const title = header && (header.type === "TEXT" ? header : header.findOne((c) => c.type === "TEXT"));
    const tokens = [];
    for (const row of rows) {
      const [name, shownLight, shownDark] = row.findAll((c) => c.type === "TEXT").map(text);
      const v = semByName[name];
      if (!v) { mismatch.push(card.id + " unknown token " + name); continue; }
      const L = resolve(v, "Light"), D = resolve(v, "Dark");
      if (shownLight && norm(shownLight) !== norm(L)) mismatch.push(name + " light shown=" + shownLight + " real=" + L);
      if (shownDark && norm(shownDark) !== norm(D)) mismatch.push(name + " dark shown=" + shownDark + " real=" + D);
      tokens.push(name);
      values.light[name] = L;
      values.dark[name] = D;
    }
    cards[set].push([card.id, title ? text(title) : card.name, tokens]);
  }
}

if (PART === "cards") return { cards: Object.fromEntries(Object.entries(cards).filter(([, v]) => v.length)), mismatch };
if (PART === "primitive") return { count: Object.keys(values.primitive).length, digest: digest(values.primitive), values: values.primitive };
if (PART === "light") return { count: Object.keys(values.light).length, digest: digest(values.light), values: values.light };
if (PART === "dark") return { count: Object.keys(values.dark).length, digest: digest(values.dark), values: values.dark };
