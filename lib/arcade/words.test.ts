import { describe, expect, it } from "vitest";
import { readLanguage, readTimeLimit } from "./generate";

/**
 * The two readers that turn a person's sentence into settings. Both were caught
 * out by REAL model output rather than by review:
 *
 * - "a brutal two minute duel" produced a game whose own title promised two
 *   minutes and which had no clock, because the pattern demanded "minutes".
 * - "permainan lari yang laju untuk Tahun 4" came back with an English title,
 *   because the form's language select defaults to English and nothing looked
 *   at the words.
 */

describe("reading a round budget from the words", () => {
  it.each([
    ["a brutal two minute duel against Nadia", 120],
    ["a two minutes game", 120],
    ["a one minute round", 60],
    ["give me a minute of play", 60],
    ["three minutes please", 180],
    ["90 seconds", 90],
    ["a 45 second game", 45],
    ["2 minutes", 120],
    ["permainan dua minit", 120],
    ["seminit sahaja", 60],
    ["a timed game", 120],
    ["a quick round", 60],
  ])("%j -> %is", (prompt, seconds) => {
    expect(readTimeLimit(prompt)).toBe(seconds);
  });

  it.each([
    "a hard flappy bird with PBot",
    "a snake game on a grid",
    // "quick" alone is about pace, not length.
    "a quick and brutal flyer",
  ])("leaves %j endless", (prompt) => {
    expect(readTimeLimit(prompt)).toBeUndefined();
  });

  it("clamps a silly duration into the schema's range", () => {
    expect(readTimeLimit("a 9000 second game")).toBe(300);
    expect(readTimeLimit("a 2 second game")).toBe(20);
  });
});

describe("reading the language from the words", () => {
  it.each([
    "permainan lari yang laju untuk Tahun 4",
    "permainan ular untuk Tahun 2",
    "satu perlawanan lawan Aidan",
    "buat permainan terbang yang senang",
  ])("detects Malay in %j", (prompt) => {
    expect(readLanguage(prompt)).toBe("ms");
  });

  it.each([
    "a hard flappy bird with PBot through chemistry pink pipes",
    "a gentle snake game for Year 1, forest green",
    "a mortal kombat style fighting game",
  ])("does not claim Malay for %j", (prompt) => {
    expect(readLanguage(prompt)).toBeUndefined();
  });

  it("returns undefined rather than 'en', so a non-detection overrides nothing", () => {
    expect(readLanguage("a flappy bird")).toBeUndefined();
  });
});
