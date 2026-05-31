const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  SEALED_V1_0_RC_COMMIT
} = require('../src/core/V11HardeningValidationAggregator');
const {
  REQUIRED_ACTION_ID,
  REQUIRED_TARGET_TOOL,
  RESULT_STATUS_ACCEPTED: PREFLIGHT_STATUS_ACCEPTED,
  TASK_ID: PREFLIGHT_TASK_ID
} = require('../src/core/V11WriteGovernancePreflight');
const {
  REQUIRED_APPROVAL_FAMILY,
  REQUIRED_MODE,
  REQUIRED_SOURCE_MODE,
  REQUIRED_VALIDATION_COMMANDS,
  REQUIRED_ZERO_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED,
  TASK_ID,
  buildV11WriteGovernanceApprovalPacketBoundary
} = require('../src/core/V11WriteGovernanceApprovalPacketBoundary');

const HEAD_COMMIT = '764c7e5e5fb435ca8396448544e6646da933a8b4';
const PAYLOAD_HASH = 'c'.repeat(64);
const AS_OF = '2026-05-25T12:00:00.000Z';
const EXPIRES_AT = '2026-05-25T13:00:00.000Z';

function targetScope(overrides = {}) {
  return {
    projectRef: 'codex-memory',
    workspaceRef: 'A:/codex-memory',
    clientRef: 'codex',
    agentRef: 'codex-local',
    taskRef: 'CM-1091',
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
    task_id: 'CM-1091',
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

function acceptedPreflight(overrides = {}) {
  return {
    taskId: PREFLIGHT_TASK_ID,
    status: PREFLIGHT_STATUS_ACCEPTED,
    accepted: true,
    writeGovernancePreflightAccepted: true,
    blockerReasons: [],
    recordMemoryExecuted: false,
    durableMemoryWritten: false,
    durableAuditWritten: false,
    baselineBinding: {
      sealedRcCommit: SEALED_V1_0_RC_COMMIT,
      currentHeadCommit: HEAD_COMMIT,
      expectedCurrentHeadCommit: HEAD_COMMIT,
      sealedV1RcPreserved: true,
      exactCurrentHeadBound: true
    },
    targetScope: targetScope(),
    approvalPacketTemplate: {
      payloadHash: PAYLOAD_HASH,
      targetScope: targetScope(),
      executionApproved: false,
      recordMemoryExecutionAuthorized: false,
      recordMemoryExecuted: false,
      durableMemoryWritten: false,
      durableAuditWritten: false
    },
    sideEffectCounters: zeroCounters(),
    safety: {
      callsProviders: false,
      callsRecordMemory: false,
      callsSearchMemory: false,
      readsRawMemory: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      expandsPublicMcp: false,
      changesConfigWatchdogStartup: false,
      changesDependencies: false
    },
    ...overrides
  };
}

function exactApprovalPacket(overrides = {}) {
  return {
    approvalFamily: REQUIRED_APPROVAL_FAMILY,
    approvalPacketId: 'CM-1091-APPROVAL-PACKET-001',
    actionId: REQUIRED_ACTION_ID,
    targetTool: REQUIRED_TARGET_TOOL,
    sealedRcCommit: SEALED_V1_0_RC_COMMIT,
    currentHeadCommit: HEAD_COMMIT,
    targetScope: targetScope(),
    payloadHash: PAYLOAD_HASH,
    maxRecordMemoryCalls: 1,
    exactActionNamed: true,
    exactScopeNamed: true,
    exactPayloadHashNamed: true,
    exactCurrentHeadNamed: true,
    executionApproved: true,
    recordMemoryExecutionAuthorized: true,
    recordMemoryExecuted: false,
    durableMemoryWritten: false,
    durableAuditWritten: false,
    operatorReceiptRequiredBeforeExecution: true,
    runtimeValidationRequiredBeforeExecution: true,
    postWriteVerificationRequired: true,
    validationCommands: [...REQUIRED_VALIDATION_COMMANDS],
    rollbackCleanupPosture: {
      noAutomaticCleanupApply: true,
      noAutomaticRollbackApply: true,
      operatorApprovalRequiredForApply: true,
      diaryAndAuditRetentionRequired: true
    },
    blanketApproval: false,
    implicitApproval: false,
    wildcardScopeAllowed: false,
    payloadSubstitutionAllowed: false,
    reuseAcrossHeadsAllowed: false,
    expiresAt: EXPIRES_AT,
    ...overrides
  };
}

function acceptedInput(overrides = {}) {
  return {
    mode: REQUIRED_MODE,
    sourceMode: REQUIRED_SOURCE_MODE,
    packetId: 'CM-1091-BOUNDARY-001',
    asOf: AS_OF,
    sealedRcCommit: SEALED_V1_0_RC_COMMIT,
    currentHeadCommit: HEAD_COMMIT,
    expectedCurrentHeadCommit: HEAD_COMMIT,
    sideEffectCounters: zeroCounters(),
    preflightReport: acceptedPreflight(),
    approvalPacket: exactApprovalPacket(),
    ...overrides
  };
}

test('CM1091 accepts exact approval packet boundary without executing record_memory', () => {
  const report = buildV11WriteGovernanceApprovalPacketBoundary(acceptedInput());

  assert.equal(report.taskId, TASK_ID);
  assert.equal(report.status, RESULT_STATUS_ACCEPTED);
  assert.equal(report.accepted, true);
  assert.equal(report.approvalPacketBoundaryAccepted, true);
  assert.equal(report.approvalPacketExact, true);
  assert.equal(report.executionApprovedByPacket, true);
  assert.equal(report.executionStarted, false);
  assert.equal(report.recordMemoryStarted, false);
  assert.equal(report.recordMemoryExecuted, false);
  assert.equal(report.durableMemoryWritten, false);
  assert.equal(report.durableAuditWritten, false);
  assert.equal(report.operatorReceiptWritten, false);
  assert.equal(report.postWriteVerificationExecuted, false);
  assert.equal(report.nextRequiredSurfaces.operatorReceiptAuditPreview, true);
  assert.equal(report.nextRequiredSurfaces.postWriteVerificationPlan, true);
  assert.equal(report.nextRequiredSurfaces.separateExecutionStepStillRequired, true);
  assert.equal(report.safety.callsRecordMemory, false);
  assert.equal(report.safety.callsSearchMemory, false);
  assert.equal(report.safety.callsProviders, false);
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.reliabilityClaimed, false);
  assert.deepEqual(report.blockerReasons, []);
});

test('CM1091 normalizes snake-case target scope fallbacks across preflight and approval packet', () => {
  const report = buildV11WriteGovernanceApprovalPacketBoundary(acceptedInput({
    preflightReport: acceptedPreflight({
      targetScope: snakeTargetScope(),
      approvalPacketTemplate: {
        payloadHash: PAYLOAD_HASH,
        targetScope: snakeTargetScope(),
        executionApproved: false,
        recordMemoryExecutionAuthorized: false,
        recordMemoryExecuted: false,
        durableMemoryWritten: false,
        durableAuditWritten: false
      }
    }),
    approvalPacket: exactApprovalPacket({
      targetScope: snakeTargetScope()
    })
  }));

  assert.equal(report.status, RESULT_STATUS_ACCEPTED);
  assert.equal(report.accepted, true);
  assert.deepEqual(report.approvedAction.targetScope, targetScope());
});

test('CM1091 fails closed for blanket or implicit approval shortcuts', () => {
  const report = buildV11WriteGovernanceApprovalPacketBoundary(acceptedInput({
    approvalPacket: exactApprovalPacket({
      blanketApproval: true,
      implicitApproval: true,
      wildcardScopeAllowed: true,
      payloadSubstitutionAllowed: true
    })
  }));

  assert.equal(report.accepted, false);
  assert.ok(report.blockerReasons.includes(
    'approval_packet:blanket_or_implicit_approval_rejected'
  ));
  assert.equal(report.recordMemoryExecuted, false);
});

test('CM1091 fails closed for stale head, payload substitution, and scope drift', () => {
  const report = buildV11WriteGovernanceApprovalPacketBoundary(acceptedInput({
    approvalPacket: exactApprovalPacket({
      currentHeadCommit: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      payloadHash: 'd'.repeat(64),
      targetScope: targetScope({
        visibility: 'project'
      })
    })
  }));

  assert.equal(report.accepted, false);
  assert.ok(report.blockerReasons.includes('approval_packet:current_head_commit_mismatch'));
  assert.ok(report.blockerReasons.includes('approval_packet:payload_hash_preflight_mismatch'));
  assert.ok(report.blockerReasons.includes('approval_packet:target_scope_preflight_mismatch'));
});

test('CM1091 requires validation commands, receipt, runtime validation, verification, and rollback posture', () => {
  const report = buildV11WriteGovernanceApprovalPacketBoundary(acceptedInput({
    approvalPacket: exactApprovalPacket({
      validationCommands: [],
      operatorReceiptRequiredBeforeExecution: false,
      runtimeValidationRequiredBeforeExecution: false,
      postWriteVerificationRequired: false,
      rollbackCleanupPosture: {
        noAutomaticCleanupApply: true
      }
    })
  }));

  assert.equal(report.accepted, false);
  assert.ok(report.blockerReasons.includes('approval_packet:required_validation_commands_missing'));
  assert.ok(report.blockerReasons.includes('approval_packet:operator_receipt_required_before_execution'));
  assert.ok(report.blockerReasons.includes('approval_packet:runtime_validation_required_before_execution'));
  assert.ok(report.blockerReasons.includes('approval_packet:post_write_verification_required'));
  assert.ok(report.blockerReasons.includes('approval_packet:rollback_cleanup_posture_incomplete'));
});

test('CM1091 rejects execution, durable write, side-effect counters, and sensitive fragments', () => {
  const report = buildV11WriteGovernanceApprovalPacketBoundary(acceptedInput({
    sideEffectCounters: zeroCounters({
      recordMemoryExecutions: 1
    }),
    approvalPacket: exactApprovalPacket({
      recordMemoryExecuted: true,
      durableMemoryWritten: true,
      note: 'authorization: should be rejected'
    })
  }));

  assert.equal(report.accepted, false);
  assert.ok(report.blockerReasons.includes('counter_recordMemoryExecutions_must_be_zero'));
  assert.ok(report.blockerReasons.includes('approval_packet:record_memory_must_not_execute_in_cm1091'));
  assert.ok(report.blockerReasons.includes('approval_packet:durable_memory_must_not_be_written'));
  assert.ok(report.blockerReasons.includes('approval_packet:sensitive_fragment_rejected'));
  assert.equal(report.recordMemoryExecuted, false);
  assert.equal(report.durableMemoryWritten, false);
});

test('CM1091 fails closed when CM1090 preflight is rejected or overclaims', () => {
  const report = buildV11WriteGovernanceApprovalPacketBoundary(acceptedInput({
    preflightReport: acceptedPreflight({
      accepted: false,
      blockerReasons: ['preflight_failed'],
      recordMemoryExecuted: true
    })
  }));

  assert.equal(report.accepted, false);
  assert.ok(report.blockerReasons.includes('preflight:preflight_not_accepted'));
  assert.ok(report.blockerReasons.includes('preflight:preflight_has_blockers'));
  assert.ok(report.blockerReasons.includes('preflight:preflight_execution_or_durable_write_claim'));
});
