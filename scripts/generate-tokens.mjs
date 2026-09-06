#!/usr/bin/env node
/**
 * Generates the DS token layer from lib/ds/tokens.raw.json.
 *
 *   node scripts/generate-tokens.mjs
 *
 * Deliberately separate from the Figma fetch. The fetch is an agent procedure
 * (see scripts/sync-tokens.md) because Figma MCP is per-seat authenticated and
 * cannot be called from Node. This half is deterministic: same input, same
 * output, runnable by anyone, diffable in review.
 *
 * Writes:
 *   app/ds/tokens.css            CSS custom properties
 *   lib/ds/tokens.generated.ts   typed constants + subject/accent maps
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const raw = JSON.parse(
  readFileSync(join(root, "lib/ds/tokens.raw.json"), "utf8"),
);

/** "Surface/primary/default-hover" -> "--surface-primary-default-hover" */
function cssVar(path) {
  return (
    "--" +
    path
      .toLowerCase()
      .replace(/[/\s]+/g, "-")
      .replace(/-+/g, "-")
  );
}

// A collision would make one token silently overwrite another in the
// stylesheet - the kind of bug that shows up as "that colour is wrong
// sometimes". Fail the build instead.
const seen = new Map();
const all = [
  ...Object.keys(raw.color).map((p) => ["color", p]),
  ...Object.keys(raw.dimension).map((p) => ["dimension", p]),
];
for (const [kind, path] of all) {
  const v = cssVar(path);
  if (seen.has(v)) {
    throw new Error(
      `CSS variable collision: ${v}\n  from ${seen.get(v)}\n  and  ${path}`,
    );
  }
  seen.set(v, `${kind}:${path}`);
}

const header = `/* GENERATED - do not hand-edit.
 * Source: ${raw.$meta.source} (Figma ${raw.$meta.fileKey})
 * Extracted: ${raw.$meta.extractedAt}
 * Modes: ${Object.entries(raw.$meta.modesPinned).map(([k, v]) => `${k}=${v}`).join(", ")}
 * Regenerate: node scripts/generate-tokens.mjs
 * Re-fetch from Figma: scripts/sync-tokens.md
 */`;

// ---------------------------------------------------------------- tokens.css

const group = (prefix, entries) => {
  const rows = entries
    .filter(([p]) => p.startsWith(prefix))
    .map(([p, v]) => `  ${cssVar(p)}: ${typeof v === "number" ? `${v}px` : v};`)
    .join("\n");
  return rows ? `\n  /* ${prefix.replace(/\/$/, "")} */\n${rows}\n` : "";
};

const colorEntries = Object.entries(raw.color);
const dimEntries = Object.entries(raw.dimension);

const css = `${header}

:root {
  color-scheme: light;
${["Surface/", "Text/", "Border/", "Icon/", "Status/", "Accents/", "Subjects/"]
  .map((p) => group(p, colorEntries))
  .join("")}${["Radius/", "Spacing/", "Border Width/"]
  .map((p) => group(p, dimEntries))
  .join("")}}
`;

// -------------------------------------------------------- tokens.generated.ts

const subjectKeys = [
  ...new Set(
    Object.keys(raw.color)
      .filter((p) => p.startsWith("Subjects/"))
      .map((p) => p.split("/")[1]),
  ),
].sort();

// A family qualifies as an accent only if it carries the full Surface ramp the
// renderer needs. Anything short of that would render as a gap at some state.
const RAMP = [
  "default",
  "default-hover",
  "default-subtle",
  "default-subtle-hover",
  "focus",
];
const surfaceFamilies = [
  ...new Set(
    Object.keys(raw.color)
      .filter((p) => p.startsWith("Surface/"))
      .map((p) => p.split("/")[1]),
  ),
]
  .filter((f) => RAMP.every((s) => raw.color[`Surface/${f}/${s}`]))
  .sort();

const statusKeys = [
  ...new Set(
    Object.keys(raw.color)
      .filter((p) => p.startsWith("Status/"))
      .map((p) => p.split("/")[1]),
  ),
].sort();

const lit = (xs) => xs.map((x) => `  "${x}",`).join("\n");

