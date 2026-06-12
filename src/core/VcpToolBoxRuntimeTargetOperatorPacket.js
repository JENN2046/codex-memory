'use strict';

const {
  PROFILES,
  READ_ACTIONS,
  TARGET_KINDS,
  WRITE_ACTIONS,
  WRITE_PROPOSAL_ACTIONS
} = require('./VcpToolBoxFullCapabilityBridgePlan');
const {
  DISCOVERY_SOURCES,
  ZERO_COUNTER_FIELDS
} = require('./VcpToolBoxRuntimeTargetLocatorPreflight');
const {
  isSafeOperatorIntent,
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpToolBoxRuntimeTargetOperatorPacket';
const CONTRACT_MODE = 'source_contract_only';
const SCHEMA_VERSION = 1;
const SOURCE_SYSTEM = 'VCPToolBox';

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'sourceSystem',
  'packetId',
  'operatorIntent',
  'target',
  'intendedProfile',
  'requestedActions',
  'principalScope',
  'nonSecretAssertions'
]);

const REQUIRED_TARGET_FIELDS = Object.freeze([
  'kind',
  'referenceName',
  'discoverySource',
  'locatorHashPresent',
  'locatorValueIncluded',
  'secretMaterialIncluded',
  'configEnvRead',
  'runtimeCalled',
  'observedPresent',
  'runtimeEntrypointKnown'
]);

const REQUIRED_PRINCIPAL_SCOPE_FIELDS = Object.freeze([
  'agentAlias',
  'agentIdPresent',
  'projectIdPresent',
  'workspaceIdPresent',
  'clientIdPresent',
  'sessionIdPresent'
]);

