'use strict';

const {
  READ_ACTIONS,
  SOURCE_COMPONENTS
} = require('./VcpToolBoxFullCapabilityBridgePlan');
const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');
const {
  READ_ONLY_PROFILES
} = require('./VcpNativeInvocationAdapterSkeleton');
const {
  CONTRACT_NAME: DRY_RUN_CONTRACT_NAME
} = require('./VcpNativeRuntimeAdapterDryRunContract');

const CONTRACT_NAME = 'VcpNativeReadOnlyProofExecutionHarness';
const CONTRACT_MODE = 'default_no_run_live_readonly_proof_execution_harness';
const SCHEMA_VERSION = 1;

const MODES = Object.freeze({
  DRY_RUN: 'dry_run',
  EXACT_APPROVED_LIVE: 'exact_approved_live'
});

const MODE_POLICY = Object.freeze({
  [MODES.DRY_RUN]: Object.freeze({
    default: true,
    live_call: false,
    requires_external_approval: false
  }),
  [MODES.EXACT_APPROVED_LIVE]: Object.freeze({
    default: false,
    live_call: false,
    requires_external_approval: true
  })
});

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'dryRunContract',
  'requestBoundary',
  'counters'
]);

const REQUIRED_REQUEST_BOUNDARY_FIELDS = Object.freeze([
  'action',
  'profile',
  'maxRuntimeCalls',
  'maxNetworkCalls',
  'writeBudget',
  'responseBodyByteBudget',
  'logReadBudget',
  'resultProjection',
  'targetReferenceName',
  'component',
  'componentAction'
]);

const REQUIRED_EXACT_APPROVAL_FIELDS = Object.freeze([
  'currentExternalApprovalPresent',
  'approvalReference',
  'targetReferenceName',
  'component',
  'componentAction',
  'profile',
  'maxRuntimeCalls',
  'maxNetworkCalls',
  'writeBudget',
  'responseBodyByteBudget',
  'logReadBudget',
  'resultProjection',
  'noWriteRuleAccepted',
  'noBodyLogRuleAccepted',
  'stopConditionsAccepted',
  'approvalLineValueIncluded',
  'requestBodyIncluded',
  'rawOutputAllowed'
]);

const ZERO_COUNTERS = Object.freeze({
  runtimeCalls: 0,
  liveVcpToolBoxCalls: 0,
  networkCalls: 0,
  mcpCalls: 0,
  memoryReads: 0,
  memoryWrites: 0,
  durableMemoryWrites: 0,
  durableAuditWrites: 0,
  providerApiCalls: 0,
  publicMcpExpansions: 0,
  authorizationRequestsCreated: 0,
  authorizationRequestsSubmitted: 0,
  requestBodiesGenerated: 0,
  requestBodiesSubmitted: 0,
  approvalLineOperations: 0,
  responseBodiesRead: 0,
  responseBodiesPersisted: 0,
  rawBodiesPersisted: 0,
  logReads: 0,
  configReads: 0,
  receiptWrites: 0,
  harnessLiveCalls: 0
});

const ZERO_COUNTER_FIELDS = Object.freeze(Object.keys(ZERO_COUNTERS));

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'endpoint',
  'url',
  'baseUrl',
  'runtimeEndpoint',
  'runtimeUrl',
  'approvalLine',
  'approvalLineText',
  'approvalLineValue',
  'approval_line_value',
  'approvalRequestBody',
  'requestBody',
  'requestPayload',
  'responseBody',
  'rawResponseBody',
  'responsePayload',
  'rawPayload',
  'payload',
  'rawOutput',
  'rawMemoryText',
  'rawText',
  'memoryId',
  'memoryIds',
  'memory_id',
  'token',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'secret',
  'secrets',
  'credential',
  'credentials',
  'config',
  'configEnv',
  'env',
  'stdout',
  'stderr',
  'log',
  'logs',
  'rawLog',
  'providerPayload',
  'command',
  'commandLine',
  'curl'
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

function collectInvalidCounters(counters) {
  if (!isPlainObject(counters)) return ZERO_COUNTER_FIELDS;
  const invalid = [];
  for (const field of ZERO_COUNTER_FIELDS) {
    if (counters[field] !== 0) invalid.push(field);
  }
  for (const field of Object.keys(counters)) {
    if (!ZERO_COUNTER_FIELDS.includes(field)) invalid.push(field);
  }
  return invalid;
}

