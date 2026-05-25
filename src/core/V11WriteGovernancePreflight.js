'use strict';

const {
  SEALED_V1_0_RC_COMMIT
} = require('./V11HardeningValidationAggregator');
const {
  RESULT_STATUS_ACCEPTED: EVIDENCE_PACKET_STATUS_ACCEPTED,
  TASK_ID: EVIDENCE_PACKET_TASK_ID
} = require('./V11HardeningEvidencePacketRunner');

const TASK_ID = 'CM-1090_V1_1_WRITE_GOVERNANCE_PREFLIGHT';
const SCHEMA_VERSION = 'v1-1-write-governance-preflight-v1';
const RESULT_STATUS_ACCEPTED =
  'V1_1_WRITE_GOVERNANCE_PREFLIGHT_ACCEPTED_NOT_EXECUTED_NOT_READY';
const RESULT_STATUS_BLOCKED =
  'V1_1_WRITE_GOVERNANCE_PREFLIGHT_BLOCKED_NOT_READY';
const REQUIRED_MODE = 'v1_1_write_governance_preflight_review_only';
const REQUIRED_SOURCE_MODE = 'explicit_sanitized_evidence_packet_and_write_request_only';
const REQUIRED_ACTION_ID = 'governed_record_memory_write_preflight';
const REQUIRED_TARGET_TOOL = 'record_memory';

const REQUIRED_SCOPE_FIELDS = Object.freeze([
  'projectRef',
  'workspaceRef',
  'clientRef',
  'agentRef',
  'taskRef',
  'visibility'
]);

