'use strict';

const {
  PLAN_STATUS_PASSED
} = require('./ProofMemoryRetentionTombstonePlan');
const {
  RESULT_STATUS_ACCEPTED: PROOF_TOMBSTONE_PREVIEW_STATUS_ACCEPTED,
  TASK_ID: PROOF_TOMBSTONE_PREVIEW_TASK_ID
} = require('./ProofMemoryRetentionTombstoneStoreBackedDryRunPreview');
const {
  TASK_ID: RECONCILE_RETRY_BACKOFF_TASK_ID
} = require('./MemoryWriteReconcileRetryBackoffPersistencePreview');
const {
  TASK_ID: STARTUP_WORKER_SAFETY_TASK_ID
} = require('./MemoryWriteReconcileStartupSafetyPolicy');
const {
  RESULT_STATUS_ACCEPTED: ROLLBACK_CLEANUP_APPLY_DESIGN_STATUS_ACCEPTED,
  TASK_ID: ROLLBACK_CLEANUP_APPLY_DESIGN_TASK_ID
} = require('./MemoryWriteRollbackCleanupApplyDesignPolicy');
const {
  RESULT_STATUS_ACCEPTED: GOVERNANCE_RUNTIME_APPROVAL_AUDIT_LOOP_STATUS_ACCEPTED,
  TASK_ID: GOVERNANCE_RUNTIME_APPROVAL_AUDIT_LOOP_TASK_ID
} = require('./GovernanceRuntimeApprovalAuditLoop');
const {
  SEALED_V1_0_RC_COMMIT,
  TASK_ID: V11_VALIDATION_AGGREGATOR_TASK_ID
} = require('./V11HardeningValidationAggregator');
const {
  RESULT_STATUS_ACCEPTED: V11_STAGED_CLOSEOUT_STATUS_ACCEPTED,
  TASK_ID: V11_STAGED_CLOSEOUT_TASK_ID
} = require('./V11HardeningStagedCloseout');

const TASK_ID = 'CM-1089_V1_1_EVIDENCE_PACKET_RUNNER';
const SCHEMA_VERSION = 'v1-1-hardening-evidence-packet-runner-v1';
const RESULT_STATUS_ACCEPTED =
  'V1_1_EVIDENCE_PACKET_ACCEPTED_NOT_EXECUTED_NOT_READY';
const RESULT_STATUS_BLOCKED =
  'V1_1_EVIDENCE_PACKET_BLOCKED_NOT_READY';
