'use strict';

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

const TASK_ID = 'CM-1086_V1_1_VALIDATION_AGGREGATOR_FULL_IMPLEMENTATION';
const SCHEMA_VERSION = 'v1-1-hardening-validation-aggregator-v1';
const SEALED_V1_0_RC_COMMIT = 'f4549b4a1a9265bdc867c35b72f66d8d1a1a66a9';
const DEFAULT_FRESHNESS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const REQUIRED_CURRENT_SLICE_EVIDENCE = Object.freeze([
  {
    id: 'cm1082_proof_memory_tombstone_store_backed_dry_run_preview',
    taskId: PROOF_TOMBSTONE_PREVIEW_TASK_ID,
    status: PROOF_TOMBSTONE_PREVIEW_STATUS_ACCEPTED,
    acceptedFlag: 'storeBackedDryRunPreviewAccepted'
  },
  {
    id: 'cm1083_reconcile_retry_backoff_durable_persistence_preview',
    taskId: RECONCILE_RETRY_BACKOFF_TASK_ID,
    status: 'previewed_not_applied',
    acceptedFlag: 'accepted'
  },
  {
    id: 'cm1084_startup_reconcile_worker_safety',
    taskId: STARTUP_WORKER_SAFETY_TASK_ID,
    status: 'startup_safety_review_passed_not_enabled',
    acceptedFlag: 'accepted'
  },
  {
    id: 'cm1085_cleanup_rollback_apply_design_policy',
    taskId: ROLLBACK_CLEANUP_APPLY_DESIGN_TASK_ID,
    status: ROLLBACK_CLEANUP_APPLY_DESIGN_STATUS_ACCEPTED,
    acceptedFlag: 'applyDesignAccepted'
  }
]);

const REQUIRED_FUTURE_GAPS = Object.freeze([
  'cm1087_governance_runtime_approval_audit_loop'
]);

const REQUIRED_GOVERNANCE_LOOP_EVIDENCE = Object.freeze({
  id: 'cm1087_governance_runtime_approval_audit_loop',
  taskId: GOVERNANCE_RUNTIME_APPROVAL_AUDIT_LOOP_TASK_ID,
  status: GOVERNANCE_RUNTIME_APPROVAL_AUDIT_LOOP_STATUS_ACCEPTED,
  acceptedFlag: 'runtimeApprovalAuditLoopAccepted'
});

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
  'applyExecuted',
  'applies',
  'tombstoneApplyExecuted',
  'cleanupApplyExecuted',
  'rollbackApplyExecuted',
  'schemaMigrationApplied',
  'automaticWorkerStarted',
  'automaticStartupWorkerEnabled',
  'startupWorkerEnabled',
  'runtimeWorkerStarted',
  'configChanged',
  'watchdogChanged',
  'startupTaskChanged',
  'publicMcpExpansion',
  'publicMcpExpanded',
  'providerApiCalled',
  'trueRecordMemoryCalled',
  'trueSearchMemoryCalled',
  'rawMemoryRead',
  'rawJsonlRead',
  'rawAuditRead',
  'writesStores',
  'writesDurableMemory',
  'writesDurableAudit',
  'callsRecordMemory',
  'callsSearchMemory',
  'callsProvider',
  'readsRawMemory',
  'readsJsonl',
  'readsRawAudit',
  'executesCleanup',
  'appliesRollback',
  'deletesDiary',
  'rewritesAudit',
  'changesConfigWatchdogStartup',
  'changesDependencies',
  'tagReleaseDeploy',
  'readinessClaimed',
  'reliabilityClaimed',
  'claimsReadiness',
  'claimsWriteReliable',
  'claimsRealCleanupSafe',
  'claimsRealRollbackSafe'
]);

const FORBIDDEN_NONZERO_COUNTERS = Object.freeze([
  'providerCalls',
  'apiCalls',
  'trueLiveRecordMemoryCalls',
  'trueLiveSearchMemoryCalls',
  'realMemoryReads',
  'directJsonlReads',
  'rawAuditReads',
  'durableRealMemoryWrites',
  'durableRealAuditWrites',
  'storeWrites',
  'cleanupApplyRuns',
  'rollbackApplyRuns',
  'diaryDeleteRuns',
  'auditRewriteRuns',
  'publicMcpExpansion',
  'configWatchdogStartupChanges',
  'dependencyActions',
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
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) return null;
  return { text, time: parsed };
}

