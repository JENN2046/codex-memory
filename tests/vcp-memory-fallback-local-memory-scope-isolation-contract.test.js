'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_CLIENT_FAMILIES,
  ALLOWED_DECISIONS,
  ALLOWED_VISIBILITIES,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_CANDIDATE_FIELDS,
  REQUIRED_CANDIDATE_BOOLEAN_FIELDS,
  REQUIRED_POLICY_FIELDS,
  REQUIRED_REQUEST_BOOLEAN_FIELDS,
  REQUIRED_REQUEST_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryFallbackLocalMemoryScopeIsolationContract
} = require('../src/core/VcpMemoryFallbackLocalMemoryScopeIsolationContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] || 0]));
}

function scopeContract(overrides = {}) {
  const isolationRequest = {
    request_id: 'm13_scope_isolation_codex_private_001',
    client_family: 'codex',
    client_id_present: true,
    workspace_scope_present: true,
    project_scope_present: true,
    owner_scope_present: true,
    requested_visibility: 'private',
    cross_client_private_requested: false,
    shared_boundary_present: false,
    fallback_reason: 'vcp_target_unapproved'
  };

  const fallbackCandidate = {
    memory_source: 'local_fallback',
    client_family: 'codex',
    client_id_present: true,
    workspace_scope_present: true,
    project_scope_present: true,
    owner_scope_present: true,
    visibility: 'private',
    result_can_be_mistaken_for_vcp_native: false,
    raw_private_payload_present: false,
    secret_value_present: false
  };

  const isolationPolicy = {
    same_client_private_required: true,
    shared_visibility_requires_explicit_boundary: true,
    visibility_widening_allowed: false,
    unknown_scope_fails_closed: true,
    fallback_must_remain_marked: true
  };

  return {
    schemaVersion: 1,
    isolationRequest: {
      ...isolationRequest,
      ...(overrides.isolationRequest || {})
    },
    fallbackCandidate: {
      ...fallbackCandidate,
      ...(overrides.fallbackCandidate || {})
    },
    isolationPolicy: {
      ...isolationPolicy,
      ...(overrides.isolationPolicy || {})
    },
    expectedDecision: overrides.expectedDecision || 'fallback_allowed',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'isolationRequest',
      'fallbackCandidate',
      'isolationPolicy',
      'expectedDecision',
      'counters'
    ].includes(key)))
  };
}

test('CM1766 accepts same-client Codex private fallback fixture', () => {
  const result = validateVcpMemoryFallbackLocalMemoryScopeIsolationContract(scopeContract());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_fallback_scope_client_isolation_contract_only');
  assert.equal(result.expectedDecision, 'fallback_allowed');
  assert.equal(result.computedDecision, 'fallback_allowed');
  assert.equal(result.fallbackAllowed, true);
  assert.equal(result.requestClientFamily, 'codex');
  assert.equal(result.candidateClientFamily, 'codex');
  assert.equal(result.localFallbackExecuted, false);
  assert.equal(result.privateRuntimeRead, false);
  assert.equal(result.memoryRead, false);
});

