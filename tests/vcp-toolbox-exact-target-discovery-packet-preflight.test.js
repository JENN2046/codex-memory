'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { PROFILES } = require('../src/core/VcpToolBoxFullCapabilityBridgePlan');
const {
  COMPONENT_SURFACE_FIELDS,
  CONTRACT_MODE,
  EXACT_PREFLIGHT_TOKEN,
  FORBIDDEN_EXPANSION_FIELDS,
  FORBIDDEN_FIELD_NAMES,
  OPERATOR_DECISION,
  REQUIRED_DISCOVERY_QUESTION_FIELDS,
  REQUIRED_EXECUTION_AUTHORIZATION_FIELDS,
  REQUIRED_OUTPUT_POLICY_FIELDS,
  REQUIRED_PRINCIPAL_SCOPE_FIELDS,
  REQUIRED_PROFILE_BOUNDARY_FIELDS,
  REQUIRED_RECEIPT_PLAN_FIELDS,
  REQUIRED_TARGET_REFERENCE_FIELDS,
  STOP_CONDITION_FIELDS,
  ZERO_COUNTERS,
  buildVcpToolBoxExactTargetDiscoveryPacketPreflight
} = require('../src/core/VcpToolBoxExactTargetDiscoveryPacketPreflight');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(Object.keys(ZERO_COUNTERS).map(field => [field, overrides[field] || 0]));
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

function principalScope(overrides = {}) {
  return {
    agentAlias: 'Codex',
    agentIdPresent: true,
    projectIdPresent: true,
    workspaceIdPresent: true,
    clientIdPresent: true,
    sessionIdPresent: true,
    ...overrides
  };
}

function discoveryQuestionSet(overrides = {}) {
  return {
    targetKindConfirmed: true,
    startupStateKnown: true,
    transportKnown: true,
    authFieldNamesKnown: true,
    profileFieldNamesKnown: true,
    readEntrypointsMapped: true,
    writeEntrypointsMapped: true,
    scopeModelKnown: true,
    timeoutModelKnown: true,
    failureModelKnown: true,
    receiptFieldsKnown: true,
    rawValuesIncluded: false,
    ...overrides
  };
}

function componentSurfaceCoverage(overrides = {}) {
  return {
    dailyNoteConsidered: true,
    dailyNoteManagerConsidered: true,
    knowledgeBaseManagerConsidered: true,
    tagMemoConsidered: true,
    lightMemoConsidered: true,
    tdbKnowledgeConsidered: true,
    deepMemoConsidered: true,
    topicMemoConsidered: true,
    meshMemoConsidered: true,
    ragDiaryPluginConsidered: true,
    ...overrides
  };
}

function profileBoundary(overrides = {}) {
  return {
    requestedProfile: PROFILES.TRUSTED_FULL_READ,
    profileSelectionExplicit: true,
    observeLiteAllowed: true,
    observeFullAllowed: true,
    trustedFullReadRequiresApproval: true,
    trustedWriteProposalRequiresApproval: true,
    trustedFullRequiresApproval: true,
    rawOutputAllowed: false,
    writeAllowedByPreflight: false,
    ...overrides
  };
}

function executionAuthorization(overrides = {}) {
  return {
    targetSpecificRuntimeInspectionApproved: false,
    exactApprovalLineIncluded: false,
    liveProbeApproved: false,
    memoryReadApproved: false,
    writeApproved: false,
    providerCallApproved: false,
    publicMcpExpansionApproved: false,
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
    ...overrides
  };
}

function receiptPlan(overrides = {}) {
  return {
    postDiscoveryReceiptRequired: true,
    includeTargetClass: true,
    includeQuestionCoverage: true,
    includeComponentCoverage: true,
    includeActionCounters: true,
    includeRawOutput: false,
    includeSecretValues: false,
    includeReadinessClaim: false,
    ...overrides
  };
}

