const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  SEALED_V1_0_RC_COMMIT
} = require('../src/core/V11HardeningValidationAggregator');
const {
  REQUIRED_MODE,
  REQUIRED_REJECTION_CODE,
  REQUIRED_SOURCE_MODE,
  REQUIRED_TARGET_TOOL,
  REQUIRED_VALIDATION_COMMANDS,
  REQUIRED_ZERO_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED,
  buildV11AuthorizedMutationTokenPathDiagnostic
} = require('../src/core/V11AuthorizedMutationTokenPathDiagnostic');

const HEAD_COMMIT = '2253c64ff9645c2957bb8a47a7f59371787e53fd';

function zeroCounters(overrides = {}) {
  return {
    ...Object.fromEntries(REQUIRED_ZERO_COUNTER_KEYS.map(key => [key, 0])),
    ...overrides
  };
}

function diagnosticInput(overrides = {}) {
  return {
    mode: REQUIRED_MODE,
    sourceMode: REQUIRED_SOURCE_MODE,
    baseline: {
      sealedRcCommit: SEALED_V1_0_RC_COMMIT,
      currentHeadCommit: HEAD_COMMIT,
      expectedCurrentHeadCommit: HEAD_COMMIT,
      sealedV1RcPreserved: true,
      exactCurrentHeadBound: true
    },
    sourceEvidence: {
      httpServerAuthorizeRequiresBearerWhenConfigured: true,
      healthAuthRequiredReflectsBearerTokenPresence: true,
      noTokenJsonRpcMutationGatePresent: true,
      recordMemoryListedAsNoTokenBlockedTool: true,
      noTokenMutationRejectsBeforeMcpHandler: true,
      noTokenMutationRejectionCode: REQUIRED_REJECTION_CODE,
      invalidBearerWouldReturnUnauthorizedBeforeJsonRpc: true
    },
    attemptEvidence: {
      approvalPacketId: 'CM-1096-EXACT-RECORD-MEMORY-WRITE-001',
      targetTool: REQUIRED_TARGET_TOOL,
      currentHeadCommit: HEAD_COMMIT,
      callsUsed: 1,
      resultCode: REQUIRED_REJECTION_CODE,
      httpStatus: 403,
      acceptedMemoryId: null,
      acceptedWriteResult: null,
      retried: false,
      searchMemoryCalled: false,
      rawStoreRead: false,
      rawAuditRead: false
    },
    validation: {
      commands: [...REQUIRED_VALIDATION_COMMANDS],
      docsValidationPlanned: true,
      diffCheckPlanned: true,
      ledgerConsistencyPlanned: true,
      noSecretValueExposureReviewPlanned: true,
      noRetryPlanned: true
    },
    sideEffectCounters: zeroCounters(),
    ...overrides
  };
}

test('CM1097 accepts read-only diagnostic for no-token mutation gate evidence', () => {
  const result = buildV11AuthorizedMutationTokenPathDiagnostic(diagnosticInput());

  assert.equal(result.status, RESULT_STATUS_ACCEPTED);
  assert.equal(result.accepted, true);
  assert.equal(result.diagnosticAccepted, true);
  assert.deepEqual(result.blockerReasons, []);
  assert.equal(result.diagnosis.activeRuntimeTokenPath, 'no_token_http_mcp_mutation_gate');
  assert.equal(result.diagnosis.bearerAuthorizedToolRequestConfirmed, false);
  assert.equal(result.diagnosis.bearerTokenConfiguredOnActiveRuntimeConfirmed, false);
  assert.equal(result.diagnosis.writeAccepted, false);
  assert.equal(result.diagnosis.retryAllowed, false);
  assert.equal(result.safety.readOnlyDiagnostic, true);
  assert.equal(result.safety.tokenValueRead, false);
  assert.equal(result.safety.configChanged, false);
  assert.equal(result.safety.recordMemoryRetried, false);
});

