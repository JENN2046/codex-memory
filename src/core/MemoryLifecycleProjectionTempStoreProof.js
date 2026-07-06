'use strict';

const {
  REQUIRED_PROJECTION_FAMILIES
} = require('./MemoryLifecycleProjectionCleanupContract');

const EXPECTED_SCHEMA_VERSION = 'memory-lifecycle-projection-temp-store-proof-v1';
const EXPECTED_VERSION = 'v1';

const SUPPRESSING_LIFECYCLE_FAMILIES = Object.freeze([
  'tombstone_memory',
  'supersede_memory',
  'memory_exclude',
  'memory_forget'
]);

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function statusForLifecycleFamily(lifecycleFamily) {
  if (lifecycleFamily === 'tombstone_memory') return 'tombstoned';
  if (lifecycleFamily === 'supersede_memory') return 'superseded';
  if (lifecycleFamily === 'memory_exclude') return 'excluded';
  if (lifecycleFamily === 'memory_forget') return 'forgotten';
  return '';
}

function ensureStoreMethods(store, storeName, methodNames) {
  const missing = methodNames.filter(methodName => typeof store?.[methodName] !== 'function');
  return missing.map(methodName => `${storeName}.${methodName}_missing`);
}

function collectStoreBlockers({
  diaryStore,
  shadowStore,
  vectorStore,
  candidateCacheStore,
  auditLogStore
}) {
  return [
    ...ensureStoreMethods(diaryStore, 'diaryStore', ['writeRecord', 'listRecords']),
    ...ensureStoreMethods(shadowStore, 'shadowStore', [
      'ensureReady',
      'ensureColumn',
      'refreshMemoryRecordColumnInfo',
      'upsertRecord',
      'replaceChunksForRecord',
      'countChunksForRecord',
      'getRecord',
      'updateLifecycleStatus',
      'enqueueReconcileTask',
      'clearReconcileTasks',
      'listReconcileTasksForMemoryId',
      'beginMemoryWriteManifest',
      'updateMemoryWriteManifestRecord',
      'finalizeMemoryWriteManifest',
      'repairDegradedMemoryWriteManifest',
      'getMemoryWriteManifestByMemoryId'
    ]),
    ...ensureStoreMethods(vectorStore, 'vectorStore', ['ensureReady', 'upsertRecord', 'deleteRecord', 'hasRecord', 'flush']),
    ...ensureStoreMethods(candidateCacheStore, 'candidateCacheStore', [
      'set',
      'clearCurrentFingerprintByMemoryIds',
      'countCurrentFingerprintByMemoryIds'
    ]),
    ...ensureStoreMethods(auditLogStore, 'auditLogStore', [
      'appendWriteAudit',
      'appendRecallAudit',
      'readRecentWriteAudit',
      'readRecentRecallAudit'
    ])
  ];
}

async function ensureLifecycleColumns(shadowStore) {
  await shadowStore.ensureReady();
  shadowStore.ensureColumn('memory_records', 'status', "TEXT NOT NULL DEFAULT 'active'");
  shadowStore.ensureColumn('memory_records', 'status_reason', 'TEXT');
  shadowStore.ensureColumn('memory_records', 'supersedes_memory_id', 'TEXT');
  shadowStore.ensureColumn('memory_records', 'superseded_by_memory_id', 'TEXT');
  shadowStore.ensureColumn('memory_records', 'tombstone_reason', 'TEXT');
  shadowStore.ensureColumn('memory_records', 'lifecycle_updated_at', 'TEXT');
  shadowStore.ensureColumn('memory_records', 'lifecycle_actor_client_id', 'TEXT');
  shadowStore.refreshMemoryRecordColumnInfo();
}

function buildSyntheticRecord({
  memoryId,
  target,
  status,
  timestamp
}) {
  return {
    memoryId,
    target,
    title: 'Temp Store Lifecycle Projection Proof',
    content: 'Synthetic temp-local lifecycle projection proof content.',
    evidence: 'Synthetic temp-local evidence; no private or production memory.',
    tags: ['proof', 'temp-store-proof', `status:${status}`],
    validated: true,
    reusable: false,
    sensitivity: 'none',
    createdAt: timestamp,
    updatedAt: timestamp,
    projectId: 'codex-memory',
    workspaceId: 'temp-store-lifecycle-proof',
    clientId: 'codex',
    taskId: 'TEMP-STORE-PROOF',
    conversationId: 'temp-store-lifecycle-proof',
    visibility: 'project',
    retentionPolicy: 'short_lived_or_tombstone_after_validation'
  };
}

