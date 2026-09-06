/**
 * Arcade scenes - the game's own colour, free of the design system.
 *
 * Zul, 2026-09-06: "use whatever style for the game, keep Pandai DS as a backup
 * and reference (minor)."
 *
 * Until now every pixel on the canvas came from a DS ramp, and that cost more
 * than it bought. Two problems, both visible in every screenshot:
 *
 * 1. **One ramp cannot paint a game.** A DS subject identity is a single hue in
 *    five tints. Flappy Bird is a BLUE sky with GREEN pipes - two families. With
 *    one, the obstacles were the sky in a darker tint, which is exactly why the
 *    result read as a diagram of a game rather than a game.
 * 2. **DS tints are for surfaces behind text.** They are chosen to be quiet.
 *    Quiet is the opposite of what a canvas wants.
 *
 * So a scene carries TWO families: `sky` (the backdrop, clouds, far hills) and
 * `solid` (obstacles, ground, platforms - the things you hit). That single split
 * is most of the difference.
 *
 * **The DS is still the backup, and the path is live.** A palette key with no
 * scene here - a subject the DS gains tomorrow - falls through to the token ramp
 * in GameFrame. Identity still comes from the DS vocabulary: the model picks
 * `chemistry`, and chemistry still means pink. Only the rendered values are
 * tuned for a screen you play rather than a screen you read.
 *
 * This file is the ONE place allowed to hold colour values outside the generated
 * token layer; `scripts/check-ds.mjs` names it explicitly so the exception is a
 * decision on the record rather than a hole in the gate.
 */

import type { Palette } from "@/components/arcade/paint";

export type SceneName =
  | "dawn"
  | "forest"
  | "night"
  | "dusk"
  | "candy"
  | "ocean"
  | "lava"
  | "mint"
  | "steel"
  | "sand";

/**
 * Ten scenes. Each is a sky family and a solid family that read as different
 * materials, plus ink for the score and gold for collectibles.
 *
 * `ink` is the score's fill and `white` its outline, so the two must contrast
 * with each other as well as with the sky - which is why night keeps a DARK ink
 * under a light outline rather than going light-on-dark twice.
 */
export const SCENES: Record<SceneName, Palette> = {
  dawn: {
    deep: "#1e6e8c", mid: "#4ec0e4", light: "#a9e3f2", white: "#f7fcff",
    solidDeep: "#2c7a2f", solidMid: "#63c24c", solidEdge: "#1b4f1e",
    edge: "#1b4f1e", ink: "#123047", gold: "#ffc94a", danger: "#e5533d",
  },
  // Green canopy light over WOODEN solids. The first draft had green on green
  // and proved the point of the split by breaking it: the platformer came out
  // one flat sheet of green with the platforms barely findable in it.
  forest: {
    deep: "#1f5a44", mid: "#4fa87a", light: "#bfe8cf", white: "#f4fff7",
    solidDeep: "#5c3a1e", solidMid: "#8a5a2b", solidEdge: "#38220f",
    edge: "#38220f", ink: "#14301f", gold: "#ffd76b", danger: "#d9534f",
  },
  night: {
    deep: "#101a3a", mid: "#23306b", light: "#4a5aa0", white: "#dce3ff",
    solidDeep: "#2b1e5a", solidMid: "#6c4bc4", solidEdge: "#180f35",
    edge: "#180f35", ink: "#0b1026", gold: "#ffd86b", danger: "#ff6b8a",
  },
  dusk: {
    deep: "#4a2360", mid: "#b0477f", light: "#f09a6b", white: "#ffe9d6",
    solidDeep: "#2e4057", solidMid: "#4e7a9b", solidEdge: "#1c2a3a",
    edge: "#1c2a3a", ink: "#2a1233", gold: "#ffd166", danger: "#ef476f",
  },
  candy: {
    deep: "#a3266b", mid: "#f368a0", light: "#ffc2dc", white: "#fff2f8",
    solidDeep: "#7a2e8f", solidMid: "#c464d8", solidEdge: "#4e1a5c",
    edge: "#4e1a5c", ink: "#46102f", gold: "#ffd972", danger: "#ff5c7a",
  },
  ocean: {
    deep: "#0b4f6c", mid: "#1b98b8", light: "#96dce8", white: "#f0fdff",
    solidDeep: "#b0532e", solidMid: "#ee8b4c", solidEdge: "#7a3319",
    edge: "#7a3319", ink: "#06303f", gold: "#ffd166", danger: "#e63946",
  },
  lava: {
    deep: "#3a1212", mid: "#7a2418", light: "#c2542b", white: "#ffe0c2",
    solidDeep: "#2a2a2e", solidMid: "#55555c", solidEdge: "#17171a",
    edge: "#17171a", ink: "#2b0d0d", gold: "#ffb13b", danger: "#ff4530",
  },
  mint: {
    deep: "#14705e", mid: "#35b79a", light: "#b4eedf", white: "#f2fffb",
    solidDeep: "#1f6f8b", solidMid: "#3fa8c9", solidEdge: "#124355",
    edge: "#124355", ink: "#0c3a31", gold: "#ffce4f", danger: "#e4572e",
  },
  steel: {
    deep: "#23303f", mid: "#46617e", light: "#9fb6cb", white: "#eef4fa",
    solidDeep: "#8a5a16", solidMid: "#d69a2e", solidEdge: "#5a3a0c",
    edge: "#5a3a0c", ink: "#14202c", gold: "#ffd166", danger: "#e0574a",
  },
  sand: {
    deep: "#9c6b33", mid: "#e0a85c", light: "#f6dfb8", white: "#fff8ec",
    solidDeep: "#6b4a2a", solidMid: "#a9793f", solidEdge: "#45301a",
    edge: "#45301a", ink: "#3a2612", gold: "#ffd98e", danger: "#c64b3a",
  },
};

/**
 * Which scene each DS identity wears.
 *
 * Chosen so a subject still reads as itself - chemistry pink, biology green,
 * physics after dark - because a student who sees chemistry pink everywhere
 * else in Pandai should not meet a grey chemistry game.
 */
const BY_PALETTE: Record<string, SceneName> = {
  // Subjects
  math: "dawn",
  "add-math": "steel",
  science: "mint",
  biology: "forest",
  chemistry: "candy",
  physics: "night",
  "comp-science": "steel",
  "b-melayu": "dawn",
  english: "ocean",
  "chi-lang": "lava",
  geo: "sand",
  history: "sand",
  islamic: "mint",
  kafa: "mint",
  moral: "dusk",
  account: "ocean",
  business: "dusk",
  economy: "steel",
  rbt: "lava",
  // Accent families, for a game with no subject to derive from
  primary: "dawn",
  secondary: "mint",
  tertiary: "dusk",
  success: "forest",
  warning: "sand",
  alert: "lava",
  informative: "ocean",
  gold: "sand",
  bronze: "lava",
  silver: "steel",
};

/**
 * The scene for a spec, or null to fall back to the DS token ramp.
 *
 * `theme.background` wins where it is decisive: a spec that asked for night gets
 * night whatever its subject, because the model chose that deliberately and a
 * chemistry game set at night should not come out pink and sunny. `sky` and
 * `plain` are not decisive - they mean "no opinion" - so the subject decides.
 */
export function sceneFor(
  palette: string,
  background: "sky" | "night" | "forest" | "plain",
): Palette | null {
  if (background === "night") return SCENES.night;
  if (background === "forest") return SCENES.forest;
  const name = BY_PALETTE[palette];
  return name ? SCENES[name] : null;
}
