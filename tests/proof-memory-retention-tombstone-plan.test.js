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
  PLAN_STATUS_BLOCKED,
  PLAN_STATUS_PASSED,
  REQUIRED_MODE,
  REQUIRED_SCOPE,
  buildProofMemoryRetentionTombstonePlan
} = require('../src/core/ProofMemoryRetentionTombstonePlan');

async function withTempFixture(records, handler) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-proof-retention-'));
  const fixturePath = path.join(tempDir, 'synthetic-proof-records.json');
  await fs.writeFile(fixturePath, JSON.stringify({ records }, null, 2));

  try {
    const text = await fs.readFile(fixturePath, 'utf8');
    await handler(JSON.parse(text), fixturePath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test('builds no-apply tombstone actions for elapsed validated proof memories from temp-local fixture', async () => {
  const records = [
    {
      memoryId: 'cm1081-proof-eligible',
      visibility: PROOF_MEMORY_VISIBILITY,
      retentionPolicy: PROOF_MEMORY_RETENTION_POLICY,
      tags: ['cm1081'],
      status: 'active',
      validationStatus: 'accepted',
      validatedAt: '2026-05-24T00:00:00.000Z'
    }
  ];
  const original = JSON.parse(JSON.stringify(records));

  await withTempFixture(records, async fixture => {
    const result = buildProofMemoryRetentionTombstonePlan({
      mode: REQUIRED_MODE,
      scope: REQUIRED_SCOPE,
      now: '2026-05-25T00:00:00.000Z',
      retentionAfterValidationMs: 60 * 60 * 1000,
      records: fixture.records
    });

    assert.equal(result.status, PLAN_STATUS_PASSED);
    assert.equal(result.accepted, true);
    assert.deepEqual(result.blockedReasons, []);
    assert.equal(result.counters.inspectedRecords, 1);
    assert.equal(result.counters.proofRecords, 1);
    assert.equal(result.counters.eligibleProofRecords, 1);
    assert.equal(result.counters.plannedTombstoneActions, 1);
    assert.deepEqual(result.plannedActions, [
      {
        action: 'tombstone_internal_proof_memory',
        applies: false,
        memoryId: 'cm1081-proof-eligible',
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
    assert.equal(result.safety.tempLocalOnly, true);
    assert.equal(result.safety.mutatesRealMemory, false);
    assert.equal(result.safety.tombstonesRealProofRecords, false);
    assert.equal(result.safety.automaticWorkerStarted, false);
    assert.deepEqual(fixture.records, original);
  });
});

test('keeps ordinary, unvalidated, recent, and already tombstoned records out of planned actions', () => {
  const result = buildProofMemoryRetentionTombstonePlan({
    mode: REQUIRED_MODE,
    scope: REQUIRED_SCOPE,
    now: '2026-05-25T00:00:00.000Z',
    retentionAfterValidationMs: 24 * 60 * 60 * 1000,
    records: [
      {
        memoryId: 'ordinary-record',
        visibility: 'public',
        retentionPolicy: 'keep',
        validationStatus: 'accepted',
        validatedAt: '2026-05-20T00:00:00.000Z'
      },
      {
        memoryId: 'unvalidated-proof',
        visibility: PROOF_MEMORY_VISIBILITY,
        retentionPolicy: PROOF_MEMORY_RETENTION_POLICY,
        validationStatus: 'pending',
        validatedAt: '2026-05-20T00:00:00.000Z'
      },
      {
        memoryId: 'recent-proof',
        tags: [PROOF_MEMORY_TAG],
        validationStatus: 'accepted',
        validatedAt: '2026-05-24T12:00:00.000Z'
      },
      {
        memoryId: 'already-tombstoned-proof',
        visibility: PROOF_MEMORY_VISIBILITY,
        validationStatus: 'accepted',
        validatedAt: '2026-05-20T00:00:00.000Z',
        status: 'tombstoned'
      }
    ]
  });

  assert.equal(result.status, PLAN_STATUS_PASSED);
  assert.equal(result.counters.inspectedRecords, 4);
  assert.equal(result.counters.proofRecords, 3);
  assert.equal(result.counters.eligibleProofRecords, 0);
  assert.equal(result.counters.plannedTombstoneActions, 0);
  assert.deepEqual(result.plannedActions, []);
});

test('fails closed when caller attempts apply, real-store mode, public MCP expansion, or worker startup', () => {
  const result = buildProofMemoryRetentionTombstonePlan({
    mode: REQUIRED_MODE,
    scope: REQUIRED_SCOPE,
    applyTombstone: true,
    cleanupApply: true,
    rollbackApply: true,
    automaticWorkerEnabled: true,
    publicMcpExpansion: true,
    realStoreMode: true,
    records: []
  });

  assert.equal(result.status, PLAN_STATUS_BLOCKED);
  assert.equal(result.accepted, false);
  assert.deepEqual(result.plannedActions, []);
  assert.deepEqual(result.blockedReasons.sort(), [
    'automatic_worker_not_authorized',
    'cleanup_apply_not_authorized',
    'public_mcp_expansion_not_authorized',
    'real_store_mode_not_authorized',
    'rollback_apply_not_authorized',
    'tombstone_apply_not_authorized'
  ].sort());
  assert.equal(result.safety.mutatesRealMemory, false);
  assert.equal(result.safety.cleanupApplyExecuted, false);
  assert.equal(result.safety.rollbackApplyExecuted, false);
});

test('public MCP tool schemas remain frozen for proof retention/tombstone design helper', () => {
  const names = TOOL_DEFINITIONS.map(tool => tool.name).sort();
  assert.deepEqual(names, ['memory_overview', 'record_memory', 'search_memory']);

  const recordSchema = TOOL_DEFINITIONS.find(tool => tool.name === 'record_memory');
  const searchSchema = TOOL_DEFINITIONS.find(tool => tool.name === 'search_memory');
  assert.equal(Object.hasOwn(recordSchema.inputSchema.properties, 'proof_memory'), false);
  assert.equal(Object.hasOwn(searchSchema.inputSchema.properties, 'include_proof_memory'), false);
  assert.equal(Object.hasOwn(recordSchema.inputSchema.properties, 'tombstone_proof_memory'), false);
  assert.equal(Object.hasOwn(searchSchema.inputSchema.properties, 'include_tombstoned_proof_memory'), false);
});
