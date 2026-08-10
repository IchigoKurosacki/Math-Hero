import test from 'node:test';
import assert from 'node:assert/strict';
import { BossPhaseController } from '../src/engine/bossPhaseController.js';
import { SessionScheduler } from '../src/engine/sessionScheduler.js';
import { Hero, ULTIMATE_DAMAGE, ULTIMATE_MAX_CHARGES } from '../src/game/hero.js';
import { SECRET_BOSS } from '../src/game/bestiary.js';
import { RewardSystem } from '../src/game/rewardSystem.js';
import { SaveSystem } from '../src/storage/saveSystem.js';

function freshCombat() {
  const save = new SaveSystem();
  save.reset();
  return {
    save,
    hero: new Hero(save),
    boss: new BossPhaseController(),
    rewards: new RewardSystem(save),
  };
}

test('boss runtime starts with finite current and maximum HP', () => {
  const { boss } = freshCombat();
  const runtime = boss.initBoss({ id: 'boss_1', name: 'Великий Слайм-Бублик', hpMax: 9, phases: 3 });
  assert.equal(runtime.currentHp, 9);
  assert.equal(runtime.maxHp, 9);
  assert.ok(Number.isFinite(runtime.currentHp));
  assert.equal(boss.phase, 1);
});

test('boss phases transition once and damage never creates NaN or negative HP', () => {
  const { boss } = freshCombat();
  boss.initBoss({ id: 'boss_1', name: 'Великий Слайм-Бублик', hpMax: 9, phases: 3 });

  let result = boss.applyDamage(3);
  assert.equal(result.currentHp, 6);
  assert.equal(result.phase, 2);
  assert.equal(result.phaseChanged, true);
  boss.update(2);

  result = boss.applyDamage(3);
  assert.equal(result.currentHp, 3);
  assert.equal(result.phase, 3);
  boss.update(2);

  result = boss.applyDamage(99);
  assert.equal(result.currentHp, 0);
  assert.equal(result.isDefeated, true);
  assert.ok(Number.isFinite(result.currentHp));
});

test('damage during a phase transition is buffered and later applied', () => {
  const { boss } = freshCombat();
  boss.initBoss({ id: 'boss_2', name: 'Пан Грибослав', hpMax: 9, phases: 3 });
  boss.applyDamage(3);
  const buffered = boss.applyDamage(2);
  assert.equal(buffered.buffered, true);
  assert.equal(buffered.currentHp, 6);
  boss.update(2);
  assert.equal(boss.isInvulnerable, false);
  assert.equal(boss.currentBoss.currentHp, 4);
  assert.ok(boss.consumeEvents().some(event => event.type === 'buffered-damage'));
});

test('hero combo activates critical, shield and empowerment milestones', () => {
  const { hero } = freshCombat();
  const milestones = [];
  for (let index = 1; index <= 10; index++) milestones.push(hero.onCorrectAnswer());
  assert.equal(milestones[2].isCrit, true);
  assert.equal(milestones[4].combo, 5);
  assert.equal(hero.shieldActive, true);
  assert.equal(milestones[7].isEmpowered, true);
  assert.equal(hero.maxCombo, 10);
});

test('a ten-answer streak banks an ultimate charge instead of firing it', () => {
  const { hero } = freshCombat();
  for (let i = 1; i <= 9; i++) {
    assert.equal(hero.onCorrectAnswer().ultimateGained, false, `charge banked too early at ${i}`);
  }
  assert.equal(hero.ultimateCharges, 0);
  assert.equal(hero.answersToNextUltimate, 1);

  const tenth = hero.onCorrectAnswer();
  assert.equal(tenth.ultimateGained, true);
  assert.equal(tenth.ultimateCharges, 1);
  assert.equal(hero.canUseUltimate, true);

  // A second full streak banks a second charge.
  for (let i = 1; i <= 10; i++) hero.onCorrectAnswer();
  assert.equal(hero.ultimateCharges, 2);
});

test('ultimate charges are spent one at a time and cannot go negative', () => {
  const { hero } = freshCombat();
  for (let i = 1; i <= 20; i++) hero.onCorrectAnswer();
  assert.equal(hero.ultimateCharges, 2);

  assert.equal(hero.consumeUltimate(), true);
  assert.equal(hero.ultimateCharges, 1);
  assert.equal(hero.consumeUltimate(), true);
  assert.equal(hero.ultimateCharges, 0);
  assert.equal(hero.consumeUltimate(), false, 'spending an empty bank must fail');
  assert.equal(hero.ultimateCharges, 0);
  assert.equal(hero.canUseUltimate, false);
});

test('banked ultimate charges are capped and survive a level-up heal', () => {
  const { hero } = freshCombat();
  for (let i = 1; i <= 50; i++) hero.onCorrectAnswer();
  assert.equal(hero.ultimateCharges, ULTIMATE_MAX_CHARGES);

  hero.hearts = 2;
  hero.healToFull();
  assert.equal(hero.hearts, hero.maxHearts);
  assert.equal(hero.ultimateCharges, ULTIMATE_MAX_CHARGES, 'level-up heal must not clear charges');
  assert.equal(hero.combo, 50, 'level-up heal must not reset the streak');

  hero.resetHearts();
  assert.equal(hero.ultimateCharges, 0, 'a new session starts with an empty bank');
  assert.equal(hero.combo, 0);
});

