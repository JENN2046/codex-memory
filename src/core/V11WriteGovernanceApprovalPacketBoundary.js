'use strict';

const {
  SEALED_V1_0_RC_COMMIT
} = require('./V11HardeningValidationAggregator');
const {
  REQUIRED_ACTION_ID,
  REQUIRED_SCOPE_FIELDS,
  REQUIRED_TARGET_TOOL,
  RESULT_STATUS_ACCEPTED: WRITE_GOVERNANCE_PREFLIGHT_STATUS_ACCEPTED,
  TASK_ID: WRITE_GOVERNANCE_PREFLIGHT_TASK_ID
} = require('./V11WriteGovernancePreflight');

const TASK_ID = 'CM-1091_V1_1_WRITE_GOVERNANCE_APPROVAL_PACKET_BOUNDARY';
const SCHEMA_VERSION = 'v1-1-write-governance-approval-packet-boundary-v1';
const RESULT_STATUS_ACCEPTED =
  'V1_1_WRITE_GOVERNANCE_APPROVAL_PACKET_ACCEPTED_NOT_EXECUTED_NOT_READY';
const RESULT_STATUS_BLOCKED =
  'V1_1_WRITE_GOVERNANCE_APPROVAL_PACKET_BLOCKED_NOT_READY';
const REQUIRED_MODE = 'v1_1_write_governance_approval_packet_boundary_review_only';
const REQUIRED_SOURCE_MODE = 'explicit_sanitized_preflight_and_approval_packet_only';
const REQUIRED_APPROVAL_FAMILY = 'v1_1_governed_record_memory_write_exact_approval';

