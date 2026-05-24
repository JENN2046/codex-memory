const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  SUPPORTED_SHADOW_SEAM_CANDIDATE_FAMILIES,
  normalizeMemorySupersedeShadowSeamCandidateInput,
  planMemorySupersedeShadowSeamCandidate
} = require('../src/core/MemorySupersedeShadowSeamCandidateHelper');

const pairContractFixturePath = path.join(__dirname, 'fixtures', 'memory-supersede-pair-outcome-v1.json');
const seamContractFixturePath = path.join(__dirname, 'fixtures', 'memory-supersede-shadow-seam-v1.json');
const packetContractFixturePath = path.join(__dirname, 'fixtures', 'durable-governance-mutation-packet-v1.json');
const requestFixturePath = path.join(__dirname, 'fixtures', 'memory-supersede-shadow-seam-candidate-request-v1.json');
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
    plannedAt: '2026-05-24T11:00:00.000Z'
  };
}

test('CM-0991 helper previews a blocked but coherent two-record supersede seam candidate', () => {
  const input = buildHelperInput();
  const before = JSON.stringify(input);
  const summary = planMemorySupersedeShadowSeamCandidate(input);

  assert.deepEqual(SUPPORTED_SHADOW_SEAM_CANDIDATE_FAMILIES, ['memory_supersede']);
  assert.equal(summary.sourceMode, 'explicit_input');
  assert.equal(summary.acceptedForShadowSeamCandidate, true);
  assert.equal(summary.decision, 'BOUNDED_INTERNAL_SHADOW_SEAM_CANDIDATE_READY_NOT_APPROVED');
  assert.equal(summary.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
  assert.equal(summary.executionApproved, false);
  assert.equal(summary.runtimeIntegrated, false);
  assert.equal(summary.mutated, false);
  assert.equal(summary.durableAuditWritten, false);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.realMemoryScanned, false);

  assert.equal(summary.shadowSeamContract.acceptedForPlanning, true);
  assert.equal(summary.runtimePrepPreview.acceptedForRuntimePrep, true);
  assert.deepEqual(summary.blockers.blockingFindings, []);

  assert.equal(summary.shadowSeamCandidate.methodName, 'applySupersedePair');
  assert.equal(summary.shadowSeamCandidate.executionBlocked, true);
  assert.equal(summary.shadowSeamCandidate.singleRecordReuseAllowed, false);
  assert.equal(summary.shadowSeamCandidate.oldRecordUpdate.memoryId, 'memory-old-001');
  assert.equal(summary.shadowSeamCandidate.oldRecordUpdate.expectedStatus, 'active');
  assert.equal(summary.shadowSeamCandidate.oldRecordUpdate.nextStatus, 'superseded');
  assert.equal(summary.shadowSeamCandidate.newRecordUpdate.memoryId, 'memory-new-001');
  assert.equal(summary.shadowSeamCandidate.newRecordUpdate.expectedStatus, 'proposal');
  assert.equal(summary.shadowSeamCandidate.newRecordUpdate.nextStatus, 'active');

  assert.equal(summary.pairGuardPlan.sharedPolicyGuardRequired, true);
  assert.equal(summary.pairGuardPlan.pairAtomicityRequired, true);
  assert.equal(summary.pairGuardPlan.singleRecordReuseAllowed, false);
  assert.deepEqual(summary.pairGuardPlan.projectedChangedMemoryIds, [
    'memory-old-001',
    'memory-new-001'
  ]);

  assert.equal(summary.auditCorrelationPlan.eventFamily, 'memory_supersede');
  assert.ok(summary.auditCorrelationPlan.intentEventId.startsWith('memory-supersede-intent:'));
  assert.ok(summary.auditCorrelationPlan.committedEventId.startsWith('memory-supersede-committed:'));
  assert.ok(summary.auditCorrelationPlan.cancelledEventId.startsWith('memory-supersede-cancelled:'));
  assert.equal(
    summary.auditCorrelationPlan.pairCorrelationId,
    summary.shadowSeamCandidate.pairCorrelationId
  );

  assert.equal(summary.rollbackPreview.provided, true);
  assert.equal(summary.rollbackPreview.pairRollbackPreviewRequired, true);
  assert.ok(summary.runtimePrepPreview.projectedRevisionToken.startsWith('projection-preview:'));

  assert.equal(summary.safety.noSideEffects, true);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.mutatesDurableState, false);
  assert.equal(JSON.stringify(input), before);
});

test('CM-0991 helper normalizes expected shadow-seam candidate input fields', () => {
  const normalized = normalizeMemorySupersedeShadowSeamCandidateInput(buildHelperInput());

  assert.equal(normalized.plannedAt, '2026-05-24T11:00:00.000Z');
  assert.equal(normalized.dryRunInput.mutationFamily, 'memory_supersede');
  assert.deepEqual(normalized.dryRunInput.targetMemoryIds, ['memory-old-001', 'memory-new-001']);
  assert.equal(normalized.currentProjectionRecords.length, 3);
  assert.equal(normalized.runtimeSurfaceCapabilities.pairShadowSeamAvailable, true);
});

test('CM-0991 helper does not perform implicit fixture reads', () => {
  const input = buildHelperInput();
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    throw new Error('unexpected fs read during supersede shadow seam candidate preview');
  };

  try {
    const summary = planMemorySupersedeShadowSeamCandidate(input);
    assert.equal(summary.acceptedForShadowSeamCandidate, true);
    assert.equal(summary.safety.readsFiles, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});

test('CM-0991 helper fails closed for malformed input', () => {
  for (const malformedInput of [null, [], 'not an object']) {
    const summary = planMemorySupersedeShadowSeamCandidate(malformedInput);

    assert.equal(summary.acceptedForShadowSeamCandidate, false);
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

test('CM-0991 helper rejects missing guarded pair seam capabilities', () => {
  const summary = planMemorySupersedeShadowSeamCandidate(buildHelperInput({
    pairShadowSeamAvailable: false,
    pairAtomicityAvailable: false
  }));

  assert.equal(summary.acceptedForShadowSeamCandidate, false);
  assert.equal(summary.blockers.blockingFindings.includes('runtime_prep_not_accepted'), true);
  assert.equal(summary.runtimePrepPreview.blockingFindings.includes('two_record_shadow_seam_surface_missing'), true);
  assert.equal(summary.runtimePrepPreview.blockingFindings.includes('pair_atomicity_surface_missing'), true);
});

test('CM-0991 helper redacts sensitive normalized output', () => {
  const normalized = normalizeMemorySupersedeShadowSeamCandidateInput({
    pairOutcomeContract: loadPairContractFixture(),
    shadowSeamContract: loadSeamContractFixture(),
    dryRunInput: {
      contract: loadPacketContractFixture(),
      ...loadRequestFixture(),
      actorClientId: 'authorization: Bearer SUPERSEDE_SHADOW_SEAM_TOKEN_1234567890',
      requestSource: 'api_key=SUPERSEDE_SHADOW_SEAM_API_KEY_1234567890',
      rollbackPath: 'C:\\secret\\.env'
    },
    currentProjectionRecords: loadProjectionRecordsFixture(),
    runtimeSurfaceCapabilities: buildRuntimeCapabilities(),
    plannedAt: '2026-05-24T11:00:00.000Z'
  });
  const summary = planMemorySupersedeShadowSeamCandidate({
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
    'supersede_shadow_seam_token_1234567890',
    'supersede_shadow_seam_api_key_1234567890',
    'c:\\',
    '.env'
  ]) {
    assert.equal(normalizedText.includes(forbidden), false);
    assert.equal(summaryText.includes(forbidden), false);
  }
});
