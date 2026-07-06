'use strict';

const {
  REQUIRED_PROJECTION_FAMILIES
} = require('./MemoryLifecycleProjectionCleanupContract');

const SUPPRESSING_LIFECYCLE_FAMILIES = Object.freeze([
  'tombstone_memory',
  'supersede_memory',
  'memory_exclude',
  'memory_forget'
]);

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function auditEntryReferencesMemory(entry, memoryId) {
  if (normalizeString(entry?.memoryId || entry?.memory_id || entry?.topMemoryId) === memoryId) {
    return true;
  }
  const memoryIds = Array.isArray(entry?.memoryIds) ? entry.memoryIds : [];
  return memoryIds.map(normalizeString).includes(memoryId);
}

function buildZeroCounts() {
  return Object.fromEntries(REQUIRED_PROJECTION_FAMILIES.map(projectionFamily => [projectionFamily, 0]));
}

function uniqueStrings(values = []) {
  return [...new Set((Array.isArray(values) ? values : [values])
    .map(normalizeString)
    .filter(Boolean))];
}

class MemoryLifecycleProjectionCleanupService {
  constructor({
    diaryStore = null,
    shadowStore,
    vectorStore = null,
    candidateCacheStore = null,
    auditLogStore = null
  } = {}) {
    this.diaryStore = diaryStore;
    this.shadowStore = shadowStore;
    this.vectorStore = vectorStore;
    this.candidateCacheStore = candidateCacheStore;
    this.auditLogStore = auditLogStore;
  }

  async countMemoryLinkedEmbeddingCache(memoryId) {
    if (!this.vectorStore?.ensureReady) return 0;
    await this.vectorStore.ensureReady();
    return Object.values(this.vectorStore.index?.embeddingCache || {})
      .filter(entry => normalizeString(entry?.memoryId) === memoryId).length;
  }

  async clearMemoryLinkedEmbeddingCache(memoryId) {
    if (!this.vectorStore?.ensureReady || !this.vectorStore?.flush) return 0;
    await this.vectorStore.ensureReady();
    let removed = 0;
    for (const [cacheKey, entry] of Object.entries(this.vectorStore.index?.embeddingCache || {})) {
      if (normalizeString(entry?.memoryId) !== memoryId) continue;
      delete this.vectorStore.index.embeddingCache[cacheKey];
      removed += 1;
    }
    if (removed > 0) {
      await this.vectorStore.flush();
    }
    return removed;
  }

  buildRecordEmbeddingText(record) {
    if (!record) return '';
    if (this.vectorStore?.buildRecordText) {
      return this.vectorStore.buildRecordText(record);
    }
    return [
      `Title: ${record.title}`,
      record.content || '',
      `Evidence: ${record.evidence || ''}`,
      `Tag: ${(record.tags || []).join(', ')}`
    ].join('\n');
  }

  async collectTargetProjectionContext({ memoryId } = {}) {
    const normalizedMemoryId = normalizeString(memoryId);
    const record = this.shadowStore?.getRecord
      ? await this.shadowStore.getRecord(normalizedMemoryId)
      : null;
    const chunks = this.shadowStore?.listChunksForRecord
      ? await this.shadowStore.listChunksForRecord(normalizedMemoryId, { currentFingerprintOnly: false })
      : [];
    const embeddingCacheTexts = uniqueStrings([
      this.buildRecordEmbeddingText(record),
      ...chunks.map(chunk => chunk?.text)
    ]);

    return {
      record,
      chunks,
      embeddingCacheTexts
    };
  }

  async countTargetDocumentEmbeddingCache(context = {}) {
    const texts = uniqueStrings(context.embeddingCacheTexts || []);
    if (texts.length === 0) return 0;
    if (this.vectorStore?.countDocumentEmbeddingCacheByTexts) {
      return this.vectorStore.countDocumentEmbeddingCacheByTexts(texts);
    }
    return this.countMemoryLinkedEmbeddingCache(context.memoryId);
  }

  async clearTargetDocumentEmbeddingCache(context = {}) {
    const texts = uniqueStrings(context.embeddingCacheTexts || []);
    if (texts.length === 0) return 0;
    if (this.vectorStore?.deleteDocumentEmbeddingCacheByTexts) {
      return this.vectorStore.deleteDocumentEmbeddingCacheByTexts(texts);
    }
    return this.clearMemoryLinkedEmbeddingCache(context.memoryId);
  }

  async countDiaryRecords({ memoryId, target }) {
    if (!this.diaryStore?.listRecords) return 0;
    const records = await this.diaryStore.listRecords({ target });
    return records.filter(record => normalizeString(record.memoryId) === memoryId).length;
  }

