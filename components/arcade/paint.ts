/**
 * Shared painting for every engine.
 *
 * Written after the first version was called "mock", which it was. The problem
 * was never the physics - it was that everything on screen was a flat rectangle
 * in a pale DS `subtle` tint, framed by a design-system card. That reads as a
 * component demo because it is one.
 *
 * What actually makes a canvas read as a game:
 *
 * 1. **Saturation.** Games use the strong end of a palette. `subtle` is for
 *    surfaces behind text, and a sky painted in it looks unfinished.
 * 2. **Depth on every solid.** A pipe is a body, a darker inner edge, a lighter
 *    highlight and a cap with a shadow under it - four shapes, not one.
 * 3. **Something moving that is not the player.** Clouds, a scrolling ground,
 *    parallax. Stillness reads as a screenshot.
 * 4. **Chunky display type.** System UI at 14px is a form. Games use heavy
 *    outlined numerals.
 *
 * 5. **Two colour families.** A sky and a solid, reading as different
 *    materials. One ramp painting both is why the obstacles used to look like
 *    the sky in a darker tint. See `lib/arcade/palettes.ts`.
 *
 * Colour arrives as a `Palette`, which is either an authored arcade scene or -
 * as a fallback - a DS token ramp. This file never picks a value either way.
 */

import { drawArt } from "./art";

export type Palette = {
  /** Sky family: backdrop, clouds, far hills. */
  deep: string;
  mid: string;
  light: string;
  edge: string;
  ink: string;
  white: string;
  gold: string;
  danger: string;
  /**
   * Solid family: obstacles, ground, platforms - everything you can hit.
   *
   * Optional, and that is the point. An arcade scene sets them, so a blue sky
   * can carry green pipes. A DS token ramp does not have a second family to
   * offer, so it leaves them out and every solid falls back to the sky family,
   * which is exactly how this rendered before scenes existed.
   */
  solidDeep?: string;
  solidMid?: string;
  solidEdge?: string;
};

/** The solid family, falling back to the sky family when a palette has none. */
function solid(p: Palette) {
  return {
    deep: p.solidDeep ?? p.deep,
    mid: p.solidMid ?? p.mid,
    edge: p.solidEdge ?? p.edge,
  };
}

