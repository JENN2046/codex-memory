'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  REQUIRED_EVIDENCE_REFS,
  REQUIRED_ZERO_COUNTER_KEYS: PLAN_BOUNDARY_ZERO_COUNTER_KEYS,
  evaluateMemoryWriteRollbackCleanupPlanBoundary
} = require('../src/core/MemoryWriteRollbackCleanupPlanBoundary');

const {
  REQUIRED_RETAINED_STORES,
  REQUIRED_SEQUENCE,
  REQUIRED_TARGET_STORES,
  REQUIRED_ZERO_COUNTER_KEYS: DESIGN_REVIEW_ZERO_COUNTER_KEYS,
  TASK_ID: DESIGN_REVIEW_TASK_ID,
  evaluateMemoryWriteRollbackCleanupDesignReviewPolicy
} = require('../src/core/MemoryWriteRollbackCleanupDesignReviewPolicy');

const {
  REQUIRED_ZERO_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  evaluateMemoryWriteRollbackCleanupDryRunPreview
} = require('../src/core/MemoryWriteRollbackCleanupDryRunPreview');

function zeroCounters(keys) {
  return Object.fromEntries(keys.map(key => [key, 0]));
}

function createAcceptedPlanBoundaryReport() {
  return evaluateMemoryWriteRollbackCleanupPlanBoundary({
    evidenceRefs: [...REQUIRED_EVIDENCE_REFS],
    surfaceEvidence: {
      rejectedWriteNoProjectionEvidence: true,
      acceptedProjectionAccountingEvidence: true,
      degradedResidualVisibilityEvidence: true,
      projectionCleanupPartialEvidence: true,
      reconcileCleanupAllKindsEvidence: true,
      reconcileStoreKindCleanupEvidence: true,
      reconcileMemoryIdIsolationEvidence: true,
      candidateCacheMemoryIdCleanupEvidence: true,
      diaryResidualRetainedEvidence: true,
      auditAppendOnlyEvidence: true,
      realCleanupSafetyProven: false,
      realRollbackSafetyProven: false,
      diaryDeletionImplemented: false,
      auditDeletionOrRewriteImplemented: false,
      publicCleanupToolImplemented: false
    },
    cleanupPlan: {
      planId: 'CM-1061-plan-boundary-consumption',
      target: 'process',
      nextStage: 'real_cleanup_design_review_only',
      scope: 'memory_id_and_store_kind_scoped',
      designOnly: true,
      exactMemoryIdRequired: true,
      storeKindRequiredForPartialResiduals: true,
      preserveUnrelatedMemoryIds: true,
      preserveDiaryByDefault: true,
      preserveAuditAppendOnly: true,
      requiresSeparateRealCleanupApproval: true,
      requiresSeparateDiaryPolicy: true,
      requiresSeparateAuditPolicy: true,
      requiresSeparateRuntimeValidation: true,
      executionApproved: false,
      realCleanupApply: false,
      realRollbackApply: false,
      publicMcpExpansion: false,
      configWatchdogStartupChange: false,
      dependencyChange: false,
      readinessClaimed: false,
      reliabilityClaimed: false
    },
    sideEffectCounters: zeroCounters(PLAN_BOUNDARY_ZERO_COUNTER_KEYS)
  });
}

