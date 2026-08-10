/**
 * UI Menus & Custom Modals Manager for Math Hero RPG
 * Supports: 40-stage campaign map, per-region stage selection,
 * training result screens, infinite mode results, import save, wardrobe.
 *
 * Кожен екран малюється з нуля при кожному відкритті, тому перемикання мови
 * не потребує окремого оновлення тексту — досить перемалювати екран.
 */

import { REGIONS, SECRET_REGION, SECRET_ENEMIES, SECRET_BOSS, CAMPAIGN_STAGES } from '../game/bestiary.js';
import { ASSET_MANIFEST, ENEMY_ASSET_MAP, BOSS_ASSET_MAP } from '../assets/assetManager.js';
import { ARCHETYPES, COSMETICS, ACHIEVEMENTS } from '../game/hero.js';
import {
  t, LANGUAGES, getLanguage, setLanguage,
  creatureName, regionName, regionDescription, stageShortName,
  archetypeName, skinName, achievementTitle, achievementDesc,
} from '../i18n/index.js';

/**
 * Sprite URL for any creature, or null when it has no artwork.
 *
 * Resolved against the document rather than left relative: the value travels
 * through a custom property into a rule in style.css, and a relative url()
 * consumed there would be resolved against the stylesheet's folder instead.
 */
function creatureArt(enemyId) {
  const key = BOSS_ASSET_MAP[enemyId] || ENEMY_ASSET_MAP[enemyId];
  const path = key ? ASSET_MANIFEST[key] : null;
  if (!path) return null;
  return typeof document !== 'undefined' ? new URL(path, document.baseURI).href : path;
}

/**
 * Every creature in the game, grouped by where it is met. Built on demand so
 * a bestiary entry can never drift out of sync with the campaign roster.
 */
function bestiaryRoster() {
  const groups = REGIONS.map(region => ({
    id: region.id,
    name: regionName(region),
    color: region.bgColor1,
    accent: region.bgColor2,
    creatures: [
      ...region.enemies.map(enemy => ({ ...enemy, rank: 'regular' })),
      { ...region.elite, rank: 'elite' },
      { ...region.boss, hp: region.boss.hpMax, rank: 'boss' },
    ],
  }));
  groups.push({
    id: SECRET_REGION.id,
    name: regionName(SECRET_REGION),
    color: SECRET_REGION.bgColor1,
    accent: SECRET_REGION.bgColor2,
    creatures: [
      ...SECRET_ENEMIES.map(enemy => ({ ...enemy, rank: 'regular' })),
      { ...SECRET_BOSS, hp: SECRET_BOSS.hpMax, rank: 'boss' },
    ],
  });
  return groups;
}

const rankLabel = rank => t(`bestiary.rank${rank.charAt(0).toUpperCase()}${rank.slice(1)}`);

export class MenuSystem {
  constructor(saveSystem, soundEngine, onStartGame, onResumeGame, onRestartStage, onExitGame, onEndInfinite) {
    this.saveSystem = saveSystem;
    this.soundEngine = soundEngine;
    this.onStartGame = onStartGame;
    this.onResumeGame = onResumeGame;
    this.onRestartStage = onRestartStage;
    this.onExitGame = onExitGame;
    this.onEndInfinite = onEndInfinite;
    this.container = document.getElementById('modalContainer');
    this.pauseOptions = {};
    /** Set by the app so the HUD outside these screens follows the language. */
    this.onLanguageChange = null;
  }

  // ── Main Menu ──

