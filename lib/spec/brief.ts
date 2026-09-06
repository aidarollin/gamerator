import { z } from "zod";
import { SUBJECT_KEYS } from "@/lib/ds/tokens.generated";
import { TEMPLATES } from "./schema";

/**
 * What the content designer fills in. The input side of generation.
 *
 * Deliberately small. Every field here is either a constrained choice or the
 * one free-text field where intent actually lives; a form with twenty optional
 * boxes gets filled in wrongly and slowly. See docs/AUTHORING-GUIDELINES.md.
 */
export const Brief = z.object({
  subject: z.enum(SUBJECT_KEYS),
  yearLevel: z.number().int().min(1).max(13),
  language: z.enum(["ms", "en"]),
  learningObjective: z.string().min(10).max(300),

  /** Absent means "you choose" - the model picks the best-fitting template. */
  templateHint: z.enum(TEMPLATES).optional(),

  /** Rules and content in the author's own words. The only free field. */
  rules: z.string().max(4000).default(""),
});

export type Brief = z.infer<typeof Brief>;

/**
 * Renders the brief as the user turn.
 *
 * Kept separate from the system prompt on purpose: the system prompt is the
 * frozen, cached prefix and this is the volatile part. Anything that varies
 * per request belongs here, after the cache breakpoint, or every request pays
 * full price for the whole prompt.
 */
export function renderBrief(brief: Brief): string {
  const lines = [
    `Subject: ${brief.subject}`,
    `Year level: ${brief.yearLevel}`,
    `Language: ${brief.language === "ms" ? "Bahasa Melayu" : "English"}`,
    `Learning objective: ${brief.learningObjective}`,
    brief.templateHint
      ? `Template: ${brief.templateHint}`
      : "Template: choose the one that best fits the objective.",
  ];
  if (brief.rules.trim()) {
    lines.push("", "Rules and content from the author:", brief.rules.trim());
  }
  return lines.join("\n");
}
