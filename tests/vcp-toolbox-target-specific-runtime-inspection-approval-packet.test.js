'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { PROFILES } = require('../src/core/VcpToolBoxFullCapabilityBridgePlan');
const {
  COMPONENT_SURFACE_FIELDS,
  EXACT_PREFLIGHT_TOKEN,
  FORBIDDEN_EXPANSION_FIELDS: DISCOVERY_FORBIDDEN_EXPANSION_FIELDS,
  OPERATOR_DECISION: DISCOVERY_OPERATOR_DECISION,
  REQUIRED_DISCOVERY_QUESTION_FIELDS,
  STOP_CONDITION_FIELDS: DISCOVERY_STOP_CONDITION_FIELDS,
  ZERO_COUNTERS: DISCOVERY_ZERO_COUNTERS
} = require('../src/core/VcpToolBoxExactTargetDiscoveryPacketPreflight');
const {
  CONTRACT_MODE,
  DEFAULT_MAX_RUNTIME_CALLS,
  DEFAULT_MAX_RUNTIME_PROBE_MINUTES,
  EXACT_APPROVAL_TOKEN,
  FORBIDDEN_EXPANSION_FIELDS,
  FORBIDDEN_FIELD_NAMES,
  OPERATOR_DECISION,
  REQUIRED_APPROVAL_SCOPE_FIELDS,
  REQUIRED_CURRENT_FACTS_BINDING_FIELDS,
  REQUIRED_EXECUTION_AUTHORIZATION_FIELDS,
  REQUIRED_EXPIRY_FIELDS,
  REQUIRED_RUNTIME_BUDGET_FIELDS,
  STOP_CONDITION_FIELDS,
  ZERO_COUNTERS,
  buildVcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket
} = require('../src/core/VcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket');

function zeroCounters(fields, overrides = {}) {
  return Object.fromEntries(Object.keys(fields).map(field => [field, overrides[field] || 0]));
}

function targetReference(overrides = {}) {
  return {
    kind: 'local_checkout',
    referenceName: 'operator-vcp-toolbox-checkout',
    discoverySource: 'operator_provided',
    locatorHashPresent: true,
    locatorValueIncluded: false,
    endpointValueIncluded: false,
    secretMaterialIncluded: false,
    configEnvRead: false,
    runtimeCalled: false,
    targetSpecificInspectionApproved: false,
    ...overrides
  };
}

function discoveryPacket(overrides = {}) {
  return {
    schemaVersion: 1,
    sourceSystem: 'VCPToolBox',
    discoveryPacketId: 'CM1698-EXACT-TARGET-DISCOVERY-PACKET-001',
    exactPreflightToken: EXACT_PREFLIGHT_TOKEN,
    operatorDecision: DISCOVERY_OPERATOR_DECISION,
    operatorIntent: 'prepare exact target discovery packet without runtime inspection',
    targetReference: targetReference(),
    principalScope: {
      agentAlias: 'Codex',
      agentIdPresent: true,
      projectIdPresent: true,
      workspaceIdPresent: true,
      clientIdPresent: true,
      sessionIdPresent: true
    },
    discoveryQuestionSet: Object.fromEntries(REQUIRED_DISCOVERY_QUESTION_FIELDS.map(field => [
      field,
      field !== 'rawValuesIncluded'
    ])),
    componentSurfaceCoverage: Object.fromEntries(COMPONENT_SURFACE_FIELDS.map(field => [field, true])),
    profileBoundary: {
      requestedProfile: PROFILES.TRUSTED_FULL_READ,
      profileSelectionExplicit: true,
      observeLiteAllowed: true,
      observeFullAllowed: true,
      trustedFullReadRequiresApproval: true,
      trustedWriteProposalRequiresApproval: true,
      trustedFullRequiresApproval: true,
      rawOutputAllowed: false,
      writeAllowedByPreflight: false
    },
    executionAuthorization: {
      targetSpecificRuntimeInspectionApproved: false,
      exactApprovalLineIncluded: false,
      liveProbeApproved: false,
      memoryReadApproved: false,
      writeApproved: false,
      providerCallApproved: false,
      publicMcpExpansionApproved: false
    },
    outputPolicy: {
      lowDisclosureOnly: true,
      rawTargetValueAllowed: false,
      rawOutputPersistenceAllowed: false,
      secretValuesAllowed: false,
      rawMemoryAllowed: false,
      pathEndpointValueAllowed: false
    },
    receiptPlan: {
      postDiscoveryReceiptRequired: true,
      includeTargetClass: true,
      includeQuestionCoverage: true,
      includeComponentCoverage: true,
      includeActionCounters: true,
      includeRawOutput: false,
      includeSecretValues: false,
      includeReadinessClaim: false
    },
    stopConditions: Object.fromEntries(DISCOVERY_STOP_CONDITION_FIELDS.map(field => [field, 'stop'])),
    forbiddenExpansions: Object.fromEntries(DISCOVERY_FORBIDDEN_EXPANSION_FIELDS.map(field => [field, false])),
    counters: zeroCounters(DISCOVERY_ZERO_COUNTERS),
    ...overrides
  };
}

