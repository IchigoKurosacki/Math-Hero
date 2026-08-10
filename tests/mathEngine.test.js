import test from 'node:test';
import assert from 'node:assert/strict';
import { MathEngine, REPEAT_COOLDOWN } from '../src/math/mathEngine.js';
import { SaveSystem, canonicalFactKey } from '../src/storage/saveSystem.js';

function freshEngine() {
  const save = new SaveSystem();
  save.reset();
  return { save, engine: new MathEngine(save) };
}

test('generates only multiplication prompts with correct products', () => {
  const { engine } = freshEngine();
  for (let index = 0; index < 100; index++) {
    const problem = engine.generateProblem({ tables: [1,2,3,4,5,6,7,8,9,10], tier: 3 });
    assert.equal(problem.symbol, '×');
    assert.equal(problem.correctAnswer, problem.a * problem.b);
    assert.equal(problem.promptText, `${problem.a} × ${problem.b} = ?`);
    assert.ok(problem.a >= 1 && problem.a <= 10);
    assert.ok(problem.b >= 1 && problem.b <= 10);
  }
});

test('every mode drills both orders of a fact from tier 2 on', () => {
  for (const mode of ['campaign', 'weak', 'mastery', 'secret']) {
    const { engine } = freshEngine();
    engine.resetForSession({ tables: [3] });
    const orders = new Set();
    for (let index = 0; index < 300; index++) {
      const problem = engine.generateProblem({ tables: [3], mode, tier: 3, stageNumber: 3 });
      orders.add(problem.a === 3 ? 'table-first' : 'multiplier-first');
      engine.onAnswer(problem, problem.correctAnswer, 900);
    }
    assert.equal(orders.size, 2, `${mode} only ever showed one operand order`);
  }
});

test('carried-over mistakes are rebased onto the new session counter', () => {
  const { engine } = freshEngine();
  engine.resetForSession({ tables: [3] });
  for (let index = 0; index < 8; index++) {
    const problem = engine.generateProblem({ tables: [3], mode: 'campaign', tier: 3, stageNumber: 3 });
    engine.onAnswer(problem, problem.correctAnswer + 1, 900);
  }
  assert.ok(engine.requeueQueue.length > 0);
  assert.ok(engine.requeueQueue.every(item => item.dueTurn > 5), 'setup expects late due turns');

  engine.resetForSession({ tables: [3] });
  assert.equal(engine.questionCount, 0);
  assert.ok(engine.requeueQueue.length > 0, 'same-table mistakes should survive');
  assert.ok(engine.requeueQueue.every(item => item.dueTurn <= 2 + engine.requeueQueue.length),
    'due turns must be rebased so mistakes resurface within a short stage');
});

test('facts the current stage cannot show are dropped from the requeue', () => {
  const { engine } = freshEngine();
  engine.resetForSession({ tables: [1, 2] });
  const introStage = { tables: [1, 2], mode: 'campaign', tier: 1, currentEnemy: { id: 'slime_green' }, stageNumber: 1 };
  for (let index = 0; index < 30; index++) {
    const problem = engine.generateProblem(introStage);
    engine.onAnswer(problem, problem.correctAnswer + 1, 900);
  }
  const trivial = item => item.a === 1 || item.b === 1 || item.a === 10 || item.b === 10;
  assert.ok(engine.requeueQueue.some(trivial), 'setup expects trivial facts banked on stage 1');

  // Later stages block ×1 and ×10, so those entries must not linger.
  engine.generateProblem({ ...introStage, stageNumber: 3, tier: 3 });
  assert.equal(engine.requeueQueue.filter(trivial).length, 0);
});

test('a fact never returns within the repeat cooldown', () => {
  const { engine } = freshEngine();
  engine.resetForSession({ tables: [3, 4, 6] });
  const seen = [];
  for (let index = 0; index < 400; index++) {
    const problem = engine.generateProblem({ tables: [3, 4, 6], mode: 'campaign', tier: 3, stageNumber: 3 });
    seen.push(canonicalFactKey(problem.a, problem.b));
    engine.onAnswer(problem, problem.correctAnswer, 900);
  }
  for (let index = 1; index < seen.length; index++) {
    const window = seen.slice(Math.max(0, index - REPEAT_COOLDOWN), index);
    assert.ok(!window.includes(seen[index]),
      `${seen[index]} repeated after only ${window.length} other questions at position ${index}`);
  }
});

