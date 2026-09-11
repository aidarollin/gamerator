#!/usr/bin/env node
/**
 * Imports the Pandai PRODUCT's own design-system layer.
 *
 *   node scripts/sync-app-ds.mjs [path/to/pandai.question.uiux]
 *   npm run tokens:app
 *
 * Writes app/ds/pandai-app.css. READ-ONLY on the product repo - it is another
 * team's working tree and nothing here may change it.
 *
 * WHY A SECOND SOURCE. `generate-tokens.mjs` builds the colour, spacing and
 * radius layer from Figma, and the Figma extract deliberately skips the
 * Typography collection. The product repo is where Pandai's typography actually
 * LIVES in code: Poppins, a nineteen-role type scale whose roles are size AND
 * weight, and the tablet/mobile steps. It also carries motion tokens and the DS
 * alias names the product team writes. This site used Geist - the Next.js
 * default - and had never been told what Pandai's type is.
 *
 * WHAT WINS WHEN THE TWO DISAGREE: the product. It is what students actually
 * see, and a value it has changed is a decision somebody made on purpose. Every
 * disagreement is printed on every run so it is never silent.
 *
 * One exception, named in SKIP below: a product alias whose NAME collides with
 * a real DS token but means something else.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(process.argv[2] ?? join(root, "..", "pandai.question.uiux"));
const dir = join(repo, "resources", "css", "pandai");
const FILES = ["tokens.css", "base.css", "responsive.css"];

for (const f of FILES) {
  if (!existsSync(join(dir, f))) {
    console.error(`sync-app-ds: cannot find ${join(dir, f)}\nPass the product repo path as the first argument.`);
    process.exit(1);
  }
}

/**
 * Product aliases that are NOT imported, and why. Each one is a decision.
 */
const SKIP = {
  // The product's `--radius-xl` is 8px, a local alias for its 44x44 nav button.
  // The DS's Radius/xl is 16px - the product's own `--corner-radius-corner-xl`
  // says so - and every card on this site is drawn with it. Importing the alias
  // would quietly halve the corner radius of every card.
  "--radius-xl": "name collides with DS Radius/xl (16px); the product uses it for an 8px nav button",
  // Loaded through next/font instead, which self-hosts the files at build time.
  "--font-family": "Poppins is loaded by next/font in app/layout.tsx",
};

/** Groups taken from the product's tokens, by name. */
const GROUPS = [
  ["Typography - DS 1.5 role scale (desktop; steps below)", /^--type-/],
  ["Motion", /^--(motion|ease|lift|spin)-/],
  ["DS alias names the product writes", /^--(spacing-space|corner-radius-corner)-/],
];

const git = (...args) => {
  try {
    return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
};
const commit = git("rev-parse", "--short", "HEAD") || "unknown";
const date = git("log", "-1", "--format=%ad", "--date=short") || "unknown";
const dirty = git("status", "--porcelain", "--", ...FILES.map((f) => `resources/css/pandai/${f}`));

const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const read = (f) => strip(readFileSync(join(dir, f), "utf8"));

/** Custom property declarations in order, first definition wins. */
function decls(css) {
  const out = new Map();
  for (const m of css.matchAll(/(--[a-zA-Z0-9-_]+)\s*:\s*([^;{}]+);/g)) {
    if (!out.has(m[1])) out.set(m[1], m[2].trim());
  }
  return out;
}

/** Index of the `}` that closes the `{` at `open`. */
function closeOf(css, open) {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return i;
  }
  return css.length;
}

/**
 * The tablet and mobile steps. The product writes its breakpoints through
 * Tailwind's `theme(--breakpoint-*, <fallback>)`; this site has no such theme
 * key, so the fallback pixel value is what gets written.
 *
 * TWO THINGS THE FIRST VERSION GOT WRONG, both caught by reading its output:
 *
 * 1. It took "the first `:root` after the @media", which is not the same as
 *    "the `:root` INSIDE the @media". An earlier tablet block with no `:root` of
 *    its own reached forward into the DESKTOP block's `:root` - so phones were
 *    handed the tablet sizes and the real mobile step was never read. The block
 *    is now brace-matched and only its own contents are searched.
 * 2. It wrote the steps in the order they were found. Where two `max-width`
 *    queries both match - any phone matches both - the LATER one wins, so the
 *    narrowest step has to come last. They are sorted widest-first now.
 */
