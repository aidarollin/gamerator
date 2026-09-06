import { describe, expect, it } from "vitest";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { GameSpec, GameSpecShape } from "./schema";

/**
 * What the model is handed, versus what the server validates against.
 *
 * `GameSpec` carries `superRefine` rules - correctIndex within range, no empty
 * bucket, positions exactly 1..n. None of those can be expressed in JSON
 * Schema, so they cannot be part of what constrains the model. `GameSpecShape`
 * is the structural half: the discriminated union, convertible to JSON Schema,
 * and what goes into `output_config.format`.
 *
 * The model is therefore constrained structurally and validated fully. The gap
 * between the two is exactly what the repair turn exists to close, and this
 * test pins that split so nobody collapses it by accident.
 */

describe("output_config format", () => {
  it("converts the structural schema to a JSON Schema output format", () => {
    expect(() => zodOutputFormat(GameSpecShape, "game_spec")).not.toThrow();
  });

  it("the structural schema accepts a spec the full schema rejects", () => {
    // quiz-race.invalid has correctIndex 2 against 2 options: structurally
    // fine, semantically broken. If this ever starts failing structurally, the
    // repair turn has less work to do - but the split still needs stating.
    const broken = {
      specVersion: "1.0",
      template: "quiz-race",
      meta: {
        title: "Broken index",
        description: "x",
        language: "en",
        subject: "math",
        yearLevel: 3,
        learningObjective: "x",
        estimatedMinutes: 3,
      },
      presentation: { mascot: true },
      scoring: { pointsCorrect: 10, pointsIncorrect: 0, passThreshold: 0.6 },
      rules: {
        secondsTotal: 60,
        shuffleQuestions: false,
        shuffleOptions: false,
        streakMultiplier: false,
        revealAnswer: "at-end",
      },
      content: {
        questions: [
          { prompt: "2 + 2", options: ["4", "5"], correctIndex: 2 },
          { prompt: "3 + 3", options: ["6", "7"], correctIndex: 0 },
          { prompt: "4 + 4", options: ["8", "9"], correctIndex: 0 },
          { prompt: "5 + 5", options: ["10", "11"], correctIndex: 0 },
        ],
      },
    };
    expect(GameSpecShape.safeParse(broken).success).toBe(true);
    expect(GameSpec.safeParse(broken).success).toBe(false);
  });
});
