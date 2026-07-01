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
  DEFAULT_MAX_RUNTIME_CALLS,
  DEFAULT_MAX_RUNTIME_PROBE_MINUTES,
  EXACT_APPROVAL_TOKEN,
  FORBIDDEN_EXPANSION_FIELDS: APPROVAL_FORBIDDEN_EXPANSION_FIELDS,
  OPERATOR_DECISION: APPROVAL_OPERATOR_DECISION,
  STOP_CONDITION_FIELDS: APPROVAL_STOP_CONDITION_FIELDS,
  ZERO_COUNTERS: APPROVAL_ZERO_COUNTERS
} = require('../src/core/VcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket');
const {
  ALLOWED_RUNTIME_ACTIONS,
  CONTRACT_MODE,
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
  buildVcpToolBoxTargetSpecificRuntimeInspectionExecutionApprovalDraft
} = require('../src/core/VcpToolBoxTargetSpecificRuntimeInspectionExecutionApprovalDraft');

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

function approvalPacket(overrides = {}) {
  return {
    schemaVersion: 1,
    sourceSystem: 'VCPToolBox',
    approvalPacketId: 'CM1699-TARGET-SPECIFIC-RUNTIME-INSPECTION-APPROVAL-001',
    exactApprovalToken: EXACT_APPROVAL_TOKEN,
    operatorDecision: APPROVAL_OPERATOR_DECISION,
    operatorIntent: 'prepare target specific runtime inspection approval packet without execution',
    referencedDiscoveryPacket: discoveryPacket(),
    approvalScope: {
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
      worktreeStatusRequired: 'clean_before_runtime_inspection'
    },
    expiry: {
      expiresAtPresent: true,
      expiresAtValueIncluded: false,
      expired: false
    },
    executionAuthorization: {
      targetSpecificRuntimeInspectionApproved: false,
      exactApprovalLineIncluded: false,
      exactApprovalLineIssuedByThisHelper: false,
      approvalLineConsumed: false,
      liveProbeApproved: false,
      memoryReadApproved: false,
      writeApproved: false,
      providerCallApproved: false,
      publicMcpExpansionApproved: false
    },
    runtimeBudget: {
      maxRuntimeProbeMinutes: DEFAULT_MAX_RUNTIME_PROBE_MINUTES,
      maxRuntimeCalls: DEFAULT_MAX_RUNTIME_CALLS,
      maxMemoryReadQueries: 0,
      maxMemoryWrites: 0,
      maxProviderCalls: 0
    },
    outputPolicy: {
      lowDisclosureOnly: true,
      rawTargetValueAllowed: false,
      rawOutputPersistenceAllowed: false,
      secretValuesAllowed: false,
      rawMemoryAllowed: false,
      pathEndpointValueAllowed: false,
      runtimeResponsePersistenceAllowed: false
    },
    receiptPlan: {
      postInspectionReceiptRequired: true,
      includeTargetClass: true,
      includeDiscoveryPacketId: true,
      includeActionCounters: true,
      includeValidationResult: true,
      includeRawOutput: false,
      includeSecretValues: false,
      includeReadinessClaim: false
    },
    stopConditions: Object.fromEntries(APPROVAL_STOP_CONDITION_FIELDS.map(field => [field, 'stop'])),
    forbiddenExpansions: Object.fromEntries(APPROVAL_FORBIDDEN_EXPANSION_FIELDS.map(field => [field, false])),
    counters: zeroCounters(APPROVAL_ZERO_COUNTERS),
    ...overrides
  };
}

function executionScope(overrides = {}) {
  return {
    approvalPacketId: 'CM1699-TARGET-SPECIFIC-RUNTIME-INSPECTION-APPROVAL-001',
    discoveryPacketId: 'CM1698-EXACT-TARGET-DISCOVERY-PACKET-001',
    targetReferenceName: 'operator-vcp-toolbox-checkout',
    targetKind: 'local_checkout',
    discoverySource: 'operator_provided',
    requestedProfile: PROFILES.TRUSTED_FULL_READ,
    allowedRuntimeActions: [...ALLOWED_RUNTIME_ACTIONS],
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
    worktreeStatusRequired: 'clean_before_target_specific_runtime_inspection_execution',
    ...overrides
  };
}

function approvalLineTemplate(overrides = {}) {
  return {
    exactApprovalLineTemplatePresent: true,
    exactApprovalLineValueIncluded: false,
    includesTargetBindingPlaceholder: true,
    includesCommitBindingPlaceholder: true,
    includesExpiryPlaceholder: true,
    includesCallBudget: true,
    oneTimeUseOnly: true,
    humanOperatorRequired: true,
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
    includeApprovalPacketId: true,
    includeActionCounters: true,
    includeValidationResult: true,
    includeRawOutput: false,
    includeSecretValues: false,
    includeReadinessClaim: false,
    ...overrides
  };
}