const REQUIRED_MODE = 'v1_1_evidence_packet_runner_review_only';
const REQUIRED_SOURCE_MODE = 'explicit_sanitized_local_reports_only';
const DEFAULT_FRESHNESS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const REQUIRED_SLICE_REPORTS = Object.freeze([
  {
    id: 'cm1081_proof_memory_tombstone_design',
    taskId: 'CM-1081_PROOF_MEMORY_RETENTION_TOMBSTONE_DESIGN',
    status: PLAN_STATUS_PASSED,
    acceptedFlag: 'accepted',
    includeInValidationAggregatorInput: false
  },
  {
    id: 'cm1082_proof_memory_tombstone_store_backed_dry_run_preview',
    taskId: PROOF_TOMBSTONE_PREVIEW_TASK_ID,
    status: PROOF_TOMBSTONE_PREVIEW_STATUS_ACCEPTED,
    acceptedFlag: 'storeBackedDryRunPreviewAccepted',
    includeInValidationAggregatorInput: true
  },
  {
    id: 'cm1083_reconcile_retry_backoff_durable_persistence_preview',
    taskId: RECONCILE_RETRY_BACKOFF_TASK_ID,
    status: 'previewed_not_applied',
    acceptedFlag: 'accepted',
    includeInValidationAggregatorInput: true
  },
  {
    id: 'cm1084_startup_reconcile_worker_safety',
    taskId: STARTUP_WORKER_SAFETY_TASK_ID,
    status: 'startup_safety_review_passed_not_enabled',
    acceptedFlag: 'accepted',
    includeInValidationAggregatorInput: true
  },
  {
    id: 'cm1085_cleanup_rollback_apply_design_policy',
    taskId: ROLLBACK_CLEANUP_APPLY_DESIGN_TASK_ID,
    status: ROLLBACK_CLEANUP_APPLY_DESIGN_STATUS_ACCEPTED,
    acceptedFlag: 'applyDesignAccepted',
    includeInValidationAggregatorInput: true
  },
  {
    id: 'cm1086_v1_1_validation_aggregator_full_implementation',
    taskId: V11_VALIDATION_AGGREGATOR_TASK_ID,
    status: 'V1_1_VALIDATION_AGGREGATOR_CURRENT_HEAD_EVIDENCE_ACCEPTED_NOT_READY',
    acceptedFlag: 'accepted',
    includeInValidationAggregatorInput: false
  },
  {
    id: 'cm1087_governance_runtime_approval_audit_loop',
    taskId: GOVERNANCE_RUNTIME_APPROVAL_AUDIT_LOOP_TASK_ID,
    status: GOVERNANCE_RUNTIME_APPROVAL_AUDIT_LOOP_STATUS_ACCEPTED,
    acceptedFlag: 'runtimeApprovalAuditLoopAccepted',
    includeInValidationAggregatorInput: true
  },
  {
    id: 'cm1088_v1_1_hardening_staged_local_closeout',
    taskId: V11_STAGED_CLOSEOUT_TASK_ID,
    status: V11_STAGED_CLOSEOUT_STATUS_ACCEPTED,
    acceptedFlag: 'accepted',
    includeInValidationAggregatorInput: false
  }
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
  'tombstoneApplyRuns',
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
  'applyAuthorized',
  'applyApproved',
  'applyExecuted',
  'applies',
  'tombstoneApplyExecuted',
  'cleanupApplyExecuted',
  'rollbackApplyExecuted',
  'schemaMigrationApplied',
  'startupWorkerEnabled',
  'automaticStartupWorkerEnabled',
  'runtimeWorkerStarted',
  'configChanged',
  'watchdogChanged',
  'startupTaskChanged',
  'publicMcpExpansion',
  'publicMcpExpanded',
  'providerApiCalled',
  'callsProvider',
  'callsRecordMemory',
  'callsSearchMemory',
  'trueRecordMemoryCalled',
  'trueSearchMemoryCalled',
  'rawMemoryRead',
  'rawJsonlRead',
  'rawAuditRead',
  'readsRawMemory',
  'readsJsonl',
  'readsRawAudit',
  'writesStores',
  'writesDurableMemory',
  'writesDurableAudit',
  'executesCleanup',
  'appliesRollback',
  'deletesDiary',
  'rewritesAudit',
  'changesConfigWatchdogStartup',
  'changesDependencies',
  'commitCreated',
  'pushPerformed',
  'ciTriggered',
  'tagCreated',
  'releaseCreated',
  'deployPerformed',
  'tagReleaseDeploy',
  'readinessClaimed',
  'reliabilityClaimed',
  'claimsReadiness',
  'claimsWriteReliable',
  'claimsRealCleanupSafe',
  'claimsRealRollbackSafe'
]);

