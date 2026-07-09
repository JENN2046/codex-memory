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

const CONTRACT_NAME = 'VcpNativeRuntimeTargetDiagnosisContract';
const CONTRACT_MODE = 'source_only_runtime_target_diagnosis_contract_no_live_call';
const SCHEMA_VERSION = 1;

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'targetReferenceResolution',
  'transportReachability',
  'runtimeProcessState',
  'componentActionMapping',
  'harnessBinding',
  'counters'
]);

const REQUIRED_TARGET_REFERENCE_FIELDS = Object.freeze([
  'targetReferenceName',
  'referencePresent',
  'locatorHashPresent',
  'locatorValueDisclosed',
  'endpointDisclosed'
]);

const REQUIRED_TRANSPORT_FIELDS = Object.freeze([
  'transportReachabilityKnown',
  'statusOnly',
  'bodyRead',
  'logRead',
  'secretRead',
  'requiresNewExactApproval'
]);

const REQUIRED_RUNTIME_PROCESS_FIELDS = Object.freeze([
  'runtimeProcessStateKnown',
  'runningOrNotRunningKnown',
  'processCountBucket',
  'commandLineRedacted',
  'envRead',
  'requiresNewExactApproval'
]);

const REQUIRED_COMPONENT_ACTION_FIELDS = Object.freeze([
  'componentKnown',
  'actionKnown',
  'component',
  'action',
  'mappingSource',
  'rawPluginConfigRead',
  'privateMemoryContentRead'
]);

const REQUIRED_HARNESS_FIELDS = Object.freeze([
  'wrapperPlanValid',
  'targetReferenceName',
  'profile',
  'component',
  'action',
  'noWriteBudgetZero',
  'bodyBudgetZero',
  'responseBodyBudgetZero',
  'requestBodyGenerated'
]);

const ALLOWED_PROCESS_COUNT_BUCKETS = Object.freeze([
  'unknown',
  'zero',
  'one',
  'multiple'
]);

const ALLOWED_MAPPING_SOURCES = Object.freeze([
  'source_alias_only',
  'manifest_source_alias_only',
  'not_checked'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'endpoint',
  'url',
  'baseUrl',
  'runtimeEndpoint',
  'runtimeUrl',
  'locatorValue',
  'rawLocatorValue',
  'config',
  'configEnv',
  'configEnvPath',
  'env',
  'envPath',
  'token',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'secret',
  'secrets',
  'credential',
  'credentials',
  'privateKey',
  'password',
  'approvalLine',
  'approvalLineText',
  'approvalLineValue',
  'approvalRequestBody',
  'requestBody',
  'requestPayload',
  'responseBody',
  'rawResponseBody',
  'responsePayload',
  'rawPayload',
  'rawOutput',
  'rawErrorPayload',
  'rawMemoryText',
  'rawText',
  'memoryId',
  'memoryIds',
  'memory_id',
  'stdout',
  'stderr',
  'log',
  'logs',
  'rawLog',
  'providerPayload',
  'command',
  'commandLine',
  'curl',
  'rawPluginConfig'
]);

const ZERO_COUNTERS = Object.freeze({
  runtimeCalls: 0,
  liveVcpToolBoxCalls: 0,
  networkCalls: 0,
  liveProcessInspections: 0,
  endpointDisclosures: 0,
  locatorValueDisclosures: 0,
  configEnvReads: 0,
  secretReads: 0,
  logReads: 0,
  stdoutStderrReads: 0,
  responseBodiesRead: 0,
  rawErrorPayloadsRead: 0,
  rawPluginConfigReads: 0,
  privateMemoryContentReads: 0,
  requestBodiesGenerated: 0,
  approvalLineOperations: 0,
  memoryReads: 0,
  memoryWrites: 0,
  durableWrites: 0,
  providerApiCalls: 0,
  publicMcpExpansions: 0,
  readinessClaims: 0
});

const ZERO_COUNTER_FIELDS = Object.freeze(Object.keys(ZERO_COUNTERS));

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

function lowDisclosureProjection(input) {
  if (!isPlainObject(input)) {
    return {
      taskId: null,
      targetReferenceName: null,
      profile: null,
      action: null
    };
  }

  const target = isPlainObject(input.targetReferenceResolution) ? input.targetReferenceResolution : {};
  const harness = isPlainObject(input.harnessBinding) ? input.harnessBinding : {};

  return {
    taskId: isSafeReferenceName(input.taskId) ? input.taskId : null,
    targetReferenceName: isSafeReferenceName(target.targetReferenceName) ? target.targetReferenceName : null,
    profile: READ_ONLY_PROFILES.includes(harness.profile) ? harness.profile : null,
    action: READ_ACTIONS.includes(harness.action) ? harness.action : null
  };
}

