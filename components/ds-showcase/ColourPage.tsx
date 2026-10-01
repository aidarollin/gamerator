import Link from "next/link";
import type { ColourCard } from "@/lib/ds/colour-cards";
import { cardId } from "./ColourCards";
import s from "./showcase.module.css";

/** The header and card index every colour page shares. */
export function ColourPageHead({
  title,
  lede,
  source,
  cards,
}: {
  title: string;
  lede: React.ReactNode;
  source: string;
  cards: ColourCard[];
}) {
  const tokens = cards.reduce((n, c) => n + c.tokens.length, 0);
  return (
    <header className={s.pageHead}>
      <span className={`${s.eyebrow} type-b1`}>
        <Link href="/ds/foundations" style={{ color: "inherit", textDecoration: "none" }}>
          Foundations
        </Link>{" "}
        / Colour
      </span>
      <h1 className={`${s.title} type-h1`}>{title}</h1>
      <p className={`${s.lede} type-b3`}>{lede}</p>
      <p className={`${s.caption} type-c1`}>
        {cards.length} {cards.length === 1 ? "card" : "cards"}, {tokens} tokens. {source}
      </p>
      {cards.length > 1 && (
      <nav className={s.cardIndex} aria-label="Cards on this page">
        {cards.map((c) => (
          <a key={c.node} href={`#${cardId(c.title)}`} className={`${s.navLink} type-b3`} style={{ border: "var(--border-width-xs) solid var(--border-general-default)", borderRadius: "var(--radius-pill)" }}>
            {c.title}
          </a>
        ))}
      </nav>
      )}
    </header>
  );
}
