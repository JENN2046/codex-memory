const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  SEALED_V1_0_RC_COMMIT
} = require('../src/core/V11HardeningValidationAggregator');
const {
  REQUIRED_ACTION_ID,
  REQUIRED_TARGET_TOOL
} = require('../src/core/V11WriteGovernancePreflight');
const {
  RESULT_STATUS_ACCEPTED: RECEIPT_PREVIEW_STATUS_ACCEPTED,
  TASK_ID: RECEIPT_PREVIEW_TASK_ID
} = require('../src/core/V11WriteGovernanceOperatorReceiptAuditPreview');
const {
  REQUIRED_MODE,
  REQUIRED_PLAN_FAMILY,
  REQUIRED_SOURCE_MODE,
  REQUIRED_VALIDATION_COMMANDS,
  REQUIRED_VERIFICATION_STEPS,
  REQUIRED_ZERO_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED,
  TASK_ID,
  buildV11WriteGovernancePostWriteVerificationPlan
} = require('../src/core/V11WriteGovernancePostWriteVerificationPlan');

const HEAD_COMMIT = '764c7e5e5fb435ca8396448544e6646da933a8b4';
const PAYLOAD_HASH = 'c'.repeat(64);
const AS_OF = '2026-05-25T12:20:00.000Z';
const EXPIRES_AT = '2026-05-25T13:20:00.000Z';

function targetScope(overrides = {}) {
  return {
    projectRef: 'codex-memory',
    workspaceRef: 'A:/codex-memory',
    clientRef: 'codex',
    agentRef: 'codex-local',
    taskRef: 'CM-1093',
    visibility: 'process',
    ...overrides
  };
}

function snakeTargetScope(overrides = {}) {
  return {
    projectRef: '   ',
    project_id: 'codex-memory',
    workspaceRef: '',
    workspace_id: 'A:/codex-memory',
    clientRef: ' ',
    client_id: 'codex',
    agentRef: '',
    agent_id: 'codex-local',
    taskRef: '',
    task_id: 'CM-1093',
    visibility: '',
    visibility_policy: 'process',
    ...overrides
  };
}

function zeroCounters(overrides = {}) {
  return {
    ...Object.fromEntries(REQUIRED_ZERO_COUNTER_KEYS.map(key => [key, 0])),
    ...overrides
  };
}

function acceptedReceiptPreview(overrides = {}) {
  return {
    taskId: RECEIPT_PREVIEW_TASK_ID,
    status: RECEIPT_PREVIEW_STATUS_ACCEPTED,
    accepted: true,
    operatorReceiptAuditPreviewAccepted: true,
    operatorReceiptPreviewBuilt: true,
    approvalAuditPreviewBuilt: true,
    receiptPreviewExact: true,
    packetId: 'CM-1092-PREVIEW-001',
    blockerReasons: [],
    executionStarted: false,
    recordMemoryExecuted: false,
    durableMemoryWritten: false,
    durableAuditWritten: false,
    approvalAuditWritten: false,
    operatorReceiptWritten: false,
    postWriteVerificationExecuted: false,
    baselineBinding: {
      sealedRcCommit: SEALED_V1_0_RC_COMMIT,
      currentHeadCommit: HEAD_COMMIT,
      expectedCurrentHeadCommit: HEAD_COMMIT,
      sealedV1RcPreserved: true,
      exactCurrentHeadBound: true
    },
    approvedAction: {
      actionId: REQUIRED_ACTION_ID,
      targetTool: REQUIRED_TARGET_TOOL,
      targetScope: targetScope(),
      payloadHash: PAYLOAD_HASH,
      maxRecordMemoryCalls: 1
    },
    sideEffectCounters: zeroCounters(),
    safety: {
      callsRecordMemory: false,
      callsSearchMemory: false,
      callsProviders: false,
      writesOperatorReceipt: false,
      writesApprovalAudit: false,
      writesDurableAudit: false
    },
    ...overrides
  };
}

