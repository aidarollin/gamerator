import type { ComponentDocs } from "../story";
import { Button } from "./Button";

export const buttonDocs: ComponentDocs = {
  slug: "button",
  accented: false,
  spec: [
    "Type=Student, Size=L: height 40, padding 8 / 12 (Spacing/component/xs / sm)",
    "Radius/full (60), stroke Border Width/xs, label 14 SemiBold",
    "One hover for all three variants: Surface/secondary/default, Border/secondary/focus, Text/secondary/focus",
    "Pressed: Surface/primary/focus. Disabled: Surface/disabled/primary, Text/disabled/default",
  ],
  usage: `import { Button } from "@/components/ds";

<Button onClick={check}>Check my order</Button>
<Button variant="secondary">Back</Button>`,
  props: [
    { name: "variant", type: `"primary" | "secondary" | "tertiary"`, default: `"primary"`, note: "The three DS variants." },
    { name: "size", type: `"l" | "m" | "s"`, default: `"l"`, note: "Only L is DS-exact." },
    { name: "...button", type: "ButtonHTMLAttributes", note: "Anything a <button> takes: onClick, disabled, aria-*." },
  ],
  stories: [
    {
      name: "Variants",
      note: "Hover any of them: the DS gives all three the same hover.",
      render: () => (
        <>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="tertiary">Tertiary</Button>
        </>
      ),
    },
    {
      name: "Disabled",
      render: () => (
        <>
          <Button disabled>Primary</Button>
          <Button variant="secondary" disabled>Secondary</Button>
        </>
      ),
    },
    {
      name: "Sizes",
      note: "M and S scale padding only - not read from their nodes yet.",
      render: () => (
        <>
          <Button size="l">Size L</Button>
          <Button size="m">Size M</Button>
          <Button size="s">Size S</Button>
        </>
      ),
    },
  ],
};
