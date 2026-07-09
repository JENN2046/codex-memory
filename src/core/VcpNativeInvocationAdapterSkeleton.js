'use strict';

const {
  PROFILES,
  READ_ACTIONS,
  SOURCE_COMPONENTS,
  TARGET_KINDS
} = require('./VcpToolBoxFullCapabilityBridgePlan');
const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpNativeInvocationAdapterSkeleton';
const CONTRACT_MODE = 'source_only_no_runtime_no_write_low_disclosure';
const SCHEMA_VERSION = 1;
const SOURCE_SYSTEM = 'VCPToolBox';

const READ_ONLY_PROFILES = Object.freeze([
  PROFILES.OBSERVE_LITE,
  PROFILES.OBSERVE_FULL,
  PROFILES.TRUSTED_FULL_READ
]);

const ALLOWED_OPERATION_TYPES = Object.freeze([
  'read_only_target_status',
  'read_only_shape_probe',
  'read_only_recall_probe'
]);

const ALLOWED_VISIBILITY = Object.freeze([
  'project-local',
  'operator-scoped',
  'low-disclosure'
]);

const ALLOWED_RESULT_STATUSES = Object.freeze([
  'not_executed',
  'success',
  'partial',
  'denied',
  'error'
]);

const ALLOWED_SOURCE_RUNTIMES = Object.freeze([
  'vcp_toolbox',
  'wrapper_only',
  'none'
]);

const ALLOWED_EVIDENCE_TYPES = Object.freeze([
  'not-executed',
  'low-disclosure-runtime-result',
  'wrapper-error-shape'
]);

const ALLOWED_CONFIDENCE_LEVELS = Object.freeze([
  'not-claimed',
  'shape-only',
  'low',
  'medium',
  'high',
  'error-shape'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'sourceSystem',
  'adapterId',
  'target',
  'profile',
  'operation',
  'scope',
  'lowDisclosurePolicy',
  'exactApproval',
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
  'writeIntent',
  'includeContent',
  'rawBodyAllowed',
  'responseBodyAllowed',
  'logReadAllowed',
  'memoryIdDisclosureAllowed'
]);

const REQUIRED_SCOPE_FIELDS = Object.freeze([
  'agentAlias',
  'clientIdPresent',
  'workspaceScopePresent',
  'ownerScopePresent',
  'visibility'
]);

const REQUIRED_LOW_DISCLOSURE_POLICY_FIELDS = Object.freeze([
  'rawPayloadAllowed',
  'requestBodyAllowed',
  'responseBodyAllowed',
  'logsAllowed',
  'memoryIdsAllowed',
  'maxReturnedChars',
  'maxItemCount'
]);

const REQUIRED_EXACT_APPROVAL_FIELDS = Object.freeze([
  'accepted',
  'boundary',
  'approvalReference',
  'approvalLineValueIncluded',
  'requestBodyIncluded',
  'runtimeExecutionAuthorized'
]);

const ZERO_COUNTER_FIELDS = Object.freeze([
  'runtimeCalls',
  'liveVcpToolBoxCalls',
  'networkCalls',
  'mcpCalls',
  'memoryReads',
  'memoryWrites',
  'durableMemoryWrites',
  'durableAuditWrites',
  'providerApiCalls',
  'publicMcpExpansions',
  'approvalLineOperations',
  'approvalRequestSubmissions',
  'configReads',
  'logReads',
  'bodyLeaks'
]);

const ZERO_COUNTERS = Object.freeze(ZERO_COUNTER_FIELDS.reduce((accumulator, field) => {
  accumulator[field] = 0;
  return accumulator;
}, {}));

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'path',
  'absolutePath',
  'endpoint',
  'url',
  'baseUrl',
  'locatorValue',
  'configEnv',
  'configEnvPath',
  'env',
  'token',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'sharedSecret',
  'privateKey',
  'password',
  'secret',
  'secrets',
  'credential',
  'credentials',
  'body',
  'requestBody',
  'responseBody',
  'rawBody',
  'rawPayload',
  'raw_payload',
  'rawOutput',
  'raw_output',
  'rawLog',
  'stdout',
  'stderr',
  'content',
  'text',
  'title',
  'snippet',
  'rawText',
  'rawMemoryText',
  'rawDailyNote',
  'rawDailyNoteContent',
  'rawRagInjectedContext',
  'rawVectorRows',
  'rawPrompt',
  'rawConversation',
  'memoryId',
  'memoryIds',
  'memory_id',
  'sourceFile',
  'filePath',
  'approvalLine',
  'approvalLineValue',
  'approval_line_value',
  'providerPayload',
  'publicMcpExpansion',
  'publicMcpExpanded',
  'productionReady',
  'releaseReady',
  'cutoverReady',
  'rcReady',
  'RC_READY'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function missingFields(required, value, prefix = '') {
  const actual = isPlainObject(value) ? value : {};
  return required
    .filter(field => !(field in actual))
    .map(field => (prefix ? `${prefix}.${field}` : field));
}

