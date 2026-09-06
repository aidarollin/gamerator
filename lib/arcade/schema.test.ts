import { describe, expect, it } from "vitest";
import { ArcadeSpec, ArcadeSpecShape } from "./schema";
import {
  ARCADE_ACCEPTED,
  ARCADE_FIXTURE_NAMES,
  readArcadeFixture,
} from "./fixtures";

const rejected = ARCADE_FIXTURE_NAMES.filter((n) => !ARCADE_ACCEPTED.includes(n));

describe("accepted fixtures", () => {
  it.each(ARCADE_ACCEPTED)("%s parses", (name) => {
    const r = ArcadeSpec.safeParse(readArcadeFixture(name));
    if (!r.success) {
      throw new Error(
        `${name} should parse:\n` +
          r.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n"),
      );
    }
    expect(r.success).toBe(true);
  });
});

describe("rejected fixtures", () => {
  it.each(rejected)("%s is rejected", (name) => {
    expect(ArcadeSpec.safeParse(readArcadeFixture(name)).success).toBe(false);
  });

  it("each is rejected for the reason it was written for", () => {
    const expected: Record<string, RegExp> = {
      "endless-flyer.invalid": /gravity|less than or equal|too big/i,
      "endless-flyer.unplayable": /misses obstacle|cannot hold a line|too tight|cannot reach/,
      "endless-flyer.trivial": /trivially easy/,
    };
    for (const [name, pattern] of Object.entries(expected)) {
      const r = ArcadeSpec.safeParse(readArcadeFixture(name));
      expect(r.success, `${name} must not parse`).toBe(false);
      if (r.success) continue;
      expect(
        r.error.issues.map((i) => i.message).join(" | "),
        `${name} rejected for the wrong reason`,
      ).toMatch(pattern);
    }
  });
});

describe("the structural / full split", () => {
  it("the shape accepts an unplayable spec that the full schema rejects", () => {
    // The same split as the learning schema: JSON Schema cannot express a
    // simulation, so the model is constrained structurally and validated fully.
    // This is the gap the repair turn closes.
    const impossible = readArcadeFixture("endless-flyer.unplayable");
    expect(ArcadeSpecShape.safeParse(impossible).success).toBe(true);
    expect(ArcadeSpec.safeParse(impossible).success).toBe(false);
  });
});

describe("theme", () => {
  it("rejects a palette that is not a DS identity", () => {
    const s = structuredClone(readArcadeFixture("endless-flyer.valid")) as {
      theme: { palette: string };
    };
    s.theme.palette = "hotpink";
    expect(ArcadeSpec.safeParse(s).success).toBe(false);
  });

  it("accepts every subject as a palette", () => {
    const base = readArcadeFixture("endless-flyer.valid") as { theme: unknown };
    for (const palette of ["b-melayu", "chemistry", "rbt", "primary", "gold"]) {
      const s = structuredClone(base) as { theme: { palette: string } };
      s.theme.palette = palette;
      expect(ArcadeSpec.safeParse(s).success, palette).toBe(true);
    }
  });
});

describe("content twist is optional", () => {
  it("a spec without one is valid", () => {
    expect(ArcadeSpec.safeParse(readArcadeFixture("endless-flyer.valid")).success).toBe(
      true,
    );
  });

  it("a spec with one is valid", () => {
    expect(ArcadeSpec.safeParse(readArcadeFixture("endless-flyer.twist")).success).toBe(
      true,
    );
  });
});
