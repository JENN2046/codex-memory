const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  buildV1RcValidationAggregatorReport
} = require('../src/core/ValidationAggregatorService');
const {
  REQUIRED_CURRENT_SLICE_EVIDENCE,
  REQUIRED_FUTURE_GAPS,
  SCHEMA_VERSION,
  SEALED_V1_0_RC_COMMIT,
  TASK_ID,
  evaluateV11HardeningValidationAggregator
} = require('../src/core/V11HardeningValidationAggregator');

const HEAD_COMMIT = '1111111111111111111111111111111111111111';
const OBSERVED_AT = '2026-05-25T09:00:00.000Z';
const AS_OF = '2026-05-25T10:00:00.000Z';

function baseEvidence(report) {
  return {
    observedAt: OBSERVED_AT,
    sealedRcCommit: SEALED_V1_0_RC_COMMIT,
    headCommit: HEAD_COMMIT,
    report
  };
}

function buildAcceptedEvidenceById(overrides = {}) {
  const evidenceById = {
    cm1082_proof_memory_tombstone_store_backed_dry_run_preview: baseEvidence({
      taskId: 'CM-1082_PROOF_MEMORY_RETENTION_TOMBSTONE_STORE_BACKED_DRY_RUN_PREVIEW',
      status: 'PROOF_MEMORY_RETENTION_TOMBSTONE_STORE_BACKED_DRY_RUN_PREVIEW_ACCEPTED_NOT_APPLIED_NOT_READY',
      storeBackedDryRunPreviewAccepted: true,
      blockerReasons: [],
      applyGate: {
        applyAuthorized: false,
        applyExecuted: false,
        cleanupApplyRunsAllowed: 0,
        rollbackApplyRunsAllowed: 0
      },
      safety: {
        readsStores: true,
        writesStores: false,
        tombstoneApplyExecuted: false,
        cleanupApplyExecuted: false,
        rollbackApplyExecuted: false,
        providerApiCalled: false,
        trueRecordMemoryCalled: false,
        trueSearchMemoryCalled: false,
        rawMemoryRead: false,
        rawJsonlRead: false,
        rawAuditRead: false,
        publicMcpExpanded: false,
        readinessClaimed: false,
        reliabilityClaimed: false
      }
    }),
    cm1083_reconcile_retry_backoff_durable_persistence_preview: baseEvidence({
      taskId: 'CM-1083_MEMORY_WRITE_RECONCILE_RETRY_BACKOFF_DURABLE_PERSISTENCE_PREVIEW',
      status: 'previewed_not_applied',
      accepted: true,
      blockerReasons: [],
      durablePersistencePreviewed: true,
      applyGate: {
        applyApproved: false,
        applyExecuted: false,
        cleanupApplyExecuted: false,
        rollbackApplyExecuted: false,
        schemaMigrationApplied: false
      },
      automaticStartupWorkerEnabled: false,
      publicMcpExpansion: false,
      readinessClaimed: false,
      reliabilityClaimed: false
    }),
    cm1084_startup_reconcile_worker_safety: baseEvidence({
      taskId: 'CM-1084_MEMORY_WRITE_RECONCILE_STARTUP_WORKER_SAFETY',
      status: 'startup_safety_review_passed_not_enabled',
      accepted: true,
      blockerReasons: [],
      startupWorkerSafetyReviewed: true,
      startupWorkerEnabled: false,
      runtimeWorkerStarted: false,
      configChanged: false,
      watchdogChanged: false,
      startupTaskChanged: false,
      publicMcpExpansion: false,
      readinessClaimed: false,
      reliabilityClaimed: false
    }),
    cm1085_cleanup_rollback_apply_design_policy: baseEvidence({
      taskId: 'CM-1085_MEMORY_WRITE_ROLLBACK_CLEANUP_APPLY_DESIGN_POLICY',
      status: 'MEMORY_WRITE_ROLLBACK_CLEANUP_APPLY_DESIGN_ACCEPTED_NOT_APPLIED_NOT_READY',
      applyDesignAccepted: true,
      blockerReasons: [],
      applyGate: {
        cleanupApplyAuthorized: false,
        rollbackApplyAuthorized: false,
        applyExecuted: false,
        cleanupApplyRunsAllowed: 0,
        rollbackApplyRunsAllowed: 0,
        destructiveActionAllowed: false
      },
      sideEffectCounters: {
        providerCalls: 0,
        apiCalls: 0,
        trueLiveRecordMemoryCalls: 0,
        trueLiveSearchMemoryCalls: 0,
        realMemoryReads: 0,
        directJsonlReads: 0,
        rawAuditReads: 0,
        durableRealMemoryWrites: 0,
        durableRealAuditWrites: 0,
        storeWrites: 0,
        cleanupApplyRuns: 0,
        rollbackApplyRuns: 0,
        diaryDeleteRuns: 0,
        auditRewriteRuns: 0,
        publicMcpExpansion: 0,
        configWatchdogStartupChanges: 0,
        dependencyActions: 0,
        readinessClaims: 0,
        reliabilityClaims: 0
      },
      safety: {
        callsRecordMemory: false,
        callsSearchMemory: false,
        callsProvider: false,
        readsRawMemory: false,
        readsJsonl: false,
        readsRawAudit: false,
        writesDurableMemory: false,
        writesDurableAudit: false,
        writesStores: false,
        executesCleanup: false,
        appliesRollback: false,
        deletesDiary: false,
        rewritesAudit: false,
        expandsPublicMcp: false,
        changesConfigWatchdogStartup: false,
        changesDependencies: false,
        claimsWriteReliable: false,
        claimsReadiness: false
      }
    })
  };

  return {
    ...evidenceById,
    ...overrides
  };
}

