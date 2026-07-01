'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { PROFILES } = require('../src/core/VcpToolBoxFullCapabilityBridgePlan');
const {
  EXACT_APPROVAL_TOKEN,
  FORBIDDEN_EXPANSION_FIELDS: APPROVAL_FORBIDDEN_EXPANSION_FIELDS,
  OPERATOR_DECISION: APPROVAL_OPERATOR_DECISION,
  ZERO_COUNTERS: APPROVAL_ZERO_COUNTERS
} = require('../src/core/VcpToolBoxLiveTargetProofApprovalPacketContract');
const {
  EXACT_DRAFT_TOKEN,
  FORBIDDEN_EXPANSION_FIELDS,
  FORBIDDEN_FIELD_NAMES,
  OPERATOR_DECISION,
  REQUIRED_APPROVAL_LINE_TEMPLATE_FIELDS,
  REQUIRED_CURRENT_FACTS_BINDING_FIELDS,
  REQUIRED_EXECUTION_SCOPE_FIELDS,
  REQUIRED_OUTPUT_POLICY_FIELDS,
  REQUIRED_RECEIPT_PLAN_FIELDS,
  REQUIRED_RUNTIME_BUDGET_FIELDS,
  STOP_CONDITION_FIELDS,
  ZERO_COUNTERS,
  buildVcpToolBoxLiveTargetProofExecutionApprovalDraft
} = require('../src/core/VcpToolBoxLiveTargetProofExecutionApprovalDraft');

function zeroCounters(fields, overrides = {}) {
  return Object.fromEntries(Object.keys(fields).map(field => [field, overrides[field] || 0]));
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
    counters: zeroCounters(APPROVAL_ZERO_COUNTERS),
    ...overrides
  };
}

function approvalPacket(overrides = {}) {
  return {
    schemaVersion: 1,
    sourceSystem: 'VCPToolBox',
    approvalPacketId: 'CM1694-LIVE-TARGET-PROOF-APPROVAL-001',
    exactApprovalToken: EXACT_APPROVAL_TOKEN,
    operatorDecision: APPROVAL_OPERATOR_DECISION,
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
    forbiddenExpansions: Object.fromEntries(APPROVAL_FORBIDDEN_EXPANSION_FIELDS.map(field => [field, false])),
    counters: zeroCounters(APPROVAL_ZERO_COUNTERS),
    ...overrides
  };
}

function draft(overrides = {}) {
  return {
    schemaVersion: 1,
    sourceSystem: 'VCPToolBox',
    executionApprovalDraftId: 'CM1697-LIVE-TARGET-PROOF-EXECUTION-APPROVAL-DRAFT-001',
    exactDraftToken: EXACT_DRAFT_TOKEN,
    operatorDecision: OPERATOR_DECISION,
    referencedApprovalPacket: approvalPacket(),
    executionScope: {
      approvalPacketId: 'CM1694-LIVE-TARGET-PROOF-APPROVAL-001',
      proofPacketId: 'CM1693-LIVE-TARGET-PROOF-PACKET-001',
      targetReferenceName: 'operator-vcp-toolbox-checkout',
      proofMode: 'runtime_handshake_no_memory',
      proofProfile: PROFILES.TRUSTED_FULL_READ,
      allowedRuntimeActions: [
        'target_presence.check',
        'runtime_handshake.check'
      ],
      maxRuntimeCalls: 3,
      noMemoryRead: true,
      noWrite: true,
      noProviderCall: true,
      noPublicMcpExpansion: true,
      noReadinessClaim: true
    },
    currentFactsBinding: {
      freshGitRequired: true,
      targetCommitPresent: true,
      targetCommitValueIncluded: false,
      originCommitPresent: true,
      originCommitValueIncluded: false,
      branchNamePresent: true,
      branchNameValueIncluded: false,
      worktreeStatusRequired: 'clean_before_execution'
    },
    approvalLineTemplate: {
      exactApprovalLineTemplatePresent: true,
      exactApprovalLineValueIncluded: false,
      includesTargetBindingPlaceholder: true,
      includesCommitBindingPlaceholder: true,
      includesExpiryPlaceholder: true,
      includesCallBudget: true,
      oneTimeUseOnly: true,
      humanOperatorRequired: true
    },
    runtimeBudget: {
      maxRuntimeProbeMinutes: 10,
      maxRuntimeCalls: 3,
      maxMemoryReadQueries: 0,
      maxMemoryWrites: 0,
      maxProviderCalls: 0
    },
    outputPolicy: {
      lowDisclosureOnly: true,
      rawOutputPersistenceAllowed: false,
      secretValuesAllowed: false,
      rawMemoryAllowed: false,
      pathEndpointValueAllowed: false
    },
    receiptPlan: {
      postProofReceiptRequired: true,
      includeTargetClass: true,
      includeActionCounters: true,
      includeValidationResult: true,
      includeRawOutput: false,
      includeSecretValues: false,
      includeReadinessClaim: false
    },
    stopConditions: Object.fromEntries(STOP_CONDITION_FIELDS.map(field => [field, 'stop'])),
    forbiddenExpansions: Object.fromEntries(FORBIDDEN_EXPANSION_FIELDS.map(field => [field, false])),
    counters: zeroCounters(ZERO_COUNTERS),
    ...overrides
  };
}

