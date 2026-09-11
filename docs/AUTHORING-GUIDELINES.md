# AUTHORING GUIDELINES

> **2026-09-11:** written for the learning product's form. `/create` now takes
> one sentence plus optional notes, a link and a picture, and routes it through
> `lib/arcade/catalogue.ts` - see [DOCS.md](../DOCS.md). Kept as the rulebook for
> the five learning templates.

The rules shown to the person describing a game. This doc is the source; the
guidelines panel in the UI renders from it, so the two cannot drift.

The purpose is not to restrict people. It is to make the system's shape
**visible before someone hits the wall**, because a tool that silently ignores
half of what you asked for is worse than one that told you upfront.

## What you describe

You are describing **a game's content and its rules** — not how it looks and not
how it is built. Appearance comes from the Pandai Design System automatically,
and it is not negotiable per game. That is the point: every game generated here
looks like Pandai without anyone deciding it should.

Five things make a good brief:

| | Field | Example |
| --- | --- | --- |
| 1 | Subject and year level | Bahasa Melayu, Tahun 4 |
| 2 | The learning objective | Students recognise the meaning of ten common peribahasa |
| 3 | How it should play | Match each peribahasa to its meaning; twelve pairs; no timer |
| 4 | The content, or where it comes from | Use this list of peribahasa: ... |
| 5 | Anything that must be true | Every peribahasa must be in the Tahun 4 syllabus |

## What you can ask for

**Rules the system understands.** Timers, item counts, shuffling, scoring, how
many options a question has, whether answers are revealed immediately or at the
end, how many categories a sorting game has, whether there is a shared word bank.
Ask for these in plain language — "give them ninety seconds", "twelve pairs",
"don't shuffle, the order matters".

**Content, exactly.** If you paste a list of terms, the system uses your list. If
you describe the topic instead, it writes the content. Pasting your own list is
almost always better: it is already syllabus-correct and it costs less to
generate.

**Language.** Bahasa Melayu or English, and the whole game commits to one.

**Difficulty, by describing it.** "Make the wrong answers plausible, not silly"
works. So does "keep the sentences short — these are weaker readers."

## What you cannot ask for

Each of these has a reason, and the reason is more useful than the rule.

| Ask | Why not | Do this instead |
| --- | --- | --- |
| A new kind of game | A template is a renderer — code, tests, design review. It is a pull request, not a prompt. | Pick the closest of the five, or request a new template from the team |
| Specific colours, fonts, or layout | Appearance comes from Pandai DS 1.5 so that every game matches the product. Per-game styling is exactly the drift this tool exists to end. | Choose an accent (green, blue, purple, and so on) — the DS supplies the rest |
| Sound, video, or animation beyond the templates | Not in the spec, so the renderer has nowhere to put it | Note it for a future template |
| More than the item limits | The limits are layout facts, not preferences. Twenty-four cards is the ceiling a phone screen holds at DS sizing. | Split into two games |
| Images inside a game | The image pipeline is v1.1. `label-diagram` arrives with it. | Wait for v1.1, or use text items |
| Two languages in one game | Mixed-language content makes a game unreadable for the students who need it most | Generate one per language |
| Anything for a named student | This tool holds no student data and must not start | Keep briefs about content |

## How to write a brief that works

**Be specific about quantity.** "Some questions" produces a guess. "Ten
questions, four options each" produces what you meant.

**Say what correct looks like.** For a sorting game, name the categories. For a
matching game, say which side is the term and which is the meaning. The system
will pick if you do not, and it may pick the other way round.

**Paste your content when you have it.** A model writing Tahun 4 peribahasa is
guessing at your syllabus. Your list is not guessing.

**Say the constraint out loud.** "Nothing outside the DSKP Tahun 4 syllabus" is a
real instruction that changes the output. Assuming it is not.

### A brief that works

> Bahasa Melayu, Tahun 4. Objective: students recognise the meaning of common
> peribahasa. Matching game, 10 pairs, no timer — I want them thinking, not
> rushing. Left side is the peribahasa, right side is the meaning in simple
> Bahasa. Use these ten: *(list)*. Meanings should be one short sentence a
> nine-year-old reads without help.

Every field is filled, the content is supplied, and the two things that would
otherwise be guessed — which side is which, and the reading level — are stated.

### A brief that does not

> Make a fun BM game for primary school kids about peribahasa. Make it colourful
> and add some nice animations.

No year level, no objective, no count, no content, no rules. "Colourful" and
"animations" are the two things the system cannot act on, so the only signal
here is the topic.

## What happens when something is wrong

The system validates every generated game against the schema before you ever see
it. If it does not validate, it tries once more with the specific errors, and if
that fails it **tells you it failed** rather than showing you a broken game.

That is on purpose. A game that is quietly missing three questions is worse than
one that says it could not be made.

## Before it reaches a student

Nothing generated here goes to students automatically. You review it, you play
it, you export it, and a person puts it into Pandai. That gate is deliberate and
it is not being removed — see [SCOPE.md](SCOPE.md).
