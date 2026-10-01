import { STATUS_KEYS } from "@/lib/ds/tokens.generated";
import type { ComponentDocs } from "../story";
import { StatusPill } from "./StatusPill";

export const statusPillDocs: ComponentDocs = {
  slug: "status-pill",
  accented: false,
  spec: [
    "Not a DS node yet. Colours from Semantic Status: <kind>/default and <kind>/on-color",
    "Tag pill geometry: 24 high, padding 4 / 8, Radius/full",
    "Numbers are tabular, so a ticking score does not jitter",
  ],
  usage: `import { StatusPill } from "@/components/ds";

<StatusPill kind="score" label="score" value={score} />`,
  props: [
    { name: "kind", type: "StatusKey", note: "coins, lives, ruby, score or streak." },
    { name: "label", type: "string", note: "The word before the value." },
    { name: "value", type: "number | string", note: "" },
  ],
  stories: [
    {
      name: `Every status (${STATUS_KEYS.length})`,
      render: () => (
        <>
          {STATUS_KEYS.map((k) => (
            <StatusPill key={k} kind={k} label={k} value={12} />
          ))}
        </>
      ),
    },
    {
      name: "In a HUD",
      render: () => (
        <>
          <StatusPill kind="score" label="score" value={1240} />
          <StatusPill kind="streak" label="streak" value="x3" />
        </>
      ),
    },
  ],
};
