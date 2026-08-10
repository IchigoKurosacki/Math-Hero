/**
 * Sprite presentation for heroes, enemies and bosses.
 * The generated PNGs are static base portraits; this module adds the motion:
 * squash & stretch, anticipation/strike/recovery attack phases, knockback,
 * hit flashes, ground shadows, weapon trails and boss phase auras.
 *
 * State timing is tracked here so callers only have to hand over a state name
 * (`idle`, `run`, `attack`, `hurt`, `die`, `victory`) plus a running clock.
 *
 * Enemy motion comes from `enemyAnimations.js`, which gives every creature its
 * own idle, attack and death behaviour.
 */
import { profileFor } from './enemyAnimations.js';

const TAU = Math.PI * 2;

const HERO_ATTACK_DURATION = 0.62;
const ENEMY_ATTACK_DURATION = 0.58;
const HURT_DURATION = 0.5;
const DEATH_DURATION = 0.55;

/**
 * Boss height per phase, as a multiple of the hero's on-screen height.
 * Phase 1 is only slightly taller than the hero; the final phase towers.
 */
const BOSS_PHASE_GROWTH = [1.2, 1.2, 1.55, 2, 2.45];
/**
 * Ceiling per phase as a fraction of the ground line, so a tall boss on a
 * short canvas still fits and the ladder stays strictly increasing.
 */
const BOSS_PHASE_CAP = [0.72, 0.72, 0.82, 0.9, 0.97];


const clamp01 = value => (value < 0 ? 0 : value > 1 ? 1 : value);
const easeOutCubic = t => 1 - (1 - t) ** 3;
const easeInCubic = t => t * t * t;

/** Neutral pose every animation starts from. */
function basePose() {
  return { offsetX: 0, lift: 0, rotation: 0, scaleX: 1, scaleY: 1, flash: 0, strike: 0, opacity: 1 };
}

/**
 * Базовий масштаб сцени.
 *
 * Спрайти намальовані під висоту канвасу від ~620 px. На телефоні в
 * горизонтальному положенні лишається 360–430 px, і при незмінному масштабі
 * герой ставав вищим за вільну смугу між HUD і панеллю відповідей — голова
 * ховалась під HUD, ноги під панеллю.
 *
 * Масштаб веде саме ця вільна смуга, а не повна висота: висота HUD і панелі
 * росте не пропорційно екрану, тому частка від повної висоти давала б на
 * телефоні втричі завеликого героя.
 */
const BASE_SCALE = 2;
/** Частка висоти, яку зверху забирає HUD. */
const HUD_SHARE = 0.18;
/** Смуга, під яку намальовані спрайти в повний розмір. */
const REFERENCE_BAND = 300;
const MIN_SCALE_FACTOR = 0.36;

export class SpriteRenderer {
  constructor(assetManager) {
    this.assetManager = assetManager;
    /** Множник, який рушій оновлює під розмір канвасу. */
    this.scale = BASE_SCALE;
    this._anim = new Map();
    this._scratch = null;
    this._scratchCtx = null;
    this._auraCache = new Map();
  }

  /**
   * Returns seconds elapsed since `state` (or `owner`) last changed.
   * Lets stateless callers drive phase-based animation.
   */
  _stateTime(key, owner, state, animTime) {
    const entry = this._anim.get(key);
    if (!entry || entry.state !== state || entry.owner !== owner) {
      this._anim.set(key, { state, owner, since: animTime });
      return 0;
    }
    return Math.max(0, animTime - entry.since);
  }

  /** Drops cached state timers so a new session starts from clean poses. */
  resetAnimations() { this._anim.clear(); }

  /**
   * Підганяє масштаб персонажів під вільну смугу між HUD і лінією землі.
   * Викликається з `resize()`, бо від цього залежить і розмір боса, і місце
   * мовних бульбашок.
   */
  setSceneHeight(height, groundY) {
    this._hudMargin = height * HUD_SHARE;
    // 10 px запас, щоб плюмаж не заходив під край HUD.
    const band = Math.max(60, groundY - this._hudMargin - 10);
    const factor = Math.max(MIN_SCALE_FACTOR, Math.min(1, band / REFERENCE_BAND));
    this.scale = BASE_SCALE * factor;
    // Ауру боса кешовано під колишній розмір — інакше вона лишиться завеликою.
    this.releaseAuraCache();
  }

  /** Frees the blurred aura buffers — a boss is only on screen for one fight. */
  releaseAuraCache() { this._auraCache.clear(); }

  /**
   * Canvas `filter` is what makes the aura a soft glow rather than a flat
   * colour stamp. Without it the effect would look worse than no aura at all,
   * so the gradient fallback is used instead.
   */
  _supportsCanvasBlur() {
    if (this._canvasBlurOk !== undefined) return this._canvasBlurOk;
    try {
      const probe = document.createElement('canvas').getContext('2d');
      probe.filter = 'blur(2px)';
      this._canvasBlurOk = probe.filter === 'blur(2px)';
    } catch {
      this._canvasBlurOk = false;
    }
    return this._canvasBlurOk;
  }

  /** Ground-based elite enemies offset adjustment to align their feet with the ground. */
  _eliteYOffset(enemyId) {
    if (enemyId === 'elite_1' || enemyId === 'elite_2') return 4.8;
    if (enemyId === 'elite_4') return 2.0;
    if (enemyId === 'elite_5') return 1.0;
    if (enemyId === 'elite_8') return 2.0;
    return 0;
  }

