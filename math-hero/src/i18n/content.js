/**
 * Англійські накладки на вміст гри, звірені за `id`.
 *
 * Українські назви лишаються в `bestiary.js` і `hero.js` разом із рештою
 * характеристик — так їх видно там, де їх правлять. Тут тільки переклад, і
 * відсутній запис не ламає нічого: `tc()` віддасть оригінал.
 *
 * Імена істот перекладені не буквально, а так, щоб читались природно:
 * «Слайм-Краб» — це Crab Slime, а не Slime-Crab.
 */
export const CONTENT = {
  en: {
    // ── Регіони ──
    region_1: { name: 'Slime Meadows', description: 'Green hills, wildflowers and friendly slimes.' },
    region_2: { name: 'Mushroom Woods', description: 'Giant mushrooms, fireflies and thick fog.' },
    region_3: { name: 'Honey Cliffs', description: 'Golden cliffs, honey waterfalls and giant hives.' },
    region_4: { name: 'Sand Ruins', description: 'Ancient obelisks, shifting sands and old riddles.' },
    region_5: { name: 'Volcanic Forge', description: 'Rivers of lava, fiery anvils and hot trials.' },
    region_6: { name: 'Frozen Peaks', description: 'Frozen waterfalls, snow squalls and northern lights.' },
    region_7: { name: 'Storm Kingdom', description: 'Dark castles, floating islands and crackling lightning.' },
    region_8: {
      name: 'Phantom Citadel',
      description: 'A magic clock, portals and mixed revision of every table you have unlocked.',
    },
    region_9: { name: 'The Error Rift', description: 'A space where every mistake in the world gathers.' },

    // ── Боси ──
    boss_1: { name: 'Great Bagel Slime', quote: 'I will stretch, but I will not go down without a fight!' },
    boss_2: { name: 'Lord Mycelius', quote: 'In the fog of the mushroom woods, the problems get even more interesting!' },
    boss_3: { name: 'Queen of the Golden Hive', quote: 'A sweet product is what guards my hive!' },
    boss_4: { name: 'Pharaoh of the Fifth Dune', quote: 'Thousands of years ago these problems guarded my pyramids!' },
    boss_5: { name: 'Sixwing the Dragon', quote: 'My flame tempers correct answers only!' },
    boss_6: { name: 'Ice Demon of the Seventh Gate', quote: 'Frost will not stop a warm mind from solving my product!' },
    boss_7: { name: 'Eight-Armed Storm Lord', quote: 'Eight arms mean eight multipliers of electric power!' },
    boss_8: { name: 'Ghost King of Multiplication', quote: 'Only one who knows every table will conquer the final tower!' },
    boss_secret: {
      name: 'Mister Blunder',
      quote: 'I have gathered every mistake you ever made — and together we will fix them all!',
    },

    // ── Регіон 1 ──
    slime_green: { name: 'Green Slime' },
    slime_blue: { name: 'Blue Bouncer' },
    mushroom_prankster: { name: 'Mushroom Prankster' },
    jelly_bee: { name: 'Jelly Bee' },
    buble_slime: { name: 'Bubble Slime' },
    crab_slime: { name: 'Crab Slime' },
    slime_armored: { name: 'Armored Slime' },
    slime_man: { name: 'Slime Warrior' },
    slime_mecha: { name: 'Mecha Slime' },
    slime_caterpillar: { name: 'Caterpillar Slime' },
    slime_spider: { name: 'Spider Slime' },
    elite_1: { name: 'Armored Slime Knight' },

    // ── Регіон 2 ──
    shroom_goblin: { name: 'Shroom Goblin' },
    spiky_bug: { name: 'Spiky Beetle' },
    forest_troll: { name: 'Forest Troll' },
    bat_eye: { name: 'Eye Bat' },
    mushroom_warrior: { name: 'Mushroom Warrior' },
    shroom_goblin_knight: { name: 'Shroom Goblin Knight' },
    shroom_slime: { name: 'Shroom Slime' },
    spiky_chameleon: { name: 'Spiky Chameleon' },
    spiky_crab: { name: 'Spiky Crab' },
    spiky_ent: { name: 'Spiky Ent' },
    spiky_snake: { name: 'Spiky Serpent' },
    elite_2: { name: 'One-Eyed Ent' },

    // ── Регіон 3 ──
    armored_bee: { name: 'Armored Bee' },
    honey_slime: { name: 'Honey Slime' },
    spear_wasp: { name: 'Spear Wasp' },
    bear_sweet: { name: 'Sweet-Tooth Bear' },
    builder_wasp: { name: 'Builder Wasp' },
    candy_bug: { name: 'Candy Bug' },
    honey_bat: { name: 'Honey Bat' },
    honey_bug: { name: 'Honey Beetle' },
    honey_caterpillar: { name: 'Honey Caterpillar' },
    honey_golem: { name: 'Honey Golem' },
    warrior_bee: { name: 'Warrior Bee' },
    elite_3: { name: 'Honeycomb Titan' },

    // ── Регіон 4 ──
    sand_beetle: { name: 'Sand Beetle' },
    mummy_student: { name: 'Mummy Student' },
    stone_mask: { name: 'Stone Mask' },
    desert_goblin: { name: 'Desert Goblin' },
    cat_snake: { name: 'Catsnake' },
    desert_construct: { name: 'Desert Construct' },
    desert_dog: { name: 'Desert Hound' },
    desert_goro: { name: 'Desert Goro' },
    mummy_assassin: { name: 'Mummy Prowler' },
    mummy_nomad: { name: 'Mummy Nomad' },
    mummy_tank: { name: 'Mummy Guardian' },
    elite_4: { name: 'Three-Core Golem' },

    // ── Регіон 5 ──
    fire_slime: { name: 'Fire Slime' },
    lava_crab: { name: 'Lava Crab' },
    smith_goblin: { name: 'Goblin Smith' },
    magma_golem: { name: 'Magma Golem' },
    magma_bug: { name: 'Magma Beetle' },
    magma_phoenix: { name: 'Magma Phoenix' },
    magma_lizard: { name: 'Magma Lizard' },
    magma_pangolin: { name: 'Magma Pangolin' },
    magma_cat: { name: 'Magma Cat' },
    magma_scorpion: { name: 'Magma Scorpion' },
    magma_spider_dog: { name: 'Magma Spiderhound' },
    elite_5: { name: 'Lava Bull' },

    // ── Регіон 6 ──
    ice_slime: { name: 'Ice Slime' },
    snow_wolf: { name: 'Snow Wolf' },
    frost_goblin: { name: 'Frost Goblin' },
    frost_golem: { name: 'Frost Golem' },
    snow_assassin: { name: 'Snow Tracker' },
    snow_butterfly: { name: 'Snow Butterfly' },
    snow_yeti: { name: 'Snow Yeti' },
    snow_gargoyle: { name: 'Snow Gargoyle' },
    snow_horse: { name: 'Snow Steed' },
    snow_scorpion: { name: 'Snow Scorpion' },
    snow_spirit: { name: 'Snow Spirit' },
    elite_6: { name: 'Storm Gryphon' },

    // ── Регіон 7 ──
    electric_slime: { name: 'Electric Slime' },
    storm_harpy: { name: 'Storm Harpy' },
    dark_knight: { name: 'Dark Knight' },
    thunder_mage: { name: 'Thunder Warlock' },
    storm_bug: { name: 'Storm Beetle' },
    storm_crab: { name: 'Storm Crab' },
    storm_golem: { name: 'Storm Golem' },
    storm_mage: { name: 'Storm Mage' },
    storm_mecha: { name: 'Storm Mecha' },
    storm_spirit: { name: 'Storm Spirit' },
    storm_tank: { name: 'Storm Guardian' },
    elite_7: { name: 'Phantom Hunter' },

    // ── Регіон 8 ──
    phantom_scribe: { name: 'Phantom Scribe' },
    enchanted_book: { name: 'Enchanted Book' },
    shadow_knight: { name: 'Shadow Knight' },
    mirror_hero: { name: 'Mirror Double' },
    chaos_spirit: { name: 'Spirit of Chaos' },
    ghost_doll: { name: 'Ghost Doll' },
    ghost_spirit: { name: 'Ghost Spirit' },
    ghost_woman: { name: 'Phantom Lady' },
    shadow_defender: { name: 'Shadow Defender' },
    shadow_mage: { name: 'Shadow Mage' },
    shadow_man: { name: 'Shadow Wanderer' },
    elite_8: { name: 'Astral Archivist' },

    // ── Таємний рівень ──
    glitch: { name: 'Glitch' },
    glitch_bee: { name: 'Glitch Bee' },
    glitch_slime_horse: { name: 'Glitch Slimesteed' },
    glitch_assassin: { name: 'Glitch Shade' },
    glitch_knight: { name: 'Glitch Knight' },
    glitch_chimera: { name: 'Glitch Chimera' },
    glitch_golem: { name: 'Glitch Golem' },
    glitch_dragon: { name: 'Glitch Dragon' },

    // ── Етапи (5 шаблонів × 8 регіонів) ──
    stage_1: { name: 'First Steps', description: 'Recognising products with two answer choices.' },
    stage_2: { name: 'Path of Knowledge', description: 'Careful picking of the right answer out of three.' },
    stage_3: { name: 'The Hard Trail', description: 'Drilling the table against four believable answers.' },
    stage_4: { name: 'Elite Trial', description: 'Typing answers yourself, against an elite enemy.' },
    stage_5: { name: 'Boss Battle', description: 'A multi-phase fight with typed answers.' },

    // ── Архетипи ──
    knight: { name: 'Knight of Knowledge' },
    sorceress: { name: 'Sorceress of Formulas' },
    cossack: { name: 'Cossack Calculator' },
    archer: { name: 'Archer of Precision' },

    // ── Скіни ──
    skin_1: { name: 'Standard skin' },
    skin_2: { name: 'Skin II' },
    skin_3: { name: 'Skin III' },
    skin_4: { name: 'Skin IV' },
    skin_5: { name: 'Skin V' },

    // ── Стадії еволюції ──
    evo_0: { name: 'Apprentice' },
    evo_1: { name: 'Wayfarer' },
    evo_2: { name: 'Warrior' },
    evo_3: { name: 'Champion' },
    evo_4: { name: 'Legend' },

    // ── Досягнення ──
    ach_first_victory: { title: 'First Victory', desc: 'Defeat your first enemy' },
    ach_enemies_10: { title: 'Hunter', desc: 'Defeat 10 enemies' },
    ach_enemies_50: { title: 'Battle Veteran', desc: 'Defeat 50 enemies' },
    ach_enemies_100: { title: 'Legendary Warrior', desc: 'Defeat 100 enemies' },
    ach_enemies_500: { title: 'Bane of Monsters', desc: 'Defeat 500 enemies' },
    ach_bosses_1: { title: 'Boss Tamer', desc: 'Defeat your first boss' },
    ach_bosses_5: { title: 'Boss Hunter', desc: 'Defeat 5 bosses' },
    ach_bosses_8: { title: 'Conqueror of All Bosses', desc: 'Defeat 8 bosses' },
    ach_streak_5: { title: 'Streak of 5', desc: 'Reach a streak of 5 correct answers' },
    ach_streak_10: { title: 'Unstoppable Streak', desc: 'Reach a streak of 10 correct answers' },
    ach_streak_20: { title: 'Untouchable!', desc: 'Reach a streak of 20 correct answers' },
    ach_streak_50: { title: 'Absolute Focus', desc: 'Reach a streak of 50 correct answers' },
    ach_level_5: { title: 'Level 5', desc: 'Reach hero level 5' },
    ach_level_10: { title: 'Level 10', desc: 'Reach hero level 10' },
    ach_level_20: { title: 'Level 20', desc: 'Reach hero level 20' },
    ach_level_35: { title: 'Legend of Multiplication', desc: 'Reach hero level 35' },
    ach_region_1: { title: 'Slime Meadows Cleared', desc: 'Finish region 1' },
    ach_region_2: { title: 'Mushroom Woods Cleared', desc: 'Finish region 2' },
    ach_region_3: { title: 'Honey Cliffs Cleared', desc: 'Finish region 3' },
    ach_region_4: { title: 'Sand Ruins Conquered', desc: 'Finish region 4' },
    ach_region_5: { title: 'Volcanic Forge Cleared', desc: 'Finish region 5' },
    ach_region_6: { title: 'Frozen Peaks Cleared', desc: 'Finish region 6' },
    ach_region_7: { title: 'Storm Kingdom Cleared', desc: 'Finish region 7' },
    ach_region_8: { title: 'Phantom Citadel', desc: 'Finish the whole campaign (region 8)' },
    ach_mastered_table_2: { title: 'Table of 2 Mastered', desc: 'Master every ×2 fact' },
    ach_mastered_table_3: { title: 'Table of 3 Mastered', desc: 'Master every ×3 fact' },
    ach_mastered_table_4: { title: 'Table of 4 Mastered', desc: 'Master every ×4 fact' },
    ach_mastered_table_5: { title: 'Table of 5 Mastered', desc: 'Master every ×5 fact' },
    ach_mastered_table_6: { title: 'Table of 6 Mastered', desc: 'Master every ×6 fact' },
    ach_mastered_table_7: { title: 'Table of 7 Mastered', desc: 'Master every ×7 fact' },
    ach_mastered_table_8: { title: 'Table of 8 Mastered', desc: 'Master every ×8 fact' },
    ach_mastered_table_9: { title: 'Table of 9 Mastered', desc: 'Master every ×9 fact' },
    ach_all_mastered: { title: 'Absolute Mastery', desc: 'Master all 100 multiplication facts' },
    ach_answers_100: { title: 'One Hundred Answers', desc: 'Give 100 answers' },
    ach_answers_500: { title: 'Five Hundred Answers', desc: 'Give 500 answers' },
    ach_answers_1000: { title: 'A Thousand Insights', desc: 'Give 1000 answers' },
    ach_infinite_10: { title: 'Marathoner', desc: 'Defeat 10 enemies in endless mode' },
    ach_infinite_50: { title: 'Eternal Warrior', desc: 'Defeat 50 enemies in endless mode' },
    ach_infinite_wave_5: { title: 'Five Waves', desc: 'Reach wave 5 in endless mode' },
    ach_infinite_wave_10: { title: 'Ten Waves', desc: 'Reach wave 10 in endless mode' },
    ach_weak_fixed_10: { title: 'Knowledge Mender', desc: 'Fix 10 weak facts' },
    ach_weak_fixed_30: { title: 'Master Mender', desc: 'Fix 30 weak facts' },
    ach_secret_boss: { title: 'Secret Boss', desc: 'Defeat Mister Blunder' },

    // ── Анонси фаз босів ──
    phases_boss_1: { list: ['The slime swells up!', 'Its slime shield cracks!', 'The bagel splits apart!'] },
    phases_boss_2: { list: ['Mycelius calls his copies!', 'The fog thickens!', 'The real Mycelius is revealed!'] },
    phases_boss_3: { list: ['The swarm gathers!', 'The honeycomb shield cracks!', 'The queen has lost her guard!'] },
    phases_boss_4: { list: ['The sarcophagus opens!', 'A sandstorm rises!', 'The slabs turn the traps back on!'] },
    phases_boss_5: { list: ['The dragon takes flight!', 'The flame is charged!', 'Deflect the fireball!'] },
    phases_boss_6: { list: ['Crystals grow!', 'The icy guard shatters!', 'A blizzard begins!'] },
    phases_boss_7: { list: ['All eight arms are armed!', 'Lightning strikes faster!', 'The last arms lose their power!'] },
    phases_boss_8: { list: ['The ghosts awaken!', 'Doubles surround the hero!', 'The crown breaks the final seal!'] },
    phases_boss_secret: {
      list: [
        'The mistakes are gathered!',
        'Mister Blunder grows on your mistakes!',
        'The weak facts return in a crowd!',
        'The last mistake is ready to give in!',
      ],
    },

    // ── Репліки ──
    quotes_hero_correct: {
      list: [
        'Exactly! 💪', 'Excellent! ⭐', 'My sword knew the answer!', 'That’s how it’s done! 🎯',
        'Knowledge is power!', 'One more enemy down!', 'That was easy! 😎', 'Correct! Let’s keep going! 🚀',
        'The times table is my superpower!', 'No problem can stop me!', 'Onward, to victory! ⚔️',
        'Flawless! ✨', 'Lightning-fast answer!', 'My mind is sharp as a blade!',
        'The Hero of Knowledge does not miss!', 'Maths is on my side! 🧠',
        'Blinked once and it was already solved! ⚡', 'I’m on fire today! 🔥',
        'Nobody stands against the power of knowledge!', 'Every right answer is a step towards glory!',
        'My numbers strike true! 🎯', 'Long live the times table!',
        'Even dragons fear what I know! 🐉', 'The more I practise, the stronger I get!',
        'Great work, keep it up! 💎', 'That’s my best answer yet!',
        'The runes of knowledge shine bright! ✨', 'Multiplication is my finishing move!',
        'I’m unbeatable when I’m counting! 🛡️', 'Problem solved — enemy defeated!',
      ],
    },
    quotes_hero_error: {
      list: [
        'Oops, missed it… 😓', 'Not this time.', 'I’ll remember that one!', 'Almost had it!',
        'Everyone slips sometimes.', 'Next one is mine!', 'Let me think again…',
        'A mistake is just practice in disguise.', 'I need to work on that fact.',
        'Ouch! But I’m still standing.', 'Wrong turn — back to the path!',
        'Learning the hard way. 💪', 'That number tricked me!', 'One more try!',
        'I won’t forget this one twice.', 'My guard slipped.',
        'Even heroes stumble. 🛡️', 'Deep breath — and onward.',
        'That fact needs another look.', 'Down but not defeated!',
      ],
    },
    quotes_boss: {
      list: [
        'Your knowledge is impressive… but not enough!',
        'Let us see whether you truly know the tables!',
        'This product guards my throne!',
        'Fight on, young hero!',
        'Numbers obey me here!',
        'You will not pass without an answer!',
        'Solve it, if you can!',
        'My power grows with every mistake of yours!',
      ],
    },
    quotes_enemy: {
      list: [
        'You will not solve this one!', 'Try me!', 'What is the product?',
        'Too slow!', 'Count it if you can!', 'I guard this number!',
        'Answer, hero!', 'My problem is harder than it looks!',
      ],
    },
    quotes_elite: {
      list: [
        'An elite guard never yields!', 'Only a true master passes here!',
        'Show me what you have learned!', 'My armour is made of hard problems!',
      ],
    },
    npc_tips: {
      list: [
        'A correct answer strikes; a wrong one lets the enemy strike back.',
        'Five correct answers in a row raise the shield of knowledge.',
        'Fill the ultimate bar and unleash it with the space bar.',
        'Facts you keep missing come back more often — that is how they get fixed.',
        'Three stars need high accuracy, not speed.',
      ],
    },
  },
};
