/**
 * Centralized Asset Manager for Math Hero RPG
 * Single source of truth for all game assets: manifest, loading, caching, validation, fallback.
 */

// ── Asset Manifest ──
// All assets referenced by stable dot-notation keys
export const ASSET_MANIFEST = {
  // Heroes - Knight Skins
  'hero.knight.1': './assets/heroes/hero_knight.png',
  'hero.knight.2': './assets/heroes/hero_knight_2.png',
  'hero.knight.3': './assets/heroes/hero_knight_3.png',
  'hero.knight.4': './assets/heroes/hero_knight_4.png',
  'hero.knight.5': './assets/heroes/hero_knight_5.png',

  // Heroes - Sorceress Skins
  'hero.sorceress.1': './assets/heroes/hero_sorceress.png',
  'hero.sorceress.2': './assets/heroes/hero_sorceress_2.png',
  'hero.sorceress.3': './assets/heroes/hero_sorceress_3.png',
  'hero.sorceress.4': './assets/heroes/hero_sorceress_4.png',
  'hero.sorceress.5': './assets/heroes/hero_sorceress_5.png',

  // Heroes - Cossack Skins
  'hero.cossack.1': './assets/heroes/hero_cossack.png',
  'hero.cossack.2': './assets/heroes/hero_cossack_2.png',
  'hero.cossack.3': './assets/heroes/hero_cossack_3.png',
  'hero.cossack.4': './assets/heroes/hero_cossack_4.png',
  'hero.cossack.5': './assets/heroes/hero_cossack_5.png',

  // Heroes - Archer Skins
  'hero.archer.1': './assets/heroes/hero_archer.png',
  'hero.archer.2': './assets/heroes/hero_archer_2.png',
  'hero.archer.3': './assets/heroes/hero_archer_3.png',
  'hero.archer.4': './assets/heroes/hero_archer_4.png',
  'hero.archer.5': './assets/heroes/hero_archer_5.png',

  // Enemies - Region 1
  'enemy.slime.green': './assets/enemies/region_1/enemy_slime_green.png',
  'enemy.slime.blue': './assets/enemies/region_1/enemy_slime_blue.png',
  'enemy.mushroom.prankster': './assets/enemies/region_1/enemy_mushroom_prankster.png',
  'enemy.jelly.bee': './assets/enemies/region_1/enemy_jelly_bee.png',
  'enemy.elite.1': './assets/enemies/region_1/enemy_elite_1.png',
  // Region 2
  'enemy.shroom.goblin': './assets/enemies/region_2/enemy_shroom_goblin.png',
  'enemy.spiky.bug': './assets/enemies/region_2/enemy_spiky_bug.png',
  'enemy.forest.troll': './assets/enemies/region_2/enemy_forest_troll.png',
  'enemy.bat.eye': './assets/enemies/region_2/enemy_bat_eye.png',
  'enemy.elite.2': './assets/enemies/region_2/enemy_elite_2.png',
  // Region 3
  'enemy.armored.bee': './assets/enemies/region_3/enemy_armored_bee.png',
  'enemy.honey.slime': './assets/enemies/region_3/enemy_honey_slime.png',
  'enemy.spear.wasp': './assets/enemies/region_3/enemy_spear_wasp.png',
  'enemy.bear.sweet': './assets/enemies/region_3/enemy_bear_sweet.png',
  'enemy.elite.3': './assets/enemies/region_3/enemy_elite_3.png',
  // Region 4
  'enemy.sand.beetle': './assets/enemies/region_4/enemy_sand_beetle.png',
  'enemy.mummy.student': './assets/enemies/region_4/enemy_mummy_student.png',
  'enemy.stone.mask': './assets/enemies/region_4/enemy_stone_mask.png',
  'enemy.desert.goblin': './assets/enemies/region_4/enemy_desert_goblin.png',
  'enemy.elite.4': './assets/enemies/region_4/enemy_elite_4.png',
  // Region 5
  'enemy.fire.slime': './assets/enemies/region_5/enemy_fire_slime.png',
  'enemy.lava.crab': './assets/enemies/region_5/enemy_lava_crab.png',
  'enemy.smith.goblin': './assets/enemies/region_5/enemy_smith_goblin.png',
  'enemy.magma.golem': './assets/enemies/region_5/enemy_magma_golem.png',
  'enemy.elite.5': './assets/enemies/region_5/enemy_elite_5.png',
  // Region 6
  'enemy.ice.slime': './assets/enemies/region_6/enemy_ice_slime.png',
  'enemy.snow.wolf': './assets/enemies/region_6/enemy_snow_wolf.png',
  'enemy.frost.goblin': './assets/enemies/region_6/enemy_frost_goblin.png',
  'enemy.frost.golem': './assets/enemies/region_6/enemy_frost_golem.png',
  'enemy.elite.6': './assets/enemies/region_6/enemy_elite_6.png',
  // Region 7
  'enemy.electric.slime': './assets/enemies/region_7/enemy_electric_slime.png',
  'enemy.storm.harpy': './assets/enemies/region_7/enemy_storm_harpy.png',
  'enemy.dark.knight': './assets/enemies/region_7/enemy_dark_knight.png',
  'enemy.thunder.mage': './assets/enemies/region_7/enemy_thunder_mage.png',
  'enemy.elite.7': './assets/enemies/region_7/enemy_elite_7.png',
  // Region 8
  'enemy.phantom.scribe': './assets/enemies/region_8/enemy_phantom_scribe.png',
  'enemy.enchanted.book': './assets/enemies/region_8/enemy_enchanted_book.png',
  'enemy.shadow.knight': './assets/enemies/region_8/enemy_shadow_knight.png',
  'enemy.mirror.hero': './assets/enemies/region_8/enemy_mirror_hero.png',
  'enemy.elite.8': './assets/enemies/region_8/enemy_elite_8.png',

  // Bosses
  'boss.slimeBagel': './assets/enemies/region_1/boss_slime_bagel.png',
  'boss.mushroomLord': './assets/enemies/region_2/boss_mushroom_lord.png',
  'boss.beeQueen': './assets/enemies/region_3/boss_bee_queen.png',
  'boss.pharaoh': './assets/enemies/region_4/boss_pharaoh.png',
  'boss.dragon': './assets/enemies/region_5/boss_dragon.png',
  'boss.iceDemon': './assets/enemies/region_6/boss_ice_demon.png',
  'boss.stormLord': './assets/enemies/region_7/boss_storm_lord.png',
  'boss.ghostKing': './assets/enemies/region_8/boss_ghost_king.png',
  'boss.secret': './assets/enemies/secret/boss_secret.png',

  // Boss phase forms — each phase swaps in a larger, more menacing sprite.
  'boss.slimeBagel.2': './assets/enemies/region_1/boss_slime_bagel_phase2.png',
  'boss.slimeBagel.3': './assets/enemies/region_1/boss_slime_bagel_phase3.png',
  'boss.mushroomLord.2': './assets/enemies/region_2/boss_mushroom_lord_phase2.png',
  'boss.mushroomLord.3': './assets/enemies/region_2/boss_mushroom_lord_phase3.png',
  'boss.beeQueen.2': './assets/enemies/region_3/boss_bee_queen_phase2.png',
  'boss.beeQueen.3': './assets/enemies/region_3/boss_bee_queen_phase3.png',
  'boss.pharaoh.2': './assets/enemies/region_4/boss_pharaoh_phase2.png',
  'boss.pharaoh.3': './assets/enemies/region_4/boss_pharaoh_phase3.png',
  'boss.dragon.2': './assets/enemies/region_5/boss_dragon_phase2.png',
  'boss.dragon.3': './assets/enemies/region_5/boss_dragon_phase3.png',
  'boss.iceDemon.2': './assets/enemies/region_6/boss_ice_demon_phase2.png',
  'boss.iceDemon.3': './assets/enemies/region_6/boss_ice_demon_phase3.png',
  'boss.stormLord.2': './assets/enemies/region_7/boss_storm_lord_phase2.png',
  'boss.stormLord.3': './assets/enemies/region_7/boss_storm_lord_phase3.png',
  'boss.ghostKing.2': './assets/enemies/region_8/boss_ghost_king_phase2.png',
  'boss.ghostKing.3': './assets/enemies/region_8/boss_ghost_king_phase3.png',
  'boss.secret.2': './assets/enemies/secret/boss_secret_phase2.png',
  'boss.secret.3': './assets/enemies/secret/boss_secret_phase3.png',
  'boss.secret.4': './assets/enemies/secret/boss_secret_phase4.png',

  // Backgrounds (per region)
  'bg.meadows': './assets/bg_meadows.png',
  'bg.forest': './assets/bg_forest.png',
  'bg.honeyCliffs': './assets/bg_honey_cliffs.png',
  'bg.desert': './assets/bg_desert.png',
  'bg.volcano': './assets/bg_volcano.png',
  'bg.ice': './assets/bg_ice.png',
  'bg.storm': './assets/bg_storm.png',
  'bg.ghost': './assets/bg_ghost.png',

  // Region card previews — downscaled backgrounds used by the campaign map.
  // Listed here so they are validated and warmed before the map is opened.
  'bg.meadows.thumb': './assets/bg_meadows_thumb.png',
  'bg.forest.thumb': './assets/bg_forest_thumb.png',
  'bg.honeyCliffs.thumb': './assets/bg_honey_cliffs_thumb.png',
  'bg.desert.thumb': './assets/bg_desert_thumb.png',
  'bg.volcano.thumb': './assets/bg_volcano_thumb.png',
  'bg.ice.thumb': './assets/bg_ice_thumb.png',
  'bg.storm.thumb': './assets/bg_storm_thumb.png',
  'bg.ghost.thumb': './assets/bg_ghost_thumb.png',

  // Background Decor (per region)
  'bg.meadows.decor': './assets/bg_meadows_decor.png',
  'bg.forest.decor': './assets/bg_forest_decor.png',
  'bg.honeyCliffs.decor': './assets/bg_honey_cliffs_decor.png',
  'bg.desert.decor': './assets/bg_desert_decor.png',
  'bg.volcano.decor': './assets/bg_volcano_decor.png',
  'bg.ice.decor': './assets/bg_ice_decor.png',
  'bg.storm.decor': './assets/bg_storm_decor.png',
  'bg.ghost.decor': './assets/bg_ghost_decor.png',

  // UI
  'ui.logo': './assets/ui/math-hero-logo.png',
  'ui.runes': './assets/ui/rune-pattern.png',

  // Region 1 — additional creatures
  'enemy.buble.slime': './assets/enemies/region_1/enemy_buble_slime.png',
  'enemy.crab.slime': './assets/enemies/region_1/enemy_crab_slime.png',
  'enemy.slime.armored': './assets/enemies/region_1/enemy_slime_armored.png',
  'enemy.slime.man': './assets/enemies/region_1/enemy_slime_man.png',
  'enemy.slime.mecha': './assets/enemies/region_1/enemy_slime_mecha.png',
  'enemy.slime.caterpillar': './assets/enemies/region_1/enemy__slime_caterpilar.png',
  'enemy.slime.spider': './assets/enemies/region_1/enemy__slime_spider.png',
  // Region 2 — additional creatures
  'enemy.mushroom.warrior': './assets/enemies/region_2/enemy_mushroom_warior.png',
  'enemy.shroom.goblin.knight': './assets/enemies/region_2/enemy_shroom_goblin_khight.png',
  'enemy.shroom.slime': './assets/enemies/region_2/enemy_shroom_slime.png',
  'enemy.spiky.chameleon': './assets/enemies/region_2/enemy_spiky_chameleon.png',
  'enemy.spiky.crab': './assets/enemies/region_2/enemy_spiky_crab.png',
  'enemy.spiky.ent': './assets/enemies/region_2/enemy_spiky_ent.png',
  'enemy.spiky.snake': './assets/enemies/region_2/enemy_spiky_snake.png',
  // Region 3 — additional creatures
  'enemy.builder.wasp': './assets/enemies/region_3/enemy_builder_wasp.png',
  'enemy.candy.bug': './assets/enemies/region_3/enemy_candy_bug.png',
  'enemy.honey.bat': './assets/enemies/region_3/enemy_honey_bat.png',
  'enemy.honey.bug': './assets/enemies/region_3/enemy_honey_bug.png',
  'enemy.honey.caterpillar': './assets/enemies/region_3/enemy_honey_catarpiler.png',
  'enemy.honey.golem': './assets/enemies/region_3/enemy_honey_golem.png',
  'enemy.warrior.bee': './assets/enemies/region_3/enemy_warior_bee.png',
  // Region 4 — additional creatures
  'enemy.cat.snake': './assets/enemies/region_4/enemy_cat_snake.png',
  'enemy.desert.construct': './assets/enemies/region_4/enemy_desert_construclt.png',
  'enemy.desert.dog': './assets/enemies/region_4/enemy_desert_dog.png',
  'enemy.desert.goro': './assets/enemies/region_4/enemy_desert_goro.png',
  'enemy.mummy.assassin': './assets/enemies/region_4/enemy_mummy_assassin.png',
  'enemy.mummy.nomad': './assets/enemies/region_4/enemy_mummy_nomad.png',
  'enemy.mummy.tank': './assets/enemies/region_4/enemy_mummy_tank.png',
  // Region 5 — additional creatures
  'enemy.magma.bug': './assets/enemies/region_5/enemy_magma_bug.png',
  'enemy.magma.phoenix': './assets/enemies/region_5/enemy_magma_fenix.png',
  'enemy.magma.lizard': './assets/enemies/region_5/enemy_magma_lizard.png',
  'enemy.magma.pangolin': './assets/enemies/region_5/enemy_magma_pangolin.png',
  'enemy.magma.cat': './assets/enemies/region_5/enemy_magma_scat.png',
  'enemy.magma.scorpion': './assets/enemies/region_5/enemy_magma_scorpio.png',
  'enemy.magma.spider.dog': './assets/enemies/region_5/enemy_magma_spider_dog.png',
  // Region 6 — additional creatures
  'enemy.snow.assassin': './assets/enemies/region_6/enemy_snow_assassin.png',
  'enemy.snow.butterfly': './assets/enemies/region_6/enemy_snow_butterfly.png',
  'enemy.snow.yeti': './assets/enemies/region_6/enemy_snow_eytty.png',
  'enemy.snow.gargoyle': './assets/enemies/region_6/enemy_snow_gorgule.png',
  'enemy.snow.horse': './assets/enemies/region_6/enemy_snow_horse.png',
  'enemy.snow.scorpion': './assets/enemies/region_6/enemy_snow_scorpio.png',
  'enemy.snow.spirit': './assets/enemies/region_6/enemy_snow_spirite.png',
  // Region 7 — additional creatures
  'enemy.storm.bug': './assets/enemies/region_7/enemy_storm_bug.png',
  'enemy.storm.crab': './assets/enemies/region_7/enemy_storm_crab.png',
  'enemy.storm.golem': './assets/enemies/region_7/enemy_storm_golem.png',
  'enemy.storm.mage': './assets/enemies/region_7/enemy_storm_mage.png',
  'enemy.storm.mecha': './assets/enemies/region_7/enemy_storm_mecha.png',
  'enemy.storm.spirit': './assets/enemies/region_7/enemy_storm_spirite.png',
  'enemy.storm.tank': './assets/enemies/region_7/enemy_storm_tank.png',
  // Region 8 — additional creatures
  'enemy.chaos.spirit': './assets/enemies/region_8/enemy_chaos_spirite.png',
  'enemy.ghost.doll': './assets/enemies/region_8/enemy_ghost_ doll.png',
  'enemy.ghost.spirit': './assets/enemies/region_8/enemy_ghost_ spirite.png',
  'enemy.ghost.woman': './assets/enemies/region_8/enemy_ghost_woman.png',
  'enemy.shadow.defender': './assets/enemies/region_8/enemy_shadow_ defender.png',
  'enemy.shadow.mage': './assets/enemies/region_8/enemy_shadow_ mage.png',
  'enemy.shadow.man': './assets/enemies/region_8/enemy_shadow_ man.png',

  // Secret level — glitched intruders
  'enemy.glitch': './assets/enemies/secret/enemy_glitch.png',
  'enemy.glitch.assassin': './assets/enemies/secret/enemy_glitch_assassin.png',
  'enemy.glitch.bee': './assets/enemies/secret/enemy_glitch_bee.png',
  'enemy.glitch.chimera': './assets/enemies/secret/enemy_glitch_chimera.png',
  'enemy.glitch.dragon': './assets/enemies/secret/enemy_glitch_dragon.png',
  'enemy.glitch.golem': './assets/enemies/secret/enemy_glitch_golem.png',
  'enemy.glitch.knight': './assets/enemies/secret/enemy_glitch_knight.png',
  'enemy.glitch.slime.horse': './assets/enemies/secret/enemy_glitch_slime_horse.png',

  // Glitch arena backdrop
  'bg.glitch': './assets/bg_glitch.png',
  'bg.glitch.decor': './assets/bg_glitch_decor.png',

  // Menu iconography
  'icon.achievements': './assets/ui/icons/icon_achievements.png',
  'icon.back': './assets/ui/icons/icon_back.png',
  'icon.coins': './assets/ui/icons/icon_coins.png',
  'icon.hero': './assets/ui/icons/icon_hero.png',
  'icon.infinite': './assets/ui/icons/icon_infinite.png',
  'icon.mastery': './assets/ui/icons/icon_mastery.png',
  'icon.mixed': './assets/ui/icons/icon_mixed.png',
  'icon.secret': './assets/ui/icons/icon_secret.png',
  'icon.settings': './assets/ui/icons/icon_settings.png',
  'icon.single': './assets/ui/icons/icon_single.png',
  'icon.stats': './assets/ui/icons/icon_stats.png',
  'icon.streak': './assets/ui/icons/icon_streak.png',
  'icon.wardrobe': './assets/ui/icons/icon_wardrobe.png',
  'icon.weak': './assets/ui/icons/icon_weak.png',
  'ui.menuBackground': './assets/ui/menu_bg.png',

  // Weather
  'weather.snow': './assets/snow.png',
};