test('CM1097 fails closed when source evidence does not prove no-token record_memory gate', () => {
  const result = buildV11AuthorizedMutationTokenPathDiagnostic(diagnosticInput({
    sourceEvidence: {
      httpServerAuthorizeRequiresBearerWhenConfigured: true,
      healthAuthRequiredReflectsBearerTokenPresence: true,
      noTokenJsonRpcMutationGatePresent: true,
      recordMemoryListedAsNoTokenBlockedTool: false,
      noTokenMutationRejectsBeforeMcpHandler: true,
      noTokenMutationRejectionCode: REQUIRED_REJECTION_CODE,
      invalidBearerWouldReturnUnauthorizedBeforeJsonRpc: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.match(result.blockerReasons.join(','), /source_record_memory_no_token_block_not_confirmed/);
});

test('CM1097 fails closed when attempt evidence is not the CM1096 no-token rejection', () => {
  const result = buildV11AuthorizedMutationTokenPathDiagnostic(diagnosticInput({
    attemptEvidence: {
      approvalPacketId: 'CM-1096-EXACT-RECORD-MEMORY-WRITE-001',
      targetTool: REQUIRED_TARGET_TOOL,
      currentHeadCommit: HEAD_COMMIT,
      callsUsed: 1,
      resultCode: 'OTHER_ERROR',
      httpStatus: 401,
      acceptedMemoryId: null,
      acceptedWriteResult: null,
      retried: false,
      searchMemoryCalled: false,
      rawStoreRead: false,
      rawAuditRead: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.match(result.blockerReasons.join(','), /attempt_result_code_mismatch/);
  assert.match(result.blockerReasons.join(','), /attempt_http_status_must_be_403/);
});

test('CM1097 rejects retries, accepted writes, raw reads, and config changes', () => {
  const result = buildV11AuthorizedMutationTokenPathDiagnostic(diagnosticInput({
    attemptEvidence: {
      approvalPacketId: 'CM-1096-EXACT-RECORD-MEMORY-WRITE-001',
      targetTool: REQUIRED_TARGET_TOOL,
      currentHeadCommit: HEAD_COMMIT,
      callsUsed: 2,
      resultCode: REQUIRED_REJECTION_CODE,
      httpStatus: 403,
      acceptedMemoryId: 'memory-1',
      acceptedWriteResult: {},
      retried: true,
      searchMemoryCalled: false,
      rawStoreRead: true,
      rawAuditRead: false
    },
    sideEffectCounters: zeroCounters({
      mcpToolCalls: 1,
      configWatchdogStartupChanges: 1
    })
  }));

  assert.equal(result.accepted, false);
  assert.match(result.blockerReasons.join(','), /attempt_calls_used_must_be_one/);
  assert.match(result.blockerReasons.join(','), /attempt_accepted_memory_id_must_be_null/);
  assert.match(result.blockerReasons.join(','), /attempt_retry_must_be_false/);
  assert.match(result.blockerReasons.join(','), /attempt_raw_reads_must_be_false/);
  assert.match(result.blockerReasons.join(','), /counter_mcpToolCalls_must_be_zero/);
  assert.match(result.blockerReasons.join(','), /counter_configWatchdogStartupChanges_must_be_zero/);
});

test('CM1097 rejects token-like fragments and readiness overclaims', () => {
  const result = buildV11AuthorizedMutationTokenPathDiagnostic(diagnosticInput({
    note: 'authorization: bearer should-not-appear',
    claimsReadiness: true
  }));

  assert.equal(result.accepted, false);
  assert.match(result.blockerReasons.join(','), /sensitive_or_token_like_fragment_present/);
  assert.match(result.blockerReasons.join(','), /forbidden_true_flag_present/);
});

test('CM1097 requires current-head and sealed-RC binding plus validation plan', () => {
  const result = buildV11AuthorizedMutationTokenPathDiagnostic(diagnosticInput({
    baseline: {
      sealedRcCommit: '0'.repeat(40),
      currentHeadCommit: HEAD_COMMIT,
      expectedCurrentHeadCommit: '1'.repeat(40),
      sealedV1RcPreserved: false,
      exactCurrentHeadBound: false
    },
    validation: {
      commands: [],
      docsValidationPlanned: false,
      diffCheckPlanned: false,
      ledgerConsistencyPlanned: false,
      noSecretValueExposureReviewPlanned: false,
      noRetryPlanned: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.match(result.blockerReasons.join(','), /sealed_rc_commit_mismatch/);
  assert.match(result.blockerReasons.join(','), /current_head_not_exactly_bound/);
  assert.match(result.blockerReasons.join(','), /validation_command_missing/);
  assert.match(result.blockerReasons.join(','), /docs_validation_not_planned/);
});
