'use strict';

const {
  READ_ACTIONS,
  SOURCE_COMPONENTS
} = require('./VcpToolBoxFullCapabilityBridgePlan');
const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');
const {
  FORBIDDEN_FIELD_NAMES: ADAPTER_FORBIDDEN_FIELD_NAMES,
  READ_ONLY_PROFILES
} = require('./VcpNativeInvocationAdapterSkeleton');
const {
  PATH_KIND,
  ZERO_COUNTERS: PROOF_PATH_ZERO_COUNTERS,
  ZERO_COUNTER_FIELDS_EXTENDED
} = require('./VcpNativeReadOnlyProofPathGate');

const CONTRACT_NAME = 'VcpNativeRuntimeAdapterDryRunContract';
const CONTRACT_MODE = 'dry_run_no_call_runtime_adapter_contract';
const SCHEMA_VERSION = 1;
const REQUIRED_PLAN_TYPE = 'vcp_native_readonly_preruntime_invocation_gate_plan';

const REQUIRED_INVOCATION_PLAN_FIELDS = Object.freeze([
  'planType',
  'taskId',
  'pathId',
  'pathKind',
  'adapterId',
  'target',
  'profile',
  'operation',
  'exactApproval',
  'runtimeCallWrapper',
  'expectedResultNormalizer',
  'receiptCountersRequired',
  'stopBeforeRuntimeReason',
  'rollbackPlan',
  'nextAction',
  'counters'
]);

const REQUIRED_TARGET_FIELDS = Object.freeze([
  'kind',
  'referenceName',
  'locatorHashPresent',
  'locatorValueIncluded',
  'secretMaterialIncluded',
  'configEnvRead',
  'runtimeCalled',
  'observedPresent',
  'runtimeEntrypointKnown'
]);

const REQUIRED_OPERATION_FIELDS = Object.freeze([
  'component',
  'action',
  'operationType',
  'readOnly',
  'includeContent'
]);

