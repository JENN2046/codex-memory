'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { PROFILES } = require('../src/core/VcpToolBoxFullCapabilityBridgePlan');
const {
  EXACT_APPROVAL_TOKEN,
  FORBIDDEN_FIELD_NAMES,
  FORBIDDEN_EXPANSION_FIELDS,
  OPERATOR_DECISION,
  REQUIRED_APPROVAL_SCOPE_FIELDS,
  REQUIRED_COMMIT_BINDING_FIELDS,
  REQUIRED_EXPIRY_FIELDS,
  ZERO_COUNTERS,
  buildVcpToolBoxLiveTargetProofApprovalPacketContract
} = require('../src/core/VcpToolBoxLiveTargetProofApprovalPacketContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(Object.keys(ZERO_COUNTERS).map(field => [field, overrides[field] || 0]));
}

function proofPacket(overrides = {}) {
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

function approvalPacket(overrides = {}) {
  return {
    schemaVersion: 1,
    sourceSystem: 'VCPToolBox',
    approvalPacketId: 'CM1694-LIVE-TARGET-PROOF-APPROVAL-001',
    exactApprovalToken: EXACT_APPROVAL_TOKEN,
    operatorDecision: OPERATOR_DECISION,
    referencedProofPacket: proofPacket(),
    approvalScope: {
      proofPacketId: 'CM1693-LIVE-TARGET-PROOF-PACKET-001',
      targetReferenceName: 'operator-vcp-toolbox-checkout',
      proofMode: 'runtime_handshake_no_memory',
      proofProfile: PROFILES.TRUSTED_FULL_READ,
      maxRuntimeCalls: 3,
      noMemoryRead: true,
      noWrite: true,
      noProviderCall: true,
      noPublicMcpExpansion: true,
      noReadinessClaim: true
    },
    commitBinding: {
      freshGitRequired: true,
      targetCommitPresent: true,
      targetCommitValueIncluded: false,
      originCommitPresent: true,
      originCommitValueIncluded: false,
      worktreeStatusRequired: 'clean_or_explicitly_scoped'
    },
    expiry: {
      expiresAtPresent: true,
      expiresAtValueIncluded: false,
      expired: false
    },
    forbiddenExpansions: Object.fromEntries(FORBIDDEN_EXPANSION_FIELDS.map(field => [field, false])),
    counters: zeroCounters(),
    ...overrides
  };
}

test('CM1694 accepts exact approval packet contract without allowing live execution', () => {
  const result = buildVcpToolBoxLiveTargetProofApprovalPacketContract(approvalPacket());

  assert.equal(result.accepted, true);
  assert.equal(result.exactApprovalTokenMatched, true);
  assert.equal(result.approvalPacketValidForFutureUse, true);
  assert.equal(result.referencedProofPacketId, 'CM1693-LIVE-TARGET-PROOF-PACKET-001');
  assert.equal(result.approvalScope.targetReferenceName, 'operator-vcp-toolbox-checkout');
  assert.equal(result.liveExecutionAllowedByThisHelper, false);
  assert.equal(result.runtimeExecutionAllowedByThisHelper, false);
  assert.equal(result.liveTargetProofExecuted, false);
});

test('CM1694 rejects missing approval scope commit binding and expiry fields', () => {
  const approvalScope = { ...approvalPacket().approvalScope };
  delete approvalScope.proofPacketId;
  const commitBinding = { ...approvalPacket().commitBinding };
  delete commitBinding.originCommitPresent;
  const expiry = { ...approvalPacket().expiry };
  delete expiry.expired;

  const result = buildVcpToolBoxLiveTargetProofApprovalPacketContract(approvalPacket({
    approvalScope,
    commitBinding,
    expiry
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'missing_required_fields');
  assert.ok(result.missingFields.includes('approvalScope.proofPacketId'));
  assert.ok(result.missingFields.includes('commitBinding.originCommitPresent'));
  assert.ok(result.missingFields.includes('expiry.expired'));
});

test('CM1694 rejects mismatched or unsafe exact approval token without echoing token value', () => {
  const result = buildVcpToolBoxLiveTargetProofApprovalPacketContract(approvalPacket({
    exactApprovalToken: 'PRIVATE_APPROVAL_TOKEN_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_live_target_proof_approval_packet_contract');
  assert.ok(result.invalidFields.includes('exactApprovalToken'));
  assert.equal(result.exactApprovalTokenMatched, false);
  assert.equal(serialized.includes('PRIVATE_APPROVAL_TOKEN_SHOULD_NOT_ECHO'), false);
});

test('CM1694 rejects unsafe approval packet id without echoing it', () => {
  const result = buildVcpToolBoxLiveTargetProofApprovalPacketContract(approvalPacket({
    approvalPacketId: 'https://PRIVATE_APPROVAL_PACKET_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_live_target_proof_approval_packet_contract');
  assert.ok(result.invalidFields.includes('approvalPacketId'));
  assert.equal(result.lowDisclosureProjection.approvalPacketId, null);
  assert.equal(serialized.includes('PRIVATE_APPROVAL_PACKET_SHOULD_NOT_ECHO'), false);
});

test('CM1694 rejects invalid referenced proof packet and reports only reason code', () => {
  const result = buildVcpToolBoxLiveTargetProofApprovalPacketContract(approvalPacket({
    referencedProofPacket: proofPacket({
      target: {
        ...proofPacket().target,
        referenceName: 'A:/PRIVATE/VCPToolBox'
      }
    })
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'referenced_proof_packet_rejected');
  assert.equal(result.proofPacketReasonCode, 'invalid_live_target_proof_packet_contract');
  assert.ok(result.invalidFields.includes('referencedProofPacket'));
  assert.equal(serialized.includes('PRIVATE/VCPToolBox'), false);
});

test('CM1695 rejects extra secret locator endpoint config and raw fields without echoing values', () => {
  const result = buildVcpToolBoxLiveTargetProofApprovalPacketContract(approvalPacket({
    endpoint: 'https://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
    bearerToken: 'SECRET_TOKEN_SHOULD_NOT_ECHO',
    configEnvPath: 'A:/VCP/VCPToolBox/config.env',
    rawDailyNoteContent: 'RAW_DAILY_NOTE_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_secret_locator_or_raw_fields');
  assert.ok(result.forbiddenFields.includes('endpoint'));
  assert.ok(result.forbiddenFields.includes('bearerToken'));
  assert.ok(result.forbiddenFields.includes('configEnvPath'));
  assert.ok(result.forbiddenFields.includes('rawDailyNoteContent'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_DAILY_NOTE_SHOULD_NOT_ECHO'), false);
});

test('CM1694 rejects approval scope that does not match referenced proof packet', () => {
  const result = buildVcpToolBoxLiveTargetProofApprovalPacketContract(approvalPacket({
    approvalScope: {
      ...approvalPacket().approvalScope,
      proofPacketId: 'different-proof-packet',
      targetReferenceName: 'different-target',
      proofMode: 'target_presence_no_memory',
      maxRuntimeCalls: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_live_target_proof_approval_packet_contract');
  assert.ok(result.invalidFields.includes('approvalScope.proofPacketId'));
  assert.ok(result.invalidFields.includes('approvalScope.targetReferenceName'));
  assert.ok(result.invalidFields.includes('approvalScope.proofMode'));
  assert.ok(result.invalidFields.includes('approvalScope.maxRuntimeCalls'));
});

test('CM1694 rejects stale expiry and commit value disclosure flags', () => {
  const result = buildVcpToolBoxLiveTargetProofApprovalPacketContract(approvalPacket({
    commitBinding: {
      ...approvalPacket().commitBinding,
      freshGitRequired: false,
      targetCommitValueIncluded: true,
      originCommitValueIncluded: true,
      worktreeStatusRequired: 'dirty_ok'
    },
    expiry: {
      expiresAtPresent: true,
      expiresAtValueIncluded: true,
      expired: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_live_target_proof_approval_packet_contract');
  assert.ok(result.invalidFields.includes('commitBinding.freshGitRequired'));
  assert.ok(result.invalidFields.includes('commitBinding.targetCommitValueIncluded'));
  assert.ok(result.invalidFields.includes('commitBinding.originCommitValueIncluded'));
  assert.ok(result.invalidFields.includes('commitBinding.worktreeStatusRequired'));
  assert.ok(result.invalidFields.includes('expiry.expiresAtValueIncluded'));
  assert.ok(result.invalidFields.includes('expiry.expired'));
});

test('CM1694 rejects forbidden expansion flags', () => {
  const result = buildVcpToolBoxLiveTargetProofApprovalPacketContract(approvalPacket({
    forbiddenExpansions: {
      ...approvalPacket().forbiddenExpansions,
      allowLiveExecution: true,
      allowRuntimeWiring: true,
      allowMemoryWrite: true,
      allowReadinessClaim: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_live_target_proof_approval_packet_contract');
  assert.ok(result.invalidFields.includes('forbiddenExpansions.allowLiveExecution'));
  assert.ok(result.invalidFields.includes('forbiddenExpansions.allowRuntimeWiring'));
  assert.ok(result.invalidFields.includes('forbiddenExpansions.allowMemoryWrite'));
  assert.ok(result.invalidFields.includes('forbiddenExpansions.allowReadinessClaim'));
});

test('CM1694 rejects positive execution counters', () => {
  const result = buildVcpToolBoxLiveTargetProofApprovalPacketContract(approvalPacket({
    counters: zeroCounters({
      runtimeCalls: 1,
      liveVcpToolBoxCalls: 1,
      liveTargetProofs: 1,
      providerApiCalls: 1,
      readinessClaims: 1
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_positive_execution_counters');
  assert.ok(result.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(result.forbiddenCounters.includes('liveVcpToolBoxCalls'));
  assert.ok(result.forbiddenCounters.includes('liveTargetProofs'));
  assert.ok(result.forbiddenCounters.includes('providerApiCalls'));
  assert.ok(result.forbiddenCounters.includes('readinessClaims'));
});

test('CM1694 locks approval packet vocabulary', () => {
  assert.ok(EXACT_APPROVAL_TOKEN.includes('CM1694'));
  assert.equal(OPERATOR_DECISION, 'approve_packet_contract_only_no_execution');
  assert.ok(REQUIRED_APPROVAL_SCOPE_FIELDS.includes('proofPacketId'));
  assert.ok(REQUIRED_COMMIT_BINDING_FIELDS.includes('targetCommitValueIncluded'));
  assert.ok(REQUIRED_EXPIRY_FIELDS.includes('expired'));
  assert.ok(FORBIDDEN_EXPANSION_FIELDS.includes('allowLiveExecution'));
  assert.ok(FORBIDDEN_EXPANSION_FIELDS.includes('allowReadinessClaim'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('endpoint'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('bearerToken'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rawDailyNoteContent'));
});

test('CM1694 helper never performs runtime external provider memory or public MCP actions', () => {
  const result = buildVcpToolBoxLiveTargetProofApprovalPacketContract(approvalPacket());

  assert.equal(result.accepted, true);
  assert.equal(result.liveExecutionAllowedByThisHelper, false);
  assert.equal(result.runtimeExecutionAllowedByThisHelper, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.liveTargetProofExecuted, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.configEnvRead, false);
  assert.equal(result.envFileRead, false);
  assert.equal(result.rawMemoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimAllowed, false);
  for (const value of Object.values(result.counters)) {
    assert.equal(value, 0);
  }
});
