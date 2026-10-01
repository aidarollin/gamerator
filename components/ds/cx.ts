import type { AccentFamily, SubjectKey } from "./tokens";

/** Join the class names that apply. */
export const cx = (...xs: (string | false | undefined)[]) =>
  xs.filter(Boolean).join(" ");

/** Every component that can wear a subject's or a family's colour takes these. */
export type Accented = { subject?: SubjectKey; accentOverride?: AccentFamily };
