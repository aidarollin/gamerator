import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { chooseEngine } from "./brief";
import { ENGINES } from "./schema";

/**
 * Engine routing has now been broken TWICE by the same accident, and both times
 * it shipped: a shell heredoc turned `\b` in a regex into a literal BACKSPACE
 * character (0x08). `/\bduel\b/` became `/<BS>duel<BS>/`, which matches nothing,
 * so every fighting prompt fell through to the "no genre named" default and
 * quietly got a flyer.
 *
 * It is invisible in a diff, invisible in a code review, and invisible to
 * TypeScript - the regex is still valid, it just cannot match. The only thing
 * that catches it is asking the router what it does with a real sentence.
 *
 * `docs/SCREENSHOTS.md` has the visual version of this lesson. This is the
 * textual one.
 */

describe("engine routing", () => {
  it.each([
    ["a hard flappy bird with PBot", "endless-flyer"],
    ["a flying game through gaps", "endless-flyer"],
    ["an endless runner that gets faster", "endless-runner"],
    ["permainan lari yang laju untuk Tahun 4", "endless-runner"],
    ["a mario style platformer with coins", "platformer"],
    ["a breakout game with a paddle", "brick-breaker"],
    ["a snake game on a grid", "snake"],
    ["permainan ular untuk Tahun 2", "snake"],
    ["a mortal kombat style fighting game", "duel"],
    ["a brutal two minute duel against Nadia at night", "duel"],
    ["street fighter but with PBot", "duel"],
    ["satu perlawanan lawan Aidan", "duel"],
  ])("routes %j to %s", (prompt, engine) => {
    const choice = chooseEngine(prompt);
    expect(choice.kind).toBe("engine");
    if (choice.kind === "engine") expect(choice.engine).toBe(engine);
  });

  it("says so when nothing names a genre, instead of guessing silently", () => {
    const choice = chooseEngine("a fun game for Year 3");
    expect(choice.kind).toBe("engine");
    // The fallback is a flyer, but `confident: false` is what makes the page
    // tell the reader it was a guess.
    if (choice.kind === "engine") expect(choice.confident).toBe(false);
  });

  /**
   * Zul asked for "motorcycle racing game" and got a refusal, which was a bad
   * answer: a race IS an endless runner in everything but the name. Genres
   * whose VERBS match an existing engine are adapted; the rest stay refused.
   */
  it.each([
    ["motorcycle racing game", "endless-runner", "racing"],
    ["a racing game with karts", "endless-runner", "racing"],
    ["permainan lumba kereta", "endless-runner", "racing"],
    ["a space invaders shooter", "brick-breaker", "shooter"],
    ["an open world adventure", "platformer", "adventure"],
  ])("adapts %j to %s, and says so", (prompt, engine, label) => {
    const choice = chooseEngine(prompt);
    expect(choice.kind).toBe("engine");
    if (choice.kind !== "engine") return;
    expect(choice.engine).toBe(engine);
    expect(choice.adapted?.requested).toMatch(label);
    // The sentence shown to the reader has to explain the substitution, not
    // merely admit it.
    expect(choice.adapted?.how.length ?? 0).toBeGreaterThan(20);
  });

  it("lets an explicitly named engine beat a genre mapping", () => {
    // The author said flappy bird. They know what they want better than a
    // keyword table does.
    const choice = chooseEngine("a racing game like flappy bird");
    expect(choice.kind).toBe("engine");
    if (choice.kind === "engine") {
      expect(choice.engine).toBe("endless-flyer");
      expect(choice.adapted).toBeUndefined();
    }
  });

  it("still refuses genres whose verbs match nothing, by name", () => {
    for (const [prompt, label] of [
      ["a tetris puzzle", "puzzle"],
      ["a tower defence game", "tower defence"],
      ["a chess board game", "card or board"],
    ] as const) {
      const choice = chooseEngine(prompt);
      expect(choice.kind, prompt).toBe("no-engine");
      if (choice.kind === "no-engine") expect(choice.requested).toMatch(label);
    }
  });

  it("every engine is reachable from some prompt", () => {
    const reached = new Set(
      [
        "a flappy bird",
        "an endless runner",
        "a mario platformer",
        "a breakout paddle game",
        "a snake on a grid",
        "a fighting game",
      ]
        .map((p) => chooseEngine(p))
        .flatMap((c) => (c.kind === "engine" ? [c.engine] : [])),
    );
    // An engine nothing routes to is an engine nobody can ask for.
    expect([...reached].sort()).toEqual([...ENGINES].sort());
  });

  /**
   * The direct guard against the corruption itself. A control character in a
   * source file is never intentional here, and this catches it in any file the
   * routing depends on - not just the regexes that have already been broken.
   */
  it("contains no stray control characters", () => {
    for (const file of ["lib/arcade/brief.ts", "lib/arcade/generate.ts"]) {
      const text = readFileSync(file, "utf8");
      // Tab, newline and carriage return are legitimate; nothing else is.
      const bad = [...text].filter(
        (ch) => ch < " " && ch !== "\t" && ch !== "\n" && ch !== "\r",
      );
      expect(
        bad.map((c) => "0x" + c.charCodeAt(0).toString(16)),
        `${file} has control characters - a shell heredoc has eaten a backslash escape`,
      ).toEqual([]);
    }
  });
});
