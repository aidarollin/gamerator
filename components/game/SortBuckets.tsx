"use client";

import { useMemo, useState } from "react";
import type { SortBucketsSpec } from "@/lib/spec/schema";
import { seededShuffle, specSeed } from "@/lib/game/random";
import { GameShell, Summary, useCountdown } from "./GameShell";
import g from "./game.module.css";

/**
 * Select-then-place rather than HTML5 drag and drop.
 *
 * Drag and drop is not keyboard operable and is awkward on touch, which would
 * put NFR8 out of reach for a whole template. Select an item, then choose a
 * bucket: the same two gestures work with a mouse, a finger, or Tab and Enter.
 */
export function SortBuckets({ spec }: { spec: SortBucketsSpec }) {
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [placed, setPlaced] = useState<Record<number, string>>({});
  const [score, setScore] = useState(0);

  const items = useMemo(
    () =>
      seededShuffle(
        spec.content.items.map((it, i) => ({ ...it, i })),
        specSeed(spec.meta.title, `items:${round}`),
      ),
    [spec, round],
  );

  const total = items.length;
  const placedCount = Object.keys(placed).length;
  const done = placedCount === total;
  const secondsLeft = useCountdown(spec.rules.secondsTotal, !done);
  const timeUp = secondsLeft === 0;
  const over = done || timeUp;
  const maxScore = total * spec.scoring.pointsCorrect;

  const remaining = items.filter((it) => placed[it.i] === undefined);

  function place(bucketId: string) {
    if (selected === null || over) return;
    const item = items.find((it) => it.i === selected);
    if (!item) return;
    setPlaced((p) => ({ ...p, [item.i]: bucketId }));
    setScore((s) =>
      item.bucketId === bucketId
        ? s + spec.scoring.pointsCorrect
        : s + spec.scoring.pointsIncorrect,
    );
    setSelected(null);
  }

  function restart() {
    setRound((r) => r + 1);
    setSelected(null);
    setPlaced({});
    setScore(0);
  }

  const correctCount = Object.entries(placed).filter(([i, bucketId]) => {
    const item = items.find((it) => it.i === Number(i));
    return item && item.bucketId === bucketId;
  }).length;

  return (
    <GameShell
      spec={spec}
      progress={{ value: placedCount, max: total }}
      progressLabel={`${placedCount} of ${total} items sorted`}
      score={score}
      secondsLeft={secondsLeft}
      finished={over}
      summary={
        <Summary
          score={score}
          maxScore={maxScore}
          passThreshold={spec.scoring.passThreshold}
          detail={`${correctCount} of ${total} sorted into the right group.`}
          onRestart={restart}
        />
      }
    >
      <p className={g.prompt}>
        {selected === null
          ? "Choose an item, then choose its group."
          : `Now choose a group for "${items.find((i) => i.i === selected)?.text}".`}
      </p>

      <div className={g.options}>
        {remaining.map((item) => (
          <button
            key={item.i}
            className={`${g.option} ${selected === item.i ? g.optionSelected : ""}`}
            aria-pressed={selected === item.i}
            onClick={() => setSelected(selected === item.i ? null : item.i)}
          >
            {item.text}
          </button>
        ))}
        {remaining.length === 0 && !over && (
          <p className={g.hint}>Everything is sorted.</p>
        )}
      </div>

      <div
        className={g.grid}
        style={{
          gridTemplateColumns: `repeat(${Math.min(spec.content.buckets.length, 2)}, minmax(0, 1fr))`,
          marginTop: "var(--spacing-component-sm)",
        }}
      >
        {spec.content.buckets.map((bucket) => {
          const contents = Object.entries(placed).filter(
            ([, b]) => b === bucket.id,
          );
          return (
            <button
              key={bucket.id}
              className={`${g.bucket} ${selected !== null ? g.bucketReady : ""}`}
              onClick={() => place(bucket.id)}
              disabled={selected === null}
              aria-label={`Place in ${bucket.label}`}
            >
              <span className={g.bucketLabel}>{bucket.label}</span>
              {contents.map(([i, ]) => {
                const item = items.find((it) => it.i === Number(i));
                if (!item) return null;
                const right = item.bucketId === bucket.id;
                const showResult = spec.rules.feedback === "per-drop" || over;
                return (
                  <span
                    key={i}
                    className={[
                      g.option,
                      showResult && right ? g.optionCorrect : "",
                      showResult && !right ? g.optionWrong : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{ minHeight: 0, cursor: "default" }}
                  >
                    {item.text}
                    {showResult && (
                      <span className={g.marker}>{right ? "correct" : "wrong"}</span>
                    )}
                  </span>
                );
              })}
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}