const FORBIDDEN_NONZERO_COUNTER_KEYS = Object.freeze([
  'providerCalls',
  'apiCalls',
  'mcpToolCalls',
  'trueLiveRecordMemoryCalls',
  'trueLiveSearchMemoryCalls',
  'trueRecordMemoryCalls',
  'trueSearchMemoryCalls',
  'realMemoryReads',
  'rawMemoryReads',
  'directJsonlReads',
  'rawJsonlReads',
  'rawAuditReads',
  'durableRealMemoryWrites',
  'durableRealAuditWrites',
  'durableMemoryWrites',
  'durableAuditWrites',
  'storeWrites',
  'tombstoneApplyRuns',
  'cleanupApplyRuns',
  'rollbackApplyRuns',
  'schemaMigrationApplies',
  'startupWorkerEnablements',
  'publicMcpExpansion',
  'publicMcpExpansions',
  'configWatchdogStartupChanges',
  'dependencyActions',
  'pushRuns',
  'tagReleaseDeployRuns',
  'readinessClaims',
  'reliabilityClaims'
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

function safeClone(value) {
  if (!isPlainObject(value) && !Array.isArray(value)) return value;
  return JSON.parse(JSON.stringify(value));
}

function containsForbiddenFragment(value) {
  const encoded = JSON.stringify(value || {}).toLowerCase();
  return FORBIDDEN_FRAGMENTS.some(fragment => encoded.includes(fragment));
}

function hasForbiddenTrueFlagDeep(value) {
  if (Array.isArray(value)) {
    return value.some(item => hasForbiddenTrueFlagDeep(item));
  }
  if (!isPlainObject(value)) return false;
  if (FORBIDDEN_TRUE_FLAGS.some(key => value[key] === true)) return true;
  return Object.values(value).some(item => hasForbiddenTrueFlagDeep(item));
}

function hasForbiddenNonzeroCounterDeep(value) {
  if (Array.isArray(value)) {
    return value.some(item => hasForbiddenNonzeroCounterDeep(item));
  }
  if (!isPlainObject(value)) return false;
  if (FORBIDDEN_NONZERO_COUNTER_KEYS.some(key => {
    if (!Object.prototype.hasOwnProperty.call(value, key)) return false;
    const counterValue = value[key];
    if (counterValue === false) return false;
    return !Number.isInteger(counterValue) || counterValue < 0 || counterValue !== 0;
  })) {
    return true;
  }
  return Object.values(value).some(item => hasForbiddenNonzeroCounterDeep(item));
}

function normalizeCounterMap(counters = {}) {
  const safeCounters = isPlainObject(counters) ? counters : {};
  return Object.fromEntries(REQUIRED_ZERO_COUNTER_KEYS.map(key => [key, safeCounters[key]]));
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

function readEvidenceInput(sliceReportsById, requirement) {
  const safeReports = isPlainObject(sliceReportsById) ? sliceReportsById : {};
  const evidence = safeReports[requirement.id] || safeReports[requirement.taskId] || {};
  if (isPlainObject(evidence.report)) return evidence;
  return { report: evidence };
}

function normalizeSliceEvidence(requirement, sliceReportsById, context = {}) {
  const evidence = readEvidenceInput(sliceReportsById, requirement);
  const report = isPlainObject(evidence.report) ? evidence.report : {};
  const observedAt = normalizeDate(
    evidence.observedAt ||
    evidence.observed_at ||
    evidence.validatedAt ||
    evidence.validated_at ||
    report.observedAt ||
    report.validatedAt
  );
  const sealedRcCommit = normalizeCommit(
    evidence.sealedRcCommit ||
    evidence.sealed_rc_commit ||
    report.sealedRcCommit ||
    report.sealed_rc_commit ||
    context.sealedRcCommit
  );
  const headCommit = normalizeCommit(
    evidence.headCommit ||
    evidence.head_commit ||
    report.headCommit ||
    report.head_commit ||
    context.currentHeadCommit
  );
  const blockers = [];

  if (!isPlainObject(report) || Object.keys(report).length === 0) {
    blockers.push('report_required');
  }
  if (report.taskId !== requirement.taskId) blockers.push('task_id_mismatch');
  if (report.status !== requirement.status) blockers.push('status_mismatch');
  if (report[requirement.acceptedFlag] !== true) blockers.push('acceptance_flag_missing');
  if (Array.isArray(report.blockerReasons) && report.blockerReasons.length > 0) {
    blockers.push('report_has_blockers');
  }
  if (Array.isArray(report.blockedReasons) && report.blockedReasons.length > 0) {
    blockers.push('report_has_blockers');
  }
  if (!observedAt) blockers.push('observed_at_required');
  if (observedAt && context.asOf && observedAt.time > context.asOf.time) {
    blockers.push('observed_at_after_as_of');
  }
  if (
    observedAt &&
    context.asOf &&
    context.freshnessWindowMs > 0 &&
    context.asOf.time - observedAt.time > context.freshnessWindowMs
  ) {
    blockers.push('evidence_stale');
  }
  if (sealedRcCommit !== SEALED_V1_0_RC_COMMIT) {
    blockers.push('sealed_v1_0_rc_commit_mismatch');
  }
  if (!headCommit) blockers.push('current_head_commit_required');
  if (context.expectedCurrentHeadCommit && headCommit !== context.expectedCurrentHeadCommit) {
    blockers.push('current_head_commit_mismatch');
  }
  if (containsForbiddenFragment(report)) blockers.push('sensitive_fragment_rejected');
  if (hasForbiddenTrueFlagDeep(report)) blockers.push('nested_forbidden_side_effect_claim');
  if (hasForbiddenNonzeroCounterDeep(report)) blockers.push('nested_side_effect_counter_nonzero');

  return {
    id: requirement.id,
    taskId: report.taskId || null,
    status: report.status || null,
    accepted: blockers.length === 0,
    observedAt: observedAt ? observedAt.text : null,
    sealedRcCommit: sealedRcCommit || null,
    headCommit: headCommit || null,
    includeInValidationAggregatorInput: requirement.includeInValidationAggregatorInput,
    blockers: [...new Set(blockers)],
    report: safeClone(report)
  };
}

function buildValidationAggregatorInput({ records, asOf, sealedRcCommit, currentHeadCommit, expectedCurrentHeadCommit, freshnessWindowMs }) {
  const evidenceById = {};
  for (const record of records) {
    if (!record.includeInValidationAggregatorInput) continue;
    evidenceById[record.id] = {
      observedAt: record.observedAt,
      sealedRcCommit: record.sealedRcCommit,
      headCommit: record.headCommit,
      report: safeClone(record.report)
    };
  }
  return {
    asOf,
    sealedRcCommit,
    currentHeadCommit,
    expectedCurrentHeadCommit,
    freshnessWindowMs,
    claimsReadiness: false,
    claimsReliability: false,
    publicMcpExpansion: false,
    providerCalls: 0,
    evidenceById
  };
}

function buildV11HardeningEvidencePacket(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const mode = normalizeString(safeInput.mode);
  const sourceMode = normalizeString(safeInput.sourceMode);
  const packetId = normalizeString(safeInput.packetId) ||
    'CM-1089_V1_1_EVIDENCE_PACKET_LOCAL_DRY_RUN';
  const asOf = normalizeDate(safeInput.asOf) || normalizeDate(new Date().toISOString());
  const generatedAt = normalizeDate(safeInput.generatedAt) || asOf;
  const sealedRcCommit = normalizeCommit(safeInput.sealedRcCommit);
  const currentHeadCommit = normalizeCommit(safeInput.currentHeadCommit);
  const expectedCurrentHeadCommit = normalizeCommit(safeInput.expectedCurrentHeadCommit);
  const freshnessWindowMs = Number.isFinite(safeInput.freshnessWindowMs)
    ? Math.max(0, safeInput.freshnessWindowMs)
    : DEFAULT_FRESHNESS_WINDOW_MS;
  const packetSideEffectCounters = normalizeCounterMap(safeInput.sideEffectCounters);
  const blockers = [];

  if (mode !== REQUIRED_MODE) blockers.push('mode_must_be_v1_1_evidence_packet_runner_review_only');
  if (sourceMode !== REQUIRED_SOURCE_MODE) blockers.push('source_mode_must_be_explicit_sanitized_local_reports_only');
  if (sealedRcCommit !== SEALED_V1_0_RC_COMMIT) blockers.push('sealed_v1_0_rc_commit_mismatch');
  if (!currentHeadCommit) blockers.push('current_head_commit_required');
  if (expectedCurrentHeadCommit && currentHeadCommit !== expectedCurrentHeadCommit) {
    blockers.push('current_head_commit_mismatch');
  }
  if (generatedAt && asOf && generatedAt.time > asOf.time) blockers.push('generated_at_after_as_of');
  if (safeInput.claimsReadiness === true || safeInput.claimsReliability === true) {
    blockers.push('readiness_or_reliability_overclaim');
  }
  blockers.push(...collectCounterBlockers(safeInput.sideEffectCounters));

  const context = {
    asOf,
    sealedRcCommit,
    currentHeadCommit,
    expectedCurrentHeadCommit: expectedCurrentHeadCommit || currentHeadCommit,
    freshnessWindowMs
  };
  const records = REQUIRED_SLICE_REPORTS.map(requirement =>
    normalizeSliceEvidence(requirement, safeInput.sliceReportsById, context)
  );
  const acceptedRecords = records.filter(record => record.accepted);
  const packetBlockers = [...new Set([
    ...blockers,
    ...records.flatMap(record => record.blockers.map(reason => `${record.id}:${reason}`))
  ])];
  const accepted = packetBlockers.length === 0 &&
    acceptedRecords.length === REQUIRED_SLICE_REPORTS.length;

  return {
    taskId: TASK_ID,
    schemaVersion: SCHEMA_VERSION,
    mode,
    sourceMode,
    packetId,
    generatedAt: generatedAt ? generatedAt.text : null,
    asOf: asOf ? asOf.text : null,
    status: accepted ? RESULT_STATUS_ACCEPTED : RESULT_STATUS_BLOCKED,
    accepted,
    evidencePacketAccepted: accepted,
    decision: accepted
      ? 'V1_1_EVIDENCE_PACKET_ACCEPTED_FOR_LOCAL_REVIEW_NOT_READY'
      : 'V1_1_EVIDENCE_PACKET_BLOCKED_NOT_READY',
    baselineBinding: {
      sealedRcCommit: sealedRcCommit || null,
      currentHeadCommit: currentHeadCommit || null,
      expectedCurrentHeadCommit: expectedCurrentHeadCommit || currentHeadCommit || null,
      sealedV1RcPreserved: sealedRcCommit === SEALED_V1_0_RC_COMMIT,
      exactCurrentHeadBound: Boolean(currentHeadCommit) &&
        (!expectedCurrentHeadCommit || currentHeadCommit === expectedCurrentHeadCommit),
      freshnessWindowMs
    },
    sliceEvidence: {
      requiredSliceCount: REQUIRED_SLICE_REPORTS.length,
      acceptedSliceCount: acceptedRecords.length,
      missingSliceIds: records
        .filter(record => record.blockers.includes('report_required'))
        .map(record => record.id),
      rejectedSliceIds: records
        .filter(record => !record.accepted)
        .map(record => record.id),
      records: records.map(record => ({
        id: record.id,
        taskId: record.taskId,
        status: record.status,
        accepted: record.accepted,
        observedAt: record.observedAt,
        sealedRcCommit: record.sealedRcCommit,
        headCommit: record.headCommit,
        includeInValidationAggregatorInput: record.includeInValidationAggregatorInput,
        blockers: record.blockers
      }))
    },
    validationAggregatorInput: buildValidationAggregatorInput({
      records,
      asOf: asOf ? asOf.text : null,
      sealedRcCommit: sealedRcCommit || null,
      currentHeadCommit: currentHeadCommit || null,
      expectedCurrentHeadCommit: expectedCurrentHeadCommit || currentHeadCommit || null,
      freshnessWindowMs
    }),
    packetSideEffectCounters,
    readinessClaimed: false,
    reliabilityClaimed: false,
    rcReady: false,
    releaseReady: false,
    deployReady: false,
    blockerReasons: packetBlockers,
    nextAllowedAction: accepted
      ? 'feed_packet_to_validation_aggregator_or_prepare_review_only_approval_packet'
      : 'fix_v1_1_evidence_packet_blockers',
    safety: {
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
      tagsReleasesDeploys: false
    }
  };
}

module.exports = {
  DEFAULT_FRESHNESS_WINDOW_MS,
  REQUIRED_MODE,
  REQUIRED_SLICE_REPORTS,
  REQUIRED_SOURCE_MODE,
  REQUIRED_ZERO_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  SCHEMA_VERSION,
  TASK_ID,
  buildV11HardeningEvidencePacket
};
