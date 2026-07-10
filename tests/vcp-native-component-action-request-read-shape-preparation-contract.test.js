'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  ZERO_COUNTERS,
  buildVcpNativeComponentActionRequestReadShapePreparationContract
} = require('../src/core/VcpNativeComponentActionRequestReadShapePreparationContract');

function contractInput(overrides = {}) {
  return {
    schemaVersion: 1,
    taskId: 'CM-1959',
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    priorStatusEvidence: {
      lane: 'prior_status_evidence',
      sourceRouteTaskId: 'CM-1957',
      priorReceiptTaskId: 'CM-1956',
      componentActionRouteProbeCategory: 'route_status_known',
      routeStatusCategory: 'status_only_known',
      statusClass: 'client_error',
      requestBodyShapeCategory: 'minimal_component_action_route_status_payload_category_only',
      requestBodyGeneratedByPriorProbe: true,
      concreteRequestBodyOutput: false,
      requestBodyPersisted: false,
      responseBodyRead: false,
      rawErrorPayloadRead: false,
      endpointDisclosed: false,
      locatorValueDisclosed: false,
      memoryRead: false,
      memoryWritten: false,
      retryAllowed: false,
      readShapeUnlocked: false,
      readinessClaimed: false
    },
    componentActionBinding: {
      lane: 'component_action_binding',
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      component: 'KnowledgeBaseManager',
      action: 'knowledge_base.search',
      currentStatus: 'safe_identifiers_known',
      rawPluginConfigRead: false,
      privateMemoryContentRead: false,
      providerPayloadRead: false,
      endpointDisclosed: false,
      locatorValueDisclosed: false
    },
    clientErrorRequestDiagnosisBoundary: {
      lane: 'client_error_request_diagnosis_boundary',
      currentStatus: 'status_only_client_error_known',
      diagnosisPerformedNow: false,
      rawErrorPayloadReadAllowed: false,
      responseBodyReadAllowed: false,
      concreteRequestBodyAllowed: false,
      queryTextAllowed: false,
      memoryContentAllowed: false,
      endpointLocatorAllowed: false,
      configEnvAllowed: false,
      authMaterialAllowed: false
    },
    actionSuccessPreconditions: {
      lane: 'action_success_preconditions',
      currentStatus: 'unproven',
      successClaimAllowedNow: false,
      futureExactApprovalRequired: true,
      exactBoundedActionPurposeRequired: true,
      safeTargetReferenceRequired: true,
      safeComponentActionIdentifiersRequired: true,
      requestBodyShapeCategoryRequired: true,
      maxRuntimeNetworkCallCountRequired: true,
      zeroWriteRuleRequired: true,
      lowDisclosureResultProjectionRequired: true,
      abortOnRawPrivateOutputRequired: true
    },
    responseShapeBoundary: {
      lane: 'response_shape_boundary',
      currentStatus: 'unknown',
      inspectResponseShapeNow: false,
      futureExactApprovalRequired: true,
      responseShapeCategoryMayBeProjectedLater: true,
      topLevelKindCategoryMayBeProjectedLater: true,
      itemCountBucketMayBeProjectedLater: true,
      fieldNameDisclosurePolicyRequired: true,
      memoryContentDisclosed: false,
      rawResponseBodyPersisted: false,
      rawErrorPayloadPersisted: false,
      rawResponseBodyAllowed: false,
      rawErrorPayloadAllowed: false,
      privateMemoryTextAllowed: false,
      memoryIdsAllowed: false,
      endpointLocatorAllowed: false,
      configEnvAllowed: false,
      tokenSecretAllowed: false,
      logsStdoutStderrAllowed: false,
      providerPayloadAllowed: false,
      approvalLineAllowed: false
    },
    readShapeApprovalPreconditions: {
      lane: 'read_shape_approval_preconditions',
      currentStatus: 'not_authorized',
      readShapeAllowedNow: false,
      futureExactApprovalRequired: true,
      purposeRequired: true,
      targetReferenceRequired: true,
      componentActionIdentifiersRequired: true,
      queryBoundaryRequired: true,
      maxResultCountRequired: true,
      maxRuntimeNetworkCallCountRequired: true,
      outputDisclosureLimitRequired: true,
      zeroWriteRuleRequired: true,
      noBroadScanRuleRequired: true,
      rawPrivateOutputAbortRuleRequired: true,
      lowDisclosureReceiptProjectionRequired: true
    },
    zeroWriteRawOutputBoundary: {
      lane: 'zero_write_zero_raw_output_boundary',
      currentStatus: 'zero_required',
      memoryWrites: 0,
      durableWrites: 0,
      responseBodyReads: 0,
      rawErrorReads: 0,
      logsStdoutStderrReads: 0,
      configEnvSecretReads: 0,
      rawMemoryStoreAuditReads: 0,
      endpointLocatorDisclosures: 0,
      concreteRequestBodyOutputOrPersistence: 0,
      approvalLineGeneration: 0,
      runtimeConfigStartupWatchdogDependencyMutation: 0,
      publicMcpExpansion: 0,
      pushTagReleaseDeployCutover: 0,
      readinessClaims: 0
    },
    approvalBoundary: {
      lane: 'approval_boundary',
      nextExactApprovalRequired: true,
      currentExactApprovalPresent: false,
      approvalLineGenerated: false,
      liveExecutionAllowedNow: false,
      diagnosisAllowedNow: false,
      responseShapeInspectionAllowedNow: false,
      readShapeProofAllowedNow: false,
      memoryReadAllowedNow: false,
      memoryWriteAllowedNow: false,
      readinessClaim: false
    },
    counters: { ...ZERO_COUNTERS },
    ...overrides
  };
}

