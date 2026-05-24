const SUPPORTED_STORE_KINDS = new Set(['sqlite', 'vector', 'chunks']);
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

function normalizeLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isPlainPayload(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function errorMessage(error) {
  return error && error.message ? error.message : String(error || 'unknown error');
}

class MemoryWriteReconcileService {
  constructor({
    shadowStore,
    vectorStore,
    chunkIndexingService = null
  }) {
    this.shadowStore = shadowStore;
    this.vectorStore = vectorStore;
    this.chunkIndexingService = chunkIndexingService;
  }

  async replayPending(options = {}) {
    const dryRun = options.dryRun === true || options.dry_run === true;
    const limit = normalizeLimit(options.limit);
    const tasks = await this.shadowStore.listReconcileTasks(limit);
    const results = [];

    for (const task of tasks) {
      results.push(await this.replayTask(task, { dryRun }));
    }

    const replayedCount = results.filter(result => result.status === 'replayed').length;
    const wouldReplayCount = results.filter(result => result.status === 'would_replay').length;
    const failedCount = results.filter(result => result.status === 'failed').length;
    const skippedCount = results.filter(result => result.status === 'skipped').length;
    const clearedCount = results.filter(result => result.cleared === true).length;

    return {
      success: failedCount === 0,
      decision: dryRun
        ? 'dry_run_completed'
        : failedCount > 0
          ? 'completed_with_failures'
          : 'completed',
      dryRun,
      limit,
      scannedTaskCount: tasks.length,
      replayedCount,
      wouldReplayCount,
      clearedCount,
      failedCount,
      skippedCount,
      results
    };
  }

  async replayTask(task = {}, { dryRun = false } = {}) {
    const storeKind = normalizeString(task.storeKind).toLowerCase();
    const payload = task.payload;
    const memoryId = normalizeString(task.memoryId) || normalizeString(payload && payload.memoryId);
    const baseResult = {
      taskId: task.id || null,
      memoryId: memoryId || null,
      storeKind: storeKind || null,
      reason: normalizeString(task.reason) || null,
      cleared: false
    };

    if (!SUPPORTED_STORE_KINDS.has(storeKind)) {
      return {
        ...baseResult,
        status: 'failed',
        error: `unsupported store kind: ${storeKind || '<missing>'}`
      };
    }

    if (!memoryId) {
      return {
        ...baseResult,
        status: 'failed',
        error: 'missing memoryId'
      };
    }

    if (!isPlainPayload(payload) || Object.keys(payload).length === 0) {
      return {
        ...baseResult,
        status: 'failed',
        error: 'missing replay payload'
      };
    }

    if (dryRun) {
      return {
        ...baseResult,
        status: 'would_replay'
      };
    }

    try {
      await this.replayProjection(storeKind, payload);
      await this.shadowStore.clearReconcileTasks(memoryId, storeKind);
      return {
        ...baseResult,
        status: 'replayed',
        cleared: true
      };
    } catch (error) {
      return {
        ...baseResult,
        status: 'failed',
        error: errorMessage(error)
      };
    }
  }

  async replayProjection(storeKind, payload) {
    if (storeKind === 'sqlite') {
      if (!this.shadowStore || typeof this.shadowStore.upsertRecord !== 'function') {
        throw new Error('sqlite replay unavailable');
      }
      await this.shadowStore.upsertRecord(payload);
      return;
    }

    if (storeKind === 'vector') {
      if (!this.vectorStore || typeof this.vectorStore.upsertRecord !== 'function') {
        throw new Error('vector replay unavailable');
      }
      await this.vectorStore.upsertRecord(payload);
      return;
    }

    if (storeKind === 'chunks') {
      if (!this.chunkIndexingService || typeof this.chunkIndexingService.indexRecord !== 'function') {
        throw new Error('chunk replay unavailable');
      }
      await this.chunkIndexingService.indexRecord(payload);
    }
  }
}

module.exports = {
  MemoryWriteReconcileService,
  normalizeLimit
};
