'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_DECISIONS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_CANDIDATE_BOOLEAN_FIELDS,
  REQUIRED_POLICY_FIELDS,
  REQUIRED_REQUEST_BOOLEAN_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryFallbackLocalMemorySecretRejectionContract
} = require('../src/core/VcpMemoryFallbackLocalMemorySecretRejectionContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] || 0]));
}

function secretContract(overrides = {}) {
  const secretRejectionRequest = {
    request_id: 'm13_secret_rejection_codex_001',
    client_family: 'codex',
    client_id_present: true,
    workspace_scope_present: true,
    project_scope_present: true,
    owner_scope_present: true,
    fallback_reason: 'vcp_target_unapproved',
    synthetic_fixture_marked: false,
    requires_secret_or_config_read: false,
    requires_provider_auth: false,
    config_env_reference_present: false,
    endpoint_reference_present: false,
    auth_material_present: false
  };

  const fallbackCandidate = {
    memory_source: 'local_fallback',
    visibility: 'private',
    result_can_be_mistaken_for_vcp_native: false,
    raw_private_payload_present: false,
    secret_like_value_present: false,
    credential_like_value_present: false,
    token_like_value_present: false,
    provider_payload_present: false,
    raw_secret_value_disclosed: false
  };

  const secretPolicy = {
    synthetic_secret_values_allowed: true,
    actual_secret_values_allowed: false,
    secret_like_input_must_be_rejected_or_redacted: true,
    fallback_receipt_must_omit_raw_secret_values: true,
    config_env_provider_auth_words_stop_l4: true,
    fallback_requires_no_secret_config_env_read: true
  };

  return {
    schemaVersion: 1,
    secretRejectionRequest: {
      ...secretRejectionRequest,
      ...(overrides.secretRejectionRequest || {})
    },
    fallbackCandidate: {
      ...fallbackCandidate,
      ...(overrides.fallbackCandidate || {})
    },
    secretPolicy: {
      ...secretPolicy,
      ...(overrides.secretPolicy || {})
    },
    expectedDecision: overrides.expectedDecision || 'fallback_allowed',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'secretRejectionRequest',
      'fallbackCandidate',
      'secretPolicy',
      'expectedDecision',
      'counters'
    ].includes(key)))
  };
}

test('CM1767 accepts no-secret local fallback fixture without runtime execution', () => {
  const result = validateVcpMemoryFallbackLocalMemorySecretRejectionContract(secretContract());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_fallback_secret_rejection_contract_only');
  assert.equal(result.computedDecision, 'fallback_allowed');
  assert.equal(result.fallbackAllowed, true);
  assert.equal(result.localFallbackExecuted, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.secretConfigRead, false);
});