// Map enemy IDs (from bestiary) to asset keys
export const ENEMY_ASSET_MAP = {
  slime_green: 'enemy.slime.green',
  slime_blue: 'enemy.slime.blue',
  mushroom_prankster: 'enemy.mushroom.prankster',
  jelly_bee: 'enemy.jelly.bee',
  elite_1: 'enemy.elite.1',
  shroom_goblin: 'enemy.shroom.goblin',
  spiky_bug: 'enemy.spiky.bug',
  forest_troll: 'enemy.forest.troll',
  bat_eye: 'enemy.bat.eye',
  elite_2: 'enemy.elite.2',
  armored_bee: 'enemy.armored.bee',
  honey_slime: 'enemy.honey.slime',
  spear_wasp: 'enemy.spear.wasp',
  bear_sweet: 'enemy.bear.sweet',
  elite_3: 'enemy.elite.3',
  sand_beetle: 'enemy.sand.beetle',
  mummy_student: 'enemy.mummy.student',
  stone_mask: 'enemy.stone.mask',
  desert_goblin: 'enemy.desert.goblin',
  elite_4: 'enemy.elite.4',
  fire_slime: 'enemy.fire.slime',
  lava_crab: 'enemy.lava.crab',
  smith_goblin: 'enemy.smith.goblin',
  magma_golem: 'enemy.magma.golem',
  elite_5: 'enemy.elite.5',
  ice_slime: 'enemy.ice.slime',
  snow_wolf: 'enemy.snow.wolf',
  frost_goblin: 'enemy.frost.goblin',
  frost_golem: 'enemy.frost.golem',
  elite_6: 'enemy.elite.6',
  electric_slime: 'enemy.electric.slime',
  storm_harpy: 'enemy.storm.harpy',
  dark_knight: 'enemy.dark.knight',
  thunder_mage: 'enemy.thunder.mage',
  elite_7: 'enemy.elite.7',
  phantom_scribe: 'enemy.phantom.scribe',
  enchanted_book: 'enemy.enchanted.book',
  shadow_knight: 'enemy.shadow.knight',
  mirror_hero: 'enemy.mirror.hero',
  elite_8: 'enemy.elite.8',

  // Extended roster
  buble_slime: 'enemy.buble.slime',
  crab_slime: 'enemy.crab.slime',
  slime_armored: 'enemy.slime.armored',
  slime_man: 'enemy.slime.man',
  slime_mecha: 'enemy.slime.mecha',
  slime_caterpillar: 'enemy.slime.caterpillar',
  slime_spider: 'enemy.slime.spider',
  mushroom_warrior: 'enemy.mushroom.warrior',
  shroom_goblin_knight: 'enemy.shroom.goblin.knight',
  shroom_slime: 'enemy.shroom.slime',
  spiky_chameleon: 'enemy.spiky.chameleon',
  spiky_crab: 'enemy.spiky.crab',
  spiky_ent: 'enemy.spiky.ent',
  spiky_snake: 'enemy.spiky.snake',
  builder_wasp: 'enemy.builder.wasp',
  candy_bug: 'enemy.candy.bug',
  honey_bat: 'enemy.honey.bat',
  honey_bug: 'enemy.honey.bug',
  honey_caterpillar: 'enemy.honey.caterpillar',
  honey_golem: 'enemy.honey.golem',
  warrior_bee: 'enemy.warrior.bee',
  cat_snake: 'enemy.cat.snake',
  desert_construct: 'enemy.desert.construct',
  desert_dog: 'enemy.desert.dog',
  desert_goro: 'enemy.desert.goro',
  mummy_assassin: 'enemy.mummy.assassin',
  mummy_nomad: 'enemy.mummy.nomad',
  mummy_tank: 'enemy.mummy.tank',
  magma_bug: 'enemy.magma.bug',
  magma_phoenix: 'enemy.magma.phoenix',
  magma_lizard: 'enemy.magma.lizard',
  magma_pangolin: 'enemy.magma.pangolin',
  magma_cat: 'enemy.magma.cat',
  magma_scorpion: 'enemy.magma.scorpion',
  magma_spider_dog: 'enemy.magma.spider.dog',
  snow_assassin: 'enemy.snow.assassin',
  snow_butterfly: 'enemy.snow.butterfly',
  snow_yeti: 'enemy.snow.yeti',
  snow_gargoyle: 'enemy.snow.gargoyle',
  snow_horse: 'enemy.snow.horse',
  snow_scorpion: 'enemy.snow.scorpion',
  snow_spirit: 'enemy.snow.spirit',
  storm_bug: 'enemy.storm.bug',
  storm_crab: 'enemy.storm.crab',
  storm_golem: 'enemy.storm.golem',
  storm_mage: 'enemy.storm.mage',
  storm_mecha: 'enemy.storm.mecha',
  storm_spirit: 'enemy.storm.spirit',
  storm_tank: 'enemy.storm.tank',
  chaos_spirit: 'enemy.chaos.spirit',
  ghost_doll: 'enemy.ghost.doll',
  ghost_spirit: 'enemy.ghost.spirit',
  ghost_woman: 'enemy.ghost.woman',
  shadow_defender: 'enemy.shadow.defender',
  shadow_mage: 'enemy.shadow.mage',
  shadow_man: 'enemy.shadow.man',
  glitch: 'enemy.glitch',
  glitch_assassin: 'enemy.glitch.assassin',
  glitch_bee: 'enemy.glitch.bee',
  glitch_chimera: 'enemy.glitch.chimera',
  glitch_dragon: 'enemy.glitch.dragon',
  glitch_golem: 'enemy.glitch.golem',
  glitch_knight: 'enemy.glitch.knight',
  glitch_slime_horse: 'enemy.glitch.slime.horse',
};

