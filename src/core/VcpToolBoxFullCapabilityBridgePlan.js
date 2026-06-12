'use strict';

const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpToolBoxFullCapabilityBridgePlan';
const CONTRACT_MODE = 'source_contract_only';
const SCHEMA_VERSION = 1;

const SOURCE_SYSTEM = 'VCPToolBox';

const PROFILES = Object.freeze({
  OBSERVE_LITE: 'observe-lite',
  OBSERVE_FULL: 'observe-full',
  TRUSTED_FULL_READ: 'trusted-full-read',
  TRUSTED_WRITE_PROPOSAL: 'trusted-write-proposal',
  TRUSTED_FULL: 'trusted-full'
});

const TARGET_KINDS = Object.freeze([
  'local_checkout',
  'service_url',
  'mcp_server',
  'cli',
  'plugin_api',
  'ipc'
]);

const SOURCE_COMPONENTS = Object.freeze([
  'DailyNote',
  'DailyNoteManager',
  'KnowledgeBaseManager',
  'TagMemo',
  'TagMemoEngine',
  'LightMemo',
  'TDBKnowledge',
  'DeepMemo',
  'TopicMemo',
  'MeshMemo',
  'RAGDiaryPlugin'
]);

const READ_ACTIONS = Object.freeze([
  'daily_note.read',
  'daily_note_manager.recall',
  'knowledge_base.search',
  'knowledge_base.rerank',
  'tagmemo.associate',
  'tagmemo.boost',
  'lightmemo.route',
  'tdb_knowledge.search',
  'deepmemo.recall',
  'topicmemo.recall',
  'meshmemo.recall',
  'rag_diary.inject_context'
]);

const WRITE_PROPOSAL_ACTIONS = Object.freeze([
  'daily_note.write_proposal',
  'knowledge_base.write_proposal',
  'tagmemo.write_proposal'
]);

const WRITE_ACTIONS = Object.freeze([
  'daily_note.write',
  'knowledge_base.write',
  'tagmemo.write'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'sourceSystem',
  'target',
  'profile',
  'components',
  'requestedActions',
  'principal',
  'limits'
]);

const REQUIRED_TARGET_FIELDS = Object.freeze([
  'kind',
  'referenceName',
  'locatorHashPresent',
  'locatorValueIncluded',
  'secretMaterialIncluded'
]);

const REQUIRED_PRINCIPAL_FIELDS = Object.freeze([
  'agentAlias',
  'agentIdPresent',
  'projectIdPresent',
  'workspaceIdPresent',
  'clientIdPresent',
  'sessionIdPresent'
]);

const REQUIRED_LIMIT_FIELDS = Object.freeze([
  'maxRuntimeCalls',
  'timeoutMs',
  'maxReturnedItems',
  'maxReturnedChars'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'endpoint',
  'url',
  'baseUrl',
  'absolutePath',
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
  'rawDailyNote',
  'rawDailyNoteContent',
  'rawRagInjectedContext',
  'rawVectorRows',
  'rawPrompt',
  'rawConversation'
]);

const PROFILE_CAPABILITIES = Object.freeze({
  [PROFILES.OBSERVE_LITE]: Object.freeze({
    fullRead: false,
    rawOutputAllowed: false,
    structuredOutputAllowed: true,
    summaryOutputAllowed: true,
    writeProposalAllowed: false,
    durableWriteAllowed: false,
    sustainedConversationUse: false
  }),
  [PROFILES.OBSERVE_FULL]: Object.freeze({
    fullRead: true,
    rawOutputAllowed: true,
    structuredOutputAllowed: true,
    summaryOutputAllowed: true,
    writeProposalAllowed: false,
    durableWriteAllowed: false,
    sustainedConversationUse: false
  }),
  [PROFILES.TRUSTED_FULL_READ]: Object.freeze({
    fullRead: true,
    rawOutputAllowed: true,
    structuredOutputAllowed: true,
    summaryOutputAllowed: true,
    writeProposalAllowed: false,
    durableWriteAllowed: false,
    sustainedConversationUse: true
  }),
  [PROFILES.TRUSTED_WRITE_PROPOSAL]: Object.freeze({
    fullRead: true,
    rawOutputAllowed: true,
    structuredOutputAllowed: true,
    summaryOutputAllowed: true,
    writeProposalAllowed: true,
    durableWriteAllowed: false,
    sustainedConversationUse: true
  }),
  [PROFILES.TRUSTED_FULL]: Object.freeze({
    fullRead: true,
    rawOutputAllowed: true,
    structuredOutputAllowed: true,
    summaryOutputAllowed: true,
    writeProposalAllowed: true,
    durableWriteAllowed: true,
    sustainedConversationUse: true
  })
});

