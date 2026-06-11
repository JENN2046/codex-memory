'use strict';

const CONTRACT_NAME = 'VcpSustainedRecallEnvelopeContract';
const CONTRACT_MODE = 'fixture_only';
const SCHEMA_VERSION = 1;

const ALLOWED_ACTIONS = Object.freeze([
  'vcp_recall_no_write'
]);

const ALLOWED_SOURCE_SYSTEMS = Object.freeze([
  'VCPToolBox'
]);

const ALLOWED_SOURCE_COMPONENTS = Object.freeze([
  'LightMemo',
  'KnowledgeBaseManager',
  'TDBKnowledge',
  'DailyNoteManager',
  'RAGDiaryPlugin',
  'TagMemo',
  'TagMemoEngine',
  'DeepMemo',
  'TopicMemo',
  'MeshMemo'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'action',
  'sourceSystem',
  'sourceComponent',
  'queryHashPresent',
  'queryTextIncluded',
  'principal',
  'limits',
  'projection',
  'counters'
]);

const REQUIRED_PRINCIPAL_FIELDS = Object.freeze([
  'agentAlias',
  'agentIdPresent',
  'projectIdPresent',
  'workspaceIdPresent',
  'clientIdPresent'
]);

const REQUIRED_LIMIT_FIELDS = Object.freeze([
  'maxSnippets',
  'maxCharsPerSnippet',
  'timeoutMs'
]);

const REQUIRED_PROJECTION_FIELDS = Object.freeze([
  'lowDisclosure',
  'rawContentIncluded',
  'rawIdsIncluded',
  'rawPathsIncluded',
  'snippetBodiesAllowed',
  'summaryOnly'
]);

const ZERO_COUNTER_FIELDS = Object.freeze([
  'recordMemoryCalls',
  'recordMemoryWrites',
  'providerApiCalls',
  'rawDailyNoteReads',
  'rawRagReads',
  'rawVectorReads',
  'rawPromptReads',
  'broadMemoryScans',
  'publicMcpExpansions',
  'confirmedMutations'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'queryText',
  'rawQueryText',
  'prompt',
  'promptText',
  'conversationTranscript',
  'rawConversationTranscript',
  'modelOutput',
  'chainOfThought',
  'snippets',
  'snippetBodies',
  'rawContent',
  'rawDailyNote',
  'rawDailyNoteContent',
  'rawDiaryHistory',
  'rawRag',
  'rawRagInjectedContext',
  'rawKnowledgeBaseRows',
  'rawTdbKnowledgeContent',
  'rawVectorRows',
  'rawEmbeddings',
  'rawChunks',
  'rawCacheEntries',
  'rawWorkspaceId',
  'rawClientId',
  'rawAgentId',
  'rawPath',
  'filePath',
  'endpoint',
  'bearerToken',
  'tokenMaterial',
  'sharedSecret',
  'providerApiKey',
  'apiKey',
  'privateKey',
  'vcpStoreExportPayload',
  'bulkMemoryMigrationPayload'
]);

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
  if (!isPlainObject(counters)) return [];
  return ZERO_COUNTER_FIELDS.filter(field => Number(counters[field] || 0) > 0);
}

function lowDisclosureProjection(envelope) {
  if (!isPlainObject(envelope)) {
    return {
      sourceSystem: null,
      sourceComponent: null,
      action: null,
      queryHashPresent: false,
      queryTextIncluded: false,
      rawContentIncluded: false,
      rawIdentifiersEchoed: false
    };
  }

  return {
    sourceSystem: typeof envelope.sourceSystem === 'string' ? envelope.sourceSystem : null,
    sourceComponent: typeof envelope.sourceComponent === 'string' ? envelope.sourceComponent : null,
    action: typeof envelope.action === 'string' ? envelope.action : null,
    queryHashPresent: envelope.queryHashPresent === true,
    queryTextIncluded: envelope.queryTextIncluded === true,
    rawContentIncluded: false,
    rawIdentifiersEchoed: false
  };
}

