const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  REQUIRED_GOVERNANCE_LOOP_EVIDENCE,
  SEALED_V1_0_RC_COMMIT,
  evaluateV11HardeningValidationAggregator
} = require('../src/core/V11HardeningValidationAggregator');
const {
  ACCEPTED_ACTION_IDS,
  REQUIRED_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED,
  TASK_ID,
  evaluateGovernanceRuntimeApprovalAuditLoop
} = require('../src/core/GovernanceRuntimeApprovalAuditLoop');

const HEAD_COMMIT = '4444444444444444444444444444444444444444';
const OBSERVED_AT = '2026-05-25T11:00:00.000Z';

function zeroCounters() {
  return Object.fromEntries(REQUIRED_COUNTER_KEYS.map(key => [key, 0]));
}

function snakeZeroCounters() {
  return {
    provider_calls: 0,
    api_calls: 0,
    true_record_memory_calls: 0,
    true_search_memory_calls: 0,
    real_memory_reads: 0,
    raw_jsonl_reads: 0,
    raw_audit_reads: 0,
    durable_memory_writes: 0,
    durable_audit_writes: 0,
    governed_action_executions: 0,
    cleanup_apply_runs: 0,
    rollback_apply_runs: 0,
    public_mcp_expansions: 0,
    config_watchdog_startup_changes: 0,
    dependency_actions: 0,
    readiness_claims: 0,
    reliability_claims: 0
  };
}

function baseScope(overrides = {}) {
  return {
    projectRef: 'codex-memory',
    workspaceRef: 'workspace-local-redacted',
    clientRef: 'codex',
    agentRef: 'codex-local',
    taskRef: 'CM-1087',
    visibility: 'internal',
    ...overrides
  };
}

function baseIdentity(overrides = {}) {
  return {
    loopId: 'cm1087-loop-001',
    actionId: 'proof_memory_tombstone_apply',
    reviewPacketId: 'cm1087-review-001',
    approvalPacketId: 'cm1087-approval-001',
    preActionAuditEventId: 'cm1087-audit-pre-001',
    decisionAuditEventId: 'cm1087-audit-decision-001',
    postActionAuditEventId: 'cm1087-audit-post-001',
    correlationId: 'cm1087-correlation-001',
    ...overrides
  };
}

function acceptedLoopInput(overrides = {}) {
  const identity = baseIdentity(overrides.identity);
  const scope = baseScope(overrides.scope);

  return {
    mode: 'governance_runtime_approval_audit_loop_review_only',
    source: 'temp_local_governance_loop_fixture',
    identity,
    scope,
    reviewPacket: {
      packetId: identity.reviewPacketId,
      loopId: identity.loopId,
      actionId: identity.actionId,
      status: 'reviewed_requires_approval',
      scope,
      reviewed: true,
      recommendsApprovalPacket: true,
      executionApproved: false,
      rawPayloadIncluded: false
    },
    approvalPacket: {
      packetId: identity.approvalPacketId,
      loopId: identity.loopId,
      actionId: identity.actionId,
      reviewPacketId: identity.reviewPacketId,
      status: 'approval_packet_valid_review_only',
      decision: 'approved_for_planning_not_execution',
      scope,
      exactActionNamed: true,
      exactScopeNamed: true,
      durableAuditIntentNamed: true,
      durableMemoryIntentNamed: true,
      executionApproved: false,
      expiresAt: '2026-06-01T00:00:00.000Z'
    },
    auditRefs: {
      preActionAuditEventId: identity.preActionAuditEventId,
      decisionAuditEventId: identity.decisionAuditEventId,
      postActionAuditEventId: identity.postActionAuditEventId,
      correlationId: identity.correlationId,
      appendOnly: true,
      redactedSummaryOnly: true,
      durableAuditWritten: false,
      rawAuditPayloadIncluded: false
    },
    requestedActions: {
      executeGovernedAction: false,
      writeDurableAudit: false,
      writeDurableMemory: false,
      readRealMemory: false,
      readRawAudit: false,
      callProvider: false,
      expandPublicMcp: false,
      changeConfigWatchdogStartup: false,
      changeDependencies: false,
      claimReadiness: false,
      claimReliability: false
    },
    sideEffectCounters: zeroCounters(),
    ...overrides,
    identity,
    scope
  };
}

