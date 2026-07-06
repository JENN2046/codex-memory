'use strict';

const {
  REQUIRED_PROJECTION_FAMILIES
} = require('./MemoryLifecycleProjectionCleanupContract');

const EXPECTED_SCHEMA_VERSION = 'memory-lifecycle-projection-runtime-proof-v1';
const EXPECTED_VERSION = 'v1';

const SUPPRESSING_LIFECYCLE_FAMILIES = Object.freeze([
  'tombstone_memory',
  'supersede_memory',
  'memory_exclude',
  'memory_forget'
]);

const ACTIVATING_LIFECYCLE_FAMILIES = Object.freeze([
  'validate_memory'
]);

const REQUIRED_FIXTURE_STORES = Object.freeze([
  'diaryRecords',
  'sqliteShadowRecords',
  'sqliteMemoryChunks',
  'vectorIndex',
  'embeddingCache',
  'candidateCache',
  'writeAudit',
  'recallAudit',
  'reconcileQueue',
  'degradedPayloads'
]);

const PROJECTION_TO_FIXTURE_STORE = Object.freeze({
  diary_record: 'diaryRecords',
  sqlite_shadow_record: 'sqliteShadowRecords',
  sqlite_memory_chunks: 'sqliteMemoryChunks',
  vector_index: 'vectorIndex',
  embedding_cache: 'embeddingCache',
  candidate_cache: 'candidateCache',
  write_audit: 'writeAudit',
  recall_audit: 'recallAudit',
  reconcile_queue: 'reconcileQueue',
  degraded_payload: 'degradedPayloads'
});

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getMemoryId(value = {}) {
  return normalizeString(value.memoryId || value.memory_id);
}

function countByMemoryId(items = [], memoryId) {
  return items.filter(item => getMemoryId(item) === memoryId).length;
}

function candidateEntryReferencesMemory(entry = {}, memoryId) {
  const memoryIds = Array.isArray(entry.memoryIds) ? entry.memoryIds : [];
  const valueItems = Array.isArray(entry.value) ? entry.value : [];
  return memoryIds.map(normalizeString).includes(memoryId) ||
    valueItems.some(item => getMemoryId(item) === memoryId);
}

function createFixtureBackedLifecycleProjectionSeed({
  memoryId = 'fixture-memory-1',
  target = 'process',
  status = 'active',
  governanceRevision = 'rev-before'
} = {}) {
  const createdAt = '2026-07-06T00:00:00.000Z';

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    version: EXPECTED_VERSION,
    fixtureOnly: true,
    targetMemoryId: memoryId,
    target,
    governanceRevision,
    stores: {
      diaryRecords: [
        {
          memoryId,
          target,
          status,
          retained: true,
          suppressed: false,
          searchable: true,
          rawTextPresent: true,
          createdAt
        }
      ],
      sqliteShadowRecords: [
        {
          memoryId,
          target,
          status,
          lifecycleRevision: governanceRevision,
          searchable: true,
          updatedAt: createdAt
        }
      ],
      sqliteMemoryChunks: [
        {
          chunkId: `${memoryId}:chunk:0`,
          memoryId,
          target,
          searchable: true,
          suppressed: false
        },
        {
          chunkId: `${memoryId}:chunk:1`,
          memoryId,
          target,
          searchable: true,
          suppressed: false
        }
      ],
      vectorIndex: [
        {
          memoryId,
          target,
          present: true,
          searchable: true
        }
      ],
      embeddingCache: [
        {
          cacheKey: `${memoryId}:embedding`,
          memoryId,
          target,
          present: true
        }
      ],
      candidateCache: [
        {
          cacheKey: `${memoryId}:candidate`,
          target,
          memoryIds: [memoryId],
          value: [{ memoryId, target }],
          embeddingFingerprint: 'fixture-fingerprint',
          governanceRevision,
          projectionRechecked: false
        }
      ],
      writeAudit: [
        {
          eventType: 'memory_write',
          phase: 'committed',
          memoryId,
          appendOnly: true,
          lowDisclosure: true
        }
      ],
      recallAudit: [
        {
          eventType: 'memory_recall',
          phase: 'hit',
          memoryId,
          appendOnly: true,
          lowDisclosure: true
        }
      ],
      reconcileQueue: [
        {
          taskId: `${memoryId}:reconcile:vector`,
          memoryId,
          storeKind: 'vector_index',
          pending: true
        },
        {
          taskId: `${memoryId}:reconcile:chunks`,
          memoryId,
          storeKind: 'sqlite_memory_chunks',
          pending: true
        }
      ],
      degradedPayloads: [
        {
          payloadId: `${memoryId}:degraded`,
          memoryId,
          storeKind: 'shadow_write',
          present: true,
          blockedUntilReconciled: false
        }
      ]
    }
  };
}