  showMainMenu() {
    const stats = this.saveSystem.data.stats;
    const hero = this.saveSystem.data.hero;
    const arch = hero.archetype || 'knight';
    const tier = hero.skinTier || 1;
    const suffix = tier > 1 ? `_${tier}` : '';
    const heroAsset = `./assets/heroes/hero_${arch}${suffix}.png`;
    const archName = archetypeName(ARCHETYPES[arch]) || archetypeName(ARCHETYPES.knight);
    const campaignDone = Object.values(this.saveSystem.data.campaign || {}).filter(item => item?.completed).length;
    const roster = bestiaryRoster();
    const total = roster.reduce((sum, group) => sum + group.creatures.length, 0);
    const met = roster.reduce(
      (sum, group) => sum + group.creatures.filter(c => this.saveSystem.hasMetEnemy(c.id)).length, 0
    );
    const secretOpen = this.saveSystem.canAccessSecretBoss();

    this.container.style.display = 'flex';
    this.container.innerHTML = `
      <div class="modal-content game-panel main-menu-screen">
        <h1 class="sr-only">${t('app.title')}</h1>

        <div class="main-menu-art" aria-hidden="true">
          <div class="hero-preview-runes"></div>
          <div class="hero-preview-glow"></div>
          <img class="main-hero-preview" src="${heroAsset}" alt="" />
          <div class="hero-nameplate">
            <span class="hero-rank">${t('hud.level', { level: stats.level })}</span>
            <strong>${archName}</strong>
            <span>${t('menu.regionsConquered', { done: campaignDone })}</span>
          </div>
        </div>

        <section class="main-menu-ui">
          <div class="game-logo-wrap">
            <img src="./assets/ui/math-hero-logo.png" alt="${t('app.logoAlt')}" class="game-logo" />
          </div>

          <div class="profile-strip">
            <div class="profile-chip"><span class="icon-img icon-hero"></span><div><small>${t('menu.hero')}</small><strong>${archName}</strong></div></div>
            <div class="profile-chip"><span class="icon-img icon-coins"></span><div><small>${t('menu.treasury')}</small><strong>${t('menu.coinsAmount', { coins: stats.coins })}</strong></div></div>
            <div class="profile-chip"><span class="icon-img icon-streak"></span><div><small>${t('menu.bestStreak')}</small><strong>${stats.maxStreak || 0}</strong></div></div>
          </div>

          <nav class="main-actions" aria-label="${t('menu.modesAria')}">
            <button id="btnCampaign" class="btn btn-gold btn-campaign">
              <span class="button-emblem"><span class="icon-img icon-hero"></span></span>
              <span class="button-copy"><strong>${t('menu.campaign')}</strong><small>${t('menu.campaignHint')}</small></span>
              <span class="button-arrow">›</span>
            </button>

            <div class="mode-grid">
              <button id="btnSingle" class="btn mode-card mode-blue"><span class="mode-icon"><span class="icon-img icon-single"></span></span><span><strong>${t('menu.single')}</strong><small>${t('menu.singleHint')}</small></span></button>
              <button id="btnMixed" class="btn mode-card mode-violet"><span class="mode-icon"><span class="icon-img icon-mixed"></span></span><span><strong>${t('menu.mixed')}</strong><small>${t('menu.mixedHint')}</small></span></button>
              <button id="btnWeak" class="btn mode-card mode-orange"><span class="mode-icon"><span class="icon-img icon-weak"></span></span><span><strong>${t('menu.weak')}</strong><small>${t('menu.weakHint')}</small></span></button>
              <button id="btnMastery" class="btn mode-card mode-cyan"><span class="mode-icon"><span class="icon-img icon-mastery"></span></span><span><strong>${t('menu.mastery')}</strong><small>${t('menu.masteryHint')}</small></span></button>
              <button id="btnInfinite" class="btn mode-card mode-green"><span class="mode-icon"><span class="icon-img icon-infinite"></span></span><span><strong>${t('menu.infinite')}</strong><small>${t('menu.infiniteHint')}</small></span></button>
              <button id="btnSecretBoss" class="btn mode-card mode-secret" ${secretOpen ? '' : 'disabled'}>
                <span class="mode-icon"><span class="icon-img icon-secret"></span></span><span><strong>${secretOpen ? creatureName(SECRET_BOSS) : t('menu.secretLocked')}</strong><small>${secretOpen ? t('menu.secretHint') : t('menu.secretLockedHint')}</small></span>
              </button>
            </div>
          </nav>

          <div class="menu-utility-grid">
            <button id="btnWardrobe" class="btn utility-btn"><span class="icon-img icon-wardrobe"></span> ${t('menu.wardrobe')}</button>
            <button id="btnBestiary" class="btn utility-btn"><span class="icon-img icon-beastyari"></span> ${t('menu.bestiary')} <span class="utility-tally">${met}/${total}</span></button>
            <button id="btnStats" class="btn utility-btn"><span class="icon-img icon-stats"></span> ${t('menu.stats')}</button>
            <button id="btnAchievements" class="btn utility-btn"><span class="icon-img icon-achievements"></span> ${t('menu.achievements')}</button>
            <button id="btnSettings" class="btn utility-btn"><span class="icon-img icon-settings"></span> ${t('menu.settings')}</button>
          </div>
        </section>
      </div>
    `;

    this._bind('btnCampaign', () => this.showCampaignMap());
    this._bind('btnSingle', () => this.showSingleTablePicker());
    this._bind('btnMixed', () => this.showMixedTablePicker());
    this._bind('btnWeak', () => {
      this.onStartGame({ mode: 'weak', tables: [1,2,3,4,5,6,7,8,9,10], regionId: 1, tier: 3 });
      this.hide();
    });
    this._bind('btnMastery', () => {
      this.onStartGame({ mode: 'mastery', tables: [1,2,3,4,5,6,7,8,9,10], regionId: 8, tier: 4 });
      this.hide();
    });
    this._bind('btnInfinite', () => {
      this.onStartGame({ mode: 'infinite', tables: [1,2,3,4,5,6,7,8,9,10], regionId: 1, tier: 3 });
      this.hide();
    });
    this._bind('btnSecretBoss', () => {
      if (!this.saveSystem.canAccessSecretBoss()) {
        this.showNotice(t('menu.secretGate'));
        return;
      }
      this.onStartGame({
        mode: 'secret', regionId: 8, tables: [1,2,3,4,5,6,7,8,9,10], tier: 4, targetEnemies: 10,
      });
      this.hide();
    });
    this._bind('btnWardrobe', () => this.showWardrobe());
    this._bind('btnBestiary', () => this.showBestiary());
    this._bind('btnStats', () => this.showStats());
    this._bind('btnAchievements', () => this.showAchievements());
    this._bind('btnSettings', () => this.showSettings());
  }

  // ── Campaign Map (Regions) ──

  showCampaignMap() {
    const campaign = this.saveSystem.data.campaign;

    const bgThemes = ['meadows', 'forest', 'honey_cliffs', 'desert', 'volcano', 'ice', 'storm', 'ghost'];

    const nodesHtml = REGIONS.map((r, index) => {
      const prog = campaign[r.id] || { unlocked: false, stars: 0 };
      const statusClass = prog.unlocked ? 'unlocked' : 'locked';
      const stars = '★'.repeat(prog.stars || 0);
      const stageDone = [1,2,3,4,5].filter(stageNumber => this.saveSystem.getStageProgress(`${r.id}_${stageNumber}`)?.completed).length;
      const bgTheme = bgThemes[index] || 'meadows';
      const tables = r.tables.length > 4 ? t('campaign.tablesAll') : r.tables.join(', ');

      return `
        <button class="map-node region-node ${statusClass}" data-region="${r.id}" style="--region-primary:${r.bgColor1};--region-secondary:${r.bgColor2};" ${prog.unlocked ? '' : 'disabled'}>
          <span class="region-card-art"><span class="region-number">${String(r.id).padStart(2, '0')}</span></span>
          <span class="region-card-copy">
            <strong>${regionName(r)}</strong>
            <small>${t('campaign.tables', { tables })}</small>
          </span>
          <span class="region-card-footer"><span>${prog.unlocked ? t('campaign.stagesDone', { done: stageDone }) : t('campaign.sealed')}</span><span class="region-stars">${stars || (prog.unlocked ? t('campaign.unlocked') : '🔒')}</span></span>
        </button>
      `;
    }).join('');

    this.container.style.display = 'flex';
    this.container.innerHTML = `
      <div class="modal-content game-panel campaign-screen">
        <div class="screen-heading">
          <span class="heading-kicker">${t('campaign.kicker')}</span>
          <h2 class="modal-title">${t('campaign.title')}</h2>
          <p class="menu-description">${t('campaign.lead')}</p>
        </div>
        <div class="map-grid region-grid">${nodesHtml}</div>
        <div class="screen-footer-actions"><button id="btnBackMenu" class="btn btn-back">${t('menu.backToMenu')}</button></div>
      </div>
    `;

    document.querySelectorAll('.region-node.unlocked').forEach(el => {
      el.onclick = () => {
        const rId = parseInt(el.getAttribute('data-region'), 10);
        this.soundEngine.playClick();
        this.showStageSelection(rId);
      };
    });

    this._bind('btnBackMenu', () => this.showMainMenu());
  }

  // ── Bestiary ──

