/**
 * Рядки інтерфейсу двома мовами.
 *
 * Обидві мови стоять поруч у одному записі навмисно: коли текст правлять,
 * друга мова не залишається позаду непомітно. Ключі згруповані за екраном.
 * Підстановки — у стилі `{name}`.
 */
export const UI = {
  // ── Оболонка ──
  'app.title': { uk: 'Math Hero: Легенди множення', en: 'Math Hero: Legends of Multiplication' },
  'app.logoAlt': { uk: 'Math Hero — Легенди множення', en: 'Math Hero — Legends of Multiplication' },
  'app.world': { uk: 'Ігровий світ Math Hero', en: 'Math Hero game world' },
  'app.hud': { uk: 'Ігровий інтерфейс', en: 'Game interface' },
  'app.combatRegion': { uk: 'Математичний бій', en: 'Math battle' },
  'app.loading': { uk: 'Готуємо пригоду…', en: 'Preparing your adventure…' },

  // ── HUD ──
  'hud.level': { uk: 'Рівень {level}', en: 'Level {level}' },
  'hud.levelShort': { uk: 'РІВЕНЬ {level}', en: 'LEVEL {level}' },
  'hud.xpAria': { uk: 'Досвід героя', en: 'Hero experience' },
  'hud.xpValue': { uk: '{current}/{max} XP', en: '{current}/{max} XP' },
  'hud.levelProgress': { uk: 'Прогрес рівня', en: 'Level progress' },
  'hud.healthAria': { uk: 'Здоров’я героя: {current} із {max}', en: 'Hero health: {current} of {max}' },
  'hud.pause': { uk: 'Пауза', en: 'Pause' },
  'hud.ready': { uk: 'Готовий до пригод', en: 'Ready for adventure' },
  'hud.enemiesLeft': { uk: '{done}/{total} ворогів', en: '{done}/{total} enemies' },
  'hud.wave': { uk: 'Хвиля {wave}', en: 'Wave {wave}' },

  // ── Головне меню ──
  'menu.regionsConquered': { uk: '{done}/8 регіонів підкорено', en: '{done}/8 regions conquered' },
  'menu.hero': { uk: 'Герой', en: 'Hero' },
  'menu.treasury': { uk: 'Скарбниця', en: 'Treasury' },
  'menu.coinsAmount': { uk: '{coins} монет', en: '{coins} coins' },
  'menu.bestStreak': { uk: 'Рекорд серії', en: 'Best streak' },
  'menu.modesAria': { uk: 'Головні режими гри', en: 'Main game modes' },
  'menu.campaign': { uk: 'Продовжити кампанію', en: 'Continue campaign' },
  'menu.campaignHint': { uk: '40 етапів · 8 фантастичних регіонів', en: '40 stages · 8 fantasy regions' },
  'menu.single': { uk: 'Одна таблиця', en: 'Single table' },
  'menu.singleHint': { uk: 'Поступове навчання', en: 'Step-by-step learning' },
  'menu.mixed': { uk: 'Змішаний бій', en: 'Mixed battle' },
  'menu.mixedHint': { uk: 'Обери кілька таблиць', en: 'Pick several tables' },
  'menu.weak': { uk: 'Слабкі місця', en: 'Weak spots' },
  'menu.weakHint': { uk: 'Переможи свої помилки', en: 'Beat your own mistakes' },
  'menu.mastery': { uk: 'Майстерність', en: 'Mastery' },
  'menu.masteryHint': { uk: 'Ручне введення', en: 'Type your answers' },
  'menu.infinite': { uk: 'Нескінченний похід', en: 'Endless run' },
  'menu.infiniteHint': { uk: 'Хвилі ворогів і рекорди', en: 'Enemy waves and records' },
  'menu.secretLocked': { uk: 'Таємний бос', en: 'Secret boss' },
  'menu.secretLockedHint': { uk: 'Поки що запечатано', en: 'Still sealed' },
  'menu.secretHint': { uk: 'Особливе випробування', en: 'A special trial' },
  'menu.secretGate': {
    uk: 'Таємний бос відкриється після кампанії або після 100 відповідей і появи щонайменше п’яти слабких прикладів.',
    en: 'The secret boss unlocks after the campaign, or after 100 answers with at least five weak facts.',
  },
  'menu.wardrobe': { uk: 'Герой і магазин', en: 'Hero & shop' },
  'menu.bestiary': { uk: 'Бестіарій', en: 'Bestiary' },
  'menu.stats': { uk: 'Карта знань', en: 'Knowledge map' },
  'menu.achievements': { uk: 'Досягнення', en: 'Achievements' },
  'menu.settings': { uk: 'Налаштування', en: 'Settings' },
  'menu.back': { uk: '⬅️ Назад', en: '⬅️ Back' },
  'menu.backToMenu': { uk: '← Головне меню', en: '← Main menu' },
  'menu.homeMenu': { uk: '🏠 Головне меню', en: '🏠 Main menu' },

  // ── Карта королівств ──
  'campaign.kicker': { uk: 'Велика подорож', en: 'The great journey' },
  'campaign.title': { uk: 'Карта королівств', en: 'Map of kingdoms' },
  'campaign.lead': {
    uk: 'Обирай відкритий регіон, долай п’ять етапів і перемагай його володаря.',
    en: 'Pick an unlocked region, clear five stages and defeat its ruler.',
  },
  'campaign.tables': { uk: 'Таблиці: {tables}', en: 'Tables: {tables}' },
  'campaign.tablesAll': { uk: 'усі відкриті', en: 'all unlocked' },
  'campaign.stagesDone': { uk: '{done}/5 етапів', en: '{done}/5 stages' },
  'campaign.sealed': { uk: 'Запечатано', en: 'Sealed' },
  'campaign.unlocked': { uk: 'Відкрито', en: 'Unlocked' },
  'campaign.backToMap': { uk: '← Карта королівств', en: '← Map of kingdoms' },

  // ── Вибір етапу ──
  'stage.region': { uk: 'Регіон {id}', en: 'Region {id}' },
  'stage.enemiesAndTier': { uk: '{count} ворогів · складність {tier}', en: '{count} enemies · difficulty {tier}' },
  'stage.completed': { uk: 'Пройдено', en: 'Cleared' },
  'stage.toBattle': { uk: 'До бою', en: 'Fight' },

  // ── Бестіарій ──
  'bestiary.kicker': { uk: 'Польовий щоденник', en: 'Field journal' },
  'bestiary.lead': {
    uk: 'Кожна істота, яку ти зустрів у поході. Решта чекає попереду.',
    en: 'Every creature you have met on the road. The rest still waits ahead.',
  },
  'bestiary.discovered': { uk: 'Відкрито', en: 'Discovered' },
  'bestiary.defeated': { uk: 'Переможено', en: 'Defeated' },
  'bestiary.completion': { uk: 'Заповнення', en: 'Completion' },
  'bestiary.defeatedTimes': { uk: 'Переможено ×{count}', en: 'Defeated ×{count}' },
  'bestiary.met': { uk: 'Зустрінуто', en: 'Encountered' },
  'bestiary.unknown': { uk: 'Невідомо', en: 'Unknown' },
  'bestiary.unknownCreature': { uk: 'Невідома істота', en: 'Unknown creature' },
  'bestiary.hp': { uk: '{hp} ХП', en: '{hp} HP' },
  'bestiary.rankRegular': { uk: 'Звичайний', en: 'Regular' },
  'bestiary.rankElite': { uk: 'Еліта', en: 'Elite' },
  'bestiary.rankBoss': { uk: 'Бос', en: 'Boss' },

  // ── Вибір таблиць ──
  'tables.pickTitle': { uk: 'Обери таблицю', en: 'Pick a table' },
  'tables.pickKicker': {
    uk: 'Поступове навчання · чотири рівні складності',
    en: 'Step-by-step learning · four difficulty tiers',
  },
  'tables.mastered': { uk: '{percent}% засвоєно', en: '{percent}% mastered' },
  'tables.tableOf': { uk: 'Таблиця на {table}', en: 'Table of {table}' },
  'tables.tierLead': {
    uk: 'Кожен етап — 10 ворогів. Наступний відкривається після точності не нижче 80%.',
    en: 'Each stage is 10 enemies. The next one opens at 80% accuracy or better.',
  },
  'tables.tier': { uk: 'Етап {tier}', en: 'Tier {tier}' },
  'tables.tier1': { uk: '2 варіанти відповіді', en: '2 answer choices' },
  'tables.tier2': { uk: '3 варіанти відповіді', en: '3 answer choices' },
  'tables.tier3': { uk: '4 варіанти відповіді', en: '4 answer choices' },
  'tables.tier4': { uk: 'Ручне введення', en: 'Type the answer' },
  'tables.available': { uk: 'Доступно', en: 'Available' },
  'tables.needPrevious': { uk: '🔒 Спершу пройдіть попередній', en: '🔒 Clear the previous tier first' },
  'tables.otherTable': { uk: '⬅️ Інша таблиця', en: '⬅️ Another table' },
  'tables.selectedCount': { uk: 'Обрано таблиць: {count}', en: 'Tables selected: {count}' },
  'tables.startBattle': { uk: '⚔ Розпочати бій', en: '⚔ Start the battle' },

  // ── Пауза ──
  'pause.title': { uk: 'Гра на паузі', en: 'Game paused' },
  'pause.kicker': { uk: 'Бій зупинено', en: 'Battle on hold' },
  'pause.resume': { uk: '▶️ Продовжити бій', en: '▶️ Resume battle' },
  'pause.restart': { uk: '🔄 Перезапустити етап', en: '🔄 Restart stage' },
  'pause.endInfinite': { uk: '🏁 Завершити похід і зберегти', en: '🏁 End run and save' },
  'pause.settings': { uk: '⚙️ Налаштування', en: '⚙️ Settings' },
  'pause.exit': { uk: '🚪 Вийти в головне меню', en: '🚪 Quit to main menu' },
  'pause.exitTitle': { uk: 'Вихід із бою', en: 'Leave the battle' },
  'pause.exitConfirm': {
    uk: 'Завершити поточний бій? Незбережений прогрес цього етапу буде втрачено.',
    en: 'End the current battle? Unsaved progress for this stage will be lost.',
  },

  // ── Результати ──
  'result.victory': { uk: 'ПЕРЕМОГА!', en: 'VICTORY!' },
  'result.firstClear': { uk: 'Перше проходження', en: 'First clear' },
  'result.replay': { uk: 'Повторне проходження', en: 'Replay' },
  'result.stageCleared': { uk: 'Етап «{stage}» пройдено', en: 'Stage “{stage}” cleared' },
  'result.starsAria': { uk: 'Отримано зірок: {stars} з 3', en: 'Stars earned: {stars} of 3' },
  'result.accuracy': { uk: 'Точність', en: 'Accuracy' },
  'result.stars': { uk: 'Зірок', en: 'Stars' },
  'result.continue': { uk: '🚀 Продовжити шлях', en: '🚀 Continue the journey' },
  'result.defeatTitle': { uk: 'НЕ ЗДАВАЙСЯ!', en: 'DON’T GIVE UP!' },
  'result.defeatStage': { uk: 'Етап «{stage}»', en: 'Stage “{stage}”' },
  'result.defeatLead': {
    uk: 'Навіть видатні герої тренуються перед перемогою',
    en: 'Even great heroes train before they win',
  },
  'result.defeatNote': {
    uk: 'Кожна спроба робить таблицю множення звичнішою.',
    en: 'Every attempt makes the times table more familiar.',
  },
  'result.retry': { uk: '🔄 Спробувати ще раз', en: '🔄 Try again' },
  'result.trainingTitle': { uk: 'Результати тренування', en: 'Training results' },
  'result.trainingDefault': { uk: 'Тренування', en: 'Training' },
  'result.modeSingle': { uk: 'Тренування таблиці', en: 'Single table drill' },
  'result.modeMixed': { uk: 'Змішане тренування', en: 'Mixed drill' },
  'result.modeWeak': { uk: 'Слабкі місця', en: 'Weak spots' },
  'result.modeMastery': { uk: 'Режим майстерності', en: 'Mastery mode' },
  'result.scopeTier': { uk: 'Рівень {tier}', en: 'Tier {tier}' },
  'result.correct': { uk: 'Правильних', en: 'Correct' },
  'result.time': { uk: 'Час', en: 'Time' },
  'result.repeat': { uk: '🔄 Повторити', en: '🔄 Play again' },
  'result.infiniteTitle': { uk: 'Нескінченний похід', en: 'Endless run' },
  'result.infiniteRecord': { uk: 'Рекорд: {kills} ворогів', en: 'Record: {kills} enemies' },
  'result.newRecord': { uk: '🎉 Новий рекорд!', en: '🎉 New record!' },
  'result.waveLabel': { uk: 'Хвиля', en: 'Wave' },
  'result.secondsShort': { uk: '{seconds}с', en: '{seconds}s' },

  // ── Гардероб ──
  'wardrobe.title': { uk: 'Гардероб героя', en: 'Hero wardrobe' },
  'wardrobe.archetype': { uk: 'Архетип', en: 'Archetype' },
  'wardrobe.look': { uk: 'Вигляд', en: 'Appearance' },
  'wardrobe.selected': { uk: 'Обрано', en: 'Selected' },
  'wardrobe.equip': { uk: 'Вдягти', en: 'Equip' },
  'wardrobe.done': { uk: '✔ Готово', en: '✔ Done' },
  'wardrobe.needCoinsTitle': { uk: 'Бракує монет', en: 'Not enough coins' },
  'wardrobe.needCoins': {
    uk: 'Для цієї покупки потрібно 🪙 {price} монет. Перемагай ворогів і повертайся!',
    en: 'This purchase costs 🪙 {price} coins. Defeat some enemies and come back!',
  },

  // ── Карта майстерності ──
  'mastery.title': { uk: 'Карта майстерності', en: 'Mastery map' },
  'mastery.kicker': { uk: '{mastered} зі 100 фактів засвоєно', en: '{mastered} of 100 facts mastered' },
  'mastery.answers': { uk: 'Відповідей', en: 'Answers' },
  'mastery.fixed': { uk: 'Виправлено', en: 'Fixed' },
  'mastery.cellTitle': {
    uk: '{a}×{b}={product} · показано {shown}, правильно {correct}',
    en: '{a}×{b}={product} · shown {shown}, correct {correct}',
  },
  'mastery.legendMastered': { uk: 'Засвоєно', en: 'Mastered' },
  'mastery.legendFamiliar': { uk: 'Знайомо', en: 'Familiar' },
  'mastery.legendUnstable': { uk: 'Нестабільно', en: 'Unstable' },
  'mastery.legendRevision': { uk: 'Потребує повторення', en: 'Needs revision' },
  'mastery.legendNew': { uk: 'Ще не вивчено', en: 'Not learned yet' },

  // ── Досягнення ──
  'achievements.title': { uk: '🏆 Досягнення Героя', en: '🏆 Hero achievements' },
  'achievements.kicker': { uk: '{earned} з {total} відкрито', en: '{earned} of {total} unlocked' },
  'achievements.earned': { uk: 'Отримано', en: 'Earned' },
  'achievements.locked': { uk: 'Закрито', en: 'Locked' },

  // ── Налаштування ──
  'settings.title': { uk: 'Налаштування', en: 'Settings' },
  'settings.kicker': { uk: 'Мова · звук · навчання · доступність', en: 'Language · sound · learning · accessibility' },
  'settings.groupLanguage': { uk: 'Мова', en: 'Language' },
  'settings.language': { uk: 'Мова інтерфейсу', en: 'Interface language' },
  'settings.languageHint': {
    uk: 'Текст меню, підказок і назв істот',
    en: 'Menus, hints and creature names',
  },
  'settings.groupSound': { uk: 'Звук', en: 'Sound' },
  'settings.sfx': { uk: 'Звукові ефекти', en: 'Sound effects' },
  'settings.sfxHint': { uk: 'Удари, монети, кліки', en: 'Hits, coins, clicks' },
  'settings.sfxVolume': { uk: 'Гучність ефектів', en: 'Effects volume' },
  'settings.bgm': { uk: 'Фонова музика', en: 'Background music' },
  'settings.bgmHint': { uk: 'Теми регіонів і босів', en: 'Region and boss themes' },
  'settings.bgmVolume': { uk: 'Гучність музики', en: 'Music volume' },
  'settings.vibration': { uk: 'Вібрація', en: 'Vibration' },
  'settings.vibrationHint': { uk: 'Тактильна вібрація при ударах', en: 'Haptic vibration on hits' },
  'settings.groupLearning': { uk: 'Навчання', en: 'Learning' },
  'settings.tables1112': { uk: 'Таблиці 11 та 12', en: 'Tables 11 and 12' },
  'settings.tables1112Hint': { uk: 'Додати складніші множники', en: 'Add the harder multipliers' },
  'settings.relaxed': { uk: 'Спокійний режим', en: 'Relaxed mode' },
  'settings.relaxedHint': { uk: 'Життя не закінчуються', en: 'Lives never run out' },
  'settings.groupAccess': { uk: 'Доступність', en: 'Accessibility' },
  'settings.reducedMotion': { uk: 'Зменшений рух', en: 'Reduced motion' },
  'settings.reducedMotionHint': { uk: 'Менше анімацій та ефектів', en: 'Fewer animations and effects' },
  'settings.contrast': { uk: 'Високий контраст', en: 'High contrast' },
  'settings.contrastHint': { uk: 'Чіткіші межі та текст', en: 'Sharper borders and text' },
  'settings.animationSpeed': { uk: 'Швидкість анімації', en: 'Animation speed' },
  'settings.groupSave': { uk: 'Збереження', en: 'Save data' },
  'settings.export': { uk: '💾 Експорт', en: '💾 Export' },
  'settings.import': { uk: '📂 Імпорт', en: '📂 Import' },
  'settings.reset': { uk: '💥 Скинути прогрес', en: '💥 Reset progress' },
  'settings.saveAndBack': { uk: '✔ Зберегти та назад', en: '✔ Save and back' },
  'settings.importDone': { uk: 'Імпорт завершено', en: 'Import complete' },
  'settings.importOk': { uk: 'Збереження успішно імпортовано.', en: 'Save data imported successfully.' },
  'settings.importFailed': { uk: 'Помилка імпорту', en: 'Import failed' },
  'settings.resetTitle': { uk: 'Скидання прогресу', en: 'Reset progress' },
  'settings.resetConfirm': {
    uk: 'Скинути весь прогрес, відкриті регіони, нагороди та статистику? Цю дію неможливо скасувати.',
    en: 'Reset all progress, unlocked regions, rewards and statistics? This cannot be undone.',
  },

  // ── Діалоги ──
  'dialog.noticeTitle': { uk: 'Підказка', en: 'Notice' },
  'dialog.noticeOk': { uk: 'Зрозуміло', en: 'Got it' },
  'dialog.confirmTitle': { uk: 'Підтвердження', en: 'Confirm' },
  'dialog.confirmYes': { uk: 'Так, продовжити', en: 'Yes, continue' },
  'dialog.confirmNo': { uk: 'Скасувати', en: 'Cancel' },

  // ── Бойова панель ──
  'combat.questionAria': { uk: 'Приклад на множення', en: 'Multiplication problem' },
  'combat.answersAria': { uk: 'Варіанти відповіді', en: 'Answer options' },
  'combat.typeAnswer': { uk: 'Введи відповідь', en: 'Type your answer' },
  'combat.submit': { uk: 'Відповісти', en: 'Answer' },
  'combat.clear': { uk: 'Стерти', en: 'Clear' },
  'combat.correct': { uk: 'Правильно!', en: 'Correct!' },
  'combat.wrongWithAnswer': { uk: 'Правильна відповідь: {answer}', en: 'Correct answer: {answer}' },
  'combat.ultimateReady': { uk: '⚡ УЛЬТА ГОТОВА!', en: '⚡ ULTIMATE READY!' },
  'combat.ultimateButton': { uk: 'Ульта', en: 'Ultimate' },
  'combat.ultimateHint': {
    uk: '⚡ Ульта заряджена! Натисни «Ульта» або пробіл.',
    en: '⚡ Ultimate charged! Press “Ultimate” or space.',
  },
  'combat.ultimateStrike': { uk: 'Ультимативний удар!', en: 'Ultimate strike!' },
  'combat.ultimateCry': { uk: 'Сила знань — на повну!', en: 'The power of knowledge, unleashed!' },
  'combat.ultimateLabel': { uk: 'УЛЬТА!', en: 'ULTIMATE!' },
  'combat.comboLabel': { uk: 'СЕРІЯ {combo}', en: 'COMBO {combo}' },
  'combat.shieldBlocked': { uk: 'Щит знань поглинув удар!', en: 'The shield of knowledge absorbed it!' },
  'combat.shieldLabel': { uk: 'ЩИТ!', en: 'SHIELD!' },
  'combat.critLabel': { uk: 'КРИТ!', en: 'CRIT!' },
  'combat.streakLabel': { uk: 'СЕРІЯ!', en: 'STREAK!' },
  'combat.optionAria': { uk: 'Варіант {index}: {value}', en: 'Option {index}: {value}' },
  'combat.enemyFallback': { uk: 'Ворог', en: 'Enemy' },
  'combat.hp': { uk: 'HP {current}/{max}', en: 'HP {current}/{max}' },
  'combat.phaseSuffix': { uk: ' · Фаза {phase}', en: ' · Phase {phase}' },
  'combat.progressTitle': { uk: 'Переможено ворогів на етапі', en: 'Enemies defeated on this stage' },
  'combat.progressAria': { uk: 'Переможено ворогів: {done} з {total}', en: 'Enemies defeated: {done} of {total}' },
  'combat.comboBadge': { uk: 'Серія {combo}', en: 'Combo {combo}' },
  'combat.shieldReady': { uk: 'Щит готовий', en: 'Shield ready' },
  'combat.shieldAt': { uk: 'Щит на 5', en: 'Shield at 5' },
  'combat.problemAria': { uk: 'Приклад {a} помножити на {b}', en: 'Problem: {a} times {b}' },
  'combat.critNextHint': {
    uk: 'Наступна правильна відповідь — критичний удар (подвійна шкода)',
    en: 'Your next correct answer lands a critical hit (double damage)',
  },
  'combat.critEveryHint': {
    uk: 'Критичний удар кожні {count} правильних поспіль',
    en: 'A critical hit every {count} correct answers in a row',
  },
  'combat.critReadyAria': { uk: 'Критичний удар готовий', en: 'Critical hit ready' },
  'combat.critToAria': { uk: 'До криту {count}', en: '{count} to crit' },
  'combat.critReady': { uk: 'Крит готовий!', en: 'Crit ready!' },
  'combat.critIn': { uk: 'Крит через {count}', en: 'Crit in {count}' },
  'combat.ultMax': {
    uk: 'Максимум зарядів — витрать ульту, щоб копити далі',
    en: 'Charges are full — spend the ultimate to bank more',
  },
  'combat.ultSpend': {
    uk: 'Пробіл або клік — витратити заряд. До наступного: {count}',
    en: 'Space or click to spend a charge. Next one in {count}',
  },
  'combat.ultNeed': {
    uk: 'Ще {count} правильних поспіль до заряду',
    en: '{count} more correct in a row for a charge',
  },
  'combat.ultAria': {
    uk: 'Ульта, зарядів {charges} з {max}. {hint}',
    en: 'Ultimate, {charges} of {max} charges. {hint}',
  },
  'combat.numpadAria': { uk: 'Цифрова клавіатура', en: 'Number pad' },
  'combat.clearAria': { uk: 'Очистити', en: 'Clear' },
  'combat.confirmAria': { uk: 'Підтвердити', en: 'Confirm' },
  'combat.answerWas': { uk: 'Відповідь: {answer}', en: 'Answer: {answer}' },

  // ── Завантаження ──
  'app.loadingLead': {
    uk: 'Ковалі готують зброю, чарівники заряджають руни, а монстри займають свої місця…',
    en: 'Smiths are forging weapons, wizards are charging runes, monsters are taking their places…',
  },
  'app.assetsFailed': {
    uk: 'Не завантажено: {count}. Для них використано безпечне резервне малювання.',
    en: 'Failed to load: {count}. Safe fallback drawing is used for those.',
  },

  // ── Назви режимів ──
  'mode.single': { uk: 'Тренування однієї таблиці', en: 'Single table drill' },
  'mode.mixed': { uk: 'Змішане тренування', en: 'Mixed drill' },
  'mode.weak': { uk: 'Слабкі місця', en: 'Weak spots' },
  'mode.mastery': { uk: 'Режим майстерності', en: 'Mastery mode' },
  'mode.infinite': { uk: 'Нескінченний похід', en: 'Endless run' },
  'mode.secret': { uk: 'Таємний бос', en: 'Secret boss' },

  // ── Бойові підписи ──
  'combat.stageLabel': { uk: 'Етап {number} · Рівень {tier}', en: 'Stage {number} · Tier {tier}' },
  'combat.empowered': { uk: 'Посилення знань!', en: 'Knowledge empowered!' },
  'combat.critHit': { uk: 'Критичний удар!', en: 'Critical hit!' },
  'combat.ultCharged': { uk: 'Ульта заряджена!', en: 'Ultimate charged!' },
  'combat.bossDefeated': { uk: 'БОСА ПОДОЛАНО!', en: 'BOSS DEFEATED!' },
  'combat.finalForm': { uk: 'ФІНАЛЬНА ФОРМА!', en: 'FINAL FORM!' },
  'hud.waveProgress': { uk: 'Хвиля {wave} · ⚔️ {kills}', en: 'Wave {wave} · ⚔️ {kills}' },

  // ── Повідомлення під час гри ──
  'toast.newLevel': { uk: '⬆️ Новий рівень: {level}!', en: '⬆️ New level: {level}!' },
  'toast.newAchievement': { uk: '🏆 Нове досягнення: {title}', en: '🏆 New achievement: {title}' },
  'toast.levelUp': { uk: '🎉 Рівень {level}! Герой став сильнішим.', en: '🎉 Level {level}! Your hero grew stronger.' },
  'toast.achievement': { uk: '🏆 Досягнення: {title}', en: '🏆 Achievement: {title}' },
  'toast.evolution': { uk: '✨ Нова стадія: {name}', en: '✨ New stage: {name}' },
  'toast.stageUnlocked': { uk: '🔓 Відкрито новий етап!', en: '🔓 A new stage is unlocked!' },
  'toast.regionUnlocked': { uk: '🗺️ Відкрито новий регіон!', en: '🗺️ A new region is unlocked!' },
  'toast.secretUnlocked': { uk: '❓ Таємний бос доступний у меню!', en: '❓ The secret boss is available in the menu!' },
  'toast.weakFixed': { uk: '🔧 Слабке місце виправлено!', en: '🔧 Weak spot fixed!' },
  'toast.newWave': { uk: '🌊 Хвиля {wave}!', en: '🌊 Wave {wave}!' },
  'toast.saveError': { uk: 'Не вдалося зберегти прогрес.', en: 'Could not save your progress.' },

  // ── Бос ──
  'boss.phase': { uk: 'ФАЗА {phase}', en: 'PHASE {phase}' },
  'boss.phaseChange': { uk: 'Бос переходить у фазу {phase}!', en: 'The boss enters phase {phase}!' },
  'boss.invulnerable': { uk: 'Бос невразливий — приготуйся!', en: 'The boss is invulnerable — get ready!' },
  'boss.evolving': { uk: 'Бос змінює форму!', en: 'The boss is changing form!' },
  'boss.defeated': { uk: 'Бос переможений!', en: 'The boss is defeated!' },

  // ── Математика ──
  'math.explanation': {
    uk: 'Правильна відповідь: {a} × {b} = {answer}',
    en: 'The correct answer is {a} × {b} = {answer}',
  },

  // ── Фази боса ──
  'bossPhase.first': { uk: 'Початок двобою', en: 'The duel begins' },
  'bossPhase.second': { uk: 'Друга фаза', en: 'Second phase' },
  'bossPhase.third': { uk: 'Третя фаза', en: 'Third phase' },
  'bossPhase.final': { uk: 'Фінальна фаза', en: 'Final phase' },
  'bossPhase.next': { uk: 'Нова фаза', en: 'New phase' },

  // ── Частинки ──
  'particles.levelUp': { uk: 'РІВЕНЬ ВГОРУ!', en: 'LEVEL UP!' },

  // ── Помилки збереження ──
  'save.invalidJson': { uk: 'Файл не є коректним JSON.', en: 'The file is not valid JSON.' },
  'save.invalidSave': { uk: 'Файл не схожий на збереження Math Hero.', en: 'The file does not look like a Math Hero save.' },
  'save.importError': { uk: 'Не вдалося прочитати файл збереження.', en: 'Could not read the save file.' },

  // ── Мобільна орієнтація ──
  'orientation.title': { uk: 'Поверни пристрій', en: 'Rotate your device' },
  'orientation.text': {
    uk: 'Math Hero грається в горизонтальному положенні — так поле бою вміщається повністю.',
    en: 'Math Hero plays in landscape — that way the whole battlefield fits on screen.',
  },
};
