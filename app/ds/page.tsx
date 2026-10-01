import Link from "next/link";
import { ProgressBar } from "@/components/ds";
import { docsFor } from "@/components/ds/docs";
import { StatusTag } from "@/components/ds-showcase/StatusTag";
import s from "@/components/ds-showcase/showcase.module.css";
import { DS_GROUPS, DS_INVENTORY, coverage, type DsEntry } from "@/lib/ds/inventory";

export const metadata = {
  title: "Pandai DS 1.5 - gamerator",
  description:
    "Pandai Design System 1.5, built component by component - every one live, and every one not built yet said so.",
};

/** The subject every preview on this page wears. Pink reads as "not the default green". */
const PREVIEW_SUBJECT = "chemistry" as const;

function Tile({ e }: { e: DsEntry }) {
  const docs = docsFor(e.slug);
  const story = docs?.stories[0];
  return (
    <article className={s.tile}>
      {story ? (
        // `inert`: a preview is a picture of the component. Its buttons must
        // not take focus or clicks - the whole tile is one link.
        <div
          className={`${s.tilePreview} ${story.stack ? s.tilePreviewStack : ""}`}
          inert
          aria-hidden="true"
        >
          {story.render({ subject: PREVIEW_SUBJECT })}
        </div>
      ) : (
        <div className={`${s.tilePreview} ${s.tilePlanned} type-c1`}>
          {e.figma}
        </div>
      )}
      <div className={s.tileBody}>
        <div className={s.tileTop}>
          <Link href={`/ds/components/${e.slug}`} className={`${s.tileLink} type-t4`}>
            {e.name}
          </Link>
          <StatusTag status={e.status} />
        </div>
        <p className={`${s.lede} type-b3`}>{e.summary}</p>
      </div>
    </article>
  );
}

export default function DsOverview() {
  const c = coverage();
  const done = c.built + c.partial;
  return (
    <>
      <header className={s.pageHead}>
        <span className={`${s.eyebrow} type-b1`}>Pandai Design System 1.5</span>
        <h1 className={`${s.title} type-h1`}>Built here, one component at a time</h1>
        <p className={`${s.lede} type-b3`}>
          The components a generated game is made of, read off the real Figma
          nodes and drawn only in DS tokens. Every component in the DS library
          is listed - the ones not built yet too, each saying what is missing.
          Colour, type, spacing and motion are under{" "}
          <Link href="/ds/foundations" style={{ color: "var(--text-primary-default)" }}>
            Foundations
          </Link>
          .
        </p>
      </header>

      <section className={s.section} aria-label="Coverage">
        <div className={s.stats}>
          <div className={s.stat}>
            <span className={s.statNumber}>{c.built}</span>
            <span className={`${s.caption} type-c1`}>built</span>
          </div>
          <div className={s.stat}>
            <span className={s.statNumber}>{c.partial}</span>
            <span className={`${s.caption} type-c1`}>partly built</span>
          </div>
          <div className={s.stat}>
            <span className={s.statNumber}>{c.planned}</span>
            <span className={`${s.caption} type-c1`}>not built yet</span>
          </div>
          <div className={s.stat}>
            <span className={s.statNumber}>{c.composed}</span>
            <span className={`${s.caption} type-c1`}>composed for games</span>
          </div>
        </div>
        <ProgressBar
          size="m"
          value={done}
          max={c.total}
          label={`${done} of ${c.total} DS components built or partly built`}
        />
        <span className={`${s.caption} type-c1`}>
          {done} of {c.total} DS 1.5 components have something built
        </span>
      </section>

      {DS_GROUPS.map((g) => {
        const items = DS_INVENTORY.filter((e) => e.group === g.key);
        if (!items.length) return null;
        return (
          <section key={g.key} className={s.section} aria-labelledby={`g-${g.key}`}>
            <h2 id={`g-${g.key}`} className={`${s.sectionTitle} type-t3`}>
              {g.label}
            </h2>
            <div className={s.grid}>
              {items.map((e) => (
                <Tile key={e.slug} e={e} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