  /**
   * The field journal. Creatures the player has actually faced are shown in
   * full; the rest keep the locked-region treatment — greyed out, the artwork
   * blurred past recognition, so only a silhouette hints at what waits ahead.
   */
  showBestiary() {
    const roster = bestiaryRoster();
    const total = roster.reduce((sum, group) => sum + group.creatures.length, 0);
    let met = 0;
    let defeated = 0;

    const groupsHtml = roster.map(group => {
      const cards = group.creatures.map(creature => {
        const entry = this.saveSystem.getBestiaryEntry(creature.id);
        const known = entry.seen > 0 || entry.defeated > 0;
        if (known) met++;
        if (entry.defeated > 0) defeated++;

        const art = creatureArt(creature.id);
        const artStyle = art ? `--creature-art:url('${art}')` : '';
        const status = entry.defeated > 0
          ? t('bestiary.defeatedTimes', { count: entry.defeated })
          : known ? t('bestiary.met') : t('bestiary.unknown');
        const name = creatureName(creature);

        return `
          <li class="beast-card ${known ? 'known' : 'unknown'} rank-${creature.rank}"
              style="--beast-primary:${creature.color || group.color};${artStyle}">
            <span class="beast-art" role="img" aria-label="${known ? name : t('bestiary.unknownCreature')}"></span>
            <span class="beast-copy">
              <strong>${known ? name : '???'}</strong>
              <small>${rankLabel(creature.rank)}${known ? ` · ${t('bestiary.hp', { hp: creature.hp })}` : ''}</small>
            </span>
            <span class="beast-status">${status}</span>
          </li>
        `;
      }).join('');

      const groupMet = group.creatures.filter(c => this.saveSystem.hasMetEnemy(c.id)).length;
      return `
        <section class="beast-group" style="--group-primary:${group.color};--group-secondary:${group.accent};">
          <header class="beast-group-head">
            <h3>${group.name}</h3>
            <span class="beast-group-tally">${groupMet}/${group.creatures.length}</span>
          </header>
          <ul class="beast-grid">${cards}</ul>
        </section>
      `;
    }).join('');

    const percent = total ? Math.round((met / total) * 100) : 0;

    this.container.style.display = 'flex';
    this.container.innerHTML = `
      <div class="modal-content game-panel bestiary-screen">
        <div class="bestiary-header-bar">
          <div class="bestiary-title-group">
            <span class="heading-kicker">${t('bestiary.kicker')}</span>
            <h2 class="modal-title">${t('menu.bestiary')}</h2>
          </div>
          <div class="stat-grid bestiary-summary">
            ${this._renderStat(`${met}/${total}`, t('bestiary.discovered'), 'gold')}
            ${this._renderStat(defeated, t('bestiary.defeated'), 'red')}
            ${this._renderStat(`${percent}%`, t('bestiary.completion'), percent >= 100 ? 'green' : 'blue')}
          </div>
        </div>
        <div class="bestiary-progress"><span style="width:${percent}%"></span></div>

        <div class="bestiary-scroll">${groupsHtml}</div>
        <div class="screen-footer-actions"><button id="btnBackMenu" class="btn btn-back">${t('menu.backToMenu')}</button></div>
      </div>
    `;

    this._bind('btnBackMenu', () => this.showMainMenu());
  }

  // ── Stage Selection (5 stages per region) ──

  showStageSelection(regionId) {
    const region = REGIONS.find(r => r.id === regionId);
    if (!region) return this.showCampaignMap();

    // The prebuilt list: every attempt re-rolls its own line-up at launch, so
    // regenerating all forty stages just to read their labels bought nothing.
    const regionStages = CAMPAIGN_STAGES.filter(s => s.regionId === regionId);
    const stageIcons = ['I', 'II', 'III', 'IV', '★'];

    const stagesHtml = regionStages.map((stage, idx) => {
      const prog = this.saveSystem.getStageProgress(stage.id);
      const locked = !prog.unlocked;
      const stars = '★'.repeat(prog.stars || 0);
      return `
        <button class="map-node stage-node ${locked ? 'locked' : 'unlocked'} ${stage.isBossStage ? 'boss-stage' : ''}" data-stage-idx="${idx}" ${locked ? 'disabled' : ''}>
          <span class="stage-index">${stageIcons[idx]}</span>
          <span class="stage-node-copy"><strong>${stageShortName(stage)}</strong><small>${t('stage.enemiesAndTier', { count: stage.targetEnemies, tier: stage.tier })}</small></span>
          <span class="stage-node-status">${locked ? '🔒' : prog.completed ? (stars || t('stage.completed')) : t('stage.toBattle')}</span>
        </button>
      `;
    }).join('');

    this.container.style.display = 'flex';
    this.container.innerHTML = `
      <div class="modal-content game-panel stage-screen" style="--region-primary:${region.bgColor1};--region-secondary:${region.bgColor2};">
        <div class="screen-heading stage-heading">
          <span class="heading-kicker">${t('stage.region', { id: region.id })}</span>
          <h2 class="modal-title">${regionName(region)}</h2>
          <p class="menu-description">${regionDescription(region)}</p>
        </div>
        <div class="region-table-runes" style="margin-bottom: 8px;">${region.tables.slice(0,10).map(table => `<span>×${table}</span>`).join('')}</div>
        <div class="stage-path">${stagesHtml}</div>
        <div class="screen-footer-actions"><button id="btnBackCampaign" class="btn btn-back">${t('campaign.backToMap')}</button></div>
      </div>
    `;

    document.querySelectorAll('.stage-node.unlocked').forEach(el => {
      el.onclick = () => {
        const idx = parseInt(el.getAttribute('data-stage-idx'), 10);
        const stage = regionStages[idx];
        this.soundEngine.playClick();
        this.onStartGame({ mode: 'campaign', regionId, tables: stage.tables, tier: stage.tier, stageData: stage });
        this.hide();
      };
    });
    this._bind('btnBackCampaign', () => this.showCampaignMap());
  }

  // ── Table Pickers ──

  /**
   * A table token: the numeral is the content, so the grid reads as a rack of
   * runes rather than a list of "table of N" labels.
   */
  _renderTableToken(table, { selected = false, extraClass = '' } = {}) {
    const mastered = this._tableMastery(table);
    return `
      <button class="table-token ${selected ? 'is-selected' : ''} ${extraClass}" data-table="${table}">
        <span class="token-face">
          <span class="token-numeral">${table}</span>
          <span class="token-mult">×</span>
        </span>
        <span class="token-meter" aria-hidden="true"><i style="width:${mastered}%"></i></span>
        <span class="token-caption">${t('tables.mastered', { percent: mastered })}</span>
      </button>`;
  }

  /** Share of a table's ten facts that have reached MASTERED. */
  _tableMastery(table) {
    let mastered = 0;
    for (let b = 1; b <= 10; b++) {
      if (this.saveSystem.getFactStat(table, b).status === 'MASTERED') mastered++;
    }
    return mastered * 10;
  }