test('CM1767 redacts marked synthetic secret-like fallback fixture without echoing values', () => {
  const result = validateVcpMemoryFallbackLocalMemorySecretRejectionContract(secretContract({
    secretRejectionRequest: {
      request_id: 'm13_secret_rejection_synthetic_001',
      synthetic_fixture_marked: true
    },
    fallbackCandidate: {
      secret_like_value_present: true,
      credential_like_value_present: true,
      token_like_value_present: true
    },
    expectedDecision: 'redact'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'redact');
  assert.equal(result.fallbackAllowed, false);
  assert.equal(result.secretRejectedOrRedacted, true);
  assert.equal(result.secretConfigRead, false);
  assert.equal(serialized.includes('SYNTHETIC_SECRET_VALUE_SHOULD_NOT_ECHO'), false);
});

test('CM1767 stops unmarked secret-like fallback input as L4', () => {
  const result = validateVcpMemoryFallbackLocalMemorySecretRejectionContract(secretContract({
    fallbackCandidate: {
      secret_like_value_present: true
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'stop_l4');
  assert.equal(result.fallbackAllowed, false);
  assert.equal(result.localFallbackExecuted, false);
});

test('CM1767 stops config env provider auth or endpoint read requirements as L4', () => {
  const result = validateVcpMemoryFallbackLocalMemorySecretRejectionContract(secretContract({
    secretRejectionRequest: {
      requires_secret_or_config_read: true,
      requires_provider_auth: true,
      config_env_reference_present: true,
      endpoint_reference_present: true,
      auth_material_present: true
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'stop_l4');
  assert.equal(result.secretConfigRead, false);
  assert.equal(result.envRead, false);
  assert.equal(result.endpointRead, false);
  assert.equal(result.providerApiCalled, false);
});

test('CM1767 stops raw private secret disclosure and provider payload fixtures as L4', () => {
  const result = validateVcpMemoryFallbackLocalMemorySecretRejectionContract(secretContract({
    fallbackCandidate: {
      raw_private_payload_present: true,
      raw_secret_value_disclosed: true,
      provider_payload_present: true
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'stop_l4');
  assert.equal(result.privateRuntimeRead, false);
  assert.equal(result.providerApiCalled, false);
});

test('CM1767 denies missing client scope and VCP-native lookalike fallback candidates', () => {
  const missingScope = validateVcpMemoryFallbackLocalMemorySecretRejectionContract(secretContract({
    secretRejectionRequest: {
      client_family: 'unknown',
      workspace_scope_present: false
    },
    expectedDecision: 'deny'
  }));
  assert.equal(missingScope.accepted, true);
  assert.equal(missingScope.computedDecision, 'deny');

  const lookalike = validateVcpMemoryFallbackLocalMemorySecretRejectionContract(secretContract({
    fallbackCandidate: {
      result_can_be_mistaken_for_vcp_native: true
    },
    expectedDecision: 'deny'
  }));
  assert.equal(lookalike.accepted, false);
  assert.equal(lookalike.reasonCode, 'invalid_secret_rejection_contract');
  assert.ok(lookalike.invalidFields.includes('fallbackCandidate.result_can_be_mistaken_for_vcp_native'));
});

test('CM1767 rejects decision mismatch for secret-like fallback leakage attempts', () => {
  const result = validateVcpMemoryFallbackLocalMemorySecretRejectionContract(secretContract({
    fallbackCandidate: {
      token_like_value_present: true
    },
    expectedDecision: 'fallback_allowed'
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'decision_mismatch');
  assert.equal(result.computedDecision, 'stop_l4');
  assert.ok(result.invalidFields.includes('expectedDecision'));
});

test('CM1767 rejects forbidden raw secret token approval and readiness fields without echoing values', () => {
  const result = validateVcpMemoryFallbackLocalMemorySecretRejectionContract(secretContract({
    secretRejectionRequest: {
      configEnvPath: 'SYNTHETIC_CONFIG_ENV_PATH_SHOULD_NOT_ECHO',
      endpoint: 'SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO'
    },
    fallbackCandidate: {
      secret: 'SYNTHETIC_SECRET_FIELD_SHOULD_NOT_ECHO',
      providerApiKey: 'SYNTHETIC_PROVIDER_KEY_SHOULD_NOT_ECHO'
    },
    approvalLineValue: 'SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO',
    rawDailyNoteContent: 'SYNTHETIC_RAW_NOTE_SHOULD_NOT_ECHO',
    RC_READY: true
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.ok(result.forbiddenFields.includes('secretRejectionRequest.configEnvPath'));
  assert.ok(result.forbiddenFields.includes('secretRejectionRequest.endpoint'));
  assert.ok(result.forbiddenFields.includes('fallbackCandidate.secret'));
  assert.ok(result.forbiddenFields.includes('fallbackCandidate.providerApiKey'));
  assert.ok(result.forbiddenFields.includes('approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('rawDailyNoteContent'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('SYNTHETIC_CONFIG_ENV_PATH_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_SECRET_FIELD_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_PROVIDER_KEY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RAW_NOTE_SHOULD_NOT_ECHO'), false);
});

test('CM1767 rejects missing positive and malformed zero side-effect counters', () => {
  const missingFixture = secretContract();
  delete missingFixture.counters.secretConfigReads;

  const missingResult = validateVcpMemoryFallbackLocalMemorySecretRejectionContract(missingFixture);
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.secretConfigReads'));

  const positiveResult = validateVcpMemoryFallbackLocalMemorySecretRejectionContract(secretContract({
    counters: {
      providerApiCalls: 1,
      secretConfigReads: 1,
      endpointReads: 1
    }
  }));
  assert.equal(positiveResult.accepted, false);
  assert.equal(positiveResult.reasonCode, 'forbidden_positive_side_effect_counters');
  assert.ok(positiveResult.forbiddenCounters.includes('providerApiCalls'));
  assert.ok(positiveResult.forbiddenCounters.includes('secretConfigReads'));
  assert.ok(positiveResult.forbiddenCounters.includes('endpointReads'));

  const malformedResult = validateVcpMemoryFallbackLocalMemorySecretRejectionContract(secretContract({
    counters: {
      envReads: '0'
    }
  }));
  assert.equal(malformedResult.accepted, false);
  assert.equal(malformedResult.reasonCode, 'invalid_secret_rejection_contract');
  assert.ok(malformedResult.invalidFields.includes('counters.envReads'));
});

test('CM1767 rejects non-boolean policy request and candidate flags plus non-string request id', () => {
  const result = validateVcpMemoryFallbackLocalMemorySecretRejectionContract(secretContract({
    secretRejectionRequest: {
      request_id: 1767,
      synthetic_fixture_marked: 'yes',
      requires_provider_auth: 1
    },
    fallbackCandidate: {
      secret_like_value_present: 'true'
    },
    secretPolicy: {
      actual_secret_values_allowed: 'no'
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_secret_rejection_contract');
  assert.ok(result.invalidFields.includes('secretRejectionRequest.request_id'));
  assert.ok(result.invalidFields.includes('secretRejectionRequest.synthetic_fixture_marked'));
  assert.ok(result.invalidFields.includes('secretRejectionRequest.requires_provider_auth'));
  assert.ok(result.invalidFields.includes('fallbackCandidate.secret_like_value_present'));
  assert.ok(result.invalidFields.includes('secretPolicy.actual_secret_values_allowed'));
});

test('CM1767 rejects unexpected non-allowlisted fields without echoing values', () => {
  const fixture = secretContract({
    fixtureNote: 'SYNTHETIC_SECRET_VALUE_SHOULD_NOT_ECHO',
    secretRejectionRequest: {
      extraMarker: 'SYNTHETIC_EXTRA_REQUEST_VALUE_SHOULD_NOT_ECHO'
    },
    fallbackCandidate: {
      extraCandidateMarker: 'SYNTHETIC_EXTRA_CANDIDATE_VALUE_SHOULD_NOT_ECHO'
    },
    secretPolicy: {
      extraPolicyMarker: true
    }
  });
  fixture.counters.extraCounter = 0;

  const result = validateVcpMemoryFallbackLocalMemorySecretRejectionContract(fixture);
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'unexpected_fields');
  assert.ok(result.unexpectedFields.includes('fixtureNote'));
  assert.ok(result.unexpectedFields.includes('secretRejectionRequest.extraMarker'));
  assert.ok(result.unexpectedFields.includes('fallbackCandidate.extraCandidateMarker'));
  assert.ok(result.unexpectedFields.includes('secretPolicy.extraPolicyMarker'));
  assert.ok(result.unexpectedFields.includes('counters.extraCounter'));
  assert.equal(serialized.includes('SYNTHETIC_SECRET_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_REQUEST_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_CANDIDATE_VALUE_SHOULD_NOT_ECHO'), false);
});

test('CM1767 locks secret rejection vocabulary and side-effect posture', () => {
  const result = validateVcpMemoryFallbackLocalMemorySecretRejectionContract(secretContract());

  assert.ok(ALLOWED_DECISIONS.includes('redact'));
  assert.ok(REQUIRED_REQUEST_BOOLEAN_FIELDS.includes('config_env_reference_present'));
  assert.ok(REQUIRED_CANDIDATE_BOOLEAN_FIELDS.includes('raw_secret_value_disclosed'));
  assert.ok(REQUIRED_POLICY_FIELDS.includes('fallback_receipt_must_omit_raw_secret_values'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('providerApiKey'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rawDailyNoteContent'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('secretConfigReads'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('envReads'));
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
  assert.equal(result.secretConfigRead, false);
  assert.equal(result.envRead, false);
  assert.equal(result.endpointRead, false);
  assert.equal(result.approvalRequestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimAllowed, false);
});