function collectCoverageBlockers(fixture, memoryId) {
  const blockers = [];
  const stores = isPlainObject(fixture?.stores) ? fixture.stores : {};

  for (const storeName of REQUIRED_FIXTURE_STORES) {
    if (!Array.isArray(stores[storeName])) {
      blockers.push(`${storeName}_missing`);
    }
  }

  for (const projectionFamily of REQUIRED_PROJECTION_FAMILIES) {
    const storeName = PROJECTION_TO_FIXTURE_STORE[projectionFamily];
    const items = Array.isArray(stores[storeName]) ? stores[storeName] : [];
    const hasTarget = projectionFamily === 'candidate_cache'
      ? items.some(item => candidateEntryReferencesMemory(item, memoryId))
      : countByMemoryId(items, memoryId) > 0;
    if (!hasTarget) {
      blockers.push(`${projectionFamily}_target_seed_missing`);
    }
  }

  return blockers;
}

function statusForLifecycleFamily(lifecycleFamily) {
  if (lifecycleFamily === 'validate_memory') return 'active';
  if (lifecycleFamily === 'tombstone_memory') return 'tombstoned';
  if (lifecycleFamily === 'supersede_memory') return 'superseded';
  if (lifecycleFamily === 'memory_exclude') return 'excluded';
  if (lifecycleFamily === 'memory_forget') return 'forgotten';
  return '';
}

function countProjectionTargets(stores, memoryId) {
  return {
    diary_record: countByMemoryId(stores.diaryRecords, memoryId),
    sqlite_shadow_record: countByMemoryId(stores.sqliteShadowRecords, memoryId),
    sqlite_memory_chunks: countByMemoryId(stores.sqliteMemoryChunks, memoryId),
    vector_index: countByMemoryId(stores.vectorIndex, memoryId),
    embedding_cache: countByMemoryId(stores.embeddingCache, memoryId),
    candidate_cache: stores.candidateCache
      .filter(item => candidateEntryReferencesMemory(item, memoryId)).length,
    write_audit: countByMemoryId(stores.writeAudit, memoryId),
    recall_audit: countByMemoryId(stores.recallAudit, memoryId),
    reconcile_queue: countByMemoryId(stores.reconcileQueue, memoryId),
    degraded_payload: countByMemoryId(stores.degradedPayloads, memoryId)
  };
}

function appendLowDisclosureAudit(stores, { lifecycleFamily, memoryId, targetStatus, governanceRevision }) {
  stores.writeAudit.push({
    eventType: 'lifecycle_projection_cleanup',
    lifecycleFamily,
    memoryId,
    toStatus: targetStatus,
    governanceRevision,
    appendOnly: true,
    lowDisclosure: true,
    rawContentIncluded: false
  });
  stores.recallAudit.push({
    eventType: 'lifecycle_suppression_projection_recheck',
    lifecycleFamily,
    memoryId,
    toStatus: targetStatus,
    governanceRevision,
    appendOnly: true,
    lowDisclosure: true,
    rawContentIncluded: false
  });
}

function applySuppressingProjectionUpdate(stores, { memoryId, targetStatus, governanceRevision, skipProjections }) {
  if (!skipProjections.has('diary_record')) {
    for (const record of stores.diaryRecords) {
      if (getMemoryId(record) !== memoryId) continue;
      record.status = targetStatus;
      record.retained = true;
      record.suppressed = true;
      record.searchable = false;
    }
  }

  if (!skipProjections.has('sqlite_shadow_record')) {
    for (const record of stores.sqliteShadowRecords) {
      if (getMemoryId(record) !== memoryId) continue;
      record.status = targetStatus;
      record.lifecycleRevision = governanceRevision;
      record.searchable = false;
    }
  }

  if (!skipProjections.has('sqlite_memory_chunks')) {
    stores.sqliteMemoryChunks = stores.sqliteMemoryChunks
      .filter(chunk => getMemoryId(chunk) !== memoryId);
  }

  if (!skipProjections.has('vector_index')) {
    stores.vectorIndex = stores.vectorIndex
      .filter(entry => getMemoryId(entry) !== memoryId);
  }

  if (!skipProjections.has('embedding_cache')) {
    stores.embeddingCache = stores.embeddingCache
      .filter(entry => getMemoryId(entry) !== memoryId);
  }

  if (!skipProjections.has('candidate_cache')) {
    stores.candidateCache = stores.candidateCache
      .filter(entry => !candidateEntryReferencesMemory(entry, memoryId));
    stores.candidateCache.push({
      cacheKey: `${memoryId}:projection-recheck`,
      target: 'process',
      memoryIds: [],
      value: [],
      governanceRevision,
      projectionRechecked: true
    });
  }

  if (!skipProjections.has('reconcile_queue')) {
    stores.reconcileQueue = stores.reconcileQueue
      .filter(task => getMemoryId(task) !== memoryId);
  }

  if (!skipProjections.has('degraded_payload')) {
    stores.degradedPayloads = stores.degradedPayloads
      .filter(payload => getMemoryId(payload) !== memoryId);
  }
}