function approvalScope(overrides = {}) {
  return {
    discoveryPacketId: 'CM1698-EXACT-TARGET-DISCOVERY-PACKET-001',
    targetReferenceName: 'operator-vcp-toolbox-checkout',
    targetKind: 'local_checkout',
    discoverySource: 'operator_provided',
    requestedProfile: PROFILES.TRUSTED_FULL_READ,
    maxRuntimeCalls: DEFAULT_MAX_RUNTIME_CALLS,
    maxRuntimeProbeMinutes: DEFAULT_MAX_RUNTIME_PROBE_MINUTES,
    noMemoryRead: true,
    noWrite: true,
    noProviderCall: true,
    noPublicMcpExpansion: true,
    noReadinessClaim: true,
    ...overrides
  };
}

function currentFactsBinding(overrides = {}) {
  return {
    freshGitRequired: true,
    targetCommitPresent: true,
    targetCommitValueIncluded: false,
    originCommitPresent: true,
    originCommitValueIncluded: false,
    branchNamePresent: true,
    branchNameValueIncluded: false,
    worktreeStatusRequired: 'clean_before_runtime_inspection',
    ...overrides
  };
}

function expiry(overrides = {}) {
  return {
    expiresAtPresent: true,
    expiresAtValueIncluded: false,
    expired: false,
    ...overrides
  };
}

function executionAuthorization(overrides = {}) {
  return {
    targetSpecificRuntimeInspectionApproved: false,
    exactApprovalLineIncluded: false,
    exactApprovalLineIssuedByThisHelper: false,
    approvalLineConsumed: false,
    liveProbeApproved: false,
    memoryReadApproved: false,
    writeApproved: false,
    providerCallApproved: false,
    publicMcpExpansionApproved: false,
    ...overrides
  };
}

function runtimeBudget(overrides = {}) {
  return {
    maxRuntimeProbeMinutes: DEFAULT_MAX_RUNTIME_PROBE_MINUTES,
    maxRuntimeCalls: DEFAULT_MAX_RUNTIME_CALLS,
    maxMemoryReadQueries: 0,
    maxMemoryWrites: 0,
    maxProviderCalls: 0,
    ...overrides
  };
}

function outputPolicy(overrides = {}) {
  return {
    lowDisclosureOnly: true,
    rawTargetValueAllowed: false,
    rawOutputPersistenceAllowed: false,
    secretValuesAllowed: false,
    rawMemoryAllowed: false,
    pathEndpointValueAllowed: false,
    runtimeResponsePersistenceAllowed: false,
    ...overrides
  };
}

function receiptPlan(overrides = {}) {
  return {
    postInspectionReceiptRequired: true,
    includeTargetClass: true,
    includeDiscoveryPacketId: true,
    includeActionCounters: true,
    includeValidationResult: true,
    includeRawOutput: false,
    includeSecretValues: false,
    includeReadinessClaim: false,
    ...overrides
  };
}

function approvalPacket(overrides = {}) {
  return {
    schemaVersion: 1,
    sourceSystem: 'VCPToolBox',
    approvalPacketId: 'CM1699-TARGET-SPECIFIC-RUNTIME-INSPECTION-APPROVAL-001',
    exactApprovalToken: EXACT_APPROVAL_TOKEN,
    operatorDecision: OPERATOR_DECISION,
    operatorIntent: 'prepare target specific runtime inspection approval packet without execution',
    referencedDiscoveryPacket: discoveryPacket(),
    approvalScope: approvalScope(),
    currentFactsBinding: currentFactsBinding(),
    expiry: expiry(),
    executionAuthorization: executionAuthorization(),
    runtimeBudget: runtimeBudget(),
    outputPolicy: outputPolicy(),
    receiptPlan: receiptPlan(),
    stopConditions: Object.fromEntries(STOP_CONDITION_FIELDS.map(field => [field, 'stop'])),
    forbiddenExpansions: Object.fromEntries(FORBIDDEN_EXPANSION_FIELDS.map(field => [field, false])),
    counters: zeroCounters(ZERO_COUNTERS),
    ...overrides
  };
}

