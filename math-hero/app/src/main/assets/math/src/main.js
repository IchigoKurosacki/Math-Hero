import { SaveSystem } from './storage/saveSystem.js';
import { MathEngine } from './math/mathEngine.js';
import { SoundEngine } from './audio/soundEngine.js';
import { GameRenderer } from './engine/renderer.js';
import { Hero, ACHIEVEMENTS, ULTIMATE_DAMAGE } from './game/hero.js';
import {
  REGIONS, SECRET_BOSS, SECRET_REGION, SECRET_ENEMIES,
  rollStageEnemies, rollRegulars, shuffled,
} from './game/bestiary.js';
import { profileFor } from './engine/enemyAnimations.js';
import { BossPhaseController } from './engine/bossPhaseController.js';
import { SessionScheduler } from './engine/sessionScheduler.js';
import { RewardSystem } from './game/rewardSystem.js';
import { AssetManager } from './assets/assetManager.js';
import { MenuSystem } from './ui/menus.js';
import { MathUI } from './ui/mathUI.js';
import { randomQuote } from './game/dialogs.js';
import {
  t, setLanguage, detectLanguage, isKnownLanguage, applyStaticText,
  regionName, stageFullName, achievementTitle,
} from './i18n/index.js';

const ACTIVE_STATES = new Set(['WALKING', 'COMBAT']);

/**
 * Фіксує горизонтальне положення на дотикових пристроях.
 *
 * Блокування орієнтації дозволене лише у повноекранному режимі й лише з жесту
 * користувача, тому вішається на перший дотик. Там, де API немає (iOS Safari),
 * лишаються CSS-ворота з проханням повернути пристрій — вони і є основною
 * гарантією, а це блокування прибирає зайвий крок там, де може.
 */
function lockLandscapeOnFirstTouch() {
  if (typeof window === 'undefined') return;
  if (!window.matchMedia?.('(pointer: coarse)').matches) return;

  const attempt = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
      await window.screen?.orientation?.lock?.('landscape');
    } catch {
      // Пристрій або браузер не дозволяє — гра лишається придатною, просто
      // просить повернути екран самостійно.
    }
  };
  window.addEventListener('pointerdown', attempt, { once: true });
}

class GameApp {
  constructor() {
    this.saveSystem = new SaveSystem();
    // Мова — перше, що застосовується: далі кожен екран і кожен тост уже
    // будуються перекладеними. Профіль без вибору бере мову браузера.
    this.applyStoredLanguage();
    document.body.classList.toggle('reduced-motion', !!this.saveSystem.data.settings.reducedMotion);
    document.body.classList.toggle('high-contrast', !!this.saveSystem.data.settings.highContrast);
    this.mathEngine = new MathEngine(this.saveSystem);
    this.soundEngine = new SoundEngine(this.saveSystem);
    this.assetManager = new AssetManager();
    this.scheduler = new SessionScheduler();
    this.rewardSystem = new RewardSystem(this.saveSystem);
    this.canvas = document.getElementById('gameCanvas');
    this.renderer = new GameRenderer(this.canvas, this.assetManager);
    this.hero = new Hero(this.saveSystem);
    this.bossController = new BossPhaseController();

    this.menuSystem = new MenuSystem(
      this.saveSystem,
      this.soundEngine,
      config => this.startSession(config),
      () => this.resumeGame(),
      () => this.restartStage(),
      () => this.returnToMenu(),
      () => this.finishInfiniteRun()
    );
    this.mathUI = new MathUI(
      this.soundEngine,
      answer => this.handleAnswer(answer),
      () => this.activateUltimate(),
    );

    this.state = 'LOADING';
    this.previousState = 'MENU';
    this.sessionConfig = null;
    this.currentRegion = null;
    this.currentStage = null;
    this.enemyList = [];
    this.enemyIndex = 0;
    this.currentEnemy = null;
    this.currentProblem = null;
    this.isBoss = false;
    this.answerLocked = false;
    this.sessionFinalized = false;

    this.sessionKillRewards = [];
    this.sessionCorrectCount = 0;
    this.sessionAnsweredCount = 0;
    this.targetEnemies = 10;
    this.sessionStartTime = 0;
    this.worldProgress = 0;
    this.totalSessionKills = 0;

    this.heroX = 170;
    this.enemyX = 800;
    this.heroState = 'idle';
    this.enemyState = 'idle';
    this.infiniteWave = 0;
    this.infiniteKills = 0;
    this.animTime = 0;
    this.pauseStartedAt = 0;
    this.lastFrameTime = performance.now();
    this.isAdvancingToNext = false;
    this.isHoppingBack = false;
    this.recoilPhase = null;
    // Defeated enemies keep rendering for a short collapse animation after the
    // combat state has already moved on.
    this.deathAnim = null;
    this.dustTimer = 0;

    // Меню перемальовує себе саме; HUD і статична оболонка живуть поза ним,
    // тому їх освіжаємо тут.
    this.menuSystem.onLanguageChange = () => {
      applyStaticText();
      this.updateHUD();
    };

    lockLandscapeOnFirstTouch();
    this.setupHUDListeners();
    this.showLoadingScreen();
    this.loadAssets();
    requestAnimationFrame(timestamp => this.gameLoop(timestamp));
  }

  /**
   * Мова з профілю, або мова браузера при першому запуску. Вибір одразу
   * записується, щоб гра не «передумала» після зміни налаштувань браузера.
   */
  applyStoredLanguage() {
    const settings = this.saveSystem.data.settings;
    if (!isKnownLanguage(settings.language)) {
      settings.language = detectLanguage();
      this.saveSystem.save();
    }
    setLanguage(settings.language);
    applyStaticText();
  }

  showLoadingScreen() {
    const container = document.getElementById('modalContainer');
    container.style.display = 'flex';
    container.innerHTML = `
      <div class="modal-content game-panel loading-card" role="status" aria-live="polite">
        <img class="game-logo" src="./assets/ui/math-hero-logo.png" alt="${t('app.logoAlt')}" />
        <p class="menu-description">${t('app.loadingLead')}</p>
        <div class="loading-track"><div id="loadingBar" class="loading-fill"></div></div>
        <p id="loadingText">0 / 0</p>
        <p id="loadingError" class="loading-error" hidden></p>
      </div>`;
  }

  async loadAssets() {
    const bar = document.getElementById('loadingBar');
    const text = document.getElementById('loadingText');
    const error = document.getElementById('loadingError');
    const result = await this.assetManager.loadAll((loaded, total) => {
      if (bar) bar.style.width = `${Math.round((loaded / Math.max(1, total)) * 100)}%`;
      if (text) text.textContent = `${loaded} / ${total}`;
    });
    if (result.failed && error) {
      error.hidden = false;
      error.textContent = t('app.assetsFailed', { count: result.failed });
    }
    await new Promise(resolve => setTimeout(resolve, 250));
    this.state = 'MENU';
    this.updateHUD();
    this.menuSystem.showMainMenu();
  }