  // ── Shared drawing helpers ───────────────────────────────────────────────

  /** Soft ground shadow that shrinks and fades as the actor lifts off. */
  _drawShadow(ctx, width, lift, maxLift = 70) {
    const closeness = 1 - Math.min(0.8, Math.max(0, lift) / maxLift);
    // Kept tight to the feet — a wide pool reads as a puddle rather than a shadow.
    const radiusX = width * (0.24 + closeness * 0.13);
    const radiusY = Math.max(1.6, width * 0.062 * closeness);
    ctx.save();
    ctx.globalAlpha = 0.15 + closeness * 0.3;
    const grad = ctx.createRadialGradient(0, -1, 0, 0, -1, radiusX);
    grad.addColorStop(0, 'rgba(6,10,24,0.85)');
    grad.addColorStop(0.6, 'rgba(6,10,24,0.35)');
    grad.addColorStop(1, 'rgba(6,10,24,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, -1, radiusX, radiusY, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /** Fits a source image into `size` while preserving its aspect ratio. */
  _fit(img, size) {
    const aspect = img.naturalWidth / img.naturalHeight;
    return aspect >= 1
      ? { width: size, height: size / aspect }
      : { width: size * aspect, height: size };
  }

  /**
   * Renders the sprite silhouette in a flat colour via an offscreen buffer.
   * Used for hit flashes and death dissolves — a plain overlay would tint the
   * whole bounding box instead of just the character.
   */
  _silhouette(img, width, height, color) {
    if (typeof document === 'undefined') return null;
    const w = Math.max(1, Math.ceil(width));
    const h = Math.max(1, Math.ceil(height));
    if (!this._scratch) {
      this._scratch = document.createElement('canvas');
      this._scratchCtx = this._scratch.getContext('2d');
    }
    if (this._scratch.width < w || this._scratch.height < h) {
      this._scratch.width = Math.max(this._scratch.width, w);
      this._scratch.height = Math.max(this._scratch.height, h);
    }
    const g = this._scratchCtx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, this._scratch.width, this._scratch.height);
    g.drawImage(img, 0, 0, w, h);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
    return this._scratch;
  }

  /** Draws the sprite plus its optional hit-flash silhouette on top. */
  _drawSpriteWithFlash(ctx, img, width, height, flash, flashColor = '#ffffff') {
    ctx.drawImage(img, -width / 2, -height, width, height);
    if (flash <= 0.01) return;
    const silhouette = this._silhouette(img, width, height, flashColor);
    if (!silhouette) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, flash);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(silhouette, 0, 0, Math.ceil(width), Math.ceil(height), -width / 2, -height, width, height);
    ctx.restore();
  }

  /** Ghosted after-images trailing a fast-moving actor. */
  _drawMotionTrail(ctx, img, width, height, direction, strength) {
    if (strength <= 0.01) return;
    ctx.save();
    for (let i = 1; i <= 3; i++) {
      ctx.globalAlpha = strength * (0.22 - i * 0.05);
      if (ctx.globalAlpha <= 0) break;
      const offset = direction * i * 13;
      const squeeze = 1 - i * 0.04;
      ctx.drawImage(img, -width / 2 * squeeze - offset, -height, width * squeeze, height);
    }
    ctx.restore();
  }

  // ── Pose builders ────────────────────────────────────────────────────────

  /**
   * Three-beat attack: wind-up (lean away), strike (fast lunge + stretch),
   * recovery (settle back). `facing` is +1 for right, -1 for left.
   */
  _attackPose(elapsed, duration, facing, reach) {
    const pose = basePose();
    const p = clamp01(elapsed / duration);

    if (p < 0.32) {
      const k = easeOutCubic(p / 0.32);
      pose.offsetX = -facing * 16 * k;
      pose.lift = 3 * k;
      pose.rotation = -facing * 0.17 * k;
      pose.scaleX = 1 - 0.07 * k;
      pose.scaleY = 1 + 0.06 * k;
    } else if (p < 0.48) {
      const k = easeOutCubic((p - 0.32) / 0.16);
      pose.offsetX = facing * (-16 + (reach + 16) * k);
      pose.lift = 3 + 11 * k;
      pose.rotation = -facing * 0.17 + facing * 0.45 * k;
      pose.scaleX = 1 - 0.07 + 0.22 * k;
      pose.scaleY = 1 + 0.06 - 0.19 * k;
      pose.strike = 1;
    } else {
      const k = easeOutCubic((p - 0.48) / 0.52);
      const rest = 1 - k;
      pose.offsetX = facing * reach * rest;
      pose.lift = 14 * rest;
      pose.rotation = facing * 0.28 * rest;
      pose.scaleX = 1 + 0.15 * rest;
      pose.scaleY = 1 - 0.13 * rest;
      pose.strike = p < 0.62 ? 1 : 0;
    }
    return pose;
  }

  /** Knockback with a decaying tremor and a white flash on the first frames. */
  _hurtPose(elapsed, pushDirection) {
    const pose = basePose();
    const p = clamp01(elapsed / HURT_DURATION);
    const decay = Math.exp(-p * 5.2);
    const tremor = Math.sin(p * 52) * decay;

    pose.offsetX = pushDirection * (30 * easeOutCubic(Math.min(1, p * 3.4)) * decay + tremor * 5);
    pose.lift = 7 * decay;
    pose.rotation = pushDirection * 0.24 * decay;
    pose.scaleX = 1 + 0.11 * decay;
    pose.scaleY = 1 - 0.13 * decay;
    pose.flash = Math.max(0, 1 - p * 2.4);
    return pose;
  }

