const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  EXPECTED_VALIDATION_MODE,
  REQUIRED_DRY_RUN_INPUT_FIELDS,
  normalizeDurableGovernanceMutationDryRunInput,
  summarizeDurableGovernanceMutationDryRun
} = require('../src/core/DurableGovernanceMutationDryRunHelper');

const contractFixturePath = path.join(__dirname, 'fixtures', 'durable-governance-mutation-packet-v1.json');
const requestFixturePath = path.join(__dirname, 'fixtures', 'durable-governance-mutation-dry-run-request-v1.json');

function loadContractFixture() {
  return JSON.parse(fs.readFileSync(contractFixturePath, 'utf8'));
}

function loadRequestFixture() {
  return JSON.parse(fs.readFileSync(requestFixturePath, 'utf8'));
}

function buildDryRunInput() {
  return {
    contract: loadContractFixture(),
    ...loadRequestFixture()
  };
}

test('CM-0862 helper summarizes an explicit internal dry-run preview', () => {
  const input = buildDryRunInput();
  const before = JSON.stringify(input);
  const summary = summarizeDurableGovernanceMutationDryRun(input);

  assert.equal(summary.sourceMode, 'explicit_input');
  assert.equal(summary.previewMode, EXPECTED_VALIDATION_MODE);
  assert.equal(summary.acceptedForDryRunPreview, true);
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
  assert.equal(summary.mutationFamily, 'memory_validate');
  assert.equal(summary.executionApproved, false);
  assert.equal(summary.runtimeIntegrated, false);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.mutated, false);
  assert.equal(summary.durableAuditWritten, false);
  assert.equal(summary.durableProjectionApplied, false);
  assert.equal(summary.packetFields.requiredPresent, true);
  assert.deepEqual(summary.packetFields.missingDryRunFields, []);
  assert.deepEqual(summary.packetFields.missingContractPacketFields, []);
  assert.equal(summary.mutationFields.requiredPresent, true);
  assert.deepEqual(summary.mutationFields.missingRequired, []);
  assert.equal(summary.targeting.exactCardinality, true);
  assert.deepEqual(summary.targeting.targetMemoryIds, ['memory-validate-001']);
  assert.deepEqual(summary.targeting.changedMemoryIds, ['memory-validate-001']);
  assert.equal(summary.scopeTuple.provided, true);
  assert.deepEqual(summary.scopeTuple.presentKeys, ['workspaceId', 'clientId', 'taskId', 'visibility']);
  assert.equal(summary.lifecycleTransition.provided, true);
  assert.equal(summary.lifecycleTransition.from, 'proposal');
  assert.equal(summary.lifecycleTransition.to, 'active');
  assert.equal(summary.auditPreview.appendOnlyRequired, true);
  assert.equal(summary.projectionPreview.shadowProjectionRequired, true);
  assert.equal(summary.revisionPreview.revisionEmissionRequired, true);
  assert.equal(summary.validationPreview.dryRunOnly, true);
  assert.equal(summary.rollbackPreview.provided, true);
  assert.deepEqual(summary.blockers.blockingFindings, []);
  assert.equal(summary.safety.noSideEffects, true);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.mutatesDurableState, false);
  assert.equal(JSON.stringify(input), before);
});

test('CM-0862 helper normalizes expected dry-run input fields', () => {
  const input = loadRequestFixture();
  const before = JSON.stringify(input);
  const normalized = normalizeDurableGovernanceMutationDryRunInput(input);

  assert.deepEqual(
    REQUIRED_DRY_RUN_INPUT_FIELDS.filter(field => !Object.hasOwn(normalized, field)),
    []
  );
  assert.equal(normalized.phaseId, 'CM-0862-durable-governance-mutation-dry-run-helper');
  assert.equal(normalized.mutationFamily, 'memory_validate');
  assert.equal(normalized.validationMode, EXPECTED_VALIDATION_MODE);
  assert.deepEqual(normalized.targetMemoryIds, ['memory-validate-001']);
  assert.equal(normalized.mutationFieldValues.targetMemoryId, 'memory-validate-001');
  assert.equal(JSON.stringify(input), before);
});

