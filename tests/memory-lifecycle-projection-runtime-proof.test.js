'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  REQUIRED_PROJECTION_FAMILIES
} = require('../src/core/MemoryLifecycleProjectionCleanupContract');
const {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  createFixtureBackedLifecycleProjectionSeed,
  executeFixtureBackedLifecycleProjectionRuntimeProof
} = require('../src/core/MemoryLifecycleProjectionRuntimeProof');

function reportFor(report, projectionFamily) {
  return report.projectionReports.find(item => item.projectionFamily === projectionFamily);
}

test('fixture-backed tombstone proof cleans or suppresses every derived projection', () => {
  const fixture = createFixtureBackedLifecycleProjectionSeed({
    memoryId: 'fixture-memory-cleanup-proof',
    status: 'active'
  });
  const report = executeFixtureBackedLifecycleProjectionRuntimeProof({
    fixture,
    lifecycleFamily: 'tombstone_memory'
  });

  assert.equal(report.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(report.version, EXPECTED_VERSION);
  assert.equal(report.fixtureBackedRuntimeProofAccepted, true);
  assert.equal(report.decision, 'FIXTURE_BACKED_LIFECYCLE_PROJECTION_RUNTIME_PROOF_ACCEPTED_NOT_LIVE_READY');
  assert.equal(report.lifecycleFamily, 'tombstone_memory');
  assert.equal(report.targetStatus, 'tombstoned');
  assert.deepEqual(report.projectionFamilies, REQUIRED_PROJECTION_FAMILIES);
  assert.deepEqual(report.changedMemoryIds, ['fixture-memory-cleanup-proof']);
  assert.deepEqual(report.residualProjectionFamilies, []);
  assert.equal(report.execution.fixtureOnly, true);
  assert.equal(report.execution.liveRuntime, false);
  assert.equal(report.execution.providerCalls, 0);
  assert.equal(report.execution.rawContentOutput, false);
  assert.equal(report.execution.readinessClaimed, false);

  assert.deepEqual(report.beforeCounts, {
    diary_record: 1,
    sqlite_shadow_record: 1,
    sqlite_memory_chunks: 2,
    vector_index: 1,
    embedding_cache: 1,
    candidate_cache: 1,
    write_audit: 1,
    recall_audit: 1,
    reconcile_queue: 2,
    degraded_payload: 1
  });
  assert.deepEqual(report.afterCounts, {
    diary_record: 1,
    sqlite_shadow_record: 1,
    sqlite_memory_chunks: 0,
    vector_index: 0,
    embedding_cache: 0,
    candidate_cache: 0,
    write_audit: 2,
    recall_audit: 2,
    reconcile_queue: 0,
    degraded_payload: 0
  });

  for (const projectionFamily of REQUIRED_PROJECTION_FAMILIES) {
    assert.equal(reportFor(report, projectionFamily).accepted, true, projectionFamily);
  }

  const after = report.afterFixture.stores;
  const diary = after.diaryRecords[0];
  const sqlite = after.sqliteShadowRecords[0];
  const writeAudit = after.writeAudit.at(-1);
  const recallAudit = after.recallAudit.at(-1);
  const cacheRecheck = after.candidateCache.find(entry => entry.projectionRechecked === true);

  assert.equal(diary.retained, true);
  assert.equal(diary.suppressed, true);
  assert.equal(diary.searchable, false);
  assert.equal(sqlite.status, 'tombstoned');
  assert.equal(sqlite.searchable, false);
  assert.match(sqlite.lifecycleRevision, /tombstone_memory$/);
  assert.equal(writeAudit.eventType, 'lifecycle_projection_cleanup');
  assert.equal(writeAudit.lowDisclosure, true);
  assert.equal(writeAudit.rawContentIncluded, false);
  assert.equal(recallAudit.eventType, 'lifecycle_suppression_projection_recheck');
  assert.equal(recallAudit.lowDisclosure, true);
  assert.equal(recallAudit.rawContentIncluded, false);
  assert.equal(cacheRecheck.memoryIds.length, 0);
  assert.equal(cacheRecheck.value.length, 0);
});

test('fixture-backed validate proof reactivates canonical projections and invalidates dependent caches', () => {
  const fixture = createFixtureBackedLifecycleProjectionSeed({
    memoryId: 'fixture-memory-validate-proof',
    status: 'proposal'
  });
  fixture.stores.diaryRecords[0].suppressed = true;
  fixture.stores.diaryRecords[0].searchable = false;
  fixture.stores.sqliteShadowRecords[0].searchable = false;

  const report = executeFixtureBackedLifecycleProjectionRuntimeProof({
    fixture,
    lifecycleFamily: 'validate_memory'
  });

  assert.equal(report.fixtureBackedRuntimeProofAccepted, true);
  assert.equal(report.targetStatus, 'active');
  assert.deepEqual(report.residualProjectionFamilies, []);
  assert.equal(report.afterCounts.sqlite_memory_chunks, 2);
  assert.equal(report.afterCounts.vector_index, 1);
  assert.equal(report.afterCounts.embedding_cache, 0);
  assert.equal(report.afterCounts.candidate_cache, 0);
  assert.equal(report.afterCounts.reconcile_queue, 0);
  assert.equal(report.afterCounts.degraded_payload, 0);
  assert.equal(report.afterFixture.stores.diaryRecords[0].suppressed, false);
  assert.equal(report.afterFixture.stores.diaryRecords[0].searchable, true);
  assert.equal(report.afterFixture.stores.sqliteShadowRecords[0].searchable, true);
});

test('fixture-backed proof fails closed when a projection seed is absent', () => {
  const fixture = createFixtureBackedLifecycleProjectionSeed({
    memoryId: 'fixture-memory-missing-projection'
  });
  fixture.stores.degradedPayloads = [];

  const report = executeFixtureBackedLifecycleProjectionRuntimeProof({
    fixture,
    lifecycleFamily: 'tombstone_memory'
  });

  assert.equal(report.fixtureBackedRuntimeProofAccepted, false);
  assert.equal(report.decision, 'FIXTURE_BACKED_LIFECYCLE_PROJECTION_RUNTIME_PROOF_BLOCKED');
  assert.ok(report.blockedReasons.includes('degraded_payload_target_seed_missing'));
  assert.equal(report.execution.mutatedFixture, false);
  assert.equal(report.execution.liveRuntime, false);
  assert.equal(report.execution.readinessClaimed, false);
});

test('fixture-backed proof fails closed when candidate-cache cleanup is skipped', () => {
  const fixture = createFixtureBackedLifecycleProjectionSeed({
    memoryId: 'fixture-memory-cache-residual'
  });

  const report = executeFixtureBackedLifecycleProjectionRuntimeProof({
    fixture,
    lifecycleFamily: 'tombstone_memory',
    skipProjections: ['candidate_cache']
  });

  assert.equal(report.fixtureBackedRuntimeProofAccepted, false);
  assert.deepEqual(report.residualProjectionFamilies, ['candidate_cache']);
  assert.equal(report.afterCounts.candidate_cache, 1);
  assert.equal(reportFor(report, 'candidate_cache').result, 'candidate_cache_residual');
});
