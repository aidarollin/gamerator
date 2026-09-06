"use client";

import { useMemo, useState } from "react";
import type { MatchPairsSpec } from "@/lib/spec/schema";
import { seededShuffle, specSeed } from "@/lib/game/random";
import { GameShell, Summary, useCountdown } from "./GameShell";
import g from "./game.module.css";

type Face = { id: string; pair: number; text: string; side: "left" | "right" };

export function MatchPairs({ spec }: { spec: MatchPairsSpec }) {
  const [round, setRound] = useState(0);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [locked, setLocked] = useState(false);

  const cards = useMemo<Face[]>(() => {
    const faces: Face[] = [];
    spec.content.pairs.forEach((p, i) => {
      faces.push({ id: `${i}-l`, pair: i, text: p.left, side: "left" });
      faces.push({ id: `${i}-r`, pair: i, text: p.right, side: "right" });
    });
    return seededShuffle(faces, specSeed(spec.meta.title, `cards:${round}`));
  }, [spec, round]);

  const totalPairs = spec.content.pairs.length;
  const outOfAttempts =
    spec.rules.maxAttempts !== null && attempts >= spec.rules.maxAttempts;
  const allMatched = matched.size === totalPairs;
  const secondsLeft = useCountdown(spec.rules.secondsTotal, !allMatched);
  const timeUp = secondsLeft === 0;
  const over = allMatched || timeUp || outOfAttempts;
  const maxScore = totalPairs * spec.scoring.pointsCorrect;

  function flip(card: Face) {
    if (locked || over) return;
    if (matched.has(card.pair) || flipped.includes(card.id)) return;

    const next = [...flipped, card.id];
    setFlipped(next);
    if (next.length < 2) return;

    setAttempts((a) => a + 1);
    const [aId, bId] = next;
    const a = cards.find((c) => c.id === aId);
    const b = cards.find((c) => c.id === bId);

    // A pair matches only when it is the same pair index AND opposite sides -
    // otherwise the two halves of one card's own side would count as a match.
    if (a && b && a.pair === b.pair && a.side !== b.side) {
      setMatched((m) => new Set(m).add(a.pair));
      setScore((s) => s + spec.scoring.pointsCorrect);
      setFlipped([]);
    } else {
      setScore((s) => s + spec.scoring.pointsIncorrect);
      setLocked(true);
      setTimeout(() => {
        setFlipped([]);
        setLocked(false);
      }, 700);
    }
  }

  function restart() {
    setRound((r) => r + 1);
    setFlipped([]);
    setMatched(new Set());
    setAttempts(0);
    setScore(0);
    setLocked(false);
  }

  return (
    <GameShell
      spec={spec}
      progress={{ value: matched.size, max: totalPairs }}
      progressLabel={`${matched.size} of ${totalPairs} pairs matched`}
      score={score}
      secondsLeft={secondsLeft}
      finished={over}
      summary={
        <Summary
          score={score}
          maxScore={maxScore}
          passThreshold={spec.scoring.passThreshold}
          detail={
            allMatched
              ? `All ${totalPairs} pairs matched in ${attempts} attempts.`
              : timeUp
                ? `Time ran out with ${matched.size} of ${totalPairs} matched.`
                : `Out of attempts with ${matched.size} of ${totalPairs} matched.`
          }
          onRestart={restart}
        />
      }
    >
      <div
        className={g.grid}
        style={{
          gridTemplateColumns: `repeat(${spec.rules.gridColumns}, minmax(0, 1fr))`,
        }}
      >
        {cards.map((card) => {
          const isMatched = matched.has(card.pair);
          const isFaceUp = isMatched || flipped.includes(card.id);
          return (
            <button
              key={card.id}
              className={[
                g.pairCard,
                !isFaceUp ? g.pairFaceDown : "",
                isMatched ? g.pairMatched : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => flip(card)}
              disabled={isMatched || locked}
              aria-label={isFaceUp ? card.text : "Hidden card, select to reveal"}
            >
              {isFaceUp ? card.text : "?"}
            </button>
          );
        })}
      </div>
      {spec.rules.maxAttempts !== null && (
        <p className={g.hint}>
          Attempts: {attempts} of {spec.rules.maxAttempts}
        </p>
      )}
    </GameShell>
  );
}
