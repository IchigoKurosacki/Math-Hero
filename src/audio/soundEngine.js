// ============================================================================
// Math Hero RPG — Professional Web Audio Sound & Music Engine v2
// ----------------------------------------------------------------------------
// Drop-in replacement for the original SoundEngine. Same public API, plus a
// large set of new SFX methods for heroes, enemies and bosses.
//
// Highlights:
//  • Proper audio graph: SFX bus + BGM bus → master compressor → destination
//  • Algorithmic reverb (generated impulse response) + tempo-synced delay
//  • Sample-accurate lookahead scheduler (no setTimeout jitter per note)
//  • 9 unique region themes: distinct scale, chord progression, tempo,
//    lead instrument, pad, bass style and drum pattern per region
//  • Per-level seeded melody variation inside each region's identity
//  • 4-phase escalating boss music with per-boss motifs & rising intensity
//  • Cinematic main-menu theme (heroic chords + arpeggio + lead melody)
//  • Smooth crossfades between any two music tracks
//  • Layered, punchy combat SFX: sword / magic / arrow / heavy attacks,
//    enemy hits, boss roars, explosions, shields, heals, level-ups, coins…
// ============================================================================

// ---------------------------------------------------------------------------
// Utility: deterministic seeded RNG (mulberry32)
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// Musical helpers
// ---------------------------------------------------------------------------
const NOTE_A4 = 440;
// midi -> frequency
function mtof(midi) {
  return NOTE_A4 * Math.pow(2, (midi - 69) / 12);
}

// Scales as semitone offsets from root
const SCALES = {
  majorPent: [0, 2, 4, 7, 9],
  minorPent: [0, 3, 5, 7, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  phrygianDominant: [0, 1, 4, 5, 7, 8, 10],
  wholeTone: [0, 2, 4, 6, 8, 10],
  hirajoshi: [0, 2, 3, 7, 8],
  locrian: [0, 1, 3, 5, 6, 8, 10],
};

// ---------------------------------------------------------------------------
// REGION MUSIC IDENTITIES
// Each region gets its own key, mode, tempo, instrumentation and groove.
// ---------------------------------------------------------------------------
const REGION_THEMES = {
  1: { // Sunny Meadows — bright, pastoral, playful
    name: 'meadows',
    root: 60, scale: SCALES.majorPent, bpm: 104,
    chords: [[0, 4, 7], [-3, 0, 4], [-5, -1, 2], [-7, -3, 0]], // I vi IV V feel
    lead: 'flute', pad: 'warm', bassStyle: 'walk', drums: 'soft',
    arp: true, swing: 0.12, reverb: 0.28, brightness: 3200,
  },
  2: { // Whispering Forest — mysterious, wooden, dorian
    name: 'forest',
    root: 57, scale: SCALES.dorian, bpm: 92,
    chords: [[0, 3, 7], [-2, 2, 5], [3, 7, 10], [-4, 0, 3]],
    lead: 'marimba', pad: 'dark', bassStyle: 'pulse', drums: 'tribal',
    arp: true, swing: 0.2, reverb: 0.4, brightness: 2200,
  },
  3: { // Honey Cliffs — floaty, golden, lydian
    name: 'honey_cliffs',
    root: 62, scale: SCALES.lydian, bpm: 112,
    chords: [[0, 4, 7], [2, 6, 9], [-1, 4, 7], [-3, 0, 4]],
    lead: 'pluck', pad: 'warm', bassStyle: 'bounce', drums: 'soft',
    arp: true, swing: 0.08, reverb: 0.32, brightness: 3600,
  },
  4: { // Scorching Desert — exotic, phrygian dominant
    name: 'desert',
    root: 59, scale: SCALES.phrygianDominant, bpm: 96,
    chords: [[0, 4, 7], [1, 5, 8], [-2, 1, 5], [0, 4, 7]],
    lead: 'oud', pad: 'drone', bassStyle: 'pulse', drums: 'tribal',
    arp: false, swing: 0.16, reverb: 0.35, brightness: 2600,
  },
  5: { // Molten Volcano — heavy, menacing, low
    name: 'volcano',
    root: 50, scale: SCALES.harmonicMinor, bpm: 128,
    chords: [[0, 3, 7], [-1, 3, 6], [1, 4, 8], [0, 3, 7]],
    lead: 'lead_saw', pad: 'dark', bassStyle: 'drive', drums: 'heavy',
    arp: false, swing: 0, reverb: 0.22, brightness: 2000,
  },
  6: { // Frozen Peaks — crystalline bells, airy
    name: 'ice',
    root: 61, scale: SCALES.hirajoshi, bpm: 84,
    chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 7], [-5, -2, 2]],
    lead: 'bell', pad: 'glass', bassStyle: 'slow', drums: 'sparse',
    arp: true, swing: 0, reverb: 0.55, brightness: 4200,
  },
  7: { // Storm Plateau — driving, energetic minor
    name: 'storm',
    root: 55, scale: SCALES.naturalMinor, bpm: 138,
    chords: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -1, 2]],
    lead: 'lead_square', pad: 'dark', bassStyle: 'drive', drums: 'driving',
    arp: true, swing: 0, reverb: 0.2, brightness: 3000,
  },
  8: { // Ghost Hollow — haunting, sparse, chromatic shivers
    name: 'ghost',
    root: 54, scale: SCALES.phrygian, bpm: 76,
    chords: [[0, 3, 6], [-1, 2, 6], [0, 3, 7], [-2, 1, 4]],
    lead: 'theremin', pad: 'ghost', bassStyle: 'slow', drums: 'sparse',
    arp: false, swing: 0.25, reverb: 0.65, brightness: 1800,
  },
  9: { // The Rift — unstable whole-tone otherworld
    name: 'rift',
    root: 51, scale: SCALES.wholeTone, bpm: 120,
    chords: [[0, 4, 8], [2, 6, 10], [-2, 2, 6], [0, 4, 8]],
    lead: 'fm_glitch', pad: 'glass', bassStyle: 'pulse', drums: 'glitch',
    arp: true, swing: 0, reverb: 0.45, brightness: 3400,
  },
};

// Map legacy string theme names → region ids
const THEME_NAME_TO_REGION = {
  meadows: 1, forest: 2, honey_cliffs: 3, desert: 4, volcano: 5,
  ice: 6, storm: 7, ghost: 8, rift: 9,
};

// ---------------------------------------------------------------------------
// BOSS MUSIC IDENTITIES — each boss has its own key/motif; phases escalate.
// ---------------------------------------------------------------------------
const BOSS_THEMES = {
  boss_1: { root: 48, scale: SCALES.naturalMinor, lead: 'lead_saw', motif: [0, 0, 3, 5, 0, 0, 7, 5] },
  boss_2: { root: 45, scale: SCALES.dorian, lead: 'lead_square', motif: [0, 2, 3, 2, 0, 5, 3, 2] },
  boss_3: { root: 50, scale: SCALES.phrygian, lead: 'oud', motif: [0, 1, 0, 5, 3, 1, 0, 1] },
  boss_4: { root: 47, scale: SCALES.harmonicMinor, lead: 'lead_saw', motif: [0, 3, 5, 3, 7, 5, 3, 0] },
  boss_5: { root: 44, scale: SCALES.phrygianDominant, lead: 'lead_saw', motif: [0, 1, 4, 1, 0, 4, 5, 4] },
  boss_6: { root: 49, scale: SCALES.hirajoshi, lead: 'bell', motif: [0, 3, 4, 3, 0, 4, 7, 4] },
  boss_7: { root: 43, scale: SCALES.naturalMinor, lead: 'lead_square', motif: [0, 0, 5, 0, 3, 0, 7, 5] },
  boss_8: { root: 42, scale: SCALES.locrian, lead: 'theremin', motif: [0, 1, 3, 1, 6, 3, 1, 0] },
  boss_secret: { root: 40, scale: SCALES.wholeTone, lead: 'fm_glitch', motif: [0, 4, 2, 6, 0, 8, 6, 4] },
};