function currentSliceEvidence() {
  function evidence(report) {
    return {
      observedAt: OBSERVED_AT,
      sealedRcCommit: SEALED_V1_0_RC_COMMIT,
      headCommit: HEAD_COMMIT,
      report
    };
  }

  return {
    cm1082_proof_memory_tombstone_store_backed_dry_run_preview: evidence({
      taskId: 'CM-1082_PROOF_MEMORY_RETENTION_TOMBSTONE_STORE_BACKED_DRY_RUN_PREVIEW',
      status: 'PROOF_MEMORY_RETENTION_TOMBSTONE_STORE_BACKED_DRY_RUN_PREVIEW_ACCEPTED_NOT_APPLIED_NOT_READY',
      storeBackedDryRunPreviewAccepted: true,
      blockerReasons: [],
      safety: {
        writesStores: false,
        providerApiCalled: false,
        trueRecordMemoryCalled: false,
        trueSearchMemoryCalled: false,
        rawMemoryRead: false,
        rawJsonlRead: false,
        rawAuditRead: false,
        publicMcpExpanded: false,
        readinessClaimed: false,
        reliabilityClaimed: false
      },
      applyGate: { applyAuthorized: false, applyExecuted: false }
    }),
    cm1083_reconcile_retry_backoff_durable_persistence_preview: evidence({
      taskId: 'CM-1083_MEMORY_WRITE_RECONCILE_RETRY_BACKOFF_DURABLE_PERSISTENCE_PREVIEW',
      status: 'previewed_not_applied',
      accepted: true,
      blockerReasons: [],
      durablePersistencePreviewed: true,
      applyGate: {
        applyApproved: false,
        applyExecuted: false,
        schemaMigrationApplied: false
      },
      automaticStartupWorkerEnabled: false,
      publicMcpExpansion: false,
      readinessClaimed: false,
      reliabilityClaimed: false
    }),
    cm1084_startup_reconcile_worker_safety: evidence({
      taskId: 'CM-1084_MEMORY_WRITE_RECONCILE_STARTUP_WORKER_SAFETY',
      status: 'startup_safety_review_passed_not_enabled',
      accepted: true,
      blockerReasons: [],
      startupWorkerEnabled: false,
      runtimeWorkerStarted: false,
      configChanged: false,
      watchdogChanged: false,
      publicMcpExpansion: false,
      readinessClaimed: false,
      reliabilityClaimed: false
    }),
    cm1085_cleanup_rollback_apply_design_policy: evidence({
      taskId: 'CM-1085_MEMORY_WRITE_ROLLBACK_CLEANUP_APPLY_DESIGN_POLICY',
      status: 'MEMORY_WRITE_ROLLBACK_CLEANUP_APPLY_DESIGN_ACCEPTED_NOT_APPLIED_NOT_READY',
      applyDesignAccepted: true,
      blockerReasons: [],
      sideEffectCounters: zeroCounters(),
      applyGate: {
        cleanupApplyAuthorized: false,
        rollbackApplyAuthorized: false,
        applyExecuted: false
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
        expandsPublicMcp: false,
        changesConfigWatchdogStartup: false,
        changesDependencies: false,
        claimsWriteReliable: false,
        claimsReadiness: false
      }
    })
  };
}

