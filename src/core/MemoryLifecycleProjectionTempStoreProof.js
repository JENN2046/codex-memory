'use strict';

const {
  REQUIRED_PROJECTION_FAMILIES
} = require('./MemoryLifecycleProjectionCleanupContract');
const {
  MemoryLifecycleProjectionCleanupService
} = require('./MemoryLifecycleProjectionCleanupService');

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

async function countTempStoreProjectionTargets({
  diaryStore,
  shadowStore,
  vectorStore,
  candidateCacheStore,
  auditLogStore,
  memoryId,
  target
}) {
  const cleanupService = new MemoryLifecycleProjectionCleanupService({
    diaryStore,
    shadowStore,
    vectorStore,
    candidateCacheStore,
    auditLogStore
  });
  return cleanupService.countProjectionTargets({
    memoryId,
    target,
    includeAuditCounts: true
  });
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

  const chunkTexts = [
    'Synthetic temp-local chunk one.',
    'Synthetic temp-local chunk two.'
  ];
  const vectors = await vectorStore.getBatchEmbeddingsCached(chunkTexts, { inputKind: 'document' });
  await shadowStore.replaceChunksForRecord(storedRecord, chunkTexts.map((text, index) => ({
    chunkId: `${memoryId}:chunk:${index}`,
    chunkIndex: index,
    text,
    vector: vectors[index] || []
  })));
  shadowStore.db.prepare(`
    INSERT INTO memory_chunks (
      chunk_id, memory_id, target, title, source_file, relative_path, chunk_index,
      text, vector_json, embedding_fingerprint, tags_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `${memoryId}:old-profile:chunk`,
    memoryId,
    target,
    record.title,
    null,
    null,
    99,
    'Synthetic old-profile temp-local chunk.',
    '[]',
    'old-profile-fixture',
    JSON.stringify(record.tags || []),
    timestamp,
    timestamp
  );

  await vectorStore.upsertRecord(storedRecord);
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

  const skipSet = new Set((Array.isArray(skipProjections) ? skipProjections : [])
    .map(normalizeString)
    .filter(Boolean));
  if (!skipSet.has('sqlite_shadow_record')) {
    await shadowStore.updateLifecycleStatus({
      memoryId: normalizedMemoryId,
      fromStatus: 'active',
      toStatus: targetStatus,
      updatedAt: cleanupTimestamp,
      actorClientId: 'codex',
      reason: normalizedLifecycleFamily,
      tombstoneReason: normalizedLifecycleFamily === 'tombstone_memory' ? 'temp-store-proof' : null,
      expectedClientId: seed.record.clientId,
      expectedVisibility: seed.record.visibility
    });
  }

  const cleanupService = new MemoryLifecycleProjectionCleanupService({
    diaryStore,
    shadowStore,
    vectorStore,
    candidateCacheStore,
    auditLogStore
  });
  const cleanupReport = await cleanupService.applySuppression({
    memoryId: normalizedMemoryId,
    target: normalizedTarget,
    lifecycleFamily: normalizedLifecycleFamily,
    targetStatus,
    requestSource: 'temp-store-lifecycle-proof',
    timestamp: cleanupTimestamp,
    appendProjectionAudit: true,
    skipProjections
  });
  const accepted = cleanupReport.accepted === true;

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
    implementationRouteDecision: cleanupReport.decision,
    beforeCounts: cleanupReport.beforeCounts,
    afterCounts: cleanupReport.afterCounts,
    projectionReports: cleanupReport.projectionReports,
    residualProjectionFamilies: cleanupReport.residualProjectionFamilies,
    changedMemoryIds: [normalizedMemoryId],
    suppressionStatus: cleanupReport.suppressionStatus,
    pathPolicy: cleanupReport.pathPolicy,
    execution: {
      tempLocalStoreBacked: true,
      syntheticOnly: true,
      lifecycleProjectionCleanupRoute: true,
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
