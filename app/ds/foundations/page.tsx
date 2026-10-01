import Link from "next/link";
import { SEMANTIC_SETS } from "@/lib/ds/colour-cards";
import s from "@/components/ds-showcase/showcase.module.css";
import { RADIUS, SPACING, TOKEN_VARS } from "@/lib/ds/tokens.generated";

export const metadata = {
  title: "Foundations - Pandai DS 1.5 - gamerator",
  description:
    "Every colour token, type role, spacing step, radius and motion token this site draws with.",
};

/**
 * Everything here is read from the generated token layer at render time - the
 * page lists what exists rather than what someone remembered to add. The two
 * hand-written lists (type roles, motion) name tokens only; their values come
 * from app/ds/pandai-app.css.
 */

const COLOUR_FAMILIES = [
  { key: "Surface", note: "Fills. A component's background comes from here.", open: true },
  { key: "Text", note: "Ink. Heading, body and caption for the default; on-color for text over a fill." },
  { key: "Border", note: "Strokes. Default, focus and the semantic families." },
  { key: "Icon", note: "Icon ink - a button's leading icon takes this family, not the label's." },
  { key: "Status", note: "The game-status colours the DS already ships: score, streak, lives, coins, ruby." },
  { key: "Subjects", note: "A subject's identity. A game's accent is derived from its subject.", open: true },
  { key: "Accents", note: "Decorative accents with their own on-color." },
] as const;

/** `Surface/primary/default` -> rows keyed `Surface/primary`, swatch `default`. */
function rows(family: string) {
  const out = new Map<string, { name: string; cssVar: string; path: string }[]>();
  for (const [path, cssVar] of Object.entries(TOKEN_VARS)) {
    const parts = path.split("/");
    if (parts[0] !== family) continue;
    const row = parts.slice(0, -1).join(" / ");
    const list = out.get(row) ?? [];
    list.push({ name: parts[parts.length - 1], cssVar, path });
    out.set(row, list);
  }
  return [...out.entries()];
}

const TYPE_ROLES = [
  ["h1", "Page title"], ["h2", "Section title"], ["h3", "Heading"], ["h4", "Heading"],
  ["t1", "Title"], ["t2", "Title"], ["t3", "Title"], ["t4", "Card title"], ["t5", "Title"],
  ["b1", "Button, emphasis"], ["b2", "Body"], ["b3", "Body"], ["b4", "Small, bold"],
  ["b5", "Small, semibold"], ["b6", "Small"], ["b7", "Tiny, semibold"], ["b8", "Tiny"],
  ["c1", "Caption"], ["c2", "Small caption"],
] as const;

const DURATIONS = ["--motion-fast", "--motion-base", "--motion-slow", "--motion-deck"];
const EASINGS = ["--ease-out", "--ease-spring", "--ease-deck"];

function Section({ id, title, note, children }: { id: string; title: string; note: string; children: React.ReactNode }) {
  return (
    <section className={s.section} aria-labelledby={id}>
      <div className={s.sectionHead}>
        <h2 id={id} className={`${s.sectionTitle} type-h4`}>{title}</h2>
        <p className={`${s.lede} type-b3`}>{note}</p>
      </div>
      {children}
    </section>
  );
}