function zeroSideEffectFlags() {
  return {
    runtimeExecuted: false,
    liveVcpToolBoxCalled: false,
    networkCalled: false,
    liveProcessInspected: false,
    endpointDisclosed: false,
    locatorValueDisclosed: false,
    configEnvRead: false,
    secretRead: false,
    logRead: false,
    stdoutRead: false,
    stderrRead: false,
    requestBodyGenerated: false,
    responseBodyRead: false,
    rawErrorPayloadRead: false,
    rawPluginConfigRead: false,
    privateMemoryContentRead: false,
    memoryReadPerformed: false,
    memoryWritten: false,
    durableWritePerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    approvalLineGenerated: false,
    readinessClaimed: false
  };
}

function diagnosisResult(overrides = {}) {
  return {
    accepted: false,
    targetReferenceKnown: false,
    locatorValueDisclosed: false,
    endpointDisclosed: false,
    transportReachabilityKnown: false,
    runtimeProcessStateKnown: false,
    componentActionMappingKnown: false,
    nextLiveDiagnosticRequiresExactApproval: true,
    ...overrides
  };
}

function rejected(reasonCode, input, details = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    reasonCode,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: details.missingFields || [],
    forbiddenFields: details.forbiddenFields || [],
    forbiddenCounters: details.forbiddenCounters || [],
    invalidFields: details.invalidFields || [],
    diagnosis_result: diagnosisResult(),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'fix_cm1919_runtime_target_diagnosis_contract_or_request_exact_transport_diagnosis_approval',
    ...zeroSideEffectFlags()
  };
}

function invalidTargetReferenceFields(target) {
  const invalidFields = [];
  if (!isPlainObject(target)) return ['targetReferenceResolution'];
  if (!isSafeReferenceName(target.targetReferenceName)) invalidFields.push('targetReferenceResolution.targetReferenceName');
  if (target.referencePresent !== true) invalidFields.push('targetReferenceResolution.referencePresent');
  if (target.locatorHashPresent !== true) invalidFields.push('targetReferenceResolution.locatorHashPresent');
  if (target.locatorValueDisclosed !== false) invalidFields.push('targetReferenceResolution.locatorValueDisclosed');
  if (target.endpointDisclosed !== false) invalidFields.push('targetReferenceResolution.endpointDisclosed');
  return invalidFields;
}

function invalidTransportFields(transport) {
  const invalidFields = [];
  if (!isPlainObject(transport)) return ['transportReachability'];
  if (transport.transportReachabilityKnown !== false) {
    invalidFields.push('transportReachability.transportReachabilityKnown');
  }
  if (transport.statusOnly !== false) invalidFields.push('transportReachability.statusOnly');
  if (transport.bodyRead !== false) invalidFields.push('transportReachability.bodyRead');
  if (transport.logRead !== false) invalidFields.push('transportReachability.logRead');
  if (transport.secretRead !== false) invalidFields.push('transportReachability.secretRead');
  if (transport.requiresNewExactApproval !== true) {
    invalidFields.push('transportReachability.requiresNewExactApproval');
  }
  return invalidFields;
}

function invalidRuntimeProcessFields(runtimeProcess) {
  const invalidFields = [];
  if (!isPlainObject(runtimeProcess)) return ['runtimeProcessState'];
  if (runtimeProcess.runtimeProcessStateKnown !== false) {
    invalidFields.push('runtimeProcessState.runtimeProcessStateKnown');
  }
  if (runtimeProcess.runningOrNotRunningKnown !== false) {
    invalidFields.push('runtimeProcessState.runningOrNotRunningKnown');
  }
  if (!ALLOWED_PROCESS_COUNT_BUCKETS.includes(runtimeProcess.processCountBucket)) {
    invalidFields.push('runtimeProcessState.processCountBucket');
  }
  if (runtimeProcess.processCountBucket !== 'unknown') {
    invalidFields.push('runtimeProcessState.processCountBucket');
  }
  if (runtimeProcess.commandLineRedacted !== true) {
    invalidFields.push('runtimeProcessState.commandLineRedacted');
  }
  if (runtimeProcess.envRead !== false) invalidFields.push('runtimeProcessState.envRead');
  if (runtimeProcess.requiresNewExactApproval !== true) {
    invalidFields.push('runtimeProcessState.requiresNewExactApproval');
  }
  return invalidFields;
}

function componentActionMappingKnown(mapping) {
  return mapping.componentKnown === true &&
    mapping.actionKnown === true &&
    SOURCE_COMPONENTS.includes(mapping.component) &&
    READ_ACTIONS.includes(mapping.action) &&
    ['source_alias_only', 'manifest_source_alias_only'].includes(mapping.mappingSource);
}

