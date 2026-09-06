#!/usr/bin/env node
/**
 * Asserts that every DS token this app references actually exists.
 *
 *   node scripts/check-tokens.mjs
 *
 * Two failure modes, both invisible at runtime:
 *
 *   1. A dangling accent. `subjectRamp("bahasa-melayu")` when the DS key is
 *      "b-melayu" produces `var(--subjects-bahasa-melayu-default)`, which
 *      resolves to nothing. The element renders transparent and it reads as a
 *      broken component rather than a wrong string.
 *   2. A typo in any `var(--...)`. Same symptom, same wrong diagnosis.
 *
 * CSS has no error for an undefined custom property, so this check is the only
 * thing standing between a typo and a silent blank.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const css = readFileSync(join(root, "app/ds/tokens.css"), "utf8");
const generated = readFileSync(join(root, "lib/ds/tokens.generated.ts"), "utf8");

/** Every custom property the generated stylesheet actually defines. */
const defined = new Set(
  [...css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)].map((m) => m[1]),
);

/** Vars owned by the app rather than the DS - set inline by components. */
const LOCAL = new Set([
  "--ramp-default",
  "--ramp-hover",
  "--ramp-subtle",
  "--ramp-subtle-hover",
  "--ramp-focus",
  "--status-bg",
  "--status-on",
  "--background",
  "--foreground",
  "--color-background",
  "--color-foreground",
  "--font-sans",
  "--font-mono",
  "--font-geist-sans",
  "--font-geist-mono",
]);

const list = (name) => {
  const block = generated.match(
    new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const;`),
  );
  if (!block) throw new Error(`could not find ${name} in tokens.generated.ts`);
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
};

const errors = [];

// 1. Every subject and accent family resolves to a complete five-step ramp.
const RAMP = [
  "default",
  "default-hover",
  "default-subtle",
  "default-subtle-hover",
  "focus",
];
for (const subject of list("SUBJECT_KEYS")) {
  for (const step of RAMP) {
    const v = `--subjects-${subject}-${step}`;
    if (!defined.has(v)) errors.push(`SUBJECT_KEYS "${subject}" -> ${v} undefined`);
  }
}
for (const family of list("ACCENT_FAMILIES")) {
  for (const step of RAMP) {
    const v = `--surface-${family}-${step}`;
    if (!defined.has(v)) errors.push(`ACCENT_FAMILIES "${family}" -> ${v} undefined`);
  }
}
for (const status of list("STATUS_KEYS")) {
  for (const step of ["default", "focus", "on-color"]) {
    const v = `--status-${status}-${step}`;
    if (!defined.has(v)) errors.push(`STATUS_KEYS "${status}" -> ${v} undefined`);
  }
}

// 2. Every var(--...) referenced in app code is defined somewhere.
const EXT = [".ts", ".tsx", ".css"];
function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) {
      if (e === "node_modules" || e.startsWith(".")) continue;
      walk(full, out);
    } else if (EXT.some((x) => e.endsWith(x))) out.push(full);
  }
  return out;
}

const SKIP = new Set([join("app", "ds", "tokens.css")]);
for (const dir of ["app", "components", "lib"]) {
  for (const file of walk(join(root, dir))) {
    const rel = relative(root, file);
    if (SKIP.has(rel)) continue;
    const text = readFileSync(file, "utf8");
    text.split("\n").forEach((line, i) => {
      // Prose mentioning a var() reference is not a reference. Comment lines are
      // skipped rather than the pattern being narrowed, because narrowing would
      // start letting real dangling tokens through - the same trade as the
      // entity handling in check-ds.mjs.
      if (/^\s*(\*|\/\/|\/\*)/.test(line)) return;
      for (const m of line.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) {
        const v = m[1];
        // A template interpolation - `var(--status-${key}-default)` - is not a
        // token name, and the ramp checks above already cover every value the
        // interpolation can take. Skipping it is exhaustive, not a hole.
        if (line.slice(m.index + m[0].length).startsWith("$")) continue;
        if (defined.has(v) || LOCAL.has(v)) continue;
        errors.push(
          `${rel.split(sep).join("/")}:${i + 1}  var(${v}) is not defined`,
        );
      }
    });
  }
}

if (errors.length) {
  console.error(`check:tokens FAILED - ${errors.length} problem(s):\n`);
  errors.forEach((e) => console.error("  " + e));
  console.error(
    "\nEither the token name is wrong, or the DS group is not vendored yet\n" +
      "(see lib/ds/tokens.raw.json -> $meta.notVendoredYet). Do not define the\n" +
      "variable by hand - fix the name, or extend the sync.",
  );
  process.exit(1);
}

console.log(
  `check:tokens ok - ${defined.size} tokens defined, every reference resolves`,
);
