import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Cloudflare build output. These are generated and gitignored, but ESLint's
    // flat config does not read .gitignore. Without these, `npm run lint`
    // reports thousands of problems from minified vendor bundles and the
    // pre-commit gate becomes noise nobody reads.
    ".open-next/**",
    ".wrangler/**",
  ]),
]);

export default eslintConfig;
