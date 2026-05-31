'use strict';

const {
  SEALED_V1_0_RC_COMMIT
} = require('./V11HardeningValidationAggregator');
const {
  REQUIRED_ACTION_ID,
  REQUIRED_SCOPE_FIELDS,
  REQUIRED_TARGET_TOOL
} = require('./V11WriteGovernancePreflight');
const {
  RESULT_STATUS_ACCEPTED: APPROVAL_BOUNDARY_STATUS_ACCEPTED,
  TASK_ID: APPROVAL_BOUNDARY_TASK_ID
} = require('./V11WriteGovernanceApprovalPacketBoundary');

const TASK_ID = 'CM-1092_V1_1_OPERATOR_RECEIPT_AUDIT_PREVIEW';
const SCHEMA_VERSION = 'v1-1-operator-receipt-audit-preview-v1';
const RESULT_STATUS_ACCEPTED =
  'V1_1_OPERATOR_RECEIPT_AUDIT_PREVIEW_ACCEPTED_NOT_WRITTEN_NOT_READY';
const RESULT_STATUS_BLOCKED =
  'V1_1_OPERATOR_RECEIPT_AUDIT_PREVIEW_BLOCKED_NOT_READY';
const REQUIRED_MODE = 'v1_1_operator_receipt_audit_preview_review_only';
const REQUIRED_SOURCE_MODE = 'explicit_sanitized_approval_boundary_and_receipt_preview_only';
const REQUIRED_RECEIPT_FAMILY = 'v1_1_governed_record_memory_operator_receipt_audit_preview';

const REQUIRED_VALIDATION_COMMANDS = Object.freeze([
  'node --test .\\tests\\v1-1-write-governance-operator-receipt-audit-preview.test.js',
  'node --test .\\tests\\v1-1-write-governance-approval-packet-boundary.test.js'
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
  'approvalAuditWrites',
  'operatorReceiptWrites',
  'recordMemoryExecutions',
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
  'approvalAuditWritten',
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
  'writesOperatorReceipt',
  'writesApprovalAudit',
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

function firstNormalizedString(...values) {
  for (const value of values) {
    const normalized = normalizeString(value);
    if (normalized) return normalized;
  }
  return '';
}

const SCOPE_FIELD_CANDIDATES = Object.freeze({
  projectRef: ['projectRef', 'project_id', 'projectId', 'project'],
  workspaceRef: ['workspaceRef', 'workspace_id', 'workspaceId', 'workspace'],
  clientRef: ['clientRef', 'client_id', 'clientId', 'client'],
  agentRef: ['agentRef', 'agent_id', 'agentId', 'agent'],
  taskRef: ['taskRef', 'task_id', 'taskId', 'task'],
  visibility: ['visibility', 'visibility_policy']
});

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
    firstNormalizedString(...(SCOPE_FIELD_CANDIDATES[field] || [field]).map(key => safeScope[key]))
  ]));
}