  async countAuditEntries(memoryId) {
    if (!this.auditLogStore?.readRecentWriteAudit || !this.auditLogStore?.readRecentRecallAudit) {
      return {
        write_audit: 0,
        recall_audit: 0
      };
    }
    const writeAudit = await this.auditLogStore.readRecentWriteAudit();
    const recallAudit = await this.auditLogStore.readRecentRecallAudit();
    return {
      write_audit: writeAudit.filter(entry => auditEntryReferencesMemory(entry, memoryId)).length,
      recall_audit: recallAudit.filter(entry => auditEntryReferencesMemory(entry, memoryId)).length
    };
  }

  async countProjectionTargets({
    memoryId,
    target = 'process',
    includeAuditCounts = false,
    projectionContext = null
  } = {}) {
    const normalizedMemoryId = normalizeString(memoryId);
    const counts = buildZeroCounts();
    if (!normalizedMemoryId || !this.shadowStore) return counts;
    const context = projectionContext || await this.collectTargetProjectionContext({
      memoryId: normalizedMemoryId
    });

    const reconcileTasks = this.shadowStore.listReconcileTasksForMemoryId
      ? await this.shadowStore.listReconcileTasksForMemoryId(normalizedMemoryId, 50)
      : [];
    const manifest = this.shadowStore.getMemoryWriteManifestByMemoryId
      ? await this.shadowStore.getMemoryWriteManifestByMemoryId(normalizedMemoryId)
      : null;

    counts.diary_record = await this.countDiaryRecords({ memoryId: normalizedMemoryId, target });
    counts.sqlite_shadow_record = context.record ? 1 : 0;
    counts.sqlite_memory_chunks = this.shadowStore.countChunksForRecord
      ? await this.shadowStore.countChunksForRecord(normalizedMemoryId, { currentFingerprintOnly: false })
      : 0;
    counts.vector_index = this.vectorStore?.hasRecord && await this.vectorStore.hasRecord(normalizedMemoryId) ? 1 : 0;
    counts.embedding_cache = await this.countTargetDocumentEmbeddingCache({
      ...context,
      memoryId: normalizedMemoryId
    });
    counts.candidate_cache = this.candidateCacheStore?.countCurrentFingerprintByMemoryIds
      ? await this.candidateCacheStore.countCurrentFingerprintByMemoryIds([normalizedMemoryId], [target])
      : 0;
    counts.reconcile_queue = reconcileTasks.length;
    counts.degraded_payload = manifest?.record || manifest?.recordMalformed ? 1 : 0;

    if (includeAuditCounts) {
      const auditCounts = await this.countAuditEntries(normalizedMemoryId);
      counts.write_audit = auditCounts.write_audit;
      counts.recall_audit = auditCounts.recall_audit;
    }

    return counts;
  }

  async getSuppressionStatus(memoryId) {
    const record = this.shadowStore?.getRecord
      ? await this.shadowStore.getRecord(memoryId)
      : null;
    return {
      exists: Boolean(record),
      status: record?.lifecycleStatus || record?.status || null,
      clientId: record?.clientId || null,
      visibility: record?.visibility || null
    };
  }

  async appendProjectionAudit({
    memoryId,
    target,
    lifecycleFamily,
    targetStatus,
    requestSource,
    timestamp
  }) {
    if (!this.auditLogStore) return;

    if (this.auditLogStore.appendWriteAudit) {
      await this.auditLogStore.appendWriteAudit({
        timestamp,
        decision: 'projection-cleanup',
        target,
        memoryId,
        requestSource,
        eventType: 'lifecycle_projection_cleanup',
        lifecycleFamily,
        toStatus: targetStatus,
        lowDisclosure: true,
        rawContentIncluded: false
      });
    }

    if (this.auditLogStore.appendRecallAudit) {
      await this.auditLogStore.appendRecallAudit({
        timestamp,
        target,
        memoryId,
        memoryIds: [memoryId],
        recallType: 'lifecycle_suppression_projection_recheck',
        resultCount: 0,
        lifecycleFamily,
        toStatus: targetStatus,
        lowDisclosure: true,
        rawContentIncluded: false
      });
    }
  }