function rejected(reasonCode, envelope, details = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(envelope),
    missingFields: details.missingFields || [],
    forbiddenFields: details.forbiddenFields || [],
    forbiddenCounters: details.forbiddenCounters || [],
    invalidFields: details.invalidFields || [],
    requiredApprovals: [],
    nextAllowedStep: 'fix_fixture_or_stop',
    runtimeWiringExecuted: false,
    liveVcpToolBoxCalled: false,
    mcpCalled: false,
    recordMemoryCalled: false,
    providerApiCalled: false,
    rawMemoryRead: false,
    memoryWritten: false,
    publicMcpExpanded: false,
    readinessClaimAllowed: false
  };
}

function validateVcpSustainedRecallEnvelope(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('envelope_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PRINCIPAL_FIELDS, input.principal, 'principal'),
    ...missingFields(REQUIRED_LIMIT_FIELDS, input.limits, 'limits'),
    ...missingFields(REQUIRED_PROJECTION_FIELDS, input.projection, 'projection')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_or_secret_fields', input, { forbiddenFields });
  }

  const forbiddenCounters = collectPositiveCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('forbidden_positive_counters', input, { forbiddenCounters });
  }

  const invalidFields = [];
  if (input.schemaVersion !== SCHEMA_VERSION) invalidFields.push('schemaVersion');
  if (!ALLOWED_ACTIONS.includes(input.action)) invalidFields.push('action');
  if (!ALLOWED_SOURCE_SYSTEMS.includes(input.sourceSystem)) invalidFields.push('sourceSystem');
  if (!ALLOWED_SOURCE_COMPONENTS.includes(input.sourceComponent)) invalidFields.push('sourceComponent');
  if (input.queryHashPresent !== true) invalidFields.push('queryHashPresent');
  if (input.queryTextIncluded !== false) invalidFields.push('queryTextIncluded');
  if (input.principal.agentAlias !== 'Codex') invalidFields.push('principal.agentAlias');
  for (const field of REQUIRED_PRINCIPAL_FIELDS.filter(field => field !== 'agentAlias')) {
    if (input.principal[field] !== true) invalidFields.push(`principal.${field}`);
  }
  if (!Number.isInteger(input.limits.maxSnippets) || input.limits.maxSnippets < 1 || input.limits.maxSnippets > 3) {
    invalidFields.push('limits.maxSnippets');
  }
  if (!Number.isInteger(input.limits.maxCharsPerSnippet) || input.limits.maxCharsPerSnippet < 1 || input.limits.maxCharsPerSnippet > 500) {
    invalidFields.push('limits.maxCharsPerSnippet');
  }
  if (!Number.isInteger(input.limits.timeoutMs) || input.limits.timeoutMs < 1 || input.limits.timeoutMs > 5000) {
    invalidFields.push('limits.timeoutMs');
  }
  if (input.projection.lowDisclosure !== true) invalidFields.push('projection.lowDisclosure');
  if (input.projection.rawContentIncluded !== false) invalidFields.push('projection.rawContentIncluded');
  if (input.projection.rawIdsIncluded !== false) invalidFields.push('projection.rawIdsIncluded');
  if (input.projection.rawPathsIncluded !== false) invalidFields.push('projection.rawPathsIncluded');
  if (input.projection.snippetBodiesAllowed !== false) invalidFields.push('projection.snippetBodiesAllowed');
  if (input.projection.summaryOnly !== true) invalidFields.push('projection.summaryOnly');

  if (invalidFields.length > 0) {
    return rejected('invalid_recall_envelope_contract', input, { invalidFields });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    action: input.action,
    sourceSystem: input.sourceSystem,
    sourceComponent: input.sourceComponent,
    lowDisclosure: true,
    summaryOnly: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    limits: {
      maxSnippets: input.limits.maxSnippets,
      maxCharsPerSnippet: input.limits.maxCharsPerSnippet,
      timeoutMs: input.limits.timeoutMs
    },
    missingFields: [],
    forbiddenFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    requiredApprovals: ['future_live_no_write_probe_exact_approval'],
    nextAllowedStep: 'fixture_contract_only',
    runtimeWiringExecuted: false,
    liveVcpToolBoxCalled: false,
    mcpCalled: false,
    recordMemoryCalled: false,
    providerApiCalled: false,
    rawMemoryRead: false,
    memoryWritten: false,
    publicMcpExpanded: false,
    readinessClaimAllowed: false
  };
}

module.exports = {
  ALLOWED_SOURCE_COMPONENTS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpSustainedRecallEnvelope
};
