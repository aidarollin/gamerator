import type { ComponentDocs } from "../story";
import { Card, CardStack } from "./Card";

const Title = ({ children }: { children: string }) => (
  <strong className="type-t4" style={{ color: "var(--text-default-heading)" }}>
    {children}
  </strong>
);
const Body = ({ children }: { children: string }) => (
  <span className="type-b3" style={{ color: "var(--text-default-body)" }}>
    {children}
  </span>
);

export const primaryCardDocs: ComponentDocs = {
  slug: "primary-card",
  accented: true,
  spec: [
    "Radius/3xl (24), padding Spacing/component/md (16) on all four sides",
    "Internal gap Spacing/component/sm (12), stroke Border Width/xs (1)",
    "Fill Surface/secondary/default-subtle, stroke Border/default",
    "Cards sit 16 apart - the same number as their padding (CardStack)",
  ],
  usage: `import { Card, CardStack } from "@/components/ds";

<CardStack>
  <Card>...</Card>
  <Card variant="accent" subject="physics">...</Card>
</CardStack>`,
  props: [
    { name: "variant", type: `"default" | "accent" | "subject"`, default: `"default"`, note: "default is the DS node exactly. accent is ours; subject is the Quiz Card." },
    { name: "subject", type: "SubjectKey", note: "Which subject's ramp an accented card wears." },
    { name: "accentOverride", type: "AccentFamily", note: "For a card with no subject. Worth a second look when used." },
    { name: "className", type: "string", note: "Layout only - never colour." },
  ],
  stories: [
    {
      name: "Default",
      note: "The DS Primary Card, with nothing tinted.",
      render: () => (
        <Card>
          <Title>Choose a game</Title>
          <Body>Describe it in one line and it is built for you.</Body>
        </Card>
      ),
    },
    {
      name: "Accent",
      note: "Not a DS variant: the same geometry with the stroke and fill taken from the subject. Change the subject above.",
      render: ({ subject }) => (
        <Card variant="accent" subject={subject}>
          <Title>Accented card</Title>
          <Body>Two colours swapped for the ramp. The shape cannot drift.</Body>
        </Card>
      ),
    },
    {
      name: "Stacked",
      stack: true,
      render: () => (
        <CardStack>
          <Card><Body>First card</Body></Card>
          <Card><Body>Second card, 16 below it</Body></Card>
        </CardStack>
      ),
    },
  ],
};
