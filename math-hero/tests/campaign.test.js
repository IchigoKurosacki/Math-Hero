import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPAIGN_STAGES, REGIONS, SECRET_ENEMIES, generate40CampaignStages, getCampaignStage,
  rollRegulars, rollStageEnemies,
} from '../src/game/bestiary.js';
import { ENEMY_ASSET_MAP, BOSS_ASSET_MAP, ASSET_MANIFEST } from '../src/assets/assetManager.js';
import { profileFor, PROFILES } from '../src/engine/enemyAnimations.js';
import { SaveSystem } from '../src/storage/saveSystem.js';

function freshSave() {
  const save = new SaveSystem();
  save.reset();
  return save;
}

test('campaign generates exactly 40 distinct playable stages', () => {
  const stages = generate40CampaignStages();
  assert.equal(stages.length, 40);
  assert.equal(new Set(stages.map(stage => stage.id)).size, 40);
  assert.equal(CAMPAIGN_STAGES.length, 40);

  for (let regionId = 1; regionId <= 8; regionId++) {
    const regionStages = stages.filter(stage => stage.regionId === regionId);
    assert.equal(regionStages.length, 5);
    assert.deepEqual(regionStages.map(stage => stage.stageNumber), [1, 2, 3, 4, 5]);
    assert.equal(regionStages.at(-1).isBossStage, true);
    assert.equal(regionStages.at(-1).stageType, 'boss');
    for (const stage of regionStages) {
      assert.equal(stage.targetEnemies, 10);
      // The roster is authoritative: the player fights exactly this list.
      assert.equal(stage.enemies.length, stage.targetEnemies,
        `${stage.id} roster must match its goal`);
      // The goal counts opponents, never questions — every screen labels it as
      // enemies, and an enemy takes one correct answer per hit point.
      assert.equal(stage.targetQuestions, undefined,
        `${stage.id} must not carry the old question-shaped goal`);
      assert.ok(stage.tables.every(table => Number.isInteger(table) && table >= 1 && table <= 10));
      assert.equal(getCampaignStage(stage.id)?.id, stage.id);
    }
  }
});

test('stage completion unlocks only the next stage and records best result', () => {
  const save = freshSave();
  assert.equal(save.getStageProgress('1_1').unlocked, true);
  assert.equal(save.getStageProgress('1_2').unlocked, false);

  const first = save.completeStage('1_1', { stars: 2, accuracy: 0.82, durationMs: 42000, maxCombo: 6 });
  assert.equal(first.firstCompletion, true);
  assert.equal(save.getStageProgress('1_1').completed, true);
  assert.equal(save.getStageProgress('1_1').stars, 2);
  assert.equal(save.getStageProgress('1_2').unlocked, true);
  assert.equal(save.getStageProgress('1_3').unlocked, false);

  const replay = save.completeStage('1_1', { stars: 3, accuracy: 0.96, durationMs: 39000, maxCombo: 9 });
  assert.equal(replay.firstCompletion, false);
  assert.equal(save.getStageProgress('1_1').stars, 3);
  assert.equal(save.getStageProgress('1_1').bestAccuracy, 0.96);
  assert.equal(save.getStageProgress('1_1').bestTime, 39000);
  assert.equal(save.data.stats.totalStagesCompleted, 1);
});

test('boss completion unlocks the next region without training side effects', () => {
  const save = freshSave();
  for (let stage = 1; stage <= 5; stage++) {
    save.completeStage(`1_${stage}`, { stars: 3, accuracy: 1, durationMs: 10000, maxCombo: 10 });
  }
  save.completeRegion(1, 3);
  assert.equal(save.data.campaign[1].completed, true);
  assert.equal(save.data.campaign[2].unlocked, true);
  assert.equal(save.getStageProgress('2_1').unlocked, true);
  assert.equal(save.getStageProgress('2_2').unlocked, false);
});

test('single-table learning tiers unlock sequentially at 80 percent accuracy', () => {
  const save = freshSave();
  assert.equal(save.getUnlockedLearningTier(7), 1);
  save.completeLearningTier(7, 1, { accuracy: 0.79, durationMs: 10000 });
  assert.equal(save.getUnlockedLearningTier(7), 1);
  assert.equal(save.getLearningTierProgress(7, 1).completed, false);

  save.completeLearningTier(7, 1, { accuracy: 0.8, durationMs: 9000 });
  assert.equal(save.getUnlockedLearningTier(7), 2);
  assert.equal(save.getLearningTierProgress(7, 1).completed, true);
});

