/**
 * Session Scheduler for Math Hero RPG
 * Centralizes all setTimeout/setInterval calls with session-scoped lifecycle.
 * Prevents stale callbacks from corrupting new sessions.
 */

let _sessionId = 0;

export class SessionScheduler {
  constructor() {
    this._timers = new Map();
    this._nextId = 0;
    this._sessionId = ++_sessionId;
    this._paused = false;
    this._pausedTimers = [];
  }

  /**
   * Get current session ID
   */
  get sessionId() {
    return this._sessionId;
  }

  /**
   * Start a new session — cancels all pending timers from previous session
   */
  newSession() {
    this.cancelAll();
    this._sessionId = ++_sessionId;
    this._paused = false;
    this._pausedTimers = [];
    return this._sessionId;
  }

  /**
   * Schedule a delayed action bound to the current session.
   * If the session changes before the timer fires, the callback is discarded.
   * @param {function} callback
   * @param {number} delayMs
   * @param {string} [label] - optional label for debugging
   * @returns {number} timer ID
   */
  delay(callback, delayMs, label = '') {
    const id = this._nextId++;
    const sid = this._sessionId;

    if (this._paused) {
      // If paused, store for later resumption
      this._pausedTimers.push({ id, callback, remainingMs: delayMs, label, sessionId: sid });
      return id;
    }

    const startTime = performance.now();
    const timerId = setTimeout(() => {
      this._timers.delete(id);
      // Only fire if still in the same session
      if (this._sessionId === sid) {
        callback();
      }
    }, delayMs);

    this._timers.set(id, { timerId, callback, delayMs, startTime, label, sessionId: sid });
    return id;
  }

  /**
   * Cancel a specific timer
   */
  cancel(id) {
    const entry = this._timers.get(id);
    if (entry) {
      clearTimeout(entry.timerId);
      this._timers.delete(id);
    }
    // Also remove from paused queue
    this._pausedTimers = this._pausedTimers.filter(t => t.id !== id);
  }

  /**
   * Cancel all timers for current session
   */
  cancelAll() {
    for (const [id, entry] of this._timers) {
      clearTimeout(entry.timerId);
    }
    this._timers.clear();
    this._pausedTimers = [];
  }

  /**
   * Pause all active timers.
   * Stores remaining time so they can be resumed later.
   */
  pause() {
    if (this._paused) return;
    this._paused = true;
    const now = performance.now();

    for (const [id, entry] of this._timers) {
      clearTimeout(entry.timerId);
      const elapsed = now - entry.startTime;
      const remaining = Math.max(0, entry.delayMs - elapsed);
      this._pausedTimers.push({
        id,
        callback: entry.callback,
        remainingMs: remaining,
        label: entry.label,
        sessionId: entry.sessionId,
      });
    }
    this._timers.clear();
  }

  /**
   * Resume all paused timers with their remaining delays.
   */
  resume() {
    if (!this._paused) return;
    this._paused = false;
    const sid = this._sessionId;

    const toResume = [...this._pausedTimers];
    this._pausedTimers = [];

    for (const entry of toResume) {
      // Only resume timers from current session
      if (entry.sessionId !== sid) continue;

      const startTime = performance.now();
      const timerId = setTimeout(() => {
        this._timers.delete(entry.id);
        if (this._sessionId === sid) {
          entry.callback();
        }
      }, entry.remainingMs);

      this._timers.set(entry.id, {
        timerId,
        callback: entry.callback,
        delayMs: entry.remainingMs,
        startTime,
        label: entry.label,
        sessionId: sid,
      });
    }
  }

  /**
   * Check if currently paused
   */
  get isPaused() {
    return this._paused;
  }

  /**
   * Get number of active timers
   */
  get activeCount() {
    return this._timers.size + this._pausedTimers.length;
  }
}