function createAcceptedDesignReviewReport(overrides = {}) {
  const report = evaluateMemoryWriteRollbackCleanupDesignReviewPolicy({
    planBoundaryReport: createAcceptedPlanBoundaryReport(),
    cleanupDesignReview: {
      reviewId: 'CM-1061-design-review-consumption',
      sourceBoundaryTaskId: 'CM-1059_MEMORY_WRITE_ROLLBACK_CLEANUP_PLAN_BOUNDARY',
      mode: 'design_review_only',
      scope: 'memory_id_and_store_kind_scoped',
      sequence: [...REQUIRED_SEQUENCE],
      targetStores: [...REQUIRED_TARGET_STORES],
      retainedStores: [...REQUIRED_RETAINED_STORES],
      designReviewOnly: true,
      requiresAcceptedPlanBoundary: true,
      requiresExactMemoryId: true,
      requiresStoreKindForPartialResiduals: true,
      preservesUnrelatedMemoryIds: true,
      previewsBeforeApply: true,
      requiresDryRunReport: true,
      requiresOperatorReceipt: true,
      requiresSeparateApplyApproval: true,
      requiresSeparateDiaryPolicy: true,
      requiresSeparateAuditPolicy: true,
      requiresRuntimeValidationBeforeApply: true,
      stopsBeforeApply: true,
      executesCleanup: false,
      appliesRollback: false,
      deletesDiaryByDefault: false,
      rewritesAudit: false,
      expandsPublicMcp: false,
      changesConfigWatchdogStartup: false,
      changesDependencies: false,
      claimsRealCleanupSafe: false,
      claimsRealRollbackSafe: false,
      claimsWriteReliable: false,
      claimsReadiness: false
    },
    sideEffectCounters: zeroCounters(DESIGN_REVIEW_ZERO_COUNTER_KEYS)
  });
  return { ...report, ...overrides };
}

function createZeroCounters(overrides = {}) {
  return Object.fromEntries(
    REQUIRED_ZERO_COUNTER_KEYS.map(key => [key, overrides[key] ?? 0])
  );
}

function createValidInput(overrides = {}) {
  return {
    designReviewReport: createAcceptedDesignReviewReport(),
    cleanupPreview: {
      previewId: 'CM-1061-rollback-cleanup-dry-run-preview',
      sourceDesignReviewTaskId: DESIGN_REVIEW_TASK_ID,
      mode: 'dry_run_preview_only',
      scope: 'memory_id_and_store_kind_scoped',
      target: 'process',
      memoryId: 'process-memory-cm-1061',
      targetStores: [...REQUIRED_TARGET_STORES],
      retainedStores: [...REQUIRED_RETAINED_STORES],
      sqliteShadowRecordPresent: true,
      vectorIndexRecordPresent: true,
      candidateCacheEntryCount: 2,
      reconcileTasks: [
        { memoryId: 'process-memory-cm-1061', storeKind: 'vector' },
        { memoryId: 'process-memory-cm-1061', storeKind: 'chunks' },
        { memoryId: 'process-memory-cm-1061', storeKind: 'chunks' }
      ],
      previewOnly: true,
      usesAcceptedDesignReview: true,
      exactMemoryIdConfirmed: true,
      storeKindScoped: true,
      preservesUnrelatedMemoryIds: true,
      retainsDiary: true,
      retainsAuditAppendOnly: true,
      requiresSeparateApplyApproval: true,
      requiresRuntimeValidationBeforeApply: true,
      stopsBeforeApply: true,
      executesCleanup: false,
      appliesRollback: false,
      deletesDiary: false,
      rewritesAudit: false,
      expandsPublicMcp: false,
      changesConfigWatchdogStartup: false,
      changesDependencies: false,
      claimsRealCleanupSafe: false,
      claimsRealRollbackSafe: false,
      claimsWriteReliable: false,
      claimsReadiness: false
    },
    sideEffectCounters: createZeroCounters(),
    ...overrides
  };
}

