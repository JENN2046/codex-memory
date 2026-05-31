const crypto = require('node:crypto');

const { filterRecallIsolatedItems, isRecallIsolated } = require('../core/RecallIsolationClassifier');
const { throwIfSearchMemoryAborted } = require('../core/SearchMemoryTimeoutPolicy');

class KnowledgeBaseSyncService {
  constructor({
    config,
    diaryStore,
    shadowStore,
    vectorStore,
    chunkIndexingService,
    candidateCacheStore = null,
    governanceStateRevisionProvider = null
  }) {
    this.config = config;
    this.diaryStore = diaryStore;
    this.shadowStore = shadowStore;
    this.vectorStore = vectorStore;
    this.chunkIndexingService = chunkIndexingService;
    this.candidateCacheStore = candidateCacheStore;
    this.governanceStateRevisionProvider = governanceStateRevisionProvider;
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
    const previousGovernanceStateRevision = await this.getStoredGovernanceStateRevision(target, signal);
    const previousGovernanceStateEntries = await this.getStoredGovernanceStateEntries(target, signal);
    throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
    const governanceStateSnapshot = await this.resolveGovernanceStateSnapshot({
      target,
      diaryRecords,
      existingRecords,
      signal
    });
    const governanceStateRevision = governanceStateSnapshot.revision;
    const governanceStateEntries = governanceStateSnapshot.entries;
    const providerGovernanceChangedMemoryIds = governanceStateSnapshot.changedMemoryIds;
    throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
    const existingMap = new Map(existingRecords.map(record => [this.getRecordKey(record), record]));

    let sqliteWrites = 0;
    let vectorWrites = 0;
    let chunkWrites = 0;
    let prunedRecords = 0;
    let isolationProjectionClears = 0;
    let diaryVectorWrites = 0;
    let isolatedRecords = 0;
    const changedMemoryIds = new Set();

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
      if ((needsRefresh || needsIsolationChunkClear) && record.memoryId) {
        changedMemoryIds.add(record.memoryId);
      }

      if (this.config.enableShadowWrites && (needsRefresh || needsIsolationChunkClear)) {
        if (existing) {
          record.projectId = this.firstGovernanceField(record.projectId, existing.projectId) || null;
          record.workspaceId = this.firstGovernanceField(record.workspaceId, existing.workspaceId) || null;
          record.clientId = this.firstGovernanceField(record.clientId, existing.clientId) || null;
          record.taskId = this.firstGovernanceField(record.taskId, existing.taskId) || null;
          record.conversationId = this.firstGovernanceField(record.conversationId, existing.conversationId) || null;
          record.visibility = this.firstGovernanceField(record.visibility, existing.visibility) || null;
          record.retentionPolicy = this.firstGovernanceField(record.retentionPolicy, existing.retentionPolicy) || null;
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
        if (await this.hasAuthoritativeWriteManifest(existing)) {
          continue;
        }

        await this.shadowStore.deleteRecord(existing.memoryId);
        throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
        await this.shadowStore.clearReconcileTasks(existing.memoryId);
        prunedRecords += 1;
        changedMemoryIds.add(existing.memoryId);

        if (this.config.enableVectorIndex) {
          await this.vectorStore.deleteRecord(existing.memoryId);
        }
      }
    }

    const changed = sqliteWrites > 0 || vectorWrites > 0 || chunkWrites > 0 || prunedRecords > 0 || isolationProjectionClears > 0;
    const governanceStateRevisionChanged = previousGovernanceStateRevision !== governanceStateRevision;
    if (this.config.enableVectorIndex) {
      throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
      diaryVectorWrites = await this.vectorStore.rebuildDiaryVectors(filterRecallIsolatedItems(diaryRecords));
      throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
    }
    const invalidationTargets = this.getCandidateCacheInvalidationTargets(target);
    const governanceChangedMemoryIds = governanceStateRevisionChanged
      ? (
          providerGovernanceChangedMemoryIds
          || this.diffGovernanceStateEntries(previousGovernanceStateEntries, governanceStateEntries)
        )
      : [];
    if (this.candidateCacheStore && changed && !governanceStateRevisionChanged) {
      throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
      if (changedMemoryIds.size > 0 && this.candidateCacheStore.clearCurrentFingerprintByMemoryIds) {
        await this.candidateCacheStore.clearCurrentFingerprintByMemoryIds([...changedMemoryIds], invalidationTargets || [target]);
      } else if (invalidationTargets && this.candidateCacheStore.clearCurrentFingerprintTargets) {
        await this.candidateCacheStore.clearCurrentFingerprintTargets(invalidationTargets);
      } else if (this.candidateCacheStore.clearCurrentFingerprint) {
        await this.candidateCacheStore.clearCurrentFingerprint();
      } else {
        await this.candidateCacheStore.clearAll();
      }
    }
    if (governanceStateRevisionChanged && this.candidateCacheStore) {
      throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
      if (governanceChangedMemoryIds.length > 0 && this.candidateCacheStore.clearCurrentFingerprintByMemoryIds) {
        await this.candidateCacheStore.clearCurrentFingerprintByMemoryIds(governanceChangedMemoryIds, invalidationTargets || [target]);
      } else if (invalidationTargets && this.candidateCacheStore.clearCurrentFingerprintTargets) {
        await this.candidateCacheStore.clearCurrentFingerprintTargets(invalidationTargets);
      } else if (this.candidateCacheStore.clearCurrentFingerprint) {
        await this.candidateCacheStore.clearCurrentFingerprint();
      } else {
        await this.candidateCacheStore.clearAll();
      }
    }
    if (this.candidateCacheStore?.setStoredGovernanceStateRevision) {
      throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
      await this.candidateCacheStore.setStoredGovernanceStateRevision(target, governanceStateRevision);
    }
    if (this.candidateCacheStore?.setStoredGovernanceStateEntries) {
      throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
      await this.candidateCacheStore.setStoredGovernanceStateEntries(target, governanceStateEntries);
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
      governanceStateRevisionChanged,
      governanceStateRevision,
      syncToken: this.buildSyncToken(target, diaryRecords, { governanceStateRevision })
    };
  }

