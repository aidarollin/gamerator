import Link from "next/link";
import { Card, Chip } from "@/components/ds";
import { ArcadeGame } from "@/components/arcade/ArcadeGame";
import { ArcadeSpec, ENGINES } from "@/lib/arcade/schema";
import { ARCADE_FIXTURE_NAMES, readArcadeFixture } from "@/lib/arcade/fixtures";

export const metadata = {
  title: "Arcade - gamerator",
  description: "Pandai-skinned arcade games, played from hand-written specs.",
};

const text = { fontSize: 13, lineHeight: 1.6, color: "var(--text-default-body)" };

export default async function ArcadePage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game } = await searchParams;
  const current = game ?? "endless-flyer.valid";

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "var(--spacing-component-md)",
        display: "grid",
        gap: "var(--spacing-component-md)",
      }}
    >
      <header style={{ display: "grid", gap: "var(--spacing-component-2xs)" }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "var(--text-default-heading)",
          }}
        >
          Pandai arcade
        </h1>
        <p style={{ ...text, maxWidth: "68ch" }}>
          Ten engines, each playing different numbers. Change the physics and
          the palette and you have a different game &mdash; that is the whole
          idea.
        </p>
      </header>

      <Card>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--spacing-component-xs)",
          }}
        >
          {ARCADE_FIXTURE_NAMES.map((name) => (
            <Link
              key={name}
              href={`/play/arcade?game=${name}`}
              style={{ textDecoration: "none" }}
            >
              <Chip state={current === name ? "active" : "default"}>
                {name.replace("endless-flyer.", "")}
              </Chip>
            </Link>
          ))}
        </div>
        <p style={{ ...text, marginTop: 8 }}>
          <strong>invalid</strong> breaks a field bound. <strong>unplayable</strong>{" "}
          and <strong>trivial</strong> have every field in range and are still
          rejected &mdash; by simulation, not by a bound.
        </p>
      </Card>

      <GameView name={current} />

      <Card>
        <strong style={{ color: "var(--text-default-heading)" }}>
          The catalog
        </strong>
        <p style={text}>
          {ENGINES.join(", ")}. A request with no engine at all &mdash; a
          fighter, a racer &mdash; is answered honestly rather than substituted
          with the nearest thing. See <code>docs/ENGINES.md</code>.
        </p>
      </Card>
    </main>
  );
}

function GameView({ name }: { name: string }) {
  let raw: unknown;
  try {
    raw = readArcadeFixture(name);
  } catch {
    return (
      <Card>
        <strong style={{ color: "var(--text-warning-default)" }}>
          No such game
        </strong>
      </Card>
    );
  }

  // The gate. Nothing reaches the engine that has not parsed - including the
  // playability simulation, so an impossible game cannot be rendered.
  const result = ArcadeSpec.safeParse(raw);

  if (!result.success) {
    return (
      <Card>
        <strong style={{ color: "var(--text-warning-default)" }}>
          Rejected before it could be played
        </strong>
        <p style={text}>
          This is the intended outcome for <code>invalid</code>,{" "}
          <code>unplayable</code> and <code>trivial</code>. A game that cannot be
          won is worse than one that says it could not be made.
        </p>
        <ul style={{ ...text, paddingLeft: "var(--spacing-component-md)" }}>
          {result.error.issues.map((issue, i) => (
            <li key={i}>
              <code>{issue.path.join(".") || "(root)"}</code>: {issue.message}
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  const spec = result.data;
  return (
    <ArcadeGame spec={spec} />
  );
}