  showSingleTablePicker() {
    const max = this.saveSystem.data.settings.include1112 ? 12 : 10;
    let tokens = '';
    for (let table = 1; table <= max; table++) tokens += this._renderTableToken(table);

    this.container.style.display = 'flex';
    this.container.innerHTML = `
      <div class="modal-content game-panel table-picker-screen">
        <div class="screen-heading">
          <h2 class="modal-title">${t('tables.pickTitle')}</h2>
          <span class="heading-kicker">${t('tables.pickKicker')}</span>
        </div>

        <div class="screen-body">
          <div class="token-rack">${tokens}</div>
          <button id="btnBackMenu" class="btn">${t('menu.back')}</button>
        </div>
      </div>
    `;

    document.querySelectorAll('.table-token').forEach(b => {
      b.onclick = () => {
        const table = parseInt(b.getAttribute('data-table'), 10);
        this.soundEngine.playClick();
        this.showTableTierPicker(table);
      };
    });

    this._bind('btnBackMenu', () => this.showMainMenu());
  }

  showTableTierPicker(table) {
    const unlockedTier = this.saveSystem.getUnlockedLearningTier(table);
    const cards = [1,2,3,4].map(tier => {
      const progress = this.saveSystem.getLearningTierProgress(table, tier);
      const unlocked = tier <= unlockedTier;
      const accuracy = Math.round((progress.bestAccuracy || 0) * 100);
      const state = unlocked
        ? (progress.completed ? `✅ ${accuracy}%` : t('tables.available'))
        : t('tables.needPrevious');
      return `<button class="btn tier-pick-btn ${progress.completed ? 'btn-gold' : ''}" data-tier="${tier}" ${unlocked ? '' : 'disabled'}>
        <strong>${t('tables.tier', { tier })}</strong><span>${t(`tables.tier${tier}`)}</span><small>${state}</small>
      </button>`;
    }).join('');
    this.container.style.display = 'flex';
    this.container.innerHTML = `<div class="modal-content game-panel tier-screen">
      <h2 class="modal-title">${t('tables.tableOf', { table })}</h2>
      <p class="menu-description">${t('tables.tierLead')}</p>
      <div class="tier-grid">${cards}</div>
      <button id="btnBackTables" class="btn">${t('tables.otherTable')}</button>
    </div>`;
    document.querySelectorAll('.tier-pick-btn:not(:disabled)').forEach(button => {
      button.onclick = () => {
        const tier = Number(button.dataset.tier);
        this.soundEngine.playClick();
        this.onStartGame({ mode: 'single', tables: [table], regionId: Math.min(8, Math.max(1, table - 1)), tier, targetEnemies: 10 });
        this.hide();
      };
    });
    this._bind('btnBackTables', () => this.showSingleTablePicker());
  }


  showMixedTablePicker() {
    const max = this.saveSystem.data.settings.include1112 ? 12 : 10;
    const selected = new Set([2, 3, 4, 5]);

    const renderGrid = () => {
      let gridHtml = '';
      for (let table = 1; table <= max; table++) {
        gridHtml += this._renderTableToken(table, { selected: selected.has(table) });
      }
      return gridHtml;
    };

    this.container.style.display = 'flex';
    this.container.innerHTML = `
      <div class="modal-content game-panel mixed-screen">
        <div class="screen-heading">
          <h2 class="modal-title">${t('menu.mixed')}</h2>
          <span class="heading-kicker" id="mixedCount">${t('tables.selectedCount', { count: selected.size })}</span>
        </div>

        <div class="screen-body">
          <div id="mixedGrid" class="token-rack">${renderGrid()}</div>
          <div class="action-row">
            <button id="btnStartMixed" class="btn btn-gold">${t('tables.startBattle')}</button>
            <button id="btnBackMenu" class="btn">${t('menu.back')}</button>
          </div>
        </div>
      </div>
    `;

    const updateListeners = () => {
      document.querySelectorAll('.table-token').forEach(b => {
        b.onclick = () => {
          const table = parseInt(b.getAttribute('data-table'), 10);
          if (selected.has(table)) {
            if (selected.size > 1) selected.delete(table);
          } else {
            selected.add(table);
          }
          this.soundEngine.playClick();
          document.getElementById('mixedGrid').innerHTML = renderGrid();
          const counter = document.getElementById('mixedCount');
          if (counter) counter.textContent = t('tables.selectedCount', { count: selected.size });
          updateListeners();
        };
      });
    };
    updateListeners();

    this._bind('btnStartMixed', () => {
      this.onStartGame({ mode: 'mixed', tables: Array.from(selected), regionId: 1, tier: 3 });
      this.hide();
    });
    this._bind('btnBackMenu', () => this.showMainMenu());
  }

  // ── Pause Menu ──

  showPauseMenu(options = {}) {
    this.pauseOptions = { ...options };
    this.container.style.display = 'flex';
    this.container.innerHTML = `
      <div class="modal-content game-panel pause-screen">
        <div class="screen-heading">
          <h2 class="modal-title">${t('pause.title')}</h2>
          <span class="heading-kicker">${t('pause.kicker')}</span>
        </div>

        <div class="screen-body">
          <div class="action-stack pause-actions">
            <button id="btnResume" class="btn btn-gold btn-hero">${t('pause.resume')}</button>
            <button id="btnRestart" class="btn">${t('pause.restart')}</button>
            ${options.isInfinite ? `<button id="btnEndInfinite" class="btn">${t('pause.endInfinite')}</button>` : ''}
            <button id="btnPauseSettings" class="btn">${t('pause.settings')}</button>
            <button id="btnExitMenu" class="btn btn-danger">${t('pause.exit')}</button>
          </div>
        </div>
      </div>
    `;

    this._bind('btnResume', () => {
      this.hide();
      if (this.onResumeGame) this.onResumeGame();
    });
    this._bind('btnRestart', () => {
      this.hide();
      if (this.onRestartStage) this.onRestartStage();
    });
    this._bind('btnEndInfinite', () => { this.hide(); if (this.onEndInfinite) this.onEndInfinite(); });
    this._bind('btnPauseSettings', () => this.showSettings(true));
    this._bind('btnExitMenu', () => {
      this.showConfirm(
        t('pause.exitConfirm'),
        () => { if (this.onExitGame) this.onExitGame(); else this.showMainMenu(); },
        () => this.showPauseMenu(this.pauseOptions),
        t('pause.exitTitle')
      );
    });
  }

  // ── Victory / Defeat / Results ──

  /** Coin and XP pills shared by every outcome screen. */
  _renderRewards(coins, xp) {
    return `
      <div class="reward-row">
        <span class="reward-chip is-coins"><span class="chip-icon" aria-hidden="true">🪙</span>+${coins}</span>
        <span class="reward-chip is-xp"><span class="chip-icon" aria-hidden="true">⭐</span>+${xp} XP</span>
      </div>`;
  }

