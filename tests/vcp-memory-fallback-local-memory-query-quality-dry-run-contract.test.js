'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_DATASET_SOURCES,
  ALLOWED_DECISIONS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_DRY_RUN_BOOLEAN_FIELDS,
  REQUIRED_EXPECTATION_BOOLEAN_FIELDS,
  REQUIRED_REQUEST_BOOLEAN_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryFallbackLocalMemoryQueryQualityDryRunContract
} = require('../src/core/VcpMemoryFallbackLocalMemoryQueryQualityDryRunContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] || 0]));
}

function queryQualityContract(overrides = {}) {
  const queryRequest = {
    request_id: 'm13_query_quality_codex_001',
    client_family: 'codex',
    client_id_present: true,
    workspace_scope_present: true,
    project_scope_present: true,
    owner_scope_present: true,
    requested_visibility: 'private',
    fallback_reason: 'test_or_dry_run',
    query_fixture_only: true,
    temp_local_data_only: true,
    bounded_scope_present: true,
    broad_or_ambiguous_query: false,
    low_disclosure_output_required: true,
    real_query_requested: false,
    private_runtime_read_requested: false,
    mcp_memory_tool_requested: false,
    provider_rerank_or_embedding_requested: false,
    broad_memory_scan_requested: false
  };

  const dryRunFixture = {
    dataset_source: 'fixture',
    result_source: 'local_fallback',
    fallback_result_marked: true,
    vcp_native_result_marked: false,
    synthetic_quality_failure_present: false,
    failure_marked_local_fallback: false,
    raw_private_content_present: false,
    raw_result_payload_present: false,
    provider_result_present: false,
    mcp_tool_result_present: false,
    real_memory_result_present: false
  };

  const qualityExpectations = {
    must_contain_present: true,
    must_not_contain_present: true,
    top_k_order_present: true,
    tombstoned_suppression_required: true,
    cross_client_private_suppression_required: true,
    query_failure_marked_local_fallback: true,
    low_disclosure_projection_required: true,
    quality_score_claim_allowed: false,
    provider_quality_claim_allowed: false,
    readiness_or_reliability_claim_allowed: false
  };

  return {
    schemaVersion: 1,
    queryRequest: {
      ...queryRequest,
      ...(overrides.queryRequest || {})
    },
    dryRunFixture: {
      ...dryRunFixture,
      ...(overrides.dryRunFixture || {})
    },
    qualityExpectations: {
      ...qualityExpectations,
      ...(overrides.qualityExpectations || {})
    },
    expectedDecision: overrides.expectedDecision || 'dry_run_pass',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'queryRequest',
      'dryRunFixture',
      'qualityExpectations',
      'expectedDecision',
      'counters'
    ].includes(key)))
  };
}

test('CM1769 accepts fixture-only fallback query-quality dry run without runtime execution', () => {
  const result = validateVcpMemoryFallbackLocalMemoryQueryQualityDryRunContract(queryQualityContract());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_fallback_query_quality_dry_run_contract_only');
  assert.equal(result.computedDecision, 'dry_run_pass');
  assert.equal(result.dryRunPassed, true);
  assert.equal(result.fallbackResultMarked, true);
  assert.equal(result.localFallbackExecuted, false);
  assert.equal(result.queryExecuted, false);
  assert.equal(result.realQueryExecuted, false);
  assert.equal(result.providerApiCalled, false);
});

