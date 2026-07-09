'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_DECISIONS,
  ALLOWED_LIFECYCLE_STATES,
  FORBIDDEN_FIELD_NAMES,
  INACTIVE_LIFECYCLE_STATES,
  REQUIRED_CANDIDATE_BOOLEAN_FIELDS,
  REQUIRED_POLICY_FIELDS,
  REQUIRED_REQUEST_BOOLEAN_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryFallbackLocalMemoryLifecycleFilterContract
} = require('../src/core/VcpMemoryFallbackLocalMemoryLifecycleFilterContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] || 0]));
}

function lifecycleContract(overrides = {}) {
  const lifecycleRequest = {
    request_id: 'm13_lifecycle_filter_codex_001',
    client_family: 'codex',
    client_id_present: true,
    workspace_scope_present: true,
    project_scope_present: true,
    owner_scope_present: true,
    requested_visibility: 'private',
    fallback_reason: 'vcp_target_unapproved',
    lifecycle_summary_requested: false,
    lifecycle_store_scan_requested: false,
    migration_or_backfill_requested: false,
    lifecycle_mutation_requested: false
  };

  const fallbackCandidate = {
    memory_source: 'local_fallback',
    visibility: 'private',
    lifecycle_state: 'active',
    result_can_be_mistaken_for_vcp_native: false,
    raw_private_payload_present: false,
    raw_lifecycle_metadata_present: false,
    linked_replacement_payload_present: false,
    proposal_payload_present: false
  };

  const lifecyclePolicy = {
    active_only_for_fallback_result: true,
    low_disclosure_status_summary_allowed: true,
    unknown_lifecycle_fails_closed: true,
    lifecycle_policy_receipt_required: true,
    lifecycle_filter_must_not_mutate: true,
    migration_import_export_backfill_stop_l4: true
  };

  return {
    schemaVersion: 1,
    lifecycleRequest: {
      ...lifecycleRequest,
      ...(overrides.lifecycleRequest || {})
    },
    fallbackCandidate: {
      ...fallbackCandidate,
      ...(overrides.fallbackCandidate || {})
    },
    lifecyclePolicy: {
      ...lifecyclePolicy,
      ...(overrides.lifecyclePolicy || {})
    },
    expectedDecision: overrides.expectedDecision || 'fallback_allowed',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'lifecycleRequest',
      'fallbackCandidate',
      'lifecyclePolicy',
      'expectedDecision',
      'counters'
    ].includes(key)))
  };
}

test('CM1768 accepts active local fallback fixture without runtime execution or mutation', () => {
  const result = validateVcpMemoryFallbackLocalMemoryLifecycleFilterContract(lifecycleContract());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_fallback_lifecycle_filter_contract_only');
  assert.equal(result.computedDecision, 'fallback_allowed');
  assert.equal(result.fallbackAllowed, true);
  assert.equal(result.lifecyclePolicyApplied, true);
  assert.equal(result.localFallbackExecuted, false);
  assert.equal(result.lifecycleStoreScanned, false);
  assert.equal(result.lifecycleMutated, false);
  assert.equal(result.memoryRead, false);
});

test('CM1768 denies inactive lifecycle states as active fallback results', () => {
  for (const lifecycleState of INACTIVE_LIFECYCLE_STATES) {
    const result = validateVcpMemoryFallbackLocalMemoryLifecycleFilterContract(lifecycleContract({
      fallbackCandidate: {
        lifecycle_state: lifecycleState
      },
      expectedDecision: 'deny'
    }));

    assert.equal(result.accepted, true);
    assert.equal(result.computedDecision, 'deny');
    assert.equal(result.fallbackAllowed, false);
    assert.equal(result.lowDisclosureStatusSummary, false);
    assert.equal(result.lifecycleMutated, false);
  }
});

test('CM1768 allows inactive lifecycle low-disclosure status summary only when requested by policy', () => {
  for (const lifecycleState of INACTIVE_LIFECYCLE_STATES) {
    const result = validateVcpMemoryFallbackLocalMemoryLifecycleFilterContract(lifecycleContract({
      lifecycleRequest: {
        lifecycle_summary_requested: true
      },
      fallbackCandidate: {
        lifecycle_state: lifecycleState
      },
      expectedDecision: 'status_summary'
    }));

    assert.equal(result.accepted, true);
    assert.equal(result.computedDecision, 'status_summary');
    assert.equal(result.fallbackAllowed, false);
    assert.equal(result.lowDisclosureStatusSummary, true);
    assert.equal(result.memoryRead, false);
  }
});

