import { z } from "zod";

/**
 * The duel engine - a fighting game, built for this audience.
 *
 * Zul asked for a Mortal Kombat-style game twice and got the honest no-engine
 * answer twice. The reason on record was that Pandai's avatars are single
 * static PNGs, so a fighter would need animation frames nobody has. The asset
 * half was true; the conclusion was wrong. This renderer already animates
 * static sprites procedurally - `drawCharacter` translates, rotates and squashes
 * them, and nobody has yet asked where the flyer's frames are. A lunge, a
 * block, a recoil and a knockdown are the same class of transform.
 *
 * So the blocker was never assets. It was code, and this is the code.
 *
 * TWO DELIBERATE DEPARTURES FROM THE GENRE
 *
 * 1. **It is a sparring match, not a fight to the death.** The audience is
 *    Malaysian schoolchildren and the system prompt already forbids anything
 *    frightening. Hits score points and knock the loser onto their back; there
 *    is no blood, no finisher, and the loser gets up.
 * 2. **The opponent is honest about its reaction time.** A fighting AI that
 *    reads inputs frame-perfectly is unbeatable and feels like cheating. This
 *    one has a stated reaction delay, and that delay IS the difficulty dial -
 *    which also makes "is this winnable?" a question arithmetic can answer.
 */

export const DuelRules = z.object({
  /** px the fighters move per second. */
  moveSpeed: z.number().min(60).max(320),
  /** px at which a strike connects. */
  reach: z.number().min(40).max(130),
  /** Seconds a strike telegraphs before it lands. The player's tell. */
  strikeWindup: z.number().min(0.08).max(0.6),
  /** Seconds the striker is open afterwards, whether or not it hit. */
  strikeRecovery: z.number().min(0.1).max(0.9),
  /** Seconds before the opponent responds to what it sees. The difficulty. */
  opponentReaction: z.number().min(0.08).max(0.9),
  /** 0 = purely defensive, 1 = attacks at every opportunity. */
  opponentAggression: z.number().min(0).max(1),
  /** Hits needed to win the match. */
  hitsToWin: z.number().int().min(3).max(12),
  /** Hits the player can take. Named `lives` so GameFrame's HUD just works. */
  lives: z.number().int().min(1).max(5),
});
export type DuelRules = z.infer<typeof DuelRules>;

export const DUEL = {
  /** The floor both fighters stand on, and the world they move in. */
  width: 360,
  floorY: 400,
  /** How close they start. */
  startGap: 150,
  /** Simulated seconds before a match is called unwinnable. */
  simSeconds: 45,
  /**
   * The reaction time the SIMULATED PLAYER is credited with, in seconds.
   *
   * A person, not a machine. Roughly a decent human's visual reaction, and
   * fixed rather than derived from the spec: the spec describes the opponent,
   * and a check that scaled the player's reflexes to match would never be able
   * to reject anything. The first version gave the player no defence at all and
   * rejected four specs in five, because it walked into every aggressive
   * opponent and lost.
   */
  playerReaction: 0.22,
  /** A guard outlasts the strike it meets by this much. */
  blockLinger: 0.06,
  /**
   * After a guard goes up, how long before another can - counted from the
   * raise. This is what makes a fast opponent beatable: draw the block, then
   * hit the gap behind it. It applies to both fighters, and to a person.
   */
  blockCooldown: 0.28,
  /**
   * How long ONE PRESS of Block holds a person's guard up.
   *
   * The simulated player raises its guard the moment it sees a windup and drops
   * it the moment the strike lands, because it knows when that is. A person
   * does not, so a press holds for longer: long enough that pressing Block
   * `playerReaction` after a windup begins still covers the landing of every
   * windup `playableDuel` allows, and - with the cooldown - short enough that
   * mashing it leaves gaps. `duel.test.ts` pins that relationship.
   *
   * Until 2026-09-11 there was no Block button at all, so this check was
   * certifying a defence no human could perform.
   */
  playerGuard: 0.35,
  dt: 1 / 120,
} as const;

/**
 * Pull a set of duel numbers into the region the simulation accepts.
 *
 * WHY THIS EXISTS. The duel's playable region is narrow and it is defined by
 * RELATIONSHIPS, not by ranges: the opponent's reaction has to sit just above
 * the strike windup, the windup has to be slower than human reaction, and the
 * hits needed cannot run far ahead of the lives available. Every one of those
 * is legal at any individual value and unplayable in the wrong combination.
 *
 * Three live attempts at "a brutal two minute duel" were each rejected, each
 * for the same reason, each after a paid repair turn: the model reached for
 * aggression and a long target because that is what "brutal" means in English,
 * and that combination loses the race no matter how well you play.
 *
 * So it is fixed by construction, exactly as `lib/arcade/level.ts` fixes
 * platformer levels. The model still chooses the CHARACTER of the fight - how
 * aggressive, how long, how far the reach - and this enforces the relationships
 * that decide whether a person can win. Telling the model the rule and hoping
 * costs money on every miss; arithmetic costs nothing and cannot forget.
 */
