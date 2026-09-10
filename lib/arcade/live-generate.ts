import "server-only";

import { ArcadeSpec, type Engine } from "./schema";
import { generateLive } from "./live";
import { DuelRules, playableDuel } from "./duel";
import { allowGeneration, cacheKey, cached, recordCall, remember } from "./guard";
import type { ArcadeBrief } from "./brief";
import { hashString } from "@/lib/game/random";
import { readTimeLimit } from "./generate";

/**
 * Live generation: the model chooses the numbers, and everything else refuses
 * to trust it.
 *
 * The shape of this file is the whole architecture in one function:
 *
 *   guard -> cache -> model -> VALIDATE -> repair once -> VALIDATE -> give up
 *
 * Validation is not a formality. `ArcadeSpec` runs the playability simulation,
 * and a model has no way to know whether gravity 2800 against a -220 flap
 * clears a 90px gap - it is arithmetic over a physics loop, not a fact about
 * language. So the first answer is frequently wrong in exactly that way, and
 * the repair turn exists to hand back the simulation's own reasons.
 *
 * ONE repair, never a loop. A loop is how a bad prompt becomes a bill: each
 * turn costs money and a model that misunderstood the constraint will keep
 * misunderstanding it. Two failures is a signal to stop and say so.
 */

export type LiveOutcome =
  | { status: "ok"; spec: ArcadeSpec; repaired: boolean; cached: boolean }
  | { status: "invalid"; issues: { path: string; message: string }[] }
  | { status: "refused"; reason: string }
  | { status: "error"; code: string; message: string };

const issuesOf = (error: { issues: { path: PropertyKey[]; message: string }[] }) =>
  error.issues.map((i) => ({ path: i.path.map(String).join("."), message: i.message }));

export async function generateArcadeLive(
  brief: ArcadeBrief,
  engine: Engine,
  client: string,
  /** Set when this engine is dressed as a genre it is not. */
  adapted?: { requested: string; how: string },
): Promise<LiveOutcome> {
  // The same brief must not be billed twice. `/create` reads its brief from the
  // query string, so refreshes, shared links and the back button all re-render
  // it - every one of those was a fresh paid call before this existed.
  const key = cacheKey({
    engine,
    prompt: brief.prompt,
    character: brief.character,
    palette: brief.palette,
    difficulty: brief.difficulty,
    language: brief.language,
    skin: brief.skin,
    adapted: adapted?.requested,
  });
  const hit = cached<ArcadeSpec>(key);
  if (hit) return { status: "ok", spec: hit, repaired: false, cached: true };

  const gate = allowGeneration(client);
  if (!gate.ok) return { status: "error", code: gate.code, message: gate.message };

  /**
   * The round budget comes from the WORDS, not from the model.
   *
   * `scoring.timeLimit` is hidden from the model - see live.ts for why - so it
   * is merged in here before validation. "a two minute duel" already means
   * something to `readTimeLimit`, and deriving it in code is both more reliable
   * than asking and impossible to hallucinate.
   *
   * Merged BEFORE validation on purpose: if the model's target cannot be scored
   * inside the budget, the round check rejects it and the repair turn gets to
   * lower the target, which it can see.
   */
  const timeLimit = readTimeLimit(brief.prompt);

  /**
   * The duel is pulled into its playable region rather than argued into it.
   *
   * Same reasoning as the round budget above, and the same as the platformer's
   * level generator: a relationship the model keeps getting wrong is cheaper to
   * enforce than to explain, and three paid repair turns proved it.
   */
  const shape = (raw: unknown): unknown => {
    if (engine !== "duel" || typeof raw !== "object" || raw === null) return raw;
    const r = raw as { rules?: unknown };
    const parsed = DuelRules.safeParse(r.rules);
    if (!parsed.success) return raw;
    const rules = playableDuel(parsed.data);
    // The match ends at hitsToWin, so that IS the purse. Clamping the hits
    // without following the target through leaves a game whose goal cannot be
    // reached - which is what the schema check now refuses.
    const sc = (r as { scoring?: Record<string, unknown> }).scoring;
    const scoring = sc
      ? { ...sc, targetScore: rules.hitsToWin * Number(sc.pointsPerObstacle ?? 1) }
      : sc;
    return { ...r, rules, ...(scoring ? { scoring } : {}) };
  };
  const withBudget = (raw: unknown): unknown => {
    if (timeLimit === undefined || typeof raw !== "object" || raw === null) return raw;
    const r = raw as { scoring?: Record<string, unknown> };
    if (!r.scoring) return raw;
    return { ...r, scoring: { ...r.scoring, timeLimit } };
  };

  /**
   * The board seeds, derived rather than asked for. See live.ts for why they
   * are hidden from the model: a seed is a dice roll, not a design decision,
   * and deriving it from the prompt means the same words give the same maze.
   */
  const withSeed = (raw: unknown): unknown => {
    const field =
      engine === "maze-chase" ? "mazeSeed" : engine === "match-3" ? "boardSeed" : null;
    if (!field || typeof raw !== "object" || raw === null) return raw;
    const r = raw as { rules?: Record<string, unknown> };
    if (!r.rules) return raw;
    return { ...r, rules: { ...r.rules, [field]: (hashString(brief.prompt) % 999) + 1 } };
  };

  /**
   * The skin, merged in like the budget and the seeds. It is hidden from the
   * model because it is the author's decision about where the game will LIVE,
   * not a property of the game - and a model asked for it would answer.
   */
  const withSkin = (raw: unknown): unknown => {
    if (!brief.skin || typeof raw !== "object" || raw === null) return raw;
    const r = raw as { theme?: Record<string, unknown> };
    if (!r.theme) return raw;
    return { ...r, theme: { ...r.theme, skin: brief.skin } };
  };

  const prepare = (raw: unknown) => withSkin(withSeed(withBudget(shape(raw))));

  const first = await generateLive(brief, engine, undefined, adapted);
  if (first.kind === "refusal") return { status: "refused", reason: first.reason };
  if (first.kind === "error") {
    return { status: "error", code: first.code, message: first.message };
  }
  recordCall(client, first.usage);

  const parsed = ArcadeSpec.safeParse(prepare(first.raw));
  if (parsed.success) {
    return { status: "ok", spec: remember(key, parsed.data), repaired: false, cached: false };
  }

  // The repair turn. The model is shown its own output and the simulation's
  // reasons - which are facts about numbers, not opinions - and asked again.
  const issues = issuesOf(parsed.error);

  const second = await generateLive(brief, engine, { previous: first.raw, issues }, adapted);
  if (second.kind === "refusal") return { status: "refused", reason: second.reason };
  if (second.kind === "error") {
    return { status: "error", code: second.code, message: second.message };
  }
  recordCall(client, second.usage);

  const repaired = ArcadeSpec.safeParse(prepare(second.raw));
  if (repaired.success) {
    return { status: "ok", spec: remember(key, repaired.data), repaired: true, cached: false };
  }

  // Two honest attempts, still not playable. Saying so is the correct answer;
  // shipping an unplayable game would be worse, and a third turn is a loop.
  return { status: "invalid", issues: issuesOf(repaired.error) };
}
