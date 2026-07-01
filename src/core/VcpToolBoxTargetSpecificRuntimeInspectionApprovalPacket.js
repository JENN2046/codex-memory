'use strict';

const {
  PROFILES,
  TARGET_KINDS
} = require('./VcpToolBoxFullCapabilityBridgePlan');
const {
  buildVcpToolBoxExactTargetDiscoveryPacketPreflight
} = require('./VcpToolBoxExactTargetDiscoveryPacketPreflight');
const {
  isSafeOperatorIntent,
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket';
const CONTRACT_MODE = 'fixture_approval_packet_only';
const SCHEMA_VERSION = 1;
const SOURCE_SYSTEM = 'VCPToolBox';

const EXACT_APPROVAL_TOKEN = 'APPROVAL_CM1699_VCPTOOLBOX_TARGET_SPECIFIC_RUNTIME_INSPECTION_PACKET_ONLY_NO_EXECUTION';
const OPERATOR_DECISION = 'approve_target_specific_runtime_inspection_packet_only_no_execution';

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'sourceSystem',
  'approvalPacketId',
  'exactApprovalToken',
  'operatorDecision',
  'operatorIntent',
  'referencedDiscoveryPacket',
  'approvalScope',
  'currentFactsBinding',
  'expiry',
  'executionAuthorization',
  'runtimeBudget',
  'outputPolicy',
  'receiptPlan',
  'stopConditions',
  'forbiddenExpansions',
  'counters'
]);

const REQUIRED_APPROVAL_SCOPE_FIELDS = Object.freeze([
  'discoveryPacketId',
  'targetReferenceName',
  'targetKind',
  'discoverySource',
  'requestedProfile',
  'maxRuntimeCalls',
  'maxRuntimeProbeMinutes',
  'noMemoryRead',
  'noWrite',
  'noProviderCall',
  'noPublicMcpExpansion',
  'noReadinessClaim'
]);

const REQUIRED_CURRENT_FACTS_BINDING_FIELDS = Object.freeze([
  'freshGitRequired',
  'targetCommitPresent',
  'targetCommitValueIncluded',
  'originCommitPresent',
  'originCommitValueIncluded',
  'branchNamePresent',
  'branchNameValueIncluded',
  'worktreeStatusRequired'
]);

const REQUIRED_EXPIRY_FIELDS = Object.freeze([
  'expiresAtPresent',
  'expiresAtValueIncluded',
  'expired'
]);

const REQUIRED_EXECUTION_AUTHORIZATION_FIELDS = Object.freeze([
  'targetSpecificRuntimeInspectionApproved',
  'exactApprovalLineIncluded',
  'exactApprovalLineIssuedByThisHelper',
  'approvalLineConsumed',
  'liveProbeApproved',
  'memoryReadApproved',
  'writeApproved',
  'providerCallApproved',
  'publicMcpExpansionApproved'
]);

const REQUIRED_RUNTIME_BUDGET_FIELDS = Object.freeze([
  'maxRuntimeProbeMinutes',
  'maxRuntimeCalls',
  'maxMemoryReadQueries',
  'maxMemoryWrites',
  'maxProviderCalls'
]);

const REQUIRED_OUTPUT_POLICY_FIELDS = Object.freeze([
  'lowDisclosureOnly',
  'rawTargetValueAllowed',
  'rawOutputPersistenceAllowed',
  'secretValuesAllowed',
  'rawMemoryAllowed',
  'pathEndpointValueAllowed',
  'runtimeResponsePersistenceAllowed'
]);

const REQUIRED_RECEIPT_PLAN_FIELDS = Object.freeze([
  'postInspectionReceiptRequired',
  'includeTargetClass',
  'includeDiscoveryPacketId',
  'includeActionCounters',
  'includeValidationResult',
  'includeRawOutput',
  'includeSecretValues',
  'includeReadinessClaim'
]);

