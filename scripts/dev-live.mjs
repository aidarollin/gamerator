#!/usr/bin/env node
/**
 * `npm run dev:live` - the dev server with the PAID model switched on.
 *
 *   npm run dev        free. Physics derived from your words in code.
 *   npm run dev:live   real generation, real money.
 *
 * A separate command rather than a line in `.env.local`, so going live is a
 * deliberate act every time. Put `GAMERATOR_PROVIDER=live` in the env file and
 * every future `npm run dev` quietly starts billing - including one started
 * months later by someone who has forgotten, which is exactly the shape of
 * accident `lib/arcade/guard.ts` exists to bound.
 *
 * Dependency-free on purpose: `cross-env` would work, but a devDependency for
 * one environment variable is a poor trade, and `FOO=bar next dev` in a package
 * script does not run on Windows.
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Fail loudly and early rather than starting a server that 500s on the first
// generation with an auth error nobody reads.
const envFile = join(root, ".env.local");
const env = existsSync(envFile) ? readFileSync(envFile, "utf8") : "";
if (!/^ANTHROPIC_API_KEY=\S+/m.test(env)) {
  console.error(
    "\n  No ANTHROPIC_API_KEY in .env.local.\n" +
      "  Live generation needs one. `npm run dev` works without it.\n",
  );
  process.exit(1);
}

const port = process.argv[2] ?? "3000";
console.log(
  `\n  Live generation ON - this spends real money.\n` +
    `  Guards: see lib/arcade/guard.ts. Identical prompts are cached and cost nothing.\n` +
    `  http://localhost:${port}/create\n`,
);

/**
 * Next's own JS entry point, run with this Node - not `npx`.
 *
 * Spawning `npx.cmd` throws `EINVAL` on Node 20 and later, which blocks
 * launching a `.cmd` without a shell for security reasons; passing
 * `shell: true` would work and would also mean the port argument goes through a
 * command-line parser. Running the JS file directly avoids both.
 */
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");
if (!existsSync(nextBin)) {
  console.error("\n  next is not installed. Run `npm install` first.\n");
  process.exit(1);
}

const child = spawn(process.execPath, [nextBin, "dev", "--port", port], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, GAMERATOR_PROVIDER: "live" },
});

child.on("exit", (code) => process.exit(code ?? 0));
