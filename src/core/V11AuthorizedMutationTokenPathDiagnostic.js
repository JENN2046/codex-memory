'use strict';

const {
  SEALED_V1_0_RC_COMMIT
} = require('./V11HardeningValidationAggregator');

const TASK_ID = 'CM-1097_AUTHORIZED_MUTATION_TOKEN_PATH_DIAGNOSTIC';
const SCHEMA_VERSION = 'v1-1-authorized-mutation-token-path-diagnostic-v1';
const RESULT_STATUS_ACCEPTED =
  'AUTHORIZED_MUTATION_TOKEN_PATH_DIAGNOSTIC_ACCEPTED_NO_TOKEN_RUNTIME_NOT_WRITTEN_NOT_READY';
const RESULT_STATUS_BLOCKED =
  'AUTHORIZED_MUTATION_TOKEN_PATH_DIAGNOSTIC_BLOCKED_NOT_READY';
const REQUIRED_MODE = 'v1_1_authorized_mutation_token_path_diagnostic_read_only';
const REQUIRED_SOURCE_MODE = 'explicit_sanitized_source_and_attempt_evidence_only';
const REQUIRED_TARGET_TOOL = 'record_memory';
const REQUIRED_REJECTION_CODE = 'NO_TOKEN_MUTATION_REJECTED';

const REQUIRED_VALIDATION_COMMANDS = Object.freeze([
  'node --test .\\tests\\v1-1-authorized-mutation-token-path-diagnostic.test.js'
]);

const REQUIRED_ZERO_COUNTER_KEYS = Object.freeze([
  'providerCalls',
  'apiCalls',
  'mcpToolCalls',
  'trueRecordMemoryCalls',
  'trueSearchMemoryCalls',
  'rawMemoryReads',
  'rawJsonlReads',
  'rawAuditReads',
  'durableMemoryWrites',
  'durableAuditWrites',
  'recordMemoryRetries',
  'acceptedRecordMemoryWrites',
  'configReads',
  'tokenValueReads',
  'tokenValuePrints',
  'tokenInjections',
  'configWatchdogStartupChanges',
  'dependencyActions',
  'publicMcpExpansions',
  'pushRuns',
  'tagReleaseDeployRuns',
  'readinessClaims',
  'reliabilityClaims'
]);

const FORBIDDEN_FRAGMENTS = Object.freeze([
  'authorization:',
  'bearer ',
  'set-cookie',
  'api_key',
  'providerapikey',
  'token=',
  'password',
  'sk_live_',
  'sk-proj-',
  '.env'
]);

