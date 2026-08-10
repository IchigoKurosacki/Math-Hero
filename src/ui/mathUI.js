/**
 * Math Combat UI for Math Hero RPG.
 * Owns only DOM presentation and input mapping; combat rules stay in GameApp.
 */
import { CRIT_EVERY, ULTIMATE_MAX_CHARGES, ULTIMATE_STREAK } from '../game/hero.js';
import { t, creatureName } from '../i18n/index.js';

export class MathUI {
  constructor(soundEngine, onAnswer, onUltimate = null) {
    this.soundEngine = soundEngine;
    this.onAnswer = onAnswer;
    this.onUltimate = onUltimate;
    this.combatZone = document.getElementById('mathCombatZone');
    this.heartsContainer = document.getElementById('heartsContainer');
    this.numpadValue = '';
    this._keyHandler = null;
    this._ultKeyHandler = null;
    this._locked = false;
    this._lastPick = null;
    this._lastHearts = null;
    this._lastMaxHearts = null;
  }

  showProblem(problem, enemy, hero, bossPhase = 1, meta = {}) {
    if (!this.combatZone) return;
    this._unbindKeyboard();
    this._locked = false;
    // Belongs to the question being replaced; keeping it would let the next
    // resolution colour a control the player never touched.
    this._lastPick = null;
    // Клас, а не інлайновий `display`: інлайн перебивав би медіа-запит, який
    // на короткому горизонтальному екрані розкладає панель у два стовпці.
    this.combatZone.style.display = '';
    this.combatZone.classList.add('is-active');
    this.combatZone.style.pointerEvents = 'auto';
    this.combatZone.classList.toggle('boss-combat', !!enemy?.phases);
    this.combatZone.dataset.tier = String(problem.tier || 1);
    this.combatZone.setAttribute('aria-live', 'polite');

    const manual = problem.tier >= 4 || problem.options.length === 0;
    const optionsHtml = manual
      ? this._buildNumpad()
      // The column count follows the number of answers, so two options fill the
      // panel instead of huddling in the left half of a fixed four-column grid.
      : `<div class="options-grid" role="group" aria-label="${t('combat.answersAria')}" style="--option-count:${problem.options.length}">
          ${problem.options.map((opt, idx) =>
            `<button class="option-btn interactive" data-answer="${opt}" id="optionBtn_${idx}" aria-label="${t('combat.optionAria', { index: idx + 1, value: opt })}"><span class="key-hint">${idx + 1}</span>${opt}</button>`
          ).join('')}
        </div>`;

    const maxHp = enemy?.maxHp || enemy?.hpMax || 1;
    const currentHp = Math.max(0, Number(enemy?.currentHp ?? maxHp));
    const hpPct = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
    const hpClass = hpPct > 50 ? 'healthy' : hpPct > 25 ? 'warning' : 'danger';
    const progressCurrent = Math.min(meta.defeated ?? 0, meta.targetEnemies ?? 0);
    const progressTarget = meta.targetEnemies || 0;
    const charges = hero.ultimateCharges || 0;

    this.combatZone.innerHTML = `
      <div class="combat-status-row">
        <div class="enemy-health-block">
          <div class="enemy-health-label">
            <span id="enemyNameText">${(enemy && creatureName(enemy)) || t('combat.enemyFallback')}</span>
            <span id="enemyHpText">${this._hpLabel(currentHp, maxHp, enemy, bossPhase)}</span>
          </div>
          <div class="health-track"><div id="enemyHpFill" class="health-fill ${hpClass}" style="width:${hpPct}%"></div></div>
        </div>
        <div class="question-progress" title="${t('combat.progressTitle')}"
             aria-label="${t('combat.progressAria', { done: progressCurrent, total: progressTarget })}">
          ${progressTarget ? `⚔ ${progressCurrent}/${progressTarget}` : ''}
        </div>
      </div>

      <div class="combat-badges">
        <span class="combat-badge ${hero.combo > 0 ? 'active' : ''}">🔥 ${t('combat.comboBadge', { combo: hero.combo || 0 })}</span>
        <span class="combat-badge ${hero.shieldActive ? 'active shield' : ''}">🛡️ ${hero.shieldActive ? t('combat.shieldReady') : t('combat.shieldAt')}</span>
        ${this._buildCritBadge(hero)}
        ${this._buildUltimateBadge(hero, charges)}
        ${meta.stageLabel ? `<span class="combat-badge stage">${meta.stageLabel}</span>` : ''}
      </div>

      <div class="math-problem" id="problemText" aria-label="${t('combat.problemAria', { a: problem.a, b: problem.b })}">${problem.promptText}</div>
      <div id="feedbackArea" class="feedback-area" aria-live="assertive"></div>
      <div id="speechArea" class="speech-area" aria-live="polite"></div>
      ${optionsHtml}
    `;

    if (manual) this._bindNumpad();
    else this._bindOptions(problem.options);
    this._bindUltimate();
  }