function pathJoin(prefix, key) {
  return prefix ? `${prefix}.${key}` : key;
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
  return ZERO_COUNTER_FIELDS.filter(field => Number(counters[field] || 0) > 0);
}

function lowDisclosureProjection(input) {
  if (!isPlainObject(input)) {
    return {
      sourceSystem: null,
      adapterId: null,
      profile: null,
      targetKind: null,
      referenceName: null,
      action: null
    };
  }

  return {
    sourceSystem: typeof input.sourceSystem === 'string' ? input.sourceSystem : null,
    adapterId: isSafeReferenceName(input.adapterId) ? input.adapterId : null,
    profile: typeof input.profile === 'string' ? input.profile : null,
    targetKind: isPlainObject(input.target) && typeof input.target.kind === 'string' ? input.target.kind : null,
    referenceName: isPlainObject(input.target) && isSafeReferenceName(input.target.referenceName)
      ? input.target.referenceName
      : null,
    action: isPlainObject(input.operation) && typeof input.operation.action === 'string'
      ? input.operation.action
      : null
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
    rejectedActions: details.rejectedActions || [],
    runtimeCallWrapper: null,
    normalizedResult: null,
    nextAction: 'fix_vcp_native_invocation_adapter_contract_or_stop',
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
    readinessClaimed: false
  };
}

function invalidTargetFields(target) {
  const invalidFields = [];
  if (!TARGET_KINDS.includes(target.kind)) invalidFields.push('target.kind');
  if (!isSafeReferenceName(target.referenceName)) invalidFields.push('target.referenceName');
  if (target.locatorHashPresent !== true) invalidFields.push('target.locatorHashPresent');
  if (target.locatorValueIncluded !== false) invalidFields.push('target.locatorValueIncluded');
  if (target.secretMaterialIncluded !== false) invalidFields.push('target.secretMaterialIncluded');
  if (target.configEnvRead !== false) invalidFields.push('target.configEnvRead');
  if (target.runtimeCalled !== false) invalidFields.push('target.runtimeCalled');
  if (typeof target.observedPresent !== 'boolean') invalidFields.push('target.observedPresent');
  if (typeof target.runtimeEntrypointKnown !== 'boolean') invalidFields.push('target.runtimeEntrypointKnown');
  return invalidFields;
}

function invalidOperationFields(operation) {
  const invalidFields = [];
  if (!SOURCE_COMPONENTS.includes(operation.component)) invalidFields.push('operation.component');
  if (!READ_ACTIONS.includes(operation.action)) invalidFields.push('operation.action');
  if (!ALLOWED_OPERATION_TYPES.includes(operation.operationType)) invalidFields.push('operation.operationType');
  if (operation.readOnly !== true) invalidFields.push('operation.readOnly');
  if (operation.writeIntent !== false) invalidFields.push('operation.writeIntent');
  if (operation.includeContent !== false) invalidFields.push('operation.includeContent');
  if (operation.rawBodyAllowed !== false) invalidFields.push('operation.rawBodyAllowed');
  if (operation.responseBodyAllowed !== false) invalidFields.push('operation.responseBodyAllowed');
  if (operation.logReadAllowed !== false) invalidFields.push('operation.logReadAllowed');
  if (operation.memoryIdDisclosureAllowed !== false) invalidFields.push('operation.memoryIdDisclosureAllowed');
  return invalidFields;
}

