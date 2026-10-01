# DESIGN-SYSTEM-COMPONENTS — building Pandai DS 1.5 one component at a time

The components a generated game is made of, built here from the real Figma
nodes and shown at **`/ds`**. Tokens (colour, type, spacing, motion) are a
separate job: [DESIGN-SYSTEM-SYNC.md](DESIGN-SYSTEM-SYNC.md).

## The four places a component lives

| Path | What |
| --- | --- |
| `lib/ds/inventory.ts` | **Every DS 1.5 component**, built or not, and its state: `built`, `partial` or `planned` |
| `components/ds/<slug>/` | The component, its `.module.css` (naming the Figma node it was read from) and its `.docs.tsx` |
| `components/ds/docs.ts` | The list of every `.docs.tsx` the showcase renders |
| `components/ds/index.tsx` | The public import: `import { Button } from "@/components/ds"` |

The showcase is `components/ds-showcase/` plus `app/ds/`:

| Route | Shows |
| --- | --- |
| `/ds` | Coverage, then every inventory entry as a tile. A built one previews its first story, live |
| `/ds/foundations` | Every colour token by family, the 19 type roles, spacing, radius, motion |
| `/ds/components/<slug>` | One component: Figma name and key, where it appears in games, stories with a subject picker, the spec, usage, props. A planned one gets a page too, saying what is missing |

## Where the inventory came from

Figma MCP `search_design_system` on the DS file `TLVKe3bgJTdVvuPAzgDq2f`, held
to the "Pandai Design System 1.5" library (match on `libraryName`, see
DESIGN-SYSTEM-SYNC.md), on 2026-10-02. Two limits shaped it:

- `get_metadata` on the file lists only the **📖 Cover** page, so the pages
  cannot be walked from here.
- The search returns **20 results per query, one query per call** (a batch of
  seven was clamped to one). The first query, `"1.5"`, returned 20 component
  sets. Six more by name, for components the product repo mentions, found Tag,
  Quiz Card, Progress Donut, Icon Badge and Number Badge, and turned up
  Skeleton, Status Modal Alerts, Progress Half Donut and Date Picker Cell -
  Parts alongside. The sixth, Progress Bar Value, found nothing.

So the list is **what was found, not proof nothing else exists**. Two entries
were not returned by any search and say where they are named instead: Progress
Bar Value (product repo, node `11091:41`) and Spinner (the Skeleton
description). Confirm both before building them.

## Adding a component

1. **Read the node.** Figma MCP `get_design_context` on the variant you need,
   in the DS file. Write down height, padding, gap, radius, stroke and every
   fill **as token names**, not values. Check `pandai.question.uiux/docs/
   DESIGN-SYSTEM.md` first; several nodes (Radio Field, Input Field, Link, the
   badges) were already measured there, with traps recorded.
2. **Make the folder** `components/ds/<slug>/`, slug matching the inventory:
   - `<Name>.tsx` - the component. Accent-capable components take `Accented`
     from `../cx` and set the ramp with `rampStyle(resolveRamp(...))`.
   - `<slug>.module.css` - tokens only. The header comment names the Figma node
     and lists what was read off it. Anything not read off a node says so.
   - `<Name>.docs.tsx` - a `ComponentDocs` (`components/ds/story.ts`): the spec
     lines, a usage snippet, the props table and the stories. A story gets the
     picked subject as `({ subject })`; set `accented: true` to show the picker.
3. **Export it** from `components/ds/index.tsx`, and add its docs to
   `components/ds/docs.ts`.
4. **Change its inventory entry**: `status` to `built` or `partial`, `exports` to
   what you exported, and for `partial` say in `missing` which variants are not
   read yet.
5. `npm run check`. `lib/ds/inventory.test.ts` fails if docs and inventory
   disagree in either direction, if a built entry names an export that does not
   exist, or if a non-built entry does not say what is missing.
6. **Look at it**: `/ds/components/<slug>` at desktop and phone width, with
   two or three subjects picked. See [SCREENSHOTS.md](SCREENSHOTS.md).

## Rules

- **No colour values.** `npm run check:ds` fails on a hex or `rgb()` anywhere
  outside the generated token layer and `lib/arcade/palettes.ts`.
- **Type is a role**: a `.type-*` class, never a role's size with another's
  weight.
- **A partial component is labelled partial**, on its page and in the sidebar.
  Size M of Button looks finished and is not DS-exact; saying so is the point.
- **A preview tile is `inert`.** The whole tile is a link, so the buttons in a
  preview must not take focus or clicks.
- **The game uses the same component the showcase shows.** Never a copy made for
  the showcase; a story renders the real export.
