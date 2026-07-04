'use strict';

const {
  READ_ACTIONS,
  SOURCE_COMPONENTS
} = require('./VcpToolBoxFullCapabilityBridgePlan');
const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');
const {
  CONTRACT_NAME: ADAPTER_CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES: ADAPTER_FORBIDDEN_FIELD_NAMES,
  READ_ONLY_PROFILES,
  ZERO_COUNTERS: ADAPTER_ZERO_COUNTERS,
  ZERO_COUNTER_FIELDS,
  buildVcpNativeInvocationAdapterSkeleton
} = require('./VcpNativeInvocationAdapterSkeleton');

const CONTRACT_NAME = 'VcpNativeReadOnlyProofPathGate';
const CONTRACT_MODE = 'source_only_preruntime_invocation_gate_no_runtime_no_write_no_body';
const SCHEMA_VERSION = 1;
const PATH_KIND = 'vcp_native_exact_approval_readonly_proof_path';

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'adapterInput',
  'proofPath',
  'authorizationBoundary',
  'counters'
]);

const REQUIRED_PROOF_PATH_FIELDS = Object.freeze([
  'pathId',
  'pathKind',
  'targetReferenceName',
  'profile',
  'component',
  'action',
  'operationType',
  'readOnly',
  'includeContent',
  'lowDisclosureOnly',
  'maxReturnedItems'
]);

const REQUIRED_AUTHORIZATION_BOUNDARY_FIELDS = Object.freeze([
  'exactApprovalRequired',
  'currentExactApprovalPresent',
  'approvalReference',
  'approvalLineValueIncluded',
  'requestBodyIncluded',
  'runtimeExecutionAuthorized',
  'liveRuntimeAllowed'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  ...new Set([
    ...ADAPTER_FORBIDDEN_FIELD_NAMES,
    'approvalLineTemplate',
    'approvalLineText',
    'approvalRequestBody',
    'authorizationText',
    'command',
    'commandLine',
    'curl',
    'headers',
    'payload',
    'requestPayload',
    'responsePayload',
    'runtimeEndpoint',
    'runtimeUrl',
    'secretValue'
  ])
]);

const ZERO_COUNTERS = Object.freeze({
  ...ADAPTER_ZERO_COUNTERS,
  authorizationRequestsCreated: 0,
  authorizationRequestsSubmitted: 0,
  requestBodiesGenerated: 0,
  requestBodiesSubmitted: 0,
  runtimeExecutorCalls: 0,
  receiptWrites: 0
});

const ZERO_COUNTER_FIELDS_EXTENDED = Object.freeze(Object.keys(ZERO_COUNTERS));

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function pathJoin(prefix, key) {
  return prefix ? `${prefix}.${key}` : key;
}

function missingFields(required, value, prefix = '') {
  const actual = isPlainObject(value) ? value : {};
  return required
    .filter(field => !(field in actual))
    .map(field => (prefix ? `${prefix}.${field}` : field));
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

function collectPositiveCounters(counters) {
  if (!isPlainObject(counters)) return ZERO_COUNTER_FIELDS_EXTENDED;
  return ZERO_COUNTER_FIELDS_EXTENDED.filter(field => Number(counters[field] || 0) > 0);
}

function lowDisclosureProjection(input) {
  if (!isPlainObject(input)) {
    return {
      taskId: null,
      pathId: null,
      targetReferenceName: null,
      profile: null,
      action: null
    };
  }

  const proofPath = isPlainObject(input.proofPath) ? input.proofPath : {};
  return {
    taskId: isSafeReferenceName(input.taskId) ? input.taskId : null,
    pathId: isSafeReferenceName(proofPath.pathId) ? proofPath.pathId : null,
    targetReferenceName: isSafeReferenceName(proofPath.targetReferenceName) ? proofPath.targetReferenceName : null,
    profile: READ_ONLY_PROFILES.includes(proofPath.profile) ? proofPath.profile : null,
    action: READ_ACTIONS.includes(proofPath.action) ? proofPath.action : null
  };
}

function zeroSideEffectFlags() {
  return {
    runtimeWiringExecuted: false,
    runtimeExecutionAuthorized: false,
    runtimeExecuted: false,
    liveVcpToolBoxCalled: false,
    networkCalled: false,
    mcpCalled: false,
    providerApiCalled: false,
    configEnvRead: false,
    envFileRead: false,
    logRead: false,
    requestBodyIncluded: false,
    responseBodyIncluded: false,
    rawPrivatePayloadDisclosed: false,
    memoryReadPerformed: false,
    memoryWritten: false,
    durableWritePerformed: false,
    publicMcpExpanded: false,
    authorizationRequestCreated: false,
    authorizationRequestSubmitted: false,
    approvalLineGenerated: false,
    approvalLineSubmitted: false,
    requestBodyGenerated: false,
    requestBodySubmitted: false,
    receiptWritten: false,
    readinessClaimed: false
  };
}

function rejected(reasonCode, input, details = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: details.missingFields || [],
    forbiddenFields: details.forbiddenFields || [],
    forbiddenCounters: details.forbiddenCounters || [],
    invalidFields: details.invalidFields || [],
    adapterAccepted: details.adapterAccepted === true,
    adapterReasonCode: details.adapterReasonCode || null,
    invocationPlan: null,
    counters: { ...ZERO_COUNTERS },
    exactApprovalStillRequired: true,
    currentExactApprovalAcceptedByThisGate: false,
    nextAction: 'fix_vcp_native_readonly_proof_path_gate_or_stop',
    ...zeroSideEffectFlags()
  };
}

