'use strict';

const { PROFILES, TARGET_KINDS } = require('./VcpToolBoxFullCapabilityBridgePlan');
const {
  DISCOVERY_SOURCES,
  ZERO_COUNTER_FIELDS
} = require('./VcpToolBoxRuntimeTargetLocatorPreflight');
const {
  isSafeOperatorIntent,
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpToolBoxLiveTargetProofPacketContract';
const CONTRACT_MODE = 'fixture_contract_only';
const SCHEMA_VERSION = 1;
const SOURCE_SYSTEM = 'VCPToolBox';

const PROOF_MODES = Object.freeze([
  'target_presence_no_memory',
  'runtime_handshake_no_memory',
  'entrypoint_shape_no_memory'
]);

const PROOF_ACTIONS_BY_MODE = Object.freeze({
  target_presence_no_memory: Object.freeze([
    'target_presence.check'
  ]),
  runtime_handshake_no_memory: Object.freeze([
    'target_presence.check',
    'runtime_handshake.check'
  ]),
  entrypoint_shape_no_memory: Object.freeze([
    'target_presence.check',
    'runtime_handshake.check',
    'entrypoint_shape.inspect'
  ])
});

const ALLOWED_PROOF_PROFILES = Object.freeze([
  PROFILES.OBSERVE_LITE,
  PROFILES.OBSERVE_FULL,
  PROFILES.TRUSTED_FULL_READ,
  PROFILES.TRUSTED_WRITE_PROPOSAL,
  PROFILES.TRUSTED_FULL
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'sourceSystem',
  'packetId',
  'operatorIntent',
  'target',
  'proofProfile',
  'proofMode',
  'allowedRuntimeActions',
  'principalScope',
  'executionAuthorization',
  'nonSecretAssertions',
  'validationPlan',
  'counters'
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

const REQUIRED_EXECUTION_AUTHORIZATION_FIELDS = Object.freeze([
  'liveExecutionApproved',
  'approvalTokenIncluded',
  'approvalTokenValueIncluded',
  'approvalTokenHashPresent'
]);

const REQUIRED_NON_SECRET_ASSERTIONS = Object.freeze([
  'pathValueOmitted',
  'endpointValueOmitted',
  'tokenValueOmitted',
  'configEnvValueOmitted',
  'rawMemoryValueOmitted',
  'targetReferenceOwned',
  'noMemoryRead',
  'noWrite',
  'noProviderCall',
  'noPublicMcpExpansion',
  'noReadinessClaim'
]);

const REQUIRED_VALIDATION_PLAN_FIELDS = Object.freeze([
  'freshGitRequired',
  'targetPacketValidationRequired',
  'postProofReceiptRequired',
  'noRawOutputPersistence',
  'maxRuntimeProbeMinutes',
  'maxRuntimeCalls'
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
  'approvalToken',
  'approvalTokenValue',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'sharedSecret',
  'privateKey',
  'password',
  'rawDailyNote',
  'rawDailyNoteContent',
  'rawRagInjectedContext',
  'rawVectorRows',
  'rawPrompt',
  'rawConversation'
]);

const ZERO_COUNTERS = Object.freeze({
  ...ZERO_COUNTER_FIELDS.reduce((accumulator, field) => {
    accumulator[field] = 0;
    return accumulator;
  }, {}),
  liveVcpToolBoxCalls: 0,
  liveTargetProofs: 0,
  durableMemoryWrites: 0,
  readinessClaims: 0
});

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
  if (!isPlainObject(counters)) return Object.keys(ZERO_COUNTERS);
  return Object.keys(ZERO_COUNTERS).filter(field => Number(counters[field] || 0) > 0);
}

function lowDisclosureProjection(input) {
  if (!isPlainObject(input)) {
    return {
      sourceSystem: null,
      packetId: null,
      proofProfile: null,
      proofMode: null,
      targetKind: null,
      referenceName: null
    };
  }

  return {
    sourceSystem: typeof input.sourceSystem === 'string' ? input.sourceSystem : null,
    packetId: isSafeReferenceName(input.packetId) ? input.packetId : null,
    proofProfile: typeof input.proofProfile === 'string' ? input.proofProfile : null,
    proofMode: typeof input.proofMode === 'string' ? input.proofMode : null,
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
    forbiddenCounters: details.forbiddenCounters || [],
    invalidFields: details.invalidFields || [],
    rejectedRuntimeActions: details.rejectedRuntimeActions || [],
    sanitizedTarget: null,
    plannedProof: null,
    nextAction: 'fix_live_target_proof_packet_or_stop',
    actionPlanOnly: true,
    runtimeExecutionAllowedByThisHelper: false,
    runtimeWiringExecuted: false,
    liveVcpToolBoxCalled: false,
    liveTargetProofExecuted: false,
    configEnvRead: false,
    envFileRead: false,
    secretMaterialRead: false,
    rawMemoryRead: false,
    memoryWritten: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    readinessClaimAllowed: false,
    counters: { ...ZERO_COUNTERS }
  };
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

function validateTarget(target) {
  const invalidFields = [];
  if (!isPlainObject(target)) return ['target'];
  if (!TARGET_KINDS.includes(target.kind)) invalidFields.push('target.kind');
  if (!isSafeReferenceName(target.referenceName)) invalidFields.push('target.referenceName');
  if (!DISCOVERY_SOURCES.includes(target.discoverySource)) invalidFields.push('target.discoverySource');
  if (target.locatorHashPresent !== true) invalidFields.push('target.locatorHashPresent');
  if (target.locatorValueIncluded !== false) invalidFields.push('target.locatorValueIncluded');
  if (target.secretMaterialIncluded !== false) invalidFields.push('target.secretMaterialIncluded');
  if (target.configEnvRead !== false) invalidFields.push('target.configEnvRead');
  if (target.runtimeCalled !== false) invalidFields.push('target.runtimeCalled');
  if (typeof target.observedPresent !== 'boolean') invalidFields.push('target.observedPresent');
  if (typeof target.runtimeEntrypointKnown !== 'boolean') invalidFields.push('target.runtimeEntrypointKnown');
  return invalidFields;
}

function validateExecutionAuthorization(executionAuthorization) {
  const invalidFields = [];
  if (!isPlainObject(executionAuthorization)) return ['executionAuthorization'];
  if (executionAuthorization.liveExecutionApproved !== false) {
    invalidFields.push('executionAuthorization.liveExecutionApproved');
  }
  if (executionAuthorization.approvalTokenIncluded !== false) {
    invalidFields.push('executionAuthorization.approvalTokenIncluded');
  }
  if (executionAuthorization.approvalTokenValueIncluded !== false) {
    invalidFields.push('executionAuthorization.approvalTokenValueIncluded');
  }
  if (executionAuthorization.approvalTokenHashPresent !== false) {
    invalidFields.push('executionAuthorization.approvalTokenHashPresent');
  }
  return invalidFields;
}

function validateNonSecretAssertions(nonSecretAssertions) {
  const invalidFields = [];
  if (!isPlainObject(nonSecretAssertions)) return ['nonSecretAssertions'];
  for (const field of REQUIRED_NON_SECRET_ASSERTIONS) {
    if (nonSecretAssertions[field] !== true) invalidFields.push(`nonSecretAssertions.${field}`);
  }
  return invalidFields;
}

function validateValidationPlan(validationPlan) {
  const invalidFields = [];
  if (!isPlainObject(validationPlan)) return ['validationPlan'];
  for (const field of REQUIRED_VALIDATION_PLAN_FIELDS.slice(0, 4)) {
    if (validationPlan[field] !== true) invalidFields.push(`validationPlan.${field}`);
  }
  if (!Number.isInteger(validationPlan.maxRuntimeProbeMinutes) ||
    validationPlan.maxRuntimeProbeMinutes < 1 ||
    validationPlan.maxRuntimeProbeMinutes > 10) {
    invalidFields.push('validationPlan.maxRuntimeProbeMinutes');
  }
  if (!Number.isInteger(validationPlan.maxRuntimeCalls) ||
    validationPlan.maxRuntimeCalls < 1 ||
    validationPlan.maxRuntimeCalls > 3) {
    invalidFields.push('validationPlan.maxRuntimeCalls');
  }
  return invalidFields;
}

function buildVcpToolBoxLiveTargetProofPacketContract(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_TARGET_FIELDS, input.target, 'target'),
    ...missingFields(REQUIRED_PRINCIPAL_SCOPE_FIELDS, input.principalScope, 'principalScope'),
    ...missingFields(REQUIRED_EXECUTION_AUTHORIZATION_FIELDS, input.executionAuthorization, 'executionAuthorization'),
    ...missingFields(REQUIRED_NON_SECRET_ASSERTIONS, input.nonSecretAssertions, 'nonSecretAssertions'),
    ...missingFields(REQUIRED_VALIDATION_PLAN_FIELDS, input.validationPlan, 'validationPlan')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_secret_locator_or_approval_fields', input, { forbiddenFields });
  }

  const forbiddenCounters = collectPositiveCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('forbidden_positive_execution_counters', input, { forbiddenCounters });
  }

  const invalidFields = [];
  if (input.schemaVersion !== SCHEMA_VERSION) invalidFields.push('schemaVersion');
  if (input.sourceSystem !== SOURCE_SYSTEM) invalidFields.push('sourceSystem');
  if (!isSafeReferenceName(input.packetId)) invalidFields.push('packetId');
  if (!isSafeOperatorIntent(input.operatorIntent)) invalidFields.push('operatorIntent');
  if (!ALLOWED_PROOF_PROFILES.includes(input.proofProfile)) invalidFields.push('proofProfile');
  if (!PROOF_MODES.includes(input.proofMode)) invalidFields.push('proofMode');
  invalidFields.push(...validateTarget(input.target));
  invalidFields.push(...validatePrincipalScope(input.principalScope));
  invalidFields.push(...validateExecutionAuthorization(input.executionAuthorization));
  invalidFields.push(...validateNonSecretAssertions(input.nonSecretAssertions));
  invalidFields.push(...validateValidationPlan(input.validationPlan));
  if (!Array.isArray(input.allowedRuntimeActions) || input.allowedRuntimeActions.length === 0) {
    invalidFields.push('allowedRuntimeActions');
  }

  if (invalidFields.length > 0) {
    return rejected('invalid_live_target_proof_packet_contract', input, { invalidFields });
  }

  const allowedActions = PROOF_ACTIONS_BY_MODE[input.proofMode] || [];
  const rejectedRuntimeActions = input.allowedRuntimeActions.filter(action => !allowedActions.includes(action));
  if (input.allowedRuntimeActions.length > input.validationPlan.maxRuntimeCalls) {
    return rejected('runtime_actions_exceed_validation_plan_limit', input, { invalidFields: ['allowedRuntimeActions'] });
  }
  if (rejectedRuntimeActions.length > 0) {
    return rejected('runtime_actions_not_allowed_by_proof_mode', input, { rejectedRuntimeActions });
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
    sourceSystem: SOURCE_SYSTEM,
    packetId: input.packetId,
    operatorIntentPresent: true,
    proofProfile: input.proofProfile,
    proofMode: input.proofMode,
    allowedRuntimeActions: [...input.allowedRuntimeActions],
    sanitizedTarget,
    plannedProof: {
      sourceSystem: SOURCE_SYSTEM,
      targetKind: input.target.kind,
      targetReferenceName: input.target.referenceName,
      proofProfile: input.proofProfile,
      proofMode: input.proofMode,
      allowedRuntimeActions: [...input.allowedRuntimeActions],
      executionStatus: 'planned_not_executed'
    },
    nextAction: 'request_exact_approval_before_any_live_target_proof',
    actionPlanOnly: true,
    runtimeExecutionAllowedByThisHelper: false,
    runtimeWiringExecuted: false,
    liveVcpToolBoxCalled: false,
    liveTargetProofExecuted: false,
    configEnvRead: false,
    envFileRead: false,
    secretMaterialRead: false,
    rawMemoryRead: false,
    memoryWritten: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    readinessClaimAllowed: false,
    counters: { ...ZERO_COUNTERS }
  };
}

module.exports = {
  ALLOWED_PROOF_PROFILES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  PROOF_ACTIONS_BY_MODE,
  PROOF_MODES,
  REQUIRED_EXECUTION_AUTHORIZATION_FIELDS,
  REQUIRED_NON_SECRET_ASSERTIONS,
  REQUIRED_TARGET_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  REQUIRED_VALIDATION_PLAN_FIELDS,
  ZERO_COUNTERS,
  buildVcpToolBoxLiveTargetProofPacketContract
};
