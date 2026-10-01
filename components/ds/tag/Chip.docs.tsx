import type { ComponentDocs } from "../story";
import { Chip } from "./Chip";

export const tagDocs: ComponentDocs = {
  slug: "tag",
  accented: true,
  spec: [
    "Size=S: height 24, padding 4 / 8, gap Spacing/component/3xs (2)",
    "Radius/full, stroke Border Width/xs",
    "Default: Surface/general/default-secondary on Border/primary/default",
    "Active: Surface/primary/default on Border/primary/focus",
  ],
  usage: `import { Chip } from "@/components/ds";

<Chip>Tahun 4</Chip>
<Chip state="accent" subject="b-melayu">Bahasa Melayu</Chip>`,
  props: [
    { name: "state", type: `"default" | "active" | "accent"`, default: `"default"`, note: "accent is ours: DS geometry, subject colours." },
    { name: "subject", type: "SubjectKey", note: "For state=\"accent\"." },
    { name: "accentOverride", type: "AccentFamily", note: "For state=\"accent\" with no subject." },
  ],
  stories: [
    {
      name: "States",
      render: () => (
        <>
          <Chip>Default</Chip>
          <Chip state="active">Active</Chip>
        </>
      ),
    },
    {
      name: "Accent",
      note: "Change the subject above.",
      render: ({ subject }) => (
        <Chip state="accent" subject={subject}>{subject}</Chip>
      ),
    },
    {
      name: "Above a learning game",
      note: "How GameShell uses it.",
      render: ({ subject }) => (
        <>
          <Chip state="accent" subject={subject}>{subject}</Chip>
          <Chip>quiz-race</Chip>
          <Chip>Tahun 4</Chip>
        </>
      ),
    },
  ],
};