test('CM1766 accepts same-client Claude private fallback fixture', () => {
  const result = validateVcpMemoryFallbackLocalMemoryScopeIsolationContract(scopeContract({
    isolationRequest: {
      request_id: 'm13_scope_isolation_claude_private_001',
      client_family: 'claude'
    },
    fallbackCandidate: {
      client_family: 'claude'
    }
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.requestClientFamily, 'claude');
  assert.equal(result.candidateClientFamily, 'claude');
  assert.equal(result.fallbackAllowed, true);
});

test('CM1766 denies Codex request for Claude private fallback candidate', () => {
  const result = validateVcpMemoryFallbackLocalMemoryScopeIsolationContract(scopeContract({
    fallbackCandidate: {
      client_family: 'claude'
    },
    expectedDecision: 'deny'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'deny');
  assert.equal(result.fallbackAllowed, false);
  assert.equal(result.localFallbackExecuted, false);
});

test('CM1766 denies shared fallback without explicit shared boundary', () => {
  const result = validateVcpMemoryFallbackLocalMemoryScopeIsolationContract(scopeContract({
    isolationRequest: {
      requested_visibility: 'shared',
      shared_boundary_present: false
    },
    fallbackCandidate: {
      client_family: 'shared',
      visibility: 'shared'
    },
    expectedDecision: 'deny'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'deny');
  assert.equal(result.fallbackAllowed, false);
});

test('CM1766 accepts shared fallback with explicit shared boundary', () => {
  const result = validateVcpMemoryFallbackLocalMemoryScopeIsolationContract(scopeContract({
    isolationRequest: {
      requested_visibility: 'shared',
      shared_boundary_present: true
    },
    fallbackCandidate: {
      client_family: 'shared',
      visibility: 'shared'
    }
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'fallback_allowed');
  assert.equal(result.candidateVisibility, 'shared');
});

test('CM1766 denies unknown client scope or visibility fail-closed fixtures', () => {
  const result = validateVcpMemoryFallbackLocalMemoryScopeIsolationContract(scopeContract({
    isolationRequest: {
      client_family: 'unknown',
      requested_visibility: 'unknown',
      workspace_scope_present: false
    },
    fallbackCandidate: {
      client_family: 'unknown',
      visibility: 'unknown'
    },
    expectedDecision: 'deny'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'deny');
  assert.equal(result.fallbackAllowed, false);
});

test('CM1766 stops explicit cross-client private request as L4 without execution', () => {
  const result = validateVcpMemoryFallbackLocalMemoryScopeIsolationContract(scopeContract({
    isolationRequest: {
      cross_client_private_requested: true
    },
    fallbackCandidate: {
      client_family: 'claude'
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'stop_l4');
  assert.equal(result.fallbackAllowed, false);
  assert.equal(result.privateRuntimeRead, false);
  assert.equal(result.localFallbackExecuted, false);
});

test('CM1766 denies visibility widening from private request to shared candidate', () => {
  const result = validateVcpMemoryFallbackLocalMemoryScopeIsolationContract(scopeContract({
    fallbackCandidate: {
      client_family: 'shared',
      visibility: 'shared'
    },
    expectedDecision: 'deny'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'deny');
  assert.equal(result.fallbackAllowed, false);
});

test('CM1766 rejects decision mismatch for cross-client private leakage attempt', () => {
  const result = validateVcpMemoryFallbackLocalMemoryScopeIsolationContract(scopeContract({
    fallbackCandidate: {
      client_family: 'claude'
    },
    expectedDecision: 'fallback_allowed'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'decision_mismatch');
  assert.equal(result.computedDecision, 'deny');
  assert.ok(result.invalidFields.includes('expectedDecision'));
});

test('CM1766 rejects missing and positive side-effect counters', () => {
  const missingCounterFixture = scopeContract();
  delete missingCounterFixture.counters.memoryReads;

  const missingResult = validateVcpMemoryFallbackLocalMemoryScopeIsolationContract(missingCounterFixture);
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.memoryReads'));

  const positiveResult = validateVcpMemoryFallbackLocalMemoryScopeIsolationContract(scopeContract({
    counters: zeroCounters({
      fallbackExecutions: 1,
      privateRuntimeReads: 1,
      memoryReads: 1
    })
  }));

  assert.equal(positiveResult.accepted, false);
  assert.equal(positiveResult.reasonCode, 'forbidden_positive_side_effect_counters');
  assert.ok(positiveResult.forbiddenCounters.includes('fallbackExecutions'));
  assert.ok(positiveResult.forbiddenCounters.includes('privateRuntimeReads'));
  assert.ok(positiveResult.forbiddenCounters.includes('memoryReads'));
});

test('CM1766 rejects raw secret approval and readiness fields without echoing values', () => {
  const result = validateVcpMemoryFallbackLocalMemoryScopeIsolationContract(scopeContract({
    isolationRequest: {
      debugPayload: 'PRIVATE_SCOPE_DEBUG_SHOULD_NOT_ECHO',
      completeV8: true
    },
    fallbackCandidate: {
      secret: 'SECRET_SCOPE_VALUE_SHOULD_NOT_ECHO'
    },
    approvalLineValue: 'APPROVAL_SCOPE_VALUE_SHOULD_NOT_ECHO',
    rawDailyNoteContent: 'RAW_SCOPE_DAILY_NOTE_SHOULD_NOT_ECHO',
    RC_READY: true
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.ok(result.forbiddenFields.includes('isolationRequest.debugPayload'));
  assert.ok(result.forbiddenFields.includes('isolationRequest.completeV8'));
  assert.ok(result.forbiddenFields.includes('fallbackCandidate.secret'));
  assert.ok(result.forbiddenFields.includes('approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('rawDailyNoteContent'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('PRIVATE_SCOPE_DEBUG_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_SCOPE_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('APPROVAL_SCOPE_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_SCOPE_DAILY_NOTE_SHOULD_NOT_ECHO'), false);
});

test('CM1766 rejects non-boolean scope and sensitive presence flags', () => {
  const result = validateVcpMemoryFallbackLocalMemoryScopeIsolationContract(scopeContract({
    isolationRequest: {
      client_id_present: 'yes',
      shared_boundary_present: 1
    },
    fallbackCandidate: {
      raw_private_payload_present: 'true',
      secret_value_present: 'false'
    },
    expectedDecision: 'fallback_allowed'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_scope_isolation_contract');
  assert.ok(result.invalidFields.includes('isolationRequest.client_id_present'));
  assert.ok(result.invalidFields.includes('isolationRequest.shared_boundary_present'));
  assert.ok(result.invalidFields.includes('fallbackCandidate.raw_private_payload_present'));
  assert.ok(result.invalidFields.includes('fallbackCandidate.secret_value_present'));
});

test('CM1766 rejects non-string request ids and non-numeric zero counters', () => {
  const result = validateVcpMemoryFallbackLocalMemoryScopeIsolationContract(scopeContract({
    isolationRequest: {
      request_id: 1766
    },
    counters: {
      memoryReads: '0',
      durableAuditWrites: -1
    },
    expectedDecision: 'fallback_allowed'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_scope_isolation_contract');
  assert.ok(result.invalidFields.includes('isolationRequest.request_id'));
  assert.ok(result.invalidFields.includes('counters.memoryReads'));
  assert.ok(result.invalidFields.includes('counters.durableAuditWrites'));
});

test('CM1766 locks scope isolation vocabulary and side-effect posture', () => {
  const result = validateVcpMemoryFallbackLocalMemoryScopeIsolationContract(scopeContract());

  assert.ok(ALLOWED_CLIENT_FAMILIES.includes('codex'));
  assert.ok(ALLOWED_CLIENT_FAMILIES.includes('claude'));
  assert.ok(ALLOWED_VISIBILITIES.includes('shared'));
  assert.ok(ALLOWED_DECISIONS.includes('stop_l4'));
  assert.ok(REQUIRED_REQUEST_FIELDS.includes('requested_visibility'));
  assert.ok(REQUIRED_CANDIDATE_FIELDS.includes('visibility'));
  assert.ok(REQUIRED_REQUEST_BOOLEAN_FIELDS.includes('shared_boundary_present'));
  assert.ok(REQUIRED_CANDIDATE_BOOLEAN_FIELDS.includes('secret_value_present'));
  assert.ok(REQUIRED_POLICY_FIELDS.includes('visibility_widening_allowed'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rawDailyNoteContent'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalLineValue'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('completeV8'));
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.localFallbackExecuted, false);
  assert.equal(result.privateRuntimeRead, false);
  assert.equal(result.realQueryExecuted, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableAuditWritten, false);
  assert.equal(result.durableMemoryWritten, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.approvalRequestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimAllowed, false);
});