test('the headline enemy of a stage is always its last fight', () => {
  for (const stage of generate40CampaignStages()) {
    const ids = stage.enemies.map(enemy => enemy.id);
    const last = ids.at(-1);
    if (stage.stageType === 'boss') {
      assert.match(last, /^boss_/, `${stage.id} must end on its boss`);
      assert.equal(ids.filter(id => id.startsWith('boss_')).length, 1);
    } else if (stage.stageType === 'elite') {
      assert.match(last, /^elite_/, `${stage.id} must end on its elite`);
      assert.equal(ids.filter(id => id.startsWith('elite_')).length, 1);
    } else {
      assert.ok(!ids.some(id => id.startsWith('boss_') || id.startsWith('elite_')),
        `${stage.id} should not contain a champion`);
    }
  }
});

test('final region mixes all basic multiplication tables', () => {
  const region8 = REGIONS.find(region => region.id === 8);
  assert.deepEqual(region8.tables, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('regular opponents are drawn with even odds and no back-to-back repeats', () => {
  const region = REGIONS[0];
  const counts = new Map(region.enemies.map(enemy => [enemy.id, 0]));
  let draws = 0;

  for (let attempt = 0; attempt < 3000; attempt++) {
    const picks = rollRegulars(region, 10);
    assert.equal(picks.length, 10);
    picks.forEach((enemy, index) => {
      assert.ok(counts.has(enemy.id), `${enemy.id} is not part of the region roster`);
      counts.set(enemy.id, counts.get(enemy.id) + 1);
      draws++;
      if (index > 0) {
        assert.notEqual(picks[index - 1].id, enemy.id, 'the same creature must not fight twice in a row');
      }
    });
  }

  // No creature may be systematically rare: every share sits near 1/roster.
  const expected = draws / region.enemies.length;
  for (const [id, count] of counts) {
    assert.ok(Math.abs(count - expected) < expected * 0.15, `${id} appeared ${count} times, expected ~${Math.round(expected)}`);
  }
});

test('replaying a stage rolls a different line-up', () => {
  const stage = { regionId: 1, stageNumber: 3 };
  const runs = new Set(
    Array.from({ length: 40 }, () => rollStageEnemies(stage).map(enemy => enemy.id).join('|'))
  );
  assert.ok(runs.size > 1, 'a stage that always produces the same roster gives no reason to replay it');
});

test('one pass through a region can leave creatures unmet', () => {
  const region = REGIONS[0];
  let runsWithGaps = 0;

  for (let run = 0; run < 400; run++) {
    const seen = new Set();
    for (let stageNumber = 1; stageNumber <= 5; stageNumber++) {
      rollStageEnemies({ regionId: region.id, stageNumber }).forEach(enemy => seen.add(enemy.id));
    }
    if (region.enemies.some(enemy => !seen.has(enemy.id))) runsWithGaps++;
  }

  assert.ok(runsWithGaps > 40, `only ${runsWithGaps}/400 runs left a gap; replaying a region needs a point`);
});

test('every creature in the game has artwork and an animation profile', () => {
  const creatures = [
    ...REGIONS.flatMap(region => [...region.enemies, region.elite, region.boss]),
    ...SECRET_ENEMIES,
  ];

  for (const creature of creatures) {
    const key = BOSS_ASSET_MAP[creature.id] || ENEMY_ASSET_MAP[creature.id];
    assert.ok(key, `${creature.id} has no sprite mapping`);
    assert.ok(ASSET_MANIFEST[key], `${creature.id} maps to missing asset key ${key}`);

    const profile = profileFor(creature);
    assert.ok(Object.values(PROFILES).includes(profile), `${creature.id} has no animation profile`);
    // Anything the bestiary calls a flyer must actually leave the ground.
    if (creature.flying) {
      assert.ok(profile.airborne > 20, `${creature.id} is flagged flying but walks`);
    }
  }
});

test('the redrawn champions match their artwork', () => {
  const champions = Object.fromEntries(REGIONS.map(region => [region.elite.id, region.elite]));

  // elite_3 is a honeycomb colossus now, not the old crystal bat: it must walk
  // the hero's line rather than hover, and it must not carry a flying flag.
  assert.ok(!champions.elite_3.flying, 'elite_3 is a ground creature');
  assert.equal(profileFor(champions.elite_3).airborne || 0, 0);

  // Their names were rewritten with the new sprites; the old ones are wrong.
  const names = Object.values(champions).map(elite => elite.name);
  for (const stale of ['Гоблін-Генерал', 'Великий Кристалічний Кажан', 'Бібліотечний Сторож']) {
    assert.ok(!names.includes(stale), `${stale} no longer matches its sprite`);
  }
});

test('the bestiary log records encounters and separates seen from defeated', () => {
  const save = freshSave();
  assert.equal(save.hasMetEnemy('slime_green'), false);

  save.recordEncounter('slime_green');
  assert.equal(save.hasMetEnemy('slime_green'), true);
  assert.deepEqual(save.getBestiaryEntry('slime_green'), { seen: 1, defeated: 0 });

  save.recordEncounter('slime_green', { defeated: true });
  assert.deepEqual(save.getBestiaryEntry('slime_green'), { seen: 1, defeated: 1 });

  // Unknown ids stay shaped rather than undefined, so the UI never guards.
  assert.deepEqual(save.getBestiaryEntry('nobody'), { seen: 0, defeated: 0 });
});

test('an infinite record is reported to its own result screen exactly once', () => {
  const save = freshSave();

  // The write must answer "was this a record?" itself: reading the best back
  // afterwards always sees the value just stored, so the banner never fired.
  assert.equal(save.updateInfiniteRecord(12, 3), true);
  assert.equal(save.data.stats.infiniteBestKills, 12);
  assert.equal(save.updateInfiniteRecord(9, 2), false, 'a weaker run is not a record');

  // And it must not unlock achievements on the quiet: the caller's own pass is
  // what turns them into toasts the player actually sees.
  assert.deepEqual(save.data.achievements, {});
  assert.ok(save.checkAchievements().includes('infinite_10'));
});

test('a defeat still counts as a session played', () => {
  const save = freshSave();

  save.recordSession({ mode: 'campaign', accuracy: 1 });
  save.recordSession({ mode: 'campaign', completed: false, accuracy: 0.4 });

  // "Зіграй 10 сесій" rewards turning up, so losing a stage counts too.
  assert.equal(save.data.stats.totalSessionsPlayed, 2);
  assert.equal(save.data.stats.totalSessionsCompleted, undefined,
    'the old name described the counter wrongly and must be gone');
  assert.equal(save.data.sessionHistory.length, 2);

  for (let i = 0; i < 8; i++) save.recordSession({ mode: 'mixed', completed: false, accuracy: 0.3 });
  assert.ok(save.checkAchievements().includes('sessions_10'));
});

test('an older save carries its session tally across the rename', () => {
  const save = freshSave();
  const legacy = JSON.stringify({
    saveVersion: 5,
    hero: { archetype: 'knight' },
    stats: { level: 3, totalSessionsCompleted: 17 },
  });

  assert.equal(save.importJSON(legacy).success, true);
  assert.equal(save.data.stats.totalSessionsPlayed, 17, 'the tally must survive');
  assert.equal(save.data.stats.totalSessionsCompleted, undefined,
    'the deep merge must not smuggle the retired key back in');
  assert.equal(save.data.saveVersion, 6);
});

test('imported saves cannot smuggle markup into hero asset URLs', () => {
  const save = freshSave();
  const hostile = JSON.stringify({
    saveVersion: 5,
    hero: { archetype: 'knight" onerror="alert(1)', skinTier: '9' },
    stats: { level: 1 },
  });

  assert.equal(save.importJSON(hostile).success, true);
  assert.equal(save.data.hero.archetype, 'knight');
  assert.equal(save.data.hero.skinTier, 5, 'skin tier is clamped to a real one');
});

test('batched writes hit storage once and survive a throw', () => {
  const save = freshSave();
  let writes = 0;
  const real = save.save.bind(save);
  save.save = function () { if (this._deferDepth > 0) return real(); writes++; return real(); };

  const returned = save.batch(() => {
    save.addCoins(10);
    save.addExp(20);
    save.markEnemyDefeated(false);
    save.recordEncounter('slime_green', { defeated: true });
    return 'result';
  });

  assert.equal(returned, 'result', 'batch passes the work result through');
  assert.equal(writes, 1, 'four mutations must coalesce into a single write');
  assert.equal(save.data.stats.coins, 60);
  assert.equal(save.data.stats.totalEnemiesDefeated, 1);

  // A throw inside the block must still flush and must not leave writes wedged.
  writes = 0;
  assert.throws(() => save.batch(() => { save.addCoins(5); throw new Error('boom'); }), /boom/);
  assert.equal(writes, 1, 'the flush runs from finally');
  assert.equal(save._deferDepth, 0, 'depth unwinds so later saves are not swallowed');

  writes = 0;
  save.addCoins(1);
  assert.equal(writes, 1, 'normal saves still write immediately');
});
