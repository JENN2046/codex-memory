const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  SEALED_V1_0_RC_COMMIT,
  TASK_ID: V11_VALIDATION_AGGREGATOR_TASK_ID
} = require('../src/core/V11HardeningValidationAggregator');
const {
  REQUIRED_FALSE_LOCAL_STATE_FLAGS,
  REQUIRED_SLICE_IDS,
  RESULT_STATUS_ACCEPTED,
  TASK_ID,
  evaluateV11HardeningStagedCloseout
} = require('../src/core/V11HardeningStagedCloseout');

const HEAD_COMMIT = '5555555555555555555555555555555555555555';

function localState(overrides = {}) {
  return {
    ...Object.fromEntries(REQUIRED_FALSE_LOCAL_STATE_FLAGS.map(flag => [flag, false])),
    ...overrides
  };
}

function validationAggregatorReport(overrides = {}) {
  return {
    taskId: V11_VALIDATION_AGGREGATOR_TASK_ID,
    accepted: true,
    sealedV1RcPreserved: true,
    readinessClaimed: false,
    reliabilityClaimed: false,
    rcReady: false,
    releaseReady: false,
    deployReady: false,
    baselineBinding: {
      sealedRcCommit: SEALED_V1_0_RC_COMMIT,
      currentHeadCommit: HEAD_COMMIT,
      expectedCurrentHeadCommit: HEAD_COMMIT,
      exactCurrentHeadBound: true,
      staleEvidenceRejectionImplemented: true,
      staleEvidenceRejected: false
    },
    evidenceMatrix: {
      requiredCurrentSliceCount: 4,
      acceptedCurrentSliceCount: 4,
      missingEvidenceIds: [],
      staleEvidenceIds: [],
      rejectedEvidenceIds: [],
      governanceRuntimeApprovalAuditLoopAccepted: true,
      governanceRuntimeApprovalAuditLoopEvidence: {
        id: 'cm1087_governance_runtime_approval_audit_loop',
        accepted: true,
        blockers: []
      },
      requiredFutureGapIds: [],
      records: [
        { id: 'cm1082_proof_memory_tombstone_store_backed_dry_run_preview', accepted: true },
        { id: 'cm1083_reconcile_retry_backoff_durable_persistence_preview', accepted: true },
        { id: 'cm1084_startup_reconcile_worker_safety', accepted: true },
        { id: 'cm1085_cleanup_rollback_apply_design_policy', accepted: true }
      ]
    },
    ...overrides
  };
}

function acceptedInput(overrides = {}) {
  return {
    mode: 'v1_1_hardening_staged_local_closeout_review_only',
    sealedRcCommit: SEALED_V1_0_RC_COMMIT,
    currentHeadCommit: HEAD_COMMIT,
    validationAggregatorReport: validationAggregatorReport(),
    localState: localState(),
    ...overrides
  };
}

test('CM1088 accepts staged local v1.1 closeout without release or readiness claim', () => {
  const report = evaluateV11HardeningStagedCloseout(acceptedInput());

  assert.equal(report.taskId, TASK_ID);
  assert.equal(report.status, RESULT_STATUS_ACCEPTED);
  assert.equal(report.accepted, true);
  assert.deepEqual(report.requiredSliceIds, REQUIRED_SLICE_IDS);
  assert.equal(report.stagedLocalImplementationComplete, true);
  assert.equal(report.v1_1WorkRemainsLocalAndStaged, true);
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.reliabilityClaimed, false);
  assert.equal(report.rcReady, false);
  assert.equal(report.releaseReady, false);
  assert.equal(report.deployReady, false);
  assert.equal(report.commitCreated, false);
  assert.equal(report.pushPerformed, false);
  assert.equal(report.ciTriggered, false);
  assert.equal(report.safety.callsProviders, false);
  assert.equal(report.safety.callsRecordMemory, false);
  assert.equal(report.safety.callsSearchMemory, false);
  assert.equal(report.safety.writesDurableAudit, false);
});