  /** One big-number tile. `tone` picks the accent colour. */
  _renderStat(value, label, tone) {
    return `
      <div class="stat-tile is-${tone}">
        <span class="stat-value">${value}</span>
        <span class="stat-label">${label}</span>
      </div>`;
  }

  showVictoryModal(stageName, coinsEarned, expEarned, onContinue, meta = {}) {
    const stars = meta.stars || 1;
    const accuracy = Math.round((meta.accuracy || 0) * 100);

    this.container.style.display = 'flex';
    this.container.innerHTML = `
      <div class="modal-content game-panel victory-screen">
        <div class="screen-heading">
          <h1 class="modal-title">${t('result.victory')}</h1>
          <span class="heading-kicker">${meta.firstCompletion === false ? t('result.replay') : t('result.firstClear')}</span>
        </div>

        <div class="screen-body">
          <p class="result-lead">${t('result.stageCleared', { stage: stageName })}</p>
          <div class="result-stars" aria-label="${t('result.starsAria', { stars })}">${this._renderStars(stars)}</div>

          <div class="stat-grid">
            ${this._renderStat(`${accuracy}%`, t('result.accuracy'), accuracy >= 95 ? 'green' : accuracy >= 80 ? 'gold' : 'blue')}
            ${this._renderStat(`${stars}/3`, t('result.stars'), 'gold')}
          </div>

          ${this._renderRewards(coinsEarned, expEarned)}

          <button id="btnVictoryContinue" class="btn btn-gold">${t('result.continue')}</button>
        </div>
      </div>
    `;

    this._bind('btnVictoryContinue', () => {
      this.hide();
      if (onContinue) onContinue();
    });
  }

  showDefeatModal(stageName, onRetry, onMenu) {
    this.container.style.display = 'flex';
    this.container.innerHTML = `
      <div class="modal-content game-panel defeat-screen">
        <div class="screen-heading">
          <h1 class="modal-title">${t('result.defeatTitle')}</h1>
          <span class="heading-kicker">${t('result.defeatStage', { stage: stageName })}</span>
        </div>

        <div class="screen-body">
          <p class="result-lead">${t('result.defeatLead')}</p>
          <p class="result-note">${t('result.defeatNote')}</p>

          <div class="action-row">
            <button id="btnRetryStage" class="btn btn-gold">${t('result.retry')}</button>
            <button id="btnDefeatExit" class="btn">${t('menu.homeMenu')}</button>
          </div>
        </div>
      </div>
    `;

    this._bind('btnRetryStage', () => {
      this.hide();
      if (onRetry) onRetry();
    });
    this._bind('btnDefeatExit', () => { if (onMenu) onMenu(); else this.showCampaignMap(); });
  }

  showTrainingResultModal(mode, correct, total, coins, xp, onRetry, onMenu, meta = {}) {
    const modeKeys = { single: 'result.modeSingle', mixed: 'result.modeMixed', weak: 'result.modeWeak', mastery: 'result.modeMastery' };
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const scope = [
      meta.tables?.length ? t('campaign.tables', { tables: meta.tables.join(', ') }) : '',
      meta.tier ? t('result.scopeTier', { tier: meta.tier }) : '',
    ].filter(Boolean).join(' · ');
    const duration = meta.durationMs ? this._formatDuration(meta.durationMs) : '';

    this.container.style.display = 'flex';
    this.container.innerHTML = `
      <div class="modal-content game-panel result-screen">
        <div class="screen-heading">
          <h1 class="modal-title">${t('result.trainingTitle')}</h1>
          <span class="heading-kicker">${modeKeys[mode] ? t(modeKeys[mode]) : t('result.trainingDefault')}</span>
        </div>

        <div class="screen-body">
          ${scope ? `<p class="result-note">${scope}</p>` : ''}

          <div class="stat-grid">
            ${this._renderStat(`${correct}/${total}`, t('result.correct'), 'green')}
            ${this._renderStat(`${accuracy}%`, t('result.accuracy'), accuracy >= 90 ? 'gold' : accuracy >= 70 ? 'blue' : 'red')}
            ${duration ? this._renderStat(duration, t('result.time'), 'violet') : ''}
          </div>

          ${this._renderRewards(coins, xp)}

          <div class="action-stack">
            <button id="btnRetryTraining" class="btn btn-gold">${t('result.repeat')}</button>
            <button id="btnTrainingMenu" class="btn">${t('menu.homeMenu')}</button>
          </div>
        </div>
      </div>
    `;

    this._bind('btnRetryTraining', () => {
      this.hide();
      if (onRetry) onRetry();
    });
    this._bind('btnTrainingMenu', () => {
      this.hide();
      if (onMenu) onMenu();
    });
  }

  /**
   * Purely presentational. `isRecord` comes from the caller, which has already
   * written the record — recomputing it here always read the freshly saved
   * best and so never fired.
   */
  showInfiniteResultModal(kills, wave, coins, xp, onMenu, accuracy = 0, isRecord = false) {
    const bestKills = this.saveSystem.data.stats.infiniteBestKills || 0;

    this.container.style.display = 'flex';
    this.container.innerHTML = `
      <div class="modal-content game-panel infinite-result-screen">
        <div class="screen-heading">
          <h1 class="modal-title">${t('result.infiniteTitle')}</h1>
          <span class="heading-kicker">${t('result.infiniteRecord', { kills: Math.max(kills, bestKills) })}</span>
        </div>

        <div class="screen-body">
          ${isRecord ? `<span class="record-banner">${t('result.newRecord')}</span>` : ''}

          <div class="stat-grid">
            ${this._renderStat(kills, t('bestiary.defeated'), 'green')}
            ${this._renderStat(wave, t('result.waveLabel'), 'violet')}
            ${this._renderStat(`${Math.round(accuracy * 100)}%`, t('result.accuracy'), 'blue')}
          </div>

          ${this._renderRewards(coins, xp)}

          <button id="btnInfiniteMenu" class="btn btn-gold">${t('menu.homeMenu')}</button>
        </div>
      </div>
    `;

    this._bind('btnInfiniteMenu', () => {
      this.hide();
      if (onMenu) onMenu();
    });
  }

  // ── Wardrobe ──

