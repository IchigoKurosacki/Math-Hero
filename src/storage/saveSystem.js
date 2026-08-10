/**
 * Save System for Math Hero RPG
 * LocalStorage with deep merge, schema validation, version migrations,
 * 40-stage progress, canonical fact keys, and backup/restore.
 */
import { t } from '../i18n/index.js';

const SAVE_KEY = 'math_hero_save_v1';
const BACKUP_KEY = 'math_hero_save_backup';
const CURRENT_VERSION = 6;

// In-memory fallback storage for Node.js test environments
const memoryStorage = {};

function getStorageItem(key) {
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    return memoryStorage[key] || null;
  } catch (e) {
    return memoryStorage[key] || null;
  }
}

function setStorageItem(key, val) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, val);
    memoryStorage[key] = val;
  } catch (e) {
    memoryStorage[key] = val;
  }
}

function createDefaultStageProgress() {
  const stages = {};
  for (let r = 1; r <= 8; r++) {
    for (let s = 1; s <= 5; s++) {
      const id = `${r}_${s}`;
      stages[id] = {
        unlocked: r === 1 && s === 1,
        completed: false,
        stars: 0,
        bestAccuracy: 0,
        bestTime: 0,
        attempts: 0,
      };
    }
  }
  return stages;
}


function createDefaultLearningProgress() {
  const progress = {};
  for (let table = 1; table <= 12; table++) {
    progress[table] = {
      unlockedTier: 1,
      tiers: {
        1: { completed: false, bestAccuracy: 0, bestTime: 0, attempts: 0 },
        2: { completed: false, bestAccuracy: 0, bestTime: 0, attempts: 0 },
        3: { completed: false, bestAccuracy: 0, bestTime: 0, attempts: 0 },
        4: { completed: false, bestAccuracy: 0, bestTime: 0, attempts: 0 },
      },
    };
  }
  return progress;
}

function createDefaultSave() {
  return {
    saveVersion: CURRENT_VERSION,
    lastPlayed: Date.now(),
    hero: {
      archetype: 'knight',
      name: 'Герой Знань',
      cloakStyle: 'classic',
      hatStyle: 'none',
      themeColor: '#3b82f6',
      auraStyle: 'none',
      skinTier: 1,
    },
    stats: {
      level: 1,
      exp: 0,
      expToNext: 100,
      coins: 50,
      totalAnswered: 0,
      totalCorrect: 0,
      maxStreak: 0,
      weakFixedCount: 0,
      totalPlayTime: 0,
      sessionsPlayed: 0,
      infiniteBestKills: 0,
      infiniteBestWave: 0,
      totalEnemiesDefeated: 0,
      totalBossesDefeated: 0,
      totalStagesCompleted: 0,
      // Every session the player starts and sees through to a result screen,
      // won or lost — the "Зіграй N сесій" achievements reward showing up.
      totalSessionsPlayed: 0,
    },
    mathStats: {},
    campaign: {
      1: { unlocked: true, completed: false, stars: 0 },
      2: { unlocked: false, completed: false, stars: 0 },
      3: { unlocked: false, completed: false, stars: 0 },
      4: { unlocked: false, completed: false, stars: 0 },
      5: { unlocked: false, completed: false, stars: 0 },
      6: { unlocked: false, completed: false, stars: 0 },
      7: { unlocked: false, completed: false, stars: 0 },
      8: { unlocked: false, completed: false, stars: 0 },
    },
    stageProgress: createDefaultStageProgress(),
    learningProgress: createDefaultLearningProgress(),
    sessionHistory: [],
    unlockedCosmetics: ['knight', 'sorceress', 'cossack', 'archer', 'hat_none', 'cloak_classic'],
    achievements: {},
    // Bestiary log: enemy id → { seen, defeated }. Anything absent is still
    // an unknown silhouette on the bestiary screen.
    bestiary: {},
    secretBossUnlocked: false,
    settings: {
      // `null` — вибору ще не було: перший запуск бере мову браузера.
      // Ключ мусить бути в типових значеннях, інакше `deepMerge` його зітре.
      language: null,
      sfxVolume: 1.0,
      bgmVolume: 1.0,
      sfxMuted: false,
      bgmMuted: false,
      relaxedMode: false,
      include1112: false,
      reducedMotion: false,
      highContrast: false,
      particleDensity: 1,
      screenShake: 1,
      animationSpeed: 1,
      vibrationMuted: false,
    },
  };
}