function modeOf(input) {
  if (input.mode === undefined || input.mode === null) return MODES.DRY_RUN;
  return input.mode;
}

function projectedMode(input) {
  const mode = modeOf(input);
  if (typeof mode !== 'string') return null;
  return Object.values(MODES).includes(mode) ? mode : null;
}

function zeroSideEffectFlags() {
  return {
    runtimeExecuted: false,
    liveVcpToolBoxCalled: false,
    networkCalled: false,
    mcpCalled: false,
    providerApiCalled: false,
    configEnvRead: false,
    logRead: false,
    stdoutRead: false,
    stderrRead: false,
    requestBodyGenerated: false,
    requestBodySubmitted: false,
    responseBodyRead: false,
    responseBodyPersisted: false,
    rawBodyPersisted: false,
    memoryReadPerformed: false,
    memoryWritten: false,
    durableWritePerformed: false,
    receiptWritten: false,
    publicMcpExpanded: false,
    authorizationRequestCreated: false,
    authorizationRequestSubmitted: false,
    approvalLineGenerated: false,
    approvalLineSubmitted: false,
    readinessClaimed: false
  };
}

function lowDisclosureProjection(input) {
  if (!isPlainObject(input)) {
    return {
      taskId: null,
      mode: MODES.DRY_RUN,
      targetReferenceName: null,
      profile: null,
      componentAction: null
    };
  }

  const boundary = isPlainObject(input.requestBoundary) ? input.requestBoundary : {};
  return {
    taskId: isSafeReferenceName(input.taskId) ? input.taskId : null,
    mode: projectedMode(input),
    targetReferenceName: isSafeReferenceName(boundary.targetReferenceName) ? boundary.targetReferenceName : null,
    profile: READ_ONLY_PROFILES.includes(boundary.profile) ? boundary.profile : null,
    componentAction: READ_ACTIONS.includes(boundary.componentAction) ? boundary.componentAction : null
  };
}

function resultShape(overrides = {}) {
  return {
    accepted: false,
    reason: null,
    mode: null,
    runtimeExecuted: false,
    liveVcpToolBoxCalled: false,
    networkCalled: false,
    requestBodyGenerated: false,
    responseBodyRead: false,
    rawBodyPersisted: false,
    memoryReadPerformed: false,
    memoryWritten: false,
    durableWritePerformed: false,
    approvalLineGenerated: false,
    exactApprovalRequired: true,
    readyForCm1916LiveProof: false,
    ...overrides
  };
}

function rejected(reasonCode, input, details = {}) {
  const mode = isPlainObject(input) ? projectedMode(input) : MODES.DRY_RUN;
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    reasonCode,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    mode,
    modePolicy: MODE_POLICY,
    missingFields: details.missingFields || [],
    forbiddenFields: details.forbiddenFields || [],
    invalidFields: details.invalidFields || [],
    boundaryViolations: details.boundaryViolations || [],
    forbiddenCounters: details.forbiddenCounters || [],
    result: resultShape({
      reason: reasonCode,
      mode
    }),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'fix_cm1915_execution_harness_input_or_stop_before_live_proof',
    ...zeroSideEffectFlags()
  };
}

