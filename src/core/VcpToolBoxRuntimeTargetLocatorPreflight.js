'use strict';

const { TARGET_KINDS } = require('./VcpToolBoxFullCapabilityBridgePlan');
const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpToolBoxRuntimeTargetLocatorPreflight';
const CONTRACT_MODE = 'source_contract_only';
const SCHEMA_VERSION = 1;
const SOURCE_SYSTEM = 'VCPToolBox';

const DISCOVERY_SOURCES = Object.freeze([
  'default_path_probe',
  'operator_provided',
  'service_registry_reference',
  'mcp_server_name',
  'cli_name',
  'plugin_api_name',
  'ipc_name'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'sourceSystem',
  'discoverySources',
  'candidateTargets',
  'policy',
  'counters'
]);

const REQUIRED_CANDIDATE_FIELDS = Object.freeze([
  'kind',
  'referenceName',
  'discoverySource',
  'locatorHashPresent',
  'locatorValueIncluded',
  'secretMaterialIncluded',
  'configEnvRead',
  'runtimeCalled',
  'observedPresent'
]);

const REQUIRED_POLICY_FIELDS = Object.freeze([
  'allowLocatorValues',
  'allowSecretMaterial',
  'allowConfigEnvRead',
  'allowRuntimeCall',
  'allowBroadFilesystemScan',
  'allowProviderCall'
]);

const ZERO_COUNTER_FIELDS = Object.freeze([
  'configEnvReads',
  'envFileReads',
  'secretReads',
  'runtimeCalls',
  'networkCalls',
  'mcpCalls',
  'providerApiCalls',
  'rawStoreReads',
  'broadFilesystemScans',
  'memoryWrites',
  'publicMcpExpansions'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'locatorValue',
  'path',
  'absolutePath',
  'endpoint',
  'url',
  'baseUrl',
  'configEnvPath',
  'configEnv',
  'env',
  'token',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'sharedSecret',
  'privateKey',
  'password',
  'rawDailyNoteContent',
  'rawRagInjectedContext',
  'rawVectorRows',
  'rawPrompt',
  'rawConversation'
]);

const ZERO_COUNTERS = Object.freeze(ZERO_COUNTER_FIELDS.reduce((accumulator, field) => {
  accumulator[field] = 0;
  return accumulator;
}, {}));

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
      candidateTargetCount: 0,
      discoverySources: []
    };
  }
  return {
    sourceSystem: typeof input.sourceSystem === 'string' ? input.sourceSystem : null,
    candidateTargetCount: Array.isArray(input.candidateTargets) ? input.candidateTargets.length : 0,
    discoverySources: Array.isArray(input.discoverySources) ? [...input.discoverySources] : []
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
    acceptedTargets: [],
    foundTargets: [],
    sanitizedTargets: [],
    nextAction: 'fix_locator_preflight_or_stop',
    counters: { ...ZERO_COUNTERS },
    runtimeWiringExecuted: false,
    liveVcpToolBoxCalled: false,
    configEnvRead: false,
    envFileRead: false,
    secretMaterialRead: false,
    broadFilesystemScanPerformed: false,
    providerApiCalled: false,
    rawStoreRead: false,
    memoryWritten: false,
    publicMcpExpanded: false,
    readinessClaimAllowed: false
  };
}

function sanitizeTarget(candidate) {
  return {
    kind: candidate.kind,
    referenceName: candidate.referenceName,
    discoverySource: candidate.discoverySource,
    locatorHashPresent: true,
    locatorValueIncluded: false,
    secretMaterialIncluded: false,
    observedPresent: candidate.observedPresent === true,
    runtimeEntrypointKnown: candidate.runtimeEntrypointKnown === true
  };
}

function compatibleBridgeTarget(candidate) {
  return {
    kind: candidate.kind,
    referenceName: candidate.referenceName,
    locatorHashPresent: true,
    locatorValueIncluded: false,
    secretMaterialIncluded: false
  };
}

