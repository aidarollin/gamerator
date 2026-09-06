import { describe, expect, it } from "vitest";
import { GameSpec, TEMPLATES } from "./schema";
import { listFixtures, readFixture } from "./fixtures";

const fixtures = listFixtures();

describe("fixture coverage", () => {
  it("the generated barrel matches the fixtures directory", async () => {
    // The barrel is generated, so it can fall out of sync with the directory
    // and the drift is invisible: a new fixture simply never gets tested and
    // never appears in the preview. This is the only place that can notice.
    // Node-only APIs are fine here - tests do not run in the Worker.
    const { readdirSync } = await import("node:fs");
    const { join } = await import("node:path");
    const onDisk = readdirSync(join(process.cwd(), "lib/spec/fixtures"))
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort();
    expect(
      fixtures.map((f) => f.name),
      "run `npm run fixtures` to regenerate lib/spec/fixtures.generated.ts",
    ).toEqual(onDisk);
  });

  it("has three fixtures for every template", () => {
    for (const template of TEMPLATES) {
      const kinds = fixtures
        .filter((f) => f.template === template)
        .map((f) => f.kind)
        .sort();
      expect(kinds, `fixtures for ${template}`).toEqual([
        "edge",
        "invalid",
        "valid",
      ]);
    }
  });
});

describe("valid and edge fixtures parse", () => {
  const accepted = fixtures.filter((f) => f.kind !== "invalid");

  it.each(accepted)("$name parses", ({ name }) => {
    const result = GameSpec.safeParse(readFixture(name));
    // Print the real issues rather than a bare "expected true" - a failing
    // schema test is useless if it does not say which field.
    if (!result.success) {
      throw new Error(
        `${name} should parse but did not:\n` +
          result.error.issues
            .map((i) => `  ${i.path.join(".")}: ${i.message}`)
            .join("\n"),
      );
    }
    expect(result.success).toBe(true);
  });
});

describe("invalid fixtures are rejected", () => {
  const rejected = fixtures.filter((f) => f.kind === "invalid");

  it.each(rejected)("$name is rejected", ({ name }) => {
    const result = GameSpec.safeParse(readFixture(name));
    expect(result.success, `${name} must not parse`).toBe(false);
  });

  // A fixture that is rejected for the wrong reason still passes the test
  // above, which would quietly stop testing the rule it was written for.
  it("each invalid fixture is rejected for the reason it was written for", () => {
    const expected: Record<string, RegExp> = {
      "quiz-race.invalid": /correctIndex 2 is out of range/,
      "match-pairs.invalid": /left sides must be distinct/,
      "sort-buckets.invalid": /does not match any bucket/,
      "sequence-order.invalid": /positions must be exactly 1\.\.3/,
      "fill-blank.invalid": /distractor equal to the answer/,
    };
    for (const [name, pattern] of Object.entries(expected)) {
      const result = GameSpec.safeParse(readFixture(name));
      expect(result.success, `${name} must not parse`).toBe(false);
      if (result.success) continue;
      const messages = result.error.issues.map((i) => i.message).join(" | ");
      expect(messages, `${name} rejected for the wrong reason`).toMatch(pattern);
    }
  });
});

describe("cross-field rules", () => {
  const valid = () => structuredClone(readFixture("quiz-race.valid")) as never;

  function expectRejected(spec: unknown, pattern: RegExp) {
    const r = GameSpec.safeParse(spec);
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.error.issues.map((i) => i.message).join(" | ")).toMatch(pattern);
  }

  it("rejects correctIndex past the end of a short options array", () => {
    // Passes the 0..3 field bound and still has no correct answer. This is the
    // shape of bug that survives review.
    const s = valid() as {
      content: { questions: { options: string[]; correctIndex: number }[] };
    };
    s.content.questions[0].options = ["a", "b"];
    s.content.questions[0].correctIndex = 3;
    expectRejected(s, /out of range/);
  });

  it("rejects duplicate options in one question", () => {
    const s = valid() as { content: { questions: { options: string[] }[] } };
    s.content.questions[0].options = ["Utarid", "utarid ", "Bumi", "Marikh"];
    expectRejected(s, /options must be distinct/);
  });

  it("rejects an empty bucket", () => {
    const s = structuredClone(readFixture("sort-buckets.valid")) as {
      content: { buckets: { id: string }[]; items: { bucketId: string }[] };
    };
    s.content.items = s.content.items.filter((i) => i.bucketId !== "udara");
    expectRejected(s, /has no items/);
  });

  it("rejects a gap in sequence positions", () => {
    const s = structuredClone(readFixture("sequence-order.valid")) as {
      content: { steps: { position: number }[] };
    };
    s.content.steps[4].position = 6;
    expectRejected(s, /positions must be exactly/);
  });

  it("rejects distractors when the word bank is off", () => {
    const s = structuredClone(readFixture("fill-blank.edge")) as {
      content: { sentences: { distractors: string[] }[] };
    };
    s.content.sentences[0].distractors = ["11"];
    expectRejected(s, /meaningless with wordBank/);
  });
});

describe("envelope", () => {
  it("rejects an unknown subject", () => {
    const s = structuredClone(readFixture("quiz-race.valid")) as {
      meta: { subject: string };
    };
    // The DS key is "b-melayu". This is the exact mistake the enum prevents,
    // and the reason meta.subject is not a free string.
    s.meta.subject = "bahasa-melayu";
    expect(GameSpec.safeParse(s).success).toBe(false);
  });

  it("rejects an unknown template", () => {
    const s = structuredClone(readFixture("quiz-race.valid")) as {
      template: string;
    };
    s.template = "crossword";
    expect(GameSpec.safeParse(s).success).toBe(false);
  });

  it("rejects a missing specVersion", () => {
    const s = structuredClone(readFixture("quiz-race.valid")) as Record<
      string,
      unknown
    >;
    delete s.specVersion;
    expect(GameSpec.safeParse(s).success).toBe(false);
  });

  it("rejects a year level outside 1..13", () => {
    const s = structuredClone(readFixture("quiz-race.valid")) as {
      meta: { yearLevel: number };
    };
    s.meta.yearLevel = 14;
    expect(GameSpec.safeParse(s).success).toBe(false);
  });

  it("accepts Tingkatan 5 as year 11..13", () => {
    const s = structuredClone(readFixture("quiz-race.valid")) as {
      meta: { yearLevel: number };
    };
    s.meta.yearLevel = 13;
    expect(GameSpec.safeParse(s).success).toBe(true);
  });
});