function invalidDryRunContractFields(contract) {
  const invalidFields = [];
  if (!isPlainObject(contract)) return ['dryRunContract'];
  if (contract.accepted !== true) invalidFields.push('dryRunContract.accepted');
  if (contract.contractName !== DRY_RUN_CONTRACT_NAME) invalidFields.push('dryRunContract.contractName');
  if (contract.runtimeAdapterDryRunAccepted !== true) invalidFields.push('dryRunContract.runtimeAdapterDryRunAccepted');
  if (contract.dryRunNoCallBoundaryHeld !== true) invalidFields.push('dryRunContract.dryRunNoCallBoundaryHeld');
  if (!isPlainObject(contract.dry_run_result)) invalidFields.push('dryRunContract.dry_run_result');
  if (isPlainObject(contract.dry_run_result)) {
    if (contract.dry_run_result.accepted !== true) invalidFields.push('dryRunContract.dry_run_result.accepted');
    if (contract.dry_run_result.wouldExecute !== true) invalidFields.push('dryRunContract.dry_run_result.wouldExecute');
    if (contract.dry_run_result.runtimeExecuted !== false) invalidFields.push('dryRunContract.dry_run_result.runtimeExecuted');
    if (contract.dry_run_result.liveVcpToolBoxCalled !== false) {
      invalidFields.push('dryRunContract.dry_run_result.liveVcpToolBoxCalled');
    }
    if (contract.dry_run_result.networkCalled !== false) invalidFields.push('dryRunContract.dry_run_result.networkCalled');
    if (contract.dry_run_result.requestBodyGenerated !== false) {
      invalidFields.push('dryRunContract.dry_run_result.requestBodyGenerated');
    }
    if (contract.dry_run_result.responseBodyRead !== false) invalidFields.push('dryRunContract.dry_run_result.responseBodyRead');
    if (contract.dry_run_result.memoryReadPerformed !== false) {
      invalidFields.push('dryRunContract.dry_run_result.memoryReadPerformed');
    }
    if (contract.dry_run_result.memoryWritten !== false) invalidFields.push('dryRunContract.dry_run_result.memoryWritten');
    if (contract.dry_run_result.normalizedResultExpected !== true) {
      invalidFields.push('dryRunContract.dry_run_result.normalizedResultExpected');
    }
    if (contract.dry_run_result.exactApprovalStillRequired !== true) {
      invalidFields.push('dryRunContract.dry_run_result.exactApprovalStillRequired');
    }
  }
  for (const field of [
    'runtimeExecuted',
    'liveVcpToolBoxCalled',
    'networkCalled',
    'requestBodyGenerated',
    'responseBodyRead',
    'memoryReadPerformed',
    'memoryWritten',
    'durableWritePerformed',
    'providerApiCalled',
    'publicMcpExpanded',
    'authorizationRequestCreated',
    'approvalLineGenerated',
    'readinessClaimed'
  ]) {
    if (Object.prototype.hasOwnProperty.call(contract, field) && contract[field] !== false) {
      invalidFields.push(`dryRunContract.${field}`);
    }
  }
  return invalidFields;
}

function invalidRequestBoundaryFields(boundary) {
  const invalidFields = [];
  if (!isPlainObject(boundary)) return ['requestBoundary'];
  if (boundary.action !== 'one_read_only_vcp_native_proof') invalidFields.push('requestBoundary.action');
  if (boundary.profile !== 'observe-lite') invalidFields.push('requestBoundary.profile');
  if (boundary.maxRuntimeCalls !== 1) invalidFields.push('requestBoundary.maxRuntimeCalls');
  if (boundary.maxNetworkCalls !== 1) invalidFields.push('requestBoundary.maxNetworkCalls');
  if (boundary.writeBudget !== 0) invalidFields.push('requestBoundary.writeBudget');
  if (boundary.responseBodyByteBudget !== 0) invalidFields.push('requestBoundary.responseBodyByteBudget');
  if (boundary.logReadBudget !== 0) invalidFields.push('requestBoundary.logReadBudget');
  if (boundary.resultProjection !== 'shape_only') invalidFields.push('requestBoundary.resultProjection');
  if (!isSafeReferenceName(boundary.targetReferenceName)) invalidFields.push('requestBoundary.targetReferenceName');
  if (!SOURCE_COMPONENTS.includes(boundary.component)) invalidFields.push('requestBoundary.component');
  if (!READ_ACTIONS.includes(boundary.componentAction)) invalidFields.push('requestBoundary.componentAction');
  return invalidFields;
}

function exactApprovalMissing(approval) {
  if (!isPlainObject(approval)) return true;
  return approval.currentExternalApprovalPresent !== true;
}

