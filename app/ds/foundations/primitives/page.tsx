import { PrimitiveCard } from "@/components/ds-showcase/ColourCards";
import { ColourPageHead } from "@/components/ds-showcase/ColourPage";
import s from "@/components/ds-showcase/showcase.module.css";
import { FIRST_SUBJECT_CARD, PRIMITIVE_CARDS } from "@/lib/ds/colour-cards";

export const metadata = {
  title: "Primitive colours - Pandai DS 1.5 - gamerator",
  description: "The 43 primitive colour ramps of Pandai DS 1.5, as the DS documents them.",
};

export default function PrimitivesPage() {
  const palettes = PRIMITIVE_CARDS.slice(0, FIRST_SUBJECT_CARD);
  const subjects = PRIMITIVE_CARDS.slice(FIRST_SUBJECT_CARD);
  return (
    <>
      <ColourPageHead
        title="Primitive colours"
        cards={PRIMITIVE_CARDS}
        source="Read from the DS file's colour cards on 2026-10-02; every printed hex matched its variable."
        lede={
          <>
            The raw ramps every semantic colour resolves to. Shown so you can see
            where a colour comes from - <strong>never used directly</strong>. A
            component asks for <code>Surface/primary/default</code>, which is
            OG-Green/500 today; if the DS repoints it, every component follows.
            That is why primitives have no CSS variable on this site.
          </>
        }
      />
      <section className={s.section} aria-labelledby="palettes">
        <h2 id="palettes" className={`${s.sectionTitle} type-h4`}>Palettes ({palettes.length})</h2>
        <div className={s.cardStackGap}>
          {palettes.map((c) => <PrimitiveCard key={c.node} card={c} />)}
        </div>
      </section>
      <section className={s.section} aria-labelledby="subjects">
        <h2 id="subjects" className={`${s.sectionTitle} type-h4`}>Subjects ({subjects.length})</h2>
        <div className={s.cardStackGap}>
          {subjects.map((c) => <PrimitiveCard key={c.node} card={c} />)}
        </div>
      </section>
    </>
  );
}
