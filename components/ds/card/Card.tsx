import type { ReactNode } from "react";
import { cx, type Accented } from "../cx";
import { rampStyle, resolveRamp } from "../tokens";
import s from "./card.module.css";

/**
 * Figma "Primary Card - 1.5" (variant `default`) and "Quiz Card - 1.5",
 * Type=Subjects (variant `subject`). `accent` is ours: the Primary Card's
 * geometry with two colours swapped for the ramp.
 */
export function Card({
  children,
  variant = "default",
  subject,
  accentOverride,
  className,
}: Accented & {
  children: ReactNode;
  /** `default` is the DS Primary Card exactly. The others tint it. */
  variant?: "default" | "accent" | "subject";
  className?: string;
}) {
  const accented = variant !== "default";
  return (
    <div
      className={cx(
        s.card,
        variant === "accent" && s.cardAccent,
        variant === "subject" && s.cardSubject,
        className,
      )}
      style={
        accented ? rampStyle(resolveRamp({ subject, accentOverride })) : undefined
      }
    >
      {children}
    </div>
  );
}

/** Cards sit 16 apart - the same number as their own padding. */
export function CardStack({ children }: { children: ReactNode }) {
  return <div className={s.cardStack}>{children}</div>;
}
