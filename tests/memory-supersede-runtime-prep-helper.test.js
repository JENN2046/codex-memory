const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  SUPPORTED_RUNTIME_PREP_FAMILIES,
  normalizeMemorySupersedeRuntimePrepInput,
  planMemorySupersedeRuntimePrep
} = require('../src/core/MemorySupersedeRuntimePrepHelper');

const pairContractFixturePath = path.join(__dirname, 'fixtures', 'memory-supersede-pair-outcome-v1.json');
const seamContractFixturePath = path.join(__dirname, 'fixtures', 'memory-supersede-shadow-seam-v1.json');
const packetContractFixturePath = path.join(__dirname, 'fixtures', 'durable-governance-mutation-packet-v1.json');
const requestFixturePath = path.join(__dirname, 'fixtures', 'memory-supersede-runtime-prep-request-v1.json');
const projectionRecordsFixturePath = path.join(__dirname, 'fixtures', 'durable-governance-shadow-projection-records-v1.json');

function loadPairContractFixture() {
  return JSON.parse(fs.readFileSync(pairContractFixturePath, 'utf8'));
}

function loadSeamContractFixture() {
  return JSON.parse(fs.readFileSync(seamContractFixturePath, 'utf8'));
}

function loadPacketContractFixture() {
  return JSON.parse(fs.readFileSync(packetContractFixturePath, 'utf8'));
}

function loadRequestFixture() {
  return JSON.parse(fs.readFileSync(requestFixturePath, 'utf8'));
}

function loadProjectionRecordsFixture() {
  return JSON.parse(fs.readFileSync(projectionRecordsFixturePath, 'utf8')).records;
}

function buildRuntimeCapabilities(overrides = {}) {
  return {
    pairShadowSeamAvailable: true,
    statusColumnAvailable: true,
    statusReasonWritable: true,
    supersedesLinkWritable: true,
    supersededByLinkWritable: true,
    lifecycleUpdatedAtWritable: true,
    lifecycleActorClientIdWritable: true,
    sharedPolicyGuardAvailable: true,
    pairAtomicityAvailable: true,
    pairRollbackPreviewAvailable: true,
    auditIntentAppendAvailable: true,
    auditCommitAppendAvailable: true,
    auditCancelAppendAvailable: true,
    ...overrides
  };
}

function buildHelperInput(runtimeSurfaceCapabilities = buildRuntimeCapabilities()) {
  return {
    pairOutcomeContract: loadPairContractFixture(),
    shadowSeamContract: loadSeamContractFixture(),
    dryRunInput: {
      contract: loadPacketContractFixture(),
      ...loadRequestFixture()
    },
    currentProjectionRecords: loadProjectionRecordsFixture(),
    runtimeSurfaceCapabilities,
    plannedAt: '2026-05-24T10:00:00.000Z'
  };
}