// Map boss IDs to asset keys
export const BOSS_ASSET_MAP = {
  boss_1: 'boss.slimeBagel',
  boss_2: 'boss.mushroomLord',
  boss_3: 'boss.beeQueen',
  boss_4: 'boss.pharaoh',
  boss_5: 'boss.dragon',
  boss_6: 'boss.iceDemon',
  boss_7: 'boss.stormLord',
  boss_8: 'boss.ghostKing',
  boss_secret: 'boss.secret',
};

// Map region bgTheme to asset keys
export const BG_ASSET_MAP = {
  meadows: 'bg.meadows',
  forest: 'bg.forest',
  honey_cliffs: 'bg.honeyCliffs',
  desert: 'bg.desert',
  volcano: 'bg.volcano',
  ice: 'bg.ice',
  storm: 'bg.storm',
  ghost: 'bg.ghost',
  glitch: 'bg.glitch',
};

export const DECOR_ASSET_MAP = {
  meadows: 'bg.meadows.decor',
  forest: 'bg.forest.decor',
  honey_cliffs: 'bg.honeyCliffs.decor',
  desert: 'bg.desert.decor',
  volcano: 'bg.volcano.decor',
  ice: 'bg.ice.decor',
  storm: 'bg.storm.decor',
  ghost: 'bg.ghost.decor',
  glitch: 'bg.glitch.decor',
};

