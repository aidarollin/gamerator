import type { Character } from "@/lib/arcade/schema";


/**
 * The playable cast, drawn from real Pandai art.
 *
 * PBot ships as a set of expressions, which is a gift: the same character can
 * react. `flying` while alive, `dizzy` on a crash, `awe` on the start screen,
 * `mastery` when a run beats the target. A character that reacts is most of the
 * difference between "a prototype" and "a game".
 *
 * Aidan and Nadia are the battle avatars and have one pose each, so they tilt
 * and squash instead. Handled by the same interface rather than a special case.
 */

export type Mood = "idle" | "flying" | "dead" | "win";

export type CharacterArt = {
  label: string;
  /** Rendered size in world units. */
  size: number;
  /** Collision radius - deliberately smaller than the art, see below. */
  radius: number;
  src: Record<Mood, string>;
};

/**
 * The hitbox is smaller than the sprite on purpose.
 *
 * Pixel-accurate collision against a character with ears and a tail feels
 * unfair: players read the body as "the thing", not the silhouette. Every good
 * version of this game does the same. The physics and the playability
 * simulation both use WORLD.birdRadius, so this stays in step with them.
 */
export const CHARACTERS: Record<Character, CharacterArt> = {
  pbot: {
    label: "PBot",
    size: 46,
    radius: 14,
    src: {
      idle: "/characters/pbot-awe.svg",
      flying: "/characters/pbot.svg",
      dead: "/characters/pbot-dizzy.svg",
      win: "/characters/pbot-mastery.svg",
    },
  },
  aidan: {
    label: "Aidan",
    size: 44,
    radius: 14,
    src: {
      idle: "/characters/avatar-aidan.png",
      flying: "/characters/avatar-aidan.png",
      dead: "/characters/avatar-aidan.png",
      win: "/characters/avatar-aidan.png",
    },
  },
  nadia: {
    label: "Nadia",
    size: 44,
    radius: 14,
    src: {
      idle: "/characters/avatar-nadia.png",
      flying: "/characters/avatar-nadia.png",
      dead: "/characters/avatar-nadia.png",
      win: "/characters/avatar-nadia.png",
    },
  },
};

/** Loads every mood up front so a crash never shows a blank frame. */
export function loadCharacter(
  character: Character,
): Promise<Record<Mood, HTMLImageElement>> {
  const art = CHARACTERS[character];
  const moods = Object.keys(art.src) as Mood[];
  return Promise.all(
    moods.map(
      (mood) =>
        new Promise<[Mood, HTMLImageElement]>((resolve) => {
          const img = new Image();
          // Resolve on error too: a missing asset must degrade to a shape, not
          // hang the game behind a promise that never settles.
          img.onload = () => resolve([mood, img]);
          img.onerror = () => resolve([mood, img]);
          img.src = art.src[mood];
        }),
    ),
  ).then((pairs) => Object.fromEntries(pairs) as Record<Mood, HTMLImageElement>);
}
