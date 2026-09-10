import { describe, expect, it } from "vitest";
import { CATALOGUE } from "./catalogue";
import { chooseEngine, chooseGame } from "./brief";
import { generateArcade } from "./generate";
import { ENGINES } from "./schema";

/**
 * The catalogue is only worth having if it is TRUE.
 *
 * It claims that every genre in it gets an engine, an announced adaptation or a
 * named refusal. These tests are what make that a fact rather than an
 * intention - and the last one is the important one: no genre anybody has
 * thought of may end up as a flyer nobody asked for.
 */

describe("the catalogue routes the way it says it does", () => {
  for (const genre of CATALOGUE) {
    for (const example of genre.examples) {
      it(`${JSON.stringify(example)} -> ${genre.disposition.kind}`, () => {
        const choice = chooseGame(example);
        const d = genre.disposition;

        if (d.kind === "template") {
          expect(choice.kind).toBe("template");
          if (choice.kind === "template") expect(choice.template).toBe(d.template);
          return;
        }

        if (d.kind === "refuse") {
          expect(choice.kind).toBe("no-engine");
          if (choice.kind !== "no-engine") return;
          expect(choice.requested).toBe(genre.label);
          // A refusal has to say what is MISSING. "No engine for that yet" is
          // a door closing; naming the three systems a tower defence needs is
          // something a person can argue with or build.
          expect(
            (choice.why ?? "").length,
            "a refusal with no reason is a dead end",
          ).toBeGreaterThan(40);
          return;
        }

        expect(choice.kind).toBe("engine");
        if (choice.kind !== "engine") return;
        expect(choice.engine).toBe(d.engine);
        // `d` is an engine or an adaptation by here; both carry an engine.

        if (d.kind === "adapt") {
          expect(choice.adapted?.requested).toBe(genre.label);
          // The sentence has to EXPLAIN the substitution, not merely admit it.
          expect(choice.adapted?.how.length ?? 0).toBeGreaterThan(30);
        }
      });
    }
  }
});

describe("nothing in the imagined space becomes a silent guess", () => {
  /**
   * The failure this exists to prevent, and it was the commonest outcome in the
   * whole product before the catalogue: "pac man", "tetris", "a penalty
   * shootout", "a horror game" all matched nothing at all, so they fell through
   * to `endless-flyer` with `confident: false`.
   *
   * A refusal is a bad answer someone can act on. A flyer with one apologetic
   * line above it is a WRONG answer wearing the costume of a right one.
   */
  it("every catalogue example routes deliberately", () => {
    const guessed: string[] = [];
    for (const genre of CATALOGUE) {
      for (const example of genre.examples) {
        const choice = chooseGame(example);
        if (choice.kind === "engine" && !choice.confident) guessed.push(example);
      }
    }
    expect(guessed, "these fell through to the default flyer").toEqual([]);
  });

  it("still admits a guess when a prompt genuinely names no game", () => {
    // The escape hatch has to stay open, or the honesty above is just strictness.
    for (const vague of ["a fun game for Year 3", "asdfgh", "something for my class"]) {
      const choice = chooseEngine(vague);
      expect(choice.kind, vague).toBe("engine");
      if (choice.kind === "engine") expect(choice.confident, vague).toBe(false);
    }
  });
});

describe("every engine is reachable and produces a playable spec", () => {
  /**
   * An engine nothing routes to is an engine nobody can ask for, and an engine
   * the free tuner cannot produce a VALID spec for is one that only works when
   * somebody is paying. Both have happened in other shapes; this closes both.
   */
  const reached = new Map<string, string>();
  for (const genre of CATALOGUE) {
    if (genre.disposition.kind !== "engine") continue;
    const example = genre.examples[0];
    if (example && !reached.has(genre.disposition.engine))
      reached.set(genre.disposition.engine, example);
  }

  it("every engine has a prompt that reaches it", () => {
    expect([...reached.keys()].sort()).toEqual([...ENGINES].sort());
  });

  for (const [engine, prompt] of reached) {
    for (const difficulty of ["easy", "normal", "hard"] as const) {
      it(`${engine} (${difficulty}) tunes to a spec that passes every check`, async () => {
        const out = await generateArcade({ prompt, difficulty, language: "en" });
        if (out.status === "invalid") {
          throw new Error(
            `the free tuner produced an unplayable ${engine}:\n` +
              out.issues.map((i) => `  ${i.path}: ${i.message}`).join("\n"),
          );
        }
        expect(out.status).toBe("ok");
        if (out.status === "ok") expect(out.spec.engine).toBe(engine);
      });
    }
  }
});