  /** Enemy HP readout, with the boss phase appended when there is one. */
  _hpLabel(currentHp, maxHp, enemy, bossPhase) {
    const hp = t('combat.hp', { current: currentHp, max: maxHp });
    return enemy?.phases ? hp + t('combat.phaseSuffix', { phase: bossPhase }) : hp;
  }

  /** Correct answers still needed before the hero's next critical hit. */
  _answersToCrit(hero) {
    const combo = hero.combo || 0;
    return CRIT_EVERY - (combo % CRIT_EVERY);
  }

  /** Highlights the turn on which the next correct answer will land a crit. */
  _buildCritBadge(hero) {
    const toCrit = this._answersToCrit(hero);
    const ready = toCrit === 1;
    const hint = ready
      ? t('combat.critNextHint')
      : t('combat.critEveryHint', { count: CRIT_EVERY });
    return `<span class="combat-badge crit-badge ${ready ? 'ready' : ''}" title="${hint}"
              aria-label="${ready ? t('combat.critReadyAria') : t('combat.critToAria', { count: toCrit })}">
        💥 ${ready ? t('combat.critReady') : t('combat.critIn', { count: toCrit })}
      </span>`;
  }

  /** Wording for the ultimate tooltip, shared by build and refresh. */
  _ultimateHint(hero, charges) {
    if (charges >= ULTIMATE_MAX_CHARGES) return t('combat.ultMax');
    const count = hero.answersToNextUltimate ?? ULTIMATE_STREAK;
    return charges > 0 ? t('combat.ultSpend', { count }) : t('combat.ultNeed', { count });
  }

  /**
   * Ultimate control, sized to sit inline with the other combat badges:
   * label, one pip per banked charge, and a bar filling toward the next one.
   */
  _buildUltimateBadge(hero, charges) {
    const pips = Array.from({ length: ULTIMATE_MAX_CHARGES }, (_, i) =>
      `<i class="ult-pip ${i < charges ? 'charged' : ''}"></i>`
    ).join('');
    const hint = this._ultimateHint(hero, charges);
    const progress = this._ultimateProgress(hero, charges);

    return `<button id="btnUltimate" type="button" class="combat-badge ult-badge ${charges > 0 ? 'ready' : ''}"
              ${charges > 0 ? '' : 'disabled'} title="${hint}"
              aria-label="${t('combat.ultAria', { charges, max: ULTIMATE_MAX_CHARGES, hint })}">
        <span class="ult-icon" aria-hidden="true">⚡</span>
        <span class="ult-name">${t('combat.ultimateButton')}</span>
        <span class="ult-pips" aria-hidden="true">${pips}</span>
        <span class="ult-track" aria-hidden="true"><i style="width:${progress.percent}%"></i></span>
        <span class="ult-steps" aria-hidden="true">${progress.label}</span>
      </button>`;
  }

  /** Progress toward the next charge, as both a percentage and a label. */
  _ultimateProgress(hero, charges) {
    if (charges >= ULTIMATE_MAX_CHARGES) return { percent: 100, label: 'MAX' };
    const done = ULTIMATE_STREAK - (hero.answersToNextUltimate ?? ULTIMATE_STREAK);
    return { percent: Math.round((done / ULTIMATE_STREAK) * 100), label: `${done}/${ULTIMATE_STREAK}` };
  }