function boundaryViolationsForExactApproval(approval, boundary) {
  const violations = [];
  if (!isPlainObject(approval)) return ['exactApproval'];
  for (const field of REQUIRED_EXACT_APPROVAL_FIELDS) {
    if (!(field in approval)) violations.push(`exactApproval.${field}`);
  }
  if (approval.currentExternalApprovalPresent !== true) violations.push('exactApproval.currentExternalApprovalPresent');
  if (!isSafeReferenceName(approval.approvalReference)) violations.push('exactApproval.approvalReference');
  if (approval.targetReferenceName !== boundary.targetReferenceName) violations.push('exactApproval.targetReferenceName');
  if (approval.component !== boundary.component) violations.push('exactApproval.component');
  if (approval.componentAction !== boundary.componentAction) violations.push('exactApproval.componentAction');
  if (approval.profile !== boundary.profile) violations.push('exactApproval.profile');
  if (approval.maxRuntimeCalls !== boundary.maxRuntimeCalls) violations.push('exactApproval.maxRuntimeCalls');
  if (approval.maxNetworkCalls !== boundary.maxNetworkCalls) violations.push('exactApproval.maxNetworkCalls');
  if (approval.writeBudget !== 0) violations.push('exactApproval.writeBudget');
  if (approval.responseBodyByteBudget !== 0) violations.push('exactApproval.responseBodyByteBudget');
  if (approval.logReadBudget !== 0) violations.push('exactApproval.logReadBudget');
  if (approval.resultProjection !== 'shape_only') violations.push('exactApproval.resultProjection');
  if (approval.noWriteRuleAccepted !== true) violations.push('exactApproval.noWriteRuleAccepted');
  if (approval.noBodyLogRuleAccepted !== true) violations.push('exactApproval.noBodyLogRuleAccepted');
  if (approval.stopConditionsAccepted !== true) violations.push('exactApproval.stopConditionsAccepted');
  if (approval.approvalLineValueIncluded !== false) violations.push('exactApproval.approvalLineValueIncluded');
  if (approval.requestBodyIncluded !== false) violations.push('exactApproval.requestBodyIncluded');
  if (approval.rawOutputAllowed !== false) violations.push('exactApproval.rawOutputAllowed');
  return [...new Set(violations)];
}

function buildVcpNativeReadOnlyProofExecutionHarness(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const mode = modeOf(input);
  if (!Object.values(MODES).includes(mode)) {
    return rejected('invalid_harness_mode', input, { invalidFields: ['mode'] });
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_REQUEST_BOUNDARY_FIELDS, input.requestBoundary, 'requestBoundary')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_harness_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_secret_body_runtime_or_authorization_fields', input, { forbiddenFields });
  }

  const forbiddenCounters = collectInvalidCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('non_zero_or_unknown_side_effect_counters', input, { forbiddenCounters });
  }

  const invalidFields = [
    ...(input.schemaVersion !== SCHEMA_VERSION ? ['schemaVersion'] : []),
    ...(!isSafeReferenceName(input.taskId) ? ['taskId'] : []),
    ...invalidDryRunContractFields(input.dryRunContract),
    ...invalidRequestBoundaryFields(input.requestBoundary)
  ];
  if (invalidFields.length > 0) {
    return rejected('invalid_no_run_execution_harness_boundary', input, { invalidFields });
  }

  if (mode === MODES.DRY_RUN) {
    return {
      accepted: true,
      contractName: CONTRACT_NAME,
      contractMode: CONTRACT_MODE,
      schemaVersion: SCHEMA_VERSION,
      taskId: input.taskId,
      mode,
      modePolicy: MODE_POLICY,
      lowDisclosure: true,
      lowDisclosureProjection: lowDisclosureProjection(input),
      dryRunDefaultNoRun: true,
      exactApprovedLiveModeDefault: false,
      requiresExternalApproval: false,
      exactApprovalStillRequiredForLive: true,
      result: resultShape({
        accepted: true,
        mode,
        reason: null,
        exactApprovalRequired: true
      }),
      counters: { ...ZERO_COUNTERS },
      nextAction: 'cm1915_dry_run_harness_ready_stop_before_exact_approved_live_mode',
      ...zeroSideEffectFlags()
    };
  }

  if (exactApprovalMissing(input.exactApproval)) {
    return rejected('exact_approval_required', input);
  }

  const boundaryViolations = boundaryViolationsForExactApproval(input.exactApproval, input.requestBoundary);
  if (boundaryViolations.length > 0) {
    return rejected('boundary_violation', input, { boundaryViolations });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    taskId: input.taskId,
    mode,
    modePolicy: MODE_POLICY,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    dryRunDefaultNoRun: false,
    exactApprovedLiveModeDefault: false,
    requiresExternalApproval: true,
    exactApprovalAcceptedForNextStep: true,
    liveReadOnlyProofMayProceedToCm1916: true,
    result: resultShape({
      accepted: true,
      reason: null,
      mode,
      exactApprovalRequired: false,
      readyForCm1916LiveProof: true
    }),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'cm1916_execute_one_exact_approved_live_observe_lite_proof_under_current_boundary',
    ...zeroSideEffectFlags()
  };
}

module.exports = {
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  MODE_POLICY,
  MODES,
  REQUIRED_EXACT_APPROVAL_FIELDS,
  REQUIRED_REQUEST_BOUNDARY_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  SCHEMA_VERSION,
  ZERO_COUNTERS,
  ZERO_COUNTER_FIELDS,
  buildVcpNativeReadOnlyProofExecutionHarness
};