function wrapperBudgetFailures(wrapper) {
  const failures = [];
  if (!isPlainObject(wrapper)) return ['runtimeCallWrapper'];
  const budgets = isPlainObject(wrapper.budgets) ? wrapper.budgets : {};
  const requestPolicy = isPlainObject(wrapper.requestPolicy) ? wrapper.requestPolicy : {};
  const responsePolicy = isPlainObject(wrapper.responsePolicy) ? wrapper.responsePolicy : {};

  if (wrapper.wrapperType !== 'vcp_native_no_write_no_body_leak_runtime_call_wrapper') failures.push('runtimeCallWrapper.wrapperType');
  if (wrapper.planned !== true) failures.push('runtimeCallWrapper.planned');
  if (wrapper.actionPlanOnly !== true) failures.push('runtimeCallWrapper.actionPlanOnly');
  if (wrapper.exactApprovedReadOnlyProofPathPrepared !== true) failures.push('runtimeCallWrapper.exactApprovedReadOnlyProofPathPrepared');
  if (budgets.maxRuntimeCalls !== 1) failures.push('runtimeCallWrapper.budgets.maxRuntimeCalls');
  if (budgets.maxNetworkCalls !== 1) failures.push('runtimeCallWrapper.budgets.maxNetworkCalls');
  for (const field of [
    'writeBudget',
    'durableWriteBudget',
    'providerCallBudget',
    'requestBodyByteBudget',
    'responseBodyByteBudget',
    'logLineBudget',
    'bodyLeakBudget'
  ]) {
    if (budgets[field] !== 0) failures.push(`runtimeCallWrapper.budgets.${field}`);
  }
  if (requestPolicy.readOnly !== true) failures.push('runtimeCallWrapper.requestPolicy.readOnly');
  if (requestPolicy.writeAllowed !== false) failures.push('runtimeCallWrapper.requestPolicy.writeAllowed');
  if (requestPolicy.includeContent !== false) failures.push('runtimeCallWrapper.requestPolicy.includeContent');
  if (requestPolicy.includeRequestBody !== false) failures.push('runtimeCallWrapper.requestPolicy.includeRequestBody');
  if (requestPolicy.rawOutputAllowed !== false) failures.push('runtimeCallWrapper.requestPolicy.rawOutputAllowed');
  if (requestPolicy.secretMaterialAllowed !== false) failures.push('runtimeCallWrapper.requestPolicy.secretMaterialAllowed');
  if (requestPolicy.configReadAllowed !== false) failures.push('runtimeCallWrapper.requestPolicy.configReadAllowed');
  if (responsePolicy.normalizedShapeOnly !== true) failures.push('runtimeCallWrapper.responsePolicy.normalizedShapeOnly');
  if (responsePolicy.responseBodyAllowed !== false) failures.push('runtimeCallWrapper.responsePolicy.responseBodyAllowed');
  if (responsePolicy.rawPayloadAllowed !== false) failures.push('runtimeCallWrapper.responsePolicy.rawPayloadAllowed');
  if (responsePolicy.logsAllowed !== false) failures.push('runtimeCallWrapper.responsePolicy.logsAllowed');
  if (responsePolicy.memoryIdsAllowed !== false) failures.push('runtimeCallWrapper.responsePolicy.memoryIdsAllowed');
  if (wrapper.runtimeExecutionAuthorized !== false) failures.push('runtimeCallWrapper.runtimeExecutionAuthorized');
  if (wrapper.runtimeExecuted !== false) failures.push('runtimeCallWrapper.runtimeExecuted');
  if (wrapper.liveVcpToolBoxCalled !== false) failures.push('runtimeCallWrapper.liveVcpToolBoxCalled');
  if (wrapper.networkCalled !== false) failures.push('runtimeCallWrapper.networkCalled');
  if (wrapper.memoryWritten !== false) failures.push('runtimeCallWrapper.memoryWritten');
  if (wrapper.publicMcpExpanded !== false) failures.push('runtimeCallWrapper.publicMcpExpanded');
  if (wrapper.readinessClaimed !== false) failures.push('runtimeCallWrapper.readinessClaimed');

  return failures;
}