test('CM1088 fails closed when v1.0 RC seal or current-head binding is missing', () => {
  const wrongSeal = evaluateV11HardeningStagedCloseout(
    acceptedInput({
      sealedRcCommit: '6666666666666666666666666666666666666666'
    })
  );
  const missingHead = evaluateV11HardeningStagedCloseout(
    acceptedInput({
      currentHeadCommit: ''
    })
  );
  const unboundAggregator = evaluateV11HardeningStagedCloseout(
    acceptedInput({
      validationAggregatorReport: validationAggregatorReport({
        baselineBinding: {
          sealedRcCommit: SEALED_V1_0_RC_COMMIT,
          currentHeadCommit: HEAD_COMMIT,
          expectedCurrentHeadCommit: '7777777777777777777777777777777777777777',
          exactCurrentHeadBound: false
        }
      })
    })
  );

  assert.equal(wrongSeal.accepted, false);
  assert.equal(wrongSeal.blockerReasons.includes('sealed_v1_0_rc_commit_mismatch'), true);
  assert.equal(missingHead.accepted, false);
  assert.equal(missingHead.blockerReasons.includes('current_head_commit_required'), true);
  assert.equal(unboundAggregator.accepted, false);
  assert.equal(unboundAggregator.blockerReasons.includes('current_head_not_exactly_bound'), true);
});

test('CM1088 fails closed when CM1087 evidence or future gap closure is missing', () => {
  const report = evaluateV11HardeningStagedCloseout(
    acceptedInput({
      validationAggregatorReport: validationAggregatorReport({
        evidenceMatrix: {
          ...validationAggregatorReport().evidenceMatrix,
          governanceRuntimeApprovalAuditLoopAccepted: false,
          governanceRuntimeApprovalAuditLoopEvidence: null,
          requiredFutureGapIds: ['cm1087_governance_runtime_approval_audit_loop']
        }
      })
    })
  );

  assert.equal(report.accepted, false);
  assert.equal(
    report.blockerReasons.includes('governance_runtime_approval_audit_loop_not_accepted'),
    true
  );
  assert.equal(
    report.blockerReasons.includes('future_gap_ids_must_be_empty_after_cm1087'),
    true
  );
  assert.equal(
    report.blockerReasons.includes('cm1087_governance_evidence_missing_or_unaccepted'),
    true
  );
});

test('CM1088 fails closed when aggregator record count conflicts with rejected slice records', () => {
  const report = evaluateV11HardeningStagedCloseout(
    acceptedInput({
      validationAggregatorReport: validationAggregatorReport({
        evidenceMatrix: {
          ...validationAggregatorReport().evidenceMatrix,
          acceptedCurrentSliceCount: 4,
          records: [
            {
              id: 'cm1082_proof_memory_tombstone_store_backed_dry_run_preview',
              accepted: false,
              blockers: ['synthetic_rejection']
            },
            { id: 'cm1083_reconcile_retry_backoff_durable_persistence_preview', accepted: true },
            { id: 'cm1084_startup_reconcile_worker_safety', accepted: true },
            { id: 'cm1085_cleanup_rollback_apply_design_policy', accepted: true }
          ]
        }
      })
    })
  );

  assert.equal(report.accepted, false);
  assert.equal(
    report.blockerReasons.includes(
      'slice_cm1082_proof_memory_tombstone_store_backed_dry_run_preview_not_accepted'
    ),
    true
  );
  assert.equal(
    report.blockerReasons.includes(
      'slice_cm1082_proof_memory_tombstone_store_backed_dry_run_preview_has_blockers'
    ),
    true
  );
});

test('CM1088 fails closed for commit push CI release deploy or reliability overclaim', () => {
  const report = evaluateV11HardeningStagedCloseout(
    acceptedInput({
      localState: localState({
        commitCreated: true,
        pushPerformed: true,
        ciTriggered: true,
        releaseCreated: true,
        deployPerformed: true,
        reliabilityClaimed: true
      })
    })
  );

  assert.equal(report.accepted, false);
  assert.equal(report.blockerReasons.includes('local_state_commitCreated_must_be_false'), true);
  assert.equal(report.blockerReasons.includes('local_state_pushPerformed_must_be_false'), true);
  assert.equal(report.blockerReasons.includes('local_state_ciTriggered_must_be_false'), true);
  assert.equal(report.blockerReasons.includes('local_state_releaseCreated_must_be_false'), true);
  assert.equal(report.blockerReasons.includes('local_state_deployPerformed_must_be_false'), true);
  assert.equal(report.blockerReasons.includes('local_state_reliabilityClaimed_must_be_false'), true);
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.reliabilityClaimed, false);
});

test('CM1088 fails closed when aggregator claims readiness or release posture', () => {
  const report = evaluateV11HardeningStagedCloseout(
    acceptedInput({
      validationAggregatorReport: validationAggregatorReport({
        readinessClaimed: true,
        releaseReady: true
      })
    })
  );

  assert.equal(report.accepted, false);
  assert.equal(
    report.blockerReasons.includes('validation_aggregator_claims_readiness_or_reliability'),
    true
  );
  assert.equal(
    report.blockerReasons.includes('validation_aggregator_claims_rc_release_or_deploy_ready'),
    true
  );
  assert.equal(report.releaseReady, false);
});