const REQUIRED_AGGREGATOR_EVIDENCE_IDS = Object.freeze([
  'cm1082_proof_memory_tombstone_store_backed_dry_run_preview',
  'cm1083_reconcile_retry_backoff_durable_persistence_preview',
  'cm1084_startup_reconcile_worker_safety',
  'cm1085_cleanup_rollback_apply_design_policy',
  'cm1087_governance_runtime_approval_audit_loop'
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
  'recordMemoryExecutions',
  'approvalAuditWrites',
  'cleanupApplyRuns',
  'rollbackApplyRuns',
  'schemaMigrationApplies',
  'startupWorkerEnablements',
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
  'recordMemoryExecutionAuthorized',
  'recordMemoryExecuted',
  'durableMemoryWriteAuthorized',
  'durableMemoryWritten',
  'durableAuditWritten',
  'callsProvider',
  'callsRecordMemory',
  'callsSearchMemory',
  'readsRawMemory',
  'readsJsonl',
  'readsRawAudit',
  'writesDurableMemory',
  'writesDurableAudit',
  'publicMcpExpansion',
  'publicMcpExpanded',
  'changesConfigWatchdogStartup',
  'changesDependencies',
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

function normalizeDate(value) {
  const text = normalizeString(value);
  if (!text) return null;
  const time = Date.parse(text);
  return Number.isFinite(time) ? { text, time } : null;
}

function isSha256Hex(value) {
  return /^[a-f0-9]{64}$/i.test(normalizeString(value));
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

function normalizeScope(scope = {}) {
  const safeScope = isPlainObject(scope) ? scope : {};
  return Object.fromEntries(REQUIRED_SCOPE_FIELDS.map(field => [
    field,
    normalizeString(safeScope[field])
  ]));
}

function collectScopeBlockers(scope = {}) {
  const normalized = normalizeScope(scope);
  return REQUIRED_SCOPE_FIELDS
    .filter(field => !normalized[field])
    .map(field => `scope_${field}_required`);
}

function collectEvidencePacketBlockers(report = {}, expectedCurrentHeadCommit = '') {
  const safeReport = isPlainObject(report) ? report : {};
  const blockers = [];
  const baselineBinding = isPlainObject(safeReport.baselineBinding)
    ? safeReport.baselineBinding
    : {};
  const validationAggregatorInput = isPlainObject(safeReport.validationAggregatorInput)
    ? safeReport.validationAggregatorInput
    : {};
  const evidenceById = isPlainObject(validationAggregatorInput.evidenceById)
    ? validationAggregatorInput.evidenceById
    : {};

  if (safeReport.taskId !== EVIDENCE_PACKET_TASK_ID) blockers.push('evidence_packet_task_id_mismatch');
  if (safeReport.status !== EVIDENCE_PACKET_STATUS_ACCEPTED) blockers.push('evidence_packet_status_mismatch');
  if (safeReport.accepted !== true || safeReport.evidencePacketAccepted !== true) {
    blockers.push('evidence_packet_not_accepted');
  }
  if (Array.isArray(safeReport.blockerReasons) && safeReport.blockerReasons.length > 0) {
    blockers.push('evidence_packet_has_blockers');
  }
  if (baselineBinding.sealedV1RcPreserved !== true) blockers.push('sealed_v1_0_rc_not_preserved');
  if (baselineBinding.exactCurrentHeadBound !== true) blockers.push('current_head_not_bound');
  if (normalizeCommit(baselineBinding.sealedRcCommit) !== SEALED_V1_0_RC_COMMIT) {
    blockers.push('sealed_v1_0_rc_commit_mismatch');
  }
  if (expectedCurrentHeadCommit &&
    normalizeCommit(baselineBinding.currentHeadCommit) !== expectedCurrentHeadCommit) {
    blockers.push('current_head_commit_mismatch');
  }
  if (validationAggregatorInput.claimsReadiness === true ||
    validationAggregatorInput.claimsReliability === true ||
    validationAggregatorInput.publicMcpExpansion === true) {
    blockers.push('validation_aggregator_input_overclaim');
  }
  for (const id of REQUIRED_AGGREGATOR_EVIDENCE_IDS) {
    if (!Object.prototype.hasOwnProperty.call(evidenceById, id)) {
      blockers.push(`validation_aggregator_input_${id}_missing`);
    }
  }
  if (containsForbiddenFragment(safeReport)) blockers.push('evidence_packet_sensitive_fragment_rejected');
  if (hasForbiddenTrueFlagDeep(safeReport)) blockers.push('evidence_packet_forbidden_action_claim');
  if (hasNonzeroCounterDeep(safeReport)) blockers.push('evidence_packet_side_effect_counter_nonzero');

  return blockers;
}

function collectWriteRequestBlockers(request = {}) {
  const safeRequest = isPlainObject(request) ? request : {};
  const blockers = [];

  if (normalizeString(safeRequest.actionId) !== REQUIRED_ACTION_ID) {
    blockers.push('write_request_action_id_mismatch');
  }
  if (normalizeString(safeRequest.targetTool) !== REQUIRED_TARGET_TOOL) {
    blockers.push('write_request_target_tool_mismatch');
  }
  if (normalizeString(safeRequest.executionMode) !== 'preflight_only') {
    blockers.push('write_request_execution_mode_must_be_preflight_only');
  }
  if (safeRequest.contentIncluded !== false || safeRequest.rawContentIncluded !== false) {
    blockers.push('write_request_content_must_not_be_included');
  }
  if (safeRequest.sanitizedSummaryProvided !== true) {
    blockers.push('write_request_sanitized_summary_required');
  }
  if (!isSha256Hex(safeRequest.payloadHash)) blockers.push('write_request_payload_hash_required');
  if (safeRequest.maxFutureRecordMemoryCalls !== 1) {
    blockers.push('write_request_max_future_record_memory_calls_must_be_one');
  }
  if (safeRequest.approvalRequiredBeforeExecution !== true) {
    blockers.push('write_request_approval_required_before_execution');
  }
  if (safeRequest.reviewRequiredBeforeExecution !== true) {
    blockers.push('write_request_review_required_before_execution');
  }
  if (safeRequest.runtimeValidationRequiredBeforeExecution !== true) {
    blockers.push('write_request_runtime_validation_required_before_execution');
  }
  if (safeRequest.operatorReceiptRequiredBeforeExecution !== true) {
    blockers.push('write_request_operator_receipt_required_before_execution');
  }
  blockers.push(...collectScopeBlockers(safeRequest.targetScope));
  if (containsForbiddenFragment(safeRequest)) blockers.push('write_request_sensitive_fragment_rejected');
  if (hasForbiddenTrueFlagDeep(safeRequest)) blockers.push('write_request_forbidden_action_claim');
  if (hasNonzeroCounterDeep(safeRequest)) blockers.push('write_request_side_effect_counter_nonzero');

  return blockers;
}

function buildApprovalPacketTemplate({ packetId, currentHeadCommit, proposedWriteRequest }) {
  return {
    packetId: `${packetId}:approval-template`,
    actionId: REQUIRED_ACTION_ID,
    targetTool: REQUIRED_TARGET_TOOL,
    currentHeadCommit,
    targetScope: normalizeScope(proposedWriteRequest.targetScope),
    payloadHash: normalizeString(proposedWriteRequest.payloadHash),
    exactActionNamed: true,
    exactScopeNamed: true,
    exactPayloadHashNamed: true,
    executionApproved: false,
    recordMemoryExecutionAuthorized: false,
    recordMemoryExecuted: false,
    durableMemoryWriteAuthorized: false,
    durableMemoryWritten: false,
    durableAuditWritten: false,
    expiresAtRequired: true,
    operatorReceiptRequiredBeforeExecution: true,
    runtimeValidationRequiredBeforeExecution: true
  };
}

function buildV11WriteGovernancePreflight(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const mode = normalizeString(safeInput.mode);
  const sourceMode = normalizeString(safeInput.sourceMode);
  const packetId = normalizeString(safeInput.packetId) ||
    'CM-1090_V1_1_WRITE_GOVERNANCE_PREFLIGHT_LOCAL';
  const asOf = normalizeDate(safeInput.asOf) || normalizeDate(new Date().toISOString());
  const sealedRcCommit = normalizeCommit(safeInput.sealedRcCommit);
  const currentHeadCommit = normalizeCommit(safeInput.currentHeadCommit);
  const expectedCurrentHeadCommit = normalizeCommit(safeInput.expectedCurrentHeadCommit);
  const proposedWriteRequest = isPlainObject(safeInput.proposedWriteRequest)
    ? safeInput.proposedWriteRequest
    : {};
  const blockers = [];

  if (mode !== REQUIRED_MODE) blockers.push('mode_must_be_v1_1_write_governance_preflight_review_only');
  if (sourceMode !== REQUIRED_SOURCE_MODE) {
    blockers.push('source_mode_must_be_explicit_sanitized_evidence_packet_and_write_request_only');
  }
  if (sealedRcCommit !== SEALED_V1_0_RC_COMMIT) blockers.push('sealed_v1_0_rc_commit_mismatch');
  if (!currentHeadCommit) blockers.push('current_head_commit_required');
  if (expectedCurrentHeadCommit && currentHeadCommit !== expectedCurrentHeadCommit) {
    blockers.push('current_head_commit_mismatch');
  }
  if (safeInput.claimsReadiness === true || safeInput.claimsReliability === true) {
    blockers.push('readiness_or_reliability_overclaim');
  }
  blockers.push(...collectCounterBlockers(safeInput.sideEffectCounters));
  blockers.push(...collectEvidencePacketBlockers(
    safeInput.evidencePacketReport,
    expectedCurrentHeadCommit || currentHeadCommit
  ).map(reason => `evidence_packet:${reason}`));
  blockers.push(...collectWriteRequestBlockers(proposedWriteRequest)
    .map(reason => `write_request:${reason}`));

  const uniqueBlockers = [...new Set(blockers)];
  const accepted = uniqueBlockers.length === 0;

  return {
    taskId: TASK_ID,
    schemaVersion: SCHEMA_VERSION,
    mode,
    sourceMode,
    packetId,
    asOf: asOf ? asOf.text : null,
    status: accepted ? RESULT_STATUS_ACCEPTED : RESULT_STATUS_BLOCKED,
    accepted,
    writeGovernancePreflightAccepted: accepted,
    executionStarted: false,
    recordMemoryStarted: false,
    recordMemoryExecuted: false,
    durableMemoryWritten: false,
    durableAuditWritten: false,
    baselineBinding: {
      sealedRcCommit: sealedRcCommit || null,
      currentHeadCommit: currentHeadCommit || null,
      expectedCurrentHeadCommit: expectedCurrentHeadCommit || currentHeadCommit || null,
      sealedV1RcPreserved: sealedRcCommit === SEALED_V1_0_RC_COMMIT,
      exactCurrentHeadBound: Boolean(currentHeadCommit) &&
        (!expectedCurrentHeadCommit || currentHeadCommit === expectedCurrentHeadCommit)
    },
    targetScope: normalizeScope(proposedWriteRequest.targetScope),
    approvalPacketTemplate: buildApprovalPacketTemplate({
      packetId,
      currentHeadCommit,
      proposedWriteRequest
    }),
    sideEffectCounters: normalizeCounterMap(safeInput.sideEffectCounters),
    readinessClaimed: false,
    reliabilityClaimed: false,
    rcReady: false,
    releaseReady: false,
    deployReady: false,
    blockerReasons: uniqueBlockers,
    nextAllowedAction: accepted
      ? 'request_exact_write_approval_or_keep_preflight_for_review_do_not_execute'
      : 'fix_write_governance_preflight_blockers',
    safety: {
      sourceMode: 'explicit_input_only',
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      callsRecordMemory: false,
      callsSearchMemory: false,
      readsRawMemory: false,
      readsJsonl: false,
      readsRawAudit: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      appliesTombstone: false,
      appliesCleanup: false,
      appliesRollback: false,
      migratesSchema: false,
      enablesStartupWorker: false,
      changesConfigWatchdogStartup: false,
      changesDependencies: false,
      expandsPublicMcp: false,
      pushes: false,
      tagsReleasesDeploys: false,
      claimsReadiness: false,
      claimsReliability: false
    }
  };
}

module.exports = {
  REQUIRED_ACTION_ID,
  REQUIRED_AGGREGATOR_EVIDENCE_IDS,
  REQUIRED_MODE,
  REQUIRED_SCOPE_FIELDS,
  REQUIRED_SOURCE_MODE,
  REQUIRED_TARGET_TOOL,
  REQUIRED_ZERO_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  SCHEMA_VERSION,
  TASK_ID,
  buildV11WriteGovernancePreflight
};
