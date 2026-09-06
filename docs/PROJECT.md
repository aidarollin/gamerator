# PROJECT — what this is and who it serves

## Problem statement

> **Rewritten 2026-09-06.** The first version of this section described a tool
> for generating curriculum quiz games. That was an assumption I made from the
> phrase "game generator", and it was wrong. Recorded rather than quietly
> replaced, because the five learning templates in the repository were built on
> it and their existence only makes sense with this note attached.

Pandai is a learning app, and learning apps have a retention problem that has
nothing to do with the quality of the teaching: a pupil who has finished their
practice has no reason to still be there. Every successful learning product
solves this the same way — with something to do that is simply fun, and that
belongs to the same world as the lessons.

Pandai has the pieces. There is a mascot, a reward economy with coins and
avatars, badges, streaks, and a design system with nineteen subject identities.
What there is not is **anything to play**.

Building arcade games by hand is the obvious answer and the wrong one. Each
title is a designer, a front-end engineer and a QA pass; the pipeline absorbs
perhaps two a year, so the catalogue is thin, it goes stale, and every one drifts
off the design system because it was built from scratch.

The insight is the same one as before, applied to a different problem: **the
variable part of an arcade game is its numbers, not its code.** Flappy Bird is
one machine — gravity, flap strength, gap size, scroll speed. Change those four
numbers and you have a different game; change the palette and mascot and it is a
different game wearing Pandai. Capture the machine once as an engine, capture
the variation as data, and producing a game becomes a form to fill in, or a
sentence for a model to turn into numbers.

Three consequences follow:

1. **Nothing to play.** No arcade catalogue at all, so no reason to stay after
   the practice is done.
2. **Hand-built games would drift.** Anything built title-by-title re-decides
   its own colours and spacing, exactly as the learning games would have.
3. **A game's design is never captured.** The *shape* of "endless flyer" is
   never written down, so the next one starts at zero.

## Who it serves

| | Who | What they do |
| --- | --- | --- |
| **Primary** | Pandai students | Play the games, as a reward or a break between lessons |
| Secondary | Pandai content & design team | Describe games, tune them, review and approve them |
| Tertiary | Pandai product engineers | Consume exported specs and place games into Pandai |

Students are the audience the games must satisfy; they are **not** users of this
tool. Nobody has an account here and no student data is held. Games leave as
exports and a human places them into Pandai, which keeps a person between a
generated artifact and a child — the only child-safety architecture that
actually holds.

That constraint sets the design brief: **mobile first, one thumb, under ninety
seconds a round, and no reading required to play.**

## Objectives

Each one is measurable, and each has a stated way to measure it. An objective
you cannot check is a wish.

| # | Objective | Measured by |
| --- | --- | --- |
| O1 | A content designer with no code writes a description and has a playable game in **under 3 minutes** | Timed run with three real team members, three prompts each |
| O2 | Generated games use **only** Pandai DS 1.5 tokens — zero hardcoded colour values | Automated check in the eval suite: renderer output contains no raw hex; `accent` is always from the allow-list |
| O3 | **No unvalidated model output ever reaches the play surface** | Every spec passes `GameSpec.safeParse` before render; failures are surfaced, never rendered |
| O4 | A generated game exports as a portable bundle the product team can consume without asking us anything | One export handed to a product engineer; they integrate it unaided |
| O5 | Live on an internal URL behind auth, with **≥99% of generations either completing or failing with a readable message** | Audit log: `generation_events` rows by status over a 100-generation window |
| O6 | Cost per generated game stays under a stated ceiling | `usage` recorded per generation; ceiling set from the first 50 real runs, then held |

O3 is the one that is not negotiable. Everything else is a target; O3 is the
property that makes the system safe to point at children's learning material.

## Requirements

### Functional

| # | Requirement |
| --- | --- |
| FR1 | Guided authoring form: subject, year level, language (BM/EN), learning objective, optional template hint, free-text rules |
| FR2 | An always-visible guidelines panel stating what can and cannot be asked for, with worked examples — see [AUTHORING-GUIDELINES.md](AUTHORING-GUIDELINES.md) |
| FR3 | Generate a GameSpec from the form, streaming progress so the wait is legible |
| FR4 | Validate the spec; on failure, one automatic repair turn carrying the validation errors, then surface the failure honestly |
| FR5 | Play the generated game immediately in the browser, in the same session |
| FR6 | Edit a generated game — reword an item, change a timer, drop a question — without a full regeneration |
| FR7 | Save games to a library; every save is a new immutable version |
| FR8 | Export: download the spec JSON and a self-contained bundle; copy an internal share link |
| FR9 | Push generated screens into the Figma Screens file for design review, on demand — never in the request path (see [DESIGN-SYSTEM-SYNC.md](DESIGN-SYSTEM-SYNC.md)) |
| FR10 | Internal-only access; every request carries an identified Pandai user |
| FR11 | Audit log: who generated what, which model, token counts, cost, duration, outcome |

### Non-functional

| # | Requirement |
| --- | --- |
| NFR1 | p95 generation under 25s; first progress event under 2s |
| NFR2 | The renderer is deterministic — the same spec produces the same game, always |
| NFR3 | No arbitrary code execution. Model output is data; it is never `eval`'d, never injected as HTML, never rendered through `dangerouslySetInnerHTML` |
| NFR4 | DS fidelity by construction: the model chooses from an enum of DS token names, never a colour value |
| NFR5 | Bahasa Melayu and English content, with correct diacritics preserved end to end |
| NFR6 | Age-appropriate content guardrails, with the human review gate as the backstop |
| NFR7 | Per-user rate limit and a hard monthly spend ceiling |
| NFR8 | Keyboard-playable; contrast inherited from DS tokens; no information carried by colour alone |
| NFR9 | No secrets in the repo, in the client bundle, or in any log line |

## Program fit

This project is being built alongside the twelve-week AI Forward Deployed
Engineer program. Weeks 1–12 are still placeholder READMEs, so **there is no
published brief to check this against** — what follows is measured against the
program's stated rules in its `CLAUDE.md`, and three things need a decision from
the teaching team rather than an assumption from us.

1. **Language.** The program says *"Python is the default language unless a week
   specifies otherwise."* This is a TypeScript web app. Either the teaching team
   permits it, or the Python surface is the eval harness and the token-sync
   scripts — which is a reasonable split and worth proposing rather than
   discovering late.
2. **Repo structure.** The program says one self-contained folder per week. This
   is a separate repo. The mitigation is that each week's folder carries the
   write-up and links to a tagged release here, so a reviewer still lands on
   exactly the work for that week. Confirm that satisfies "submit is to push the
   work to this repo and share the link".
3. **Public repo, internal design system.** The program assumes anything
   committed is public. This project embeds Pandai DS 1.5 token values and
   references two internal Figma file keys. **That is a Pandai decision, not a
   program one** — get it cleared before the first push, or vendor the tokens
   behind a private submodule and commit a redacted fixture set.

Item 3 is the one that bites silently. Raise it first.