export function playableDuel(r: DuelRules): DuelRules {
  const clamp = (n: number, lo: number, hi: number) =>
    Math.round(Math.min(hi, Math.max(lo, n)) * 100) / 100;

  // Slow enough for a person to see and block. Below ~0.22s nothing can be
  // blocked at all, and the opponent's every attack lands for free.
  const strikeWindup = clamp(r.strikeWindup, 0.25, 0.34);
  // Just ABOVE the windup: late enough that a clean strike gets through, close
  // enough that a careless one is read and blocked.
  const opponentReaction = clamp(strikeWindup + 0.03, 0.08, 0.9);
  const strikeRecovery = clamp(r.strikeRecovery, 0.24, 0.36);
  // Past about 0.6 the opponent simply out-races the player.
  const opponentAggression = clamp(r.opponentAggression, 0.25, 0.55);
  const lives = Math.min(5, Math.max(3, r.lives));
  /**
   * The player must not need MORE hits than they can take.
   *
   * Both fighters land at roughly the same rate - same windup, same recovery,
   * same reach - so the duel is a race, and whoever needs fewer hits wins it.
   * `hitsToWin` is the player's mountain and `lives` is the opponent's, and the
   * moment the first exceeds the second the outcome stops depending on skill.
   *
   * Measured over 500 legal specs per rule, after all the other clamps:
   *
   *   hitsToWin <= lives      99% playable, 97% a real contest
   *   hitsToWin <= lives + 1  74%
   *   hitsToWin <= lives + 2  60%
   *   hitsToWin <= lives + 3  48%
   *
   * There is no judgement in that number; it is where the cliff is.
   */
  const hitsToWin = Math.min(12, Math.max(3, Math.min(r.hitsToWin, lives)));

  return {
    ...r,
    reach: clamp(r.reach, 78, 98),
    strikeWindup,
    opponentReaction,
    strikeRecovery,
    opponentAggression,
    hitsToWin,
    lives,
  };
}

export type DuelVerdict =
  | { ok: true; trivial: boolean; hits: number; taken: number }
  | { ok: false; trivial: false; reason: string };

type Fighter = {
  x: number;
  /** Seconds left of the current action. */
  windup: number;
  recovery: number;
  blocking: number;
  /** A block cannot be thrown again immediately. This is what makes a fast
   * opponent beatable: draw the block, then hit the gap behind it. */
  blockCooldown: number;
  hits: number;
};

const fighter = (x: number): Fighter => ({
  x, windup: 0, recovery: 0, blocking: 0, blockCooldown: 0, hits: 0,
});

/**
 * A headless duel: a competent player against the specified opponent.
 *
 * Simulated rather than reasoned about, for the same reason the flyer is. The
 * question "can a player ever land a hit?" depends on windup against reaction
 * against recovery against reach, and that interaction is easier to run than to
 * solve - the flyer taught it when arithmetic about gravity and flap disagreed
 * with the simulation and the simulation was right.
 *
 * The player is COMPETENT, not perfect: it closes distance and strikes when in
 * range, and that is all. A cleverer agent would beat any finite opponent and
 * the check could never reject, which is the failure mode this repo names
 * repeatedly. A more passive one - the first version here waited for a
 * "punishable" opening that a defensive opponent never gives - rejected 84% of
 * legal specs, which is the opposite failure and worse, because a wrong
 * rejection is what a person actually sees.
 *
 * The exchange it models is the real one: a block only lands if the opponent
 * SEES the windup in time, so `opponentReaction` against `strikeWindup` is the
 * whole fight. And because a block has a cooldown, even a fast opponent can be
 * beaten by throwing a second strike into the gap behind the first.
 */