function exactVerificationPlan(overrides = {}) {
  return {
    planFamily: REQUIRED_PLAN_FAMILY,
    planId: 'CM-1093-POST-WRITE-VERIFY-PLAN-001',
    actionId: REQUIRED_ACTION_ID,
    targetTool: REQUIRED_TARGET_TOOL,
    sealedRcCommit: SEALED_V1_0_RC_COMMIT,
    currentHeadCommit: HEAD_COMMIT,
    receiptPreviewPacketId: 'CM-1092-PREVIEW-001',
    targetScope: targetScope(),
    payloadHash: PAYLOAD_HASH,
    maxRecordMemoryCalls: 1,
    postWriteVerificationPlanOnly: true,
    separateExecutionApprovalStillRequired: true,
    operatorReceiptCorrelationRequired: true,
    approvalAuditCorrelationRequired: true,
    storeBackedVerificationDeferredUntilAfterExactWrite: true,
    noSearchMemoryVerification: true,
    noRawContentVerification: true,
    failureHandlingRequiresStop: true,
    noAutomaticCleanupRollbackApply: true,
    verificationSteps: [...REQUIRED_VERIFICATION_STEPS],
    validationCommands: [...REQUIRED_VALIDATION_COMMANDS],
    recordMemoryExecuted: false,
    postWriteVerificationExecuted: false,
    durableMemoryWritten: false,
    durableAuditWritten: false,
    expiresAt: EXPIRES_AT,
    ...overrides
  };
}

function acceptedInput(overrides = {}) {
  return {
    mode: REQUIRED_MODE,
    sourceMode: REQUIRED_SOURCE_MODE,
    packetId: 'CM-1093-PLAN-001',
    asOf: AS_OF,
    sealedRcCommit: SEALED_V1_0_RC_COMMIT,
    currentHeadCommit: HEAD_COMMIT,
    expectedCurrentHeadCommit: HEAD_COMMIT,
    sideEffectCounters: zeroCounters(),
    receiptPreviewReport: acceptedReceiptPreview(),
    verificationPlan: exactVerificationPlan(),
    ...overrides
  };
}

test('CM1093 accepts exact post-write verification plan without executing verification or write', () => {
  const report = buildV11WriteGovernancePostWriteVerificationPlan(acceptedInput());

  assert.equal(report.taskId, TASK_ID);
  assert.equal(report.status, RESULT_STATUS_ACCEPTED);
  assert.equal(report.accepted, true);
  assert.equal(report.postWriteVerificationPlanAccepted, true);
  assert.equal(report.verificationPlanExact, true);
  assert.equal(report.verificationPlanReadyForFutureExactWriteResult, true);
  assert.equal(report.executionStarted, false);
  assert.equal(report.recordMemoryExecuted, false);
  assert.equal(report.durableMemoryWritten, false);
  assert.equal(report.durableAuditWritten, false);
  assert.equal(report.operatorReceiptWritten, false);
  assert.equal(report.approvalAuditWritten, false);
  assert.equal(report.postWriteVerificationExecuted, false);
  assert.equal(report.safety.callsRecordMemory, false);
  assert.equal(report.safety.callsSearchMemory, false);
  assert.equal(report.safety.executesPostWriteVerification, false);
  assert.equal(report.nextAllowedAction, 'discuss_whether_to_allow_one_exact_approved_record_memory_write');
  assert.deepEqual(report.blockerReasons, []);
});

test('CM1093 normalizes snake-case target scope fallbacks across receipt preview and verification plan', () => {
  const report = buildV11WriteGovernancePostWriteVerificationPlan(acceptedInput({
    receiptPreviewReport: acceptedReceiptPreview({
      approvedAction: {
        actionId: REQUIRED_ACTION_ID,
        targetTool: REQUIRED_TARGET_TOOL,
        targetScope: snakeTargetScope(),
        payloadHash: PAYLOAD_HASH,
        maxRecordMemoryCalls: 1
      }
    }),
    verificationPlan: exactVerificationPlan({
      targetScope: snakeTargetScope()
    })
  }));

  assert.equal(report.status, RESULT_STATUS_ACCEPTED);
  assert.equal(report.accepted, true);
  assert.deepEqual(report.approvedAction.targetScope, targetScope());
});

test('CM1093 fails closed when CM1092 receipt preview is stale or not accepted', () => {
  const report = buildV11WriteGovernancePostWriteVerificationPlan(acceptedInput({
    receiptPreviewReport: acceptedReceiptPreview({
      accepted: false,
      blockerReasons: ['stale'],
      baselineBinding: {
        sealedRcCommit: SEALED_V1_0_RC_COMMIT,
        currentHeadCommit: 'a'.repeat(40),
        expectedCurrentHeadCommit: 'a'.repeat(40),
        sealedV1RcPreserved: true,
        exactCurrentHeadBound: true
      }
    })
  }));

  assert.equal(report.accepted, false);
  assert.ok(report.blockerReasons.includes('receipt_preview:receipt_preview_not_accepted'));
  assert.ok(report.blockerReasons.includes('receipt_preview:receipt_preview_has_blockers'));
  assert.ok(report.blockerReasons.includes('receipt_preview:current_head_commit_mismatch'));
});

