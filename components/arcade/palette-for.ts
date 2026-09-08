"use client";

import type { ArcadeSpec } from "@/lib/arcade/schema";
import { subjectRamp, accentRamp, SUBJECT_KEYS, VAR_VALUES } from "@/lib/ds/tokens.generated";
import { sceneFor } from "@/lib/arcade/palettes";
import type { Palette } from "./paint";

/**
 * Turning `theme.palette` into actual colour.
 *
 * Extracted from `GameFrame` when the gallery needed the same answer: a preview
 * painting a different palette from the game it previews is a preview that
 * lies, and the copy that would have caused it is exactly the kind that drifts
 * quietly for months. One function, two callers.
 *
 * The order is the one Zul settled on: the game's own SCENE first, the design
 * system as the backup.
 */

function readToken(el: HTMLElement, cssVar: string) {
  const name = cssVar.startsWith("var(")
    ? cssVar.slice(4, -1).split(",")[0].trim()
    : cssVar;
  return getComputedStyle(el).getPropertyValue(name).trim() || VAR_VALUES[name] || "transparent";
}

/**
 * The DS token ramp, used when no arcade scene matches.
 *
 * Not dead code kept for sentiment - it is what any palette key without a scene
 * renders through, which is what happens the day the DS gains a subject and
 * `palettes.ts` has not caught up. A new subject then looks a little flat
 * instead of throwing.
 */
function dsPalette(host: HTMLElement, spec: ArcadeSpec): Palette {
  const isSubject = (SUBJECT_KEYS as readonly string[]).includes(spec.theme.palette);
  const ramp = isSubject
    ? subjectRamp(spec.theme.palette as (typeof SUBJECT_KEYS)[number])
    : accentRamp(spec.theme.palette as never);

  // The saturated end of the ramp, not the pale end. This one choice is most of
  // the difference between "a game" and "a component demo".
  return {
    deep: readToken(host, ramp.focus),
    mid: readToken(host, ramp.default),
    light: readToken(host, ramp.subtleHover),
    edge: readToken(host, ramp.hover),
    ink: readToken(host, "--text-default-heading"),
    white: readToken(host, "--surface-general-default"),
    gold: readToken(host, "--status-coins-default"),
    danger: readToken(host, "--surface-warning-default"),
  };
}

/** `host` is any mounted element - the tokens are read off its computed style. */
export function paletteFor(host: HTMLElement, spec: ArcadeSpec): Palette {
  return sceneFor(spec.theme.palette, spec.theme.background) ?? dsPalette(host, spec);
}
