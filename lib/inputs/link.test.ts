import { describe, expect, it } from "vitest";
import { readLink, wordsFromUrl } from "./link";

/**
 * The parts that need no network, which is most of what matters: what gets
 * refused before a request is made, and what a URL says on its own.
 *
 * The fetch itself is not mocked. A test that asserts my own mock returns my
 * own HTML asserts nothing about the internet, and this project has already
 * been burned once by a measurement that only measured itself.
 */

describe("words out of a URL, with nothing fetched", () => {
  it.each([
    ["https://itch.io/games/flappy-bird-clone", /flappy bird clone/],
    ["https://www.example.com/arcade/pac_man_remake.html", /pac man remake/],
    // Case is left alone: every regex in the router is /i, so lowercasing here
    // would only be tidying for its own sake.
    ["https://store.steampowered.com/app/620/Portal_2/", /portal 2/i],
  ])("%s", (url, expected) => {
    expect(wordsFromUrl(url)).toMatch(expected);
  });

  it("is empty rather than throwing on nonsense", () => {
    expect(wordsFromUrl("not a url")).toBe("");
  });
});

describe("what is refused before any request leaves", () => {
  it.each([
    ["not a url", /not a web address/],
    ["ftp://example.com/x", /not fetched/],
    ["file:///etc/passwd", /not fetched/],
    ["http://localhost:3000/admin", /not reachable/],
    ["http://127.0.0.1/", /not reachable/],
    ["http://192.168.1.1/", /not reachable/],
    ["http://169.254.169.254/latest/meta-data/", /not reachable/],
    ["http://db.internal/", /not reachable/],
  ])("%s", async (url, reason) => {
    const out = await readLink(url);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toMatch(reason);
  });
});
