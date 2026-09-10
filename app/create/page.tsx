import Link from "next/link";
import { Card, Chip } from "@/components/ds";
import { headers } from "next/headers";
import { readLanguage } from "@/lib/arcade/generate";
import { providerMode } from "@/lib/config";
import { ArcadeBrief } from "@/lib/arcade/brief";
import { generateGame } from "@/lib/games";
import { GameGallery } from "@/components/arcade/GameGallery";
import { GALLERY } from "@/lib/gallery";
import { CreateForm } from "./CreateForm";
import { GameResult } from "./GameResult";
import s from "./create.module.css";

export const metadata = {
  title: "Make a game - gamerator",
  description: "Describe a game and play it.",
};

/**
 * Prompts that show what the box UNDERSTANDS, rather than what it can build -
 * the gallery below answers that far better than a list of strings can. These
 * are the things a card cannot show: a difficulty, a character, a colour, a
 * genre with no engine that gets adapted, and a request written in Malay.
 */
const EXAMPLES = [
  "a hard flappy bird with PBot through chemistry pink pipes",
  "an easy gentle maze chase for Year 1, Nadia, forest green",
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
          Describe the game you want &mdash; in words, with a link, with a
          picture, or by pasting your notes. You get a playable Pandai game back.
        </p>
      </header>

      <CreateForm defaults={sp} liveMode={providerMode() === "live"} />

      <Card>
        <div className={s.examples}>
          {EXAMPLES.map((e) => (
            <Link key={e} href={`/create?prompt=${encodeURIComponent(e)}`}
              className={s.exampleLink}>
              <Chip>{e}</Chip>
            </Link>
          ))}
        </div>
      </Card>

      {/*
        The GET path, which is what every shareable link, gallery card and
        example chip goes through. The POST path renders its own result inside
        `CreateForm`, because a brief carrying an upload has no URL to live at -
        see `actions.ts`. Both call the same `GameResult`, so the two routes
        cannot drift into two slightly different pages.
      */}
      {submitted && <SharedResult params={sp} />}

      {/* A blank text box is the least informative thing this product could
          lead with, and it led with it for every engine ever built - four of
          the ten had shipped without once being named on this page. */}
      <Card>
        <GameGallery games={GALLERY} />
      </Card>
    </main>
  );
}

async function SharedResult({ params }: { params: Record<string, string | undefined> }) {
  const parsed = ArcadeBrief.safeParse({
    prompt: params.prompt,
    notes: params.notes || undefined,
    link: params.link || undefined,
    character: params.character || undefined,
    palette: params.palette || undefined,
    difficulty: params.difficulty || undefined,
    skin: params.skin || undefined,
    // "Auto" sends an empty string. Detect the language from the words before
    // falling back to English, or a Malay request comes back in English - which
    // it did, live, for "permainan lari yang laju untuk Tahun 4".
    language:
      params.language || readLanguage(`${params.prompt ?? ""} ${params.notes ?? ""}`) || "en",
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

  const { outcome, inputs } = await generateGame(parsed.data, client);
  return <GameResult outcome={outcome} inputs={inputs} />;
}
