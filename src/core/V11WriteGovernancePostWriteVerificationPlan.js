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
  RESULT_STATUS_ACCEPTED: RECEIPT_PREVIEW_STATUS_ACCEPTED,
  TASK_ID: RECEIPT_PREVIEW_TASK_ID
} = require('./V11WriteGovernanceOperatorReceiptAuditPreview');

const TASK_ID = 'CM-1093_V1_1_POST_WRITE_VERIFICATION_PLAN';
const SCHEMA_VERSION = 'v1-1-post-write-verification-plan-v1';
const RESULT_STATUS_ACCEPTED =
  'V1_1_POST_WRITE_VERIFICATION_PLAN_ACCEPTED_NOT_EXECUTED_NOT_READY';
const RESULT_STATUS_BLOCKED =
  'V1_1_POST_WRITE_VERIFICATION_PLAN_BLOCKED_NOT_READY';
const REQUIRED_MODE = 'v1_1_post_write_verification_plan_review_only';
const REQUIRED_SOURCE_MODE = 'explicit_sanitized_receipt_preview_and_verification_plan_only';
const REQUIRED_PLAN_FAMILY = 'v1_1_governed_record_memory_post_write_verification_plan';

const REQUIRED_VALIDATION_COMMANDS = Object.freeze([
  'node --test .\\tests\\v1-1-write-governance-post-write-verification-plan.test.js',
  'node --test .\\tests\\v1-1-write-governance-operator-receipt-audit-preview.test.js'
]);