function applyActivatingProjectionUpdate(stores, { memoryId, targetStatus, governanceRevision, skipProjections }) {
  if (!skipProjections.has('diary_record')) {
    for (const record of stores.diaryRecords) {
      if (getMemoryId(record) !== memoryId) continue;
      record.status = targetStatus;
      record.retained = true;
      record.suppressed = false;
      record.searchable = true;
    }
  }

  if (!skipProjections.has('sqlite_shadow_record')) {
    for (const record of stores.sqliteShadowRecords) {
      if (getMemoryId(record) !== memoryId) continue;
      record.status = targetStatus;
      record.lifecycleRevision = governanceRevision;
      record.searchable = true;
    }
  }

  if (!skipProjections.has('embedding_cache')) {
    stores.embeddingCache = stores.embeddingCache
      .filter(entry => getMemoryId(entry) !== memoryId);
  }

  if (!skipProjections.has('candidate_cache')) {
    stores.candidateCache = stores.candidateCache
      .filter(entry => !candidateEntryReferencesMemory(entry, memoryId));
    stores.candidateCache.push({
      cacheKey: `${memoryId}:active-projection-recheck`,
      target: 'process',
      memoryIds: [],
      value: [],
      governanceRevision,
      projectionRechecked: true
    });
  }

  if (!skipProjections.has('reconcile_queue')) {
    stores.reconcileQueue = stores.reconcileQueue
      .filter(task => getMemoryId(task) !== memoryId);
  }

  if (!skipProjections.has('degraded_payload')) {
    stores.degradedPayloads = stores.degradedPayloads
      .filter(payload => getMemoryId(payload) !== memoryId);
  }
}

function projectionReport({ projectionFamily, beforeCounts, afterCounts, beforeStores, afterStores, memoryId, suppressing }) {
  const before = beforeCounts[projectionFamily] || 0;
  const after = afterCounts[projectionFamily] || 0;
  let accepted = false;
  let result = 'not_checked';

  if (projectionFamily === 'diary_record') {
    const record = afterStores.diaryRecords.find(item => getMemoryId(item) === memoryId);
    accepted = Boolean(record) &&
      record.retained === true &&
      record.suppressed === suppressing &&
      record.searchable === !suppressing;
    result = accepted ? 'retained_with_expected_suppression' : 'diary_suppression_mismatch';
  } else if (projectionFamily === 'sqlite_shadow_record') {
    const record = afterStores.sqliteShadowRecords.find(item => getMemoryId(item) === memoryId);
    accepted = Boolean(record) && record.searchable === !suppressing;
    result = accepted ? 'status_projection_updated' : 'status_projection_mismatch';
  } else if (projectionFamily === 'write_audit' || projectionFamily === 'recall_audit') {
    accepted = after === before + 1;
    result = accepted ? 'append_only_low_disclosure_event_added' : 'audit_append_only_mismatch';
  } else if (projectionFamily === 'candidate_cache') {
    const recheckPresent = afterStores.candidateCache
      .some(entry => entry.projectionRechecked === true && !candidateEntryReferencesMemory(entry, memoryId));
    accepted = after === 0 && recheckPresent;
    result = accepted ? 'dependent_entries_cleared_and_rechecked' : 'candidate_cache_residual';
  } else if (projectionFamily === 'sqlite_memory_chunks') {
    accepted = suppressing ? after === 0 : after === before;
    result = accepted ? 'derived_chunk_projection_expected' : 'derived_chunk_residual';
  } else if (projectionFamily === 'vector_index') {
    accepted = suppressing ? after === 0 : after === before;
    result = accepted ? 'vector_projection_expected' : 'vector_projection_residual';
  } else if (
    projectionFamily === 'embedding_cache' ||
    projectionFamily === 'reconcile_queue' ||
    projectionFamily === 'degraded_payload'
  ) {
    accepted = after === 0;
    result = accepted ? 'dependent_entries_cleared' : 'dependent_entry_residual';
  }

  return {
    projectionFamily,
    beforeTargetCount: before,
    afterTargetCount: after,
    accepted,
    result
  };
}