function packet(overrides = {}) {
  return {
    schemaVersion: 1,
    sourceSystem: 'VCPToolBox',
    discoveryPacketId: 'CM1698-EXACT-TARGET-DISCOVERY-PACKET-001',
    exactPreflightToken: EXACT_PREFLIGHT_TOKEN,
    operatorDecision: OPERATOR_DECISION,
    operatorIntent: 'prepare exact target discovery packet without runtime inspection',
    targetReference: targetReference(),
    principalScope: principalScope(),
    discoveryQuestionSet: discoveryQuestionSet(),
    componentSurfaceCoverage: componentSurfaceCoverage(),
    profileBoundary: profileBoundary(),
    executionAuthorization: executionAuthorization(),
    outputPolicy: outputPolicy(),
    receiptPlan: receiptPlan(),
    stopConditions: Object.fromEntries(STOP_CONDITION_FIELDS.map(field => [field, 'stop'])),
    forbiddenExpansions: Object.fromEntries(FORBIDDEN_EXPANSION_FIELDS.map(field => [field, false])),
    counters: zeroCounters(),
    ...overrides
  };
}

test('CM1698 accepts exact target discovery preflight without runtime inspection', () => {
  const result = buildVcpToolBoxExactTargetDiscoveryPacketPreflight(packet());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, CONTRACT_MODE);
  assert.equal(result.discoveryPacketId, 'CM1698-EXACT-TARGET-DISCOVERY-PACKET-001');
  assert.equal(result.exactPreflightTokenMatched, true);
  assert.equal(result.operatorIntentPresent, true);
  assert.equal(result.exactTargetDiscoveryPacketReadyForFutureUse, true);
  assert.deepEqual(result.sanitizedTargetReference, {
    kind: 'local_checkout',
    referenceName: 'operator-vcp-toolbox-checkout',
    discoverySource: 'operator_provided',
    locatorHashPresent: true,
    locatorValueIncluded: false,
    endpointValueIncluded: false,
    secretMaterialIncluded: false,
    targetSpecificInspectionApproved: false
  });
  assert.equal(result.nextAction, 'request_exact_target_specific_discovery_approval_before_runtime_inspection');
  assert.equal(result.targetDiscoveryExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
});

