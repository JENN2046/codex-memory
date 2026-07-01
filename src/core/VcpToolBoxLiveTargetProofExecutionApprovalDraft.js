'use strict';

const {
  buildVcpToolBoxLiveTargetProofApprovalPacketContract
} = require('./VcpToolBoxLiveTargetProofApprovalPacketContract');
const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpToolBoxLiveTargetProofExecutionApprovalDraft';
const CONTRACT_MODE = 'fixture_draft_only';
const SCHEMA_VERSION = 1;
const SOURCE_SYSTEM = 'VCPToolBox';

const EXACT_DRAFT_TOKEN = 'DRAFT_CM1697_VCPTOOLBOX_LIVE_TARGET_PROOF_EXECUTION_APPROVAL_PACKET_ONLY_NO_EXECUTION';
const OPERATOR_DECISION = 'draft_execution_approval_packet_only_no_execution';

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
  'proofPacketId',
  'targetReferenceName',
  'proofMode',
  'proofProfile',
  'allowedRuntimeActions',
  'maxRuntimeCalls',
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
  'rawOutputPersistenceAllowed',
  'secretValuesAllowed',
  'rawMemoryAllowed',
  'pathEndpointValueAllowed'
]);

const REQUIRED_RECEIPT_PLAN_FIELDS = Object.freeze([
  'postProofReceiptRequired',
  'includeTargetClass',
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
  'onAnyMemoryRead',
  'onAnyWrite',
  'onAnyProviderCall',
  'onRawOutput'
]);

const FORBIDDEN_EXPANSION_FIELDS = Object.freeze([
  'allowExecutionWithoutFreshApproval',
  'allowRuntimeWiring',
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
  'allowApprovalLineValuePersistence'
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
  'targetCommit',
  'originCommit',
  'branchName',
  'expiresAt',
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
  liveVcpToolBoxCalls: 0,
  liveTargetProofs: 0,
  runtimeCalls: 0,
  networkCalls: 0,
  mcpCalls: 0,
  configEnvReads: 0,
  envFileReads: 0,
  secretReads: 0,
  rawStoreReads: 0,
  memoryReads: 0,
  providerApiCalls: 0,
  memoryWrites: 0,
  durableMemoryWrites: 0,
  publicMcpExpansions: 0,
  readinessClaims: 0,
  approvalLinesIssued: 0,
  executionApprovalsGranted: 0
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
      executionApprovalDraftId: null,
      referencedApprovalPacketId: null,
      referencedProofPacketId: null,
      operatorDecision: null
    };
  }

  return {
    sourceSystem: typeof input.sourceSystem === 'string' ? input.sourceSystem : null,
    executionApprovalDraftId: isSafeReferenceName(input.executionApprovalDraftId)
      ? input.executionApprovalDraftId
      : null,
    referencedApprovalPacketId: isPlainObject(input.referencedApprovalPacket) &&
      isSafeReferenceName(input.referencedApprovalPacket.approvalPacketId)
      ? input.referencedApprovalPacket.approvalPacketId
      : null,
    referencedProofPacketId: isPlainObject(input.referencedApprovalPacket) &&
      isPlainObject(input.referencedApprovalPacket.referencedProofPacket) &&
      isSafeReferenceName(input.referencedApprovalPacket.referencedProofPacket.packetId)
      ? input.referencedApprovalPacket.referencedProofPacket.packetId
      : null,
    operatorDecision: typeof input.operatorDecision === 'string' ? input.operatorDecision : null
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
    executionApprovalGrantedByThisHelper: false,
    exactApprovalLineIssued: false,
    liveExecutionAllowedByThisHelper: false,
    runtimeExecutionAllowedByThisHelper: false,
    liveVcpToolBoxCalled: false,
    liveTargetProofExecuted: false,
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

function sameStringArray(left, right) {
  return Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index]);
}