test('CM-0990 helper previews a blocked but coherent supersede runtime-prep plan', () => {
  const input = buildHelperInput();
  const before = JSON.stringify(input);
  const summary = planMemorySupersedeRuntimePrep(input);

  assert.deepEqual(SUPPORTED_RUNTIME_PREP_FAMILIES, ['memory_supersede']);
  assert.equal(summary.sourceMode, 'explicit_input');
  assert.equal(summary.acceptedForRuntimePrep, true);
  assert.equal(summary.decision, 'BOUNDED_INTERNAL_RUNTIME_PREP_READY_NOT_APPROVED');
  assert.equal(summary.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
  assert.equal(summary.runtimeCandidateFamily, 'memory_supersede');
  assert.equal(summary.sharedInternalRuntimeEntryCandidate, false);
  assert.equal(summary.executionApproved, false);
  assert.equal(summary.runtimeIntegrated, false);
  assert.equal(summary.mutated, false);
  assert.equal(summary.durableAuditWritten, false);
  assert.equal(summary.durableProjectionApplied, false);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.realMemoryScanned, false);

  assert.equal(summary.dryRunPreview.acceptedForDryRunPreview, true);
  assert.equal(summary.projectionPreview.acceptedForProjectionPreview, true);
  assert.equal(summary.pairOutcomePreview.acceptedForPairOutcomePreview, true);
  assert.equal(summary.shadowSeamContract.acceptedForPlanning, true);
  assert.deepEqual(summary.blockers.blockingFindings, []);
  assert.deepEqual(summary.invalidationPlan.changedMemoryIds, ['memory-old-001', 'memory-new-001']);
  assert.ok(summary.invalidationPlan.projectedRevisionToken.startsWith('projection-preview:'));

  assert.equal(summary.runtimeContract.runtimeApplyBlocked, true);
  assert.equal(summary.runtimeContract.pairMutation, true);
  assert.equal(summary.runtimeContract.singleRecordReuseAllowed, false);
  assert.equal(summary.runtimeContract.pairUpdateApiCandidate, 'applySupersedePair');
  assert.deepEqual(summary.runtimeContract.supportedLinkColumns, [
    'supersedes_memory_id',
    'superseded_by_memory_id'
  ]);

  assert.equal(summary.auditPlan.intentEvent.audit_phase, 'pending');
  assert.equal(summary.auditPlan.committedEvent.audit_phase, 'committed');
  assert.equal(summary.auditPlan.cancelledEvent.audit_phase, 'cancelled');
  assert.equal(summary.auditPlan.committedEvent.correlation_id, summary.shadowUpdatePlan.pairCorrelationId);
  assert.equal(summary.auditPlan.cancelledEvent.correlation_id, summary.shadowUpdatePlan.pairCorrelationId);

  assert.equal(summary.shadowUpdatePlan.apiCandidate, 'applySupersedePair');
  assert.equal(summary.shadowUpdatePlan.oldRecord.memoryId, 'memory-old-001');
  assert.equal(summary.shadowUpdatePlan.oldRecord.fromStatus, 'active');
  assert.equal(summary.shadowUpdatePlan.oldRecord.toStatus, 'superseded');
  assert.equal(summary.shadowUpdatePlan.newRecord.memoryId, 'memory-new-001');
  assert.equal(summary.shadowUpdatePlan.newRecord.fromStatus, 'proposal');
  assert.equal(summary.shadowUpdatePlan.newRecord.toStatus, 'active');
  assert.equal(summary.shadowUpdatePlan.shared.supersedesLink, 'memory-old-001');
  assert.equal(summary.shadowUpdatePlan.shared.supersededByLink, 'memory-new-001');
  assert.equal(summary.rollbackPreview.provided, true);
  assert.equal(summary.rollbackPreview.pairRollbackPreviewRequired, true);

  assert.equal(summary.safety.noSideEffects, true);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.mutatesDurableState, false);
  assert.equal(JSON.stringify(input), before);
});

test('CM-0990 helper normalizes expected runtime-prep input fields', () => {
  const normalized = normalizeMemorySupersedeRuntimePrepInput(buildHelperInput());

  assert.equal(normalized.plannedAt, '2026-05-24T10:00:00.000Z');
  assert.equal(normalized.dryRunInput.mutationFamily, 'memory_supersede');
  assert.deepEqual(normalized.dryRunInput.targetMemoryIds, ['memory-old-001', 'memory-new-001']);
  assert.equal(normalized.currentProjectionRecords.length, 3);
  assert.equal(normalized.runtimeSurfaceCapabilities.pairShadowSeamAvailable, true);
});

test('CM-0990 helper normalizes blank projection record fields from snake-case fallbacks', () => {
  const records = loadProjectionRecordsFixture().map(record => {
    if (record.memoryId === 'memory-old-001') {
      return {
        ...record,
        memoryId: '',
        memory_id: 'memory-old-001',
        status: '   ',
        lifecycle_status: 'active',
        clientId: '',
        client_id: 'codex-desktop',
        visibility: ' ',
        visibility_policy: 'private',
        lifecycleUpdatedAt: '',
        lifecycle_updated_at: '2026-05-23T11:00:00.000Z'
      };
    }
    if (record.memoryId === 'memory-new-001') {
      return {
        ...record,
        memoryId: '   ',
        memory_id: 'memory-new-001',
        status: '',
        lifecycle_status: 'proposal',
        clientId: '   ',
        client_id: 'codex-desktop',
        visibility: '',
        visibility_policy: 'private',
        lifecycleUpdatedAt: '   ',
        lifecycle_updated_at: '2026-05-23T11:05:00.000Z'
      };
    }
    return record;
  });

  const summary = planMemorySupersedeRuntimePrep({
    ...buildHelperInput(),
    currentProjectionRecords: records
  });

  assert.equal(summary.acceptedForRuntimePrep, true);
  assert.equal(summary.shadowUpdatePlan.oldRecord.memoryId, 'memory-old-001');
  assert.equal(summary.shadowUpdatePlan.oldRecord.fromStatus, 'active');
  assert.equal(summary.shadowUpdatePlan.oldRecord.expectedClientId, 'codex-desktop');
  assert.equal(summary.shadowUpdatePlan.oldRecord.expectedVisibility, 'private');
  assert.equal(summary.shadowUpdatePlan.oldRecord.previousSnapshotRef.updated_at, '2026-05-23T11:00:00.000Z');
  assert.equal(summary.shadowUpdatePlan.newRecord.memoryId, 'memory-new-001');
  assert.equal(summary.shadowUpdatePlan.newRecord.fromStatus, 'proposal');
  assert.equal(summary.shadowUpdatePlan.newRecord.expectedClientId, 'codex-desktop');
  assert.equal(summary.shadowUpdatePlan.newRecord.expectedVisibility, 'private');
  assert.equal(summary.shadowUpdatePlan.newRecord.previousSnapshotRef.updated_at, '2026-05-23T11:05:00.000Z');
});