/**
 * Deep merge: recursively merge src into target, preserving target structure.
 */
function deepMerge(target, src) {
  if (!src || typeof src !== 'object') return target;
  const result = { ...target };
  for (const key of Object.keys(target)) {
    if (key in src) {
      if (typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key])
        && typeof src[key] === 'object' && src[key] !== null && !Array.isArray(src[key])) {
        result[key] = deepMerge(target[key], src[key]);
      } else if (src[key] !== undefined && src[key] !== null && !Number.isNaN(src[key])) {
        result[key] = src[key];
      }
    }
  }
  // Preserve extra keys from src that aren't in target defaults (like mathStats entries)
  for (const key of Object.keys(src)) {
    if (!(key in target)) {
      result[key] = src[key];
    }
  }
  return result;
}

/**
 * Migrate save data from older versions
 */
function migrate(data) {
  if (!data.saveVersion || data.saveVersion < 2) {
    // v1 -> v2: add settings defaults
    data.settings = { ...createDefaultSave().settings, ...(data.settings || {}) };
    data.saveVersion = 2;
  }
  if (data.saveVersion < 3) {
    // v2 -> v3: add stageProgress, stats fields, secretBoss
    if (!data.stageProgress) {
      data.stageProgress = createDefaultStageProgress();
      // Retroactively unlock stages for completed regions
      if (data.campaign) {
        for (const [rid, rdata] of Object.entries(data.campaign)) {
          if (rdata.completed) {
            for (let s = 1; s <= 5; s++) {
              const id = `${rid}_${s}`;
              if (data.stageProgress[id]) {
                data.stageProgress[id].unlocked = true;
                data.stageProgress[id].completed = true;
                data.stageProgress[id].stars = rdata.stars || 1;
              }
            }
            // Unlock first stage of next region
            const nextR = parseInt(rid) + 1;
            if (nextR <= 8 && data.stageProgress[`${nextR}_1`]) {
              data.stageProgress[`${nextR}_1`].unlocked = true;
            }
          } else if (rdata.unlocked) {
            // Unlock first stage
            if (data.stageProgress[`${rid}_1`]) {
              data.stageProgress[`${rid}_1`].unlocked = true;
            }
          }
        }
      }
    }
    data.stats = { ...createDefaultSave().stats, ...(data.stats || {}) };
    if (data.secretBossUnlocked === undefined) data.secretBossUnlocked = false;
    data.saveVersion = 3;
  }
  if (data.saveVersion < 4) {
    data.learningProgress = deepMerge(createDefaultLearningProgress(), data.learningProgress || {});
    data.sessionHistory = Array.isArray(data.sessionHistory) ? data.sessionHistory.slice(-20) : [];
    data.stats = { ...createDefaultSave().stats, ...(data.stats || {}) };
    data.settings = { ...createDefaultSave().settings, ...(data.settings || {}) };
    data.saveVersion = 4;
  }
  if (data.saveVersion < 5) {
    // v4 -> v5: the bestiary log. Older saves start empty; the player fills it
    // back in simply by playing, so nothing needs to be reconstructed.
    if (!data.bestiary || typeof data.bestiary !== 'object') data.bestiary = {};
    data.saveVersion = 5;
  }
  if (data.saveVersion < 6) {
    // v5 -> v6: `totalSessionsCompleted` counted defeats too, so its name did
    // not describe it. The achievements it feeds say "Зіграй" — play, not
    // finish — so the counter keeps its meaning and takes an honest name. The
    // old key is removed, otherwise the deep merge would carry it along.
    if (data.stats) {
      data.stats.totalSessionsPlayed = Number(
        data.stats.totalSessionsPlayed ?? data.stats.totalSessionsCompleted ?? 0
      ) || 0;
      delete data.stats.totalSessionsCompleted;
    }
    data.saveVersion = 6;
  }
  if (data.hero && data.hero.skinTier === undefined) {
    data.hero.skinTier = 1;
  }
  return data;
}

