/**
 * Layered side-scroller canvas renderer.
 * Rendering is presentation-only: GameApp owns all simulation state.
 */
import { SpriteRenderer } from './sprites.js';
import { ParticleSystem } from './particles.js';

const TIME_ORDER = ['day', 'sunset', 'night', 'dawn'];

/**
 * The sky runs on one continuous phase, 0 → 1 over a full day:
 *   0.00 sunrise · 0.25 noon · 0.50 sunset · 0.75 midnight
 * The named times are just anchors on that dial, so the sun can travel a real
 * arc and hand over to the moon instead of teleporting between four presets.
 */
const PHASE_ANCHORS = { dawn: 0, day: 0.25, sunset: 0.5, night: 0.75 };
const PHASE_SPEED = 0.16; // dial revolutions per second while transitioning

/** Sky gradient keyframes sampled around the dial. */
const SKY_KEYS = [
  { at: 0,    top: '#241a52', mid: '#5b46c8', bottom: '#f9a8d4' },
  { at: 0.10, top: '#2f68ad', mid: '#8fbdea', bottom: '#ffdcae' },
  { at: 0.25, top: null,      mid: '#e0f4ff', bottom: '#c9f1ff' },
  { at: 0.40, top: '#2c4f92', mid: '#b9835c', bottom: '#ffc98a' },
  { at: 0.50, top: '#1a0533', mid: '#7c2d12', bottom: '#f59e0b' },
  { at: 0.60, top: '#0d1128', mid: '#33194f', bottom: '#61305f' },
  { at: 0.75, top: '#020810', mid: '#0a1628', bottom: '#1a1040' },
  { at: 0.90, top: '#0b1233', mid: '#20305f', bottom: '#4b3a7c' },
  { at: 1,    top: '#241a52', mid: '#5b46c8', bottom: '#f9a8d4' },
];

/** World light tint per phase, applied to the background and midground art. */
const LIGHT_KEYS = [
  { at: 0,    color: [255, 176, 156], strength: 0.34 },
  { at: 0.12, color: [255, 226, 186], strength: 0.16 },
  { at: 0.25, color: [255, 250, 240], strength: 0 },
  { at: 0.42, color: [255, 186, 122], strength: 0.24 },
  { at: 0.50, color: [255, 130, 62],  strength: 0.42 },
  { at: 0.62, color: [92, 96, 176],   strength: 0.5 },
  { at: 0.75, color: [42, 58, 132],   strength: 0.62 },
  { at: 0.90, color: [70, 84, 158],   strength: 0.5 },
  { at: 1,    color: [255, 176, 156], strength: 0.34 },
];

const lerp = (a, b, t) => a + (b - a) * t;

/** Samples a keyframe track at `phase`, interpolating between neighbours. */
function sampleTrack(keys, phase) {
  const p = ((phase % 1) + 1) % 1;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (p >= a.at && p <= b.at) {
      const span = b.at - a.at || 1;
      return { a, b, t: (p - a.at) / span };
    }
  }
  return { a: keys[0], b: keys[0], t: 0 };
}