function buildAcceptedInput(overrides = {}) {
  return {
    asOf: AS_OF,
    sealedRcCommit: SEALED_V1_0_RC_COMMIT,
    currentHeadCommit: HEAD_COMMIT,
    expectedCurrentHeadCommit: HEAD_COMMIT,
    evidenceById: buildAcceptedEvidenceById(),
    ...overrides
  };
}

test('CM1086 aggregates current-head v1.1 slice evidence without readiness claim', () => {
  const report = evaluateV11HardeningValidationAggregator(buildAcceptedInput());

  assert.equal(report.taskId, TASK_ID);
  assert.equal(report.schemaVersion, SCHEMA_VERSION);
  assert.equal(report.accepted, true);
  assert.equal(
    report.status,
    'V1_1_VALIDATION_AGGREGATOR_CURRENT_HEAD_EVIDENCE_ACCEPTED_NOT_READY'
  );
  assert.equal(report.validationAggregatorFullImplementationImplemented, true);
  assert.equal(report.validationAggregatorFullImplementationAccepted, true);
  assert.equal(report.evidenceMatrix.requiredCurrentSliceCount, 4);
  assert.equal(report.evidenceMatrix.acceptedCurrentSliceCount, 4);
  assert.deepEqual(report.evidenceMatrix.requiredFutureGapIds, [
    'cm1087_governance_runtime_approval_audit_loop'
  ]);
  assert.deepEqual(REQUIRED_FUTURE_GAPS, [
    'cm1087_governance_runtime_approval_audit_loop'
  ]);
  assert.equal(report.v1_1HardeningComplete, false);
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.reliabilityClaimed, false);
  assert.equal(report.rcReady, false);
  assert.equal(report.finalMatrixAuthority.implemented, true);
  assert.equal(report.finalMatrixAuthority.executesFinalRcMatrix, false);
  assert.equal(report.finalMatrixAuthority.canClaimV1RcReady, false);
  assert.equal(report.safety.callsProviders, false);
  assert.equal(report.safety.callsRecordMemory, false);
  assert.equal(report.safety.callsSearchMemory, false);
});

test('CM1086 fails closed when evidence is stale', () => {
  const evidenceById = buildAcceptedEvidenceById({
    cm1083_reconcile_retry_backoff_durable_persistence_preview: {
      ...buildAcceptedEvidenceById()
        .cm1083_reconcile_retry_backoff_durable_persistence_preview,
      observedAt: '2026-05-01T00:00:00.000Z'
    }
  });

  const report = evaluateV11HardeningValidationAggregator(
    buildAcceptedInput({ evidenceById })
  );

  assert.equal(report.accepted, false);
  assert.equal(report.evidenceMatrix.acceptedCurrentSliceCount, 3);
  assert.deepEqual(report.evidenceMatrix.staleEvidenceIds, [
    'cm1083_reconcile_retry_backoff_durable_persistence_preview'
  ]);
  assert.equal(
    report.blockerReasons.includes(
      'cm1083_reconcile_retry_backoff_durable_persistence_preview:evidence_stale'
    ),
    true
  );
  assert.equal(report.readinessClaimed, false);
});

test('CM1086 enforces sealed RC and current-head baseline binding', () => {
  const wrongHead = evaluateV11HardeningValidationAggregator(
    buildAcceptedInput({
      currentHeadCommit: HEAD_COMMIT,
      expectedCurrentHeadCommit: '2222222222222222222222222222222222222222'
    })
  );
  const wrongRc = evaluateV11HardeningValidationAggregator(
    buildAcceptedInput({
      sealedRcCommit: '3333333333333333333333333333333333333333'
    })
  );

  assert.equal(wrongHead.accepted, false);
  assert.equal(
    wrongHead.blockerReasons.includes('current_head_commit_mismatch'),
    true
  );
  assert.equal(wrongRc.accepted, false);
  assert.equal(
    wrongRc.blockerReasons.includes('sealed_v1_0_rc_commit_mismatch'),
    true
  );
  assert.equal(wrongRc.sealedV1RcPreserved, false);
});

