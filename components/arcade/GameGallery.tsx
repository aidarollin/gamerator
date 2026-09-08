"use client";

import Link from "next/link";
import type { GalleryEntry } from "@/lib/arcade/gallery";
import { EnginePreview } from "./EnginePreview";
import s from "./gallery.module.css";

/**
 * Every game you can ask for, playing itself.
 *
 * Zul: *"the available game is not clear, list all the available games with
 * preview so user could choose."* The box on `/create` accepted any sentence
 * and told you nothing about which sentences worked - so the ten engines were
 * discoverable only by guessing their names, and four of them had shipped
 * without ever being mentioned on the page.
 *
 * A card is a LINK to a prompt, not a mode switch. That matters: the free-text
 * box stays the way in, and the cards are examples of what it understands
 * rather than a menu that replaces it. Clicking one fills the box with a prompt
 * `catalogue.test.ts` proves reaches that engine, so the game you clicked is
 * the game you get.
 *
 * The verb line under each name is the same sentence the router uses to decide
 * whether a new genre can wear this engine. Showing the reader the actual
 * decision rule turns out to be the most useful thing on the card: "run a maze,
 * clear the dots, stay away from what is chasing you" tells you what to type
 * far better than the word `maze-chase` does.
 */
export function GameGallery({ games }: { games: GalleryEntry[] }) {
  return (
    <section className={s.wrap}>
      <div className={s.head}>
        <h2 className={s.title}>The {games.length} games it can make</h2>
        <p className={s.lede}>
          Each one is really running. Tap a card to start from it &mdash; then
          change the words to make it yours.
        </p>
      </div>
      <div className={s.grid}>
        {games.map((g) => (
          <Link
            key={g.engine}
            href={`/create?prompt=${encodeURIComponent(g.prompt)}`}
            className={s.card}
          >
            <span className={s.screen}>
              <EnginePreview spec={g.spec} />
            </span>
            <span className={s.name}>{g.name}</span>
            <span className={s.verbs}>{g.verbs}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
