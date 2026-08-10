/**
 * Adaptive Math Engine with Weighted Scheduler & Spaced Repetition
 * Strict Multiplication Only — no other arithmetic operations.
 * Uses canonical fact keys, proper requeue, and NEEDS_REVISION transitions.
 */
import { t } from '../i18n/index.js';

import { canonicalFactKey } from '../storage/saveSystem.js';
import { shuffled } from '../utils/random.js';

/** A fact may not come back until this many other questions have passed. */
export const REPEAT_COOLDOWN = 5;

export class MathEngine {
  constructor(saveSystem) {
    this.saveSystem = saveSystem;
    this.requeueQueue = []; // Re-enqueue failed problems after delay
    this.questionCount = 0;
    this.maxRequeueSize = 12;
    this.recentFactKeys = [];
    /** Canonical key → wrong answers given this session, used for weighting. */
    this.missCounts = new Map();
  }

  /**
   * How strongly a fact should be favoured because the player has missed it.
   * Session misses count for much more than historical status: a fact just
   * fumbled is the one most worth asking again.
   */
  missBonus(a, b) {
    const misses = this.missCounts.get(canonicalFactKey(a, b)) || 0;
    return Math.min(misses, 4) * 45;
  }

  /** Selection weight for one fact. Shared by every mode. */
  factWeight(a, b) {
    const stat = this.saveSystem.getFactStat(a, b);
    let weight = 10;

    if (stat.status === 'NEEDS_REVISION') weight += 40;
    else if (stat.status === 'UNSTABLE') weight += 35;
    else if (stat.status === 'NEW') weight += 20;
    else if (stat.status === 'FAMILIAR') weight += 15;
    else if (stat.status === 'MASTERED') weight += 3;

    if (stat.nextReviewAt > 0 && Date.now() > stat.nextReviewAt) weight += 25;

    if (stat.avgTimeMs > 5000) weight += 15;
    else if (stat.avgTimeMs > 3000) weight += 8;

    if (stat.shown > 3) {
      const accuracy = stat.correct / stat.shown;
      if (accuracy < 0.5) weight += 20;
      else if (accuracy < 0.7) weight += 10;
    }

    if (stat.status === 'MASTERED' && stat.shown > 20) weight = Math.max(1, weight - 5);

    return weight + this.missBonus(a, b);
  }

  /**
   * Picks one fact from `pool` by weight, skipping anything asked within the
   * last few questions. The cooldown shrinks automatically when the pool is
   * too small to honour it, so selection can never run dry.
   */
  pickWeighted(pool) {
    if (pool.length === 0) return null;
    const cooldown = Math.min(REPEAT_COOLDOWN, Math.max(0, pool.length - 1));
    const blocked = new Set(this.recentFactKeys.slice(0, cooldown));
    const eligible = pool.filter(fact => !blocked.has(canonicalFactKey(fact.a, fact.b)));
    const candidates = eligible.length > 0 ? eligible : pool;

    let total = 0;
    const weights = candidates.map(fact => {
      const weight = Math.max(1, this.factWeight(fact.a, fact.b));
      total += weight;
      return weight;
    });

    let roll = Math.random() * total;
    for (let index = 0; index < candidates.length; index++) {
      roll -= weights[index];
      if (roll <= 0) return candidates[index];
    }
    return candidates[candidates.length - 1];
  }

  /** Every fact the current configuration is allowed to present. */
  buildFactPool(availableTables, maxMultiplier, config) {
    const pool = [];
    for (const table of availableTables) {
      for (let multiplier = 1; multiplier <= maxMultiplier; multiplier++) {
        if (!this.allowFact(table, multiplier, config, availableTables)) continue;
        pool.push({ a: table, b: multiplier });
      }
    }
    return pool;
  }

  isSimpleEnemy(config) {
    if (!config) return true;
    // Never allow trivial facts for bosses
    if (config.isBoss) return false;
    // Never allow trivial facts for elites
    const enemy = config.currentEnemy;
    if (enemy?.id?.startsWith('elite') || enemy?.id?.includes('elite') || enemy?.isElite) return false;
    // Only allow trivial facts on the first stage (stageNumber === 1) of each region
    const stageNumber = config.stageNumber || 1;
    if (stageNumber > 1) return false;
    return true;
  }

  isTrivialFactor(a, b) {
    return a === 1 || b === 1 || a === 10 || b === 10;
  }

  /** True when the selected tables can produce anything other than ×1 / ×10. */
  hasNonTrivialOption(availableTables) {
    return availableTables.some(table => table !== 1 && table !== 10);
  }

