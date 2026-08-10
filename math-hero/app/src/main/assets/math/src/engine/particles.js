/**
 * Combat VFX system for Math Hero RPG.
 * Layered, pooled particles: impacts, slashes, shockwaves, debris, smoke,
 * magic runes, pickups and floating combat text.
 * Presentation-only — the system never reads or writes gameplay state.
 */
import { t } from '../i18n/index.js';

const TAU = Math.PI * 2;
const HEX_LONG = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const HEX_SHORT = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const RGB_FN = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i;
const WHITE = [255, 255, 255];

const colorCache = new Map();

/** Parse '#rrggbb', '#rgb' or 'rgb(...)' into a cached [r,g,b] triplet. */
function parseColor(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return WHITE;
  const cached = colorCache.get(value);
  if (cached) return cached;
  let rgb = WHITE;
  let match = HEX_LONG.exec(value);
  if (match) {
    rgb = [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
  } else if ((match = HEX_SHORT.exec(value))) {
    rgb = [parseInt(match[1] + match[1], 16), parseInt(match[2] + match[2], 16), parseInt(match[3] + match[3], 16)];
  } else if ((match = RGB_FN.exec(value))) {
    rgb = [Number(match[1]), Number(match[2]), Number(match[3])];
  }
  colorCache.set(value, rgb);
  return rgb;
}

function rgba(color, alpha) {
  return `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
}

function mixColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** Push a colour towards white — used for hot particle cores. */
function lighten(color, amount) {
  return mixColor(color, WHITE, amount);
}

/** Fade curves keyed by particle `fade` field. `t` runs 1 → 0 over the lifetime. */
const FADE_CURVES = {
  linear: t => t,
  quad: t => t * t,
  slow: t => Math.sqrt(t),
  flash: t => t * t * t,
  pop: t => Math.sin((1 - t) * Math.PI),
};

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.maxParticles = 900;
    this.intensity = 1;
    this._pool = [];
    this._glowCache = new Map();
  }

  /**
   * Scales every spawn count. Driven by the reduced-motion accessibility flag
   * so heavy effects stay readable without disabling feedback entirely.
   */
  setIntensity(scale) {
    this.intensity = Math.max(0.2, Math.min(1.5, Number(scale) || 1));
  }

  get activeCount() { return this.particles.length; }

  _count(base) {
    return Math.max(1, Math.round(base * this.intensity));
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        this._release(p);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      if (p.drag > 0) {
        const damp = Math.max(0, 1 - p.drag * dt);
        p.vx *= damp;
        p.vy *= damp;
      }
      p.rot += p.spin * dt;

      const t = p.life / p.maxLife;
      const progress = 1 - t;
      p.alpha = Math.max(0, Math.min(1, p.curve(t) * p.opacity));
      p.size = p.sizeStart + (p.sizeEnd - p.sizeStart) * progress;
      p.tint = p.colorEnd ? mixColor(p.color, p.colorEnd, progress) : p.color;
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {'back'|'front'} layer  'back' draws under the sprites, 'front' over them.
   */
  draw(ctx, layer = 'front') {
    let additivePending = false;
    for (const p of this.particles) {
      if (p.layer !== layer) continue;
      if (p.additive) { additivePending = true; continue; }
      this._drawParticle(ctx, p);
    }
    if (!additivePending) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      if (p.layer !== layer || !p.additive) continue;
      this._drawParticle(ctx, p);
    }
    ctx.restore();
  }

  _drawParticle(ctx, p) {
    if (p.alpha <= 0.004 || p.size <= 0) return;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(p.x, p.y);
    // Coins spend their rotation on the edge-on width scale instead of turning.
    if (p.rot && p.type !== 'coin') ctx.rotate(p.rot);

    switch (p.type) {
      case 'spark': this._drawSpark(ctx, p); break;
      case 'glow': this._drawGlow(ctx, p); break;
      case 'ring': this._drawRing(ctx, p); break;
      case 'arc': this._drawArc(ctx, p); break;
      case 'shard': this._drawShard(ctx, p); break;
      case 'smoke': this._drawSmoke(ctx, p); break;
      case 'star': this._drawStar(ctx, p); break;
      case 'coin': this._drawCoin(ctx, p); break;
      case 'rune': this._drawRune(ctx, p); break;
      case 'bolt': this._drawBolt(ctx, p); break;
      case 'beam': this._drawBeam(ctx, p); break;
      case 'text': this._drawText(ctx, p); break;
      default: this._drawSpark(ctx, p); break;
    }
    ctx.restore();
  }

  // ── Primitive renderers ──────────────────────────────────────────────────

  /** Velocity-stretched spark with a hot core. */
  _drawSpark(ctx, p) {
    const streak = p.streak;
    if (streak > 0) {
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > 1) {
        const tailX = (-p.vx / speed) * streak * p.size;
        const tailY = (-p.vy / speed) * streak * p.size;
        ctx.strokeStyle = rgba(p.tint, 0.55);
        ctx.lineWidth = p.size * 0.9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
      }
    }
    ctx.fillStyle = rgba(lighten(p.tint, 0.45), 1);
    ctx.beginPath();
    ctx.arc(0, 0, p.size, 0, TAU);
    ctx.fill();
  }

  /** Soft radial light blob drawn from a cached gradient sprite. */
  _drawGlow(ctx, p) {
    const sprite = this._glowSprite(p.tint);
    const r = p.size;
    if (sprite) {
      ctx.drawImage(sprite, -r, -r, r * 2, r * 2);
      return;
    }
    ctx.fillStyle = rgba(p.tint, 0.5);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
  }

  /** Expanding shockwave ring, optionally squashed into a ground ellipse. */
  _drawRing(ctx, p) {
    ctx.strokeStyle = rgba(lighten(p.tint, 0.3), 1);
    ctx.lineWidth = Math.max(0.6, p.thickness * (p.life / p.maxLife));
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size, p.size * p.squash, 0, 0, TAU);
    ctx.stroke();
  }

  /** Tapered crescent used for weapon slashes and claw swipes. */
  _drawArc(ctx, p) {
    const outer = p.size;
    const inner = p.size * (1 - p.thickness);
    ctx.beginPath();
    ctx.arc(0, 0, outer, p.arcStart, p.arcEnd);
    ctx.arc(0, 0, inner, p.arcEnd, p.arcStart, true);
    ctx.closePath();
    const grad = ctx.createLinearGradient(-outer, 0, outer, 0);
    grad.addColorStop(0, rgba(p.tint, 0));
    grad.addColorStop(0.45, rgba(lighten(p.tint, 0.55), 0.95));
    grad.addColorStop(1, rgba(p.tint, 0.1));
    ctx.fillStyle = grad;
    ctx.fill();
  }

  /** Angular debris chunk. */
  _drawShard(ctx, p) {
    const s = p.size;
    ctx.fillStyle = rgba(p.tint, 1);
    ctx.beginPath();
    ctx.moveTo(-s, -s * 0.5);
    ctx.lineTo(s * 0.4, -s);
    ctx.lineTo(s, s * 0.35);
    ctx.lineTo(-s * 0.3, s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(lighten(p.tint, 0.5), 0.6);
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  /** Billowing puff built from three offset circles. */
  _drawSmoke(ctx, p) {
    const s = p.size;
    ctx.fillStyle = rgba(p.tint, 0.42);
    ctx.beginPath();
    ctx.arc(0, 0, s, 0, TAU);
    ctx.arc(s * 0.62, -s * 0.28, s * 0.72, 0, TAU);
    ctx.arc(-s * 0.58, -s * 0.18, s * 0.66, 0, TAU);
    ctx.fill();
  }

  _drawStar(ctx, p) {
    const spikes = 5;
    const outer = p.size;
    const inner = p.size * 0.44;
    const step = Math.PI / spikes;
    let rot = -Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(0, -outer);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(Math.cos(rot) * outer, Math.sin(rot) * outer);
      rot += step;
      ctx.lineTo(Math.cos(rot) * inner, Math.sin(rot) * inner);
      rot += step;
    }
    ctx.closePath();
    ctx.fillStyle = rgba(p.tint, 1);
    ctx.fill();
    ctx.strokeStyle = rgba(lighten(p.tint, 0.6), 0.85);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /** Coin spinning around its vertical axis (width scales with the spin phase). */
  _drawCoin(ctx, p) {
    const spinWidth = Math.abs(Math.cos(p.rot));
    const r = p.size;
    ctx.scale(Math.max(0.12, spinWidth), 1);
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.15, 0, 0, r);
    grad.addColorStop(0, '#fff6c2');
    grad.addColorStop(0.55, '#f5c518');
    grad.addColorStop(1, '#b8860b');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,170,0.9)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    if (spinWidth > 0.55) {
      ctx.fillStyle = 'rgba(150,105,10,0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.4, 0, TAU);
      ctx.fill();
    }
  }

  /** Arcane glyph: outer circle plus an inscribed polygon. */
  _drawRune(ctx, p) {
    const r = p.size;
    ctx.strokeStyle = rgba(lighten(p.tint, 0.35), 1);
    ctx.lineWidth = Math.max(1, r * 0.16);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
    const sides = p.sides;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * TAU - Math.PI / 2;
      const px = Math.cos(angle) * r * 0.78;
      const py = Math.sin(angle) * r * 0.78;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  /** Jagged energy bolt along the local X axis. */
  _drawBolt(ctx, p) {
    const len = p.size;
    ctx.strokeStyle = rgba(lighten(p.tint, 0.6), 1);
    ctx.lineWidth = p.thickness;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      const px = (len / steps) * i;
      const py = i === steps ? 0 : Math.sin(i * 2.3 + p.seed) * p.thickness * 2.4;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  /** Soft vertical light pillar (level-up, ultimate charge). */
  _drawBeam(ctx, p) {
    const halfW = p.size;
    const h = p.height;
    const grad = ctx.createLinearGradient(0, 0, 0, -h);
    grad.addColorStop(0, rgba(lighten(p.tint, 0.5), 0.75));
    grad.addColorStop(0.5, rgba(p.tint, 0.28));
    grad.addColorStop(1, rgba(p.tint, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-halfW, 0);
    ctx.lineTo(halfW, 0);
    ctx.lineTo(halfW * 0.35, -h);
    ctx.lineTo(-halfW * 0.35, -h);
    ctx.closePath();
    ctx.fill();
  }

  /** Floating combat text with a dark outline so it reads over any background. */
  _drawText(ctx, p) {
    const size = p.size;
    ctx.scale(p.stretch, 1 / p.stretch);
    ctx.font = `900 ${size}px Outfit, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size * 0.2);
    ctx.strokeStyle = 'rgba(8,10,22,0.9)';
    ctx.strokeText(p.text, 0, 0);
    const grad = ctx.createLinearGradient(0, -size * 0.6, 0, size * 0.6);
    grad.addColorStop(0, rgba(lighten(p.tint, 0.55), 1));
    grad.addColorStop(1, rgba(p.tint, 1));
    ctx.fillStyle = grad;
    ctx.fillText(p.text, 0, 0);
  }

  /** Lazily rendered radial-gradient sprite, cached per colour. */
  _glowSprite(color) {
    const key = `${color[0]},${color[1]},${color[2]}`;
    const cached = this._glowCache.get(key);
    if (cached) return cached;
    if (typeof document === 'undefined') return null;
    if (this._glowCache.size > 48) this._glowCache.clear();

    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const g = canvas.getContext('2d');
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, rgba(lighten(color, 0.65), 0.95));
    grad.addColorStop(0.3, rgba(color, 0.5));
    grad.addColorStop(0.65, rgba(color, 0.16));
    grad.addColorStop(1, rgba(color, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    this._glowCache.set(key, canvas);
    return canvas;
  }

  // ── Spawn plumbing ───────────────────────────────────────────────────────

  _obtain() { return this._pool.pop() || {}; }

  _release(p) {
    if (this._pool.length < 256) this._pool.push(p);
  }

  _addParticle(options) {
    if (this.particles.length >= this.maxParticles) {
      this._release(this.particles.shift());
    }
    const p = this._obtain();
    const life = options.life ?? 0.6;

    p.type = options.type || 'spark';
    p.layer = options.layer || 'front';
    p.additive = options.additive ?? false;
    p.x = options.x || 0;
    p.y = options.y || 0;
    p.vx = options.vx || 0;
    p.vy = options.vy || 0;
    p.gravity = options.gravity || 0;
    p.drag = options.drag || 0;
    p.life = life;
    p.maxLife = life;
    p.rot = options.rot || 0;
    p.spin = options.spin || 0;
    p.sizeStart = options.size ?? 4;
    p.sizeEnd = options.sizeEnd ?? p.sizeStart;
    p.size = p.sizeStart;
    p.opacity = options.opacity ?? 1;
    p.alpha = p.opacity;
    p.color = parseColor(options.color || '#ffffff');
    p.colorEnd = options.colorEnd ? parseColor(options.colorEnd) : null;
    p.tint = p.color;
    p.curve = FADE_CURVES[options.fade] || FADE_CURVES.linear;
    p.streak = options.streak || 0;
    p.thickness = options.thickness ?? 3;
    p.squash = options.squash ?? 1;
    p.arcStart = options.arcStart ?? -0.9;
    p.arcEnd = options.arcEnd ?? 0.9;
    p.sides = options.sides || 6;
    p.height = options.height || 0;
    p.seed = options.seed ?? Math.random() * 6.28;
    p.stretch = options.stretch ?? 1;
    p.text = options.text || '';
    this.particles.push(p);
    return p;
  }

  // ── Combat effects ───────────────────────────────────────────────────────

  /**
   * Core weapon impact: light flash, shockwave ring, radial sparks, debris
   * and settling smoke. `power` scales the whole burst (1 = normal hit).
   */
  spawnImpact(x, y, color = '#4ade80', power = 1) {
    const scale = Math.max(0.5, power);

    this._addParticle({
      type: 'glow', x, y, size: 26 * scale, sizeEnd: 74 * scale,
      life: 0.26, color, fade: 'flash', additive: true,
    });
    this._addParticle({
      type: 'ring', x, y, size: 10 * scale, sizeEnd: 78 * scale,
      thickness: 5 * scale, life: 0.36, color, fade: 'quad', additive: true,
    });
    if (power >= 1.5) {
      this._addParticle({
        type: 'ring', x, y, size: 6 * scale, sizeEnd: 118 * scale, squash: 0.42,
        thickness: 3.5 * scale, life: 0.5, color: '#ffffff', colorEnd: color, fade: 'quad', additive: true,
      });
    }

    const sparkCount = this._count(12 + power * 8);
    for (let i = 0; i < sparkCount; i++) {
      const angle = (i / sparkCount) * TAU + Math.random() * 0.6;
      const speed = (150 + Math.random() * 320) * scale;
      this._addParticle({
        type: 'spark', x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        gravity: 620, drag: 1.6,
        life: 0.34 + Math.random() * 0.42,
        size: (1.8 + Math.random() * 2.6) * scale, sizeEnd: 0.2,
        color, colorEnd: '#ffffff', fade: 'slow', streak: 3.4, additive: true,
      });
    }

    const shardCount = this._count(3 + power * 2);
    for (let i = 0; i < shardCount; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const speed = (110 + Math.random() * 200) * scale;
      this._addParticle({
        type: 'shard', x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 900, drag: 0.4,
        rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 16,
        life: 0.55 + Math.random() * 0.4,
        size: (2.6 + Math.random() * 3) * scale, sizeEnd: 1,
        color, fade: 'quad',
      });
    }

    for (let i = 0; i < this._count(3); i++) {
      this._addParticle({
        type: 'smoke', layer: 'back', x: x + (Math.random() - 0.5) * 26 * scale, y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 40,
        drag: 1.1, life: 0.6 + Math.random() * 0.4,
        size: 10 * scale, sizeEnd: 34 * scale,
        rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 2,
        color: '#dfe6f5', colorEnd: '#8b93ab', fade: 'quad', opacity: 0.55,
      });
    }
  }

  /** Backwards-compatible alias used by older call sites. */
  spawnHitSparks(x, y, color = '#38ef7d', count = 15) {
    this.spawnImpact(x, y, color, Math.max(0.6, count / 20));
  }

  /**
   * Weapon-specific attack flourish drawn at the hero's strike point.
   * @param {'knight'|'cossack'|'sorceress'|'archer'} archetype
   */
  spawnWeaponFlourish(x, y, archetype, color = '#e2e8f0', power = 1) {
    if (archetype === 'sorceress') {
      this.spawnMagicBurst(x, y, color, power);
      return;
    }
    if (archetype === 'archer') {
      this.spawnArrowStreak(x, y, color, power);
      return;
    }
    this.spawnSlash(x, y, color, power);
  }

  /** Crescent blade sweep with trailing sparks. */
  spawnSlash(x, y, color = '#e2e8f0', power = 1) {
    const scale = Math.max(0.7, power);
    this._addParticle({
      type: 'arc', x, y, rot: -0.55, spin: 3.4,
      size: 42 * scale, sizeEnd: 74 * scale, thickness: 0.34,
      arcStart: -1.15, arcEnd: 0.95,
      life: 0.26, color, fade: 'quad', additive: true,
    });
    this._addParticle({
      type: 'arc', x, y, rot: -0.35, spin: 2.6,
      size: 30 * scale, sizeEnd: 60 * scale, thickness: 0.55,
      arcStart: -0.95, arcEnd: 0.75,
      life: 0.2, color: '#ffffff', fade: 'flash', additive: true,
    });
    for (let i = 0; i < this._count(7); i++) {
      const angle = -0.9 + Math.random() * 1.8;
      const speed = 180 + Math.random() * 260;
      this._addParticle({
        type: 'spark', x, y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        gravity: 400, drag: 2, life: 0.24 + Math.random() * 0.24,
        size: 1.6 + Math.random() * 2, sizeEnd: 0,
        color, colorEnd: '#ffffff', fade: 'slow', streak: 4, additive: true,
      });
    }
  }

  /** Arcane implosion: counter-rotating runes collapsing into a flash. */
  spawnMagicBurst(x, y, color = '#c4b5fd', power = 1) {
    const scale = Math.max(0.7, power);
    this._addParticle({
      type: 'glow', x, y, size: 46 * scale, sizeEnd: 14 * scale,
      life: 0.34, color, fade: 'pop', additive: true,
    });
    for (let i = 0; i < 3; i++) {
      this._addParticle({
        type: 'rune', x, y, rot: i * 1.1, spin: i % 2 ? 3.2 : -3.2,
        size: (52 - i * 12) * scale, sizeEnd: (16 - i * 3) * scale,
        sides: 6 - i, life: 0.42 + i * 0.06,
        color, colorEnd: '#ffffff', fade: 'quad', additive: true, thickness: 2,
      });
    }
    for (let i = 0; i < this._count(14); i++) {
      const angle = Math.random() * TAU;
      const radius = 40 + Math.random() * 55;
      this._addParticle({
        type: 'spark',
        x: x + Math.cos(angle) * radius * scale,
        y: y + Math.sin(angle) * radius * scale,
        vx: -Math.cos(angle) * 280, vy: -Math.sin(angle) * 280,
        drag: 0.6, life: 0.3 + Math.random() * 0.2,
        size: 1.6 + Math.random() * 2.4, sizeEnd: 0,
        color, colorEnd: '#ffffff', fade: 'quad', streak: 3, additive: true,
      });
    }
  }

  /** Horizontal arrow bolt with a fletching-style spark trail. */
  spawnArrowStreak(x, y, color = '#bbf7d0', power = 1) {
    const scale = Math.max(0.7, power);
    this._addParticle({
      type: 'bolt', x: x - 120 * scale, y, size: 130 * scale, sizeEnd: 150 * scale,
      thickness: 3 * scale, life: 0.2, color, fade: 'flash', additive: true,
    });
    this._addParticle({
      type: 'glow', x, y, size: 18 * scale, sizeEnd: 46 * scale,
      life: 0.24, color, fade: 'flash', additive: true,
    });
    for (let i = 0; i < this._count(9); i++) {
      this._addParticle({
        type: 'spark', x: x - Math.random() * 110 * scale, y: y + (Math.random() - 0.5) * 12,
        vx: 120 + Math.random() * 200, vy: (Math.random() - 0.5) * 90,
        drag: 2.4, life: 0.22 + Math.random() * 0.22,
        size: 1.4 + Math.random() * 1.8, sizeEnd: 0,
        color, colorEnd: '#ffffff', fade: 'quad', streak: 5, additive: true,
      });
    }
  }

  /** Screen-anchored ground shockwave, used by ultimates and boss landings. */
  spawnShockwave(x, y, color = '#c084fc', power = 1) {
    const scale = Math.max(0.8, power);
    for (let i = 0; i < 3; i++) {
      this._addParticle({
        type: 'ring', layer: 'back', x, y: y + i * 4,
        size: 12, sizeEnd: (150 + i * 55) * scale, squash: 0.32,
        thickness: 6 - i * 1.4, life: 0.55 + i * 0.14,
        color, colorEnd: '#ffffff', fade: 'quad', additive: true,
      });
    }
    for (let i = 0; i < this._count(14); i++) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      this._addParticle({
        type: 'smoke', layer: 'back',
        x: x + dir * (10 + Math.random() * 40), y: y + 6,
        vx: dir * (90 + Math.random() * 170), vy: -30 - Math.random() * 60,
        drag: 1.5, life: 0.6 + Math.random() * 0.5,
        size: 8, sizeEnd: 30 * scale,
        rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 3,
        color: '#e8e4d8', colorEnd: '#9a8f7e', fade: 'quad', opacity: 0.5,
      });
    }
  }

  /** Enemy death: soul flash, outward shards, rising embers and smoke. */
  spawnDeathBurst(x, y, color = '#f87171', scale = 1) {
    const s = Math.max(0.7, scale);
    this._addParticle({
      type: 'glow', x, y, size: 30 * s, sizeEnd: 96 * s,
      life: 0.4, color: '#ffffff', colorEnd: color, fade: 'flash', additive: true,
    });
    this._addParticle({
      type: 'ring', x, y, size: 14 * s, sizeEnd: 110 * s,
      thickness: 6, life: 0.5, color, fade: 'quad', additive: true,
    });

    for (let i = 0; i < this._count(16); i++) {
      const angle = Math.random() * TAU;
      const speed = 130 + Math.random() * 300;
      this._addParticle({
        type: 'shard', x, y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 90,
        gravity: 780, drag: 0.5,
        rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 18,
        life: 0.6 + Math.random() * 0.5,
        size: (3 + Math.random() * 4) * s, sizeEnd: 0.5,
        color, colorEnd: '#1f2937', fade: 'quad',
      });
    }
    for (let i = 0; i < this._count(10); i++) {
      this._addParticle({
        type: 'glow', x: x + (Math.random() - 0.5) * 60 * s, y: y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 60, vy: -70 - Math.random() * 90,
        drag: 0.8, life: 0.8 + Math.random() * 0.6,
        size: 5 + Math.random() * 7, sizeEnd: 0,
        color, colorEnd: '#ffffff', fade: 'quad', additive: true,
      });
    }
    for (let i = 0; i < this._count(5); i++) {
      this._addParticle({
        type: 'smoke', layer: 'back',
        x: x + (Math.random() - 0.5) * 50 * s, y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 70, vy: -40 - Math.random() * 50,
        drag: 1.2, life: 0.9 + Math.random() * 0.5,
        size: 14 * s, sizeEnd: 46 * s,
        rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 2,
        color: '#cbd5e1', colorEnd: '#64748b', fade: 'quad', opacity: 0.5,
      });
    }
  }

  /**
   * Evolution burst for a boss phase change: energy spirals inward, a light
   * column erupts, and rings expand outward — the beat before the new form
   * is revealed.
   */
  spawnEvolutionSurge(x, y, groundY, color = '#a855f7') {
    this._addParticle({
      type: 'beam', layer: 'back', x, y: groundY,
      size: 60, sizeEnd: 26, height: Math.max(240, groundY - y + 260),
      life: 1.5, color: '#ffffff', colorEnd: color, fade: 'quad', additive: true,
    });
    for (let i = 0; i < 4; i++) {
      this._addParticle({
        type: 'ring', layer: 'back', x, y: groundY - i * 6,
        size: 16, sizeEnd: 220 + i * 60, squash: 0.34,
        thickness: 8 - i * 1.5, life: 0.9 + i * 0.22,
        color, colorEnd: '#ffffff', fade: 'quad', additive: true,
      });
    }
    // Motes converging on the boss from all sides.
    for (let i = 0; i < this._count(40); i++) {
      const angle = Math.random() * TAU;
      const radius = 150 + Math.random() * 190;
      this._addParticle({
        type: 'spark',
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius * 0.7,
        vx: -Math.cos(angle) * (150 + Math.random() * 190),
        vy: -Math.sin(angle) * (110 + Math.random() * 150),
        drag: 0.35, life: 0.85 + Math.random() * 0.5,
        size: 2 + Math.random() * 3, sizeEnd: 0,
        color, colorEnd: '#ffffff', fade: 'slow', streak: 5, additive: true,
      });
    }
    // Column of light streaming upward past the boss.
    for (let i = 0; i < this._count(26); i++) {
      this._addParticle({
        type: 'spark', x: x + (Math.random() - 0.5) * 150, y: groundY,
        vx: (Math.random() - 0.5) * 40, vy: -260 - Math.random() * 300,
        drag: 0.5, life: 0.9 + Math.random() * 0.7,
        size: 2 + Math.random() * 3.5, sizeEnd: 0,
        color: '#ffffff', colorEnd: color, fade: 'slow', streak: 6, additive: true,
      });
    }
  }

  /** Shock release once the new form lands. */
  spawnEvolutionRelease(x, y, groundY, color = '#a855f7') {
    this._addParticle({
      type: 'glow', x, y, size: 70, sizeEnd: 300,
      life: 0.55, color: '#ffffff', colorEnd: color, fade: 'flash', additive: true,
    });
    for (let i = 0; i < 3; i++) {
      this._addParticle({
        type: 'ring', x, y, size: 24, sizeEnd: 300 + i * 90,
        thickness: 10 - i * 2.5, life: 0.6 + i * 0.16,
        color: '#ffffff', colorEnd: color, fade: 'quad', additive: true,
      });
    }
    this.spawnShockwave(x, groundY, color, 1.8);
    for (let i = 0; i < this._count(34); i++) {
      const angle = Math.random() * TAU;
      const speed = 220 + Math.random() * 420;
      this._addParticle({
        type: 'spark', x, y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 60,
        gravity: 420, drag: 1.1, life: 0.5 + Math.random() * 0.5,
        size: 2.4 + Math.random() * 3, sizeEnd: 0,
        color, colorEnd: '#ffffff', fade: 'slow', streak: 4.5, additive: true,
      });
    }
  }

  /** Blue hexagonal barrier flare when the knowledge shield absorbs a hit. */
  spawnShieldBlock(x, y, color = '#60a5fa') {
    this._addParticle({
      type: 'rune', x, y, size: 58, sizeEnd: 92, sides: 6,
      life: 0.42, thickness: 5, color, colorEnd: '#ffffff', fade: 'pop', additive: true,
    });
    this._addParticle({
      type: 'glow', x, y, size: 40, sizeEnd: 96, life: 0.34,
      color, fade: 'flash', additive: true,
    });
    for (let i = 0; i < this._count(12); i++) {
      const angle = Math.random() * TAU;
      const speed = 120 + Math.random() * 200;
      this._addParticle({
        type: 'spark', x, y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        drag: 2.2, life: 0.3 + Math.random() * 0.25,
        size: 1.6 + Math.random() * 2, sizeEnd: 0,
        color, colorEnd: '#ffffff', fade: 'quad', streak: 3.5, additive: true,
      });
    }
  }

  /** Red impact burst when the hero loses a heart. */
  spawnHeroHurt(x, y) {
    this._addParticle({
      type: 'glow', x, y, size: 24, sizeEnd: 70, life: 0.3,
      color: '#ef4444', fade: 'flash', additive: true,
    });
    for (let i = 0; i < this._count(12); i++) {
      const angle = Math.PI * 0.25 + Math.random() * Math.PI * 0.5;
      const speed = 110 + Math.random() * 230;
      this._addParticle({
        type: 'spark', x, y,
        vx: -Math.cos(angle) * speed, vy: -Math.sin(angle) * speed,
        gravity: 720, drag: 1.4, life: 0.4 + Math.random() * 0.3,
        size: 2 + Math.random() * 2.6, sizeEnd: 0,
        color: '#fca5a5', colorEnd: '#7f1d1d', fade: 'quad', streak: 2.6,
      });
    }
  }

  /** Footstep / landing dust puff. `dir` is -1 for left, 1 for right. */
  spawnDust(x, y, dir = -1, count = 4) {
    for (let i = 0; i < this._count(count); i++) {
      this._addParticle({
        type: 'smoke', layer: 'back',
        x: x + (Math.random() - 0.5) * 18, y: y - Math.random() * 6,
        vx: dir * (30 + Math.random() * 90), vy: -12 - Math.random() * 34,
        drag: 2.2, life: 0.4 + Math.random() * 0.35,
        size: 5, sizeEnd: 18,
        rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 3,
        color: '#e6e0d2', colorEnd: '#a29c8d', fade: 'quad', opacity: 0.45,
      });
    }
  }

  /** Arcing coin shower with a sparkle on each coin. */
  spawnCoins(x, y, count = 5) {
    const total = this._count(count);
    for (let i = 0; i < total; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.7;
      const speed = 190 + Math.random() * 240;
      this._addParticle({
        type: 'coin',
        x: x + (Math.random() - 0.5) * 40, y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        gravity: 700, drag: 0.15,
        rot: Math.random() * TAU, spin: 9 + Math.random() * 8,
        life: 0.9 + Math.random() * 0.5,
        size: 7, sizeEnd: 5,
        color: '#f5c518', fade: 'slow',
      });
      this._addParticle({
        type: 'glow', x: x + (Math.random() - 0.5) * 40, y,
        vx: Math.cos(angle) * speed * 0.9, vy: Math.sin(angle) * speed * 0.9,
        gravity: 700, life: 0.5 + Math.random() * 0.3,
        size: 12, sizeEnd: 2,
        color: '#fde68a', fade: 'quad', additive: true,
      });
    }
  }

  /** Level-up: light pillar, rune halo, star shower and a headline. */
  spawnLevelUp(x, y) {
    this._addParticle({
      type: 'beam', layer: 'back', x, y: y + 60,
      size: 46, sizeEnd: 18, height: 340,
      life: 1.2, color: '#fbbf24', fade: 'quad', additive: true,
    });
    this._addParticle({
      type: 'glow', x, y, size: 40, sizeEnd: 150, life: 0.6,
      color: '#fde68a', fade: 'flash', additive: true,
    });
    for (let i = 0; i < 2; i++) {
      this._addParticle({
        type: 'ring', x, y, size: 18, sizeEnd: 160 + i * 50, squash: 0.42,
        thickness: 6 - i * 2, life: 0.8 + i * 0.2,
        color: '#fbbf24', colorEnd: '#ffffff', fade: 'quad', additive: true,
      });
    }
    this._addParticle({
      type: 'text', x, y: y - 46, vy: -70, drag: 1.4,
      life: 1.9, size: 30, sizeEnd: 26, stretch: 1.05,
      text: t('particles.levelUp'), color: '#fbbf24', colorEnd: '#f97316', fade: 'slow',
    });

    const palette = ['#fbbf24', '#f472b6', '#60a5fa', '#34d399'];
    for (let i = 0; i < this._count(22); i++) {
      const angle = Math.random() * TAU;
      const speed = 110 + Math.random() * 220;
      this._addParticle({
        type: 'star',
        x: x + (Math.random() - 0.5) * 50, y: y - 20,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 60,
        gravity: 340, drag: 0.6,
        rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 10,
        life: 0.9 + Math.random() * 0.7,
        size: 5 + Math.random() * 5, sizeEnd: 0,
        color: palette[i % palette.length], fade: 'quad',
      });
    }
    for (let i = 0; i < this._count(16); i++) {
      this._addParticle({
        type: 'spark', x: x + (Math.random() - 0.5) * 80, y: y + 40,
        vx: (Math.random() - 0.5) * 50, vy: -160 - Math.random() * 200,
        drag: 0.8, life: 0.9 + Math.random() * 0.6,
        size: 2 + Math.random() * 2.5, sizeEnd: 0,
        color: '#fde68a', colorEnd: '#ffffff', fade: 'slow', streak: 4, additive: true,
      });
    }
  }

  /** Floating damage number; crits get a bigger, shakier, gold treatment. */
  spawnDamageNumber(x, y, amount, isCrit = false) {
    this._addParticle({
      type: 'text',
      x: x + (Math.random() - 0.5) * 26, y,
      vx: (Math.random() - 0.5) * 50, vy: isCrit ? -190 : -140,
      gravity: 260, drag: 0.5,
      rot: (Math.random() - 0.5) * (isCrit ? 0.24 : 0.12),
      spin: (Math.random() - 0.5) * 0.6,
      life: isCrit ? 1.25 : 1,
      size: isCrit ? 40 : 26, sizeEnd: isCrit ? 30 : 22,
      stretch: isCrit ? 1.12 : 1,
      text: isCrit ? `${amount}!` : String(amount),
      color: isCrit ? '#fde047' : '#fca5a5',
      colorEnd: isCrit ? '#f97316' : '#dc2626',
      fade: 'slow',
    });
    if (!isCrit) return;
    for (let i = 0; i < this._count(8); i++) {
      const angle = Math.random() * TAU;
      this._addParticle({
        type: 'spark', x, y,
        vx: Math.cos(angle) * (90 + Math.random() * 140),
        vy: Math.sin(angle) * (90 + Math.random() * 140) - 70,
        gravity: 420, drag: 1.4, life: 0.4 + Math.random() * 0.3,
        size: 1.8 + Math.random() * 2, sizeEnd: 0,
        color: '#fde047', colorEnd: '#ffffff', fade: 'quad', streak: 3, additive: true,
      });
    }
  }

  /** Short status headline above a fighter (combo milestones, blocks, misses). */
  spawnStatusText(x, y, text, color = '#ffffff', size = 24) {
    this._addParticle({
      type: 'text', x, y, vy: -95, drag: 1.2,
      life: 1.15, size, sizeEnd: size * 0.86,
      text, color, colorEnd: mixColorHex(color), fade: 'slow',
    });
  }

  clear() {
    for (const p of this.particles) this._release(p);
    this.particles.length = 0;
  }
}

/** Darken a colour slightly so status text fades into a richer tone. */
function mixColorHex(color) {
  const rgb = mixColor(parseColor(color), [30, 34, 54], 0.45);
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}
