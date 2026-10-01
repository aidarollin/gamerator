import Link from "next/link";
import { notFound } from "next/navigation";
import { docsFor } from "@/components/ds/docs";
import { StatusTag } from "@/components/ds-showcase/StatusTag";
import { StoryBoard } from "@/components/ds-showcase/StoryBoard";
import s from "@/components/ds-showcase/showcase.module.css";
import { DS_GROUPS, DS_INVENTORY, entryFor } from "@/lib/ds/inventory";

/** One page per inventory entry, built or not, generated at build time. */
export function generateStaticParams() {
  return DS_INVENTORY.map((e) => ({ slug: e.slug }));
}

export const dynamicParams = false;

export async function generateMetadata(props: PageProps<"/ds/components/[slug]">) {
  const { slug } = await props.params;
  const e = entryFor(slug);
  return {
    title: e ? `${e.name} - Pandai DS 1.5 - gamerator` : "Pandai DS 1.5 - gamerator",
    description: e?.summary,
  };
}

export default async function ComponentPage(props: PageProps<"/ds/components/[slug]">) {
  const { slug } = await props.params;
  const e = entryFor(slug);
  if (!e) notFound();
  const docs = docsFor(slug);
  const group = DS_GROUPS.find((g) => g.key === e.group)?.label;

  const i = DS_INVENTORY.indexOf(e);
  const prev = DS_INVENTORY[i - 1];
  const next = DS_INVENTORY[i + 1];

  return (
    <>
      <header className={s.pageHead}>
        <span className={`${s.eyebrow} type-b1`}>{group}</span>
        <div className={s.toolbar}>
          <h1 className={`${s.title} type-h1`}>{e.name}</h1>
          <StatusTag status={e.status} />
        </div>
        <p className={`${s.lede} type-b3`}>{e.summary}</p>
      </header>

      <dl className={`${s.facts} type-b3`}>
        <dt>Figma</dt>
        <dd>
          {e.figma ? (
            <span className={s.mono}>{e.figma}</span>
          ) : (
            "No DS node - composed here from DS tokens"
          )}
        </dd>
        {e.componentKey && (
          <>
            <dt>Component key</dt>
            <dd className={`${s.mono} type-c1`}>{e.componentKey}</dd>
          </>
        )}
        {e.source && (
          <>
            <dt>Known from</dt>
            <dd>{e.source}</dd>
          </>
        )}
        {e.exports && (
          <>
            <dt>Import</dt>
            <dd className={s.mono}>
              {`import { ${e.exports.join(", ")} } from "@/components/ds"`}
            </dd>
          </>
        )}
        <dt>In games</dt>
        <dd>{e.inGames}</dd>
      </dl>

      {e.missing && (
        <div className={`${s.callout} type-b3`} role="note">
          <strong className={`${s.calloutTitle} type-b1`}>
            {e.status === "planned" ? "Not built yet" : "Not built yet in full"}
          </strong>
          <span>{e.missing}</span>
          {e.status === "planned" && (
            <span>
              How to build it: read the node, write the component in its own
              folder under <span className={s.mono}>components/ds/</span>, give
              it a <span className={s.mono}>.docs.tsx</span>, and flip its status
              in <span className={s.mono}>lib/ds/inventory.ts</span>. The full
              recipe is <span className={s.mono}>docs/DESIGN-SYSTEM-COMPONENTS.md</span>.
            </span>
          )}
        </div>
      )}

      {docs && (
        <>
          <StoryBoard slug={slug} />

          <section className={s.section} aria-labelledby="spec">
            <h2 id="spec" className={`${s.sectionTitle} type-t3`}>
              {e.figma ? "Read off the Figma node" : "What it borrows"}
            </h2>
            <ul className={`${s.list} type-b3`}>
              {docs.spec.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <section className={s.section} aria-labelledby="usage">
            <h2 id="usage" className={`${s.sectionTitle} type-t3`}>Usage</h2>
            <pre className={s.code}>{docs.usage}</pre>
          </section>

          <section className={s.section} aria-labelledby="props">
            <h2 id="props" className={`${s.sectionTitle} type-t3`}>Props</h2>
            <div className={s.tableWrap}>
              <table className={`${s.table} type-b3`}>
                <thead>
                  <tr>
                    <th className="type-b5">Prop</th>
                    <th className="type-b5">Type</th>
                    <th className="type-b5">Default</th>
                    <th className="type-b5">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.props.map((p) => (
                    <tr key={p.name}>
                      <td><code>{p.name}</code></td>
                      <td><code>{p.type}</code></td>
                      <td>{p.default ? <code>{p.default}</code> : "-"}</td>
                      <td>{p.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <nav className={s.pager} aria-label="Next and previous component">
        {prev && (
          <Link href={`/ds/components/${prev.slug}`} className={s.pagerLink}>
            <span className={`${s.caption} type-c1`}>Previous</span>
            <span className="type-t5">{prev.name}</span>
          </Link>
        )}
        {next && (
          <Link href={`/ds/components/${next.slug}`} className={`${s.pagerLink} ${s.pagerNext}`}>
            <span className={`${s.caption} type-c1`}>Next</span>
            <span className="type-t5">{next.name}</span>
          </Link>
        )}
      </nav>
    </>
  );
}
