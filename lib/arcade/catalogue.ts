import type { Engine } from "./schema";
import type { TEMPLATES } from "@/lib/spec/schema";

/**
 * EVERY GAME SOMEONE IS LIKELY TO TYPE INTO THE BOX, and what happens to it.
 *
 * Zul asked to "imagine every game possible for user to prompt". This file is
 * that imagining, and it is deliberately CODE rather than a document, because a
 * document drifts and this is the routing table itself. Adding a genre here is
 * how a genre becomes answerable; `catalogue.test.ts` asserts every entry
 * routes the way it says it does.
 *
 * The exercise found something worse than the missing engines. The old router
 * knew about ~20 genres. Everything else - pac-man, tetris, candy crush,
 * doodle jump, a penalty shootout, whack-a-mole, a horror game - matched
 * nothing at all and fell through to `endless-flyer` with `confident: false`.
 * A refusal is a bad answer that a person can act on. A FLYER THEY DID NOT ASK
 * FOR, with one apologetic line above it, is a wrong answer wearing the costume
 * of a right one, and it was the single most common outcome in the space of
 * things people actually type.
 *
 * So the rule for this file: **a genre in here is never a silent guess.** It
 * gets an engine, an adaptation said out loud, or a refusal that names what is
 * missing.
 *
 * WHAT DECIDES WHICH: the VERBS. Not the theme, not the setting, not the
 * vibe - what your hands do. Racing and running are both "go forward, avoid
 * things", so a race is the runner wearing a different name. Tetris and snake
 * are both on a grid and share nothing else, which is why tetris needed a real
 * engine rather than a mapping. Every entry records its verbs so the next
 * person can argue with the decision instead of guessing at it.
 */

export type Disposition =
  /** A built engine, named outright by the prompt. Weight 3 is unambiguous. */
  | { kind: "engine"; engine: Engine; weight: 1 | 3 }
  /**
   * No engine of its own, but a built one shares the verbs and can honestly
   * WEAR it. `how` is the sentence shown to the reader and given to the model -
   * an adaptation is announced, never silent.
   */
  | { kind: "adapt"; engine: Engine; how: string }
  /**
   * A PANDAI DESIGN SYSTEM LEARNING TEMPLATE rather than an arcade engine.
   *
   * These five are the older half of the product and they never went away:
   * `lib/spec` validates them, `components/game` renders them, and every pixel
   * comes from the DS token layer. They were reachable only at
   * `/play/preview` - so a person asking for "a quiz about photosynthesis" got
   * a flyer, and the five games in the repo that are ALREADY pure Pandai were
   * the ones nobody could ask for.
   */
  | { kind: "template"; template: (typeof TEMPLATES)[number] }
  /**
   * No engine and no honest adaptation. `why` names what is actually missing,
   * because "no engine for that yet" tells someone nothing they can use.
   */
  | { kind: "refuse"; why: string };

export type Genre = {
  /** How the answer refers to it: "a racing game", "a tower defence game". */
  label: string;
  /** The words that name it. */
  words: RegExp;
  /** What your HANDS do. This is the thing that decides the disposition. */
  verbs: string;
  disposition: Disposition;
  /** Prompts that must route as declared. Enforced by catalogue.test.ts. */
  examples: string[];
};

const engine = (e: Engine, weight: 1 | 3 = 3): Disposition => ({ kind: "engine", engine: e, weight });
const adapt = (e: Engine, how: string): Disposition => ({ kind: "adapt", engine: e, how });
const refuse = (why: string): Disposition => ({ kind: "refuse", why });
const template = (t: (typeof TEMPLATES)[number]): Disposition => ({ kind: "template", template: t });

/**
 * The catalogue, in the order it is consulted for adaptations and refusals.
 *
 * Engine words are SCORED rather than first-match-wins, so their order here
 * does not decide anything - "a snake game where you fly" should not be settled
 * by which regex sits higher. Adaptations and refusals are first-match, so
 * specific entries come before broad ones.
 */
