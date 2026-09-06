"use client";

import type { ArcadeSpec } from "@/lib/arcade/schema";
import { GameFrame } from "./GameFrame";
import { FACTORIES, HINTS } from "./engines";

/**
 * The one entry point into the arcade renderer.
 *
 * The prop is the PARSED `ArcadeSpec`, so an unvalidated object cannot reach an
 * engine without a type error - and the validation includes the playability
 * simulation, which means an impossible game cannot be rendered either.
 */
export function ArcadeGame({ spec }: { spec: ArcadeSpec }) {
  return (
    <GameFrame
      key={`${spec.engine}-${spec.meta.title}`}
      spec={spec}
      hint={HINTS[spec.engine]}
      factory={FACTORIES[spec.engine]}
    />
  );
}