  allowFact(a, b, config, availableTables) {
    if (!this.isTrivialFactor(a, b)) return true;
    if (this.isSimpleEnemy(config)) return true;
    // Bosses and elites never get ×1 or ×10 — the only exception is a table
    // selection that offers nothing else at all (single-table 1 or 10 drills),
    // where blocking them would leave no question to ask.
    return !this.hasNonTrivialOption(availableTables);
  }

  /**
   * True when the current configuration could itself have produced this fact.
   *
   * Used to vet mistakes carried in from an earlier session, which may name a
   * table this run does not drill, or a multiplier outside the range the
   * ×11/×12 setting currently allows.
   */
  isPresentable(a, b, config, availableTables, maxMultiplier) {
    const fits = (table, multiplier) =>
      availableTables.includes(table) && multiplier >= 1 && multiplier <= maxMultiplier;
    if (!fits(a, b) && !fits(b, a)) return false;
    return this.allowFact(a, b, config, availableTables);
  }

  /**
   * Generates a multiplication problem using weighted SRS priority
   */
  generateProblem(config = {}) {
    this.questionCount++;
    const settings = this.saveSystem.data.settings;

    const availableTables = config.tables && config.tables.length > 0
      ? config.tables : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const maxMultiplier = settings.include1112 ? 12 : 10;

    // Drop carried-over mistakes this stage can never present — a ×1 fact
    // banked on an intro stage would otherwise sit in the queue forever and
    // eventually fill it, locking out new mistakes.
    this.requeueQueue = this.requeueQueue.filter(item =>
      this.isPresentable(item.a, item.b, config, availableTables, maxMultiplier));

    // Every due retry, oldest first. The cooldown is honoured here too, so a
    // retry never lands early — and a blocked one steps aside for the next due
    // item instead of forfeiting the whole retry slot for this question.
    const readyItems = this.requeueQueue
      .filter(item => item.dueTurn <= this.questionCount)
      .sort((a, b) => a.dueTurn - b.dueTurn);

    const blocked = this.recentFactKeys.slice(0, REPEAT_COOLDOWN);
    const retry = readyItems.find(item => !blocked.includes(canonicalFactKey(item.a, item.b)));
    if (retry) {
      this.requeueQueue = this.requeueQueue.filter(queued => queued !== retry);
      return this.commitProblem(retry.a, retry.b, config.tier || 3);
    }

    const pool = this.buildFactPool(availableTables, maxMultiplier, config);

    // The weak-spot modes narrow the pool to shaky facts; everything else
    // draws from the full pool. Both then use the same weighted picker, so the
    // repeat cooldown and the miss bonus apply everywhere.
    let selectionPool = pool;
    if (config.mode === 'weak' || config.mode === 'secret' || config.mode === 'mastery') {
      const weakKeys = new Set(this.getWeakFacts(availableTables, maxMultiplier)
        .map(fact => canonicalFactKey(fact.a, fact.b)));
      const weakPool = pool.filter(fact => weakKeys.has(canonicalFactKey(fact.a, fact.b)));
      if (weakPool.length > 0) selectionPool = weakPool;
    }

    const picked = this.pickWeighted(selectionPool) || { a: availableTables[0], b: 2 };
    let a = picked.a;
    let b = picked.b;

    // Both orders of a fact are drilled from tier 2 on. This applies to every
    // mode: the weak-spot modes exist to repair shaky facts, and a fact is not
    // repaired until it is recognised as 7 × 3 as readily as 3 × 7.
    if ((config.tier || 3) >= 2 && Math.random() > 0.5) {
      const temp = a;
      a = b;
      b = temp;
    }

    return this.commitProblem(a, b, config.tier || 3);
  }

  /** Records a fact as just-asked and returns the renderable problem. */
  commitProblem(a, b, tier) {
    const key = canonicalFactKey(a, b);
    this.recentFactKeys = [key, ...this.recentFactKeys.filter(item => item !== key)]
      .slice(0, REPEAT_COOLDOWN + 1);
    return this.buildProblemObject(a, b, tier);
  }

  buildProblemObject(a, b, tier) {
    const correctAnswer = a * b;
    let options = [];

    // Fisher–Yates, never `sort(() => Math.random() - 0.5)`: a biased shuffle
    // parks the correct answer in the outer slots often enough that guessing by
    // position beats knowing the table, which would hollow out the whole game.
    // `>= 4` rather than an explicit list of tiers, so this can never disagree
    // with the identical test the combat UI makes when it picks the numpad.
    if (tier >= 4) {
      options = []; // Manual input
    } else if (tier === 1) {
      const distractor = this.generateDistractor(a, b, correctAnswer, [correctAnswer], true);
      options = shuffled([correctAnswer, distractor]);
    } else if (tier === 2) {
      const d1 = this.generateDistractor(a, b, correctAnswer, [correctAnswer], false);
      const d2 = this.generateDistractor(a, b, correctAnswer, [correctAnswer, d1], false);
      options = shuffled([correctAnswer, d1, d2]);
    } else {
      const d1 = this.generateDistractor(a, b, correctAnswer, [correctAnswer], false);
      const d2 = this.generateDistractor(a, b, correctAnswer, [correctAnswer, d1], false);
      const d3 = this.generateDistractor(a, b, correctAnswer, [correctAnswer, d1, d2], false);
      options = shuffled([correctAnswer, d1, d2, d3]);
    }

    return {
      a,
      b,
      symbol: '×',
      promptText: `${a} × ${b} = ?`,
      correctAnswer,
      options,
      tier,
      startTime: Date.now(),
    };
  }

