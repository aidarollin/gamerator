#!/usr/bin/env node
/**
 * Generates the two fixture barrels - a static import of every fixture:
 *
 *   lib/spec/fixtures.generated.ts   the legacy learning templates
 *   lib/arcade/fixtures.ts           the arcade specs
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
 *
 * The arcade barrel was added on 2026-09-07. It had been hand-written the whole
 * time while carrying this file's "GENERATED - do not hand-edit. Regenerate:
 * npm run fixtures" header, and that command did nothing to it. Adding an
 * arcade fixture therefore looked like one command and was actually a silent
 * no-op followed by a confusing 404.
 */

import { readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const listNames = (rel) =>
  readdirSync(join(root, rel))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();

const ident = (name) => "f_" + name.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_");

const NL = "\n";
const header = `/* GENERATED - do not hand-edit.
 * Regenerate: node scripts/generate-fixture-index.mjs (npm run fixtures)
 *
 * Static imports, not a directory read: a Cloudflare Worker has no filesystem,
 * so readdirSync works in dev and fails in production.
 */
`;

/* ------------------------------------------------------------------ legacy */

const names = listNames("lib/spec/fixtures");

const out = [
  header,
  names.map((n) => `import ${ident(n)} from "./fixtures/${n}.json";`).join(NL),
  "",
  "/** Raw, unvalidated fixture JSON. Callers must parse - that is the point. */",
  "export const FIXTURES: Record<string, unknown> = {",
  names.map((n) => `  "${n}": ${ident(n)},`).join(NL),
  "};",
  "",
  "export const FIXTURE_NAMES = [",
  names.map((n) => `  "${n}",`).join(NL),
  "] as const;",
  "",
].join(NL);

writeFileSync(join(root, "lib/spec/fixtures.generated.ts"), out, "utf8");
console.log(`fixtures: ${names.length} bundled -> lib/spec/fixtures.generated.ts`);

/* ------------------------------------------------------------------ arcade */

/**
 * `ARCADE_ACCEPTED` is derived from the filename rather than listed by hand.
 * `.invalid`, `.unplayable` and `.trivial` exist to BE REJECTED, and every
 * other fixture must parse; keeping that as a second hand-maintained list was
 * one more thing to forget when adding a fixture.
 */
const arcade = listNames("lib/arcade/fixtures");
const rejected = /\.(invalid|unplayable|trivial)$/;
const accepted = arcade.filter((n) => !rejected.test(n));

const arcadeOut = [
  header,
  arcade.map((n) => `import ${ident(n)} from "./fixtures/${n}.json";`).join(NL),
  "",
  "/** Raw, unvalidated fixture JSON. Callers must parse - that is the point. */",
  "export const ARCADE_FIXTURES: Record<string, unknown> = {",
  arcade.map((n) => `  "${n}": ${ident(n)},`).join(NL),
  "};",
  "",
  "export const ARCADE_FIXTURE_NAMES = Object.keys(ARCADE_FIXTURES);",
  "",
  "/**",
  " * Fixtures the schema must ACCEPT. Everything else must be rejected.",
  " * Derived from the filename: .invalid, .unplayable and .trivial exist to fail.",
  " */",
  "export const ARCADE_ACCEPTED = [",
  accepted.map((n) => `  "${n}",`).join(NL),
  "];",
  "",
  "export function readArcadeFixture(name: string): unknown {",
  "  const f = ARCADE_FIXTURES[name];",
  "  if (f === undefined) throw new Error(`no such arcade fixture: ${name}`);",
  "  return f;",
  "}",
  "",
].join(NL);

writeFileSync(join(root, "lib/arcade/fixtures.ts"), arcadeOut, "utf8");
console.log(`fixtures: ${arcade.length} bundled -> lib/arcade/fixtures.ts`);