const REQUIRED_NON_SECRET_ASSERTIONS = Object.freeze([
  'pathValueOmitted',
  'endpointValueOmitted',
  'tokenValueOmitted',
  'configEnvValueOmitted',
  'rawMemoryValueOmitted',
  'locatorHashOnly',
  'operatorOwnsTargetReference'
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

function lowDisclosureProjection(input) {
  if (!isPlainObject(input)) {
    return {
      sourceSystem: null,
      packetId: null,
      intendedProfile: null,
      targetKind: null,
      referenceName: null
    };
  }

  return {
    sourceSystem: typeof input.sourceSystem === 'string' ? input.sourceSystem : null,
    packetId: isSafeReferenceName(input.packetId) ? input.packetId : null,
    intendedProfile: typeof input.intendedProfile === 'string' ? input.intendedProfile : null,
    targetKind: isPlainObject(input.target) && typeof input.target.kind === 'string' ? input.target.kind : null,
    referenceName: isPlainObject(input.target) && isSafeReferenceName(input.target.referenceName)
      ? input.target.referenceName
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
    invalidFields: details.invalidFields || [],
    rejectedActions: details.rejectedActions || [],
    sanitizedTarget: null,
    locatorPreflightInput: null,
    nextAction: 'fix_operator_packet_or_stop',
    runtimeWiringExecuted: false,
    liveVcpToolBoxCalled: false,
    configEnvRead: false,
    envFileRead: false,
    secretMaterialRead: false,
    endpointOrPathValueAccepted: false,
    rawMemoryRead: false,
    broadFilesystemScanPerformed: false,
    providerApiCalled: false,
    memoryWritten: false,
    publicMcpExpanded: false,
    readinessClaimAllowed: false
  };
}

function allowedActionsForProfile(profile) {
  if (profile === PROFILES.OBSERVE_LITE || profile === PROFILES.OBSERVE_FULL || profile === PROFILES.TRUSTED_FULL_READ) {
    return [...READ_ACTIONS];
  }
  if (profile === PROFILES.TRUSTED_WRITE_PROPOSAL) {
    return [...READ_ACTIONS, ...WRITE_PROPOSAL_ACTIONS];
  }
  if (profile === PROFILES.TRUSTED_FULL) {
    return [...READ_ACTIONS, ...WRITE_PROPOSAL_ACTIONS, ...WRITE_ACTIONS];
  }
  return [];
}

function validatePrincipalScope(principalScope) {
  const invalidFields = [];
  if (!isPlainObject(principalScope)) return ['principalScope'];
  if (principalScope.agentAlias !== 'Codex') invalidFields.push('principalScope.agentAlias');
  for (const field of REQUIRED_PRINCIPAL_SCOPE_FIELDS.filter(field => field !== 'agentAlias')) {
    if (principalScope[field] !== true) invalidFields.push(`principalScope.${field}`);
  }
  return invalidFields;
}

function buildLocatorPreflightInput(input) {
  return {
    schemaVersion: 1,
    sourceSystem: SOURCE_SYSTEM,
    discoverySources: [input.target.discoverySource],
    candidateTargets: [
      {
        kind: input.target.kind,
        referenceName: input.target.referenceName,
        discoverySource: input.target.discoverySource,
        locatorHashPresent: true,
        locatorValueIncluded: false,
        secretMaterialIncluded: false,
        configEnvRead: false,
        runtimeCalled: false,
        observedPresent: input.target.observedPresent === true,
        runtimeEntrypointKnown: input.target.runtimeEntrypointKnown === true
      }
    ],
    policy: {
      allowLocatorValues: false,
      allowSecretMaterial: false,
      allowConfigEnvRead: false,
      allowRuntimeCall: false,
      allowBroadFilesystemScan: false,
      allowProviderCall: false
    },
    counters: { ...ZERO_COUNTERS }
  };
}

function buildVcpToolBoxRuntimeTargetOperatorPacket(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_TARGET_FIELDS, input.target, 'target'),
    ...missingFields(REQUIRED_PRINCIPAL_SCOPE_FIELDS, input.principalScope, 'principalScope'),
    ...missingFields(REQUIRED_NON_SECRET_ASSERTIONS, input.nonSecretAssertions, 'nonSecretAssertions')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_secret_locator_or_raw_fields', input, { forbiddenFields });
  }

  const invalidFields = [];
  if (input.schemaVersion !== SCHEMA_VERSION) invalidFields.push('schemaVersion');
  if (input.sourceSystem !== SOURCE_SYSTEM) invalidFields.push('sourceSystem');
  if (!isSafeReferenceName(input.packetId)) invalidFields.push('packetId');
  if (!isSafeOperatorIntent(input.operatorIntent)) invalidFields.push('operatorIntent');
  if (!TARGET_KINDS.includes(input.target.kind)) invalidFields.push('target.kind');
  if (!isSafeReferenceName(input.target.referenceName)) {
    invalidFields.push('target.referenceName');
  }
  if (!DISCOVERY_SOURCES.includes(input.target.discoverySource)) invalidFields.push('target.discoverySource');
  if (input.target.locatorHashPresent !== true) invalidFields.push('target.locatorHashPresent');
  if (input.target.locatorValueIncluded !== false) invalidFields.push('target.locatorValueIncluded');
  if (input.target.secretMaterialIncluded !== false) invalidFields.push('target.secretMaterialIncluded');
  if (input.target.configEnvRead !== false) invalidFields.push('target.configEnvRead');
  if (input.target.runtimeCalled !== false) invalidFields.push('target.runtimeCalled');
  if (typeof input.target.observedPresent !== 'boolean') invalidFields.push('target.observedPresent');
  if (typeof input.target.runtimeEntrypointKnown !== 'boolean') invalidFields.push('target.runtimeEntrypointKnown');
  if (!Object.values(PROFILES).includes(input.intendedProfile)) invalidFields.push('intendedProfile');
  invalidFields.push(...validatePrincipalScope(input.principalScope));
  for (const field of REQUIRED_NON_SECRET_ASSERTIONS) {
    if (input.nonSecretAssertions[field] !== true) invalidFields.push(`nonSecretAssertions.${field}`);
  }

  if (!Array.isArray(input.requestedActions) || input.requestedActions.length === 0) {
    invalidFields.push('requestedActions');
  }

  const allowedActions = allowedActionsForProfile(input.intendedProfile);
  const rejectedActions = Array.isArray(input.requestedActions)
    ? input.requestedActions.filter(action => !allowedActions.includes(action))
    : [];

  if (invalidFields.length > 0) {
    return rejected('invalid_runtime_target_operator_packet', input, { invalidFields });
  }
  if (rejectedActions.length > 0) {
    return rejected('requested_actions_not_allowed_by_profile', input, { rejectedActions });
  }

  const sanitizedTarget = {
    kind: input.target.kind,
    referenceName: input.target.referenceName,
    discoverySource: input.target.discoverySource,
    locatorHashPresent: true,
    locatorValueIncluded: false,
    secretMaterialIncluded: false,
    observedPresent: input.target.observedPresent === true,
    runtimeEntrypointKnown: input.target.runtimeEntrypointKnown === true
  };

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    packetId: input.packetId,
    sourceSystem: SOURCE_SYSTEM,
    operatorIntentPresent: true,
    intendedProfile: input.intendedProfile,
    requestedActions: [...input.requestedActions],
    sanitizedTarget,
    locatorPreflightInput: buildLocatorPreflightInput(input),
    nextAction: 'run_cm1690_locator_preflight_with_operator_packet_target',
    requiredNextValidation: [
      'node --test tests\\vcp-toolbox-runtime-target-locator-preflight.test.js',
      'node --test tests\\vcp-toolbox-full-capability-bridge-plan.test.js'
    ],
    runtimeWiringExecuted: false,
    liveVcpToolBoxCalled: false,
    configEnvRead: false,
    envFileRead: false,
    secretMaterialRead: false,
    endpointOrPathValueAccepted: false,
    rawMemoryRead: false,
    broadFilesystemScanPerformed: false,
    providerApiCalled: false,
    memoryWritten: false,
    publicMcpExpanded: false,
    readinessClaimAllowed: false
  };
}

module.exports = {
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_NON_SECRET_ASSERTIONS,
  REQUIRED_TARGET_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  buildVcpToolBoxRuntimeTargetOperatorPacket
};
