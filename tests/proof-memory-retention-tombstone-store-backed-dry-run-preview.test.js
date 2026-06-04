const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  PROOF_MEMORY_RETENTION_POLICY,
  PROOF_MEMORY_TAG,
  PROOF_MEMORY_VISIBILITY
} = require('../src/core/ProofMemoryPolicy');
const {
  REQUIRED_MODE,
  REQUIRED_SCOPE,
  REQUIRED_STORE_PROVENANCE,
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  buildProofMemoryRetentionTombstoneStoreBackedDryRunPreview
} = require('../src/core/ProofMemoryRetentionTombstoneStoreBackedDryRunPreview');
const { SqliteShadowStore } = require('../src/storage/SqliteShadowStore');

async function createTempStore() {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1082-proof-retention-'));
  const config = {
    dbPath: path.join(rootPath, 'shadow', 'memory.sqlite'),
    embeddingFingerprint: 'cm1082-proof-retention-v1'
  };
  const shadowStore = new SqliteShadowStore(config);

  async function cleanup() {
    await shadowStore.close();
    await fs.rm(rootPath, { recursive: true, force: true });
  }

  return {
    cleanup,
    config,
    rootPath,
    shadowStore
  };
}

function processRecord(memoryId, overrides = {}) {
  return {
    memoryId,
    target: 'process',
    title: 'CM1082 proof retention store-backed preview',
    content: 'synthetic temp-local proof retention content that must not appear in preview output',
    evidence: 'synthetic temp-local proof retention evidence that must not appear in preview output',
    tags: ['cm1082'],
    validated: true,
    reusable: false,
    sensitivity: 'none',
    projectId: 'codex-memory',
    workspaceId: 'cm1082-proof-retention-workspace',
    clientId: 'codex',
    taskId: 'CM-1082',
    conversationId: 'cm1082-store-backed-preview',
    visibility: 'project',
    retentionPolicy: 'keep',
    createdAt: '2026-05-24T00:00:00.000Z',
    updatedAt: '2026-05-24T00:00:00.000Z',
    ...overrides
  };
}

function previewInput(overrides = {}) {
  return {
    mode: REQUIRED_MODE,
    scope: REQUIRED_SCOPE,
    storeProvenance: REQUIRED_STORE_PROVENANCE,
    previewOnly: true,
    dryRun: true,
    now: '2026-05-25T00:00:00.000Z',
    retentionAfterValidationMs: 60 * 60 * 1000,
    target: 'process',
    ...overrides
  };
}

test('CM-1082 builds store-backed dry-run tombstone preview from temp-local metadata only', async () => {
  const stores = await createTempStore();
  try {
    await stores.shadowStore.upsertRecord(processRecord('cm1082-proof-eligible', {
      visibility: PROOF_MEMORY_VISIBILITY,
      retentionPolicy: PROOF_MEMORY_RETENTION_POLICY,
      tags: [PROOF_MEMORY_TAG, 'cm1082'],
      updatedAt: '2026-05-24T00:00:00.000Z'
    }));
    await stores.shadowStore.upsertRecord(processRecord('cm1082-ordinary-record', {
      visibility: 'project',
      retentionPolicy: 'keep',
      tags: ['cm1082'],
      updatedAt: '2026-05-23T00:00:00.000Z'
    }));
    await stores.shadowStore.upsertRecord(processRecord('cm1082-recent-proof', {
      visibility: PROOF_MEMORY_VISIBILITY,
      retentionPolicy: PROOF_MEMORY_RETENTION_POLICY,
      tags: [PROOF_MEMORY_TAG, 'cm1082'],
      updatedAt: '2026-05-24T23:45:00.000Z'
    }));

    const candidates = await stores.shadowStore.listProofMemoryRetentionCandidates({ target: 'process', limit: 10 });
    const candidateText = JSON.stringify(candidates);
    assert.equal(candidateText.includes('synthetic temp-local proof retention content'), false);
    assert.equal(candidateText.includes('synthetic temp-local proof retention evidence'), false);

    const beforeHealth = await stores.shadowStore.getHealth();
    const report = await buildProofMemoryRetentionTombstoneStoreBackedDryRunPreview(previewInput({
      stores
    }));
    const afterHealth = await stores.shadowStore.getHealth();

    assert.equal(report.status, RESULT_STATUS_ACCEPTED);
    assert.equal(report.storeBackedDryRunPreviewAccepted, true);
    assert.equal(report.storeReadSummary.readsAttempted, true);
    assert.equal(report.storeReadSummary.storeReadCount, 1);
    assert.equal(report.storeReadSummary.recordCount, 2);
    assert.equal(report.storeReadSummary.proofRecords, 2);
    assert.equal(report.storeReadSummary.eligibleProofRecords, 1);
    assert.equal(report.storeReadSummary.plannedTombstoneActions, 1);
    assert.deepEqual(report.plannedActions, [
      {
        action: 'tombstone_internal_proof_memory',
        applies: false,
        memoryId: 'cm1082-proof-eligible',
        recordIndex: 0,
        fromStatus: 'active',
        toStatus: 'tombstoned',
        reason: 'proof_memory_retention_elapsed_after_validation',
        retentionPolicy: PROOF_MEMORY_RETENTION_POLICY,
        visibility: PROOF_MEMORY_VISIBILITY,
        requiresSeparateApplyApproval: true,
        requiresRuntimeValidationBeforeApply: true,
        auditRequiredBeforeApply: true
      }
    ]);
    assert.equal(report.applyGate.applyAuthorized, false);
    assert.equal(report.applyGate.applyExecuted, false);
    assert.equal(report.applyGate.tombstoneApplyRunsAllowed, 0);
    assert.equal(report.applyGate.nextAllowedAction, 'request_separate_tombstone_apply_approval');
    assert.equal(report.safety.readsStores, true);
    assert.equal(report.safety.writesStores, false);
    assert.equal(report.safety.tombstoneApplyExecuted, false);
    assert.equal(report.safety.mutatesRealMemory, false);
    assert.equal(report.safety.rawMemoryRead, false);
    assert.equal(report.safety.publicMcpExpanded, false);
    assert.equal(afterHealth.recordCount, beforeHealth.recordCount);
  } finally {
    await stores.cleanup();
  }
});

