const crypto = require('node:crypto');

const { filterRecallIsolatedItems, isRecallIsolated } = require('../core/RecallIsolationClassifier');
const { throwIfSearchMemoryAborted } = require('../core/SearchMemoryTimeoutPolicy');

class KnowledgeBaseSyncService {
  constructor({ config, diaryStore, shadowStore, vectorStore, chunkIndexingService, candidateCacheStore = null }) {
    this.config = config;
    this.diaryStore = diaryStore;
    this.shadowStore = shadowStore;
    this.vectorStore = vectorStore;
    this.chunkIndexingService = chunkIndexingService;
    this.candidateCacheStore = candidateCacheStore;
  }

  async syncTarget(target = 'both', options = {}) {
    const force = !!options.force;
    const signal = options.signal || null;

    throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
    const diaryRecords = await this.diaryStore.listRecords({ target });
    throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
    const existingRecords = this.config.enableShadowWrites
      ? await this.shadowStore.listRecords(target)
      : [];
    throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
    const existingMap = new Map(existingRecords.map(record => [this.getRecordKey(record), record]));

    let sqliteWrites = 0;
    let vectorWrites = 0;
    let chunkWrites = 0;
    let prunedRecords = 0;
    let isolationProjectionClears = 0;
    let diaryVectorWrites = 0;
    let isolatedRecords = 0;

    for (const record of diaryRecords) {
      throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
      if (!record.memoryId) continue;
      const isolated = isRecallIsolated(record);
      if (isolated) isolatedRecords += 1;

      const recordKey = this.getRecordKey(record);
      const existing = existingMap.get(recordKey);
      const hasCurrentFingerprintChunks = existing
        ? await this.hasCurrentFingerprintChunks(record)
        : false;
      throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
      const needsRefresh = force || this.shouldRefreshRecord(existing, record) || (!isolated && !hasCurrentFingerprintChunks);
      const needsIsolationChunkClear = isolated && hasCurrentFingerprintChunks;

      if (this.config.enableShadowWrites && (needsRefresh || needsIsolationChunkClear)) {
        if (existing) {
          record.projectId = record.projectId || existing.projectId || null;
          record.workspaceId = record.workspaceId || existing.workspaceId || null;
          record.clientId = record.clientId || existing.clientId || null;
          record.taskId = record.taskId || existing.taskId || null;
          record.conversationId = record.conversationId || existing.conversationId || null;
          record.visibility = record.visibility || existing.visibility || null;
          record.retentionPolicy = record.retentionPolicy || existing.retentionPolicy || null;
        }
        await this.shadowStore.upsertRecord(record);
        throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
        await this.shadowStore.clearReconcileTasks(record.memoryId, 'sqlite');
        if (needsRefresh) sqliteWrites += 1;

        if (this.chunkIndexingService) {
          if (isolated) {
            await this.shadowStore.replaceChunksForRecord(record, []);
            if (needsIsolationChunkClear) isolationProjectionClears += 1;
          } else {
            await this.chunkIndexingService.indexRecord(record);
          }
          throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
          await this.shadowStore.clearReconcileTasks(record.memoryId, 'chunks');
          if (!isolated) chunkWrites += 1;
        }
      }

      if (this.config.enableVectorIndex && (needsRefresh || isolated)) {
        if (isolated) {
          if (await this.vectorStore.deleteRecord(record.memoryId)) {
            isolationProjectionClears += 1;
          }
        } else {
          await this.vectorStore.upsertRecord(record);
        }
        throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
        await this.shadowStore.clearReconcileTasks(record.memoryId, 'vector');
        if (!isolated) vectorWrites += 1;
      }
    }

    if (this.config.enableShadowWrites) {
      const activeMemoryIds = new Set(diaryRecords.map(record => record.memoryId).filter(Boolean));

      for (const existing of existingRecords) {
        throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
        if (!existing.memoryId || activeMemoryIds.has(existing.memoryId)) {
          continue;
        }

        await this.shadowStore.deleteRecord(existing.memoryId);
        throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
        await this.shadowStore.clearReconcileTasks(existing.memoryId);
        prunedRecords += 1;

        if (this.config.enableVectorIndex) {
          await this.vectorStore.deleteRecord(existing.memoryId);
        }
      }
    }

    const changed = sqliteWrites > 0 || vectorWrites > 0 || chunkWrites > 0 || prunedRecords > 0 || isolationProjectionClears > 0;
    if (this.config.enableVectorIndex) {
      throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
      diaryVectorWrites = await this.vectorStore.rebuildDiaryVectors(filterRecallIsolatedItems(diaryRecords));
      throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
    }
    if (changed && this.candidateCacheStore) {
      throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
      if (this.candidateCacheStore.clearCurrentFingerprint) {
        await this.candidateCacheStore.clearCurrentFingerprint();
      } else {
        await this.candidateCacheStore.clearAll();
      }
    }
    throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);

    return {
      recordCount: diaryRecords.length,
      sqliteWrites,
      vectorWrites,
      chunkWrites,
      prunedRecords,
      isolationProjectionClears,
      isolatedRecords,
      diaryVectorWrites,
      changed,
      syncToken: this.buildSyncToken(target, diaryRecords)
    };
  }

  buildSyncToken(target, diaryRecords = []) {
    const normalized = [...diaryRecords]
      .filter(record => record.memoryId)
      .sort((left, right) => String(left.memoryId).localeCompare(String(right.memoryId)))
      .map(record => ({
        memoryId: record.memoryId,
        updatedAt: record.updatedAt,
        relativePath: record.relativePath,
        target: record.target
      }));

    return crypto
      .createHash('sha1')
      .update(JSON.stringify({
        target,
        records: normalized
      }))
      .digest('hex');
  }

  getRecordKey(record) {
    return record.memoryId || record.relativePath || record.filePath;
  }

  shouldRefreshRecord(existing, incoming) {
    if (!existing) return true;
    return [
      existing.updatedAt !== incoming.updatedAt,
      existing.relativePath !== incoming.relativePath,
      existing.filePath !== incoming.filePath,
      existing.rawText !== incoming.rawText,
      existing.title !== incoming.title,
      existing.content !== incoming.content,
      existing.evidence !== incoming.evidence,
      JSON.stringify(existing.tags || []) !== JSON.stringify(incoming.tags || []),
      !!existing.validated !== !!incoming.validated,
      !!existing.reusable !== !!incoming.reusable
    ].some(Boolean);
  }

  async hasCurrentFingerprintChunks(record) {
    if (!this.chunkIndexingService || !this.shadowStore.countChunksForRecord || !record?.memoryId) {
      return true;
    }
    return (await this.shadowStore.countChunksForRecord(record.memoryId)) > 0;
  }
}

module.exports = {
  KnowledgeBaseSyncService
};