const STOP_CONDITION_FIELDS = Object.freeze([
  'onMissingExactApproval',
  'onRawTargetValue',
  'onSecretMaterial',
  'onConfigEnvRead',
  'onRuntimeCallWithoutApproval',
  'onMemoryRead',
  'onWrite',
  'onProviderCall',
  'onPublicMcpExpansion',
  'onReadinessClaim',
  'onExpiredApproval'
]);

const FORBIDDEN_EXPANSION_FIELDS = Object.freeze([
  'allowExecutionWithoutFreshApproval',
  'allowTargetSpecificRuntimeInspection',
  'allowApprovalLineValuePersistence',
  'allowApprovalLineConsumption',
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
  'allowRawOutputPersistence',
  'allowRuntimeResponsePersistence'
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
  'approvalTokenValue',
  'exactApprovalLine',
  'approvalLine',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'sharedSecret',
  'privateKey',
  'password',
  'rawTargetValue',
  'rawRuntimeResponse',
  'rawDailyNote',
  'rawDailyNoteContent',
  'rawRagInjectedContext',
  'rawVectorRows',
  'rawPrompt',
  'rawConversation',
  'targetCommit',
  'originCommit',
  'branchName',
  'expiresAt'
]);

const ZERO_COUNTERS = Object.freeze({
  runtimeCalls: 0,
  networkCalls: 0,
  mcpCalls: 0,
  targetSpecificRuntimeInspections: 0,
  targetDiscoveryExecutions: 0,
  liveVcpToolBoxCalls: 0,
  approvalLinesIssued: 0,
  approvalLinesConsumed: 0,
  targetSpecificInspectionApprovalsGranted: 0,
  configEnvReads: 0,
  envFileReads: 0,
  secretReads: 0,
  rawStoreReads: 0,
  memoryReads: 0,
  memoryWrites: 0,
  durableMemoryWrites: 0,
  providerApiCalls: 0,
  publicMcpExpansions: 0,
  readinessClaims: 0
});

const DEFAULT_MAX_RUNTIME_CALLS = 3;
const DEFAULT_MAX_RUNTIME_PROBE_MINUTES = 10;

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

function collectNonZeroCounters(counters) {
  if (!isPlainObject(counters)) return Object.keys(ZERO_COUNTERS);
  return Object.keys(ZERO_COUNTERS).filter(field => Number(counters[field] || 0) !== 0);
}

function safeReferencedDiscoveryPacketId(input) {
  if (!isPlainObject(input.referencedDiscoveryPacket)) return null;
  return isSafeReferenceName(input.referencedDiscoveryPacket.discoveryPacketId)
    ? input.referencedDiscoveryPacket.discoveryPacketId
    : null;
}

function safeReferencedTargetReferenceName(input) {
  if (!isPlainObject(input.referencedDiscoveryPacket) ||
    !isPlainObject(input.referencedDiscoveryPacket.targetReference)) {
    return null;
  }
  return isSafeReferenceName(input.referencedDiscoveryPacket.targetReference.referenceName)
    ? input.referencedDiscoveryPacket.targetReference.referenceName
    : null;
}