  projectionReport({
    projectionFamily,
    beforeCounts,
    afterCounts,
    suppressionStatus,
    targetStatus,
    appendProjectionAudit
  }) {
    const before = beforeCounts[projectionFamily] || 0;
    const after = afterCounts[projectionFamily] || 0;
    let accepted = false;
    let result = 'not_checked';

    if (projectionFamily === 'diary_record') {
      accepted = after >= 0 && suppressionStatus.status === targetStatus;
      result = accepted ? 'retained_or_absent_with_sqlite_suppression_status' : 'diary_retention_or_suppression_mismatch';
    } else if (projectionFamily === 'sqlite_shadow_record') {
      accepted = before === 1 && after === 1 && suppressionStatus.status === targetStatus;
      result = accepted ? 'status_projection_updated' : 'status_projection_mismatch';
    } else if (projectionFamily === 'write_audit' || projectionFamily === 'recall_audit') {
      accepted = appendProjectionAudit ? after === before + 1 : after === before;
      result = appendProjectionAudit
        ? (accepted ? 'append_only_low_disclosure_event_added' : 'audit_append_only_mismatch')
        : 'projection_audit_not_requested';
    } else if (projectionFamily === 'sqlite_memory_chunks') {
      accepted = after === 0;
      result = accepted ? 'derived_chunk_projection_cleared_or_absent' : 'derived_chunk_residual';
    } else if (projectionFamily === 'vector_index') {
      accepted = after === 0;
      result = accepted ? 'vector_projection_cleared_or_absent' : 'vector_projection_residual';
    } else if (projectionFamily === 'candidate_cache') {
      accepted = after === 0;
      result = accepted ? 'dependent_entries_cleared_or_absent' : 'candidate_cache_residual';
    } else if (projectionFamily === 'embedding_cache') {
      accepted = after === 0;
      result = accepted ? 'memory_linked_embedding_entries_cleared_or_absent' : 'embedding_cache_residual';
    } else if (projectionFamily === 'reconcile_queue') {
      accepted = after === 0;
      result = accepted ? 'pending_reconcile_tasks_cleared_or_absent' : 'reconcile_queue_residual';
    } else if (projectionFamily === 'degraded_payload') {
      accepted = after === 0;
      result = accepted ? 'degraded_manifest_repaired_or_absent' : 'degraded_payload_residual';
    }

    return {
      projectionFamily,
      beforeTargetCount: before,
      afterTargetCount: after,
      accepted,
      result
    };
  }