const REQUIRED_EXACT_APPROVAL_FIELDS = Object.freeze([
  'required',
  'currentExactApprovalPresent',
  'approvalReference',
  'approvalLineValueIncluded',
  'requestBodyIncluded',
  'runtimeExecutionAuthorized',
  'liveRuntimeAllowed'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  ...new Set([
    ...ADAPTER_FORBIDDEN_FIELD_NAMES.filter(field => field !== 'publicMcpExpanded'),
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
  ...PROOF_PATH_ZERO_COUNTERS,
  dryRunAdapterCalls: 0,
  runtimeAdapterLiveCalls: 0
});

const ZERO_COUNTER_FIELDS = Object.freeze(Object.keys(ZERO_COUNTERS));

const RUNTIME_FALSE_FIELDS = Object.freeze([
  'runtimeWiringExecuted',
  'runtimeExecutionAuthorized',
  'runtimeExecuted',
  'liveVcpToolBoxCalled',
  'networkCalled',
  'mcpCalled',
  'providerApiCalled',
  'configEnvRead',
  'envFileRead',
  'logRead',
  'requestBodyIncluded',
  'responseBodyIncluded',
  'rawPrivatePayloadDisclosed',
  'memoryReadPerformed',
  'memoryWritten',
  'durableWritePerformed',
  'publicMcpExpanded',
  'authorizationRequestCreated',
  'authorizationRequestSubmitted',
  'approvalLineGenerated',
  'approvalLineSubmitted',
  'requestBodyGenerated',
  'requestBodySubmitted',
  'receiptWritten',
  'readinessClaimed'
]);

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
  if (!isPlainObject(counters)) return ZERO_COUNTER_FIELDS;
  const invalidCounters = ZERO_COUNTER_FIELDS.filter(field => Number(counters[field] || 0) > 0);
  for (const field of Object.keys(counters)) {
    if (!ZERO_COUNTER_FIELDS.includes(field)) invalidCounters.push(field);
  }
  return invalidCounters;
}

function lowDisclosureProjection(invocationPlan) {
  if (!isPlainObject(invocationPlan)) {
    return {
      taskId: null,
      pathId: null,
      targetReferenceName: null,
      profile: null,
      action: null
    };
  }

  const target = isPlainObject(invocationPlan.target) ? invocationPlan.target : {};
  const operation = isPlainObject(invocationPlan.operation) ? invocationPlan.operation : {};

  return {
    taskId: isSafeReferenceName(invocationPlan.taskId) ? invocationPlan.taskId : null,
    pathId: isSafeReferenceName(invocationPlan.pathId) ? invocationPlan.pathId : null,
    targetReferenceName: isSafeReferenceName(target.referenceName) ? target.referenceName : null,
    profile: READ_ONLY_PROFILES.includes(invocationPlan.profile) ? invocationPlan.profile : null,
    action: READ_ACTIONS.includes(operation.action) ? operation.action : null
  };
}

function dryRunResult(overrides = {}) {
  return {
    accepted: false,
    wouldExecute: false,
    runtimeExecuted: false,
    liveVcpToolBoxCalled: false,
    networkCalled: false,
    requestBodyGenerated: false,
    responseBodyRead: false,
    memoryReadPerformed: false,
    memoryWritten: false,
    normalizedResultExpected: false,
    exactApprovalStillRequired: true,
    ...overrides
  };
}

function zeroSideEffectFlags() {
  return {
    runtimeAdapterEntered: false,
    dryRunOnly: true,
    runtimeExecuted: false,
    liveVcpToolBoxCalled: false,
    networkCalled: false,
    requestBodyGenerated: false,
    responseBodyRead: false,
    responseBodyPersisted: false,
    logRead: false,
    stdoutRead: false,
    stderrRead: false,
    configEnvRead: false,
    secretRead: false,
    memoryReadPerformed: false,
    memoryWritten: false,
    durableWritePerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    authorizationRequestCreated: false,
    approvalLineGenerated: false,
    readinessClaimed: false
  };
}

function rejected(reasonCode, invocationPlan, details = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    reasonCode,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(invocationPlan),
    missingFields: details.missingFields || [],
    forbiddenFields: details.forbiddenFields || [],
    forbiddenCounters: details.forbiddenCounters || [],
    invalidFields: details.invalidFields || [],
    dry_run_result: dryRunResult(),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'fix_cm1911_invocation_plan_or_stop_before_runtime',
    ...zeroSideEffectFlags()
  };
}

function invalidTargetFields(target) {
  const invalidFields = [];
  if (!isPlainObject(target)) return ['target'];
  if (!isSafeReferenceName(target.referenceName)) invalidFields.push('target.referenceName');
  if (target.locatorHashPresent !== true) invalidFields.push('target.locatorHashPresent');
  if (target.locatorValueIncluded !== false) invalidFields.push('target.locatorValueIncluded');
  if (target.secretMaterialIncluded !== false) invalidFields.push('target.secretMaterialIncluded');
  if (target.configEnvRead !== false) invalidFields.push('target.configEnvRead');
  if (target.runtimeCalled !== false) invalidFields.push('target.runtimeCalled');
  return invalidFields;
}

function invalidOperationFields(operation) {
  const invalidFields = [];
  if (!isPlainObject(operation)) return ['operation'];
  if (!SOURCE_COMPONENTS.includes(operation.component)) invalidFields.push('operation.component');
  if (!READ_ACTIONS.includes(operation.action)) invalidFields.push('operation.action');
  if (!['read_only_target_status', 'read_only_shape_probe', 'read_only_recall_probe'].includes(operation.operationType)) {
    invalidFields.push('operation.operationType');
  }
  if (operation.readOnly !== true) invalidFields.push('operation.readOnly');
  if (operation.includeContent !== false) invalidFields.push('operation.includeContent');
  return invalidFields;
}