const FORBIDDEN_TRUE_FLAGS = Object.freeze([
  'recordMemoryRetried',
  'recordMemoryAccepted',
  'durableMemoryWritten',
  'durableAuditWritten',
  'callsProvider',
  'callsRecordMemory',
  'callsSearchMemory',
  'readsRawMemory',
  'readsJsonl',
  'readsRawAudit',
  'readsConfig',
  'readsTokenValue',
  'printsTokenValue',
  'injectsToken',
  'changesConfigWatchdogStartup',
  'changesDependencies',
  'publicMcpExpansion',
  'publicMcpExpanded',
  'pushPerformed',
  'tagCreated',
  'releaseCreated',
  'deployPerformed',
  'readinessClaimed',
  'reliabilityClaimed',
  'claimsReadiness',
  'claimsReliability',
  'claimsWriteReliable'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeCommit(value) {
  const normalized = normalizeString(value).toLowerCase();
  return /^[a-f0-9]{40}$/.test(normalized) ? normalized : '';
}

function containsForbiddenFragment(value) {
  const encoded = JSON.stringify(value || {}).toLowerCase();
  return FORBIDDEN_FRAGMENTS.some(fragment => encoded.includes(fragment));
}

function hasForbiddenTrueFlagDeep(value) {
  if (Array.isArray(value)) return value.some(item => hasForbiddenTrueFlagDeep(item));
  if (!isPlainObject(value)) return false;
  if (FORBIDDEN_TRUE_FLAGS.some(key => value[key] === true)) return true;
  return Object.values(value).some(item => hasForbiddenTrueFlagDeep(item));
}

function hasNonzeroCounterDeep(value) {
  if (Array.isArray(value)) return value.some(item => hasNonzeroCounterDeep(item));
  if (!isPlainObject(value)) return false;
  for (const key of REQUIRED_ZERO_COUNTER_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    const counterValue = value[key];
    if (counterValue === false) continue;
    if (!Number.isInteger(counterValue) || counterValue < 0 || counterValue !== 0) {
      return true;
    }
  }
  return Object.values(value).some(item => hasNonzeroCounterDeep(item));
}

function collectCounterBlockers(counters = {}) {
  const safeCounters = isPlainObject(counters) ? counters : {};
  const blockers = [];
  for (const key of REQUIRED_ZERO_COUNTER_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(safeCounters, key)) {
      blockers.push(`counter_${key}_missing`);
      continue;
    }
    const value = safeCounters[key];
    if (!Number.isInteger(value) || value < 0) {
      blockers.push(`counter_${key}_malformed`);
    } else if (value !== 0) {
      blockers.push(`counter_${key}_must_be_zero`);
    }
  }
  for (const [key, value] of Object.entries(safeCounters)) {
    if (REQUIRED_ZERO_COUNTER_KEYS.includes(key)) continue;
    if (!Number.isInteger(value) || value < 0) {
      blockers.push(`counter_${key}_unknown_malformed`);
    } else if (value !== 0) {
      blockers.push(`counter_${key}_unknown_nonzero`);
    }
  }
  return blockers;
}

function normalizeCounterMap(counters = {}) {
  const safeCounters = isPlainObject(counters) ? counters : {};
  return Object.fromEntries(REQUIRED_ZERO_COUNTER_KEYS.map(key => [key, safeCounters[key]]));
}

function collectSourceEvidenceBlockers(sourceEvidence = {}) {
  const evidence = isPlainObject(sourceEvidence) ? sourceEvidence : {};
  const blockers = [];

  if (evidence.httpServerAuthorizeRequiresBearerWhenConfigured !== true) {
    blockers.push('source_authorize_bearer_gate_not_confirmed');
  }
  if (evidence.healthAuthRequiredReflectsBearerTokenPresence !== true) {
    blockers.push('source_health_auth_required_signal_not_confirmed');
  }
  if (evidence.noTokenJsonRpcMutationGatePresent !== true) {
    blockers.push('source_no_token_jsonrpc_gate_not_confirmed');
  }
  if (evidence.recordMemoryListedAsNoTokenBlockedTool !== true) {
    blockers.push('source_record_memory_no_token_block_not_confirmed');
  }
  if (evidence.noTokenMutationRejectsBeforeMcpHandler !== true) {
    blockers.push('source_no_token_rejection_order_not_confirmed');
  }
  if (evidence.noTokenMutationRejectionCode !== REQUIRED_REJECTION_CODE) {
    blockers.push('source_no_token_rejection_code_mismatch');
  }
  if (evidence.invalidBearerWouldReturnUnauthorizedBeforeJsonRpc !== true) {
    blockers.push('source_invalid_bearer_unauthorized_order_not_confirmed');
  }

  return blockers;
}

function collectAttemptEvidenceBlockers(attemptEvidence = {}, expectedCurrentHeadCommit = '') {
  const evidence = isPlainObject(attemptEvidence) ? attemptEvidence : {};
  const blockers = [];

  if (evidence.approvalPacketId !== 'CM-1096-EXACT-RECORD-MEMORY-WRITE-001') {
    blockers.push('attempt_approval_packet_id_mismatch');
  }
  if (evidence.targetTool !== REQUIRED_TARGET_TOOL) {
    blockers.push('attempt_target_tool_mismatch');
  }
  if (evidence.currentHeadCommit !== expectedCurrentHeadCommit) {
    blockers.push('attempt_current_head_mismatch');
  }
  if (evidence.callsUsed !== 1) {
    blockers.push('attempt_calls_used_must_be_one');
  }
  if (evidence.resultCode !== REQUIRED_REJECTION_CODE) {
    blockers.push('attempt_result_code_mismatch');
  }
  if (evidence.httpStatus !== 403) {
    blockers.push('attempt_http_status_must_be_403_for_no_token_jsonrpc_rejection');
  }
  if (evidence.acceptedMemoryId !== null) {
    blockers.push('attempt_accepted_memory_id_must_be_null');
  }
  if (evidence.acceptedWriteResult !== null) {
    blockers.push('attempt_accepted_write_result_must_be_null');
  }
  if (evidence.retried !== false) {
    blockers.push('attempt_retry_must_be_false');
  }
  if (evidence.searchMemoryCalled !== false) {
    blockers.push('attempt_search_memory_called_must_be_false');
  }
  if (evidence.rawStoreRead !== false || evidence.rawAuditRead !== false) {
    blockers.push('attempt_raw_reads_must_be_false');
  }

  return blockers;
}

function collectValidationBlockers(validation = {}) {
  const safeValidation = isPlainObject(validation) ? validation : {};
  const commands = Array.isArray(safeValidation.commands) ? safeValidation.commands : [];
  const blockers = [];

  for (const command of REQUIRED_VALIDATION_COMMANDS) {
    if (!commands.includes(command)) {
      blockers.push(`validation_command_missing:${command}`);
    }
  }
  if (safeValidation.docsValidationPlanned !== true) {
    blockers.push('docs_validation_not_planned');
  }
  if (safeValidation.diffCheckPlanned !== true) {
    blockers.push('diff_check_not_planned');
  }
  if (safeValidation.ledgerConsistencyPlanned !== true) {
    blockers.push('ledger_consistency_not_planned');
  }
  if (safeValidation.noSecretValueExposureReviewPlanned !== true) {
    blockers.push('secret_exposure_review_not_planned');
  }
  if (safeValidation.noRetryPlanned !== true) {
    blockers.push('no_retry_plan_not_confirmed');
  }

  return blockers;
}

function buildAcceptedResult({
  baseline,
  sourceEvidence,
  attemptEvidence,
  sideEffectCounters
}) {
  return {
    taskId: TASK_ID,
    schemaVersion: SCHEMA_VERSION,
    status: RESULT_STATUS_ACCEPTED,
    accepted: true,
    diagnosticAccepted: true,
    blockerReasons: [],
    baselineBinding: {
      sealedRcCommit: baseline.sealedRcCommit,
      currentHeadCommit: baseline.currentHeadCommit,
      expectedCurrentHeadCommit: baseline.expectedCurrentHeadCommit,
      sealedV1RcPreserved: true,
      exactCurrentHeadBound: true
    },
    diagnosis: {
      targetTool: REQUIRED_TARGET_TOOL,
      observedRejectionCode: attemptEvidence.resultCode,
      observedHttpStatus: attemptEvidence.httpStatus,
      activeRuntimeTokenPath: 'no_token_http_mcp_mutation_gate',
      inferredFromSource: true,
      inferredFromReturnedErrorShape: true,
      bearerAuthorizedToolRequestConfirmed: false,
      bearerTokenConfiguredOnActiveRuntimeConfirmed: false,
      writeAccepted: false,
      retryAllowed: false,
      requiredNextBoundary: 'fresh_bearer_authorized_tool_path_then_fresh_exact_write_approval'
    },
    sourceEvidence: {
      httpServerAuthorizeRequiresBearerWhenConfigured:
        sourceEvidence.httpServerAuthorizeRequiresBearerWhenConfigured === true,
      healthAuthRequiredReflectsBearerTokenPresence:
        sourceEvidence.healthAuthRequiredReflectsBearerTokenPresence === true,
      noTokenJsonRpcMutationGatePresent:
        sourceEvidence.noTokenJsonRpcMutationGatePresent === true,
      recordMemoryListedAsNoTokenBlockedTool:
        sourceEvidence.recordMemoryListedAsNoTokenBlockedTool === true,
      noTokenMutationRejectsBeforeMcpHandler:
        sourceEvidence.noTokenMutationRejectsBeforeMcpHandler === true,
      noTokenMutationRejectionCode: sourceEvidence.noTokenMutationRejectionCode,
      invalidBearerWouldReturnUnauthorizedBeforeJsonRpc:
        sourceEvidence.invalidBearerWouldReturnUnauthorizedBeforeJsonRpc === true
    },
    attemptEvidence: {
      approvalPacketId: attemptEvidence.approvalPacketId,
      targetTool: attemptEvidence.targetTool,
      currentHeadCommit: attemptEvidence.currentHeadCommit,
      callsUsed: attemptEvidence.callsUsed,
      resultCode: attemptEvidence.resultCode,
      httpStatus: attemptEvidence.httpStatus,
      acceptedMemoryId: attemptEvidence.acceptedMemoryId,
      acceptedWriteResult: attemptEvidence.acceptedWriteResult,
      retried: attemptEvidence.retried === true,
      searchMemoryCalled: attemptEvidence.searchMemoryCalled === true,
      rawStoreRead: attemptEvidence.rawStoreRead === true,
      rawAuditRead: attemptEvidence.rawAuditRead === true
    },
    sideEffectCounters: normalizeCounterMap(sideEffectCounters),
    safety: {
      readOnlyDiagnostic: true,
      tokenValueRead: false,
      tokenValuePrinted: false,
      tokenInjected: false,
      configChanged: false,
      startupChanged: false,
      watchdogChanged: false,
      dependencyChanged: false,
      recordMemoryRetried: false,
      searchMemoryCalled: false,
      rawStoreRead: false,
      rawAuditRead: false,
      publicMcpExpanded: false,
      readinessClaimed: false,
      reliabilityClaimed: false
    }
  };
}

function buildBlockedResult(blockerReasons, input = {}) {
  const baseline = isPlainObject(input.baseline) ? input.baseline : {};
  return {
    taskId: TASK_ID,
    schemaVersion: SCHEMA_VERSION,
    status: RESULT_STATUS_BLOCKED,
    accepted: false,
    diagnosticAccepted: false,
    blockerReasons,
    baselineBinding: {
      sealedRcCommit: normalizeString(baseline.sealedRcCommit),
      currentHeadCommit: normalizeString(baseline.currentHeadCommit),
      expectedCurrentHeadCommit: normalizeString(baseline.expectedCurrentHeadCommit),
      sealedV1RcPreserved: false,
      exactCurrentHeadBound: false
    },
    diagnosis: {
      targetTool: REQUIRED_TARGET_TOOL,
      activeRuntimeTokenPath: 'undetermined',
      bearerAuthorizedToolRequestConfirmed: false,
      bearerTokenConfiguredOnActiveRuntimeConfirmed: false,
      writeAccepted: false,
      retryAllowed: false
    },
    sideEffectCounters: normalizeCounterMap(input.sideEffectCounters),
    safety: {
      readOnlyDiagnostic: false,
      tokenValueRead: false,
      tokenValuePrinted: false,
      tokenInjected: false,
      configChanged: false,
      startupChanged: false,
      watchdogChanged: false,
      dependencyChanged: false,
      recordMemoryRetried: false,
      searchMemoryCalled: false,
      rawStoreRead: false,
      rawAuditRead: false,
      publicMcpExpanded: false,
      readinessClaimed: false,
      reliabilityClaimed: false
    }
  };
}

function buildV11AuthorizedMutationTokenPathDiagnostic(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const baseline = isPlainObject(safeInput.baseline) ? safeInput.baseline : {};
  const sourceEvidence = isPlainObject(safeInput.sourceEvidence) ? safeInput.sourceEvidence : {};
  const attemptEvidence = isPlainObject(safeInput.attemptEvidence) ? safeInput.attemptEvidence : {};
  const validation = isPlainObject(safeInput.validation) ? safeInput.validation : {};
  const sideEffectCounters = isPlainObject(safeInput.sideEffectCounters)
    ? safeInput.sideEffectCounters
    : {};

  const currentHeadCommit = normalizeCommit(baseline.currentHeadCommit);
  const expectedCurrentHeadCommit = normalizeCommit(baseline.expectedCurrentHeadCommit);
  const sealedRcCommit = normalizeCommit(baseline.sealedRcCommit);
  const blockers = [];

  if (safeInput.mode !== REQUIRED_MODE) {
    blockers.push('mode_mismatch');
  }
  if (safeInput.sourceMode !== REQUIRED_SOURCE_MODE) {
    blockers.push('source_mode_mismatch');
  }
  if (sealedRcCommit !== SEALED_V1_0_RC_COMMIT) {
    blockers.push('sealed_rc_commit_mismatch');
  }
  if (!currentHeadCommit || currentHeadCommit !== expectedCurrentHeadCommit) {
    blockers.push('current_head_not_exactly_bound');
  }
  if (baseline.sealedV1RcPreserved !== true) {
    blockers.push('sealed_v1_rc_not_preserved');
  }
  if (baseline.exactCurrentHeadBound !== true) {
    blockers.push('exact_current_head_not_confirmed');
  }

  blockers.push(...collectSourceEvidenceBlockers(sourceEvidence));
  blockers.push(...collectAttemptEvidenceBlockers(attemptEvidence, expectedCurrentHeadCommit));
  blockers.push(...collectValidationBlockers(validation));
  blockers.push(...collectCounterBlockers(sideEffectCounters));

  if (containsForbiddenFragment(safeInput)) {
    blockers.push('sensitive_or_token_like_fragment_present');
  }
  if (hasForbiddenTrueFlagDeep(safeInput)) {
    blockers.push('forbidden_true_flag_present');
  }
  if (hasNonzeroCounterDeep(safeInput)) {
    blockers.push('nested_nonzero_or_malformed_counter_present');
  }

  if (blockers.length > 0) {
    return buildBlockedResult([...new Set(blockers)], safeInput);
  }

  return buildAcceptedResult({
    baseline: {
      sealedRcCommit,
      currentHeadCommit,
      expectedCurrentHeadCommit
    },
    sourceEvidence,
    attemptEvidence,
    sideEffectCounters
  });
}

module.exports = {
  REQUIRED_MODE,
  REQUIRED_REJECTION_CODE,
  REQUIRED_SOURCE_MODE,
  REQUIRED_TARGET_TOOL,
  REQUIRED_VALIDATION_COMMANDS,
  REQUIRED_ZERO_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  SCHEMA_VERSION,
  TASK_ID,
  buildV11AuthorizedMutationTokenPathDiagnostic
};