  _bindUltimate() {
    const button = document.getElementById('btnUltimate');
    if (!button || !this.onUltimate) return;
    const fire = () => {
      if (this._locked || button.disabled) return;
      this.soundEngine.playClick();
      this.onUltimate();
    };
    button.onclick = fire;

    // Space is free in both answer modes, so it doubles as the ultimate key.
    // Bound by physical key code to stay layout-independent.
    this._ultKeyHandler = event => {
      if (event.repeat || (event.code !== 'Space' && event.code !== 'KeyU')) return;
      event.preventDefault();
      fire();
    };
    window.addEventListener('keydown', this._ultKeyHandler);
  }

  /** Refreshes the ultimate and crit badges in place, without a full rebuild. */
  updateUltimate(hero) {
    const button = this.combatZone?.querySelector('#btnUltimate');
    if (button) {
      const charges = hero.ultimateCharges || 0;
      const hint = this._ultimateHint(hero, charges);
      const progress = this._ultimateProgress(hero, charges);

      button.classList.toggle('ready', charges > 0);
      button.disabled = charges <= 0 || this._locked;
      button.title = hint;
      button.setAttribute('aria-label', t('combat.ultAria', { charges, max: ULTIMATE_MAX_CHARGES, hint }));
      button.querySelectorAll('.ult-pip').forEach((pip, i) => pip.classList.toggle('charged', i < charges));
      const fill = button.querySelector('.ult-track > i');
      if (fill) fill.style.width = `${progress.percent}%`;
      const steps = button.querySelector('.ult-steps');
      if (steps) steps.textContent = progress.label;
    }

    const crit = this.combatZone?.querySelector('.crit-badge');
    if (crit) {
      const toCrit = this._answersToCrit(hero);
      const ready = toCrit === 1;
      crit.classList.toggle('ready', ready);
      crit.textContent = `💥 ${ready ? t('combat.critReady') : t('combat.critIn', { count: toCrit })}`;
      crit.setAttribute('aria-label', ready ? t('combat.critReadyAria') : t('combat.critToAria', { count: toCrit }));
    }
  }

  updateEnemyHp(enemy, bossPhase = 1) {
    if (!enemy) return;
    const nameText = document.getElementById('enemyNameText');
    const hpText = document.getElementById('enemyHpText');
    const hpFill = document.getElementById('enemyHpFill');
    const maxHp = enemy.maxHp || enemy.hpMax || 1;
    const currentHp = Math.max(0, Number(enemy.currentHp ?? 0));
    const hpPct = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
    const hpClass = hpPct > 50 ? 'healthy' : hpPct > 25 ? 'warning' : 'danger';

    if (nameText) nameText.textContent = creatureName(enemy) || t('combat.enemyFallback');
    if (hpText) {
      hpText.textContent = this._hpLabel(currentHp, maxHp, enemy, bossPhase);
    }
    if (hpFill) {
      hpFill.style.width = `${hpPct}%`;
      hpFill.className = `health-fill ${hpClass}`;
    }
  }