test('CM-0990 helper does not perform implicit fixture reads', () => {
  const input = buildHelperInput();
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    throw new Error('unexpected fs read during supersede runtime prep preview');
  };

  try {
    const summary = planMemorySupersedeRuntimePrep(input);
    assert.equal(summary.acceptedForRuntimePrep, true);
    assert.equal(summary.safety.readsFiles, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});

test('CM-0990 helper fails closed for malformed input', () => {
  for (const malformedInput of [null, [], 'not an object']) {
    const summary = planMemorySupersedeRuntimePrep(malformedInput);

    assert.equal(summary.acceptedForRuntimePrep, false);
    assert.equal(summary.decision, 'NOT_READY_BLOCKED');
    assert.equal(summary.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
    assert.equal(summary.executionApproved, false);
    assert.equal(summary.runtimeIntegrated, false);
    assert.equal(summary.mutated, false);
    assert.equal(summary.durableAuditWritten, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
    assert.equal(summary.safety.mutatesDurableState, false);
    assert.equal(summary.blockers.blockingFindings.includes('shadow_seam_contract_not_accepted'), true);
  }
});

test('CM-0990 helper rejects missing pair runtime surface capabilities', () => {
  const summary = planMemorySupersedeRuntimePrep(buildHelperInput({
    pairShadowSeamAvailable: false,
    pairAtomicityAvailable: false
  }));

  assert.equal(summary.acceptedForRuntimePrep, false);
  assert.equal(summary.blockers.blockingFindings.includes('two_record_shadow_seam_surface_missing'), true);
  assert.equal(summary.blockers.blockingFindings.includes('pair_atomicity_surface_missing'), true);
});

test('CM-0990 helper redacts sensitive normalized output', () => {
  const normalized = normalizeMemorySupersedeRuntimePrepInput({
    pairOutcomeContract: loadPairContractFixture(),
    shadowSeamContract: loadSeamContractFixture(),
    dryRunInput: {
      contract: loadPacketContractFixture(),
      ...loadRequestFixture(),
      actorClientId: 'authorization: Bearer SUPERSEDE_RUNTIME_PREP_TOKEN_1234567890',
      requestSource: 'api_key=SUPERSEDE_RUNTIME_PREP_API_KEY_1234567890',
      rollbackPath: 'C:\\secret\\.env'
    },
    currentProjectionRecords: loadProjectionRecordsFixture(),
    runtimeSurfaceCapabilities: buildRuntimeCapabilities(),
    plannedAt: '2026-05-24T10:00:00.000Z'
  });
  const summary = planMemorySupersedeRuntimePrep({
    pairOutcomeContract: loadPairContractFixture(),
    shadowSeamContract: loadSeamContractFixture(),
    dryRunInput: {
      contract: loadPacketContractFixture(),
      ...normalized.dryRunInput
    },
    currentProjectionRecords: normalized.currentProjectionRecords,
    runtimeSurfaceCapabilities: normalized.runtimeSurfaceCapabilities,
    plannedAt: normalized.plannedAt
  });
  const normalizedText = JSON.stringify(normalized).toLowerCase();
  const summaryText = JSON.stringify(summary).toLowerCase();

  for (const forbidden of [
    'authorization',
    'bearer',
    'api_key',
    'supersede_runtime_prep_token_1234567890',
    'supersede_runtime_prep_api_key_1234567890',
    'c:\\',
    '.env'
  ]) {
    assert.equal(normalizedText.includes(forbidden), false);
    assert.equal(summaryText.includes(forbidden), false);
  }
});