function containsForbiddenFragment(value) {
  const encoded = JSON.stringify(value || {}).toLowerCase();
  return FORBIDDEN_FRAGMENTS.some(fragment => encoded.includes(fragment));
}

function hasForbiddenTrueFlag(value) {
  if (!isPlainObject(value)) return false;
  return FORBIDDEN_TRUE_FLAGS.some(key => value[key] === true);
}

function hasForbiddenTrueFlagDeep(value) {
  if (Array.isArray(value)) {
    return value.some(item => hasForbiddenTrueFlagDeep(item));
  }
  if (!isPlainObject(value)) return false;
  if (hasForbiddenTrueFlag(value)) return true;
  return Object.values(value).some(item => hasForbiddenTrueFlagDeep(item));
}

function hasForbiddenNonzeroCounter(value) {
  if (!isPlainObject(value)) return false;
  return FORBIDDEN_NONZERO_COUNTERS.some(key =>
    Number.isFinite(value[key]) && Number(value[key]) !== 0
  );
}

function hasForbiddenNonzeroCounterDeep(value) {
  if (Array.isArray(value)) {
    return value.some(item => hasForbiddenNonzeroCounterDeep(item));
  }
  if (!isPlainObject(value)) return false;
  if (hasForbiddenNonzeroCounter(value)) return true;
  return Object.values(value).some(item => hasForbiddenNonzeroCounterDeep(item));
}

function collectSafetyBlockers(report = {}) {
  const blockers = [];
  const safety = isPlainObject(report.safety) ? report.safety : {};
  const applyGate = isPlainObject(report.applyGate) ? report.applyGate : {};
  const sideEffectCounters = isPlainObject(report.sideEffectCounters)
    ? report.sideEffectCounters
    : {};

  if (containsForbiddenFragment(report)) blockers.push('sensitive_fragment_rejected');
  if (hasForbiddenTrueFlag(report)) blockers.push('report_claims_forbidden_side_effect');
  if (hasForbiddenTrueFlag(safety)) blockers.push('safety_claims_forbidden_side_effect');
  if (hasForbiddenTrueFlag(applyGate)) blockers.push('apply_gate_claims_forbidden_side_effect');
  if (hasForbiddenNonzeroCounter(sideEffectCounters)) blockers.push('side_effect_counter_nonzero');
  if (hasForbiddenTrueFlagDeep(report)) blockers.push('nested_forbidden_side_effect_claim');
  if (hasForbiddenNonzeroCounterDeep(report)) blockers.push('nested_side_effect_counter_nonzero');

  return blockers;
}

function normalizeEvidenceRecord(requirement, evidence = {}, context = {}) {
  const safeEvidence = isPlainObject(evidence) ? evidence : {};
  const report = isPlainObject(safeEvidence.report) ? safeEvidence.report : safeEvidence;
  const observedAt = normalizeDate(
    safeEvidence.observedAt ||
    safeEvidence.observed_at ||
    safeEvidence.validatedAt ||
    safeEvidence.validated_at
  );
  const sealedRcCommit = normalizeCommit(
    safeEvidence.sealedRcCommit ||
    safeEvidence.sealed_rc_commit ||
    report.sealedRcCommit ||
    report.sealed_rc_commit ||
    context.sealedRcCommit
  );
  const headCommit = normalizeCommit(
    safeEvidence.headCommit ||
    safeEvidence.head_commit ||
    report.headCommit ||
    report.head_commit ||
    context.currentHeadCommit
  );
  const blockers = [];

  if (report.taskId !== requirement.taskId) blockers.push('task_id_mismatch');
  if (report.status !== requirement.status) blockers.push('status_mismatch');
  if (report[requirement.acceptedFlag] !== true) {
    blockers.push('acceptance_flag_missing');
  }
  if (!observedAt) blockers.push('observed_at_required');
  if (sealedRcCommit !== SEALED_V1_0_RC_COMMIT) {
    blockers.push('sealed_v1_0_rc_commit_mismatch');
  }
  if (!headCommit) blockers.push('current_head_commit_required');
  if (context.expectedCurrentHeadCommit && headCommit !== context.expectedCurrentHeadCommit) {
    blockers.push('current_head_commit_mismatch');
  }
  if (Array.isArray(report.blockerReasons) && report.blockerReasons.length > 0) {
    blockers.push('evidence_report_has_blockers');
  }
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
  blockers.push(...collectSafetyBlockers(report));

  return {
    id: requirement.id,
    taskId: report.taskId || null,
    status: report.status || null,
    accepted: blockers.length === 0,
    observedAt: observedAt ? observedAt.text : null,
    sealedRcCommit: sealedRcCommit || null,
    headCommit: headCommit || null,
    blockers: [...new Set(blockers)]
  };
}

