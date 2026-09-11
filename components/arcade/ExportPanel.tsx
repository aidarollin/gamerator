"use client";

import { useState, useSyncExternalStore } from "react";
import type { ArcadeSpec } from "@/lib/arcade/schema";
import { encodeSpec } from "@/lib/arcade/embed";
import e from "./export.module.css";

/**
 * How a game gets into Pandai.
 *
 * Three forms, cheapest integration first. Pandai is Laravel with Blade and
 * Alpine, so the useful question is not "what is elegant" but "what can a
 * Pandai engineer paste into a .blade.php file this afternoon".
 */

type Tab = "iframe" | "blade" | "json";

/** Where an export points when it is rendered on the server. */
const PROD_ORIGIN = "https://gamerator.aidaasofiah.workers.dev";
const NO_SUBSCRIBE = () => () => {};

export function ExportPanel({ spec }: { spec: ArcadeSpec }) {
  const [tab, setTab] = useState<Tab>("iframe");
  const [copied, setCopied] = useState<string | null>(null);

  /**
   * The origin, without a hydration mismatch.
   *
   * This was `typeof window !== "undefined" ? window.location.origin : PROD`,
   * which renders one string on the server and a different one on the client
   * the moment you are not on the production domain - so React threw this
   * subtree away and rebuilt it on every load of `/create` from localhost or a
   * preview. It matched in production, which is exactly why nobody noticed; it
   * surfaced when the walkthrough deck embedded `/create` in an iframe.
   *
   * `useSyncExternalStore` is the sanctioned way to read a client-only value:
   * it renders the server snapshot on the server AND on the hydrating client,
   * then swaps. The subscribe is a no-op because an origin never changes.
   */
  const origin = useSyncExternalStore(
    NO_SUBSCRIBE,
    () => window.location.origin,
    () => PROD_ORIGIN,
  );
  const url = `${origin}/embed?s=${encodeSpec(spec)}`;
  const json = JSON.stringify(spec, null, 2);

  const iframe = `<iframe
  src="${url}"
  title="${spec.meta.title}"
  width="360" height="560"
  style="border:0;border-radius:24px;max-width:100%"
  loading="lazy"
  allow="autoplay; fullscreen"
  allowfullscreen
></iframe>`;

  const blade = `{{-- resources/views/games/${slug(spec.meta.title)}.blade.php --}}
<div class="pandai-game" x-data="{ loaded: false }">
  <iframe
    src="{{ config('gamerator.url') }}/embed?s={{ $spec }}"
    title="${spec.meta.title}"
    width="360" height="560"
    style="border:0;border-radius:24px;max-width:100%"
    loading="lazy"
    allow="autoplay; fullscreen"
    allowfullscreen
    x-on:load="loaded = true"
  ></iframe>
</div>

{{-- Controller:
  \\$spec = base64_encode(json_encode(\\$game->spec));
  // or store the encoded string the export gave you, verbatim
--}}`;

  const body = tab === "iframe" ? iframe : tab === "blade" ? blade : json;

  const copy = async (what: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied("failed");
    }
  };

  const download = () => {
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug(spec.meta.title)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className={e.panel}>
      <div className={e.head}>
        <strong className={e.title}>Put this in Pandai</strong>
        <div className={e.tabs} role="tablist">
          {(["iframe", "blade", "json"] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? e.tabOn : e.tab}
              onClick={() => setTab(t)}
            >
              {t === "iframe" ? "Embed" : t === "blade" ? "Blade" : "Spec JSON"}
            </button>
          ))}
        </div>
      </div>

      <p className={e.hint}>
        {tab === "iframe" &&
          "Zero integration. Paste it anywhere in Pandai and it works today - the game carries its own styling and mascots."}
        {tab === "blade" &&
          "The same embed as a Blade partial, with the spec passed from a controller so games can be stored and swapped without redeploying."}
        {tab === "json" &&
          "The source of truth. Small enough to store in a column, diffable in review, and the only thing a future native renderer would need."}
      </p>

      <pre className={e.code}>{body}</pre>

      <div className={e.actions}>
        <button className={e.btn} onClick={() => copy(tab, body)}>
          {copied === tab ? "Copied" : "Copy"}
        </button>
        <button className={e.btn} onClick={download}>
          Download JSON
        </button>
        <a className={e.btn} href={url} target="_blank" rel="noreferrer">
          Open embed
        </a>
      </div>

      <p className={e.foot}>
        The spec travels inside the URL, so nothing has to be stored here for an
        embed to work. When this service gets a database the link shortens to an
        id and this long form stays as the no-storage fallback.
      </p>
    </section>
  );
}

function slug(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "pandai-game"
  );
}
