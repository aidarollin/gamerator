"use client";

import { useActionState, useRef, useState } from "react";
import { Card } from "@/components/ds";
import { makeGame, type CreateState } from "./actions";
import { GameResult } from "./GameResult";
import s from "./create.module.css";

/**
 * The box, and the three other ways to say what you want.
 *
 * Zul: *"add more mediums for user to include in the prompt/input (game link,
 * picture, docs for the game flow/description)."* All three are real ways
 * people describe a game and none of them fitted in one short line:
 *
 * - a LINK is "make it like this one", and the page's own title usually names
 *   the genre outright;
 * - a PICTURE is "make it feel like this", which is the thing words are worst
 *   at and a vision model is best at;
 * - NOTES are a design document, and a 600-character box was refusing them.
 *
 * The three extra fields are COLLAPSED by default. A form with six boxes gets
 * abandoned; a form with one box and a quiet "add a link, a picture or notes"
 * gets filled in. Nothing behind that summary is required, and the button works
 * without opening it.
 */
export function CreateForm({
  defaults,
  liveMode,
}: {
  defaults: Record<string, string | undefined>;
  liveMode: boolean;
}) {
  const [state, action, pending] = useActionState<CreateState, FormData>(makeGame, {
    kind: "idle",
  });
  const [picked, setPicked] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /**
   * What the boxes show: whatever was last submitted, falling back to the URL.
   *
   * A POST leaves the address bar alone, so without this the form re-renders
   * from empty `searchParams` and a pasted design document is simply gone. The
   * file input is the one thing that cannot be restored - browsers will not let
   * a page set it - so the hint says which file is still attached instead.
   */
  const sent = state.kind === "idle" ? undefined : state.sent;
  const v = (k: string) => sent?.[k] ?? defaults[k] ?? "";
  const hasExtras = Boolean(v("link") || v("notes"));

  return (
    <>
      <Card>
        <form className={s.form} action={action}>
          <label className={s.label} htmlFor="prompt">
            What game do you want?
          </label>
          <textarea
            id="prompt"
            name="prompt"
            className={s.textarea}
            rows={3}
            required
            minLength={3}
            maxLength={600}
            defaultValue={v("prompt")}
            placeholder="a hard flappy bird with PBot through chemistry pink pipes"
          />

          <details className={s.more} open={hasExtras}>
            <summary className={s.summary}>
              Add a link, a picture, or your own notes
            </summary>

            <div className={s.moreBody}>
              <label className={s.fieldLabel} htmlFor="link">
                A game like the one you want
              </label>
              <input
                id="link"
                name="link"
                type="url"
                className={s.input}
                defaultValue={v("link")}
                placeholder="https://itch.io/games/…"
              />
              <p className={s.hint}>
                The page&rsquo;s title and description are read &mdash; nothing
                else. If it needs a login, the words in the address are used.
              </p>

              <label className={s.fieldLabel} htmlFor="picture">
                A picture to take the look from
              </label>
              <input
                ref={fileRef}
                id="picture"
                name="picture"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className={s.input}
                onChange={(e) => setPicked(e.currentTarget.files?.[0]?.name ?? null)}
              />
              <p className={s.hint}>
                {/* Both halves are true and both matter. A picture is the one
                    input that only a model can read, and it is not free. */}
                {liveMode
                  ? "Up to 4MB, and about 1000px on its longest side. A picture costs roughly 1,400 extra tokens to look at."
                  : "This deployment is not calling a model, and a picture is the one input only a model can read — it will be ignored and the page will say so."}
                {picked ? ` Chosen: ${picked}.` : ""}
              </p>

              <label className={s.fieldLabel} htmlFor="notes">
                Notes, rules, a game-flow description
              </label>
              <textarea
                id="notes"
                name="notes"
                className={s.textarea}
                rows={5}
                maxLength={4000}
                defaultValue={v("notes")}
                placeholder={
                  "Paste a design doc, the flow, the rules, the content you want in it.\nUp to 4000 characters."
                }
              />
            </div>
          </details>

          <div className={s.row}>
            <Select label="Character" name="character" value={v("character")}
              options={[["pbot", "PBot"], ["aidan", "Aidan"], ["nadia", "Nadia"]]} />
            <Select label="Difficulty" name="difficulty" value={v("difficulty")}
              options={[["easy", "Easy"], ["normal", "Normal"], ["hard", "Hard"]]} />
            <Select label="Language" name="language" value={v("language")}
              options={[["en", "English"], ["ms", "Bahasa Melayu"]]} />
            <Select label="Colours" name="skin" value={v("skin")}
              options={[["arcade", "Its own"], ["pandai", "Pandai DS"]]} />
          </div>

          <button className={s.submit} type="submit" disabled={pending}>
            {pending ? "Making it…" : "Make it"}
          </button>

          {liveMode ? (
            <p className={s.note}>
              A model writes the physics for each game, so this costs real money
              per new prompt. Asking the same thing twice is free &mdash; it is
              cached. Every game is still checked by simulation before you see
              it. See <code>lib/arcade/guard.ts</code> for the limits.
            </p>
          ) : (
            <p className={s.note}>
              Free. Nothing here calls a paid model &mdash; the physics are
              derived from your words in code. See{" "}
              <code>lib/arcade/generate.ts</code>.
            </p>
          )}
        </form>
      </Card>

      {state.kind === "problem" && (
        <Card>
          <strong className={s.warn}>That brief could not be read</strong>
          <p className={s.body}>{state.message}</p>
        </Card>
      )}

      {state.kind === "result" && (
        <>
          {/* Said rather than hidden. A brief carrying an upload genuinely
              cannot live in a URL, and letting someone believe they can send
              this link to a colleague is a small lie with a confusing ending. */}
          <p className={s.guess}>
            This one used an upload, so it has no link of its own to share
            &mdash; a picture cannot travel in a web address. Ask for the same
            thing in words and the result is shareable.
          </p>
          <GameResult outcome={state.outcome} inputs={state.inputs} />
        </>
      )}
    </>
  );
}

function Select({
  label, name, value, options,
}: {
  label: string;
  name: string;
  value?: string;
  options: [string, string][];
}) {
  return (
    <label className={s.field}>
      <span className={s.fieldLabel}>{label}</span>
      <select name={name} defaultValue={value ?? ""} className={s.select}>
        <option value="">Auto</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}
