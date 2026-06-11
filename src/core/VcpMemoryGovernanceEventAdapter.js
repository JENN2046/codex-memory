'use strict';

const ADAPTER_NAME = 'VcpMemoryGovernanceEventAdapter';
const ADAPTER_MODE = 'fixture_only';
const SCHEMA_VERSION = 1;

const ALLOWED_EVENT_TYPES = Object.freeze([
  'runtime_memory_event',
  'governance_memory_event',
  'recall_evidence_event',
  'write_receipt_event',
  'memory_correction_event',
  'agent_decision_event',
  'safety_boundary_event'
]);

const REQUIRED_ENVELOPE_FIELDS = Object.freeze([
  'eventId',
  'eventType',
  'sourceSystem',
  'sourceComponent',
  'occurredAt'
]);

const RAW_CLASSIFICATION_FLAGS = Object.freeze([
  'rawContentIncluded',
  'rawDailyNoteIncluded',
  'rawRagIncluded',
  'rawVectorIncluded',
  'rawPromptIncluded'
]);

const ZERO_COUNTER_FIELDS = Object.freeze([
  'rawDailyNoteReads',
  'rawRagPayloads',
  'rawVectorReads',
  'rawPromptReads',
  'broadMemoryScans',
  'recordMemoryCalls',
  'recordMemoryWrites',
  'providerApiCalls',
  'publicMcpExpansions',
  'confirmedMutations'
]);

const FORBIDDEN_RAW_FIELD_NAMES = Object.freeze([
  'rawDailyNote',
  'rawDailyNoteContent',
  'rawDailyNotePath',
  'rawDiaryHistory',
  'rawRag',
  'rawRagPayload',
  'rawRagInjectedContext',
  'rawVector',
  'rawVectorRows',
  'rawVectorCache',
  'rawChunkStore',
  'rawEmbeddings',
  'rawPrompt',
  'rawConversationTranscript',
  'rawModelOutput',
  'chainOfThought',
  'rawWorkspaceId',
  'rawClientId',
  'rawAgentId',
  'bearerToken',
  'tokenMaterial',
  'providerApiKey',
  'apiKey',
  'privateKey',
  'vcpStoreExportPayload',
  'bulkMemoryMigrationPayload'
]);

const FORBIDDEN_AUTHORITY_FIELDS = Object.freeze([
  'prompt',
  'promptText',
  'toolPayload',
  'publicToolArgs',
  'vcpToolPayloadIdentity',
  'rawRuntimeMemoryContent'
]);

const FORBIDDEN_INTENT_FIELDS = Object.freeze([
  'writeIntent',
  'recordMemoryCallIntent',
  'recordMemoryWriteIntent',
  'confirmedMutationIntent',
  'publicMcpExpansionIntent',
  'providerApiIntent',
  'rawScanIntent',
  'broadScanIntent'
]);

const ZERO_COUNTERS = Object.freeze({
  recordMemoryCalls: 0,
  recordMemoryWrites: 0,
  providerApiCalls: 0,
  publicMcpExpansions: 0,
  confirmedMutations: 0,
  rawDailyNoteReads: 0,
  rawRagPayloads: 0,
  rawVectorReads: 0,
  rawPromptReads: 0,
  broadMemoryScans: 0
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
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
    if (FORBIDDEN_RAW_FIELD_NAMES.includes(key) || FORBIDDEN_AUTHORITY_FIELDS.includes(key)) {
      found.push(path);
      continue;
    }
    found.push(...collectForbiddenFields(nested, path));
  }
  return found;
}

function collectTruthyFields(source, fields, prefix = '') {
  if (!isPlainObject(source)) return [];
  return fields
    .filter(field => source[field])
    .map(field => pathJoin(prefix, field));
}

function collectPositiveCounters(counters) {
  if (!isPlainObject(counters)) return [];
  return ZERO_COUNTER_FIELDS.filter(field => Number(counters[field] || 0) > 0);
}