async function seedMemoryLinkedEmbeddingCache(vectorStore, {
  memoryId,
  target,
  timestamp
}) {
  await vectorStore.ensureReady();
  vectorStore.index.embeddingCache[`${memoryId}:embedding`] = {
    memoryId,
    target,
    inputKind: 'document',
    vector: new Array(vectorStore.config.embedDimensions).fill(0),
    embeddingFingerprint: vectorStore.config.embeddingFingerprint,
    createdAt: timestamp,
    lastAccessedAt: timestamp
  };
  await vectorStore.flush();
}

async function clearMemoryLinkedEmbeddingCache(vectorStore, memoryId) {
  await vectorStore.ensureReady();
  let removed = 0;
  for (const [cacheKey, entry] of Object.entries(vectorStore.index.embeddingCache || {})) {
    if (normalizeString(entry?.memoryId) !== memoryId) continue;
    delete vectorStore.index.embeddingCache[cacheKey];
    removed += 1;
  }
  if (removed > 0) {
    await vectorStore.flush();
  }
  return removed;
}

async function countMemoryLinkedEmbeddingCache(vectorStore, memoryId) {
  await vectorStore.ensureReady();
  return Object.values(vectorStore.index.embeddingCache || {})
    .filter(entry => normalizeString(entry?.memoryId) === memoryId).length;
}

function auditEntryReferencesMemory(entry, memoryId) {
  if (normalizeString(entry?.memoryId || entry?.memory_id || entry?.topMemoryId) === memoryId) {
    return true;
  }
  const memoryIds = Array.isArray(entry?.memoryIds) ? entry.memoryIds : [];
  return memoryIds.map(normalizeString).includes(memoryId);
}

async function countAuditEntries(auditLogStore, memoryId) {
  const writeAudit = await auditLogStore.readRecentWriteAudit();
  const recallAudit = await auditLogStore.readRecentRecallAudit();
  return {
    write_audit: writeAudit.filter(entry => auditEntryReferencesMemory(entry, memoryId)).length,
    recall_audit: recallAudit.filter(entry => auditEntryReferencesMemory(entry, memoryId)).length
  };
}

async function countTempStoreProjectionTargets({
  diaryStore,
  shadowStore,
  vectorStore,
  candidateCacheStore,
  auditLogStore,
  memoryId,
  target
}) {
  const diaryRecords = await diaryStore.listRecords({ target });
  const sqliteRecord = await shadowStore.getRecord(memoryId);
  const reconcileTasks = await shadowStore.listReconcileTasksForMemoryId(memoryId, 50);
  const manifest = await shadowStore.getMemoryWriteManifestByMemoryId(memoryId);
  const auditCounts = await countAuditEntries(auditLogStore, memoryId);

  return {
    diary_record: diaryRecords.filter(record => normalizeString(record.memoryId) === memoryId).length,
    sqlite_shadow_record: sqliteRecord ? 1 : 0,
    sqlite_memory_chunks: await shadowStore.countChunksForRecord(memoryId),
    vector_index: await vectorStore.hasRecord(memoryId) ? 1 : 0,
    embedding_cache: await countMemoryLinkedEmbeddingCache(vectorStore, memoryId),
    candidate_cache: await candidateCacheStore.countCurrentFingerprintByMemoryIds([memoryId]),
    write_audit: auditCounts.write_audit,
    recall_audit: auditCounts.recall_audit,
    reconcile_queue: reconcileTasks.length,
    degraded_payload: manifest?.status === 'degraded' ? 1 : 0
  };
}

async function getSuppressionStatus(shadowStore, memoryId) {
  const record = await shadowStore.getRecord(memoryId);
  return {
    exists: Boolean(record),
    status: record?.lifecycleStatus || record?.status || null,
    clientId: record?.clientId || null,
    visibility: record?.visibility || null
  };
}

