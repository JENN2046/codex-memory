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
  RESULT_STATUS_ACCEPTED: APPROVAL_BOUNDARY_STATUS_ACCEPTED,
  TASK_ID: APPROVAL_BOUNDARY_TASK_ID
} = require('../src/core/V11WriteGovernanceApprovalPacketBoundary');
const {
  REQUIRED_MODE,
  REQUIRED_RECEIPT_FAMILY,
  REQUIRED_SOURCE_MODE,
  REQUIRED_VALIDATION_COMMANDS,
  REQUIRED_ZERO_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED,
  TASK_ID,
  buildV11WriteGovernanceOperatorReceiptAuditPreview
} = require('../src/core/V11WriteGovernanceOperatorReceiptAuditPreview');

const HEAD_COMMIT = '764c7e5e5fb435ca8396448544e6646da933a8b4';
const PAYLOAD_HASH = 'c'.repeat(64);
const AS_OF = '2026-05-25T12:10:00.000Z';
const EXPIRES_AT = '2026-05-25T13:10:00.000Z';

function targetScope(overrides = {}) {
  return {
    projectRef: 'codex-memory',
    workspaceRef: 'A:/codex-memory',
    clientRef: 'codex',
    agentRef: 'codex-local',
    taskRef: 'CM-1092',
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
    task_id: 'CM-1092',
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

function acceptedApprovalBoundary(overrides = {}) {
  return {
    taskId: APPROVAL_BOUNDARY_TASK_ID,
    status: APPROVAL_BOUNDARY_STATUS_ACCEPTED,
    accepted: true,
    approvalPacketBoundaryAccepted: true,
    approvalPacketExact: true,
    executionApprovedByPacket: true,
    packetId: 'CM-1091-BOUNDARY-001',
    blockerReasons: [],
    executionStarted: false,
    recordMemoryExecuted: false,
    durableMemoryWritten: false,
    durableAuditWritten: false,
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
      readsRawMemory: false,
      writesDurableMemory: false,
      writesDurableAudit: false
    },
    ...overrides
  };
}

function exactReceiptPreview(overrides = {}) {
  return {
    receiptFamily: REQUIRED_RECEIPT_FAMILY,
    receiptId: 'CM-1092-RECEIPT-PREVIEW-001',
    actionId: REQUIRED_ACTION_ID,
    targetTool: REQUIRED_TARGET_TOOL,
    sealedRcCommit: SEALED_V1_0_RC_COMMIT,
    currentHeadCommit: HEAD_COMMIT,
    approvalBoundaryPacketId: 'CM-1091-BOUNDARY-001',
    targetScope: targetScope(),
    payloadHash: PAYLOAD_HASH,
    maxRecordMemoryCalls: 1,
    receiptPreviewOnly: true,
    auditPreviewOnly: true,
    operatorReceiptPrepared: true,
    approvalAuditPreviewPrepared: true,
    receiptContainsExactApprovalReference: true,
    exactTargetScopeNamed: true,
    exactPayloadHashNamed: true,
    exactCurrentHeadNamed: true,
    noRawContentIncluded: true,
    sanitizedSummaryOnly: true,
    runtimeValidationRequiredBeforeExecution: true,
    postWriteVerificationRequired: true,
    recordMemoryExecutionAuthorized: true,
    recordMemoryExecuted: false,
    operatorReceiptWritten: false,
    approvalAuditWritten: false,
    durableAuditWritten: false,
    validationCommands: [...REQUIRED_VALIDATION_COMMANDS],
    rollbackCleanupPosture: {
      noAutomaticCleanupApply: true,
      noAutomaticRollbackApply: true,
      operatorApprovalRequiredForApply: true,
      diaryAndAuditRetentionRequired: true
    },
    expiresAt: EXPIRES_AT,
    ...overrides
  };
}

function acceptedInput(overrides = {}) {
  return {
    mode: REQUIRED_MODE,
    sourceMode: REQUIRED_SOURCE_MODE,
    packetId: 'CM-1092-PREVIEW-001',
    asOf: AS_OF,
    sealedRcCommit: SEALED_V1_0_RC_COMMIT,
    currentHeadCommit: HEAD_COMMIT,
    expectedCurrentHeadCommit: HEAD_COMMIT,
    sideEffectCounters: zeroCounters(),
    approvalBoundaryReport: acceptedApprovalBoundary(),
    receiptAuditPreview: exactReceiptPreview(),
    ...overrides
  };
}

test('CM1092 accepts exact operator receipt and audit preview without writing receipt or audit', () => {
  const report = buildV11WriteGovernanceOperatorReceiptAuditPreview(acceptedInput());

  assert.equal(report.taskId, TASK_ID);
  assert.equal(report.status, RESULT_STATUS_ACCEPTED);
  assert.equal(report.accepted, true);
  assert.equal(report.operatorReceiptAuditPreviewAccepted, true);
  assert.equal(report.operatorReceiptPreviewBuilt, true);
  assert.equal(report.approvalAuditPreviewBuilt, true);
  assert.equal(report.receiptPreviewExact, true);
  assert.equal(report.executionStarted, false);
  assert.equal(report.recordMemoryExecuted, false);
  assert.equal(report.operatorReceiptWritten, false);
  assert.equal(report.approvalAuditWritten, false);
  assert.equal(report.durableAuditWritten, false);
  assert.equal(report.postWriteVerificationExecuted, false);
  assert.equal(report.nextRequiredSurfaces.postWriteVerificationPlan, true);
  assert.equal(report.nextRequiredSurfaces.separateExecutionStepStillRequired, true);
  assert.equal(report.safety.callsRecordMemory, false);
  assert.equal(report.safety.writesOperatorReceipt, false);
  assert.equal(report.safety.writesApprovalAudit, false);
  assert.deepEqual(report.blockerReasons, []);
});

test('CM1092 normalizes snake-case target scope fallbacks across approval boundary and receipt preview', () => {
  const report = buildV11WriteGovernanceOperatorReceiptAuditPreview(acceptedInput({
    approvalBoundaryReport: acceptedApprovalBoundary({
      approvedAction: {
        actionId: REQUIRED_ACTION_ID,
        targetTool: REQUIRED_TARGET_TOOL,
        targetScope: snakeTargetScope(),
        payloadHash: PAYLOAD_HASH,
        maxRecordMemoryCalls: 1
      }
    }),
    receiptPreview: exactReceiptPreview({
      targetScope: snakeTargetScope()
    })
  }));

  assert.equal(report.status, RESULT_STATUS_ACCEPTED);
  assert.equal(report.accepted, true);
  assert.deepEqual(report.approvedAction.targetScope, targetScope());
});

test('CM1092 fails closed when CM1091 approval boundary is stale or not accepted', () => {
  const report = buildV11WriteGovernanceOperatorReceiptAuditPreview(acceptedInput({
    approvalBoundaryReport: acceptedApprovalBoundary({
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
  assert.ok(report.blockerReasons.includes('approval_boundary:approval_boundary_not_accepted'));
  assert.ok(report.blockerReasons.includes('approval_boundary:approval_boundary_has_blockers'));
  assert.ok(report.blockerReasons.includes('approval_boundary:current_head_commit_mismatch'));
});

test('CM1092 requires exact receipt reference, scope, payload hash, and current head', () => {
  const report = buildV11WriteGovernanceOperatorReceiptAuditPreview(acceptedInput({
    receiptAuditPreview: exactReceiptPreview({
      approvalBoundaryPacketId: 'other',
      targetScope: targetScope({ visibility: 'project' }),
      payloadHash: 'd'.repeat(64),
      currentHeadCommit: 'a'.repeat(40)
    })
  }));

  assert.equal(report.accepted, false);
  assert.ok(report.blockerReasons.includes('receipt_preview:approval_boundary_packet_id_mismatch'));
  assert.ok(report.blockerReasons.includes('receipt_preview:target_scope_approval_boundary_mismatch'));
  assert.ok(report.blockerReasons.includes('receipt_preview:payload_hash_approval_boundary_mismatch'));
  assert.ok(report.blockerReasons.includes('receipt_preview:current_head_commit_mismatch'));
});

test('CM1092 requires receipt preview only, audit preview only, validation, and rollback posture', () => {
  const report = buildV11WriteGovernanceOperatorReceiptAuditPreview(acceptedInput({
    receiptAuditPreview: exactReceiptPreview({
      receiptPreviewOnly: false,
      auditPreviewOnly: false,
      operatorReceiptPrepared: false,
      approvalAuditPreviewPrepared: false,
      validationCommands: [],
      rollbackCleanupPosture: {
        noAutomaticCleanupApply: true
      }
    })
  }));

  assert.equal(report.accepted, false);
  assert.ok(report.blockerReasons.includes('receipt_preview:receipt_preview_only_required'));
  assert.ok(report.blockerReasons.includes('receipt_preview:audit_preview_only_required'));
  assert.ok(report.blockerReasons.includes('receipt_preview:operator_receipt_prepared_required'));
  assert.ok(report.blockerReasons.includes('receipt_preview:approval_audit_preview_prepared_required'));
  assert.ok(report.blockerReasons.includes('receipt_preview:required_validation_commands_missing'));
  assert.ok(report.blockerReasons.includes('receipt_preview:rollback_cleanup_posture_incomplete'));
});

test('CM1092 rejects execution, receipt/audit writes, side-effect counters, and sensitive fragments', () => {
  const report = buildV11WriteGovernanceOperatorReceiptAuditPreview(acceptedInput({
    sideEffectCounters: zeroCounters({
      operatorReceiptWrites: 1
    }),
    receiptAuditPreview: exactReceiptPreview({
      recordMemoryExecuted: true,
      operatorReceiptWritten: true,
      approvalAuditWritten: true,
      note: 'token=should-be-rejected'
    })
  }));

  assert.equal(report.accepted, false);
  assert.ok(report.blockerReasons.includes('counter_operatorReceiptWrites_must_be_zero'));
  assert.ok(report.blockerReasons.includes('receipt_preview:record_memory_must_not_execute_in_cm1092'));
  assert.ok(report.blockerReasons.includes('receipt_preview:operator_receipt_must_not_be_written'));
  assert.ok(report.blockerReasons.includes('receipt_preview:approval_audit_must_not_be_written'));
  assert.ok(report.blockerReasons.includes('receipt_preview:sensitive_fragment_rejected'));
  assert.equal(report.operatorReceiptWritten, false);
  assert.equal(report.approvalAuditWritten, false);
});