function invalidScopeFields(scope) {
  const invalidFields = [];
  if (scope.agentAlias !== 'Codex') invalidFields.push('scope.agentAlias');
  for (const field of REQUIRED_SCOPE_FIELDS.filter(field => field !== 'agentAlias' && field !== 'visibility')) {
    if (scope[field] !== true) invalidFields.push(`scope.${field}`);
  }
  if (!ALLOWED_VISIBILITY.includes(scope.visibility)) invalidFields.push('scope.visibility');
  return invalidFields;
}

function invalidLowDisclosurePolicyFields(policy) {
  const invalidFields = [];
  for (const field of REQUIRED_LOW_DISCLOSURE_POLICY_FIELDS.filter(field => field !== 'maxReturnedChars' && field !== 'maxItemCount')) {
    if (policy[field] !== false) invalidFields.push(`lowDisclosurePolicy.${field}`);
  }
  if (policy.maxReturnedChars !== 0) invalidFields.push('lowDisclosurePolicy.maxReturnedChars');
  if (!Number.isInteger(policy.maxItemCount) || policy.maxItemCount < 0 || policy.maxItemCount > 5) {
    invalidFields.push('lowDisclosurePolicy.maxItemCount');
  }
  return invalidFields;
}

function invalidExactApprovalFields(exactApproval) {
  const invalidFields = [];
  if (exactApproval.accepted !== true) invalidFields.push('exactApproval.accepted');
  if (exactApproval.boundary !== 'exact-approved-read-only-proof-boundary') invalidFields.push('exactApproval.boundary');
  if (!isSafeReferenceName(exactApproval.approvalReference)) invalidFields.push('exactApproval.approvalReference');
  if (exactApproval.approvalLineValueIncluded !== false) invalidFields.push('exactApproval.approvalLineValueIncluded');
  if (exactApproval.requestBodyIncluded !== false) invalidFields.push('exactApproval.requestBodyIncluded');
  if (exactApproval.runtimeExecutionAuthorized !== false) invalidFields.push('exactApproval.runtimeExecutionAuthorized');
  return invalidFields;
}

function safeShapeKey(value) {
  return typeof value === 'string' &&
    /^[A-Za-z][A-Za-z0-9._-]{0,63}$/.test(value) &&
    !FORBIDDEN_FIELD_NAMES.includes(value);
}

function normalizeVcpNativeLowDisclosureResult(input = {}) {
  if (!isPlainObject(input)) {
    return {
      accepted: false,
      normalizerName: 'VcpNativeLowDisclosureResultNormalizer',
      reasonCode: 'result_not_plain_object',
      lowDisclosure: true,
      forbiddenFields: [],
      invalidFields: ['result'],
      rawPayloadIncluded: false,
      requestBodyIncluded: false,
      responseBodyIncluded: false,
      logsIncluded: false,
      memoryIdsIncluded: false,
      bodyLeakBudgetUsed: 0,
      writeCount: 0
    };
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return {
      accepted: false,
      normalizerName: 'VcpNativeLowDisclosureResultNormalizer',
      reasonCode: 'forbidden_raw_or_private_result_fields',
      lowDisclosure: true,
      forbiddenFields,
      invalidFields: [],
      rawPayloadIncluded: false,
      requestBodyIncluded: false,
      responseBodyIncluded: false,
      logsIncluded: false,
      memoryIdsIncluded: false,
      bodyLeakBudgetUsed: 0,
      writeCount: 0
    };
  }

  const status = typeof input.status === 'string' ? input.status : 'not_executed';
  const sourceRuntime = typeof input.sourceRuntime === 'string' ? input.sourceRuntime : 'none';
  const evidenceType = typeof input.evidenceType === 'string' ? input.evidenceType : 'not-executed';
  const confidenceLevel = typeof input.confidenceLevel === 'string' ? input.confidenceLevel : 'not-claimed';
  const itemCount = Number.isInteger(input.itemCount) && input.itemCount >= 0 ? input.itemCount : 0;
  const shapeKeys = Array.isArray(input.shapeKeys)
    ? input.shapeKeys.filter(safeShapeKey).sort()
    : [];

  const invalidFields = [];
  if (!ALLOWED_RESULT_STATUSES.includes(status)) invalidFields.push('result.status');
  if (!ALLOWED_SOURCE_RUNTIMES.includes(sourceRuntime)) invalidFields.push('result.sourceRuntime');
  if (!ALLOWED_EVIDENCE_TYPES.includes(evidenceType)) invalidFields.push('result.evidenceType');
  if (!ALLOWED_CONFIDENCE_LEVELS.includes(confidenceLevel)) invalidFields.push('result.confidenceLevel');
  if (itemCount > 5) invalidFields.push('result.itemCount');
  if (Array.isArray(input.shapeKeys) && shapeKeys.length !== input.shapeKeys.length) invalidFields.push('result.shapeKeys');

  if (invalidFields.length > 0) {
    return {
      accepted: false,
      normalizerName: 'VcpNativeLowDisclosureResultNormalizer',
      reasonCode: 'invalid_low_disclosure_result_shape',
      lowDisclosure: true,
      forbiddenFields: [],
      invalidFields,
      rawPayloadIncluded: false,
      requestBodyIncluded: false,
      responseBodyIncluded: false,
      logsIncluded: false,
      memoryIdsIncluded: false,
      bodyLeakBudgetUsed: 0,
      writeCount: 0
    };
  }

  return {
    accepted: true,
    normalizerName: 'VcpNativeLowDisclosureResultNormalizer',
    status,
    sourceRuntime,
    evidenceType,
    targetAlias: isSafeReferenceName(input.targetAlias) ? input.targetAlias : null,
    profile: READ_ONLY_PROFILES.includes(input.profile) ? input.profile : null,
    itemCount,
    shapeKeys,
    confidenceLevel,
    rawPayloadIncluded: false,
    requestBodyIncluded: false,
    responseBodyIncluded: false,
    logsIncluded: false,
    memoryIdsIncluded: false,
    bodyLeakBudgetUsed: 0,
    writeCount: 0,
    liveRuntimeClaimed: status !== 'not_executed' && sourceRuntime === 'vcp_toolbox'
  };
}