function invalidComponentActionFields(mapping) {
  const invalidFields = [];
  if (!isPlainObject(mapping)) return ['componentActionMapping'];
  if (typeof mapping.componentKnown !== 'boolean') invalidFields.push('componentActionMapping.componentKnown');
  if (typeof mapping.actionKnown !== 'boolean') invalidFields.push('componentActionMapping.actionKnown');
  if (mapping.componentKnown === true && !SOURCE_COMPONENTS.includes(mapping.component)) {
    invalidFields.push('componentActionMapping.component');
  }
  if (mapping.actionKnown === true && !READ_ACTIONS.includes(mapping.action)) {
    invalidFields.push('componentActionMapping.action');
  }
  if (!ALLOWED_MAPPING_SOURCES.includes(mapping.mappingSource)) {
    invalidFields.push('componentActionMapping.mappingSource');
  }
  if (mapping.rawPluginConfigRead !== false) invalidFields.push('componentActionMapping.rawPluginConfigRead');
  if (mapping.privateMemoryContentRead !== false) {
    invalidFields.push('componentActionMapping.privateMemoryContentRead');
  }
  if ((mapping.componentKnown === false || mapping.actionKnown === false) && mapping.mappingSource !== 'not_checked') {
    invalidFields.push('componentActionMapping.mappingSource');
  }
  return invalidFields;
}

function invalidHarnessBindingFields(harness, target, mapping) {
  const invalidFields = [];
  if (!isPlainObject(harness)) return ['harnessBinding'];
  if (harness.wrapperPlanValid !== true) invalidFields.push('harnessBinding.wrapperPlanValid');
  if (harness.targetReferenceName !== target.targetReferenceName) invalidFields.push('harnessBinding.targetReferenceName');
  if (!READ_ONLY_PROFILES.includes(harness.profile)) invalidFields.push('harnessBinding.profile');
  if (mapping.componentKnown === true && harness.component !== mapping.component) invalidFields.push('harnessBinding.component');
  if (mapping.actionKnown === true && harness.action !== mapping.action) invalidFields.push('harnessBinding.action');
  if (harness.noWriteBudgetZero !== true) invalidFields.push('harnessBinding.noWriteBudgetZero');
  if (harness.bodyBudgetZero !== true) invalidFields.push('harnessBinding.bodyBudgetZero');
  if (harness.responseBodyBudgetZero !== true) invalidFields.push('harnessBinding.responseBodyBudgetZero');
  if (harness.requestBodyGenerated !== false) invalidFields.push('harnessBinding.requestBodyGenerated');
  return invalidFields;
}

function invalidFields(input) {
  const target = input.targetReferenceResolution;
  const mapping = input.componentActionMapping;
  return [
    ...(input.schemaVersion !== SCHEMA_VERSION ? ['schemaVersion'] : []),
    ...(!isSafeReferenceName(input.taskId) ? ['taskId'] : []),
    ...invalidTargetReferenceFields(target),
    ...invalidTransportFields(input.transportReachability),
    ...invalidRuntimeProcessFields(input.runtimeProcessState),
    ...invalidComponentActionFields(mapping),
    ...invalidHarnessBindingFields(input.harnessBinding, target || {}, mapping || {})
  ];
}

function buildVcpNativeRuntimeTargetDiagnosisContract(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_TARGET_REFERENCE_FIELDS, input.targetReferenceResolution, 'targetReferenceResolution'),
    ...missingFields(REQUIRED_TRANSPORT_FIELDS, input.transportReachability, 'transportReachability'),
    ...missingFields(REQUIRED_RUNTIME_PROCESS_FIELDS, input.runtimeProcessState, 'runtimeProcessState'),
    ...missingFields(REQUIRED_COMPONENT_ACTION_FIELDS, input.componentActionMapping, 'componentActionMapping'),
    ...missingFields(REQUIRED_HARNESS_FIELDS, input.harnessBinding, 'harnessBinding')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_diagnosis_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_runtime_target_diagnosis_material', input, { forbiddenFields });
  }

  const forbiddenCounters = collectInvalidCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('non_zero_or_unknown_diagnosis_counters', input, { forbiddenCounters });
  }

  const invalid = invalidFields(input);
  if (invalid.length > 0) {
    return rejected('invalid_runtime_target_diagnosis_contract', input, { invalidFields: invalid });
  }

  const mappingKnown = componentActionMappingKnown(input.componentActionMapping);
  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    taskId: input.taskId,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    diagnosisContractLocked: true,
    diagnosis_result: diagnosisResult({
      accepted: true,
      targetReferenceKnown: true,
      locatorValueDisclosed: false,
      endpointDisclosed: false,
      transportReachabilityKnown: false,
      runtimeProcessStateKnown: false,
      componentActionMappingKnown: mappingKnown,
      nextLiveDiagnosticRequiresExactApproval: true
    }),
    counters: { ...ZERO_COUNTERS },
    nextAction: 'cm1920_prepare_exact_approval_packet_for_one_transport_diagnosis_without_live_call',
    ...zeroSideEffectFlags()
  };
}

module.exports = {
  ALLOWED_MAPPING_SOURCES,
  ALLOWED_PROCESS_COUNT_BUCKETS,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_TOP_LEVEL_FIELDS,
  SCHEMA_VERSION,
  ZERO_COUNTERS,
  ZERO_COUNTER_FIELDS,
  buildVcpNativeRuntimeTargetDiagnosisContract
};
