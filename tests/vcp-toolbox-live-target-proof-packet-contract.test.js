'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { PROFILES } = require('../src/core/VcpToolBoxFullCapabilityBridgePlan');
const {
  FORBIDDEN_FIELD_NAMES,
  PROOF_MODES,
  REQUIRED_EXECUTION_AUTHORIZATION_FIELDS,
  REQUIRED_NON_SECRET_ASSERTIONS,
  ZERO_COUNTERS,
  buildVcpToolBoxLiveTargetProofPacketContract
} = require('../src/core/VcpToolBoxLiveTargetProofPacketContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(Object.keys(ZERO_COUNTERS).map(field => [field, overrides[field] || 0]));
}

function packet(overrides = {}) {
  return {
    schemaVersion: 1,
    sourceSystem: 'VCPToolBox',
    packetId: 'CM1693-LIVE-TARGET-PROOF-PACKET-001',
    operatorIntent: 'prepare live target proof packet without executing proof',
    target: {
      kind: 'local_checkout',
      referenceName: 'operator-vcp-toolbox-checkout',
      discoverySource: 'operator_provided',
      locatorHashPresent: true,
      locatorValueIncluded: false,
      secretMaterialIncluded: false,
      configEnvRead: false,
      runtimeCalled: false,
      observedPresent: true,
      runtimeEntrypointKnown: false
    },
    proofProfile: PROFILES.TRUSTED_FULL_READ,
    proofMode: 'runtime_handshake_no_memory',
    allowedRuntimeActions: [
      'target_presence.check',
      'runtime_handshake.check'
    ],
    principalScope: {
      agentAlias: 'Codex',
      agentIdPresent: true,
      projectIdPresent: true,
      workspaceIdPresent: true,
      clientIdPresent: true,
      sessionIdPresent: true
    },
    executionAuthorization: {
      liveExecutionApproved: false,
      approvalTokenIncluded: false,
      approvalTokenValueIncluded: false,
      approvalTokenHashPresent: false
    },
    nonSecretAssertions: {
      pathValueOmitted: true,
      endpointValueOmitted: true,
      tokenValueOmitted: true,
      configEnvValueOmitted: true,
      rawMemoryValueOmitted: true,
      targetReferenceOwned: true,
      noMemoryRead: true,
      noWrite: true,
      noProviderCall: true,
      noPublicMcpExpansion: true,
      noReadinessClaim: true
    },
    validationPlan: {
      freshGitRequired: true,
      targetPacketValidationRequired: true,
      postProofReceiptRequired: true,
      noRawOutputPersistence: true,
      maxRuntimeProbeMinutes: 10,
      maxRuntimeCalls: 3
    },
    counters: zeroCounters(),
    ...overrides
  };
}

test('CM1693 accepts fixture-only live target proof packet without executing proof', () => {
  const result = buildVcpToolBoxLiveTargetProofPacketContract(packet());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_contract_only');
  assert.equal(result.packetId, 'CM1693-LIVE-TARGET-PROOF-PACKET-001');
  assert.equal(result.operatorIntent, undefined);
  assert.equal(result.operatorIntentPresent, true);
  assert.equal(result.proofProfile, PROFILES.TRUSTED_FULL_READ);
  assert.equal(result.proofMode, 'runtime_handshake_no_memory');
  assert.equal(result.sanitizedTarget.referenceName, 'operator-vcp-toolbox-checkout');
  assert.equal(result.plannedProof.executionStatus, 'planned_not_executed');
  assert.equal(result.runtimeExecutionAllowedByThisHelper, false);
  assert.equal(result.liveTargetProofExecuted, false);
});

