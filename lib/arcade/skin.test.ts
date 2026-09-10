import { describe, expect, it } from "vitest";
import { ArcadeSpec } from "./schema";
import { readArcadeFixture } from "./fixtures";
import { sceneFor } from "./palettes";

/**
 * `theme.skin` is one enum on an optional field, which is exactly the kind of
 * change that gets wired to a form control and then quietly does nothing. The
 * decision it makes lives in `paletteFor`, which needs a DOM to read tokens
 * from and so cannot be tested here - so what IS tested is the half that can
 * be: the spec carries the choice, and the branch it selects really does
 * resolve to something different from the arcade scene.
 */
describe("the Pandai skin", () => {
  const base = readArcadeFixture("endless-flyer.valid") as Record<string, unknown>;
  const theme = base.theme as Record<string, unknown>;

  it("defaults to absent, so no existing spec changes meaning", () => {
    const spec = ArcadeSpec.parse(base);
    expect(spec.theme.skin).toBeUndefined();
  });

  it("round-trips through the schema when asked for", () => {
    const spec = ArcadeSpec.parse({ ...base, theme: { ...theme, skin: "pandai" } });
    expect(spec.theme.skin).toBe("pandai");
  });

  it("rejects a skin nobody built", () => {
    const bad = ArcadeSpec.safeParse({ ...base, theme: { ...theme, skin: "neon" } });
    expect(bad.success).toBe(false);
  });

  /**
   * The branch has to be worth taking. If this fixture's palette had no arcade
   * scene, `paletteFor` would already fall through to the DS ramp and the
   * option would be a no-op that looks like a feature.
   */
  it("has an arcade scene to differ FROM", () => {
    const spec = ArcadeSpec.parse(base);
    expect(
      sceneFor(spec.theme.palette, spec.theme.background),
      "this fixture renders through the DS ramp either way - pick another to test with",
    ).not.toBeNull();
  });
});
