// Bestiary, Regions & 40-Stage Campaign Database for Math Hero RPG

import { shuffled } from '../utils/random.js';

export { shuffled };

export const REGIONS = [
  {
    id: 1,
    name: 'Слаймові Луки',
    tables: [1, 2],
    description: 'Зелені пагорби, квіти та дружні слайми.',
    bgTheme: 'meadows',
    bgColor1: '#38ef7d',
    bgColor2: '#11998e',
    skyColor: '#87ceeb',
    boss: {
      id: 'boss_1',
      name: 'Великий Слайм-Бублик',
      hpMax: 12,
      phases: 3,
      color: '#2ecc71',
      size: 1.8,
      quote: 'Я розтягнуся, але не здамся без боротьби!'
    },
    enemies: [
      { id: 'slime_green', name: 'Зелений Слайм', hp: 1, color: '#2ecc71', size: 1.0 },
      { id: 'slime_blue', name: 'Блакитний Стрибун', hp: 1, color: '#3498db', size: 0.9 },
      { id: 'mushroom_prankster', name: 'Грибний Пустун', hp: 2, color: '#e67e22', size: 1.1 },
      { id: 'jelly_bee', name: 'Желейна Бджола', hp: 2, color: '#f1c40f', size: 0.8, flying: true },
      { id: 'buble_slime', name: 'Бульбашковий Слайм', hp: 1, color: '#5dade2', size: 0.9 },
      { id: 'crab_slime', name: 'Слайм-Краб', hp: 2, color: '#48c9b0', size: 1.0 },
      { id: 'slime_armored', name: 'Броньований Слайм', hp: 2, color: '#7f8c8d', size: 1.1 },
      { id: 'slime_man', name: 'Слайм-Воїн', hp: 2, color: '#27ae60', size: 1.1 },
      { id: 'slime_mecha', name: 'Слайм-Механоїд', hp: 3, color: '#95a5a6', size: 1.2 },
      { id: 'slime_caterpillar', name: 'Слайм-Гусениця', hp: 2, color: '#82e0aa', size: 1.0 },
      { id: 'slime_spider', name: 'Слайм-Павук', hp: 2, color: '#16a085', size: 1.0 }
    ],
    elite: { id: 'elite_1', name: 'Броньований Слайм-Лицар', hp: 4, color: '#27ae60', size: 1.4 }
  },
  {
    id: 2,
    name: 'Грибний Бір',
    tables: [3],
    description: 'Величезні гриби, світлячки та густий туман.',
    bgTheme: 'forest',
    bgColor1: '#11998e',
    bgColor2: '#38ef7d',
    skyColor: '#2c3e50',
    boss: {
      id: 'boss_2',
      name: 'Пан Грибослав',
      hpMax: 12,
      phases: 3,
      color: '#8e44ad',
      size: 1.9,
      quote: 'У тумані грибного бору приклади стають ще цікавішими!'
    },
    enemies: [
      { id: 'shroom_goblin', name: 'Грибний Гоблін', hp: 2, color: '#9b59b6', size: 1.0 },
      { id: 'spiky_bug', name: 'Колючий Жук', hp: 2, color: '#d35400', size: 0.9 },
      { id: 'forest_troll', name: 'Лісовий Троль', hp: 3, color: '#16a085', size: 1.3 },
      { id: 'bat_eye', name: 'Кажан-Око', hp: 2, color: '#8e44ad', size: 0.8, flying: true },
      { id: 'mushroom_warrior', name: 'Грибний Воїн', hp: 3, color: '#a569bd', size: 1.1 },
      { id: 'shroom_goblin_knight', name: 'Грибний Гоблін-Лицар', hp: 3, color: '#8e44ad', size: 1.2 },
      { id: 'shroom_slime', name: 'Грибний Слайм', hp: 2, color: '#af7ac5', size: 1.0 },
      { id: 'spiky_chameleon', name: 'Колючий Хамелеон', hp: 3, color: '#52be80', size: 1.1 },
      { id: 'spiky_crab', name: 'Колючий Краб', hp: 3, color: '#d35400', size: 1.0 },
      { id: 'spiky_ent', name: 'Колючий Древень', hp: 4, color: '#7d6608', size: 1.4 },
      { id: 'spiky_snake', name: 'Колюча Змія', hp: 3, color: '#229954', size: 1.0 }
    ],
    elite: { id: 'elite_2', name: 'Одноокий Древень', hp: 4, color: '#7d6608', size: 1.6 }
  },
  {
    id: 3,
    name: 'Медові Скелі',
    tables: [4],
    description: 'Золоті скелі, медові водоспади та велетенські вулики.',
    bgTheme: 'honey_cliffs',
    bgColor1: '#ffe000',
    bgColor2: '#799f0c',
    skyColor: '#f39c12',
    boss: {
      id: 'boss_3',
      name: 'Королева Золотого Вулика',
      hpMax: 14,
      phases: 3,
      color: '#f1c40f',
      size: 2.0,
      quote: 'Солодкий добуток — це захист мого вулика!'
    },
    enemies: [
      { id: 'armored_bee', name: 'Броньована Бджола', hp: 2, color: '#f39c12', size: 1.0, flying: true },
      { id: 'honey_slime', name: 'Медовий Слайм', hp: 2, color: '#f1c40f', size: 1.1 },
      { id: 'spear_wasp', name: 'Оса-Списоносець', hp: 3, color: '#e67e22', size: 1.0, flying: true },
      { id: 'bear_sweet', name: 'Ведмідь-Ласун', hp: 3, color: '#d35400', size: 1.4 },
      { id: 'builder_wasp', name: 'Оса-Будівельник', hp: 3, color: '#e67e22', size: 1.0, flying: true },
      { id: 'candy_bug', name: 'Цукерковий Жук', hp: 2, color: '#f5b7b1', size: 0.9 },
      { id: 'honey_bat', name: 'Медовий Кажан', hp: 3, color: '#d4ac0d', size: 1.0, flying: true },
      { id: 'honey_bug', name: 'Медовий Жук', hp: 3, color: '#f39c12', size: 1.0 },
      { id: 'honey_caterpillar', name: 'Медова Гусениця', hp: 3, color: '#f7dc6f', size: 1.1 },
      { id: 'honey_golem', name: 'Медовий Голем', hp: 4, color: '#b9770e', size: 1.4 },
      { id: 'warrior_bee', name: 'Бджола-Воїн', hp: 3, color: '#f1c40f', size: 1.0, flying: true }
    ],
    elite: { id: 'elite_3', name: 'Стільниковий Титан', hp: 4, color: '#d4ac0d', size: 1.6 }
  },
  {
    id: 4,
    name: 'Піщані Руїни',
    tables: [5],
    description: 'Давні обеліски, рухомі піски та стародавні загадки.',
    bgTheme: 'desert',
    bgColor1: '#fc4a1a',
    bgColor2: '#f7b733',
    skyColor: '#edc9af',
    boss: {
      id: 'boss_4',
      name: 'Фараон П’ятого Бархана',
      hpMax: 14,
      phases: 3,
      color: '#e67e22',
      size: 2.0,
      quote: 'Тисячі років тому ці приклади охороняли мої піраміди!'
    },
    enemies: [
      { id: 'sand_beetle', name: 'Піщаний Жук', hp: 2, color: '#e67e22', size: 1.0 },
      { id: 'mummy_student', name: 'Мумія-Учень', hp: 3, color: '#bdc3c7', size: 1.1 },
      { id: 'stone_mask', name: 'Кам’яна Маска', hp: 3, color: '#7f8c8d', size: 1.2, flying: true },
      { id: 'desert_goblin', name: 'Пустельний Гоблін', hp: 2, color: '#d35400', size: 1.0 },
      { id: 'cat_snake', name: 'Котозмій', hp: 3, color: '#dc7633', size: 1.1 },
      { id: 'desert_construct', name: 'Пустельний Конструкт', hp: 4, color: '#909497', size: 1.3 },
      { id: 'desert_dog', name: 'Пустельний Пес', hp: 3, color: '#ca6f1e', size: 1.1 },
      { id: 'desert_goro', name: 'Пустельний Горо', hp: 4, color: '#a04000', size: 1.3 },
      { id: 'mummy_assassin', name: 'Мумія-Нишпорка', hp: 3, color: '#d7dbdd', size: 1.1 },
      { id: 'mummy_nomad', name: 'Мумія-Кочівник', hp: 3, color: '#bdc3c7', size: 1.1 },
      { id: 'mummy_tank', name: 'Мумія-Охоронець', hp: 4, color: '#85929e', size: 1.4 }
    ],
    elite: { id: 'elite_4', name: 'Голем із Трьома Ядрами', hp: 5, color: '#7f8c8d', size: 1.6 }
  },
  {
    id: 5,
    name: 'Вулканічна Кузня',
    tables: [6],
    description: 'Лавові річки, вогняні ковадла та гарячі випробування.',
    bgTheme: 'volcano',
    bgColor1: '#f83600',
    bgColor2: '#fe8c00',
    skyColor: '#4a0e17',
    boss: {
      id: 'boss_5',
      name: 'Дракон Шестикрил',
      hpMax: 16,
      phases: 3,
      color: '#e74c3c',
      size: 2.2,
      quote: 'Моє полум’я загартовує лише правильні відповіді!'
    },
    enemies: [
      { id: 'fire_slime', name: 'Вогняний Слайм', hp: 3, color: '#e74c3c', size: 1.1 },
      { id: 'lava_crab', name: 'Лавовий Краб', hp: 3, color: '#c0392b', size: 1.2 },
      { id: 'smith_goblin', name: 'Гоблін-Коваль', hp: 3, color: '#d35400', size: 1.1 },
      { id: 'magma_golem', name: 'Магмовий Голем', hp: 4, color: '#900c3f', size: 1.5 },
      { id: 'magma_bug', name: 'Магмовий Жук', hp: 3, color: '#e74c3c', size: 1.0 },
      { id: 'magma_phoenix', name: 'Магмовий Фенікс', hp: 4, color: '#ff6b35', size: 1.2, flying: true },
      { id: 'magma_lizard', name: 'Магмова Ящірка', hp: 3, color: '#cb4335', size: 1.1 },
      { id: 'magma_pangolin', name: 'Магмовий Панголін', hp: 4, color: '#922b21', size: 1.3 },
      { id: 'magma_cat', name: 'Магмовий Кіт', hp: 3, color: '#e59866', size: 1.1 },
      { id: 'magma_scorpion', name: 'Магмовий Скорпіон', hp: 4, color: '#b03a2e', size: 1.2 },
      { id: 'magma_spider_dog', name: 'Магмовий Павукопес', hp: 4, color: '#943126', size: 1.2 }
    ],
    elite: { id: 'elite_5', name: 'Лавовий Бик', hp: 5, color: '#c0392b', size: 1.7 }
  },
  {
    id: 6,
    name: 'Крижані Вершини',
    tables: [7],
    description: 'Замерзлі водоспади, снігові вихори та полярне сяйво.',
    bgTheme: 'ice',
    bgColor1: '#00c6ff',
    bgColor2: '#0072ff',
    skyColor: '#1b2a47',
    boss: {
      id: 'boss_6',
      name: 'Крижаний Демон Сьомої Брами',
      hpMax: 16,
      phases: 3,
      color: '#2980b9',
      size: 2.2,
      quote: 'Мороз не завадить гарячому розуму розв’язати мій добуток!'
    },
    enemies: [
      { id: 'ice_slime', name: 'Крижаний Слайм', hp: 3, color: '#3498db', size: 1.1 },
      { id: 'snow_wolf', name: 'Сніговий Вовк', hp: 3, color: '#ecf0f1', size: 1.2 },
      { id: 'frost_goblin', name: 'Крижаний Гоблін', hp: 3, color: '#2980b9', size: 1.1 },
      { id: 'frost_golem', name: 'Морозний Голем', hp: 4, color: '#1f618d', size: 1.5 },
      { id: 'snow_assassin', name: 'Сніговий Слідопит', hp: 3, color: '#aed6f1', size: 1.1 },
      { id: 'snow_butterfly', name: 'Сніговий Метелик', hp: 3, color: '#d6eaf8', size: 0.9, flying: true },
      { id: 'snow_yeti', name: 'Сніговий Єті', hp: 4, color: '#ecf0f1', size: 1.4 },
      { id: 'snow_gargoyle', name: 'Снігова Горгулья', hp: 4, color: '#5d6d7e', size: 1.2, flying: true },
      { id: 'snow_horse', name: 'Сніговий Кінь', hp: 4, color: '#d4e6f1', size: 1.3 },
      { id: 'snow_scorpion', name: 'Сніговий Скорпіон', hp: 3, color: '#7fb3d5', size: 1.1 },
      { id: 'snow_spirit', name: 'Сніговий Дух', hp: 3, color: '#eaf2f8', size: 1.1 }
    ],
    elite: { id: 'elite_6', name: 'Грозовий Грифон', hp: 5, color: '#3498db', size: 1.7, flying: true }
  },
  {
    id: 7,
    name: 'Грозове Королівство',
    tables: [8],
    description: 'Темні замки, летючі острови та енергетичні блискавки.',
    bgTheme: 'storm',
    bgColor1: '#4776e6',
    bgColor2: '#8e54e9',
    skyColor: '#1a102f',
    boss: {
      id: 'boss_7',
      name: 'Восьмирукий Володар Бурі',
      hpMax: 18,
      phases: 3,
      color: '#8e44ad',
      size: 2.3,
      quote: 'Вісім рук — це вісім множильників електричної сили!'
    },
    enemies: [
      { id: 'electric_slime', name: 'Електричний Слайм', hp: 3, color: '#f1c40f', size: 1.1 },
      { id: 'storm_harpy', name: 'Штормова Гарпія', hp: 3, color: '#9b59b6', size: 1.2, flying: true },
      { id: 'dark_knight', name: 'Темний Лицар', hp: 4, color: '#34495e', size: 1.3 },
      { id: 'thunder_mage', name: 'Громовий Чаклун', hp: 4, color: '#8e44ad', size: 1.2 },
      { id: 'storm_bug', name: 'Грозовий Жук', hp: 3, color: '#f4d03f', size: 1.0 },
      { id: 'storm_crab', name: 'Грозовий Краб', hp: 4, color: '#5499c7', size: 1.1 },
      { id: 'storm_golem', name: 'Грозовий Голем', hp: 5, color: '#5d6d7e', size: 1.5 },
      { id: 'storm_mage', name: 'Грозовий Маг', hp: 4, color: '#af7ac5', size: 1.1 },
      { id: 'storm_mecha', name: 'Грозовий Механоїд', hp: 5, color: '#85929e', size: 1.3 },
      { id: 'storm_spirit', name: 'Грозовий Дух', hp: 4, color: '#a9cce3', size: 1.1 },
      { id: 'storm_tank', name: 'Грозовий Охоронець', hp: 5, color: '#34495e', size: 1.4 }
    ],
    elite: { id: 'elite_7', name: 'Примарний Мисливець', hp: 6, color: '#8e44ad', size: 1.7 }
  },
  {
    id: 8,
    name: 'Примарна Цитадель',
    tables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // Mixed review of ALL unlocked tables!
    description: 'Магічний годинник, портали та змішане повторення всіх відкритих таблиць.',
    bgTheme: 'ghost',
    bgColor1: '#11998e',
    bgColor2: '#38ef7d',
    skyColor: '#0a0a1a',
    boss: {
      id: 'boss_8',
      name: 'Король-Привид Множення',
      hpMax: 20,
      phases: 3,
      color: '#9b59b6',
      size: 2.5,
      quote: 'Тільки той, хто знає всі таблиці, підкорить фінальну вежу!'
    },
    enemies: [
      { id: 'phantom_scribe', name: 'Примарний Писар', hp: 4, color: '#9b59b6', size: 1.2 },
      { id: 'enchanted_book', name: 'Зачарована Книга', hp: 3, color: '#16a085', size: 0.9, flying: true },
      { id: 'shadow_knight', name: 'Тіньовий Лицар', hp: 4, color: '#2c3e50', size: 1.3 },
      { id: 'mirror_hero', name: 'Дзеркальний Двійник', hp: 5, color: '#ecf0f1', size: 1.3 },
      { id: 'chaos_spirit', name: 'Дух Хаосу', hp: 4, color: '#bb8fce', size: 1.2 },
      { id: 'ghost_doll', name: 'Примарна Лялька', hp: 4, color: '#d2b4de', size: 1.0 },
      { id: 'ghost_spirit', name: 'Примарний Дух', hp: 4, color: '#c39bd3', size: 1.1 },
      { id: 'ghost_woman', name: 'Примарна Пані', hp: 5, color: '#a569bd', size: 1.2 },
      { id: 'shadow_defender', name: 'Тіньовий Захисник', hp: 5, color: '#4a235a', size: 1.3 },
      { id: 'shadow_mage', name: 'Тіньовий Маг', hp: 5, color: '#6c3483', size: 1.1 },
      { id: 'shadow_man', name: 'Тіньовий Мандрівник', hp: 5, color: '#512e5f', size: 1.2 }
    ],
    elite: { id: 'elite_8', name: 'Астральний Архіваріус', hp: 6, color: '#48c9b0', size: 1.8 }
  }
];