/**
 * Canonical fact key: always use min_max to avoid fragmentation from swapped multipliers.
 */
export function canonicalFactKey(a, b) {
  return a <= b ? `${a}_${b}` : `${b}_${a}`;
}

export class SaveSystem {
  constructor() {
    this.data = this.load();
    this._deferDepth = 0;
    this._deferredWrite = false;
  }

  /**
   * Runs `work` with writes coalesced into one save at the end, and returns
   * whatever `work` returns.
   *
   * Beating a single enemy touches coins, XP, kill totals, the bestiary and
   * any achievement it unlocks — measured at seven separate writes of the
   * whole save file per kill. Only the write is deferred; the data itself is
   * updated immediately, so anything reading `data` inside the block still
   * sees current values. The flush runs from `finally`, so a throw inside
   * `work` cannot swallow it.
   */
  batch(work) {
    this._deferDepth++;
    try {
      return work();
    } finally {
      this._deferDepth--;
      if (this._deferDepth === 0 && this._deferredWrite) {
        this._deferredWrite = false;
        this.save();
      }
    }
  }

  load() {
    try {
      const raw = getStorageItem(SAVE_KEY);
      if (!raw) return createDefaultSave();
      let parsed = JSON.parse(raw);
      parsed = migrate(parsed);
      return deepMerge(createDefaultSave(), parsed);
    } catch (e) {
      console.error('Failed to load save, using defaults', e);
      return createDefaultSave();
    }
  }

  save() {
    if (this._deferDepth > 0) {
      this._deferredWrite = true;
      return;
    }
    try {
      this.data.lastPlayed = Date.now();
      setStorageItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save game data', e);
    }
  }

  reset() {
    this.data = createDefaultSave();
    this.save();
  }

  // ── Backup & Import ──

  createBackup() {
    try {
      setStorageItem(BACKUP_KEY, JSON.stringify(this.data));
    } catch (e) { /* silent */ }
  }

  exportJSON() {
    return JSON.stringify({ ...this.data, _exportVersion: CURRENT_VERSION, _exportDate: new Date().toISOString() });
  }

