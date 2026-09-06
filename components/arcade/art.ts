/**
 * Authored art, tinted from DS tokens at draw time.
 *
 * The tension this solves: a canvas game wants real artwork, but baking colour
 * into an SVG would break palette theming - a Bahasa Melayu game and a
 * chemistry game would share one green bush. So every asset in `public/art` is
 * drawn as a WHITE SILHOUETTE and coloured here.
 *
 * The technique is an offscreen canvas plus `source-in`: paint the silhouette,
 * then flood the colour through it keeping only the opaque pixels. Results are
 * cached per (asset, colour, size) because a tint is a whole canvas allocation
 * and the game loop runs 60 times a second.
 */

export const ART = {
  cloud: "/art/cloud.svg",
  hill: "/art/hill.svg",
  bush: "/art/bush.svg",
  coin: "/art/coin.svg",
  sparkle: "/art/sparkle.svg",
} as const;

export type ArtKey = keyof typeof ART;

const images = new Map<ArtKey, HTMLImageElement>();
const tints = new Map<string, HTMLCanvasElement>();

/** Loads every asset once. Resolves even on failure - see below. */
export function loadArt(): Promise<void> {
  const keys = Object.keys(ART) as ArtKey[];
  return Promise.all(
    keys.map(
      (key) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          // Resolve on error too. A missing asset must degrade to the
          // procedural fallback, not hang the game behind a promise that never
          // settles - the same rule as the character loader.
          img.onload = () => {
            images.set(key, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = ART[key];
        }),
    ),
  ).then(() => undefined);
}

export function isLoaded(key: ArtKey) {
  const img = images.get(key);
  return !!img && img.complete && img.naturalWidth > 0;
}

/**
 * A tinted copy at a given size, cached.
 *
 * Returns null when the asset has not loaded, so callers fall back to drawing
 * a shape rather than rendering nothing.
 */
export function tinted(
  key: ArtKey,
  colour: string,
  width: number,
  height: number,
): HTMLCanvasElement | null {
  const img = images.get(key);
  if (!img || !img.complete || img.naturalWidth === 0) return null;

  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const id = `${key}|${colour}|${w}x${h}`;
  const hit = tints.get(id);
  if (hit) return hit;

  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, w, h);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, w, h);

  // A cache that grows without bound across palette changes would leak. The
  // working set is a handful of sizes per colour, so this ceiling is never hit
  // in normal play and only matters if someone cycles palettes for an hour.
  if (tints.size > 240) tints.clear();
  tints.set(id, c);
  return c;
}

/** Draw a tinted asset centred on (x, y). Returns false if it was not ready. */
export function drawArt(
  ctx: CanvasRenderingContext2D,
  key: ArtKey,
  colour: string,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha = 1,
): boolean {
  const c = tinted(key, colour, width, height);
  if (!c) return false;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  ctx.drawImage(c, x - width / 2, y - height / 2, width, height);
  ctx.globalAlpha = prev;
  return true;
}
