'use strict';

const CONTRACT_NAME = 'NativeWriteRealRootProofReadinessGate';
const CONTRACT_MODE = 'local_phase8_real_root_write_proof_readiness_gate_only';
const SCHEMA_VERSION = 1;

const ALLOWED_MODES = Object.freeze([
  'local-readiness-gate'
]);

const ALLOWED_DECISIONS = Object.freeze([
  'real_root_write_approval_request_ready_no_execution',
  'real_root_write_readiness_blocked_missing_prerequisites',
  'stop_l4'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'mode',
  'p8ContractEvidence',
  'approvalRequest',
  'runtimeTarget',
  'realRootProofPlan',
  'rollbackDrillPlan',
  'failureRecoveryPlan',
  'auditPlan',
  'output',
  'expectedDecision',
  'counters'
]);

const REQUIRED_P8_CONTRACT_FIELDS = Object.freeze([
  'nativeWriteContractPreflightAccepted',
  'prepareWriteDefined',
  'commitWriteDefined',
  'verifyWriteDefined',
  'rollbackOrCompensateDefined',
  'operatorFullSurfaceProofAccepted',
  'defaultSurfacePreserved',
  'commitMemoryDeltaNotPublic'
]);

const REQUIRED_APPROVAL_REQUEST_FIELDS = Object.freeze([
  'approvalRequestPrepared',
  'approvalRequestSubmitted',
  'exactApprovalAccepted',
  'freshCurrentSingleUseApproval',
  'operatorIntentScopeBound',
  'taskScopeBound',
  'approvalLineGenerated',
  'approvalLineValueDisclosed',
  'durableWriteAuthorized',
  'providerApiAuthorized',
  'releaseDeployCutoverAuthorized',
  'readinessClaimAuthorized'
]);

const REQUIRED_RUNTIME_TARGET_FIELDS = Object.freeze([
  'targetReferencePrepared',
  'targetReferenceCategory',
  'realRootTargetRequired',
  'realRootTargetEvidencePresent',
  'endpointLocatorDisclosed',
  'rawRuntimeStateDisclosed',
  'vcpToolBoxRootModified'
]);

const REQUIRED_REAL_ROOT_PROOF_FIELDS = Object.freeze([
  'realRootDurableWriteRequired',
  'nativeSideEffectReceiptRequired',
  'verifyWriteRequired',
  'scopeIsolationRequired',
  'realRootDurableWriteObserved',
  'nativeSideEffectReceiptObserved',
  'verifyWritePassed',
  'scopeIsolationVerified'
]);

const REQUIRED_ROLLBACK_DRILL_FIELDS = Object.freeze([
  'rollbackDrillRequired',
  'rollbackPlanPrepared',
  'rollbackPlanLowDisclosure',
  'rollbackDrillExecuted',
  'rollbackReceiptObserved',
  'compensationPathDefined'
]);

const REQUIRED_FAILURE_RECOVERY_FIELDS = Object.freeze([
  'failureRecoveryRequired',
  'failureRecoveryPlanPrepared',
  'partialWriteRecoveryDefined',
  'retryBudgetBounded',
  'manualEscalationDefined',
  'failureRecoveryDrillExecuted',
  'failureRecoveryReceiptObserved'
]);

const REQUIRED_AUDIT_FIELDS = Object.freeze([
  'auditReceiptRequired',
  'lowDisclosureAuditReceiptPlanned',
  'nativeSideEffectReceiptLinkPlanned',
  'rollbackReceiptLinkPlanned',
  'rawAuditIncluded'
]);

const REQUIRED_OUTPUT_FIELDS = Object.freeze([
  'lowDisclosureOnly',
  'categoryOnlyApprovalRequest',
  'rawValuesIncluded',
  'endpointLocatorIncluded',
  'requestBodyIncluded',
  'responseBodyIncluded',
  'rawMemoryIncluded',
  'readinessClaimIncluded'
]);

