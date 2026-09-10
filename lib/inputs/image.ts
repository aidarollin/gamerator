/**
 * A picture somebody dropped in, on its way to a vision model.
 *
 * "Make it look like this" is the most natural way to describe how a game
 * should feel, and it was the one thing the box could not take at all.
 *
 * THE COST IS REAL AND IT IS NOT A ROUNDING ERROR. An image is roughly
 * (width x height) / 750 tokens, so a 1024x1024 screenshot is about 1,400 -
 * comparable to the entire system prompt. `guard.ts` counts tokens rather than
 * dollars precisely so that a new kind of input cannot quietly change what a
 * generation costs, and this is the first input that tests that.
 *
 * So the cap here is deliberately tight, and it is a cap on the DECODED pixel
 * count as well as the byte count: a 20-megapixel photo compresses to under a
 * megabyte and would still cost thirty times what a screenshot does.
 */

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];

/** 4MB. Comfortably a phone screenshot; nowhere near a raw photo. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export type ImageRead =
  | { ok: true; mediaType: ImageType; base64: string; bytes: number; estimatedTokens: number }
  | { ok: false; reason: string };

/**
 * Anthropic's own rule of thumb, and the reason the byte cap is not enough on
 * its own: tokens track AREA, and area is not visible in a file size.
 */
export function estimateImageTokens(width: number, height: number): number {
  return Math.ceil((width * height) / 750);
}

/**
 * Width and height straight out of the file header.
 *
 * Four small parsers rather than a dependency: a Worker bundle pays for every
 * byte it ships, and reading a PNG's IHDR is nine lines. Returns null when the
 * header is not recognised, which is treated as "reject" rather than "assume
 * it is fine" - guessing here spends money.
 */
export function readDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // PNG: 8-byte signature, then IHDR with width and height as big-endian u32.
  if (bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  // GIF: "GIF8", then width and height as little-endian u16.
  if (bytes.length > 10 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }
  // WEBP (VP8X / VP8L / VP8 ): "RIFF"...."WEBP", then a chunk that carries it.
  if (bytes.length > 30 && bytes[0] === 0x52 && bytes[8] === 0x57 && bytes[9] === 0x45) {
    const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
    if (chunk === "VP8X") {
      const w = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      const h = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
      return { width: w, height: h };
    }
    if (chunk === "VP8 ") {
      return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    }
  }
  // JPEG: walk the segment chain to a start-of-frame marker.
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = bytes[i + 1];
      // SOF0..SOF15, skipping the four that are not frame headers.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: view.getUint16(i + 5), width: view.getUint16(i + 7) };
      }
      i += 2 + view.getUint16(i + 2);
    }
  }
  return null;
}

/** Base64 without a dependency, and without a 4MB string built one char at a time. */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export async function readImage(file: File, maxTokens = 2200): Promise<ImageRead> {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, reason: `${file.type || "that file"} is not a PNG, JPEG, WebP or GIF` };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      reason: `that image is ${(file.size / 1024 / 1024).toFixed(1)}MB and the limit is 4MB`,
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const size = readDimensions(bytes);
  if (!size) {
    return { ok: false, reason: "that file does not look like an image its header describes" };
  }

  const estimatedTokens = estimateImageTokens(size.width, size.height);
  if (estimatedTokens > maxTokens) {
    return {
      ok: false,
      reason:
        `that image is ${size.width}x${size.height}, which costs about ${estimatedTokens} tokens to look at - ` +
        `more than the whole rest of the request. Scale it down to roughly 1000px on its longest side`,
    };
  }

  return {
    ok: true,
    mediaType: file.type as ImageType,
    base64: toBase64(bytes),
    bytes: file.size,
    estimatedTokens,
  };
}