function sanitizeTarget(target) {
  return {
    kind: target.kind,
    referenceName: target.referenceName,
    locatorHashPresent: true,
    locatorValueIncluded: false,
    secretMaterialIncluded: false,
    configEnvRead: false,
    runtimeCalled: false,
    observedPresent: target.observedPresent === true,
    runtimeEntrypointKnown: target.runtimeEntrypointKnown === true
  };
}

function buildNoWriteNoBodyLeakRuntimeCallWrapper({ adapterId, target, profile, operation, exactApproval, normalizedResult }) {
  return {
    wrapperType: 'vcp_native_no_write_no_body_leak_runtime_call_wrapper',
    adapterId,
    planned: true,
    actionPlanOnly: true,
    exactApprovedReadOnlyProofPathPrepared: true,
    exactApprovalReferencePresent: isSafeReferenceName(exactApproval.approvalReference),
    target: sanitizeTarget(target),
    profile,
    operation: {
      component: operation.component,
      action: operation.action,
      operationType: operation.operationType,
      readOnly: true,
      includeContent: false
    },
    budgets: {
      maxRuntimeCalls: 1,
      maxNetworkCalls: 1,
      writeBudget: 0,
      durableWriteBudget: 0,
      providerCallBudget: 0,
      requestBodyByteBudget: 0,
      responseBodyByteBudget: 0,
      logLineBudget: 0,
      bodyLeakBudget: 0
    },
    requestPolicy: {
      readOnly: true,
      writeAllowed: false,
      includeContent: false,
      includeRequestBody: false,
      rawOutputAllowed: false,
      secretMaterialAllowed: false,
      configReadAllowed: false
    },
    responsePolicy: {
      normalizedShapeOnly: true,
      responseBodyAllowed: false,
      rawPayloadAllowed: false,
      logsAllowed: false,
      memoryIdsAllowed: false
    },
    normalizedResult,
    stopBeforeRuntimeReason: 'requires_current_exact_runtime_authorization_before_execution',
    rollbackPlan: 'no_runtime_state_to_rollback_until_execution_is_authorized',
    runtimeExecutionAuthorized: false,
    runtimeExecuted: false,
    liveVcpToolBoxCalled: false,
    networkCalled: false,
    mcpCalled: false,
    providerApiCalled: false,
    memoryReadPerformed: false,
    memoryWritten: false,
    durableWritePerformed: false,
    publicMcpExpanded: false,
    readinessClaimed: false
  };
}