const COUNTER_FIELDS = Object.freeze([
  'approvalRequestsSubmitted',
  'approvalLineOperations',
  'runtimeCalls',
  'liveVcpToolBoxCalls',
  'nativeWriteAttempts',
  'memoryWrites',
  'durableMemoryWrites',
  'rollbackExecutions',
  'failureRecoveryExecutions',
  'providerApiCalls',
  'publicMcpExpansions',
  'releaseDeployCutoverActions',
  'readinessClaims'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'rawPayload',
  'raw_payload',
  'rawOutput',
  'raw_output',
  'rawPrivatePayload',
  'raw_private_payload',
  'requestPayload',
  'request_payload',
  'responsePayload',
  'response_payload',
  'requestBody',
  'request_body',
  'responseBody',
  'response_body',
  'rawError',
  'raw_error',
  'memoryContent',
  'memory_content',
  'rawMemory',
  'raw_memory',
  'rawAudit',
  'raw_audit',
  'rawAuditRow',
  'rawSqliteRow',
  'rawJsonlRow',
  'rawVectorRow',
  'secret',
  'secrets',
  'credential',
  'credentials',
  'token',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'privateKey',
  'endpoint',
  'locator',
  'runtimeLocator',
  'targetValue',
  'workspaceId',
  'ownerId',
  'clientId',
  'approvalLine',
  'approvalLineValue',
  'approval_line_value',
  'runtimeCommand',
  'providerPayload',
  'rollbackPayload',
  'failurePayload',
  'productionReady',
  'releaseReady',
  'deployReady',
  'cutoverReady',
  'rcReady',
  'RC_READY',
  'completeV8',
  'fullBridgeCompletion'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(value, field) {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function pathJoin(prefix, key) {
  return prefix ? `${prefix}.${key}` : key;
}

function missingFields(required, value, prefix = '') {
  const actual = isPlainObject(value) ? value : {};
  return required
    .filter(field => !hasOwn(actual, field))
    .map(field => pathJoin(prefix, field));
}

function collectForbiddenFields(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectForbiddenFields(item, `${prefix}[${index}]`));
  }
  if (!isPlainObject(value)) return [];

  const found = [];
  for (const [key, nested] of Object.entries(value)) {
    const path = pathJoin(prefix, key);
    if (FORBIDDEN_FIELD_NAMES.includes(key)) {
      found.push(path);
      continue;
    }
    found.push(...collectForbiddenFields(nested, path));
  }
  return found;
}

function collectUnexpectedKeys(value, allowedFields, prefix = '') {
  if (!isPlainObject(value)) return [];
  return Object.keys(value)
    .filter(key => !allowedFields.includes(key))
    .map(key => pathJoin(prefix, key));
}

function collectUnexpectedFields(input) {
  if (!isPlainObject(input)) return [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(input.p8ContractEvidence, REQUIRED_P8_CONTRACT_FIELDS, 'p8ContractEvidence'),
    ...collectUnexpectedKeys(input.approvalRequest, REQUIRED_APPROVAL_REQUEST_FIELDS, 'approvalRequest'),
    ...collectUnexpectedKeys(input.runtimeTarget, REQUIRED_RUNTIME_TARGET_FIELDS, 'runtimeTarget'),
    ...collectUnexpectedKeys(input.realRootProofPlan, REQUIRED_REAL_ROOT_PROOF_FIELDS, 'realRootProofPlan'),
    ...collectUnexpectedKeys(input.rollbackDrillPlan, REQUIRED_ROLLBACK_DRILL_FIELDS, 'rollbackDrillPlan'),
    ...collectUnexpectedKeys(input.failureRecoveryPlan, REQUIRED_FAILURE_RECOVERY_FIELDS, 'failureRecoveryPlan'),
    ...collectUnexpectedKeys(input.auditPlan, REQUIRED_AUDIT_FIELDS, 'auditPlan'),
    ...collectUnexpectedKeys(input.output, REQUIRED_OUTPUT_FIELDS, 'output'),
    ...collectUnexpectedKeys(input.counters, COUNTER_FIELDS, 'counters')
  ];
}

function invalidCounters(counters) {
  if (!isPlainObject(counters)) return [...COUNTER_FIELDS];
  return COUNTER_FIELDS.filter(field => !Number.isInteger(counters[field]) || counters[field] < 0);
}

function nonZeroCounters(counters) {
  if (!isPlainObject(counters)) return [...COUNTER_FIELDS];
  return COUNTER_FIELDS.filter(field => counters[field] !== 0);
}

function missingTrueFields(value, fields, prefix) {
  return fields
    .filter(field => value[field] !== true)
    .map(field => pathJoin(prefix, field));
}

function trueFields(value, fields, prefix) {
  return fields
    .filter(field => value[field] === true)
    .map(field => pathJoin(prefix, field));
}

function buildStopBlockers(input) {
  return [
    ...trueFields(input.approvalRequest, [
      'approvalRequestSubmitted',
      'exactApprovalAccepted',
      'freshCurrentSingleUseApproval',
      'approvalLineGenerated',
      'approvalLineValueDisclosed',
      'durableWriteAuthorized',
      'providerApiAuthorized',
      'releaseDeployCutoverAuthorized',
      'readinessClaimAuthorized'
    ], 'approvalRequest'),
    ...trueFields(input.runtimeTarget, [
      'endpointLocatorDisclosed',
      'rawRuntimeStateDisclosed',
      'vcpToolBoxRootModified'
    ], 'runtimeTarget'),
    ...trueFields(input.realRootProofPlan, [
      'realRootDurableWriteObserved',
      'nativeSideEffectReceiptObserved',
      'verifyWritePassed',
      'scopeIsolationVerified'
    ], 'realRootProofPlan'),
    ...trueFields(input.rollbackDrillPlan, [
      'rollbackDrillExecuted',
      'rollbackReceiptObserved'
    ], 'rollbackDrillPlan'),
    ...trueFields(input.failureRecoveryPlan, [
      'failureRecoveryDrillExecuted',
      'failureRecoveryReceiptObserved'
    ], 'failureRecoveryPlan'),
    ...trueFields(input.auditPlan, [
      'rawAuditIncluded'
    ], 'auditPlan'),
    ...trueFields(input.output, [
      'rawValuesIncluded',
      'endpointLocatorIncluded',
      'requestBodyIncluded',
      'responseBodyIncluded',
      'rawMemoryIncluded',
      'readinessClaimIncluded'
    ], 'output'),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
}

function buildPrerequisiteBlockers(input) {
  const blockers = [
    ...missingTrueFields(input.p8ContractEvidence, REQUIRED_P8_CONTRACT_FIELDS, 'p8ContractEvidence')
  ];

  if (input.approvalRequest.approvalRequestPrepared !== true) {
    blockers.push('approvalRequest.approvalRequestPrepared');
  }
  if (input.approvalRequest.operatorIntentScopeBound !== true) {
    blockers.push('approvalRequest.operatorIntentScopeBound');
  }
  if (input.approvalRequest.taskScopeBound !== true) {
    blockers.push('approvalRequest.taskScopeBound');
  }
  if (input.runtimeTarget.targetReferencePrepared !== true) {
    blockers.push('runtimeTarget.targetReferencePrepared');
  }
  if (input.runtimeTarget.realRootTargetRequired !== true) {
    blockers.push('runtimeTarget.realRootTargetRequired');
  }
  if (input.runtimeTarget.realRootTargetEvidencePresent !== true) {
    blockers.push('runtimeTarget.realRootTargetEvidencePresent');
  }
  if (input.realRootProofPlan.realRootDurableWriteRequired !== true) {
    blockers.push('realRootProofPlan.realRootDurableWriteRequired');
  }
  if (input.realRootProofPlan.nativeSideEffectReceiptRequired !== true) {
    blockers.push('realRootProofPlan.nativeSideEffectReceiptRequired');
  }
  if (input.realRootProofPlan.verifyWriteRequired !== true) {
    blockers.push('realRootProofPlan.verifyWriteRequired');
  }
  if (input.realRootProofPlan.scopeIsolationRequired !== true) {
    blockers.push('realRootProofPlan.scopeIsolationRequired');
  }
  if (input.rollbackDrillPlan.rollbackDrillRequired !== true) {
    blockers.push('rollbackDrillPlan.rollbackDrillRequired');
  }
  if (input.rollbackDrillPlan.rollbackPlanPrepared !== true) {
    blockers.push('rollbackDrillPlan.rollbackPlanPrepared');
  }
  if (input.rollbackDrillPlan.rollbackPlanLowDisclosure !== true) {
    blockers.push('rollbackDrillPlan.rollbackPlanLowDisclosure');
  }
  if (input.rollbackDrillPlan.compensationPathDefined !== true) {
    blockers.push('rollbackDrillPlan.compensationPathDefined');
  }
  if (input.failureRecoveryPlan.failureRecoveryRequired !== true) {
    blockers.push('failureRecoveryPlan.failureRecoveryRequired');
  }
  if (input.failureRecoveryPlan.failureRecoveryPlanPrepared !== true) {
    blockers.push('failureRecoveryPlan.failureRecoveryPlanPrepared');
  }
  if (input.failureRecoveryPlan.partialWriteRecoveryDefined !== true) {
    blockers.push('failureRecoveryPlan.partialWriteRecoveryDefined');
  }
  if (input.failureRecoveryPlan.retryBudgetBounded !== true) {
    blockers.push('failureRecoveryPlan.retryBudgetBounded');
  }
  if (input.failureRecoveryPlan.manualEscalationDefined !== true) {
    blockers.push('failureRecoveryPlan.manualEscalationDefined');
  }
  if (input.auditPlan.auditReceiptRequired !== true) {
    blockers.push('auditPlan.auditReceiptRequired');
  }
  if (input.auditPlan.lowDisclosureAuditReceiptPlanned !== true) {
    blockers.push('auditPlan.lowDisclosureAuditReceiptPlanned');
  }
  if (input.auditPlan.nativeSideEffectReceiptLinkPlanned !== true) {
    blockers.push('auditPlan.nativeSideEffectReceiptLinkPlanned');
  }
  if (input.auditPlan.rollbackReceiptLinkPlanned !== true) {
    blockers.push('auditPlan.rollbackReceiptLinkPlanned');
  }
  if (input.output.lowDisclosureOnly !== true) {
    blockers.push('output.lowDisclosureOnly');
  }
  if (input.output.categoryOnlyApprovalRequest !== true) {
    blockers.push('output.categoryOnlyApprovalRequest');
  }

  return blockers;
}

function computeDecision(input) {
  const stopBlockers = buildStopBlockers(input);
  if (stopBlockers.length > 0) {
    return { decision: 'stop_l4', blockers: stopBlockers };
  }

  const prerequisiteBlockers = buildPrerequisiteBlockers(input);
  if (prerequisiteBlockers.length > 0) {
    return {
      decision: 'real_root_write_readiness_blocked_missing_prerequisites',
      blockers: prerequisiteBlockers
    };
  }

  return {
    decision: 'real_root_write_approval_request_ready_no_execution',
    blockers: []
  };
}

function failure(reasonCode, extras = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    blockers: [],
    approvalRequestReady: false,
    productionWriteProven: false,
    realRootDurableWriteProven: false,
    runtimeCalled: false,
    nativeWriteExecuted: false,
    rollbackDrillExecuted: false,
    failureRecoveryExecuted: false,
    durableMutationPerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    releaseDeployCutoverPerformed: false,
    readinessClaimed: false,
    ...extras
  };
}

function evaluateNativeWriteRealRootProofReadinessGate(input) {
  if (!isPlainObject(input)) {
    return failure('invalid_input');
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_or_overclaim_fields', {
      forbiddenFields
    });
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_P8_CONTRACT_FIELDS, input.p8ContractEvidence, 'p8ContractEvidence'),
    ...missingFields(REQUIRED_APPROVAL_REQUEST_FIELDS, input.approvalRequest, 'approvalRequest'),
    ...missingFields(REQUIRED_RUNTIME_TARGET_FIELDS, input.runtimeTarget, 'runtimeTarget'),
    ...missingFields(REQUIRED_REAL_ROOT_PROOF_FIELDS, input.realRootProofPlan, 'realRootProofPlan'),
    ...missingFields(REQUIRED_ROLLBACK_DRILL_FIELDS, input.rollbackDrillPlan, 'rollbackDrillPlan'),
    ...missingFields(REQUIRED_FAILURE_RECOVERY_FIELDS, input.failureRecoveryPlan, 'failureRecoveryPlan'),
    ...missingFields(REQUIRED_AUDIT_FIELDS, input.auditPlan, 'auditPlan'),
    ...missingFields(REQUIRED_OUTPUT_FIELDS, input.output, 'output'),
    ...missingFields(COUNTER_FIELDS, input.counters, 'counters')
  ];
  if (missing.length > 0) {
    return failure('missing_required_fields', { missingFields: missing });
  }

  const unexpected = collectUnexpectedFields(input);
  if (unexpected.length > 0) {
    return failure('unexpected_fields', { unexpectedFields: unexpected });
  }

  if (input.schemaVersion !== SCHEMA_VERSION) {
    return failure('invalid_schema_version');
  }

  if (!/^CM-[0-9]{4}$/.test(input.taskId)) {
    return failure('invalid_task_id');
  }

  if (!ALLOWED_MODES.includes(input.mode)) {
    return failure('invalid_mode');
  }

  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) {
    return failure('invalid_expected_decision');
  }

  const invalidCounterFields = invalidCounters(input.counters);
  if (invalidCounterFields.length > 0) {
    return failure('invalid_counters', { invalidCounterFields });
  }

  const computed = computeDecision(input);
  if (computed.decision !== input.expectedDecision) {
    return failure('decision_mismatch', {
      expectedDecision: input.expectedDecision,
      computedDecision: computed.decision,
      blockers: computed.blockers
    });
  }

  const ready = computed.decision === 'real_root_write_approval_request_ready_no_execution';
  return {
    accepted: ready,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: computed.decision,
    blockers: computed.blockers,
    approvalRequestReady: ready,
    approvalRequestSubmitted: false,
    exactApprovalAccepted: false,
    productionWriteProven: false,
    realRootDurableWriteProven: false,
    nextGate: ready
      ? 'await_fresh_exact_approval_before_real_root_write_execution'
      : 'complete_missing_real_root_write_readiness_prerequisites',
    lowDisclosureReceipt: {
      taskId: input.taskId,
      phase: 'Phase 8',
      decision: computed.decision,
      targetReferenceCategory: input.runtimeTarget.targetReferenceCategory,
      approvalRequestPrepared: input.approvalRequest.approvalRequestPrepared,
      realRootTargetEvidencePresent: input.runtimeTarget.realRootTargetEvidencePresent,
      rollbackPlanPrepared: input.rollbackDrillPlan.rollbackPlanPrepared,
      failureRecoveryPlanPrepared: input.failureRecoveryPlan.failureRecoveryPlanPrepared,
      lowDisclosure: true,
      rawValuesIncluded: false,
      endpointLocatorIncluded: false,
      approvalLineValueDisclosed: false,
      memoryWritten: false,
      durableWrite: false,
      readinessClaimed: false
    },
    runtimeCalled: false,
    liveVcpToolBoxCalled: false,
    nativeWriteExecuted: false,
    rollbackDrillExecuted: false,
    failureRecoveryExecuted: false,
    durableMutationPerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    releaseDeployCutoverPerformed: false,
    readinessClaimed: false
  };
}

module.exports = {
  ALLOWED_DECISIONS,
  ALLOWED_MODES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  COUNTER_FIELDS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_APPROVAL_REQUEST_FIELDS,
  REQUIRED_AUDIT_FIELDS,
  REQUIRED_FAILURE_RECOVERY_FIELDS,
  REQUIRED_OUTPUT_FIELDS,
  REQUIRED_P8_CONTRACT_FIELDS,
  REQUIRED_REAL_ROOT_PROOF_FIELDS,
  REQUIRED_ROLLBACK_DRILL_FIELDS,
  REQUIRED_RUNTIME_TARGET_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluateNativeWriteRealRootProofReadinessGate
};