export default function Foundations() {
  const colourCount = COLOUR_FAMILIES.reduce(
    (n, f) => n + rows(f.key).reduce((m, [, l]) => m + l.length, 0),
    0,
  );
  return (
    <>
      <header className={s.pageHead}>
        <span className={`${s.eyebrow} type-b1`}>Pandai Design System 1.5</span>
        <h1 className={`${s.title} type-h1`}>Foundations</h1>
        <p className={`${s.lede} type-b3`}>
          Colour, spacing and radius come from Figma (Semantic=Light,
          Product=Student). Poppins, the type roles and motion come from the
          Pandai product, which wins where the two disagree. Nothing on this page
          names a colour - each swatch is a CSS variable.
        </p>
      </header>

      <Section id="colour" title={`Colour (${colourCount})`} note="Grouped the way the DS names them. Hover a swatch for its variable.">
        <div className={s.cardIndex}>
          {[
            ["/ds/foundations/primitives", "Primitive colours"],
            ...SEMANTIC_SETS.map((c) => [`/ds/foundations/${c.slug}`, c.title]),
          ].map(([href, label]) => (
            <Link key={href} href={href} className={`${s.navLink} type-b1`} style={{ border: "var(--border-width-xs) solid var(--border-primary-default)", borderRadius: "var(--radius-pill)", color: "var(--text-primary-default)" }}>
              {label} &rarr;
            </Link>
          ))}
        </div>
        {COLOUR_FAMILIES.map((f) => {
          const r = rows(f.key);
          const open = "open" in f && f.open;
          return (
            <details key={f.key} open={open} className={s.story}>
              <summary className={s.storyHead} style={{ cursor: "pointer" }}>
                <span className={`${s.title} type-t4`}>
                  {f.key} <span className={`${s.caption} type-c1`}>{r.reduce((m, [, l]) => m + l.length, 0)} tokens</span>
                </span>
                <span className={`${s.caption} type-c1`}>{f.note}</span>
              </summary>
              <div className={s.storyCanvas} style={{ flexDirection: "column", alignItems: "stretch" }}>
                {r.map(([row, list]) => (
                  <div key={row} className={s.rampRow}>
                    <span className={`${s.mono} ${s.caption} type-c1`}>{row}</span>
                    <div className={s.swatches}>
                      {list.map((t) => (
                        <div key={t.path} className={s.swatch} title={`${t.path}  var(${t.cssVar})`}>
                          <span className={s.chipColour} style={{ background: `var(${t.cssVar})` }} />
                          <span className={`${s.swatchName} type-c2`}>{t.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </Section>

      <Section id="type" title="Type roles (19)" note="A role is a size, a line-height AND a weight. Use the class, or all three variables together - never one role's size with another's weight.">
        <div>
          {TYPE_ROLES.map(([role, use]) => (
            <div key={role} className={s.typeRow}>
              <span className={`${s.mono} ${s.caption} type-c1`}>
                .type-{role}
                <br />
                {use}
              </span>
              <span className={`type-${role}`}>Gamerator turns a sentence into a game</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="spacing" title="Spacing" note="Spacing/component. The house rule is 16: a card pads 16 on every side, and cards sit 16 apart.">
        <div style={{ display: "grid", gap: "var(--spacing-component-xs)" }}>
          {Object.entries(SPACING).map(([name, px]) => (
            <div key={name} className={s.scaleRow}>
              <span className={`${s.mono} ${s.caption} type-c1`} style={{ width: 160 }}>
                --spacing-component-{name}
              </span>
              <span className={s.scaleBar} style={{ width: px }} />
              <span className={`${s.caption} type-c1`}>{px}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="radius" title="Radius" note="Cards are 3xl (24). The Quiz Card is 2xl (18). Pills are full or pill.">
        <div className={s.swatches} style={{ gap: "var(--spacing-component-md)" }}>
          {Object.entries(RADIUS).map(([name, px]) => (
            <div key={name} className={s.swatch} style={{ justifyItems: "center" }}>
              <span className={s.radiusBox} style={{ borderRadius: `var(--radius-${name})` }} />
              <span className={`${s.swatchName} type-c1`}>{name} · {px}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="motion" title="Motion" note="Hover a track to play it. Durations run on --ease-out; easings run at --motion-slow.">
        <div style={{ display: "grid", gap: "var(--spacing-component-sm)", maxWidth: 520 }}>
          {DURATIONS.map((d) => (
            <div key={d} style={{ display: "grid", gap: "var(--spacing-component-3xs)" }}>
              <span className={`${s.mono} ${s.caption} type-c1`}>{d}</span>
              <div className={s.motionTrack}>
                <span className={s.motionBall} style={{ transition: `left var(${d}) var(--ease-out)` }} />
              </div>
            </div>
          ))}
          {EASINGS.map((e) => (
            <div key={e} style={{ display: "grid", gap: "var(--spacing-component-3xs)" }}>
              <span className={`${s.mono} ${s.caption} type-c1`}>{e}</span>
              <div className={s.motionTrack}>
                <span className={s.motionBall} style={{ transition: `left var(--motion-slow) var(${e})` }} />
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