// ---------------------------------------------------------------------------
// THE ENGINE
// ---------------------------------------------------------------------------
export class SoundEngine {
  constructor(saveSystem) {
    this.saveSystem = saveSystem;
    this.ctx = null;

    // Buses
    this.masterGain = null;
    this.compressor = null;
    this.sfxBus = null;
    this.bgmBus = null;
    this.reverbNode = null;
    this.reverbGain = null;
    this.delayNode = null;
    this.delayGain = null;
    this.delayFeedback = null;

    // Music scheduler state
    this.isPlayingBgm = false;
    this._bgmPaused = false;
    this.currentBgmKey = null;
    this.currentTrackData = null;
    this._schedulerTimer = null;
    this._nextStepTime = 0;
    this._step = 0;
    this._lookahead = 0.15;   // seconds scheduled ahead
    this._tickMs = 40;        // scheduler tick
    this._trackGain = null;   // per-track gain for crossfades
    this._noiseBuffer = null;

    if (typeof window !== 'undefined') {
      window.soundEngine = this;
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pauseBgm();
          this.suspend();
        } else {
          this.resume();
          if (this.currentBgmKey && this._bgmPaused) {
            this.resumeBgm();
          }
        }
      });
    }
  }

  // =========================================================================
  // INIT / AUDIO GRAPH
  // =========================================================================
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this._buildGraph();
    }
    if (this.ctx.state === 'suspended' && !document.hidden) {
      try { this.ctx.resume(); } catch (_e) {}
    }
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') {
      try { this.ctx.suspend(); } catch (_e) {}
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended' && !document.hidden) {
      try { this.ctx.resume(); } catch (_e) {}
    }
  }

  _buildGraph() {
    const ctx = this.ctx;

    // Master chain: buses → compressor → master → destination
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.knee.value = 24;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.18;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.95;

    this.sfxBus = ctx.createGain();
    this.bgmBus = ctx.createGain();

    this.sfxBus.connect(this.compressor);
    this.bgmBus.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);

    // Algorithmic reverb (generated exponential-decay impulse)
    this.reverbNode = ctx.createConvolver();
    this.reverbNode.buffer = this._makeImpulse(2.4, 2.6);
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.value = 0.3;
    this.reverbNode.connect(this.reverbGain);
    this.reverbGain.connect(this.compressor);

    // Delay/echo send (used mostly by music leads)
    this.delayNode = ctx.createDelay(1.5);
    this.delayNode.delayTime.value = 0.28;
    this.delayFeedback = ctx.createGain();
    this.delayFeedback.gain.value = 0.3;
    this.delayGain = ctx.createGain();
    this.delayGain.gain.value = 0.22;
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.delayGain);
    this.delayGain.connect(this.compressor);

    // Shared noise buffer (2s of white noise)
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this._noiseBuffer = buf;
  }

  _makeImpulse(duration, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * duration);
    const impulse = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return impulse;
  }

  // =========================================================================
  // SETTINGS
  // =========================================================================
  isSfxMuted() { return this.saveSystem?.data?.settings?.sfxMuted; }
  isBgmMuted() { return this.saveSystem?.data?.settings?.bgmMuted; }
  getSfxVol() { return this.isSfxMuted() ? 0 : (this.saveSystem?.data?.settings?.sfxVolume ?? 1.0); }
  getBgmVol() { return this.isBgmMuted() ? 0 : (this.saveSystem?.data?.settings?.bgmVolume ?? 1.0); }

  // =========================================================================
  // LOW-LEVEL SYNTH HELPERS (all route into a given bus)
  // =========================================================================
  _env(gainNode, t, vol, attack, hold, release) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(Math.max(vol, 0.0001), t + attack);
    g.setValueAtTime(Math.max(vol, 0.0001), t + attack + hold);
    g.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  }

  _tone({ bus, freq, t, dur, type = 'sine', vol = 0.3, attack = 0.01, release = null,
          detune = 0, glideTo = null, filterFreq = null, filterQ = 1,
          reverbSend = 0, delaySend = 0, vibratoHz = 0, vibratoCents = 0 }) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (detune) osc.detune.setValueAtTime(detune, t);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(glideTo, 1), t + dur);

    if (vibratoHz > 0) {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(vibratoHz, t);
      lfoGain.gain.setValueAtTime((vibratoCents / 100) * freq * 0.06, t);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.1);
    }

    const rel = release ?? Math.max(dur * 0.5, 0.05);
    this._env(gain, t, vol, attack, Math.max(dur - attack - rel, 0.01), rel);

    let node = osc;
    if (filterFreq) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFreq, t);
      filter.Q.setValueAtTime(filterQ, t);
      osc.connect(filter);
      node = filter;
    }
    node.connect(gain);
    gain.connect(bus);

    if (reverbSend > 0) {
      const send = ctx.createGain();
      send.gain.value = reverbSend;
      gain.connect(send);
      send.connect(this.reverbNode);
    }
    if (delaySend > 0) {
      const send = ctx.createGain();
      send.gain.value = delaySend;
      gain.connect(send);
      send.connect(this.delayNode);
    }

    osc.start(t);
    osc.stop(t + dur + rel + 0.15);
    return osc;
  }

  // FM bell / metallic tone
  _fmTone({ bus, freq, t, dur, vol = 0.3, ratio = 3.01, index = 4, attack = 0.005,
            reverbSend = 0.3, delaySend = 0 }) {
    const ctx = this.ctx;
    const carrier = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const gain = ctx.createGain();

    carrier.frequency.setValueAtTime(freq, t);
    mod.frequency.setValueAtTime(freq * ratio, t);
    modGain.gain.setValueAtTime(freq * index, t);
    modGain.gain.exponentialRampToValueAtTime(freq * 0.1, t + dur);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);

    this._env(gain, t, vol, attack, 0.01, dur);
    carrier.connect(gain);
    gain.connect(bus);

    if (reverbSend > 0) {
      const send = ctx.createGain();
      send.gain.value = reverbSend;
      gain.connect(send);
      send.connect(this.reverbNode);
    }
    if (delaySend > 0) {
      const send = ctx.createGain();
      send.gain.value = delaySend;
      gain.connect(send);
      send.connect(this.delayNode);
    }

    carrier.start(t); mod.start(t);
    carrier.stop(t + dur + 0.3); mod.stop(t + dur + 0.3);
  }

  // Filtered noise burst (percussion / whooshes / impacts)
  _noise({ bus, t, dur, vol = 0.3, filterType = 'bandpass', filterFrom = 2000,
           filterTo = null, q = 1, attack = 0.002, reverbSend = 0 }) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFrom, t);
    if (filterTo) filter.frequency.exponentialRampToValueAtTime(Math.max(filterTo, 20), t + dur);
    filter.Q.setValueAtTime(q, t);

    const gain = ctx.createGain();
    this._env(gain, t, vol, attack, 0.005, Math.max(dur - attack, 0.02));

    src.connect(filter);
    filter.connect(gain);
    gain.connect(bus);

    if (reverbSend > 0) {
      const send = ctx.createGain();
      send.gain.value = reverbSend;
      gain.connect(send);
      send.connect(this.reverbNode);
    }

    src.start(t);
    src.stop(t + dur + 0.1);
  }

  // Sub-bass impact "thump"
  _thump({ bus, t, freq = 90, drop = 30, dur = 0.25, vol = 0.6 }) {
    this._tone({ bus, freq, t, dur, type: 'sine', vol, attack: 0.002, glideTo: drop, release: dur * 0.8 });
  }

  // =========================================================================
  // ======================  SFX — UI & MATH FEEDBACK  ======================
  // =========================================================================
  playCorrect() {
    this.init();
    if (this.isSfxMuted()) return;
    const t = this.ctx.currentTime, v = this.getSfxVol(), bus = this.sfxBus;
    // Sparkling ascending arpeggio + soft bell shimmer
    const notes = [72, 76, 79, 84]; // C E G C
    notes.forEach((m, i) => {
      const tt = t + i * 0.055;
      this._tone({ bus, freq: mtof(m), t: tt, dur: 0.34, type: 'triangle', vol: 0.4 * v, attack: 0.008, reverbSend: 0.35 });
      this._fmTone({ bus, freq: mtof(m + 12), t: tt + 0.01, dur: 0.4, vol: 0.1 * v, ratio: 4.0, index: 2.5, reverbSend: 0.4 });
    });
    this._noise({ bus, t: t + 0.18, dur: 0.3, vol: 0.05 * v, filterType: 'highpass', filterFrom: 8000, reverbSend: 0.5 });
  }

  playIncorrect() {
    this.init();
    if (this.isSfxMuted()) return;
    const t = this.ctx.currentTime, v = this.getSfxVol(), bus = this.sfxBus;
    // Muted descending "wah" — clear but not harsh
    this._tone({ bus, freq: 220, t, dur: 0.22, type: 'sawtooth', vol: 0.3 * v, glideTo: 130, filterFreq: 900, filterQ: 2 });
    this._tone({ bus, freq: 110, t: t + 0.14, dur: 0.3, type: 'sawtooth', vol: 0.32 * v, glideTo: 70, filterFreq: 600, filterQ: 2 });
    this._thump({ bus, t: t + 0.14, freq: 80, drop: 40, dur: 0.25, vol: 0.28 * v });
  }

  playClick() {
    this.init();
    if (this.isSfxMuted()) return;
    const t = this.ctx.currentTime, v = this.getSfxVol(), bus = this.sfxBus;
    this._tone({ bus, freq: 1400, t, dur: 0.035, type: 'sine', vol: 0.25 * v, glideTo: 700, attack: 0.001 });
    this._noise({ bus, t, dur: 0.03, vol: 0.08 * v, filterType: 'highpass', filterFrom: 5000 });
  }

  playHover() {
    this.init();
    if (this.isSfxMuted()) return;
    const t = this.ctx.currentTime, v = this.getSfxVol();
    this._tone({ bus: this.sfxBus, freq: 900, t, dur: 0.05, type: 'sine', vol: 0.08 * v, glideTo: 1100, attack: 0.005 });
  }

  playCoin() {
    this.init();
    if (this.isSfxMuted()) return;
    const t = this.ctx.currentTime, v = this.getSfxVol(), bus = this.sfxBus;
    this._fmTone({ bus, freq: 1244, t, dur: 0.12, vol: 0.22 * v, ratio: 2.4, index: 1.5 });
    this._fmTone({ bus, freq: 1661, t: t + 0.08, dur: 0.4, vol: 0.25 * v, ratio: 2.4, index: 1.5, reverbSend: 0.25 });
  }

  playLevelUp() {
    this.init();
    if (this.isSfxMuted()) return;
    const t = this.ctx.currentTime, v = this.getSfxVol(), bus = this.sfxBus;
    const run = [60, 64, 67, 72, 76, 79, 84];
    run.forEach((m, i) => {
      const tt = t + i * 0.07;
      this._tone({ bus, freq: mtof(m), t: tt, dur: 0.25, type: 'triangle', vol: 0.32 * v, reverbSend: 0.35, delaySend: 0.15 });
    });
    // Final chord
    [72, 76, 79, 84].forEach((m) => {
      this._tone({ bus, freq: mtof(m), t: t + run.length * 0.07, dur: 0.8, type: 'triangle', vol: 0.22 * v, reverbSend: 0.5 });
    });
    this._noise({ bus, t: t + run.length * 0.07, dur: 0.7, vol: 0.06 * v, filterType: 'highpass', filterFrom: 7000, reverbSend: 0.6 });
  }

  // =========================================================================
  // ========================  SFX — HERO COMBAT  ===========================
  // =========================================================================

  /** Generic attack — kept for compatibility; now a proper layered sword slash. */
  playAttack() { this.playHeroAttack('sword'); }

  /**
   * Layered hero attacks. type: 'sword' | 'magic' | 'arrow' | 'heavy' | 'fire' | 'ice' | 'lightning'
   */
  playHeroAttack(type = 'sword') {
    this.init();
    if (this.isSfxMuted()) return;
    const t = this.ctx.currentTime, v = this.getSfxVol(), bus = this.sfxBus;

    switch (type) {
      case 'magic': {
        // Rising sparkle + harmonic shimmer + soft boom
        this._tone({ bus, freq: 500, t, dur: 0.28, type: 'sine', vol: 0.25 * v, glideTo: 1800, reverbSend: 0.4, delaySend: 0.2 });
        this._fmTone({ bus, freq: 880, t: t + 0.05, dur: 0.35, vol: 0.18 * v, ratio: 5.02, index: 6, reverbSend: 0.5 });
        this._noise({ bus, t: t + 0.02, dur: 0.3, vol: 0.1 * v, filterType: 'bandpass', filterFrom: 3000, filterTo: 9000, q: 4, reverbSend: 0.4 });
        break;
      }
      case 'arrow': {
        // Bowstring twang + air whoosh + thock
        this._tone({ bus, freq: 320, t, dur: 0.08, type: 'triangle', vol: 0.32 * v, glideTo: 180, attack: 0.001 });
        this._noise({ bus, t: t + 0.01, dur: 0.22, vol: 0.22 * v, filterType: 'bandpass', filterFrom: 4500, filterTo: 900, q: 2 });
        this._thump({ bus, t: t + 0.18, freq: 200, drop: 90, dur: 0.09, vol: 0.3 * v });
        break;
      }
      case 'heavy': {
        // Big wind-up whoosh + massive impact + rumble
        this._noise({ bus, t, dur: 0.3, vol: 0.25 * v, filterType: 'bandpass', filterFrom: 500, filterTo: 2400, q: 1.5 });
        this._thump({ bus, t: t + 0.22, freq: 120, drop: 32, dur: 0.4, vol: 0.55 * v });
        this._noise({ bus, t: t + 0.22, dur: 0.35, vol: 0.3 * v, filterType: 'lowpass', filterFrom: 900, filterTo: 100, reverbSend: 0.3 });
        break;
      }
      case 'fire': {
        this._noise({ bus, t, dur: 0.45, vol: 0.26 * v, filterType: 'bandpass', filterFrom: 900, filterTo: 2600, q: 0.8, reverbSend: 0.25 });
        this._tone({ bus, freq: 140, t, dur: 0.4, type: 'sawtooth', vol: 0.16 * v, glideTo: 90, filterFreq: 500 });
        this._noise({ bus, t: t + 0.1, dur: 0.3, vol: 0.14 * v, filterType: 'highpass', filterFrom: 5000, reverbSend: 0.3 });
        break;
      }
      case 'ice': {
        this._fmTone({ bus, freq: 1760, t, dur: 0.3, vol: 0.2 * v, ratio: 7.1, index: 8, reverbSend: 0.5 });
        this._noise({ bus, t: t + 0.04, dur: 0.25, vol: 0.16 * v, filterType: 'highpass', filterFrom: 6000, reverbSend: 0.5 });
        this._tone({ bus, freq: 2400, t: t + 0.1, dur: 0.15, type: 'sine', vol: 0.14 * v, glideTo: 3600 });
        break;
      }
      case 'lightning': {
        this._noise({ bus, t, dur: 0.12, vol: 0.4 * v, filterType: 'highpass', filterFrom: 2500, attack: 0.001 });
        this._tone({ bus, freq: 1200, t, dur: 0.1, type: 'sawtooth', vol: 0.22 * v, glideTo: 200, attack: 0.001 });
        this._thump({ bus, t: t + 0.06, freq: 100, drop: 35, dur: 0.5, vol: 0.4 * v });
        this._noise({ bus, t: t + 0.08, dur: 0.6, vol: 0.12 * v, filterType: 'lowpass', filterFrom: 600, filterTo: 80, reverbSend: 0.4 });
        break;
      }
      case 'sword':
      default: {
        // Metallic "shing" + air slice + contact snap
        this._noise({ bus, t, dur: 0.16, vol: 0.3 * v, filterType: 'bandpass', filterFrom: 3600, filterTo: 800, q: 2.5, attack: 0.001 });
        this._fmTone({ bus, freq: 2100, t, dur: 0.12, vol: 0.12 * v, ratio: 3.7, index: 9 });
        this._thump({ bus, t: t + 0.05, freq: 170, drop: 80, dur: 0.12, vol: 0.28 * v });
        break;
      }
    }
  }

  playCrit() {
    this.init();
    if (this.isSfxMuted()) return;
    const t = this.ctx.currentTime, v = this.getSfxVol(), bus = this.sfxBus;
    // Slow-mo riser → devastating layered impact → ring-out shimmer
    this._tone({ bus, freq: 300, t, dur: 0.16, type: 'sawtooth', vol: 0.2 * v, glideTo: 1400, filterFreq: 3000 });
    this._thump({ bus, t: t + 0.15, freq: 150, drop: 28, dur: 0.5, vol: 0.6 * v });
    this._noise({ bus, t: t + 0.15, dur: 0.4, vol: 0.35 * v, filterType: 'lowpass', filterFrom: 2400, filterTo: 120, reverbSend: 0.35 });
    this._fmTone({ bus, freq: 1320, t: t + 0.16, dur: 0.6, vol: 0.16 * v, ratio: 3.5, index: 7, reverbSend: 0.5 });
    this._noise({ bus, t: t + 0.2, dur: 0.5, vol: 0.08 * v, filterType: 'highpass', filterFrom: 7500, reverbSend: 0.6 });
  }

  playHurt() {
    this.init();
    if (this.isSfxMuted()) return;
    const t = this.ctx.currentTime, v = this.getSfxVol(), bus = this.sfxBus;
    // Impact thud + tonal grunt
    this._thump({ bus, t, freq: 160, drop: 60, dur: 0.15, vol: 0.4 * v });
    this._tone({ bus, freq: 200, t, dur: 0.18, type: 'square', vol: 0.18 * v, glideTo: 110, filterFreq: 800, filterQ: 1.5 });
    this._noise({ bus, t, dur: 0.1, vol: 0.14 * v, filterType: 'bandpass', filterFrom: 1200, filterTo: 400, q: 1 });
  }

  playHeal() {
    this.init();
    if (this.isSfxMuted()) return;
    const t = this.ctx.currentTime, v = this.getSfxVol(), bus = this.sfxBus;
    [67, 72, 76].forEach((m, i) => {
      this._tone({ bus, freq: mtof(m), t: t + i * 0.09, dur: 0.5, type: 'sine', vol: 0.22 * v, attack: 0.04, reverbSend: 0.5, vibratoHz: 5, vibratoCents: 10 });
    });
    this._noise({ bus, t, dur: 0.6, vol: 0.05 * v, filterType: 'highpass', filterFrom: 8000, reverbSend: 0.6 });
  }

  playShield() {
    this.init();
    if (this.isSfxMuted()) return;
    const t = this.ctx.currentTime, v = this.getSfxVol(), bus = this.sfxBus;
    this._fmTone({ bus, freq: 440, t, dur: 0.4, vol: 0.25 * v, ratio: 2.0, index: 3, reverbSend: 0.3 });
    this._tone({ bus, freq: 330, t, dur: 0.35, type: 'triangle', vol: 0.2 * v, glideTo: 440, attack: 0.02 });
  }

  // =========================================================================
  // =====================  SFX — ENEMIES & BOSSES  =========================
  // =========================================================================

  /** Enemy attack. type: 'bite' | 'claw' | 'spit' | 'magic' */
  playEnemyAttack(type = 'claw') {
    this.init();
    if (this.isSfxMuted()) return;
    const t = this.ctx.currentTime, v = this.getSfxVol(), bus = this.sfxBus;
    switch (type) {
      case 'bite':
        this._noise({ bus, t, dur: 0.08, vol: 0.3 * v, filterType: 'bandpass', filterFrom: 2000, filterTo: 600, q: 3, attack: 0.001 });
        this._thump({ bus, t: t + 0.04, freq: 220, drop: 100, dur: 0.1, vol: 0.35 * v });
        break;
      case 'spit':
        this._tone({ bus, freq: 600, t, dur: 0.18, type: 'sine', vol: 0.2 * v, glideTo: 150 });
        this._noise({ bus, t, dur: 0.15, vol: 0.18 * v, filterType: 'bandpass', filterFrom: 1600, filterTo: 500, q: 2 });
        break;
      case 'magic':
        this._tone({ bus, freq: 800, t, dur: 0.3, type: 'sawtooth', vol: 0.15 * v, glideTo: 240, filterFreq: 1600, reverbSend: 0.35 });
        this._fmTone({ bus, freq: 350, t: t + 0.05, dur: 0.3, vol: 0.14 * v, ratio: 2.7, index: 5, reverbSend: 0.4 });
        break;
      case 'claw':
      default:
        this._noise({ bus, t, dur: 0.14, vol: 0.3 * v, filterType: 'bandpass', filterFrom: 3000, filterTo: 700, q: 1.6, attack: 0.001 });
        this._noise({ bus, t: t + 0.05, dur: 0.12, vol: 0.24 * v, filterType: 'bandpass', filterFrom: 2400, filterTo: 500, q: 1.6 });
        this._thump({ bus, t: t + 0.08, freq: 180, drop: 80, dur: 0.12, vol: 0.3 * v });
        break;
    }
  }

  playEnemyHurt() {
    this.init();
    if (this.isSfxMuted()) return;
    const t = this.ctx.currentTime, v = this.getSfxVol(), bus = this.sfxBus;
    this._tone({ bus, freq: 400, t, dur: 0.14, type: 'square', vol: 0.16 * v, glideTo: 200, filterFreq: 1200 });
    this._thump({ bus, t, freq: 190, drop: 90, dur: 0.1, vol: 0.28 * v });
  }

  playEnemyDeath() {
    this.init();
    if (this.isSfxMuted()) return;
    const t = this.ctx.currentTime, v = this.getSfxVol(), bus = this.sfxBus;
    this._tone({ bus, freq: 350, t, dur: 0.45, type: 'sawtooth', vol: 0.2 * v, glideTo: 60, filterFreq: 1000, reverbSend: 0.3 });
    this._noise({ bus, t: t + 0.1, dur: 0.35, vol: 0.2 * v, filterType: 'lowpass', filterFrom: 1500, filterTo: 120, reverbSend: 0.35 });
    this._thump({ bus, t: t + 0.2, freq: 100, drop: 35, dur: 0.35, vol: 0.35 * v });
  }

  playBossRoar() {
    this.init();
    if (this.isSfxMuted()) return;
    const t = this.ctx.currentTime, v = this.getSfxVol(), bus = this.sfxBus;
    // Deep layered growl with formant sweep + earth-shaking sub
    this._tone({ bus, freq: 70, t, dur: 1.1, type: 'sawtooth', vol: 0.35 * v, glideTo: 45, filterFreq: 350, filterQ: 2, vibratoHz: 11, vibratoCents: 60, reverbSend: 0.4 });
    this._tone({ bus, freq: 110, t: t + 0.05, dur: 1.0, type: 'square', vol: 0.16 * v, glideTo: 65, filterFreq: 600, filterQ: 3, vibratoHz: 9, vibratoCents: 80, reverbSend: 0.4 });
    this._noise({ bus, t, dur: 1.0, vol: 0.2 * v, filterType: 'bandpass', filterFrom: 300, filterTo: 900, q: 1, reverbSend: 0.5 });
    this._thump({ bus, t, freq: 55, drop: 28, dur: 1.2, vol: 0.5 * v });
  }

  playBossPhaseTransition() {
    this.init();
    if (this.isSfxMuted()) return;
    const t = this.ctx.currentTime, v = this.getSfxVol(), bus = this.sfxBus;
    // Alarm riser + slam
    this._tone({ bus, freq: 200, t, dur: 0.6, type: 'sawtooth', vol: 0.2 * v, glideTo: 800, filterFreq: 2200, reverbSend: 0.3 });
    this._tone({ bus, freq: 205, t, dur: 0.6, type: 'sawtooth', vol: 0.2 * v, glideTo: 815, filterFreq: 2200 });
    this._thump({ bus, t: t + 0.6, freq: 130, drop: 30, dur: 0.6, vol: 0.55 * v });
    this._noise({ bus, t: t + 0.6, dur: 0.5, vol: 0.3 * v, filterType: 'lowpass', filterFrom: 2000, filterTo: 100, reverbSend: 0.45 });
  }

  playExplosion() {
    this.init();
    if (this.isSfxMuted()) return;
    const t = this.ctx.currentTime, v = this.getSfxVol(), bus = this.sfxBus;
    this._thump({ bus, t, freq: 140, drop: 25, dur: 0.7, vol: 0.6 * v });
    this._noise({ bus, t, dur: 0.7, vol: 0.4 * v, filterType: 'lowpass', filterFrom: 3200, filterTo: 90, reverbSend: 0.4, attack: 0.001 });
    this._noise({ bus, t: t + 0.05, dur: 0.5, vol: 0.14 * v, filterType: 'highpass', filterFrom: 4000, reverbSend: 0.5 });
  }

  // =========================================================================
  // ========================  SFX — GAME FLOW  =============================
  // =========================================================================
  playVictory() {
    this.init();
    if (this.isSfxMuted()) return;
    const t = this.ctx.currentTime, v = this.getSfxVol(), bus = this.sfxBus;
    // Full fanfare: melody + supporting chords + snare roll + cymbal
    const melody = [
      { m: 72, d: 0.14 }, { m: 72, d: 0.14 }, { m: 72, d: 0.14 }, { m: 76, d: 0.42 },
      { m: 74, d: 0.14 }, { m: 76, d: 0.14 }, { m: 79, d: 0.7 },
    ];
    let tt = t;
    melody.forEach((n) => {
      this._tone({ bus, freq: mtof(n.m), t: tt, dur: n.d, type: 'square', vol: 0.2 * v, filterFreq: 3200, reverbSend: 0.3, delaySend: 0.12 });
      this._tone({ bus, freq: mtof(n.m - 12), t: tt, dur: n.d, type: 'triangle', vol: 0.16 * v, reverbSend: 0.25 });
      tt += n.d * 0.92;
    });
    // Chords under the two long notes
    [[60, 64, 67], [55, 60, 64, 67]].forEach((chord, i) => {
      const ct = t + (i === 0 ? 0.42 : 1.15);
      chord.forEach((m) => this._tone({ bus, freq: mtof(m - 12), t: ct, dur: 0.7, type: 'sawtooth', vol: 0.07 * v, filterFreq: 1400, reverbSend: 0.35 }));
    });
    // Snare roll into cymbal
    for (let i = 0; i < 6; i++) {
      this._noise({ bus, t: t + i * 0.045, dur: 0.05, vol: (0.04 + i * 0.015) * v, filterType: 'bandpass', filterFrom: 1800, q: 0.8 });
    }
    this._noise({ bus, t: t + 1.15, dur: 0.9, vol: 0.1 * v, filterType: 'highpass', filterFrom: 6000, reverbSend: 0.6 });
  }

  playDefeat() {
    this.init();
    if (this.isSfxMuted()) return;
    const t = this.ctx.currentTime, v = this.getSfxVol(), bus = this.sfxBus;
    const line = [67, 66, 63, 60];
    line.forEach((m, i) => {
      const tt = t + i * 0.38;
      this._tone({ bus, freq: mtof(m), t: tt, dur: 0.42, type: 'triangle', vol: 0.22 * v, reverbSend: 0.45 });
      this._tone({ bus, freq: mtof(m - 12), t: tt, dur: 0.42, type: 'sine', vol: 0.18 * v, reverbSend: 0.4 });
    });
    this._tone({ bus, freq: mtof(48), t: t + 4 * 0.38, dur: 1.2, type: 'sawtooth', vol: 0.12 * v, filterFreq: 500, reverbSend: 0.5 });
  }

  // =========================================================================
  // ============================  MUSIC  ===================================
  // =========================================================================

  /**
   * Unique melody for every (region, stage, level, mode) — but always inside
   * the region's musical identity (key, mode, tempo, instruments).
   */
  startStageLevelBgm(regionId = 1, stageId = 1, levelIndex = 0, mode = 'campaign') {
    const sId = typeof stageId === 'object' ? (stageId.id || 1) : (Number(stageId) || 1);
    const lIdx = Number(levelIndex) || 0;
    const bgmKey = `stage_${regionId}_${sId}_lvl_${lIdx}_${mode}`;
    if (this._alreadyRunning(bgmKey)) return;
    this._startTrack(bgmKey, this._generateLevelTrack(regionId, sId, lIdx, mode));
  }

  /** Escalating boss battle music: unique per boss, intensifies per phase. */
  startBossPhaseBgm(bossId = 'boss_1', phaseIndex = 1) {
    const phase = Math.max(1, Math.min(4, Number(phaseIndex) || 1));
    const bgmKey = `boss_${bossId}_phase_${phase}`;
    if (this._alreadyRunning(bgmKey)) return;
    this._startTrack(bgmKey, this._generateBossTrack(bossId, phase));
  }

  /** Region themes by name — and 'menu' for the cinematic main-menu theme. */
  startBgm(theme = 'meadows') {
    if (theme === 'boss') { this.startBossPhaseBgm('boss_1', 1); return; }
    const bgmKey = `theme_${theme}`;
    if (this._alreadyRunning(bgmKey)) return;
    if (theme === 'menu') {
      this._startTrack(bgmKey, this._generateMenuTrack());
    } else {
      const regionId = THEME_NAME_TO_REGION[theme] || 1;
      this._startTrack(bgmKey, this._generateLevelTrack(regionId, 1, 0, 'theme'));
    }
  }

  /** Explicit alias for clarity in game code. */
  startMenuBgm() { this.startBgm('menu'); }

  /**
   * True when this exact track is already playing and needs no restart.
   *
   * The paused check matters: `pauseBgm` leaves `currentBgmKey` and
   * `isPlayingBgm` in place, so without it, restarting a stage while its own
   * track was paused took the fast path and the music never came back.
   */
  _alreadyRunning(bgmKey) {
    return this.currentBgmKey === bgmKey && this.isPlayingBgm && !this._bgmPaused;
  }

  /**
   * Restarts whatever track is current. Used when unmuting, so the player gets
   * the music of the place they are actually standing in rather than a default
   * theme picked by the settings screen.
   */
  resumeCurrentBgm() {
    if (!this.currentBgmKey || !this.currentTrackData) return false;
    this._startTrack(this.currentBgmKey, this.currentTrackData);
    return true;
  }

  stopBgmTimer() {
    if (this._schedulerTimer) {
      clearTimeout(this._schedulerTimer);
      this._schedulerTimer = null;
    }
  }

  /**
   * Stops the music. The track selection is deliberately kept: muting is the
   * only thing that stops music outright, and on unmute the player must get
   * the theme of wherever they are standing, not a default one.
   */
  stopBgm() {
    this.isPlayingBgm = false;
    this._bgmPaused = false;
    this.stopBgmTimer();
    this._fadeOutTrackGain(0.4);
  }

  pauseBgm() {
    this._bgmPaused = true;
    this.stopBgmTimer();
  }

  resumeBgm() {
    if (this._bgmPaused && this.isPlayingBgm) {
      this._bgmPaused = false;
      this.init();
      this._nextStepTime = this.ctx.currentTime + 0.05;
      this._schedulerLoop();
    }
  }

  // --- internal track lifecycle ---
  _startTrack(bgmKey, trackData) {
    this.init();
    this.stopBgmTimer();
    this._fadeOutTrackGain(0.6); // crossfade the old track out

    this.currentBgmKey = bgmKey;
    this.currentTrackData = trackData;
    this._step = 0;
    this._bgmPaused = false;

    // Muted music still costs a 40 ms scheduler tick forever and still builds
    // every note, so stop here — but keep the track selected, so unmuting can
    // pick up exactly where the player is via `resumeCurrentBgm`.
    if (this.isBgmMuted()) {
      this.isPlayingBgm = false;
      return;
    }
    this.isPlayingBgm = true;

    // Fresh gain node for this track → allows overlapping crossfades
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(1.0, this.ctx.currentTime + 0.8);
    g.connect(this.bgmBus);
    this._trackGain = g;

    this._nextStepTime = this.ctx.currentTime + 0.08;
    this._schedulerLoop();
  }

  _fadeOutTrackGain(seconds) {
    if (this._trackGain && this.ctx) {
      const g = this._trackGain;
      const t = this.ctx.currentTime;
      try {
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
      } catch (_e) { /* node may already be gone */ }
      setTimeout(() => { try { g.disconnect(); } catch (_e2) {} }, seconds * 1000 + 200);
      this._trackGain = null;
    }
  }

  // =========================================================================
  // TRACK GENERATION
  // =========================================================================

  _generateLevelTrack(regionId, stageId, levelIndex, mode) {
    const theme = REGION_THEMES[regionId] || REGION_THEMES[1];
    const seed = hashString(`${regionId}:${stageId}:${levelIndex}:${mode}`);
    const rand = mulberry32(seed);

    const scaleLen = theme.scale.length;
    const bars = 4;
    const stepsPerBar = 16;
    const totalSteps = bars * stepsPerBar;

    // Melody: motif-based. Build a 1-bar motif, then vary it per bar.
    const motif = [];
    for (let i = 0; i < 8; i++) {
      if (rand() < 0.25 && i > 0) { motif.push(null); continue; } // rests breathe
      const deg = Math.floor(rand() * scaleLen) + (rand() < 0.3 ? scaleLen : 0);
      motif.push(deg);
    }
    const melody = new Array(totalSteps).fill(null);
    for (let bar = 0; bar < bars; bar++) {
      const transpose = bar === 2 ? (rand() < 0.5 ? 1 : 2) : 0; // bar 3 lifts
      for (let i = 0; i < 8; i++) {
        const step = bar * stepsPerBar + i * 2;
        let deg = motif[i];
        if (deg === null) continue;
        if (bar === 3 && rand() < 0.4) deg = Math.floor(rand() * scaleLen); // bar 4 varies
        melody[step] = deg + transpose;
      }
    }

    // Chord progression: one chord per bar from theme's set
    const chordPlan = [];
    for (let bar = 0; bar < bars; bar++) chordPlan.push(theme.chords[bar % theme.chords.length]);

    // Tempo escalates slightly with level depth; infinite mode is faster
    const bpm = theme.bpm + Math.min(levelIndex * 2, 16) + (mode === 'infinite' ? 10 : 0);

    return {
      type: 'level',
      theme, bpm, bars, stepsPerBar, totalSteps,
      melody, chordPlan,
      octave: 0,
      intensity: Math.min(0.5 + levelIndex * 0.06, 1),
      seed,
    };
  }

  _generateBossTrack(bossId, phase) {
    const cfg = BOSS_THEMES[bossId] || BOSS_THEMES.boss_1;
    const seed = hashString(`${bossId}:${phase}`);
    const rand = mulberry32(seed);

    const bars = 4;
    const stepsPerBar = 16;
    const totalSteps = bars * stepsPerBar;
    const scaleLen = cfg.scale.length;

    // The boss motif is its signature; higher phases add ornaments & speed
    const melody = new Array(totalSteps).fill(null);
    const density = phase >= 3 ? 1 : 2; // phase 3+: melody on every 8th step pair
    for (let bar = 0; bar < bars; bar++) {
      for (let i = 0; i < 8; i++) {
        const step = bar * stepsPerBar + i * 2;
        let deg = cfg.motif[i % cfg.motif.length];
        if (bar % 2 === 1) deg += phase >= 2 ? 2 : 0;           // phase 2+: answer phrase raised
        if (phase >= 3 && i % 4 === 3) deg += scaleLen;          // phase 3+: octave stabs
        melody[step] = deg;
        if (phase >= 4 && density === 1 && rand() < 0.5) {       // phase 4: frantic fills
          melody[step + 1] = deg + Math.floor(rand() * 3) - 1;
        }
      }
    }

    const chordPlan = [
      [0, 3, 7], [-1, 3, 6], [0, 3, 7], phase >= 2 ? [1, 4, 8] : [-2, 1, 5],
    ];

    const bpmByPhase = [126, 138, 152, 168];

    return {
      type: 'boss',
      bossId, phase,
      theme: {
        ...REGION_THEMES[5],
        root: cfg.root, scale: cfg.scale, lead: cfg.lead,
        drums: phase >= 3 ? 'frenzy' : 'heavy',
        pad: 'dark', bassStyle: 'drive',
        reverb: 0.25, brightness: 2200 + phase * 300, swing: 0,
      },
      bpm: bpmByPhase[phase - 1],
      bars, stepsPerBar, totalSteps,
      melody, chordPlan,
      octave: 0,
      intensity: 0.6 + phase * 0.1,
      seed,
    };
  }

  _generateMenuTrack() {
    // Cinematic heroic main theme in C major — composed, not random.
    const stepsPerBar = 16;
    const bars = 8;
    const totalSteps = bars * stepsPerBar;
    const melody = new Array(totalSteps).fill(null);

    // Hero melody (scale degrees in C major), one note per 8th, phrased.
    // Phrase A (bars 1-2), A' (3-4), B (5-6), cadence (7-8)
    const phraseA = [0, null, 2, null, 4, null, 4, null, 5, null, 4, null, 2, null, null, null];
    const phraseA2 = [0, null, 2, null, 4, null, 4, null, 7, null, 5, null, 4, null, null, null];
    const phraseB = [7, null, 6, null, 5, null, 4, null, 5, null, 4, null, 2, null, 1, null];
    const cadence = [2, null, 4, null, 2, null, 1, null, 0, null, null, null, null, null, null, null];
    const phrases = [phraseA, phraseA, phraseA2, phraseA2, phraseB, phraseB, cadence, cadence];
    for (let bar = 0; bar < bars; bar++) {
      const src = phrases[bar];
      for (let i = 0; i < stepsPerBar; i++) {
        // Play each phrase over two bars: even bars first half, odd bars second half
        const half = bar % 2 === 0 ? 0 : 8;
        if (i % 2 === 0) {
          const v = src[(half + i / 2) % 16];
          if (v !== null && v !== undefined) melody[bar * stepsPerBar + i] = v;
        }
      }
    }

    const chordPlan = [
      [0, 4, 7], [0, 4, 7],      // I
      [-3, 0, 4], [-3, 0, 4],    // vi
      [-5, -1, 2], [-7, -3, 0],  // IV V
      [-5, -1, 2], [0, 4, 7],    // IV I
    ];

    return {
      type: 'menu',
      theme: {
        name: 'menu', root: 60, scale: SCALES.major, bpm: 96,
        lead: 'horn', pad: 'warm', bassStyle: 'slow', drums: 'anthem',
        arp: true, swing: 0, reverb: 0.45, brightness: 3000,
        chords: chordPlan,
      },
      bpm: 96,
      bars, stepsPerBar, totalSteps,
      melody, chordPlan,
      octave: 0,
      intensity: 0.7,
      seed: 7,
    };
  }

  // =========================================================================
  // SAMPLE-ACCURATE SCHEDULER
  // =========================================================================
  _schedulerLoop() {
    if (!this.isPlayingBgm || this._bgmPaused) return;
    const ctx = this.ctx;
    const track = this.currentTrackData;
    if (!track) return;

    const vol = this.getBgmVol();
    const stepDur = 60 / track.bpm / 4; // 16th notes

    while (this._nextStepTime < ctx.currentTime + this._lookahead) {
      if (vol > 0 && this._trackGain) {
        // Apply swing to off-beat 16ths
        const swingOffset = (this._step % 2 === 1) ? stepDur * (track.theme.swing || 0) : 0;
        this._scheduleStep(track, this._step, this._nextStepTime + swingOffset, stepDur, vol);
      }
      this._nextStepTime += stepDur;
      this._step = (this._step + 1) % track.totalSteps;
    }

    this._schedulerTimer = setTimeout(() => this._schedulerLoop(), this._tickMs);
  }

  _scheduleStep(track, step, t, stepDur, vol) {
    const theme = track.theme;
    const bus = this._trackGain;
    if (!bus) return;
    const bar = Math.floor(step / track.stepsPerBar);
    const stepInBar = step % track.stepsPerBar;
    const chord = track.chordPlan[bar % track.chordPlan.length];
    const rootMidi = theme.root;

    // ---- 1. LEAD MELODY -------------------------------------------------
    const deg = track.melody[step];
    if (deg !== null && deg !== undefined) {
      const midi = this._degToMidi(rootMidi + 12, theme.scale, deg);
      const freq = mtof(midi);
      const dur = stepDur * 3.2;
      this._playLead(theme.lead, bus, freq, t, dur, 0.16 * vol * (track.intensity ?? 0.7), theme);
    }

    // ---- 2. CHORD PAD (start of each bar) --------------------------------
    if (stepInBar === 0 && theme.pad) {
      const padDur = stepDur * track.stepsPerBar * 0.98;
      chord.forEach((cDeg) => {
        const midi = this._degToMidi(rootMidi, theme.scale, cDeg);
        this._playPad(theme.pad, bus, mtof(midi), t, padDur, 0.05 * vol, theme);
      });
    }

    // ---- 3. ARPEGGIO (16ths, region-dependent) ---------------------------
    if (theme.arp && stepInBar % 2 === 1) {
      const arpDeg = chord[(step >> 1) % chord.length];
      const midi = this._degToMidi(rootMidi + 12, theme.scale, arpDeg) + 12;
      this._tone({
        bus, freq: mtof(midi), t, dur: stepDur * 1.6, type: 'triangle',
        vol: 0.045 * vol, attack: 0.004, reverbSend: theme.reverb * 0.8, delaySend: 0.14,
      });
    }

    // ---- 4. BASS ---------------------------------------------------------
    this._playBass(theme.bassStyle, bus, rootMidi, theme.scale, chord, stepInBar, t, stepDur, vol, track);

    // ---- 5. DRUMS ----------------------------------------------------------
    this._playDrums(theme.drums, bus, stepInBar, bar, t, stepDur, vol, track);
  }

  _degToMidi(rootMidi, scale, deg) {
    const len = scale.length;
    const oct = Math.floor(deg / len);
    let idx = deg % len;
    if (idx < 0) { idx += len; }
    const adjOct = deg < 0 && deg % len !== 0 ? oct : oct;
    return rootMidi + scale[idx] + adjOct * 12;
  }

  // --- lead instruments ---
  _playLead(kind, bus, freq, t, dur, vol, theme) {
    switch (kind) {
      case 'flute':
        this._tone({ bus, freq, t, dur, type: 'sine', vol: vol * 1.1, attack: 0.05, vibratoHz: 5.5, vibratoCents: 14, reverbSend: theme.reverb, delaySend: 0.15 });
        this._tone({ bus, freq: freq * 2, t, dur, type: 'sine', vol: vol * 0.15, attack: 0.05, reverbSend: theme.reverb });
        break;
      case 'marimba':
        this._fmTone({ bus, freq, t, dur: Math.min(dur, 0.4), vol: vol * 1.2, ratio: 3.9, index: 2.2, reverbSend: theme.reverb, delaySend: 0.2 });
        break;
      case 'pluck':
        this._tone({ bus, freq, t, dur: Math.min(dur, 0.3), type: 'triangle', vol: vol * 1.3, attack: 0.002, release: 0.25, filterFreq: theme.brightness, reverbSend: theme.reverb, delaySend: 0.18 });
        break;
      case 'oud':
        this._tone({ bus, freq, t, dur: Math.min(dur, 0.35), type: 'sawtooth', vol: vol * 0.8, attack: 0.003, release: 0.3, filterFreq: 1800, filterQ: 2, vibratoHz: 7, vibratoCents: 25, reverbSend: theme.reverb });
        break;
      case 'bell':
        this._fmTone({ bus, freq, t, dur: Math.min(dur * 1.6, 1.2), vol: vol * 0.9, ratio: 3.53, index: 5, reverbSend: theme.reverb, delaySend: 0.25 });
        break;
      case 'lead_saw':
        this._tone({ bus, freq, t, dur, type: 'sawtooth', vol: vol * 0.85, attack: 0.008, filterFreq: theme.brightness, filterQ: 2.5, detune: 6, reverbSend: theme.reverb * 0.6 });
        this._tone({ bus, freq, t, dur, type: 'sawtooth', vol: vol * 0.5, attack: 0.008, filterFreq: theme.brightness, detune: -6 });
        break;
      case 'lead_square':
        this._tone({ bus, freq, t, dur, type: 'square', vol: vol * 0.7, attack: 0.005, filterFreq: theme.brightness, filterQ: 1.5, reverbSend: theme.reverb * 0.5, delaySend: 0.12 });
        break;
      case 'theremin':
        this._tone({ bus, freq: freq * 0.97, t, dur: dur * 1.4, type: 'sine', vol, attack: 0.12, glideTo: freq, vibratoHz: 6.5, vibratoCents: 40, reverbSend: theme.reverb, delaySend: 0.3 });
        break;
      case 'fm_glitch':
        this._fmTone({ bus, freq, t, dur: Math.min(dur, 0.5), vol, ratio: 2.37 + (Math.random() * 0.1), index: 7, reverbSend: theme.reverb, delaySend: 0.28 });
        break;
      case 'horn':
        this._tone({ bus, freq, t, dur, type: 'sawtooth', vol: vol * 0.75, attack: 0.06, filterFreq: 1600, filterQ: 1, reverbSend: theme.reverb });
        this._tone({ bus, freq: freq * 1.002, t, dur, type: 'sawtooth', vol: vol * 0.4, attack: 0.08, filterFreq: 1200 });
        this._tone({ bus, freq: freq / 2, t, dur, type: 'triangle', vol: vol * 0.3, attack: 0.06, reverbSend: theme.reverb });
        break;
      default:
        this._tone({ bus, freq, t, dur, type: 'triangle', vol, attack: 0.01, reverbSend: theme.reverb });
    }
  }

  // --- pads ---
  _playPad(kind, bus, freq, t, dur, vol, theme) {
    const cfg = {
      warm: { type: 'sawtooth', filter: 900, detune: 7, vol: vol },
      dark: { type: 'sawtooth', filter: 500, detune: 10, vol: vol * 1.1 },
      glass: { type: 'triangle', filter: 2400, detune: 4, vol: vol * 0.9 },
      ghost: { type: 'sine', filter: 1200, detune: 14, vol: vol * 1.2 },
      drone: { type: 'sawtooth', filter: 650, detune: 3, vol: vol * 1.1 },
    }[kind] || { type: 'sawtooth', filter: 800, detune: 6, vol };

    this._tone({ bus, freq, t, dur, type: cfg.type, vol: cfg.vol, attack: dur * 0.25, release: dur * 0.3, filterFreq: cfg.filter, detune: cfg.detune, reverbSend: theme.reverb * 1.2 });
    this._tone({ bus, freq, t, dur, type: cfg.type, vol: cfg.vol * 0.8, attack: dur * 0.25, release: dur * 0.3, filterFreq: cfg.filter, detune: -cfg.detune });
  }

  // --- bass styles ---
  _playBass(style, bus, rootMidi, scale, chord, stepInBar, t, stepDur, vol, track) {
    const isBoss = track.type === 'boss';
    const baseVol = (isBoss ? 0.13 : 0.1) * vol;
    const rootNote = this._degToMidi(rootMidi - 24, scale, chord[0]);

    const play = (midi, dur, v = baseVol) => {
      this._tone({ bus, freq: mtof(midi), t, dur, type: 'sawtooth', vol: v, attack: 0.006, filterFreq: isBoss ? 700 : 450, filterQ: 1.2 });
      // Sub layer for weight
      this._tone({ bus, freq: mtof(midi), t, dur, type: 'sine', vol: v * 0.9, attack: 0.006 });
    };

    switch (style) {
      case 'walk':
        if (stepInBar % 4 === 0) {
          const degs = [chord[0], chord[1], chord[0], chord[2]];
          play(this._degToMidi(rootMidi - 24, scale, degs[(stepInBar / 4) % 4]), stepDur * 3.5);
        }
        break;
      case 'pulse':
        if (stepInBar % 4 === 0 || stepInBar % 8 === 6) play(rootNote, stepDur * 2.5);
        break;
      case 'bounce':
        if (stepInBar % 4 === 0) play(rootNote, stepDur * 2);
        else if (stepInBar % 4 === 2) play(rootNote + 12, stepDur * 1.5, baseVol * 0.7);
        break;
      case 'drive':
        if (stepInBar % 2 === 0) play(rootNote, stepDur * 1.7, baseVol * (stepInBar % 4 === 0 ? 1 : 0.75));
        break;
      case 'slow':
        if (stepInBar === 0 || stepInBar === 10) play(rootNote, stepDur * 6);
        break;
      default:
        if (stepInBar % 4 === 0) play(rootNote, stepDur * 3);
    }
  }

  // --- drum kits ---
  _kick(bus, t, vol) {
    this._tone({ bus, freq: 150, t, dur: 0.11, type: 'sine', vol, attack: 0.001, glideTo: 38, release: 0.1 });
    this._noise({ bus, t, dur: 0.02, vol: vol * 0.4, filterType: 'lowpass', filterFrom: 1200, attack: 0.001 });
  }
  _snare(bus, t, vol) {
    this._noise({ bus, t, dur: 0.14, vol, filterType: 'bandpass', filterFrom: 1800, q: 0.7, attack: 0.001, reverbSend: 0.15 });
    this._tone({ bus, freq: 190, t, dur: 0.08, type: 'triangle', vol: vol * 0.6, attack: 0.001, glideTo: 120 });
  }
  _hat(bus, t, vol, open = false) {
    this._noise({ bus, t, dur: open ? 0.18 : 0.045, vol, filterType: 'highpass', filterFrom: 7500, attack: 0.001 });
  }
  _tom(bus, t, vol, freq = 130) {
    this._tone({ bus, freq, t, dur: 0.16, type: 'sine', vol, attack: 0.001, glideTo: freq * 0.55 });
  }
  _shaker(bus, t, vol) {
    this._noise({ bus, t, dur: 0.05, vol, filterType: 'bandpass', filterFrom: 5500, q: 2, attack: 0.005 });
  }

  _playDrums(kit, bus, stepInBar, bar, t, stepDur, vol, track) {
    const v = vol * (track.intensity ?? 0.7);
    switch (kit) {
      case 'soft':
        if (stepInBar === 0 || stepInBar === 8) this._kick(bus, t, 0.14 * v);
        if (stepInBar === 4 || stepInBar === 12) this._shaker(bus, t, 0.05 * v);
        if (stepInBar % 4 === 2) this._hat(bus, t, 0.025 * v);
        break;
      case 'tribal':
        if (stepInBar === 0) this._kick(bus, t, 0.16 * v);
        if (stepInBar === 6) this._tom(bus, t, 0.1 * v, 150);
        if (stepInBar === 10) this._tom(bus, t, 0.1 * v, 110);
        if (stepInBar === 12) this._kick(bus, t, 0.12 * v);
        if (stepInBar % 2 === 1) this._shaker(bus, t, 0.03 * v);
        break;
      case 'sparse':
        if (stepInBar === 0 && bar % 2 === 0) this._kick(bus, t, 0.1 * v);
        if (stepInBar === 8 && bar % 2 === 1) this._tom(bus, t, 0.06 * v, 90);
        break;
      case 'driving':
        if (stepInBar % 4 === 0) this._kick(bus, t, 0.17 * v);
        if (stepInBar === 4 || stepInBar === 12) this._snare(bus, t, 0.1 * v);
        if (stepInBar % 2 === 0) this._hat(bus, t, 0.035 * v);
        if (stepInBar === 14) this._hat(bus, t, 0.05 * v, true);
        break;
      case 'heavy':
        if (stepInBar % 4 === 0) this._kick(bus, t, 0.2 * v);
        if (stepInBar === 4 || stepInBar === 12) this._snare(bus, t, 0.13 * v);
        if (stepInBar % 2 === 1) this._hat(bus, t, 0.03 * v);
        if (stepInBar === 10) this._kick(bus, t, 0.14 * v);
        break;
      case 'frenzy':
        if (stepInBar % 2 === 0) this._kick(bus, t, stepInBar % 4 === 0 ? 0.2 * v : 0.12 * v);
        if (stepInBar === 4 || stepInBar === 12) this._snare(bus, t, 0.14 * v);
        if (stepInBar === 7 || stepInBar === 15) this._snare(bus, t, 0.08 * v);
        this._hat(bus, t, 0.028 * v);
        break;
      case 'glitch':
        if ((stepInBar * 7 + bar * 3) % 16 < 3) this._kick(bus, t, 0.13 * v);
        if ((stepInBar * 5 + bar) % 16 === 4) this._snare(bus, t, 0.09 * v);
        if (stepInBar % 3 === 0) this._hat(bus, t, 0.03 * v);
        break;
      case 'anthem':
        if (stepInBar === 0) this._kick(bus, t, 0.13 * v);
        if (stepInBar === 8) this._snare(bus, t, 0.07 * v);
        if (stepInBar === 12 && bar % 4 === 3) { // fill into next bar
          this._tom(bus, t, 0.08 * v, 160);
          this._tom(bus, t + stepDur, 0.08 * v, 130);
          this._tom(bus, t + stepDur * 2, 0.09 * v, 100);
        }
        break;
      default:
        break;
    }
  }
}
