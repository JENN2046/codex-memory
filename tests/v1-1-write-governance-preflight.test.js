const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  SEALED_V1_0_RC_COMMIT
} = require('../src/core/V11HardeningValidationAggregator');
const {
  RESULT_STATUS_ACCEPTED: EVIDENCE_PACKET_STATUS_ACCEPTED,
  TASK_ID: EVIDENCE_PACKET_TASK_ID
} = require('../src/core/V11HardeningEvidencePacketRunner');
const {
  REQUIRED_ACTION_ID,
  REQUIRED_AGGREGATOR_EVIDENCE_IDS,
  REQUIRED_MODE,
  REQUIRED_SOURCE_MODE,
  REQUIRED_TARGET_TOOL,
  REQUIRED_ZERO_COUNTER_KEYS,
  RESULT_STATUS_ACCEPTED,
  TASK_ID,
  buildV11WriteGovernancePreflight
} = require('../src/core/V11WriteGovernancePreflight');

const HEAD_COMMIT = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const PAYLOAD_HASH = 'b'.repeat(64);

function zeroCounters(overrides = {}) {
  return {
    ...Object.fromEntries(REQUIRED_ZERO_COUNTER_KEYS.map(key => [key, 0])),
    ...overrides
  };
}

function acceptedEvidencePacket(overrides = {}) {
  return {
    taskId: EVIDENCE_PACKET_TASK_ID,
    status: EVIDENCE_PACKET_STATUS_ACCEPTED,
    accepted: true,
    evidencePacketAccepted: true,
    blockerReasons: [],
    baselineBinding: {
      sealedRcCommit: SEALED_V1_0_RC_COMMIT,
      currentHeadCommit: HEAD_COMMIT,
      expectedCurrentHeadCommit: HEAD_COMMIT,
      sealedV1RcPreserved: true,
      exactCurrentHeadBound: true
    },
    validationAggregatorInput: {
      claimsReadiness: false,
      claimsReliability: false,
      publicMcpExpansion: false,
      evidenceById: Object.fromEntries(REQUIRED_AGGREGATOR_EVIDENCE_IDS.map(id => [
        id,
        {
          observedAt: '2026-05-25T10:00:00.000Z',
          sealedRcCommit: SEALED_V1_0_RC_COMMIT,
          headCommit: HEAD_COMMIT,
          report: {
            taskId: id,
            blockerReasons: []
          }
        }
      ]))
    },
    safety: {
      callsProviders: false,
      callsRecordMemory: false,
      callsSearchMemory: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      expandsPublicMcp: false,
      changesConfigWatchdogStartup: false,
      changesDependencies: false,
      pushes: false,
      tagsReleasesDeploys: false
    },
    ...overrides
  };
}

function acceptedWriteRequest(overrides = {}) {
  return {
    actionId: REQUIRED_ACTION_ID,
    targetTool: REQUIRED_TARGET_TOOL,
    executionMode: 'preflight_only',
    contentIncluded: false,
    rawContentIncluded: false,
    sanitizedSummaryProvided: true,
    payloadHash: PAYLOAD_HASH,
    maxFutureRecordMemoryCalls: 1,
    approvalRequiredBeforeExecution: true,
    reviewRequiredBeforeExecution: true,
    runtimeValidationRequiredBeforeExecution: true,
    operatorReceiptRequiredBeforeExecution: true,
    recordMemoryExecutionAuthorized: false,
    recordMemoryExecuted: false,
    durableMemoryWriteAuthorized: false,
    durableMemoryWritten: false,
    durableAuditWritten: false,
    publicMcpExpansion: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    targetScope: {
      projectRef: 'codex-memory',
      workspaceRef: 'A:/codex-memory',
      clientRef: 'codex',
      agentRef: 'codex-local',
      taskRef: 'CM-1090',
      visibility: 'process'
    },
    ...overrides
  };
}

function snakeTargetScope() {
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
    task_id: 'CM-1090',
    visibility: '',
    visibility_policy: 'process'
  };
}

function acceptedInput(overrides = {}) {
  return {
    mode: REQUIRED_MODE,
    sourceMode: REQUIRED_SOURCE_MODE,
    packetId: 'CM-1090-PREFLIGHT-001',
    asOf: '2026-05-25T11:30:00.000Z',
    sealedRcCommit: SEALED_V1_0_RC_COMMIT,
    currentHeadCommit: HEAD_COMMIT,
    expectedCurrentHeadCommit: HEAD_COMMIT,
    sideEffectCounters: zeroCounters(),
    evidencePacketReport: acceptedEvidencePacket(),
    proposedWriteRequest: acceptedWriteRequest(),
    ...overrides
  };
}

test('CM1090 accepts sanitized write-governance preflight without executing record_memory', () => {
  const report = buildV11WriteGovernancePreflight(acceptedInput());

  assert.equal(report.taskId, TASK_ID);
  assert.equal(report.status, RESULT_STATUS_ACCEPTED);
  assert.equal(report.accepted, true);
  assert.equal(report.writeGovernancePreflightAccepted, true);
  assert.equal(report.executionStarted, false);
  assert.equal(report.recordMemoryStarted, false);
  assert.equal(report.recordMemoryExecuted, false);
  assert.equal(report.durableMemoryWritten, false);
  assert.equal(report.durableAuditWritten, false);
  assert.equal(report.approvalPacketTemplate.executionApproved, false);
  assert.equal(report.approvalPacketTemplate.recordMemoryExecutionAuthorized, false);
  assert.equal(report.approvalPacketTemplate.recordMemoryExecuted, false);
  assert.equal(report.approvalPacketTemplate.payloadHash, PAYLOAD_HASH);
  assert.equal(report.safety.callsRecordMemory, false);
  assert.equal(report.safety.callsSearchMemory, false);
  assert.equal(report.safety.callsProviders, false);
  assert.equal(report.safety.expandsPublicMcp, false);
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.reliabilityClaimed, false);
  assert.deepEqual(report.blockerReasons, []);
});

