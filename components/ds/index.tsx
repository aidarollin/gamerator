/**
 * Pandai DS 1.5 components - one folder each, re-exported from here so every
 * page imports `@/components/ds` and never a path inside it.
 *
 * Each folder holds the component, its stylesheet (which names the Figma node
 * it was read from) and a `.docs.tsx` that the showcase at /ds renders. What
 * exists in the DS and what is built here: lib/ds/inventory.ts. How to add
 * one: docs/DESIGN-SYSTEM-COMPONENTS.md.
 *
 * No component may introduce a colour value - `npm run check:ds` enforces it.
 */
export { Button } from "./button/Button";
export { Card, CardStack } from "./card/Card";
export { Chip } from "./tag/Chip";
export { ProgressBar } from "./progress-bar/ProgressBar";
export { StatusPill } from "./status-pill/StatusPill";
export { Timer } from "./timer/Timer";
