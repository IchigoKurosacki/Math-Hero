/**
 * Multi-phase boss controller. It owns boss runtime HP, phase thresholds,
 * transition protection and per-boss presentation metadata.
 */
import { t, tList } from '../i18n/index.js';
/**
 * Health thresholds per phase count. Keyed by total phases so adding a
 * four-phase boss cannot shift the pacing of the existing three-phase ones.
 */
const PHASE_THRESHOLDS = {
  1: [1],
  2: [1, 0.5],
  3: [1, 0.67, 0.34],
  4: [1, 0.75, 0.5, 0.25],
};

/**
 * Заголовки фаз читаються під час `initBoss`, тобто на початку кожного бою —
 * тому зміна мови між боями підхоплюється сама, без перебудови контролера.
 */
const PHASE_DEFAULTS = [
  { key: 'bossPhase.first', transitionMs: 0 },
  { key: 'bossPhase.second', transitionMs: 1200 },
  { key: 'bossPhase.third', transitionMs: 1450 },
  { key: 'bossPhase.final', transitionMs: 1700 },
];

const BOSS_PHASE_LIBRARY = {
  boss_1: ['Слайм роздувається!', 'Слизовий щит лускає!', 'Бублик розділяється!'],
  boss_2: ['Грибослав кличе копії!', 'Туман густішає!', 'Справжній Грибослав відкрився!'],
  boss_3: ['Рій збирається!', 'Стільниковий щит тріщить!', 'Королева втратила захист!'],
  boss_4: ['Саркофаг відкрито!', 'Піщана буря здіймається!', 'Плити повертають пастки!'],
  boss_5: ['Дракон злітає!', 'Полум’я заряджено!', 'Відбий вогняну кулю!'],
  boss_6: ['Кристали ростуть!', 'Крижаний захист розколюється!', 'Починається хуртовина!'],
  boss_7: ['Вісім рук озброєні!', 'Блискавки б’ють частіше!', 'Останні руки втрачають силу!'],
  boss_8: ['Привиди прокидаються!', 'Двійники оточують героя!', 'Корона відкрила фінальну печать!'],
  boss_secret: [
    'Помилки зібрані!',
    'Пан Помилкус росте на твоїх помилках!',
    'Слабкі факти повертаються юрбою!',
    'Остання помилка готова здатися!',
  ],
};

export class BossPhaseController {
  constructor() { this.reset(); }

  reset() {
    this.currentBoss = null;
    this.phase = 1;
    this.maxPhases = 3;
    this.previousPhase = 1;
    this.isInvulnerable = false;
    this.transitionTimer = 0;
    this.transitionDuration = 0;
    this._bufferedDamage = 0;
    this._paused = false;
    this._events = [];
  }

  initBoss(bossData) {
    this.reset();
    const maxHp = Math.max(1, Number(bossData.hpMax || bossData.hp || 6));
    this.currentBoss = { ...bossData, maxHp, currentHp: maxHp };
    this.maxPhases = Math.max(1, Math.min(4, Number(bossData.phases || 3)));
    const thresholds = PHASE_THRESHOLDS[this.maxPhases] || PHASE_THRESHOLDS[3];
    this.phaseDefinitions = thresholds.map((threshold, index) => ({
      threshold,
      transitionMs: PHASE_DEFAULTS[index]?.transitionMs ?? 1450,
      title: tList(`phases_${bossData.id}`, BOSS_PHASE_LIBRARY[bossData.id] || [])[index]
        || t(PHASE_DEFAULTS[index]?.key || 'bossPhase.next'),
    }));
    return this.currentBoss;
  }

  get currentPhaseDefinition() {
    return this.phaseDefinitions?.[this.phase - 1] || { threshold: 1, title: '', transitionMs: 0 };
  }

  /**
   * 0 → 1 across the invulnerable window. Drives the evolution animation, so
   * the renderer never has to track transition timing itself.
   */
  get transitionProgress() {
    if (!this.isInvulnerable || this.transitionDuration <= 0) return 0;
    return Math.max(0, Math.min(1, 1 - this.transitionTimer / this.transitionDuration));
  }

  bufferDamage(damage) { this._bufferedDamage += Math.max(0, Number(damage || 0)); }

  applyDamage(damage = 1) {
    if (!this.currentBoss) return this._result(0, false);
    const safeDamage = Math.max(0, Number(damage || 0));
    if (this.isInvulnerable) {
      this.bufferDamage(safeDamage);
      return { ...this._result(0, false), buffered: true };
    }
    if (!Number.isFinite(this.currentBoss.currentHp)) this.currentBoss.currentHp = this.currentBoss.maxHp;
    this.currentBoss.currentHp = Math.max(0, this.currentBoss.currentHp - safeDamage);

    let phaseChanged = false;
    if (this.currentBoss.currentHp > 0 && this.phase < this.maxPhases) {
      const ratio = this.currentBoss.currentHp / this.currentBoss.maxHp;
      // A single big hit can cross several thresholds at once; advance through
      // all of them so the boss never lingers in a phase its HP has passed.
      const startPhase = this.phase;
      while (this.phase < this.maxPhases && ratio <= (this.phaseDefinitions[this.phase]?.threshold ?? -1)) {
        this.phase++;
        phaseChanged = true;
      }
      if (phaseChanged) {
        this.previousPhase = startPhase;
        this.triggerPhaseTransition();
      }
    }
    return this._result(safeDamage, phaseChanged);
  }

  _result(damageTaken, phaseChanged) {
    return {
      damageTaken,
      phaseChanged,
      phase: this.phase,
      phaseTitle: this.currentPhaseDefinition?.title || '',
      currentHp: this.currentBoss?.currentHp || 0,
      maxHp: this.currentBoss?.maxHp || 0,
      isDefeated: (this.currentBoss?.currentHp || 0) <= 0,
    };
  }

  triggerPhaseTransition() {
    this.isInvulnerable = true;
    this.transitionDuration = (this.currentPhaseDefinition.transitionMs || 1200) / 1000;
    this.transitionTimer = this.transitionDuration;
    this._events.push({
      type: 'phase-change',
      phase: this.phase,
      fromPhase: this.previousPhase,
      maxPhases: this.maxPhases,
      isFinalPhase: this.phase >= this.maxPhases,
      durationMs: this.transitionDuration * 1000,
      title: this.currentPhaseDefinition.title,
    });
  }

  update(dt) {
    if (this._paused || !this.isInvulnerable) return;
    this.transitionTimer -= dt;
    if (this.transitionTimer > 0) return;
    this.transitionTimer = 0;
    this.isInvulnerable = false;
    this.previousPhase = this.phase;
    this._events.push({ type: 'transition-end', phase: this.phase });
    if (this._bufferedDamage > 0) {
      const buffered = this._bufferedDamage;
      this._bufferedDamage = 0;
      const result = this.applyDamage(buffered);
      this._events.push({ type: 'buffered-damage', result });
    }
  }

  consumeEvents() {
    const events = this._events;
    this._events = [];
    return events;
  }

  pause() { this._paused = true; }
  resume() { this._paused = false; }
}
