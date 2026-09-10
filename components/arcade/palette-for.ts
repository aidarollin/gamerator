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
 * The DS token ramp: two families, both from the token layer.
 *
 * This is what any palette key without an arcade scene renders through, and now
 * also what `theme.skin: "pandai"` selects on purpose.
 *
 * IT GIVES THE SOLIDS AND THE SKY DIFFERENT FAMILIES, and that is the whole
 * lesson of `palettes.ts` applied here rather than only there. The first Pandai
 * skin was photographed and it was pink sky over pink pipes over a pink
 * ground - a single subject ramp painting everything, which is precisely the
 * "diagram of a game" that arcade scenes were invented to escape. The option
 * would have shipped as a feature that makes games worse.
 *
 * So: the SUBJECT ramp is the identity and paints what you hit, and PANDAI
 * PRIMARY GREEN paints the sky behind it. That is more on-brand rather than
 * less - the green is the Pandai green, and a chemistry game reads as pink
 * obstacles in a Pandai world instead of as a pink wash.
 *
 * Every value still comes from the generated token layer, so `check:ds` holds
 * and `palettes.ts` remains the only file outside it allowed to name a colour.
 */
function dsPalette(host: HTMLElement, spec: ArcadeSpec): Palette {
  const isSubject = (SUBJECT_KEYS as readonly string[]).includes(spec.theme.palette);
  const identity = isSubject
    ? subjectRamp(spec.theme.palette as (typeof SUBJECT_KEYS)[number])
    : accentRamp(spec.theme.palette as never);

  /**
   * The backdrop. Primary green unless the game's own identity IS primary, in
   * which case a sky and a solid drawn from the same ramp would collapse back
   * into one family - so that case falls back to the neutral page surfaces.
   */
  const brandIsIdentity = spec.theme.palette === "primary";
  const sky = brandIsIdentity
    ? {
        deep: "--surface-general-page-secondary",
        mid: "--surface-general-page-secondary",
        light: "--surface-general-page",
        edge: "--border-general-default",
      }
    : {
        deep: "--surface-primary-default-hover",
        mid: "--surface-primary-default",
        light: "--surface-primary-default-subtle-hover",
        edge: "--surface-primary-focus",
      };

  // The saturated end of each ramp, not the pale end. This one choice is most
  // of the difference between "a game" and "a component demo".
  return {
    deep: readToken(host, sky.deep),
    mid: readToken(host, sky.mid),
    light: readToken(host, sky.light),
    edge: readToken(host, sky.edge),
    ink: readToken(host, "--text-default-heading"),
    white: readToken(host, "--surface-general-default"),
    gold: readToken(host, "--status-coins-default"),
    danger: readToken(host, "--surface-warning-default"),
    solidDeep: readToken(host, identity.focus),
    solidMid: readToken(host, identity.default),
    solidEdge: readToken(host, identity.hover),
  };
}

/** `host` is any mounted element - the tokens are read off its computed style. */
export function paletteFor(host: HTMLElement, spec: ArcadeSpec): Palette {
  // `pandai` skips the arcade scene entirely and renders through the token
  // ramp - the same branch a palette key with no scene already takes, made
  // reachable on purpose. See `theme.skin` in lib/arcade/schema.ts.
  if (spec.theme.skin === "pandai") return dsPalette(host, spec);
  return sceneFor(spec.theme.palette, spec.theme.background) ?? dsPalette(host, spec);
}
