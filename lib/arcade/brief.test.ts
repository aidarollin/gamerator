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

  it("still refuses genres with no engine, by name", () => {
    for (const [prompt, label] of [
      ["a racing game with karts", "racing"],
      ["a space invaders shooter", "shooter"],
      ["a tetris puzzle", "puzzle"],
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