const REQUIRED_VALIDATION_COMMANDS = Object.freeze([
  'node --test .\\tests\\v1-1-write-governance-approval-packet-boundary.test.js',
  'node --test .\\tests\\v1-1-write-governance-preflight.test.js'
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
  'operatorReceiptWrites',
  'postWriteVerificationRuns',
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
  'recordMemoryExecuted',
  'executionStarted',
  'durableMemoryWritten',
  'durableAuditWritten',
  'operatorReceiptWritten',
  'postWriteVerificationExecuted',
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

function normalizeScope(scope = {}) {
  const safeScope = isPlainObject(scope) ? scope : {};
  return Object.fromEntries(REQUIRED_SCOPE_FIELDS.map(field => [
    field,
    normalizeString(safeScope[field])
  ]));
}

function scopesEqual(left = {}, right = {}) {
  const normalizedLeft = normalizeScope(left);
  const normalizedRight = normalizeScope(right);
  return REQUIRED_SCOPE_FIELDS.every(field => normalizedLeft[field] === normalizedRight[field]);
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

function collectPreflightBlockers(preflight = {}, expectedCurrentHeadCommit = '') {
  const safePreflight = isPlainObject(preflight) ? preflight : {};
  const baselineBinding = isPlainObject(safePreflight.baselineBinding)
    ? safePreflight.baselineBinding
    : {};
  const blockers = [];

  if (safePreflight.taskId !== WRITE_GOVERNANCE_PREFLIGHT_TASK_ID) {
    blockers.push('preflight_task_id_mismatch');
  }
  if (safePreflight.status !== WRITE_GOVERNANCE_PREFLIGHT_STATUS_ACCEPTED) {
    blockers.push('preflight_status_mismatch');
  }
  if (safePreflight.accepted !== true || safePreflight.writeGovernancePreflightAccepted !== true) {
    blockers.push('preflight_not_accepted');
  }
  if (Array.isArray(safePreflight.blockerReasons) && safePreflight.blockerReasons.length > 0) {
    blockers.push('preflight_has_blockers');
  }
  if (baselineBinding.sealedV1RcPreserved !== true ||
    normalizeCommit(baselineBinding.sealedRcCommit) !== SEALED_V1_0_RC_COMMIT) {
    blockers.push('sealed_v1_0_rc_commit_mismatch');
  }
  if (baselineBinding.exactCurrentHeadBound !== true) blockers.push('current_head_not_bound');
  if (expectedCurrentHeadCommit &&
    normalizeCommit(baselineBinding.currentHeadCommit) !== expectedCurrentHeadCommit) {
    blockers.push('current_head_commit_mismatch');
  }
  if (safePreflight.recordMemoryExecuted === true ||
    safePreflight.durableMemoryWritten === true ||
    safePreflight.durableAuditWritten === true) {
    blockers.push('preflight_execution_or_durable_write_claim');
  }
  if (containsForbiddenFragment(safePreflight)) blockers.push('preflight_sensitive_fragment_rejected');
  if (hasForbiddenTrueFlagDeep(safePreflight)) blockers.push('preflight_forbidden_action_claim');
  if (hasNonzeroCounterDeep(safePreflight)) blockers.push('preflight_side_effect_counter_nonzero');

  return blockers;
}

function collectApprovalPacketBlockers(packet = {}, preflight = {}, context = {}) {
  const safePacket = isPlainObject(packet) ? packet : {};
  const approvalScope = normalizeScope(safePacket.targetScope);
  const preflightScope = normalizeScope(preflight.targetScope);
  const asOf = context.asOf;
  const expiresAt = normalizeDate(safePacket.expiresAt);
  const blockers = [];

  if (normalizeString(safePacket.approvalFamily) !== REQUIRED_APPROVAL_FAMILY) {
    blockers.push('approval_family_mismatch');
  }
  if (normalizeString(safePacket.actionId) !== REQUIRED_ACTION_ID) {
    blockers.push('action_id_mismatch');
  }
  if (normalizeString(safePacket.targetTool) !== REQUIRED_TARGET_TOOL) {
    blockers.push('target_tool_mismatch');
  }
  if (normalizeCommit(safePacket.sealedRcCommit) !== SEALED_V1_0_RC_COMMIT) {
    blockers.push('sealed_v1_0_rc_commit_mismatch');
  }
  if (!context.currentHeadCommit ||
    normalizeCommit(safePacket.currentHeadCommit) !== context.currentHeadCommit) {
    blockers.push('current_head_commit_mismatch');
  }
  if (!isSha256Hex(safePacket.payloadHash)) blockers.push('payload_hash_required');
  if (normalizeString(safePacket.payloadHash) !== normalizeString(preflight.approvalPacketTemplate?.payloadHash)) {
    blockers.push('payload_hash_preflight_mismatch');
  }
  if (!scopesEqual(approvalScope, preflightScope)) blockers.push('target_scope_preflight_mismatch');
  if (safePacket.maxRecordMemoryCalls !== 1) blockers.push('max_record_memory_calls_must_be_one');
  if (safePacket.blanketApproval === true ||
    safePacket.implicitApproval === true ||
    safePacket.wildcardScopeAllowed === true ||
    safePacket.payloadSubstitutionAllowed === true ||
    safePacket.reuseAcrossHeadsAllowed === true) {
    blockers.push('blanket_or_implicit_approval_rejected');
  }
  if (safePacket.exactActionNamed !== true) blockers.push('exact_action_required');
  if (safePacket.exactScopeNamed !== true) blockers.push('exact_scope_required');
  if (safePacket.exactPayloadHashNamed !== true) blockers.push('exact_payload_hash_required');
  if (safePacket.exactCurrentHeadNamed !== true) blockers.push('exact_current_head_required');
  if (safePacket.executionApproved !== true) blockers.push('execution_approval_required');
  if (safePacket.recordMemoryExecutionAuthorized !== true) {
    blockers.push('record_memory_execution_authorization_required');
  }
  if (safePacket.recordMemoryExecuted !== false) blockers.push('record_memory_must_not_execute_in_cm1091');
  if (safePacket.durableMemoryWritten !== false) blockers.push('durable_memory_must_not_be_written');
  if (safePacket.durableAuditWritten !== false) blockers.push('durable_audit_must_not_be_written');
  if (safePacket.operatorReceiptRequiredBeforeExecution !== true) {
    blockers.push('operator_receipt_required_before_execution');
  }
  if (safePacket.runtimeValidationRequiredBeforeExecution !== true) {
    blockers.push('runtime_validation_required_before_execution');
  }
  if (safePacket.postWriteVerificationRequired !== true) {
    blockers.push('post_write_verification_required');
  }
  if (!Array.isArray(safePacket.validationCommands) ||
    !REQUIRED_VALIDATION_COMMANDS.every(command => safePacket.validationCommands.includes(command))) {
    blockers.push('required_validation_commands_missing');
  }
  const rollbackPosture = isPlainObject(safePacket.rollbackCleanupPosture)
    ? safePacket.rollbackCleanupPosture
    : {};
  if (rollbackPosture.noAutomaticCleanupApply !== true ||
    rollbackPosture.noAutomaticRollbackApply !== true ||
    rollbackPosture.operatorApprovalRequiredForApply !== true ||
    rollbackPosture.diaryAndAuditRetentionRequired !== true) {
    blockers.push('rollback_cleanup_posture_incomplete');
  }
  if (!expiresAt) blockers.push('expires_at_required');
  if (expiresAt && asOf && expiresAt.time <= asOf.time) blockers.push('approval_expired');
  for (const field of REQUIRED_SCOPE_FIELDS) {
    if (!approvalScope[field]) blockers.push(`scope_${field}_required`);
  }
  if (containsForbiddenFragment(safePacket)) blockers.push('sensitive_fragment_rejected');
  if (hasForbiddenTrueFlagDeep({
    ...safePacket,
    executionApproved: false,
    recordMemoryExecutionAuthorized: false
  })) {
    blockers.push('forbidden_execution_or_side_effect_claim');
  }
  if (hasNonzeroCounterDeep(safePacket)) blockers.push('side_effect_counter_nonzero');

  return blockers;
}

function buildV11WriteGovernanceApprovalPacketBoundary(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const mode = normalizeString(safeInput.mode);
  const sourceMode = normalizeString(safeInput.sourceMode);
  const packetId = normalizeString(safeInput.packetId) ||
    'CM-1091_V1_1_WRITE_GOVERNANCE_APPROVAL_PACKET_BOUNDARY_LOCAL';
  const asOf = normalizeDate(safeInput.asOf) || normalizeDate(new Date().toISOString());
  const sealedRcCommit = normalizeCommit(safeInput.sealedRcCommit);
  const currentHeadCommit = normalizeCommit(safeInput.currentHeadCommit);
  const expectedCurrentHeadCommit = normalizeCommit(safeInput.expectedCurrentHeadCommit);
  const preflightReport = isPlainObject(safeInput.preflightReport) ? safeInput.preflightReport : {};
  const approvalPacket = isPlainObject(safeInput.approvalPacket) ? safeInput.approvalPacket : {};
  const blockers = [];

  if (mode !== REQUIRED_MODE) {
    blockers.push('mode_must_be_v1_1_write_governance_approval_packet_boundary_review_only');
  }
  if (sourceMode !== REQUIRED_SOURCE_MODE) {
    blockers.push('source_mode_must_be_explicit_sanitized_preflight_and_approval_packet_only');
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
  blockers.push(...collectPreflightBlockers(
    preflightReport,
    expectedCurrentHeadCommit || currentHeadCommit
  ).map(reason => `preflight:${reason}`));
  blockers.push(...collectApprovalPacketBlockers(approvalPacket, preflightReport, {
    asOf,
    currentHeadCommit: expectedCurrentHeadCommit || currentHeadCommit
  }).map(reason => `approval_packet:${reason}`));

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
    approvalPacketBoundaryAccepted: accepted,
    approvalPacketExact: accepted,
    executionApprovedByPacket: accepted,
    executionStarted: false,
    recordMemoryStarted: false,
    recordMemoryExecuted: false,
    durableMemoryWritten: false,
    durableAuditWritten: false,
    operatorReceiptWritten: false,
    postWriteVerificationExecuted: false,
    baselineBinding: {
      sealedRcCommit: sealedRcCommit || null,
      currentHeadCommit: currentHeadCommit || null,
      expectedCurrentHeadCommit: expectedCurrentHeadCommit || currentHeadCommit || null,
      sealedV1RcPreserved: sealedRcCommit === SEALED_V1_0_RC_COMMIT,
      exactCurrentHeadBound: Boolean(currentHeadCommit) &&
        (!expectedCurrentHeadCommit || currentHeadCommit === expectedCurrentHeadCommit)
    },
    approvedAction: {
      approvalFamily: normalizeString(approvalPacket.approvalFamily),
      actionId: normalizeString(approvalPacket.actionId),
      targetTool: normalizeString(approvalPacket.targetTool),
      targetScope: normalizeScope(approvalPacket.targetScope),
      payloadHash: normalizeString(approvalPacket.payloadHash),
      maxRecordMemoryCalls: approvalPacket.maxRecordMemoryCalls === 1 ? 1 : null,
      expiresAt: normalizeString(approvalPacket.expiresAt)
    },
    nextRequiredSurfaces: {
      operatorReceiptAuditPreview: true,
      postWriteVerificationPlan: true,
      separateExecutionStepStillRequired: true
    },
    sideEffectCounters: normalizeCounterMap(safeInput.sideEffectCounters),
    readinessClaimed: false,
    reliabilityClaimed: false,
    rcReady: false,
    releaseReady: false,
    deployReady: false,
    blockerReasons: uniqueBlockers,
    nextAllowedAction: accepted
      ? 'continue_to_cm1092_operator_receipt_audit_preview_do_not_execute_record_memory'
      : 'fix_write_governance_approval_packet_boundary_blockers',
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
  REQUIRED_APPROVAL_FAMILY,
  REQUIRED_MODE,
  REQUIRED_SOURCE_MODE,
  REQUIRED_VALIDATION_COMMANDS,
  REQUIRED_ZERO_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  SCHEMA_VERSION,
  TASK_ID,
  buildV11WriteGovernanceApprovalPacketBoundary
};