/**
 * The secret level exists outside the campaign map, so it carries its own
 * presentation instead of borrowing a region's.
 */
export const SECRET_REGION = {
  // Ninth in the same numbering space as the campaign regions, so anything
  // keyed by region id (music, themes) resolves it without a special case.
  id: 9,
  name: 'Розлам Помилок',
  tables: [2, 3, 4, 5, 6, 7, 8, 9],
  description: 'Простір, де збираються всі помилки світу.',
  bgTheme: 'glitch',
  bgColor1: '#00ffc8',
  bgColor2: '#3a0ca3',
  skyColor: '#05010f',
};

export const SECRET_BOSS = {
  id: 'boss_secret',
  name: 'Пан Помилкус',
  hpMax: 40,
  phases: 4,
  color: '#e74c3c',
  size: 2.6,
  quote: 'Я зібрав усі твої минулі помилки, але разом ми їх виправимо!'
};

/**
 * Creatures that leak into the secret level. They belong to no region and are
 * only ever met on the road to Пан Помилкус, shuffled between the champions.
 */
export const SECRET_ENEMIES = [
  { id: 'glitch', name: 'Глітч', hp: 4, color: '#00ffc8', size: 1.1 },
  { id: 'glitch_bee', name: 'Глітч-Бджола', hp: 4, color: '#f7ff00', size: 1.0, flying: true },
  { id: 'glitch_slime_horse', name: 'Глітч-Слаймокінь', hp: 5, color: '#00e5ff', size: 1.3 },
  { id: 'glitch_assassin', name: 'Глітч-Тінь', hp: 5, color: '#ff00a0', size: 1.2 },
  { id: 'glitch_knight', name: 'Глітч-Лицар', hp: 5, color: '#8affff', size: 1.3 },
  { id: 'glitch_chimera', name: 'Глітч-Химера', hp: 6, color: '#c400ff', size: 1.4 },
  { id: 'glitch_golem', name: 'Глітч-Голем', hp: 6, color: '#7a8fa6', size: 1.6 },
  { id: 'glitch_dragon', name: 'Глітч-Дракон', hp: 6, color: '#ff3860', size: 1.7, flying: true },
];