  _bindOptions(options) {
    document.querySelectorAll('.option-btn').forEach(btn => {
      btn.onclick = () => {
        if (this._locked) return;
        this.soundEngine.playClick();
        this.lockInput();
        this._lastPick = Number(btn.dataset.answer);
        this.onAnswer(this._lastPick);
      };
    });

    this._keyHandler = (event) => {
      if (this._locked || event.repeat) return;
      const idx = Number(event.key) - 1;
      if (idx >= 0 && idx < options.length) {
        event.preventDefault();
        const button = document.getElementById(`optionBtn_${idx}`);
        button?.click();
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  }

  _buildNumpad() {
    this.numpadValue = '';
    return `
      <div class="numpad-container" role="group" aria-label="${t('combat.numpadAria')}">
        <div class="numpad-display" id="numpadDisplay" aria-live="polite">_</div>
        <div class="numpad-grid">
          ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="num-btn interactive" data-digit="${n}">${n}</button>`).join('')}
          <button class="num-btn interactive danger" data-digit="clear" aria-label="${t('combat.clearAria')}">⌫</button>
          <button class="num-btn interactive" data-digit="0">0</button>
          <button class="num-btn interactive confirm" data-digit="enter" aria-label="${t('combat.confirmAria')}">✓</button>
        </div>
      </div>`;
  }

  _bindNumpad() {
    const display = document.getElementById('numpadDisplay');
    const refresh = () => { if (display) display.textContent = this.numpadValue || '_'; };
    const submit = () => {
      if (this._locked || !this.numpadValue) return;
      const answer = Number(this.numpadValue);
      this.lockInput();
      this._lastPick = answer;
      // The submitted value stays on the display so the resolution styling has
      // something to colour; the next problem rebuilds the pad from scratch.
      this.numpadValue = '';
      this.onAnswer(answer);
    };

    document.querySelectorAll('.num-btn').forEach(btn => {
      btn.onclick = () => {
        if (this._locked) return;
        this.soundEngine.playClick();
        const digit = btn.dataset.digit;
        if (digit === 'clear') this.numpadValue = this.numpadValue.slice(0, -1);
        else if (digit === 'enter') return submit();
        else if (this.numpadValue.length < 3) this.numpadValue += digit;
        refresh();
      };
    });

    this._keyHandler = (event) => {
      if (this._locked || event.repeat) return;
      if (/^[0-9]$/.test(event.key)) {
        if (this.numpadValue.length < 3) this.numpadValue += event.key;
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        this.numpadValue = this.numpadValue.slice(0, -1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        submit();
      } else return;
      refresh();
    };
    window.addEventListener('keydown', this._keyHandler);
  }

  lockInput() {
    this._locked = true;
    this.combatZone?.classList.add('input-locked');
    this.combatZone?.querySelectorAll('button').forEach(button => { button.disabled = true; });
  }

  /**
   * `correctAnswer` is empty for hits the player did not answer for — the
   * ultimate — so the answer clause is dropped rather than left dangling.
   */
  showCorrectFeedback(correctAnswer, label = null) {
    const area = document.getElementById('feedbackArea');
    const hasAnswer = correctAnswer !== '' && correctAnswer != null;
    const lead = label ?? t('combat.correct');
    if (area) {
      area.className = 'feedback-area correct';
      area.textContent = hasAnswer
        ? `✅ ${lead} ${t('combat.answerWas', { answer: correctAnswer })}`
        : `✅ ${lead}`;
    }
    if (hasAnswer) this._markAnswer(correctAnswer, true);
  }

  showErrorExplanation(text, correctAnswer = null) {
    const area = document.getElementById('feedbackArea');
    if (area) {
      area.className = 'feedback-area error';
      area.textContent = `💡 ${text}`;
    }
    this._markAnswer(correctAnswer, false);
  }

  /**
   * Colours the submitted control green or red and, on a miss, highlights the
   * option that was actually correct so the player sees the right answer.
   */
  _markAnswer(correctAnswer, isCorrect) {
    const pick = this._lastPick;
    const buttons = this.combatZone?.querySelectorAll('.option-btn');
    if (buttons?.length) {
      for (const button of buttons) {
        const value = Number(button.dataset.answer);
        if (value === pick) button.classList.add(isCorrect ? 'answer-correct' : 'answer-wrong');
        else if (!isCorrect && correctAnswer != null && value === correctAnswer) button.classList.add('answer-reveal');
      }
      return;
    }
    const display = document.getElementById('numpadDisplay');
    if (!display) return;
    display.textContent = pick != null ? String(pick) : display.textContent;
    display.classList.add(isCorrect ? 'answer-correct' : 'answer-wrong');
  }

  clearSpeechBubbles() {
    const area = document.getElementById('centerSpeechOverlay') || document.getElementById('speechArea');
    if (area) area.innerHTML = '';
  }

  clearEnemySpeechBubble() {
    const area = document.getElementById('centerSpeechOverlay') || document.getElementById('speechArea');
    if (area) {
      const existing = area.querySelector('.boss-speech');
      if (existing) existing.remove();
    }
  }

  showHeroSpeech(text, heroX = null, canvasWidth = 1000, bottomOffset = null) {
    const area = document.getElementById('centerSpeechOverlay') || document.getElementById('speechArea');
    if (!area) return;
    const existing = area.querySelector('.hero-speech');
    if (existing) existing.remove();
    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble hero-speech';
    bubble.textContent = text;
    const xPct = heroX != null ? (heroX / canvasWidth) * 100 : 37.5;
    bubble.style.left = `${xPct}%`;
    if (bottomOffset !== null) {
      bubble.style.bottom = `calc(100% - var(--ground-y, 50vh) + ${bottomOffset}px)`;
    }
    area.appendChild(bubble);
  }

  showBossSpeech(text, enemyX = null, canvasWidth = 1000, bottomOffset = null) {
    const area = document.getElementById('centerSpeechOverlay') || document.getElementById('speechArea');
    if (!area) return;
    const existing = area.querySelector('.boss-speech');
    if (existing) existing.remove();
    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble boss-speech';
    bubble.textContent = text;
    const xPct = enemyX != null ? (enemyX / canvasWidth) * 100 : 62.5;
    bubble.style.left = `${xPct}%`;
    if (bottomOffset !== null) {
      bubble.style.bottom = `calc(100% - var(--ground-y, 50vh) + ${bottomOffset}px)`;
    }
    area.appendChild(bubble);
  }

  updateHearts(hearts, maxHearts = 5) {
    if (!this.heartsContainer) return;
    // Rebuilding every HUD tick would restart the idle beat animation, so the
    // markup is only regenerated when the actual values change.
    if (hearts === this._lastHearts && maxHearts === this._lastMaxHearts) return;
    const lostOne = this._lastHearts != null && this._lastMaxHearts === maxHearts && hearts === this._lastHearts - 1;
    this._lastHearts = hearts;
    this._lastMaxHearts = maxHearts;

    this.heartsContainer.innerHTML = Array.from({ length: maxHearts }, (_, i) => {
      const isFilled = i < hearts;
      const breaking = lostOne && i === hearts ? ' breaking' : '';
      // A hollow glyph for spent hearts reads instantly; a dimmed solid one
      // just looks like a rendering glitch.
      const glyph = isFilled || breaking ? '♥' : '♡';
      return `<span class="heart-icon ${isFilled ? 'filled' : 'empty'}${breaking}" aria-hidden="true">${glyph}</span>`;
    }).join('');
    this.heartsContainer.classList.toggle('critical', hearts > 0 && hearts <= Math.max(1, Math.floor(maxHearts * 0.34)));
    this.heartsContainer.setAttribute('aria-label', t('hud.healthAria', { current: hearts, max: maxHearts }));
  }

  setPaused(paused) {
    if (!this.combatZone) return;
    // Release the keyboard while paused. The answer and ultimate keys are bound
    // on `window` and swallow Space, which would otherwise stop the pause menu
    // being operated from the keyboard at all. Resuming re-renders the problem,
    // which rebinds them.
    if (paused) this._unbindKeyboard();
    this.combatZone.classList.toggle('paused', paused);
    this.combatZone.style.pointerEvents = paused ? 'none' : 'auto';
  }

  _unbindKeyboard() {
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    if (this._ultKeyHandler) {
      window.removeEventListener('keydown', this._ultKeyHandler);
      this._ultKeyHandler = null;
    }
  }

  hide() {
    this._unbindKeyboard();
    const overlay = document.getElementById('centerSpeechOverlay');
    if (overlay) overlay.innerHTML = '';
    if (this.combatZone) {
      this.combatZone.classList.remove('is-active');
      this.combatZone.style.display = '';
      this.combatZone.style.pointerEvents = 'none';
      this.combatZone.classList.remove('input-locked', 'paused', 'boss-combat');
      this.combatZone.innerHTML = '';
    }
    this._locked = false;
  }
}
