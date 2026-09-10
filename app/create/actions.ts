"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { ArcadeBrief } from "@/lib/arcade/brief";
import { readLanguage } from "@/lib/arcade/generate";
import { generateGame, type GameOutcome, type InputNotes } from "@/lib/games";

/**
 * Making a game from a form that can carry a file.
 *
 * `/create` was a GET form for its whole life, and that was worth something: the
 * brief lives in the query string, so a link is shareable, the back button
 * works, a refresh is free because the cache key is the same, and every card in
 * the gallery is just an anchor. None of that survives a file upload - there is
 * no way to put four megabytes of PNG in a URL.
 *
 * SO BOTH ROUTES EXIST, AND THE FORM CHOOSES BETWEEN THEM PER SUBMISSION.
 * A brief made of words redirects to the GET URL it would have had, keeping
 * every one of those properties. A brief carrying a picture, or notes too long
 * to survive a URL, is answered inline and SAYS it cannot be shared as a link -
 * because it genuinely cannot, and quietly dropping the upload to keep the URL
 * pretty would be the worse trade.
 */

export type CreateState =
  | { kind: "idle" }
  | { kind: "problem"; message: string; sent: Record<string, string> }
  | {
      kind: "result";
      outcome: GameOutcome;
      inputs: InputNotes;
      shareable: false;
      /**
       * WHAT THEY TYPED, HANDED BACK.
       *
       * A POST does not change the URL, so the form re-renders from the
       * `searchParams` defaults - which are empty. The first submission with a
       * pasted design document in it wiped the document. Same family as the
       * `/create` box being eaten by the game’s key handler: the product
       * destroying work somebody just did.
       */
      sent: Record<string, string>;
    };

/**
 * How much brief still fits in a URL.
 *
 * Browsers and CDNs disagree about the real ceiling; two thousand characters is
 * comfortably under every one of them, and a brief longer than that is a
 * document rather than a request.
 */
const URL_BUDGET = 2000;

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
};

export async function makeGame(_prev: CreateState, form: FormData): Promise<CreateState> {
  const prompt = str(form, "prompt") ?? "";
  const notes = str(form, "notes");
  const link = str(form, "link");
  const file = form.get("picture");
  const picture = file instanceof File && file.size > 0 ? file : undefined;

  const fields: Record<string, string | undefined> = {
    prompt,
    notes,
    link,
    character: str(form, "character"),
    difficulty: str(form, "difficulty"),
    language: str(form, "language"),
    skin: str(form, "skin"),
  };

  /**
   * The shareable path, taken whenever it can be.
   *
   * A redirect rather than rendering here, so the URL in the address bar is the
   * brief - which is what makes a result something you can send to somebody.
   */
  if (!picture) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(fields)) if (v) qs.set(k, v);
    const url = `/create?${qs.toString()}`;
    if (url.length <= URL_BUDGET) redirect(url);
  }

  const parsed = ArcadeBrief.safeParse({
    prompt,
    notes,
    link,
    character: fields.character,
    palette: str(form, "palette"),
    difficulty: fields.difficulty,
    skin: fields.skin,
    language: fields.language || readLanguage(`${prompt} ${notes ?? ""}`) || "en",
  });
  if (!parsed.success) {
    const kept: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields)) if (v) kept[k] = v;
    return {
      kind: "problem",
      sent: kept,
      message: parsed.error.issues
        .map((i) => `${i.path.join(".") || "that"}: ${i.message}`)
        .join("; "),
    };
  }

  // Cloudflare sets `cf-connecting-ip` and the client cannot spoof it;
  // `x-forwarded-for` can be, so it is a local-development fallback only.
  const h = await headers();
  const client =
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const { outcome, inputs } = await generateGame(parsed.data, client, picture);
  const sent: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) if (v) sent[k] = v;
  return { kind: "result", outcome, inputs, shareable: false, sent };
}