  async applySuppression({
    memoryId,
    target = 'process',
    lifecycleFamily,
    targetStatus,
    requestSource = '',
    timestamp = new Date().toISOString(),
    appendProjectionAudit = false,
    skipProjections = []
  } = {}) {
    const normalizedMemoryId = normalizeString(memoryId);
    const normalizedTarget = normalizeString(target) || 'process';
    const normalizedLifecycleFamily = normalizeString(lifecycleFamily);
    const normalizedTargetStatus = normalizeString(targetStatus);
    const skipSet = new Set((Array.isArray(skipProjections) ? skipProjections : [])
      .map(normalizeString)
      .filter(Boolean));
    const blockedReasons = [];

    if (!normalizedMemoryId) blockedReasons.push('target_memory_id_required');
    if (!this.shadowStore) blockedReasons.push('shadow_store_required');
    if (!SUPPRESSING_LIFECYCLE_FAMILIES.includes(normalizedLifecycleFamily)) {
      blockedReasons.push('unsupported_suppressing_lifecycle_family');
    }
    if (!normalizedTargetStatus) blockedReasons.push('target_status_required');

    if (blockedReasons.length > 0) {
      return {
        accepted: false,
        decision: 'LIFECYCLE_PROJECTION_SUPPRESSION_CLEANUP_BLOCKED',
        memoryId: normalizedMemoryId || null,
        lifecycleFamily: normalizedLifecycleFamily,
        targetStatus: normalizedTargetStatus || null,
        projectionFamilies: REQUIRED_PROJECTION_FAMILIES,
        blockedReasons: [...new Set(blockedReasons)],
        beforeCounts: buildZeroCounts(),
        afterCounts: buildZeroCounts(),
        projectionReports: [],
        residualProjectionFamilies: REQUIRED_PROJECTION_FAMILIES
      };
    }

    const projectionContext = await this.collectTargetProjectionContext({
      memoryId: normalizedMemoryId
    });
    const beforeCounts = await this.countProjectionTargets({
      memoryId: normalizedMemoryId,
      target: normalizedTarget,
      includeAuditCounts: appendProjectionAudit,
      projectionContext
    });
    const record = this.shadowStore.getRecord
      ? await this.shadowStore.getRecord(normalizedMemoryId)
      : null;

    if (!skipSet.has('sqlite_memory_chunks') && this.shadowStore.deleteChunksForRecord) {
      await this.shadowStore.deleteChunksForRecord(normalizedMemoryId);
    } else if (!skipSet.has('sqlite_memory_chunks') && record && this.shadowStore.replaceChunksForRecord) {
      await this.shadowStore.replaceChunksForRecord(record, []);
    }

    if (!skipSet.has('vector_index') && this.vectorStore?.deleteRecord) {
      await this.vectorStore.deleteRecord(normalizedMemoryId);
    }

    if (!skipSet.has('embedding_cache')) {
      await this.clearTargetDocumentEmbeddingCache({
        ...projectionContext,
        memoryId: normalizedMemoryId
      });
    }

    if (!skipSet.has('candidate_cache') && this.candidateCacheStore?.clearCurrentFingerprintByMemoryIds) {
      await this.candidateCacheStore.clearCurrentFingerprintByMemoryIds([normalizedMemoryId], [normalizedTarget]);
    }

    if (!skipSet.has('reconcile_queue') && this.shadowStore.clearReconcileTasks) {
      await this.shadowStore.clearReconcileTasks(normalizedMemoryId);
    }

    if (!skipSet.has('degraded_payload') && this.shadowStore.getMemoryWriteManifestByMemoryId) {
      const manifest = await this.shadowStore.getMemoryWriteManifestByMemoryId(normalizedMemoryId);
      if (manifest?.record || manifest?.recordMalformed) {
        const result = {
          projectionFamily: 'degraded_payload',
          repairReason: normalizedLifecycleFamily,
          lowDisclosure: true,
          rawContentIncluded: false,
          recordPayloadSuppressed: true
        };
        if (this.shadowStore.suppressMemoryWriteManifestRecordPayload) {
          await this.shadowStore.suppressMemoryWriteManifestRecordPayload({
            idempotencyKey: manifest.idempotencyKey,
            status: 'repaired',
            result,
            updatedAt: timestamp
          });
        } else if (manifest.status === 'degraded' && this.shadowStore.repairDegradedMemoryWriteManifest) {
          await this.shadowStore.repairDegradedMemoryWriteManifest({
            idempotencyKey: manifest.idempotencyKey,
            status: 'repaired',
            result,
            updatedAt: timestamp
          });
        }
      } else if (manifest?.status === 'degraded' && this.shadowStore.repairDegradedMemoryWriteManifest) {
        await this.shadowStore.repairDegradedMemoryWriteManifest({
          idempotencyKey: manifest.idempotencyKey,
          status: 'repaired',
          result: {
            projectionFamily: 'degraded_payload',
            repairReason: normalizedLifecycleFamily,
            lowDisclosure: true,
            rawContentIncluded: false
          },
          updatedAt: timestamp
        });
      }
    }

    if (appendProjectionAudit && !skipSet.has('write_audit') && !skipSet.has('recall_audit')) {
      await this.appendProjectionAudit({
        memoryId: normalizedMemoryId,
        target: normalizedTarget,
        lifecycleFamily: normalizedLifecycleFamily,
        targetStatus: normalizedTargetStatus,
        requestSource,
        timestamp
      });
    }

    const afterCounts = await this.countProjectionTargets({
      memoryId: normalizedMemoryId,
      target: normalizedTarget,
      includeAuditCounts: appendProjectionAudit,
      projectionContext
    });
    const suppressionStatus = await this.getSuppressionStatus(normalizedMemoryId);
    const projectionReports = REQUIRED_PROJECTION_FAMILIES.map(projectionFamily =>
      this.projectionReport({
        projectionFamily,
        beforeCounts,
        afterCounts,
        suppressionStatus,
        targetStatus: normalizedTargetStatus,
        appendProjectionAudit
      })
    );
    const residualProjectionFamilies = projectionReports
      .filter(report => report.accepted !== true)
      .map(report => report.projectionFamily);
    const accepted = residualProjectionFamilies.length === 0;

    return {
      accepted,
      decision: accepted
        ? 'LIFECYCLE_PROJECTION_SUPPRESSION_CLEANUP_ACCEPTED'
        : 'LIFECYCLE_PROJECTION_SUPPRESSION_CLEANUP_BLOCKED',
      memoryId: normalizedMemoryId,
      lifecycleFamily: normalizedLifecycleFamily,
      targetStatus: normalizedTargetStatus,
      projectionFamilies: REQUIRED_PROJECTION_FAMILIES,
      beforeCounts,
      afterCounts,
      projectionReports,
      residualProjectionFamilies,
      suppressionStatus: {
        exists: suppressionStatus.exists,
        status: suppressionStatus.status,
        clientScopeCategory: suppressionStatus.clientId ? 'present' : 'absent',
        visibilityScopeCategory: suppressionStatus.visibility ? 'present' : 'absent'
      },
      pathPolicy: {
        tempStorePathsReturned: false,
        endpointOrLocatorReturned: false,
        rawContentReturned: false
      },
      execution: {
        lifecycleProjectionCleanupRoute: true,
        rawContentOutput: false,
        readinessClaimed: false
      }
    };
  }
}

module.exports = {
  MemoryLifecycleProjectionCleanupService,
  SUPPRESSING_LIFECYCLE_FAMILIES
};
