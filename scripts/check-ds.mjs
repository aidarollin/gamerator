#!/usr/bin/env node
/**
 * Fails if a colour value appears anywhere outside the generated token layer.
 *
 *   node scripts/check-ds.mjs
 *
 * This is what makes NFR4 ("DS fidelity by construction") a property of the
 * build rather than a line in a review checklist. A hex literal in a component
 * is how every design system starts drifting, and it never arrives announced -
 * it arrives as "just this one shade, just for now".
 *
 * Allowed to contain colour values:
 *   lib/ds/tokens.raw.json     the extraction from Figma
 *   app/ds/tokens.css          generated from it
 *   lib/ds/tokens.generated.ts generated from it
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const SCAN_DIRS = ["app", "lib", "components", "scripts"];
const SCAN_EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"];
const ALLOW = new Set([
  join("lib", "ds", "tokens.raw.json"),
  join("app", "ds", "tokens.css"),
  join("lib", "ds", "tokens.generated.ts"),
  join("scripts", "check-ds.mjs"),
  join("scripts", "generate-tokens.mjs"),
  join("scripts", "figma-token-resolver.js"),
]);

// #abc, #aabbcc, #aabbccdd - plus the functional colour notations, which are
// the obvious way around a hex-only check.
const PATTERNS = [
  /#[0-9a-fA-F]{3,8}\b/g,
  /\brgba?\s*\(/g,
  /\bhsla?\s*\(/g,
  /\boklch\s*\(/g,
];

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
    } else if (SCAN_EXT.some((x) => e.endsWith(x))) {
      out.push(full);
    }
  }
  return out;
}

const findings = [];
for (const dir of SCAN_DIRS) {
  for (const file of walk(join(root, dir))) {
    const rel = relative(root, file);
    if (ALLOW.has(rel)) continue;
    const text = readFileSync(file, "utf8");
    text.split("\n").forEach((line, i) => {
      // A URL fragment or a git sha is not a colour.
      if (/^\s*(\/\/|\*|#)/.test(line) && !line.includes("#")) return;
      for (const re of PATTERNS) {
        re.lastIndex = 0;
        const m = re.exec(line);
        if (m) {
          findings.push(
            `${rel.split(sep).join("/")}:${i + 1}  ${m[0]}  ${line.trim().slice(0, 80)}`,
          );
          break;
        }
      }
    });
  }
}

if (findings.length) {
  console.error(
    `check:ds FAILED - ${findings.length} colour value(s) outside the generated token layer:\n`,
  );
  findings.forEach((f) => console.error("  " + f));
  console.error(
    "\nDrive colour from a DS token instead: token(\"Surface/primary/default\")\n" +
      "or var(--surface-primary-default). If the DS genuinely lacks the value,\n" +
      "add it in Figma and re-run the sync - do not hand-pick one here.",
  );
  process.exit(1);
}

console.log("check:ds ok - no colour values outside the generated token layer");
