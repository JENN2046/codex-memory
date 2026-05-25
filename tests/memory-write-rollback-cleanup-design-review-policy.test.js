'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  REQUIRED_EVIDENCE_REFS,
  REQUIRED_ZERO_COUNTER_KEYS: PLAN_BOUNDARY_ZERO_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED: PLAN_BOUNDARY_STATUS_ACCEPTED,
  TASK_ID: PLAN_BOUNDARY_TASK_ID,
  evaluateMemoryWriteRollbackCleanupPlanBoundary
} = require('../src/core/MemoryWriteRollbackCleanupPlanBoundary');

const {
  REQUIRED_RETAINED_STORES,
  REQUIRED_SEQUENCE,
  REQUIRED_TARGET_STORES,
  REQUIRED_ZERO_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  evaluateMemoryWriteRollbackCleanupDesignReviewPolicy
} = require('../src/core/MemoryWriteRollbackCleanupDesignReviewPolicy');

function createPlanBoundaryZeroCounters() {
  return Object.fromEntries(PLAN_BOUNDARY_ZERO_COUNTER_KEYS.map(key => [key, 0]));
}

function createAcceptedPlanBoundaryReport(overrides = {}) {
  const report = evaluateMemoryWriteRollbackCleanupPlanBoundary({
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
      planId: 'CM-1060-plan-boundary-consumption',
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
    sideEffectCounters: createPlanBoundaryZeroCounters()
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
    planBoundaryReport: createAcceptedPlanBoundaryReport(),
    cleanupDesignReview: {
      reviewId: 'CM-1060-rollback-cleanup-design-review',
      sourceBoundaryTaskId: PLAN_BOUNDARY_TASK_ID,
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
    sideEffectCounters: createZeroCounters(),
    ...overrides
  };
}

test('CM-1060 accepts a stop-before-apply rollback cleanup design review', () => {
  const report = evaluateMemoryWriteRollbackCleanupDesignReviewPolicy(createValidInput());

  assert.equal(report.status, RESULT_STATUS_ACCEPTED);
  assert.equal(report.designReviewAccepted, true);
  assert.equal(report.decision, 'ROLLBACK_CLEANUP_DESIGN_REVIEW_ACCEPTED_STOP_BEFORE_APPLY_NOT_READY');
  assert.deepEqual(report.blockerReasons, []);
  assert.deepEqual(report.requiredSequence, REQUIRED_SEQUENCE);
  assert.deepEqual(report.requiredTargetStores, REQUIRED_TARGET_STORES);
  assert.deepEqual(report.requiredRetainedStores, REQUIRED_RETAINED_STORES);
  assert.equal(report.cleanupDesignReview.sourceBoundaryTaskId, PLAN_BOUNDARY_TASK_ID);
  assert.equal(report.cleanupDesignReview.stopsBeforeApply, true);
  assert.equal(report.cleanupDesignReview.executesCleanup, false);
  assert.equal(report.cleanupDesignReview.appliesRollback, false);
  assert.equal(report.safety.sourceMode, 'explicit_input_only');
  assert.equal(report.safety.appliesCleanup, false);
  assert.equal(report.safety.deletesDiary, false);
  assert.equal(report.safety.rewritesAudit, false);
  assert.equal(report.safety.claimsReadiness, false);
});

test('CM-1060 fails closed when the CM-1059 plan boundary is not accepted', () => {
  const report = evaluateMemoryWriteRollbackCleanupDesignReviewPolicy(createValidInput({
    planBoundaryReport: createAcceptedPlanBoundaryReport({
      status: 'MEMORY_WRITE_ROLLBACK_CLEANUP_PLAN_BOUNDARY_BLOCKED_NOT_READY',
      acceptedForRollbackCleanupDesignReview: false,
      decision: 'ROLLBACK_CLEANUP_DESIGN_REVIEW_BLOCKED_NOT_READY',
      blockerReasons: ['evidence_CM-1058_missing']
    })
  }));

  assert.equal(report.status, RESULT_STATUS_BLOCKED);
  assert.equal(report.designReviewAccepted, false);
  assert.ok(report.blockerReasons.includes('plan_boundary_status_must_be_accepted'));
  assert.ok(report.blockerReasons.includes('plan_boundary_design_review_acceptance_missing'));
  assert.ok(report.blockerReasons.includes('plan_boundary_decision_mismatch'));
  assert.ok(report.blockerReasons.includes('plan_boundary_has_blockers'));
});

test('CM-1060 fails closed when cleanup order or store boundaries drift', () => {
  const report = evaluateMemoryWriteRollbackCleanupDesignReviewPolicy(createValidInput({
    cleanupDesignReview: {
      ...createValidInput().cleanupDesignReview,
      sequence: [
        'identify_exact_memory_id',
        'preview_reconcile_tasks_by_memory_id_and_store_kind',
        'preview_projection_targets',
        'preview_candidate_cache_entries',
        'verify_diary_audit_retention',
        'require_runtime_validation_plan',
        'stop_before_apply'
      ],
      targetStores: ['sqlite_shadow_record', 'vector_index_record'],
      retainedStores: ['write_audit_log']
    }
  }));

  assert.equal(report.status, RESULT_STATUS_BLOCKED);
  assert.ok(report.blockerReasons.includes('sequence_must_match_required_order'));
  assert.ok(report.blockerReasons.includes('target_stores_exact_set_mismatch'));
  assert.ok(report.blockerReasons.includes('retained_stores_exact_set_mismatch'));
});

test('CM-1060 fails closed for cleanup apply rollback apply or diary audit mutation', () => {
  const report = evaluateMemoryWriteRollbackCleanupDesignReviewPolicy(createValidInput({
    cleanupDesignReview: {
      ...createValidInput().cleanupDesignReview,
      stopsBeforeApply: false,
      executesCleanup: true,
      appliesRollback: true,
      deletesDiaryByDefault: true,
      rewritesAudit: true,
      claimsRealCleanupSafe: true,
      claimsRealRollbackSafe: true
    }
  }));

  assert.equal(report.status, RESULT_STATUS_BLOCKED);
  assert.ok(report.blockerReasons.includes('design_stopsBeforeApply_must_be_true'));
  assert.ok(report.blockerReasons.includes('design_executesCleanup_must_be_false'));
  assert.ok(report.blockerReasons.includes('design_appliesRollback_must_be_false'));
  assert.ok(report.blockerReasons.includes('design_deletesDiaryByDefault_must_be_false'));
  assert.ok(report.blockerReasons.includes('design_rewritesAudit_must_be_false'));
  assert.ok(report.blockerReasons.includes('design_claimsRealCleanupSafe_must_be_false'));
  assert.ok(report.blockerReasons.includes('design_claimsRealRollbackSafe_must_be_false'));
});

test('CM-1060 fails closed for public MCP config dependency readiness or side-effect drift', () => {
  const report = evaluateMemoryWriteRollbackCleanupDesignReviewPolicy(createValidInput({
    cleanupDesignReview: {
      ...createValidInput().cleanupDesignReview,
      expandsPublicMcp: true,
      changesConfigWatchdogStartup: true,
      changesDependencies: true,
      claimsWriteReliable: true,
      claimsReadiness: true
    },
    sideEffectCounters: createZeroCounters({
      cleanupApplyRuns: 1,
      publicMcpExpansion: 1,
      readinessClaims: 1
    })
  }));

  assert.equal(report.status, RESULT_STATUS_BLOCKED);
  assert.ok(report.blockerReasons.includes('design_expandsPublicMcp_must_be_false'));
  assert.ok(report.blockerReasons.includes('design_changesConfigWatchdogStartup_must_be_false'));
  assert.ok(report.blockerReasons.includes('design_changesDependencies_must_be_false'));
  assert.ok(report.blockerReasons.includes('design_claimsWriteReliable_must_be_false'));
  assert.ok(report.blockerReasons.includes('design_claimsReadiness_must_be_false'));
  assert.ok(report.blockerReasons.includes('counter_cleanupApplyRuns_must_be_zero'));
  assert.ok(report.blockerReasons.includes('counter_publicMcpExpansion_must_be_zero'));
  assert.ok(report.blockerReasons.includes('counter_readinessClaims_must_be_zero'));
});

test('CM-1060 fails closed for malformed counters and unknown positive counters', () => {
  const missing = createZeroCounters();
  delete missing.providerCalls;

  const cases = [
    {
      counters: missing,
      reason: 'counter_providerCalls_missing'
    },
    {
      counters: createZeroCounters({ directJsonlReads: '0' }),
      reason: 'counter_directJsonlReads_malformed'
    },
    {
      counters: { ...createZeroCounters(), unreviewedDestructiveCleanup: 1 },
      reason: 'counter_unreviewedDestructiveCleanup_unknown_nonzero'
    }
  ];

  for (const item of cases) {
    const report = evaluateMemoryWriteRollbackCleanupDesignReviewPolicy(createValidInput({
      sideEffectCounters: item.counters
    }));
    assert.equal(report.status, RESULT_STATUS_BLOCKED);
    assert.ok(report.blockerReasons.includes(item.reason), item.reason);
  }
});