function lowDisclosureProjection(input) {
  if (!isPlainObject(input)) {
    return {
      sourceSystem: null,
      approvalPacketId: null,
      referencedDiscoveryPacketId: null,
      targetReferenceName: null,
      targetKind: null,
      operatorDecision: null
    };
  }

  return {
    sourceSystem: input.sourceSystem === SOURCE_SYSTEM ? input.sourceSystem : null,
    approvalPacketId: isSafeReferenceName(input.approvalPacketId) ? input.approvalPacketId : null,
    referencedDiscoveryPacketId: safeReferencedDiscoveryPacketId(input),
    targetReferenceName: safeReferencedTargetReferenceName(input),
    targetKind: isPlainObject(input.approvalScope) && TARGET_KINDS.includes(input.approvalScope.targetKind)
      ? input.approvalScope.targetKind
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
    referencedDiscoveryReasonCode: details.referencedDiscoveryReasonCode || null,
    exactApprovalTokenMatched: false,
    approvalPacketValidForFutureUse: false,
    approvalStatus: 'packet_rejected',
    targetSpecificRuntimeInspectionApprovedByThisHelper: false,
    exactApprovalLineIssued: false,
    approvalLineConsumed: false,
    runtimeExecutionAllowedByThisHelper: false,
    targetSpecificRuntimeInspectionExecuted: false,
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

function validateAllFalse(value, fields, prefix) {
  const invalidFields = [];
  if (!isPlainObject(value)) return [prefix];
  for (const field of fields) {
    if (value[field] !== false) invalidFields.push(`${prefix}.${field}`);
  }
  return invalidFields;
}

function validateApprovalScope(approvalScope, discoveryPacket) {
  const invalidFields = [];
  if (!isPlainObject(approvalScope)) return ['approvalScope'];
  const targetReference = discoveryPacket.targetReference;

  if (approvalScope.discoveryPacketId !== discoveryPacket.discoveryPacketId) {
    invalidFields.push('approvalScope.discoveryPacketId');
  }
  if (approvalScope.targetReferenceName !== targetReference.referenceName) {
    invalidFields.push('approvalScope.targetReferenceName');
  }
  if (approvalScope.targetKind !== targetReference.kind) invalidFields.push('approvalScope.targetKind');
  if (approvalScope.discoverySource !== targetReference.discoverySource) {
    invalidFields.push('approvalScope.discoverySource');
  }
  if (!Object.values(PROFILES).includes(approvalScope.requestedProfile) ||
    approvalScope.requestedProfile !== discoveryPacket.profileBoundary.requestedProfile) {
    invalidFields.push('approvalScope.requestedProfile');
  }
  if (approvalScope.maxRuntimeCalls !== DEFAULT_MAX_RUNTIME_CALLS) {
    invalidFields.push('approvalScope.maxRuntimeCalls');
  }
  if (approvalScope.maxRuntimeProbeMinutes !== DEFAULT_MAX_RUNTIME_PROBE_MINUTES) {
    invalidFields.push('approvalScope.maxRuntimeProbeMinutes');
  }
  for (const field of [
    'noMemoryRead',
    'noWrite',
    'noProviderCall',
    'noPublicMcpExpansion',
    'noReadinessClaim'
  ]) {
    if (approvalScope[field] !== true) invalidFields.push(`approvalScope.${field}`);
  }
  return invalidFields;
}

function validateCurrentFactsBinding(currentFactsBinding) {
  const invalidFields = [];
  if (!isPlainObject(currentFactsBinding)) return ['currentFactsBinding'];
  for (const field of [
    'freshGitRequired',
    'targetCommitPresent',
    'originCommitPresent',
    'branchNamePresent'
  ]) {
    if (currentFactsBinding[field] !== true) invalidFields.push(`currentFactsBinding.${field}`);
  }
  for (const field of [
    'targetCommitValueIncluded',
    'originCommitValueIncluded',
    'branchNameValueIncluded'
  ]) {
    if (currentFactsBinding[field] !== false) invalidFields.push(`currentFactsBinding.${field}`);
  }
  if (currentFactsBinding.worktreeStatusRequired !== 'clean_before_runtime_inspection') {
    invalidFields.push('currentFactsBinding.worktreeStatusRequired');
  }
  return invalidFields;
}

function validateExpiry(expiry) {
  const invalidFields = [];
  if (!isPlainObject(expiry)) return ['expiry'];
  if (expiry.expiresAtPresent !== true) invalidFields.push('expiry.expiresAtPresent');
  if (expiry.expiresAtValueIncluded !== false) invalidFields.push('expiry.expiresAtValueIncluded');
  if (expiry.expired !== false) invalidFields.push('expiry.expired');
  return invalidFields;
}

function validateRuntimeBudget(runtimeBudget, approvalScope) {
  const invalidFields = [];
  if (!isPlainObject(runtimeBudget)) return ['runtimeBudget'];
  if (runtimeBudget.maxRuntimeProbeMinutes !== approvalScope.maxRuntimeProbeMinutes ||
    runtimeBudget.maxRuntimeProbeMinutes !== DEFAULT_MAX_RUNTIME_PROBE_MINUTES) {
    invalidFields.push('runtimeBudget.maxRuntimeProbeMinutes');
  }
  if (runtimeBudget.maxRuntimeCalls !== approvalScope.maxRuntimeCalls ||
    runtimeBudget.maxRuntimeCalls !== DEFAULT_MAX_RUNTIME_CALLS) {
    invalidFields.push('runtimeBudget.maxRuntimeCalls');
  }
  for (const field of ['maxMemoryReadQueries', 'maxMemoryWrites', 'maxProviderCalls']) {
    if (runtimeBudget[field] !== 0) invalidFields.push(`runtimeBudget.${field}`);
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
    'pathEndpointValueAllowed',
    'runtimeResponsePersistenceAllowed'
  ]) {
    if (outputPolicy[field] !== false) invalidFields.push(`outputPolicy.${field}`);
  }
  return invalidFields;
}

function validateReceiptPlan(receiptPlan) {
  const invalidFields = [];
  if (!isPlainObject(receiptPlan)) return ['receiptPlan'];
  for (const field of [
    'postInspectionReceiptRequired',
    'includeTargetClass',
    'includeDiscoveryPacketId',
    'includeActionCounters',
    'includeValidationResult'
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

function buildVcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_APPROVAL_SCOPE_FIELDS, input.approvalScope, 'approvalScope'),
    ...missingFields(REQUIRED_CURRENT_FACTS_BINDING_FIELDS, input.currentFactsBinding, 'currentFactsBinding'),
    ...missingFields(REQUIRED_EXPIRY_FIELDS, input.expiry, 'expiry'),
    ...missingFields(REQUIRED_EXECUTION_AUTHORIZATION_FIELDS, input.executionAuthorization, 'executionAuthorization'),
    ...missingFields(REQUIRED_RUNTIME_BUDGET_FIELDS, input.runtimeBudget, 'runtimeBudget'),
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

  const discoveryResult = buildVcpToolBoxExactTargetDiscoveryPacketPreflight(input.referencedDiscoveryPacket);
  if (!discoveryResult.accepted) {
    return rejected('referenced_discovery_packet_rejected', input, {
      referencedDiscoveryReasonCode: discoveryResult.reasonCode,
      invalidFields: ['referencedDiscoveryPacket']
    });
  }

  const forbiddenCounters = collectNonZeroCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('forbidden_nonzero_execution_counters', input, { forbiddenCounters });
  }

  const invalidFields = [];
  if (input.schemaVersion !== SCHEMA_VERSION) invalidFields.push('schemaVersion');
  if (input.sourceSystem !== SOURCE_SYSTEM) invalidFields.push('sourceSystem');
  if (!isSafeReferenceName(input.approvalPacketId)) invalidFields.push('approvalPacketId');
  if (input.exactApprovalToken !== EXACT_APPROVAL_TOKEN) invalidFields.push('exactApprovalToken');
  if (input.operatorDecision !== OPERATOR_DECISION) invalidFields.push('operatorDecision');
  if (!isSafeOperatorIntent(input.operatorIntent)) invalidFields.push('operatorIntent');
  invalidFields.push(...validateApprovalScope(input.approvalScope, input.referencedDiscoveryPacket));
  invalidFields.push(...validateCurrentFactsBinding(input.currentFactsBinding));
  invalidFields.push(...validateExpiry(input.expiry));
  invalidFields.push(...validateAllFalse(
    input.executionAuthorization,
    REQUIRED_EXECUTION_AUTHORIZATION_FIELDS,
    'executionAuthorization'
  ));
  invalidFields.push(...validateRuntimeBudget(input.runtimeBudget, input.approvalScope));
  invalidFields.push(...validateOutputPolicy(input.outputPolicy));
  invalidFields.push(...validateReceiptPlan(input.receiptPlan));
  invalidFields.push(...validateStopConditions(input.stopConditions));
  invalidFields.push(...validateAllFalse(input.forbiddenExpansions, FORBIDDEN_EXPANSION_FIELDS, 'forbiddenExpansions'));

  if (invalidFields.length > 0) {
    return rejected('invalid_target_specific_runtime_inspection_approval_packet', input, { invalidFields });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    sourceSystem: SOURCE_SYSTEM,
    approvalPacketId: input.approvalPacketId,
    referencedDiscoveryPacketId: input.referencedDiscoveryPacket.discoveryPacketId,
    referencedTargetReferenceName: input.referencedDiscoveryPacket.targetReference.referenceName,
    exactApprovalTokenMatched: true,
    operatorIntentPresent: true,
    operatorDecision: OPERATOR_DECISION,
    approvalPacketValidForFutureUse: true,
    approvalStatus: 'packet_valid_not_approved',
    approvalScope: {
      discoveryPacketId: input.approvalScope.discoveryPacketId,
      targetReferenceName: input.approvalScope.targetReferenceName,
      targetKind: input.approvalScope.targetKind,
      discoverySource: input.approvalScope.discoverySource,
      requestedProfile: input.approvalScope.requestedProfile,
      maxRuntimeCalls: DEFAULT_MAX_RUNTIME_CALLS,
      maxRuntimeProbeMinutes: DEFAULT_MAX_RUNTIME_PROBE_MINUTES,
      noMemoryRead: true,
      noWrite: true,
      noProviderCall: true,
      noPublicMcpExpansion: true,
      noReadinessClaim: true
    },
    currentFactsBinding: {
      freshGitRequired: true,
      targetCommitPresent: true,
      targetCommitValueIncluded: false,
      originCommitPresent: true,
      originCommitValueIncluded: false,
      branchNamePresent: true,
      branchNameValueIncluded: false,
      worktreeStatusRequired: 'clean_before_runtime_inspection'
    },
    expiry: {
      expiresAtPresent: true,
      expiresAtValueIncluded: false,
      expired: false
    },
    runtimeBudget: {
      maxRuntimeProbeMinutes: DEFAULT_MAX_RUNTIME_PROBE_MINUTES,
      maxRuntimeCalls: DEFAULT_MAX_RUNTIME_CALLS,
      maxMemoryReadQueries: 0,
      maxMemoryWrites: 0,
      maxProviderCalls: 0
    },
    nextAction: 'request_exact_runtime_inspection_approval_line_before_live_probe',
    targetSpecificRuntimeInspectionApprovedByThisHelper: false,
    exactApprovalLineIssued: false,
    approvalLineConsumed: false,
    runtimeExecutionAllowedByThisHelper: false,
    targetSpecificRuntimeInspectionExecuted: false,
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
  CONTRACT_MODE,
  CONTRACT_NAME,
  DEFAULT_MAX_RUNTIME_CALLS,
  DEFAULT_MAX_RUNTIME_PROBE_MINUTES,
  EXACT_APPROVAL_TOKEN,
  FORBIDDEN_EXPANSION_FIELDS,
  FORBIDDEN_FIELD_NAMES,
  OPERATOR_DECISION,
  REQUIRED_APPROVAL_SCOPE_FIELDS,
  REQUIRED_CURRENT_FACTS_BINDING_FIELDS,
  REQUIRED_EXECUTION_AUTHORIZATION_FIELDS,
  REQUIRED_EXPIRY_FIELDS,
  REQUIRED_OUTPUT_POLICY_FIELDS,
  REQUIRED_RECEIPT_PLAN_FIELDS,
  REQUIRED_RUNTIME_BUDGET_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  STOP_CONDITION_FIELDS,
  ZERO_COUNTERS,
  buildVcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket
};