function draft(overrides = {}) {
  return {
    schemaVersion: 1,
    sourceSystem: 'VCPToolBox',
    executionApprovalDraftId: 'CM1700-TARGET-SPECIFIC-RUNTIME-INSPECTION-EXECUTION-APPROVAL-DRAFT-001',
    exactDraftToken: EXACT_DRAFT_TOKEN,
    operatorDecision: OPERATOR_DECISION,
    referencedApprovalPacket: approvalPacket(),
    executionScope: executionScope(),
    currentFactsBinding: currentFactsBinding(),
    approvalLineTemplate: approvalLineTemplate(),
    runtimeBudget: runtimeBudget(),
    outputPolicy: outputPolicy(),
    receiptPlan: receiptPlan(),
    stopConditions: Object.fromEntries(STOP_CONDITION_FIELDS.map(field => [field, 'stop'])),
    forbiddenExpansions: Object.fromEntries(FORBIDDEN_EXPANSION_FIELDS.map(field => [field, false])),
    counters: zeroCounters(ZERO_COUNTERS),
    ...overrides
  };
}

test('CM1700 accepts target-specific runtime inspection execution approval draft without granting execution', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionExecutionApprovalDraft(draft());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, CONTRACT_MODE);
  assert.equal(
    result.executionApprovalDraftId,
    'CM1700-TARGET-SPECIFIC-RUNTIME-INSPECTION-EXECUTION-APPROVAL-DRAFT-001'
  );
  assert.equal(result.referencedApprovalPacketId, 'CM1699-TARGET-SPECIFIC-RUNTIME-INSPECTION-APPROVAL-001');
  assert.equal(result.referencedDiscoveryPacketId, 'CM1698-EXACT-TARGET-DISCOVERY-PACKET-001');
  assert.equal(result.referencedTargetReferenceName, 'operator-vcp-toolbox-checkout');
  assert.equal(result.draftStatus, 'draft_valid_not_approved');
  assert.equal(result.exactDraftTokenMatched, true);
  assert.equal(result.executionApprovalDraftValidForFutureUse, true);
  assert.equal(result.targetSpecificRuntimeInspectionExecutionApprovedByThisHelper, false);
  assert.equal(result.exactApprovalLineIssued, false);
  assert.equal(result.approvalLineConsumed, false);
  assert.equal(result.targetSpecificRuntimeInspectionAllowedByThisHelper, false);
  assert.equal(result.runtimeExecutionAllowedByThisHelper, false);
  assert.equal(result.targetSpecificRuntimeInspectionExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
});