test('CM1769 accepts temp-local dataset metadata as dry-run fixture only', () => {
  const result = validateVcpMemoryFallbackLocalMemoryQueryQualityDryRunContract(queryQualityContract({
    dryRunFixture: {
      dataset_source: 'temp_local_db'
    }
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.datasetSource, 'temp_local_db');
  assert.equal(result.tempLocalWritten, false);
  assert.equal(result.realMemoryRead, false);
  assert.equal(result.durableMemoryWritten, false);
});

test('CM1769 denies broad or ambiguous fallback query unless bounded scope is present', () => {
  const unbounded = validateVcpMemoryFallbackLocalMemoryQueryQualityDryRunContract(queryQualityContract({
    queryRequest: {
      broad_or_ambiguous_query: true,
      bounded_scope_present: false
    },
    expectedDecision: 'deny'
  }));
  assert.equal(unbounded.accepted, true);
  assert.equal(unbounded.computedDecision, 'deny');

  const bounded = validateVcpMemoryFallbackLocalMemoryQueryQualityDryRunContract(queryQualityContract({
    queryRequest: {
      broad_or_ambiguous_query: true,
      bounded_scope_present: true
    }
  }));
  assert.equal(bounded.accepted, true);
  assert.equal(bounded.computedDecision, 'dry_run_pass');
});

test('CM1769 records synthetic quality failure only as local fallback failure', () => {
  const result = validateVcpMemoryFallbackLocalMemoryQueryQualityDryRunContract(queryQualityContract({
    dryRunFixture: {
      synthetic_quality_failure_present: true,
      failure_marked_local_fallback: true
    },
    expectedDecision: 'dry_run_fail_local_fallback'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'dry_run_fail_local_fallback');
  assert.equal(result.dryRunPassed, false);
  assert.equal(result.dryRunFailedAsLocalFallback, true);
  assert.equal(result.realQueryExecuted, false);
});

test('CM1769 denies synthetic quality failure that is not marked as local fallback failure', () => {
  const result = validateVcpMemoryFallbackLocalMemoryQueryQualityDryRunContract(queryQualityContract({
    dryRunFixture: {
      synthetic_quality_failure_present: true,
      failure_marked_local_fallback: false
    },
    expectedDecision: 'deny'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'deny');
});

test('CM1769 stops real query provider MCP private read and broad scan requests as L4', () => {
  const result = validateVcpMemoryFallbackLocalMemoryQueryQualityDryRunContract(queryQualityContract({
    queryRequest: {
      real_query_requested: true,
      private_runtime_read_requested: true,
      mcp_memory_tool_requested: true,
      provider_rerank_or_embedding_requested: true,
      broad_memory_scan_requested: true
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'stop_l4');
  assert.equal(result.privateRuntimeRead, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.broadMemoryScanned, false);
});

test('CM1769 stops raw provider MCP and real-memory result payload fixtures as L4', () => {
  const result = validateVcpMemoryFallbackLocalMemoryQueryQualityDryRunContract(queryQualityContract({
    dryRunFixture: {
      raw_private_content_present: true,
      raw_result_payload_present: true,
      provider_result_present: true,
      mcp_tool_result_present: true,
      real_memory_result_present: true
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'stop_l4');
  assert.equal(result.realMemoryRead, false);
  assert.equal(result.rawStoreScanned, false);
});

test('CM1769 rejects VCP-native lookalike query-quality fallback results', () => {
  const result = validateVcpMemoryFallbackLocalMemoryQueryQualityDryRunContract(queryQualityContract({
    dryRunFixture: {
      result_source: 'vcp_native',
      fallback_result_marked: false,
      vcp_native_result_marked: true
    },
    expectedDecision: 'deny'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'deny');
  assert.equal(result.dryRunPassed, false);
});

test('CM1769 rejects query-quality decision mismatch for fallback failure leakage attempts', () => {
  const result = validateVcpMemoryFallbackLocalMemoryQueryQualityDryRunContract(queryQualityContract({
    dryRunFixture: {
      synthetic_quality_failure_present: true,
      failure_marked_local_fallback: true
    },
    expectedDecision: 'dry_run_pass'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'decision_mismatch');
  assert.equal(result.computedDecision, 'dry_run_fail_local_fallback');
  assert.ok(result.invalidFields.includes('expectedDecision'));
});

test('CM1769 rejects forbidden raw query secret approval and readiness fields without echoing values', () => {
  const result = validateVcpMemoryFallbackLocalMemoryQueryQualityDryRunContract(queryQualityContract({
    queryRequest: {
      rawQuery: 'SYNTHETIC_RAW_QUERY_SHOULD_NOT_ECHO'
    },
    dryRunFixture: {
      rawResultPayload: 'SYNTHETIC_RAW_RESULT_SHOULD_NOT_ECHO',
      providerPayload: 'SYNTHETIC_PROVIDER_PAYLOAD_SHOULD_NOT_ECHO'
    },
    approvalLineValue: 'SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO',
    rawDailyNoteContent: 'SYNTHETIC_RAW_NOTE_SHOULD_NOT_ECHO',
    RC_READY: true
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_query_secret_runtime_or_overclaim_fields');
  assert.ok(result.forbiddenFields.includes('queryRequest.rawQuery'));
  assert.ok(result.forbiddenFields.includes('dryRunFixture.rawResultPayload'));
  assert.ok(result.forbiddenFields.includes('dryRunFixture.providerPayload'));
  assert.ok(result.forbiddenFields.includes('approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('rawDailyNoteContent'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('SYNTHETIC_RAW_QUERY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RAW_RESULT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_PROVIDER_PAYLOAD_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RAW_NOTE_SHOULD_NOT_ECHO'), false);
});

test('CM1769 rejects missing positive and malformed zero side-effect counters', () => {
  const missingFixture = queryQualityContract();
  delete missingFixture.counters.providerApiCalls;

  const missingResult = validateVcpMemoryFallbackLocalMemoryQueryQualityDryRunContract(missingFixture);
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.providerApiCalls'));

  const positiveResult = validateVcpMemoryFallbackLocalMemoryQueryQualityDryRunContract(queryQualityContract({
    counters: {
      realQueries: 1,
      mcpToolCalls: 1,
      qualityScoreClaims: 1
    }
  }));
  assert.equal(positiveResult.accepted, false);
  assert.equal(positiveResult.reasonCode, 'forbidden_positive_side_effect_counters');
  assert.ok(positiveResult.forbiddenCounters.includes('realQueries'));
  assert.ok(positiveResult.forbiddenCounters.includes('mcpToolCalls'));
  assert.ok(positiveResult.forbiddenCounters.includes('qualityScoreClaims'));

  const malformedResult = validateVcpMemoryFallbackLocalMemoryQueryQualityDryRunContract(queryQualityContract({
    counters: {
      providerApiCalls: '0'
    }
  }));
  assert.equal(malformedResult.accepted, false);
  assert.equal(malformedResult.reasonCode, 'invalid_query_quality_dry_run_contract');
  assert.ok(malformedResult.invalidFields.includes('counters.providerApiCalls'));
});

test('CM1769 rejects non-boolean flags and non-string request id', () => {
  const result = validateVcpMemoryFallbackLocalMemoryQueryQualityDryRunContract(queryQualityContract({
    queryRequest: {
      request_id: 1769,
      query_fixture_only: 'yes',
      provider_rerank_or_embedding_requested: 1
    },
    dryRunFixture: {
      fallback_result_marked: 'yes'
    },
    qualityExpectations: {
      low_disclosure_projection_required: 'yes'
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_query_quality_dry_run_contract');
  assert.ok(result.invalidFields.includes('queryRequest.request_id'));
  assert.ok(result.invalidFields.includes('queryRequest.query_fixture_only'));
  assert.ok(result.invalidFields.includes('queryRequest.provider_rerank_or_embedding_requested'));
  assert.ok(result.invalidFields.includes('dryRunFixture.fallback_result_marked'));
  assert.ok(result.invalidFields.includes('qualityExpectations.low_disclosure_projection_required'));
});

test('CM1769 rejects unexpected non-allowlisted fields without echoing values', () => {
  const fixture = queryQualityContract({
    fixtureNote: 'SYNTHETIC_QUERY_QUALITY_VALUE_SHOULD_NOT_ECHO',
    queryRequest: {
      extraQueryRequestMarker: 'SYNTHETIC_EXTRA_REQUEST_VALUE_SHOULD_NOT_ECHO'
    },
    dryRunFixture: {
      extraDryRunMarker: 'SYNTHETIC_EXTRA_DRY_RUN_VALUE_SHOULD_NOT_ECHO'
    },
    qualityExpectations: {
      extraQualityMarker: true
    }
  });
  fixture.counters.extraQueryCounter = 0;

  const result = validateVcpMemoryFallbackLocalMemoryQueryQualityDryRunContract(fixture);
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'unexpected_fields');
  assert.ok(result.unexpectedFields.includes('fixtureNote'));
  assert.ok(result.unexpectedFields.includes('queryRequest.extraQueryRequestMarker'));
  assert.ok(result.unexpectedFields.includes('dryRunFixture.extraDryRunMarker'));
  assert.ok(result.unexpectedFields.includes('qualityExpectations.extraQualityMarker'));
  assert.ok(result.unexpectedFields.includes('counters.extraQueryCounter'));
  assert.equal(serialized.includes('SYNTHETIC_QUERY_QUALITY_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_REQUEST_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_DRY_RUN_VALUE_SHOULD_NOT_ECHO'), false);
});

test('CM1769 locks query-quality vocabulary and side-effect posture', () => {
  const result = validateVcpMemoryFallbackLocalMemoryQueryQualityDryRunContract(queryQualityContract());

  assert.ok(ALLOWED_DECISIONS.includes('dry_run_fail_local_fallback'));
  assert.ok(ALLOWED_DATASET_SOURCES.includes('temp_local_db'));
  assert.ok(REQUIRED_REQUEST_BOOLEAN_FIELDS.includes('mcp_memory_tool_requested'));
  assert.ok(REQUIRED_DRY_RUN_BOOLEAN_FIELDS.includes('provider_result_present'));
  assert.ok(REQUIRED_EXPECTATION_BOOLEAN_FIELDS.includes('readiness_or_reliability_claim_allowed'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rawQuery'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('providerPayload'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('providerApiCalls'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('qualityScoreClaims'));
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.localFallbackExecuted, false);
  assert.equal(result.queryExecuted, false);
  assert.equal(result.privateRuntimeRead, false);
  assert.equal(result.realQueryExecuted, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.realMemoryRead, false);
  assert.equal(result.realMemoryWritten, false);
  assert.equal(result.rawStoreScanned, false);
  assert.equal(result.broadMemoryScanned, false);
  assert.equal(result.tempLocalWritten, false);
  assert.equal(result.durableAuditWritten, false);
  assert.equal(result.durableMemoryWritten, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.approvalRequestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.readinessClaimAllowed, false);
  assert.equal(result.qualityScoreClaimAllowed, false);
});
