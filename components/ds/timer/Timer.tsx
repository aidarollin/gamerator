import { cx } from "../cx";
import s from "./timer.module.css";

function mmss(totalSeconds: number) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(clamped / 60);
  const sec = clamped % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/**
 * Composed from DS parts - the DS has no Timer node. See timer.module.css.
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