function mixHex(from, to, t, fallback) {
  const parse = value => {
    const hex = value || fallback;
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const a = parse(from);
  const b = parse(to);
  return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
}

export class GameRenderer {
  constructor(canvas, assetManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.assetManager = assetManager;
    this.sprites = new SpriteRenderer(assetManager);
    this.particles = new ParticleSystem();
    this.cameraX = 0;
    this.targetCameraX = 0;
    this.timeOfDay = 'day';
    this.weather = 'none';
    this.currentBgTheme = 'meadows';
    this.regionColors = { bgColor1: '#38ef7d', bgColor2: '#11998e', skyColor: '#87ceeb' };
    this.weatherParticles = [];
    this.reducedMotion = false;
    this.animationSpeed = 1;
    this.dayPhase = PHASE_ANCHORS.day;
    this.targetDayPhase = PHASE_ANCHORS.day;
    this.globalAnimTime = 0;
    this._decorCache = new Map();

    // Impact feedback: camera shake, freeze-frame and full-screen flashes.
    this.shakeAmount = 0;
    this.shakeDecay = 6;
    this.shakeSeed = Math.random() * 1000;
    this.hitStopTimer = 0;
    this.screenFlash = null;

    this.initWeather();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /**
   * 1 normally, 0 while a hit-stop freeze-frame is active.
   * Callers multiply their own animation clocks by this so poses freeze too.
   */
  get timeScale() { return this.hitStopTimer > 0 ? 0 : 1; }

  /** Kicks the camera. `amount` is the peak offset in CSS pixels. */
  shake(amount = 8, decay = 6) {
    if (this.reducedMotion) amount *= 0.3;
    this.shakeAmount = Math.min(34, Math.max(this.shakeAmount, amount));
    this.shakeDecay = decay;
  }

  /** Freeze-frame on impact. Ignored when reduced motion is requested. */
  hitStop(seconds = 0.06) {
    if (this.reducedMotion) return;
    this.hitStopTimer = Math.max(this.hitStopTimer, seconds);
  }

  /** Additive full-screen flash, e.g. on crits and ultimates. */
  flash(color = '#ffffff', strength = 0.35, duration = 0.22) {
    if (this.reducedMotion) strength *= 0.4;
    this.screenFlash = { color, strength, timer: duration, duration };
  }

  /** Clears transient combat state so a new session starts visually clean. */
  resetScene() {
    this.particles.clear();
    this.sprites.resetAnimations();
    this.sprites.releaseAuraCache();
    this.shakeAmount = 0;
    this.hitStopTimer = 0;
    this.screenFlash = null;
  }

  setRegionTheme(region) {
    if (this.currentBgTheme !== (region.bgTheme || 'meadows')) this._decorCache.clear();
    this.currentBgTheme = region.bgTheme || 'meadows';
    this.regionColors = {
      bgColor1: region.bgColor1 || '#38ef7d',
      bgColor2: region.bgColor2 || '#11998e',
      skyColor: region.skyColor || '#87ceeb',
    };
    this.cameraX = 0;
    this.targetCameraX = 0;
  }

  setStagePresentation(stage = {}) {
    this.setTimeOfDay(stage.timeOfDay || 'day');
    this.setWeather(stage.weather || 'none');
  }

  setAccessibility(settings = {}) {
    this.reducedMotion = !!settings.reducedMotion;
    this.animationSpeed = Math.max(0.5, Math.min(1.5, Number(settings.animationSpeed || 1)));
    this.particles.setIntensity(this.reducedMotion ? 0.35 : 1);
  }

  setWorldProgress(progress) {
    this.targetCameraX = Math.max(0, progress || 0);
  }

  advanceTimeOfDay() {
    const index = TIME_ORDER.indexOf(this.timeOfDay);
    this.timeOfDay = TIME_ORDER[(index + 1) % TIME_ORDER.length];
    // Always travel forwards around the dial, so the sun sets and the moon
    // rises rather than the sky snapping backwards.
    const target = PHASE_ANCHORS[this.timeOfDay];
    this.targetDayPhase = target < this.dayPhase ? target + 1 : target;
  }

  /** 0 at noon, 1 at midnight — drives stars, lighting and the moon. */
  get darkness() {
    return 0.5 + 0.5 * Math.cos((this.dayPhase - 0.75) * Math.PI * 2);
  }

  /** Current world light tint, used to grade the background and decor. */
  get worldLight() {
    const { a, b, t } = sampleTrack(LIGHT_KEYS, this.dayPhase);
    return {
      color: [
        Math.round(lerp(a.color[0], b.color[0], t)),
        Math.round(lerp(a.color[1], b.color[1], t)),
        Math.round(lerp(a.color[2], b.color[2], t)),
      ],
      strength: lerp(a.strength, b.strength, t),
    };
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = Math.max(320, rect.width);
    this.height = Math.max(360, rect.height);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.sprites.setSceneHeight(this.height, this.groundY);
  }

  /**
   * Лінія землі. На телефоні в горизонтальному положенні панель відповідей
   * забирає нижню половину екрана, тому земля піднімається — інакше бійці
   * стояли б під панеллю. Між 360 і 620 px висоти частка йде плавно, щоб на
   * планшеті не було стрибка.
   */
  get groundY() {
    const t = Math.max(0, Math.min(1, (this.height - 360) / (620 - 360)));
    return this.height * (0.5 + (0.72 - 0.5) * t);
  }

  initWeather() {
    this.weatherParticles = Array.from({ length: 110 }, () => ({
      x: Math.random() * 2200,
      y: Math.random() * 900,
      speedY: Math.random() * 420 + 320,
      speedX: -(Math.random() * 90 + 70),
      length: Math.random() * 26 + 16,
      thickness: Math.random() * 1.5 + 0.8,
      alpha: Math.random() * 0.5 + 0.3,
      size: Math.random() * 3 + 1,
      phase: Math.random() * Math.PI * 2,
    }));
    this.lightningState = {
      active: false,
      timer: 0,
      duration: 0,
      bolt: null,
      branches: [],
    };
    this.lightningCooldown = 10 + Math.random() * 20;
  }

  triggerLightning() {
    const startX = Math.random() * (this.width * 0.8) + this.width * 0.1;
    const targetY = this.groundY - Math.random() * 50;
    const segments = 8;
    const segHeight = targetY / segments;
    const bolt = [{ x: startX, y: 0 }];
    let currX = startX;
    let currY = 0;

    for (let i = 0; i < segments; i++) {
      currY += segHeight;
      currX += (Math.random() - 0.5) * 70;
      bolt.push({ x: currX, y: currY });
    }

    const branches = [];
    if (bolt.length > 4) {
      const forkIdx = Math.floor(Math.random() * 3) + 3;
      const forkStart = bolt[forkIdx];
      let bX = forkStart.x;
      let bY = forkStart.y;
      const bPoints = [{ x: bX, y: bY }];
      const dir = Math.random() > 0.5 ? 1 : -1;
      for (let j = 0; j < 4; j++) {
        bY += segHeight * 0.75;
        bX += dir * (Math.random() * 35 + 15);
        bPoints.push({ x: bX, y: bY });
      }
      branches.push(bPoints);
    }

    this.lightningState = {
      active: true,
      timer: 0.28,
      duration: 0.28,
      bolt,
      branches,
    };
  }

  setWeather(weather) { this.weather = weather || 'none'; }
  setTimeOfDay(timeOfDay) {
    this.timeOfDay = TIME_ORDER.includes(timeOfDay) ? timeOfDay : 'day';
    // A stage sets its time outright; no travel across the dial.
    this.dayPhase = PHASE_ANCHORS[this.timeOfDay];
    this.targetDayPhase = this.dayPhase;
  }

  update(dt) {
    // Camera shake and the flash overlay keep running through a hit-stop —
    // freezing them would swallow the punch the freeze-frame is meant to add.
    this.shakeSeed += dt * 60;
    if (this.shakeAmount > 0) {
      this.shakeAmount = Math.max(0, this.shakeAmount - this.shakeAmount * this.shakeDecay * dt - 0.6 * dt);
    }
    if (this.screenFlash) {
      this.screenFlash.timer -= dt;
      if (this.screenFlash.timer <= 0) this.screenFlash = null;
    }
    if (this.hitStopTimer > 0) {
      this.hitStopTimer = Math.max(0, this.hitStopTimer - dt);
      return;
    }

    const motionScale = this.reducedMotion ? 0.25 : this.animationSpeed;
    this.cameraX += (this.targetCameraX - this.cameraX) * Math.min(1, 5 * dt * motionScale);
    for (const p of this.weatherParticles) {
      p.y += p.speedY * dt * motionScale;
      p.x += p.speedX * dt * motionScale;
      p.phase += dt;
      if (p.y > this.height + 20) {
        p.y = -20;
        p.x = Math.random() * (this.width + 200);
      }
      if (p.x < -100) p.x = this.width + 100;
      if (p.x > this.width + 100) p.x = -100;
    }

    if (this.weather === 'storm') {
      if (this.lightningState?.active) {
        this.lightningState.timer -= dt * motionScale;
        if (this.lightningState.timer <= 0) {
          this.lightningState.active = false;
        }
      } else {
        this.lightningCooldown = (this.lightningCooldown ?? (10 + Math.random() * 20)) - (dt * motionScale);
        if (this.lightningCooldown <= 0) {
          this.triggerLightning();
          this.lightningCooldown = 10 + Math.random() * 20;
        }
      }
    }
    // Sky transition blending
    // Ease the sky dial towards its target, then normalise the wraparound.
    if (this.dayPhase !== this.targetDayPhase) {
      const step = PHASE_SPEED * dt * motionScale;
      const remaining = this.targetDayPhase - this.dayPhase;
      this.dayPhase = Math.abs(remaining) <= step ? this.targetDayPhase : this.dayPhase + Math.sign(remaining) * step;
      if (this.dayPhase >= 1) {
        this.dayPhase -= 1;
        this.targetDayPhase -= 1;
      }
    }
    this.globalAnimTime += dt * motionScale;
    this.particles.update(dt * motionScale);
  }

  render(gameState, animTime) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    const groundY = this.groundY;

    this.drawSky(ctx);
    this.drawBackground(ctx);
    this.drawMidground(ctx, groundY);

    // Everything from here on rides the shake offset so the scenery, actors
    // and effects stay locked together during an impact.
    const shakeX = this.shakeAmount > 0.05 ? Math.sin(this.shakeSeed * 1.7) * this.shakeAmount : 0;
    const shakeY = this.shakeAmount > 0.05 ? Math.cos(this.shakeSeed * 2.3) * this.shakeAmount * 0.6 : 0;
    ctx.save();
    if (shakeX || shakeY) ctx.translate(shakeX, shakeY);

    if (gameState.isBoss && gameState.currentEnemy) {
      this.drawArenaLight(ctx, groundY, gameState);
    }

    this.particles.draw(ctx, 'back');

    if (gameState.hero) {
      this.sprites.drawHero(ctx, gameState.heroX || this.width * 0.23, groundY,
        gameState.hero, gameState.heroState || 'idle', animTime);
    }
    if (gameState.currentEnemy) {
      this.drawCombatant(ctx, groundY, gameState.currentEnemy, gameState.enemyX,
        gameState.isBoss, gameState.enemyState || 'idle', animTime, gameState);
    }
    if (gameState.dying?.enemy) {
      this.drawCombatant(ctx, groundY, gameState.dying.enemy, gameState.dying.x,
        gameState.dying.isBoss, 'die', animTime, gameState);
    }

    this.particles.draw(ctx, 'front');
    ctx.restore();

    this.drawWeatherOverlay(ctx);
    this.drawCombatOverlays(ctx, gameState);
  }

  /** Draws an enemy or a boss with the shared clamping and phase plumbing. */
  drawCombatant(ctx, groundY, enemy, rawX, isBoss, state, animTime, gameState) {
    const x = Math.min(this.width - 110, rawX || this.width * 0.72);
    if (isBoss) {
      this.sprites.drawBoss(ctx, x, groundY, enemy, gameState.bossPhase || 1, state, animTime, {
        invulnerable: !!gameState.bossInvulnerable,
        evolution: gameState.bossEvolution || null,
        heroHeight: this.sprites.heroTopOffset(gameState.hero),
        groundY,
      });
    } else {
      this.sprites.drawEnemy(ctx, x, groundY, enemy, state, animTime);
    }
  }

  /** Darkens the arena edges and pools accent light around a boss. */
  drawArenaLight(ctx, groundY, gameState) {
    const enemyX = Math.min(this.width - 110, gameState.enemyX || this.width * 0.72);
    const pulse = 0.5 + 0.5 * Math.sin(this.globalAnimTime * 1.6);
    const accent = gameState.currentEnemy?.color || '#a855f7';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.1 + pulse * 0.06 + (gameState.bossPhase || 1) * 0.03;
    const grad = ctx.createRadialGradient(enemyX, groundY - 60, 20, enemyX, groundY - 60, this.width * 0.42);
    grad.addColorStop(0, accent);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }

  /** Post effects: impact flash plus a danger vignette when hearts run low. */
  drawCombatOverlays(ctx, gameState) {
    const danger = Math.max(0, Math.min(1, Number(gameState.heroDanger) || 0));
    if (danger > 0) {
      const pulse = 0.65 + 0.35 * Math.sin(this.globalAnimTime * 4.2);
      const grad = ctx.createRadialGradient(
        this.width / 2, this.height / 2, this.height * 0.28,
        this.width / 2, this.height / 2, this.height * 0.78,
      );
      grad.addColorStop(0, 'rgba(120,0,0,0)');
      grad.addColorStop(1, `rgba(150,10,10,${(0.2 + danger * 0.3) * pulse})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    if (!this.screenFlash) return;
    const flash = this.screenFlash;
    const progress = Math.max(0, flash.timer / flash.duration);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = flash.strength * progress * progress;
    ctx.fillStyle = flash.color;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }

  /**
   * Sky, celestial bodies and stars, all driven by the continuous day phase.
   * The sun rides an arc from the eastern horizon to the western one, then the
   * moon takes over the same arc half a dial later.
   */
  drawSky(ctx) {
    const phase = this.dayPhase;
    const dark = this.darkness;
    const horizonY = this.height * 0.68;
    const t = this.globalAnimTime;

    // ── Gradient ──
    const { a, b, t: keyT } = sampleTrack(SKY_KEYS, phase);
    const dayTop = this.regionColors.skyColor || '#87ceeb';
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, mixHex(a.top, b.top, keyT, dayTop));
    grad.addColorStop(0.45, mixHex(a.mid, b.mid, keyT, dayTop));
    grad.addColorStop(1, mixHex(a.bottom, b.bottom, keyT, dayTop));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // ── Stars, fading in with the darkness ──
    if (dark > 0.08) {
      const starAlpha = Math.min(1, (dark - 0.08) / 0.5);
      for (let i = 0; i < 90; i++) {
        const sx = (i * 83 + 17) % this.width;
        const sy = (i * 47 + 9) % (this.height * 0.55);
        const baseR = 0.6 + ((i * 7) % 4) * 0.4;
        const twinkle = 0.5 + 0.5 * Math.sin(t * (1.2 + (i % 5) * 0.4) + i * 1.7);
        const r = baseR * (0.7 + twinkle * 0.5);
        ctx.globalAlpha = starAlpha * twinkle * 0.9;
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 4);
        glow.addColorStop(0, 'rgba(255,255,255,0.8)');
        glow.addColorStop(0.4, 'rgba(200,220,255,0.2)');
        glow.addColorStop(1, 'rgba(200,220,255,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(sx - r * 4, sy - r * 4, r * 8, r * 8);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ── Celestial bodies ──
    // Each body is visible for the half of the dial it spends above ground.
    this.drawCelestial(ctx, phase, horizonY, 'sun');
    this.drawCelestial(ctx, (phase + 0.5) % 1, horizonY, 'moon');

    // ── Horizon warmth around sunrise and sunset ──
    const nearHorizon = Math.max(
      1 - Math.abs(((phase % 1) + 1) % 1) / 0.12,
      1 - Math.abs((((phase % 1) + 1) % 1) - 0.5) / 0.12,
      1 - Math.abs((((phase % 1) + 1) % 1) - 1) / 0.12,
    );
    if (nearHorizon > 0) {
      const warm = ctx.createLinearGradient(0, horizonY - 110, 0, horizonY + 60);
      warm.addColorStop(0, 'rgba(255,120,40,0)');
      warm.addColorStop(0.5, `rgba(255,140,60,${0.26 * nearHorizon})`);
      warm.addColorStop(1, 'rgba(255,90,30,0)');
      ctx.fillStyle = warm;
      ctx.fillRect(0, horizonY - 110, this.width, 170);
    }

    // ── Night ambience ──
    if (dark > 0.25) {
      ctx.fillStyle = `rgba(5,10,30,${(dark - 0.25) * 0.26})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  /**
   * Draws the sun or the moon at its place on the arc. `bodyPhase` is 0 at
   * that body's rise, 0.25 at its zenith and 0.5 at its set; outside 0..0.5 it
   * is below the horizon and nothing is drawn.
   */
  drawCelestial(ctx, bodyPhase, horizonY, kind) {
    const p = ((bodyPhase % 1) + 1) % 1;
    if (p > 0.52) return;

    // Ride the arc, dipping slightly below the horizon at each end so the
    // body genuinely rises and sets rather than popping in.
    const travel = p / 0.5;
    const x = this.width * (0.06 + 0.88 * travel);
    const arcHeight = this.height * 0.56;
    const y = horizonY - Math.sin(travel * Math.PI) * arcHeight + 26;
    // Fade out the last sliver as it crosses the horizon line.
    const edge = Math.min(1, Math.min(travel, 1 - travel) / 0.06);
    if (edge <= 0) return;

    const isSun = kind === 'sun';
    // Low sun reddens; high sun is white-hot.
    const altitude = Math.sin(travel * Math.PI);
    const radius = isSun ? 30 + (1 - altitude) * 10 : 25;
    const t = this.globalAnimTime;

    ctx.save();
    ctx.globalAlpha = edge;

    if (isSun) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 0.08);
      const rays = 12;
      for (let i = 0; i < rays; i++) {
        const angle = (i / rays) * Math.PI * 2;
        const pulse = 0.8 + 0.2 * Math.sin(t * 2 + i * 0.9);
        const len = radius * (1.6 + pulse * 0.6);
        ctx.strokeStyle = `rgba(255,${Math.round(170 + altitude * 70)},${Math.round(60 + altitude * 90)},${0.14 * pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * radius * 0.9, Math.sin(angle) * radius * 0.9);
        ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
        ctx.stroke();
      }
      ctx.restore();

      const halo = ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius * 3.2);
      halo.addColorStop(0, `rgba(255,${Math.round(190 + altitude * 60)},110,0.4)`);
      halo.addColorStop(0.5, 'rgba(255,150,60,0.09)');
      halo.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(x - radius * 3.2, y - radius * 3.2, radius * 6.4, radius * 6.4);

      const body = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, radius);
      body.addColorStop(0, '#fffef0');
      body.addColorStop(0.6, altitude > 0.5 ? '#ffe680' : '#ff9f43');
      body.addColorStop(1, altitude > 0.5 ? '#ffd042' : '#e55039');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const halo = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 3.5);
      halo.addColorStop(0, 'rgba(255,248,220,0.26)');
      halo.addColorStop(0.5, 'rgba(200,210,255,0.08)');
      halo.addColorStop(1, 'rgba(200,210,255,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(x - radius * 4, y - radius * 4, radius * 8, radius * 8);

      const body = ctx.createRadialGradient(x - 6, y - 6, 2, x, y, radius);
      body.addColorStop(0, '#fffde8');
      body.addColorStop(0.7, '#e8e0c0');
      body.addColorStop(1, '#c8bfa0');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(180,170,140,0.35)';
      for (const [cx, cy, cr] of [[-8, -5, 5], [7, 4, 3.5], [-2, 9, 4], [12, -8, 2.5]]) {
        ctx.beginPath();
        ctx.arc(x + cx, y + cy, cr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawBackground(ctx) {
    const img = this.assetManager.getBackground(this.currentBgTheme);
    if (!(img?.complete && img.naturalWidth > 0)) return;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.drawImage(img, 0, 0, this.width, this.height);
    ctx.restore();

    // Grade the whole backdrop towards the current light. A flat rectangle is
    // enough here because the background covers the full frame.
    const light = this.worldLight;
    if (light.strength > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = light.strength * 0.8;
      ctx.fillStyle = `rgb(${light.color[0]},${light.color[1]},${light.color[2]})`;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }
  }

  /**
   * Tinted copy of a decor sprite. Multiplying a rectangle over the tiles
   * would darken the gaps between them too, so the tint is baked into the
   * artwork's own alpha in an offscreen buffer and cached per light step.
   */
  _litDecor(img, color, strength) {
    // Quantise the light so the cache holds a handful of steps, not a frame's worth.
    const step = Math.round(strength * 12);
    const key = `${this.currentBgTheme}|${step}`;
    const cached = this._decorCache.get(key);
    if (cached) return cached;
    if (typeof document === 'undefined') return img;
    if (this._decorCache.size > 16) this._decorCache.clear();

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${(step / 12) * 0.85})`;
    g.fillRect(0, 0, w, h);

    this._decorCache.set(key, canvas);
    return canvas;
  }

  drawMidground(ctx, groundY) {
    const img = this.assetManager.getBackgroundDecor(this.currentBgTheme);
    if (!(img?.complete && img.naturalWidth > 0 && img.naturalHeight > 0)) return;

    const light = this.worldLight;
    const source = light.strength > 0.02
      ? this._litDecor(img, light.color, light.strength)
      : img;

    ctx.save();
    const aspect = img.naturalWidth / img.naturalHeight;
    const drawHeight = Math.round(img.naturalHeight * 1.1);
    const drawWidth = Math.round(drawHeight * aspect);
    const stepX = Math.round(drawWidth * 0.82);
    const drawY = groundY - 8 - drawHeight;
    const parallax = Math.floor(this.cameraX * 0.48) % stepX;

    for (let x = -parallax - drawWidth; x < this.width + drawWidth; x += stepX) {
      ctx.drawImage(source, Math.floor(x), drawY, drawWidth, drawHeight);
    }
    ctx.restore();
  }

  drawWeatherOverlay(ctx) {
    if (this.weather === 'none') return;
    ctx.save();
    const groundY = this.groundY;
    const particles = this.reducedMotion ? this.weatherParticles.slice(0, 30) : this.weatherParticles;

    if (this.weather === 'rain' || this.weather === 'storm') {
      const isStorm = this.weather === 'storm';

      // 1. Heavy slanted raindrops
      for (const p of particles) {
        ctx.strokeStyle = isStorm ? `rgba(200,235,255,${p.alpha || 0.6})` : `rgba(180,225,255,${(p.alpha || 0.6) * 0.75})`;
        ctx.lineWidth = p.thickness || 1.2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + ((p.speedX || -80) * 0.08), p.y + (p.length || 20));
        ctx.stroke();

        // Ground rain splashes
        if (p.y > groundY - 8 && p.y < groundY + 12 && Math.random() < 0.3) {
          ctx.strokeStyle = 'rgba(215,240,255,0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(p.x, groundY + 4, 4, 1.5, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 2. Realistic forked lightning bolt & ambient strobe flash
      if (isStorm && this.lightningState?.active && this.lightningState.bolt) {
        const progress = Math.max(0, this.lightningState.timer / this.lightningState.duration);
        const strobe = Math.sin(progress * Math.PI * 6) > 0 ? 1 : 0.4;
        const flashAlpha = Math.min(0.55, progress * strobe * 0.65);

        // Sky atmosphere flash
        ctx.fillStyle = `rgba(225, 240, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, this.width, this.height);

        // Glowing Lightning Bolt
        const bolt = this.lightningState.bolt;
        if (bolt.length > 1) {
          ctx.save();
          // Outer electric cyan/blue glow
          ctx.strokeStyle = 'rgba(165, 215, 255, 0.95)';
          ctx.lineWidth = 7;
          ctx.shadowColor = '#93c5fd';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.moveTo(bolt[0].x, bolt[0].y);
          for (let i = 1; i < bolt.length; i++) ctx.lineTo(bolt[i].x, bolt[i].y);
          ctx.stroke();

          // Intense core white bolt
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.moveTo(bolt[0].x, bolt[0].y);
          for (let i = 1; i < bolt.length; i++) ctx.lineTo(bolt[i].x, bolt[i].y);
          ctx.stroke();

          // Fork branches
          for (const branch of this.lightningState.branches || []) {
            ctx.strokeStyle = 'rgba(180, 225, 255, 0.85)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(branch[0].x, branch[0].y);
            for (let i = 1; i < branch.length; i++) ctx.lineTo(branch[i].x, branch[i].y);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    } else if (this.weather === 'snow') {
      const t = this.globalAnimTime;
      const snowImg = this.assetManager.getSnowSprite();
      // Ground snow accumulation
      const snowGrad = ctx.createLinearGradient(0, groundY - 6, 0, groundY + 14);
      snowGrad.addColorStop(0, 'rgba(255,255,255,0)');
      snowGrad.addColorStop(0.3, 'rgba(240,248,255,0.2)');
      snowGrad.addColorStop(1, 'rgba(230,240,255,0.35)');
      ctx.fillStyle = snowGrad;
      ctx.fillRect(0, groundY - 6, this.width, 20);
      // Multi-layer snowflakes
      for (let layer = 0; layer < 3; layer++) {
        const layerParticles = layer === 0 ? particles.slice(0, 35) : layer === 1 ? particles.slice(35, 75) : particles.slice(75);
        const layerAlpha = layer === 0 ? 0.3 : layer === 1 ? 0.6 : 0.9;
        const layerSize = layer === 0 ? 0.6 : layer === 1 ? 1.0 : 1.4;
        for (const p of layerParticles) {
          const drift = Math.sin(p.phase + t * (0.8 + layer * 0.3)) * (6 + layer * 4);
          const flicker = 0.7 + 0.3 * Math.sin(t * 2 + p.phase * 3);
          const sx = p.x + drift;
          const sy = p.y;
          const sz = (p.size + 0.5) * layerSize;
          // Snowflake glow
          ctx.globalAlpha = layerAlpha * flicker * 0.3;
          const snowGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, sz * 3);
          snowGlow.addColorStop(0, 'rgba(200,220,255,0.5)');
          snowGlow.addColorStop(1, 'rgba(200,220,255,0)');
          ctx.fillStyle = snowGlow;
          ctx.fillRect(sx - sz * 3, sy - sz * 3, sz * 6, sz * 6);
          // Snowflake body — use snow.png if available
          ctx.globalAlpha = layerAlpha * flicker;
          if (snowImg?.complete && snowImg.naturalWidth > 0) {
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(p.phase + t * 0.3 * (layer + 1));
            const imgSz = sz * 4;
            ctx.drawImage(snowImg, -imgSz / 2, -imgSz / 2, imgSz, imgSz);
            ctx.restore();
          } else {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(sx, sy, sz, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.globalAlpha = 1;
    } else if (this.weather === 'ash') {
      const t = this.globalAnimTime;
      // Heat haze overlay
      ctx.fillStyle = 'rgba(60,20,10,0.06)';
      ctx.fillRect(0, 0, this.width, this.height);
      for (const p of particles) {
        const drift = Math.sin(p.phase + t * 0.6) * 12;
        const rise = Math.sin(t * 0.8 + p.phase * 2) * 3;
        const sx = p.x + drift;
        const sy = p.y + rise;
        const sz = p.size * 1.1;
        const ember = Math.sin(t * 3 + p.phase * 5) * 0.5 + 0.5;
        // Ember glow (some particles glow like hot cinders)
        if (ember > 0.6) {
          ctx.globalAlpha = (ember - 0.6) * 1.5;
          const emberGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sz * 4);
          emberGrad.addColorStop(0, 'rgba(255,100,20,0.5)');
          emberGrad.addColorStop(0.5, 'rgba(255,60,10,0.15)');
          emberGrad.addColorStop(1, 'rgba(255,40,0,0)');
          ctx.fillStyle = emberGrad;
          ctx.fillRect(sx - sz * 4, sy - sz * 4, sz * 8, sz * 8);
        }
        // Ash particle
        ctx.globalAlpha = 0.35 + ember * 0.2;
        ctx.fillStyle = ember > 0.6 ? `rgba(255,${80 + Math.floor(ember * 80)},30,0.7)` : 'rgba(90,45,30,0.45)';
        ctx.beginPath();
        ctx.ellipse(sx, sy, sz * 1.2, sz * 0.7, p.phase, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (this.weather === 'sand') {
      const t = this.globalAnimTime;
      // Sand haze overlay
      const hazeGrad = ctx.createLinearGradient(0, 0, 0, this.height);
      hazeGrad.addColorStop(0, 'rgba(210,170,90,0.04)');
      hazeGrad.addColorStop(0.6, 'rgba(210,170,90,0.12)');
      hazeGrad.addColorStop(1, 'rgba(180,140,70,0.18)');
      ctx.fillStyle = hazeGrad;
      ctx.fillRect(0, 0, this.width, this.height);
      for (const p of particles) {
        const drift = Math.sin(p.phase + t * 0.5) * 8;
        const sx = p.x + drift;
        const sy = p.y;
        const sz = p.size;
        // Sand grain with motion trail
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = 'rgba(220,180,100,0.3)';
        ctx.lineWidth = sz * 0.6;
        ctx.beginPath();
        ctx.moveTo(sx - 8, sy);
        ctx.lineTo(sx, sy);
        ctx.stroke();
        // Sand particle
        ctx.globalAlpha = 0.38;
        ctx.fillStyle = 'rgba(231,183,104,0.5)';
        ctx.beginPath();
        ctx.arc(sx, sy, sz, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (this.weather === 'petals') {
      const t = this.globalAnimTime;
      for (const p of particles.slice(0, 45)) {
        const drift = Math.sin(p.phase + t * 0.7) * 15;
        const vertDrift = Math.cos(p.phase * 0.7 + t * 0.4) * 5;
        const sx = p.x + drift;
        const sy = p.y + vertDrift;
        const sz = (p.size + 1.5) * 1.2;
        const rotation = p.phase + t * (0.5 + (p.size % 2) * 0.3);
        // Petal glow
        ctx.globalAlpha = 0.2;
        const petalGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, sz * 3);
        petalGlow.addColorStop(0, 'rgba(255,182,193,0.4)');
        petalGlow.addColorStop(1, 'rgba(255,182,193,0)');
        ctx.fillStyle = petalGlow;
        ctx.fillRect(sx - sz * 3, sy - sz * 3, sz * 6, sz * 6);
        // Petal shape (rotated ellipse)
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(rotation);
        ctx.globalAlpha = 0.65 + 0.2 * Math.sin(t + p.phase);
        const petalGrad = ctx.createRadialGradient(-1, -1, 0, 0, 0, sz);
        petalGrad.addColorStop(0, 'rgba(255,200,210,0.9)');
        petalGrad.addColorStop(0.6, 'rgba(255,160,180,0.7)');
        petalGrad.addColorStop(1, 'rgba(255,130,160,0.4)');
        ctx.fillStyle = petalGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, sz * 1.3, sz * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    } else if (this.weather === 'fireflies') {
      const t = this.globalAnimTime;
      for (const p of particles.slice(0, 40)) {
        const drift = Math.sin(p.phase + t * 0.6) * 18;
        const vertDrift = Math.cos(p.phase * 1.3 + t * 0.4) * 12;
        const sx = p.x + drift;
        const sy = p.y + vertDrift;
        const pulse = 0.4 + 0.6 * Math.pow(Math.sin(t * (1.5 + (p.size % 3) * 0.5) + p.phase * 2), 2);
        const sz = (p.size + 1) * pulse;
        // Outer glow
        ctx.globalAlpha = pulse * 0.5;
        const outerGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, sz * 8);
        outerGlow.addColorStop(0, 'rgba(253,224,71,0.4)');
        outerGlow.addColorStop(0.3, 'rgba(250,200,50,0.15)');
        outerGlow.addColorStop(1, 'rgba(250,200,50,0)');
        ctx.fillStyle = outerGlow;
        ctx.fillRect(sx - sz * 8, sy - sz * 8, sz * 16, sz * 16);
        // Inner glow
        ctx.globalAlpha = pulse * 0.7;
        const innerGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, sz * 3);
        innerGlow.addColorStop(0, 'rgba(255,255,200,0.9)');
        innerGlow.addColorStop(0.5, 'rgba(253,224,71,0.5)');
        innerGlow.addColorStop(1, 'rgba(253,200,50,0)');
        ctx.fillStyle = innerGlow;
        ctx.fillRect(sx - sz * 3, sy - sz * 3, sz * 6, sz * 6);
        // Core
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#fffde0';
        ctx.beginPath();
        ctx.arc(sx, sy, sz * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (this.weather === 'mist') {
      const t = this.globalAnimTime;
      // Fog belongs to the distance. It thins out over the band where the
      // fighters stand, so it never washes them out.
      // The haze stops short of the combat line entirely.
      const hazeFloor = groundY - 230;
      const haze = ctx.createLinearGradient(0, this.height * 0.18, 0, hazeFloor);
      haze.addColorStop(0, 'rgba(203,213,225,0)');
      haze.addColorStop(0.5, 'rgba(203,213,225,0.06)');
      haze.addColorStop(1, 'rgba(226,232,240,0)');
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, this.width, hazeFloor);

      // Two slow banks, kept well above the combat line.
      const bands = this.reducedMotion ? 1 : 2;
      for (let band = 0; band < bands; band++) {
        const speed = 10 + band * 7;
        const bandY = groundY - 330 + band * 52;
        const height = 46 + band * 12;
        const offset = ((t * speed) % (this.width + 420)) - 210;
        ctx.globalAlpha = 0.05 + band * 0.02;
        for (let i = -1; i < 3; i++) {
          const cx = offset + i * (this.width * 0.55 + 180);
          const wobble = Math.sin(t * 0.4 + band * 1.7 + i) * 12;
          const grad = ctx.createRadialGradient(cx, bandY + wobble, 10, cx, bandY + wobble, this.width * 0.34);
          grad.addColorStop(0, 'rgba(241,245,249,0.6)');
          grad.addColorStop(0.5, 'rgba(226,232,240,0.22)');
          grad.addColorStop(1, 'rgba(226,232,240,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(cx, bandY + wobble, this.width * 0.34, height, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    } else if (this.weather === 'ghosts') {
      const t = this.globalAnimTime;
      // Barely-there haze — the citadel should feel haunted, not fogged in.
      ctx.globalAlpha = 0.03 + 0.015 * Math.sin(t * 0.3);
      ctx.fillStyle = 'rgba(150,140,220,0.15)';
      ctx.fillRect(0, 0, this.width, this.height);

      // Wisps drift in the upper air and fade as they near the fighters.
      const combatTop = groundY - 220;
      for (const p of particles.slice(0, 22)) {
        const drift = Math.sin(p.phase + t * 0.35) * 20;
        const vertFloat = Math.sin(p.phase * 0.8 + t * 0.5) * 15;
        const sx = p.x + drift;
        const sy = (p.y % Math.max(1, combatTop)) + vertFloat;
        // Fade to nothing across the last stretch above the combat line.
        const clearance = Math.min(1, Math.max(0, (combatTop - sy) / 120));
        if (clearance <= 0.02) continue;
        const pulse = 0.3 + 0.7 * Math.pow(Math.sin(t * (0.6 + (p.size % 3) * 0.2) + p.phase), 2);
        const sz = (p.size + 1) * 1.1;

        ctx.globalAlpha = pulse * 0.16 * clearance;
        const aura = ctx.createRadialGradient(sx, sy, 0, sx, sy, sz * 4);
        aura.addColorStop(0, 'rgba(196,181,253,0.3)');
        aura.addColorStop(0.4, 'rgba(160,150,220,0.1)');
        aura.addColorStop(1, 'rgba(160,150,220,0)');
        ctx.fillStyle = aura;
        ctx.fillRect(sx - sz * 4, sy - sz * 4, sz * 8, sz * 8);

        ctx.globalAlpha = pulse * 0.3 * clearance;
        const wispGrad = ctx.createRadialGradient(sx, sy - sz * 0.3, sz * 0.2, sx, sy, sz * 1.8);
        wispGrad.addColorStop(0, 'rgba(220,210,255,0.7)');
        wispGrad.addColorStop(0.5, 'rgba(180,170,240,0.3)');
        wispGrad.addColorStop(1, 'rgba(160,150,220,0)');
        ctx.fillStyle = wispGrad;
        ctx.beginPath();
        ctx.ellipse(sx, sy, sz * 1.2, sz * 1.6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = pulse * 0.42 * clearance;
        ctx.fillStyle = 'rgba(230,225,255,0.5)';
        ctx.beginPath();
        ctx.arc(sx, sy - sz * 0.2, sz * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}
