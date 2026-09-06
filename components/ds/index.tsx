/**
 * Pandai DS 1.5 primitives.
 *
 * Geometry read off the real Figma nodes on 2026-09-06; each component's
 * source node is named in ds.module.css. No component may introduce a colour
 * value - `npm run check:ds` enforces it.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";
import s from "./ds.module.css";
import { rampStyle, resolveRamp, statusStyle } from "./tokens";
import type { AccentFamily, StatusKey, SubjectKey } from "./tokens";

const cx = (...xs: (string | false | undefined)[]) =>
  xs.filter(Boolean).join(" ");

type Accented = { subject?: SubjectKey; accentOverride?: AccentFamily };

/* ------------------------------------------------------------------ Card */

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

/* ---------------------------------------------------------------- Button */

export function Button({
  children,
  variant = "primary",
  size = "l",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "tertiary";
  size?: "l" | "m" | "s";
}) {
  return (
    <button
      type="button"
      className={cx(
        s.button,
        variant === "primary" && s.btnPrimary,
        variant === "secondary" && s.btnSecondary,
        variant === "tertiary" && s.btnTertiary,
        size === "m" && s.buttonM,
        size === "s" && s.buttonS,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Chip */

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

/* ----------------------------------------------------------- ProgressBar */

export function ProgressBar({
  value,
  max = 100,
  size = "m",
  subject,
  accentOverride,
  label,
}: Accented & {
  value: number;
  max?: number;
  size?: "s" | "m" | "l";
  /** Screen-reader label. Progress carried only by width is progress only
   *  sighted users can read. */
  label: string;
}) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.max(0, Math.min(100, (value / safeMax) * 100));
  return (
    <div
      className={cx(
        s.progress,
        size === "s" && s.progressS,
        size === "m" && s.progressM,
        size === "l" && s.progressL,
      )}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={safeMax}
    >
      <div
        className={s.progressFill}
        style={{
          width: `${pct}%`,
          ...rampStyle(resolveRamp({ subject, accentOverride })),
        }}
      />
    </div>
  );
}

/* ----------------------------------------------------------------- Timer */

function mmss(totalSeconds: number) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(clamped / 60);
  const sec = clamped % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/**
 * Composed from DS parts - the DS has no Timer node. See ds.module.css.
 *
 * The urgent state carries a word as well as a colour, because a timer whose
 * only warning is "it went red" warns nobody who cannot see red (NFR8).
 */
export function Timer({
  remainingSeconds,
  totalSeconds,
}: {
  remainingSeconds: number;
  totalSeconds: number;
}) {
  const expired = remainingSeconds <= 0;
  const urgent =
    !expired && totalSeconds > 0 && remainingSeconds / totalSeconds <= 0.2;
  return (
    <span
      className={cx(s.timer, urgent && s.timerUrgent, expired && s.timerExpired)}
      role="timer"
      aria-live={urgent ? "assertive" : "off"}
    >
      <span aria-hidden="true">&#9201;</span>
      {mmss(remainingSeconds)}
      {urgent && <span>hurry</span>}
      {expired && <span>time up</span>}
    </span>
  );
}

/* ------------------------------------------------------------ StatusPill */

export function StatusPill({
  kind,
  value,
  label,
}: {
  kind: StatusKey;
  value: number | string;
  label: string;
}) {
  return (
    <span className={s.status} style={statusStyle(kind)}>
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  );
}
