# Syncing DS tokens from Figma

Two halves, deliberately separate:

| Half | What | Who runs it |
| --- | --- | --- |
| **Fetch** | Read Pandai DS 1.5 variables out of Figma | An agent, via Figma MCP |
| **Generate** | Turn the extraction into CSS and TypeScript | `node scripts/generate-tokens.mjs` |

The split exists because **Figma MCP cannot be called from Node.** It is
per-seat authenticated and shaped as an agent tool, so there is no
`sync-tokens.mjs` that does the whole job — writing one would be writing a
command nobody can run. The fetch is a documented procedure; the generate half
is a real script that anyone can run and whose output is diffable in review.

## Fetch

1. **Run `whoami` first.** It is exempt from rate limits and prints your plans
   and seats. The DS lives in **Pandai Workspace v2 (pro)**; a Full or Dev seat
   there gets 200 calls/day and 10/min — not the 20-a-month starter allowance.
   Confirm before rationing reads.
2. **Confirm the file key: `TLVKe3bgJTdVvuPAzgDq2f`** — Pandai Design System 1.5.
   Not `hkyIerTAdwtaN3edlp3iz8`, which is Screens. The DS file was renamed once
   ("[WEB] Pandai Design System 1.5" → "Pandai Design System 1.5"); a rename does
   not change the key, so the key is what to trust.
3. **Run [`figma-token-resolver.js`](figma-token-resolver.js) via `use_figma`**
   against that file key. Load the `/figma-use` skill first — it is a mandatory
   prerequisite and skipping it causes hard-to-debug failures.
4. **Paste the returned `color` and `dimension` objects into
   [`lib/ds/tokens.raw.json`](../lib/ds/tokens.raw.json)**, and update
   `$meta.extractedAt`.

## Generate

```bash
node scripts/generate-tokens.mjs   # or: npm run tokens
npm run check:ds                   # fails if any colour escaped the token layer
```

Writes `app/ds/tokens.css` and `lib/ds/tokens.generated.ts`. Both carry a
GENERATED header. **Never hand-edit either one** — the next sync overwrites it,
and a hand-edit is invisible until it silently disappears.

## The rule that governs every lookup

**Pin a mode per collection.** The chain is
`Semantic (Light|Dark) → Product (Student|Teacher|Parent) → Primitives (Value)`,
and every level has its own modes. Reading each collection's *default* mode
mixes levels — a Light semantic resolving through whatever Product's default is
— and nothing in the output tells you it happened. This build pins
**Semantic=Light, Product=Student**.

That is the accurate form of the older "resolve everything in Student mode"
rule. Student is a **Product** mode; Semantic has no Student mode at all.

## Commit the sync on its own

A token change mixed into a feature commit is a token change nobody reviewed.
Re-run the sync when the DS moves, and commit the diff by itself.

## What this build does not vendor

Recorded in `lib/ds/tokens.raw.json` → `$meta.notVendoredYet`:

- **Dark mode** of every Semantic token
- **Teacher and Parent** modes of every Product token
- `Semantic/JDP` (20), `Responsives/*` (70), `Typography/*` (57)

Add a group when a component needs it, not before. Vendoring a token nothing
reads means carrying a value that can drift with nothing to catch it.
