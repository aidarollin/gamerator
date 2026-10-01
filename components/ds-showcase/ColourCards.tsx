import { cardLabel, displayHex } from "@/lib/ds/colour";
import type { ColourCard } from "@/lib/ds/colour-cards";
import {
  DARK_VALUES,
  PRIMITIVE_HSLA,
  PRIMITIVES,
  TOKEN_VARS,
  VAR_VALUES,
  type TokenPath,
} from "@/lib/ds/tokens.generated";
import { RenderedHere } from "./RenderedHere";
import s from "./showcase.module.css";

/**
 * The DS 1.5 colour cards, drawn from the Figma frames on the "🎨 Colors"
 * page - the primitive card (1898:12523 and its 42 siblings) and the semantic
 * card (3371:1926 and friends). Geometry and type follow get_design_context,
 * mapped to DS tokens and type roles and scaled from Figma's 1320px doc canvas
 * to this page.
 *
 * Every value comes from the generated layer; this file names no colour.
 */

/** `Pink Secondary` -> `pink-secondary`, for in-page links. */
export const cardId = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export function PrimitiveCard({ card }: { card: ColourCard }) {
  return (
    <section id={cardId(card.title)} className={s.colourCard} aria-labelledby={`${cardId(card.title)}-t`}>
      <h2 id={`${cardId(card.title)}-t`} className={`${s.colourTitle} type-h2`}>
        {card.title}
      </h2>
      <ul className={s.colourRows}>
        {card.tokens.map((t) => (
          <li key={t} className={s.primRow}>
            <span className={s.dotSwatch} style={{ background: PRIMITIVES[t] }} aria-hidden="true" />
            <span className={`${s.primName} type-t4`}>{cardLabel(t)}</span>
            <span className={`${s.primCode} type-b3`}>
              {displayHex(PRIMITIVES[t])} {PRIMITIVE_HSLA[t]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The Light / Dark pills, coloured as Figma colours them - each in its own mode. */
function ModePills() {
  return (
    <div className={s.modeCols} aria-hidden="true">
      <span
        className={`${s.modePill} type-t2`}
        style={{ background: "var(--surface-primary-default-subtle)", color: "var(--text-primary-default-hover)" }}
      >
        Light Mode
      </span>
      <span
        className={`${s.modePill} type-t2`}
        style={{
          background: DARK_VALUES["Surface/primary/default-subtle"],
          color: DARK_VALUES["Text/primary/on-color"],
        }}
      >
        Dark Mode
      </span>
    </div>
  );
}

function ValueCell({ value, mode }: { value: string; mode: string }) {
  return (
    <span className={s.semCell}>
      <span className={s.dotSwatch} style={{ background: value }} aria-hidden="true" />
      <span className={`${s.semHex} type-b2`}>
        <span className="sr-only">{mode} </span>
        {displayHex(value)}
      </span>
    </span>
  );
}

export function SemanticCard({ card }: { card: ColourCard }) {
  return (
    <section id={cardId(card.title)} className={s.colourCard} aria-labelledby={`${cardId(card.title)}-t`}>
      <div className={s.semRow}>
        <h2 id={`${cardId(card.title)}-t`} className={`${s.colourTitle} ${s.semTitle} type-h2`}>
          {card.title}
        </h2>
        <ModePills />
      </div>
      <ul className={s.colourRows}>
        {card.tokens.map((t) => {
          const cssVar = TOKEN_VARS[t as TokenPath];
          const light = VAR_VALUES[cssVar];
          return (
            <li key={t} className={s.semRow}>
              <span className={`${s.semName} type-t5`}>
                {t}
                <RenderedHere cssVar={cssVar} figma={light} />
              </span>
              <ValueCell value={light} mode="Light" />
              <ValueCell value={DARK_VALUES[t]} mode="Dark" />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
