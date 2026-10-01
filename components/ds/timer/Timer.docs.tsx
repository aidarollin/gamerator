import type { ComponentDocs } from "../story";
import { Timer } from "./Timer";

export const timerDocs: ComponentDocs = {
  slug: "timer",
  accented: false,
  spec: [
    "Not a DS node. Tag pill geometry, 32 high, Radius/full",
    "Calm: the informative tokens. Under 20% left: the warning tokens AND the word hurry",
    "Expired: the disabled tokens and the words time up",
  ],
  usage: `import { Timer } from "@/components/ds";

<Timer remainingSeconds={left} totalSeconds={120} />`,
  props: [
    { name: "remainingSeconds", type: "number", note: "Shown as m:ss. 0 or less is expired." },
    { name: "totalSeconds", type: "number", note: "Decides when 20% is left." },
  ],
  stories: [
    {
      name: "Calm, urgent, expired",
      note: "The urgent state carries a word as well as a colour, so it warns people who cannot see the colour change.",
      render: () => (
        <>
          <Timer remainingSeconds={95} totalSeconds={120} />
          <Timer remainingSeconds={18} totalSeconds={120} />
          <Timer remainingSeconds={0} totalSeconds={120} />
        </>
      ),
    },
  ],
};
