/**
 * Hero System for Math Hero RPG
 * Contains archetypes, cosmetic system with shop prices, achievements list,
 * and hero combat state (hearts, shield, combo, evolution, relaxed mode).
 */

export const ARCHETYPES = {
  knight: {
    id: 'knight',
    name: 'Лицар Знань',
    themeColor: '#3b82f6',
    archetype: 'knight',
    price: 0, // default unlocked
  },
  sorceress: {
    id: 'sorceress',
    name: 'Чарівниця Формул',
    themeColor: '#8b5cf6',
    archetype: 'sorceress',
    price: 100,
  },
  cossack: {
    id: 'cossack',
    name: 'Козак-Обчислювач',
    themeColor: '#ef4444',
    archetype: 'cossack',
    price: 150,
  },
  archer: {
    id: 'archer',
    name: 'Лучниця Точності',
    themeColor: '#10b981',
    archetype: 'archer',
    price: 200,
  },
};

export const COSMETICS = {
  skins: [
    { tier: 1, name: 'Стандартний скін', price: 0, icon: '🛡️' },
    { tier: 2, name: 'Скін II', price: 2000, icon: '⚔️' },
    { tier: 3, name: 'Скін III', price: 3000, icon: '🔥' },
    { tier: 4, name: 'Скін IV', price: 4000, icon: '⚡' },
    { tier: 5, name: 'Скін V', price: 5000, icon: '👑' },
  ],
};

// ── Evolution Tiers ──
const EVOLUTION_TIERS = [
  { minLevel: 1, tier: 0, name: 'Учень', glow: false },
  { minLevel: 5, tier: 1, name: 'Мандрівник', glow: false },
  { minLevel: 10, tier: 2, name: 'Воїн', glow: true },
  { minLevel: 20, tier: 3, name: 'Чемпіон', glow: true },
  { minLevel: 35, tier: 4, name: 'Легенда', glow: true },
];