/** How many of a region's creatures can turn up in a single stage attempt. */
const ENCOUNTER_TABLE_SIZE = 5;

/**
 * Draws regular opponents for one stage attempt.
 *
 * Each attempt first rolls its own encounter table out of the region roster,
 * then fills the stage from it. Every creature has exactly the same chance of
 * making that table, so nobody is rare — but a single pass through a region
 * reliably leaves a few unmet, and that gap is what makes replaying it worth
 * something.
 *
 * Within the stage the table is dealt from a bag rather than sampled freshly
 * each time: plain sampling regularly threw the same creature six times out of
 * ten, which reads as a bug. The bag keeps their shares even and still never
 * repeats one back to back.
 */
export function rollRegulars(region, count) {
  const roster = region.enemies || [];
  if (!roster.length) return [];

  const table = shuffled(roster).slice(0, Math.min(ENCOUNTER_TABLE_SIZE, roster.length));
  const picks = [];
  let bag = [];
  let previous = null;
  for (let index = 0; index < count; index++) {
    if (!bag.length) bag = shuffled(table);
    // A refilled bag can start on the creature that just fought; push it back
    // one slot so no one walks on twice in a row.
    if (bag[0] === previous && bag.length > 1) [bag[0], bag[1]] = [bag[1], bag[0]];
    previous = bag.shift();
    picks.push(previous);
  }
  return picks;
}

