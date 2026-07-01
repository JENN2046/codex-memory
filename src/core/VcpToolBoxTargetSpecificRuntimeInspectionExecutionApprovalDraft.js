'use strict';

const {
  TARGET_KINDS
} = require('./VcpToolBoxFullCapabilityBridgePlan');
const {
  buildVcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket
} = require('./VcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket');
const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpToolBoxTargetSpecificRuntimeInspectionExecutionApprovalDraft';
const CONTRACT_MODE = 'fixture_execution_approval_draft_only';
const SCHEMA_VERSION = 1;
const SOURCE_SYSTEM = 'VCPToolBox';

const EXACT_DRAFT_TOKEN = 'DRAFT_CM1700_VCPTOOLBOX_TARGET_SPECIFIC_RUNTIME_INSPECTION_EXECUTION_APPROVAL_ONLY_NO_EXECUTION';
const OPERATOR_DECISION = 'draft_target_specific_runtime_inspection_execution_approval_only_no_execution';

const DEFAULT_MAX_RUNTIME_CALLS = 3;
const DEFAULT_MAX_RUNTIME_PROBE_MINUTES = 10;

const ALLOWED_RUNTIME_ACTIONS = Object.freeze([
  'target_presence.check',
  'runtime_handshake.check',
  'target_specific_runtime_inspection.no_memory'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'sourceSystem',
  'executionApprovalDraftId',
  'exactDraftToken',
  'operatorDecision',
  'referencedApprovalPacket',
  'executionScope',
  'currentFactsBinding',
  'approvalLineTemplate',
  'runtimeBudget',
  'outputPolicy',
  'receiptPlan',
  'stopConditions',
  'forbiddenExpansions',
  'counters'
]);

