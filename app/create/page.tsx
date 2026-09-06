import Link from "next/link";
import { Card, Chip } from "@/components/ds";
import { ArcadeGame } from "@/components/arcade/ArcadeGame";
import { ExportPanel } from "@/components/arcade/ExportPanel";
import { generateArcade } from "@/lib/arcade/generate";
import { ArcadeBrief } from "@/lib/arcade/brief";
import { ENGINES } from "@/lib/arcade/schema";
import { CHARACTERS } from "@/components/arcade/characters";
import s from "./create.module.css";

export const metadata = {
  title: "Make a game - gamerator",
  description: "Describe a game and play it.",
};

const EXAMPLES = [
  "a hard flappy bird with PBot through chemistry pink pipes",
  "an easy gentle flyer for Year 1, Nadia, forest green",
  "fast and brutal, tight gaps, one life, Aidan at night",
  "permainan terbang yang senang untuk Tahun 2",
  "a mortal kombat style fighting game",
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
          <p className={s.note}>
            Free. Nothing here calls a paid model yet &mdash; the physics are
            derived from your words in code. See{" "}
            <code>lib/arcade/generate.ts</code>.
          </p>
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
    language: params.language || "en",
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

  const outcome = await generateArcade(parsed.data);

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
        <p className={s.body}>
          An engine is code, tests and a design review &mdash; a change to this
          repository, not something a prompt can conjure. Try{" "}
          <Link href="/create?prompt=a+flappy+bird+with+PBot">a flyer</Link>,{" "}
          <Link href="/create?prompt=a+brick+breaker+game">breakout</Link> or{" "}
          <Link href="/create?prompt=a+snake+game">snake</Link> instead.
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
      <ArcadeGame spec={outcome.spec} />
      <ExportPanel spec={outcome.spec} />
    </div>
  );
}