export function duelPlayability(r: DuelRules): DuelVerdict {
  const me = fighter(DUEL.width / 2 - DUEL.startGap / 2);
  const foe = fighter(DUEL.width / 2 + DUEL.startGap / 2);

  let seen = -Infinity;
  let watching = false;
  // The opponent's view of the player being OPEN, delayed the same way its view
  // of a windup is. Without this it punished every recovery the instant it
  // began, which made `opponentReaction` a dial that only governed blocking -
  // so a slow, supposedly easy opponent still counter-hit flawlessly, and four
  // specs in five were rejected as unwinnable.
  let openSeen = -Infinity;
  let watchingOpen = false;
  /**
   * When the opponent may next attack on its OWN initiative.
   *
   * Without this it only ever counter-attacked, so any opponent whose reaction
   * was slower than the player's recovery could never punish, therefore never
   * scored, therefore every such spec came out "trivial" - 332 of 348 accepted
   * ones. A fighting opponent that only reacts is not a fighter.
   */
  let nextPoke = 1.2 - r.opponentAggression;
  // The mirror image: what the player has noticed of the opponent's windup.
  let mySeen = -Infinity;
  let myWatching = false;
  let t = 0;

  const tick = (f: Fighter, dt: number) => {
    f.windup = Math.max(0, f.windup - dt);
    f.recovery = Math.max(0, f.recovery - dt);
    f.blocking = Math.max(0, f.blocking - dt);
    f.blockCooldown = Math.max(0, f.blockCooldown - dt);
  };
  const busy = (f: Fighter) => f.windup > 0 || f.recovery > 0;
  const gap = () => Math.abs(foe.x - me.x);
  const dt = DUEL.dt;

  while (t < DUEL.simSeconds && me.hits < r.hitsToWin && foe.hits < r.lives) {
    t += dt;

    // --- the player -------------------------------------------------------
    const wasWinding = me.windup > 0;
    tick(me, dt);
    if (wasWinding && me.windup === 0) {
      if (gap() <= r.reach && foe.blocking <= 0) me.hits++;
      me.recovery = r.strikeRecovery;
    }
    if (foe.windup > 0) {
      if (!myWatching) { myWatching = true; mySeen = t; }
    } else {
      myWatching = false;
    }
    const iCanSee = myWatching && t - mySeen >= DUEL.playerReaction;

    if (!busy(me)) {
      /**
       * The player TRADES rather than spacing carefully, and that is measured,
       * not assumed.
       *
       * A version that backed out of range whenever its recovery was
       * punishable is more like tournament play - and it made the check
       * WORSE: good specs fell from 406 to 358 in the fuzz and "lands no hits"
       * rose from 344 to 556, because a cautious player against a patient
       * opponent simply never swings. A child with a phone trades blows and
       * wins on health, so that is what is modelled.
       */
      if (iCanSee && me.blocking <= 0 && me.blockCooldown <= 0) {
        // Defend first. A player who only ever attacks is not competent.
        me.blocking = foe.windup + DUEL.blockLinger;
        me.blockCooldown = me.blocking + DUEL.blockCooldown;
      } else if (gap() <= r.reach) {
        me.windup = r.strikeWindup;
      } else {
        me.x += Math.sign(foe.x - me.x) * r.moveSpeed * dt;
      }
    }

    // --- the opponent -----------------------------------------------------
    const foeWasWinding = foe.windup > 0;
    tick(foe, dt);
    if (foeWasWinding && foe.windup === 0) {
      if (gap() <= r.reach && me.blocking <= 0) foe.hits++;
      foe.recovery = r.strikeRecovery;
    }

    // It reacts only to a windup it has been watching for long enough.
    if (me.windup > 0) {
      if (!watching) { watching = true; seen = t; }
    } else {
      watching = false;
    }
    const canSee = watching && t - seen >= r.opponentReaction;

    if (me.recovery > 0) {
      if (!watchingOpen) { watchingOpen = true; openSeen = t; }
    } else {
      watchingOpen = false;
    }
    const canPunish = watchingOpen && t - openSeen >= r.opponentReaction;

    if (!busy(foe)) {
      if (canSee && foe.blocking <= 0 && foe.blockCooldown <= 0) {
        foe.blocking = me.windup + DUEL.blockLinger;
        foe.blockCooldown = foe.blocking + DUEL.blockCooldown;
      } else if (
        gap() <= r.reach &&
        r.opponentAggression > 0.15 &&
        (canPunish || t >= nextPoke)
      ) {
        foe.windup = r.strikeWindup;
        // Aggression sets the tempo: 1.0 pokes every 0.4s, 0.2 every 1.2s.
        nextPoke = t + 1.4 - r.opponentAggression;
      } else if (gap() > r.reach * 0.9 && r.opponentAggression > 0.3) {
        foe.x += Math.sign(me.x - foe.x) * r.moveSpeed * dt * r.opponentAggression;
      }
    }

    me.x = Math.max(24, Math.min(DUEL.width - 24, me.x));
    foe.x = Math.max(24, Math.min(DUEL.width - 24, foe.x));
  }

  if (me.hits === 0) {
    return {
      ok: false,
      trivial: false,
      reason:
        `a competent player lands no hits at all: a ${r.strikeWindup.toFixed(2)}s windup against a ` +
        `${r.opponentReaction.toFixed(2)}s reaction means every strike is seen and blocked`,
    };
  }
  // Losing and running out of time are different faults and need different
  // fixes, so they get different reasons - a repair turn can only act on a
  // message that says which number to move.
  if (foe.hits >= r.lives) {
    return {
      ok: false,
      trivial: false,
      reason:
        `the opponent wins first: it lands ${foe.hits} on a player with ${r.lives} ` +
        `while a competent player manages ${me.hits} of the ${r.hitsToWin} needed - ` +
        `lower opponentAggression, raise lives, or lower hitsToWin`,
    };
  }
  if (me.hits < r.hitsToWin) {
    return {
      ok: false,
      trivial: false,
      reason:
        `a competent player lands only ${me.hits} of the ${r.hitsToWin} hits needed in ` +
        `${DUEL.simSeconds}s - the match cannot be finished in a sitting`,
    };
  }

  // Trivial two ways: the opponent never lands anything, or it never even tries.
  const trivial = foe.hits === 0 || r.opponentAggression < 0.1;
  return { ok: true, trivial, hits: me.hits, taken: foe.hits };
}