export const CATALOGUE: Genre[] = [
  /* ------------------------------------------------- the ten built engines */

  {
    label: "a flying game",
    words: /flappy|flyer|terbang|jetpack|helicopter/i,
    verbs: "tap to stay up, thread a gap",
    disposition: engine("endless-flyer"),
    examples: ["a hard flappy bird with PBot", "permainan terbang untuk Tahun 2"],
  },
  {
    label: "a flying game",
    words: /\bfly\b|\bbird\b|\bwing|burung/i,
    verbs: "tap to stay up, thread a gap",
    disposition: engine("endless-flyer", 1),
    examples: ["a game where you fly through gaps"],
  },
  {
    label: "an endless runner",
    words: /endless runner|dino|side.?scroll/i,
    verbs: "go forward, jump what is in the way",
    disposition: engine("endless-runner"),
    examples: ["an endless runner that gets faster"],
  },
  {
    label: "an endless runner",
    words: /\brun\b|running|runner|\blari\b|jump over|obstacle/i,
    verbs: "go forward, jump what is in the way",
    disposition: engine("endless-runner", 1),
    examples: ["permainan lari yang laju untuk Tahun 4"],
  },
  {
    label: "a platformer",
    words: /mario|platformer|platform game|sonic/i,
    verbs: "run, jump between solid ground, reach the end",
    disposition: engine("platformer"),
    examples: ["a mario style platformer with coins"],
  },
  {
    label: "a platformer",
    words: /platform|\blevel\b|coins|world \d/i,
    verbs: "run, jump between solid ground, reach the end",
    disposition: engine("platformer", 1),
    examples: ["a game with platforms and coins"],
  },
  {
    label: "a brick breaker",
    words: /breakout|brick.?breaker|arkanoid/i,
    verbs: "slide along the bottom, bounce a ball, clear a wall",
    disposition: engine("brick-breaker"),
    examples: ["a breakout game with a paddle"],
  },
  {
    label: "a brick breaker",
    words: /brick|paddle|\bball\b|\bbata\b/i,
    verbs: "slide along the bottom, bounce a ball, clear a wall",
    disposition: engine("brick-breaker", 1),
    examples: ["bounce a ball off a paddle to break bricks"],
  },
  {
    label: "a snake game",
    words: /\bsnake\b|nokia|\bular\b/i,
    verbs: "steer a growing line around a grid without hitting yourself",
    disposition: engine("snake"),
    examples: ["a snake game on a grid", "permainan ular untuk Tahun 2"],
  },
  {
    label: "a snake game",
    words: /grow longer|eat food/i,
    verbs: "steer a growing line around a grid without hitting yourself",
    disposition: engine("snake", 1),
    examples: ["a game where you eat food and grow longer"],
  },
  {
    label: "a fighting game",
    words: /mortal kombat|street fighter|tekken|fighting game|\bbrawler\b/i,
    verbs: "close the distance, time a strike, block one coming back",
    disposition: engine("duel"),
    examples: ["a mortal kombat style fighting game", "street fighter but with PBot"],
  },
  {
    label: "a fighting game",
    words: /\bfight|\bduel\b|\bspar|combat|\bpunch|\blawan\b|\bkick\b/i,
    verbs: "close the distance, time a strike, block one coming back",
    disposition: engine("duel", 1),
    examples: ["a brutal two minute duel against Nadia at night", "satu perlawanan lawan Aidan"],
  },

  /* ------------------------------------------------- the four built today */

  {
    label: "a space shooter",
    words: /space invaders|galaga|shoot.?em.?up|\basteroids\b|alien invasion/i,
    verbs: "slide along the bottom, fire upward, dodge what comes back",
    disposition: engine("shooter"),
    examples: ["a space invaders game", "a galaga style shooter"],
  },
  {
    label: "a space shooter",
    // The lookbehind is not decoration: "a bubble shooter game" is a match-3
    // wearing the word, and without it the weight-1 `shooter` beat the
    // adaptation table and handed back a space shooter.
    words: /(?<!bubble )shooter|shooting game|spaceship|space ship|\bufo\b|\baliens?\b|\btembak\b|kapal angkasa/i,
    verbs: "slide along the bottom, fire upward, dodge what comes back",
    disposition: engine("shooter", 1),
    examples: ["a game where you shoot aliens", "permainan tembak kapal angkasa"],
  },
  {
    label: "a maze chase",
    words: /pac.?man|pakman|maze chase|ghost game|hantu/i,
    verbs: "run a maze, clear every dot, stay away from what is chasing you",
    disposition: engine("maze-chase"),
    examples: ["a pac man style game", "a maze chase with ghosts"],
  },
  {
    label: "a maze chase",
    words: /\bmaze\b|\blabyrinth\b|chase|chased|\bkejar\b|hide and seek|police|thief|pencuri/i,
    verbs: "run a maze, clear every dot, stay away from what is chasing you",
    disposition: engine("maze-chase", 1),
    examples: ["a game where you collect dots in a maze", "permainan kejar-kejar"],
  },
  {
    label: "a falling block puzzle",
    words: /tetris|tetromino|falling block|block puzzle|columns game/i,
    verbs: "steer a falling piece, rotate it, complete a row",
    disposition: engine("falling-blocks"),
    examples: ["a tetris puzzle", "a falling block game"],
  },
  {
    label: "a falling block puzzle",
    words: /stack.*block|block.*stack|clear.*lines?\b|susun blok/i,
    verbs: "steer a falling piece, rotate it, complete a row",
    disposition: engine("falling-blocks", 1),
    examples: ["a game where you stack blocks and clear lines"],
  },
  {
    label: "a match three game",
    words: /candy crush|bejeweled|match.?3|match three|gem swap|jewel game/i,
    verbs: "swap two neighbours, line up three of a colour, watch it cascade",
    disposition: engine("match-3"),
    examples: ["a candy crush style game", "a match 3 puzzle"],
  },
  {
    label: "a match three game",
    words: /swap.*(tile|gem|candy|colour|color)|match.*(colour|color)s?\b|same colour|warna sama/i,
    verbs: "swap two neighbours, line up three of a colour, watch it cascade",
    disposition: engine("match-3", 1),
    examples: ["swap gems to match colours"],
  },

  /* ------------------------- the five Pandai DS learning templates */

  {
    label: "a quiz race",
    words: /quiz|trivia|question.*answer|multiple choice|\bkuiz\b|soalan/i,
    verbs: "read a question, pick the right answer before the timer",
    disposition: template("quiz-race"),
    examples: ["a quiz about photosynthesis for Year 5", "kuiz matematik untuk Tahun 4"],
  },
  {
    label: "a matching pairs game",
    // Moved off the refusal list on 2026-09-10. The reason recorded there was
    // that match-pairs "exists already but on the other side of the product,
    // and joining the two is a real piece of work rather than a routing
    // entry". That was true, and this is that work.
    words: /memory (game|match|card|pair)|memory matching|concentration game|match(ing)? (the )?pairs|pair up|padankan/i,
    verbs: "turn two cards, remember where the last one was",
    disposition: template("match-pairs"),
    examples: ["a memory matching game about animals", "match the pairs of countries and capitals"],
  },
  {
    label: "a sorting game",
    words: /sort(ing)?|categor(y|ise|ize)|group them|into buckets|\bbuckets?\b|asingkan|kumpulkan/i,
    verbs: "drop each thing into the group it belongs to",
    disposition: template("sort-buckets"),
    examples: ["a sorting game for mammals and reptiles", "sort these into solids and liquids"],
  },
  {
    label: "an ordering game",
    words: /put.*in order|sequence|chronolog|timeline|susun ikut|\border\b the (steps|events)/i,
    verbs: "put the steps into the right order",
    disposition: template("sequence-order"),
    examples: ["put the steps of the water cycle in order", "a timeline game about Malaysian history"],
  },
  {
    label: "a fill in the blank game",
    words: /fill.?in.?the.?blank|cloze|missing word|complete the sentence|isi tempat kosong/i,
    verbs: "choose the word that completes the sentence",
    disposition: template("fill-blank"),
    examples: ["fill in the blank sentences about verbs", "isi tempat kosong untuk Tahun 3"],
  },

  /* --------------------------------------------------------- adaptations */

  {
    label: "a racing game",
    words: /\brac(e|es|ing)\b|\bkart\b|driving|car game|motorbike|motorcycle|\bbike\b|\blumba\b|formula 1|\bf1\b/i,
    verbs: "go forward, avoid things, get faster",
    disposition: adapt(
      "endless-runner",
      "you ride forward, the track gets faster as you go, and clipping an obstacle ends the run",
    ),
    examples: ["motorcycle racing game", "a racing game with karts", "permainan lumba kereta"],
  },
  {
    label: "an adventure game",
    words: /\brpg\b|role.?play|adventure|open world|minecraft|roblox|\bquest\b|dungeon/i,
    verbs: "cross a world, collect what you find, reach the end",
    disposition: adapt(
      "platformer",
      "a level to cross - run, jump the gaps, collect what you find and reach the flag",
    ),
    examples: ["an open world adventure", "a minecraft style game"],
  },
  {
    label: "a climbing game",
    words: /doodle jump|icy tower|climb|\bclimbing\b|go up|higher and higher|panjat/i,
    verbs: "jump upward from one ledge to the next",
    disposition: adapt(
      "platformer",
      "the level is a climb - jump from ledge to ledge and get to the top without falling",
    ),
    examples: ["a doodle jump style game", "a game where you climb higher and higher"],
  },
  {
    label: "a pong game",
    words: /\bpong\b|air hockey|table tennis|ping pong/i,
    verbs: "slide along one edge, meet a ball, send it back",
    disposition: adapt(
      "brick-breaker",
      "you slide a bat along the bottom and keep the ball in play - the wall of bricks is what you are aiming it at",
    ),
    examples: ["a pong game", "an air hockey game"],
  },
  {
    label: "a catching game",
    words: /catch(ing)? (the )?(fall|drop|fruit|apple|egg|star)|basket game|tangkap/i,
    verbs: "slide along the bottom, be under the thing when it lands",
    disposition: adapt(
      "brick-breaker",
      "you slide along the bottom and catch what falls - every brick you break drops something worth taking",
    ),
    examples: ["a game where you catch falling fruit", "permainan tangkap buah"],
  },
  {
    label: "a bubble shooter",
    words: /bubble shooter|bust.?a.?move|puzzle bobble|bubble pop/i,
    verbs: "aim at a cluster, match colours, clear it",
    disposition: adapt(
      "match-3",
      "you clear the board by matching colours - three or more of the same and they go, and the ones above fall in",
    ),
    examples: ["a bubble shooter game"],
  },
  {
    label: "a stacking game",
    words: /tower stack|stack.*tower|stacking game|jenga/i,
    verbs: "place a falling piece so the pile stays alive",
    disposition: adapt(
      "falling-blocks",
      "pieces fall and you place them - stack them badly and the well fills up, stack them well and the row clears",
    ),
    examples: ["a tower stacking game"],
  },
  {
    label: "a crossing game",
    words: /frogger|crossy road|cross the road|road cross/i,
    verbs: "move a step at a time across a board full of things that are moving",
    disposition: adapt(
      "maze-chase",
      "you move a step at a time around a board while things move at you - get what you came for and do not get caught",
    ),
    examples: ["a frogger style game", "a crossy road game"],
  },
  {
    label: "a war or army game",
    words: /\bwar game|army game|\btank\b|\bsniper\b|\bguns?\b|\bcall of duty\b|counter strike|\bpubg\b|\bperang\b/i,
    verbs: "aim at a target, fire, avoid what is fired back",
    disposition: adapt(
      "shooter",
      "you fire energy shots upward at a fleet and dodge what comes back - the audience here is schoolchildren, so it is ships and sparks rather than soldiers",
    ),
    examples: ["a tank battle game", "a war game with guns"],
  },

  /* ------------------------------------------------------------ refusals */

  {
    label: "a tower defence game",
    words: /tower defen[cs]e|\btd game\b|plants vs zombies/i,
    verbs: "place things that act on their own, spend income, survive waves",
    disposition: refuse(
      "nothing here has an economy, a build phase, or units that act without you - a tower defence is three systems, not a skin on an existing one",
    ),
    examples: ["a tower defence game", "a plants vs zombies game"],
  },
  {
    label: "a card or board game",
    words: /card game|board game|\bchess\b|checkers|\bcatur\b|poker|domino|monopoly|uno\b|snakes and ladders/i,
    verbs: "take a turn, wait for an opponent to take theirs",
    disposition: refuse(
      "every engine here runs on a clock and rewards reaction - a turn-based game needs an opponent that SEARCHES rather than reacts, which is a different kind of program",
    ),
    examples: ["a chess board game", "a monopoly game"],
  },
  {
    label: "a logic puzzle",
    words: /sudoku|minesweeper|crossword|nonogram|logic puzzle|teka.?teki|tic.?tac.?toe|2048/i,
    verbs: "think without a clock, deduce, undo",
    disposition: refuse(
      "these are won by thinking rather than by reacting, and none of them can be checked for playability by simulating a perfect player - the guarantee every game here ships with would not apply",
    ),
    examples: ["a sudoku game", "a minesweeper game", "a tic tac toe game"],
  },
  {
    label: "a rhythm or music game",
    words: /rhythm game|guitar hero|\bosu\b|beat saber|dance.*mat|music game|piano tiles/i,
    verbs: "hit a note on the beat",
    disposition: refuse(
      "the audio here is synthesised at runtime with no timeline to score against - a rhythm game needs a chart, and a chart is authored content rather than a number a model can choose",
    ),
    examples: ["a rhythm game", "a piano tiles game"],
  },
  {
    label: "a typing or word game",
    words: /typing game|wordle|hangman|scrabble|word search|spelling game|anagram/i,
    verbs: "read, spell, type",
    disposition: refuse(
      "these are all reading and a keyboard, and the audience is a child on a phone with one thumb - it would be a worksheet with a score on it",
    ),
    examples: ["a typing game", "a hangman game"],
  },
  {
    label: "a sports game",
    words: /football|soccer|basketball|badminton|volleyball|bowling|\bgolf\b|penalty|sepak takraw|\bboling\b|cricket|baseball|\bnetball\b/i,
    verbs: "aim a shot at a goal, judge power and angle",
    disposition: refuse(
      "aiming a shot with power and angle at a moving keeper is its own engine - the nearest thing here is the brick breaker's bat, and calling that a penalty shootout would be a lie",
    ),
    examples: ["a football penalty game", "a basketball game"],
  },
  {
    label: "a launcher game",
    words: /angry birds|catapult|cannon|slingshot|archery|\bdarts\b|\bcrossbow\b/i,
    verbs: "set an angle and a power, launch an arc, knock a structure down",
    disposition: refuse(
      "an arc launched at a stack that collapses needs rigid-body physics - the shooter here fires in a straight line, and dressing that up as Angry Birds would be the silent substitution this router exists to prevent",
    ),
    examples: ["an angry birds style game", "an archery game"],
  },
  {
    label: "a reaction or tapping game",
    words: /whack.?a.?mole|whack a|reaction (test|game)|tap.*fast|clicker|idle game|cookie clicker|ketuk/i,
    verbs: "hit the right target before it leaves",
    disposition: refuse(
      "this one is genuinely small and genuinely missing - it is a grid, a timer and a spawn table, and it is the next engine worth building rather than something to fake",
    ),
    examples: ["a whack a mole game", "a clicker game"],
  },
  {
    label: "a repeat-the-pattern game",
    words: /simon says|repeat the (pattern|sequence)/i,
    verbs: "watch a pattern play, then play it back",
    disposition: refuse(
      "Simon is a memory of TIMING rather than of position, so it needs a playback phase nothing here has - `match-pairs` covers remembering WHERE something was, which is the half that already exists",
    ),
    examples: ["a simon says game"],
  },
  {
    label: "a simulation game",
    words: /farming game|cooking game|tycoon|dress.?up|\bthe sims\b|pet game|restaurant game|city build|simulator/i,
    verbs: "manage state over days, save, come back tomorrow",
    disposition: refuse(
      "a simulation is a save file and a progression, and nothing here persists - by deliberate scope, since Pandai owns the student record",
    ),
    examples: ["a farming game", "a cooking tycoon game"],
  },
  {
    label: "a fishing or hunting game",
    words: /fishing game|\bmemancing\b|hunting game|catch fish/i,
    verbs: "wait, time a pull, land the catch",
    disposition: refuse(
      "the whole game is one timing window repeated, and no engine here is built around waiting - it would be a bar and a button, which is not what anybody picturing it has in mind",
    ),
    examples: ["a fishing game"],
  },
  {
    label: "a scary game",
    words: /horror|scary|granny game|five nights|zombie|\bghost hunt|seram|menakutkan|creepy/i,
    verbs: "be frightened",
    disposition: refuse(
      "the audience is Malaysian schoolchildren playing between lessons, and nothing generated here is allowed to frighten anyone - this one is a decision rather than a missing engine, and it will not change",
    ),
    examples: ["a scary horror game", "a zombie survival game"],
  },
  {
    label: "a gambling game",
    words: /slot machine|casino|roulette|\bbetting\b|lottery|judi/i,
    verbs: "stake something, wait on chance",
    disposition: refuse(
      "a game of chance with a stake, aimed at children, is not something this will generate under any prompt",
    ),
    examples: ["a slot machine game"],
  },
  {
    label: "a multiplayer game",
    words: /multiplayer|\bonline\b|against (my |a )?friend|two player|player vs player|\bpvp\b|co.?op/i,
    verbs: "play against another person, somewhere else",
    disposition: refuse(
      "two people on two devices needs a server holding the match, and there is none - the duel engine is the offline version of this, and it will play against the computer rather than against your friend",
    ),
    examples: ["a multiplayer game with my friend", "an online pvp game"],
  },
  {
    label: "a 3D game",
    words: /\b3d\b|first.?person|third.?person|open.?world 3d|\bvr\b|virtual reality/i,
    verbs: "look around in three dimensions",
    disposition: refuse(
      "every engine here draws to a 2D canvas 360 by 540 - a third dimension is not a setting, it is a different renderer",
    ),
    examples: ["a 3d first person game"],
  },
];

/** The engine-word rows, in the shape the router's scorer wants. */
export const ENGINE_WORDS = CATALOGUE.flatMap((g) =>
  g.disposition.kind === "engine"
    ? [{ engine: g.disposition.engine, words: g.words, weight: g.disposition.weight }]
    : [],
);

/** The adaptations, in catalogue order. First match wins. */
export const ADAPTED = CATALOGUE.flatMap((g) =>
  g.disposition.kind === "adapt"
    ? [{ label: g.label, words: g.words, engine: g.disposition.engine, how: g.disposition.how }]
    : [],
);

/** The learning templates, in catalogue order. First match wins. */
export const TEMPLATE_WORDS = CATALOGUE.flatMap((g) =>
  g.disposition.kind === "template"
    ? [{ label: g.label, words: g.words, template: g.disposition.template }]
    : [],
);

/** The refusals, in catalogue order. First match wins. */
export const UNSUPPORTED = CATALOGUE.flatMap((g) =>
  g.disposition.kind === "refuse" ? [{ label: g.label, words: g.words, why: g.disposition.why }] : [],
);
