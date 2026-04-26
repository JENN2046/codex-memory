const crypto = require('node:crypto');

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
    const diaryRecords = await this.diaryStore.listRecords({ target });
    const existingRecords = this.config.enableShadowWrites
      ? await this.shadowStore.listRecords(target)
      : [];
    const existingMap = new Map(existingRecords.map(record => [this.getRecordKey(record), record]));

    let sqliteWrites = 0;
    let vectorWrites = 0;
    let chunkWrites = 0;
    let prunedRecords = 0;
    let diaryVectorWrites = 0;

    for (const record of diaryRecords) {
      if (!record.memoryId) continue;

      const recordKey = this.getRecordKey(record);
      const existing = existingMap.get(recordKey);
      const hasCurrentFingerprintChunks = existing
        ? await this.hasCurrentFingerprintChunks(record)
        : false;
      const needsRefresh = force || this.shouldRefreshRecord(existing, record) || !hasCurrentFingerprintChunks;

      if (this.config.enableShadowWrites && needsRefresh) {
        await this.shadowStore.upsertRecord(record);
        await this.shadowStore.clearReconcileTasks(record.memoryId, 'sqlite');
        sqliteWrites += 1;

        if (this.chunkIndexingService) {
          await this.chunkIndexingService.indexRecord(record);
          await this.shadowStore.clearReconcileTasks(record.memoryId, 'chunks');
          chunkWrites += 1;
        }
      }

      if (this.config.enableVectorIndex && needsRefresh) {
        await this.vectorStore.upsertRecord(record);
        await this.shadowStore.clearReconcileTasks(record.memoryId, 'vector');
        vectorWrites += 1;
      }
    }

    if (this.config.enableShadowWrites) {
      const activeMemoryIds = new Set(diaryRecords.map(record => record.memoryId).filter(Boolean));

      for (const existing of existingRecords) {
        if (!existing.memoryId || activeMemoryIds.has(existing.memoryId)) {
          continue;
        }

        await this.shadowStore.deleteRecord(existing.memoryId);
        await this.shadowStore.clearReconcileTasks(existing.memoryId);
        prunedRecords += 1;

        if (this.config.enableVectorIndex) {
          await this.vectorStore.deleteRecord(existing.memoryId);
        }
      }
    }

    const changed = sqliteWrites > 0 || vectorWrites > 0 || chunkWrites > 0 || prunedRecords > 0;
    if (this.config.enableVectorIndex) {
      diaryVectorWrites = await this.vectorStore.rebuildDiaryVectors(diaryRecords);
    }
    if (changed && this.candidateCacheStore) {
      if (this.candidateCacheStore.clearCurrentFingerprint) {
        await this.candidateCacheStore.clearCurrentFingerprint();
      } else {
        await this.candidateCacheStore.clearAll();
      }
    }

    return {
      recordCount: diaryRecords.length,
      sqliteWrites,
      vectorWrites,
      chunkWrites,
      prunedRecords,
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