test('CM1700 rejects missing required nested fields', () => {
  const incompleteScope = executionScope();
  delete incompleteScope.approvalPacketId;
  const incompleteFacts = currentFactsBinding();
  delete incompleteFacts.branchNamePresent;
  const incompleteBudget = runtimeBudget();
  delete incompleteBudget.maxProviderCalls;

  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionExecutionApprovalDraft(draft({
    executionScope: incompleteScope,
    currentFactsBinding: incompleteFacts,
    runtimeBudget: incompleteBudget
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'missing_required_fields');
  assert.ok(result.missingFields.includes('executionScope.approvalPacketId'));
  assert.ok(result.missingFields.includes('currentFactsBinding.branchNamePresent'));
  assert.ok(result.missingFields.includes('runtimeBudget.maxProviderCalls'));
});

test('CM1700 rejects invalid referenced approval packet without echoing private target values', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionExecutionApprovalDraft(draft({
    referencedApprovalPacket: approvalPacket({
      referencedDiscoveryPacket: discoveryPacket({
        targetReference: targetReference({
          referenceName: 'A:/PRIVATE/VCPToolBox'
        })
      })
    })
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'referenced_approval_packet_rejected');
  assert.equal(result.referencedApprovalReasonCode, 'referenced_discovery_packet_rejected');
  assert.ok(result.invalidFields.includes('referencedApprovalPacket'));
  assert.equal(serialized.includes('PRIVATE/VCPToolBox'), false);
});

test('CM1700 rejects unsafe draft id token source and decision without echoing private values', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionExecutionApprovalDraft(draft({
    sourceSystem: 'SECRET_SOURCE_SHOULD_NOT_ECHO',
    executionApprovalDraftId: 'https://PRIVATE_DRAFT_SHOULD_NOT_ECHO',
    exactDraftToken: 'PRIVATE_DRAFT_TOKEN_SHOULD_NOT_ECHO',
    operatorDecision: 'https://PRIVATE_DECISION_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_target_specific_runtime_inspection_execution_approval_draft');
  assert.ok(result.invalidFields.includes('sourceSystem'));
  assert.ok(result.invalidFields.includes('executionApprovalDraftId'));
  assert.ok(result.invalidFields.includes('exactDraftToken'));
  assert.ok(result.invalidFields.includes('operatorDecision'));
  assert.equal(result.lowDisclosureProjection.sourceSystem, null);
  assert.equal(result.lowDisclosureProjection.executionApprovalDraftId, null);
  assert.equal(result.lowDisclosureProjection.operatorDecision, null);
  assert.equal(serialized.includes('SECRET_SOURCE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_DRAFT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_DRAFT_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_DECISION_SHOULD_NOT_ECHO'), false);
});

test('CM1700 rejects approval line endpoint token config and raw runtime fields without echoing values', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionExecutionApprovalDraft(draft({
    exactApprovalLine: 'APPROVE PRIVATE LINE SHOULD NOT ECHO',
    endpoint: 'https://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
    bearerToken: 'SECRET_TOKEN_SHOULD_NOT_ECHO',
    configEnvPath: 'A:/VCP/VCPToolBox/config.env',
    rawRuntimeResponse: 'RAW_RUNTIME_RESPONSE_SHOULD_NOT_ECHO',
    rawDailyNoteContent: 'RAW_DAILY_NOTE_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_secret_locator_approval_or_raw_fields');
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

test('CM1700 rejects execution scope mismatch with referenced approval packet', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionExecutionApprovalDraft(draft({
    executionScope: executionScope({
      approvalPacketId: 'CM1699-WRONG-APPROVAL',
      discoveryPacketId: 'CM1698-WRONG-DISCOVERY',
      targetReferenceName: 'different-target',
      targetKind: 'mcp_server',
      discoverySource: 'service_registry',
      requestedProfile: PROFILES.TRUSTED_WRITE_PROPOSAL,
      allowedRuntimeActions: ['target_presence.check'],
      maxRuntimeCalls: 1,
      maxRuntimeProbeMinutes: 9,
      noMemoryRead: false,
      noWrite: false,
      noProviderCall: false,
      noPublicMcpExpansion: false,
      noReadinessClaim: false
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_target_specific_runtime_inspection_execution_approval_draft');
  for (const field of REQUIRED_EXECUTION_SCOPE_FIELDS) {
    assert.ok(result.invalidFields.includes(`executionScope.${field}`));
  }
});

test('CM1700 rejects current facts commit branch value disclosure and dirty worktree policy', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionExecutionApprovalDraft(draft({
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
  assert.equal(result.reasonCode, 'forbidden_secret_locator_approval_or_raw_fields');
  assert.ok(result.forbiddenFields.includes('targetCommit'));
  assert.equal(serialized.includes('PRIVATE_COMMIT_VALUE_SHOULD_NOT_ECHO'), false);

  const policyOnly = buildVcpToolBoxTargetSpecificRuntimeInspectionExecutionApprovalDraft(draft({
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

test('CM1700 rejects stale approval line template controls', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionExecutionApprovalDraft(draft({
    approvalLineTemplate: approvalLineTemplate({
      exactApprovalLineTemplatePresent: false,
      exactApprovalLineValueIncluded: true,
      includesTargetBindingPlaceholder: false,
      includesCommitBindingPlaceholder: false,
      includesExpiryPlaceholder: false,
      includesCallBudget: false,
      oneTimeUseOnly: false,
      humanOperatorRequired: false
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_target_specific_runtime_inspection_execution_approval_draft');
  for (const field of REQUIRED_APPROVAL_LINE_TEMPLATE_FIELDS) {
    assert.ok(result.invalidFields.includes(`approvalLineTemplate.${field}`));
  }
});

test('CM1700 rejects runtime budget expansion to memory write provider or too many calls', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionExecutionApprovalDraft(draft({
    runtimeBudget: runtimeBudget({
      maxRuntimeProbeMinutes: 11,
      maxRuntimeCalls: 4,
      maxMemoryReadQueries: 1,
      maxMemoryWrites: 1,
      maxProviderCalls: 1
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_target_specific_runtime_inspection_execution_approval_draft');
  for (const field of REQUIRED_RUNTIME_BUDGET_FIELDS) {
    assert.ok(result.invalidFields.includes(`runtimeBudget.${field}`));
  }
});

test('CM1700 rejects output and receipt policies that allow raw secret runtime or readiness data', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionExecutionApprovalDraft(draft({
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
  assert.equal(result.reasonCode, 'invalid_target_specific_runtime_inspection_execution_approval_draft');
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

test('CM1700 rejects non-stop conditions and forbidden expansion flags', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionExecutionApprovalDraft(draft({
    stopConditions: {
      ...draft().stopConditions,
      onMissingExactApproval: 'warn',
      onUnexpectedRuntimeAction: 'continue',
      onReadinessClaim: 'ignore'
    },
    forbiddenExpansions: {
      ...draft().forbiddenExpansions,
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
  assert.equal(result.reasonCode, 'invalid_target_specific_runtime_inspection_execution_approval_draft');
  assert.ok(result.invalidFields.includes('stopConditions.onMissingExactApproval'));
  assert.ok(result.invalidFields.includes('stopConditions.onUnexpectedRuntimeAction'));
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

test('CM1700 rejects nonzero execution or approval counters', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionExecutionApprovalDraft(draft({
    counters: zeroCounters(ZERO_COUNTERS, {
      runtimeCalls: 1,
      mcpCalls: 1,
      targetSpecificRuntimeInspections: 1,
      targetSpecificInspectionExecutionApprovalsGranted: 1,
      liveVcpToolBoxCalls: 1,
      approvalLinesIssued: 1,
      approvalLinesConsumed: 1,
      memoryReads: 1,
      durableMemoryWrites: 1,
      providerApiCalls: 1,
      publicMcpExpansions: 1,
      readinessClaims: 1
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_nonzero_execution_or_approval_counters');
  assert.ok(result.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(result.forbiddenCounters.includes('mcpCalls'));
  assert.ok(result.forbiddenCounters.includes('targetSpecificRuntimeInspections'));
  assert.ok(result.forbiddenCounters.includes('targetSpecificInspectionExecutionApprovalsGranted'));
  assert.ok(result.forbiddenCounters.includes('liveVcpToolBoxCalls'));
  assert.ok(result.forbiddenCounters.includes('approvalLinesIssued'));
  assert.ok(result.forbiddenCounters.includes('approvalLinesConsumed'));
  assert.ok(result.forbiddenCounters.includes('memoryReads'));
  assert.ok(result.forbiddenCounters.includes('durableMemoryWrites'));
  assert.ok(result.forbiddenCounters.includes('providerApiCalls'));
  assert.ok(result.forbiddenCounters.includes('publicMcpExpansions'));
  assert.ok(result.forbiddenCounters.includes('readinessClaims'));

  const negativeResult = buildVcpToolBoxTargetSpecificRuntimeInspectionExecutionApprovalDraft(draft({
    counters: zeroCounters(ZERO_COUNTERS, {
      runtimeCalls: -1
    })
  }));

  assert.equal(negativeResult.accepted, false);
  assert.equal(negativeResult.reasonCode, 'forbidden_nonzero_execution_or_approval_counters');
  assert.ok(negativeResult.forbiddenCounters.includes('runtimeCalls'));
});

test('CM1700 locks target-specific runtime inspection execution approval draft vocabulary', () => {
  assert.ok(EXACT_DRAFT_TOKEN.includes('CM1700'));
  assert.equal(OPERATOR_DECISION, 'draft_target_specific_runtime_inspection_execution_approval_only_no_execution');
  assert.ok(REQUIRED_EXECUTION_SCOPE_FIELDS.includes('allowedRuntimeActions'));
  assert.ok(REQUIRED_CURRENT_FACTS_BINDING_FIELDS.includes('branchNameValueIncluded'));
  assert.ok(REQUIRED_APPROVAL_LINE_TEMPLATE_FIELDS.includes('exactApprovalLineValueIncluded'));
  assert.ok(REQUIRED_RUNTIME_BUDGET_FIELDS.includes('maxMemoryReadQueries'));
  assert.ok(REQUIRED_OUTPUT_POLICY_FIELDS.includes('runtimeResponsePersistenceAllowed'));
  assert.ok(REQUIRED_RECEIPT_PLAN_FIELDS.includes('includeApprovalPacketId'));
  assert.ok(STOP_CONDITION_FIELDS.includes('onUnexpectedRuntimeAction'));
  assert.ok(FORBIDDEN_EXPANSION_FIELDS.includes('allowApprovalLineConsumption'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('exactApprovalLine'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rawRuntimeResponse'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('targetCommit'));
});

test('CM1700 helper never performs runtime provider memory public MCP readiness or approval issuance actions', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionExecutionApprovalDraft(draft());

  assert.equal(result.accepted, true);
  assert.equal(result.targetSpecificRuntimeInspectionExecutionApprovedByThisHelper, false);
  assert.equal(result.exactApprovalLineIssued, false);
  assert.equal(result.approvalLineConsumed, false);
  assert.equal(result.targetSpecificRuntimeInspectionAllowedByThisHelper, false);
  assert.equal(result.runtimeExecutionAllowedByThisHelper, false);
  assert.equal(result.targetSpecificRuntimeInspectionExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.runtimeWiringExecuted, false);
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