function invalidExactApprovalFields(exactApproval) {
  const invalidFields = [];
  if (!isPlainObject(exactApproval)) return ['exactApproval'];
  if (exactApproval.required !== true) invalidFields.push('exactApproval.required');
  if (exactApproval.currentExactApprovalPresent !== false) invalidFields.push('exactApproval.currentExactApprovalPresent');
  if (!isSafeReferenceName(exactApproval.approvalReference)) invalidFields.push('exactApproval.approvalReference');
  if (exactApproval.approvalLineValueIncluded !== false) invalidFields.push('exactApproval.approvalLineValueIncluded');
  if (exactApproval.requestBodyIncluded !== false) invalidFields.push('exactApproval.requestBodyIncluded');
  if (exactApproval.runtimeExecutionAuthorized !== false) invalidFields.push('exactApproval.runtimeExecutionAuthorized');
  if (exactApproval.liveRuntimeAllowed !== false) invalidFields.push('exactApproval.liveRuntimeAllowed');
  return invalidFields;
}

function invalidNormalizedResultFields(result) {
  const invalidFields = [];
  if (!isPlainObject(result)) return ['runtimeCallWrapper.normalizedResult'];
  if (result.accepted !== true) invalidFields.push('runtimeCallWrapper.normalizedResult.accepted');
  if (result.normalizerName !== 'VcpNativeLowDisclosureResultNormalizer') {
    invalidFields.push('runtimeCallWrapper.normalizedResult.normalizerName');
  }
  if (result.status !== 'not_executed') invalidFields.push('runtimeCallWrapper.normalizedResult.status');
  if (result.sourceRuntime !== 'none') invalidFields.push('runtimeCallWrapper.normalizedResult.sourceRuntime');
  if (result.evidenceType !== 'not-executed') invalidFields.push('runtimeCallWrapper.normalizedResult.evidenceType');
  if (result.rawPayloadIncluded !== false) invalidFields.push('runtimeCallWrapper.normalizedResult.rawPayloadIncluded');
  if (result.requestBodyIncluded !== false) invalidFields.push('runtimeCallWrapper.normalizedResult.requestBodyIncluded');
  if (result.responseBodyIncluded !== false) invalidFields.push('runtimeCallWrapper.normalizedResult.responseBodyIncluded');
  if (result.logsIncluded !== false) invalidFields.push('runtimeCallWrapper.normalizedResult.logsIncluded');
  if (result.memoryIdsIncluded !== false) invalidFields.push('runtimeCallWrapper.normalizedResult.memoryIdsIncluded');
  if (result.bodyLeakBudgetUsed !== 0) invalidFields.push('runtimeCallWrapper.normalizedResult.bodyLeakBudgetUsed');
  if (result.writeCount !== 0) invalidFields.push('runtimeCallWrapper.normalizedResult.writeCount');
  if (result.liveRuntimeClaimed !== false) invalidFields.push('runtimeCallWrapper.normalizedResult.liveRuntimeClaimed');
  return invalidFields;
}

