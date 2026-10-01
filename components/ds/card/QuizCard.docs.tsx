import { SUBJECT_KEYS } from "@/lib/ds/tokens.generated";
import type { ComponentDocs } from "../story";
import { Chip } from "../tag/Chip";
import { Card } from "./Card";

export const quizCardDocs: ComponentDocs = {
  slug: "quiz-card",
  accented: true,
  spec: [
    "Type=Subjects: Radius/2xl (18)",
    "Fill Surface/general/default-tertiary, stroke bound to the subject",
    "Gap Spacing/component/xs (8)",
  ],
  usage: `import { Card } from "@/components/ds";

<Card variant="subject" subject="chemistry">...</Card>`,
  props: [
    { name: "variant", type: `"subject"`, note: "Selects the Quiz Card geometry on Card." },
    { name: "subject", type: "SubjectKey", note: "The stroke's colour." },
  ],
  stories: [
    {
      name: "One subject",
      render: ({ subject }) => (
        <Card variant="subject" subject={subject}>
          {/* A card is a flex column, which would stretch the tag full width. */}
          <div>
            <Chip state="accent" subject={subject}>{subject}</Chip>
          </div>
          <span className="type-b3" style={{ color: "var(--text-default-body)" }}>
            Which gas turns limewater cloudy?
          </span>
        </Card>
      ),
    },
    {
      name: `Every subject (${SUBJECT_KEYS.length})`,
      note: "A game's accent is derived from its subject, never chosen by the model.",
      render: () => (
        <>
          {SUBJECT_KEYS.map((s) => (
            <Card key={s} variant="subject" subject={s}>
              <Chip state="accent" subject={s}>{s}</Chip>
            </Card>
          ))}
        </>
      ),
    },
  ],
};
