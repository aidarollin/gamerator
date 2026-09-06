/**
 * Spec <-> URL encoding for the embed route.
 *
 * The spec travels in the URL rather than in a database because there is no
 * database yet (D1 is Phase 6), and a stateless embed can be pasted into Pandai
 * today without this service holding anything. A typical flyer spec is around
 * 600 bytes, so roughly 800 characters encoded - comfortably inside every
 * browser and CDN URL limit.
 *
 * base64url, not plain base64: `+` and `/` are not URL-safe and `=` padding
 * gets mangled by some CMS fields. Learned the boring way by everyone who has
 * ever put base64 in a query string.
 *
 * When D1 lands this becomes `/embed/<id>` and the long form stays as the
 * no-storage fallback.
 */

export function encodeSpec(spec: unknown): string {
  const json = JSON.stringify(spec);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeSpec(encoded: string): unknown {
  const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}