test('CM1697 accepts execution approval draft without granting live execution', () => {
  const result = buildVcpToolBoxLiveTargetProofExecutionApprovalDraft(draft());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_draft_only');
  assert.equal(result.executionApprovalDraftId, 'CM1697-LIVE-TARGET-PROOF-EXECUTION-APPROVAL-DRAFT-001');
  assert.equal(result.referencedApprovalPacketId, 'CM1694-LIVE-TARGET-PROOF-APPROVAL-001');
  assert.equal(result.referencedProofPacketId, 'CM1693-LIVE-TARGET-PROOF-PACKET-001');
  assert.equal(result.draftStatus, 'draft_not_approved');
  assert.equal(result.exactDraftTokenMatched, true);
  assert.equal(result.executionApprovalDraftValidForFutureUse, true);
  assert.equal(result.executionApprovalGrantedByThisHelper, false);
  assert.equal(result.exactApprovalLineIssued, false);
  assert.equal(result.liveExecutionAllowedByThisHelper, false);
});

test('CM1697 rejects missing required nested fields', () => {
  const executionScope = { ...draft().executionScope };
  delete executionScope.approvalPacketId;
  const currentFactsBinding = { ...draft().currentFactsBinding };
  delete currentFactsBinding.branchNamePresent;
  const runtimeBudget = { ...draft().runtimeBudget };
  delete runtimeBudget.maxProviderCalls;

  const result = buildVcpToolBoxLiveTargetProofExecutionApprovalDraft(draft({
    executionScope,
    currentFactsBinding,
    runtimeBudget
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'missing_required_fields');
  assert.ok(result.missingFields.includes('executionScope.approvalPacketId'));
  assert.ok(result.missingFields.includes('currentFactsBinding.branchNamePresent'));
  assert.ok(result.missingFields.includes('runtimeBudget.maxProviderCalls'));
});

test('CM1697 rejects invalid referenced approval packet without echoing private target values', () => {
  const result = buildVcpToolBoxLiveTargetProofExecutionApprovalDraft(draft({
    referencedApprovalPacket: approvalPacket({
      referencedProofPacket: proofPacket({
        target: {
          ...proofPacket().target,
          referenceName: 'A:/PRIVATE/VCPToolBox'
        }
      })
    })
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'referenced_approval_packet_rejected');
  assert.equal(result.referencedApprovalReasonCode, 'referenced_proof_packet_rejected');
  assert.ok(result.invalidFields.includes('referencedApprovalPacket'));
  assert.equal(serialized.includes('PRIVATE/VCPToolBox'), false);
});

test('CM1697 rejects unsafe draft id and draft token without echoing token value', () => {
  const result = buildVcpToolBoxLiveTargetProofExecutionApprovalDraft(draft({
    executionApprovalDraftId: 'https://PRIVATE_DRAFT_SHOULD_NOT_ECHO',
    exactDraftToken: 'PRIVATE_DRAFT_TOKEN_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_live_target_proof_execution_approval_draft');
  assert.ok(result.invalidFields.includes('executionApprovalDraftId'));
  assert.ok(result.invalidFields.includes('exactDraftToken'));
  assert.equal(result.lowDisclosureProjection.executionApprovalDraftId, null);
  assert.equal(serialized.includes('PRIVATE_DRAFT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_DRAFT_TOKEN_SHOULD_NOT_ECHO'), false);
});

test('CM1697 rejects approval line endpoint and raw fields without echoing values', () => {
  const result = buildVcpToolBoxLiveTargetProofExecutionApprovalDraft(draft({
    approvalLine: 'APPROVE PRIVATE TARGET SHOULD NOT ECHO',
    endpoint: 'https://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
    bearerToken: 'SECRET_TOKEN_SHOULD_NOT_ECHO',
    rawDailyNoteContent: 'RAW_DAILY_NOTE_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_secret_locator_approval_or_raw_fields');
  assert.ok(result.forbiddenFields.includes('approvalLine'));
  assert.ok(result.forbiddenFields.includes('endpoint'));
  assert.ok(result.forbiddenFields.includes('bearerToken'));
  assert.ok(result.forbiddenFields.includes('rawDailyNoteContent'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_DAILY_NOTE_SHOULD_NOT_ECHO'), false);
});

test('CM1697 rejects execution scope mismatch with referenced approval packet', () => {
  const result = buildVcpToolBoxLiveTargetProofExecutionApprovalDraft(draft({
    executionScope: {
      ...draft().executionScope,
      approvalPacketId: 'different-approval',
      proofPacketId: 'different-proof',
      targetReferenceName: 'different-target',
      allowedRuntimeActions: ['target_presence.check'],
      maxRuntimeCalls: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_live_target_proof_execution_approval_draft');
  assert.ok(result.invalidFields.includes('executionScope.approvalPacketId'));
  assert.ok(result.invalidFields.includes('executionScope.proofPacketId'));
  assert.ok(result.invalidFields.includes('executionScope.targetReferenceName'));
  assert.ok(result.invalidFields.includes('executionScope.allowedRuntimeActions'));
  assert.ok(result.invalidFields.includes('executionScope.maxRuntimeCalls'));
});

test('CM1697 rejects current facts value disclosure and dirty worktree policy', () => {
  const result = buildVcpToolBoxLiveTargetProofExecutionApprovalDraft(draft({
    currentFactsBinding: {
      ...draft().currentFactsBinding,
      targetCommitValueIncluded: true,
      originCommitValueIncluded: true,
      branchNameValueIncluded: true,
      worktreeStatusRequired: 'dirty_ok'
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_live_target_proof_execution_approval_draft');
  assert.ok(result.invalidFields.includes('currentFactsBinding.targetCommitValueIncluded'));
  assert.ok(result.invalidFields.includes('currentFactsBinding.originCommitValueIncluded'));
  assert.ok(result.invalidFields.includes('currentFactsBinding.branchNameValueIncluded'));
  assert.ok(result.invalidFields.includes('currentFactsBinding.worktreeStatusRequired'));
});

test('CM1697 rejects stale approval line template controls', () => {
  const result = buildVcpToolBoxLiveTargetProofExecutionApprovalDraft(draft({
    approvalLineTemplate: {
      ...draft().approvalLineTemplate,
      exactApprovalLineValueIncluded: true,
      includesCommitBindingPlaceholder: false,
      includesExpiryPlaceholder: false,
      oneTimeUseOnly: false,
      humanOperatorRequired: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_live_target_proof_execution_approval_draft');
  assert.ok(result.invalidFields.includes('approvalLineTemplate.exactApprovalLineValueIncluded'));
  assert.ok(result.invalidFields.includes('approvalLineTemplate.includesCommitBindingPlaceholder'));
  assert.ok(result.invalidFields.includes('approvalLineTemplate.includesExpiryPlaceholder'));
  assert.ok(result.invalidFields.includes('approvalLineTemplate.oneTimeUseOnly'));
  assert.ok(result.invalidFields.includes('approvalLineTemplate.humanOperatorRequired'));
});

test('CM1697 rejects runtime budget expansion to memory write provider or too many calls', () => {
  const result = buildVcpToolBoxLiveTargetProofExecutionApprovalDraft(draft({
    runtimeBudget: {
      ...draft().runtimeBudget,
      maxRuntimeProbeMinutes: 11,
      maxRuntimeCalls: 4,
      maxMemoryReadQueries: 1,
      maxMemoryWrites: 1,
      maxProviderCalls: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_live_target_proof_execution_approval_draft');
  assert.ok(result.invalidFields.includes('runtimeBudget.maxRuntimeProbeMinutes'));
  assert.ok(result.invalidFields.includes('runtimeBudget.maxRuntimeCalls'));
  assert.ok(result.invalidFields.includes('runtimeBudget.maxMemoryReadQueries'));
  assert.ok(result.invalidFields.includes('runtimeBudget.maxMemoryWrites'));
  assert.ok(result.invalidFields.includes('runtimeBudget.maxProviderCalls'));
});

test('CM1697 rejects output and receipt policies that persist raw secret or readiness data', () => {
  const result = buildVcpToolBoxLiveTargetProofExecutionApprovalDraft(draft({
    outputPolicy: {
      ...draft().outputPolicy,
      lowDisclosureOnly: false,
      rawOutputPersistenceAllowed: true,
      secretValuesAllowed: true,
      rawMemoryAllowed: true,
      pathEndpointValueAllowed: true
    },
    receiptPlan: {
      ...draft().receiptPlan,
      includeRawOutput: true,
      includeSecretValues: true,
      includeReadinessClaim: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_live_target_proof_execution_approval_draft');
  assert.ok(result.invalidFields.includes('outputPolicy.lowDisclosureOnly'));
  assert.ok(result.invalidFields.includes('outputPolicy.rawOutputPersistenceAllowed'));
  assert.ok(result.invalidFields.includes('outputPolicy.secretValuesAllowed'));
  assert.ok(result.invalidFields.includes('outputPolicy.rawMemoryAllowed'));
  assert.ok(result.invalidFields.includes('outputPolicy.pathEndpointValueAllowed'));
  assert.ok(result.invalidFields.includes('receiptPlan.includeRawOutput'));
  assert.ok(result.invalidFields.includes('receiptPlan.includeSecretValues'));
  assert.ok(result.invalidFields.includes('receiptPlan.includeReadinessClaim'));
});

test('CM1697 rejects non-stop conditions and forbidden expansion flags', () => {
  const result = buildVcpToolBoxLiveTargetProofExecutionApprovalDraft(draft({
    stopConditions: {
      ...draft().stopConditions,
      onMissingExactApproval: 'warn',
      onAnyMemoryRead: 'continue',
      onAnyProviderCall: 'ignore'
    },
    forbiddenExpansions: {
      ...draft().forbiddenExpansions,
      allowExecutionWithoutFreshApproval: true,
      allowMemoryRead: true,
      allowProviderCall: true,
      allowApprovalLineValuePersistence: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_live_target_proof_execution_approval_draft');
  assert.ok(result.invalidFields.includes('stopConditions.onMissingExactApproval'));
  assert.ok(result.invalidFields.includes('stopConditions.onAnyMemoryRead'));
  assert.ok(result.invalidFields.includes('stopConditions.onAnyProviderCall'));
  assert.ok(result.invalidFields.includes('forbiddenExpansions.allowExecutionWithoutFreshApproval'));
  assert.ok(result.invalidFields.includes('forbiddenExpansions.allowMemoryRead'));
  assert.ok(result.invalidFields.includes('forbiddenExpansions.allowProviderCall'));
  assert.ok(result.invalidFields.includes('forbiddenExpansions.allowApprovalLineValuePersistence'));
});

test('CM1697 rejects positive execution or approval counters', () => {
  const result = buildVcpToolBoxLiveTargetProofExecutionApprovalDraft(draft({
    counters: zeroCounters(ZERO_COUNTERS, {
      runtimeCalls: 1,
      liveVcpToolBoxCalls: 1,
      liveTargetProofs: 1,
      memoryReads: 1,
      approvalLinesIssued: 1,
      executionApprovalsGranted: 1
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_positive_execution_or_approval_counters');
  assert.ok(result.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(result.forbiddenCounters.includes('liveVcpToolBoxCalls'));
  assert.ok(result.forbiddenCounters.includes('liveTargetProofs'));
  assert.ok(result.forbiddenCounters.includes('memoryReads'));
  assert.ok(result.forbiddenCounters.includes('approvalLinesIssued'));
  assert.ok(result.forbiddenCounters.includes('executionApprovalsGranted'));
});

test('CM1697 locks execution approval draft vocabulary', () => {
  assert.ok(EXACT_DRAFT_TOKEN.includes('CM1697'));
  assert.equal(OPERATOR_DECISION, 'draft_execution_approval_packet_only_no_execution');
  assert.ok(REQUIRED_EXECUTION_SCOPE_FIELDS.includes('allowedRuntimeActions'));
  assert.ok(REQUIRED_CURRENT_FACTS_BINDING_FIELDS.includes('branchNameValueIncluded'));
  assert.ok(REQUIRED_APPROVAL_LINE_TEMPLATE_FIELDS.includes('exactApprovalLineValueIncluded'));
  assert.ok(REQUIRED_RUNTIME_BUDGET_FIELDS.includes('maxMemoryReadQueries'));
  assert.ok(REQUIRED_OUTPUT_POLICY_FIELDS.includes('rawMemoryAllowed'));
  assert.ok(REQUIRED_RECEIPT_PLAN_FIELDS.includes('includeReadinessClaim'));
  assert.ok(STOP_CONDITION_FIELDS.includes('onAnyProviderCall'));
  assert.ok(FORBIDDEN_EXPANSION_FIELDS.includes('allowApprovalLineValuePersistence'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('exactApprovalLine'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('targetCommit'));
});

test('CM1697 helper never performs runtime external provider memory public MCP or approval issuance actions', () => {
  const result = buildVcpToolBoxLiveTargetProofExecutionApprovalDraft(draft());

  assert.equal(result.accepted, true);
  assert.equal(result.executionApprovalGrantedByThisHelper, false);
  assert.equal(result.exactApprovalLineIssued, false);
  assert.equal(result.liveExecutionAllowedByThisHelper, false);
  assert.equal(result.runtimeExecutionAllowedByThisHelper, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.liveTargetProofExecuted, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.configEnvRead, false);
  assert.equal(result.envFileRead, false);
  assert.equal(result.rawMemoryRead, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimAllowed, false);
  for (const value of Object.values(result.counters)) {
    assert.equal(value, 0);
  }
});
