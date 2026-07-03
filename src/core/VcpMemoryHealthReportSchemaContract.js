'use strict';

const CONTRACT_NAME = 'VcpMemoryHealthReportSchemaContract';
const CONTRACT_MODE = 'fixture_health_report_schema_contract_only';
const SCHEMA_VERSION = 1;
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/;

const FORBIDDEN_STRING_VALUE_PATTERNS = Object.freeze([
  ['url', /https?:\/\//i],
  ['windows_path', /[A-Za-z]:[\\/]/],
  ['unix_private_path', /(^|[\s"'=])(~\/|\/home\/|\/Users\/|\/mnt\/|\/tmp\/|\/var\/)/],
  ['openai_key', /sk-(proj-)?[A-Za-z0-9_-]{12,}/],
  ['private_key_block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['raw_private_marker', /RAW_(PRIVATE|MEMORY|RUNTIME|STORE|AUDIT|SQLITE|JSONL|VECTOR|CACHE|DAILY|RAG|PROMPT)/i],
  ['synthetic_sensitive_marker', /(TOKEN|SECRET|PRIVATE_MEMORY|APPROVAL_VALUE)_SHOULD_NOT_ECHO/i]
]);

const FORBIDDEN_STRING_VALUE_PATTERN_NAMES = Object.freeze(
  FORBIDDEN_STRING_VALUE_PATTERNS.map(([name]) => name)
);

const ALLOWED_EVIDENCE_TYPES = Object.freeze([
  'fixture_schema',
  'docs_fixture'
]);

const ALLOWED_DECISIONS = Object.freeze([
  'schema_pass',
  'deny',
  'stop_l4'
]);

const ALLOWED_READINESS_LABELS = Object.freeze([
  'NOT_READY_BLOCKED',
  'RC_NOT_READY_BLOCKED'
]);

const ALLOWED_PROJECT_STATUS_LABELS = Object.freeze([
  'NOT_READY_BLOCKED'
]);

const ALLOWED_RC_STATUS_LABELS = Object.freeze([
  'RC_NOT_READY_BLOCKED'
]);

const REQUIRED_SECTION_IDS = Object.freeze([
  'policy_status',
  'target_status',
  'fallback_status',
  'query_quality_status',
  'receipt_status'
]);

const SECTION_SOURCE_TYPES = Object.freeze({
  policy_status: 'committed_governance_docs',
  target_status: 'sanitized_target_packet',
  fallback_status: 'm13_fixture_dry_run_report',
  query_quality_status: 'fixture_temp_local_dry_run_summary',
  receipt_status: 'low_disclosure_receipt_schema'
});

const ALLOWED_EVIDENCE_CLASSES = Object.freeze([
  'docs_only',
  'fixture_only',
  'fixture_dry_run'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'reportContext',
  'sections',
  'readiness',
  'expectedDecision',
  'counters'
]);

const REQUIRED_CONTEXT_FIELDS = Object.freeze([
  'request_id',
  'evidence_type',
  'source_plan_present',
  'm13_hardening_report_present',
  'dashboard_runtime_requested',
  'dashboard_cli_requested',
  'vcp_toolbox_runtime_requested',
  'mcp_memory_tool_requested',
  'private_runtime_read_requested',
  'raw_store_read_requested',
  'real_query_requested',
  'provider_api_requested',
  'approval_request_requested',
  'approval_line_generation_requested'
]);

const REQUIRED_CONTEXT_BOOLEAN_FIELDS = Object.freeze([
  'source_plan_present',
  'm13_hardening_report_present',
  'dashboard_runtime_requested',
  'dashboard_cli_requested',
  'vcp_toolbox_runtime_requested',
  'mcp_memory_tool_requested',
  'private_runtime_read_requested',
  'raw_store_read_requested',
  'real_query_requested',
  'provider_api_requested',
  'approval_request_requested',
  'approval_line_generation_requested'
]);

const REQUIRED_SECTION_FIELDS = Object.freeze([
  'section_id',
  'source_type',
  'evidence_class',
  'low_disclosure',
  'fixture_or_dry_run_only',
  'live_runtime_evidence_present',
  'raw_private_material_present',
  'secret_material_present',
  'provider_payload_present',
  'raw_audit_or_store_rows_present',
  'missing_live_evidence_blocker_visible'
]);

const REQUIRED_SECTION_BOOLEAN_FIELDS = Object.freeze([
  'low_disclosure',
  'fixture_or_dry_run_only',
  'live_runtime_evidence_present',
  'raw_private_material_present',
  'secret_material_present',
  'provider_payload_present',
  'raw_audit_or_store_rows_present',
  'missing_live_evidence_blocker_visible'
]);

const REQUIRED_READINESS_FIELDS = Object.freeze([
  'project_status',
  'rc_status',
  'production_ready',
  'release_ready',
  'cutover_ready',
  'complete_v8_claimed',
  'full_bridge_completion_claimed',
  'missing_live_evidence_visible',
  'exact_approval_required_for_live_evidence'
]);

const REQUIRED_READINESS_BOOLEAN_FIELDS = Object.freeze([
  'production_ready',
  'release_ready',
  'cutover_ready',
  'complete_v8_claimed',
  'full_bridge_completion_claimed',
  'missing_live_evidence_visible',
  'exact_approval_required_for_live_evidence'
]);

const ZERO_COUNTER_FIELDS = Object.freeze([
  'dashboardRuntimeCalls',
  'dashboardCliCalls',
  'vcpToolboxRuntimeCalls',
  'mcpToolCalls',
  'privateRuntimeReads',
  'rawStoreReads',
  'realQueries',
  'providerApiCalls',
  'memoryReads',
  'memoryWrites',
  'durableAuditWrites',
  'durableMemoryWrites',
  'publicMcpExpansions',
  'approvalRequestSubmissions',
  'approvalLineOperations',
  'readinessClaims'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'rawPrivateMemory',
  'raw_private_memory',
  'rawMemory',
  'raw_memory',
  'rawRuntimeResponse',
  'raw_runtime_response',
  'rawStoreRows',
  'raw_store_rows',
  'rawAuditRow',
  'rawSqliteRow',
  'rawJsonlRow',
  'rawCacheRow',
  'rawVectorRow',
  'rawDailyNote',
  'rawDailyNoteContent',
  'rawRag',
  'rawRagInjectedContext',
  'rawPrompt',
  'dashboardRuntimePayload',
  'providerPayload',
  'secret',
  'secrets',
  'credential',
  'credentials',
  'token',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'privateKey',
  'endpoint',
  'rawPath',
  'configEnvPath',
  'approvalLine',
  'approvalLineValue',
  'approval_line_value',
  'productionReady',
  'releaseReady',
  'cutoverReady',
  'rcReady',
  'RC_READY',
  'completeV8',
  'fullBridgeCompletion'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(value, field) {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function pathJoin(prefix, key) {
  return prefix ? `${prefix}.${key}` : key;
}

function missingFields(required, value, prefix = '') {
  const actual = isPlainObject(value) ? value : {};
  return required
    .filter(field => !hasOwn(actual, field))
    .map(field => (prefix ? `${prefix}.${field}` : field));
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

function stringValueHasForbiddenShape(value) {
  return typeof value === 'string' && FORBIDDEN_STRING_VALUE_PATTERNS.some(([, pattern]) => pattern.test(value));
}

function collectForbiddenStringValueFields(value, prefix = '') {
  if (typeof value === 'string') {
    return stringValueHasForbiddenShape(value) ? [prefix || '<root>'] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectForbiddenStringValueFields(item, `${prefix}[${index}]`));
  }
  if (!isPlainObject(value)) return [];

  return Object.entries(value).flatMap(([key, nested]) => collectForbiddenStringValueFields(
    nested,
    pathJoin(prefix, key)
  ));
}

function collectUnexpectedKeys(value, allowedFields, prefix = '') {
  if (!isPlainObject(value)) return [];
  return Object.keys(value)
    .filter(key => !allowedFields.includes(key))
    .map(key => pathJoin(prefix, key));
}

function collectUnexpectedFields(input) {
  if (!isPlainObject(input)) return [];

  const sectionUnexpected = [];
  if (isPlainObject(input.sections)) {
    for (const [sectionId, section] of Object.entries(input.sections)) {
      if (!REQUIRED_SECTION_IDS.includes(sectionId)) {
        sectionUnexpected.push(`sections.${sectionId}`);
        continue;
      }
      sectionUnexpected.push(...collectUnexpectedKeys(
        section,
        REQUIRED_SECTION_FIELDS,
        `sections.${sectionId}`
      ));
    }
  }

  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(input.reportContext, REQUIRED_CONTEXT_FIELDS, 'reportContext'),
    ...collectUnexpectedKeys(input.sections, REQUIRED_SECTION_IDS, 'sections'),
    ...sectionUnexpected,
    ...collectUnexpectedKeys(input.readiness, REQUIRED_READINESS_FIELDS, 'readiness'),
    ...collectUnexpectedKeys(input.counters, ZERO_COUNTER_FIELDS, 'counters')
  ];
}

function collectPositiveCounters(counters) {
  if (!isPlainObject(counters)) return ZERO_COUNTER_FIELDS;
  return ZERO_COUNTER_FIELDS.filter(field => Number(counters[field] || 0) > 0);
}

function isSafeRequestId(value) {
  return typeof value === 'string' && SAFE_REQUEST_ID_PATTERN.test(value);
}

function lowDisclosureProjection(input) {
  const context = isPlainObject(input) ? input.reportContext : null;
  const readiness = isPlainObject(input) ? input.readiness : null;

  return {
    requestId: isPlainObject(context) && isSafeRequestId(context.request_id)
      ? context.request_id
      : null,
    evidenceType: isPlainObject(context) && typeof context.evidence_type === 'string'
      ? context.evidence_type
      : null,
    expectedDecision: isPlainObject(input) && typeof input.expectedDecision === 'string'
      ? input.expectedDecision
      : null,
    projectStatus: isPlainObject(readiness) && typeof readiness.project_status === 'string'
      ? readiness.project_status
      : null,
    rcStatus: isPlainObject(readiness) && typeof readiness.rc_status === 'string'
      ? readiness.rc_status
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
    forbiddenStringValueFields: details.forbiddenStringValueFields || [],
    unexpectedFields: details.unexpectedFields || [],
    forbiddenCounters: details.forbiddenCounters || [],
    invalidFields: details.invalidFields || [],
    computedDecision: details.computedDecision || null,
    expectedDecision: isPlainObject(input) ? input.expectedDecision || null : null,
    nextAction: 'fix_fixture_or_stop',
    fixtureHealthReportSchemaOnly: true,
    dashboardRuntimeImplemented: false,
    dashboardCliCalled: false,
    vcpToolboxRuntimeCalled: false,
    mcpMemoryToolCalled: false,
    privateRuntimeRead: false,
    rawStoreRead: false,
    realQueryExecuted: false,
    providerApiCalled: false,
    memoryRead: false,
    memoryWritten: false,
    durableAuditWritten: false,
    durableMemoryWritten: false,
    publicMcpExpanded: false,
    approvalRequestSubmitted: false,
    approvalLineGenerated: false,
    readinessClaimAllowed: false
  };
}

function sectionMissingFields(sections) {
  if (!isPlainObject(sections)) return REQUIRED_SECTION_IDS.map(id => `sections.${id}`);

  const missing = [];
  for (const sectionId of REQUIRED_SECTION_IDS) {
    if (!hasOwn(sections, sectionId)) {
      missing.push(`sections.${sectionId}`);
      continue;
    }
    missing.push(...missingFields(REQUIRED_SECTION_FIELDS, sections[sectionId], `sections.${sectionId}`));
  }
  return missing;
}

function validateShape(input) {
  const context = input.reportContext;
  const sections = input.sections;
  const readiness = input.readiness;
  const invalid = [];

  if (input.schemaVersion !== SCHEMA_VERSION) invalid.push('schemaVersion');
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) invalid.push('expectedDecision');
  if (typeof context.request_id !== 'string' || context.request_id.trim().length === 0) {
    invalid.push('reportContext.request_id');
  } else if (!isSafeRequestId(context.request_id)) {
    invalid.push('reportContext.request_id');
  }
  if (!ALLOWED_EVIDENCE_TYPES.includes(context.evidence_type)) {
    invalid.push('reportContext.evidence_type');
  }
  for (const field of REQUIRED_CONTEXT_BOOLEAN_FIELDS) {
    if (typeof context[field] !== 'boolean') invalid.push(`reportContext.${field}`);
  }
  for (const sectionId of REQUIRED_SECTION_IDS) {
    const section = sections[sectionId];
    if (!isPlainObject(section)) {
      invalid.push(`sections.${sectionId}`);
      continue;
    }
    if (section.section_id !== sectionId) invalid.push(`sections.${sectionId}.section_id`);
    if (section.source_type !== SECTION_SOURCE_TYPES[sectionId]) {
      invalid.push(`sections.${sectionId}.source_type`);
    }
    if (!ALLOWED_EVIDENCE_CLASSES.includes(section.evidence_class)) {
      invalid.push(`sections.${sectionId}.evidence_class`);
    }
    for (const field of REQUIRED_SECTION_BOOLEAN_FIELDS) {
      if (typeof section[field] !== 'boolean') invalid.push(`sections.${sectionId}.${field}`);
    }
  }
  if (!ALLOWED_PROJECT_STATUS_LABELS.includes(readiness.project_status)) {
    invalid.push('readiness.project_status');
  }
  if (!ALLOWED_RC_STATUS_LABELS.includes(readiness.rc_status)) {
    invalid.push('readiness.rc_status');
  }
  for (const field of REQUIRED_READINESS_BOOLEAN_FIELDS) {
    if (typeof readiness[field] !== 'boolean') invalid.push(`readiness.${field}`);
  }
  for (const field of ZERO_COUNTER_FIELDS) {
    if (input.counters[field] !== 0) invalid.push(`counters.${field}`);
  }
  return invalid;
}

function runtimeRequested(context) {
  return Boolean(
    context.dashboard_runtime_requested ||
    context.dashboard_cli_requested ||
    context.vcp_toolbox_runtime_requested ||
    context.mcp_memory_tool_requested ||
    context.private_runtime_read_requested ||
    context.raw_store_read_requested ||
    context.real_query_requested ||
    context.provider_api_requested ||
    context.approval_request_requested ||
    context.approval_line_generation_requested
  );
}

function sectionHasL4Material(section) {
  return Boolean(
    section.live_runtime_evidence_present ||
    section.raw_private_material_present ||
    section.secret_material_present ||
    section.provider_payload_present ||
    section.raw_audit_or_store_rows_present
  );
}

function readinessOverclaims(readiness) {
  return Boolean(
    readiness.production_ready ||
    readiness.release_ready ||
    readiness.cutover_ready ||
    readiness.complete_v8_claimed ||
    readiness.full_bridge_completion_claimed ||
    readiness.project_status !== 'NOT_READY_BLOCKED' ||
    readiness.rc_status !== 'RC_NOT_READY_BLOCKED'
  );
}

function computeHealthReportDecision(context, sections, readiness) {
  if (runtimeRequested(context)) return 'stop_l4';

  for (const sectionId of REQUIRED_SECTION_IDS) {
    if (sectionHasL4Material(sections[sectionId])) return 'stop_l4';
  }

  if (readinessOverclaims(readiness)) return 'stop_l4';

  if (
    context.source_plan_present !== true ||
    context.m13_hardening_report_present !== true ||
    readiness.missing_live_evidence_visible !== true ||
    readiness.exact_approval_required_for_live_evidence !== true
  ) {
    return 'deny';
  }

  for (const sectionId of REQUIRED_SECTION_IDS) {
    const section = sections[sectionId];
    if (
      section.low_disclosure !== true ||
      section.fixture_or_dry_run_only !== true ||
      section.missing_live_evidence_blocker_visible !== true
    ) {
      return 'deny';
    }
  }

  return 'schema_pass';
}

function validateVcpMemoryHealthReportSchemaContract(input) {
  if (!isPlainObject(input)) {
    return rejected('invalid_input_not_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_CONTEXT_FIELDS, input.reportContext, 'reportContext'),
    ...sectionMissingFields(input.sections),
    ...missingFields(REQUIRED_READINESS_FIELDS, input.readiness, 'readiness'),
    ...(hasOwn(input, 'counters') ? missingFields(ZERO_COUNTER_FIELDS, input.counters, 'counters') : [])
  ];
  if (missing.length > 0) {
    return rejected('missing_required_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_private_runtime_secret_approval_or_overclaim_fields', input, {
      forbiddenFields
    });
  }

  const forbiddenStringValueFields = collectForbiddenStringValueFields(input);
  if (forbiddenStringValueFields.length > 0) {
    return rejected('forbidden_sensitive_value_shapes', input, { forbiddenStringValueFields });
  }

  const unexpectedFields = collectUnexpectedFields(input);
  if (unexpectedFields.length > 0) {
    return rejected('unexpected_fields', input, { unexpectedFields });
  }

  const forbiddenCounters = collectPositiveCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('forbidden_positive_side_effect_counters', input, { forbiddenCounters });
  }

  const invalidFields = validateShape(input);
  if (invalidFields.length > 0) {
    return rejected('invalid_health_report_schema_contract', input, { invalidFields });
  }

  const computedDecision = computeHealthReportDecision(
    input.reportContext,
    input.sections,
    input.readiness
  );
  if (input.expectedDecision !== computedDecision) {
    return rejected('decision_mismatch', input, {
      computedDecision,
      invalidFields: ['expectedDecision']
    });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    computedDecision,
    expectedDecision: input.expectedDecision,
    readinessStatus: input.readiness.project_status,
    rcStatus: input.readiness.rc_status,
    sectionCount: REQUIRED_SECTION_IDS.length,
    lowDisclosure: true,
    fixtureHealthReportSchemaOnly: true,
    dashboardRuntimeImplemented: false,
    dashboardCliCalled: false,
    vcpToolboxRuntimeCalled: false,
    mcpMemoryToolCalled: false,
    privateRuntimeRead: false,
    rawStoreRead: false,
    realQueryExecuted: false,
    providerApiCalled: false,
    memoryRead: false,
    memoryWritten: false,
    durableAuditWritten: false,
    durableMemoryWritten: false,
    publicMcpExpanded: false,
    approvalRequestSubmitted: false,
    approvalLineGenerated: false,
    readinessClaimAllowed: false,
    nextAction: 'm14_health_report_raw_private_leak_rejection_tests'
  };
}

module.exports = {
  ALLOWED_DECISIONS,
  ALLOWED_EVIDENCE_CLASSES,
  ALLOWED_EVIDENCE_TYPES,
  ALLOWED_PROJECT_STATUS_LABELS,
  ALLOWED_RC_STATUS_LABELS,
  ALLOWED_READINESS_LABELS,
  CONTRACT_MODE,
  FORBIDDEN_FIELD_NAMES,
  FORBIDDEN_STRING_VALUE_PATTERN_NAMES,
  REQUIRED_CONTEXT_BOOLEAN_FIELDS,
  REQUIRED_SECTION_BOOLEAN_FIELDS,
  REQUIRED_SECTION_IDS,
  REQUIRED_READINESS_BOOLEAN_FIELDS,
  SAFE_REQUEST_ID_PATTERN,
  SECTION_SOURCE_TYPES,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryHealthReportSchemaContract
};