test('an ultimate strike removes five boss hit points', () => {
  const { hero, boss } = freshCombat();
  boss.initBoss({ id: 'boss_1', name: 'Великий Слайм-Бублик', hpMax: 10, phases: 1 });
  for (let i = 1; i <= 10; i++) hero.onCorrectAnswer();

  assert.equal(hero.consumeUltimate(), true);
  assert.equal(boss.applyDamage(ULTIMATE_DAMAGE).currentHp, 5);
});

test('shield absorbs one mistake without losing a heart', () => {
  const { hero } = freshCombat();
  for (let index = 0; index < 5; index++) hero.onCorrectAnswer();
  const shielded = hero.takeDamage();
  assert.equal(shielded.shielded, true);
  assert.equal(hero.hearts, 5);
  assert.equal(hero.shieldActive, false);
  const hit = hero.takeDamage();
  assert.equal(hit.shielded, false);
  assert.equal(hero.hearts, 4);
});

test('the secret boss fights across four phases with a deeper health pool', () => {
  const { boss } = freshCombat();
  assert.equal(SECRET_BOSS.phases, 4);
  assert.ok(SECRET_BOSS.hpMax >= 16, 'secret boss needs a larger pool for four phases');

  const runtime = boss.initBoss(SECRET_BOSS);
  assert.equal(boss.maxPhases, 4);
  assert.equal(boss.phase, 1);

  const max = runtime.maxHp;
  const seen = [boss.phase];
  // Thresholds sit at 75%, 50% and 25% of maximum health.
  for (const target of [0.74, 0.49, 0.24]) {
    const damage = boss.currentBoss.currentHp - Math.floor(max * target);
    boss.applyDamage(damage);
    boss.update(3);
    seen.push(boss.phase);
  }
  assert.deepEqual(seen, [1, 2, 3, 4]);
  assert.equal(boss.applyDamage(max).isDefeated, true);
});

test('three-phase bosses keep their original pacing', () => {
  const { boss } = freshCombat();
  boss.initBoss({ id: 'boss_5', name: 'Дракон', hpMax: 9, phases: 3 });
  assert.equal(boss.applyDamage(3).phase, 2, 'phase 2 must still start at two thirds');
  boss.update(3);
  assert.equal(boss.applyDamage(3).phase, 3, 'phase 3 must still start at one third');
});

test('a single large hit can cross more than one phase threshold', () => {
  const { boss } = freshCombat();
  boss.initBoss({ id: 'boss_secret', name: 'Пан Помилкус', hpMax: 20, phases: 4 });
  const result = boss.applyDamage(11); // 9/20 = 45% — past both 75% and 50%
  assert.equal(result.phase, 3);
  assert.equal(result.phaseChanged, true);
  assert.equal(boss.previousPhase, 1, 'the transition must report the phase it started from');
});

test('phase transition progress runs from zero to one while invulnerable', () => {
  const { boss } = freshCombat();
  boss.initBoss({ id: 'boss_1', name: 'Бос', hpMax: 9, phases: 3 });
  assert.equal(boss.transitionProgress, 0);

  boss.applyDamage(3);
  assert.equal(boss.isInvulnerable, true);
  assert.equal(boss.transitionProgress, 0);

  boss.update(boss.transitionDuration / 2);
  const midway = boss.transitionProgress;
  assert.ok(midway > 0.4 && midway < 0.6, `expected midpoint progress, got ${midway}`);

  boss.update(boss.transitionDuration);
  assert.equal(boss.isInvulnerable, false);
  assert.equal(boss.transitionProgress, 0);
});

test('reward system applies unique rewards once and reduces replay bonus', () => {
  const { save, rewards } = freshCombat();
  const first = rewards.stageCompletionReward('1_1', 3, true);
  const replay = rewards.stageCompletionReward('1_1', 3, false);
  assert.ok(first.coins > replay.coins);
  assert.ok(first.xp > replay.xp);
  const applied = rewards.apply(first, 'unique-stage');
  const duplicate = rewards.apply(first, 'unique-stage');
  assert.equal(applied.alreadyApplied, false);
  assert.equal(duplicate.alreadyApplied, true);
  assert.equal(duplicate.coins, 0);
  assert.ok(save.data.stats.coins > 50);
});

test('session scheduler discards callbacks from an earlier session', async () => {
  const scheduler = new SessionScheduler();
  let fired = false;
  scheduler.delay(() => { fired = true; }, 20, 'stale');
  scheduler.newSession();
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(fired, false);
  assert.equal(scheduler.activeCount, 0);
});

test('session scheduler pauses and resumes remaining delays', async () => {
  const scheduler = new SessionScheduler();
  let fired = false;
  scheduler.delay(() => { fired = true; }, 60, 'pause-test');
  await new Promise(resolve => setTimeout(resolve, 10));
  scheduler.pause();
  await new Promise(resolve => setTimeout(resolve, 80));
  assert.equal(fired, false);
  scheduler.resume();
  await new Promise(resolve => setTimeout(resolve, 70));
  assert.equal(fired, true);
});