test('CM1698 rejects missing required nested fields', () => {
  const incompleteTarget = targetReference();
  delete incompleteTarget.referenceName;
  const incompleteQuestions = discoveryQuestionSet();
  delete incompleteQuestions.transportKnown;
  const incompleteCoverage = componentSurfaceCoverage();
  delete incompleteCoverage.tagMemoConsidered;

  const result = buildVcpToolBoxExactTargetDiscoveryPacketPreflight(packet({
    targetReference: incompleteTarget,
    discoveryQuestionSet: incompleteQuestions,
    componentSurfaceCoverage: incompleteCoverage
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'missing_required_fields');
  assert.ok(result.missingFields.includes('targetReference.referenceName'));
  assert.ok(result.missingFields.includes('discoveryQuestionSet.transportKnown'));
  assert.ok(result.missingFields.includes('componentSurfaceCoverage.tagMemoConsidered'));
});

test('CM1698 rejects unsafe packet id operator intent and target reference without echoing private values', () => {
  const result = buildVcpToolBoxExactTargetDiscoveryPacketPreflight(packet({
    sourceSystem: 'SECRET_SOURCE_SHOULD_NOT_ECHO',
    discoveryPacketId: 'A:/PRIVATE/VCPToolBox',
    operatorDecision: 'https://PRIVATE_DECISION_SHOULD_NOT_ECHO',
    operatorIntent: 'SECRET target discovery intent should not echo',
    targetReference: targetReference({
      kind: 'https://PRIVATE_KIND_SHOULD_NOT_ECHO',
      referenceName: 'A:/PRIVATE/VCPToolBox'
    })
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_exact_target_discovery_packet_preflight');
  assert.ok(result.invalidFields.includes('sourceSystem'));
  assert.ok(result.invalidFields.includes('discoveryPacketId'));
  assert.ok(result.invalidFields.includes('operatorDecision'));
  assert.ok(result.invalidFields.includes('operatorIntent'));
  assert.ok(result.invalidFields.includes('targetReference.kind'));
  assert.ok(result.invalidFields.includes('targetReference.referenceName'));
  assert.equal(result.lowDisclosureProjection.sourceSystem, null);
  assert.equal(result.lowDisclosureProjection.discoveryPacketId, null);
  assert.equal(result.lowDisclosureProjection.targetKind, null);
  assert.equal(result.lowDisclosureProjection.referenceName, null);
  assert.equal(result.lowDisclosureProjection.operatorDecision, null);
  assert.equal(serialized.includes('PRIVATE/VCPToolBox'), false);
  assert.equal(serialized.includes('PRIVATE_DECISION_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_KIND_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET target discovery intent'), false);
  assert.equal(serialized.includes('SECRET_SOURCE_SHOULD_NOT_ECHO'), false);
});

test('CM1698 rejects locator endpoint config env token and raw fields without echoing values', () => {
  const result = buildVcpToolBoxExactTargetDiscoveryPacketPreflight(packet({
    locatorValue: 'A:/PRIVATE/VCPToolBox',
    endpoint: 'https://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
    bearerToken: 'SECRET_TOKEN_SHOULD_NOT_ECHO',
    configEnvPath: 'A:/VCP/VCPToolBox/config.env',
    rawDailyNoteContent: 'RAW_DAILY_NOTE_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_secret_locator_or_raw_fields');
  assert.ok(result.forbiddenFields.includes('locatorValue'));
  assert.ok(result.forbiddenFields.includes('endpoint'));
  assert.ok(result.forbiddenFields.includes('bearerToken'));
  assert.ok(result.forbiddenFields.includes('configEnvPath'));
  assert.ok(result.forbiddenFields.includes('rawDailyNoteContent'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_DAILY_NOTE_SHOULD_NOT_ECHO'), false);
});

test('CM1698 rejects target reference flags that imply target-specific inspection or raw values', () => {
  const result = buildVcpToolBoxExactTargetDiscoveryPacketPreflight(packet({
    targetReference: targetReference({
      locatorHashPresent: false,
      locatorValueIncluded: true,
      endpointValueIncluded: true,
      secretMaterialIncluded: true,
      configEnvRead: true,
      runtimeCalled: true,
      targetSpecificInspectionApproved: true
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_exact_target_discovery_packet_preflight');
  assert.ok(result.invalidFields.includes('targetReference.locatorHashPresent'));
  assert.ok(result.invalidFields.includes('targetReference.locatorValueIncluded'));
  assert.ok(result.invalidFields.includes('targetReference.endpointValueIncluded'));
  assert.ok(result.invalidFields.includes('targetReference.secretMaterialIncluded'));
  assert.ok(result.invalidFields.includes('targetReference.configEnvRead'));
  assert.ok(result.invalidFields.includes('targetReference.runtimeCalled'));
  assert.ok(result.invalidFields.includes('targetReference.targetSpecificInspectionApproved'));
});

test('CM1698 rejects incomplete discovery questions and raw value inclusion', () => {
  const result = buildVcpToolBoxExactTargetDiscoveryPacketPreflight(packet({
    discoveryQuestionSet: discoveryQuestionSet({
      readEntrypointsMapped: false,
      writeEntrypointsMapped: false,
      receiptFieldsKnown: false,
      rawValuesIncluded: true
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_exact_target_discovery_packet_preflight');
  assert.ok(result.invalidFields.includes('discoveryQuestionSet.readEntrypointsMapped'));
  assert.ok(result.invalidFields.includes('discoveryQuestionSet.writeEntrypointsMapped'));
  assert.ok(result.invalidFields.includes('discoveryQuestionSet.receiptFieldsKnown'));
  assert.ok(result.invalidFields.includes('discoveryQuestionSet.rawValuesIncluded'));
});

test('CM1698 rejects missing component surface coverage', () => {
  const result = buildVcpToolBoxExactTargetDiscoveryPacketPreflight(packet({
    componentSurfaceCoverage: componentSurfaceCoverage({
      dailyNoteManagerConsidered: false,
      tdbKnowledgeConsidered: false,
      meshMemoConsidered: false
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_exact_target_discovery_packet_preflight');
  assert.ok(result.invalidFields.includes('componentSurfaceCoverage.dailyNoteManagerConsidered'));
  assert.ok(result.invalidFields.includes('componentSurfaceCoverage.tdbKnowledgeConsidered'));
  assert.ok(result.invalidFields.includes('componentSurfaceCoverage.meshMemoConsidered'));
});

test('CM1698 rejects unsafe profile boundary and write or raw-output expansion', () => {
  const result = buildVcpToolBoxExactTargetDiscoveryPacketPreflight(packet({
    profileBoundary: profileBoundary({
      requestedProfile: 'unknown-profile',
      profileSelectionExplicit: false,
      trustedFullReadRequiresApproval: false,
      trustedWriteProposalRequiresApproval: false,
      trustedFullRequiresApproval: false,
      rawOutputAllowed: true,
      writeAllowedByPreflight: true
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_exact_target_discovery_packet_preflight');
  assert.ok(result.invalidFields.includes('profileBoundary.requestedProfile'));
  assert.ok(result.invalidFields.includes('profileBoundary.profileSelectionExplicit'));
  assert.ok(result.invalidFields.includes('profileBoundary.trustedFullReadRequiresApproval'));
  assert.ok(result.invalidFields.includes('profileBoundary.trustedWriteProposalRequiresApproval'));
  assert.ok(result.invalidFields.includes('profileBoundary.trustedFullRequiresApproval'));
  assert.ok(result.invalidFields.includes('profileBoundary.rawOutputAllowed'));
  assert.ok(result.invalidFields.includes('profileBoundary.writeAllowedByPreflight'));
});

test('CM1698 rejects execution authorization flags', () => {
  const result = buildVcpToolBoxExactTargetDiscoveryPacketPreflight(packet({
    executionAuthorization: executionAuthorization({
      targetSpecificRuntimeInspectionApproved: true,
      exactApprovalLineIncluded: true,
      liveProbeApproved: true,
      memoryReadApproved: true,
      writeApproved: true,
      providerCallApproved: true,
      publicMcpExpansionApproved: true
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_exact_target_discovery_packet_preflight');
  for (const field of REQUIRED_EXECUTION_AUTHORIZATION_FIELDS) {
    assert.ok(result.invalidFields.includes(`executionAuthorization.${field}`));
  }
});

test('CM1698 rejects output and receipt policies that allow raw secret or readiness data', () => {
  const result = buildVcpToolBoxExactTargetDiscoveryPacketPreflight(packet({
    outputPolicy: outputPolicy({
      lowDisclosureOnly: false,
      rawTargetValueAllowed: true,
      rawOutputPersistenceAllowed: true,
      secretValuesAllowed: true,
      rawMemoryAllowed: true,
      pathEndpointValueAllowed: true
    }),
    receiptPlan: receiptPlan({
      includeRawOutput: true,
      includeSecretValues: true,
      includeReadinessClaim: true
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_exact_target_discovery_packet_preflight');
  assert.ok(result.invalidFields.includes('outputPolicy.lowDisclosureOnly'));
  assert.ok(result.invalidFields.includes('outputPolicy.rawTargetValueAllowed'));
  assert.ok(result.invalidFields.includes('outputPolicy.rawOutputPersistenceAllowed'));
  assert.ok(result.invalidFields.includes('outputPolicy.secretValuesAllowed'));
  assert.ok(result.invalidFields.includes('outputPolicy.rawMemoryAllowed'));
  assert.ok(result.invalidFields.includes('outputPolicy.pathEndpointValueAllowed'));
  assert.ok(result.invalidFields.includes('receiptPlan.includeRawOutput'));
  assert.ok(result.invalidFields.includes('receiptPlan.includeSecretValues'));
  assert.ok(result.invalidFields.includes('receiptPlan.includeReadinessClaim'));
});

test('CM1698 rejects non-stop conditions and forbidden expansion flags', () => {
  const result = buildVcpToolBoxExactTargetDiscoveryPacketPreflight(packet({
    stopConditions: {
      ...packet().stopConditions,
      onMissingExactApproval: 'warn',
      onRuntimeCall: 'continue',
      onReadinessClaim: 'ignore'
    },
    forbiddenExpansions: {
      ...packet().forbiddenExpansions,
      allowTargetSpecificRuntimeInspection: true,
      allowConfigEnvRead: true,
      allowMemoryRead: true,
      allowProviderCall: true,
      allowReadinessClaim: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_exact_target_discovery_packet_preflight');
  assert.ok(result.invalidFields.includes('stopConditions.onMissingExactApproval'));
  assert.ok(result.invalidFields.includes('stopConditions.onRuntimeCall'));
  assert.ok(result.invalidFields.includes('stopConditions.onReadinessClaim'));
  assert.ok(result.invalidFields.includes('forbiddenExpansions.allowTargetSpecificRuntimeInspection'));
  assert.ok(result.invalidFields.includes('forbiddenExpansions.allowConfigEnvRead'));
  assert.ok(result.invalidFields.includes('forbiddenExpansions.allowMemoryRead'));
  assert.ok(result.invalidFields.includes('forbiddenExpansions.allowProviderCall'));
  assert.ok(result.invalidFields.includes('forbiddenExpansions.allowReadinessClaim'));
});

test('CM1698 rejects positive execution counters', () => {
  const result = buildVcpToolBoxExactTargetDiscoveryPacketPreflight(packet({
    counters: zeroCounters({
      runtimeCalls: 1,
      mcpCalls: 1,
      providerApiCalls: 1,
      targetSpecificRuntimeInspections: 1,
      liveVcpToolBoxCalls: 1,
      memoryReads: 1,
      durableMemoryWrites: 1,
      approvalLinesConsumed: 1,
      readinessClaims: 1
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_positive_execution_counters');
  assert.ok(result.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(result.forbiddenCounters.includes('mcpCalls'));
  assert.ok(result.forbiddenCounters.includes('providerApiCalls'));
  assert.ok(result.forbiddenCounters.includes('targetSpecificRuntimeInspections'));
  assert.ok(result.forbiddenCounters.includes('liveVcpToolBoxCalls'));
  assert.ok(result.forbiddenCounters.includes('memoryReads'));
  assert.ok(result.forbiddenCounters.includes('durableMemoryWrites'));
  assert.ok(result.forbiddenCounters.includes('approvalLinesConsumed'));
  assert.ok(result.forbiddenCounters.includes('readinessClaims'));
});

test('CM1698 locks exact target discovery preflight vocabulary', () => {
  assert.ok(EXACT_PREFLIGHT_TOKEN.includes('CM1698'));
  assert.equal(OPERATOR_DECISION, 'preflight_target_discovery_packet_only_no_runtime');
  assert.ok(REQUIRED_TARGET_REFERENCE_FIELDS.includes('endpointValueIncluded'));
  assert.ok(REQUIRED_PRINCIPAL_SCOPE_FIELDS.includes('workspaceIdPresent'));
  assert.ok(REQUIRED_DISCOVERY_QUESTION_FIELDS.includes('readEntrypointsMapped'));
  assert.ok(COMPONENT_SURFACE_FIELDS.includes('ragDiaryPluginConsidered'));
  assert.ok(REQUIRED_PROFILE_BOUNDARY_FIELDS.includes('trustedFullRequiresApproval'));
  assert.ok(REQUIRED_EXECUTION_AUTHORIZATION_FIELDS.includes('memoryReadApproved'));
  assert.ok(REQUIRED_OUTPUT_POLICY_FIELDS.includes('pathEndpointValueAllowed'));
  assert.ok(REQUIRED_RECEIPT_PLAN_FIELDS.includes('includeReadinessClaim'));
  assert.ok(STOP_CONDITION_FIELDS.includes('onReadinessClaim'));
  assert.ok(FORBIDDEN_EXPANSION_FIELDS.includes('allowRawOutputPersistence'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('exactApprovalLine'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rawRagInjectedContext'));
});

test('CM1698 helper never performs runtime provider memory public MCP or readiness actions', () => {
  const result = buildVcpToolBoxExactTargetDiscoveryPacketPreflight(packet());

  assert.equal(result.accepted, true);
  assert.equal(result.targetSpecificRuntimeInspectionAllowedByThisHelper, false);
  assert.equal(result.runtimeExecutionAllowedByThisHelper, false);
  assert.equal(result.targetDiscoveryExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
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