test('CM1693 accepts trusted-full profile only as a no-execution proof plan', () => {
  const result = buildVcpToolBoxLiveTargetProofPacketContract(packet({
    proofProfile: PROFILES.TRUSTED_FULL,
    proofMode: 'entrypoint_shape_no_memory',
    allowedRuntimeActions: [
      'target_presence.check',
      'runtime_handshake.check',
      'entrypoint_shape.inspect'
    ]
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.proofProfile, PROFILES.TRUSTED_FULL);
  assert.equal(result.plannedProof.executionStatus, 'planned_not_executed');
  assert.equal(result.memoryWritten, false);
});

test('CM1693 rejects missing target authorization and validation fields', () => {
  const target = { ...packet().target };
  delete target.referenceName;
  const executionAuthorization = { ...packet().executionAuthorization };
  delete executionAuthorization.approvalTokenIncluded;
  const validationPlan = { ...packet().validationPlan };
  delete validationPlan.maxRuntimeCalls;

  const result = buildVcpToolBoxLiveTargetProofPacketContract(packet({
    target,
    executionAuthorization,
    validationPlan
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'missing_required_fields');
  assert.ok(result.missingFields.includes('target.referenceName'));
  assert.ok(result.missingFields.includes('executionAuthorization.approvalTokenIncluded'));
  assert.ok(result.missingFields.includes('validationPlan.maxRuntimeCalls'));
});

test('CM1693 rejects path endpoint approval token and raw memory fields without echoing values', () => {
  const result = buildVcpToolBoxLiveTargetProofPacketContract(packet({
    target: {
      ...packet().target,
      path: 'A:/PRIVATE/VCPToolBox',
      endpoint: 'https://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
      bearerToken: 'SECRET_TOKEN_SHOULD_NOT_ECHO',
      configEnvPath: 'A:/VCP/VCPToolBox/config.env'
    },
    approvalToken: 'APPROVAL_TOKEN_SHOULD_NOT_ECHO',
    rawDailyNoteContent: 'RAW_DAILY_NOTE_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_secret_locator_or_approval_fields');
  assert.ok(result.forbiddenFields.includes('target.path'));
  assert.ok(result.forbiddenFields.includes('target.endpoint'));
  assert.ok(result.forbiddenFields.includes('target.bearerToken'));
  assert.ok(result.forbiddenFields.includes('target.configEnvPath'));
  assert.ok(result.forbiddenFields.includes('approvalToken'));
  assert.ok(result.forbiddenFields.includes('rawDailyNoteContent'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('APPROVAL_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_DAILY_NOTE_SHOULD_NOT_ECHO'), false);
});

test('CM1693 rejects unsafe packet reference and intent values without echoing them', () => {
  const result = buildVcpToolBoxLiveTargetProofPacketContract(packet({
    packetId: 'https://PRIVATE_PACKET_SHOULD_NOT_ECHO',
    operatorIntent: 'use token SECRET_INTENT_SHOULD_NOT_ECHO',
    target: {
      ...packet().target,
      referenceName: 'A:/PRIVATE/VCPToolBox'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_live_target_proof_packet_contract');
  assert.ok(result.invalidFields.includes('packetId'));
  assert.ok(result.invalidFields.includes('operatorIntent'));
  assert.ok(result.invalidFields.includes('target.referenceName'));
  assert.equal(serialized.includes('PRIVATE_PACKET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_INTENT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE/VCPToolBox'), false);
});

test('CM1693 rejects packets that claim live execution approval or include approval material', () => {
  const result = buildVcpToolBoxLiveTargetProofPacketContract(packet({
    executionAuthorization: {
      liveExecutionApproved: true,
      approvalTokenIncluded: true,
      approvalTokenValueIncluded: true,
      approvalTokenHashPresent: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_live_target_proof_packet_contract');
  assert.ok(result.invalidFields.includes('executionAuthorization.liveExecutionApproved'));
  assert.ok(result.invalidFields.includes('executionAuthorization.approvalTokenIncluded'));
  assert.ok(result.invalidFields.includes('executionAuthorization.approvalTokenValueIncluded'));
  assert.ok(result.invalidFields.includes('executionAuthorization.approvalTokenHashPresent'));
});

test('CM1693 rejects runtime actions outside proof mode or above call limit', () => {
  const rejectedAction = buildVcpToolBoxLiveTargetProofPacketContract(packet({
    proofMode: 'target_presence_no_memory',
    allowedRuntimeActions: [
      'target_presence.check',
      'runtime_handshake.check'
    ]
  }));
  assert.equal(rejectedAction.accepted, false);
  assert.equal(rejectedAction.reasonCode, 'runtime_actions_not_allowed_by_proof_mode');
  assert.deepEqual(rejectedAction.rejectedRuntimeActions, ['runtime_handshake.check']);

  const overLimit = buildVcpToolBoxLiveTargetProofPacketContract(packet({
    validationPlan: {
      ...packet().validationPlan,
      maxRuntimeCalls: 1
    },
    allowedRuntimeActions: [
      'target_presence.check',
      'runtime_handshake.check'
    ]
  }));
  assert.equal(overLimit.accepted, false);
  assert.equal(overLimit.reasonCode, 'runtime_actions_exceed_validation_plan_limit');
  assert.ok(overLimit.invalidFields.includes('allowedRuntimeActions'));
});

test('CM1693 rejects positive execution counters', () => {
  const result = buildVcpToolBoxLiveTargetProofPacketContract(packet({
    counters: zeroCounters({
      runtimeCalls: 1,
      liveVcpToolBoxCalls: 1,
      liveTargetProofs: 1,
      memoryWrites: 1,
      readinessClaims: 1
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_positive_execution_counters');
  assert.ok(result.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(result.forbiddenCounters.includes('liveVcpToolBoxCalls'));
  assert.ok(result.forbiddenCounters.includes('liveTargetProofs'));
  assert.ok(result.forbiddenCounters.includes('memoryWrites'));
  assert.ok(result.forbiddenCounters.includes('readinessClaims'));
});

test('CM1693 locks live target proof packet vocabulary', () => {
  assert.ok(PROOF_MODES.includes('target_presence_no_memory'));
  assert.ok(PROOF_MODES.includes('runtime_handshake_no_memory'));
  assert.ok(PROOF_MODES.includes('entrypoint_shape_no_memory'));
  assert.ok(REQUIRED_EXECUTION_AUTHORIZATION_FIELDS.includes('liveExecutionApproved'));
  assert.ok(REQUIRED_EXECUTION_AUTHORIZATION_FIELDS.includes('approvalTokenValueIncluded'));
  assert.ok(REQUIRED_NON_SECRET_ASSERTIONS.includes('noMemoryRead'));
  assert.ok(REQUIRED_NON_SECRET_ASSERTIONS.includes('noReadinessClaim'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalToken'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('configEnvPath'));
});

test('CM1693 helper never performs runtime external provider memory or public MCP actions', () => {
  const result = buildVcpToolBoxLiveTargetProofPacketContract(packet());

  assert.equal(result.accepted, true);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.liveTargetProofExecuted, false);
  assert.equal(result.configEnvRead, false);
  assert.equal(result.envFileRead, false);
  assert.equal(result.secretMaterialRead, false);
  assert.equal(result.rawMemoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimAllowed, false);
  for (const value of Object.values(result.counters)) {
    assert.equal(value, 0);
  }
});