function invalidRuntimeCallWrapperFields(wrapper, invocationPlan) {
  const invalidFields = [];
  if (!isPlainObject(wrapper)) return ['runtimeCallWrapper'];

  const budgets = isPlainObject(wrapper.budgets) ? wrapper.budgets : {};
  const requestPolicy = isPlainObject(wrapper.requestPolicy) ? wrapper.requestPolicy : {};
  const responsePolicy = isPlainObject(wrapper.responsePolicy) ? wrapper.responsePolicy : {};

  if (wrapper.wrapperType !== 'vcp_native_no_write_no_body_leak_runtime_call_wrapper') {
    invalidFields.push('runtimeCallWrapper.wrapperType');
  }
  if (wrapper.adapterId !== invocationPlan.adapterId) invalidFields.push('runtimeCallWrapper.adapterId');
  if (wrapper.planned !== true) invalidFields.push('runtimeCallWrapper.planned');
  if (wrapper.actionPlanOnly !== true) invalidFields.push('runtimeCallWrapper.actionPlanOnly');
  if (wrapper.exactApprovedReadOnlyProofPathPrepared !== true) {
    invalidFields.push('runtimeCallWrapper.exactApprovedReadOnlyProofPathPrepared');
  }
  if (wrapper.exactApprovalReferencePresent !== true) invalidFields.push('runtimeCallWrapper.exactApprovalReferencePresent');
  if (wrapper.profile !== invocationPlan.profile) invalidFields.push('runtimeCallWrapper.profile');

  if (budgets.maxRuntimeCalls !== 1) invalidFields.push('runtimeCallWrapper.budgets.maxRuntimeCalls');
  if (budgets.maxNetworkCalls !== 1) invalidFields.push('runtimeCallWrapper.budgets.maxNetworkCalls');
  for (const field of [
    'writeBudget',
    'durableWriteBudget',
    'providerCallBudget',
    'requestBodyByteBudget',
    'responseBodyByteBudget',
    'logLineBudget',
    'bodyLeakBudget'
  ]) {
    if (budgets[field] !== 0) invalidFields.push(`runtimeCallWrapper.budgets.${field}`);
  }

  if (requestPolicy.readOnly !== true) invalidFields.push('runtimeCallWrapper.requestPolicy.readOnly');
  if (requestPolicy.writeAllowed !== false) invalidFields.push('runtimeCallWrapper.requestPolicy.writeAllowed');
  if (requestPolicy.includeContent !== false) invalidFields.push('runtimeCallWrapper.requestPolicy.includeContent');
  if (requestPolicy.includeRequestBody !== false) invalidFields.push('runtimeCallWrapper.requestPolicy.includeRequestBody');
  if (requestPolicy.rawOutputAllowed !== false) invalidFields.push('runtimeCallWrapper.requestPolicy.rawOutputAllowed');
  if (requestPolicy.secretMaterialAllowed !== false) invalidFields.push('runtimeCallWrapper.requestPolicy.secretMaterialAllowed');
  if (requestPolicy.configReadAllowed !== false) invalidFields.push('runtimeCallWrapper.requestPolicy.configReadAllowed');

  if (responsePolicy.normalizedShapeOnly !== true) invalidFields.push('runtimeCallWrapper.responsePolicy.normalizedShapeOnly');
  if (responsePolicy.responseBodyAllowed !== false) invalidFields.push('runtimeCallWrapper.responsePolicy.responseBodyAllowed');
  if (responsePolicy.rawPayloadAllowed !== false) invalidFields.push('runtimeCallWrapper.responsePolicy.rawPayloadAllowed');
  if (responsePolicy.logsAllowed !== false) invalidFields.push('runtimeCallWrapper.responsePolicy.logsAllowed');
  if (responsePolicy.memoryIdsAllowed !== false) invalidFields.push('runtimeCallWrapper.responsePolicy.memoryIdsAllowed');

  for (const field of [
    'runtimeExecutionAuthorized',
    'runtimeExecuted',
    'liveVcpToolBoxCalled',
    'networkCalled',
    'mcpCalled',
    'providerApiCalled',
    'memoryReadPerformed',
    'memoryWritten',
    'durableWritePerformed',
    'publicMcpExpanded',
    'readinessClaimed'
  ]) {
    if (wrapper[field] !== false) invalidFields.push(`runtimeCallWrapper.${field}`);
  }

  invalidFields.push(...invalidNormalizedResultFields(wrapper.normalizedResult));
  return invalidFields;
}

function invalidRuntimeFalseFields(invocationPlan) {
  return RUNTIME_FALSE_FIELDS
    .filter(field => Object.prototype.hasOwnProperty.call(invocationPlan, field))
    .filter(field => invocationPlan[field] !== false);
}