test('CM1087 accepts planning-only governance approval/audit loop and stops before execution', () => {
  const report = evaluateGovernanceRuntimeApprovalAuditLoop(acceptedLoopInput());

  assert.equal(report.taskId, TASK_ID);
  assert.equal(report.status, RESULT_STATUS_ACCEPTED);
  assert.equal(report.accepted, true);
  assert.equal(report.runtimeApprovalAuditLoopAccepted, true);
  assert.equal(report.executionGate.governedActionExecutionAuthorized, false);
  assert.equal(report.executionGate.governedActionExecuted, false);
  assert.equal(report.executionGate.durableAuditWritten, false);
  assert.equal(report.executionGate.durableMemoryWritten, false);
  assert.equal(report.auditPlan.entries.length, 3);
  assert.equal(report.auditPlan.durableAuditWritten, false);
  assert.equal(report.safety.callsProviders, false);
  assert.equal(report.safety.callsRecordMemory, false);
  assert.equal(report.safety.callsSearchMemory, false);
  assert.equal(report.safety.writesDurableAudit, false);
  assert.equal(report.safety.readinessClaimed, false);
  assert.equal(report.safety.reliabilityClaimed, false);
});

test('CM1087 normalizes snake-case governance loop identity scope and audit refs', () => {
  const identity = baseIdentity();
  const scope = baseScope();
  const input = acceptedLoopInput();
  const snakeScope = {
    projectRef: '   ',
    project_ref: scope.projectRef,
    workspaceRef: '   ',
    workspace_ref: scope.workspaceRef,
    clientRef: '   ',
    client_ref: scope.clientRef,
    agentRef: '   ',
    agent_ref: scope.agentRef,
    taskRef: '   ',
    task_ref: scope.taskRef,
    visibility: '   ',
    visibility_policy: scope.visibility
  };

  const report = evaluateGovernanceRuntimeApprovalAuditLoop({
    ...input,
    identity: {
      loopId: '   ',
      loop_id: identity.loopId,
      actionId: '   ',
      action_id: identity.actionId,
      reviewPacketId: '   ',
      review_packet_id: identity.reviewPacketId,
      approvalPacketId: '   ',
      approval_packet_id: identity.approvalPacketId,
      preActionAuditEventId: '   ',
      pre_action_audit_event_id: identity.preActionAuditEventId,
      decisionAuditEventId: '   ',
      decision_audit_event_id: identity.decisionAuditEventId,
      postActionAuditEventId: '   ',
      post_action_audit_event_id: identity.postActionAuditEventId,
      correlationId: '   ',
      correlation_id: identity.correlationId
    },
    scope: snakeScope,
    reviewPacket: {
      packetId: '   ',
      packet_id: identity.reviewPacketId,
      loopId: '   ',
      loop_id: identity.loopId,
      actionId: '   ',
      action_id: identity.actionId,
      status: 'reviewed_requires_approval',
      scope: snakeScope,
      reviewed: true,
      recommendsApprovalPacket: null,
      recommends_approval_packet: true,
      executionApproved: null,
      execution_approved: false,
      rawPayloadIncluded: null,
      raw_payload_included: false
    },
    approvalPacket: {
      packetId: '   ',
      packet_id: identity.approvalPacketId,
      loopId: '   ',
      loop_id: identity.loopId,
      actionId: '   ',
      action_id: identity.actionId,
      reviewPacketId: '   ',
      review_packet_id: identity.reviewPacketId,
      status: 'approval_packet_valid_review_only',
      decision: 'approved_for_planning_not_execution',
      scope: snakeScope,
      exactActionNamed: null,
      exact_action_named: true,
      exactScopeNamed: null,
      exact_scope_named: true,
      durableAuditIntentNamed: null,
      durable_audit_intent_named: true,
      durableMemoryIntentNamed: null,
      durable_memory_intent_named: true,
      executionApproved: null,
      execution_approved: false,
      expiresAt: '   ',
      expires_at: '2026-06-01T00:00:00.000Z'
    },
    auditRefs: {
      preActionAuditEventId: '   ',
      pre_action_audit_event_id: identity.preActionAuditEventId,
      decisionAuditEventId: '   ',
      decision_audit_event_id: identity.decisionAuditEventId,
      postActionAuditEventId: '   ',
      post_action_audit_event_id: identity.postActionAuditEventId,
      correlationId: '   ',
      correlation_id: identity.correlationId,
      appendOnly: null,
      append_only: true,
      redactedSummaryOnly: null,
      redacted_summary_only: true,
      durableAuditWritten: null,
      durable_audit_written: false,
      rawAuditPayloadIncluded: null,
      raw_audit_payload_included: false
    }
  });

  assert.equal(report.accepted, true);
  assert.deepEqual(report.identity, identity);
  assert.deepEqual(report.scope, scope);
  assert.equal(report.reviewPacket.packetId, identity.reviewPacketId);
  assert.equal(report.approvalPacket.packetId, identity.approvalPacketId);
  assert.equal(report.auditRefs.correlationId, identity.correlationId);
  assert.equal(report.auditRefs.appendOnly, true);
  assert.equal(report.auditRefs.durableAuditWritten, false);
});

