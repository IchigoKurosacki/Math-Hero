/**
 * Локалізація Math Hero.
 *
 * Українська — мова оригіналу, і вона лишається в самих даних гри: назви
 * ворогів, регіонів і досягнень стоять там, де їх видно разом із рештою
 * характеристик. Англійська приходить окремим шаром накладок, звіреним за `id`.
 * Тому додавання мови не перебудовує жодного файлу з даними, а українська
 * версія не може «зникнути» через друкарську помилку в ключі.
 *
 * Два способи дістати текст:
 *   `t('menu.play')` — рядки інтерфейсу зі словника `ui.js`;
 *   `tc(entity, 'name')` — назви та описи сутностей, з падінням на українське
 *   поле самого об'єкта.
 */
import { UI } from './ui.js';
import { CONTENT } from './content.js';

export const LANGUAGES = [
  { id: 'uk', label: 'Українська', short: 'UA', flag: '🇺🇦' },
  { id: 'en', label: 'English', short: 'EN', flag: '🇬🇧' },
];

const FALLBACK = 'uk';
let language = FALLBACK;
const listeners = new Set();

/** Мова браузера, якщо вона нам знайома. Інакше українська. */
export function detectLanguage() {
  if (typeof navigator === 'undefined') return FALLBACK;
  const tags = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
  for (const tag of tags) {
    const base = String(tag).toLowerCase().split('-')[0];
    if (LANGUAGES.some(item => item.id === base)) return base;
  }
  return 'en';
}

export function getLanguage() {
  return language;
}

export function isKnownLanguage(id) {
  return LANGUAGES.some(item => item.id === id);
}

/**
 * Перемикає мову й повідомляє підписників. Екрани перемальовуються з нуля,
 * тому окремої логіки оновлення тексту не потрібно — крім статичної оболонки
 * `index.html`, яку освіжає `applyStaticText`.
 */
export function setLanguage(id) {
  const next = isKnownLanguage(id) ? id : FALLBACK;
  if (next === language) return language;
  language = next;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = next;
    applyStaticText();
  }
  for (const listener of listeners) listener(next);
  return language;
}

export function onLanguageChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Рядок інтерфейсу. `params` підставляються за шаблоном `{name}`.
 * Відсутній ключ повертається як є — краще побачити його на екрані, ніж
 * загубити напис у порожньому місці.
 */
export function t(key, params = null) {
  const entry = UI[key];
  if (!entry) return key;
  let text = entry[language] ?? entry[FALLBACK] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

/**
 * Поле сутності гри — назва ворога, опис регіону, текст досягнення.
 * Для української віддає те, що вже лежить в об'єкті; для іншої мови шукає
 * накладку за `id` і падає на оригінал, якщо перекладу ще немає.
 */
export function tc(entity, field = 'name') {
  const own = entity?.[field];
  if (language === FALLBACK || !entity?.id) return own;
  return CONTENT[language]?.[entity.id]?.[field] ?? own;
}

/** Те саме, але коли на руках лише ключ, а не об'єкт. */
export function tcById(id, field, fallback) {
  if (language === FALLBACK) return fallback;
  return CONTENT[language]?.[id]?.[field] ?? fallback;
}

/**
 * Списки реплік: масив рідною мовою або накладка цілим масивом.
 * Кількість реплік у мовах може відрізнятись — вибір випадковий, тож це
 * нічого не ламає.
 */
export function tList(id, fallback) {
  if (language === FALLBACK) return fallback;
  const list = CONTENT[language]?.[id]?.list;
  return Array.isArray(list) && list.length ? list : fallback;
}

// ── Іменовані обгортки ────────────────────────────────────────────────────
// Ключі накладок не завжди дорівнюють `id` об'єкта: регіони пронумеровані
// числами, етапи будуються з п'яти шаблонів, а id досягнення «region_1»
// збігся б із самим регіоном. Обгортки тримають ці відповідності в одному
// місці, щоб екрани не рахували ключі самотужки.

export const creatureName = creature => tc(creature, 'name');
export const creatureQuote = creature => tc(creature, 'quote');

export const regionName = region => tcById(`region_${region?.id}`, 'name', region?.name);
export const regionDescription = region =>
  tcById(`region_${region?.id}`, 'description', region?.description);

/** Коротка назва етапу — «Знайомство», без назви регіону. */
export const stageShortName = stage =>
  tcById(`stage_${stage?.stageNumber}`, 'name', stage?.shortName);
export const stageDescription = stage =>
  tcById(`stage_${stage?.stageNumber}`, 'description', stage?.description);
/** Повна назва — «Слаймові Луки: Знайомство». */
export const stageFullName = (stage, region) =>
  region ? `${regionName(region)}: ${stageShortName(stage)}` : stageShortName(stage);

export const archetypeName = archetype => tc(archetype, 'name');
export const skinName = skin => tcById(`skin_${skin?.tier}`, 'name', skin?.name);
export const evolutionName = evolution =>
  tcById(`evo_${evolution?.tier}`, 'name', evolution?.name);

export const achievementTitle = achievement =>
  tcById(`ach_${achievement?.id}`, 'title', achievement?.title);
export const achievementDesc = achievement =>
  tcById(`ach_${achievement?.id}`, 'desc', achievement?.desc);

/**
 * Перекладає статичну оболонку: `data-i18n` для тексту,
 * `data-i18n-attr="aria-label:key"` для атрибутів.
 */
export function applyStaticText(root = null) {
  if (typeof document === 'undefined') return;
  const scope = root || document;

  for (const node of scope.querySelectorAll('[data-i18n]')) {
    node.textContent = t(node.getAttribute('data-i18n'));
  }
  for (const node of scope.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of node.getAttribute('data-i18n-attr').split(';')) {
      const [attr, key] = pair.split(':').map(part => part.trim());
      if (attr && key) node.setAttribute(attr, t(key));
    }
  }
  const title = document.querySelector('title[data-i18n-title]');
  if (title) title.textContent = t(title.getAttribute('data-i18n-title'));
}