function invalidPlanFields(invocationPlan) {
  const invalidFields = [];

  if (invocationPlan.planType !== REQUIRED_PLAN_TYPE) invalidFields.push('planType');
  if (!isSafeReferenceName(invocationPlan.taskId)) invalidFields.push('taskId');
  if (!isSafeReferenceName(invocationPlan.pathId)) invalidFields.push('pathId');
  if (invocationPlan.pathKind !== PATH_KIND) invalidFields.push('pathKind');
  if (!isSafeReferenceName(invocationPlan.adapterId)) invalidFields.push('adapterId');
  if (!READ_ONLY_PROFILES.includes(invocationPlan.profile)) invalidFields.push('profile');
  if (invocationPlan.expectedResultNormalizer !== 'VcpNativeLowDisclosureResultNormalizer') {
    invalidFields.push('expectedResultNormalizer');
  }
  if (invocationPlan.stopBeforeRuntimeReason !== 'current_exact_runtime_authorization_absent_or_outside_this_gate') {
    invalidFields.push('stopBeforeRuntimeReason');
  }
  if (invocationPlan.rollbackPlan !== 'no_runtime_state_to_rollback') invalidFields.push('rollbackPlan');
  if (!Array.isArray(invocationPlan.receiptCountersRequired)) {
    invalidFields.push('receiptCountersRequired');
  } else {
    const required = new Set(ZERO_COUNTER_FIELDS_EXTENDED);
    for (const field of ZERO_COUNTER_FIELDS_EXTENDED) {
      if (!invocationPlan.receiptCountersRequired.includes(field)) {
        invalidFields.push(`receiptCountersRequired.${field}`);
        break;
      }
    }
    for (const field of invocationPlan.receiptCountersRequired) {
      if (!required.has(field)) {
        invalidFields.push('receiptCountersRequired.unknown');
        break;
      }
    }
  }

  invalidFields.push(...invalidTargetFields(invocationPlan.target));
  invalidFields.push(...invalidOperationFields(invocationPlan.operation));
  invalidFields.push(...invalidExactApprovalFields(invocationPlan.exactApproval));
  invalidFields.push(...invalidRuntimeCallWrapperFields(invocationPlan.runtimeCallWrapper, invocationPlan));
  invalidFields.push(...invalidRuntimeFalseFields(invocationPlan));

  return invalidFields;
}

function buildVcpNativeRuntimeAdapterDryRunContract(invocationPlan = {}) {
  if (!isPlainObject(invocationPlan)) {
    return rejected('invocation_plan_not_plain_object', invocationPlan);
  }

  const missing = [
    ...missingFields(REQUIRED_INVOCATION_PLAN_FIELDS, invocationPlan),
    ...missingFields(REQUIRED_TARGET_FIELDS, invocationPlan.target, 'target'),
    ...missingFields(REQUIRED_OPERATION_FIELDS, invocationPlan.operation, 'operation'),
    ...missingFields(REQUIRED_EXACT_APPROVAL_FIELDS, invocationPlan.exactApproval, 'exactApproval')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_invocation_plan_fields', invocationPlan, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(invocationPlan);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_secret_body_runtime_or_authorization_fields', invocationPlan, { forbiddenFields });
  }

  const forbiddenCounters = collectPositiveCounters(invocationPlan.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('non_zero_side_effect_counters', invocationPlan, { forbiddenCounters });
  }

  const invalidFields = invalidPlanFields(invocationPlan);
  if (invalidFields.length > 0) {
    return rejected('invalid_vcp_native_runtime_adapter_dry_run_contract', invocationPlan, { invalidFields });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    taskId: invocationPlan.taskId,
    invocationPlanAccepted: true,
    runtimeAdapterDryRunAccepted: true,
    dryRunNoCallBoundaryHeld: true,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(invocationPlan),
    dry_run_result: dryRunResult({
      accepted: true,
      wouldExecute: true,
      normalizedResultExpected: true,
      exactApprovalStillRequired: true
    }),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'cm1913_define_low_disclosure_execution_receipt_schema_before_live_call',
    ...zeroSideEffectFlags(),
    runtimeAdapterEntered: true
  };
}

module.exports = {
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_INVOCATION_PLAN_FIELDS,
  REQUIRED_PLAN_TYPE,
  SCHEMA_VERSION,
  ZERO_COUNTERS,
  ZERO_COUNTER_FIELDS,
  buildVcpNativeRuntimeAdapterDryRunContract
};