function buildVcpNativeInvocationAdapterSkeleton(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_TARGET_FIELDS, input.target, 'target'),
    ...missingFields(REQUIRED_OPERATION_FIELDS, input.operation, 'operation'),
    ...missingFields(REQUIRED_SCOPE_FIELDS, input.scope, 'scope'),
    ...missingFields(REQUIRED_LOW_DISCLOSURE_POLICY_FIELDS, input.lowDisclosurePolicy, 'lowDisclosurePolicy'),
    ...missingFields(REQUIRED_EXACT_APPROVAL_FIELDS, input.exactApproval, 'exactApproval')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_secret_body_or_runtime_fields', input, { forbiddenFields });
  }

  const forbiddenCounters = collectPositiveCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('non_zero_side_effect_counters', input, { forbiddenCounters });
  }

  const invalidFields = [];
  if (input.schemaVersion !== SCHEMA_VERSION) invalidFields.push('schemaVersion');
  if (input.sourceSystem !== SOURCE_SYSTEM) invalidFields.push('sourceSystem');
  if (!isSafeReferenceName(input.adapterId)) invalidFields.push('adapterId');
  if (!READ_ONLY_PROFILES.includes(input.profile)) invalidFields.push('profile');
  invalidFields.push(...invalidTargetFields(input.target));
  invalidFields.push(...invalidOperationFields(input.operation));
  invalidFields.push(...invalidScopeFields(input.scope));
  invalidFields.push(...invalidLowDisclosurePolicyFields(input.lowDisclosurePolicy));
  invalidFields.push(...invalidExactApprovalFields(input.exactApproval));

  const rejectedActions = READ_ACTIONS.includes(input.operation.action) ? [] : [input.operation.action];
  if (invalidFields.length > 0) {
    return rejected('invalid_vcp_native_invocation_adapter_contract', input, {
      invalidFields,
      rejectedActions
    });
  }

  const normalizedResult = normalizeVcpNativeLowDisclosureResult(input.result || {
    status: 'not_executed',
    sourceRuntime: 'none',
    evidenceType: 'not-executed',
    targetAlias: input.target.referenceName,
    profile: input.profile,
    itemCount: 0,
    shapeKeys: []
  });

  if (!normalizedResult.accepted) {
    return rejected('low_disclosure_result_not_accepted', input, {
      forbiddenFields: normalizedResult.forbiddenFields,
      invalidFields: normalizedResult.invalidFields
    });
  }

  const runtimeCallWrapper = buildNoWriteNoBodyLeakRuntimeCallWrapper({
    adapterId: input.adapterId,
    target: input.target,
    profile: input.profile,
    operation: input.operation,
    exactApproval: input.exactApproval,
    normalizedResult
  });

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    sourceSystem: SOURCE_SYSTEM,
    adapterId: input.adapterId,
    targetProfileContractAccepted: true,
    lowDisclosureResultNormalizerAccepted: true,
    runtimeCallWrapperPrepared: true,
    exactApprovedReadOnlyProofPathPrepared: true,
    sanitizedTarget: sanitizeTarget(input.target),
    profile: input.profile,
    operation: {
      component: input.operation.component,
      action: input.operation.action,
      operationType: input.operation.operationType,
      readOnly: true,
      includeContent: false
    },
    normalizedResult,
    runtimeCallWrapper,
    nextAction: 'request_current_exact_runtime_authorization_before_live_execution',
    counters: { ...ZERO_COUNTERS },
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
    readinessClaimed: false
  };
}

module.exports = {
  ALLOWED_CONFIDENCE_LEVELS,
  ALLOWED_OPERATION_TYPES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  READ_ONLY_PROFILES,
  REQUIRED_EXACT_APPROVAL_FIELDS,
  REQUIRED_LOW_DISCLOSURE_POLICY_FIELDS,
  REQUIRED_OPERATION_FIELDS,
  REQUIRED_SCOPE_FIELDS,
  REQUIRED_TARGET_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTERS,
  ZERO_COUNTER_FIELDS,
  buildNoWriteNoBodyLeakRuntimeCallWrapper,
  buildVcpNativeInvocationAdapterSkeleton,
  normalizeVcpNativeLowDisclosureResult
};
