import {
  Button,
  Card,
  CardStack,
  Chip,
  ProgressBar,
  StatusPill,
  Timer,
} from "@/components/ds";
import {
  ACCENT_FAMILIES,
  RADIUS,
  SPACING,
  STATUS_KEYS,
  SUBJECT_KEYS,
} from "@/lib/ds/tokens.generated";

export const metadata = {
  title: "DS primitives - gamerator",
  description:
    "Every Pandai DS 1.5 primitive in every accent. The reference surface for Phase 2.",
};

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ display: "grid", gap: "var(--spacing-component-sm)" }}>
      <div>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--text-default-heading)",
          }}
        >
          {title}
        </h2>
        {note && (
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.5,
              color: "var(--text-default-body)",
              maxWidth: "60ch",
            }}
          >
            {note}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

const Row = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--spacing-component-sm)",
      alignItems: "center",
    }}
  >
    {children}
  </div>
);

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      gap: "var(--spacing-component-md)",
    }}
  >
    {children}
  </div>
);

const caption = {
  fontSize: 12,
  color: "var(--text-default-caption)",
  fontFamily: "var(--font-mono), ui-monospace, monospace",
} as const;

export default function DsPage() {
  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "var(--spacing-layout-md) var(--spacing-component-md)",
        display: "grid",
        gap: "var(--spacing-layout-md)",
      }}
    >
      <header style={{ display: "grid", gap: "var(--spacing-component-xs)" }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "var(--text-default-heading)",
          }}
        >
          Pandai DS 1.5 primitives
        </h1>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--text-default-body)",
            maxWidth: "70ch",
          }}
        >
          Every primitive in every accent. Geometry was read off the real Figma
          nodes on 2026-09-06 and colour comes only from generated tokens &mdash;
          366 of them, Semantic=Light and Product=Student. Nothing on this page
          names a colour.
        </p>
      </header>

      <Section
        title="Button"
        note="Figma Button - 1.5, Type=Student, Size=L: height 40, padding 8/12, Radius/full, 1px stroke, 14px. All three variants share one hover treatment in the DS - that is the DS's behaviour, not a shortcut here."
      >
        <Row>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="tertiary">Tertiary</Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </Row>
        <Row>
          <Button size="l">Size L</Button>
          <Button size="m">Size M</Button>
          <Button size="s">Size S</Button>
          <span style={caption}>M and S scale padding only &mdash; not DS-exact</span>
        </Row>
      </Section>

      <Section
        title="Chip"
        note="Figma Tag - 1.5, Size=S: height 24, padding 4/8, gap 2, Radius/full."
      >
        <Row>
          <Chip>Default</Chip>
          <Chip state="active">Active</Chip>
          <Chip state="accent" subject="b-melayu">
            Bahasa Melayu
          </Chip>
          <Chip state="accent" subject="chemistry">
            Chemistry
          </Chip>
        </Row>
      </Section>

      <Section
        title="Progress bar"
        note="Figma Progress Bar - 1.5: heights 4 / 8 / 16 at Radius/pill, track Surface/disabled/primary. Fill takes the accent."
      >
        <div style={{ display: "grid", gap: "var(--spacing-component-sm)", maxWidth: 420 }}>
          <ProgressBar size="s" value={25} label="Small, 25 percent" />
          <ProgressBar size="m" value={60} subject="math" label="Medium, 60 percent" />
          <ProgressBar size="l" value={85} subject="biology" label="Large, 85 percent" />
        </div>
      </Section>

      <Section
        title="Timer"
        note="Composed from DS parts - the DS has no Timer node. The urgent state carries a word as well as a colour, so it warns people who cannot see red."
      >
        <Row>
          <Timer remainingSeconds={95} totalSeconds={120} />
          <Timer remainingSeconds={18} totalSeconds={120} />
          <Timer remainingSeconds={0} totalSeconds={120} />
        </Row>
      </Section>

      <Section
        title="Status pills"
        note="The DS already ships game-status colours. quiz-race's streak multiplier has a token waiting for it."
      >
        <Row>
          {STATUS_KEYS.map((k) => (
            <StatusPill key={k} kind={k} label={k} value={12} />
          ))}
        </Row>
      </Section>

      <Section
        title="Card"
        note="Figma Primary Card - 1.5: Radius/3xl (24), padding 16 on all four sides, internal gap 12, fill Surface/secondary/default-subtle, stroke Border/default. Cards sit 16 apart - the same number as their padding."
      >
        <CardStack>
          <Card>
            <strong style={{ color: "var(--text-default-heading)" }}>
              Default card
            </strong>
            <span style={{ fontSize: 13, color: "var(--text-default-body)" }}>
              The DS Primary Card exactly, with nothing tinted.
            </span>
          </Card>
          <Card variant="accent" subject="physics">
            <strong style={{ color: "var(--text-default-heading)" }}>
              Accented card &mdash; physics
            </strong>
            <span style={{ fontSize: 13, color: "var(--text-default-body)" }}>
              Same geometry, two colours swapped for the subject ramp.
            </span>
          </Card>
        </CardStack>
      </Section>

      <Section
        title={`Every subject (${SUBJECT_KEYS.length})`}
        note="A game's accent is derived from its subject, never chosen by the model. This is that mapping, rendered."
      >
        <Grid>
          {SUBJECT_KEYS.map((subject) => (
            <Card key={subject} variant="subject" subject={subject}>
              <Chip state="accent" subject={subject}>
                {subject}
              </Chip>
              <ProgressBar
                value={70}
                size="m"
                subject={subject}
                label={`${subject} sample progress`}
              />
              <span style={caption}>--subjects-{subject}-default</span>
            </Card>
          ))}
        </Grid>
      </Section>

      <Section
        title={`Every accent family (${ACCENT_FAMILIES.length})`}
        note="Semantic families carrying the complete Surface ramp. Used only where a game has no subject to derive from."
      >
        <Grid>
          {ACCENT_FAMILIES.map((family) => (
            <Card key={family} variant="accent" accentOverride={family}>
              <Chip state="accent" accentOverride={family}>
                {family}
              </Chip>
              <ProgressBar
                value={70}
                size="m"
                accentOverride={family}
                label={`${family} sample progress`}
              />
              <span style={caption}>--surface-{family}-default</span>
            </Card>
          ))}
        </Grid>
      </Section>

      <Section title="Scales">
        <div
          style={{
            display: "grid",
            gap: "var(--spacing-component-md)",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          }}
        >
          <Card>
            <strong style={{ color: "var(--text-default-heading)" }}>Spacing</strong>
            {Object.entries(SPACING).map(([name, px]) => (
              <div
                key={name}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <span style={{ ...caption, width: 44 }}>{name}</span>
                <span
                  style={{
                    height: 8,
                    width: px,
                    background: "var(--surface-primary-default)",
                    borderRadius: "var(--radius-pill)",
                  }}
                />
                <span style={caption}>{px}</span>
              </div>
            ))}
          </Card>
          <Card>
            <strong style={{ color: "var(--text-default-heading)" }}>Radius</strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {Object.entries(RADIUS).map(([name, px]) => (
                <div key={name} style={{ display: "grid", gap: 4, justifyItems: "center" }}>
                  <span
                    style={{
                      height: 44,
                      width: 44,
                      borderRadius: px,
                      background: "var(--surface-secondary-default-subtle)",
                      border:
                        "var(--border-width-xs) solid var(--border-primary-default)",
                    }}
                  />
                  <span style={caption}>{name}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Section>
    </main>
  );
}