test('missed facts become far more likely to be asked again', () => {
  const { engine } = freshEngine();
  const tables = [7];
  engine.resetForSession({ tables });
  const config = { tables, mode: 'campaign', tier: 3, stageNumber: 3 };

  // Deliberately fail 7×4 several times, answering everything else correctly.
  const target = canonicalFactKey(7, 4);
  for (let index = 0; index < 60; index++) {
    const problem = engine.generateProblem(config);
    const isTarget = canonicalFactKey(problem.a, problem.b) === target;
    engine.onAnswer(problem, isTarget ? problem.correctAnswer + 1 : problem.correctAnswer, 900);
  }
  assert.ok(engine.missCounts.get(target) > 0, 'setup expects the fact to have been missed');

  const weightMissed = engine.factWeight(7, 4);
  const weightClean = engine.factWeight(7, 9);
  assert.ok(weightMissed > weightClean * 1.5,
    `missed fact should outweigh a clean one (${weightMissed} vs ${weightClean})`);
});

test('bosses and elites are never asked ×1 or ×10', () => {
  const trivial = problem => problem.a === 1 || problem.b === 1 || problem.a === 10 || problem.b === 10;
  const cases = [
    ['campaign boss', { tables: [1, 2], mode: 'campaign', tier: 4, stageNumber: 5, isBoss: true, currentEnemy: { id: 'boss_1' } }],
    ['campaign elite', { tables: [1, 2], mode: 'campaign', tier: 4, stageNumber: 4, currentEnemy: { id: 'elite_1' } }],
    ['secret boss', { tables: [1,2,3,4,5,6,7,8,9,10], mode: 'secret', tier: 4, isBoss: true, currentEnemy: { id: 'boss_secret' } }],
    ['secret elite', { tables: [1,2,3,4,5,6,7,8,9,10], mode: 'secret', tier: 4, currentEnemy: { id: 'elite_4', isElite: true } }],
    // The escape hatch must not reopen the hole when a table is picked directly.
    ['single table 1 boss', { tables: [1], mode: 'single', tier: 3, isBoss: true, currentEnemy: { id: 'boss_1' } }],
  ];

  for (const [label, config] of cases) {
    const { engine } = freshEngine();
    engine.resetForSession({ tables: config.tables });
    let leaks = 0;
    for (let index = 0; index < 300; index++) {
      const problem = engine.generateProblem(config);
      if (trivial(problem)) leaks++;
      engine.onAnswer(problem, problem.correctAnswer, 900);
    }
    // Table 1 on its own has nothing but trivial facts, so it is the one
    // configuration where they must still be allowed.
    const expected = config.tables.every(table => table === 1 || table === 10) ? 300 : 0;
    assert.equal(leaks, expected, `${label} produced ${leaks} trivial questions`);
  }
});

test('tiers provide 2, 3, 4 or manual answer layouts', () => {
  const { engine } = freshEngine();
  for (const [tier, count] of [[1, 2], [2, 3], [3, 4], [4, 0]]) {
    const problem = engine.generateProblem({ tables: [7, 8], tier });
    assert.equal(problem.options.length, count);
    if (count) {
      assert.ok(problem.options.includes(problem.correctAnswer));
      assert.equal(new Set(problem.options).size, count);
      assert.ok(problem.options.every(option => Number.isInteger(option) && option > 0));
    }
  }
});

