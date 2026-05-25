'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  RESULT_STATUS_ACCEPTED: STORE_BACKED_PREVIEW_STATUS_ACCEPTED,
  TASK_ID: STORE_BACKED_PREVIEW_TASK_ID
} = require('../src/core/MemoryWriteRollbackCleanupStoreBackedDryRunPreview');
const {
  REQUIRED_ZERO_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  evaluateMemoryWriteRollbackCleanupApplyDesignPolicy
} = require('../src/core/MemoryWriteRollbackCleanupApplyDesignPolicy');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(
    REQUIRED_ZERO_COUNTER_KEYS.map(key => [key, overrides[key] ?? 0])
  );
}

function createAcceptedStoreBackedPreviewReport(overrides = {}) {
  const memoryId = 'process-memory-cm-1085';
  return {
    taskId: STORE_BACKED_PREVIEW_TASK_ID,
    status: STORE_BACKED_PREVIEW_STATUS_ACCEPTED,
    storeBackedDryRunPreviewAccepted: true,
    decision: 'ROLLBACK_CLEANUP_STORE_BACKED_DRY_RUN_PREVIEW_ACCEPTED_NOT_APPLIED_NOT_READY',
    memoryId,
    plannedActions: [
      {
        action: 'delete_sqlite_shadow_record',
        store: 'sqlite_shadow_record',
        memoryId,
        applies: false
      },
      {
        action: 'delete_vector_index_record',
        store: 'vector_index_record',
        memoryId,
        applies: false
      },
      {
        action: 'clear_candidate_cache_entries',
        store: 'candidate_cache_entries',
        memoryId,
        expectedEntryCount: 2,
        applies: false
      },
      {
        action: 'clear_reconcile_tasks',
        store: 'reconcile_queue_tasks',
        memoryId,
        storeKind: 'chunks',
        expectedTaskCount: 1,
        applies: false
      }
    ],
    applyGate: {
      applyAuthorized: false,
      applyExecuted: false,
      cleanupApplyRunsAllowed: 0,
      rollbackApplyRunsAllowed: 0
    },
    blockerReasons: [],
    safety: {
      writesStores: false,
      appliesCleanup: false,
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
    ...overrides
  };
}

function createValidApplyDesign(overrides = {}) {
  return {
    designId: 'CM-1085-cleanup-rollback-apply-design',
    sourceStoreBackedPreviewTaskId: STORE_BACKED_PREVIEW_TASK_ID,
    mode: 'cleanup_rollback_apply_design_review_only',
    scope: 'memory_id_and_store_kind_scoped',
    target: 'process',
    memoryId: 'process-memory-cm-1085',
    plannedActionIds: [
      'delete_sqlite_shadow_record:sqlite_shadow_record:all',
      'delete_vector_index_record:vector_index_record:all',
      'clear_candidate_cache_entries:candidate_cache_entries:all',
      'clear_reconcile_tasks:reconcile_queue_tasks:chunks'
    ],
    applyDesignReviewOnly: true,
    usesAcceptedStoreBackedPreview: true,
    exactMemoryIdConfirmed: true,
    storeKindScoped: true,
    preservesUnrelatedMemoryIds: true,
    retainsDiary: true,
    retainsAuditAppendOnly: true,
    requiresSeparateCleanupApplyApproval: true,
    requiresSeparateRollbackApplyApproval: true,
    requiresRuntimeValidationBeforeApply: true,
    requiresOperatorReceiptBeforeApply: true,
    requiresPostApplyVerification: true,
    requiresRollbackPlan: true,
    stopsBeforeApply: true,
    cleanupApplyApproved: false,
    rollbackApplyApproved: false,
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
    claimsReadiness: false,
    ...overrides
  };
}

function createValidInput(overrides = {}) {
  return {
    storeBackedPreviewReport: createAcceptedStoreBackedPreviewReport(),
    applyDesign: createValidApplyDesign(),
    sideEffectCounters: zeroCounters(),
    ...overrides
  };
}

test('CM-1085 accepts cleanup rollback apply design while stopping before apply', () => {
  const report = evaluateMemoryWriteRollbackCleanupApplyDesignPolicy(createValidInput());

  assert.equal(report.status, RESULT_STATUS_ACCEPTED);
  assert.equal(report.applyDesignAccepted, true);
  assert.equal(report.decision, 'ROLLBACK_CLEANUP_APPLY_DESIGN_ACCEPTED_STOP_BEFORE_APPLY_NOT_READY');
  assert.deepEqual(report.blockerReasons, []);
  assert.equal(report.plannedActions.length, 4);
  assert.equal(report.plannedActions.every(action => action.applies === false), true);
  assert.deepEqual(report.applyGate, {
    gateId: 'CM-1085_MEMORY_WRITE_ROLLBACK_CLEANUP_APPLY_DESIGN_POLICY',
    gateMode: 'design_review_only_separate_apply_approval_required',
    applyDesignAccepted: true,
    cleanupApplyAuthorized: false,
    rollbackApplyAuthorized: false,
    applyExecuted: false,
    cleanupApplyRunsAllowed: 0,
    rollbackApplyRunsAllowed: 0,
    destructiveActionAllowed: false,
    runtimeValidationRequiredBeforeApply: true,
    operatorReceiptRequiredBeforeApply: true,
    postApplyVerificationRequired: true,
    nextAllowedAction: 'request_separate_cleanup_apply_approval_packet'
  });
  assert.equal(report.safety.sourceMode, 'explicit_input_apply_design_review_only');
  assert.equal(report.safety.executesCleanup, false);
  assert.equal(report.safety.appliesRollback, false);
  assert.equal(report.safety.deletesDiary, false);
  assert.equal(report.safety.rewritesAudit, false);
  assert.equal(report.safety.expandsPublicMcp, false);
  assert.equal(report.safety.claimsReadiness, false);
});

test('CM-1085 blocks if store-backed preview is not accepted', () => {
  const report = evaluateMemoryWriteRollbackCleanupApplyDesignPolicy(createValidInput({
    storeBackedPreviewReport: createAcceptedStoreBackedPreviewReport({
      status: 'MEMORY_WRITE_ROLLBACK_CLEANUP_STORE_BACKED_DRY_RUN_PREVIEW_BLOCKED_NOT_READY',
      storeBackedDryRunPreviewAccepted: false,
      decision: 'ROLLBACK_CLEANUP_STORE_BACKED_DRY_RUN_PREVIEW_BLOCKED_AFTER_STORE_READ_NOT_READY',
      blockerReasons: ['cleanup_preview_targets_missing']
    })
  }));

  assert.equal(report.status, RESULT_STATUS_BLOCKED);
  assert.equal(report.applyDesignAccepted, false);
  assert.ok(report.blockerReasons.includes('store_backed_preview_status_must_be_accepted'));
  assert.ok(report.blockerReasons.includes('store_backed_preview_acceptance_missing'));
  assert.ok(report.blockerReasons.includes('store_backed_preview_decision_mismatch'));
  assert.ok(report.blockerReasons.includes('store_backed_preview_has_blockers'));
  assert.equal(report.applyGate.applyExecuted, false);
  assert.equal(report.applyGate.cleanupApplyRunsAllowed, 0);
});

test('CM-1085 blocks if planned actions would apply or design action ids drift', () => {
  const report = evaluateMemoryWriteRollbackCleanupApplyDesignPolicy(createValidInput({
    storeBackedPreviewReport: createAcceptedStoreBackedPreviewReport({
      plannedActions: [
        {
          action: 'delete_sqlite_shadow_record',
          store: 'sqlite_shadow_record',
          memoryId: 'process-memory-cm-1085',
          applies: true
        }
      ]
    }),
    applyDesign: createValidApplyDesign({
      plannedActionIds: ['delete_sqlite_shadow_record:sqlite_shadow_record:all']
    })
  }));

  assert.equal(report.status, RESULT_STATUS_BLOCKED);
  assert.ok(report.blockerReasons.includes('store_backed_preview_actions_must_not_apply'));
  assert.equal(report.applyGate.cleanupApplyAuthorized, false);
  assert.equal(report.applyGate.rollbackApplyAuthorized, false);
});

test('CM-1085 blocks apply approvals and cleanup rollback execution attempts', () => {
  const report = evaluateMemoryWriteRollbackCleanupApplyDesignPolicy(createValidInput({
    applyDesign: createValidApplyDesign({
      cleanupApplyApproved: true,
      rollbackApplyApproved: true,
      executesCleanup: true,
      appliesRollback: true,
      deletesDiary: true,
      rewritesAudit: true,
      expandsPublicMcp: true,
      claimsReadiness: true
    }),
    sideEffectCounters: zeroCounters({
      cleanupApplyRuns: 1,
      rollbackApplyRuns: 1,
      diaryDeleteRuns: 1,
      auditRewriteRuns: 1,
      publicMcpExpansion: 1,
      readinessClaims: 1
    })
  }));

  assert.equal(report.status, RESULT_STATUS_BLOCKED);
  assert.ok(report.blockerReasons.includes('apply_design_cleanupApplyApproved_must_be_false'));
  assert.ok(report.blockerReasons.includes('apply_design_rollbackApplyApproved_must_be_false'));
  assert.ok(report.blockerReasons.includes('apply_design_executesCleanup_must_be_false'));
  assert.ok(report.blockerReasons.includes('apply_design_appliesRollback_must_be_false'));
  assert.ok(report.blockerReasons.includes('apply_design_deletesDiary_must_be_false'));
  assert.ok(report.blockerReasons.includes('apply_design_rewritesAudit_must_be_false'));
  assert.ok(report.blockerReasons.includes('apply_design_expandsPublicMcp_must_be_false'));
  assert.ok(report.blockerReasons.includes('apply_design_claimsReadiness_must_be_false'));
  assert.ok(report.blockerReasons.includes('counter_cleanupApplyRuns_must_be_zero'));
  assert.ok(report.blockerReasons.includes('counter_rollbackApplyRuns_must_be_zero'));
  assert.ok(report.blockerReasons.includes('counter_diaryDeleteRuns_must_be_zero'));
  assert.ok(report.blockerReasons.includes('counter_auditRewriteRuns_must_be_zero'));
  assert.ok(report.blockerReasons.includes('counter_publicMcpExpansion_must_be_zero'));
  assert.ok(report.blockerReasons.includes('counter_readinessClaims_must_be_zero'));
});

test('CM-1085 requires exact mode scope memory id and action ids', () => {
  const report = evaluateMemoryWriteRollbackCleanupApplyDesignPolicy(createValidInput({
    applyDesign: createValidApplyDesign({
      designId: '',
      sourceStoreBackedPreviewTaskId: 'CM-0000',
      mode: 'cleanup_apply_now',
      scope: 'broad_cleanup',
      target: 'both',
      memoryId: 'wrong-memory-id',
      plannedActionIds: []
    })
  }));

  assert.equal(report.status, RESULT_STATUS_BLOCKED);
  assert.ok(report.blockerReasons.includes('designId_missing'));
  assert.ok(report.blockerReasons.includes('sourceStoreBackedPreviewTaskId_mismatch'));
  assert.ok(report.blockerReasons.includes('mode_must_be_cleanup_rollback_apply_design_review_only'));
  assert.ok(report.blockerReasons.includes('scope_must_be_memory_id_and_store_kind_scoped'));
  assert.ok(report.blockerReasons.includes('target_must_be_process'));
  assert.ok(report.blockerReasons.includes('memoryId_must_match_store_backed_preview'));
  assert.ok(report.blockerReasons.includes('plannedActionIds_must_match_store_backed_preview'));
});