test('CM1090 normalizes snake-case target scope fallbacks before approval template', () => {
  const report = buildV11WriteGovernancePreflight(acceptedInput({
    proposedWriteRequest: acceptedWriteRequest({
      targetScope: snakeTargetScope()
    })
  }));

  assert.equal(report.status, RESULT_STATUS_ACCEPTED);
  assert.equal(report.accepted, true);
  assert.deepEqual(report.targetScope, {
    projectRef: 'codex-memory',
    workspaceRef: 'A:/codex-memory',
    clientRef: 'codex',
    agentRef: 'codex-local',
    taskRef: 'CM-1090',
    visibility: 'process'
  });
  assert.deepEqual(report.approvalPacketTemplate.targetScope, report.targetScope);
});

test('CM1090 fails closed when evidence packet is missing current-head or aggregator evidence', () => {
  const report = buildV11WriteGovernancePreflight(acceptedInput({
    evidencePacketReport: acceptedEvidencePacket({
      baselineBinding: {
        sealedRcCommit: SEALED_V1_0_RC_COMMIT,
        currentHeadCommit: 'cccccccccccccccccccccccccccccccccccccccc',
        expectedCurrentHeadCommit: 'cccccccccccccccccccccccccccccccccccccccc',
        sealedV1RcPreserved: true,
        exactCurrentHeadBound: true
      },
      validationAggregatorInput: {
        claimsReadiness: false,
        claimsReliability: false,
        publicMcpExpansion: false,
        evidenceById: {}
      }
    })
  }));

  assert.equal(report.accepted, false);
  assert.ok(report.blockerReasons.includes('evidence_packet:current_head_commit_mismatch'));
  assert.ok(report.blockerReasons.includes(
    'evidence_packet:validation_aggregator_input_cm1082_proof_memory_tombstone_store_backed_dry_run_preview_missing'
  ));
});

test('CM1090 fails closed for write execution, raw content, and malformed payload hash', () => {
  const report = buildV11WriteGovernancePreflight(acceptedInput({
    proposedWriteRequest: acceptedWriteRequest({
      executionMode: 'execute_now',
      contentIncluded: true,
      rawContentIncluded: true,
      payloadHash: 'not-a-sha',
      recordMemoryExecutionAuthorized: true,
      recordMemoryExecuted: true
    })
  }));

  assert.equal(report.accepted, false);
  assert.ok(report.blockerReasons.includes(
    'write_request:write_request_execution_mode_must_be_preflight_only'
  ));
  assert.ok(report.blockerReasons.includes(
    'write_request:write_request_content_must_not_be_included'
  ));
  assert.ok(report.blockerReasons.includes(
    'write_request:write_request_payload_hash_required'
  ));
  assert.ok(report.blockerReasons.includes(
    'write_request:write_request_forbidden_action_claim'
  ));
  assert.equal(report.recordMemoryExecuted, false);
  assert.equal(report.durableMemoryWritten, false);
});

test('CM1090 rejects side-effect counters, sensitive fragments, and readiness claims', () => {
  const report = buildV11WriteGovernancePreflight(acceptedInput({
    claimsReadiness: true,
    sideEffectCounters: zeroCounters({
      trueRecordMemoryCalls: 1
    }),
    proposedWriteRequest: acceptedWriteRequest({
      note: 'authorization: should be rejected'
    })
  }));

  assert.equal(report.accepted, false);
  assert.ok(report.blockerReasons.includes('readiness_or_reliability_overclaim'));
  assert.ok(report.blockerReasons.includes('counter_trueRecordMemoryCalls_must_be_zero'));
  assert.ok(report.blockerReasons.includes(
    'write_request:write_request_sensitive_fragment_rejected'
  ));
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.reliabilityClaimed, false);
});

test('CM1090 requires exact scope and keeps public MCP frozen', () => {
  const report = buildV11WriteGovernancePreflight(acceptedInput({
    proposedWriteRequest: acceptedWriteRequest({
      targetTool: 'memory_write_governed',
      publicMcpExpansion: true,
      targetScope: {
        projectRef: '',
        workspaceRef: 'A:/codex-memory',
        clientRef: 'codex',
        agentRef: 'codex-local',
        taskRef: 'CM-1090',
        visibility: ''
      }
    })
  }));

  assert.equal(report.accepted, false);
  assert.ok(report.blockerReasons.includes('write_request:write_request_target_tool_mismatch'));
  assert.ok(report.blockerReasons.includes('write_request:scope_projectRef_required'));
  assert.ok(report.blockerReasons.includes('write_request:scope_visibility_required'));
  assert.ok(report.blockerReasons.includes('write_request:write_request_forbidden_action_claim'));
  assert.equal(report.safety.expandsPublicMcp, false);
});