const STAGE_TEMPLATES = [
  {
    stageNumber: 1,
    suffix: 'Знайомство',
    stageType: 'intro',
    tier: 1,
    targetEnemies: 10,
    timeOfDay: 'day',
    weatherByRegion: ['none', 'none', 'petals', 'sand', 'ash', 'snow', 'rain', 'none'],
    description: 'Розпізнавання добутків із двома варіантами відповіді.',
    // Full ten-enemy roster: the stage list is what the player actually fights.
    buildEnemies: (r) => rollRegulars(r, 10),
  },
  {
    stageNumber: 2,
    suffix: 'Шлях Знань',
    stageType: 'journey',
    tier: 2,
    targetEnemies: 10,
    timeOfDay: 'sunset',
    weatherByRegion: ['petals', 'none', 'none', 'sand', 'ash', 'snow', 'rain', 'none'],
    description: 'Уважний вибір правильної відповіді з трьох варіантів.',
    buildEnemies: (r) => rollRegulars(r, 10),
  },
  {
    stageNumber: 3,
    suffix: 'Складна Стежка',
    stageType: 'challenge',
    tier: 3,
    targetEnemies: 10,
    timeOfDay: 'night',
    weatherByRegion: ['none', 'none', 'petals', 'sand', 'ash', 'snow', 'storm', 'none'],
    description: 'Закріплення таблиці з чотирма правдоподібними відповідями.',
    buildEnemies: (r) => rollRegulars(r, 10),
  },
  {
    stageNumber: 4,
    suffix: 'Елітне Випробування',
    stageType: 'elite',
    tier: 4,
    targetEnemies: 10,
    timeOfDay: 'night',
    weatherByRegion: ['fireflies', 'none', 'petals', 'sand', 'ash', 'snow', 'storm', 'none'],
    description: 'Самостійне введення відповідей і бій з елітним ворогом.',
    // The elite is the closing fight, not a mid-stage encounter.
    buildEnemies: (r) => [...rollRegulars(r, 9), r.elite],
  },
  {
    stageNumber: 5,
    suffix: 'Бій з Босом',
    stageType: 'boss',
    tier: 4,
    targetEnemies: 10,
    timeOfDay: 'night',
    weatherByRegion: ['none', 'none', 'petals', 'sand', 'ash', 'snow', 'storm', 'ghosts'],
    description: 'Багатофазний бій із ручним введенням відповідей.',
    buildEnemies: (r) => [...rollRegulars(r, 8), r.elite, r.boss],
  },
];