  buildSyncToken(target, diaryRecords = [], options = {}) {
    const governanceStateRevision = this.normalizeGovernanceStateRevision(options.governanceStateRevision);
    const normalized = [...diaryRecords]
      .filter(record => record.memoryId)
      .sort((left, right) => String(left.memoryId).localeCompare(String(right.memoryId)))
      .map(record => ({
        memoryId: record.memoryId,
        updatedAt: record.updatedAt,
        relativePath: record.relativePath,
        target: record.target
      }));

    const payload = {
      target,
      records: normalized
    };
    if (governanceStateRevision) {
      payload.governanceStateRevision = governanceStateRevision;
    }

    return crypto
      .createHash('sha1')
      .update(JSON.stringify(payload))
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

  async hasAuthoritativeWriteManifest(record) {
    if (!record?.memoryId || typeof this.shadowStore.getMemoryWriteManifestByMemoryId !== 'function') {
      return false;
    }
    if (record.filePath) {
      return false;
    }

    const manifest = await this.shadowStore.getMemoryWriteManifestByMemoryId(record.memoryId);
    if (!manifest || manifest.recordMalformed) {
      return false;
    }

    return ['pending', 'committed', 'degraded', 'repaired'].includes(manifest.status);
  }

  async resolveGovernanceStateSnapshot({ target, diaryRecords, existingRecords, signal } = {}) {
    if (typeof this.governanceStateRevisionProvider === 'function') {
      const providerResult = await this.governanceStateRevisionProvider({ target, diaryRecords, existingRecords, signal });
      if (providerResult && typeof providerResult === 'object' && !Array.isArray(providerResult)) {
        const entries = this.normalizeGovernanceStateEntries(providerResult.entries);
        const revision = this.normalizeGovernanceStateRevision(providerResult.revision);
        const changedMemoryIds = this.normalizeGovernanceChangedMemoryIds(providerResult.changedMemoryIds);
        return {
          revision: revision || this.computeGovernanceStateRevision(entries || []),
          entries,
          changedMemoryIds
        };
      }
      return {
        revision: this.normalizeGovernanceStateRevision(providerResult),
        entries: null,
        changedMemoryIds: null
      };
    }
    const entries = this.deriveDefaultGovernanceStateEntries({ diaryRecords, existingRecords });
    return {
      revision: this.computeGovernanceStateRevision(entries),
      entries,
      changedMemoryIds: null
    };
  }

  normalizeGovernanceStateRevision(value) {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  deriveDefaultGovernanceStateEntries({ diaryRecords = [], existingRecords = [] } = {}) {
    const existingMap = new Map(
      (Array.isArray(existingRecords) ? existingRecords : [])
        .map(record => [this.getRecordKey(record), record])
    );
    return this.normalizeGovernanceStateEntries(
      (Array.isArray(diaryRecords) ? diaryRecords : [])
      .filter(record => record?.memoryId)
      .map(record => this.buildGovernanceStateEntry(record, existingMap.get(this.getRecordKey(record))))
      .filter(Boolean)
    );
  }

  computeGovernanceStateRevision(governanceEntries = []) {
    if (governanceEntries.length === 0) {
      return '';
    }

    return crypto
      .createHash('sha1')
      .update(JSON.stringify(governanceEntries))
      .digest('hex');
  }

  buildGovernanceStateEntry(record, existing = null) {
    const merged = {
      memoryId: record?.memoryId || existing?.memoryId || '',
      target: record?.target || existing?.target || '',
      // Lifecycle status currently lives in shadow-store metadata, not diary records.
      status: this.normalizeGovernanceField(existing?.status),
      projectId: this.firstGovernanceField(record?.projectId, existing?.projectId),
      workspaceId: this.firstGovernanceField(record?.workspaceId, existing?.workspaceId),
      clientId: this.firstGovernanceField(record?.clientId, existing?.clientId),
      taskId: this.firstGovernanceField(record?.taskId, existing?.taskId),
      conversationId: this.firstGovernanceField(record?.conversationId, existing?.conversationId),
      visibility: this.firstGovernanceField(record?.visibility, existing?.visibility),
      retentionPolicy: this.firstGovernanceField(record?.retentionPolicy, existing?.retentionPolicy)
    };

    const hasGovernanceSignal = [
      merged.status,
      merged.projectId,
      merged.workspaceId,
      merged.clientId,
      merged.taskId,
      merged.conversationId,
      merged.visibility,
      merged.retentionPolicy
    ].some(Boolean);

    if (!merged.memoryId || !hasGovernanceSignal) {
      return null;
    }

    return merged;
  }

  normalizeGovernanceField(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  firstGovernanceField(...values) {
    for (const value of values) {
      const normalized = this.normalizeGovernanceField(value);
      if (normalized) return normalized;
    }
    return '';
  }

  normalizeGovernanceStateEntries(entries = null) {
    if (!Array.isArray(entries)) {
      return null;
    }
    return entries
      .filter(entry => entry && typeof entry === 'object' && entry.memoryId)
      .map(entry => ({
        ...entry,
        memoryId: String(entry.memoryId),
        target: this.normalizeGovernanceField(entry.target)
      }))
      .sort((left, right) => String(left.memoryId).localeCompare(String(right.memoryId)));
  }

  normalizeGovernanceChangedMemoryIds(memoryIds = null) {
    if (!Array.isArray(memoryIds)) {
      return null;
    }
    return [...new Set(
      memoryIds
        .filter(value => value !== null && value !== undefined && String(value).trim())
        .map(value => String(value).trim())
    )].sort();
  }

  async getStoredGovernanceStateRevision(target, signal = null) {
    if (!this.candidateCacheStore?.getStoredGovernanceStateRevision) {
      return '';
    }
    const revision = await this.candidateCacheStore.getStoredGovernanceStateRevision(target);
    throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
    return this.normalizeGovernanceStateRevision(revision);
  }

  async getStoredGovernanceStateEntries(target, signal = null) {
    if (!this.candidateCacheStore?.getStoredGovernanceStateEntries) {
      return null;
    }
    const entries = await this.candidateCacheStore.getStoredGovernanceStateEntries(target);
    throwIfSearchMemoryAborted(signal, this.config.searchMemoryTimeoutMs);
    return this.normalizeGovernanceStateEntries(entries);
  }

  diffGovernanceStateEntries(previousEntries = null, nextEntries = null) {
    if (!Array.isArray(previousEntries) || !Array.isArray(nextEntries)) {
      return [];
    }

    const previousMap = new Map(previousEntries.map(entry => [String(entry.memoryId), JSON.stringify(entry)]));
    const nextMap = new Map(nextEntries.map(entry => [String(entry.memoryId), JSON.stringify(entry)]));
    const changed = new Set();

    for (const memoryId of previousMap.keys()) {
      if (!nextMap.has(memoryId) || nextMap.get(memoryId) !== previousMap.get(memoryId)) {
        changed.add(memoryId);
      }
    }
    for (const memoryId of nextMap.keys()) {
      if (!previousMap.has(memoryId) || previousMap.get(memoryId) !== nextMap.get(memoryId)) {
        changed.add(memoryId);
      }
    }

    return [...changed].sort();
  }

  getCandidateCacheInvalidationTargets(target = 'both') {
    const normalizedTarget = String(target || 'both');
    if (normalizedTarget === 'process') {
      return ['process', 'both'];
    }
    if (normalizedTarget === 'knowledge') {
      return ['knowledge', 'both'];
    }
    return null;
  }
}

module.exports = {
  KnowledgeBaseSyncService
};