  /** Collapse: tips over, sinks into the ground and fades out. */
  _deathPose(elapsed, fallDirection) {
    const pose = basePose();
    const p = clamp01(elapsed / DEATH_DURATION);
    const ease = easeInCubic(p);
    pose.offsetX = fallDirection * 34 * ease;
    pose.lift = Math.sin(p * Math.PI) * 16 - 18 * ease;
    pose.rotation = fallDirection * 1.35 * ease;
    pose.scaleX = 1 + 0.2 * ease;
    pose.scaleY = 1 - 0.42 * ease;
    pose.flash = Math.max(0, 1 - p * 3);
    pose.opacity = 1 - easeInCubic(clamp01((p - 0.25) / 0.75));
    return pose;
  }

  /** Breathing loop: gentle bob with counter-phased squash. */
  _idlePose(animTime, rate = 2.4, amplitude = 1.7) {
    const pose = basePose();
    const breath = Math.sin(animTime * rate);
    pose.lift = amplitude + breath * amplitude;
    pose.scaleY = 1 + breath * 0.024;
    pose.scaleX = 1 - breath * 0.02;
    pose.rotation = Math.sin(animTime * rate * 0.45) * 0.014;
    return pose;
  }

  /** Run cycle: airborne stretch, contact squash, forward lean. */
  _runPose(animTime, facing, rate = 11) {
    const pose = basePose();
    const airborne = Math.abs(Math.sin(animTime * rate));
    const contact = 1 - airborne;
    pose.lift = airborne * 8;
    pose.rotation = facing * (0.06 + Math.sin(animTime * rate) * 0.045);
    pose.scaleY = 1 + airborne * 0.07 - contact * 0.06;
    pose.scaleX = 1 - airborne * 0.05 + contact * 0.055;
    return pose;
  }

  // ── Hero ─────────────────────────────────────────────────────────────────