  showWardrobe() {
    const hero = this.saveSystem.data.hero;
    const coins = this.saveSystem.data.stats.coins;

    // Each choice shows the actual artwork it applies — a grid of identical
    // text buttons gave the player nothing to look at.
    const archetypesHtml = Object.values(ARCHETYPES).map(a => {
      const isOwned = this.saveSystem.isCosmeticUnlocked(a.id);
      const isSelected = hero.archetype === a.id;
      const state = isSelected ? 'is-selected' : isOwned ? 'is-owned' : 'is-locked';
      const tag = isSelected ? t('wardrobe.selected') : isOwned ? t('wardrobe.equip') : `🪙 ${a.price}`;

      return `
        <button class="pick-card arch-btn ${state}" data-arch="${a.id}" data-price="${a.price}"
                style="--pick-accent:${a.themeColor}">
          <span class="pick-art"><img src="./assets/heroes/hero_${a.id}.png" alt="" /></span>
          <span class="pick-name">${archetypeName(a)}</span>
          <span class="pick-tag">${tag}</span>
        </button>`;
    }).join('');

    const skinsHtml = COSMETICS.skins.map(s => {
      const skinKey = s.tier === 1 ? hero.archetype : `${hero.archetype}_${s.tier}`;
      const isOwned = s.tier === 1 || this.saveSystem.isCosmeticUnlocked(skinKey);
      const isSelected = (hero.skinTier || 1) === s.tier;
      const state = isSelected ? 'is-selected' : isOwned ? 'is-owned' : 'is-locked';
      const tag = isSelected ? t('wardrobe.selected') : isOwned ? t('wardrobe.equip') : `🪙 ${s.price}`;
      const suffix = s.tier > 1 ? `_${s.tier}` : '';

      return `
        <button class="pick-card skin-btn ${state}" data-tier="${s.tier}" data-price="${s.price}">
          <span class="pick-art"><img src="./assets/heroes/hero_${hero.archetype}${suffix}.png" alt="" /></span>
          <span class="pick-name">${s.icon} ${skinName(s)}</span>
          <span class="pick-tag">${tag}</span>
        </button>`;
    }).join('');

    const archName = archetypeName(ARCHETYPES[hero.archetype]) || archetypeName(ARCHETYPES.knight);

    this.container.style.display = 'flex';
    this.container.innerHTML = `
      <div class="modal-content game-panel wardrobe-screen">
        <div class="screen-heading">
          <h2 class="modal-title">${t('wardrobe.title')}</h2>
          <span class="heading-kicker">${archName} · 🪙 ${coins}</span>
        </div>

        <div class="screen-body">
          <section class="pick-section">
            <h3 class="pick-heading">${t('wardrobe.archetype')}</h3>
            <div class="pick-grid">${archetypesHtml}</div>
          </section>

          <section class="pick-section">
            <h3 class="pick-heading">${t('wardrobe.look')}</h3>
            <div class="pick-grid is-skins">${skinsHtml}</div>
          </section>

          <button id="btnSaveWardrobe" class="btn btn-gold">${t('wardrobe.done')}</button>
        </div>
      </div>
    `;

    document.querySelectorAll('.arch-btn').forEach(b => {
      b.onclick = () => {
        const id = b.getAttribute('data-arch');
        const price = parseInt(b.getAttribute('data-price'), 10);
        if (!this.saveSystem.isCosmeticUnlocked(id)) {
          const res = this.saveSystem.buyCosmetic(id, price);
          if (!res.success) {
            this.showNotice(t('wardrobe.needCoins', { price }), () => this.showWardrobe(), t('wardrobe.needCoinsTitle'));
            return;
          }
        }
        hero.archetype = id;
        // Reset skin tier to 1 if the new archetype's skin is not unlocked
        const skinKey = (hero.skinTier || 1) === 1 ? id : `${id}_${hero.skinTier}`;
        if (!this.saveSystem.isCosmeticUnlocked(skinKey) && (hero.skinTier || 1) > 1) {
          hero.skinTier = 1;
        }
        this.saveSystem.save();
        this.soundEngine.playClick();
        this.showWardrobe();
      };
    });

    document.querySelectorAll('.skin-btn').forEach(b => {
      b.onclick = () => {
        const tier = parseInt(b.getAttribute('data-tier'), 10);
        const price = parseInt(b.getAttribute('data-price'), 10);
        const skinKey = tier === 1 ? hero.archetype : `${hero.archetype}_${tier}`;
        if (tier > 1 && !this.saveSystem.isCosmeticUnlocked(skinKey)) {
          const res = this.saveSystem.buyCosmetic(skinKey, price);
          if (!res.success) {
            this.showNotice(t('wardrobe.needCoins', { price }), () => this.showWardrobe(), t('wardrobe.needCoinsTitle'));
            return;
          }
        }
        hero.skinTier = tier;
        this.saveSystem.save();
        this.soundEngine.playClick();
        this.showWardrobe();
      };
    });

    this._bind('btnSaveWardrobe', () => this.showMainMenu());
  }

  // ── Stats / Mastery Map ──

  showStats() {
    const statusClass = {
      MASTERED: 'is-mastered', FAMILIAR: 'is-familiar',
      UNSTABLE: 'is-unstable', NEEDS_REVISION: 'is-revision',
    };

    let gridHtml = '';
    let mastered = 0;
    for (let a = 1; a <= 10; a++) {
      for (let b = 1; b <= 10; b++) {
        const stat = this.saveSystem.getFactStat(a, b);
        if (stat.status === 'MASTERED') mastered++;
        const tone = statusClass[stat.status] || 'is-new';
        const title = t('mastery.cellTitle', { a, b, product: a * b, shown: stat.shown, correct: stat.correct });
        gridHtml += `<div class="fact-cell ${tone}" title="${title}">${a}×${b}</div>`;
      }
    }

    const stats = this.saveSystem.data.stats;
    const accuracy = stats.totalAnswered ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0;

    this.container.style.display = 'flex';
    this.container.innerHTML = `
      <div class="modal-content game-panel mastery-screen">
        <div class="screen-heading">
          <h2 class="modal-title">${t('mastery.title')}</h2>
          <span class="heading-kicker">${t('mastery.kicker', { mastered })}</span>
        </div>

        <div class="screen-body">
          <div class="stat-grid">
            ${this._renderStat(stats.totalAnswered, t('mastery.answers'), 'blue')}
            ${this._renderStat(`${accuracy}%`, t('result.accuracy'), accuracy >= 90 ? 'green' : accuracy >= 70 ? 'gold' : 'red')}
            ${this._renderStat(stats.maxStreak, t('menu.bestStreak'), 'violet')}
            ${this._renderStat(stats.weakFixedCount, t('mastery.fixed'), 'green')}
          </div>

          <div class="fact-map">${gridHtml}</div>

          <div class="fact-legend">
            <span class="legend-item"><i class="is-mastered"></i>${t('mastery.legendMastered')}</span>
            <span class="legend-item"><i class="is-familiar"></i>${t('mastery.legendFamiliar')}</span>
            <span class="legend-item"><i class="is-unstable"></i>${t('mastery.legendUnstable')}</span>
            <span class="legend-item"><i class="is-revision"></i>${t('mastery.legendRevision')}</span>
            <span class="legend-item"><i class="is-new"></i>${t('mastery.legendNew')}</span>
          </div>

          <button id="btnBackMenu" class="btn">${t('menu.back')}</button>
        </div>
      </div>
    `;

    this._bind('btnBackMenu', () => this.showMainMenu());
  }

