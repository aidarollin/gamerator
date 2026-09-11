# EXPORT — getting a game into Pandai

The question this answers is not "what is the most elegant format" but **"what
can a Pandai engineer paste into a `.blade.php` file this afternoon"**. Pandai
is Laravel with Blade, Alpine and Tailwind, and it has no React build step, so
anything requiring one is a project rather than an integration.

Three forms ship, cheapest integration first. All three come from the same spec.

## 1. Embed — works today, zero integration

```html
<iframe
  src="https://gamerator.aidaasofiah.workers.dev/embed?s=<encoded-spec>"
  title="PBot Terbang"
  width="360" height="560"
  style="border:0;border-radius:24px;max-width:100%"
  loading="lazy"
  allow="autoplay; fullscreen"
  allowfullscreen
></iframe>
```

The spec travels **inside the URL** — base64url of the JSON, about 550
characters for a typical flyer. Nothing has to be stored on either side for an
embed to work, which is what makes this pasteable today rather than after a
schema migration.

The embed route validates the spec exactly as every other surface does, so an
embed cannot render a game the rest of the system would refuse.

**Full screen on phones** (2026-09-11) needs `allow="fullscreen"` on the
iframe, which the exported snippets now carry. Without it the game still works:
it covers its own iframe instead of the screen.

**Good:** one line, no build, no dependency, no coordination. Styling and
mascots travel with the game.
**Costs:** an iframe is a separate document — it cannot inherit the host page's
theme, and cross-document communication needs `postMessage` if Pandai ever wants
the score back.

## 2. Blade partial — the same embed, with the spec from a controller

```blade
{{-- resources/views/games/pbot-terbang.blade.php --}}
<div class="pandai-game">
  <iframe
    src="{{ config('gamerator.url') }}/embed?s={{ $spec }}"
    title="{{ $game->title }}"
    width="360" height="560"
    style="border:0;border-radius:24px;max-width:100%"
    loading="lazy"
  ></iframe>
</div>
```

```php
// Controller
$spec = rtrim(strtr(base64_encode(json_encode($game->spec)), '+/', '-_'), '=');
```

Note `strtr` and the `rtrim`: it must be **base64url**, not plain base64. `+`
and `/` are not URL-safe and `=` padding gets mangled by form fields and CMS
columns. This is the one detail that will waste an afternoon if it is missed.

Storing the spec as a column means games can be swapped, A/B tested and rolled
back without redeploying anything.

## 3. Spec JSON — the source of truth

```json
{
  "specVersion": "2.0",
  "engine": "endless-flyer",
  "meta": { "title": "PBot Terbang", "difficulty": "normal", ... },
  "theme": { "palette": "b-melayu", "character": "pbot", ... },
  "rules": { "gravity": 1500, "flapVelocity": -420, ... }
}
```

About 600 bytes. Small enough for a `TEXT` column, diffable in review, and the
only thing a future native renderer would need. **Store this**, and treat the
encoded URL as a derived value rather than the record.

## What to build next, and why it is not built yet

**First, the gap that exists today:** the five learning templates cannot be
exported. `ExportPanel` and `/embed` are arcade-only, so a generated quiz can be
played on `/create` and not yet handed to an engineer.


**A web component is the right long-term answer**, and it is deliberately not in
this release:

```blade
<script src="{{ config('gamerator.url') }}/pandai-arcade.js" defer></script>
<pandai-game spec='@json($game->spec)'></pandai-game>
```

One script tag, one custom element, no iframe. It would inherit Pandai's own DS
custom properties from the host page — so a game would follow a theme change in
Pandai without being re-exported — and it could raise real DOM events
(`game:score`, `game:complete`) that Alpine can listen to directly, which is how
scores would reach the reward economy.

It is not built because it needs the engine extracted from React into a
framework-free bundle, its own build target, and a versioning story for when a
spec outlives the script that renders it. That is a real piece of work, and the
iframe covers the same ground today at a fraction of the cost. Doing it now
would be building the second version before anyone has used the first.

## The gate stays

Export hands a bundle to a **person**. There is no automatic path from this
service into Pandai, and there should not be — see [SCOPE.md](SCOPE.md). A human
plays the game, decides it is good, and places it. That review step is the only
child-safety architecture that actually holds.