// Min valid image dimensions
const MIN_IMAGE_SIZE = 16;

export class AssetManager {
  constructor() {
    this.cache = new Map();
    this.total = 0;
    this.loaded = 0;
    this.failed = 0;
    this.errors = [];
    this._ready = false;
    // Fallback 1x1 transparent image
    this.fallbackImage = new Image();
    this.fallbackImage.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  }

  get isReady() { return this._ready; }

  /**
   * Load all assets from manifest.
   * @param {function} onProgress - (loaded, total) => void
   * @returns {Promise<{loaded, failed, total, errors}>}
   */
  async loadAll(onProgress) {
    const entries = Object.entries(ASSET_MANIFEST);
    this.total = entries.length;
    this.loaded = 0;
    this.failed = 0;
    this.errors = [];

    const promises = entries.map(([key, url]) => this._loadImage(key, url, onProgress));
    await Promise.all(promises);
    this._ready = true;

    return {
      loaded: this.loaded,
      failed: this.failed,
      total: this.total,
      errors: this.errors,
    };
  }

  _loadImage(key, url, onProgress) {
    return new Promise(resolve => {
      const img = new Image();
      // img.crossOrigin removed for Android WebView
      img.src = url;

      img.onload = () => {
        if (img.naturalWidth >= MIN_IMAGE_SIZE && img.naturalHeight >= MIN_IMAGE_SIZE) {
          this.cache.set(key, img);
          this.loaded++;
        } else {
          const err = `Ресурс "${key}" пошкоджений (${img.naturalWidth}x${img.naturalHeight})`;
          this.errors.push(err);
          console.warn(err);
          this.failed++;
        }
        if (onProgress) onProgress(this.loaded + this.failed, this.total);
        resolve();
      };

      img.onerror = () => {
        const err = `Не вдалося завантажити ресурс "${key}" з ${url}`;
        this.errors.push(err);
        console.warn(err);
        this.failed++;
        if (onProgress) onProgress(this.loaded + this.failed, this.total);
        resolve();
      };
    });
  }

