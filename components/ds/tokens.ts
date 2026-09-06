import type { CSSProperties } from "react";
import {
  type AccentFamily,
  type Ramp,
  type StatusKey,
  type SubjectKey,
  accentRamp,
  subjectRamp,
} from "@/lib/ds/tokens.generated";

/**
 * How a component wears an accent.
 *
 * The ramp is projected onto a small group of CSS custom properties set inline
 * on the element; ds.module.css then reads `var(--ramp-default)` and friends.
 * One class set therefore renders in all 19 subject identities without a class
 * per subject, and without any component ever naming a colour.
 */
export function rampStyle(ramp: Ramp): CSSProperties {
  return {
    "--ramp-default": ramp.default,
    "--ramp-hover": ramp.hover,
    "--ramp-subtle": ramp.subtle,
    "--ramp-subtle-hover": ramp.subtleHover,
    "--ramp-focus": ramp.focus,
  } as CSSProperties;
}

/**
 * A game's accent is DERIVED from its subject, never chosen - see
 * docs/GAMESPEC.md. `accentOverride` exists only for a game with no subject,
 * and a spec that sets it is worth a second look.
 */
export function resolveRamp(opts: {
  subject?: SubjectKey;
  accentOverride?: AccentFamily;
}): Ramp {
  if (opts.accentOverride) return accentRamp(opts.accentOverride);
  if (opts.subject) return subjectRamp(opts.subject);
  return accentRamp("primary");
}

/** Status pills read their two colours from the DS Status group. */
export function statusStyle(key: StatusKey): CSSProperties {
  return {
    "--status-bg": `var(--status-${key}-default)`,
    "--status-on": `var(--status-${key}-on-color)`,
  } as CSSProperties;
}

export type { AccentFamily, Ramp, StatusKey, SubjectKey };
