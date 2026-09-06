import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * `buildCommand` is load-bearing, and it is a pair with the `build:next` script
 * in package.json.
 *
 * `opennextjs-cloudflare build` produces the Next output by shelling out to the
 * package manager's `build` script - which is itself. Without this override,
 * `npm run build` recurses into itself until Node dies with a stack overflow.
 * Change the script name and you must change this, or the reverse.
 *
 * `defineCloudflareConfig()` does not accept the option, so we spread its result
 * and set `buildCommand` alongside.
 */
const config = {
  ...defineCloudflareConfig(),
  buildCommand: "npm run build:next",
};

export default config;