  /**
   * Get a loaded image by key. Returns null if not cached (fallback will be used by renderers).
   */
  get(key) {
    return this.cache.get(key) || this.fallbackImage;
  }

  /**
   * Get enemy sprite by enemy ID (from bestiary config)
   */
  getEnemySprite(enemyId) {
    const key = ENEMY_ASSET_MAP[enemyId];
    return key ? this.get(key) : this.fallbackImage;
  }

  /**
   * Get boss sprite for a given phase. Phase 1 uses the base artwork; later
   * phases fall back to the base sprite when no phase form was authored.
   */
  getBossSprite(bossId, phase = 1) {
    const key = BOSS_ASSET_MAP[bossId];
    if (!key) return this.fallbackImage;
    if (phase > 1) {
      const phaseSprite = this.get(`${key}.${phase}`);
      if (phaseSprite) return phaseSprite;
    }
    return this.get(key);
  }

  /**
   * Get hero sprite by archetype and skin tier
   */
  getHeroSprite(archetype, skinTier = 1) {
    return this.get(`hero.${archetype}.${skinTier}`);
  }

  /**
   * Get background by bgTheme key
   */
  getBackground(bgTheme) {
    const key = BG_ASSET_MAP[bgTheme];
    return key ? this.get(key) : this.fallbackImage;
  }

  /**
   * Get background decor sprite by bgTheme key
   */
  getBackgroundDecor(bgTheme) {
    const key = DECOR_ASSET_MAP[bgTheme];
    return key ? this.get(key) : this.fallbackImage;
  }

  /**
   * Check if a critical asset is available
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Get snow particle sprite
   */
  getSnowSprite() {
    return this.get('weather.snow');
  }
}
