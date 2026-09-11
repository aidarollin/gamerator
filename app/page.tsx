import Link from "next/link";
import { Card } from "@/components/ds";
import { ENGINES } from "@/lib/arcade/schema";

/**
 * The front door.
 *
 * This was the Phase 1 skeleton for far too long - a build plan, a list of ten
 * phases, the words "it has no features and is not supposed to", and a
 * description of the learning-game product this stopped being on 2026-09-06. It
 * linked to nothing, so anyone arriving at the root saw a status report and a
 * dead end while the whole product sat one URL away.
 *
 * A landing page's job is to say what the thing is and let you into it. The
 * build plan belongs in docs/, which is where it now lives alone.
 */

export const metadata = {
  title: "gamerator - Pandai arcade games from a description",
  description:
    "Describe a game and get a playable one, wearing the real Pandai mascots and design system.",
};

const heading = { color: "var(--text-default-heading)" };
const body = {
  fontSize: "var(--type-b3)",
  lineHeight: "var(--type-b3-lh)",
  color: "var(--text-default-body)",
};

const DOORS = [
  {
    href: "/create",
    title: "Make a game",
    blurb:
      "Describe what you want - \"a hard flappy bird with PBot through pink pipes\" - and play the result. Free: the physics are derived from your words in code.",
    cta: "Start here",
  },
  {
    href: "/play/arcade",
    title: "Play the samples",
    blurb:
      "Thirty-two hand-written specs across all ten engines, including the ones the playability simulation rejects and why.",
    cta: "Browse",
  },
  {
    href: "/ds",
    title: "Design system",
    blurb:
      "The Pandai DS 1.5 layer this is built on - 366 tokens and the primitives, generated from Figma rather than transcribed.",
    cta: "Inspect",
  },
] as const;

export default function Home() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "var(--spacing-component-md)",
        display: "grid",
        gap: "var(--spacing-component-lg)",
      }}
    >
      <header style={{ display: "grid", gap: "var(--spacing-component-xs)" }}>
        <h1 style={{ ...heading, fontSize: "var(--type-h1)", lineHeight: "var(--type-h1-lh)", fontWeight: 700 }}>
          gamerator
        </h1>
        <p style={body}>
          Describe an arcade game and get a playable one, wearing the real Pandai
          mascots and the real design system - with an export a Pandai engineer
          can drop straight into the site.
        </p>
      </header>

      <nav style={{ display: "grid", gap: "var(--spacing-component-sm)" }}>
        {DOORS.map((d) => (
          <Link key={d.href} href={d.href} style={{ textDecoration: "none" }}>
            <Card>
              <div style={{ display: "grid", gap: "var(--spacing-component-3xs)" }}>
                <span style={{ ...heading, fontSize: "var(--type-t2)", lineHeight: "var(--type-t2-lh)", fontWeight: 600 }}>
                  {d.title}
                </span>
                <span style={body}>{d.blurb}</span>
                <span
                  style={{
                    ...body,
                    marginTop: "var(--spacing-component-2xs)",
                    fontWeight: 600,
                    color: "var(--text-primary-default)",
                  }}
                >
                  {d.cta} &rarr;
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </nav>

      <section style={{ display: "grid", gap: "var(--spacing-component-xs)" }}>
        <h2 style={{ ...heading, fontSize: "var(--type-t4)", lineHeight: "var(--type-t4-lh)", fontWeight: 600 }}>
          How it works
        </h2>
        <p style={body}>
          The model never writes code. A description produces a validated{" "}
          <code>ArcadeSpec</code> - a small JSON document naming one of{" "}
          {ENGINES.length} hand-written engines, its physics, its palette and its
          character - and a deterministic engine plays it. That is what makes
          every generated game checkable before anyone sees it: a headless
          simulation plays the spec first, and one that cannot be beaten, or
          cannot be lost, is rejected with a reason.
        </p>
        <p style={body}>
          Nothing here spends money. The physics are currently derived from your
          words in code; the model provider is wired but deliberately switched
          off.
        </p>
      </section>

      <footer
        style={{
          ...body,
          fontSize: "var(--type-c1)",
          lineHeight: "var(--type-c1-lh)",
          paddingTop: "var(--spacing-component-sm)",
          borderTop: "1px solid var(--border-general-default)",
        }}
      >
        Engines: {ENGINES.join(", ")}. Plan, decisions and the dated log live in{" "}
        <code>docs/</code> - start with <code>docs/STATUS.md</code>.
      </footer>
    </main>
  );
}
