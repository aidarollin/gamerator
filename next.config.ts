import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

/**
 * The Cloudflare adapter's scaffold emits this call unguarded, and Next loads
 * this file for `next build` as well as `next dev`. Unguarded, every build
 * spawns a `workerd` that outlives it and holds `.open-next` open; the next
 * build then dies with `EPERM ... rm .open-next`, which reads like a
 * permissions problem and is a leaked child process.
 *
 * The NODE_ENV check is load-bearing. Do not remove it.
 *
 * Do not `await` this call, and do not reach for a dynamic `await import()`
 * either - both make this module top-level-await, and Next 16 loads the
 * compiled config with `require()`, which fails on an async module with
 * ERR_REQUIRE_ASYNC_MODULE. The error names next.config.compiled.js and does
 * not mention this line.
 *
 * Note the same EPERM also appears for a mundane reason: a running `npm run dev`
 * legitimately holds `workerd` open. Stop the dev server before `npm run build`.
 */
if (process.env.NODE_ENV === "development") {
  void initOpenNextCloudflareForDev();
}