test('CM-1061 accepts explicit dry-run preview and builds stop-before-apply actions', () => {
  const report = evaluateMemoryWriteRollbackCleanupDryRunPreview(createValidInput());

  assert.equal(report.status, RESULT_STATUS_ACCEPTED);
  assert.equal(report.dryRunPreviewAccepted, true);
  assert.equal(report.decision, 'ROLLBACK_CLEANUP_DRY_RUN_PREVIEW_ACCEPTED_NOT_EXECUTED_NOT_READY');
  assert.deepEqual(report.blockerReasons, []);
  assert.deepEqual(report.plannedActions, [
    {
      action: 'delete_sqlite_shadow_record',
      store: 'sqlite_shadow_record',
      memoryId: 'process-memory-cm-1061',
      applies: false
    },
    {
      action: 'delete_vector_index_record',
      store: 'vector_index_record',
      memoryId: 'process-memory-cm-1061',
      applies: false
    },
    {
      action: 'clear_candidate_cache_entries',
      store: 'candidate_cache_entries',
      memoryId: 'process-memory-cm-1061',
      expectedEntryCount: 2,
      applies: false
    },
    {
      action: 'clear_reconcile_tasks',
      store: 'reconcile_queue_tasks',
      memoryId: 'process-memory-cm-1061',
      storeKind: 'chunks',
      expectedTaskCount: 2,
      applies: false
    },
    {
      action: 'clear_reconcile_tasks',
      store: 'reconcile_queue_tasks',
      memoryId: 'process-memory-cm-1061',
      storeKind: 'vector',
      expectedTaskCount: 1,
      applies: false
    }
  ]);
  assert.deepEqual(report.retainedEvidence, [
    { store: 'diary_record', retained: true, applies: false },
    { store: 'write_audit_log', retained: true, applies: false }
  ]);
  assert.deepEqual(report.applyGate, {
    gateId: 'CM-1069_MEMORY_WRITE_ROLLBACK_CLEANUP_PREVIEW_APPLY_GATE',
    gateMode: 'separate_apply_approval_required',
    dryRunPreviewAccepted: true,
    applyAuthorized: false,
    applyExecuted: false,
    approvalRequiredBeforeApply: true,
    runtimeValidationRequiredBeforeApply: true,
    operatorReceiptRequiredBeforeApply: true,
    destructiveActionAllowed: false,
    cleanupApplyRunsAllowed: 0,
    rollbackApplyRunsAllowed: 0,
    nextAllowedAction: 'request_separate_cleanup_apply_approval'
  });
  assert.equal(report.safety.buildsDryRunPreview, true);
  assert.equal(report.safety.readsStores, false);
  assert.equal(report.safety.writesStores, false);
  assert.equal(report.safety.appliesCleanup, false);
  assert.equal(report.safety.claimsReadiness, false);
});

test('CM-1061 fails closed when the design review report is not accepted', () => {
  const report = evaluateMemoryWriteRollbackCleanupDryRunPreview(createValidInput({
    designReviewReport: createAcceptedDesignReviewReport({
      status: 'MEMORY_WRITE_ROLLBACK_CLEANUP_DESIGN_REVIEW_BLOCKED_NOT_READY',
      designReviewAccepted: false,
      decision: 'ROLLBACK_CLEANUP_DESIGN_REVIEW_BLOCKED_NOT_READY',
      blockerReasons: ['design_executesCleanup_must_be_false']
    })
  }));

  assert.equal(report.status, RESULT_STATUS_BLOCKED);
  assert.equal(report.dryRunPreviewAccepted, false);
  assert.deepEqual(report.plannedActions, []);
  assert.equal(report.applyGate.applyAuthorized, false);
  assert.equal(report.applyGate.applyExecuted, false);
  assert.equal(report.applyGate.nextAllowedAction, 'fix_preview_blockers_before_apply_consideration');
  assert.ok(report.blockerReasons.includes('design_review_status_must_be_accepted'));
  assert.ok(report.blockerReasons.includes('design_review_acceptance_missing'));
  assert.ok(report.blockerReasons.includes('design_review_decision_mismatch'));
  assert.ok(report.blockerReasons.includes('design_review_has_blockers'));
});

test('CM-1061 fails closed for missing exact memory id or no cleanup targets', () => {
  const report = evaluateMemoryWriteRollbackCleanupDryRunPreview(createValidInput({
    cleanupPreview: {
      ...createValidInput().cleanupPreview,
      memoryId: '',
      sqliteShadowRecordPresent: false,
      vectorIndexRecordPresent: false,
      candidateCacheEntryCount: 0,
      reconcileTasks: []
    }
  }));

  assert.equal(report.status, RESULT_STATUS_BLOCKED);
  assert.ok(report.blockerReasons.includes('memoryId_missing'));
  assert.ok(report.blockerReasons.includes('cleanup_preview_targets_missing'));
});