const REQUIRED_VERIFICATION_STEPS = Object.freeze([
  'record_memory_result_shape_check',
  'accepted_memory_id_capture',
  'shadow_write_status_check',
  'operator_receipt_correlation_check',
  'approval_audit_correlation_check',
  'no_raw_content_disclosure_check',
  'failure_stop_and_no_cleanup_apply_check'
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

function collectReceiptPreviewBlockers(report = {}, expectedCurrentHeadCommit = '') {
  const safeReport = isPlainObject(report) ? report : {};
  const baselineBinding = isPlainObject(safeReport.baselineBinding)
    ? safeReport.baselineBinding
    : {};
  const blockers = [];

  if (safeReport.taskId !== RECEIPT_PREVIEW_TASK_ID) {
    blockers.push('receipt_preview_task_id_mismatch');
  }
  if (safeReport.status !== RECEIPT_PREVIEW_STATUS_ACCEPTED) {
    blockers.push('receipt_preview_status_mismatch');
  }
  if (safeReport.accepted !== true || safeReport.operatorReceiptAuditPreviewAccepted !== true) {
    blockers.push('receipt_preview_not_accepted');
  }
  if (Array.isArray(safeReport.blockerReasons) && safeReport.blockerReasons.length > 0) {
    blockers.push('receipt_preview_has_blockers');
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
  if (safeReport.executionStarted === true ||
    safeReport.recordMemoryExecuted === true ||
    safeReport.durableMemoryWritten === true ||
    safeReport.durableAuditWritten === true ||
    safeReport.operatorReceiptWritten === true ||
    safeReport.approvalAuditWritten === true ||
    safeReport.postWriteVerificationExecuted === true) {
    blockers.push('receipt_preview_execution_or_write_claim');
  }
  if (containsForbiddenFragment(safeReport)) blockers.push('receipt_preview_sensitive_fragment_rejected');
  if (hasForbiddenTrueFlagDeep(safeReport)) blockers.push('receipt_preview_forbidden_action_claim');
  if (hasNonzeroCounterDeep(safeReport)) blockers.push('receipt_preview_side_effect_counter_nonzero');

  return blockers;
}

function collectPlanBlockers(plan = {}, receiptPreviewReport = {}, context = {}) {
  const safePlan = isPlainObject(plan) ? plan : {};
  const approvedAction = isPlainObject(receiptPreviewReport.approvedAction)
    ? receiptPreviewReport.approvedAction
    : {};
  const asOf = context.asOf;
  const expiresAt = normalizeDate(safePlan.expiresAt);
  const blockers = [];

  if (normalizeString(safePlan.planFamily) !== REQUIRED_PLAN_FAMILY) {
    blockers.push('plan_family_mismatch');
  }
  if (!normalizeString(safePlan.planId)) blockers.push('plan_id_required');
  if (normalizeString(safePlan.actionId) !== REQUIRED_ACTION_ID) blockers.push('action_id_mismatch');
  if (normalizeString(safePlan.targetTool) !== REQUIRED_TARGET_TOOL) blockers.push('target_tool_mismatch');
  if (normalizeCommit(safePlan.sealedRcCommit) !== SEALED_V1_0_RC_COMMIT) {
    blockers.push('sealed_v1_0_rc_commit_mismatch');
  }
  if (!context.currentHeadCommit ||
    normalizeCommit(safePlan.currentHeadCommit) !== context.currentHeadCommit) {
    blockers.push('current_head_commit_mismatch');
  }
  if (normalizeString(safePlan.receiptPreviewPacketId) !== normalizeString(receiptPreviewReport.packetId)) {
    blockers.push('receipt_preview_packet_id_mismatch');
  }
  if (normalizeString(safePlan.payloadHash) !== normalizeString(approvedAction.payloadHash)) {
    blockers.push('payload_hash_receipt_preview_mismatch');
  }
  if (!scopesEqual(safePlan.targetScope, approvedAction.targetScope)) {
    blockers.push('target_scope_receipt_preview_mismatch');
  }
  if (safePlan.maxRecordMemoryCalls !== 1) blockers.push('max_record_memory_calls_must_be_one');
  if (safePlan.postWriteVerificationPlanOnly !== true) {
    blockers.push('post_write_verification_plan_only_required');
  }
  if (safePlan.separateExecutionApprovalStillRequired !== true) {
    blockers.push('separate_execution_approval_still_required');
  }
  if (safePlan.operatorReceiptCorrelationRequired !== true) {
    blockers.push('operator_receipt_correlation_required');
  }
  if (safePlan.approvalAuditCorrelationRequired !== true) {
    blockers.push('approval_audit_correlation_required');
  }
  if (safePlan.storeBackedVerificationDeferredUntilAfterExactWrite !== true) {
    blockers.push('store_backed_verification_must_be_deferred_until_after_exact_write');
  }
  if (safePlan.noSearchMemoryVerification !== true) blockers.push('no_search_memory_verification_required');
  if (safePlan.noRawContentVerification !== true) blockers.push('no_raw_content_verification_required');
  if (safePlan.failureHandlingRequiresStop !== true) blockers.push('failure_handling_requires_stop');
  if (safePlan.noAutomaticCleanupRollbackApply !== true) {
    blockers.push('no_automatic_cleanup_rollback_apply_required');
  }
  if (!Array.isArray(safePlan.verificationSteps) ||
    !REQUIRED_VERIFICATION_STEPS.every(step => safePlan.verificationSteps.includes(step))) {
    blockers.push('required_verification_steps_missing');
  }
  if (!Array.isArray(safePlan.validationCommands) ||
    !REQUIRED_VALIDATION_COMMANDS.every(command => safePlan.validationCommands.includes(command))) {
    blockers.push('required_validation_commands_missing');
  }
  if (safePlan.recordMemoryExecuted !== false) blockers.push('record_memory_must_not_execute_in_cm1093');
  if (safePlan.postWriteVerificationExecuted !== false) {
    blockers.push('post_write_verification_must_not_execute_in_cm1093');
  }
  if (safePlan.durableMemoryWritten !== false) blockers.push('durable_memory_must_not_be_written');
  if (safePlan.durableAuditWritten !== false) blockers.push('durable_audit_must_not_be_written');
  if (!expiresAt) blockers.push('expires_at_required');
  if (expiresAt && asOf && expiresAt.time <= asOf.time) blockers.push('verification_plan_expired');
  for (const field of REQUIRED_SCOPE_FIELDS) {
    if (!normalizeScope(safePlan.targetScope)[field]) blockers.push(`scope_${field}_required`);
  }
  if (containsForbiddenFragment(safePlan)) blockers.push('sensitive_fragment_rejected');
  if (hasForbiddenTrueFlagDeep(safePlan)) blockers.push('forbidden_execution_or_side_effect_claim');
  if (hasNonzeroCounterDeep(safePlan)) blockers.push('side_effect_counter_nonzero');

  return blockers;
}

function buildV11WriteGovernancePostWriteVerificationPlan(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const mode = normalizeString(safeInput.mode);
  const sourceMode = normalizeString(safeInput.sourceMode);
  const packetId = normalizeString(safeInput.packetId) ||
    'CM-1093_V1_1_POST_WRITE_VERIFICATION_PLAN_LOCAL';
  const asOf = normalizeDate(safeInput.asOf) || normalizeDate(new Date().toISOString());
  const sealedRcCommit = normalizeCommit(safeInput.sealedRcCommit);
  const currentHeadCommit = normalizeCommit(safeInput.currentHeadCommit);
  const expectedCurrentHeadCommit = normalizeCommit(safeInput.expectedCurrentHeadCommit);
  const receiptPreviewReport = isPlainObject(safeInput.receiptPreviewReport)
    ? safeInput.receiptPreviewReport
    : {};
  const verificationPlan = isPlainObject(safeInput.verificationPlan)
    ? safeInput.verificationPlan
    : {};
  const blockers = [];

  if (mode !== REQUIRED_MODE) blockers.push('mode_must_be_v1_1_post_write_verification_plan_review_only');
  if (sourceMode !== REQUIRED_SOURCE_MODE) {
    blockers.push('source_mode_must_be_explicit_sanitized_receipt_preview_and_verification_plan_only');
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
  blockers.push(...collectReceiptPreviewBlockers(
    receiptPreviewReport,
    expectedCurrentHeadCommit || currentHeadCommit
  ).map(reason => `receipt_preview:${reason}`));
  blockers.push(...collectPlanBlockers(verificationPlan, receiptPreviewReport, {
    asOf,
    currentHeadCommit: expectedCurrentHeadCommit || currentHeadCommit
  }).map(reason => `verification_plan:${reason}`));

  const uniqueBlockers = [...new Set(blockers)];
  const accepted = uniqueBlockers.length === 0;
  const approvedAction = isPlainObject(receiptPreviewReport.approvedAction)
    ? receiptPreviewReport.approvedAction
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
    postWriteVerificationPlanAccepted: accepted,
    verificationPlanExact: accepted,
    verificationPlanReadyForFutureExactWriteResult: accepted,
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
    verificationPlan: {
      planFamily: normalizeString(verificationPlan.planFamily),
      planId: normalizeString(verificationPlan.planId),
      receiptPreviewPacketId: normalizeString(verificationPlan.receiptPreviewPacketId),
      verificationSteps: Array.isArray(verificationPlan.verificationSteps)
        ? verificationPlan.verificationSteps.map(normalizeString)
        : [],
      expiresAt: normalizeString(verificationPlan.expiresAt)
    },
    sideEffectCounters: normalizeCounterMap(safeInput.sideEffectCounters),
    readinessClaimed: false,
    reliabilityClaimed: false,
    rcReady: false,
    releaseReady: false,
    deployReady: false,
    blockerReasons: uniqueBlockers,
    nextAllowedAction: accepted
      ? 'discuss_whether_to_allow_one_exact_approved_record_memory_write'
      : 'fix_post_write_verification_plan_blockers',
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
      executesPostWriteVerification: false,
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
  REQUIRED_PLAN_FAMILY,
  REQUIRED_SOURCE_MODE,
  REQUIRED_VALIDATION_COMMANDS,
  REQUIRED_VERIFICATION_STEPS,
  REQUIRED_ZERO_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  SCHEMA_VERSION,
  TASK_ID,
  buildV11WriteGovernancePostWriteVerificationPlan
};