  setupHUDListeners() {
    document.getElementById('btnPause').onclick = () => {
      this.soundEngine.playClick();
      this.pauseGame();
    };
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape' && ACTIVE_STATES.has(this.state)) this.pauseGame();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (ACTIVE_STATES.has(this.state)) this.pauseGame();
        this.soundEngine.pauseBgm();
        this.soundEngine.suspend();
      } else {
        this.soundEngine.resume();
        if (this.state === 'PAUSED') {
          // Stay paused, but resume context for interaction
        } else if (this.soundEngine.currentBgmKey && !this.soundEngine._bgmPaused) {
          this.soundEngine.resumeCurrentBgm();
        }
      }
    });
  }

  pauseGame() {
    if (!ACTIVE_STATES.has(this.state)) return;
    this.previousState = this.state;
    this.state = 'PAUSED';
    // Answer time feeds the spaced-repetition schedule, so the pause must be
    // deducted from it. A tab switch auto-pauses; without this, coming back
    // hours later would record an hours-long "answer" and bar that fact from
    // ever reaching MASTERED, which needs an average under four seconds.
    this.pauseStartedAt = Date.now();
    this.scheduler.pause();
    this.bossController.pause();
    this.soundEngine.pauseBgm();
    this.mathUI.setPaused(true);
    this.menuSystem.showPauseMenu({ isInfinite: this.sessionConfig?.mode === 'infinite' });
  }

  resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.state = this.previousState || 'COMBAT';
    if (this.currentProblem && this.pauseStartedAt) {
      this.currentProblem.startTime += Date.now() - this.pauseStartedAt;
    }
    this.pauseStartedAt = 0;
    this.scheduler.resume();
    this.bossController.resume();
    this.soundEngine.resumeBgm();
    this.mathUI.setPaused(false);
    this.menuSystem.hide();
    if (this.state === 'COMBAT' && this.currentProblem) this.presentCurrentProblem();
  }

  /**
   * Tears the finished session down. Every route out of combat goes through
   * here, so the menus can never sit on top of live session state — a stage
   * name stranded in the HUD, or battle music playing under the main menu.
   * The caller decides which screen comes next.
   */
  endSession() {
    this.scheduler.newSession();
    this.bossController.reset();
    // The menu has its own cinematic theme; swap rather than fall silent.
    this.soundEngine.startMenuBgm();
    this.mathUI.hide();
    this.renderer.resetScene();
    this.currentProblem = null;
    this.currentEnemy = null;
    this.deathAnim = null;
    this.isBoss = false;
    this.isAdvancingToNext = false;
    this.isHoppingBack = false;
    this.answerLocked = false;
    this.pauseStartedAt = 0;
    this.sessionConfig = null;
    this.currentStage = null;
    this.state = 'MENU';
    document.getElementById('regionTitle').textContent = 'Math Hero RPG';
    this.updateHUD();
  }

  returnToMenu() {
    this.endSession();
    this.menuSystem.showMainMenu();
  }

  restartStage() {
    if (this.sessionConfig) this.startSession({ ...this.sessionConfig });
  }

  finishInfiniteRun() {
    if (this.sessionConfig?.mode !== 'infinite' || this.sessionFinalized) return;
    this.onStageVictory();
  }

  startSession(config) {
    this.scheduler.newSession();
    this.rewardSystem.resetApplied();
    this.mathEngine.resetForSession(config);
    this.bossController.reset();
    this.sessionConfig = { ...config };
    this.sessionFinalized = false;
    this.answerLocked = false;
    this.sessionKillRewards = [];
    this.sessionCorrectCount = 0;
    this.sessionAnsweredCount = 0;
    this.totalSessionKills = 0;
    this.sessionStartTime = performance.now();
    this.worldProgress = 0;
    this.deathAnim = null;
    this.isAdvancingToNext = false;
    this.isHoppingBack = false;
    this.recoilPhase = null;
    this.renderer.resetScene();

    this.hero.refreshConfig();
    this.hero.resetHearts();
    // The secret run happens in the Rift, not in any campaign region.
    this.currentRegion = config.mode === 'secret'
      ? SECRET_REGION
      : REGIONS.find(region => region.id === (config.regionId || 1)) || REGIONS[0];
    this.currentStage = config.stageData || null;
    const plannedCount = Math.max(5, Number(this.currentStage?.targetEnemies || config.targetEnemies || 10));

    this.renderer.setRegionTheme(this.currentRegion);
    this.renderer.setStagePresentation(this.currentStage || {
      timeOfDay: config.mode === 'mastery' || config.mode === 'secret' ? 'night' : 'day',
      weather: config.mode === 'mastery' ? 'mist' : 'none',
    });
    this.renderer.setAccessibility(this.saveSystem.data.settings);
    if (config.mode === 'secret') {
      this.soundEngine.startBossPhaseBgm('boss_secret', 1);
    } else {
      this.soundEngine.startStageLevelBgm(this.currentRegion?.id || 1, this.currentStage?.id || 1, 0, config.mode);
    }

    if (config.mode === 'infinite') {
      this.infiniteWave = 0;
      this.infiniteKills = 0;
      this.enemyList = [];
      this.generateInfiniteWave();
    } else if (config.mode === 'secret') {
      this.enemyList = this.createSecretBossQueue();
    } else if (config.mode === 'campaign' && this.currentStage) {
      // Rolled per attempt, so replaying a stage shows a different line-up.
      this.enemyList = structuredClone(rollStageEnemies(this.currentStage));
    } else {
      this.enemyList = this.createTrainingEnemyQueue(config.mode, plannedCount);
    }

    // The queue is the level. Deriving the goal from it keeps the roster
    // authoritative, so a stage can never continue past its final enemy.
    this.targetEnemies = config.mode === 'infinite'
      ? Number.POSITIVE_INFINITY
      : this.enemyList.length;

    this.enemyIndex = 0;
    this.menuSystem.hide();
    document.getElementById('regionTitle').textContent = this.currentStage ? stageFullName(this.currentStage, this.currentRegion) : this.getModeTitle(config.mode);
    this.updateHUD();
    this.spawnNextEnemy();
  }

  /**
   * The secret-boss level is a gauntlet of every region champion, in region
   * order, with Пан Помилкус waiting at the very end. Their rising health
   * (4→6) forms a natural difficulty ramp.
   *
   * Glitched intruders are dealt in between them at random, so the run never
   * plays out as the same eight fights twice.
   *
   * Deliberately not filtered by campaign progress: the boss can also be
   * reached through the practice route, where only region 1 is unlocked, and
   * filtering there would collapse the gauntlet into eight identical elites.
   */
  createSecretBossQueue() {
    const champions = REGIONS
      .map(region => region.elite)
      .filter(Boolean)
      .map(elite => {
        const hp = Math.max(3, elite.hp || 4);
        return { ...structuredClone(elite), hp, hpMax: hp, isElite: true };
      });

    const intruders = shuffled(SECRET_ENEMIES).map(enemy => {
      const hp = Math.max(3, enemy.hp || 4);
      return { ...structuredClone(enemy), hp, hpMax: hp, isGlitch: true };
    });

    // One intruder per champion, dropped on either side of them, so the two
    // rosters interleave without ever losing the region order of the elites.
    const queue = [];
    champions.forEach((champion, index) => {
      const intruder = intruders[index % intruders.length];
      if (Math.random() < 0.5) queue.push(intruder, champion);
      else queue.push(champion, intruder);
    });
    queue.push({ ...structuredClone(SECRET_BOSS) });
    return queue;
  }

  /**
   * Builds the full training roster up front so no top-up is ever needed.
   * Drawn with the same even odds as a campaign stage, so practice runs vary
   * their opponents too.
   */
  createTrainingEnemyQueue(mode, count) {
    return rollRegulars(this.currentRegion, Math.max(1, count)).map(source => {
      const hp = Math.max(1, mode === 'mastery' ? 2 : source.hp || 1);
      return { ...structuredClone(source), hp, hpMax: hp };
    });
  }

  getModeTitle(mode) {
    const known = ['single', 'mixed', 'weak', 'mastery', 'infinite', 'secret'];
    return known.includes(mode) ? t(`mode.${mode}`) : regionName(this.currentRegion);
  }

  generateInfiniteWave() {
    this.infiniteWave++;
    const unlocked = REGIONS.filter(region => this.saveSystem.data.campaign[region.id]?.unlocked);
    const regions = unlocked.length ? unlocked : [REGIONS[0]];
    const regularCount = 4 + Math.min(3, Math.floor(this.infiniteWave / 4));
    const queue = [];
    for (let index = 0; index < regularCount; index++) {
      const region = regions[Math.floor(Math.random() * regions.length)];
      const source = region.enemies[Math.floor(Math.random() * region.enemies.length)];
      const hpScale = 1 + Math.floor((this.infiniteWave - 1) / 3) * 0.35;
      const hp = Math.max(1, Math.round((source.hp || 1) * hpScale));
      queue.push({ ...structuredClone(source), hp, hpMax: hp });
    }
    if (this.infiniteWave % 2 === 0) {
      const region = regions[Math.floor(Math.random() * regions.length)];
      const hp = Math.max(3, Math.round((region.elite.hp || 4) * (1 + this.infiniteWave * 0.08)));
      queue.push({ ...structuredClone(region.elite), hp, hpMax: hp });
    }
    if (this.infiniteWave % 4 === 0) {
      const region = regions[Math.floor(Math.random() * regions.length)];
      queue.push({ ...structuredClone(region.boss), hpMax: Math.round(region.boss.hpMax * (1 + this.infiniteWave * 0.05)) });
    }
    this.enemyList = queue;
    this.enemyIndex = 0;
    this.updateHUD();
  }

  spawnNextEnemy() {
    if (this.sessionFinalized) return;
    this.mathUI.clearSpeechBubbles();
    if (this.enemyIndex >= this.enemyList.length) {
      // Infinite mode rolls a new wave; every other mode ends with its roster.
      if (this.sessionConfig.mode !== 'infinite') {
        this.onStageVictory();
        return;
      }
      this.generateInfiniteWave();
    }

    const enemyData = this.enemyList[this.enemyIndex];
    this.isBoss = !!enemyData.phases || enemyData.id?.startsWith('boss_');
    this.saveSystem.recordEncounter(enemyData.id);
    if (this.isBoss) {
      this.currentEnemy = this.bossController.initBoss(enemyData);
      this.soundEngine.playBossRoar();
      this.soundEngine.startBossPhaseBgm(this.currentEnemy.id || 'boss_1', this.bossController.phase || 1);
    } else {
      const maxHp = Math.max(1, Number(enemyData.hpMax || enemyData.hp || 1));
      this.currentEnemy = { ...enemyData, maxHp, currentHp: maxHp };
      this.soundEngine.startStageLevelBgm(
        this.currentRegion?.id || 1,
        this.currentStage?.id || 1,
        this.enemyIndex,
        this.sessionConfig?.mode || 'campaign'
      );
    }
    this.heroX = Math.max(105, Math.min(190, this.renderer.width * 0.22));
    this.enemyX = Math.max(640, this.renderer.width + 100);
    this.isHoppingBack = false;
    this.state = 'WALKING';
    this.heroState = 'run';
    this.enemyState = 'idle';
    this.currentProblem = null;
    this.mathUI.hide();
    this.updateHUD();
  }

  gameLoop(now) {
    if (document.hidden) {
      requestAnimationFrame(time => this.gameLoop(time));
      return;
    }
    // Cap rendering loop at ~60 FPS max (15ms min delta) to prevent 90Hz/120Hz heating
    if (this.lastFrameTime && (now - this.lastFrameTime < 15)) {
      requestAnimationFrame(time => this.gameLoop(time));
      return;
    }

    const dt = Math.min(0.05, (now - (this.lastFrameTime || now)) / 1000);
    this.lastFrameTime = now;

    if (this.state === 'PAUSED') {
      requestAnimationFrame(time => this.gameLoop(time));
      return;
    }

    // A hit-stop freeze-frame halts simulation but still lets the renderer
    // tick its shake, flash and freeze timers.
    const frozen = this.renderer.timeScale === 0;
    if (this.state !== 'LOADING' && !frozen) {
      const speed = this.saveSystem.data.settings.animationSpeed || 1;
      this.animTime += dt * speed;
      this.updateDeathAnimation(dt);
      this.updateFootstepDust(dt);
      if (this.isBoss) {
        this.bossController.update(dt);
        this.processBossEvents();
      }
      if (this.state === 'WALKING') {
        this.worldProgress += 190 * dt;
        this.renderer.setWorldProgress(this.worldProgress);
        const centerX = this.renderer.width * 0.5;
        const enemySizeFactor = this.isBoss ? (this.currentEnemy?.size || 2) * 1.2 : (this.currentEnemy?.size || 1);
        const heroOffset = Math.round(125 + (enemySizeFactor - 1) * 70);
        const enemyOffset = Math.round(125 + (enemySizeFactor - 1) * 170);

        const targetHeroX = Math.max(100, centerX - heroOffset);
        const targetEnemyX = Math.min(this.renderer.width - 100, centerX + enemyOffset);

        if (this.heroX < targetHeroX) {
          this.heroX = Math.min(targetHeroX, this.heroX + 240 * dt);
          this.heroState = 'run';
        }
        if (this.enemyX > targetEnemyX) {
          this.enemyX = Math.max(targetEnemyX, this.enemyX - 320 * dt);
        }

        if (this.heroX >= targetHeroX && this.enemyX <= targetEnemyX) {
          this.heroX = targetHeroX;
          this.enemyX = targetEnemyX;
          this.state = 'COMBAT';
          this.heroState = 'idle';
          this.enemyState = 'idle';
          // Show enemy speech bubble on encounter
          if (this.currentEnemy) {
            if (this.isBoss && this.currentEnemy.quote) {
              this.mathUI.showBossSpeech(this.currentEnemy.quote, this.enemyX, this.renderer.width, this.enemyTopOffset());
            } else if (this.currentEnemy.isElite || this.currentEnemy.id?.includes('elite')) {
              this.mathUI.showBossSpeech(randomQuote('elite'), this.enemyX, this.renderer.width, this.enemyTopOffset());
            } else {
              this.mathUI.showBossSpeech(randomQuote('enemy'), this.enemyX, this.renderer.width, this.enemyTopOffset());
            }
          }
          this.nextQuestion();
        }
      }
      if (this.isAdvancingToNext) {
        this.heroX += 320 * dt;
        this.worldProgress += 240 * dt;
        this.renderer.setWorldProgress(this.worldProgress);
        if (this.heroX >= this.renderer.width + 60) {
          this.isAdvancingToNext = false;
          this.spawnNextEnemy();
        }
      }
      if (this.isHoppingBack) {
        const centerX = this.renderer.width * 0.5;
        const enemySizeFactor = this.isBoss ? (this.currentEnemy?.size || 2) * 1.2 : (this.currentEnemy?.size || 1);
        const heroOffset = Math.round(125 + (enemySizeFactor - 1) * 70);
        const targetHeroX = Math.max(100, centerX - heroOffset);
        const recoilTargetX = targetHeroX - 75;
        if (!this.recoilPhase) {
          this.heroX -= 340 * dt;
          if (this.heroX <= recoilTargetX) this.recoilPhase = 'return';
        } else {
          this.heroX += 260 * dt;
          if (this.heroX >= targetHeroX) {
            this.heroX = targetHeroX;
            this.isHoppingBack = false;
            this.recoilPhase = null;
          }
        }
      }
      this.updateSpeechPositions();
      this.mathUI.updateEnemyHp(this.currentEnemy, this.bossController?.phase || 1);
    }
    if (this.state !== 'LOADING') this.renderer.update(dt);

    this.renderer.render({
      hero: this.hero,
      heroX: this.heroX || Math.max(105, Math.min(190, this.renderer.width * 0.22)),
      enemyX: this.enemyX,
      currentEnemy: this.currentEnemy,
      isBoss: this.isBoss,
      bossPhase: this.bossController.phase,
      bossInvulnerable: this.isBoss && this.bossController.isInvulnerable,
      bossEvolution: this.getBossEvolution(),
      heroState: this.heroState,
      enemyState: this.enemyState,
      dying: this.deathAnim,
      heroDanger: ACTIVE_STATES.has(this.state) && this.hero.maxHearts > 0
        ? Math.max(0, 1 - this.hero.hearts / Math.max(1, this.hero.maxHearts * 0.4))
        : 0,
    }, this.animTime);
    requestAnimationFrame(time => this.gameLoop(time));
  }

  /**
   * Evolution state for the renderer while a boss is between phases.
   * Null whenever the boss is not transforming.
   */
  getBossEvolution() {
    if (!this.isBoss || !this.currentEnemy || !this.bossController.isInvulnerable) return null;
    const { previousPhase, phase } = this.bossController;
    if (phase <= previousPhase) return null;
    return { progress: this.bossController.transitionProgress, fromPhase: previousPhase, toPhase: phase };
  }

  /** Keeps a defeated enemy on screen until its collapse animation finishes. */
  updateDeathAnimation(dt) {
    if (!this.deathAnim) return;
    this.deathAnim.timer -= dt;
    if (this.deathAnim.timer <= 0) this.deathAnim = null;
  }

  /** Throttled dust puffs kicked up while the hero is running. */
  updateFootstepDust(dt) {
    if (this.heroState !== 'run' && this.heroState !== 'walk') {
      this.dustTimer = 0;
      return;
    }
    this.dustTimer -= dt;
    if (this.dustTimer > 0) return;
    this.dustTimer = 0.13;
    this.renderer.particles.spawnDust(this.heroX - 24, this.renderer.height * 0.72, -1, 3);
  }

  /**
   * Screen-space anchor for combat VFX, derived from the actual sprite metrics
   * so effects land on the character instead of a hard-coded height.
   */
  combatAnchor(target) {
    const groundY = this.renderer.height * 0.72;
    const sprites = this.renderer.sprites;
    if (target === 'hero') {
      return { x: this.heroX, y: groundY - sprites.heroTopOffset(this.hero) * 0.55 };
    }
    if (!this.currentEnemy) return { x: this.enemyX, y: groundY - 110 };
    return { x: this.enemyX, y: groundY - Math.max(60, this.enemyTopOffset()) * 0.55 };
  }

  /** Visual height of the active enemy, shared by VFX anchors and speech bubbles. */
  enemyTopOffset() {
    const sprites = this.renderer.sprites;
    return sprites.spriteTopOffset(this.currentEnemy, {
      isBoss: this.isBoss,
      phase: this.bossController.phase,
      animTime: this.animTime,
      heroHeight: sprites.heroTopOffset(this.hero),
      groundY: this.renderer.height * 0.72,
    });
  }

  updateSpeechPositions() {
    if (!this.renderer?.width || !this.renderer?.height) return;
    const heroBubble = document.querySelector('.hero-speech');
    if (heroBubble) {
      const xPct = (this.heroX / this.renderer.width) * 100;
      heroBubble.style.left = `${xPct}%`;
      heroBubble.style.bottom = `calc(100% - var(--ground-y, 50vh) + ${this.renderer.sprites.heroTopOffset(this.hero) - 25}px)`;
    }
    const enemyBubble = document.querySelector('.boss-speech');
    if (enemyBubble && this.currentEnemy) {
      enemyBubble.style.left = `${(this.enemyX / this.renderer.width) * 100}%`;
      enemyBubble.style.bottom = `calc(100% - var(--ground-y, 50vh) + ${this.enemyTopOffset() - 25}px)`;
      enemyBubble.style.top = '';
    }
  }

  processBossEvents() {
    for (const event of this.bossController.consumeEvents()) {
      if (event.type === 'phase-change') this.playEvolution(event);
      if (event.type === 'buffered-damage') {
        // Damage held back through a transition lands now, so the health bar
        // has to catch up here — the hit that caused it was reported as zero.
        this.mathUI.updateEnemyHp(this.currentEnemy, this.bossController.phase);
        if (event.result?.isDefeated && this.state === 'COMBAT') {
          this.answerLocked = true;
          this.onEnemyDefeated();
        }
      }
    }
  }

  /**
   * Boss evolution sequence: energy gathers, the silhouette transforms (drawn
   * by the sprite renderer), then the new form lands with a shockwave.
   */
  playEvolution(event) {
    const accent = this.currentEnemy?.color || '#a855f7';
    const groundY = this.renderer.height * 0.72;
    const anchor = this.combatAnchor('enemy');
    const particles = this.renderer.particles;

    // Every phase change routes through here — including one triggered by
    // buffered damage, which never touches the answer pipeline — so this is
    // the one place that can be trusted to escalate the music.
    this.soundEngine.startBossPhaseBgm(this.currentEnemy?.id || 'boss_1', event.phase);
    this.mathUI.showBossSpeech(event.title, this.enemyX, this.renderer.width, this.enemyTopOffset());
    particles.spawnEvolutionSurge(anchor.x, anchor.y, groundY, accent);
    particles.spawnStatusText(anchor.x, anchor.y - 120,
      event.isFinalPhase ? t('combat.finalForm') : t('boss.phase', { phase: event.phase }), accent, 30);
    this.renderer.shake(14, 2.6);
    this.renderer.flash('#ffffff', 0.3, 0.45);
    this.soundEngine.playBossPhaseTransition();

    // The release lands right as the silhouette resolves into the new form.
    const releaseDelay = Math.max(200, (event.durationMs || 1200) * 0.88);
    this.scheduler.delay(() => {
      if (!this.currentEnemy) return;
      const landing = this.combatAnchor('enemy');
      particles.spawnEvolutionRelease(landing.x, landing.y, groundY, accent);
      this.renderer.shake(30, 4);
      this.renderer.flash('#ffffff', 0.55, 0.4);
      this.renderer.hitStop(0.09);
      this.soundEngine.playVictory();
    }, releaseDelay, 'evolutionRelease');
  }

  nextQuestion() {
    if (this.state !== 'COMBAT' || this.sessionFinalized) return;
    // The enemy can die between this call being queued and it firing — a boss
    // finished off by damage buffered through a phase transition does exactly
    // that. Asking anyway would unlock input against nobody and burn a fact
    // out of the repeat cooldown without ever showing it.
    if (!this.currentEnemy || this.isAdvancingToNext) return;
    if (this.isBoss && this.bossController.isInvulnerable) {
      this.scheduler.delay(() => this.nextQuestion(), 120, 'waitBossTransition');
      return;
    }
    this.answerLocked = false;
    this.currentProblem = this.mathEngine.generateProblem({
      tables: this.sessionConfig.tables || this.currentStage?.tables || this.currentRegion.tables,
      mode: this.sessionConfig.mode,
      tier: this.sessionConfig.tier || this.currentStage?.tier || 3,
      currentEnemy: this.currentEnemy,
      isBoss: this.isBoss,
      stageNumber: this.currentStage?.stageNumber || 1,
    });
    this.presentCurrentProblem();
    this.updateHUD();
  }

  presentCurrentProblem() {
    if (!this.currentProblem || !this.currentEnemy) return;
    this.mathUI.showProblem(this.currentProblem, this.currentEnemy, this.hero, this.bossController.phase, {
      defeated: Math.min(this.totalSessionKills, this.targetEnemies),
      targetEnemies: Number.isFinite(this.targetEnemies) ? this.targetEnemies : 0,
      stageLabel: this.currentStage ? t('combat.stageLabel', { number: this.currentStage.stageNumber, tier: this.currentStage.tier }) : this.getModeTitle(this.sessionConfig.mode),
    });
  }

  handleAnswer(userAnswer) {
    if (this.state !== 'COMBAT' || this.answerLocked || !this.currentProblem) return;
    this.answerLocked = true;
    this.mathUI.lockInput();
    const problem = this.currentProblem;
    const timeMs = Math.max(0, Date.now() - problem.startTime);
    // Recording the fact and banking the streak are one answer, so they write
    // once. Only the synchronous part is covered — the delayed resolution that
    // may kill the enemy runs later and batches itself.
    const result = this.saveSystem.batch(() => {
      const outcome = this.mathEngine.onAnswer(problem, userAnswer, timeMs);
      this.sessionAnsweredCount++;
      this.currentProblem = null;
      if (outcome.isCorrect) this.handleCorrectAnswer(outcome);
      else this.handleIncorrectAnswer(outcome);
      return outcome;
    });
    this.updateHUD();
    return result;
  }

  handleCorrectAnswer(result) {
    this.sessionCorrectCount++;
    const heroResult = this.hero.onCorrectAnswer();
    this.saveSystem.data.stats.maxStreak = Math.max(this.saveSystem.data.stats.maxStreak || 0, this.hero.maxCombo);
    this.saveSystem.save();

    let damage = 1;
    let feedback = t('combat.correct');
    if (heroResult.isEmpowered) { damage = 2; feedback = t('combat.empowered'); this.soundEngine.playCrit(); }
    else if (heroResult.isCrit) { damage = 2; feedback = t('combat.critHit'); this.soundEngine.playCrit(); }
    else { this.soundEngine.playCorrect(); this.soundEngine.playHeroAttack(this.heroAttackSound()); }

    if (heroResult.ultimateGained) {
      feedback = t('combat.ultCharged');
      this.soundEngine.playCrit();
      const anchor = this.combatAnchor('hero');
      this.renderer.particles.spawnStatusText(anchor.x, anchor.y - 110, t('combat.ultimateReady'), '#c084fc', 26);
      this.renderer.flash('#ddd6fe', 0.28, 0.32);
      this.menuSystem.showToast(t('combat.ultimateHint'), 'level');
    }
    this.mathUI.updateUltimate(this.hero);

    this.mathUI.showCorrectFeedback(result.correctAnswer, feedback);
    this.mathUI.showHeroSpeech(randomQuote('heroCorrect'), this.heroX, this.renderer.width, this.renderer.sprites.heroTopOffset(this.hero));
    this.heroState = 'attack';
    this.enemyState = 'hurt';
    this.playAttackEffects(heroResult, damage);

    let phaseChanged = false;
    if (this.isBoss) {
      // Announcement, music and VFX for a new phase all belong to
      // `playEvolution`, driven by the controller's event.
      const bossResult = this.bossController.applyDamage(damage);
      phaseChanged = bossResult.phaseChanged;
      this.currentEnemy.currentHp = bossResult.currentHp;
      this.currentEnemy.maxHp = bossResult.maxHp;
    } else {
      this.currentEnemy.currentHp = Math.max(0, this.currentEnemy.currentHp - damage);
    }
    this.mathUI.updateEnemyHp(this.currentEnemy, this.bossController?.phase || 1);

    const delay = phaseChanged ? 900 : 700;
    this.scheduler.delay(() => {
      this.heroState = 'idle';
      this.enemyState = 'idle';
      if ((this.currentEnemy?.currentHp ?? 0) <= 0) this.onEnemyDefeated();
      else {
        this.isHoppingBack = true;
        this.recoilPhase = null;
        this.nextQuestion();
      }
    }, delay, 'correctAnswerResolution');
  }

  /**
   * Spends one banked ultimate charge as an immediate heavy strike.
   * Player-triggered, so it runs outside the answer pipeline — the pending
   * question is replaced once the blow resolves.
   */
  activateUltimate() {
    if (this.state !== 'COMBAT' || this.answerLocked || !this.currentEnemy) return false;
    if (this.isBoss && this.bossController.isInvulnerable) return false;
    if (!this.hero.consumeUltimate()) return false;

    this.answerLocked = true;
    this.mathUI.lockInput();
    this.mathUI.updateUltimate(this.hero);
    this.currentProblem = null;
    this.heroState = 'attack';
    this.enemyState = 'hurt';
    this.soundEngine.playExplosion();
    this.mathUI.showCorrectFeedback('', t('combat.ultimateStrike'));
    this.mathUI.showHeroSpeech(t('combat.ultimateCry'), this.heroX, this.renderer.width, this.renderer.sprites.heroTopOffset(this.hero));

    this.playAttackEffects({ isUltimate: true }, ULTIMATE_DAMAGE);

    let phaseChanged = false;
    if (this.isBoss) {
      const bossResult = this.bossController.applyDamage(ULTIMATE_DAMAGE);
      phaseChanged = bossResult.phaseChanged;
      this.currentEnemy.currentHp = bossResult.currentHp;
      this.currentEnemy.maxHp = bossResult.maxHp;
    } else {
      this.currentEnemy.currentHp = Math.max(0, this.currentEnemy.currentHp - ULTIMATE_DAMAGE);
    }
    this.mathUI.updateEnemyHp(this.currentEnemy, this.bossController.phase);
    this.updateHUD();

    this.scheduler.delay(() => {
      this.heroState = 'idle';
      this.enemyState = 'idle';
      if ((this.currentEnemy?.currentHp ?? 0) <= 0) this.onEnemyDefeated();
      else {
        this.isHoppingBack = true;
        this.recoilPhase = null;
        this.nextQuestion();
      }
    }, phaseChanged ? 900 : 700, 'ultimateResolution');
    return true;
  }

  /**
   * Fires the hero's strike VFX. The impact burst is delayed so it lands on
   * the strike beat of the attack animation instead of the wind-up.
   */
  playAttackEffects(heroResult, damage) {
    const isBigHit = heroResult.isCrit || heroResult.isEmpowered;
    const color = heroResult.isUltimate ? '#c084fc' : isBigHit ? '#facc15' : '#4ade80';
    const power = heroResult.isUltimate ? 2.2 : isBigHit ? 1.5 : 1;
    const particles = this.renderer.particles;
    const heroAnchor = this.combatAnchor('hero');

    particles.spawnWeaponFlourish(heroAnchor.x + 74, heroAnchor.y, this.hero.config.archetype, color, power);

    this.scheduler.delay(() => {
      const anchor = this.combatAnchor('enemy');
      particles.spawnImpact(anchor.x, anchor.y, color, power);
      particles.spawnDamageNumber(anchor.x, anchor.y - 26, damage, heroResult.isCrit || heroResult.isUltimate);
      this.renderer.hitStop(heroResult.isUltimate ? 0.11 : heroResult.isCrit ? 0.07 : 0.045);
      this.renderer.shake(heroResult.isUltimate ? 22 : heroResult.isCrit ? 13 : 7);

      if (heroResult.isUltimate) {
        particles.spawnShockwave(anchor.x, this.renderer.height * 0.72, color, 1.4);
        particles.spawnStatusText(anchor.x, anchor.y - 96, t('combat.ultimateLabel'), '#c084fc', 32);
        this.renderer.flash('#e9d5ff', 0.42, 0.3);
      } else if (isBigHit) {
        this.renderer.flash('#fef08a', 0.22, 0.2);
      }
      if (this.hero.combo >= 5 && this.hero.combo % 5 === 0) {
        particles.spawnStatusText(heroAnchor.x, heroAnchor.y - 84, t('combat.comboLabel', { combo: this.hero.combo }), '#fb923c', 24);
      }
    }, 220, 'attackImpact');
  }

  handleIncorrectAnswer(result) {
    this.soundEngine.playIncorrect();
    const hurt = this.hero.takeDamage();
    this.enemyState = 'attack';
    this.isHoppingBack = true;
    this.recoilPhase = null;
    const particles = this.renderer.particles;

    if (hurt.shielded) {
      this.heroState = 'idle';
      this.soundEngine.playShield();
      this.mathUI.showHeroSpeech(t('combat.shieldBlocked'), this.heroX, this.renderer.width, this.renderer.sprites.heroTopOffset(this.hero));
    } else {
      this.heroState = 'hurt';
      this.soundEngine.playEnemyAttack(this.enemyAttackSound());
      this.soundEngine.playHurt();
      this.mathUI.showHeroSpeech(randomQuote('heroError'), this.heroX, this.renderer.width, this.renderer.sprites.heroTopOffset(this.hero));
    }

    // Land the enemy's blow on the strike beat of its attack animation.
    this.scheduler.delay(() => {
      const anchor = this.combatAnchor('hero');
      if (hurt.shielded) {
        particles.spawnShieldBlock(anchor.x, anchor.y);
        particles.spawnStatusText(anchor.x, anchor.y - 82, t('combat.shieldLabel'), '#60a5fa', 26);
        this.renderer.shake(9);
        this.renderer.flash('#bfdbfe', 0.2, 0.2);
      } else {
        particles.spawnHeroHurt(anchor.x, anchor.y);
        this.renderer.hitStop(0.05);
        this.renderer.shake(15, 5);
        this.renderer.flash('#ef4444', 0.26, 0.28);
      }
    }, 210, 'enemyStrikeImpact');
    this.mathUI.showErrorExplanation(result.explanationText, result.correctAnswer);
    if (this.isBoss) this.mathUI.showBossSpeech(randomQuote('boss'), this.enemyX, this.renderer.width, this.enemyTopOffset());
    const delay = this.saveSystem.data.settings.relaxedMode ? 1800 : 1300;
    this.scheduler.delay(() => {
      this.heroState = 'idle';
      this.enemyState = 'idle';
      if (hurt.isDefeated) this.onDefeat();
      else this.nextQuestion();
    }, delay, 'incorrectAnswerResolution');
  }

  /** Weapon voice for the hero's blow, matched to the chosen archetype. */
  heroAttackSound() {
    return ({ knight: 'sword', sorceress: 'magic', archer: 'arrow', cossack: 'heavy' })[
      this.hero.config.archetype
    ] || 'sword';
  }

  /**
   * Attack voice for the current enemy, taken from the same `fx` kind its
   * animation profile already uses — so a caster's blow sounds like a spell
   * and a crawler's like a bite, without a second per-creature table.
   */
  enemyAttackSound() {
    const fx = profileFor(this.currentEnemy || {}).fx;
    return ({ spell: 'magic', splash: 'spit', sting: 'bite', bite: 'bite' })[fx] || 'claw';
  }

  /**
   * Enemy collapse. The sprite is handed to `deathAnim` so it can finish its
   * animation after combat state has already moved on to the next encounter.
   */
  playDeathEffects(enemy, isBoss) {
    const anchor = this.combatAnchor('enemy');
    const particles = this.renderer.particles;
    const color = enemy.color || '#f87171';

    this.deathAnim = { enemy, x: this.enemyX, isBoss, timer: 0.62 };
    particles.spawnDeathBurst(anchor.x, anchor.y, color, isBoss ? 2 : (enemy.size || 1));
    particles.spawnShockwave(anchor.x, this.renderer.height * 0.72, color, isBoss ? 1.5 : 0.9);
    particles.spawnCoins(anchor.x, anchor.y, isBoss ? 14 : 6);
    this.renderer.hitStop(isBoss ? 0.13 : 0.07);
    this.renderer.shake(isBoss ? 26 : 12, 4.5);
    this.renderer.flash(isBoss ? '#fde68a' : '#ffffff', isBoss ? 0.4 : 0.2, isBoss ? 0.45 : 0.24);
    this.soundEngine.playEnemyDeath();
    this.soundEngine.playCoin();
    if (isBoss) {
      this.soundEngine.playExplosion();
      particles.spawnStatusText(anchor.x, anchor.y - 110, t('combat.bossDefeated'), '#fbbf24', 30);
    }
  }

  onEnemyDefeated() {
    if (!this.currentEnemy || this.sessionFinalized) return;
    // Clear only the enemy speech bubble immediately when enemy dies
    this.mathUI.clearEnemySpeechBubble();
    const enemy = this.currentEnemy;
    const bossDefeat = this.isBoss;
    const reward = bossDefeat
      ? this.rewardSystem.bossReward(enemy)
      : enemy.id?.startsWith('elite')
        ? this.rewardSystem.eliteReward(enemy, this.hero.combo)
        : this.rewardSystem.enemyReward(enemy, this.hero.combo);
    const killKey = `kill_${this.scheduler.sessionId || 0}_${this.infiniteWave}_${this.totalSessionKills}_${enemy.id}`;
    // Coins, XP, kill totals, the bestiary and any achievement this kill earns
    // are one event; writing the save between each of them cost seven full
    // serialisations per enemy.
    const applied = this.saveSystem.batch(() => {
      const result = this.rewardSystem.apply(reward, killKey);
      this.sessionKillRewards.push({ coins: result.coins, xp: result.xp });
      this.totalSessionKills++;
      this.saveSystem.markEnemyDefeated(bossDefeat);
      this.saveSystem.recordEncounter(enemy.id, { defeated: true });
      this.showAchievementNotifications();
      return result;
    });

    this.playDeathEffects(enemy, bossDefeat);
    if (applied.leveledUp) {
      // Heal only — a level-up must not wipe the streak or banked ultimates.
      this.hero.healToFull();
      const heroAnchor = this.combatAnchor('hero');
      this.renderer.particles.spawnLevelUp(heroAnchor.x, heroAnchor.y);
      this.renderer.flash('#fde68a', 0.4, 0.45);
      this.soundEngine.playLevelUp();
      this.menuSystem.showToast(t('toast.newLevel', { level: applied.newLevel }), 'level');
    }
    if (bossDefeat) this.soundEngine.startStageLevelBgm(this.currentRegion?.id || 1, this.currentStage?.id || 1, this.enemyIndex, this.sessionConfig?.mode || 'campaign');
    if (this.sessionConfig.mode === 'infinite') this.infiniteKills++;
    if (this.totalSessionKills % 5 === 0) this.renderer.advanceTimeOfDay();

    this.enemyIndex++;
    this.currentEnemy = null;
    this.currentProblem = null;
    this.updateHUD();
    this.heroState = 'run';
    this.isAdvancingToNext = true;
  }

  onStageVictory() {
    if (this.sessionFinalized) return;
    this.sessionFinalized = true;
    this.state = 'VICTORY';
    this.answerLocked = true;
    this.mathUI.hide();
    this.soundEngine.playVictory();
    this.heroState = 'victory';
    this.isAdvancingToNext = false;
    const celebration = this.combatAnchor('hero');
    this.renderer.particles.spawnLevelUp(celebration.x, celebration.y);
    const mode = this.sessionConfig.mode;
    const durationMs = Math.round(performance.now() - this.sessionStartTime);
    const accuracy = this.sessionAnsweredCount ? this.sessionCorrectCount / this.sessionAnsweredCount : 0;
    const stars = this.calculateStars(accuracy);
    const total = this.rewardSystem.computeSessionTotal(this.sessionKillRewards);

    if (mode === 'campaign' && this.currentStage) {
      const completion = this.saveSystem.completeStage(this.currentStage.id, {
        stars, accuracy, durationMs, maxCombo: this.hero.maxCombo,
      });
      const stageReward = this.rewardSystem.stageCompletionReward(this.currentStage.id, stars, completion.firstCompletion);
      const applied = this.rewardSystem.apply(stageReward, `stage_${this.currentStage.id}_${completion.firstCompletion ? 'first' : 'replay'}_${this.scheduler.sessionId}`);
      total.totalCoins += applied.coins;
      total.totalXP += applied.xp;
      if (this.currentStage.isBossStage) this.saveSystem.completeRegion(this.currentStage.regionId, stars);
      this.saveSystem.recordSession({ mode, stageId: this.currentStage.id, accuracy, durationMs, stars });
      this.showAchievementNotifications();
      // Captured now: the teardown clears currentStage before the map opens.
      const regionId = this.currentStage.regionId;
      this.menuSystem.showVictoryModal(stageFullName(this.currentStage, this.currentRegion), total.totalCoins, total.totalXP,
        () => { this.endSession(); this.menuSystem.showStageSelection(regionId); },
        { stars, accuracy, firstCompletion: completion.firstCompletion });
      return;
    }

    if (mode === 'secret') {
      this.saveSystem.completeSecretBoss();
      const reward = this.rewardSystem.apply({ coins: 250, xp: 400 }, `secret_${this.scheduler.sessionId}`);
      total.totalCoins += reward.coins; total.totalXP += reward.xp;
      this.saveSystem.recordSession({ mode, accuracy, durationMs, stars });
      this.showAchievementNotifications();
      this.menuSystem.showVictoryModal(t('mode.secret'), total.totalCoins, total.totalXP, () => this.returnToMenu(), { stars, accuracy, firstCompletion: true });
      return;
    }

    if (mode === 'infinite') {
      const isRecord = this.saveSystem.updateInfiniteRecord(this.infiniteKills, this.infiniteWave);
      this.saveSystem.recordSession({ mode, kills: this.infiniteKills, wave: this.infiniteWave, accuracy, durationMs });
      this.showAchievementNotifications();
      this.menuSystem.showInfiniteResultModal(this.infiniteKills, this.infiniteWave, total.totalCoins, total.totalXP,
        () => this.returnToMenu(), accuracy, isRecord);
      return;
    }

    if (mode === 'single' && this.sessionConfig.tables?.length === 1) {
      this.saveSystem.completeLearningTier(this.sessionConfig.tables[0], this.sessionConfig.tier || 1, { accuracy, durationMs });
    }
    this.saveSystem.recordSession({ mode, tables: this.sessionConfig.tables, tier: this.sessionConfig.tier, accuracy, durationMs });
    this.showAchievementNotifications();
    this.menuSystem.showTrainingResultModal(mode, this.sessionCorrectCount, this.sessionAnsweredCount,
      total.totalCoins, total.totalXP, () => this.restartStage(), () => this.returnToMenu(), {
        tier: this.sessionConfig.tier, tables: this.sessionConfig.tables, durationMs,
      });
  }

  onDefeat() {
    if (this.sessionFinalized) return;
    this.sessionFinalized = true;
    this.state = 'DEFEAT';
    this.answerLocked = true;
    this.mathUI.hide();
    const anchor = this.combatAnchor('hero');
    this.renderer.particles.spawnDeathBurst(anchor.x, anchor.y, '#ef4444', 1.2);
    this.renderer.shake(28, 3.5);
    this.renderer.flash('#7f1d1d', 0.5, 0.6);
    this.soundEngine.playDefeat();
    const durationMs = Math.round(performance.now() - this.sessionStartTime);
    const accuracy = this.sessionAnsweredCount ? this.sessionCorrectCount / this.sessionAnsweredCount : 0;
    this.saveSystem.recordSession({ mode: this.sessionConfig.mode, completed: false, accuracy, durationMs });
    if (this.sessionConfig.mode === 'infinite') {
      const total = this.rewardSystem.computeSessionTotal(this.sessionKillRewards);
      const isRecord = this.saveSystem.updateInfiniteRecord(this.infiniteKills, this.infiniteWave);
      // A run that ends in defeat still banked its kills, so its milestones are
      // earned and must be announced just like a completed run's.
      this.showAchievementNotifications();
      this.menuSystem.showInfiniteResultModal(this.infiniteKills, this.infiniteWave, total.totalCoins, total.totalXP,
        () => this.returnToMenu(), accuracy, isRecord);
    } else {
      this.showAchievementNotifications();
      this.menuSystem.showDefeatModal(this.currentStage ? stageFullName(this.currentStage, this.currentRegion) : this.getModeTitle(this.sessionConfig.mode), () => this.restartStage(), () => this.returnToMenu());
    }
  }

  calculateStars(accuracy) {
    if (accuracy >= 0.95) return 3;
    if (accuracy >= 0.8) return 2;
    return 1;
  }

  showAchievementNotifications() {
    const unlocked = this.saveSystem.checkAchievements();
    for (const id of unlocked) {
      const achievement = ACHIEVEMENTS.find(item => item.id === id);
      this.menuSystem.showToast(t('toast.newAchievement', { title: achievement ? achievementTitle(achievement) : id.replaceAll('_', ' ') }), 'achievement');
    }
  }

  /** Replays a one-shot CSS animation by toggling its class off and back on. */
  pulseHudElement(element, className, durationMs = 600) {
    if (!element) return;
    element.classList.remove(className);
    void element.offsetWidth; // force reflow so the animation restarts
    element.classList.add(className);
    this.scheduler.delay(() => element.classList.remove(className), durationMs, 'hudPulse');
  }

  updateHUD() {
    const stats = this.saveSystem.data.stats;
    const levelBadge = document.getElementById('levelBadge');
    const coinsBadge = document.getElementById('coinsBadge');
    const previous = this._hudSnapshot || {};

    levelBadge.textContent = t('hud.level', { level: stats.level });
    coinsBadge.innerHTML = `<span class="coin-symbol">🪙</span> ${stats.coins}`;
    document.getElementById('xpText').textContent = `${stats.exp}/${stats.expToNext} XP`;
    document.getElementById('xpFill').style.width = `${Math.min(100, stats.exp / Math.max(1, stats.expToNext) * 100)}%`;

    if (previous.coins != null && stats.coins > previous.coins) this.pulseHudElement(coinsBadge, 'earned', 600);
    if (previous.level != null && stats.level > previous.level) {
      this.pulseHudElement(levelBadge.parentElement, 'gained', 1400);
    }
    this._hudSnapshot = { coins: stats.coins, level: stats.level };
    const portrait = document.getElementById('heroPortraitImg');
    if (portrait) {
      const arch = this.saveSystem.data.hero.archetype || 'knight';
      const tier = this.saveSystem.data.hero.skinTier || 1;
      const suffix = tier > 1 ? `_${tier}` : '';
      portrait.src = `./assets/heroes/hero_${arch}${suffix}.png`;
    }
    const progress = document.getElementById('stageProgressBadge');
    const fill = document.getElementById('stageProgressFill');
    if (progress) {
      progress.textContent = this.sessionConfig?.mode === 'infinite'
        ? t('hud.waveProgress', { wave: this.infiniteWave, kills: this.infiniteKills })
        : this.sessionConfig ? t('hud.enemiesLeft', { done: Math.min(this.totalSessionKills, this.targetEnemies), total: this.targetEnemies }) : t('hud.ready');
    }
    if (fill) {
      const pct = Number.isFinite(this.targetEnemies) && this.targetEnemies > 0
        ? Math.min(100, Math.max(0, (this.totalSessionKills / this.targetEnemies) * 100))
        : this.sessionConfig?.mode === 'infinite'
          ? Math.min(100, ((this.infiniteKills % 5) / 5) * 100)
          : 0;
      fill.style.width = `${pct}%`;
    }
    this.mathUI.updateHearts(this.hero.hearts, this.hero.maxHearts);
  }
}

window.addEventListener('DOMContentLoaded', () => { window.app = new GameApp(); });
