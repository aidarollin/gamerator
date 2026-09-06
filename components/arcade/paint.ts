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
 * All colour still comes from DS tokens - this is about which end of the ramp
 * and how many layers, not about inventing values.
 */

export type Palette = {
  deep: string;
  mid: string;
  light: string;
  edge: string;
  ink: string;
  white: string;
  gold: string;
  danger: string;
};

export function shade(ctx: CanvasRenderingContext2D) {
  return {
    /** Vertical wash. Games have skies, not background-colors. */
    sky(p: Palette, w: number, h: number) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, p.mid);
      g.addColorStop(0.55, p.light);
      g.addColorStop(1, p.white);
      ctx.fillStyle = g;
      ctx.fillRect(-40, -40, w + 80, h + 80);
    },

    /** Soft clouds. Cheap, and the single biggest "this is alive" signal. */
    clouds(p: Palette, w: number, h: number, offset: number, count = 4) {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = p.white;
      for (let i = 0; i < count; i++) {
        const seed = i * 137.5;
        const x = ((seed - offset * (0.25 + (i % 3) * 0.08)) % (w + 160)) - 80;
        const cx = x < -80 ? x + w + 160 : x;
        const y = 40 + ((seed * 1.7) % (h * 0.45));
        const s = 16 + (i % 3) * 7;
        ctx.beginPath();
        ctx.arc(cx, y, s, 0, Math.PI * 2);
        ctx.arc(cx + s * 0.9, y + 4, s * 0.75, 0, Math.PI * 2);
        ctx.arc(cx - s * 0.85, y + 5, s * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },

    /** A solid with depth: body, inner shade, top highlight. */
    block(p: Palette, x: number, y: number, w: number, h: number, r = 8) {
      if (h <= 0) return;
      ctx.fillStyle = p.deep;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
      ctx.fillStyle = p.mid;
      ctx.beginPath();
      ctx.roundRect(x + 3, y, Math.max(0, w - 9), h, r);
      ctx.fill();
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = p.white;
      ctx.beginPath();
      ctx.roundRect(x + 6, y + 3, Math.max(0, w * 0.22), Math.max(0, h - 6), 4);
      ctx.fill();
      ctx.restore();
    },

    /** A pipe cap - the detail that makes a pipe read as a pipe. */
    cap(p: Palette, x: number, y: number, w: number, h: number) {
      ctx.fillStyle = p.deep;
      ctx.beginPath();
      ctx.roundRect(x - 5, y, w + 10, h, 6);
      ctx.fill();
      ctx.fillStyle = p.mid;
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

    /** Layered ground: dark base, coloured turf, moving texture. */
    ground(p: Palette, w: number, top: number, height: number, scroll: number) {
      ctx.fillStyle = p.deep;
      ctx.fillRect(0, top, w, height);
      ctx.fillStyle = p.mid;
      ctx.fillRect(0, top, w, 9);
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = p.white;
      const tick = scroll % 26;
      for (let x = -tick; x < w; x += 26) ctx.fillRect(x, top + 2, 13, 3);
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