function invalidProofPathFields(proofPath, adapterResult) {
  const invalidFields = [];
  if (!isSafeReferenceName(proofPath.pathId)) invalidFields.push('proofPath.pathId');
  if (proofPath.pathKind !== PATH_KIND) invalidFields.push('proofPath.pathKind');
  if (proofPath.targetReferenceName !== adapterResult.sanitizedTarget.referenceName) {
    invalidFields.push('proofPath.targetReferenceName');
  }
  if (proofPath.profile !== adapterResult.profile || !READ_ONLY_PROFILES.includes(proofPath.profile)) {
    invalidFields.push('proofPath.profile');
  }
  if (proofPath.component !== adapterResult.operation.component || !SOURCE_COMPONENTS.includes(proofPath.component)) {
    invalidFields.push('proofPath.component');
  }
  if (proofPath.action !== adapterResult.operation.action || !READ_ACTIONS.includes(proofPath.action)) {
    invalidFields.push('proofPath.action');
  }
  if (proofPath.operationType !== adapterResult.operation.operationType) {
    invalidFields.push('proofPath.operationType');
  }
  if (proofPath.readOnly !== true) invalidFields.push('proofPath.readOnly');
  if (proofPath.includeContent !== false) invalidFields.push('proofPath.includeContent');
  if (proofPath.lowDisclosureOnly !== true) invalidFields.push('proofPath.lowDisclosureOnly');
  if (!Number.isInteger(proofPath.maxReturnedItems) || proofPath.maxReturnedItems < 0 || proofPath.maxReturnedItems > 5) {
    invalidFields.push('proofPath.maxReturnedItems');
  }
  return invalidFields;
}

function invalidAuthorizationBoundaryFields(boundary) {
  const invalidFields = [];
  if (boundary.exactApprovalRequired !== true) invalidFields.push('authorizationBoundary.exactApprovalRequired');
  if (boundary.currentExactApprovalPresent !== false) invalidFields.push('authorizationBoundary.currentExactApprovalPresent');
  if (!isSafeReferenceName(boundary.approvalReference)) invalidFields.push('authorizationBoundary.approvalReference');
  if (boundary.approvalLineValueIncluded !== false) invalidFields.push('authorizationBoundary.approvalLineValueIncluded');
  if (boundary.requestBodyIncluded !== false) invalidFields.push('authorizationBoundary.requestBodyIncluded');
  if (boundary.runtimeExecutionAuthorized !== false) invalidFields.push('authorizationBoundary.runtimeExecutionAuthorized');
  if (boundary.liveRuntimeAllowed !== false) invalidFields.push('authorizationBoundary.liveRuntimeAllowed');
  return invalidFields;
}