test('CM1093 requires exact receipt preview reference, scope, payload hash, and current head', () => {
  const report = buildV11WriteGovernancePostWriteVerificationPlan(acceptedInput({
    verificationPlan: exactVerificationPlan({
      receiptPreviewPacketId: 'other',
      targetScope: targetScope({ visibility: 'project' }),
      payloadHash: 'd'.repeat(64),
      currentHeadCommit: 'a'.repeat(40)
    })
  }));

  assert.equal(report.accepted, false);
  assert.ok(report.blockerReasons.includes('verification_plan:receipt_preview_packet_id_mismatch'));
  assert.ok(report.blockerReasons.includes('verification_plan:target_scope_receipt_preview_mismatch'));
  assert.ok(report.blockerReasons.includes('verification_plan:payload_hash_receipt_preview_mismatch'));
  assert.ok(report.blockerReasons.includes('verification_plan:current_head_commit_mismatch'));
});

test('CM1093 requires verification plan only, required steps, validation, and stop posture', () => {
  const report = buildV11WriteGovernancePostWriteVerificationPlan(acceptedInput({
    verificationPlan: exactVerificationPlan({
      postWriteVerificationPlanOnly: false,
      separateExecutionApprovalStillRequired: false,
      operatorReceiptCorrelationRequired: false,
      approvalAuditCorrelationRequired: false,
      storeBackedVerificationDeferredUntilAfterExactWrite: false,
      noSearchMemoryVerification: false,
      noRawContentVerification: false,
      failureHandlingRequiresStop: false,
      noAutomaticCleanupRollbackApply: false,
      verificationSteps: [],
      validationCommands: []
    })
  }));

  assert.equal(report.accepted, false);
  assert.ok(report.blockerReasons.includes('verification_plan:post_write_verification_plan_only_required'));
  assert.ok(report.blockerReasons.includes('verification_plan:separate_execution_approval_still_required'));
  assert.ok(report.blockerReasons.includes('verification_plan:operator_receipt_correlation_required'));
  assert.ok(report.blockerReasons.includes('verification_plan:approval_audit_correlation_required'));
  assert.ok(report.blockerReasons.includes('verification_plan:store_backed_verification_must_be_deferred_until_after_exact_write'));
  assert.ok(report.blockerReasons.includes('verification_plan:no_search_memory_verification_required'));
  assert.ok(report.blockerReasons.includes('verification_plan:no_raw_content_verification_required'));
  assert.ok(report.blockerReasons.includes('verification_plan:failure_handling_requires_stop'));
  assert.ok(report.blockerReasons.includes('verification_plan:no_automatic_cleanup_rollback_apply_required'));
  assert.ok(report.blockerReasons.includes('verification_plan:required_verification_steps_missing'));
  assert.ok(report.blockerReasons.includes('verification_plan:required_validation_commands_missing'));
});

test('CM1093 rejects execution, post-write verification runs, side-effect counters, and sensitive fragments', () => {
  const report = buildV11WriteGovernancePostWriteVerificationPlan(acceptedInput({
    sideEffectCounters: zeroCounters({
      postWriteVerificationRuns: 1
    }),
    verificationPlan: exactVerificationPlan({
      recordMemoryExecuted: true,
      postWriteVerificationExecuted: true,
      durableMemoryWritten: true,
      note: 'bearer should-be-rejected'
    })
  }));

  assert.equal(report.accepted, false);
  assert.ok(report.blockerReasons.includes('counter_postWriteVerificationRuns_must_be_zero'));
  assert.ok(report.blockerReasons.includes('verification_plan:record_memory_must_not_execute_in_cm1093'));
  assert.ok(report.blockerReasons.includes('verification_plan:post_write_verification_must_not_execute_in_cm1093'));
  assert.ok(report.blockerReasons.includes('verification_plan:durable_memory_must_not_be_written'));
  assert.ok(report.blockerReasons.includes('verification_plan:sensitive_fragment_rejected'));
  assert.equal(report.recordMemoryExecuted, false);
  assert.equal(report.postWriteVerificationExecuted, false);
});
