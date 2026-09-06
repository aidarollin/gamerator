"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Card, Chip, ProgressBar, StatusPill, Timer } from "@/components/ds";
import { rampStyle, resolveRamp } from "@/components/ds/tokens";
import type { GameSpec } from "@/lib/spec/schema";
import g from "./game.module.css";

/**
 * The frame every template shares: title, subject, timer, score, progress, and
 * the end-of-game summary. Templates supply only their own play area.
 *
 * The accent is resolved once here and published as --ramp-* for the whole
 * subtree, so no template component ever touches a colour.
 */
export function GameShell({
  spec,
  progress,
  progressLabel,
  score,
  streak,
  secondsLeft,
  finished,
  summary,
  children,
}: {
  spec: GameSpec;
  progress: { value: number; max: number };
  progressLabel: string;
  score: number;
  streak?: number;
  secondsLeft: number | null;
  finished: boolean;
  summary?: ReactNode;
  children: ReactNode;
}) {
  const ramp = resolveRamp({
    subject: spec.meta.subject,
    accentOverride: spec.presentation.accentOverride,
  });

  return (
    <div className={g.shell} style={rampStyle(ramp)}>
      <div className={g.bar}>
        <div>
          <div className={g.title}>{spec.meta.title}</div>
          <div className={g.objective}>{spec.meta.learningObjective}</div>
        </div>
        <div className={g.barGroup}>
          <Chip state="accent" subject={spec.meta.subject}>
            {spec.meta.subject}
          </Chip>
          <Chip>
            {spec.meta.language === "ms" ? "Bahasa Melayu" : "English"}
          </Chip>
          <Chip>Tahun {spec.meta.yearLevel}</Chip>
        </div>
      </div>

      <div className={g.bar}>
        <div className={g.barGroup}>
          <StatusPill kind="score" label="score" value={score} />
          {typeof streak === "number" && (
            <StatusPill kind="streak" label="streak" value={streak} />
          )}
        </div>
        {secondsLeft !== null && (
          <Timer
            remainingSeconds={secondsLeft}
            totalSeconds={
              "secondsTotal" in spec.rules && spec.rules.secondsTotal
                ? spec.rules.secondsTotal
                : 0
            }
          />
        )}
      </div>

      <ProgressBar
        value={progress.value}
        max={progress.max}
        size="m"
        subject={spec.meta.subject}
        accentOverride={spec.presentation.accentOverride}
        label={progressLabel}
      />

      {finished && summary ? <Card>{summary}</Card> : <Card>{children}</Card>}
    </div>
  );
}

/**
 * Counts a timer down, or does nothing at all when the spec is untimed.
 *
 * `null` in, `null` out - an untimed game must not grow a hidden clock, and the
 * caller can pass the result straight to GameShell.
 */
export function useCountdown(
  secondsTotal: number | null,
  running: boolean,
): number | null {
  const [left, setLeft] = useState<number | null>(secondsTotal);

  // Reset when the spec's timer changes, by adjusting state DURING render
  // rather than in an effect. React 19 flags the effect version as a cascading
  // render, and it is: the effect version paints one frame of the old timer
  // before correcting itself.
  const [seenTotal, setSeenTotal] = useState(secondsTotal);
  if (seenTotal !== secondsTotal) {
    setSeenTotal(secondsTotal);
    setLeft(secondsTotal);
  }

  useEffect(() => {
    if (secondsTotal === null || !running) return;
    const id = setInterval(() => {
      setLeft((v) => (v === null ? null : Math.max(0, v - 1)));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsTotal, running]);

  return left;
}

/** Shared end-of-game summary. */
export function Summary({
  score,
  maxScore,
  passThreshold,
  detail,
  onRestart,
}: {
  score: number;
  maxScore: number;
  passThreshold: number;
  detail: string;
  onRestart: () => void;
}) {
  const fraction = maxScore > 0 ? score / maxScore : 0;
  const passed = fraction >= passThreshold;
  return (
    <div className={g.summary}>
      <div className={`${g.summaryHead} ${passed ? g.summaryPass : g.summaryFail}`}>
        {passed ? "Passed" : "Not passed yet"}
      </div>
      <div className={g.objective}>
        {score} of {maxScore} points &middot; {Math.round(fraction * 100)}%
        &middot; pass mark {Math.round(passThreshold * 100)}%
      </div>
      <div className={g.objective}>{detail}</div>
      <div>
        <button className={g.option} onClick={onRestart} style={{ width: "auto" }}>
          Play again
        </button>
      </div>
    </div>
  );
}