  // ── Achievements ──

  showAchievements() {
    const unlocked = this.saveSystem.data.achievements || {};

    const earned = ACHIEVEMENTS.filter(ach => unlocked[ach.id]).length;

    const listHtml = ACHIEVEMENTS.map(ach => {
      const isDone = !!unlocked[ach.id];
      return `
        <div class="achievement-row ${isDone ? 'earned' : 'locked'}">
          <span class="achievement-icon" aria-hidden="true">${ach.icon}</span>
          <span class="achievement-copy">
            <strong>${achievementTitle(ach)}</strong>
            <small>${achievementDesc(ach)}</small>
          </span>
          <span class="achievement-state" aria-label="${isDone ? t('achievements.earned') : t('achievements.locked')}">${isDone ? '✅' : '🔒'}</span>
        </div>
      `;
    }).join('');

    this.container.style.display = 'flex';
    this.container.innerHTML = `
      <div class="modal-content game-panel achievement-screen">
        <div class="screen-heading">
          <h2 class="modal-title">${t('achievements.title')}</h2>
          <span class="heading-kicker">${t('achievements.kicker', { earned, total: ACHIEVEMENTS.length })}</span>
        </div>
        <div class="achievement-list">${listHtml}</div>
        <button id="btnBackMenu" class="btn">${t('menu.back')}</button>
      </div>
    `;

    this._bind('btnBackMenu', () => this.showMainMenu());
  }

  // ── Settings ──

  /** A settings row with an icon, a description and a sliding switch. */
  _settingToggle(id, icon, title, hint, isOn) {
    return `
      <div class="setting-item">
        <span class="medallion setting-icon" aria-hidden="true">${icon}</span>
        <span class="setting-copy"><strong>${title}</strong><small>${hint}</small></span>
        <button id="${id}" class="switch ${isOn ? 'is-on' : ''}" role="switch" aria-checked="${isOn}" aria-label="${title}">
          <span class="switch-track"><span class="switch-knob"></span></span>
        </button>
      </div>`;
  }

  /** A settings row carrying a range control. */
  _settingSlider(id, title, min, max, step, value) {
    const percent = Math.round(((value - min) / (max - min)) * 100);
    return `
      <div class="setting-item is-slider">
        <span class="setting-copy"><strong>${title}</strong></span>
        <span class="slider-wrap">
          <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${title}" />
          <span class="slider-value" id="${id}Value">${percent}%</span>
        </span>
      </div>`;
  }

  /**
   * A settings row offering a small set of choices — a segmented control.
   * A switch would only ever fit two options and could not label them.
   */
  _settingChoice(icon, title, hint, options, current) {
    const buttons = options.map(option => `
      <button class="segment ${option.value === current ? 'is-active' : ''}"
              data-choice="${option.value}" role="radio" aria-checked="${option.value === current}">
        ${option.icon ? `<span aria-hidden="true">${option.icon}</span>` : ''}<span>${option.label}</span>
      </button>`).join('');

    return `
      <div class="setting-item is-choice">
        <span class="medallion setting-icon" aria-hidden="true">${icon}</span>
        <span class="setting-copy"><strong>${title}</strong><small>${hint}</small></span>
        <span class="segmented" role="radiogroup" aria-label="${title}">${buttons}</span>
      </div>`;
  }