test('CM-0862 helper does not perform implicit fixture reads', () => {
  const input = buildDryRunInput();
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    throw new Error('unexpected fs read during durable governance dry-run helper evaluation');
  };

  try {
    const summary = summarizeDurableGovernanceMutationDryRun(input);

    assert.equal(summary.acceptedForDryRunPreview, true);
    assert.equal(summary.safety.readsFiles, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});

test('CM-0862 helper fails closed for malformed input or broken contract', () => {
  for (const malformedInput of [null, [], 'not an object']) {
    const summary = summarizeDurableGovernanceMutationDryRun(malformedInput);

    assert.equal(summary.acceptedForDryRunPreview, false);
    assert.equal(summary.decision, 'NOT_READY_BLOCKED');
    assert.equal(summary.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
    assert.equal(summary.executionApproved, false);
    assert.equal(summary.runtimeIntegrated, false);
    assert.equal(summary.publicMcpExpanded, false);
    assert.equal(summary.mutated, false);
    assert.equal(summary.durableAuditWritten, false);
    assert.equal(summary.durableProjectionApplied, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
    assert.equal(summary.safety.mutatesDurableState, false);
    assert.equal(summary.blockers.blockingFindings.includes('contract_not_accepted_for_planning'), true);
  }
});

test('CM-0862 helper rejects unsupported family and non-dry-run validation modes', () => {
  const input = buildDryRunInput();
  const summary = summarizeDurableGovernanceMutationDryRun({
    ...input,
    mutationFamily: 'memory_publish',
    validationMode: 'runtime_apply'
  });

  assert.equal(summary.acceptedForDryRunPreview, false);
  assert.equal(summary.blockers.blockingFindings.includes('unsupported_mutation_family'), true);
  assert.equal(summary.blockers.blockingFindings.includes('validation_mode_not_internal_dry_run_only'), true);
});

test('CM-0862 helper rejects cardinality drift, missing mutation fields, and explicit changed-id gaps', () => {
  const input = buildDryRunInput();
  const summary = summarizeDurableGovernanceMutationDryRun({
    ...input,
    mutationFamily: 'memory_supersede',
    targetMemoryIds: ['memory-old-001'],
    changedMemoryIdsPolicy: 'explicit_changed_memory_ids',
    changedMemoryIds: [],
    mutationFieldValues: {
      oldMemoryId: 'memory-old-001',
      scopeTuple: 'workspace-cm-0862',
      reason: input.reason,
      evidenceSummary: input.evidenceSummary,
      auditIntentPolicy: input.auditIntentPolicy,
      projectionPolicy: input.projectionPolicy,
      revisionEmitter: input.revisionEmitter
    }
  });

  assert.equal(summary.acceptedForDryRunPreview, false);
  assert.equal(summary.blockers.blockingFindings.includes('target_cardinality_mismatch'), true);
  assert.equal(summary.blockers.blockingFindings.includes('missing_mutation_fields'), true);
  assert.equal(summary.blockers.blockingFindings.includes('explicit_changed_memory_ids_missing'), true);
  assert.deepEqual(summary.mutationFields.missingRequired.sort(), [
    'newMemoryId',
    'supersededByLink',
    'supersedesLink'
  ]);
});

test('CM-0862 helper rejects inconsistent mirrored field values', () => {
  const input = buildDryRunInput();
  const summary = summarizeDurableGovernanceMutationDryRun({
    ...input,
    mutationFieldValues: {
      ...input.mutationFieldValues,
      targetMemoryId: 'memory-validate-999',
      actorClientId: 'other-client'
    }
  });

  assert.equal(summary.acceptedForDryRunPreview, false);
  assert.equal(summary.blockers.blockingFindings.includes('target_memory_id_mismatch'), true);
  assert.equal(summary.blockers.blockingFindings.includes('actor_client_id_mismatch'), true);
});

test('CM-0862 helper redacts sensitive normalized output', () => {
  const input = buildDryRunInput();
  const normalized = normalizeDurableGovernanceMutationDryRunInput({
    ...input,
    actorClientId: 'authorization: Bearer DRY_RUN_TOKEN_1234567890',
    requestSource: 'api_key=DRY_RUN_API_KEY_1234567890',
    rollbackPath: 'C:\\secret\\.env',
    scopeTuple: {
      workspaceId: 'workspace-dry-run-public',
      raw_workspace_id: 'workspace-dry-run-raw'
    },
    mutationFieldValues: {
      ...input.mutationFieldValues,
      evidenceSummary: 'token=DRY_RUN_FIELD_TOKEN_1234567890'
    }
  });
  const summary = summarizeDurableGovernanceMutationDryRun({
    contract: loadContractFixture(),
    ...normalized
  });
  const normalizedText = JSON.stringify(normalized).toLowerCase();
  const summaryText = JSON.stringify(summary).toLowerCase();

  for (const forbidden of [
    'authorization',
    'bearer',
    'api_key',
    'dry_run_token_1234567890',
    'dry_run_api_key_1234567890',
    'dry_run_field_token_1234567890',
    'workspace-dry-run-public',
    'raw_workspace_id',
    'workspace-dry-run-raw',
    'c:\\',
    '.env'
  ]) {
    assert.equal(normalizedText.includes(forbidden), false);
    assert.equal(summaryText.includes(forbidden), false);
  }

  assert.equal(summary.acceptedForDryRunPreview, false);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.mutatesDurableState, false);
});