function projectionReport({
  projectionFamily,
  beforeCounts,
  afterCounts,
  suppressionStatus,
  targetStatus
}) {
  const before = beforeCounts[projectionFamily] || 0;
  const after = afterCounts[projectionFamily] || 0;
  let accepted = false;
  let result = 'not_checked';

  if (projectionFamily === 'diary_record') {
    accepted = before === 1 && after === 1 && suppressionStatus.status === targetStatus;
    result = accepted ? 'retained_with_sqlite_suppression_status' : 'diary_retention_or_suppression_mismatch';
  } else if (projectionFamily === 'sqlite_shadow_record') {
    accepted = before === 1 && after === 1 && suppressionStatus.status === targetStatus;
    result = accepted ? 'status_projection_updated' : 'status_projection_mismatch';
  } else if (projectionFamily === 'write_audit' || projectionFamily === 'recall_audit') {
    accepted = after === before + 1;
    result = accepted ? 'append_only_low_disclosure_event_added' : 'audit_append_only_mismatch';
  } else if (projectionFamily === 'sqlite_memory_chunks') {
    accepted = before > 0 && after === 0;
    result = accepted ? 'derived_chunk_projection_cleared' : 'derived_chunk_residual';
  } else if (projectionFamily === 'vector_index') {
    accepted = before === 1 && after === 0;
    result = accepted ? 'vector_projection_cleared' : 'vector_projection_residual';
  } else if (projectionFamily === 'candidate_cache') {
    accepted = before > 0 && after === 0;
    result = accepted ? 'dependent_entries_cleared' : 'candidate_cache_residual';
  } else if (projectionFamily === 'embedding_cache') {
    accepted = before > 0 && after === 0;
    result = accepted ? 'memory_linked_embedding_entries_cleared' : 'embedding_cache_residual';
  } else if (projectionFamily === 'reconcile_queue') {
    accepted = before > 0 && after === 0;
    result = accepted ? 'pending_reconcile_tasks_cleared' : 'reconcile_queue_residual';
  } else if (projectionFamily === 'degraded_payload') {
    accepted = before > 0 && after === 0;
    result = accepted ? 'degraded_manifest_repaired' : 'degraded_payload_residual';
  }

  return {
    projectionFamily,
    beforeTargetCount: before,
    afterTargetCount: after,
    accepted,
    result
  };
}

async function seedTempStoreBackedLifecycleProjection({
  diaryStore,
  shadowStore,
  vectorStore,
  candidateCacheStore,
  auditLogStore,
  memoryId = 'temp-store-lifecycle-proof-memory',
  target = 'process',
  status = 'active',
  timestamp = '2026-07-06T00:00:00.000Z'
} = {}) {
  const record = buildSyntheticRecord({ memoryId, target, status, timestamp });
  const diaryWrite = await diaryStore.writeRecord(record);
  const storedRecord = {
    ...record,
    filePath: diaryWrite.filePath,
    relativePath: diaryWrite.relativePath,
    rawText: diaryWrite.fileContent
  };

  await ensureLifecycleColumns(shadowStore);
  await shadowStore.upsertRecord(storedRecord);
  shadowStore.db.prepare(`
    UPDATE memory_records
    SET status = ?, lifecycle_updated_at = ?, lifecycle_actor_client_id = ?
    WHERE memory_id = ?
  `).run(status, timestamp, 'codex', memoryId);

  await shadowStore.replaceChunksForRecord(storedRecord, [
    {
      chunkId: `${memoryId}:chunk:0`,
      chunkIndex: 0,
      text: 'Synthetic temp-local chunk one.',
      vector: [1, 0, 0]
    },
    {
      chunkId: `${memoryId}:chunk:1`,
      chunkIndex: 1,
      text: 'Synthetic temp-local chunk two.',
      vector: [0, 1, 0]
    }
  ]);

  await vectorStore.upsertRecord(storedRecord);
  await seedMemoryLinkedEmbeddingCache(vectorStore, { memoryId, target, timestamp });
  await candidateCacheStore.set(`${memoryId}:candidate`, [{ memoryId, target }], {
    target,
    memoryIds: [memoryId]
  });
  await auditLogStore.appendWriteAudit({
    timestamp,
    decision: 'accepted',
    target,
    memoryId,
    requestSource: 'temp-store-lifecycle-proof',
    lowDisclosure: true,
    rawContentIncluded: false
  });
  await auditLogStore.appendRecallAudit({
    timestamp,
    target,
    memoryId,
    memoryIds: [memoryId],
    recallType: 'temp_store_projection_seed',
    resultCount: 1,
    lowDisclosure: true,
    rawContentIncluded: false
  });
  await shadowStore.enqueueReconcileTask({
    memoryId,
    storeKind: 'vector_index',
    reason: 'temp_store_projection_seed',
    payload: { projectionFamily: 'vector_index' },
    createdAt: timestamp
  });
  await shadowStore.enqueueReconcileTask({
    memoryId,
    storeKind: 'sqlite_memory_chunks',
    reason: 'temp_store_projection_seed',
    payload: { projectionFamily: 'sqlite_memory_chunks' },
    createdAt: timestamp
  });

  const idempotencyKey = `${memoryId}:degraded-manifest`;
  await shadowStore.beginMemoryWriteManifest({
    idempotencyKey,
    memoryId,
    canonicalHash: `${memoryId}:canonical-hash`,
    target,
    createdAt: timestamp
  });
  await shadowStore.updateMemoryWriteManifestRecord({
    idempotencyKey,
    record: storedRecord,
    updatedAt: timestamp
  });
  await shadowStore.finalizeMemoryWriteManifest({
    idempotencyKey,
    status: 'degraded',
    result: {
      projectionFamily: 'degraded_payload',
      lowDisclosure: true,
      rawContentIncluded: false
    },
    updatedAt: timestamp
  });

  return {
    record: storedRecord,
    idempotencyKey,
    memoryId,
    target
  };
}

