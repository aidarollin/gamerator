"use client";

import Link from "next/link";
import { Card } from "@/components/ds";
import { ArcadeGame } from "@/components/arcade/ArcadeGame";
import { ExportPanel } from "@/components/arcade/ExportPanel";
import { GameRenderer } from "@/components/game";
import { ENGINES } from "@/lib/arcade/schema";
import type { GameOutcome, InputNotes } from "@/lib/games";
import s from "./create.module.css";

/**
 * The answer, whichever kind it turned out to be.
 *
 * Pulled out of `page.tsx` when the form learned to take a picture. A file
 * cannot travel in a query string, so a request carrying one is a POST whose
 * result is returned to a client component rather than server-rendered from
 * `searchParams` - and both routes have to render the same thing. One component,
 * two callers, no chance of the shareable path and the upload path drifting
 * into two slightly different pages.
 *
 * It is a client component only because the POST path needs it to be. Every
 * game renderer under it was already one.
 */
export function GameResult({
  outcome,
  inputs,
}: {
  outcome: GameOutcome;
  inputs?: InputNotes;
}) {
  const notes = inputs ? <InputReport inputs={inputs} /> : null;


  /**
   * A Pandai DS learning template rather than an arcade engine.
   *
   * Rendered by `components/game`, which is the older half of this product and
   * has been sitting behind `/play/preview` since before the arcade existed.
   * Every pixel of it comes from the token layer.
   */
  if (outcome.status === "ok-learning") {
    return (
      <div className={s.result}>
        {notes}
        <p className={s.guess}>
          That reads as <strong>{outcome.requested}</strong>, so this is a Pandai
          design-system template rather than an arcade game &mdash; the same
          components the rest of Pandai is built from.
        </p>
        {/* The uncomfortable half, said out loud. For an arcade game the free
            path DERIVES the physics from your words. For a learning template it
            returns a canned fixture: the template is right and the content is
            somebody else's. A demo that hides that is a lie. */}
        {outcome.source === "fixture" && (
          <p className={s.guess}>
            <strong>The content here is a sample, not yours.</strong> Choosing a
            template from your words is free; writing the questions is a model
            call, and this deployment is not making one. Turn the model on and
            the questions come from your prompt.
          </p>
        )}
        <GameRenderer spec={outcome.spec} />
      </div>
    );
  }

  // The honest answers, before the happy path.
  if (outcome.status === "no-engine") {
    const requested = outcome.requested;
    return (
      <Card>
        <strong className={s.warn}>No engine for that yet</strong>
        <p className={s.body}>
          You asked for <strong>{requested}</strong>, and there is no engine for
          it. Rather than quietly handing you the nearest thing and letting you
          wonder why it is not what you asked for: the catalog has{" "}
          {ENGINES.join(", ")}.
        </p>
        {/* WHY, not just no. A refusal that only says "not yet" gives the
            reader nothing to act on and nothing to disagree with - and every
            one of these reasons has been wrong before. "A fighting game" was
            refused for a year on a reason that turned out to be false, and it
            is the duel engine now. */}
        {outcome.why && (
          <p className={s.body}>
            The specific reason: {outcome.why}.
          </p>
        )}
        <p className={s.body}>
          An engine is code, tests and a design review &mdash; a change to this
          repository, not something a prompt can conjure. Try{" "}
          <Link href="/create?prompt=a+flappy+bird+with+PBot">a flyer</Link>,{" "}
          <Link href="/create?prompt=a+pac+man+style+game">a maze chase</Link>,{" "}
          <Link href="/create?prompt=a+tetris+puzzle">falling blocks</Link> or{" "}
          <Link href="/create?prompt=a+space+invaders+game">a space shooter</Link>{" "}
          instead.
        </p>
      </Card>
    );
  }

  if (outcome.status === "error") {
    return (
      <Card>
        <strong className={s.warn}>Could not generate</strong>
        <p className={s.body}>{outcome.message}</p>
      </Card>
    );
  }

  if (outcome.status === "invalid") {
    return (
      <Card>
        <strong className={s.warn}>The game that came back was not playable</strong>
        <p className={s.body}>
          It was rejected before you could see it &mdash; a game that cannot be
          won is worse than one that says it could not be made.
        </p>
        <ul className={s.issues}>
          {outcome.issues.map((i, n) => (
            <li key={n}><code>{i.path || "(root)"}</code>: {i.message}</li>
          ))}
        </ul>
      </Card>
    );
  }

  return (
    <div className={s.result}>
      {notes}
      {/* No physics chips. A player-facing surface showing "gravity 1500" is a
          debug view, and that was most of why this read as a mock-up. The
          numbers are all in the spec, one tab away in the export panel. */}
      {outcome.guessed && (
        <p className={s.guess}>
          Nothing in that named a kind of game, so this is a flyer &mdash; a
          guess, said out loud rather than made quietly. Name a genre (snake,
          breakout, runner, platformer) to pick deliberately.
        </p>
      )}
      {/* Where the numbers came from, said out loud. "A model chose this" and
          "a keyword table chose this" are different claims, and letting a
          reader assume the first while the second is true would undo the point
          of the whole project. */}
      {/* An adaptation is announced, never silent. Handing someone a runner
          when they asked for a race and saying nothing is precisely the failure
          the routing layer exists to avoid - the difference between a default
          and a silent one. */}
      {outcome.adapted && (
        <p className={s.guess}>
          There is no engine for <strong>{outcome.adapted.requested}</strong> yet,
          so this is the closest one wearing it: {outcome.adapted.how}. If that is
          not what you meant, name a genre &mdash; {ENGINES.join(", ")}.
        </p>
      )}
      {outcome.source && outcome.source !== "tuner" && (
        <p className={s.guess}>
          {outcome.source === "cache"
            ? "Served from cache — this exact brief was generated before, so it did not cost another call."
            : outcome.source === "model-repaired"
              ? "Generated by the model. Its first answer failed the playability simulation, so it was handed the reasons and asked again."
              : "Generated by the model, and it passed the playability simulation first time."}
        </p>
      )}
      <ArcadeGame spec={outcome.spec} />
      <ExportPanel spec={outcome.spec} />
    </div>
  );
}

/**
 * WHAT EACH EXTRA INPUT ACTUALLY DID.
 *
 * The rule this exists for: an input that appears to be accepted and silently
 * does nothing is the same class of lie as an adaptation nobody announces. A
 * person swaps the reference picture, gets the same game back, and reasonably
 * concludes the product is broken - when the truth is that this deployment is
 * not calling a model and a picture is the one input only a model can read.
 */
function InputReport({ inputs }: { inputs: InputNotes }) {
  const rows: string[] = [];
  if (inputs.notes) rows.push(`Read your ${inputs.notes.chars} characters of notes.`);
  if (inputs.link) {
    rows.push(
      inputs.link.used
        ? `Read the link: ${inputs.link.detail}`
        : `Could not read the link - ${inputs.link.detail}.`,
    );
  }
  if (inputs.picture) {
    rows.push(
      inputs.picture.used
        ? `Looked at your picture - ${inputs.picture.detail}.`
        : `Your picture was not used - ${inputs.picture.detail}.`,
    );
  }
  if (rows.length === 0) return null;
  return (
    <p className={s.guess}>
      {rows.map((r, i) => (
        <span key={i} style={{ display: "block" }}>
          {r}
        </span>
      ))}
    </p>
  );
}