function projectEvent(envelope) {
  if (!isPlainObject(envelope)) {
    return {
      eventIdPresent: false,
      sourceSystem: null,
      sourceComponent: null,
      eventType: null,
      rawContentIncluded: false,
      rawIdentifiersEchoed: false
    };
  }

  return {
    eventIdPresent: Boolean(normalizeString(envelope.eventId)),
    sourceSystem: normalizeString(envelope.sourceSystem) || null,
    sourceComponent: normalizeString(envelope.sourceComponent) || null,
    eventType: normalizeString(envelope.eventType) || null,
    rawContentIncluded: false,
    rawIdentifiersEchoed: false
  };
}

function lowDisclosure(reason, envelope, {
  missingFields = [],
  forbiddenFields = [],
  forbiddenCounters = []
} = {}) {
  return {
    reason,
    code: 'vcp_memory_governance_event_adapter_rejected',
    lowDisclosure: true,
    eventIdPresent: Boolean(isPlainObject(envelope) && normalizeString(envelope.eventId)),
    missingFields,
    forbiddenFields,
    forbiddenCounters
  };
}

function rejected(reason, envelope, details = {}) {
  const forbiddenCounters = details.forbiddenCounters || [];
  const forbiddenFields = details.forbiddenFields || [];
  const missingFields = details.missingFields || [];

  return {
    accepted: false,
    adapterName: ADAPTER_NAME,
    adapterMode: ADAPTER_MODE,
    eventType: isPlainObject(envelope) ? normalizeString(envelope.eventType) || null : null,
    governanceAction: 'reject',
    reasonCode: reason,
    lowDisclosureProjection: projectEvent(envelope),
    lowDisclosureRejection: lowDisclosure(reason, envelope, {
      missingFields,
      forbiddenFields,
      forbiddenCounters
    }),
    missingFields,
    forbiddenFields,
    forbiddenCounters,
    counters: { ...ZERO_COUNTERS },
    requiredApprovals: [],
    forbiddenActions: [
      'raw_memory_sync',
      'record_memory_call',
      'provider_api_call',
      'public_mcp_expansion',
      'confirmed_mutation',
      'production_ready_claim'
    ],
    rawContentIncluded: false,
    rawIdentifiersEchoed: false,
    payloadAuthorityUsed: false,
    recordMemoryCalled: false,
    publicMcpExpanded: false,
    providerApiCalled: false,
    nextAllowedStep: 'fix_envelope_or_stop'
  };
}

function isAccepted(value) {
  return isPlainObject(value) && value.accepted === true;
}

function validateEnvelope(envelope) {
  if (!isPlainObject(envelope)) {
    return { reason: 'event_envelope_not_plain_object' };
  }

  if (envelope.schemaVersion !== SCHEMA_VERSION) {
    return { reason: 'unsupported_schema_version', forbiddenFields: ['schemaVersion'] };
  }

  const missingFields = REQUIRED_ENVELOPE_FIELDS.filter(field => !normalizeString(envelope[field]));
  if (missingFields.length > 0) {
    return { reason: 'missing_required_event_fields', missingFields };
  }

  if (!ALLOWED_EVENT_TYPES.includes(envelope.eventType)) {
    return { reason: 'unsupported_event_type', forbiddenFields: ['eventType'] };
  }

  if (!isPlainObject(envelope.classification) || envelope.classification.lowDisclosure !== true) {
    return { reason: 'low_disclosure_required', missingFields: ['classification.lowDisclosure'] };
  }

  const rawFlags = RAW_CLASSIFICATION_FLAGS
    .filter(field => envelope.classification[field] !== false)
    .map(field => `classification.${field}`);
  if (rawFlags.length > 0) {
    return { reason: 'raw_content_flags_must_be_false', forbiddenFields: rawFlags };
  }

  const forbiddenFields = [
    ...collectForbiddenFields(envelope),
    ...collectTruthyFields(envelope, FORBIDDEN_INTENT_FIELDS)
  ];
  if (forbiddenFields.length > 0) {
    return { reason: 'forbidden_raw_or_authority_fields', forbiddenFields };
  }

  const forbiddenCounters = collectPositiveCounters(envelope.counters);
  if (forbiddenCounters.length > 0) {
    return { reason: 'forbidden_positive_counters', forbiddenCounters };
  }

  if (!isPlainObject(envelope.bridge) || envelope.bridge.requestSource !== 'vcp-bridge') {
    return { reason: 'bridge_request_source_required', missingFields: ['bridge.requestSource'] };
  }

  return null;
}

