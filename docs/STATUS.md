# STATUS

Append one entry per working session, dated that day. Never backdate. A logged
gap is fine; a fabricated date is not.

---

## 2026-09-05 — Planning

**Done**

- Read the training program repo (`training-ai-fde`), askpbot, and
  `pandai.question.uiux` for prior art and DS grounding.
- Four architectural decisions taken: internal content-team tool; separate repo
  with week write-ups linking to tagged releases; constrained GameSpec JSON with
  a deterministic renderer; Cloudflare Workers via OpenNext.
- Docs pack written: PROJECT, SCOPE, TECHNICAL-PLAN, GAMESPEC,
  AUTHORING-GUIDELINES, DESIGN-SYSTEM-SYNC, BUILD-GUIDE, this file.

**Built:** nothing. No code exists yet.

**Live blockers**

1. **Design-system publication is uncleared.** This repo will hold Pandai DS 1.5
   token values and two internal Figma file keys. The training program assumes
   anything committed is public. Needs a yes from someone at Pandai who can give
   one — or the tokens go behind a private submodule with redacted fixtures.
   *Blocks Phase 2, and blocks the first public push.*
2. **Language convention unconfirmed.** The program defaults to Python; this is
   TypeScript. Proposal to put to the teaching team: the eval harness and the
   token-sync scripts are the Python surface.
   *Does not block building. Blocks the first week write-up.*
3. **Repo-structure convention unconfirmed.** Week folders will carry write-ups
   linking to tagged releases here. Confirm that satisfies "submit is to push the
   work to this repo and share the link".
   *Does not block building.*
4. **API key source and billing owner undecided.**
   *Blocks Phase 4.*

**Assumed, not verified**

- Weeks 1–12 briefs are unpublished, so nothing here has been checked against an
  actual assignment. The scope check in PROJECT.md is against the program's
  stated rules only.
- The cost figures in TECHNICAL-PLAN.md are estimates from token counts, not
  measurements. No generation has been run.
- The askpbot build gotchas are carried over from that repo's CLAUDE.md and have
  not yet been re-hit here.

**Next:** Phase 0 — get blocker 1 answered. Then Phase 1.

---

## 2026-09-05 — Phase 1, all but the deploy

**Done**

- Scaffolded Next.js 16.3.4 / React 19.2.8 / TypeScript / Tailwind v4, merged
  into the repo without clobbering the docs pack.
- Installed `@anthropic-ai/sdk` 0.124.0, `zod` 4.5.4,
  `@opennextjs/cloudflare` 1.20.6, `wrangler` 4.129.0.
- Wired all four inherited build gotchas: `build` is
  `opennextjs-cloudflare build`, `open-next.config.ts` carries
  `buildCommand: "npm run build:next"`, `initOpenNextCloudflareForDev()` is
  guarded by `NODE_ENV === "development"`, and `.open-next/` + `.wrangler/` are
  in the ESLint ignore list.
- `wrangler.jsonc` written from OpenNext's own template. D1, KV, R2 and the
  incremental-cache bindings are deliberately deferred to the phases that need
  them, with comments saying which.
- `.env.example` committed, carrying the `.dev.vars` vs `.env.local` trap.
- Landing page replaced with a Phase-1 status page. No features, by design.
- **Two new gotchas found and fixed here**, now recorded in CLAUDE.md and
  TECHNICAL-PLAN.md: `next.config.ts` cannot be a top-level-await module
  (`ERR_REQUIRE_ASYNC_MODULE`, error names the compiled file not the line), and
  `npm run check` needs a prior build for the generated `LayoutProps` type.

**Verified, by running it**

- `npm run build` succeeds and emits `.open-next/worker.js`.
- `npm run check` (typecheck + lint) is clean, zero warnings.
- `npx wrangler dev --local` serves the page on real `workerd`: HTTP 200,
  `<title>gamerator</title>`, page content correct.

**Not done — Phase 1 is not complete**

- **`wrangler deploy` has not been run.** `wrangler whoami` reports not
  authenticated, and `wrangler login` needs a browser. Phase 1's exit criterion
  is a live `*.workers.dev` URL, so **Phase 1 stays open** until someone logs in
  and deploys. The deploy command itself is therefore unverified on this repo.
- No `.dev.vars` yet. Nothing needs a secret before Phase 4.

**Blockers** — 1, 2 and 3 from the previous entry stand unchanged. Blocker 4
(API key source and billing owner) is still open and still blocks Phase 4. New:

5. **Nobody is authenticated to Cloudflare.** Run `npx wrangler login`, then
   `npm run deploy`. *Blocks the close of Phase 1.*

**Next:** deploy, confirm the URL, then Phase 2 — which needs blocker 1 answered
first, since Phase 2 is where DS token values enter the repo.

---

## 2026-09-06 — Phase 1 closed

**Deployed.** https://gamerator.aidaasofiah.workers.dev/

Verified against the live URL, not assumed:

- HTTP 200, ~0.97s, 14,493 bytes — byte-identical to the local build.
- `<title>gamerator</title>` and all four page-content probes present.
- `x-opennext: 1`, `Server: cloudflare`, `CF-RAY` edge `SIN` (Singapore) — the
  right region for Malaysian users.

**Phase 1 exit criterion met.** A live `*.workers.dev` URL returns the page.
Blocker 5 (Cloudflare authentication) is closed. `npm run deploy` is now a
verified command and no longer carries the unverified marker in the README.

**New operational fact, worth deciding on rather than drifting into:** the Worker
is deployed under the **`aidaasofiah` Cloudflare account**, not Zul's. That
account is now where the deployment, the Worker secrets, the D1 database, the KV
namespace, the R2 bucket and the Cloudflare Access policy will all live — so it
also answers "who owns this in production" and half of blocker 4. If that is the
intended long-term home, nothing to do beyond writing it down here. If it was
just the account that happened to be logged in, move it before Phase 6 puts a
database in it — moving a Worker after it has bindings and data is materially
harder than moving it now.

**Blockers**

1. **Design-system publication is uncleared.** Unchanged, and now the immediate
   one — Phase 2 is where DS 1.5 token values and the two Figma file keys enter
   the repo. *Blocks Phase 2.*
2. Language convention unconfirmed with the teaching team. *Blocks the first
   week write-up, not the build.*
3. Repo-structure convention unconfirmed. *Blocks the first week write-up.*
4. API key source and billing owner. Partly answered by the deploy account
   above; the Anthropic side is still open. *Blocks Phase 4.*
6. **Cloudflare account ownership needs a decision**, per the note above.
   *Blocks nothing today; blocks cheaply only until Phase 6.*

**Next:** Phase 2 — the design system in code. Do not start it until blocker 1
has an answer from a person.
