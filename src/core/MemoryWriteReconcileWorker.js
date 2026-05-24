const DEFAULT_INTERVAL_MS = 60_000;
const MIN_INTERVAL_MS = 100;
const MAX_INTERVAL_MS = 600_000;

function normalizeIntervalMs(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_INTERVAL_MS;
  }
  return Math.min(Math.max(parsed, MIN_INTERVAL_MS), MAX_INTERVAL_MS);
}

function normalizeMaxRuns(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function errorMessage(error) {
  return error && error.message ? error.message : String(error || 'unknown error');
}

function summarizeResult(result) {
  if (!result || typeof result !== 'object') {
    return null;
  }

  return {
    success: result.success === true,
    decision: result.decision || null,
    workerDecision: result.workerDecision || null,
    dryRun: result.dryRun === true,
    limit: result.limit ?? null,
    scannedTaskCount: Number(result.scannedTaskCount || 0),
    replayedCount: Number(result.replayedCount || 0),
    wouldReplayCount: Number(result.wouldReplayCount || 0),
    clearedCount: Number(result.clearedCount || 0),
    failedCount: Number(result.failedCount || 0),
    skippedCount: Number(result.skippedCount || 0),
    hasError: !!result.error
  };
}

class MemoryWriteReconcileWorker {
  constructor({
    reconcileService,
    intervalMs = DEFAULT_INTERVAL_MS,
    limit = undefined,
    dryRun = false,
    scheduler = globalThis
  }) {
    if (!reconcileService || typeof reconcileService.replayPending !== 'function') {
      throw new Error('MemoryWriteReconcileWorker requires a reconcileService with replayPending()');
    }

    this.reconcileService = reconcileService;
    this.intervalMs = normalizeIntervalMs(intervalMs);
    this.limit = limit;
    this.dryRun = dryRun === true;
    this.scheduler = scheduler;
    this.timer = null;
    this.running = false;
    this.tickInFlight = false;
    this.runCount = 0;
    this.maxRuns = null;
    this.lastResult = null;
  }

  isRunning() {
    return this.running;
  }

  getStatus() {
    return {
      running: this.running,
      timerScheduled: this.timer !== null,
      tickInFlight: this.tickInFlight,
      runCount: this.runCount,
      intervalMs: this.intervalMs,
      limit: this.limit ?? null,
      dryRun: this.dryRun,
      maxRuns: this.maxRuns,
      lastResultSummary: summarizeResult(this.lastResult)
    };
  }

  start(options = {}) {
    if (this.running) {
      return {
        decision: 'already_running',
        running: true,
        intervalMs: this.intervalMs,
        limit: this.limit ?? null,
        dryRun: this.dryRun,
        maxRuns: this.maxRuns,
        runCount: this.runCount
      };
    }

    this.intervalMs = normalizeIntervalMs(options.intervalMs ?? this.intervalMs);
    this.limit = options.limit ?? this.limit;
    this.dryRun = (options.dryRun ?? this.dryRun) === true;
    this.maxRuns = normalizeMaxRuns(options.maxRuns);
    this.runCount = 0;
    this.lastResult = null;
    this.running = true;
    this.scheduleNext();

    if (!this.running) {
      return {
        decision: 'start_failed',
        running: false,
        intervalMs: this.intervalMs,
        limit: this.limit ?? null,
        dryRun: this.dryRun,
        maxRuns: this.maxRuns,
        lastResultSummary: summarizeResult(this.lastResult)
      };
    }

    return {
      decision: 'started',
      running: true,
      intervalMs: this.intervalMs,
      limit: this.limit ?? null,
      dryRun: this.dryRun,
      maxRuns: this.maxRuns
    };
  }

  stop() {
    if (!this.running && !this.timer) {
      return {
        decision: 'not_running',
        running: false,
        intervalMs: this.intervalMs,
        limit: this.limit ?? null,
        dryRun: this.dryRun,
        maxRuns: this.maxRuns,
        runCount: this.runCount
      };
    }

    if (this.timer && typeof this.scheduler.clearTimeout === 'function') {
      this.scheduler.clearTimeout(this.timer);
    }
    this.timer = null;
    this.running = false;

    return {
      decision: 'stopped',
      running: false,
      intervalMs: this.intervalMs,
      limit: this.limit ?? null,
      dryRun: this.dryRun,
      maxRuns: this.maxRuns,
      runCount: this.runCount
    };
  }

  async runOnce(options = {}) {
    const limit = options.limit ?? this.limit;
    const dryRun = (options.dryRun ?? this.dryRun) === true;

    try {
      const result = await this.reconcileService.replayPending({ limit, dryRun });
      this.lastResult = {
        ...result,
        workerDecision: 'run_once_completed'
      };
      return this.lastResult;
    } catch (error) {
      this.lastResult = {
        success: false,
        decision: 'worker_replay_failed',
        workerDecision: 'run_once_failed',
        error: errorMessage(error),
        dryRun,
        limit: limit ?? null
      };
      return this.lastResult;
    }
  }

  scheduleNext() {
    if (!this.running || this.timer) {
      return;
    }

    if (typeof this.scheduler.setTimeout !== 'function') {
      this.lastResult = {
        success: false,
        decision: 'worker_scheduler_unavailable',
        workerDecision: 'schedule_failed',
        error: 'scheduler.setTimeout is unavailable'
      };
      this.running = false;
      return;
    }

    this.timer = this.scheduler.setTimeout(async () => {
      this.timer = null;
      await this.tick();
    }, this.intervalMs);

    if (this.timer && typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  async tick() {
    if (!this.running || this.tickInFlight) {
      return this.lastResult;
    }

    this.tickInFlight = true;
    try {
      const result = await this.runOnce();
      this.runCount += 1;
      if (this.maxRuns !== null && this.runCount >= this.maxRuns) {
        this.running = false;
      }
      return result;
    } finally {
      this.tickInFlight = false;
      if (this.running) {
        this.scheduleNext();
      }
    }
  }
}

module.exports = {
  MemoryWriteReconcileWorker,
  normalizeIntervalMs,
  summarizeResult
};
