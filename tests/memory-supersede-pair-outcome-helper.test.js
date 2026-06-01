const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  SUPPORTED_PAIR_OUTCOME_FAMILIES,
  normalizeMemorySupersedePairOutcomeHelperInput,
  previewMemorySupersedePairOutcome
} = require('../src/core/MemorySupersedePairOutcomeHelper');

const pairContractFixturePath = path.join(__dirname, 'fixtures', 'memory-supersede-pair-outcome-v1.json');
const packetContractFixturePath = path.join(__dirname, 'fixtures', 'durable-governance-mutation-packet-v1.json');
const requestFixturePath = path.join(__dirname, 'fixtures', 'memory-supersede-pair-outcome-helper-request-v1.json');
const projectionRecordsFixturePath = path.join(__dirname, 'fixtures', 'durable-governance-shadow-projection-records-v1.json');

function loadPairContractFixture() {
  return JSON.parse(fs.readFileSync(pairContractFixturePath, 'utf8'));
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

function buildHelperInput() {
  return {
    pairOutcomeContract: loadPairContractFixture(),
    dryRunInput: {
      contract: loadPacketContractFixture(),
      ...loadRequestFixture()
    },
    currentProjectionRecords: loadProjectionRecordsFixture(),
    plannedAt: '2026-05-24T09:00:00.000Z'
  };
}

test('CM-0988 helper previews a blocked but coherent supersede pair outcome', () => {
  const input = buildHelperInput();
  const before = JSON.stringify(input);
  const summary = previewMemorySupersedePairOutcome(input);

  assert.deepEqual(SUPPORTED_PAIR_OUTCOME_FAMILIES, ['memory_supersede']);
  assert.equal(summary.sourceMode, 'explicit_input');
  assert.equal(summary.acceptedForPairOutcomePreview, true);
  assert.equal(summary.decision, 'BOUNDED_INTERNAL_PAIR_OUTCOME_PREVIEW_READY_NOT_APPROVED');
  assert.equal(summary.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
  assert.equal(summary.executionApproved, false);
  assert.equal(summary.runtimeIntegrated, false);
  assert.equal(summary.mutated, false);
  assert.equal(summary.durableAuditWritten, false);
  assert.equal(summary.durableProjectionApplied, false);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.realMemoryScanned, false);
  assert.equal(summary.pairOutcomeContract.acceptedForContractHelper, true);
  assert.equal(summary.dryRunPreview.acceptedForDryRunPreview, true);
  assert.equal(summary.projectionPreview.acceptedForProjectionPreview, true);
  assert.deepEqual(summary.blockers.blockingFindings, []);
  assert.deepEqual(summary.projectionPreview.projectedChangedMemoryIds, ['memory-old-001', 'memory-new-001']);
  assert.ok(summary.projectionPreview.projectedRevisionToken.startsWith('projection-preview:'));

  assert.equal(summary.pairOutcomePreview.oldMemoryId, 'memory-old-001');
  assert.equal(summary.pairOutcomePreview.newMemoryId, 'memory-new-001');
  assert.equal(summary.pairOutcomePreview.oldFromStatus, 'active');
  assert.equal(summary.pairOutcomePreview.oldToStatus, 'superseded');
  assert.equal(summary.pairOutcomePreview.newFromStatus, 'proposal');
  assert.equal(summary.pairOutcomePreview.newToStatus, 'active');
  assert.equal(summary.pairOutcomePreview.supersedesLink, 'memory-old-001');
  assert.equal(summary.pairOutcomePreview.supersededByLink, 'memory-new-001');
  assert.ok(summary.pairOutcomePreview.pairCorrelationId.startsWith('memory-supersede-pair-correlation:'));
  assert.ok(summary.pairOutcomePreview.intentEventId.startsWith('memory-supersede-intent:'));
  assert.ok(summary.pairOutcomePreview.committedEventId.startsWith('memory-supersede-committed:'));
  assert.ok(summary.pairOutcomePreview.cancelledEventId.startsWith('memory-supersede-cancelled:'));

  assert.equal(summary.auditPlan.intentEvent.audit_phase, 'pending');
  assert.equal(summary.auditPlan.intentEvent.mutation_applied, false);
  assert.equal(summary.auditPlan.intentEvent.supersedes_memory_id, 'memory-old-001');
  assert.equal(summary.auditPlan.intentEvent.superseded_by_memory_id, 'memory-new-001');
  assert.equal(summary.auditPlan.intentEvent.old_from_status, 'active');
  assert.equal(summary.auditPlan.intentEvent.new_from_status, 'proposal');
  assert.equal(summary.auditPlan.committedEvent.audit_phase, 'committed');
  assert.equal(summary.auditPlan.committedEvent.mutation_applied, true);
  assert.equal(summary.auditPlan.committedEvent.correlation_id, summary.pairOutcomePreview.pairCorrelationId);
  assert.equal(summary.auditPlan.cancelledEvent.audit_phase, 'cancelled');
  assert.equal(summary.auditPlan.cancelledEvent.mutation_applied, false);
  assert.equal(summary.auditPlan.cancelledEvent.correlation_id, summary.pairOutcomePreview.pairCorrelationId);

  assert.equal(summary.safety.noSideEffects, true);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.mutatesDurableState, false);
  assert.equal(JSON.stringify(input), before);
});