function buildVcpMemoryGovernanceEventAdapterResult(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', null);
  }

  const topLevelForbidden = [
    ...collectTruthyFields(input, FORBIDDEN_INTENT_FIELDS),
    ...collectForbiddenFields(input).filter(field => !field.startsWith('vcpMemoryGovernanceEventEnvelope.'))
  ];
  if (topLevelForbidden.length > 0) {
    return rejected('forbidden_input_authority_or_intent', input.vcpMemoryGovernanceEventEnvelope, {
      forbiddenFields: topLevelForbidden
    });
  }

  const {
    adapterResult,
    proofPreflightResult,
    approvalGateResult,
    vcpMemoryGovernanceEventEnvelope
  } = input;

  const missingPreflight = [];
  if (!isAccepted(adapterResult)) missingPreflight.push('adapterResult');
  if (!isAccepted(proofPreflightResult)) missingPreflight.push('proofPreflightResult');
  if (!isAccepted(approvalGateResult)) missingPreflight.push('approvalGateResult');
  if (missingPreflight.length > 0) {
    return rejected('required_preflight_not_accepted', vcpMemoryGovernanceEventEnvelope, {
      missingFields: missingPreflight
    });
  }

  if (approvalGateResult.allowedAction === 'live_bridge_record_memory_proof') {
    return rejected('live_write_approval_not_allowed_by_fixture_adapter', vcpMemoryGovernanceEventEnvelope, {
      forbiddenFields: ['approvalGateResult.allowedAction']
    });
  }

  const envelopeError = validateEnvelope(vcpMemoryGovernanceEventEnvelope);
  if (envelopeError) {
    return rejected(envelopeError.reason, vcpMemoryGovernanceEventEnvelope, envelopeError);
  }

  return {
    accepted: true,
    adapterName: ADAPTER_NAME,
    adapterMode: ADAPTER_MODE,
    eventType: vcpMemoryGovernanceEventEnvelope.eventType,
    governanceAction: 'accept_low_disclosure_event',
    reasonCode: normalizeString(vcpMemoryGovernanceEventEnvelope.decision?.reasonCode) || 'bounded_governance_event',
    lowDisclosureProjection: projectEvent(vcpMemoryGovernanceEventEnvelope),
    lowDisclosureRejection: null,
    missingFields: [],
    forbiddenFields: [],
    forbiddenCounters: [],
    counters: { ...ZERO_COUNTERS },
    requiredApprovals: [],
    forbiddenActions: [
      'raw_memory_sync',
      'record_memory_call',
      'provider_api_call',
      'public_mcp_expansion',
      'confirmed_mutation',
      'production_ready_claim'
    ],
    rawContentIncluded: false,
    rawIdentifiersEchoed: false,
    payloadAuthorityUsed: false,
    recordMemoryCalled: false,
    publicMcpExpanded: false,
    providerApiCalled: false,
    nextAllowedStep: 'fixture_receipt_only'
  };
}

module.exports = {
  ADAPTER_MODE,
  ADAPTER_NAME,
  ALLOWED_EVENT_TYPES,
  FORBIDDEN_RAW_FIELD_NAMES,
  RAW_CLASSIFICATION_FLAGS,
  ZERO_COUNTERS,
  ZERO_COUNTER_FIELDS,
  buildVcpMemoryGovernanceEventAdapterResult
};