function buildInvocationPlan({ taskId, adapterResult, proofPath, authorizationBoundary }) {
  return {
    planType: 'vcp_native_readonly_preruntime_invocation_gate_plan',
    taskId,
    pathId: proofPath.pathId,
    pathKind: PATH_KIND,
    adapterId: adapterResult.adapterId,
    target: adapterResult.sanitizedTarget,
    profile: adapterResult.profile,
    operation: {
      component: adapterResult.operation.component,
      action: adapterResult.operation.action,
      operationType: adapterResult.operation.operationType,
      readOnly: true,
      includeContent: false
    },
    exactApproval: {
      required: true,
      currentExactApprovalPresent: false,
      approvalReference: authorizationBoundary.approvalReference,
      approvalLineValueIncluded: false,
      requestBodyIncluded: false,
      runtimeExecutionAuthorized: false,
      liveRuntimeAllowed: false
    },
    runtimeCallWrapper: adapterResult.runtimeCallWrapper,
    expectedResultNormalizer: 'VcpNativeLowDisclosureResultNormalizer',
    receiptCountersRequired: ZERO_COUNTER_FIELDS_EXTENDED,
    stopBeforeRuntimeReason: 'current_exact_runtime_authorization_absent_or_outside_this_gate',
    rollbackPlan: 'no_runtime_state_to_rollback',
    nextAction: 'request_current_exact_runtime_authorization_or_abort_before_any_live_call',
    counters: { ...ZERO_COUNTERS },
    ...zeroSideEffectFlags()
  };
}

function buildVcpNativeReadOnlyProofPathGate(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PROOF_PATH_FIELDS, input.proofPath, 'proofPath'),
    ...missingFields(REQUIRED_AUTHORIZATION_BOUNDARY_FIELDS, input.authorizationBoundary, 'authorizationBoundary')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_secret_body_runtime_or_authorization_fields', input, { forbiddenFields });
  }

  const forbiddenCounters = collectPositiveCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('non_zero_side_effect_counters', input, { forbiddenCounters });
  }

  const adapterResult = buildVcpNativeInvocationAdapterSkeleton(input.adapterInput);
  if (!adapterResult.accepted) {
    return rejected('adapter_contract_not_accepted', input, {
      adapterAccepted: false,
      adapterReasonCode: adapterResult.reasonCode,
      missingFields: adapterResult.missingFields,
      invalidFields: adapterResult.invalidFields,
      forbiddenFields: adapterResult.forbiddenFields,
      forbiddenCounters: adapterResult.forbiddenCounters
    });
  }

  const invalidFields = [];
  if (input.schemaVersion !== SCHEMA_VERSION) invalidFields.push('schemaVersion');
  if (!isSafeReferenceName(input.taskId)) invalidFields.push('taskId');
  if (adapterResult.contractName !== ADAPTER_CONTRACT_NAME) invalidFields.push('adapterResult.contractName');
  invalidFields.push(...invalidProofPathFields(input.proofPath, adapterResult));
  invalidFields.push(...invalidAuthorizationBoundaryFields(input.authorizationBoundary));
  invalidFields.push(...wrapperBudgetFailures(adapterResult.runtimeCallWrapper));

  if (invalidFields.length > 0) {
    return rejected('invalid_vcp_native_readonly_proof_path_gate', input, {
      adapterAccepted: true,
      invalidFields
    });
  }

  const invocationPlan = buildInvocationPlan({
    taskId: input.taskId,
    adapterResult,
    proofPath: input.proofPath,
    authorizationBoundary: input.authorizationBoundary
  });

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    taskId: input.taskId,
    adapterAccepted: true,
    proofPathGateAccepted: true,
    localInvocationGateReady: true,
    futureExactApprovedReadOnlyProofPathPrepared: true,
    exactApprovalStillRequired: true,
    currentExactApprovalAcceptedByThisGate: false,
    invocationPlan,
    counters: { ...ZERO_COUNTERS },
    nextAction: 'request_current_exact_runtime_authorization_or_abort_before_any_live_call',
    ...zeroSideEffectFlags()
  };
}

module.exports = {
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  PATH_KIND,
  REQUIRED_AUTHORIZATION_BOUNDARY_FIELDS,
  REQUIRED_PROOF_PATH_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTERS,
  ZERO_COUNTER_FIELDS_EXTENDED,
  buildVcpNativeReadOnlyProofPathGate
};
