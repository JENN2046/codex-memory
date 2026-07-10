'use strict';

const CONTRACT_NAME = 'Phase2NativeReadProofReadinessGate';
const CONTRACT_MODE = 'local_phase2_native_read_proof_readiness_gate_only';
const SCHEMA_VERSION = 1;

const ALLOWED_MODES = Object.freeze([
  'local-readiness-gate'
]);

const ALLOWED_DECISIONS = Object.freeze([
  'native_read_proof_approval_request_ready_no_execution',
  'native_read_proof_readiness_blocked_missing_prerequisites',
  'stop_l4'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'mode',
  'phase2GateEvidence',
  'approvalRequest',
  'runtimeTarget',
  'liveReadPlan',
  'fallbackPlan',
  'auditPlan',
  'output',
  'expectedDecision',
  'counters'
]);

const REQUIRED_PHASE2_GATE_FIELDS = Object.freeze([
  'evidenceGateImplemented',
  'evidenceGateFailClosed',
  'defaultSurfaceBoundaryModeled',
  'forbiddenDefaultMutationToolsModeled',
  'lowDisclosureInputGuardModeled',
  'completionAuditStillRequiresReceipts'
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
  'liveReadAuthorized',
  'serviceStartAuthorized',
  'processInspectionAuthorized',
  'providerApiAuthorized',
  'readinessClaimAuthorized'
]);

const REQUIRED_RUNTIME_TARGET_FIELDS = Object.freeze([
  'targetReferencePrepared',
  'targetReferenceCategory',
  'nativeTargetBindingRequired',
  'nativeTargetBindingReceiptPresent',
  'endpointLocatorDisclosed',
  'rawRuntimeStateDisclosed',
  'vcpToolBoxRootModified'
]);

const REQUIRED_LIVE_READ_PLAN_FIELDS = Object.freeze([
  'nativeReadRequired',
  'governedReadOnlyToolsOnly',
  'searchMemoryProbePlanned',
  'memoryOverviewProbePlanned',
  'auditMemoryProbePlanned',
  'readSuitePlanned',
  'nativeReadAttempted',
  'nativeReadSucceeded',
  'nativeReadReceiptObserved',
  'wslLinuxProofRequired',
  'windowsWslSmokeRequired',
  'wslLinuxProofObserved',
  'windowsWslSmokeObserved'
]);

const REQUIRED_FALLBACK_PLAN_FIELDS = Object.freeze([
  'fallbackDistinctionRequired',
  'localFallbackAllowedForFailure',
  'nativeVsFallbackReceiptSeparated',
  'fallbackMisrepresentedAsNative'
]);

const REQUIRED_AUDIT_FIELDS = Object.freeze([
  'auditReceiptRequired',
  'lowDisclosureAuditReceiptPlanned',
  'nativeTargetReadFallbackLinksPlanned',
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
  'nativeReadAttempts',
  'memoryReads',
  'realMemoryReads',
  'rawPrivateReads',
  'serviceStartStopActions',
  'processInspections',
  'providerApiCalls',
  'nativeWriteAttempts',
  'durableMutations',
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
  'queryText',
  'query_text',
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
    ...collectUnexpectedKeys(input.phase2GateEvidence, REQUIRED_PHASE2_GATE_FIELDS, 'phase2GateEvidence'),
    ...collectUnexpectedKeys(input.approvalRequest, REQUIRED_APPROVAL_REQUEST_FIELDS, 'approvalRequest'),
    ...collectUnexpectedKeys(input.runtimeTarget, REQUIRED_RUNTIME_TARGET_FIELDS, 'runtimeTarget'),
    ...collectUnexpectedKeys(input.liveReadPlan, REQUIRED_LIVE_READ_PLAN_FIELDS, 'liveReadPlan'),
    ...collectUnexpectedKeys(input.fallbackPlan, REQUIRED_FALLBACK_PLAN_FIELDS, 'fallbackPlan'),
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
      'liveReadAuthorized',
      'serviceStartAuthorized',
      'processInspectionAuthorized',
      'providerApiAuthorized',
      'readinessClaimAuthorized'
    ], 'approvalRequest'),
    ...trueFields(input.runtimeTarget, [
      'nativeTargetBindingReceiptPresent',
      'endpointLocatorDisclosed',
      'rawRuntimeStateDisclosed',
      'vcpToolBoxRootModified'
    ], 'runtimeTarget'),
    ...trueFields(input.liveReadPlan, [
      'nativeReadAttempted',
      'nativeReadSucceeded',
      'nativeReadReceiptObserved',
      'wslLinuxProofObserved',
      'windowsWslSmokeObserved'
    ], 'liveReadPlan'),
    ...trueFields(input.fallbackPlan, [
      'fallbackMisrepresentedAsNative'
    ], 'fallbackPlan'),
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
    ...missingTrueFields(input.phase2GateEvidence, REQUIRED_PHASE2_GATE_FIELDS, 'phase2GateEvidence')
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
  if (input.runtimeTarget.nativeTargetBindingRequired !== true) {
    blockers.push('runtimeTarget.nativeTargetBindingRequired');
  }
  if (input.liveReadPlan.nativeReadRequired !== true) {
    blockers.push('liveReadPlan.nativeReadRequired');
  }
  if (input.liveReadPlan.governedReadOnlyToolsOnly !== true) {
    blockers.push('liveReadPlan.governedReadOnlyToolsOnly');
  }
  if (input.liveReadPlan.searchMemoryProbePlanned !== true) {
    blockers.push('liveReadPlan.searchMemoryProbePlanned');
  }
  if (input.liveReadPlan.memoryOverviewProbePlanned !== true) {
    blockers.push('liveReadPlan.memoryOverviewProbePlanned');
  }
  if (input.liveReadPlan.auditMemoryProbePlanned !== true) {
    blockers.push('liveReadPlan.auditMemoryProbePlanned');
  }
  if (input.liveReadPlan.readSuitePlanned !== true) {
    blockers.push('liveReadPlan.readSuitePlanned');
  }
  if (input.liveReadPlan.wslLinuxProofRequired !== true) {
    blockers.push('liveReadPlan.wslLinuxProofRequired');
  }
  if (input.liveReadPlan.windowsWslSmokeRequired !== true) {
    blockers.push('liveReadPlan.windowsWslSmokeRequired');
  }
  if (input.fallbackPlan.fallbackDistinctionRequired !== true) {
    blockers.push('fallbackPlan.fallbackDistinctionRequired');
  }
  if (input.fallbackPlan.localFallbackAllowedForFailure !== true) {
    blockers.push('fallbackPlan.localFallbackAllowedForFailure');
  }
  if (input.fallbackPlan.nativeVsFallbackReceiptSeparated !== true) {
    blockers.push('fallbackPlan.nativeVsFallbackReceiptSeparated');
  }
  if (input.auditPlan.auditReceiptRequired !== true) {
    blockers.push('auditPlan.auditReceiptRequired');
  }
  if (input.auditPlan.lowDisclosureAuditReceiptPlanned !== true) {
    blockers.push('auditPlan.lowDisclosureAuditReceiptPlanned');
  }
  if (input.auditPlan.nativeTargetReadFallbackLinksPlanned !== true) {
    blockers.push('auditPlan.nativeTargetReadFallbackLinksPlanned');
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
      decision: 'native_read_proof_readiness_blocked_missing_prerequisites',
      blockers: prerequisiteBlockers
    };
  }

  return {
    decision: 'native_read_proof_approval_request_ready_no_execution',
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
    nativeReadProofReady: false,
    nativeReadProofProven: false,
    runtimeCalled: false,
    liveVcpToolBoxCalled: false,
    nativeReadAttempted: false,
    realMemoryRead: false,
    rawPrivateStateRead: false,
    serviceStartStopPerformed: false,
    processInspectionPerformed: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    releaseDeployCutoverPerformed: false,
    readinessClaimed: false,
    ...extras
  };
}