test('CM1768 denies inactive lifecycle status summary when summary policy is disabled', () => {
  const result = validateVcpMemoryFallbackLocalMemoryLifecycleFilterContract(lifecycleContract({
    lifecycleRequest: {
      lifecycle_summary_requested: true
    },
    fallbackCandidate: {
      lifecycle_state: 'tombstoned'
    },
    lifecyclePolicy: {
      low_disclosure_status_summary_allowed: false
    },
    expectedDecision: 'deny'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'deny');
  assert.equal(result.lowDisclosureStatusSummary, false);
});

test('CM1768 denies unknown lifecycle and missing scope fail-closed', () => {
  const unknownLifecycle = validateVcpMemoryFallbackLocalMemoryLifecycleFilterContract(lifecycleContract({
    fallbackCandidate: {
      lifecycle_state: 'unknown'
    },
    expectedDecision: 'deny'
  }));
  assert.equal(unknownLifecycle.accepted, true);
  assert.equal(unknownLifecycle.computedDecision, 'deny');

  const missingScope = validateVcpMemoryFallbackLocalMemoryLifecycleFilterContract(lifecycleContract({
    lifecycleRequest: {
      client_family: 'unknown',
      workspace_scope_present: false
    },
    expectedDecision: 'deny'
  }));
  assert.equal(missingScope.accepted, true);
  assert.equal(missingScope.computedDecision, 'deny');
});

test('CM1768 stops lifecycle store scan migration backfill and mutation requests as L4', () => {
  const result = validateVcpMemoryFallbackLocalMemoryLifecycleFilterContract(lifecycleContract({
    lifecycleRequest: {
      lifecycle_store_scan_requested: true,
      migration_or_backfill_requested: true,
      lifecycle_mutation_requested: true
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'stop_l4');
  assert.equal(result.lifecycleStoreScanned, false);
  assert.equal(result.lifecycleMutated, false);
  assert.equal(result.migrationImportExportBackfillExecuted, false);
});

test('CM1768 stops raw private lifecycle replacement and proposal payload fixtures as L4', () => {
  const result = validateVcpMemoryFallbackLocalMemoryLifecycleFilterContract(lifecycleContract({
    fallbackCandidate: {
      raw_private_payload_present: true,
      raw_lifecycle_metadata_present: true,
      linked_replacement_payload_present: true,
      proposal_payload_present: true
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'stop_l4');
  assert.equal(result.privateRuntimeRead, false);
  assert.equal(result.memoryRead, false);
});

test('CM1768 rejects VCP-native lookalike lifecycle fallback candidates', () => {
  const result = validateVcpMemoryFallbackLocalMemoryLifecycleFilterContract(lifecycleContract({
    fallbackCandidate: {
      result_can_be_mistaken_for_vcp_native: true
    },
    expectedDecision: 'deny'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_lifecycle_filter_contract');
  assert.ok(result.invalidFields.includes('fallbackCandidate.result_can_be_mistaken_for_vcp_native'));
});

test('CM1768 rejects lifecycle decision mismatch for inactive fallback leakage attempts', () => {
  const result = validateVcpMemoryFallbackLocalMemoryLifecycleFilterContract(lifecycleContract({
    fallbackCandidate: {
      lifecycle_state: 'stale'
    },
    expectedDecision: 'fallback_allowed'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'decision_mismatch');
  assert.equal(result.computedDecision, 'deny');
  assert.ok(result.invalidFields.includes('expectedDecision'));
});

test('CM1768 rejects forbidden raw lifecycle secret approval and readiness fields without echoing values', () => {
  const result = validateVcpMemoryFallbackLocalMemoryLifecycleFilterContract(lifecycleContract({
    lifecycleRequest: {
      rawTombstoneReason: 'SYNTHETIC_RAW_TOMBSTONE_REASON_SHOULD_NOT_ECHO'
    },
    fallbackCandidate: {
      replacementMemoryId: 'SYNTHETIC_REPLACEMENT_ID_SHOULD_NOT_ECHO',
      rawLifecycleMetadata: 'SYNTHETIC_RAW_LIFECYCLE_METADATA_SHOULD_NOT_ECHO'
    },
    approvalLineValue: 'SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO',
    rawDailyNoteContent: 'SYNTHETIC_RAW_NOTE_SHOULD_NOT_ECHO',
    RC_READY: true
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_lifecycle_secret_runtime_or_overclaim_fields');
  assert.ok(result.forbiddenFields.includes('lifecycleRequest.rawTombstoneReason'));
  assert.ok(result.forbiddenFields.includes('fallbackCandidate.replacementMemoryId'));
  assert.ok(result.forbiddenFields.includes('fallbackCandidate.rawLifecycleMetadata'));
  assert.ok(result.forbiddenFields.includes('approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('rawDailyNoteContent'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('SYNTHETIC_RAW_TOMBSTONE_REASON_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_REPLACEMENT_ID_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RAW_LIFECYCLE_METADATA_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RAW_NOTE_SHOULD_NOT_ECHO'), false);
});

test('CM1768 rejects missing positive and malformed zero side-effect counters', () => {
  const missingFixture = lifecycleContract();
  delete missingFixture.counters.lifecycleStoreScans;

  const missingResult = validateVcpMemoryFallbackLocalMemoryLifecycleFilterContract(missingFixture);
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.lifecycleStoreScans'));

  const positiveResult = validateVcpMemoryFallbackLocalMemoryLifecycleFilterContract(lifecycleContract({
    counters: {
      lifecycleStoreScans: 1,
      lifecycleMutations: 1,
      migrationImportExportBackfills: 1
    }
  }));
  assert.equal(positiveResult.accepted, false);
  assert.equal(positiveResult.reasonCode, 'forbidden_positive_side_effect_counters');
  assert.ok(positiveResult.forbiddenCounters.includes('lifecycleStoreScans'));
  assert.ok(positiveResult.forbiddenCounters.includes('lifecycleMutations'));
  assert.ok(positiveResult.forbiddenCounters.includes('migrationImportExportBackfills'));

  const malformedResult = validateVcpMemoryFallbackLocalMemoryLifecycleFilterContract(lifecycleContract({
    counters: {
      lifecycleMutations: '0'
    }
  }));
  assert.equal(malformedResult.accepted, false);
  assert.equal(malformedResult.reasonCode, 'invalid_lifecycle_filter_contract');
  assert.ok(malformedResult.invalidFields.includes('counters.lifecycleMutations'));
});

test('CM1768 rejects non-boolean policy request and candidate flags plus non-string request id', () => {
  const result = validateVcpMemoryFallbackLocalMemoryLifecycleFilterContract(lifecycleContract({
    lifecycleRequest: {
      request_id: 1768,
      lifecycle_summary_requested: 'yes',
      lifecycle_mutation_requested: 1
    },
    fallbackCandidate: {
      raw_lifecycle_metadata_present: 'true'
    },
    lifecyclePolicy: {
      lifecycle_filter_must_not_mutate: 'yes'
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_lifecycle_filter_contract');
  assert.ok(result.invalidFields.includes('lifecycleRequest.request_id'));
  assert.ok(result.invalidFields.includes('lifecycleRequest.lifecycle_summary_requested'));
  assert.ok(result.invalidFields.includes('lifecycleRequest.lifecycle_mutation_requested'));
  assert.ok(result.invalidFields.includes('fallbackCandidate.raw_lifecycle_metadata_present'));
  assert.ok(result.invalidFields.includes('lifecyclePolicy.lifecycle_filter_must_not_mutate'));
});

test('CM1768 rejects unexpected non-allowlisted fields without echoing values', () => {
  const fixture = lifecycleContract({
    fixtureNote: 'SYNTHETIC_LIFECYCLE_VALUE_SHOULD_NOT_ECHO',
    lifecycleRequest: {
      extraLifecycleRequestMarker: 'SYNTHETIC_EXTRA_REQUEST_VALUE_SHOULD_NOT_ECHO'
    },
    fallbackCandidate: {
      extraLifecycleCandidateMarker: 'SYNTHETIC_EXTRA_CANDIDATE_VALUE_SHOULD_NOT_ECHO'
    },
    lifecyclePolicy: {
      extraLifecyclePolicyMarker: true
    }
  });
  fixture.counters.extraLifecycleCounter = 0;

  const result = validateVcpMemoryFallbackLocalMemoryLifecycleFilterContract(fixture);
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'unexpected_fields');
  assert.ok(result.unexpectedFields.includes('fixtureNote'));
  assert.ok(result.unexpectedFields.includes('lifecycleRequest.extraLifecycleRequestMarker'));
  assert.ok(result.unexpectedFields.includes('fallbackCandidate.extraLifecycleCandidateMarker'));
  assert.ok(result.unexpectedFields.includes('lifecyclePolicy.extraLifecyclePolicyMarker'));
  assert.ok(result.unexpectedFields.includes('counters.extraLifecycleCounter'));
  assert.equal(serialized.includes('SYNTHETIC_LIFECYCLE_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_REQUEST_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_CANDIDATE_VALUE_SHOULD_NOT_ECHO'), false);
});

test('CM1768 locks lifecycle filter vocabulary and side-effect posture', () => {
  const result = validateVcpMemoryFallbackLocalMemoryLifecycleFilterContract(lifecycleContract());

  assert.ok(ALLOWED_DECISIONS.includes('status_summary'));
  assert.ok(ALLOWED_LIFECYCLE_STATES.includes('proposal_only'));
  assert.ok(INACTIVE_LIFECYCLE_STATES.includes('superseded'));
  assert.ok(REQUIRED_REQUEST_BOOLEAN_FIELDS.includes('migration_or_backfill_requested'));
  assert.ok(REQUIRED_CANDIDATE_BOOLEAN_FIELDS.includes('raw_lifecycle_metadata_present'));
  assert.ok(REQUIRED_POLICY_FIELDS.includes('lifecycle_filter_must_not_mutate'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rawLifecycleMetadata'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('replacementMemoryId'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('lifecycleStoreScans'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('lifecycleMutations'));
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.localFallbackExecuted, false);
  assert.equal(result.privateRuntimeRead, false);
  assert.equal(result.realQueryExecuted, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.memoryUpdated, false);
  assert.equal(result.memorySuperseded, false);
  assert.equal(result.memoryTombstoned, false);
  assert.equal(result.lifecycleStoreScanned, false);
  assert.equal(result.lifecycleMutated, false);
  assert.equal(result.migrationImportExportBackfillExecuted, false);
  assert.equal(result.durableAuditWritten, false);
  assert.equal(result.durableMemoryWritten, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.approvalRequestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimAllowed, false);
});
