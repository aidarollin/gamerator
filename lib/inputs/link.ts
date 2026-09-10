/**
 * Reading a link somebody pasted.
 *
 * "Here is a game I like" is a real way to describe a game, and it was not
 * something the box could take. What actually helps is small: the page's own
 * TITLE and description usually name the genre outright - "Flappy Bird Clone",
 * "A fast-paced maze arcade game" - and that is exactly the kind of sentence
 * the router and the model already know what to do with.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO: render the page, run its JavaScript, look
 * at its screenshots, or send anything but a GET. It reads the first 128KB of
 * HTML and takes three tags out of it. Anything more is a crawler, and a
 * crawler is a different project with a different set of problems.
 */

export type LinkRead =
  | { ok: true; url: string; title: string; description: string; words: string }
  | { ok: false; url: string; reason: string };

const TIMEOUT_MS = 6000;
/** Enough for a <head> several times over; a page that buries its title past
 *  this is a page whose title was not going to help anyway. */
const MAX_BYTES = 128 * 1024;

/**
 * Hosts that are never worth asking, and that a server should not be talked
 * into asking on a stranger's behalf.
 *
 * A Cloudflare Worker has no private network to reach, so this is not the load
 * bearing defence it would be on a VM - but "the platform happens to make it
 * impossible" is a property of today's deployment rather than a decision, and
 * the day this runs anywhere else the decision is what survives.
 */
const BLOCKED_HOST =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|.*\.local$|.*\.internal$)/i;

/** Tags out, entities decoded, whitespace collapsed. */
function text(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, e) =>
      ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " })[e as string] ?? " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function meta(html: string, name: string): string {
  // Both attribute orders, because half the web writes `content` first.
  const a = html.match(
    new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
  );
  if (a) return text(a[1]);
  const b = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["']`, "i"),
  );
  return b ? text(b[1]) : "";
}

/**
 * The words a URL carries even when nothing is fetched.
 *
 * `itch.io/games/flappy-bird-clone` says "flappy bird clone" without a single
 * request, and that is often the whole answer. Free, offline, and the fallback
 * whenever the fetch fails - which it will, for anything behind a login.
 */
export function wordsFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return [u.hostname.replace(/^www\./, "").split(".")[0], ...u.pathname.split("/")]
      .join(" ")
      .replace(/[-_+]/g, " ")
      .replace(/\.(html?|php|aspx?)\b/gi, " ")
      .replace(/\d{4,}/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
  } catch {
    return "";
  }
}

export async function readLink(raw: string): Promise<LinkRead> {
  const url = raw.trim();
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, url, reason: "that is not a web address" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, url, reason: `${parsed.protocol} links are not fetched` };
  }
  if (BLOCKED_HOST.test(parsed.hostname)) {
    return { ok: false, url, reason: "that address is not reachable from here" };
  }

  try {
    const res = await fetch(parsed.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        // Named honestly. A fetcher that pretends to be a browser is a fetcher
        // whose operator did not want to be told no.
        "user-agent": "gamerator/1.0 (+https://gamerator.aidaasofiah.workers.dev)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return { ok: false, url, reason: `the page answered ${res.status}` };

    const type = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/i.test(type)) {
      // An image or a PDF is a different feature. The URL's own words still work.
      return { ok: false, url, reason: `that link is ${type.split(";")[0] || "not a web page"}` };
    }

    // Read a bounded prefix rather than res.text(), so a hostile or merely
    // enormous page cannot decide how much memory this Worker uses.
    const reader = res.body?.getReader();
    if (!reader) return { ok: false, url, reason: "the page sent nothing" };
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      total += value.length;
      if (total >= MAX_BYTES) {
        await reader.cancel();
        break;
      }
    }
    const merged = new Uint8Array(total);
    let at = 0;
    for (const c of chunks) {
      merged.set(c.subarray(0, Math.min(c.length, total - at)), at);
      at += c.length;
    }
    const html = new TextDecoder("utf-8", { fatal: false }).decode(merged);

    const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = text(titleTag?.[1] ?? "") || meta(html, "og:title");
    const description = meta(html, "description") || meta(html, "og:description");
    if (!title && !description) {
      return { ok: false, url, reason: "the page has no title or description" };
    }
    return {
      ok: true,
      url,
      title: title.slice(0, 160),
      description: description.slice(0, 400),
      words: [title, description].filter(Boolean).join(". ").slice(0, 500),
    };
  } catch (e) {
    const why = e instanceof Error && e.name === "TimeoutError" ? "it did not answer in time" : "it could not be reached";
    return { ok: false, url, reason: why };
  }
}
