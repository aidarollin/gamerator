#!/usr/bin/env node
/**
 * Generates lib/spec/fixtures.generated.ts - a static import of every fixture.
 *
 *   node scripts/generate-fixture-index.mjs
 *
 * Why a generated barrel instead of reading the directory at request time:
 * **a Cloudflare Worker has no filesystem.** `readdirSync` works under
 * `next dev` and fails in the deployed Worker with
 * `ENOENT ... readdir '/bundle/lib/spec/fixtures'`. Static imports get bundled
 * at build time and work in both.
 *
 * Found the hard way on 2026-09-06, against `wrangler dev`, after the same code
 * passed happily in the dev server.
 */

import { readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "lib/spec/fixtures");

const names = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""))
  .sort();

const ident = (name) =>
  "f_" + name.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_");

const out = `/* GENERATED - do not hand-edit.
 * Regenerate: node scripts/generate-fixture-index.mjs (npm run fixtures)
 *
 * Static imports, not a directory read: a Cloudflare Worker has no filesystem,
 * so readdirSync works in dev and fails in production.
 */

${names.map((n) => `import ${ident(n)} from "./fixtures/${n}.json";`).join("\n")}

/** Raw, unvalidated fixture JSON. Callers must parse - that is the point. */
export const FIXTURES: Record<string, unknown> = {
${names.map((n) => `  "${n}": ${ident(n)},`).join("\n")}
};

export const FIXTURE_NAMES = [
${names.map((n) => `  "${n}",`).join("\n")}
] as const;
`;

writeFileSync(join(root, "lib/spec/fixtures.generated.ts"), out, "utf8");
console.log(`fixtures: ${names.length} bundled -> lib/spec/fixtures.generated.ts`);