  generateDistractor(a, b, correct, existing, far = false) {
    const candidates = [];
    if (far) {
      candidates.push(correct + 8, correct + 10, correct - 6 > 0 ? correct - 6 : correct + 12, (a + 2) * b);
    } else {
      if (b > 1) candidates.push(a * (b - 1));
      candidates.push(a * (b + 1));
      candidates.push(correct + 1);
      if (correct > 1) candidates.push(correct - 1);
      candidates.push(correct + a);
      if (correct > a) candidates.push(correct - a);

      if (correct >= 10) {
        const str = String(correct);
        const swapped = parseInt(str.split('').reverse().join(''), 10);
        if (swapped !== correct && swapped > 0) candidates.push(swapped);
      }

      if (a > 1) candidates.push((a - 1) * b);
      candidates.push((a + 1) * b);
    }

    const valid = candidates.filter(val => val > 0 && val !== correct && !existing.includes(val));
    if (valid.length > 0) {
      return valid[Math.floor(Math.random() * valid.length)];
    }

    let fallback = correct + (Math.random() > 0.5 ? 2 : -2);
    while (fallback <= 0 || fallback === correct || existing.includes(fallback)) {
      fallback += 3;
    }
    return fallback;
  }

  onAnswer(problem, userAnswer, timeMs) {
    const isCorrect = parseInt(userAnswer, 10) === problem.correctAnswer;
    const stat = this.saveSystem.recordAnswer(problem.a, problem.b, isCorrect, timeMs);

    if (!isCorrect) {
      const key = canonicalFactKey(problem.a, problem.b);
      // Missed facts become much likelier to be drawn again for the rest of
      // the session, on top of the delayed retry below.
      this.missCounts.set(key, (this.missCounts.get(key) || 0) + 1);

      const alreadyQueued = this.requeueQueue.some(item => canonicalFactKey(item.a, item.b) === key);
      if (!alreadyQueued && this.requeueQueue.length < this.maxRequeueSize) {
        // Never sooner than the repeat cooldown, so a retry cannot crowd the
        // question the player just saw.
        const delay = REPEAT_COOLDOWN + Math.floor(Math.random() * 4);
        this.requeueQueue.push({
          a: problem.a,
          b: problem.b,
          dueTurn: this.questionCount + delay,
        });
      }
    }

    return {
      isCorrect,
      correctAnswer: problem.correctAnswer,
      explanationText: t('math.explanation', {
        a: problem.a, b: problem.b, answer: problem.correctAnswer,
      }),
      stat,
    };
  }

  getWeakFacts(tables, maxMult) {
    const list = [];
    tables.forEach(a => {
      for (let b = 1; b <= maxMult; b++) {
        const stat = this.saveSystem.getFactStat(a, b);
        if (stat.status === 'UNSTABLE' ||
            stat.status === 'NEEDS_REVISION' ||
            (stat.shown > 0 && stat.correct / stat.shown < 0.7) ||
            (stat.nextReviewAt > 0 && Date.now() > stat.nextReviewAt)) {
          list.push({ a, b, stat });
        }
      }
    });
    return list;
  }

  /**
   * Clear requeue when switching modes/tables
   */
  clearRequeue(allowedTables = null) {
    if (allowedTables) {
      this.requeueQueue = this.requeueQueue.filter(item =>
        allowedTables.includes(item.a) || allowedTables.includes(item.b)
      );
    } else {
      this.requeueQueue = [];
    }
  }

  /**
   * Reset engine state for a new session
   */
  resetForSession(config = {}) {
    this.questionCount = 0;
    this.recentFactKeys = [];
    this.missCounts.clear();
    this.clearRequeue(config.tables || null);

    // Due turns are counted against questionCount, which just restarted at 0.
    // Without rebasing, mistakes carried over from the previous session would
    // stay "not due yet" for the whole of a short stage.
    this.requeueQueue.forEach((item, index) => { item.dueTurn = 2 + index; });
  }
}