test('CM1086 rejects side effects and sensitive fragments without echoing readiness', () => {
  const originalEvidence = buildAcceptedEvidenceById();
  const unsafeEvidence = {
    ...originalEvidence,
    cm1082_proof_memory_tombstone_store_backed_dry_run_preview: {
      ...originalEvidence.cm1082_proof_memory_tombstone_store_backed_dry_run_preview,
      report: {
        ...originalEvidence.cm1082_proof_memory_tombstone_store_backed_dry_run_preview.report,
        safety: {
          ...originalEvidence.cm1082_proof_memory_tombstone_store_backed_dry_run_preview.report.safety,
          providerApiCalled: true
        }
      }
    },
    cm1085_cleanup_rollback_apply_design_policy: {
      ...originalEvidence.cm1085_cleanup_rollback_apply_design_policy,
      report: {
        ...originalEvidence.cm1085_cleanup_rollback_apply_design_policy.report,
        sideEffectCounters: {
          ...originalEvidence.cm1085_cleanup_rollback_apply_design_policy.report.sideEffectCounters,
          cleanupApplyRuns: 1
        }
      }
    }
  };

  const report = evaluateV11HardeningValidationAggregator(
    buildAcceptedInput({
      claimsReadiness: true,
      evidenceById: unsafeEvidence
    })
  );

  assert.equal(report.accepted, false);
  assert.equal(
    report.blockerReasons.includes('readiness_or_reliability_overclaim'),
    true
  );
  assert.equal(
    report.blockerReasons.includes(
      'cm1082_proof_memory_tombstone_store_backed_dry_run_preview:safety_claims_forbidden_side_effect'
    ),
    true
  );
  assert.equal(
    report.blockerReasons.includes(
      'cm1085_cleanup_rollback_apply_design_policy:side_effect_counter_nonzero'
    ),
    true
  );
  assert.equal(report.finalMatrixAuthority.canClaimV1RcReady, false);
  assert.equal(report.rcReady, false);
});

test('CM1086 rejects nested apply or durable-write claims inside evidence reports', () => {
  const originalEvidence = buildAcceptedEvidenceById();
  const unsafeEvidence = {
    ...originalEvidence,
    cm1083_reconcile_retry_backoff_durable_persistence_preview: {
      ...originalEvidence.cm1083_reconcile_retry_backoff_durable_persistence_preview,
      report: {
        ...originalEvidence.cm1083_reconcile_retry_backoff_durable_persistence_preview.report,
        plannedUpdate: {
          applies: true
        }
      }
    },
    cm1085_cleanup_rollback_apply_design_policy: {
      ...originalEvidence.cm1085_cleanup_rollback_apply_design_policy,
      report: {
        ...originalEvidence.cm1085_cleanup_rollback_apply_design_policy.report,
        auditPlan: {
          entries: [
            {
              writesDurableAudit: true
            }
          ]
        }
      }
    }
  };

  const report = evaluateV11HardeningValidationAggregator(
    buildAcceptedInput({ evidenceById: unsafeEvidence })
  );

  assert.equal(report.accepted, false);
  assert.equal(
    report.blockerReasons.includes(
      'cm1083_reconcile_retry_backoff_durable_persistence_preview:nested_forbidden_side_effect_claim'
    ),
    true
  );
  assert.equal(
    report.blockerReasons.includes(
      'cm1085_cleanup_rollback_apply_design_policy:nested_forbidden_side_effect_claim'
    ),
    true
  );
});

test('ValidationAggregator service surfaces CM1086 optional v1.1 hardening evidence', () => {
  const report = buildV1RcValidationAggregatorReport({
    generatedAt: AS_OF,
    v11HardeningEvidence: buildAcceptedInput()
  });

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.v11HardeningValidationAggregatorImplemented, true);
  assert.equal(report.summary.v11HardeningValidationAggregatorAccepted, true);
  assert.equal(report.summary.v11HardeningValidationAggregatorCurrentSliceAcceptedCount, 4);
  assert.equal(report.summary.v11HardeningValidationAggregatorFutureGapCount, 1);
  assert.equal(report.summary.v11HardeningValidationAggregatorCanClaimV1RcReady, false);
  assert.equal(
    report.evidence.cm1086V11HardeningValidationAggregator.nextAllowedAction,
    'continue_to_cm1087_governance_runtime_approval_audit_loop'
  );
  assert.equal(report.summary.rcReady, false);
});

test('CM1086 required current slice evidence registry is exact', () => {
  assert.deepEqual(REQUIRED_CURRENT_SLICE_EVIDENCE.map(item => item.id), [
    'cm1082_proof_memory_tombstone_store_backed_dry_run_preview',
    'cm1083_reconcile_retry_backoff_durable_persistence_preview',
    'cm1084_startup_reconcile_worker_safety',
    'cm1085_cleanup_rollback_apply_design_policy'
  ]);
});