const ZERO_EXECUTION_COUNTERS = Object.freeze({
  liveVcpToolBoxCalls: 0,
  networkCalls: 0,
  mcpCalls: 0,
  configEnvReads: 0,
  envFileReads: 0,
  rawStoreReads: 0,
  providerApiCalls: 0,
  durableMemoryWrites: 0,
  publicMcpExpansions: 0,
  confirmedMutations: 0
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

function lowDisclosureProjection(input) {
  if (!isPlainObject(input)) {
    return {
      sourceSystem: null,
      profile: null,
      targetKind: null,
      referenceName: null,
      requestedActionCount: 0
    };
  }
  return {
    sourceSystem: typeof input.sourceSystem === 'string' ? input.sourceSystem : null,
    profile: typeof input.profile === 'string' ? input.profile : null,
    targetKind: isPlainObject(input.target) && typeof input.target.kind === 'string' ? input.target.kind : null,
    referenceName: isPlainObject(input.target) && isSafeReferenceName(input.target.referenceName)
      ? input.target.referenceName
      : null,
    requestedActionCount: Array.isArray(input.requestedActions) ? input.requestedActions.length : 0
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
    runtimeExecutionAllowedByThisHelper: false,
    actionPlanOnly: true,
    counters: { ...ZERO_EXECUTION_COUNTERS },
    runtimeWiringExecuted: false,
    liveVcpToolBoxCalled: false,
    configEnvRead: false,
    envFileRead: false,
    providerApiCalled: false,
    rawStoreRead: false,
    memoryWritten: false,
    publicMcpExpanded: false,
    readinessClaimAllowed: false
  };
}

function profileCapabilities(profile) {
  return PROFILE_CAPABILITIES[profile] || null;
}

function allowedActionsForProfile(profile) {
  const capabilities = profileCapabilities(profile);
  if (!capabilities) return [];

  const actions = [...READ_ACTIONS];
  if (capabilities.writeProposalAllowed) actions.push(...WRITE_PROPOSAL_ACTIONS);
  if (capabilities.durableWriteAllowed) actions.push(...WRITE_ACTIONS);
  return actions;
}

function invalidArrayValues(values, allowed, fieldName) {
  if (!Array.isArray(values) || values.length === 0) return [fieldName];
  return values
    .filter(value => !allowed.includes(value))
    .map(value => `${fieldName}:${value}`);
}

function validatePrincipal(principal) {
  const invalidFields = [];
  if (!isPlainObject(principal)) return ['principal'];
  if (principal.agentAlias !== 'Codex') invalidFields.push('principal.agentAlias');
  for (const field of REQUIRED_PRINCIPAL_FIELDS.filter(field => field !== 'agentAlias')) {
    if (principal[field] !== true) invalidFields.push(`principal.${field}`);
  }
  return invalidFields;
}

function validateLimits(limits) {
  const invalidFields = [];
  if (!isPlainObject(limits)) return ['limits'];
  if (!Number.isInteger(limits.maxRuntimeCalls) || limits.maxRuntimeCalls < 1 || limits.maxRuntimeCalls > 12) {
    invalidFields.push('limits.maxRuntimeCalls');
  }
  if (!Number.isInteger(limits.timeoutMs) || limits.timeoutMs < 1 || limits.timeoutMs > 30000) {
    invalidFields.push('limits.timeoutMs');
  }
  if (!Number.isInteger(limits.maxReturnedItems) || limits.maxReturnedItems < 1 || limits.maxReturnedItems > 50) {
    invalidFields.push('limits.maxReturnedItems');
  }
  if (!Number.isInteger(limits.maxReturnedChars) || limits.maxReturnedChars < 1 || limits.maxReturnedChars > 20000) {
    invalidFields.push('limits.maxReturnedChars');
  }
  return invalidFields;
}

function buildPlannedOperations(input, capabilities) {
  return input.requestedActions.map(action => ({
    sourceSystem: SOURCE_SYSTEM,
    targetKind: input.target.kind,
    targetReferenceName: input.target.referenceName,
    profile: input.profile,
    action,
    components: [...input.components],
    fullRead: capabilities.fullRead,
    rawOutputAllowed: capabilities.rawOutputAllowed,
    structuredOutputAllowed: capabilities.structuredOutputAllowed,
    summaryOutputAllowed: capabilities.summaryOutputAllowed,
    writeProposalAllowed: capabilities.writeProposalAllowed,
    durableWriteAllowed: capabilities.durableWriteAllowed,
    executionStatus: 'planned_not_executed'
  }));
}

function buildVcpToolBoxFullCapabilityBridgePlan(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_TARGET_FIELDS, input.target, 'target'),
    ...missingFields(REQUIRED_PRINCIPAL_FIELDS, input.principal, 'principal'),
    ...missingFields(REQUIRED_LIMIT_FIELDS, input.limits, 'limits')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_target_or_secret_fields', input, { forbiddenFields });
  }

  const invalidFields = [];
  if (input.schemaVersion !== SCHEMA_VERSION) invalidFields.push('schemaVersion');
  if (input.sourceSystem !== SOURCE_SYSTEM) invalidFields.push('sourceSystem');
  if (!TARGET_KINDS.includes(input.target.kind)) invalidFields.push('target.kind');
  if (!isSafeReferenceName(input.target.referenceName)) {
    invalidFields.push('target.referenceName');
  }
  if (input.target.locatorHashPresent !== true) invalidFields.push('target.locatorHashPresent');
  if (input.target.locatorValueIncluded !== false) invalidFields.push('target.locatorValueIncluded');
  if (input.target.secretMaterialIncluded !== false) invalidFields.push('target.secretMaterialIncluded');
  if (!profileCapabilities(input.profile)) invalidFields.push('profile');
  invalidFields.push(...invalidArrayValues(input.components, SOURCE_COMPONENTS, 'components'));
  invalidFields.push(...validatePrincipal(input.principal));
  invalidFields.push(...validateLimits(input.limits));

  if (invalidFields.length > 0) {
    return rejected('invalid_full_capability_bridge_contract', input, { invalidFields });
  }

  const allowedActions = allowedActionsForProfile(input.profile);
  const rejectedActions = input.requestedActions.filter(action => !allowedActions.includes(action));
  if (!Array.isArray(input.requestedActions) || input.requestedActions.length === 0) {
    return rejected('missing_requested_actions', input, { invalidFields: ['requestedActions'] });
  }
  if (input.requestedActions.length > input.limits.maxRuntimeCalls) {
    return rejected('requested_actions_exceed_runtime_call_limit', input, { invalidFields: ['requestedActions'] });
  }
  if (rejectedActions.length > 0) {
    return rejected('requested_actions_not_allowed_by_profile', input, { rejectedActions });
  }

  const capabilities = profileCapabilities(input.profile);

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    sourceSystem: SOURCE_SYSTEM,
    profile: input.profile,
    target: {
      kind: input.target.kind,
      referenceName: input.target.referenceName,
      locatorHashPresent: true,
      locatorValueIncluded: false,
      secretMaterialIncluded: false
    },
    capabilities: { ...capabilities },
    allowedActions,
    requestedActions: [...input.requestedActions],
    plannedOperations: buildPlannedOperations(input, capabilities),
    missingFields: [],
    forbiddenFields: [],
    invalidFields: [],
    rejectedActions: [],
    runtimeExecutionAllowedByThisHelper: false,
    runtimeExecutionPrerequisites: [
      'real_vcp_toolbox_target_identified',
      'operator_selected_profile',
      'non_secret_profile_fields_configured',
      'fresh_git_before_runtime_sensitive_work',
      'runtime_task_validation_plan'
    ],
    actionPlanOnly: true,
    counters: { ...ZERO_EXECUTION_COUNTERS },
    runtimeWiringExecuted: false,
    liveVcpToolBoxCalled: false,
    configEnvRead: false,
    envFileRead: false,
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
  FORBIDDEN_FIELD_NAMES,
  PROFILES,
  READ_ACTIONS,
  REQUIRED_TOP_LEVEL_FIELDS,
  SOURCE_COMPONENTS,
  TARGET_KINDS,
  WRITE_ACTIONS,
  WRITE_PROPOSAL_ACTIONS,
  ZERO_EXECUTION_COUNTERS,
  buildVcpToolBoxFullCapabilityBridgePlan,
  profileCapabilities
};
