"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ds";
import type { SequenceOrderSpec } from "@/lib/spec/schema";
import { seededShuffle, specSeed } from "@/lib/game/random";
import { GameShell, Summary, useCountdown } from "./GameShell";
import g from "./game.module.css";

/**
 * Reordering by move-up / move-down buttons rather than dragging, for the same
 * reason SortBuckets avoids drag: a drag-only reorder is unusable by keyboard.
 */
export function SequenceOrder({ spec }: { spec: SequenceOrderSpec }) {
  const [round, setRound] = useState(0);
  const [checked, setChecked] = useState(false);

  const shuffled = useMemo(() => {
    const steps = spec.content.steps.map((s, i) => ({ ...s, key: i }));
    const out = seededShuffle(steps, specSeed(spec.meta.title, `steps:${round}`));
    // A shuffle that happens to land in the right order is a game with no
    // question in it. Nudge it rather than reshuffling forever.
    const alreadyOrdered = out.every((s, i) => s.position === i + 1);
    if (alreadyOrdered && out.length > 1) {
      [out[0], out[out.length - 1]] = [out[out.length - 1], out[0]];
    }
    return out;
  }, [spec, round]);

  const [order, setOrder] = useState(shuffled);
  const [seenRound, setSeenRound] = useState(round);
  if (seenRound !== round) {
    setSeenRound(round);
    setOrder(shuffled);
    setChecked(false);
  }

  const secondsLeft = useCountdown(spec.rules.secondsTotal, !checked);
  const timeUp = secondsLeft === 0;
  const over = checked || timeUp;

  const correctPlaces = order.filter((s, i) => s.position === i + 1).length;
  const total = order.length;
  const allCorrect = correctPlaces === total;

  const score = spec.rules.partialCredit
    ? correctPlaces * spec.scoring.pointsCorrect
    : allCorrect
      ? total * spec.scoring.pointsCorrect
      : 0;
  const maxScore = total * spec.scoring.pointsCorrect;

  function move(from: number, to: number) {
    if (over || to < 0 || to >= order.length) return;
    const next = order.slice();
    [next[from], next[to]] = [next[to], next[from]];
    setOrder(next);
  }

  function restart() {
    setRound((r) => r + 1);
  }

  const horizontal = spec.rules.orientation === "horizontal";

  return (
    <GameShell
      spec={spec}
      progress={{ value: over ? total : correctPlaces, max: total }}
      progressLabel={
        over ? `${correctPlaces} of ${total} in the right place` : "Arrange the steps"
      }
      score={over ? score : 0}
      secondsLeft={secondsLeft}
      finished={over}
      summary={
        <Summary
          score={score}
          maxScore={maxScore}
          passThreshold={spec.scoring.passThreshold}
          detail={
            timeUp && !checked
              ? `Time ran out with ${correctPlaces} of ${total} in the right place.`
              : `${correctPlaces} of ${total} in the right place.` +
                (spec.rules.partialCredit ? "" : " This game scores all or nothing.")
          }
          onRestart={restart}
        />
      }
    >
      <p className={g.prompt}>Put the steps in the correct order.</p>
      <ol
        className={g.options}
        style={
          horizontal
            ? { gridTemplateColumns: `repeat(auto-fit, minmax(140px, 1fr))` }
            : undefined
        }
      >
        {order.map((step, i) => (
          <li key={step.key} className={g.row}>
            <span className={g.rowText}>
              <span className={g.srOnly}>Position {i + 1}. </span>
              {step.text}
            </span>
            <Button
              size="s"
              variant="secondary"
              onClick={() => move(i, i - 1)}
              disabled={i === 0 || over}
              aria-label={`Move "${step.text}" earlier`}
            >
              &uarr;
            </Button>
            <Button
              size="s"
              variant="secondary"
              onClick={() => move(i, i + 1)}
              disabled={i === order.length - 1 || over}
              aria-label={`Move "${step.text}" later`}
            >
              &darr;
            </Button>
          </li>
        ))}
      </ol>
      {!over && (
        <Button onClick={() => setChecked(true)}>Check my order</Button>
      )}
    </GameShell>
  );
}