function validateCandidate(candidate, index) {
  const prefix = `candidateTargets[${index}]`;
  const invalidFields = [];
  const missingFieldsForCandidate = missingFields(REQUIRED_CANDIDATE_FIELDS, candidate, prefix);

  if (missingFieldsForCandidate.length > 0) {
    return { missingFields: missingFieldsForCandidate, invalidFields };
  }

  if (!TARGET_KINDS.includes(candidate.kind)) invalidFields.push(`${prefix}.kind`);
  if (!isSafeReferenceName(candidate.referenceName)) {
    invalidFields.push(`${prefix}.referenceName`);
  }
  if (!DISCOVERY_SOURCES.includes(candidate.discoverySource)) invalidFields.push(`${prefix}.discoverySource`);
  if (candidate.locatorHashPresent !== true) invalidFields.push(`${prefix}.locatorHashPresent`);
  if (candidate.locatorValueIncluded !== false) invalidFields.push(`${prefix}.locatorValueIncluded`);
  if (candidate.secretMaterialIncluded !== false) invalidFields.push(`${prefix}.secretMaterialIncluded`);
  if (candidate.configEnvRead !== false) invalidFields.push(`${prefix}.configEnvRead`);
  if (candidate.runtimeCalled !== false) invalidFields.push(`${prefix}.runtimeCalled`);
  if (typeof candidate.observedPresent !== 'boolean') invalidFields.push(`${prefix}.observedPresent`);
  if ('runtimeEntrypointKnown' in candidate && typeof candidate.runtimeEntrypointKnown !== 'boolean') {
    invalidFields.push(`${prefix}.runtimeEntrypointKnown`);
  }

  return { missingFields: [], invalidFields };
}

function buildVcpToolBoxRuntimeTargetLocatorPreflight(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_POLICY_FIELDS, input.policy, 'policy')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_locator_secret_or_raw_fields', input, { forbiddenFields });
  }

  const forbiddenCounters = collectPositiveCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('forbidden_positive_execution_counters', input, { forbiddenCounters });
  }

  const invalidFields = [];
  if (input.schemaVersion !== SCHEMA_VERSION) invalidFields.push('schemaVersion');
  if (input.sourceSystem !== SOURCE_SYSTEM) invalidFields.push('sourceSystem');
  if (!Array.isArray(input.discoverySources) || input.discoverySources.length === 0) {
    invalidFields.push('discoverySources');
  } else {
    for (const source of input.discoverySources) {
      if (!DISCOVERY_SOURCES.includes(source)) invalidFields.push(`discoverySources:${source}`);
    }
  }
  if (!Array.isArray(input.candidateTargets)) {
    invalidFields.push('candidateTargets');
  }
  for (const field of REQUIRED_POLICY_FIELDS) {
    if (input.policy[field] !== false) invalidFields.push(`policy.${field}`);
  }

  const candidateMissing = [];
  const candidateInvalid = [];
  if (Array.isArray(input.candidateTargets)) {
    input.candidateTargets.forEach((candidate, index) => {
      const result = validateCandidate(candidate, index);
      candidateMissing.push(...result.missingFields);
      candidateInvalid.push(...result.invalidFields);
    });
  }

  if (candidateMissing.length > 0) {
    return rejected('missing_required_candidate_fields', input, { missingFields: candidateMissing });
  }

  invalidFields.push(...candidateInvalid);
  if (invalidFields.length > 0) {
    return rejected('invalid_runtime_target_locator_contract', input, { invalidFields });
  }

  const sanitizedTargets = input.candidateTargets.map(sanitizeTarget);
  const foundTargets = sanitizedTargets.filter(target => target.observedPresent);
  const acceptedTargets = foundTargets.map(compatibleBridgeTarget);

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    sourceSystem: SOURCE_SYSTEM,
    discoverySources: [...input.discoverySources],
    acceptedTargets,
    foundTargets,
    sanitizedTargets,
    noTargetFound: foundTargets.length === 0,
    nextAction: foundTargets.length > 0
      ? 'feed_sanitized_target_to_cm1689_call_plan_contract'
      : 'provide_operator_target_or_run_safe_locator_again',
    counters: { ...ZERO_COUNTERS },
    runtimeWiringExecuted: false,
    liveVcpToolBoxCalled: false,
    configEnvRead: false,
    envFileRead: false,
    secretMaterialRead: false,
    broadFilesystemScanPerformed: false,
    providerApiCalled: false,
    rawStoreRead: false,
    memoryWritten: false,
    publicMcpExpanded: false,
    readinessClaimAllowed: false
  };
}

module.exports = {
  CONTRACT_MODE,
  CONTRACT_NAME,
  DISCOVERY_SOURCES,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_CANDIDATE_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  buildVcpToolBoxRuntimeTargetLocatorPreflight
};
