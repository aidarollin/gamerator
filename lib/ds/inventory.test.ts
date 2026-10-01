import { describe, expect, it } from "vitest";
import * as ds from "@/components/ds";
import { COMPONENT_DOCS } from "@/components/ds/docs";
import { DS_GROUPS, DS_INVENTORY, coverage } from "./inventory";

/**
 * The showcase at /ds is only as honest as these two lists agree. A built
 * component with no docs is invisible; docs for a component the inventory
 * calls planned is a page claiming something exists that does not.
 */

const slugs = DS_INVENTORY.map((e) => e.slug);
const docSlugs = COMPONENT_DOCS.map((d) => d.slug);

describe("the DS inventory", () => {
  it("has unique, kebab-case slugs", () => {
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("names each Figma component set once", () => {
    const names = DS_INVENTORY.flatMap((e) => (e.figma ? [e.figma] : []));
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n).toMatch(/1\.5$/);
  });

  it("says how it knows every component exists", () => {
    for (const e of DS_INVENTORY.filter((e) => e.figma)) {
      expect(e.componentKey ?? e.source, e.slug).toBeTruthy();
    }
  });

  it("puts every entry in a known group", () => {
    const groups = new Set<string>(DS_GROUPS.map((g) => g.key));
    for (const e of DS_INVENTORY) expect(groups.has(e.group), e.slug).toBe(true);
  });

  it("says what is missing from anything not fully built", () => {
    for (const e of DS_INVENTORY.filter((e) => e.status !== "built")) {
      expect(e.missing, e.slug).toBeTruthy();
    }
  });

  it("only calls a composed component built - the DS has nothing to plan from", () => {
    for (const e of DS_INVENTORY.filter((e) => e.figma === null)) {
      expect(e.status, e.slug).toBe("built");
    }
  });

  it("points every built or partial entry at real exports", () => {
    const exported = ds as Record<string, unknown>;
    for (const e of DS_INVENTORY.filter((e) => e.status !== "planned")) {
      expect(e.exports?.length, e.slug).toBeGreaterThan(0);
      for (const name of e.exports ?? []) {
        expect(typeof exported[name], `${e.slug} -> ${name}`).toBe("function");
      }
    }
    for (const e of DS_INVENTORY.filter((e) => e.status === "planned")) {
      expect(e.exports, e.slug).toBeUndefined();
    }
  });

  it("counts coverage over DS components only", () => {
    const c = coverage();
    expect(c.built + c.partial + c.planned).toBe(c.total);
    expect(c.total + c.composed).toBe(DS_INVENTORY.length);
  });
});

describe("the showcase docs", () => {
  it("exist for every built or partial component, and only for those", () => {
    const shown = DS_INVENTORY.filter((e) => e.status !== "planned").map((e) => e.slug);
    expect([...docSlugs].sort()).toEqual([...shown].sort());
  });

  it("are registered once each", () => {
    expect(new Set(docSlugs).size).toBe(docSlugs.length);
  });

  it("carry at least one story, a spec and a usage example", () => {
    for (const d of COMPONENT_DOCS) {
      expect(d.stories.length, d.slug).toBeGreaterThan(0);
      expect(d.spec.length, d.slug).toBeGreaterThan(0);
      expect(d.usage, d.slug).toContain("@/components/ds");
    }
  });

  it("build every story without throwing", () => {
    for (const d of COMPONENT_DOCS) {
      for (const s of d.stories) {
        expect(() => s.render({ subject: "chemistry" }), `${d.slug}: ${s.name}`).not.toThrow();
      }
    }
  });
});
