import type { ReactNode } from "react";
import { cx, type Accented } from "../cx";
import { rampStyle, resolveRamp } from "../tokens";
import s from "./tag.module.css";

/** Figma "Tag - 1.5", Size=S. Called Chip here, which is older than this file. */
export function Chip({
  children,
  state = "default",
  subject,
  accentOverride,
}: Accented & {
  children: ReactNode;
  state?: "default" | "active" | "accent";
}) {
  return (
    <span
      className={cx(
        s.chip,
        state === "active" && s.chipActive,
        state === "accent" && s.chipAccent,
      )}
      style={
        state === "accent"
          ? rampStyle(resolveRamp({ subject, accentOverride }))
          : undefined
      }
    >
      {children}
    </span>
  );
}