function evaluateV11HardeningValidationAggregator(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const asOf = normalizeDate(safeInput.asOf) || normalizeDate(new Date().toISOString());
  const sealedRcCommit = normalizeCommit(safeInput.sealedRcCommit) || SEALED_V1_0_RC_COMMIT;
  const currentHeadCommit = normalizeCommit(safeInput.currentHeadCommit);
  const expectedCurrentHeadCommit = normalizeCommit(safeInput.expectedCurrentHeadCommit);
  const freshnessWindowMs = Number.isFinite(safeInput.freshnessWindowMs)
    ? Math.max(0, safeInput.freshnessWindowMs)
    : DEFAULT_FRESHNESS_WINDOW_MS;
  const evidenceById = isPlainObject(safeInput.evidenceById)
    ? safeInput.evidenceById
    : {};
  const globalBlockers = [];

  if (sealedRcCommit !== SEALED_V1_0_RC_COMMIT) {
    globalBlockers.push('sealed_v1_0_rc_commit_mismatch');
  }
  if (!currentHeadCommit) {
    globalBlockers.push('current_head_commit_required');
  }
  if (expectedCurrentHeadCommit && currentHeadCommit !== expectedCurrentHeadCommit) {
    globalBlockers.push('current_head_commit_mismatch');
  }
  if (safeInput.claimsReadiness === true || safeInput.claimsReliability === true) {
    globalBlockers.push('readiness_or_reliability_overclaim');
  }
  if (safeInput.publicMcpExpansion === true) {
    globalBlockers.push('public_mcp_expansion_not_authorized');
  }
  if (safeInput.providerCalls === true || Number(safeInput.providerCalls) > 0) {
    globalBlockers.push('provider_calls_not_authorized');
  }

  const context = {
    asOf,
    sealedRcCommit,
    currentHeadCommit,
    expectedCurrentHeadCommit: expectedCurrentHeadCommit || currentHeadCommit,
    freshnessWindowMs
  };
  const evidenceRecords = REQUIRED_CURRENT_SLICE_EVIDENCE.map(requirement => {
    const evidence = evidenceById[requirement.id] || {};
    return normalizeEvidenceRecord(requirement, evidence, context);
  });
  const governanceLoopEvidence = Object.prototype.hasOwnProperty.call(
    evidenceById,
    REQUIRED_GOVERNANCE_LOOP_EVIDENCE.id
  )
    ? normalizeEvidenceRecord(
      REQUIRED_GOVERNANCE_LOOP_EVIDENCE,
      evidenceById[REQUIRED_GOVERNANCE_LOOP_EVIDENCE.id],
      context
    )
    : null;
  const acceptedEvidence = evidenceRecords.filter(record => record.accepted);
  const missingEvidenceIds = evidenceRecords
    .filter(record => record.blockers.includes('task_id_mismatch') && record.taskId === null)
    .map(record => record.id);
  const staleEvidenceIds = evidenceRecords
    .filter(record => record.blockers.includes('evidence_stale'))
    .map(record => record.id);
  const rejectedEvidenceIds = evidenceRecords
    .filter(record => !record.accepted && !missingEvidenceIds.includes(record.id))
    .map(record => record.id);
  const futureGapIds = governanceLoopEvidence?.accepted === true
    ? []
    : [...REQUIRED_FUTURE_GAPS];
  const blockerReasons = [...new Set([
    ...globalBlockers,
    ...evidenceRecords.flatMap(record => record.blockers.map(reason => `${record.id}:${reason}`)),
    ...(governanceLoopEvidence
      ? governanceLoopEvidence.blockers.map(reason => `${governanceLoopEvidence.id}:${reason}`)
      : [])
  ])];
  const currentSliceAccepted = blockerReasons.length === 0 &&
    acceptedEvidence.length === REQUIRED_CURRENT_SLICE_EVIDENCE.length;

  return {
    taskId: TASK_ID,
    schemaVersion: SCHEMA_VERSION,
    mode: 'read_only_explicit_evidence_aggregation',
    sourceMode: 'explicit_sanitized_current_head_evidence_only',
    status: currentSliceAccepted
      ? 'V1_1_VALIDATION_AGGREGATOR_CURRENT_HEAD_EVIDENCE_ACCEPTED_NOT_READY'
      : 'V1_1_VALIDATION_AGGREGATOR_BLOCKED_NOT_READY',
    accepted: currentSliceAccepted,
    decision: currentSliceAccepted
      ? 'V1_1_VALIDATION_AGGREGATOR_FULL_IMPLEMENTATION_ACCEPTED_CURRENT_HEAD_EVIDENCE_NOT_READY'
      : 'V1_1_VALIDATION_AGGREGATOR_FULL_IMPLEMENTATION_BLOCKED_NOT_READY',
    sealedV1RcPreserved: sealedRcCommit === SEALED_V1_0_RC_COMMIT,
    baselineBinding: {
      sealedRcCommit,
      currentHeadCommit: currentHeadCommit || null,
      expectedCurrentHeadCommit: expectedCurrentHeadCommit || currentHeadCommit || null,
      exactCurrentHeadBound: Boolean(currentHeadCommit) &&
        (!expectedCurrentHeadCommit || currentHeadCommit === expectedCurrentHeadCommit),
      staleEvidenceRejectionImplemented: true,
      staleEvidenceRejected: staleEvidenceIds.length > 0,
      freshnessWindowMs
    },
    evidenceMatrix: {
      requiredCurrentSliceCount: REQUIRED_CURRENT_SLICE_EVIDENCE.length,
      acceptedCurrentSliceCount: acceptedEvidence.length,
      missingEvidenceIds,
      staleEvidenceIds,
      rejectedEvidenceIds,
      governanceRuntimeApprovalAuditLoopAccepted:
        governanceLoopEvidence?.accepted === true,
      governanceRuntimeApprovalAuditLoopEvidence: governanceLoopEvidence,
      requiredFutureGapIds: futureGapIds,
      records: evidenceRecords
    },
    finalMatrixAuthority: {
      implemented: true,
      currentHeadEvidenceIngested: acceptedEvidence.length > 0,
      staleEvidenceRejectionImplemented: true,
      staleEvidenceRejected: staleEvidenceIds.length > 0,
      baselineBindingEnforced: true,
      authoritativeFor: 'v1_1_hardening_local_current_head_evidence_only',
      executesFinalRcMatrix: false,
      canClaimFinalRcReady: false,
      canClaimV1RcReady: false,
      canClaimRuntimeReady: false,
      canClaimReliability: false
    },
    validationAggregatorFullImplementationImplemented: true,
    validationAggregatorFullImplementationAccepted: currentSliceAccepted,
    v1_1HardeningComplete: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    rcReady: false,
    releaseReady: false,
    deployReady: false,
    blockerReasons,
    nextAllowedAction: currentSliceAccepted
      ? 'continue_to_cm1087_governance_runtime_approval_audit_loop'
      : 'fix_validation_aggregator_evidence_blockers',
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
      appliesCleanup: false,
      appliesRollback: false,
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
  REQUIRED_CURRENT_SLICE_EVIDENCE,
  REQUIRED_FUTURE_GAPS,
  REQUIRED_GOVERNANCE_LOOP_EVIDENCE,
  SCHEMA_VERSION,
  SEALED_V1_0_RC_COMMIT,
  TASK_ID,
  evaluateV11HardeningValidationAggregator
};