export function shade(ctx: CanvasRenderingContext2D) {
  return {
    /**
     * Sky: a vertical wash plus a light source.
     *
     * The glow is what stops a gradient reading as a CSS background. It costs
     * one radial fill and does more for the look than anything else here.
     */
    sky(p: Palette, w: number, h: number, night = false) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      if (night) {
        g.addColorStop(0, p.deep);
        g.addColorStop(0.6, p.mid);
        g.addColorStop(1, p.light);
      } else {
        g.addColorStop(0, p.mid);
        g.addColorStop(0.5, p.light);
        g.addColorStop(1, p.white);
      }
      ctx.fillStyle = g;
      ctx.fillRect(-40, -40, w + 80, h + 80);

      const sun = ctx.createRadialGradient(w * 0.78, h * 0.16, 4, w * 0.78, h * 0.16, w * 0.5);
      sun.addColorStop(0, night ? p.white : p.gold);
      sun.addColorStop(1, "transparent");
      ctx.save();
      ctx.globalAlpha = night ? 0.22 : 0.34;
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    },

    /** Far hills, tinted from the palette. Slowest layer. */
    hills(p: Palette, w: number, groundY: number, offset: number) {
      const span = 240;
      const off = (offset * 0.18) % span;
      for (let i = -1; i < Math.ceil(w / span) + 2; i++) {
        const x = i * span - off;
        if (!drawArt(ctx, "hill", p.deep, x + span / 2, groundY - 26, span, 120, 0.28)) {
          ctx.save();
          ctx.globalAlpha = 0.28;
          ctx.fillStyle = p.deep;
          ctx.beginPath();
          ctx.arc(x + span / 2, groundY + 40, 110, Math.PI, 0);
          ctx.fill();
          ctx.restore();
        }
      }
    },

    /**
     * Near bushes on the ground line. Faster layer, stronger tint.
     *
     * Tinted from the SOLID family, not the sky: a bush grows out of the
     * ground, and sharing the ground's colour is what makes the two read as one
     * plane rather than as two stickers.
     */
    bushes(p: Palette, w: number, groundY: number, offset: number) {
      const span = 150;
      const off = (offset * 0.55) % span;
      for (let i = -1; i < Math.ceil(w / span) + 2; i++) {
        const x = i * span - off;
        drawArt(ctx, "bush", solid(p).deep, x + span / 2, groundY - 12, 96, 48, 0.45);
      }
    },

    /**
     * A grid playfield, for snake.
     *
     * This was a flat wash of `white` at 60% until scenes arrived, at which
     * point a pale sky made the board and the sky the same colour and the game
     * became a character floating on a blank page. A board needs an EDGE (where
     * the wall is) and a TEXTURE (how far one step moves you) - a checker does
     * both for two fills.
     */
    board(p: Palette, x: number, y: number, cols: number, rows: number, cell: number) {
      const s = solid(p);
      ctx.fillStyle = s.deep;
      ctx.beginPath();
      ctx.roundRect(x - 7, y - 7, cols * cell + 14, rows * cell + 14, 16);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x - 2, y - 2, cols * cell + 4, rows * cell + 4, 11);
      ctx.clip();
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = (r + c) % 2 ? p.light : p.white;
          ctx.fillRect(x + c * cell, y + r * cell, cell, cell);
        }
      }
      ctx.restore();
    },

    /** A collectible. */
    coin(p: Palette, x: number, y: number, size: number, spin = 1) {
      const w = Math.max(4, size * spin);
      if (!drawArt(ctx, "coin", p.gold, x, y, w, size)) {
        ctx.fillStyle = p.gold;
        ctx.beginPath();
        ctx.ellipse(x, y, w / 2, size / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /** Soft clouds. Cheap, and the single biggest "this is alive" signal. */
    clouds(p: Palette, w: number, h: number, offset: number, count = 5) {
      for (let i = 0; i < count; i++) {
        const seed = i * 137.5;
        const raw = ((seed - offset * (0.16 + (i % 3) * 0.06)) % (w + 220)) - 110;
        const cx = raw < -110 ? raw + w + 220 : raw;
        const cy = 34 + ((seed * 1.7) % (h * 0.42));
        const scale = 0.7 + (i % 3) * 0.3;
        if (!drawArt(ctx, "cloud", p.white, cx, cy, 120 * scale, 56 * scale, 0.9)) {
          ctx.save();
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = p.white;
          ctx.beginPath();
          ctx.arc(cx, cy, 20 * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    },

    /**
     * A solid with depth: dark body, lit face, rim light, inner shade.
     *
     * Four passes rather than one fill. A flat rectangle is the single clearest
     * "this is a prototype" signal on a canvas, and this is the cheapest fix.
     */
    block(p: Palette, x: number, y: number, w: number, h: number, r = 8) {
      if (h <= 0 || w <= 0) return;
      const s = solid(p);
      ctx.fillStyle = s.deep;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();

      const face = ctx.createLinearGradient(x, 0, x + w, 0);
      face.addColorStop(0, s.mid);
      face.addColorStop(0.45, s.mid);
      face.addColorStop(1, s.deep);
      ctx.fillStyle = face;
      ctx.beginPath();
      ctx.roundRect(x + 3, y, Math.max(0, w - 6), h, r);
      ctx.fill();

      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = p.white;
      ctx.beginPath();
      ctx.roundRect(x + 7, y + 4, Math.max(0, w * 0.18), Math.max(0, h - 8), 4);
      ctx.fill();
      ctx.restore();
    },

    /** A pipe cap - the detail that makes a pipe read as a pipe. */
    cap(p: Palette, x: number, y: number, w: number, h: number) {
      const s = solid(p);
      ctx.fillStyle = s.deep;
      ctx.beginPath();
      ctx.roundRect(x - 5, y, w + 10, h, 6);
      ctx.fill();
      ctx.fillStyle = s.mid;
      ctx.beginPath();
      ctx.roundRect(x - 2, y + 2, w + 4, h - 4, 5);
      ctx.fill();
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = p.white;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 3, w * 0.25, h - 6, 3);
      ctx.fill();
      ctx.restore();
    },

    /** Layered ground: soil, turf, a lit lip, and moving texture. */
    ground(p: Palette, w: number, top: number, height: number, scroll: number) {
      const s = solid(p);
      const soil = ctx.createLinearGradient(0, top, 0, top + height);
      soil.addColorStop(0, s.deep);
      soil.addColorStop(1, s.edge);
      ctx.fillStyle = soil;
      ctx.fillRect(0, top, w, height);

      ctx.fillStyle = s.mid;
      ctx.fillRect(0, top, w, 11);
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = p.white;
      ctx.fillRect(0, top, w, 3);
      const tick = scroll % 26;
      for (let x = -tick; x < w; x += 26) ctx.fillRect(x, top + 5, 13, 3);
      ctx.restore();
    },

    /** Heavy outlined numerals. The single cheapest "this is a game" cue. */
    score(p: Palette, text: string, x: number, y: number, size: number, pop = 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1 + pop * 0.3, 1 + pop * 0.3);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `800 ${size}px ui-rounded, system-ui, sans-serif`;
      ctx.lineJoin = "round";
      ctx.lineWidth = size * 0.22;
      ctx.strokeStyle = p.white;
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = p.ink;
      ctx.fillText(text, 0, 0);
      ctx.restore();
    },

    burst(p: Palette, parts: { x: number; y: number; life: number }[]) {
      for (const q of parts) {
        ctx.globalAlpha = Math.max(0, q.life);
        ctx.fillStyle = p.gold;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 3.5 * q.life + 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
}

export type Particle = { x: number; y: number; vx: number; vy: number; life: number };

export function spawnBurst(list: Particle[], x: number, y: number, n = 14) {
  for (let i = 0; i < n; i++) {
    list.push({
      x, y,
      vx: (Math.random() - 0.5) * 280,
      vy: (Math.random() - 0.7) * 280,
      life: 1,
    });
  }
}

export function stepParticles(list: Particle[], dt: number): Particle[] {
  for (const p of list) {
    p.vy += 900 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt * 1.4;
  }
  return list.filter((p) => p.life > 0);
}
