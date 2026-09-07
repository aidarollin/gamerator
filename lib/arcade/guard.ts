import "server-only";

/**
 * The spending wall. Nothing may call a paid model without passing through here.
 *
 * `CLAUDE.md` has said since the first week that turning the model on needs a
 * spend ceiling and a rate limit FIRST, "or a loop runs up a real bill". This is
 * that, written before the provider was wired rather than after.
 *
 * THE CONTROLS ARE COUNTED IN CALLS AND TOKENS, NOT DOLLARS.
 *
 * That is deliberate. I do not know this account's per-token price - it depends
 * on the model, the provider's margin and the plan - and a ceiling built on a
 * guessed price is a ceiling that fails in whichever direction the guess was
 * wrong. Calls and tokens are things this code can count exactly, and
 * `maxOutputTokens` bounds the size of any single call. A cap of N calls a day,
 * each bounded in output, is a hard bound on spend without pretending to know a
 * rate.
 *
 * WHAT THIS CANNOT DO, STATED PLAINLY.
 *
 * A Cloudflare Worker has no shared memory: each isolate gets its own copy of
 * these counters, and isolates come and go. So this is a strong speed bump, not
 * a guarantee - a determined flood from many IPs across many isolates could
 * exceed the daily cap. The only real guarantee lives at the provider, so
 * `docs/TECHNICAL-PLAN.md` says to set a hard credit limit on the OpenRouter key
 * as well. Two controls, and only one of them is mine.
 */

export const GUARD = {
  /** Generations allowed per rolling day, per isolate. */
  dailyCalls: Number(process.env.GAMERATOR_DAILY_CALLS ?? 120),
  /** Generations allowed per client per hour. */
  hourlyPerClient: Number(process.env.GAMERATOR_CLIENT_CALLS_PER_HOUR ?? 12),
  /** A repair turn costs a second call; both are counted. */
  windowMs: 60 * 60 * 1000,
  dayMs: 24 * 60 * 60 * 1000,
} as const;

type Stamp = number;

const dayCalls: Stamp[] = [];
const byClient = new Map<string, Stamp[]>();

let tokensIn = 0;
let tokensOut = 0;
let calls = 0;

const prune = (list: Stamp[], now: number, window: number) => {
  while (list.length && now - list[0] > window) list.shift();
  return list;
};

export type GuardVerdict =
  | { ok: true }
  | { ok: false; code: "rate_limited" | "daily_cap"; message: string };

/**
 * May this client spend money right now?
 *
 * Call it BEFORE the request, and call `recordCall` after - the two are
 * separate so a call that never happened is never counted against anyone.
 */
export function allowGeneration(client: string, now = Date.now()): GuardVerdict {
  prune(dayCalls, now, GUARD.dayMs);
  if (dayCalls.length >= GUARD.dailyCalls) {
    return {
      ok: false,
      code: "daily_cap",
      message:
        `This service has made its ${GUARD.dailyCalls} generations for today. ` +
        `It will reset within 24 hours; the free tuner still works.`,
    };
  }

  const mine = prune(byClient.get(client) ?? [], now, GUARD.windowMs);
  if (mine.length >= GUARD.hourlyPerClient) {
    return {
      ok: false,
      code: "rate_limited",
      message:
        `That is ${GUARD.hourlyPerClient} games in an hour, which is the limit. ` +
        `Try again later, or keep going with the free tuner.`,
    };
  }
  return { ok: true };
}

/** Record a call that actually reached the provider. */
export function recordCall(
  client: string,
  usage: { inputTokens: number; outputTokens: number },
  now = Date.now(),
) {
  dayCalls.push(now);
  const mine = byClient.get(client) ?? [];
  mine.push(now);
  byClient.set(client, mine);

  calls += 1;
  tokensIn += usage.inputTokens;
  tokensOut += usage.outputTokens;
}

/** For the operator, and for the deck. Never shown to a player. */
export function guardSnapshot(now = Date.now()) {
  prune(dayCalls, now, GUARD.dayMs);
  return {
    callsToday: dayCalls.length,
    dailyCap: GUARD.dailyCalls,
    callsThisIsolate: calls,
    tokensIn,
    tokensOut,
  };
}

/* --------------------------------------------------------------- the cache */

/**
 * Identical briefs return the identical spec without paying twice.
 *
 * `/create` is a server component that reads its brief from the QUERY STRING,
 * so a refresh, a back button, a shared link or a preview crawler all re-render
 * it. Every one of those would have been a fresh paid call. The example chips
 * on that page make it worse: they are links, so a curious visitor clicking
 * through five of them bills five times, then bills again on the way back.
 *
 * Generation is meant to be deterministic for a given brief anyway - the same
 * words should give the same game - so caching is not just a cost control, it
 * is the behaviour a person expects.
 */
const CACHE_MAX = 200;
const cache = new Map<string, unknown>();

export function cacheKey(parts: Record<string, string | undefined>): string {
  return Object.entries(parts)
    .filter(([, v]) => v !== undefined && v !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&")
    .toLowerCase();
}

export function cached<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function remember<T>(key: string, value: T): T {
  // Oldest out first. A Map preserves insertion order, so this is one line.
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
  return value;
}

/** Tests need a clean slate; nothing else should call this. */
export function resetGuardsForTest() {
  dayCalls.length = 0;
  byClient.clear();
  cache.clear();
  calls = 0;
  tokensIn = 0;
  tokensOut = 0;
}