test('CM-1082 blocks before store reads on apply, worker, public MCP, or real-store attempts', async () => {
  let readAttempted = false;
  const report = await buildProofMemoryRetentionTombstoneStoreBackedDryRunPreview(previewInput({
    applyTombstone: true,
    cleanupApply: true,
    rollbackApply: true,
    automaticWorkerEnabled: true,
    publicMcpExpansion: true,
    realStoreMode: true,
    stores: {
      shadowStore: {
        async listProofMemoryRetentionCandidates() {
          readAttempted = true;
          return [];
        }
      }
    }
  }));

  assert.equal(report.status, RESULT_STATUS_BLOCKED);
  assert.equal(report.storeReadSummary.readsAttempted, false);
  assert.equal(readAttempted, false);
  assert.deepEqual(report.blockerReasons.sort(), [
    'automatic_worker_not_authorized',
    'cleanup_apply_not_authorized',
    'public_mcp_expansion_not_authorized',
    'real_store_mode_not_authorized',
    'rollback_apply_not_authorized',
    'tombstone_apply_not_authorized'
  ].sort());
  assert.equal(report.applyGate.applyAuthorized, false);
  assert.equal(report.applyGate.applyExecuted, false);
});

test('CM-1082 normalizes store-backed proof retention fields from snake-case fallbacks', async () => {
  const report = await buildProofMemoryRetentionTombstoneStoreBackedDryRunPreview(previewInput({
    stores: {
      shadowStore: {
        async listProofMemoryRetentionCandidates() {
          return [
            {
              memoryId: '   ',
              memory_id: 'cm1082-proof-snake-fallback',
              target: 'process',
              status: '',
              lifecycle_status: 'active',
              visibility: '   ',
              visibility_policy: PROOF_MEMORY_VISIBILITY,
              retentionPolicy: '   ',
              retention_policy: PROOF_MEMORY_RETENTION_POLICY,
              tags: [PROOF_MEMORY_TAG],
              validationStatus: '',
              validation_status: 'accepted',
              validatedAt: '   ',
              validated_at: '2026-05-24T00:00:00.000Z'
            }
          ];
        }
      }
    }
  }));

  assert.equal(report.status, RESULT_STATUS_ACCEPTED);
  assert.equal(report.storeReadSummary.proofRecords, 1);
  assert.equal(report.storeReadSummary.eligibleProofRecords, 1);
  assert.deepEqual(report.plannedActions.map(action => action.memoryId), [
    'cm1082-proof-snake-fallback'
  ]);
});

test('CM-1082 blocks before store reads when temp-local provenance or store helper is missing', async () => {
  const report = await buildProofMemoryRetentionTombstoneStoreBackedDryRunPreview(previewInput({
    storeProvenance: 'real_store',
    stores: {
      shadowStore: {}
    }
  }));

  assert.equal(report.status, RESULT_STATUS_BLOCKED);
  assert.equal(report.storeReadSummary.readsAttempted, false);
  assert.ok(report.blockerReasons.includes('store_provenance_must_be_temp_local_fixture'));
  assert.ok(report.blockerReasons.includes('shadowStore_listProofMemoryRetentionCandidates_missing'));
});

test('CM-1082 fails closed when store read returns malformed result or throws', async () => {
  const malformedReport = await buildProofMemoryRetentionTombstoneStoreBackedDryRunPreview(previewInput({
    stores: {
      shadowStore: {
        async listProofMemoryRetentionCandidates() {
          return null;
        }
      }
    }
  }));
  const thrownReport = await buildProofMemoryRetentionTombstoneStoreBackedDryRunPreview(previewInput({
    stores: {
      shadowStore: {
        async listProofMemoryRetentionCandidates() {
          throw new Error('synthetic store failure');
        }
      }
    }
  }));

  assert.equal(malformedReport.status, RESULT_STATUS_BLOCKED);
  assert.equal(malformedReport.storeReadSummary.readsAttempted, true);
  assert.ok(malformedReport.blockerReasons.includes('store_read_result_must_be_array'));
  assert.equal(thrownReport.status, RESULT_STATUS_BLOCKED);
  assert.equal(thrownReport.storeReadSummary.readsAttempted, true);
  assert.ok(thrownReport.blockerReasons.includes('store_read_failed'));
});

test('public MCP tool schemas remain frozen for CM-1082 store-backed dry-run preview', () => {
  const names = TOOL_DEFINITIONS.map(tool => tool.name).sort();
  assert.deepEqual(names, ['audit_memory', 'memory_overview', 'record_memory', 'search_memory']);

  const recordSchema = TOOL_DEFINITIONS.find(tool => tool.name === 'record_memory');
  const searchSchema = TOOL_DEFINITIONS.find(tool => tool.name === 'search_memory');
  assert.equal(Object.hasOwn(recordSchema.inputSchema.properties, 'proof_memory'), false);
  assert.equal(Object.hasOwn(searchSchema.inputSchema.properties, 'include_proof_memory'), false);
  assert.equal(Object.hasOwn(recordSchema.inputSchema.properties, 'tombstone_proof_memory'), false);
  assert.equal(Object.hasOwn(searchSchema.inputSchema.properties, 'include_tombstoned_proof_memory'), false);
});
