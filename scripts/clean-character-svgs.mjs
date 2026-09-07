#!/usr/bin/env node
/**
 * Strips Figma export chrome from the PBot sprites.
 *
 * NOTE: `pbot.svg` keeps a dashed Figma frame rect. It is stroke-only and its
 * edges all fall outside the viewBox, so it draws nothing - left in place
 * rather than edit a Pandai asset further than the bug required.
 *
 *   node scripts/clean-character-svgs.mjs
 *
 * WHY THIS EXISTS. `pbot-dizzy.svg` was exported from an *error modal* in
 * Figma, and the export brought the modal with it: a full-bleed `#1A1A1A`
 * scrim at 50% and a red dialog border, both drawn behind the robot and both
 * covering the whole viewBox. So every time PBot was knocked out, he appeared
 * on a grey card. It shipped in the flyer's death frame for days and I misread
 * it as a particle burst until the duel put two characters side by side and
 * only one of them had a box.
 *
 * Others carry a dashed selection frame from the same source.
 *
 * WHAT IT DOES. Where a sprite has a `Pbot Illustration` group, everything
 * outside that group is dropped and the viewBox is kept. None of the wrapping
 * groups carry a transform - checked before writing this - so the artwork lands
 * exactly where it already did. Nothing about the illustration itself changes:
 * this removes chrome that was never meant to be in the file.
 *
 * It is a one-shot repair, not part of the build. Re-running it on cleaned
 * files is a no-op, which is what makes it safe to keep.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { globSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Find `<g id="NAME">` and its matching close tag, counting nesting. */
function extractGroup(svg, id) {
  const open = svg.indexOf(`<g id="${id}">`);
  if (open === -1) return null;
  let depth = 0;
  const re = /<g\b[^>]*>|<\/g>/g;
  re.lastIndex = open;
  let m;
  while ((m = re.exec(svg))) {
    if (m[0] === "</g>") {
      depth--;
      if (depth === 0) return svg.slice(open, m.index + 4);
    } else {
      depth++;
    }
  }
  return null;
}

const files = globSync("public/characters/pbot*.svg", { cwd: root });
let changed = 0;

for (const rel of files) {
  const path = join(root, rel);
  const svg = readFileSync(path, "utf8");
  const illustration = extractGroup(svg, "Pbot Illustration");
  if (!illustration) {
    console.log(`${basename(rel).padEnd(22)} no illustration group - left alone`);
    continue;
  }

  const head = svg.match(/<svg[^>]*>/);
  if (!head) {
    console.log(`${basename(rel).padEnd(22)} no <svg> tag - left alone`);
    continue;
  }

  const cleaned = `${head[0]}\n${illustration}\n</svg>\n`;
  if (cleaned.length >= svg.length) {
    console.log(`${basename(rel).padEnd(22)} already clean`);
    continue;
  }

  writeFileSync(path, cleaned, "utf8");
  changed++;
  const saved = Math.round((1 - cleaned.length / svg.length) * 100);
  // A 0% saving means the illustration group was already the whole file and
  // only the wrapper went. Saying "chrome removed" there would overstate it.
  console.log(
    `${basename(rel).padEnd(22)} ${saved > 0 ? `stripped ${saved}% of export chrome` : "unwrapped, nothing to strip"}`,
  );
}

console.log(`\n${changed} sprite(s) cleaned.`);
