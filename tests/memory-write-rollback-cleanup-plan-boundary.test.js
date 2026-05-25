'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  REQUIRED_EVIDENCE_REFS,
  REQUIRED_ZERO_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  evaluateMemoryWriteRollbackCleanupPlanBoundary
} = require('../src/core/MemoryWriteRollbackCleanupPlanBoundary');

function createZeroCounters(overrides = {}) {
  return Object.fromEntries(
    REQUIRED_ZERO_COUNTER_KEYS.map(key => [key, overrides[key] ?? 0])
  );
}

function createValidInput(overrides = {}) {
  return {
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
      planId: 'CM-1059-rollback-cleanup-plan-boundary',
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
    sideEffectCounters: createZeroCounters(),
    ...overrides
  };
}

test('CM-1059 accepts complete rollback cleanup design-review boundary input without execution', () => {
  const report = evaluateMemoryWriteRollbackCleanupPlanBoundary(createValidInput());

  assert.equal(report.status, RESULT_STATUS_ACCEPTED);
  assert.equal(report.acceptedForRollbackCleanupDesignReview, true);
  assert.equal(report.decision, 'ROLLBACK_CLEANUP_DESIGN_REVIEW_READY_NOT_EXECUTED_NOT_READY');
  assert.deepEqual(report.blockerReasons, []);
  assert.deepEqual(report.requiredEvidenceRefs, REQUIRED_EVIDENCE_REFS);
  assert.equal(report.cleanupPlan.nextStage, 'real_cleanup_design_review_only');
  assert.equal(report.cleanupPlan.realCleanupApply, false);
  assert.equal(report.cleanupPlan.realRollbackApply, false);
  assert.equal(report.surfaceEvidence.realCleanupSafetyProven, false);
  assert.equal(report.surfaceEvidence.realRollbackSafetyProven, false);
  assert.equal(report.safety.sourceMode, 'explicit_input_only');
  assert.equal(report.safety.appliesCleanup, false);
  assert.equal(report.safety.expandsPublicMcp, false);
  assert.equal(report.safety.claimsWriteReliable, false);
  assert.equal(report.safety.claimsReadiness, false);
});

test('CM-1059 fails closed when required evidence refs are missing duplicated or unexpected', () => {
  const report = evaluateMemoryWriteRollbackCleanupPlanBoundary(createValidInput({
    evidenceRefs: [
      'CM-0840',
      'CM-0840',
      'CM-0841',
      'CM-0842',
      'CM-1031',
      'CM-1032',
      'CM-1056',
      'CM-1057',
      'CM-9999'
    ]
  }));

  assert.equal(report.status, RESULT_STATUS_BLOCKED);
  assert.equal(report.acceptedForRollbackCleanupDesignReview, false);
  assert.ok(report.blockerReasons.includes('evidence_CM-1058_missing'));
  assert.ok(report.blockerReasons.includes('evidence_CM-9999_unexpected'));
  assert.ok(report.blockerReasons.includes('evidence_refs_duplicate'));
  assert.ok(report.blockerReasons.includes('evidence_refs_exact_set_mismatch'));
});

test('CM-1059 fails closed when surface evidence hides residuals or claims real safety', () => {
  const report = evaluateMemoryWriteRollbackCleanupPlanBoundary(createValidInput({
    surfaceEvidence: {
      ...createValidInput().surfaceEvidence,
      degradedResidualVisibilityEvidence: false,
      reconcileMemoryIdIsolationEvidence: false,
      realCleanupSafetyProven: true,
      auditDeletionOrRewriteImplemented: true
    }
  }));

  assert.equal(report.status, RESULT_STATUS_BLOCKED);
  assert.ok(report.blockerReasons.includes('surface_degradedResidualVisibilityEvidence_must_be_true'));
  assert.ok(report.blockerReasons.includes('surface_reconcileMemoryIdIsolationEvidence_must_be_true'));
  assert.ok(report.blockerReasons.includes('surface_realCleanupSafetyProven_must_be_false'));
  assert.ok(report.blockerReasons.includes('surface_auditDeletionOrRewriteImplemented_must_be_false'));
});

test('CM-1059 fails closed for execution approval real cleanup apply or public MCP expansion', () => {
  const report = evaluateMemoryWriteRollbackCleanupPlanBoundary(createValidInput({
    cleanupPlan: {
      ...createValidInput().cleanupPlan,
      designOnly: false,
      executionApproved: true,
      realCleanupApply: true,
      publicMcpExpansion: true,
      readinessClaimed: true,
      reliabilityClaimed: true
    }
  }));

  assert.equal(report.status, RESULT_STATUS_BLOCKED);
  assert.ok(report.blockerReasons.includes('plan_designOnly_must_be_true'));
  assert.ok(report.blockerReasons.includes('plan_executionApproved_must_be_false'));
  assert.ok(report.blockerReasons.includes('plan_realCleanupApply_must_be_false'));
  assert.ok(report.blockerReasons.includes('plan_publicMcpExpansion_must_be_false'));
  assert.ok(report.blockerReasons.includes('plan_readinessClaimed_must_be_false'));
  assert.ok(report.blockerReasons.includes('plan_reliabilityClaimed_must_be_false'));
});

test('CM-1059 fails closed for side effects malformed counters or unknown positive counters', () => {
  const missing = createZeroCounters();
  delete missing.providerCalls;

  const cases = [
    {
      counters: missing,
      reason: 'counter_providerCalls_missing'
    },
    {
      counters: createZeroCounters({ realMemoryReads: '0' }),
      reason: 'counter_realMemoryReads_malformed'
    },
    {
      counters: createZeroCounters({ cleanupApply: 1 }),
      reason: 'counter_cleanupApply_must_be_zero'
    },
    {
      counters: { ...createZeroCounters(), unreviewedCleanupMutation: 1 },
      reason: 'counter_unreviewedCleanupMutation_unknown_nonzero'
    }
  ];

  for (const item of cases) {
    const report = evaluateMemoryWriteRollbackCleanupPlanBoundary(createValidInput({
      sideEffectCounters: item.counters
    }));

    assert.equal(report.status, RESULT_STATUS_BLOCKED, item.reason);
    assert.ok(report.blockerReasons.includes(item.reason), item.reason);
  }
});

test('CM-1059 helper exports required constants and performs no implicit IO', () => {
  const source = require('../src/core/MemoryWriteRollbackCleanupPlanBoundary');

  assert.equal(typeof source.evaluateMemoryWriteRollbackCleanupPlanBoundary, 'function');
  assert.deepEqual(source.REQUIRED_EVIDENCE_REFS, REQUIRED_EVIDENCE_REFS);
  assert.equal(source.REQUIRED_EVIDENCE_REFS.includes('CM-1058'), true);
});