// ── Achievements ──
export const ACHIEVEMENTS = [
  // Combat milestones
  { id: 'first_victory', title: 'Перша Перемога', desc: 'Переможи свого першого ворога', icon: '⚔️' },
  { id: 'enemies_10', title: 'Мисливець', desc: 'Переможи 10 ворогів', icon: '🗡️' },
  { id: 'enemies_50', title: 'Ветеран Битв', desc: 'Переможи 50 ворогів', icon: '⚔️' },
  { id: 'enemies_100', title: 'Легендарний Воїн', desc: 'Переможи 100 ворогів', icon: '🛡️' },
  { id: 'enemies_500', title: 'Гроза Монстрів', desc: 'Переможи 500 ворогів', icon: '💀' },
  { id: 'bosses_1', title: 'Приборкувач Босів', desc: 'Переможи першого боса', icon: '👹' },
  { id: 'bosses_5', title: 'Мисливець на Босів', desc: 'Переможи 5 босів', icon: '🐲' },
  { id: 'bosses_8', title: 'Покоритель Всіх Босів', desc: 'Переможи 8 босів', icon: '👑' },

  // Streaks
  { id: 'streak_5', title: 'Серія Правильних 5', desc: 'Досягни серії з 5 правильних відповідей', icon: '🔥' },
  { id: 'streak_10', title: 'Неперевершна Серія', desc: 'Досягни серії з 10 правильних відповідей', icon: '💥' },
  { id: 'streak_20', title: 'Непереможний!', desc: 'Досягни серії з 20 правильних відповідей', icon: '🌟' },
  { id: 'streak_50', title: 'Абсолютна Концентрація', desc: 'Досягни серії з 50 правильних відповідей', icon: '🧘' },

  // Levels
  { id: 'level_5', title: 'Рівень 5', desc: 'Досягни 5 рівня героя', icon: '⬆️' },
  { id: 'level_10', title: 'Рівень 10', desc: 'Досягни 10 рівня героя', icon: '🏅' },
  { id: 'level_20', title: 'Рівень 20', desc: 'Досягни 20 рівня героя', icon: '🏆' },
  { id: 'level_35', title: 'Легенда Множення', desc: 'Досягни 35 рівня героя', icon: '👑' },

  // Regions (all 8)
  { id: 'region_1', title: 'Слаймові Луки Пройдено', desc: 'Заверши регіон 1', icon: '🌿' },
  { id: 'region_2', title: 'Грибний Бір Пройдено', desc: 'Заверши регіон 2', icon: '🍄' },
  { id: 'region_3', title: 'Медові Скелі Пройдено', desc: 'Заверши регіон 3', icon: '🍯' },
  { id: 'region_4', title: 'Піщані Руїни Підкорено', desc: 'Заверши регіон 4', icon: '🏜️' },
  { id: 'region_5', title: 'Вулканічна Кузня Пройдена', desc: 'Заверши регіон 5', icon: '🌋' },
  { id: 'region_6', title: 'Крижані Вершини Пройдено', desc: 'Заверши регіон 6', icon: '❄️' },
  { id: 'region_7', title: 'Грозове Королівство Пройдено', desc: 'Заверши регіон 7', icon: '⛈️' },
  { id: 'region_8', title: 'Примарна Цитадель', desc: 'Заверши всю кампанію (регіон 8)', icon: '👻' },

  // Table mastery (all main tables)
  { id: 'mastered_table_2', title: 'Таблиця на 2 Засвоєна', desc: 'Засвой всі приклади на ×2', icon: '✅' },
  { id: 'mastered_table_3', title: 'Таблиця на 3 Засвоєна', desc: 'Засвой всі приклади на ×3', icon: '✅' },
  { id: 'mastered_table_4', title: 'Таблиця на 4 Засвоєна', desc: 'Засвой всі приклади на ×4', icon: '✅' },
  { id: 'mastered_table_5', title: 'Таблиця на 5 Засвоєна', desc: 'Засвой всі приклади на ×5', icon: '✅' },
  { id: 'mastered_table_6', title: 'Таблиця на 6 Засвоєна', desc: 'Засвой всі приклади на ×6', icon: '💎' },
  { id: 'mastered_table_7', title: 'Таблиця на 7 Засвоєна', desc: 'Засвой всі приклади на ×7', icon: '💎' },
  { id: 'mastered_table_8', title: 'Таблиця на 8 Засвоєна', desc: 'Засвой всі приклади на ×8', icon: '💎' },
  { id: 'mastered_table_9', title: 'Таблиця на 9 Засвоєна', desc: 'Засвой всі приклади на ×9', icon: '🧠' },
  { id: 'all_mastered', title: 'Абсолютна Майстерність', desc: 'Засвой всі 100 фактів множення', icon: '🌈' },

  // Answers milestones
  { id: 'answers_100', title: 'Сотня Відповідей', desc: 'Дай 100 відповідей', icon: '📝' },
  { id: 'answers_500', title: 'П\'ятсот Відповідей', desc: 'Дай 500 відповідей', icon: '📚' },
  { id: 'answers_1000', title: 'Тисяча Знань', desc: 'Дай 1000 відповідей', icon: '📖' },

  // Infinite mode
  { id: 'infinite_10', title: 'Марафонець', desc: 'Переможи 10 ворогів у нескінченному режимі', icon: '♾️' },
  { id: 'infinite_50', title: 'Вічний Воїн', desc: 'Переможи 50 ворогів у нескінченному режимі', icon: '🗡️' },
  { id: 'infinite_wave_5', title: 'П\'ять Хвиль', desc: 'Досягни 5-ї хвилі у нескінченному режимі', icon: '🌊' },
  { id: 'infinite_wave_10', title: 'Десять Хвиль', desc: 'Досягни 10-ї хвилі у нескінченному режимі', icon: '🌊' },

  // Special
  { id: 'weak_fixed_10', title: 'Ремонтник Знань', desc: 'Виправ 10 слабких фактів', icon: '🔧' },
  { id: 'weak_fixed_30', title: 'Майстер Ремонту', desc: 'Виправ 30 слабких фактів', icon: '🔨' },
  { id: 'secret_boss', title: 'Таємний Бос', desc: 'Переможи Пана Помилкуса', icon: '❓' },
  { id: 'perfect_stage', title: 'Ідеальний Етап', desc: 'Заверши етап з 3 зірками (95%+ точність)', icon: '⭐' },
  { id: 'sessions_10', title: 'Постійний Учень', desc: 'Зіграй 10 сесій', icon: '📅' },
  { id: 'sessions_50', title: 'Відданий Герой', desc: 'Зіграй 50 сесій', icon: '🗓️' },
];