test('CM-1061 fails closed for reconcile task memory-id mismatch or missing store kind', () => {
  const report = evaluateMemoryWriteRollbackCleanupDryRunPreview(createValidInput({
    cleanupPreview: {
      ...createValidInput().cleanupPreview,
      reconcileTasks: [
        { memoryId: 'process-memory-cm-1061', storeKind: 'vector' },
        { memoryId: 'other-memory-id', storeKind: 'chunks' },
        { memoryId: 'process-memory-cm-1061', storeKind: '' },
        'not-a-task'
      ]
    }
  }));

  assert.equal(report.status, RESULT_STATUS_BLOCKED);
  assert.ok(report.blockerReasons.includes('reconcile_task_memoryId_mismatch'));
  assert.ok(report.blockerReasons.includes('reconcile_task_storeKind_missing'));
  assert.ok(report.blockerReasons.includes('reconcile_task_malformed'));
});

test('CM-1061 fails closed for apply diary audit public MCP config dependency or readiness drift', () => {
  const report = evaluateMemoryWriteRollbackCleanupDryRunPreview(createValidInput({
    cleanupPreview: {
      ...createValidInput().cleanupPreview,
      previewOnly: false,
      executesCleanup: true,
      appliesRollback: true,
      deletesDiary: true,
      rewritesAudit: true,
      expandsPublicMcp: true,
      changesConfigWatchdogStartup: true,
      changesDependencies: true,
      claimsRealCleanupSafe: true,
      claimsRealRollbackSafe: true,
      claimsWriteReliable: true,
      claimsReadiness: true
    }
  }));

  assert.equal(report.status, RESULT_STATUS_BLOCKED);
  assert.ok(report.blockerReasons.includes('preview_previewOnly_must_be_true'));
  assert.ok(report.blockerReasons.includes('preview_executesCleanup_must_be_false'));
  assert.ok(report.blockerReasons.includes('preview_appliesRollback_must_be_false'));
  assert.ok(report.blockerReasons.includes('preview_deletesDiary_must_be_false'));
  assert.ok(report.blockerReasons.includes('preview_rewritesAudit_must_be_false'));
  assert.ok(report.blockerReasons.includes('preview_expandsPublicMcp_must_be_false'));
  assert.ok(report.blockerReasons.includes('preview_changesConfigWatchdogStartup_must_be_false'));
  assert.ok(report.blockerReasons.includes('preview_changesDependencies_must_be_false'));
  assert.ok(report.blockerReasons.includes('preview_claimsRealCleanupSafe_must_be_false'));
  assert.ok(report.blockerReasons.includes('preview_claimsRealRollbackSafe_must_be_false'));
  assert.ok(report.blockerReasons.includes('preview_claimsWriteReliable_must_be_false'));
  assert.ok(report.blockerReasons.includes('preview_claimsReadiness_must_be_false'));
});

test('CM-1061 fails closed for side-effect counters and unknown positive counters', () => {
  const missing = createZeroCounters();
  delete missing.storeReads;

  const cases = [
    {
      counters: missing,
      reason: 'counter_storeReads_missing'
    },
    {
      counters: createZeroCounters({ cleanupApplyRuns: 1 }),
      reason: 'counter_cleanupApplyRuns_must_be_zero'
    },
    {
      counters: createZeroCounters({ storeWrites: '0' }),
      reason: 'counter_storeWrites_malformed'
    },
    {
      counters: { ...createZeroCounters(), unreviewedApply: 1 },
      reason: 'counter_unreviewedApply_unknown_nonzero'
    }
  ];

  for (const item of cases) {
    const report = evaluateMemoryWriteRollbackCleanupDryRunPreview(createValidInput({
      sideEffectCounters: item.counters
    }));
    assert.equal(report.status, RESULT_STATUS_BLOCKED);
    assert.ok(report.blockerReasons.includes(item.reason), item.reason);
  }
});