test('CM1959 accepts low-disclosure request/read-shape preparation contract', () => {
  const result = buildVcpNativeComponentActionRequestReadShapePreparationContract(contractInput());

  assert.equal(result.accepted, true);
  assert.equal(result.requestReadShapePreparationContractLocked, true);
  assert.deepEqual(result.lowDisclosureProjection, {
    taskId: 'CM-1959',
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    component: 'KnowledgeBaseManager',
    action: 'knowledge_base.search',
    statusClass: 'client_error',
    routeStatusCategory: 'status_only_known'
  });
  assert.deepEqual(result.request_read_shape_preparation_result, {
    accepted: true,
    priorStatusOnlyClientErrorAccepted: true,
    componentActionIdentifiersKnown: true,
    clientErrorRequestDiagnosisBoundaryDefined: true,
    actionSuccessPreconditionsDefined: true,
    responseShapeBoundaryDefined: true,
    readShapeApprovalPreconditionsDefined: true,
    zeroWriteRawOutputBoundaryLocked: true,
    actionSuccessProven: false,
    responseShapeKnown: false,
    readShapeUnlocked: false,
    nextExactApprovalRequired: true
  });
  assert.equal(result.clientErrorDiagnosed, false);
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.networkCalled, false);
  assert.equal(result.concreteRequestBodyGenerated, false);
  assert.equal(result.responseShapeInspected, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.readShapeProofPerformed, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1959 rejects raw sensitive request/read-shape material without echo', () => {
  const result = buildVcpNativeComponentActionRequestReadShapePreparationContract(contractInput({
    endpoint: 'SENSITIVE_SAMPLE_ENDPOINT_SHOULD_NOT_ECHO',
    locatorValue: 'SENSITIVE_SAMPLE_LOCATOR_SHOULD_NOT_ECHO',
    token: 'SENSITIVE_SAMPLE_TOKEN_SHOULD_NOT_ECHO',
    requestBody: 'SENSITIVE_SAMPLE_REQUEST_BODY_SHOULD_NOT_ECHO',
    queryText: 'SENSITIVE_SAMPLE_QUERY_SHOULD_NOT_ECHO',
    rawErrorPayload: 'SENSITIVE_SAMPLE_ERROR_SHOULD_NOT_ECHO',
    rawResponseBody: 'SENSITIVE_SAMPLE_RESPONSE_SHOULD_NOT_ECHO',
    responseShapeKeys: ['SENSITIVE_SAMPLE_SHAPE_SHOULD_NOT_ECHO'],
    memoryIds: ['SENSITIVE_SAMPLE_MEMORY_ID_SHOULD_NOT_ECHO'],
    rawMemoryText: 'SENSITIVE_SAMPLE_MEMORY_TEXT_SHOULD_NOT_ECHO',
    approvalLineText: 'SENSITIVE_SAMPLE_APPROVAL_LINE_SHOULD_NOT_ECHO',
    providerPayload: 'SENSITIVE_SAMPLE_PROVIDER_PAYLOAD_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_request_read_shape_preparation_material');
  assert.ok(result.forbiddenFields.includes('endpoint'));
  assert.ok(result.forbiddenFields.includes('locatorValue'));
  assert.ok(result.forbiddenFields.includes('token'));
  assert.ok(result.forbiddenFields.includes('requestBody'));
  assert.ok(result.forbiddenFields.includes('queryText'));
  assert.ok(result.forbiddenFields.includes('rawErrorPayload'));
  assert.ok(result.forbiddenFields.includes('rawResponseBody'));
  assert.ok(result.forbiddenFields.includes('responseShapeKeys'));
  assert.ok(result.forbiddenFields.includes('memoryIds'));
  assert.ok(result.forbiddenFields.includes('rawMemoryText'));
  assert.ok(result.forbiddenFields.includes('approvalLineText'));
  assert.ok(result.forbiddenFields.includes('providerPayload'));
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_LOCATOR_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_QUERY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_ERROR_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_RESPONSE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_SHAPE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_MEMORY_ID_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_MEMORY_TEXT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_APPROVAL_LINE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE_PROVIDER_PAYLOAD_SHOULD_NOT_ECHO'), false);
});

test('CM1959 rejects diagnosis success response-shape read-shape and readiness drift', () => {
  const result = buildVcpNativeComponentActionRequestReadShapePreparationContract(contractInput({
    clientErrorRequestDiagnosisBoundary: {
      ...contractInput().clientErrorRequestDiagnosisBoundary,
      diagnosisPerformedNow: true,
      rawErrorPayloadReadAllowed: true,
      responseBodyReadAllowed: true,
      concreteRequestBodyAllowed: true,
      queryTextAllowed: true,
      memoryContentAllowed: true
    },
    actionSuccessPreconditions: {
      ...contractInput().actionSuccessPreconditions,
      currentStatus: 'proven',
      successClaimAllowedNow: true,
      futureExactApprovalRequired: false
    },
    responseShapeBoundary: {
      ...contractInput().responseShapeBoundary,
      currentStatus: 'known',
      inspectResponseShapeNow: true,
      rawResponseBodyAllowed: true,
      memoryIdsAllowed: true,
      approvalLineAllowed: true
    },
    readShapeApprovalPreconditions: {
      ...contractInput().readShapeApprovalPreconditions,
      currentStatus: 'authorized',
      readShapeAllowedNow: true,
      futureExactApprovalRequired: false
    },
    approvalBoundary: {
      ...contractInput().approvalBoundary,
      nextExactApprovalRequired: false,
      currentExactApprovalPresent: true,
      approvalLineGenerated: true,
      liveExecutionAllowedNow: true,
      diagnosisAllowedNow: true,
      responseShapeInspectionAllowedNow: true,
      readShapeProofAllowedNow: true,
      memoryReadAllowedNow: true,
      memoryWriteAllowedNow: true,
      readinessClaim: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_request_read_shape_preparation_contract');
  assert.ok(result.invalidFields.includes('clientErrorRequestDiagnosisBoundary.diagnosisPerformedNow'));
  assert.ok(result.invalidFields.includes('actionSuccessPreconditions.currentStatus'));
  assert.ok(result.invalidFields.includes('actionSuccessPreconditions.successClaimAllowedNow'));
  assert.ok(result.invalidFields.includes('responseShapeBoundary.inspectResponseShapeNow'));
  assert.ok(result.invalidFields.includes('responseShapeBoundary.rawResponseBodyAllowed'));
  assert.ok(result.invalidFields.includes('readShapeApprovalPreconditions.readShapeAllowedNow'));
  assert.ok(result.invalidFields.includes('approvalBoundary.readShapeProofAllowedNow'));
  assert.equal(result.request_read_shape_preparation_result.readShapeUnlocked, false);
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1959 rejects unknown fields and nonzero counters', () => {
  const unknown = buildVcpNativeComponentActionRequestReadShapePreparationContract(contractInput({
    responseShapeKnown: true
  }));
  const counters = buildVcpNativeComponentActionRequestReadShapePreparationContract(contractInput({
    counters: {
      ...ZERO_COUNTERS,
      runtimeCalls: 1,
      clientErrorDiagnoses: 1,
      responseShapeInspections: 1,
      readShapeProofs: 1,
      memoryWrites: 1,
      readinessClaims: 1,
      unknownCounter: 0
    }
  }));

  assert.equal(unknown.accepted, false);
  assert.equal(unknown.reasonCode, 'unknown_request_read_shape_preparation_fields_not_allowed');
  assert.deepEqual(unknown.unknownFields, ['responseShapeKnown']);

  assert.equal(counters.accepted, false);
  assert.equal(counters.reasonCode, 'non_zero_or_unknown_request_read_shape_preparation_counters');
  assert.ok(counters.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(counters.forbiddenCounters.includes('clientErrorDiagnoses'));
  assert.ok(counters.forbiddenCounters.includes('responseShapeInspections'));
  assert.ok(counters.forbiddenCounters.includes('readShapeProofs'));
  assert.ok(counters.forbiddenCounters.includes('memoryWrites'));
  assert.ok(counters.forbiddenCounters.includes('readinessClaims'));
  assert.ok(counters.forbiddenCounters.includes('unknownCounter'));
});

test('CM1959 rejects invalid prior status target and component/action identifiers without echo', () => {
  const invalidPrior = buildVcpNativeComponentActionRequestReadShapePreparationContract(contractInput({
    priorStatusEvidence: {
      ...contractInput().priorStatusEvidence,
      routeStatusCategory: 'success',
      statusClass: 'success',
      responseBodyRead: true,
      readShapeUnlocked: true
    }
  }));
  const unsafeTarget = buildVcpNativeComponentActionRequestReadShapePreparationContract(contractInput({
    targetReferenceName: 'SENSITIVE_SAMPLE/LOCATOR/SHOULD_NOT_ECHO',
    componentActionBinding: {
      ...contractInput().componentActionBinding,
      targetReferenceName: 'SENSITIVE_SAMPLE/LOCATOR/SHOULD_NOT_ECHO'
    }
  }));
  const invalidIdentifier = buildVcpNativeComponentActionRequestReadShapePreparationContract(contractInput({
    componentActionBinding: {
      ...contractInput().componentActionBinding,
      component: 'UnknownComponent',
      action: 'unknown.action'
    }
  }));
  const serialized = JSON.stringify(unsafeTarget);

  assert.equal(invalidPrior.accepted, false);
  assert.equal(invalidPrior.reasonCode, 'invalid_request_read_shape_preparation_contract');
  assert.ok(invalidPrior.invalidFields.includes('priorStatusEvidence.routeStatusCategory'));
  assert.ok(invalidPrior.invalidFields.includes('priorStatusEvidence.statusClass'));
  assert.ok(invalidPrior.invalidFields.includes('priorStatusEvidence.responseBodyRead'));
  assert.ok(invalidPrior.invalidFields.includes('priorStatusEvidence.readShapeUnlocked'));

  assert.equal(unsafeTarget.accepted, false);
  assert.equal(unsafeTarget.reasonCode, 'invalid_request_read_shape_preparation_contract');
  assert.ok(unsafeTarget.invalidFields.includes('targetReferenceName'));
  assert.ok(unsafeTarget.invalidFields.includes('componentActionBinding.targetReferenceName'));
  assert.equal(unsafeTarget.lowDisclosureProjection.targetReferenceName, null);
  assert.equal(serialized.includes('SENSITIVE_SAMPLE/LOCATOR/SHOULD_NOT_ECHO'), false);

  assert.equal(invalidIdentifier.accepted, false);
  assert.equal(invalidIdentifier.reasonCode, 'invalid_request_read_shape_preparation_contract');
  assert.ok(invalidIdentifier.invalidFields.includes('componentActionBinding.component'));
  assert.ok(invalidIdentifier.invalidFields.includes('componentActionBinding.action'));
});

test('CM1959 reports missing required lane fields', () => {
  const input = contractInput();
  delete input.priorStatusEvidence.statusClass;
  delete input.clientErrorRequestDiagnosisBoundary.currentStatus;
  delete input.actionSuccessPreconditions.futureExactApprovalRequired;
  delete input.responseShapeBoundary.inspectResponseShapeNow;
  delete input.readShapeApprovalPreconditions.queryBoundaryRequired;
  delete input.zeroWriteRawOutputBoundary.memoryWrites;
  delete input.approvalBoundary.nextExactApprovalRequired;

  const result = buildVcpNativeComponentActionRequestReadShapePreparationContract(input);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'missing_required_request_read_shape_preparation_fields');
  assert.ok(result.missingFields.includes('priorStatusEvidence.statusClass'));
  assert.ok(result.missingFields.includes('clientErrorRequestDiagnosisBoundary.currentStatus'));
  assert.ok(result.missingFields.includes('actionSuccessPreconditions.futureExactApprovalRequired'));
  assert.ok(result.missingFields.includes('responseShapeBoundary.inspectResponseShapeNow'));
  assert.ok(result.missingFields.includes('readShapeApprovalPreconditions.queryBoundaryRequired'));
  assert.ok(result.missingFields.includes('zeroWriteRawOutputBoundary.memoryWrites'));
  assert.ok(result.missingFields.includes('approvalBoundary.nextExactApprovalRequired'));
});

test('CM1959 public MCP surface is unchanged', () => {
  assert.deepEqual(TOOL_DEFINITIONS.map(tool => tool.name).sort(), [
    'audit_memory',
    'memory_overview',
  'prepare_memory_context',
'propose_memory_delta',
'record_memory',
    'search_memory',
    'supersede_memory',
    'tombstone_memory',
    'validate_memory'
  ]);
});
