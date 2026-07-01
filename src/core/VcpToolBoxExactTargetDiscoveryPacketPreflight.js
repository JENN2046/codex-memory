'use strict';

const { PROFILES, TARGET_KINDS } = require('./VcpToolBoxFullCapabilityBridgePlan');
const { DISCOVERY_SOURCES, ZERO_COUNTER_FIELDS } = require('./VcpToolBoxRuntimeTargetLocatorPreflight');
const {
  isSafeOperatorIntent,
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpToolBoxExactTargetDiscoveryPacketPreflight';
const CONTRACT_MODE = 'fixture_preflight_only';
const SCHEMA_VERSION = 1;
const SOURCE_SYSTEM = 'VCPToolBox';

const EXACT_PREFLIGHT_TOKEN = 'PREFLIGHT_CM1698_VCPTOOLBOX_EXACT_TARGET_DISCOVERY_PACKET_ONLY_NO_RUNTIME';
const OPERATOR_DECISION = 'preflight_target_discovery_packet_only_no_runtime';

const COMPONENT_SURFACE_FIELDS = Object.freeze([
  'dailyNoteConsidered',
  'dailyNoteManagerConsidered',
  'knowledgeBaseManagerConsidered',
  'tagMemoConsidered',
  'lightMemoConsidered',
  'tdbKnowledgeConsidered',
  'deepMemoConsidered',
  'topicMemoConsidered',
  'meshMemoConsidered',
  'ragDiaryPluginConsidered'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'sourceSystem',
  'discoveryPacketId',
  'exactPreflightToken',
  'operatorDecision',
  'operatorIntent',
  'targetReference',
  'principalScope',
  'discoveryQuestionSet',
  'componentSurfaceCoverage',
  'profileBoundary',
  'executionAuthorization',
  'outputPolicy',
  'receiptPlan',
  'stopConditions',
  'forbiddenExpansions',
  'counters'
]);

const REQUIRED_TARGET_REFERENCE_FIELDS = Object.freeze([
  'kind',
  'referenceName',
  'discoverySource',
  'locatorHashPresent',
  'locatorValueIncluded',
  'endpointValueIncluded',
  'secretMaterialIncluded',
  'configEnvRead',
  'runtimeCalled',
  'targetSpecificInspectionApproved'
]);

const REQUIRED_PRINCIPAL_SCOPE_FIELDS = Object.freeze([
  'agentAlias',
  'agentIdPresent',
  'projectIdPresent',
  'workspaceIdPresent',
  'clientIdPresent',
  'sessionIdPresent'
]);

const REQUIRED_DISCOVERY_QUESTION_FIELDS = Object.freeze([
  'targetKindConfirmed',
  'startupStateKnown',
  'transportKnown',
  'authFieldNamesKnown',
  'profileFieldNamesKnown',
  'readEntrypointsMapped',
  'writeEntrypointsMapped',
  'scopeModelKnown',
  'timeoutModelKnown',
  'failureModelKnown',
  'receiptFieldsKnown',
  'rawValuesIncluded'
]);

const REQUIRED_PROFILE_BOUNDARY_FIELDS = Object.freeze([
  'requestedProfile',
  'profileSelectionExplicit',
  'observeLiteAllowed',
  'observeFullAllowed',
  'trustedFullReadRequiresApproval',
  'trustedWriteProposalRequiresApproval',
  'trustedFullRequiresApproval',
  'rawOutputAllowed',
  'writeAllowedByPreflight'
]);

const REQUIRED_EXECUTION_AUTHORIZATION_FIELDS = Object.freeze([
  'targetSpecificRuntimeInspectionApproved',
  'exactApprovalLineIncluded',
  'liveProbeApproved',
  'memoryReadApproved',
  'writeApproved',
  'providerCallApproved',
  'publicMcpExpansionApproved'
]);

const REQUIRED_OUTPUT_POLICY_FIELDS = Object.freeze([
  'lowDisclosureOnly',
  'rawTargetValueAllowed',
  'rawOutputPersistenceAllowed',
  'secretValuesAllowed',
  'rawMemoryAllowed',
  'pathEndpointValueAllowed'
]);

const REQUIRED_RECEIPT_PLAN_FIELDS = Object.freeze([
  'postDiscoveryReceiptRequired',
  'includeTargetClass',
  'includeQuestionCoverage',
  'includeComponentCoverage',
  'includeActionCounters',
  'includeRawOutput',
  'includeSecretValues',
  'includeReadinessClaim'
]);

const STOP_CONDITION_FIELDS = Object.freeze([
  'onMissingExactApproval',
  'onRawTargetValue',
  'onSecretMaterial',
  'onConfigEnvRead',
  'onRuntimeCall',
  'onMemoryRead',
  'onWrite',
  'onProviderCall',
  'onPublicMcpExpansion',
  'onReadinessClaim'
]);

const FORBIDDEN_EXPANSION_FIELDS = Object.freeze([
  'allowTargetSpecificRuntimeInspection',
  'allowLocatorValuePersistence',
  'allowEndpointValuePersistence',
  'allowConfigEnvRead',
  'allowEnvFileRead',
  'allowSecretMaterial',
  'allowRawMemoryRead',
  'allowMemoryRead',
  'allowMemoryWrite',
  'allowProviderCall',
  'allowPublicMcpExpansion',
  'allowReadinessClaim',
  'allowRawOutputPersistence'
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
  'exactApprovalLine',
  'approvalLine',
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
  targetSpecificRuntimeInspections: 0,
  liveVcpToolBoxCalls: 0,
  memoryReads: 0,
  durableMemoryWrites: 0,
  approvalLinesConsumed: 0,
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
      discoveryPacketId: null,
      targetKind: null,
      referenceName: null,
      operatorDecision: null
    };
  }

  return {
    sourceSystem: input.sourceSystem === SOURCE_SYSTEM ? input.sourceSystem : null,
    discoveryPacketId: isSafeReferenceName(input.discoveryPacketId) ? input.discoveryPacketId : null,
    targetKind: isPlainObject(input.targetReference) && TARGET_KINDS.includes(input.targetReference.kind)
      ? input.targetReference.kind
      : null,
    referenceName: isPlainObject(input.targetReference) &&
      isSafeReferenceName(input.targetReference.referenceName)
      ? input.targetReference.referenceName
      : null,
    operatorDecision: input.operatorDecision === OPERATOR_DECISION ? input.operatorDecision : null
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
    forbiddenCounters: details.forbiddenCounters || [],
    exactPreflightTokenMatched: false,
    exactTargetDiscoveryPacketReadyForFutureUse: false,
    targetSpecificRuntimeInspectionAllowedByThisHelper: false,
    runtimeExecutionAllowedByThisHelper: false,
    targetDiscoveryExecuted: false,
    liveVcpToolBoxCalled: false,
    configEnvRead: false,
    envFileRead: false,
    rawMemoryRead: false,
    memoryRead: false,
    memoryWritten: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    readinessClaimAllowed: false,
    counters: { ...ZERO_COUNTERS }
  };
}

