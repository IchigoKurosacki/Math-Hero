/**
 * Centralized Reward System for Math Hero RPG
 * Computes, applies, and reports rewards exactly once per event.
 * Prevents duplicate rewards and ensures UI shows accurate numbers.
 */

export class RewardSystem {
  constructor(saveSystem) {
    this.saveSystem = saveSystem;
    this._appliedRewards = new Set(); // Track one-time rewards by key
  }

  /**
   * Calculate reward for defeating a regular enemy
   */
  enemyReward(enemy, combo = 0) {
    const baseCoins = 5 + (enemy.hp || 1) * 3;
    const baseXP = 10 + (enemy.hp || 1) * 5;
    const comboBonus = Math.floor(combo * 0.5);
    return {
      coins: baseCoins + comboBonus,
      xp: baseXP + comboBonus * 2,
      source: 'enemy',
    };
  }

  /**
   * Calculate reward for defeating an elite enemy
   */
  eliteReward(enemy, combo = 0) {
    const baseCoins = 15 + (enemy.hp || 3) * 4;
    const baseXP = 30 + (enemy.hp || 3) * 8;
    const comboBonus = Math.floor(combo * 1);
    return {
      coins: baseCoins + comboBonus,
      xp: baseXP + comboBonus * 2,
      source: 'elite',
    };
  }

  /**
   * Calculate reward for defeating a boss
   */
  bossReward(boss) {
    const baseCoins = 50 + (boss.hpMax || boss.maxHp || 6) * 5;
    const baseXP = 100 + (boss.hpMax || boss.maxHp || 6) * 10;
    return {
      coins: baseCoins,
      xp: baseXP,
      source: 'boss',
    };
  }

  /**
   * Calculate stage completion bonus
   */
  stageCompletionReward(stageId, stars = 1, firstCompletion = true) {
    const multiplier = firstCompletion ? 1 : 0.25;
    const baseCoins = 30;
    const baseXP = 60;
    return {
      coins: Math.max(5, Math.round((baseCoins + stars * 10) * multiplier)),
      xp: Math.max(10, Math.round((baseXP + stars * 20) * multiplier)),
      source: 'stage',
      stageId,
      stars,
      firstCompletion,
    };
  }

  /**
   * Apply a reward to save data. Returns the applied reward object.
   * @param {object} reward - { coins, xp, source, ... }
   * @param {string} [uniqueKey] - If provided, prevents duplicate application
   * @returns {{ coins, xp, leveledUp, newLevel, alreadyApplied }}
   */
  apply(reward, uniqueKey = null) {
    if (uniqueKey && this._appliedRewards.has(uniqueKey)) {
      return { coins: 0, xp: 0, leveledUp: false, newLevel: this.saveSystem.data.stats.level, alreadyApplied: true };
    }

    if (uniqueKey) {
      this._appliedRewards.add(uniqueKey);
    }

    this.saveSystem.addCoins(reward.coins);
    const expResult = this.saveSystem.addExp(reward.xp);

    return {
      coins: reward.coins,
      xp: reward.xp,
      leveledUp: expResult.leveledUp,
      newLevel: expResult.newLevel,
      alreadyApplied: false,
    };
  }

  /**
   * Calculate total session reward (accumulated kills + stage completion).
   * Used for the results screen. Does NOT apply — just computes.
   */
  computeSessionTotal(killRewards = [], stageReward = null) {
    let totalCoins = 0;
    let totalXP = 0;
    for (const r of killRewards) {
      totalCoins += r.coins;
      totalXP += r.xp;
    }
    if (stageReward) {
      totalCoins += stageReward.coins;
      totalXP += stageReward.xp;
    }
    return { totalCoins, totalXP, killCount: killRewards.length };
  }

  /**
   * Reset applied rewards tracker (e.g., on new session or game restart)
   */
  resetApplied() {
    this._appliedRewards.clear();
  }
}
