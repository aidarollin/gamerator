import { FIXTURES, FIXTURE_NAMES } from "./fixtures.generated";

/**
 * Fixture access.
 *
 * Fixtures are the reason the renderer can be trusted: it is exercised against
 * specs a human wrote and can reason about, with no model in the loop. A
 * renderer that has only ever been fed generated output has never been tested
 * against anything you controlled, and when a game looks wrong you cannot tell
 * which half is broken.
 *
 * These come from a GENERATED barrel of static imports rather than a directory
 * read, because a Cloudflare Worker has no filesystem - `readdirSync` succeeds
 * under `next dev` and throws `ENOENT` in the deployed Worker. Add a fixture
 * and run `npm run fixtures`; a test fails if the barrel falls out of sync.
 */

export type FixtureKind = "valid" | "edge" | "invalid";

export type FixtureRef = {
  /** e.g. "quiz-race.valid" */
  name: string;
  template: string;
  kind: FixtureKind;
};

export function listFixtures(): FixtureRef[] {
  return FIXTURE_NAMES.map((name) => {
    const idx = name.lastIndexOf(".");
    return {
      name,
      template: name.slice(0, idx),
      kind: name.slice(idx + 1) as FixtureKind,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

/** Returns raw, unvalidated JSON. Callers must parse it - that is the point. */
export function readFixture(name: string): unknown {
  // The name arrives from a URL on the preview route, so it is untrusted. A
  // map lookup cannot traverse a path, but the shape check keeps the failure
  // legible rather than returning undefined.
  if (!/^[a-z0-9-]+\.(valid|edge|invalid)$/.test(name)) {
    throw new Error(`invalid fixture name: ${name}`);
  }
  const fixture = FIXTURES[name];
  if (fixture === undefined) throw new Error(`no such fixture: ${name}`);
  return fixture;
}