/**
 * Generates 40 fully playable stages (8 regions × 5 stages).
 * Every stage contains presentation metadata, a ten-enemy roster, a distinct
 * event, and its own difficulty tier.
 *
 * `targetEnemies` counts opponents, not questions: each of them takes as many
 * correct answers as it has hit points, so a stage asks well more than ten.
 * The field is named for what it measures so no screen can label it wrongly.
 */
export function generate40CampaignStages() {
  const stages = [];

  REGIONS.forEach((region) => {
    STAGE_TEMPLATES.forEach((template) => {
      stages.push({
        id: `${region.id}_${template.stageNumber}`,
        regionId: region.id,
        stageNumber: template.stageNumber,
        name: `${region.name}: ${template.suffix}`,
        // The bare suffix, for screens that already show the region separately.
        // Carried rather than re-listed in the UI, where a second copy of these
        // names had already drifted out of step with these ones.
        shortName: template.suffix,
        description: template.description,
        stageType: template.stageType,
        tables: [...region.tables],
        tier: template.tier,
        targetEnemies: template.targetEnemies,
        timeOfDay: template.timeOfDay,
        weather: template.weatherByRegion[region.id - 1] || 'none',
        isBossStage: template.stageType === 'boss',
        enemies: template.buildEnemies(region),
      });
    });
  });

  return stages;
}

/**
 * Rolls a fresh line-up for one stage. Called when the stage actually starts,
 * so the roster baked into CAMPAIGN_STAGES at import time never becomes the
 * line-up the player faces every single run.
 */
export function rollStageEnemies(stage) {
  const region = REGIONS.find(item => item.id === stage?.regionId);
  const template = STAGE_TEMPLATES.find(item => item.stageNumber === stage?.stageNumber);
  if (!region || !template) return [...(stage?.enemies || [])];
  return template.buildEnemies(region);
}

export const CAMPAIGN_STAGES = generate40CampaignStages();

export function getCampaignStage(stageId) {
  return CAMPAIGN_STAGES.find(stage => stage.id === stageId) || null;
}
