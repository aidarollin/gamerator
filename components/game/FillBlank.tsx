"use client";

import { useMemo, useState } from "react";
import type { FillBlankSpec } from "@/lib/spec/schema";
import { seededShuffle, specSeed } from "@/lib/game/random";
import { GameShell, Summary, useCountdown } from "./GameShell";
import g from "./game.module.css";

export function FillBlank({ spec }: { spec: FillBlankSpec }) {
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const sentences = spec.content.sentences;
  const total = sentences.length;
  const finished = index >= total;
  const secondsLeft = useCountdown(spec.rules.secondsTotal, !finished);
  const timeUp = secondsLeft === 0;
  const over = finished || timeUp;
  const current = over ? null : sentences[index];
  const maxScore = total * spec.scoring.pointsCorrect;

  /**
   * "shared" pools every answer across the whole game, so a word bank is a real
   * choice rather than a two-option guess. "per-sentence" uses only that
   * sentence's own answer plus its distractors. "none" offers no bank at all,
   * and the schema rejects distractors in that case.
   */
  const choices = useMemo(() => {
    if (!current || spec.rules.wordBank === "none") return [];
    const pool =
      spec.rules.wordBank === "shared"
        ? Array.from(
            new Set([
              ...sentences.map((s) => s.answer),
              ...sentences.flatMap((s) => s.distractors),
            ]),
          )
        : Array.from(new Set([current.answer, ...current.distractors]));
    return seededShuffle(pool, specSeed(spec.meta.title, `bank:${index}:${round}`));
  }, [current, sentences, spec, index, round]);

  function matches(a: string, b: string) {
    return spec.rules.caseSensitive
      ? a.trim() === b.trim()
      : a.trim().toLowerCase() === b.trim().toLowerCase();
  }

  function choose(word: string) {
    if (picked !== null || !current) return;
    setPicked(word);
    if (matches(word, current.answer)) {
      setScore((s) => s + spec.scoring.pointsCorrect);
      setCorrectCount((c) => c + 1);
    } else {
      setScore((s) => s + spec.scoring.pointsIncorrect);
    }
  }

  function advance() {
    setPicked(null);
    setIndex((i) => i + 1);
  }

  function restart() {
    setRound((r) => r + 1);
    setIndex(0);
    setScore(0);
    setPicked(null);
    setCorrectCount(0);
  }

  const isRight = picked !== null && current !== null && matches(picked, current.answer);

  return (
    <GameShell
      spec={spec}
      progress={{ value: Math.min(index, total), max: total }}
      progressLabel={`Sentence ${Math.min(index + 1, total)} of ${total}`}
      score={score}
      secondsLeft={secondsLeft}
      finished={over}
      summary={
        <Summary
          score={score}
          maxScore={maxScore}
          passThreshold={spec.scoring.passThreshold}
          detail={
            timeUp && !finished
              ? `Time ran out. ${correctCount} of ${total} filled correctly.`
              : `${correctCount} of ${total} filled correctly.`
          }
          onRestart={restart}
        />
      }
    >
      {current && (
        <>
          <p className={g.sentence}>
            {current.before}
            <span
              className={`${g.blank} ${picked === null ? g.blankEmpty : ""}`}
              aria-label={picked ?? "blank"}
            >
              {picked ?? " ".repeat(6)}
            </span>
            {current.after}
          </p>

          {spec.rules.wordBank === "none" ? (
            <p className={g.hint}>
              This game has no word bank. Reveal the answer to check yourself.
            </p>
          ) : (
            <div className={g.options}>
              {choices.map((word) => {
                const revealed = picked !== null;
                const thisIsAnswer = matches(word, current.answer);
                const thisPicked = picked === word;
                return (
                  <button
                    key={word}
                    className={[
                      g.option,
                      revealed && thisIsAnswer ? g.optionCorrect : "",
                      revealed && thisPicked && !thisIsAnswer ? g.optionWrong : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={revealed}
                    onClick={() => choose(word)}
                  >
                    <span>{word}</span>
                    {revealed && thisIsAnswer && (
                      <span className={g.marker}>correct</span>
                    )}
                    {revealed && thisPicked && !thisIsAnswer && (
                      <span className={g.marker}>your answer</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {(picked !== null || spec.rules.wordBank === "none") && (
            <button className={g.option} onClick={advance} style={{ width: "auto" }}>
              {spec.rules.wordBank === "none"
                ? `Answer: ${current.answer} - next`
                : index + 1 >= total
                  ? "See result"
                  : isRight
                    ? "Next sentence"
                    : `The answer was "${current.answer}" - next`}
            </button>
          )}
        </>
      )}
    </GameShell>
  );
}