function validateExecutionScope(executionScope, approvalPacket, approvalResult) {
  const invalidFields = [];
  if (!isPlainObject(executionScope)) return ['executionScope'];

  const proofPacket = approvalPacket.referencedProofPacket;
  if (executionScope.approvalPacketId !== approvalPacket.approvalPacketId) {
    invalidFields.push('executionScope.approvalPacketId');
  }
  if (executionScope.proofPacketId !== approvalResult.referencedProofPacketId) {
    invalidFields.push('executionScope.proofPacketId');
  }
  if (executionScope.targetReferenceName !== approvalResult.approvalScope.targetReferenceName) {
    invalidFields.push('executionScope.targetReferenceName');
  }
  if (executionScope.proofMode !== approvalResult.approvalScope.proofMode) {
    invalidFields.push('executionScope.proofMode');
  }
  if (executionScope.proofProfile !== approvalResult.approvalScope.proofProfile) {
    invalidFields.push('executionScope.proofProfile');
  }
  if (!sameStringArray(executionScope.allowedRuntimeActions, proofPacket.allowedRuntimeActions)) {
    invalidFields.push('executionScope.allowedRuntimeActions');
  }
  if (executionScope.maxRuntimeCalls !== approvalResult.approvalScope.maxRuntimeCalls) {
    invalidFields.push('executionScope.maxRuntimeCalls');
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
  if (currentFactsBinding.freshGitRequired !== true) {
    invalidFields.push('currentFactsBinding.freshGitRequired');
  }
  if (currentFactsBinding.targetCommitPresent !== true) {
    invalidFields.push('currentFactsBinding.targetCommitPresent');
  }
  if (currentFactsBinding.targetCommitValueIncluded !== false) {
    invalidFields.push('currentFactsBinding.targetCommitValueIncluded');
  }
  if (currentFactsBinding.originCommitPresent !== true) {
    invalidFields.push('currentFactsBinding.originCommitPresent');
  }
  if (currentFactsBinding.originCommitValueIncluded !== false) {
    invalidFields.push('currentFactsBinding.originCommitValueIncluded');
  }
  if (currentFactsBinding.branchNamePresent !== true) {
    invalidFields.push('currentFactsBinding.branchNamePresent');
  }
  if (currentFactsBinding.branchNameValueIncluded !== false) {
    invalidFields.push('currentFactsBinding.branchNameValueIncluded');
  }
  if (currentFactsBinding.worktreeStatusRequired !== 'clean_before_execution') {
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
  if (!Number.isInteger(runtimeBudget.maxRuntimeProbeMinutes) ||
    runtimeBudget.maxRuntimeProbeMinutes < 1 ||
    runtimeBudget.maxRuntimeProbeMinutes > 10) {
    invalidFields.push('runtimeBudget.maxRuntimeProbeMinutes');
  }
  if (!Number.isInteger(runtimeBudget.maxRuntimeCalls) ||
    runtimeBudget.maxRuntimeCalls < 1 ||
    runtimeBudget.maxRuntimeCalls > 3 ||
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
    'postProofReceiptRequired',
    'includeTargetClass',
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

function buildVcpToolBoxLiveTargetProofExecutionApprovalDraft(input = {}) {
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

  const approvalResult = buildVcpToolBoxLiveTargetProofApprovalPacketContract(input.referencedApprovalPacket);
  if (!approvalResult.accepted) {
    return rejected('referenced_approval_packet_rejected', input, {
      referencedApprovalReasonCode: approvalResult.reasonCode,
      invalidFields: ['referencedApprovalPacket']
    });
  }

  const forbiddenCounters = collectPositiveCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('forbidden_positive_execution_or_approval_counters', input, { forbiddenCounters });
  }

  const invalidFields = [];
  if (input.schemaVersion !== SCHEMA_VERSION) invalidFields.push('schemaVersion');
  if (input.sourceSystem !== SOURCE_SYSTEM) invalidFields.push('sourceSystem');
  if (!isSafeReferenceName(input.executionApprovalDraftId)) invalidFields.push('executionApprovalDraftId');
  if (input.exactDraftToken !== EXACT_DRAFT_TOKEN) invalidFields.push('exactDraftToken');
  if (input.operatorDecision !== OPERATOR_DECISION) invalidFields.push('operatorDecision');
  invalidFields.push(...validateExecutionScope(input.executionScope, input.referencedApprovalPacket, approvalResult));
  invalidFields.push(...validateCurrentFactsBinding(input.currentFactsBinding));
  invalidFields.push(...validateApprovalLineTemplate(input.approvalLineTemplate));
  invalidFields.push(...validateRuntimeBudget(input.runtimeBudget, input.executionScope));
  invalidFields.push(...validateOutputPolicy(input.outputPolicy));
  invalidFields.push(...validateReceiptPlan(input.receiptPlan));
  invalidFields.push(...validateStopConditions(input.stopConditions));
  invalidFields.push(...validateForbiddenExpansions(input.forbiddenExpansions));

  if (invalidFields.length > 0) {
    return rejected('invalid_live_target_proof_execution_approval_draft', input, { invalidFields });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    sourceSystem: SOURCE_SYSTEM,
    executionApprovalDraftId: input.executionApprovalDraftId,
    referencedApprovalPacketId: input.referencedApprovalPacket.approvalPacketId,
    referencedProofPacketId: approvalResult.referencedProofPacketId,
    exactDraftTokenMatched: true,
    operatorDecision: OPERATOR_DECISION,
    draftStatus: 'draft_not_approved',
    executionApprovalDraftValidForFutureUse: true,
    executionScope: {
      approvalPacketId: input.executionScope.approvalPacketId,
      proofPacketId: input.executionScope.proofPacketId,
      targetReferenceName: input.executionScope.targetReferenceName,
      proofMode: input.executionScope.proofMode,
      proofProfile: input.executionScope.proofProfile,
      allowedRuntimeActions: [...input.executionScope.allowedRuntimeActions],
      maxRuntimeCalls: input.executionScope.maxRuntimeCalls,
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
      worktreeStatusRequired: 'clean_before_execution'
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
      maxRuntimeProbeMinutes: input.runtimeBudget.maxRuntimeProbeMinutes,
      maxRuntimeCalls: input.runtimeBudget.maxRuntimeCalls,
      maxMemoryReadQueries: 0,
      maxMemoryWrites: 0,
      maxProviderCalls: 0
    },
    outputPolicy: {
      lowDisclosureOnly: true,
      rawOutputPersistenceAllowed: false,
      secretValuesAllowed: false,
      rawMemoryAllowed: false,
      pathEndpointValueAllowed: false
    },
    receiptPlan: {
      postProofReceiptRequired: true,
      includeTargetClass: true,
      includeActionCounters: true,
      includeValidationResult: true,
      includeRawOutput: false,
      includeSecretValues: false,
      includeReadinessClaim: false
    },
    stopConditions: { ...input.stopConditions },
    nextAction: 'operator_must_issue_fresh_exact_live_execution_approval_line_before_any_probe',
    executionApprovalGrantedByThisHelper: false,
    exactApprovalLineIssued: false,
    liveExecutionAllowedByThisHelper: false,
    runtimeExecutionAllowedByThisHelper: false,
    liveVcpToolBoxCalled: false,
    liveTargetProofExecuted: false,
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
  CONTRACT_MODE,
  CONTRACT_NAME,
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
  buildVcpToolBoxLiveTargetProofExecutionApprovalDraft
};