test('CM1087 normalizes snake-case requested actions and side-effect counters', () => {
  const accepted = evaluateGovernanceRuntimeApprovalAuditLoop({
    ...acceptedLoopInput(),
    requestedActions: {
      execute_governed_action: false,
      write_durable_audit: false,
      write_durable_memory: false,
      read_real_memory: false,
      read_raw_audit: false,
      call_provider: false,
      expand_public_mcp: false,
      change_config_watchdog_startup: false,
      change_dependencies: false,
      claim_readiness: false,
      claim_reliability: false
    },
    sideEffectCounters: snakeZeroCounters()
  });

  assert.equal(accepted.accepted, true);
  assert.deepEqual(accepted.sideEffectCounters, zeroCounters());

  const blocked = evaluateGovernanceRuntimeApprovalAuditLoop({
    ...acceptedLoopInput(),
    requestedActions: {
      execute_governed_action: true,
      write_durable_audit: false,
      write_durable_memory: false,
      read_real_memory: false,
      read_raw_audit: false,
      call_provider: false,
      expand_public_mcp: false,
      change_config_watchdog_startup: false,
      change_dependencies: false,
      claim_readiness: false,
      claim_reliability: false
    },
    sideEffectCounters: {
      ...snakeZeroCounters(),
      provider_calls: 1
    }
  });

  assert.equal(blocked.accepted, false);
  assert.equal(blocked.blockerReasons.includes('requested_action_not_authorized_in_cm1087'), true);
  assert.equal(blocked.blockerReasons.includes('counter_providerCalls_must_be_zero'), true);
  assert.equal(blocked.blockerReasons.some(reason => reason.includes('provider_calls_unknown')), false);

  const blockedByDefinedSnakeAliases = evaluateGovernanceRuntimeApprovalAuditLoop({
    ...acceptedLoopInput(),
    requestedActions: {
      executeGovernedAction: null,
      execute_governed_action: true,
      write_durable_audit: false,
      write_durable_memory: false,
      read_real_memory: false,
      read_raw_audit: false,
      call_provider: false,
      expand_public_mcp: false,
      change_config_watchdog_startup: false,
      change_dependencies: false,
      claim_readiness: false,
      claim_reliability: false
    },
    sideEffectCounters: {
      ...snakeZeroCounters(),
      providerCalls: undefined,
      provider_calls: 1
    }
  });

  assert.equal(blockedByDefinedSnakeAliases.accepted, false);
  assert.equal(blockedByDefinedSnakeAliases.blockerReasons.includes('requested_action_not_authorized_in_cm1087'), true);
  assert.equal(blockedByDefinedSnakeAliases.blockerReasons.includes('counter_providerCalls_must_be_zero'), true);
  assert.equal(blockedByDefinedSnakeAliases.blockerReasons.some(reason => reason.includes('provider_calls_unknown')), false);
});

test('CM1087 supported governed action ids are exact for v1.1 hardening', () => {
  assert.deepEqual(ACCEPTED_ACTION_IDS, [
    'proof_memory_tombstone_apply',
    'reconcile_retry_backoff_persistence_apply',
    'startup_reconcile_worker_enablement',
    'cleanup_rollback_apply'
  ]);
});

