import { describe, expect, it } from "vitest";
import raw from "./tokens.raw.json";
import { cardLabel, displayHex } from "./colour";
import { FIRST_SUBJECT_CARD, PRIMITIVE_CARDS, SEMANTIC_SETS } from "./colour-cards";
import { DARK_VALUES, PRIMITIVE_HSLA, PRIMITIVES, TOKEN_VARS } from "./tokens.generated";

/** Same hash as scripts/sync-tokens.md and the Figma resolver. */
function digest(map: Record<string, string>) {
  const s = Object.entries(map).map(([k, v]) => `${k}=${v}`).sort().join("\n");
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

const set = (slug: string) => SEMANTIC_SETS.find((s) => s.slug === slug)!;

describe("the colour cards", () => {
  it("are the cards Figma has, set by set", () => {
    expect(PRIMITIVE_CARDS).toHaveLength(43);
    expect(FIRST_SUBJECT_CARD).toBe(24);
    const counts = Object.fromEntries(SEMANTIC_SETS.map((s) => [s.slug, s.cards.length]));
    expect(counts).toEqual({
      surface: 13, text: 10, icon: 10, border: 13, subjects: 19, medals: 2, status: 1, accents: 1,
    });
  });

  it("have unique slugs and Figma node ids", () => {
    const slugs = SEMANTIC_SETS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const nodes = [...PRIMITIVE_CARDS, ...SEMANTIC_SETS.flatMap((s) => s.cards)].map((c) => c.node);
    expect(new Set(nodes).size).toBe(nodes.length);
  });

  it("name only primitives the generated layer has", () => {
    for (const c of PRIMITIVE_CARDS) {
      for (const t of c.tokens) expect(PRIMITIVES[t], `${c.title}: ${t}`).toBeDefined();
    }
  });

  it("name only semantic tokens with a Light variable AND a Dark value", () => {
    for (const s of SEMANTIC_SETS) {
      for (const c of s.cards) {
        for (const t of c.tokens) {
          expect(t in TOKEN_VARS, `${s.slug} / ${c.title}: ${t} has no CSS variable`).toBe(true);
          expect(DARK_VALUES[t], `${s.slug} / ${c.title}: ${t} has no dark value`).toBeDefined();
        }
      }
    }
  });

  it("show the values whose digests Figma computed", () => {
    // A hand-edit of tokens.raw.json, or a bad paste from the resolver, changes
    // a digest. Every expected value below was computed inside Figma.
    expect(digest(PRIMITIVES)).toBe(raw.$meta.primitive.digest);
    for (const part of raw.$meta.colorDark.parts) {
      const tokens = part.sets.flatMap((slug) => set(slug).cards.flatMap((c) => c.tokens));
      const values = Object.fromEntries(tokens.map((t) => [t, DARK_VALUES[t]]));
      expect(Object.keys(values), part.sets.join(",")).toHaveLength(part.count);
      expect(digest(values), part.sets.join(",")).toBe(part.digest);
    }
  });
});

describe("formatting a colour like the Figma cards", () => {
  // Every row of the OG Green and Foundation cards, read off Figma: hue,
  // saturation, lightness, alpha. Numbers rather than the printed text, which
  // check:ds would rightly read as a colour value outside the token layer.
  const printed: [string, number[]][] = [
    ["OG-Green/50", [143, 67, 93, 100]],
    ["OG-Green/100", [160, 65, 91, 100]],
    ["OG-Green/200", [159, 67, 76, 100]],
    ["OG-Green/300", [159, 66, 64, 100]],
    ["OG-Green/400", [159, 67, 52, 100]],
    ["OG-Green/500 (Base)", [159, 100, 40, 100]],
    ["OG-Green/600", [159, 100, 32, 100]],
    ["OG-Green/700", [159, 100, 24, 100]],
    ["OG-Green/800", [159, 100, 16, 100]],
    ["OG-Green/900", [160, 100, 8, 100]],
    ["Foundation/white", [0, 0, 100, 100]],
    ["Foundation/white 50", [0, 0, 100, 50]],
    ["Foundation/black", [0, 0, 10, 100]],
    ["Foundation/black 50", [0, 0, 10, 50]],
    ["Foundation/slate", [220, 12, 30, 100]],
  ];

  it.each(printed)("%s", (name, want) => {
    const m = PRIMITIVE_HSLA[name].match(/^hsla\((\d+), (\d+), (\d+), (\d+)%\)$/);
    expect(m, PRIMITIVE_HSLA[name]).not.toBeNull();
    expect(m!.slice(1).map(Number)).toEqual(want);
  });

  it("has an hsla for every primitive", () => {
    expect(Object.keys(PRIMITIVE_HSLA).sort()).toEqual(Object.keys(PRIMITIVES).sort());
  });

  it("prints hex upper-case and drops the (Base) marker, as the cards do", () => {
    expect(displayHex(PRIMITIVES["Foundation/white 50"])).toBe(
      PRIMITIVES["Foundation/white 50"].toUpperCase(),
    );
    expect(cardLabel("OG-Green/500 (Base)")).toBe("OG-Green/500");
    expect(cardLabel("Grey/550")).toBe("Grey/550");
  });
});