async function applyTempStoreBackedLifecycleSuppression({
  shadowStore,
  vectorStore,
  candidateCacheStore,
  auditLogStore,
  seed,
  lifecycleFamily,
  targetStatus,
  skipProjections,
  timestamp
}) {
  const skipSet = new Set((Array.isArray(skipProjections) ? skipProjections : [])
    .map(normalizeString)
    .filter(Boolean));
  const { memoryId, target, record, idempotencyKey } = seed;

  if (!skipSet.has('sqlite_shadow_record')) {
    await shadowStore.updateLifecycleStatus({
      memoryId,
      fromStatus: 'active',
      toStatus: targetStatus,
      updatedAt: timestamp,
      actorClientId: 'codex',
      reason: lifecycleFamily,
      tombstoneReason: lifecycleFamily === 'tombstone_memory' ? 'temp-store-proof' : null,
      expectedClientId: record.clientId,
      expectedVisibility: record.visibility
    });
  }

  if (!skipSet.has('sqlite_memory_chunks')) {
    await shadowStore.replaceChunksForRecord(record, []);
  }

  if (!skipSet.has('vector_index')) {
    await vectorStore.deleteRecord(memoryId);
  }

  if (!skipSet.has('embedding_cache')) {
    await clearMemoryLinkedEmbeddingCache(vectorStore, memoryId);
  }

  if (!skipSet.has('candidate_cache')) {
    await candidateCacheStore.clearCurrentFingerprintByMemoryIds([memoryId], [target]);
  }

  if (!skipSet.has('reconcile_queue')) {
    await shadowStore.clearReconcileTasks(memoryId);
  }

  if (!skipSet.has('degraded_payload')) {
    await shadowStore.repairDegradedMemoryWriteManifest({
      idempotencyKey,
      status: 'repaired',
      result: {
        projectionFamily: 'degraded_payload',
        repairReason: lifecycleFamily,
        lowDisclosure: true,
        rawContentIncluded: false
      },
      updatedAt: timestamp
    });
  }

  if (!skipSet.has('write_audit')) {
    await auditLogStore.appendWriteAudit({
      timestamp,
      decision: 'accepted',
      target,
      memoryId,
      requestSource: 'temp-store-lifecycle-proof',
      eventType: 'lifecycle_projection_cleanup',
      lifecycleFamily,
      toStatus: targetStatus,
      lowDisclosure: true,
      rawContentIncluded: false
    });
  }

  if (!skipSet.has('recall_audit')) {
    await auditLogStore.appendRecallAudit({
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

async function executeTempStoreBackedLifecycleProjectionProof({
  diaryStore,
  shadowStore,
  vectorStore,
  candidateCacheStore,
  auditLogStore,
  memoryId = 'temp-store-lifecycle-proof-memory',
  target = 'process',
  lifecycleFamily = 'tombstone_memory',
  skipProjections = []
} = {}) {
  const normalizedMemoryId = normalizeString(memoryId);
  const normalizedTarget = normalizeString(target) || 'process';
  const normalizedLifecycleFamily = normalizeString(lifecycleFamily);
  const targetStatus = statusForLifecycleFamily(normalizedLifecycleFamily);
  const blockedReasons = [];

  if (!normalizedMemoryId) blockedReasons.push('target_memory_id_required');
  if (!SUPPRESSING_LIFECYCLE_FAMILIES.includes(normalizedLifecycleFamily) || !targetStatus) {
    blockedReasons.push('unsupported_lifecycle_family_for_temp_store_suppression_proof');
  }
  blockedReasons.push(...collectStoreBlockers({
    diaryStore,
    shadowStore,
    vectorStore,
    candidateCacheStore,
    auditLogStore
  }));

  if (blockedReasons.length > 0) {
    return {
      schemaVersion: EXPECTED_SCHEMA_VERSION,
      version: EXPECTED_VERSION,
      tempStoreBackedProofAccepted: false,
      decision: 'TEMP_STORE_BACKED_LIFECYCLE_PROJECTION_PROOF_BLOCKED',
      lifecycleFamily: normalizedLifecycleFamily,
      targetStatus,
      projectionFamilies: REQUIRED_PROJECTION_FAMILIES,
      blockedReasons: [...new Set(blockedReasons)],
      execution: {
        tempLocalStoreBacked: true,
        syntheticOnly: true,
        liveRuntime: false,
        providerCalls: 0,
        networkCalls: 0,
        rawContentOutput: false,
        readinessClaimed: false
      }
    };
  }

  const seedTimestamp = '2026-07-06T00:00:00.000Z';
  const cleanupTimestamp = '2026-07-06T00:01:00.000Z';
  const seed = await seedTempStoreBackedLifecycleProjection({
    diaryStore,
    shadowStore,
    vectorStore,
    candidateCacheStore,
    auditLogStore,
    memoryId: normalizedMemoryId,
    target: normalizedTarget,
    status: 'active',
    timestamp: seedTimestamp
  });
  const beforeCounts = await countTempStoreProjectionTargets({
    diaryStore,
    shadowStore,
    vectorStore,
    candidateCacheStore,
    auditLogStore,
    memoryId: normalizedMemoryId,
    target: normalizedTarget
  });

  await applyTempStoreBackedLifecycleSuppression({
    shadowStore,
    vectorStore,
    candidateCacheStore,
    auditLogStore,
    seed,
    lifecycleFamily: normalizedLifecycleFamily,
    targetStatus,
    skipProjections,
    timestamp: cleanupTimestamp
  });

  const afterCounts = await countTempStoreProjectionTargets({
    diaryStore,
    shadowStore,
    vectorStore,
    candidateCacheStore,
    auditLogStore,
    memoryId: normalizedMemoryId,
    target: normalizedTarget
  });
  const suppressionStatus = await getSuppressionStatus(shadowStore, normalizedMemoryId);
  const projectionReports = REQUIRED_PROJECTION_FAMILIES.map(projectionFamily =>
    projectionReport({
      projectionFamily,
      beforeCounts,
      afterCounts,
      suppressionStatus,
      targetStatus
    })
  );
  const residualProjectionFamilies = projectionReports
    .filter(report => report.accepted !== true)
    .map(report => report.projectionFamily);
  const accepted = residualProjectionFamilies.length === 0;

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    version: EXPECTED_VERSION,
    tempStoreBackedProofAccepted: accepted,
    decision: accepted
      ? 'TEMP_STORE_BACKED_LIFECYCLE_PROJECTION_PROOF_ACCEPTED_NOT_LIVE_READY'
      : 'TEMP_STORE_BACKED_LIFECYCLE_PROJECTION_PROOF_BLOCKED',
    lifecycleFamily: normalizedLifecycleFamily,
    targetStatus,
    projectionFamilies: REQUIRED_PROJECTION_FAMILIES,
    beforeCounts,
    afterCounts,
    projectionReports,
    residualProjectionFamilies,
    changedMemoryIds: [normalizedMemoryId],
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
      tempLocalStoreBacked: true,
      syntheticOnly: true,
      liveRuntime: false,
      providerCalls: 0,
      networkCalls: 0,
      rawContentOutput: false,
      readinessClaimed: false
    }
  };
}

module.exports = {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  SUPPRESSING_LIFECYCLE_FAMILIES,
  countTempStoreProjectionTargets,
  executeTempStoreBackedLifecycleProjectionProof,
  seedTempStoreBackedLifecycleProjection
};
