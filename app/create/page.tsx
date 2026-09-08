import Link from "next/link";
import { Card, Chip } from "@/components/ds";
import { ArcadeGame } from "@/components/arcade/ArcadeGame";
import { ExportPanel } from "@/components/arcade/ExportPanel";
import { headers } from "next/headers";
import { generateArcade, readLanguage } from "@/lib/arcade/generate";
import { providerMode } from "@/lib/config";
import { ArcadeBrief } from "@/lib/arcade/brief";
import { ENGINES } from "@/lib/arcade/schema";
import { CHARACTERS } from "@/components/arcade/characters";
import s from "./create.module.css";

export const metadata = {
  title: "Make a game - gamerator",
  description: "Describe a game and play it.",
};

/**
 * The examples are the only place most people find out what this can do, so
 * they cover the RANGE rather than five variations of the first engine built.
 * Four of the ten engines had shipped without ever appearing here.
 */
const EXAMPLES = [
  "a hard flappy bird with PBot through chemistry pink pipes",
  "a pac man style maze chase with ghosts",
  "a tetris puzzle that speeds up",
  "a candy crush style match 3 for Year 3",
  "a space invaders game with PBot",
  "a mortal kombat style fighting game",
  "motorcycle racing game",
  "permainan terbang yang senang untuk Tahun 2",
];

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const submitted = typeof sp.prompt === "string" && sp.prompt.trim().length > 0;

  return (
    <main className={s.page}>
      <header className={s.head}>
        <h1 className={s.h1}>Make a game</h1>
        <p className={s.lede}>
          Describe the game you want. You get a playable Pandai game back &mdash;
          same mascots, same colours, same design system as the rest of the app.
        </p>
      </header>

      <Card>
        <form className={s.form} method="GET" action="/create">
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
            defaultValue={sp.prompt ?? ""}
            placeholder="a hard flappy bird with PBot through chemistry pink pipes"
          />

          <div className={s.row}>
            <Field label="Character" name="character" value={sp.character}
              options={Object.entries(CHARACTERS).map(([k, v]) => [k, v.label])} />
            <Field label="Difficulty" name="difficulty" value={sp.difficulty}
              options={[["easy", "Easy"], ["normal", "Normal"], ["hard", "Hard"]]} />
            <Field label="Language" name="language" value={sp.language}
              options={[["en", "English"], ["ms", "Bahasa Melayu"]]} />
          </div>

          <button className={s.submit} type="submit">
            Make it
          </button>
          {/* This said "nothing here calls a paid model yet" for weeks, and the
              hour the model was switched on it became a lie printed under the
              button that spends the money. The page reports the mode it is
              actually in. */}
          {providerMode() === "live" ? (
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

        <div className={s.examples}>
          {EXAMPLES.map((e) => (
            <Link key={e} href={`/create?prompt=${encodeURIComponent(e)}`}
              className={s.exampleLink}>
              <Chip>{e}</Chip>
            </Link>
          ))}
        </div>
      </Card>

      {submitted && <Result params={sp} />}
    </main>
  );
}

function Field({
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

async function Result({ params }: { params: Record<string, string | undefined> }) {
  const parsed = ArcadeBrief.safeParse({
    prompt: params.prompt,
    character: params.character || undefined,
    palette: params.palette || undefined,
    difficulty: params.difficulty || undefined,
    // "Auto" sends an empty string. Detect the language from the words before
    // falling back to English, or a Malay request comes back in English - which
    // it did, live, for "permainan lari yang laju untuk Tahun 4".
    language: params.language || readLanguage(params.prompt ?? "") || "en",
  });

  if (!parsed.success) {
    return (
      <Card>
        <strong className={s.warn}>That brief could not be read</strong>
        <ul className={s.issues}>
          {parsed.error.issues.map((i, n) => (
            <li key={n}>{i.path.join(".")}: {i.message}</li>
          ))}
        </ul>
      </Card>
    );
  }

  /**
   * Who is asking, for the rate limiter.
   *
   * Cloudflare sets `cf-connecting-ip` and it cannot be spoofed by the client;
   * `x-forwarded-for` can be, so it is only a local-development fallback. An
   * unknown caller shares one bucket, which is the strict reading rather than
   * the generous one - an unidentified flood should be throttled together, not
   * given a fresh allowance each time.
   */
  const h = await headers();
  const client =
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const outcome = await generateArcade(parsed.data, client);

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