/** A critical hit lands on every Nth correct answer in a row. */
export const CRIT_EVERY = 3;
/** Correct answers in a row needed to bank one ultimate charge. */
export const ULTIMATE_STREAK = 10;
/** Charges the hero may hold at once. */
export const ULTIMATE_MAX_CHARGES = 3;
/** Damage dealt when the player spends a charge. */
export const ULTIMATE_DAMAGE = 5;

export class Hero {
  constructor(saveSystem) {
    this.saveSystem = saveSystem;
    this.hearts = 5;
    this.maxHearts = 5;
    this.combo = 0;
    this.maxCombo = 0;
    this.shieldActive = false;
    this.ultimateCharges = 0;

    this.refreshConfig();
  }

  refreshConfig() {
    const heroData = this.saveSystem.data.hero;
    const arch = ARCHETYPES[heroData.archetype] || ARCHETYPES.knight;
    // The saved hero carries a stale themeColor copy from whichever archetype
    // was active at first launch, so presentation colour follows the archetype.
    this.config = { ...arch, ...heroData, themeColor: arch.themeColor };
  }

  get level() {
    return this.saveSystem.data.stats.level;
  }

  getEvolutionTier() {
    const level = this.level;
    let found = EVOLUTION_TIERS[0];
    for (const t of EVOLUTION_TIERS) {
      if (level >= t.minLevel) found = t;
    }
    return found;
  }

  /** Full reset for a new session: vitals, streak and banked ultimates. */
  resetHearts() {
    this.healToFull();
    this.combo = 0;
    this.maxCombo = 0;
    this.shieldActive = false;
    this.ultimateCharges = 0;
  }

  /** Restores hearts only — used on level-up so the streak survives. */
  healToFull() {
    this.hearts = this.maxHearts;
  }

  get canUseUltimate() {
    return this.ultimateCharges > 0;
  }

  /**
   * Spends one banked charge. The ultimate is player-triggered, so this is
   * called from the input handler rather than from the answer pipeline.
   */
  consumeUltimate() {
    if (this.ultimateCharges <= 0) return false;
    this.ultimateCharges--;
    return true;
  }

  /** Correct answers still needed before the next charge is banked. */
  get answersToNextUltimate() {
    return ULTIMATE_STREAK - (this.combo % ULTIMATE_STREAK);
  }

  onCorrectAnswer() {
    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    // Shield activation at 5 streak
    if (this.combo === 5 && !this.shieldActive) {
      this.shieldActive = true;
    }

    // Crit on every CRIT_EVERY-th answer of the streak
    const isCrit = this.combo >= CRIT_EVERY && this.combo % CRIT_EVERY === 0;

    // Every full streak banks a charge instead of firing an ultimate outright.
    let ultimateGained = false;
    if (this.combo % ULTIMATE_STREAK === 0 && this.ultimateCharges < ULTIMATE_MAX_CHARGES) {
      this.ultimateCharges++;
      ultimateGained = true;
    }

    return {
      combo: this.combo,
      isCrit,
      isEmpowered: this.combo === 8,
      ultimateGained,
      ultimateCharges: this.ultimateCharges,
    };
  }

  takeDamage() {
    // Relaxed mode check: Hearts never drop below 1
    const isRelaxed = this.saveSystem.data.settings.relaxedMode;

    if (this.shieldActive) {
      this.shieldActive = false;
      this.combo = 0;
      return { shielded: true, hearts: this.hearts, isDefeated: false };
    }

    this.combo = 0;
    if (isRelaxed) {
      // In relaxed mode, hearts stay at current level or min 1
      this.hearts = Math.max(1, this.hearts);
      return {
        shielded: false,
        hearts: this.hearts,
        isDefeated: false, // Never defeated in relaxed mode!
      };
    }

    this.hearts = Math.max(0, this.hearts - 1);
    return {
      shielded: false,
      hearts: this.hearts,
      isDefeated: this.hearts <= 0,
    };
  }
}