const REQUIRED_EXECUTION_SCOPE_FIELDS = Object.freeze([
  'approvalPacketId',
  'discoveryPacketId',
  'targetReferenceName',
  'targetKind',
  'discoverySource',
  'requestedProfile',
  'allowedRuntimeActions',
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

const REQUIRED_APPROVAL_LINE_TEMPLATE_FIELDS = Object.freeze([
  'exactApprovalLineTemplatePresent',
  'exactApprovalLineValueIncluded',
  'includesTargetBindingPlaceholder',
  'includesCommitBindingPlaceholder',
  'includesExpiryPlaceholder',
  'includesCallBudget',
  'oneTimeUseOnly',
  'humanOperatorRequired'
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
  'includeApprovalPacketId',
  'includeActionCounters',
  'includeValidationResult',
  'includeRawOutput',
  'includeSecretValues',
  'includeReadinessClaim'
]);

const STOP_CONDITION_FIELDS = Object.freeze([
  'onMissingExactApproval',
  'onDirtyWorktree',
  'onTargetMismatch',
  'onApprovalExpired',
  'onUnexpectedRuntimeAction',
  'onConfigEnvRead',
  'onAnyMemoryRead',
  'onAnyWrite',
  'onAnyProviderCall',
  'onPublicMcpExpansion',
  'onRawOutput',
  'onReadinessClaim'
]);

const FORBIDDEN_EXPANSION_FIELDS = Object.freeze([
  'allowExecutionWithoutFreshApproval',
  'allowTargetSpecificRuntimeInspection',
  'allowApprovalLineValuePersistence',
  'allowApprovalLineConsumption',
  'allowRuntimeWiring',
  'allowLocatorValuePersistence',
  'allowEndpointValuePersistence',
  'allowConfigEnvRead',
  'allowEnvFileRead',
  'allowSecretMaterial',
  'allowRawTargetValue',
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
  'approvalToken',
  'approvalTokenValue',
  'exactApprovalLine',
  'approvalLine',
  'approvalPhrase',
  'approvalText',
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
  targetSpecificInspectionExecutionApprovalsGranted: 0,
  liveVcpToolBoxCalls: 0,
  approvalLinesIssued: 0,
  approvalLinesConsumed: 0,
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

function sameStringArray(left, right) {
  return Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index]);
}

function safeReferencedApprovalPacketId(input) {
  if (!isPlainObject(input.referencedApprovalPacket)) return null;
  return isSafeReferenceName(input.referencedApprovalPacket.approvalPacketId)
    ? input.referencedApprovalPacket.approvalPacketId
    : null;
}

function safeReferencedDiscoveryPacketId(input) {
  if (!isPlainObject(input.referencedApprovalPacket)) return null;
  const value = isPlainObject(input.referencedApprovalPacket.approvalScope)
    ? input.referencedApprovalPacket.approvalScope.discoveryPacketId
    : input.referencedApprovalPacket.referencedDiscoveryPacket?.discoveryPacketId;
  return isSafeReferenceName(value) ? value : null;
}

function safeReferencedTargetReferenceName(input) {
  if (!isPlainObject(input.referencedApprovalPacket) ||
    !isPlainObject(input.referencedApprovalPacket.approvalScope)) {
    return null;
  }
  const value = input.referencedApprovalPacket.approvalScope.targetReferenceName;
  return isSafeReferenceName(value) ? value : null;
}

function lowDisclosureProjection(input) {
  if (!isPlainObject(input)) {
    return {
      sourceSystem: null,
      executionApprovalDraftId: null,
      referencedApprovalPacketId: null,
      referencedDiscoveryPacketId: null,
      targetReferenceName: null,
      operatorDecision: null
    };
  }

  return {
    sourceSystem: input.sourceSystem === SOURCE_SYSTEM ? input.sourceSystem : null,
    executionApprovalDraftId: isSafeReferenceName(input.executionApprovalDraftId)
      ? input.executionApprovalDraftId
      : null,
    referencedApprovalPacketId: safeReferencedApprovalPacketId(input),
    referencedDiscoveryPacketId: safeReferencedDiscoveryPacketId(input),
    targetReferenceName: safeReferencedTargetReferenceName(input),
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
    referencedApprovalReasonCode: details.referencedApprovalReasonCode || null,
    exactDraftTokenMatched: false,
    executionApprovalDraftValidForFutureUse: false,
    draftStatus: 'draft_rejected',
    targetSpecificRuntimeInspectionExecutionApprovedByThisHelper: false,
    exactApprovalLineIssued: false,
    approvalLineConsumed: false,
    targetSpecificRuntimeInspectionAllowedByThisHelper: false,
    runtimeExecutionAllowedByThisHelper: false,
    targetSpecificRuntimeInspectionExecuted: false,
    liveVcpToolBoxCalled: false,
    runtimeWiringExecuted: false,
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

function validateExecutionScope(executionScope, approvalResult) {
  const invalidFields = [];
  if (!isPlainObject(executionScope)) return ['executionScope'];

  if (executionScope.approvalPacketId !== approvalResult.approvalPacketId) {
    invalidFields.push('executionScope.approvalPacketId');
  }
  if (executionScope.discoveryPacketId !== approvalResult.referencedDiscoveryPacketId) {
    invalidFields.push('executionScope.discoveryPacketId');
  }
  if (executionScope.targetReferenceName !== approvalResult.approvalScope.targetReferenceName) {
    invalidFields.push('executionScope.targetReferenceName');
  }
  if (!TARGET_KINDS.includes(executionScope.targetKind) ||
    executionScope.targetKind !== approvalResult.approvalScope.targetKind) {
    invalidFields.push('executionScope.targetKind');
  }
  if (executionScope.discoverySource !== approvalResult.approvalScope.discoverySource) {
    invalidFields.push('executionScope.discoverySource');
  }
  if (executionScope.requestedProfile !== approvalResult.approvalScope.requestedProfile) {
    invalidFields.push('executionScope.requestedProfile');
  }
  if (!sameStringArray(executionScope.allowedRuntimeActions, ALLOWED_RUNTIME_ACTIONS)) {
    invalidFields.push('executionScope.allowedRuntimeActions');
  }
  if (executionScope.maxRuntimeCalls !== DEFAULT_MAX_RUNTIME_CALLS ||
    executionScope.maxRuntimeCalls !== approvalResult.approvalScope.maxRuntimeCalls) {
    invalidFields.push('executionScope.maxRuntimeCalls');
  }
  if (executionScope.maxRuntimeProbeMinutes !== DEFAULT_MAX_RUNTIME_PROBE_MINUTES ||
    executionScope.maxRuntimeProbeMinutes !== approvalResult.approvalScope.maxRuntimeProbeMinutes) {
    invalidFields.push('executionScope.maxRuntimeProbeMinutes');
  }
  for (const field of [
    'noMemoryRead',
    'noWrite',
    'noProviderCall',
    'noPublicMcpExpansion',
    'noReadinessClaim'
  ]) {
    if (executionScope[field] !== true) invalidFields.push(`executionScope.${field}`);
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
  if (currentFactsBinding.worktreeStatusRequired !== 'clean_before_target_specific_runtime_inspection_execution') {
    invalidFields.push('currentFactsBinding.worktreeStatusRequired');
  }
  return invalidFields;
}

function validateApprovalLineTemplate(approvalLineTemplate) {
  const invalidFields = [];
  if (!isPlainObject(approvalLineTemplate)) return ['approvalLineTemplate'];
  for (const field of [
    'exactApprovalLineTemplatePresent',
    'includesTargetBindingPlaceholder',
    'includesCommitBindingPlaceholder',
    'includesExpiryPlaceholder',
    'includesCallBudget',
    'oneTimeUseOnly',
    'humanOperatorRequired'
  ]) {
    if (approvalLineTemplate[field] !== true) invalidFields.push(`approvalLineTemplate.${field}`);
  }
  if (approvalLineTemplate.exactApprovalLineValueIncluded !== false) {
    invalidFields.push('approvalLineTemplate.exactApprovalLineValueIncluded');
  }
  return invalidFields;
}

function validateRuntimeBudget(runtimeBudget, executionScope) {
  const invalidFields = [];
  if (!isPlainObject(runtimeBudget)) return ['runtimeBudget'];
  if (runtimeBudget.maxRuntimeProbeMinutes !== DEFAULT_MAX_RUNTIME_PROBE_MINUTES ||
    runtimeBudget.maxRuntimeProbeMinutes !== executionScope.maxRuntimeProbeMinutes) {
    invalidFields.push('runtimeBudget.maxRuntimeProbeMinutes');
  }
  if (runtimeBudget.maxRuntimeCalls !== DEFAULT_MAX_RUNTIME_CALLS ||
    runtimeBudget.maxRuntimeCalls !== executionScope.maxRuntimeCalls) {
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
    'includeApprovalPacketId',
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

function validateForbiddenExpansions(forbiddenExpansions) {
  const invalidFields = [];
  if (!isPlainObject(forbiddenExpansions)) return ['forbiddenExpansions'];
  for (const field of FORBIDDEN_EXPANSION_FIELDS) {
    if (forbiddenExpansions[field] !== false) invalidFields.push(`forbiddenExpansions.${field}`);
  }
  return invalidFields;
}

function buildVcpToolBoxTargetSpecificRuntimeInspectionExecutionApprovalDraft(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_EXECUTION_SCOPE_FIELDS, input.executionScope, 'executionScope'),
    ...missingFields(REQUIRED_CURRENT_FACTS_BINDING_FIELDS, input.currentFactsBinding, 'currentFactsBinding'),
    ...missingFields(REQUIRED_APPROVAL_LINE_TEMPLATE_FIELDS, input.approvalLineTemplate, 'approvalLineTemplate'),
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
    return rejected('forbidden_secret_locator_approval_or_raw_fields', input, { forbiddenFields });
  }

  const approvalResult = buildVcpToolBoxTargetSpecificRuntimeInspectionApprovalPacket(input.referencedApprovalPacket);
  if (!approvalResult.accepted) {
    return rejected('referenced_approval_packet_rejected', input, {
      referencedApprovalReasonCode: approvalResult.reasonCode,
      invalidFields: ['referencedApprovalPacket']
    });
  }

  const forbiddenCounters = collectNonZeroCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('forbidden_nonzero_execution_or_approval_counters', input, { forbiddenCounters });
  }

  const invalidFields = [];
  if (input.schemaVersion !== SCHEMA_VERSION) invalidFields.push('schemaVersion');
  if (input.sourceSystem !== SOURCE_SYSTEM) invalidFields.push('sourceSystem');
  if (!isSafeReferenceName(input.executionApprovalDraftId)) invalidFields.push('executionApprovalDraftId');
  if (input.exactDraftToken !== EXACT_DRAFT_TOKEN) invalidFields.push('exactDraftToken');
  if (input.operatorDecision !== OPERATOR_DECISION) invalidFields.push('operatorDecision');
  invalidFields.push(...validateExecutionScope(input.executionScope, approvalResult));
  invalidFields.push(...validateCurrentFactsBinding(input.currentFactsBinding));
  invalidFields.push(...validateApprovalLineTemplate(input.approvalLineTemplate));
  invalidFields.push(...validateRuntimeBudget(input.runtimeBudget, input.executionScope));
  invalidFields.push(...validateOutputPolicy(input.outputPolicy));
  invalidFields.push(...validateReceiptPlan(input.receiptPlan));
  invalidFields.push(...validateStopConditions(input.stopConditions));
  invalidFields.push(...validateForbiddenExpansions(input.forbiddenExpansions));

  if (invalidFields.length > 0) {
    return rejected('invalid_target_specific_runtime_inspection_execution_approval_draft', input, { invalidFields });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    sourceSystem: SOURCE_SYSTEM,
    executionApprovalDraftId: input.executionApprovalDraftId,
    referencedApprovalPacketId: approvalResult.approvalPacketId,
    referencedDiscoveryPacketId: approvalResult.referencedDiscoveryPacketId,
    referencedTargetReferenceName: approvalResult.referencedTargetReferenceName,
    exactDraftTokenMatched: true,
    operatorDecision: OPERATOR_DECISION,
    draftStatus: 'draft_valid_not_approved',
    executionApprovalDraftValidForFutureUse: true,
    executionScope: {
      approvalPacketId: input.executionScope.approvalPacketId,
      discoveryPacketId: input.executionScope.discoveryPacketId,
      targetReferenceName: input.executionScope.targetReferenceName,
      targetKind: input.executionScope.targetKind,
      discoverySource: input.executionScope.discoverySource,
      requestedProfile: input.executionScope.requestedProfile,
      allowedRuntimeActions: [...input.executionScope.allowedRuntimeActions],
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
      worktreeStatusRequired: 'clean_before_target_specific_runtime_inspection_execution'
    },
    approvalLineTemplateShape: {
      exactApprovalLineTemplatePresent: true,
      exactApprovalLineValueIncluded: false,
      targetBindingPlaceholderRequired: true,
      commitBindingPlaceholderRequired: true,
      expiryPlaceholderRequired: true,
      callBudgetRequired: true,
      oneTimeUseOnly: true,
      humanOperatorRequired: true
    },
    runtimeBudget: {
      maxRuntimeProbeMinutes: DEFAULT_MAX_RUNTIME_PROBE_MINUTES,
      maxRuntimeCalls: DEFAULT_MAX_RUNTIME_CALLS,
      maxMemoryReadQueries: 0,
      maxMemoryWrites: 0,
      maxProviderCalls: 0
    },
    outputPolicy: {
      lowDisclosureOnly: true,
      rawTargetValueAllowed: false,
      rawOutputPersistenceAllowed: false,
      secretValuesAllowed: false,
      rawMemoryAllowed: false,
      pathEndpointValueAllowed: false,
      runtimeResponsePersistenceAllowed: false
    },
    receiptPlan: {
      postInspectionReceiptRequired: true,
      includeTargetClass: true,
      includeDiscoveryPacketId: true,
      includeApprovalPacketId: true,
      includeActionCounters: true,
      includeValidationResult: true,
      includeRawOutput: false,
      includeSecretValues: false,
      includeReadinessClaim: false
    },
    stopConditions: { ...input.stopConditions },
    nextAction: 'operator_must_issue_fresh_exact_target_specific_runtime_inspection_execution_approval_line_before_any_probe',
    targetSpecificRuntimeInspectionExecutionApprovedByThisHelper: false,
    exactApprovalLineIssued: false,
    approvalLineConsumed: false,
    targetSpecificRuntimeInspectionAllowedByThisHelper: false,
    runtimeExecutionAllowedByThisHelper: false,
    targetSpecificRuntimeInspectionExecuted: false,
    liveVcpToolBoxCalled: false,
    runtimeWiringExecuted: false,
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
  ALLOWED_RUNTIME_ACTIONS,
  CONTRACT_MODE,
  CONTRACT_NAME,
  DEFAULT_MAX_RUNTIME_CALLS,
  DEFAULT_MAX_RUNTIME_PROBE_MINUTES,
  EXACT_DRAFT_TOKEN,
  FORBIDDEN_EXPANSION_FIELDS,
  FORBIDDEN_FIELD_NAMES,
  OPERATOR_DECISION,
  REQUIRED_APPROVAL_LINE_TEMPLATE_FIELDS,
  REQUIRED_CURRENT_FACTS_BINDING_FIELDS,
  REQUIRED_EXECUTION_SCOPE_FIELDS,
  REQUIRED_OUTPUT_POLICY_FIELDS,
  REQUIRED_RECEIPT_PLAN_FIELDS,
  REQUIRED_RUNTIME_BUDGET_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  STOP_CONDITION_FIELDS,
  ZERO_COUNTERS,
  buildVcpToolBoxTargetSpecificRuntimeInspectionExecutionApprovalDraft
};
