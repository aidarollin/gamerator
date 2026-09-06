import Link from "next/link";
import { Card, CardStack, Chip } from "@/components/ds";
import { GameRenderer } from "@/components/game";
import { GameSpec } from "@/lib/spec/schema";
import { listFixtures, readFixture } from "@/lib/spec/fixtures";

export const metadata = {
  title: "Fixture preview - gamerator",
  description:
    "Play any hand-written fixture spec. No AI in the loop - this is the renderer under test.",
};

const text = { fontSize: 13, lineHeight: 1.6, color: "var(--text-default-body)" };

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ fixture?: string }>;
}) {
  const { fixture } = await searchParams;
  const fixtures = listFixtures();

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "var(--spacing-layout-md) var(--spacing-component-md)",
        display: "grid",
        gap: "var(--spacing-component-md)",
      }}
    >
      <header style={{ display: "grid", gap: "var(--spacing-component-xs)" }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "var(--text-default-heading)",
          }}
        >
          Fixture preview
        </h1>
        <p style={{ ...text, maxWidth: "70ch" }}>
          Every game below was written by hand. There is no AI in this path &mdash;
          it exists so the renderer is exercised against specs someone can
          reason about. The <code>invalid</code> fixtures are supposed to be
          refused; a rendered game there would be the bug.
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
          {fixtures.map((f) => (
            <Link
              key={f.name}
              href={`/play/preview?fixture=${f.name}`}
              style={{ textDecoration: "none" }}
            >
              <Chip state={fixture === f.name ? "active" : "default"}>
                {f.name}
              </Chip>
            </Link>
          ))}
        </div>
      </Card>

      {!fixture && (
        <Card>
          <p style={text}>Choose a fixture above.</p>
        </Card>
      )}

      {fixture && <FixtureView name={fixture} />}
    </main>
  );
}

function FixtureView({ name }: { name: string }) {
  let raw: unknown;
  try {
    raw = readFixture(name);
  } catch {
    return (
      <Card>
        <strong style={{ color: "var(--text-warning-default)" }}>
          No such fixture
        </strong>
        <p style={text}>
          <code>{name}</code> is not a fixture in <code>lib/spec/fixtures/</code>.
        </p>
      </Card>
    );
  }

  // The gate. Nothing reaches GameRenderer that has not parsed, which is why
  // its prop can be the parsed type.
  const result = GameSpec.safeParse(raw);

  if (!result.success) {
    return (
      <CardStack>
        <Card>
          <strong style={{ color: "var(--text-warning-default)" }}>
            Rejected by the schema
          </strong>
          <p style={text}>
            {name.endsWith(".invalid")
              ? "This fixture is supposed to be rejected, and it was. The issues below are what the repair turn will be given in Phase 4."
              : "This fixture was expected to parse. That is a real failure - fix the fixture or the schema."}
          </p>
          <ul style={{ ...text, paddingLeft: "var(--spacing-component-md)" }}>
            {result.error.issues.map((issue, i) => (
              <li key={i}>
                <code>{issue.path.join(".") || "(root)"}</code>: {issue.message}
              </li>
            ))}
          </ul>
        </Card>
      </CardStack>
    );
  }

  return <GameRenderer spec={result.data} />;
}