  importJSON(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      // Validate structure
      if (!imported.saveVersion || typeof imported.hero !== 'object' || typeof imported.stats !== 'object') {
        return { success: false, error: t('save.invalidSave') };
      }
      // Sanitize — don't trust text fields blindly
      if (imported.hero?.name) {
        imported.hero.name = String(imported.hero.name).replace(/<[^>]*>/g, '').substring(0, 30);
      }
      if (imported.hero) {
        // Both of these are interpolated into image URLs inside markup the
        // menus build as HTML, so anything but the expected shape is replaced
        // rather than escaped downstream.
        const archetype = String(imported.hero.archetype ?? '');
        imported.hero.archetype = /^[a-z]{1,20}$/.test(archetype) ? archetype : 'knight';
        imported.hero.skinTier = Math.max(1, Math.min(5, Math.floor(Number(imported.hero.skinTier)) || 1));
      }
      this.createBackup();
      const migrated = migrate(imported);
      this.data = deepMerge(createDefaultSave(), migrated);
      this.save();
      return { success: true };
    } catch (e) {
      return { success: false, error: `${t('save.importError')} ${e.message}` };
    }
  }

  // ── Fact Stats ──

  getFactStat(a, b) {
    const key = canonicalFactKey(a, b);
    if (!this.data.mathStats[key]) {
      this.data.mathStats[key] = {
        shown: 0,
        correct: 0,
        wrong: 0,
        streak: 0,
        bestStreak: 0,
        avgTimeMs: 0,
        lastTimeMs: 0,
        lastAnsweredAt: 0,
        lastCorrectAt: 0,
        lastWrongAt: 0,
        masteredAt: 0,
        nextReviewAt: 0,
        sessionCorrectCount: 0,
        sessionsSeen: 0,
        status: 'NEW',
        confidence: 0,
      };
    }
    return this.data.mathStats[key];
  }

  recordAnswer(a, b, isCorrect, timeMs) {
    const stat = this.getFactStat(a, b);
    const now = Date.now();
    stat.shown++;
    stat.lastAnsweredAt = now;
    stat.lastTimeMs = timeMs;

    this.data.stats.totalAnswered++;

    if (isCorrect) {
      stat.correct++;
      stat.streak++;
      stat.bestStreak = Math.max(stat.bestStreak, stat.streak);
      stat.lastCorrectAt = now;
      this.data.stats.totalCorrect++;

      stat.avgTimeMs = stat.avgTimeMs === 0 ? timeMs : Math.round(stat.avgTimeMs * 0.7 + timeMs * 0.3);

      // Status transitions
      const prevStatus = stat.status;
      if (stat.streak >= 5 && stat.avgTimeMs < 4000) {
        stat.status = 'MASTERED';
        stat.masteredAt = stat.masteredAt || now;
        stat.confidence = Math.min(1, stat.confidence + 0.15);
        // Schedule next review
        const intervalMs = Math.min(7 * 24 * 3600000, (stat.streak - 4) * 24 * 3600000);
        stat.nextReviewAt = now + intervalMs;
      } else if (stat.streak >= 2) {
        stat.status = 'FAMILIAR';
        stat.confidence = Math.min(1, stat.confidence + 0.1);
      } else if (stat.status === 'NEW') {
        stat.status = 'FAMILIAR';
      }

      // Track weak fix: transition from UNSTABLE/NEEDS_REVISION to FAMILIAR/MASTERED
      if ((prevStatus === 'UNSTABLE' || prevStatus === 'NEEDS_REVISION') &&
          (stat.status === 'FAMILIAR' || stat.status === 'MASTERED')) {
        this.data.stats.weakFixedCount++;
      }
    } else {
      stat.wrong++;
      stat.lastWrongAt = now;
      const prevStatus = stat.status;
      stat.streak = 0;
      stat.confidence = Math.max(0, stat.confidence - 0.2);

      // NEEDS_REVISION: previously mastered fact that got wrong
      if (prevStatus === 'MASTERED' || prevStatus === 'FAMILIAR') {
        stat.status = 'NEEDS_REVISION';
      } else {
        stat.status = 'UNSTABLE';
      }
    }

    this.save();
    return stat;
  }

  // ── XP & Coins ──

  addExp(amount) {
    let s = this.data.stats;
    s.exp += amount;
    let leveledUp = false;
    while (s.exp >= s.expToNext) {
      s.exp -= s.expToNext;
      s.level++;
      s.expToNext = Math.round(s.expToNext * 1.25);
      leveledUp = true;
    }
    this.save();
    return { leveledUp, newLevel: s.level };
  }

  addCoins(amount) {
    this.data.stats.coins += amount;
    this.save();
  }

  // ── Campaign & Stage Progress ──

  unlockRegion(regionId) {
    if (this.data.campaign[regionId]) {
      this.data.campaign[regionId].unlocked = true;
      // Unlock first stage
      const stageKey = `${regionId}_1`;
      if (this.data.stageProgress[stageKey]) {
        this.data.stageProgress[stageKey].unlocked = true;
      }
      this.save();
    }
  }

  completeRegion(regionId, stars = 3) {
    if (this.data.campaign[regionId]) {
      this.data.campaign[regionId].completed = true;
      this.data.campaign[regionId].stars = Math.max(this.data.campaign[regionId].stars || 0, stars);
      if (regionId < 8) {
        this.unlockRegion(regionId + 1);
      }
      this.save();
    }
  }

  completeStage(stageId, summary = {}) {
    if (!this.data.stageProgress[stageId]) {
      this.data.stageProgress[stageId] = {
        unlocked: true, completed: false, stars: 0, bestAccuracy: 0, bestTime: 0, bestCombo: 0, attempts: 0,
      };
    }
    const stage = this.data.stageProgress[stageId];
    const firstCompletion = !stage.completed;
    const stars = Math.max(1, Math.min(3, Number(summary.stars || 1)));
    const accuracy = Math.max(0, Math.min(1, Number(summary.accuracy || 0)));
    const durationMs = Math.max(0, Number(summary.durationMs || 0));
    const maxCombo = Math.max(0, Number(summary.maxCombo || 0));

    stage.completed = true;
    stage.stars = Math.max(stage.stars || 0, stars);
    stage.bestAccuracy = Math.max(stage.bestAccuracy || 0, accuracy);
    stage.bestCombo = Math.max(stage.bestCombo || 0, maxCombo);
    if (durationMs > 0 && (!stage.bestTime || durationMs < stage.bestTime)) stage.bestTime = durationMs;
    stage.attempts = (stage.attempts || 0) + 1;
    stage.completedAt = stage.completedAt || Date.now();

    const [regionId, stageNum] = stageId.split('_').map(Number);
    if (stageNum < 5) {
      const nextKey = `${regionId}_${stageNum + 1}`;
      if (this.data.stageProgress[nextKey]) this.data.stageProgress[nextKey].unlocked = true;
    }

    if (firstCompletion) this.data.stats.totalStagesCompleted++;
    this.save();
    return { firstCompletion, progress: stage };
  }

  getStageProgress(stageId) {
    return this.data.stageProgress[stageId] || { unlocked: false, completed: false, stars: 0 };
  }

  // ── Learning progression & session history ──

  getLearningTierProgress(table, tier) {
    const tableProgress = this.data.learningProgress[table] || createDefaultLearningProgress()[table];
    return tableProgress.tiers[tier] || { completed: false, bestAccuracy: 0, bestTime: 0, attempts: 0 };
  }

  getUnlockedLearningTier(table) {
    return Math.max(1, Math.min(4, this.data.learningProgress[table]?.unlockedTier || 1));
  }

  completeLearningTier(table, tier, summary = {}) {
    const progress = this.data.learningProgress[table] || (this.data.learningProgress[table] = createDefaultLearningProgress()[table]);
    const tierProgress = progress.tiers[tier];
    const accuracy = Math.max(0, Math.min(1, Number(summary.accuracy || 0)));
    const durationMs = Math.max(0, Number(summary.durationMs || 0));
    tierProgress.attempts = (tierProgress.attempts || 0) + 1;
    tierProgress.bestAccuracy = Math.max(tierProgress.bestAccuracy || 0, accuracy);
    if (durationMs > 0 && (!tierProgress.bestTime || durationMs < tierProgress.bestTime)) tierProgress.bestTime = durationMs;
    if (accuracy >= 0.8) {
      tierProgress.completed = true;
      progress.unlockedTier = Math.min(4, Math.max(progress.unlockedTier || 1, tier + 1));
    }
    this.save();
    return tierProgress;
  }

  recordSession(summary) {
    // Wins and defeats both count: these achievements reward turning up, and a
    // child who fought a stage and lost still played it.
    this.data.stats.totalSessionsPlayed++;
    this.data.sessionHistory.push({ ...summary, completedAt: Date.now() });
    this.data.sessionHistory = this.data.sessionHistory.slice(-20);
    this.save();
  }

  markEnemyDefeated(isBoss = false) {
    this.data.stats.totalEnemiesDefeated++;
    if (isBoss) this.data.stats.totalBossesDefeated++;
    this.save();
  }

  // ── Bestiary log ──

  /** Entry for one creature, always shaped even when never encountered. */
  getBestiaryEntry(enemyId) {
    const entry = this.data.bestiary?.[enemyId];
    return {
      seen: Number(entry?.seen || 0),
      defeated: Number(entry?.defeated || 0),
    };
  }

  /**
   * Logs an encounter. `defeated` is folded in here rather than tracked from a
   * second call site, so a creature can never be recorded as beaten without
   * first being recorded as met.
   */
  recordEncounter(enemyId, { defeated = false } = {}) {
    if (!enemyId) return;
    if (!this.data.bestiary || typeof this.data.bestiary !== 'object') this.data.bestiary = {};
    const entry = this.getBestiaryEntry(enemyId);
    this.data.bestiary[enemyId] = {
      seen: entry.seen + (defeated ? 0 : 1),
      defeated: entry.defeated + (defeated ? 1 : 0),
    };
    this.save();
  }

  hasMetEnemy(enemyId) {
    const entry = this.getBestiaryEntry(enemyId);
    return entry.seen > 0 || entry.defeated > 0;
  }

  canAccessSecretBoss() {
    const campaignDone = !!this.data.campaign[8]?.completed;
    const enoughPractice = this.data.stats.totalAnswered >= 100;
    const weakFacts = Object.values(this.data.mathStats).filter(stat =>
      stat.status === 'UNSTABLE' || stat.status === 'NEEDS_REVISION'
    ).length;
    return this.data.secretBossUnlocked || campaignDone || (enoughPractice && weakFacts >= 5);
  }

  completeSecretBoss() {
    this.data.secretBossUnlocked = true;
    this.unlockAchievement('secret_boss');
    this.save();
  }

  // ── Cosmetics & Shop ──

  isCosmeticUnlocked(cosmeticId) {
    if (!this.data.unlockedCosmetics) {
      this.data.unlockedCosmetics = ['knight', 'sorceress', 'cossack', 'archer', 'hat_none', 'cloak_classic'];
    }
    return this.data.unlockedCosmetics.includes(cosmeticId);
  }

  buyCosmetic(cosmeticId, price) {
    if (this.isCosmeticUnlocked(cosmeticId)) {
      return { success: true, alreadyOwned: true };
    }
    if (this.data.stats.coins < price) {
      return { success: false, reason: 'not_enough_coins' };
    }
    this.data.stats.coins -= price;
    this.data.unlockedCosmetics.push(cosmeticId);
    this.save();
    return { success: true, alreadyOwned: false };
  }

  checkAchievements() {
    const unlocked = [];
    const tryUnlock = (id) => { if (this.unlockAchievement(id)) unlocked.push(id); };
    const s = this.data.stats;

    // Combat milestones
    if (s.totalEnemiesDefeated >= 1) tryUnlock('first_victory');
    if (s.totalEnemiesDefeated >= 10) tryUnlock('enemies_10');
    if (s.totalEnemiesDefeated >= 50) tryUnlock('enemies_50');
    if (s.totalEnemiesDefeated >= 100) tryUnlock('enemies_100');
    if (s.totalEnemiesDefeated >= 500) tryUnlock('enemies_500');
    if (s.totalBossesDefeated >= 1) tryUnlock('bosses_1');
    if (s.totalBossesDefeated >= 5) tryUnlock('bosses_5');
    if (s.totalBossesDefeated >= 8) tryUnlock('bosses_8');

    // Streaks
    if (s.maxStreak >= 5) tryUnlock('streak_5');
    if (s.maxStreak >= 10) tryUnlock('streak_10');
    if (s.maxStreak >= 20) tryUnlock('streak_20');
    if (s.maxStreak >= 50) tryUnlock('streak_50');

    // Levels
    if (s.level >= 5) tryUnlock('level_5');
    if (s.level >= 10) tryUnlock('level_10');
    if (s.level >= 20) tryUnlock('level_20');
    if (s.level >= 35) tryUnlock('level_35');

    // Regions (all 8)
    for (let r = 1; r <= 8; r++) {
      if (this.data.campaign[r]?.completed) tryUnlock(`region_${r}`);
    }

    // Answers milestones
    if (s.totalAnswered >= 100) tryUnlock('answers_100');
    if (s.totalAnswered >= 500) tryUnlock('answers_500');
    if (s.totalAnswered >= 1000) tryUnlock('answers_1000');

    // Infinite mode
    if (s.infiniteBestKills >= 10) tryUnlock('infinite_10');
    if (s.infiniteBestKills >= 50) tryUnlock('infinite_50');
    if (s.infiniteBestWave >= 5) tryUnlock('infinite_wave_5');
    if (s.infiniteBestWave >= 10) tryUnlock('infinite_wave_10');

    // Weak facts fixed
    if (s.weakFixedCount >= 10) tryUnlock('weak_fixed_10');
    if (s.weakFixedCount >= 30) tryUnlock('weak_fixed_30');

    // Sessions
    if (s.totalSessionsPlayed >= 10) tryUnlock('sessions_10');
    if (s.totalSessionsPlayed >= 50) tryUnlock('sessions_50');

    // Perfect stage (any stage with 3 stars)
    if (this.data.stageProgress) {
      for (const stageData of Object.values(this.data.stageProgress)) {
        if (stageData.completed && stageData.stars >= 3) {
          tryUnlock('perfect_stage');
          break;
        }
      }
    }

    // Table mastery (tables 2-9). This runs after every single kill, so the
    // already-earned ones skip their ten-fact scan rather than re-proving a
    // conclusion that cannot be undone.
    for (let t = 2; t <= 9; t++) {
      const id = `mastered_table_${t}`;
      if (!this.data.achievements[id] && this.checkTableMastery(t, id)) unlocked.push(id);
    }

    // Check all facts mastered
    if (!this.data.achievements.all_mastered) {
      let allMastered = true;
      for (let a = 1; a <= 10 && allMastered; a++) {
        for (let b = 1; b <= 10; b++) {
          if (this.getFactStat(a, b).status !== 'MASTERED') {
            allMastered = false;
            break;
          }
        }
      }
      if (allMastered) tryUnlock('all_mastered');
    }
    return unlocked;
  }

  checkTableMastery(tableNum, achievementId) {
    let masteredCount = 0;
    for (let m = 1; m <= 10; m++) {
      const stat = this.getFactStat(tableNum, m);
      if (stat.status === 'MASTERED') masteredCount++;
    }
    if (masteredCount >= 10) {
      return this.unlockAchievement(achievementId);
    }
    return false;
  }

  unlockAchievement(achievementId) {
    if (!this.data.achievements[achievementId]) {
      this.data.achievements[achievementId] = { unlockedAt: Date.now() };
      this.save();
      return true;
    }
    return false;
  }

  isAchievementUnlocked(achievementId) {
    return !!this.data.achievements[achievementId];
  }

  // ── Infinite Mode Records ──

  /**
   * Writes a new best, returning whether anything improved.
   *
   * Deliberately does not unlock achievements itself: doing so swallowed the
   * unlock list, so the caller's own `checkAchievements` pass found nothing
   * left and the player never saw a toast for it.
   */
  updateInfiniteRecord(kills, wave) {
    let updated = false;
    if (kills > this.data.stats.infiniteBestKills) {
      this.data.stats.infiniteBestKills = kills;
      updated = true;
    }
    if (wave > this.data.stats.infiniteBestWave) {
      this.data.stats.infiniteBestWave = wave;
      updated = true;
    }
    if (updated) this.save();
    return updated;
  }
}