function evaluatePhase2NativeReadProofReadinessGate(input) {
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
    ...missingFields(REQUIRED_PHASE2_GATE_FIELDS, input.phase2GateEvidence, 'phase2GateEvidence'),
    ...missingFields(REQUIRED_APPROVAL_REQUEST_FIELDS, input.approvalRequest, 'approvalRequest'),
    ...missingFields(REQUIRED_RUNTIME_TARGET_FIELDS, input.runtimeTarget, 'runtimeTarget'),
    ...missingFields(REQUIRED_LIVE_READ_PLAN_FIELDS, input.liveReadPlan, 'liveReadPlan'),
    ...missingFields(REQUIRED_FALLBACK_PLAN_FIELDS, input.fallbackPlan, 'fallbackPlan'),
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

  const ready = computed.decision === 'native_read_proof_approval_request_ready_no_execution';
  return {
    accepted: ready,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: computed.decision,
    blockers: computed.blockers,
    approvalRequestReady: ready,
    nativeReadProofReady: ready,
    approvalRequestSubmitted: false,
    exactApprovalAccepted: false,
    nativeReadProofProven: false,
    nextGate: ready
      ? 'await_fresh_exact_approval_before_live_native_read_proof'
      : 'complete_missing_native_read_proof_readiness_prerequisites',
    lowDisclosureReceipt: {
      taskId: input.taskId,
      phase: 'Phase 2',
      decision: computed.decision,
      targetReferenceCategory: input.runtimeTarget.targetReferenceCategory,
      approvalRequestPrepared: input.approvalRequest.approvalRequestPrepared,
      nativeTargetBindingRequired: input.runtimeTarget.nativeTargetBindingRequired,
      nativeReadRequired: input.liveReadPlan.nativeReadRequired,
      readOnlyToolsOnly: input.liveReadPlan.governedReadOnlyToolsOnly,
      fallbackReceiptSeparated: input.fallbackPlan.nativeVsFallbackReceiptSeparated,
      auditReceiptPlanned: input.auditPlan.lowDisclosureAuditReceiptPlanned,
      lowDisclosure: true,
      rawValuesIncluded: false,
      endpointLocatorIncluded: false,
      approvalLineValueDisclosed: false,
      memoryRead: false,
      realMemoryRead: false,
      rawPrivateStateRead: false,
      memoryWritten: false,
      durableWrite: false,
      readinessClaimed: false
    },
    runtimeCalled: false,
    liveVcpToolBoxCalled: false,
    nativeReadAttempted: false,
    realMemoryRead: false,
    rawPrivateStateRead: false,
    serviceStartStopPerformed: false,
    processInspectionPerformed: false,
    nativeWriteExecuted: false,
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
  REQUIRED_FALLBACK_PLAN_FIELDS,
  REQUIRED_LIVE_READ_PLAN_FIELDS,
  REQUIRED_OUTPUT_FIELDS,
  REQUIRED_PHASE2_GATE_FIELDS,
  REQUIRED_RUNTIME_TARGET_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluatePhase2NativeReadProofReadinessGate
};
