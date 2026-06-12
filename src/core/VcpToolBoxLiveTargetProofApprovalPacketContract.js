'use strict';

const {
  buildVcpToolBoxLiveTargetProofPacketContract
} = require('./VcpToolBoxLiveTargetProofPacketContract');
const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpToolBoxLiveTargetProofApprovalPacketContract';
const CONTRACT_MODE = 'fixture_contract_only';
const SCHEMA_VERSION = 1;
const SOURCE_SYSTEM = 'VCPToolBox';

const EXACT_APPROVAL_TOKEN = 'APPROVE_CM1694_VCPTOOLBOX_LIVE_TARGET_PROOF_APPROVAL_PACKET_ONLY_NO_EXECUTION';
const OPERATOR_DECISION = 'approve_packet_contract_only_no_execution';

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'sourceSystem',
  'approvalPacketId',
  'exactApprovalToken',
  'operatorDecision',
  'referencedProofPacket',
  'approvalScope',
  'commitBinding',
  'expiry',
  'forbiddenExpansions',
  'counters'
]);

const REQUIRED_APPROVAL_SCOPE_FIELDS = Object.freeze([
  'proofPacketId',
  'targetReferenceName',
  'proofMode',
  'proofProfile',
  'maxRuntimeCalls',
  'noMemoryRead',
  'noWrite',
  'noProviderCall',
  'noPublicMcpExpansion',
  'noReadinessClaim'
]);

const REQUIRED_COMMIT_BINDING_FIELDS = Object.freeze([
  'freshGitRequired',
  'targetCommitPresent',
  'targetCommitValueIncluded',
  'originCommitPresent',
  'originCommitValueIncluded',
  'worktreeStatusRequired'
]);

const REQUIRED_EXPIRY_FIELDS = Object.freeze([
  'expiresAtPresent',
  'expiresAtValueIncluded',
  'expired'
]);

const FORBIDDEN_EXPANSION_FIELDS = Object.freeze([
  'allowLiveExecution',
  'allowRuntimeWiring',
  'allowConfigEnvRead',
  'allowEnvFileRead',
  'allowSecretMaterial',
  'allowRawMemoryRead',
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
  providerApiCalls: 0,
  memoryWrites: 0,
  durableMemoryWrites: 0,
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

function collectPositiveCounters(counters) {
  if (!isPlainObject(counters)) return Object.keys(ZERO_COUNTERS);
  return Object.keys(ZERO_COUNTERS).filter(field => Number(counters[field] || 0) > 0);
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
      approvalPacketId: null,
      referencedProofPacketId: null,
      operatorDecision: null
    };
  }

  return {
    sourceSystem: typeof input.sourceSystem === 'string' ? input.sourceSystem : null,
    approvalPacketId: isSafeReferenceName(input.approvalPacketId) ? input.approvalPacketId : null,
    referencedProofPacketId: isPlainObject(input.referencedProofPacket) &&
      isSafeReferenceName(input.referencedProofPacket.packetId)
      ? input.referencedProofPacket.packetId
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
    proofPacketReasonCode: details.proofPacketReasonCode || null,
    exactApprovalTokenMatched: false,
    approvalPacketValidForFutureUse: false,
    liveExecutionAllowedByThisHelper: false,
    runtimeExecutionAllowedByThisHelper: false,
    liveVcpToolBoxCalled: false,
    liveTargetProofExecuted: false,
    runtimeWiringExecuted: false,
    configEnvRead: false,
    envFileRead: false,
    rawMemoryRead: false,
    memoryWritten: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    readinessClaimAllowed: false,
    counters: { ...ZERO_COUNTERS }
  };
}