test('wrong answers show the product and enqueue one delayed retry', () => {
  const { engine } = freshEngine();
  const problem = engine.generateProblem({ tables: [6], tier: 3 });
  const wrong = problem.correctAnswer + 5;
  const first = engine.onAnswer(problem, wrong, 2000);
  const second = engine.onAnswer(problem, wrong, 2100);
  assert.equal(first.isCorrect, false);
  assert.match(first.explanationText, new RegExp(`${problem.a} × ${problem.b} = ${problem.correctAnswer}`));
  assert.equal(second.isCorrect, false);
  const key = canonicalFactKey(problem.a, problem.b);
  assert.equal(engine.requeueQueue.filter(item => canonicalFactKey(item.a, item.b) === key).length, 1);
  assert.ok(engine.requeueQueue[0].dueTurn >= 2);
});

test('canonical fact statistics merge swapped multipliers', () => {
  const { save } = freshEngine();
  save.recordAnswer(3, 7, true, 1000);
  save.recordAnswer(7, 3, true, 900);
  assert.equal(save.getFactStat(3, 7), save.getFactStat(7, 3));
  assert.equal(save.getFactStat(3, 7).correct, 2);
});

test('mastered facts transition to needs revision after an error', () => {
  const { save } = freshEngine();
  for (let index = 0; index < 5; index++) save.recordAnswer(7, 8, true, 1200);
  assert.equal(save.getFactStat(7, 8).status, 'MASTERED');
  save.recordAnswer(8, 7, false, 2500);
  assert.equal(save.getFactStat(7, 8).status, 'NEEDS_REVISION');
});

test('new sessions filter retries to allowed tables', () => {
  const { engine } = freshEngine();
  engine.requeueQueue = [
    { a: 2, b: 4, dueTurn: 1 },
    { a: 7, b: 8, dueTurn: 1 },
  ];
  engine.resetForSession({ tables: [7] });
  assert.equal(engine.requeueQueue.length, 1);
  assert.ok(engine.requeueQueue[0].a === 7 || engine.requeueQueue[0].b === 7);
});

test('the correct answer is equally likely to land in any option slot', () => {
  // A biased shuffle parks the answer in the outer slots, and guessing by
  // position then outscores knowing the table. Every layout must stay flat.
  const { engine } = freshEngine();
  const runs = 24000;

  for (const [tier, slots] of [[1, 2], [2, 3], [3, 4]]) {
    const hits = new Array(slots).fill(0);
    for (let index = 0; index < runs; index++) {
      const problem = engine.buildProblemObject(3, 7, tier);
      assert.equal(problem.options.length, slots);
      hits[problem.options.indexOf(problem.correctAnswer)]++;
    }

    const expected = runs / slots;
    for (let slot = 0; slot < slots; slot++) {
      const drift = Math.abs(hits[slot] - expected) / expected;
      assert.ok(drift < 0.06,
        `tier ${tier}: slot ${slot + 1} held the answer ${(hits[slot] / runs * 100).toFixed(1)}% of the time, expected ${(100 / slots).toFixed(1)}%`);
    }
  }
});

test('retries carried in from another session respect the multiplier range', () => {
  const { engine } = freshEngine();
  // Banked while ×11/×12 was on; the setting is off for this run.
  engine.requeueQueue = [{ a: 3, b: 12, dueTurn: 1 }];
  engine.questionCount = 5;

  const problem = engine.generateProblem({ tables: [3], tier: 3, stageNumber: 3 });
  assert.equal(engine.requeueQueue.length, 0, 'the out-of-range retry must be dropped');
  assert.ok(problem.b <= 10 && problem.a <= 10);
});

test('a retry blocked by the cooldown yields to the next due one', () => {
  const { engine } = freshEngine();
  engine.recentFactKeys = [canonicalFactKey(3, 4)];
  engine.questionCount = 9;
  engine.requeueQueue = [
    { a: 3, b: 4, dueTurn: 1 },   // due first, but just asked
    { a: 3, b: 6, dueTurn: 2 },
  ];

  const problem = engine.generateProblem({ tables: [3], tier: 3, stageNumber: 3 });
  assert.equal(canonicalFactKey(problem.a, problem.b), canonicalFactKey(3, 6));
  assert.deepEqual(engine.requeueQueue, [{ a: 3, b: 4, dueTurn: 1 }]);
});