/** The literal behind a token path, whichever group it lives in. */
const rawValue = (path) =>
  path in raw.color ? raw.color[path] : raw.dimension[path];

const ts = `${header}

/** Every DS token path that exists in this build, mapped to its CSS variable. */
export const TOKEN_VARS = {
${[...seen.keys()]
  .sort()
  .map((v) => `  "${seen.get(v).split(":").slice(1).join(":")}": "${v}",`)
  .join("\n")}
} as const;

export type TokenPath = keyof typeof TOKEN_VARS;

/**
 * Literal values, keyed by CSS variable name.
 *
 * Canvas cannot consume a var() reference; it needs a real value, read at
 * runtime from the stylesheet. This map is the fallback for when that read
 * returns nothing - an unmounted node, or a headless render. It exists so that
 * no component ever writes a colour literal of its own, which check:ds forbids.
 */
export const VAR_VALUES: Record<string, string> = {
${[...seen.keys()]
  .sort()
  .map((v) => {
    const path = seen.get(v).split(":").slice(1).join(":");
    const value = rawValue(path);
    const out = typeof value === "number" ? `${value}px` : value;
    return `  "${v}": ${JSON.stringify(out)},`;
  })
  .join("\n")}
};

/** \`var(--surface-primary-default)\`, typo-proof. */
export function token(path: TokenPath): string {
  return \`var(\${TOKEN_VARS[path]})\`;
}

/**
 * Subject identities from the DS. A game's accent is DERIVED from its subject
 * rather than chosen, so a Bahasa Melayu game wears the same blue it wears
 * everywhere else in Pandai - and the model never has to guess a colour.
 */
export const SUBJECT_KEYS = [
${lit(subjectKeys)}
] as const;

export type SubjectKey = (typeof SUBJECT_KEYS)[number];

/**
 * Semantic accent families carrying the complete Surface ramp. Used only where
 * a game has no subject to derive from.
 */
export const ACCENT_FAMILIES = [
${lit(surfaceFamilies)}
] as const;

export type AccentFamily = (typeof ACCENT_FAMILIES)[number];

/** Game status colours - the DS already ships these. */
export const STATUS_KEYS = [
${lit(statusKeys)}
] as const;

export type StatusKey = (typeof STATUS_KEYS)[number];

export type Ramp = {
  default: string;
  hover: string;
  subtle: string;
  subtleHover: string;
  focus: string;
};

const ramp = (prefix: string): Ramp => ({
  default: \`var(--\${prefix}-default)\`,
  hover: \`var(--\${prefix}-default-hover)\`,
  subtle: \`var(--\${prefix}-default-subtle)\`,
  subtleHover: \`var(--\${prefix}-default-subtle-hover)\`,
  focus: \`var(--\${prefix}-focus)\`,
});

export const subjectRamp = (s: SubjectKey): Ramp => ramp(\`subjects-\${s}\`);
export const accentRamp = (a: AccentFamily): Ramp => ramp(\`surface-\${a}\`);

/** Spacing scale. The house rule is 16 - see docs/DESIGN-SYSTEM-SYNC.md. */
export const SPACING = {
${dimEntries
  .filter(([p]) => p.startsWith("Spacing/component/"))
  .map(([p, v]) => `  "${p.split("/")[2]}": ${v},`)
  .join("\n")}
} as const;

export const RADIUS = {
${dimEntries
  .filter(([p]) => p.startsWith("Radius/"))
  .map(([p, v]) => `  "${p.split("/")[1]}": ${v},`)
  .join("\n")}
} as const;
`;

mkdirSync(join(root, "app/ds"), { recursive: true });
writeFileSync(join(root, "app/ds/tokens.css"), css, "utf8");
writeFileSync(join(root, "lib/ds/tokens.generated.ts"), ts, "utf8");

console.log(
  `tokens: ${colorEntries.length} colours, ${dimEntries.length} dimensions\n` +
    `subjects: ${subjectKeys.length}\n` +
    `accent families: ${surfaceFamilies.length} (${surfaceFamilies.join(", ")})\n` +
    `status: ${statusKeys.length} (${statusKeys.join(", ")})\n` +
    `wrote app/ds/tokens.css and lib/ds/tokens.generated.ts`,
);