function validateTargetReference(targetReference) {
  const invalidFields = [];
  if (!isPlainObject(targetReference)) return ['targetReference'];
  if (!TARGET_KINDS.includes(targetReference.kind)) invalidFields.push('targetReference.kind');
  if (!isSafeReferenceName(targetReference.referenceName)) invalidFields.push('targetReference.referenceName');
  if (!DISCOVERY_SOURCES.includes(targetReference.discoverySource)) {
    invalidFields.push('targetReference.discoverySource');
  }
  for (const field of ['locatorHashPresent']) {
    if (targetReference[field] !== true) invalidFields.push(`targetReference.${field}`);
  }
  for (const field of [
    'locatorValueIncluded',
    'endpointValueIncluded',
    'secretMaterialIncluded',
    'configEnvRead',
    'runtimeCalled',
    'targetSpecificInspectionApproved'
  ]) {
    if (targetReference[field] !== false) invalidFields.push(`targetReference.${field}`);
  }
  return invalidFields;
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

function validateDiscoveryQuestionSet(discoveryQuestionSet) {
  const invalidFields = [];
  if (!isPlainObject(discoveryQuestionSet)) return ['discoveryQuestionSet'];
  for (const field of REQUIRED_DISCOVERY_QUESTION_FIELDS.filter(field => field !== 'rawValuesIncluded')) {
    if (discoveryQuestionSet[field] !== true) invalidFields.push(`discoveryQuestionSet.${field}`);
  }
  if (discoveryQuestionSet.rawValuesIncluded !== false) {
    invalidFields.push('discoveryQuestionSet.rawValuesIncluded');
  }
  return invalidFields;
}

function validateComponentSurfaceCoverage(componentSurfaceCoverage) {
  const invalidFields = [];
  if (!isPlainObject(componentSurfaceCoverage)) return ['componentSurfaceCoverage'];
  for (const field of COMPONENT_SURFACE_FIELDS) {
    if (componentSurfaceCoverage[field] !== true) invalidFields.push(`componentSurfaceCoverage.${field}`);
  }
  return invalidFields;
}

function validateProfileBoundary(profileBoundary) {
  const invalidFields = [];
  if (!isPlainObject(profileBoundary)) return ['profileBoundary'];
  if (!Object.values(PROFILES).includes(profileBoundary.requestedProfile)) {
    invalidFields.push('profileBoundary.requestedProfile');
  }
  for (const field of [
    'profileSelectionExplicit',
    'observeLiteAllowed',
    'observeFullAllowed',
    'trustedFullReadRequiresApproval',
    'trustedWriteProposalRequiresApproval',
    'trustedFullRequiresApproval'
  ]) {
    if (profileBoundary[field] !== true) invalidFields.push(`profileBoundary.${field}`);
  }
  for (const field of ['rawOutputAllowed', 'writeAllowedByPreflight']) {
    if (profileBoundary[field] !== false) invalidFields.push(`profileBoundary.${field}`);
  }
  return invalidFields;
}

function validateAllFalse(value, fields, prefix) {
  const invalidFields = [];
  if (!isPlainObject(value)) return [prefix];
  for (const field of fields) {
    if (value[field] !== false) invalidFields.push(`${prefix}.${field}`);
  }
  return invalidFields;
}

function validateOutputPolicy(outputPolicy) {
  const invalidFields = [];
  if (!isPlainObject(outputPolicy)) return ['outputPolicy'];
  if (outputPolicy.lowDisclosureOnly !== true) invalidFields.push('outputPolicy.lowDisclosureOnly');
  for (const field of [
    'rawTargetValueAllowed',
    'rawOutputPersistenceAllowed',
    'secretValuesAllowed',
    'rawMemoryAllowed',
    'pathEndpointValueAllowed'
  ]) {
    if (outputPolicy[field] !== false) invalidFields.push(`outputPolicy.${field}`);
  }
  return invalidFields;
}

function validateReceiptPlan(receiptPlan) {
  const invalidFields = [];
  if (!isPlainObject(receiptPlan)) return ['receiptPlan'];
  for (const field of [
    'postDiscoveryReceiptRequired',
    'includeTargetClass',
    'includeQuestionCoverage',
    'includeComponentCoverage',
    'includeActionCounters'
  ]) {
    if (receiptPlan[field] !== true) invalidFields.push(`receiptPlan.${field}`);
  }
  for (const field of ['includeRawOutput', 'includeSecretValues', 'includeReadinessClaim']) {
    if (receiptPlan[field] !== false) invalidFields.push(`receiptPlan.${field}`);
  }
  return invalidFields;
}

function validateStopConditions(stopConditions) {
  const invalidFields = [];
  if (!isPlainObject(stopConditions)) return ['stopConditions'];
  for (const field of STOP_CONDITION_FIELDS) {
    if (stopConditions[field] !== 'stop') invalidFields.push(`stopConditions.${field}`);
  }
  return invalidFields;
}

function buildVcpToolBoxExactTargetDiscoveryPacketPreflight(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_TARGET_REFERENCE_FIELDS, input.targetReference, 'targetReference'),
    ...missingFields(REQUIRED_PRINCIPAL_SCOPE_FIELDS, input.principalScope, 'principalScope'),
    ...missingFields(REQUIRED_DISCOVERY_QUESTION_FIELDS, input.discoveryQuestionSet, 'discoveryQuestionSet'),
    ...missingFields(COMPONENT_SURFACE_FIELDS, input.componentSurfaceCoverage, 'componentSurfaceCoverage'),
    ...missingFields(REQUIRED_PROFILE_BOUNDARY_FIELDS, input.profileBoundary, 'profileBoundary'),
    ...missingFields(REQUIRED_EXECUTION_AUTHORIZATION_FIELDS, input.executionAuthorization, 'executionAuthorization'),
    ...missingFields(REQUIRED_OUTPUT_POLICY_FIELDS, input.outputPolicy, 'outputPolicy'),
    ...missingFields(REQUIRED_RECEIPT_PLAN_FIELDS, input.receiptPlan, 'receiptPlan'),
    ...missingFields(STOP_CONDITION_FIELDS, input.stopConditions, 'stopConditions'),
    ...missingFields(FORBIDDEN_EXPANSION_FIELDS, input.forbiddenExpansions, 'forbiddenExpansions')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_secret_locator_or_raw_fields', input, { forbiddenFields });
  }

  const forbiddenCounters = collectPositiveCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('forbidden_positive_execution_counters', input, { forbiddenCounters });
  }

  const invalidFields = [];
  if (input.schemaVersion !== SCHEMA_VERSION) invalidFields.push('schemaVersion');
  if (input.sourceSystem !== SOURCE_SYSTEM) invalidFields.push('sourceSystem');
  if (!isSafeReferenceName(input.discoveryPacketId)) invalidFields.push('discoveryPacketId');
  if (input.exactPreflightToken !== EXACT_PREFLIGHT_TOKEN) invalidFields.push('exactPreflightToken');
  if (input.operatorDecision !== OPERATOR_DECISION) invalidFields.push('operatorDecision');
  if (!isSafeOperatorIntent(input.operatorIntent)) invalidFields.push('operatorIntent');
  invalidFields.push(...validateTargetReference(input.targetReference));
  invalidFields.push(...validatePrincipalScope(input.principalScope));
  invalidFields.push(...validateDiscoveryQuestionSet(input.discoveryQuestionSet));
  invalidFields.push(...validateComponentSurfaceCoverage(input.componentSurfaceCoverage));
  invalidFields.push(...validateProfileBoundary(input.profileBoundary));
  invalidFields.push(...validateAllFalse(
    input.executionAuthorization,
    REQUIRED_EXECUTION_AUTHORIZATION_FIELDS,
    'executionAuthorization'
  ));
  invalidFields.push(...validateOutputPolicy(input.outputPolicy));
  invalidFields.push(...validateReceiptPlan(input.receiptPlan));
  invalidFields.push(...validateStopConditions(input.stopConditions));
  invalidFields.push(...validateAllFalse(input.forbiddenExpansions, FORBIDDEN_EXPANSION_FIELDS, 'forbiddenExpansions'));

  if (invalidFields.length > 0) {
    return rejected('invalid_exact_target_discovery_packet_preflight', input, { invalidFields });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    sourceSystem: SOURCE_SYSTEM,
    discoveryPacketId: input.discoveryPacketId,
    exactPreflightTokenMatched: true,
    operatorIntentPresent: true,
    operatorDecision: OPERATOR_DECISION,
    exactTargetDiscoveryPacketReadyForFutureUse: true,
    sanitizedTargetReference: {
      kind: input.targetReference.kind,
      referenceName: input.targetReference.referenceName,
      discoverySource: input.targetReference.discoverySource,
      locatorHashPresent: true,
      locatorValueIncluded: false,
      endpointValueIncluded: false,
      secretMaterialIncluded: false,
      targetSpecificInspectionApproved: false
    },
    discoveryQuestionCoverage: { ...input.discoveryQuestionSet },
    componentSurfaceCoverage: { ...input.componentSurfaceCoverage },
    profileBoundary: {
      requestedProfile: input.profileBoundary.requestedProfile,
      profileSelectionExplicit: true,
      rawOutputAllowed: false,
      writeAllowedByPreflight: false
    },
    nextAction: 'request_exact_target_specific_discovery_approval_before_runtime_inspection',
    targetSpecificRuntimeInspectionAllowedByThisHelper: false,
    runtimeExecutionAllowedByThisHelper: false,
    targetDiscoveryExecuted: false,
    liveVcpToolBoxCalled: false,
    configEnvRead: false,
    envFileRead: false,
    rawMemoryRead: false,
    memoryRead: false,
    memoryWritten: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    readinessClaimAllowed: false,
    counters: { ...ZERO_COUNTERS }
  };
}

module.exports = {
  COMPONENT_SURFACE_FIELDS,
  CONTRACT_MODE,
  CONTRACT_NAME,
  EXACT_PREFLIGHT_TOKEN,
  FORBIDDEN_EXPANSION_FIELDS,
  FORBIDDEN_FIELD_NAMES,
  OPERATOR_DECISION,
  REQUIRED_DISCOVERY_QUESTION_FIELDS,
  REQUIRED_EXECUTION_AUTHORIZATION_FIELDS,
  REQUIRED_OUTPUT_POLICY_FIELDS,
  REQUIRED_PRINCIPAL_SCOPE_FIELDS,
  REQUIRED_PROFILE_BOUNDARY_FIELDS,
  REQUIRED_RECEIPT_PLAN_FIELDS,
  REQUIRED_TARGET_REFERENCE_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  STOP_CONDITION_FIELDS,
  ZERO_COUNTERS,
  buildVcpToolBoxExactTargetDiscoveryPacketPreflight
};