test('CM-0988 helper normalizes expected helper input fields', () => {
  const input = buildHelperInput();
  const before = JSON.stringify(input);
  const normalized = normalizeMemorySupersedePairOutcomeHelperInput(input);

  assert.equal(normalized.plannedAt, '2026-05-24T09:00:00.000Z');
  assert.equal(normalized.dryRunInput.mutationFamily, 'memory_supersede');
  assert.deepEqual(normalized.dryRunInput.targetMemoryIds, ['memory-old-001', 'memory-new-001']);
  assert.equal(normalized.currentProjectionRecords.length, 3);
  assert.equal(JSON.stringify(input), before);
});

test('CM-1319 helper normalizes returned memory_id aliases before pair record lookup', () => {
  const input = buildHelperInput();
  const records = input.currentProjectionRecords.map(record => ({
    ...record,
    memoryId: '   ',
    memory_id: record.memoryId
  }));
  const summary = previewMemorySupersedePairOutcome({
    ...input,
    currentProjectionRecords: records
  });

  assert.equal(summary.acceptedForPairOutcomePreview, true);
  assert.equal(summary.pairOutcomePreview.oldMemoryId, 'memory-old-001');
  assert.equal(summary.pairOutcomePreview.newMemoryId, 'memory-new-001');
  assert.equal(summary.auditPlan.intentEvent.memory_id, 'memory-old-001');
  assert.equal(summary.auditPlan.intentEvent.replacement_memory_id, 'memory-new-001');
  assert.equal(summary.blockers.blockingFindings.includes('old_projection_record_missing'), false);
  assert.equal(summary.blockers.blockingFindings.includes('new_projection_record_missing'), false);
});

test('CM-0988 helper does not perform implicit fixture reads', () => {
  const input = buildHelperInput();
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    throw new Error('unexpected fs read during supersede pair outcome preview');
  };

  try {
    const summary = previewMemorySupersedePairOutcome(input);

    assert.equal(summary.acceptedForPairOutcomePreview, true);
    assert.equal(summary.safety.readsFiles, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});

test('CM-0988 helper fails closed for malformed input', () => {
  for (const malformedInput of [null, [], 'not an object']) {
    const summary = previewMemorySupersedePairOutcome(malformedInput);

    assert.equal(summary.acceptedForPairOutcomePreview, false);
    assert.equal(summary.decision, 'NOT_READY_BLOCKED');
    assert.equal(summary.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
    assert.equal(summary.executionApproved, false);
    assert.equal(summary.runtimeIntegrated, false);
    assert.equal(summary.mutated, false);
    assert.equal(summary.durableAuditWritten, false);
    assert.equal(summary.projectionPreview.acceptedForProjectionPreview, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
    assert.equal(summary.safety.mutatesDurableState, false);
    assert.equal(summary.blockers.blockingFindings.includes('pair_outcome_contract_not_accepted'), true);
  }
});

test('CM-0988 helper rejects unsupported families and blocked projection previews', () => {
  const input = buildHelperInput();
  const unsupportedFamily = previewMemorySupersedePairOutcome({
    ...input,
    dryRunInput: {
      ...input.dryRunInput,
      mutationFamily: 'memory_tombstone'
    }
  });

  assert.equal(unsupportedFamily.acceptedForPairOutcomePreview, false);
  assert.equal(unsupportedFamily.blockers.blockingFindings.includes('unsupported_pair_outcome_family'), true);

  const blockedProjection = previewMemorySupersedePairOutcome({
    ...input,
    dryRunInput: {
      ...input.dryRunInput,
      mutationFieldValues: {
        ...input.dryRunInput.mutationFieldValues,
        supersededByLink: 'memory-other-999'
      }
    }
  });

  assert.equal(blockedProjection.acceptedForPairOutcomePreview, false);
  assert.equal(blockedProjection.blockers.blockingFindings.includes('projection_preview_not_accepted'), true);
});

test('CM-0988 helper redacts sensitive normalized output', () => {
  const normalized = normalizeMemorySupersedePairOutcomeHelperInput({
    pairOutcomeContract: loadPairContractFixture(),
    dryRunInput: {
      contract: loadPacketContractFixture(),
      ...loadRequestFixture(),
      actorClientId: 'authorization: Bearer SUPERSEDE_PAIR_TOKEN_1234567890',
      requestSource: 'api_key=SUPERSEDE_PAIR_API_KEY_1234567890',
      rollbackPath: 'C:\\secret\\.env',
      mutationFieldValues: {
        ...loadRequestFixture().mutationFieldValues,
        evidenceSummary: 'token=SUPERSEDE_PAIR_FIELD_TOKEN_1234567890'
      }
    },
    currentProjectionRecords: loadProjectionRecordsFixture(),
    plannedAt: '2026-05-24T09:00:00.000Z'
  });
  const summary = previewMemorySupersedePairOutcome({
    pairOutcomeContract: loadPairContractFixture(),
    dryRunInput: {
      contract: loadPacketContractFixture(),
      ...normalized.dryRunInput
    },
    currentProjectionRecords: normalized.currentProjectionRecords,
    plannedAt: normalized.plannedAt
  });
  const normalizedText = JSON.stringify(normalized).toLowerCase();
  const summaryText = JSON.stringify(summary).toLowerCase();

  for (const forbidden of [
    'authorization',
    'bearer',
    'api_key',
    'supersede_pair_token_1234567890',
    'supersede_pair_api_key_1234567890',
    'supersede_pair_field_token_1234567890',
    'c:\\',
    '.env'
  ]) {
    assert.equal(normalizedText.includes(forbidden), false);
    assert.equal(summaryText.includes(forbidden), false);
  }
});
