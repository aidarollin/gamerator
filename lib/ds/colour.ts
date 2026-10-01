/**
 * Formatting a colour the way the DS's own colour cards print it. Pure string
 * work over values from the generated token layer - this file holds no colour,
 * and the hsla text is produced by the generator (PRIMITIVE_HSLA) for the same
 * reason.
 */

/** `#e1f9ea` -> `#E1F9EA`, as the cards print it. */
export function displayHex(hex: string): string {
  return hex.toUpperCase();
}

/** `OG-Green/500 (Base)` -> `OG-Green/500`. The cards drop the marker. */
export function cardLabel(name: string): string {
  return name.replace(/\s*\(Base\)$/, "");
}
