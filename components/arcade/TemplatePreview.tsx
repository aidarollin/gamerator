"use client";

import type { GameSpec } from "@/lib/spec/schema";
import { GameRenderer } from "@/components/game";
import s from "./gallery.module.css";

/**
 * A learning template on a gallery card.
 *
 * The arcade cards run the real engine on a small canvas; this runs the real
 * RENDERER, scaled. Same principle for the same reason - a preview drawn any
 * other way is a picture of a game that may not exist any more - but the
 * mechanism has to differ because these are DOM, not pixels.
 *
 * It is laid out at a fixed 360px, the same logical width the arcade world
 * uses, and then scaled to whatever the card is. That keeps the proportions
 * identical across every card regardless of how wide the grid happens to be,
 * and it means the type ramp inside is the one the DS actually specifies rather
 * than a set of sizes chosen to look right at 120px.
 *
 * WHAT IT IS NOT: readable. At a third of full size the question is four grey
 * lines and the options are four rounded boxes - which is the right amount. A
 * card has to be RECOGNISABLE, and "a question with four answers under it" is
 * recognisable at any size. The words are one tap away.
 */
export function TemplatePreview({ spec }: { spec: GameSpec }) {
  return (
    <span className={s.dom} aria-hidden>
      <span className={s.domInner}>
        <GameRenderer spec={spec} />
      </span>
    </span>
  );
}