function executeFixtureBackedLifecycleProjectionRuntimeProof({
  fixture,
  lifecycleFamily = 'tombstone_memory',
  targetMemoryId = null,
  skipProjections = []
} = {}) {
  const normalizedLifecycleFamily = normalizeString(lifecycleFamily);
  const memoryId = normalizeString(targetMemoryId || fixture?.targetMemoryId);
  const targetStatus = statusForLifecycleFamily(normalizedLifecycleFamily);
  const suppressing = SUPPRESSING_LIFECYCLE_FAMILIES.includes(normalizedLifecycleFamily);
  const activating = ACTIVATING_LIFECYCLE_FAMILIES.includes(normalizedLifecycleFamily);
  const blockedReasons = [];

  if (!memoryId) blockedReasons.push('target_memory_id_required');
  if (!targetStatus || (!suppressing && !activating)) {
    blockedReasons.push('unsupported_lifecycle_family');
  }

  blockedReasons.push(...collectCoverageBlockers(fixture, memoryId));

  if (blockedReasons.length > 0) {
    return {
      schemaVersion: EXPECTED_SCHEMA_VERSION,
      version: EXPECTED_VERSION,
      fixtureBackedRuntimeProofAccepted: false,
      decision: 'FIXTURE_BACKED_LIFECYCLE_PROJECTION_RUNTIME_PROOF_BLOCKED',
      lifecycleFamily: normalizedLifecycleFamily,
      targetStatus,
      projectionFamilies: REQUIRED_PROJECTION_FAMILIES,
      blockedReasons: [...new Set(blockedReasons)],
      execution: {
        fixtureOnly: true,
        mutatedFixture: false,
        liveRuntime: false,
        providerCalls: 0,
        rawContentOutput: false,
        readinessClaimed: false
      }
    };
  }

  const beforeFixture = deepClone(fixture);
  const afterFixture = deepClone(fixture);
  const stores = afterFixture.stores;
  const beforeCounts = countProjectionTargets(beforeFixture.stores, memoryId);
  const governanceRevision = `${normalizeString(fixture.governanceRevision) || 'rev-before'}:${normalizedLifecycleFamily}`;
  const skipSet = new Set((Array.isArray(skipProjections) ? skipProjections : [])
    .map(normalizeString)
    .filter(Boolean));

  if (suppressing) {
    applySuppressingProjectionUpdate(stores, {
      memoryId,
      targetStatus,
      governanceRevision,
      skipProjections: skipSet
    });
  } else {
    applyActivatingProjectionUpdate(stores, {
      memoryId,
      targetStatus,
      governanceRevision,
      skipProjections: skipSet
    });
  }

  if (!skipSet.has('write_audit') && !skipSet.has('recall_audit')) {
    appendLowDisclosureAudit(stores, {
      lifecycleFamily: normalizedLifecycleFamily,
      memoryId,
      targetStatus,
      governanceRevision
    });
  }

  const afterCounts = countProjectionTargets(stores, memoryId);
  const projectionReports = REQUIRED_PROJECTION_FAMILIES.map(projectionFamily =>
    projectionReport({
      projectionFamily,
      beforeCounts,
      afterCounts,
      beforeStores: beforeFixture.stores,
      afterStores: stores,
      memoryId,
      suppressing
    })
  );
  const residualProjectionFamilies = projectionReports
    .filter(report => report.accepted !== true)
    .map(report => report.projectionFamily);
  const accepted = residualProjectionFamilies.length === 0;

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    version: EXPECTED_VERSION,
    fixtureBackedRuntimeProofAccepted: accepted,
    decision: accepted
      ? 'FIXTURE_BACKED_LIFECYCLE_PROJECTION_RUNTIME_PROOF_ACCEPTED_NOT_LIVE_READY'
      : 'FIXTURE_BACKED_LIFECYCLE_PROJECTION_RUNTIME_PROOF_BLOCKED',
    lifecycleFamily: normalizedLifecycleFamily,
    targetStatus,
    projectionFamilies: REQUIRED_PROJECTION_FAMILIES,
    beforeCounts,
    afterCounts,
    projectionReports,
    residualProjectionFamilies,
    changedMemoryIds: [memoryId],
    governanceRevision,
    execution: {
      fixtureOnly: true,
      mutatedFixture: true,
      liveRuntime: false,
      providerCalls: 0,
      rawContentOutput: false,
      readinessClaimed: false
    },
    afterFixture
  };
}

module.exports = {
  ACTIVATING_LIFECYCLE_FAMILIES,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  REQUIRED_FIXTURE_STORES,
  SUPPRESSING_LIFECYCLE_FAMILIES,
  createFixtureBackedLifecycleProjectionSeed,
  executeFixtureBackedLifecycleProjectionRuntimeProof
};