function typeSteps(css) {
  const steps = new Map();
  const re = /@media\s*\(width\s*<\s*theme\(\s*(--breakpoint-[a-z]+)\s*,\s*(\d+px)\s*\)\s*\)\s*\{/g;
  for (const m of css.matchAll(re)) {
    if (steps.has(m[1])) continue;
    const open = m.index + m[0].length - 1;
    const inner = css.slice(open + 1, closeOf(css, open));
    const at = inner.search(/(^|[\s}]):root\s*\{/);
    if (at < 0) continue;
    const rootOpen = inner.indexOf("{", at);
    const body = inner.slice(rootOpen + 1, closeOf(inner, rootOpen));
    const vars = [...decls(body)].filter(([k]) => k.startsWith("--type-"));
    if (vars.length) steps.set(m[1], { name: m[1], px: m[2], vars });
  }
  return [...steps.values()].sort((a, b) => parseInt(b.px, 10) - parseInt(a.px, 10));
}

/** `.type-h1 { ... font-weight: 700; }` - the role -> weight map. */
function roleClasses(css) {
  const out = [];
  for (const m of css.matchAll(/\.type-([a-z0-9]+)\s*\{([^}]*)\}/g)) {
    const weight = /font-weight\s*:\s*(\d+)/.exec(m[2])?.[1];
    if (weight) out.push([m[1], weight]);
  }
  return out;
}

/** Same colour written two ways must not count as a difference. */
function norm(v) {
  const s = v.toLowerCase().replace(/\s+/g, "");
  const rgba = /^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/.exec(s);
  if (!rgba) return s;
  const h = (n) => Number(n).toString(16).padStart(2, "0");
  const a = rgba[4] === undefined ? "" : h(Math.round(Number(rgba[4]) * 255));
  return `#${h(rgba[1])}${h(rgba[2])}${h(rgba[3])}${a === "ff" ? "" : a}`;
}

const product = decls(read("tokens.css"));
const figma = decls(readFileSync(join(root, "app", "ds", "tokens.css"), "utf8"));

const sections = [];
const taken = new Set();
for (const [title, re] of GROUPS) {
  const vars = [...product].filter(([k]) => re.test(k) && !(k in SKIP));
  vars.forEach(([k]) => taken.add(k));
  sections.push([title, vars]);
}

/**
 * Where the product and the Figma layer disagree about the SAME token.
 * The product wins; each one is listed.
 */
const overrides = [];
const skipped = [];
for (const [k, v] of product) {
  if (!figma.has(k)) continue;
  if (norm(v) === norm(figma.get(k))) continue;
  if (k in SKIP) skipped.push([k, v, figma.get(k), SKIP[k]]);
  else overrides.push([k, v, figma.get(k)]);
}
sections.push(["Where the product differs from the Figma layer - the product wins", overrides.map(([k, v]) => [k, v])]);

const steps = typeSteps(read("responsive.css"));
const roles = roleClasses(read("base.css"));

const line = (k, v) => `  ${k}: ${v};`;
let css = `/* GENERATED - do not hand-edit. Regenerate: npm run tokens:app
 *
 * Source: the Pandai product, pandai.question.uiux @ ${commit} (${date})${dirty ? ", WITH UNCOMMITTED CHANGES" : ""}
 *   resources/css/pandai/tokens.css, base.css, responsive.css
 *
 * Loaded AFTER app/ds/tokens.css (the Figma layer). Adds Pandai's typography,
 * motion and alias names; where the product and Figma disagree about the same
 * token, the product's value is below and wins. See scripts/sync-app-ds.mjs.
 *
 * Not imported, on purpose:
${Object.entries(SKIP).map(([k, why]) => ` *   ${k} - ${why}`).join("\n")}
 *   product-only colours (Juara Digital, check-in, raw primitives) - not DS tokens
 */

:root {
`;
for (const [title, vars] of sections) {
  if (!vars.length) continue;
  css += `  /* ${title} */\n${vars.map(([k, v]) => line(k, v)).join("\n")}\n\n`;
}
css = css.trimEnd() + "\n}\n";

for (const s of steps) {
  css += `\n/* ${s.name.replace("--breakpoint-", "")} and below */\n@media (width < ${s.px}) {\n  :root {\n${s.vars.map(([k, v]) => "  " + line(k, v)).join("\n")}\n  }\n}\n`;
}

css += `\n/* Type roles. A role is size AND weight - there are no weight tokens, so the\n   class is the authoritative role -> weight map. */\n`;
for (const [r, w] of roles) {
  css += `.type-${r} { font-size: var(--type-${r}); line-height: var(--type-${r}-lh); font-weight: ${w}; }\n`;
}

writeFileSync(join(root, "app", "ds", "pandai-app.css"), css, "utf8");

console.log(`sync-app-ds: pandai.question.uiux @ ${commit} (${date})${dirty ? " - uncommitted changes in the DS files" : ""}`);
for (const [title, vars] of sections) console.log(`  ${String(vars.length).padStart(3)}  ${title}`);
console.log(`  ${String(steps.length).padStart(3)}  responsive type steps (${steps.map((s) => s.px).join(", ")})`);
console.log(`  ${String(roles.length).padStart(3)}  .type-* role classes`);
for (const [k, v, f] of overrides) console.log(`  OVERRIDE ${k}: product ${v}, Figma ${f}`);
for (const [k, v, f, why] of skipped) console.log(`  SKIPPED  ${k}: product ${v}, Figma ${f} - ${why}`);
console.log("wrote app/ds/pandai-app.css");