  showSettings(isFromPause = false) {
    const settings = this.saveSystem.data.settings;

    this.container.style.display = 'flex';
    this.container.innerHTML = `
      <div class="modal-content game-panel settings-screen">
        <div class="screen-heading">
          <h2 class="modal-title">${t('settings.title')}</h2>
          <span class="heading-kicker">${t('settings.kicker')}</span>
        </div>

        <div class="screen-body">
          <section class="setting-group">
            <h3 class="pick-heading">${t('settings.groupLanguage')}</h3>
            ${this._settingChoice('🌐', t('settings.language'), t('settings.languageHint'),
              LANGUAGES.map(lang => ({ value: lang.id, label: lang.label, icon: lang.flag })),
              getLanguage())}
          </section>

          <section class="setting-group">
            <h3 class="pick-heading">${t('settings.groupSound')}</h3>
            ${this._settingToggle('btnToggleSfx', '🔊', t('settings.sfx'), t('settings.sfxHint'), !settings.sfxMuted)}
            ${this._settingSlider('sliderSfx', t('settings.sfxVolume'), 0, 1, 0.1, settings.sfxVolume ?? 1)}
            ${this._settingToggle('btnToggleBgm', '🎵', t('settings.bgm'), t('settings.bgmHint'), !settings.bgmMuted)}
            ${this._settingSlider('sliderBgm', t('settings.bgmVolume'), 0, 1, 0.1, settings.bgmVolume ?? 1)}
            ${this._settingToggle('btnToggleVibration', '📳', t('settings.vibration'), t('settings.vibrationHint'), !settings.vibrationMuted)}
          </section>

          <section class="setting-group">
            <h3 class="pick-heading">${t('settings.groupLearning')}</h3>
            ${this._settingToggle('btnToggle1112', '🔢', t('settings.tables1112'), t('settings.tables1112Hint'), settings.include1112)}
            ${this._settingToggle('btnToggleRelaxed', '🧘', t('settings.relaxed'), t('settings.relaxedHint'), settings.relaxedMode)}
          </section>

          <section class="setting-group">
            <h3 class="pick-heading">${t('settings.groupAccess')}</h3>
            ${this._settingToggle('btnToggleMotion', '🐢', t('settings.reducedMotion'), t('settings.reducedMotionHint'), settings.reducedMotion)}
            ${this._settingToggle('btnToggleContrast', '◐', t('settings.contrast'), t('settings.contrastHint'), settings.highContrast)}
          </section>

          <section class="setting-group">
            <h3 class="pick-heading">${t('settings.groupSave')}</h3>
            <div class="action-row">
              <button id="btnExportSave" class="btn">${t('settings.export')}</button>
              <button id="btnImportSave" class="btn">${t('settings.import')}</button>
            </div>
            <button id="btnResetProgress" class="btn btn-danger">${t('settings.reset')}</button>
          </section>

          <button id="btnBackMenu" class="btn btn-gold btn-hero">${t('settings.saveAndBack')}</button>
        </div>
      </div>
    `;

    // Sliders paint their own filled portion and show a live readout, so the
    // control reflects its value instead of being a bare browser widget.
    const bindSlider = (id, apply) => {
      const input = document.getElementById(id);
      if (!input) return;
      const readout = document.getElementById(`${id}Value`);
      const min = parseFloat(input.min);
      const max = parseFloat(input.max);
      const paint = () => {
        const percent = Math.round(((parseFloat(input.value) - min) / (max - min)) * 100);
        input.style.setProperty('--fill', `${percent}%`);
        if (readout) readout.textContent = `${percent}%`;
      };
      paint();
      input.oninput = paint;
      input.onchange = event => { apply(parseFloat(event.target.value)); this.saveSystem.save(); };
    };

    bindSlider('sliderSfx', value => { settings.sfxVolume = value; });
    bindSlider('sliderBgm', value => { settings.bgmVolume = value; });

    // Мова: зберігається в профілі, тому вибір переживає перезапуск.
    document.querySelectorAll('.is-choice .segment').forEach(button => {
      button.onclick = () => {
        const next = button.getAttribute('data-choice');
        if (next === getLanguage()) return;
        this.soundEngine.playClick();
        settings.language = next;
        this.saveSystem.save();
        setLanguage(next);
        if (this.onLanguageChange) this.onLanguageChange(next);
        this.showSettings(isFromPause);
      };
    });

    this._bind('btnToggleSfx', () => {
      settings.sfxMuted = !settings.sfxMuted;
      this.saveSystem.save();
      this.showSettings(isFromPause);
    });

    this._bind('btnToggleBgm', () => {
      settings.bgmMuted = !settings.bgmMuted;
      // Unmuting resumes the track for wherever the player is — reaching for
      // `startBgm()` here would drop a boss fight back to the meadows theme.
      if (settings.bgmMuted) this.soundEngine.stopBgm();
      else if (!this.soundEngine.resumeCurrentBgm()) this.soundEngine.startMenuBgm();
      this.saveSystem.save();
      this.showSettings(isFromPause);
    });

    this._bind('btnToggleVibration', () => {
      settings.vibrationMuted = !settings.vibrationMuted;
      if (!settings.vibrationMuted) this.soundEngine.vibrate(30);
      this.saveSystem.save();
      this.showSettings(isFromPause);
    });

    this._bind('btnToggle1112', () => {
      settings.include1112 = !settings.include1112;
      this.saveSystem.save();
      this.showSettings(isFromPause);
    });

    this._bind('btnToggleRelaxed', () => {
      settings.relaxedMode = !settings.relaxedMode;
      this.saveSystem.save();
      this.showSettings(isFromPause);
    });

    this._bind('btnToggleMotion', () => { settings.reducedMotion = !settings.reducedMotion; this.saveSystem.save(); document.body.classList.toggle('reduced-motion', settings.reducedMotion); this.showSettings(isFromPause); });
    this._bind('btnToggleContrast', () => { settings.highContrast = !settings.highContrast; this.saveSystem.save(); document.body.classList.toggle('high-contrast', settings.highContrast); this.showSettings(isFromPause); });

    this._bind('btnExportSave', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(this.saveSystem.exportJSON());
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "math_hero_save.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });

    this._bind('btnImportSave', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const result = this.saveSystem.importJSON(ev.target.result);
          if (result.success) {
            this.showNotice(t('settings.importOk'), () => this.showMainMenu(), t('settings.importDone'));
          } else {
            this.showNotice(result.error, () => this.showSettings(isFromPause), t('settings.importFailed'));
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });

    this._bind('btnResetProgress', () => {
      this.showConfirm(
        t('settings.resetConfirm'),
        () => { this.saveSystem.reset(); this.showMainMenu(); },
        () => this.showSettings(isFromPause),
        t('settings.resetTitle')
      );
    });

    this._bind('btnBackMenu', () => {
      if (isFromPause) this.showPauseMenu(this.pauseOptions);
      else this.showMainMenu();
    });
  }

  showNotice(message, onClose = null, title = null) {
    this.container.style.display = 'flex';
    this.container.innerHTML = `
      <div class="modal-content game-panel notice-screen notice-card">
        <div class="notice-emblem" aria-hidden="true">i</div>
        <h2 class="modal-title">${title || t('dialog.noticeTitle')}</h2>
        <p>${message}</p>
        <button id="btnNoticeClose" class="btn btn-gold">${t('dialog.noticeOk')}</button>
      </div>`;
    this._bind('btnNoticeClose', () => { if (onClose) onClose(); else this.showMainMenu(); });
  }

  showConfirm(message, onConfirm, onCancel = null, title = null) {
    this.container.style.display = 'flex';
    this.container.innerHTML = `
      <div class="modal-content game-panel confirm-screen notice-card">
        <div class="notice-emblem warning" aria-hidden="true">!</div>
        <h2 class="modal-title">${title || t('dialog.confirmTitle')}</h2>
        <p>${message}</p>
        <div class="confirm-actions">
          <button id="btnConfirmYes" class="btn btn-danger">${t('dialog.confirmYes')}</button>
          <button id="btnConfirmNo" class="btn btn-back">${t('dialog.confirmNo')}</button>
        </div>
      </div>`;
    this._bind('btnConfirmYes', () => { if (onConfirm) onConfirm(); });
    this._bind('btnConfirmNo', () => { if (onCancel) onCancel(); else this.showMainMenu(); });
  }

  showToast(message, type = 'info') {
    let host = document.getElementById('toastHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toastHost';
      host.className = 'toast-host';
      document.body.appendChild(host);
    }
    // Measured now rather than cached: the HUD bar changes height with the
    // stage name and the breakpoint, and a stale value would misplace the card.
    const bar = document.getElementById('topBar');
    if (bar) {
      const bottom = Math.round(bar.getBoundingClientRect().bottom);
      host.style.setProperty('--hud-bottom', `${bottom}px`);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    host.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  }

  // ── Helpers ──

  /** Milliseconds as `m:ss`, or `Ns` for runs under a minute. */
  _formatDuration(ms) {
    const total = Math.max(0, Math.round(ms / 1000));
    if (total < 60) return t('result.secondsShort', { seconds: total });
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  /** Three star slots, each its own element so they can reveal in sequence. */
  _renderStars(earned) {
    const filled = Math.max(0, Math.min(3, Number(earned) || 0));
    return Array.from({ length: 3 }, (_, i) =>
      `<span class="${i < filled ? '' : 'star-dim'}" aria-hidden="true">${i < filled ? '⭐' : '☆'}</span>`
    ).join('');
  }

  _bind(id, fn) {
    const el = document.getElementById(id);
    if (el) {
      el.onclick = () => {
        this.soundEngine.playClick();
        fn();
      };
    }
  }

  hide() {
    this.container.style.display = 'none';
  }
}