test('CM1699 accepts target-specific runtime inspection approval packet without granting execution', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket(approvalPacket());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, CONTRACT_MODE);
  assert.equal(result.approvalPacketId, 'CM1699-TARGET-SPECIFIC-RUNTIME-INSPECTION-APPROVAL-001');
  assert.equal(result.referencedDiscoveryPacketId, 'CM1698-EXACT-TARGET-DISCOVERY-PACKET-001');
  assert.equal(result.referencedTargetReferenceName, 'operator-vcp-toolbox-checkout');
  assert.equal(result.exactApprovalTokenMatched, true);
  assert.equal(result.approvalPacketValidForFutureUse, true);
  assert.equal(result.approvalStatus, 'packet_valid_not_approved');
  assert.equal(result.targetSpecificRuntimeInspectionApprovedByThisHelper, false);
  assert.equal(result.exactApprovalLineIssued, false);
  assert.equal(result.approvalLineConsumed, false);
  assert.equal(result.runtimeExecutionAllowedByThisHelper, false);
  assert.equal(result.targetSpecificRuntimeInspectionExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
});

test('CM1699 rejects missing required nested fields', () => {
  const incompleteScope = approvalScope();
  delete incompleteScope.discoveryPacketId;
  const incompleteFacts = currentFactsBinding();
  delete incompleteFacts.branchNamePresent;
  const incompleteBudget = runtimeBudget();
  delete incompleteBudget.maxProviderCalls;

  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket(approvalPacket({
    approvalScope: incompleteScope,
    currentFactsBinding: incompleteFacts,
    runtimeBudget: incompleteBudget
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'missing_required_fields');
  assert.ok(result.missingFields.includes('approvalScope.discoveryPacketId'));
  assert.ok(result.missingFields.includes('currentFactsBinding.branchNamePresent'));
  assert.ok(result.missingFields.includes('runtimeBudget.maxProviderCalls'));
});

test('CM1699 rejects invalid referenced discovery packet without echoing private target values', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket(approvalPacket({
    referencedDiscoveryPacket: discoveryPacket({
      targetReference: targetReference({
        referenceName: 'A:/PRIVATE/VCPToolBox'
      })
    })
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'referenced_discovery_packet_rejected');
  assert.equal(result.referencedDiscoveryReasonCode, 'invalid_exact_target_discovery_packet_preflight');
  assert.ok(result.invalidFields.includes('referencedDiscoveryPacket'));
  assert.equal(serialized.includes('PRIVATE/VCPToolBox'), false);
});

test('CM1699 rejects unsafe id source decision and operator intent without echoing private values', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket(approvalPacket({
    sourceSystem: 'SECRET_SOURCE_SHOULD_NOT_ECHO',
    approvalPacketId: 'https://PRIVATE_APPROVAL_PACKET_SHOULD_NOT_ECHO',
    operatorDecision: 'https://PRIVATE_DECISION_SHOULD_NOT_ECHO',
    operatorIntent: 'SECRET target runtime intent should not echo'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_target_specific_runtime_inspection_approval_packet');
  assert.ok(result.invalidFields.includes('sourceSystem'));
  assert.ok(result.invalidFields.includes('approvalPacketId'));
  assert.ok(result.invalidFields.includes('operatorDecision'));
  assert.ok(result.invalidFields.includes('operatorIntent'));
  assert.equal(result.lowDisclosureProjection.sourceSystem, null);
  assert.equal(result.lowDisclosureProjection.approvalPacketId, null);
  assert.equal(result.lowDisclosureProjection.operatorDecision, null);
  assert.equal(serialized.includes('SECRET_SOURCE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_APPROVAL_PACKET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_DECISION_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET target runtime intent'), false);
});

test('CM1699 rejects approval line endpoint token config and raw runtime fields without echoing values', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket(approvalPacket({
    exactApprovalLine: 'APPROVE PRIVATE LINE SHOULD NOT ECHO',
    endpoint: 'https://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
    bearerToken: 'SECRET_TOKEN_SHOULD_NOT_ECHO',
    configEnvPath: 'A:/VCP/VCPToolBox/config.env',
    rawRuntimeResponse: 'RAW_RUNTIME_RESPONSE_SHOULD_NOT_ECHO',
    rawDailyNoteContent: 'RAW_DAILY_NOTE_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_secret_locator_or_raw_fields');
  assert.ok(result.forbiddenFields.includes('exactApprovalLine'));
  assert.ok(result.forbiddenFields.includes('endpoint'));
  assert.ok(result.forbiddenFields.includes('bearerToken'));
  assert.ok(result.forbiddenFields.includes('configEnvPath'));
  assert.ok(result.forbiddenFields.includes('rawRuntimeResponse'));
  assert.ok(result.forbiddenFields.includes('rawDailyNoteContent'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_RUNTIME_RESPONSE_SHOULD_NOT_ECHO'), false);
});

test('CM1699 rejects approval scope that does not match referenced discovery packet', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket(approvalPacket({
    approvalScope: approvalScope({
      discoveryPacketId: 'CM1698-WRONG-DISCOVERY-PACKET',
      targetReferenceName: 'different-target',
      targetKind: 'mcp_server',
      discoverySource: 'service_registry',
      requestedProfile: PROFILES.TRUSTED_WRITE_PROPOSAL,
      maxRuntimeCalls: 4,
      maxRuntimeProbeMinutes: 11,
      noMemoryRead: false,
      noWrite: false,
      noProviderCall: false,
      noPublicMcpExpansion: false,
      noReadinessClaim: false
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_target_specific_runtime_inspection_approval_packet');
  for (const field of REQUIRED_APPROVAL_SCOPE_FIELDS) {
    assert.ok(result.invalidFields.includes(`approvalScope.${field}`));
  }
});

test('CM1699 rejects current facts commit branch value disclosure and dirty worktree policy', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket(approvalPacket({
    currentFactsBinding: currentFactsBinding({
      freshGitRequired: false,
      targetCommitValueIncluded: true,
      originCommitValueIncluded: true,
      branchNameValueIncluded: true,
      worktreeStatusRequired: 'dirty_allowed'
    }),
    targetCommit: 'PRIVATE_COMMIT_VALUE_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_secret_locator_or_raw_fields');
  assert.ok(result.forbiddenFields.includes('targetCommit'));
  assert.equal(serialized.includes('PRIVATE_COMMIT_VALUE_SHOULD_NOT_ECHO'), false);

  const policyOnly = buildVcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket(approvalPacket({
    currentFactsBinding: currentFactsBinding({
      freshGitRequired: false,
      targetCommitValueIncluded: true,
      originCommitValueIncluded: true,
      branchNameValueIncluded: true,
      worktreeStatusRequired: 'dirty_allowed'
    })
  }));

  assert.equal(policyOnly.accepted, false);
  assert.ok(policyOnly.invalidFields.includes('currentFactsBinding.freshGitRequired'));
  assert.ok(policyOnly.invalidFields.includes('currentFactsBinding.targetCommitValueIncluded'));
  assert.ok(policyOnly.invalidFields.includes('currentFactsBinding.originCommitValueIncluded'));
  assert.ok(policyOnly.invalidFields.includes('currentFactsBinding.branchNameValueIncluded'));
  assert.ok(policyOnly.invalidFields.includes('currentFactsBinding.worktreeStatusRequired'));
});

test('CM1699 rejects expired approval and expiry value disclosure', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket(approvalPacket({
    expiry: expiry({
      expiresAtPresent: false,
      expiresAtValueIncluded: true,
      expired: true
    }),
    expiresAt: '2026-07-02T00:00:00Z'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_secret_locator_or_raw_fields');
  assert.ok(result.forbiddenFields.includes('expiresAt'));
  assert.equal(serialized.includes('2026-07-02T00:00:00Z'), false);

  const flagsOnly = buildVcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket(approvalPacket({
    expiry: expiry({
      expiresAtPresent: false,
      expiresAtValueIncluded: true,
      expired: true
    })
  }));

  assert.equal(flagsOnly.accepted, false);
  assert.ok(flagsOnly.invalidFields.includes('expiry.expiresAtPresent'));
  assert.ok(flagsOnly.invalidFields.includes('expiry.expiresAtValueIncluded'));
  assert.ok(flagsOnly.invalidFields.includes('expiry.expired'));
});

test('CM1699 rejects execution authorization flags', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket(approvalPacket({
    executionAuthorization: executionAuthorization({
      targetSpecificRuntimeInspectionApproved: true,
      exactApprovalLineIncluded: true,
      exactApprovalLineIssuedByThisHelper: true,
      approvalLineConsumed: true,
      liveProbeApproved: true,
      memoryReadApproved: true,
      writeApproved: true,
      providerCallApproved: true,
      publicMcpExpansionApproved: true
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_target_specific_runtime_inspection_approval_packet');
  for (const field of REQUIRED_EXECUTION_AUTHORIZATION_FIELDS) {
    assert.ok(result.invalidFields.includes(`executionAuthorization.${field}`));
  }
});

test('CM1699 rejects runtime budget expansion', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket(approvalPacket({
    runtimeBudget: runtimeBudget({
      maxRuntimeProbeMinutes: 11,
      maxRuntimeCalls: 4,
      maxMemoryReadQueries: 1,
      maxMemoryWrites: 1,
      maxProviderCalls: 1
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_target_specific_runtime_inspection_approval_packet');
  for (const field of REQUIRED_RUNTIME_BUDGET_FIELDS) {
    assert.ok(result.invalidFields.includes(`runtimeBudget.${field}`));
  }
});

test('CM1699 rejects output and receipt policies that allow raw secret runtime or readiness data', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket(approvalPacket({
    outputPolicy: outputPolicy({
      lowDisclosureOnly: false,
      rawTargetValueAllowed: true,
      rawOutputPersistenceAllowed: true,
      secretValuesAllowed: true,
      rawMemoryAllowed: true,
      pathEndpointValueAllowed: true,
      runtimeResponsePersistenceAllowed: true
    }),
    receiptPlan: receiptPlan({
      includeRawOutput: true,
      includeSecretValues: true,
      includeReadinessClaim: true
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_target_specific_runtime_inspection_approval_packet');
  assert.ok(result.invalidFields.includes('outputPolicy.lowDisclosureOnly'));
  assert.ok(result.invalidFields.includes('outputPolicy.rawTargetValueAllowed'));
  assert.ok(result.invalidFields.includes('outputPolicy.rawOutputPersistenceAllowed'));
  assert.ok(result.invalidFields.includes('outputPolicy.secretValuesAllowed'));
  assert.ok(result.invalidFields.includes('outputPolicy.rawMemoryAllowed'));
  assert.ok(result.invalidFields.includes('outputPolicy.pathEndpointValueAllowed'));
  assert.ok(result.invalidFields.includes('outputPolicy.runtimeResponsePersistenceAllowed'));
  assert.ok(result.invalidFields.includes('receiptPlan.includeRawOutput'));
  assert.ok(result.invalidFields.includes('receiptPlan.includeSecretValues'));
  assert.ok(result.invalidFields.includes('receiptPlan.includeReadinessClaim'));
});

test('CM1699 rejects non-stop conditions and forbidden expansion flags', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket(approvalPacket({
    stopConditions: {
      ...approvalPacket().stopConditions,
      onMissingExactApproval: 'warn',
      onRuntimeCallWithoutApproval: 'continue',
      onReadinessClaim: 'ignore'
    },
    forbiddenExpansions: {
      ...approvalPacket().forbiddenExpansions,
      allowExecutionWithoutFreshApproval: true,
      allowTargetSpecificRuntimeInspection: true,
      allowApprovalLineValuePersistence: true,
      allowApprovalLineConsumption: true,
      allowConfigEnvRead: true,
      allowMemoryRead: true,
      allowProviderCall: true,
      allowReadinessClaim: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_target_specific_runtime_inspection_approval_packet');
  assert.ok(result.invalidFields.includes('stopConditions.onMissingExactApproval'));
  assert.ok(result.invalidFields.includes('stopConditions.onRuntimeCallWithoutApproval'));
  assert.ok(result.invalidFields.includes('stopConditions.onReadinessClaim'));
  assert.ok(result.invalidFields.includes('forbiddenExpansions.allowExecutionWithoutFreshApproval'));
  assert.ok(result.invalidFields.includes('forbiddenExpansions.allowTargetSpecificRuntimeInspection'));
  assert.ok(result.invalidFields.includes('forbiddenExpansions.allowApprovalLineValuePersistence'));
  assert.ok(result.invalidFields.includes('forbiddenExpansions.allowApprovalLineConsumption'));
  assert.ok(result.invalidFields.includes('forbiddenExpansions.allowConfigEnvRead'));
  assert.ok(result.invalidFields.includes('forbiddenExpansions.allowMemoryRead'));
  assert.ok(result.invalidFields.includes('forbiddenExpansions.allowProviderCall'));
  assert.ok(result.invalidFields.includes('forbiddenExpansions.allowReadinessClaim'));
});

test('CM1699 rejects nonzero execution counters', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket(approvalPacket({
    counters: zeroCounters(ZERO_COUNTERS, {
      runtimeCalls: 1,
      mcpCalls: 1,
      targetSpecificRuntimeInspections: 1,
      liveVcpToolBoxCalls: 1,
      approvalLinesIssued: 1,
      approvalLinesConsumed: 1,
      targetSpecificInspectionApprovalsGranted: 1,
      memoryReads: 1,
      durableMemoryWrites: 1,
      providerApiCalls: 1,
      publicMcpExpansions: 1,
      readinessClaims: 1
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_nonzero_execution_counters');
  assert.ok(result.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(result.forbiddenCounters.includes('mcpCalls'));
  assert.ok(result.forbiddenCounters.includes('targetSpecificRuntimeInspections'));
  assert.ok(result.forbiddenCounters.includes('liveVcpToolBoxCalls'));
  assert.ok(result.forbiddenCounters.includes('approvalLinesIssued'));
  assert.ok(result.forbiddenCounters.includes('approvalLinesConsumed'));
  assert.ok(result.forbiddenCounters.includes('targetSpecificInspectionApprovalsGranted'));
  assert.ok(result.forbiddenCounters.includes('memoryReads'));
  assert.ok(result.forbiddenCounters.includes('durableMemoryWrites'));
  assert.ok(result.forbiddenCounters.includes('providerApiCalls'));
  assert.ok(result.forbiddenCounters.includes('publicMcpExpansions'));
  assert.ok(result.forbiddenCounters.includes('readinessClaims'));

  const negativeResult = buildVcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket(approvalPacket({
    counters: zeroCounters(ZERO_COUNTERS, {
      runtimeCalls: -1
    })
  }));

  assert.equal(negativeResult.accepted, false);
  assert.equal(negativeResult.reasonCode, 'forbidden_nonzero_execution_counters');
  assert.ok(negativeResult.forbiddenCounters.includes('runtimeCalls'));
});

test('CM1699 locks target-specific runtime inspection approval vocabulary', () => {
  assert.ok(EXACT_APPROVAL_TOKEN.includes('CM1699'));
  assert.equal(OPERATOR_DECISION, 'approve_target_specific_runtime_inspection_packet_only_no_execution');
  assert.ok(REQUIRED_CURRENT_FACTS_BINDING_FIELDS.includes('branchNameValueIncluded'));
  assert.ok(REQUIRED_EXPIRY_FIELDS.includes('expiresAtValueIncluded'));
  assert.ok(FORBIDDEN_EXPANSION_FIELDS.includes('allowTargetSpecificRuntimeInspection'));
  assert.ok(FORBIDDEN_EXPANSION_FIELDS.includes('allowApprovalLineConsumption'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rawRuntimeResponse'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('exactApprovalLine'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('targetCommit'));
});

test('CM1699 helper never performs runtime provider memory public MCP readiness or approval issuance actions', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket(approvalPacket());

  assert.equal(result.accepted, true);
  assert.equal(result.targetSpecificRuntimeInspectionApprovedByThisHelper, false);
  assert.equal(result.exactApprovalLineIssued, false);
  assert.equal(result.approvalLineConsumed, false);
  assert.equal(result.runtimeExecutionAllowedByThisHelper, false);
  assert.equal(result.targetSpecificRuntimeInspectionExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.configEnvRead, false);
  assert.equal(result.envFileRead, false);
  assert.equal(result.rawMemoryRead, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimAllowed, false);
  assert.deepEqual(result.counters, zeroCounters(ZERO_COUNTERS));
});
