import { describe, expect, it } from "vitest";
import { estimateImageTokens, readDimensions, readImage } from "./image";

/**
 * The header parsers are four hand-written ones, which is exactly the kind of
 * code that is right for the file the author tested with and wrong for the next
 * one. They also gate SPENDING: a picture whose dimensions are read wrongly is
 * a picture whose token cost is estimated wrongly, and the cap stops working.
 *
 * So each format gets a real header, byte for byte.
 */

/** A 300x200 PNG header: signature, IHDR length, "IHDR", width, height. */
function png(w: number, h: number): Uint8Array {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const v = new DataView(b.buffer);
  v.setUint32(8, 13);
  b.set([0x49, 0x48, 0x44, 0x52], 12);
  v.setUint32(16, w);
  v.setUint32(20, h);
  return b;
}

function gif(w: number, h: number): Uint8Array {
  const b = new Uint8Array(16);
  b.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 0);
  new DataView(b.buffer).setUint16(6, w, true);
  new DataView(b.buffer).setUint16(8, h, true);
  return b;
}

function jpeg(w: number, h: number): Uint8Array {
  // SOI, then a JFIF APP0 to be skipped over, then SOF0 carrying the size.
  const b = new Uint8Array(40);
  const v = new DataView(b.buffer);
  b.set([0xff, 0xd8], 0);
  b.set([0xff, 0xe0], 2);
  v.setUint16(4, 16); // APP0 length, so the walk lands on the next marker
  b.set([0xff, 0xc0], 20);
  v.setUint16(22, 17);
  b[24] = 8;
  v.setUint16(25, h);
  v.setUint16(27, w);
  return b;
}

describe("reading dimensions out of a header", () => {
  it.each([
    ["png", png(300, 200)],
    ["gif", gif(300, 200)],
    ["jpeg", jpeg(300, 200)],
  ])("%s", (_name, bytes) => {
    expect(readDimensions(bytes)).toEqual({ width: 300, height: 200 });
  });

  it("returns null rather than guessing at something it does not know", () => {
    // Guessing here would spend money on an image whose cost was never checked.
    expect(readDimensions(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]))).toBeNull();
  });
});

describe("the token estimate", () => {
  it("tracks area, not file size", () => {
    expect(estimateImageTokens(1000, 1000)).toBeGreaterThan(estimateImageTokens(1000, 500));
  });

  it("puts a phone screenshot in the low thousands", () => {
    // The number that makes the 2200 cap a real limit rather than a decoration.
    expect(estimateImageTokens(1170, 2532)).toBeGreaterThan(3000);
    expect(estimateImageTokens(800, 600)).toBeLessThan(700);
  });
});

describe("what readImage refuses", () => {
  const file = (bytes: Uint8Array, type: string) =>
    new File([bytes as unknown as BlobPart], "x", { type });

  it("takes a small PNG", async () => {
    const out = await readImage(file(png(640, 480), "image/png"));
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.mediaType).toBe("image/png");
      expect(out.base64.length).toBeGreaterThan(0);
    }
  });

  it("refuses a type nobody asked for", async () => {
    const out = await readImage(file(png(64, 64), "application/pdf"));
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toMatch(/PNG, JPEG/);
  });

  it("refuses an image whose AREA is the problem, not its size on disk", async () => {
    // The case a byte cap alone lets through: a huge canvas that compresses well.
    const out = await readImage(file(png(4000, 3000), "image/png"));
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toMatch(/4000x3000/);
      // The message has to say what to DO, not just that it said no.
      expect(out.reason).toMatch(/scale it down/i);
    }
  });

  it("refuses a file whose header is not the image it claims to be", async () => {
    const out = await readImage(file(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), "image/png"));
    expect(out.ok).toBe(false);
  });
});