function scopesEqual(left = {}, right = {}) {
  const normalizedLeft = normalizeScope(left);
  const normalizedRight = normalizeScope(right);
  return REQUIRED_SCOPE_FIELDS.every(field => normalizedLeft[field] === normalizedRight[field]);
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

function collectApprovalBoundaryBlockers(boundary = {}, expectedCurrentHeadCommit = '') {
  const safeBoundary = isPlainObject(boundary) ? boundary : {};
  const baselineBinding = isPlainObject(safeBoundary.baselineBinding)
    ? safeBoundary.baselineBinding
    : {};
  const blockers = [];

  if (safeBoundary.taskId !== APPROVAL_BOUNDARY_TASK_ID) {
    blockers.push('approval_boundary_task_id_mismatch');
  }
  if (safeBoundary.status !== APPROVAL_BOUNDARY_STATUS_ACCEPTED) {
    blockers.push('approval_boundary_status_mismatch');
  }
  if (safeBoundary.accepted !== true || safeBoundary.approvalPacketBoundaryAccepted !== true) {
    blockers.push('approval_boundary_not_accepted');
  }
  if (Array.isArray(safeBoundary.blockerReasons) && safeBoundary.blockerReasons.length > 0) {
    blockers.push('approval_boundary_has_blockers');
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
  if (safeBoundary.executionStarted === true ||
    safeBoundary.recordMemoryExecuted === true ||
    safeBoundary.durableMemoryWritten === true ||
    safeBoundary.durableAuditWritten === true ||
    safeBoundary.operatorReceiptWritten === true ||
    safeBoundary.postWriteVerificationExecuted === true) {
    blockers.push('approval_boundary_execution_or_write_claim');
  }
  if (containsForbiddenFragment(safeBoundary)) blockers.push('approval_boundary_sensitive_fragment_rejected');
  if (hasForbiddenTrueFlagDeep(safeBoundary)) blockers.push('approval_boundary_forbidden_action_claim');
  if (hasNonzeroCounterDeep(safeBoundary)) blockers.push('approval_boundary_side_effect_counter_nonzero');

  return blockers;
}

function collectReceiptPreviewBlockers(preview = {}, boundary = {}, context = {}) {
  const safePreview = isPlainObject(preview) ? preview : {};
  const approvedAction = isPlainObject(boundary.approvedAction) ? boundary.approvedAction : {};
  const asOf = context.asOf;
  const expiresAt = normalizeDate(safePreview.expiresAt);
  const blockers = [];

  if (normalizeString(safePreview.receiptFamily) !== REQUIRED_RECEIPT_FAMILY) {
    blockers.push('receipt_family_mismatch');
  }
  if (!normalizeString(safePreview.receiptId)) blockers.push('receipt_id_required');
  if (normalizeString(safePreview.actionId) !== REQUIRED_ACTION_ID) blockers.push('action_id_mismatch');
  if (normalizeString(safePreview.targetTool) !== REQUIRED_TARGET_TOOL) blockers.push('target_tool_mismatch');
  if (normalizeCommit(safePreview.sealedRcCommit) !== SEALED_V1_0_RC_COMMIT) {
    blockers.push('sealed_v1_0_rc_commit_mismatch');
  }
  if (!context.currentHeadCommit ||
    normalizeCommit(safePreview.currentHeadCommit) !== context.currentHeadCommit) {
    blockers.push('current_head_commit_mismatch');
  }
  if (normalizeString(safePreview.approvalBoundaryPacketId) !== normalizeString(boundary.packetId)) {
    blockers.push('approval_boundary_packet_id_mismatch');
  }
  if (normalizeString(safePreview.payloadHash) !== normalizeString(approvedAction.payloadHash)) {
    blockers.push('payload_hash_approval_boundary_mismatch');
  }
  if (!scopesEqual(safePreview.targetScope, approvedAction.targetScope)) {
    blockers.push('target_scope_approval_boundary_mismatch');
  }
  if (safePreview.maxRecordMemoryCalls !== 1) blockers.push('max_record_memory_calls_must_be_one');
  if (safePreview.receiptPreviewOnly !== true) blockers.push('receipt_preview_only_required');
  if (safePreview.auditPreviewOnly !== true) blockers.push('audit_preview_only_required');
  if (safePreview.operatorReceiptPrepared !== true) blockers.push('operator_receipt_prepared_required');
  if (safePreview.approvalAuditPreviewPrepared !== true) {
    blockers.push('approval_audit_preview_prepared_required');
  }
  if (safePreview.receiptContainsExactApprovalReference !== true) {
    blockers.push('exact_approval_reference_required');
  }
  if (safePreview.exactTargetScopeNamed !== true) blockers.push('exact_target_scope_required');
  if (safePreview.exactPayloadHashNamed !== true) blockers.push('exact_payload_hash_required');
  if (safePreview.exactCurrentHeadNamed !== true) blockers.push('exact_current_head_required');
  if (safePreview.noRawContentIncluded !== true) blockers.push('no_raw_content_required');
  if (safePreview.sanitizedSummaryOnly !== true) blockers.push('sanitized_summary_only_required');
  if (safePreview.runtimeValidationRequiredBeforeExecution !== true) {
    blockers.push('runtime_validation_required_before_execution');
  }
  if (safePreview.postWriteVerificationRequired !== true) {
    blockers.push('post_write_verification_required');
  }
  if (safePreview.recordMemoryExecutionAuthorized !== true) {
    blockers.push('record_memory_execution_authorization_required');
  }
  if (safePreview.recordMemoryExecuted !== false) blockers.push('record_memory_must_not_execute_in_cm1092');
  if (safePreview.operatorReceiptWritten !== false) blockers.push('operator_receipt_must_not_be_written');
  if (safePreview.approvalAuditWritten !== false) blockers.push('approval_audit_must_not_be_written');
  if (safePreview.durableAuditWritten !== false) blockers.push('durable_audit_must_not_be_written');
  if (!Array.isArray(safePreview.validationCommands) ||
    !REQUIRED_VALIDATION_COMMANDS.every(command => safePreview.validationCommands.includes(command))) {
    blockers.push('required_validation_commands_missing');
  }
  const rollbackPosture = isPlainObject(safePreview.rollbackCleanupPosture)
    ? safePreview.rollbackCleanupPosture
    : {};
  if (rollbackPosture.noAutomaticCleanupApply !== true ||
    rollbackPosture.noAutomaticRollbackApply !== true ||
    rollbackPosture.operatorApprovalRequiredForApply !== true ||
    rollbackPosture.diaryAndAuditRetentionRequired !== true) {
    blockers.push('rollback_cleanup_posture_incomplete');
  }
  if (!expiresAt) blockers.push('expires_at_required');
  if (expiresAt && asOf && expiresAt.time <= asOf.time) blockers.push('receipt_preview_expired');
  for (const field of REQUIRED_SCOPE_FIELDS) {
    if (!normalizeScope(safePreview.targetScope)[field]) blockers.push(`scope_${field}_required`);
  }
  if (containsForbiddenFragment(safePreview)) blockers.push('sensitive_fragment_rejected');
  if (hasForbiddenTrueFlagDeep({
    ...safePreview,
    recordMemoryExecutionAuthorized: false
  })) {
    blockers.push('forbidden_execution_or_side_effect_claim');
  }
  if (hasNonzeroCounterDeep(safePreview)) blockers.push('side_effect_counter_nonzero');

  return blockers;
}

function buildV11WriteGovernanceOperatorReceiptAuditPreview(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const mode = normalizeString(safeInput.mode);
  const sourceMode = normalizeString(safeInput.sourceMode);
  const packetId = normalizeString(safeInput.packetId) ||
    'CM-1092_V1_1_OPERATOR_RECEIPT_AUDIT_PREVIEW_LOCAL';
  const asOf = normalizeDate(safeInput.asOf) || normalizeDate(new Date().toISOString());
  const sealedRcCommit = normalizeCommit(safeInput.sealedRcCommit);
  const currentHeadCommit = normalizeCommit(safeInput.currentHeadCommit);
  const expectedCurrentHeadCommit = normalizeCommit(safeInput.expectedCurrentHeadCommit);
  const approvalBoundaryReport = isPlainObject(safeInput.approvalBoundaryReport)
    ? safeInput.approvalBoundaryReport
    : {};
  const receiptAuditPreview = isPlainObject(safeInput.receiptAuditPreview)
    ? safeInput.receiptAuditPreview
    : {};
  const blockers = [];

  if (mode !== REQUIRED_MODE) blockers.push('mode_must_be_v1_1_operator_receipt_audit_preview_review_only');
  if (sourceMode !== REQUIRED_SOURCE_MODE) {
    blockers.push('source_mode_must_be_explicit_sanitized_approval_boundary_and_receipt_preview_only');
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
  blockers.push(...collectApprovalBoundaryBlockers(
    approvalBoundaryReport,
    expectedCurrentHeadCommit || currentHeadCommit
  ).map(reason => `approval_boundary:${reason}`));
  blockers.push(...collectReceiptPreviewBlockers(receiptAuditPreview, approvalBoundaryReport, {
    asOf,
    currentHeadCommit: expectedCurrentHeadCommit || currentHeadCommit
  }).map(reason => `receipt_preview:${reason}`));

  const uniqueBlockers = [...new Set(blockers)];
  const accepted = uniqueBlockers.length === 0;
  const approvedAction = isPlainObject(approvalBoundaryReport.approvedAction)
    ? approvalBoundaryReport.approvedAction
    : {};

  return {
    taskId: TASK_ID,
    schemaVersion: SCHEMA_VERSION,
    mode,
    sourceMode,
    packetId,
    asOf: asOf ? asOf.text : null,
    status: accepted ? RESULT_STATUS_ACCEPTED : RESULT_STATUS_BLOCKED,
    accepted,
    operatorReceiptAuditPreviewAccepted: accepted,
    operatorReceiptPreviewBuilt: accepted,
    approvalAuditPreviewBuilt: accepted,
    receiptPreviewExact: accepted,
    executionStarted: false,
    recordMemoryStarted: false,
    recordMemoryExecuted: false,
    durableMemoryWritten: false,
    durableAuditWritten: false,
    approvalAuditWritten: false,
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
      actionId: normalizeString(approvedAction.actionId),
      targetTool: normalizeString(approvedAction.targetTool),
      targetScope: normalizeScope(approvedAction.targetScope),
      payloadHash: normalizeString(approvedAction.payloadHash),
      maxRecordMemoryCalls: approvedAction.maxRecordMemoryCalls === 1 ? 1 : null
    },
    receiptPreview: {
      receiptFamily: normalizeString(receiptAuditPreview.receiptFamily),
      receiptId: normalizeString(receiptAuditPreview.receiptId),
      approvalBoundaryPacketId: normalizeString(receiptAuditPreview.approvalBoundaryPacketId),
      auditPreviewOnly: receiptAuditPreview.auditPreviewOnly === true,
      receiptPreviewOnly: receiptAuditPreview.receiptPreviewOnly === true,
      expiresAt: normalizeString(receiptAuditPreview.expiresAt)
    },
    nextRequiredSurfaces: {
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
      ? 'continue_to_cm1093_post_write_verification_plan_do_not_execute_record_memory'
      : 'fix_operator_receipt_audit_preview_blockers',
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
      writesApprovalAudit: false,
      writesOperatorReceipt: false,
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
  REQUIRED_MODE,
  REQUIRED_RECEIPT_FAMILY,
  REQUIRED_SOURCE_MODE,
  REQUIRED_VALIDATION_COMMANDS,
  REQUIRED_ZERO_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  SCHEMA_VERSION,
  TASK_ID,
  buildV11WriteGovernanceOperatorReceiptAuditPreview
};
