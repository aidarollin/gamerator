import { cx, type Accented } from "../cx";
import { rampStyle, resolveRamp } from "../tokens";
import s from "./progress-bar.module.css";

/** Figma "Progress Bar - 1.5": S / M / L, 4 / 8 / 16 high. */
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
