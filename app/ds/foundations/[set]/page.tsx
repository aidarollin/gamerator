import { notFound } from "next/navigation";
import { SemanticCard } from "@/components/ds-showcase/ColourCards";
import { ColourPageHead } from "@/components/ds-showcase/ColourPage";
import s from "@/components/ds-showcase/showcase.module.css";
import { SEMANTIC_SETS, semanticSet } from "@/lib/ds/colour-cards";

/** One page per semantic colour set - Surface, Text, Icon, Border, Subjects,
 *  Medals, Status, Accents - generated at build time. */
export function generateStaticParams() {
  return SEMANTIC_SETS.map((s) => ({ set: s.slug }));
}

export const dynamicParams = false;

export async function generateMetadata(props: PageProps<"/ds/foundations/[set]">) {
  const { set } = await props.params;
  const s = semanticSet(set);
  return {
    title: s ? `${s.title} - Pandai DS 1.5 - gamerator` : "Pandai DS 1.5 - gamerator",
    description: s ? `Pandai DS 1.5 ${s.title.toLowerCase()}, Light and Dark, as the DS documents them.` : undefined,
  };
}

export default async function SemanticColourPage(props: PageProps<"/ds/foundations/[set]">) {
  const { set } = await props.params;
  const data = semanticSet(set);
  if (!data) notFound();
  return (
    <>
      <ColourPageHead
        title={data.title}
        cards={data.cards}
        source={`Frame ${data.frame}, read 2026-10-02.`}
        lede={`${data.lede} Light is what this site renders; Dark is shown as the DS documents it, because this site has no dark theme yet.`}
      />
      <div className={s.cardStackGap}>
        {data.cards.map((c) => (
          <SemanticCard key={c.node} card={c} />
        ))}
      </div>
    </>
  );
}