test('CM1087 fails closed on identity or scope drift', () => {
  const identityDrift = evaluateGovernanceRuntimeApprovalAuditLoop(
    acceptedLoopInput({
      reviewPacket: {
        ...acceptedLoopInput().reviewPacket,
        actionId: 'cleanup_rollback_apply'
      }
    })
  );
  const scopeDrift = evaluateGovernanceRuntimeApprovalAuditLoop(
    acceptedLoopInput({
      approvalPacket: {
        ...acceptedLoopInput().approvalPacket,
        scope: baseScope({ taskRef: 'CM-OTHER' })
      }
    })
  );

  assert.equal(identityDrift.accepted, false);
  assert.equal(
    identityDrift.blockerReasons.includes('review_packet_identity_mismatch'),
    true
  );
  assert.equal(scopeDrift.accepted, false);
  assert.equal(
    scopeDrift.blockerReasons.includes('approval_packet_scope_mismatch'),
    true
  );
});

test('CM1087 fails closed on execution, durable audit, provider, and readiness attempts', () => {
  const report = evaluateGovernanceRuntimeApprovalAuditLoop(
    acceptedLoopInput({
      requestedActions: {
        executeGovernedAction: true,
        writeDurableAudit: false,
        writeDurableMemory: false,
        readRealMemory: false,
        readRawAudit: false,
        callProvider: false,
        expandPublicMcp: false,
        changeConfigWatchdogStartup: false,
        changeDependencies: false,
        claimReadiness: true,
        claimReliability: false
      },
      sideEffectCounters: {
        ...zeroCounters(),
        providerCalls: 1
      }
    })
  );

  assert.equal(report.accepted, false);
  assert.equal(
    report.blockerReasons.includes('requested_action_not_authorized_in_cm1087'),
    true
  );
  assert.equal(report.blockerReasons.includes('counter_providerCalls_must_be_zero'), true);
  assert.equal(report.safety.writesDurableAudit, false);
  assert.equal(report.safety.readinessClaimed, false);
});

test('CM1087 rejects raw audit payloads and sensitive fragments', () => {
  const report = evaluateGovernanceRuntimeApprovalAuditLoop(
    acceptedLoopInput({
      auditRefs: {
        ...acceptedLoopInput().auditRefs,
        rawAuditPayloadIncluded: true
      },
      reviewPacket: {
        ...acceptedLoopInput().reviewPacket,
        note: 'authorization: should be rejected'
      }
    })
  );

  assert.equal(report.accepted, false);
  assert.equal(report.blockerReasons.includes('sensitive_fragment_rejected'), true);
  assert.equal(
    report.blockerReasons.includes('audit_refs_must_not_write_or_expose_raw_audit'),
    true
  );
});

test('CM1087 evidence closes the v1.1 aggregator future governance gap without readiness claim', () => {
  const cm1087Report = evaluateGovernanceRuntimeApprovalAuditLoop(acceptedLoopInput());
  const evidenceById = {
    ...currentSliceEvidence(),
    [REQUIRED_GOVERNANCE_LOOP_EVIDENCE.id]: {
      observedAt: OBSERVED_AT,
      sealedRcCommit: SEALED_V1_0_RC_COMMIT,
      headCommit: HEAD_COMMIT,
      report: cm1087Report
    }
  };
  const report = evaluateV11HardeningValidationAggregator({
    asOf: '2026-05-25T12:00:00.000Z',
    sealedRcCommit: SEALED_V1_0_RC_COMMIT,
    currentHeadCommit: HEAD_COMMIT,
    expectedCurrentHeadCommit: HEAD_COMMIT,
    evidenceById
  });

  assert.equal(report.accepted, true);
  assert.equal(report.evidenceMatrix.acceptedCurrentSliceCount, 4);
  assert.equal(report.evidenceMatrix.governanceRuntimeApprovalAuditLoopAccepted, true);
  assert.deepEqual(report.evidenceMatrix.requiredFutureGapIds, []);
  assert.equal(report.v1_1HardeningComplete, false);
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.reliabilityClaimed, false);
  assert.equal(report.rcReady, false);
});