  drawHero(ctx, x, y, hero, state = 'idle', animTime = 0) {
    const config = hero.config;
    const tier = hero.getEvolutionTier();
    const elapsed = this._stateTime('hero', config.archetype, state, animTime);

    let pose;
    if (state === 'attack') pose = this._attackPose(elapsed, HERO_ATTACK_DURATION, 1, 40);
    else if (state === 'hurt') pose = this._hurtPose(elapsed, -1);
    else if (state === 'run' || state === 'walk') pose = this._runPose(animTime, 1);
    else if (state === 'victory') {
      pose = basePose();
      const hop = Math.abs(Math.sin(animTime * 6.4));
      pose.lift = hop * 22;
      pose.rotation = Math.sin(animTime * 3.1) * 0.11;
      pose.scaleY = 1 + hop * 0.09;
      pose.scaleX = 1 - hop * 0.07;
    } else pose = this._idlePose(animTime);

    const img = this.assetManager.getHeroSprite(config.archetype, config.skinTier || 1);
    const hasSprite = !!(img?.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
    const size = 154 + tier.tier * 3;
    const box = hasSprite ? this._fit(img, size) : { width: 88, height: 110 };

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(this.scale, this.scale);

    this._drawShadow(ctx, box.width, pose.lift);
    if (tier.glow) this._drawEvolutionAura(ctx, config.themeColor, tier.tier, box, animTime);

    ctx.globalAlpha = pose.opacity;
    ctx.translate(pose.offsetX, -pose.lift);
    ctx.rotate(pose.rotation);
    ctx.scale(pose.scaleX, pose.scaleY);

    if (hasSprite) {
      if (state === 'run' || state === 'walk') {
        this._drawMotionTrail(ctx, img, box.width, box.height, 1, 0.85);
      }
      this._drawSpriteWithFlash(ctx, img, box.width, box.height, pose.flash, '#fecaca');
    } else {
      this.drawProceduralHero(ctx, config);
    }

    this._drawWeaponTrail(ctx, config, state, elapsed, box);
    if (hero.shieldActive) this._drawKnowledgeShield(ctx, box, animTime);
    ctx.restore();
  }

  /** Rotating light halo unlocked by hero evolution tiers. */
  _drawEvolutionAura(ctx, themeColor, tier, box, animTime) {
    const pulse = 0.55 + 0.45 * Math.sin(animTime * 2.2);
    const radius = box.height * 0.52;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.16 + tier * 0.045 + pulse * 0.1;
    const grad = ctx.createRadialGradient(0, -box.height * 0.5, radius * 0.2, 0, -box.height * 0.5, radius);
    grad.addColorStop(0, themeColor || '#60a5fa');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, -box.height * 0.5, radius * 0.85, radius, 0, 0, TAU);
    ctx.fill();

    if (tier >= 3) {
      ctx.globalAlpha = 0.28 + pulse * 0.2;
      ctx.strokeStyle = themeColor || '#60a5fa';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 2; i++) {
        const spin = animTime * (i ? -0.9 : 1.2) + i * 1.1;
        ctx.beginPath();
        ctx.ellipse(0, -6, box.width * (0.5 + i * 0.12), box.width * 0.13, spin, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /** Hexagonal barrier that visualises the knowledge shield buff. */
  _drawKnowledgeShield(ctx, box, animTime) {
    const cy = -box.height * 0.52;
    const rx = box.width * 0.66;
    const ry = box.height * 0.6;
    const pulse = 0.6 + 0.4 * Math.sin(animTime * 3.4);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.1 + pulse * 0.1;
    const fill = ctx.createRadialGradient(0, cy, ry * 0.25, 0, cy, ry);
    fill.addColorStop(0, 'rgba(96,165,250,0)');
    fill.addColorStop(0.75, 'rgba(96,165,250,0.35)');
    fill.addColorStop(1, 'rgba(191,219,254,0.65)');
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(0, cy, rx, ry, 0, 0, TAU);
    ctx.fill();

    ctx.globalAlpha = 0.55 + pulse * 0.35;
    ctx.strokeStyle = 'rgba(191,219,254,0.95)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, cy, rx, ry, 0, 0, TAU);
    ctx.stroke();

    // Hex facets sliding around the barrier surface.
    ctx.globalAlpha = 0.22 + pulse * 0.18;
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * TAU + animTime * 0.8;
      const px = Math.cos(angle) * rx * 0.82;
      const py = cy + Math.sin(angle) * ry * 0.82;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + angle;
        const hx = px + Math.cos(a) * 9;
        const hy = py + Math.sin(a) * 9;
        if (k === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Archetype-specific weapon flourish drawn in sync with the strike beat.
   * Only visible while the attack pose is in its active window.
   */
  _drawWeaponTrail(ctx, config, state, elapsed, box) {
    if (state !== 'attack') return;
    const p = clamp01(elapsed / HERO_ATTACK_DURATION);
    if (p < 0.24 || p > 0.78) return;
    const swing = clamp01((p - 0.24) / 0.5);
    const fade = 1 - swing;
    const centerY = -box.height * 0.48;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    if (config.archetype === 'knight' || config.archetype === 'cossack') {
      const edge = config.archetype === 'knight' ? '#dbeafe' : '#fee2e2';
      const start = -1.5 + swing * 2.4;
      ctx.globalAlpha = 0.85 * fade + 0.15;
      ctx.strokeStyle = edge;
      ctx.shadowColor = edge;
      ctx.shadowBlur = 18;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        ctx.lineWidth = 9 - i * 3;
        ctx.globalAlpha = (0.8 - i * 0.22) * fade;
        ctx.beginPath();
        ctx.arc(26, centerY, 60 - i * 7, start - 0.75, start + 0.35);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    } else if (config.archetype === 'sorceress') {
      const travel = 70 + swing * 110;
      ctx.globalAlpha = 0.9 * fade + 0.1;
      const orbGrad = ctx.createRadialGradient(travel, centerY, 2, travel, centerY, 22);
      orbGrad.addColorStop(0, '#f5f3ff');
      orbGrad.addColorStop(0.45, '#c4b5fd');
      orbGrad.addColorStop(1, 'rgba(139,92,246,0)');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(travel, centerY, 22, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(196,181,253,0.9)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 2; i++) {
        ctx.globalAlpha = (0.6 - i * 0.22) * fade;
        ctx.beginPath();
        ctx.ellipse(travel, centerY, 26 + i * 9, 10 + i * 4, swing * 4 + i, 0, TAU);
        ctx.stroke();
      }
    } else if (config.archetype === 'archer') {
      const tip = 45 + swing * 135;
      ctx.globalAlpha = 0.85 * fade + 0.15;
      ctx.strokeStyle = '#bbf7d0';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(tip - 78, centerY);
      ctx.lineTo(tip, centerY);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#dcfce7';
      ctx.beginPath();
      ctx.moveTo(tip + 12, centerY);
      ctx.lineTo(tip - 6, centerY - 7);
      ctx.lineTo(tip - 6, centerY + 7);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /** Flat fallback used when a hero PNG is missing or corrupted. */
  drawProceduralHero(ctx, config) {
    ctx.fillStyle = config.themeColor || '#3b82f6';
    ctx.fillRect(-22, -75, 44, 55);
    ctx.fillStyle = '#f5c6a5';
    ctx.beginPath(); ctx.arc(0, -91, 19, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4a2e1b';
    ctx.beginPath(); ctx.arc(0, -101, 15, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = '#172033';
    ctx.fillRect(-14, -20, 11, 27);
    ctx.fillRect(3, -20, 11, 27);
  }

  // ── Enemies ──────────────────────────────────────────────────────────────

  /** Per-creature animation archetype, from the shared profile table. */
  _enemyProfile(enemy) {
    return profileFor(enemy);
  }

  /**
   * Blends a profile pose over the shared hurt reaction, so a creature keeps
   * its own character even while being knocked back.
   */
  _enemyPose(profile, state, elapsed, animTime) {
    if (state === 'attack') return profile.attack(clamp01(elapsed / ENEMY_ATTACK_DURATION));
    if (state === 'die') return profile.death(clamp01(elapsed / DEATH_DURATION));
    if (state === 'hurt') return this._hurtPose(elapsed, 1);
    return profile.idle(animTime);
  }

  drawEnemy(ctx, x, y, enemy, state = 'idle', animTime = 0) {
    const profile = this._enemyProfile(enemy);
    const elapsed = this._stateTime('enemy', enemy.id, state, animTime);
    const scale = enemy.size || 1;
    const pose = this._enemyPose(profile, state, elapsed, animTime);

    // Only airborne archetypes carry a baseline hover; everything else stands
    // on exactly the same ground line as the hero.
    const hover = profile.airborne || 0;
    const img = this.assetManager.getEnemySprite(enemy.id);
    const hasSprite = !!(img?.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
    const box = hasSprite ? this._fit(img, 118) : { width: 66, height: 75 };

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(this.scale, this.scale);
    ctx.scale(scale, scale);

    this._drawShadow(ctx, box.width, hover + pose.lift, hover > 0 ? 110 : 70);

    ctx.globalAlpha = pose.opacity;
    const eliteYOffset = this._eliteYOffset(enemy.id);
    ctx.translate(pose.offsetX, -(hover + pose.lift) + eliteYOffset);
    ctx.rotate(pose.rotation);
    if (pose.skewX) ctx.transform(1, 0, pose.skewX, 1, 0, 0);
    ctx.scale(pose.scaleX, pose.scaleY);

    if (hasSprite) {
      this._drawSpriteWithFlash(ctx, img, box.width, box.height, pose.flash, '#ffffff');
    } else {
      this.drawProceduralEnemy(ctx, enemy);
    }

    if (state === 'attack') this._drawEnemyAttackEffect(ctx, enemy, profile, elapsed, box);
    ctx.restore();
  }

  /** Weapon effect matched to the creature's `fx` kind. */
  _drawEnemyAttackEffect(ctx, enemy, profile, elapsed, box) {
    const p = clamp01(elapsed / ENEMY_ATTACK_DURATION);
    if (p < 0.24 || p > 0.8) return;
    const swing = clamp01((p - 0.24) / 0.56);
    const fade = 1 - swing;
    const centerY = -box.height * 0.5;
    const accent = enemy.color || '#ef4444';

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.8 * fade + 0.2;
    ctx.lineCap = 'round';

    switch (profile.fx) {
      case 'spell': {
        const travel = -60 - swing * 90;
        const grad = ctx.createRadialGradient(travel, centerY, 2, travel, centerY, 22);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, '#f5d0fe');
        grad.addColorStop(0.7, accent);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(travel, centerY, 22, 0, TAU);
        ctx.fill();
        // Trailing sigil ring left behind the orb.
        ctx.globalAlpha = fade * 0.6;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(travel + 26, centerY, 16, 7, swing * 2, 0, TAU);
        ctx.stroke();
        break;
      }
      case 'sting': {
        // Needle-thin thrust with a bright tip.
        const tip = -46 - swing * 118;
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(tip + 62, centerY);
        ctx.lineTo(tip, centerY);
        ctx.stroke();
        ctx.fillStyle = '#fffbe8';
        ctx.beginPath();
        ctx.arc(tip, centerY, 3.6, 0, TAU);
        ctx.fill();
        break;
      }
      case 'bite': {
        // Two converging jaw arcs.
        ctx.strokeStyle = '#fee2e2';
        ctx.shadowColor = accent;
        ctx.shadowBlur = 12;
        const gap = (1 - swing) * 0.5 + 0.06;
        for (const side of [-1, 1]) {
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(-40, centerY, 30, -0.9 * side - gap * side, 0.5 * side - gap * side, side < 0);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        break;
      }
      case 'slam': {
        // Ground shock at the point of impact.
        const reach = -30 - swing * 30;
        ctx.strokeStyle = '#fed7aa';
        ctx.lineWidth = 6 * fade + 1;
        ctx.beginPath();
        ctx.ellipse(reach, 0, 30 + swing * 55, 9 + swing * 16, 0, Math.PI, TAU);
        ctx.stroke();
        ctx.globalAlpha = fade * 0.8;
        for (let i = 0; i < 4; i++) {
          const angle = -Math.PI * (0.25 + i * 0.16);
          const len = (18 + swing * 34) * (1 - i * 0.12);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(reach, -2);
          ctx.lineTo(reach + Math.cos(angle) * len, -2 + Math.sin(angle) * len * 0.7);
          ctx.stroke();
        }
        break;
      }
      case 'splash': {
        // Gelatinous body-check throwing droplets.
        ctx.fillStyle = accent;
        for (let i = 0; i < 7; i++) {
          const angle = Math.PI * (0.75 + (i / 7) * 0.6);
          const dist = 26 + swing * 52 + (i % 3) * 7;
          ctx.globalAlpha = fade * (0.7 - (i % 3) * 0.15);
          ctx.beginPath();
          ctx.arc(Math.cos(angle) * dist - 18, centerY + Math.sin(angle) * dist * 0.5, 5 - (i % 3), 0, TAU);
          ctx.fill();
        }
        break;
      }
      case 'blade':
      default: {
        // Steel arc sweeping toward the hero.
        const start = 2.1 + swing * 2.2;
        ctx.strokeStyle = '#fecaca';
        ctx.shadowColor = accent;
        ctx.shadowBlur = 14;
        for (let i = 0; i < 3; i++) {
          ctx.lineWidth = 7 - i * 2;
          ctx.globalAlpha = (0.8 - i * 0.22) * fade;
          ctx.beginPath();
          ctx.arc(-22, centerY, 48 - i * 9, start - 0.6, start + 0.4);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        break;
      }
    }
    ctx.restore();
  }

  /** Flat fallback used when an enemy PNG is missing or corrupted. */
  drawProceduralEnemy(ctx, enemy) {
    ctx.fillStyle = enemy.color || '#e74c3c';
    ctx.beginPath(); ctx.arc(0, -47, 28, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-9, -51, 5, 0, TAU); ctx.arc(9, -51, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath(); ctx.arc(-8, -50, 2, 0, TAU); ctx.arc(10, -50, 2, 0, TAU); ctx.fill();
  }

  // ── Bosses ───────────────────────────────────────────────────────────────

  /**
   * Resolves the artwork and draw scale for a boss at a given phase.
   * Scale is derived from the hero's height so "phase 1 is a little bigger
   * than the hero" holds on every canvas size.
   */
  _bossForm(boss, phase, heroHeight, groundY) {
    const img = this.assetManager.getBossSprite(boss.id, phase);
    const hasSprite = !!(img?.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
    const box = hasSprite ? this._fit(img, 164) : { width: 92, height: 130 };

    const index = Math.max(1, Math.min(4, phase));
    // Bestiary size only ever adds bulk, so no boss ends up shorter than the ladder.
    const bulk = Math.max(1, Math.min(1.3, (boss.size || 2) / 2));
    let target = heroHeight * BOSS_PHASE_GROWTH[index] * bulk;
    
    // Keep the boss inside the arena on short canvases, avoiding the dynamic top HUD margin.
    const topMargin = this._hudMargin || (heroHeight * 0.4);
    if (groundY > topMargin) target = Math.min(target, (groundY - topMargin) * BOSS_PHASE_CAP[index]);
    
    // …but never let that clamp shrink it to the hero's size or below.
    target = Math.max(target, heroHeight * (1.1 + index * 0.08));

    // The caller already applies the scene scale, hence dividing by it here.
    return { img, hasSprite, box, scale: target / (this.scale * box.height), cacheKey: `${boss.id}:${phase}` };
  }

  drawBoss(ctx, x, y, boss, phase = 1, state = 'idle', animTime = 0, options = {}) {
    const heroHeight = options.heroHeight || 300;
    const groundY = options.groundY || 0;
    const evolution = options.evolution || null;
    // While evolving, the boss is already presented in its new phase.
    const shownPhase = evolution ? evolution.toPhase : phase;

    const elapsed = this._stateTime('boss', boss.id, state, animTime);
    const form = this._bossForm(boss, shownPhase, heroHeight, groundY);
    const hover = Math.sin(animTime * (3 + shownPhase)) * (4 + shownPhase * 2);
    const accent = boss.color || '#a855f7';

    let pose;
    if (evolution) pose = this._idlePose(animTime, 3.2, 2.2);
    else if (state === 'attack') pose = this._attackPose(elapsed, ENEMY_ATTACK_DURATION, -1, 34);
    else if (state === 'hurt') pose = this._hurtPose(elapsed, 1);
    else if (state === 'die') pose = this._deathPose(elapsed, 1);
    else pose = this._idlePose(animTime, 1.8 + shownPhase * 0.4, 1.2);

    // From the third phase on the boss carries a permanent rage tremor.
    if (shownPhase >= 3 && state !== 'die' && !evolution) {
      pose.offsetX += Math.sin(animTime * 34) * 1.8;
      pose.rotation += Math.sin(animTime * 27) * 0.012;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(this.scale, this.scale);

    if (evolution) {
      this._drawEvolvingBoss(ctx, boss, evolution, heroHeight, groundY, accent, hover, animTime);
      ctx.restore();
      return;
    }

    ctx.scale(form.scale, form.scale);
    this._drawShadow(ctx, form.box.width, hover + pose.lift, 90);
    this._drawBossAura(ctx, accent, shownPhase, form.box, animTime, form);

    ctx.globalAlpha = pose.opacity;
    ctx.translate(pose.offsetX, -(hover + pose.lift));
    ctx.rotate(pose.rotation);
    ctx.scale(pose.scaleX, pose.scaleY);

    if (form.hasSprite) this._drawSpriteWithFlash(ctx, form.img, form.box.width, form.box.height, pose.flash, '#ffffff');
    else this.drawProceduralBoss(ctx, boss);

    if (options.invulnerable) this._drawPhaseBarrier(ctx, accent, form.box, animTime);
    ctx.restore();
  }

  /**
   * Pokémon-style evolution. The boss becomes a pure white silhouette that
   * flickers between its old and new form at an accelerating rate while it
   * grows, then the finished form is revealed in a burst of light.
   *
   * Expects the caller to have applied translate(x, y) and scale(2, 2).
   */
  _drawEvolvingBoss(ctx, boss, evolution, heroHeight, groundY, accent, hover, animTime) {
    const progress = Math.max(0, Math.min(1, evolution.progress));
    const from = this._bossForm(boss, evolution.fromPhase, heroHeight, groundY);
    const to = this._bossForm(boss, evolution.toPhase, heroHeight, groundY);

    // Alternation accelerates as the transformation completes.
    const beats = 2 + progress * progress * 26;
    const showNew = Math.sin(beats * Math.PI * 2) > 0;
    const reveal = progress > 0.88;
    const form = reveal || showNew ? to : from;

    // Growth eases toward the new size and settles with a small overshoot.
    const growth = 1 - (1 - progress) ** 3;
    const settle = reveal ? 1 + Math.sin((progress - 0.88) / 0.12 * Math.PI) * 0.06 : 1;
    const scale = (from.scale + (to.scale - from.scale) * growth) * settle;
    const lift = hover + Math.sin(progress * Math.PI) * 26;

    ctx.save();
    ctx.scale(scale, scale);
    this._drawShadow(ctx, form.box.width, lift, 90);

    // Light column rising behind the boss.
    const beamHeight = form.box.height * (1.3 + progress * 0.6);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25 + progress * 0.5;
    const beam = ctx.createLinearGradient(0, 0, 0, -beamHeight);
    beam.addColorStop(0, 'rgba(255,255,255,0.85)');
    beam.addColorStop(0.45, `${accent}88`);
    beam.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = beam;
    const beamWidth = form.box.width * (0.75 - progress * 0.25);
    ctx.beginPath();
    ctx.moveTo(-beamWidth / 2, 0);
    ctx.lineTo(beamWidth / 2, 0);
    ctx.lineTo(beamWidth * 0.22, -beamHeight);
    ctx.lineTo(-beamWidth * 0.22, -beamHeight);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.translate(0, -lift);

    if (!form.hasSprite) {
      this.drawProceduralBoss(ctx, boss);
      ctx.restore();
      return;
    }

    if (reveal) {
      // Final beat: the real artwork returns under a fading white wash.
      const fade = 1 - (progress - 0.88) / 0.12;
      this._drawSpriteWithFlash(ctx, form.img, form.box.width, form.box.height, fade, '#ffffff');
    } else {
      const silhouette = this._silhouette(form.img, form.box.width, form.box.height, '#ffffff');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55 + progress * 0.45;
      if (silhouette) {
        ctx.drawImage(
          silhouette, 0, 0, Math.ceil(form.box.width), Math.ceil(form.box.height),
          -form.box.width / 2, -form.box.height, form.box.width, form.box.height,
        );
      } else {
        ctx.drawImage(form.img, -form.box.width / 2, -form.box.height, form.box.width, form.box.height);
      }
      ctx.restore();
    }

    // Halo tightening around the silhouette as the change completes.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.2 + progress * 0.4;
    const halo = ctx.createRadialGradient(
      0, -form.box.height * 0.5, form.box.height * (0.42 - progress * 0.2),
      0, -form.box.height * 0.5, form.box.height * (0.95 - progress * 0.25),
    );
    halo.addColorStop(0, 'rgba(255,255,255,0.75)');
    halo.addColorStop(0.6, `${accent}66`);
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.ellipse(0, -form.box.height * 0.5, form.box.width * 0.95, form.box.height * 0.75, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  /**
   * Silhouette-shaped glow sprite: the boss artwork blurred and flooded with a
   * flat colour. Because the light follows the actual silhouette rather than a
   * generic ellipse, the aura reads as emitted by the character.
   * Cached per boss/phase/size — the blur is far too costly for a per-frame path.
   */
  _auraSprite(img, width, height, color, blur, cacheKey) {
    const key = `${cacheKey}|${Math.round(width)}x${Math.round(height)}|${color}|${blur}`;
    const cached = this._auraCache.get(key);
    if (cached) return cached;
    if (typeof document === 'undefined' || !this._supportsCanvasBlur()) return null;
    if (this._auraCache.size > 24) this._auraCache.clear();

    const pad = Math.ceil(blur * 2.5);
    const w = Math.ceil(width) + pad * 2;
    const h = Math.ceil(height) + pad * 2;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d');
    g.filter = `blur(${blur}px)`;
    g.drawImage(img, pad, pad, width, height);
    g.filter = 'none';
    // Flood the blurred alpha with the accent colour.
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);

    const sprite = { canvas, pad, width: w, height: h };
    this._auraCache.set(key, sprite);
    return sprite;
  }

  /**
   * Boss presence: volumetric silhouette glow, a light pool on the ground and
   * energy ribbons flowing upward. Intensity scales with the phase.
   */
  _drawBossAura(ctx, accent, phase, box, animTime, form) {
    const intensity = 0.4 + phase * 0.2;
    const pulse = 0.6 + 0.4 * Math.sin(animTime * (1.6 + phase * 0.35));
    const breathe = 0.5 + 0.5 * Math.sin(animTime * 0.9 + phase);

    ctx.save();

    // Ground presence: a dark contact shadow with an accent light pool over it.
    const poolW = box.width * (0.95 + phase * 0.1);
    const poolH = box.width * 0.24;
    const dark = ctx.createRadialGradient(0, -2, 0, 0, -2, poolW);
    dark.addColorStop(0, 'rgba(4,6,16,0.5)');
    dark.addColorStop(1, 'rgba(4,6,16,0)');
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(0, -2, poolW, poolH, 0, 0, TAU);
    ctx.fill();

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (0.24 + pulse * 0.16) * intensity;
    const pool = ctx.createRadialGradient(0, -4, poolW * 0.1, 0, -4, poolW * (0.9 + breathe * 0.12));
    pool.addColorStop(0, accent);
    pool.addColorStop(0.45, `${accent}55`);
    pool.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.ellipse(0, -4, poolW * (1 + breathe * 0.08), poolH * 1.15, 0, 0, TAU);
    ctx.fill();

    // Volumetric glow hugging the boss silhouette.
    const aura = form?.hasSprite
      ? this._auraSprite(form.img, box.width, box.height, accent, 12, form.cacheKey)
      : null;
    if (aura) {
      const layers = 2 + Math.min(2, phase - 1);
      for (let i = 0; i < layers; i++) {
        const spread = 1 + i * 0.07 + breathe * 0.025;
        ctx.globalAlpha = (0.3 - i * 0.07) * intensity * (0.75 + pulse * 0.45);
        ctx.save();
        ctx.translate(0, -box.height * 0.5);
        ctx.scale(spread, spread);
        ctx.translate(0, box.height * 0.5);
        ctx.drawImage(
          aura.canvas,
          -box.width / 2 - aura.pad, -box.height - aura.pad,
          aura.width, aura.height,
        );
        ctx.restore();
      }
    } else {
      // Fallback for a missing sprite: a soft body-shaped gradient.
      ctx.globalAlpha = 0.2 * intensity + pulse * 0.1;
      const glow = ctx.createRadialGradient(0, -box.height * 0.45, box.height * 0.12, 0, -box.height * 0.45, box.height * 0.8);
      glow.addColorStop(0, accent);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(0, -box.height * 0.45, box.width * 0.85, box.height * 0.72, 0, 0, TAU);
      ctx.fill();
    }

    this._drawEnergyRibbons(ctx, accent, phase, box, animTime, intensity);
    ctx.restore();
  }

  /**
   * Tapered energy ribbons that spiral up around the boss. Each is a bezier
   * whose control points drift, so the motion never repeats visibly.
   */
  _drawEnergyRibbons(ctx, accent, phase, box, animTime, intensity) {
    const count = 3 + phase;
    const reach = box.height * 1.05;
    ctx.lineCap = 'round';

    for (let i = 0; i < count; i++) {
      const seed = i * 1.8;
      const speed = 0.32 + (i % 3) * 0.11;
      const cycle = (animTime * speed + i / count) % 1;
      const side = i % 2 ? 1 : -1;
      const spread = box.width * (0.34 + (i % 3) * 0.12);

      const baseX = side * spread * (0.4 + 0.6 * Math.sin(seed));
      const topY = -reach * (0.55 + cycle * 0.6);
      const swayA = Math.sin(animTime * 1.4 + seed) * box.width * 0.22;
      const swayB = Math.cos(animTime * 1.1 + seed * 1.7) * box.width * 0.3;

      // Ribbons fade in at the bottom of their cycle and out at the top.
      const life = Math.sin(cycle * Math.PI);
      if (life <= 0.02) continue;

      const grad = ctx.createLinearGradient(baseX, 0, baseX + swayB, topY);
      grad.addColorStop(0, `${accent}00`);
      grad.addColorStop(0.35, accent);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = grad;
      ctx.globalAlpha = life * 0.5 * intensity;

      // Two passes: a wide soft body and a bright thin core.
      for (const [widthScale, alphaScale] of [[1, 0.55], [0.35, 1]]) {
        ctx.lineWidth = Math.max(0.6, box.width * 0.035 * widthScale * life);
        ctx.globalAlpha = life * 0.5 * intensity * alphaScale;
        ctx.beginPath();
        ctx.moveTo(baseX, -2);
        ctx.bezierCurveTo(
          baseX + swayA, topY * 0.35,
          baseX - swayA * 0.7, topY * 0.7,
          baseX + swayB, topY,
        );
        ctx.stroke();
      }
    }
  }

  /** Shimmering shell shown while the boss is invulnerable between phases. */
  _drawPhaseBarrier(ctx, accent, box, animTime) {
    const cy = -box.height * 0.5;
    const pulse = 0.5 + 0.5 * Math.sin(animTime * 8);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25 + pulse * 0.3;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, cy, box.width * 0.72, box.height * 0.6, 0, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.1 + pulse * 0.12;
    const fill = ctx.createRadialGradient(0, cy, box.height * 0.15, 0, cy, box.height * 0.62);
    fill.addColorStop(0, 'rgba(255,255,255,0)');
    fill.addColorStop(1, accent);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(0, cy, box.width * 0.72, box.height * 0.6, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /** Flat fallback used when a boss PNG is missing or corrupted. */
  drawProceduralBoss(ctx, boss) {
    ctx.fillStyle = boss.color || '#a855f7';
    ctx.beginPath(); ctx.arc(0, -66, 46, 0, TAU); ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(-26, -105); ctx.lineTo(-13, -123); ctx.lineTo(0, -107);
    ctx.lineTo(14, -124); ctx.lineTo(27, -105); ctx.closePath();
    ctx.fill();
  }

  // ── Layout queries ───────────────────────────────────────────────────────

  /** Visual height of the hero in canvas pixels, measured from the ground line. */
  heroTopOffset(hero) {
    if (!hero?.config) return 0;
    const img = this.assetManager.getHeroSprite(hero.config.archetype, hero.config.skinTier || 1);
    const size = 154 + hero.getEvolutionTier().tier * 3;
    const box = (img?.naturalHeight > 0) ? this._fit(img, size) : { width: 88, height: 110 };
    return this.scale * box.height;
  }

  /**
   * Visual top of an actor in canvas pixels, relative to the ground line.
   * Shared by the renderer and the speech-bubble layout so the two never drift.
   */
  spriteTopOffset(actor, { isBoss = false, phase = 1, animTime = 0, heroHeight = 300, groundY = 0 } = {}) {
    if (!actor) return 0;
    if (isBoss) {
      const form = this._bossForm(actor, phase, heroHeight, groundY);
      const hover = Math.sin(animTime * (3 + phase)) * (4 + phase * 2);
      return this.scale * form.scale * (hover + form.box.height);
    }
    const profile = this._enemyProfile(actor);
    const scale = actor.size || 1;
    const hover = profile.airborne || 0;
    const idleLift = Math.max(0, profile.idle(animTime).lift);
    const img = this.assetManager.getEnemySprite(actor.id);
    const box = (img?.naturalHeight > 0) ? this._fit(img, 118) : { width: 66, height: 75 };
    const eliteYOffset = this._eliteYOffset(actor.id);
    return this.scale * scale * (hover + idleLift + box.height - eliteYOffset);
  }
}
