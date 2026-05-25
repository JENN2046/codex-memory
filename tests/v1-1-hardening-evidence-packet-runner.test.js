const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  SEALED_V1_0_RC_COMMIT,
  evaluateV11HardeningValidationAggregator
} = require('../src/core/V11HardeningValidationAggregator');
const {
  REQUIRED_MODE,
  REQUIRED_SLICE_REPORTS,
  REQUIRED_SOURCE_MODE,
  REQUIRED_ZERO_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED,
  TASK_ID,
  buildV11HardeningEvidencePacket
} = require('../src/core/V11HardeningEvidencePacketRunner');

const HEAD_COMMIT = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const OBSERVED_AT = '2026-05-25T10:00:00.000Z';
const AS_OF = '2026-05-25T11:00:00.000Z';

function zeroCounters(overrides = {}) {
  return {
    ...Object.fromEntries(REQUIRED_ZERO_COUNTER_KEYS.map(key => [key, 0])),
    ...overrides
  };
}

function evidenceEnvelope(report, overrides = {}) {
  return {
    observedAt: OBSERVED_AT,
    sealedRcCommit: SEALED_V1_0_RC_COMMIT,
    headCommit: HEAD_COMMIT,
    report,
    ...overrides
  };
}

function acceptedSliceReports(overrides = {}) {
  const reports = {
    cm1081_proof_memory_tombstone_design: evidenceEnvelope({
      taskId: 'CM-1081_PROOF_MEMORY_RETENTION_TOMBSTONE_DESIGN',
      status: 'PROOF_MEMORY_RETENTION_TOMBSTONE_DESIGN_PREVIEW_PASSED_NOT_IMPLEMENTED',
      accepted: true,
      blockedReasons: [],
      plannedActions: [
        {
          action: 'tombstone_internal_proof_memory',
          applies: false
        }
      ],
      safety: {
        mutatesRealMemory: false,
        tombstonesRealProofRecords: false,
        cleanupApplyExecuted: false,
        rollbackApplyExecuted: false,
        automaticWorkerStarted: false,
        publicMcpExpanded: false,
        providerApiCalled: false,
        trueRecordMemoryCalled: false,
        trueSearchMemoryCalled: false,
        rawMemoryRead: false,
        rawJsonlRead: false,
        rawAuditRead: false,
        readinessClaimed: false,
        reliabilityClaimed: false
      }
    }),
    cm1082_proof_memory_tombstone_store_backed_dry_run_preview: evidenceEnvelope({
      taskId: 'CM-1082_PROOF_MEMORY_RETENTION_TOMBSTONE_STORE_BACKED_DRY_RUN_PREVIEW',
      status: 'PROOF_MEMORY_RETENTION_TOMBSTONE_STORE_BACKED_DRY_RUN_PREVIEW_ACCEPTED_NOT_APPLIED_NOT_READY',
      storeBackedDryRunPreviewAccepted: true,
      blockerReasons: [],
      plannedActions: [
        {
          action: 'tombstone_internal_proof_memory',
          applies: false
        }
      ],
      applyGate: {
        applyAuthorized: false,
        applyExecuted: false,
        tombstoneApplyRunsAllowed: 0,
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
    cm1083_reconcile_retry_backoff_durable_persistence_preview: evidenceEnvelope({
      taskId: 'CM-1083_MEMORY_WRITE_RECONCILE_RETRY_BACKOFF_DURABLE_PERSISTENCE_PREVIEW',
      status: 'previewed_not_applied',
      accepted: true,
      blockerReasons: [],
      durablePersistencePreviewed: true,
      plannedUpdate: {
        applies: false
      },
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
    cm1084_startup_reconcile_worker_safety: evidenceEnvelope({
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
    cm1085_cleanup_rollback_apply_design_policy: evidenceEnvelope({
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
      sideEffectCounters: zeroCounters({
      }),
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
    }),
    cm1086_v1_1_validation_aggregator_full_implementation: evidenceEnvelope({
      taskId: 'CM-1086_V1_1_VALIDATION_AGGREGATOR_FULL_IMPLEMENTATION',
      status: 'V1_1_VALIDATION_AGGREGATOR_CURRENT_HEAD_EVIDENCE_ACCEPTED_NOT_READY',
      accepted: true,
      validationAggregatorFullImplementationAccepted: true,
      blockerReasons: [],
      readinessClaimed: false,
      reliabilityClaimed: false,
      rcReady: false,
      releaseReady: false,
      deployReady: false,
      safety: {
        callsProviders: false,
        callsRecordMemory: false,
        callsSearchMemory: false,
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
    }),
    cm1087_governance_runtime_approval_audit_loop: evidenceEnvelope({
      taskId: 'CM-1087_GOVERNANCE_RUNTIME_APPROVAL_AUDIT_LOOP',
      status: 'GOVERNANCE_RUNTIME_APPROVAL_AUDIT_LOOP_ACCEPTED_NOT_EXECUTED_NOT_READY',
      accepted: true,
      runtimeApprovalAuditLoopAccepted: true,
      blockerReasons: [],
      executionGate: {
        governedActionExecutionAuthorized: false,
        governedActionExecuted: false,
        durableAuditWriteAuthorized: false,
        durableAuditWritten: false,
        durableMemoryWriteAuthorized: false,
        durableMemoryWritten: false
      },
      sideEffectCounters: {
        providerCalls: 0,
        apiCalls: 0,
        trueRecordMemoryCalls: 0,
        trueSearchMemoryCalls: 0,
        realMemoryReads: 0,
        rawJsonlReads: 0,
        rawAuditReads: 0,
        durableMemoryWrites: 0,
        durableAuditWrites: 0,
        governedActionExecutions: 0,
        cleanupApplyRuns: 0,
        rollbackApplyRuns: 0,
        publicMcpExpansions: 0,
        configWatchdogStartupChanges: 0,
        dependencyActions: 0,
        readinessClaims: 0,
        reliabilityClaims: 0
      },
      safety: {
        callsProviders: false,
        callsRecordMemory: false,
        callsSearchMemory: false,
        readsRealMemory: false,
        readsRawAudit: false,
        writesDurableMemory: false,
        writesDurableAudit: false,
        executesGovernedAction: false,
        expandsPublicMcp: false,
        changesConfigWatchdogStartup: false,
        changesDependencies: false,
        pushes: false,
        tagsReleasesDeploys: false,
        readinessClaimed: false,
        reliabilityClaimed: false
      }
    }),
    cm1088_v1_1_hardening_staged_local_closeout: evidenceEnvelope({
      taskId: 'CM-1088_V1_1_HARDENING_STAGED_LOCAL_CLOSEOUT',
      status: 'V1_1_HARDENING_STAGED_LOCAL_CLOSEOUT_ACCEPTED_NOT_RELEASED_NOT_READY',
      accepted: true,
      blockerReasons: [],
      stagedLocalImplementationComplete: true,
      v1_1WorkRemainsLocalAndStaged: true,
      readinessClaimed: false,
      reliabilityClaimed: false,
      rcReady: false,
      releaseReady: false,
      deployReady: false,
      commitCreated: false,
      pushPerformed: false,
      ciTriggered: false,
      safety: {
        callsProviders: false,
        callsRecordMemory: false,
        callsSearchMemory: false,
        writesDurableMemory: false,
        writesDurableAudit: false,
        executesCleanup: false,
        appliesRollback: false,
        expandsPublicMcp: false,
        changesConfigWatchdogStartup: false,
        changesDependencies: false,
        pushes: false,
        tagsReleasesDeploys: false
      }
    })
  };
  return {
    ...reports,
    ...overrides
  };
}

function acceptedInput(overrides = {}) {
  return {
    mode: REQUIRED_MODE,
    sourceMode: REQUIRED_SOURCE_MODE,
    packetId: 'CM-1089-PACKET-001',
    generatedAt: OBSERVED_AT,
    asOf: AS_OF,
    sealedRcCommit: SEALED_V1_0_RC_COMMIT,
    currentHeadCommit: HEAD_COMMIT,
    expectedCurrentHeadCommit: HEAD_COMMIT,
    sideEffectCounters: zeroCounters(),
    sliceReportsById: acceptedSliceReports(),
    ...overrides
  };
}

test('CM1089 builds a sanitized current-head evidence packet for CM1086 ingestion', () => {
  const packet = buildV11HardeningEvidencePacket(acceptedInput());

  assert.equal(packet.taskId, TASK_ID);
  assert.equal(packet.status, RESULT_STATUS_ACCEPTED);
  assert.equal(packet.accepted, true);
  assert.equal(packet.evidencePacketAccepted, true);
  assert.equal(packet.baselineBinding.sealedV1RcPreserved, true);
  assert.equal(packet.baselineBinding.exactCurrentHeadBound, true);
  assert.equal(packet.sliceEvidence.requiredSliceCount, REQUIRED_SLICE_REPORTS.length);
  assert.equal(packet.sliceEvidence.acceptedSliceCount, REQUIRED_SLICE_REPORTS.length);
  assert.equal(packet.validationAggregatorInput.claimsReadiness, false);
  assert.equal(packet.validationAggregatorInput.claimsReliability, false);
  assert.equal(packet.validationAggregatorInput.publicMcpExpansion, false);
  assert.deepEqual(
    Object.keys(packet.validationAggregatorInput.evidenceById).sort(),
    [
      'cm1082_proof_memory_tombstone_store_backed_dry_run_preview',
      'cm1083_reconcile_retry_backoff_durable_persistence_preview',
      'cm1084_startup_reconcile_worker_safety',
      'cm1085_cleanup_rollback_apply_design_policy',
      'cm1087_governance_runtime_approval_audit_loop'
    ].sort()
  );
  assert.equal(packet.safety.callsProviders, false);
  assert.equal(packet.safety.callsRecordMemory, false);
  assert.equal(packet.safety.callsSearchMemory, false);
  assert.equal(packet.readinessClaimed, false);
  assert.equal(packet.reliabilityClaimed, false);

  const aggregatorReport = evaluateV11HardeningValidationAggregator(
    packet.validationAggregatorInput
  );
  assert.equal(aggregatorReport.accepted, true);
  assert.deepEqual(aggregatorReport.evidenceMatrix.requiredFutureGapIds, []);
});

test('CM1089 fails closed for stale, missing, or current-head mismatched slice evidence', () => {
  const stale = buildV11HardeningEvidencePacket(acceptedInput({
    sliceReportsById: acceptedSliceReports({
      cm1083_reconcile_retry_backoff_durable_persistence_preview: evidenceEnvelope({
        ...acceptedSliceReports().cm1083_reconcile_retry_backoff_durable_persistence_preview.report
      }, {
        observedAt: '2026-05-01T00:00:00.000Z'
      })
    })
  }));
  const missing = buildV11HardeningEvidencePacket(acceptedInput({
    sliceReportsById: {
      ...acceptedSliceReports(),
      cm1087_governance_runtime_approval_audit_loop: undefined
    }
  }));
  const wrongHead = buildV11HardeningEvidencePacket(acceptedInput({
    sliceReportsById: acceptedSliceReports({
      cm1084_startup_reconcile_worker_safety: {
        ...acceptedSliceReports().cm1084_startup_reconcile_worker_safety,
        headCommit: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
      }
    })
  }));

  assert.equal(stale.accepted, false);
  assert.ok(stale.blockerReasons.includes(
    'cm1083_reconcile_retry_backoff_durable_persistence_preview:evidence_stale'
  ));
  assert.equal(missing.accepted, false);
  assert.ok(missing.blockerReasons.includes(
    'cm1087_governance_runtime_approval_audit_loop:report_required'
  ));
  assert.equal(wrongHead.accepted, false);
  assert.ok(wrongHead.blockerReasons.includes(
    'cm1084_startup_reconcile_worker_safety:current_head_commit_mismatch'
  ));
});

test('CM1089 rejects nested side effects and packet-level counter drift', () => {
  const packet = buildV11HardeningEvidencePacket(acceptedInput({
    sideEffectCounters: zeroCounters({
      providerCalls: 1
    }),
    sliceReportsById: acceptedSliceReports({
      cm1082_proof_memory_tombstone_store_backed_dry_run_preview: evidenceEnvelope({
        ...acceptedSliceReports().cm1082_proof_memory_tombstone_store_backed_dry_run_preview.report,
        plannedActions: [
          {
            action: 'tombstone_internal_proof_memory',
            applies: true
          }
        ]
      })
    })
  }));

  assert.equal(packet.accepted, false);
  assert.ok(packet.blockerReasons.includes('counter_providerCalls_must_be_zero'));
  assert.ok(packet.blockerReasons.includes(
    'cm1082_proof_memory_tombstone_store_backed_dry_run_preview:nested_forbidden_side_effect_claim'
  ));
  assert.equal(packet.readinessClaimed, false);
  assert.equal(packet.reliabilityClaimed, false);
});

test('CM1089 rejects malformed nested counters and alternate blocker fields', () => {
  const packet = buildV11HardeningEvidencePacket(acceptedInput({
    sliceReportsById: acceptedSliceReports({
      cm1085_cleanup_rollback_apply_design_policy: evidenceEnvelope({
        ...acceptedSliceReports().cm1085_cleanup_rollback_apply_design_policy.report,
        blockedReasons: ['operator_review_failed'],
        sideEffectCounters: {
          providerCalls: '1'
        }
      })
    })
  }));

  assert.equal(packet.accepted, false);
  assert.ok(packet.blockerReasons.includes(
    'cm1085_cleanup_rollback_apply_design_policy:report_has_blockers'
  ));
  assert.ok(packet.blockerReasons.includes(
    'cm1085_cleanup_rollback_apply_design_policy:nested_side_effect_counter_nonzero'
  ));
});

test('CM1089 rejects mode, source, sealed RC, readiness, and sensitive fragments', () => {
  const packet = buildV11HardeningEvidencePacket(acceptedInput({
    mode: 'execute',
    sourceMode: 'raw_runtime_store',
    sealedRcCommit: 'cccccccccccccccccccccccccccccccccccccccc',
    claimsReadiness: true,
    sliceReportsById: acceptedSliceReports({
      cm1087_governance_runtime_approval_audit_loop: evidenceEnvelope({
        ...acceptedSliceReports().cm1087_governance_runtime_approval_audit_loop.report,
        note: 'authorization: should be rejected'
      })
    })
  }));

  assert.equal(packet.accepted, false);
  assert.ok(packet.blockerReasons.includes(
    'mode_must_be_v1_1_evidence_packet_runner_review_only'
  ));
  assert.ok(packet.blockerReasons.includes(
    'source_mode_must_be_explicit_sanitized_local_reports_only'
  ));
  assert.ok(packet.blockerReasons.includes('sealed_v1_0_rc_commit_mismatch'));
  assert.ok(packet.blockerReasons.includes('readiness_or_reliability_overclaim'));
  assert.ok(packet.blockerReasons.includes(
    'cm1087_governance_runtime_approval_audit_loop:sensitive_fragment_rejected'
  ));
  assert.equal(packet.rcReady, false);
  assert.equal(packet.releaseReady, false);
  assert.equal(packet.deployReady, false);
});
