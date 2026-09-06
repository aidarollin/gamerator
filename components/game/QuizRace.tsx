"use client";

import { useMemo, useState } from "react";
import type { QuizRaceSpec } from "@/lib/spec/schema";
import { seededShuffle, specSeed } from "@/lib/game/random";
import { GameShell, Summary, useCountdown } from "./GameShell";
import g from "./game.module.css";

export function QuizRace({ spec }: { spec: QuizRaceSpec }) {
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  // Shuffled once per round, seeded from the spec so the order is reproducible
  // and identical on server and client. `round` re-seeds on replay.
  const questions = useMemo(() => {
    const qs = spec.content.questions.map((q, qi) => {
      const options = spec.rules.shuffleOptions
        ? seededShuffle(
            q.options.map((text, oi) => ({ text, oi })),
            specSeed(spec.meta.title, `options:${qi}:${round}`),
          )
        : q.options.map((text, oi) => ({ text, oi }));
      return { ...q, shuffled: options };
    });
    return spec.rules.shuffleQuestions
      ? seededShuffle(qs, specSeed(spec.meta.title, `questions:${round}`))
      : qs;
  }, [spec, round]);

  const total = questions.length;
  const finished = index >= total;
  const secondsLeft = useCountdown(spec.rules.secondsTotal, !finished);
  const timeUp = secondsLeft === 0;
  const over = finished || timeUp;

  const q = over ? null : questions[index];
  const maxScore = total * spec.scoring.pointsCorrect;

  function choose(optionIndex: number) {
    if (picked !== null || !q) return;
    const isCorrect = q.shuffled[optionIndex].oi === q.correctIndex;
    setPicked(optionIndex);
    if (isCorrect) {
      const nextStreak = streak + 1;
      const multiplier = spec.rules.streakMultiplier
        ? Math.min(3, 1 + Math.floor(nextStreak / 3))
        : 1;
      setStreak(nextStreak);
      setScore((s) => s + spec.scoring.pointsCorrect * multiplier);
      setCorrectCount((c) => c + 1);
    } else {
      setStreak(0);
      setScore((s) => s + spec.scoring.pointsIncorrect);
    }
    // revealAnswer "never" moves on immediately; the other two pause so the
    // player can see what happened.
    if (spec.rules.revealAnswer === "never") advance();
  }

  function advance() {
    setPicked(null);
    setIndex((i) => i + 1);
  }

  function restart() {
    setRound((r) => r + 1);
    setIndex(0);
    setScore(0);
    setStreak(0);
    setPicked(null);
    setCorrectCount(0);
  }

  return (
    <GameShell
      spec={spec}
      progress={{ value: Math.min(index, total), max: total }}
      progressLabel={`Question ${Math.min(index + 1, total)} of ${total}`}
      score={score}
      streak={spec.rules.streakMultiplier ? streak : undefined}
      secondsLeft={secondsLeft}
      finished={over}
      summary={
        <Summary
          score={score}
          maxScore={maxScore}
          passThreshold={spec.scoring.passThreshold}
          detail={
            timeUp && !finished
              ? `Time ran out. ${correctCount} of ${total} answered correctly.`
              : `${correctCount} of ${total} answered correctly.`
          }
          onRestart={restart}
        />
      }
    >
      {q && (
        <>
          <p className={g.prompt}>
            <span className={g.srOnly}>
              Question {index + 1} of {total}.{" "}
            </span>
            {q.prompt}
          </p>
          <div className={g.options}>
            {q.shuffled.map((opt, i) => {
              const revealed =
                picked !== null && spec.rules.revealAnswer === "immediately";
              const isCorrect = opt.oi === q.correctIndex;
              const isPicked = picked === i;
              return (
                <button
                  key={`${opt.oi}-${opt.text}`}
                  className={[
                    g.option,
                    isPicked && !revealed ? g.optionSelected : "",
                    revealed && isCorrect ? g.optionCorrect : "",
                    revealed && isPicked && !isCorrect ? g.optionWrong : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={picked !== null}
                  onClick={() => choose(i)}
                >
                  <span>{opt.text}</span>
                  {revealed && isCorrect && <span className={g.marker}>correct</span>}
                  {revealed && isPicked && !isCorrect && (
                    <span className={g.marker}>your answer</span>
                  )}
                </button>
              );
            })}
          </div>
          {q.hint && picked === null && <p className={g.hint}>Hint: {q.hint}</p>}
          {picked !== null && spec.rules.revealAnswer !== "never" && (
            <button className={g.option} onClick={advance} style={{ width: "auto" }}>
              {index + 1 >= total ? "See result" : "Next question"}
            </button>
          )}
        </>
      )}
    </GameShell>
  );
}
