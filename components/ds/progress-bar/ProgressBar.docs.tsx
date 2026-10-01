import { ACCENT_FAMILIES } from "@/lib/ds/tokens.generated";
import type { ComponentDocs } from "../story";
import { ProgressBar } from "./ProgressBar";

export const progressBarDocs: ComponentDocs = {
  slug: "progress-bar",
  accented: true,
  spec: [
    "Size S / M / L: height 4 / 8 / 16",
    "Radius/pill (999), track Surface/disabled/primary",
    "The fill takes the accent ramp's default",
  ],
  usage: `import { ProgressBar } from "@/components/ds";

<ProgressBar value={3} max={10} subject="math" label="3 of 10 answered" />`,
  props: [
    { name: "value", type: "number", note: "Clamped to 0..max." },
    { name: "max", type: "number", default: "100", note: "A max of 0 or less is treated as 1." },
    { name: "size", type: `"s" | "m" | "l"`, default: `"m"`, note: "4, 8 or 16 high." },
    { name: "label", type: "string", note: "Required. What a screen reader says." },
    { name: "subject", type: "SubjectKey", note: "The fill's colour." },
    { name: "accentOverride", type: "AccentFamily", note: "For a bar with no subject." },
  ],
  stories: [
    {
      name: "Sizes",
      stack: true,
      render: ({ subject }) => (
        <>
          <ProgressBar size="s" value={25} subject={subject} label="Small, 25 percent" />
          <ProgressBar size="m" value={60} subject={subject} label="Medium, 60 percent" />
          <ProgressBar size="l" value={85} subject={subject} label="Large, 85 percent" />
        </>
      ),
    },
    {
      name: "Accent families",
      note: "For a game with no subject to derive from.",
      stack: true,
      render: () => (
        <>
          {ACCENT_FAMILIES.map((f) => (
            <ProgressBar key={f} value={70} accentOverride={f} label={`${f}, 70 percent`} />
          ))}
        </>
      ),
    },
  ],
};