function validateApprovalScope(approvalScope, proofPacket, proofResult) {
  const invalidFields = [];
  if (!isPlainObject(approvalScope)) return ['approvalScope'];

  if (approvalScope.proofPacketId !== proofPacket.packetId) invalidFields.push('approvalScope.proofPacketId');
  if (approvalScope.targetReferenceName !== proofPacket.target.referenceName) {
    invalidFields.push('approvalScope.targetReferenceName');
  }
  if (approvalScope.proofMode !== proofPacket.proofMode) invalidFields.push('approvalScope.proofMode');
  if (approvalScope.proofProfile !== proofPacket.proofProfile) invalidFields.push('approvalScope.proofProfile');
  if (approvalScope.maxRuntimeCalls !== proofPacket.validationPlan.maxRuntimeCalls) {
    invalidFields.push('approvalScope.maxRuntimeCalls');
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

  if (!proofResult.accepted) invalidFields.push('referencedProofPacket');
  return invalidFields;
}

function validateCommitBinding(commitBinding) {
  const invalidFields = [];
  if (!isPlainObject(commitBinding)) return ['commitBinding'];
  if (commitBinding.freshGitRequired !== true) invalidFields.push('commitBinding.freshGitRequired');
  if (commitBinding.targetCommitPresent !== true) invalidFields.push('commitBinding.targetCommitPresent');
  if (commitBinding.targetCommitValueIncluded !== false) {
    invalidFields.push('commitBinding.targetCommitValueIncluded');
  }
  if (commitBinding.originCommitPresent !== true) invalidFields.push('commitBinding.originCommitPresent');
  if (commitBinding.originCommitValueIncluded !== false) {
    invalidFields.push('commitBinding.originCommitValueIncluded');
  }
  if (commitBinding.worktreeStatusRequired !== 'clean_or_explicitly_scoped') {
    invalidFields.push('commitBinding.worktreeStatusRequired');
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

function validateForbiddenExpansions(forbiddenExpansions) {
  const invalidFields = [];
  if (!isPlainObject(forbiddenExpansions)) return ['forbiddenExpansions'];
  for (const field of FORBIDDEN_EXPANSION_FIELDS) {
    if (forbiddenExpansions[field] !== false) invalidFields.push(`forbiddenExpansions.${field}`);
  }
  return invalidFields;
}

function buildVcpToolBoxLiveTargetProofApprovalPacketContract(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_APPROVAL_SCOPE_FIELDS, input.approvalScope, 'approvalScope'),
    ...missingFields(REQUIRED_COMMIT_BINDING_FIELDS, input.commitBinding, 'commitBinding'),
    ...missingFields(REQUIRED_EXPIRY_FIELDS, input.expiry, 'expiry'),
    ...missingFields(FORBIDDEN_EXPANSION_FIELDS, input.forbiddenExpansions, 'forbiddenExpansions')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_secret_locator_or_raw_fields', input, { forbiddenFields });
  }

  const proofResult = buildVcpToolBoxLiveTargetProofPacketContract(input.referencedProofPacket);
  if (!proofResult.accepted) {
    return rejected('referenced_proof_packet_rejected', input, {
      proofPacketReasonCode: proofResult.reasonCode,
      invalidFields: ['referencedProofPacket']
    });
  }

  const forbiddenCounters = collectPositiveCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('forbidden_positive_execution_counters', input, { forbiddenCounters });
  }

  const invalidFields = [];
  if (input.schemaVersion !== SCHEMA_VERSION) invalidFields.push('schemaVersion');
  if (input.sourceSystem !== SOURCE_SYSTEM) invalidFields.push('sourceSystem');
  if (!isSafeReferenceName(input.approvalPacketId)) invalidFields.push('approvalPacketId');
  if (input.exactApprovalToken !== EXACT_APPROVAL_TOKEN) invalidFields.push('exactApprovalToken');
  if (input.operatorDecision !== OPERATOR_DECISION) invalidFields.push('operatorDecision');
  invalidFields.push(...validateApprovalScope(input.approvalScope, input.referencedProofPacket, proofResult));
  invalidFields.push(...validateCommitBinding(input.commitBinding));
  invalidFields.push(...validateExpiry(input.expiry));
  invalidFields.push(...validateForbiddenExpansions(input.forbiddenExpansions));

  if (invalidFields.length > 0) {
    return rejected('invalid_live_target_proof_approval_packet_contract', input, { invalidFields });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    sourceSystem: SOURCE_SYSTEM,
    approvalPacketId: input.approvalPacketId,
    referencedProofPacketId: input.referencedProofPacket.packetId,
    exactApprovalTokenMatched: true,
    approvalPacketValidForFutureUse: true,
    operatorDecision: OPERATOR_DECISION,
    approvalScope: {
      proofPacketId: input.approvalScope.proofPacketId,
      targetReferenceName: input.approvalScope.targetReferenceName,
      proofMode: input.approvalScope.proofMode,
      proofProfile: input.approvalScope.proofProfile,
      maxRuntimeCalls: input.approvalScope.maxRuntimeCalls,
      noMemoryRead: true,
      noWrite: true,
      noProviderCall: true,
      noPublicMcpExpansion: true,
      noReadinessClaim: true
    },
    nextAction: 'operator_must_issue_separate_live_execution_approval_before_probe',
    liveExecutionAllowedByThisHelper: false,
    runtimeExecutionAllowedByThisHelper: false,
    liveVcpToolBoxCalled: false,
    liveTargetProofExecuted: false,
    runtimeWiringExecuted: false,
    configEnvRead: false,
    envFileRead: false,
    rawMemoryRead: false,
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
  EXACT_APPROVAL_TOKEN,
  FORBIDDEN_FIELD_NAMES,
  FORBIDDEN_EXPANSION_FIELDS,
  OPERATOR_DECISION,
  REQUIRED_APPROVAL_SCOPE_FIELDS,
  REQUIRED_COMMIT_BINDING_FIELDS,
  REQUIRED_EXPIRY_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTERS,
  buildVcpToolBoxLiveTargetProofApprovalPacketContract
};
