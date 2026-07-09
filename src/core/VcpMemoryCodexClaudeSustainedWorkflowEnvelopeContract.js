'use strict';

const CONTRACT_NAME = 'VcpMemoryCodexClaudeSustainedWorkflowEnvelopeContract';
const CONTRACT_MODE = 'fixture_workflow_envelope_contract_only';
const SCHEMA_VERSION = 1;

const ENVELOPE_CONTRACT_VERSION = 'vcp_memory_codex_claude_sustained_workflow_envelope_v1';
const RECEIPT_PLAN_CONTRACT_VERSION = 'vcp_memory_codex_claude_workflow_receipt_plan_v1';

const ALLOWED_CLIENT_FAMILIES = Object.freeze([
  'codex',
  'claude',
  'shared'
]);

const ALLOWED_VISIBILITIES = Object.freeze([
  'private',
  'shared',
  'public'
]);

const ALLOWED_DECISIONS = Object.freeze([
  'fixture_accept',
  'deny',
  'stop_l4'
]);

const ALLOWED_EVIDENCE_TYPES = Object.freeze([
  'fixture-only',
  'schema-only'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'workflowEnvelope',
  'receiptPlan',
  'counters'
]);

const REQUIRED_ENVELOPE_FIELDS = Object.freeze([
  'envelope_id',
  'contract_version',
  'evidence_type',
  'workflow_mode',
  'decision',
  'client',
  'scope',
  'steps',
  'checkpoint',
  'handoff',
  'report',
  'aborts',
  'next_action_allowed'
]);

const REQUIRED_CLIENT_FIELDS = Object.freeze([
  'requesting_client_family',
  'client_id_present',
  'other_client_private_access_requested',
  'cross_client_private_leakage_allowed'
]);

const REQUIRED_SCOPE_FIELDS = Object.freeze([
  'workspace_scope_present',
  'project_scope_present',
  'owner_scope_present',
  'task_scope_present',
  'visibility',
  'shared_boundary_present',
  'visibility_expansion_requested'
]);

const REQUIRED_STEPS_FIELDS = Object.freeze([
  'requested_count',
  'max_steps',
  'operations',
  'live_execution_approved'
]);

const REQUIRED_CHECKPOINT_FIELDS = Object.freeze([
  'receipt_fields',
  'memory_write_allowed',
  'durable_write_allowed'
]);

const REQUIRED_HANDOFF_FIELDS = REQUIRED_CHECKPOINT_FIELDS;

const REQUIRED_REPORT_FIELDS = Object.freeze([
  'disclosure_level',
  'raw_private_output_allowed',
  'readiness_claim_allowed'
]);

const REQUIRED_ABORT_FIELDS = Object.freeze([
  'stale_context_abort',
  'unknown_client_abort',
  'missing_scope_abort',
  'cross_client_leakage_abort',
  'raw_private_output_abort',
  'write_expansion_abort',
  'public_mcp_expansion_abort'
]);

const REQUIRED_RECEIPT_PLAN_FIELDS = Object.freeze([
  'receipt_plan_id',
  'contract_version',
  'workflow_envelope_id',
  'low_disclosure',
  'client_id_value_disclosed',
  'raw_private_payload_disclosed',
  'checkpoint_memory_write_planned',
  'handoff_memory_write_planned',
  'durable_audit_write_planned',
  'runtime_calls_planned',
  'mcp_tool_calls_planned',
  'provider_api_calls_planned',
  'approval_line_value_disclosed',
  'public_mcp_expansion',
  'readiness_claimed',
  'next_action_allowed'
]);

const ZERO_COUNTER_FIELDS = Object.freeze([
  'workflowHarnessStarts',
  'workflowStepsExecuted',
  'liveVcpToolBoxCalls',
  'mcpToolCalls',
  'memoryReads',
  'checkpointMemoryWrites',
  'handoffMemoryWrites',
  'memoryWrites',
  'memoryUpdates',
  'memorySupersedes',
  'memoryTombstones',
  'durableAuditWrites',
  'durableMemoryWrites',
  'fallbackExecutions',
  'providerApiCalls',
  'publicMcpExpansions',
  'approvalLineOperations',
  'approvalRequestSubmissions',
  'readinessClaims'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'rawPayload',
  'raw_payload',
  'rawOutput',
  'raw_output',
  'rawPrivatePayload',
  'raw_private_payload',
  'debugPayload',
  'debug_payload',
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
  'providerPayload',
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
  if (!isPlainObject(counters)) return ZERO_COUNTER_FIELDS;
  return ZERO_COUNTER_FIELDS.filter(field => Number(counters[field] || 0) > 0);
}

function lowDisclosureProjection(input) {
  const envelope = isPlainObject(input) ? input.workflowEnvelope : null;
  const receiptPlan = isPlainObject(input) ? input.receiptPlan : null;
  const client = isPlainObject(envelope?.client) ? envelope.client : null;
  const scope = isPlainObject(envelope?.scope) ? envelope.scope : null;

  return {
    envelopeId: isPlainObject(envelope) && typeof envelope.envelope_id === 'string' ? envelope.envelope_id : null,
    receiptPlanId: isPlainObject(receiptPlan) && typeof receiptPlan.receipt_plan_id === 'string'
      ? receiptPlan.receipt_plan_id
      : null,
    decision: isPlainObject(envelope) && typeof envelope.decision === 'string' ? envelope.decision : null,
    clientFamily: isPlainObject(client) && typeof client.requesting_client_family === 'string'
      ? client.requesting_client_family
      : null,
    visibility: isPlainObject(scope) && typeof scope.visibility === 'string' ? scope.visibility : null,
    evidenceType: isPlainObject(envelope) && typeof envelope.evidence_type === 'string' ? envelope.evidence_type : null
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
    nextAction: 'fix_fixture_or_stop',
    fixtureWorkflowEnvelopeOnly: true,
    runtimeWiringExecuted: false,
    workflowHarnessStarted: false,
    workflowStepsExecuted: 0,
    liveVcpToolBoxCalled: false,
    mcpToolCalled: false,
    fallbackExecuted: false,
    memoryRead: false,
    memoryWritten: false,
    checkpointMemoryWritten: false,
    handoffMemoryWritten: false,
    durableAuditWritten: false,
    durableMemoryWritten: false,
    providerApiCalled: false,
    approvalRequestSubmitted: false,
    approvalLineGenerated: false,
    publicMcpExpanded: false,
    readinessClaimAllowed: false
  };
}

function validateEnvelopeShape(envelope) {
  const invalidFields = [];
  if (!isPlainObject(envelope)) return ['workflowEnvelope'];

  if (envelope.contract_version !== ENVELOPE_CONTRACT_VERSION) invalidFields.push('workflowEnvelope.contract_version');
  if (!ALLOWED_EVIDENCE_TYPES.includes(envelope.evidence_type)) invalidFields.push('workflowEnvelope.evidence_type');
  if (envelope.workflow_mode !== 'fixture-only') invalidFields.push('workflowEnvelope.workflow_mode');
  if (!ALLOWED_DECISIONS.includes(envelope.decision)) invalidFields.push('workflowEnvelope.decision');
  if (!['m12_fixture_workflow_envelope_contract', 'm12_fixture_boundary'].includes(envelope.next_action_allowed)) {
    invalidFields.push('workflowEnvelope.next_action_allowed');
  }

  const client = isPlainObject(envelope.client) ? envelope.client : {};
  if (!ALLOWED_CLIENT_FAMILIES.includes(client.requesting_client_family)) {
    invalidFields.push('workflowEnvelope.client.requesting_client_family');
  }
  if (typeof client.client_id_present !== 'boolean') invalidFields.push('workflowEnvelope.client.client_id_present');
  if (typeof client.other_client_private_access_requested !== 'boolean') {
    invalidFields.push('workflowEnvelope.client.other_client_private_access_requested');
  }
  if (client.cross_client_private_leakage_allowed !== false) {
    invalidFields.push('workflowEnvelope.client.cross_client_private_leakage_allowed');
  }

  const scope = isPlainObject(envelope.scope) ? envelope.scope : {};
  for (const field of [
    'workspace_scope_present',
    'project_scope_present',
    'owner_scope_present',
    'task_scope_present',
    'shared_boundary_present',
    'visibility_expansion_requested'
  ]) {
    if (typeof scope[field] !== 'boolean') invalidFields.push(`workflowEnvelope.scope.${field}`);
  }
  if (!ALLOWED_VISIBILITIES.includes(scope.visibility)) invalidFields.push('workflowEnvelope.scope.visibility');

  const steps = isPlainObject(envelope.steps) ? envelope.steps : {};
  if (!Number.isInteger(steps.requested_count) || steps.requested_count < 0) {
    invalidFields.push('workflowEnvelope.steps.requested_count');
  }
  if (!Number.isInteger(steps.max_steps) || steps.max_steps < 0 || steps.max_steps > 5) {
    invalidFields.push('workflowEnvelope.steps.max_steps');
  }
  if (!Array.isArray(steps.operations)) invalidFields.push('workflowEnvelope.steps.operations');
  if (steps.live_execution_approved !== false) invalidFields.push('workflowEnvelope.steps.live_execution_approved');

  for (const sectionName of ['checkpoint', 'handoff']) {
    const section = isPlainObject(envelope[sectionName]) ? envelope[sectionName] : {};
    if (!Array.isArray(section.receipt_fields) || section.receipt_fields.length === 0) {
      invalidFields.push(`workflowEnvelope.${sectionName}.receipt_fields`);
    }
    if (section.memory_write_allowed !== false) invalidFields.push(`workflowEnvelope.${sectionName}.memory_write_allowed`);
    if (section.durable_write_allowed !== false) invalidFields.push(`workflowEnvelope.${sectionName}.durable_write_allowed`);
  }

  const report = isPlainObject(envelope.report) ? envelope.report : {};
  if (!['summary', 'structured', 'none'].includes(report.disclosure_level)) {
    invalidFields.push('workflowEnvelope.report.disclosure_level');
  }
  if (report.raw_private_output_allowed !== false) invalidFields.push('workflowEnvelope.report.raw_private_output_allowed');
  if (report.readiness_claim_allowed !== false) invalidFields.push('workflowEnvelope.report.readiness_claim_allowed');

  const aborts = isPlainObject(envelope.aborts) ? envelope.aborts : {};
  for (const field of REQUIRED_ABORT_FIELDS) {
    if (aborts[field] !== true) invalidFields.push(`workflowEnvelope.aborts.${field}`);
  }

  return invalidFields;
}

function validateReceiptPlanShape(receiptPlan) {
  const invalidFields = [];
  if (!isPlainObject(receiptPlan)) return ['receiptPlan'];

  if (receiptPlan.contract_version !== RECEIPT_PLAN_CONTRACT_VERSION) invalidFields.push('receiptPlan.contract_version');
  if (receiptPlan.low_disclosure !== true) invalidFields.push('receiptPlan.low_disclosure');
  if (receiptPlan.client_id_value_disclosed !== false) invalidFields.push('receiptPlan.client_id_value_disclosed');
  if (receiptPlan.raw_private_payload_disclosed !== false) invalidFields.push('receiptPlan.raw_private_payload_disclosed');
  if (receiptPlan.checkpoint_memory_write_planned !== false) {
    invalidFields.push('receiptPlan.checkpoint_memory_write_planned');
  }
  if (receiptPlan.handoff_memory_write_planned !== false) invalidFields.push('receiptPlan.handoff_memory_write_planned');
  if (receiptPlan.durable_audit_write_planned !== false) invalidFields.push('receiptPlan.durable_audit_write_planned');
  if (receiptPlan.runtime_calls_planned !== 0) invalidFields.push('receiptPlan.runtime_calls_planned');
  if (receiptPlan.mcp_tool_calls_planned !== 0) invalidFields.push('receiptPlan.mcp_tool_calls_planned');
  if (receiptPlan.provider_api_calls_planned !== 0) invalidFields.push('receiptPlan.provider_api_calls_planned');
  if (receiptPlan.approval_line_value_disclosed !== false) invalidFields.push('receiptPlan.approval_line_value_disclosed');
  if (receiptPlan.public_mcp_expansion !== false) invalidFields.push('receiptPlan.public_mcp_expansion');
  if (receiptPlan.readiness_claimed !== false) invalidFields.push('receiptPlan.readiness_claimed');
  if (!['m12_fixture_workflow_envelope_contract', 'm12_fixture_boundary'].includes(receiptPlan.next_action_allowed)) {
    invalidFields.push('receiptPlan.next_action_allowed');
  }

  return invalidFields;
}

function validateCrossFieldConsistency(envelope, receiptPlan) {
  const invalidFields = [];
  const decision = envelope.decision;
  const client = envelope.client;
  const scope = envelope.scope;
  const steps = envelope.steps;

  if (receiptPlan.workflow_envelope_id !== envelope.envelope_id) invalidFields.push('receiptPlan.workflow_envelope_id');
  if (receiptPlan.next_action_allowed !== envelope.next_action_allowed) invalidFields.push('receiptPlan.next_action_allowed');

  if (decision === 'fixture_accept') {
    if (client.client_id_present !== true) invalidFields.push('workflowEnvelope.client.client_id_present');
    if (client.other_client_private_access_requested !== false) {
      invalidFields.push('workflowEnvelope.client.other_client_private_access_requested');
    }
    for (const field of ['workspace_scope_present', 'project_scope_present', 'owner_scope_present', 'task_scope_present']) {
      if (scope[field] !== true) invalidFields.push(`workflowEnvelope.scope.${field}`);
    }
    if (scope.visibility === 'shared' && scope.shared_boundary_present !== true) {
      invalidFields.push('workflowEnvelope.scope.shared_boundary_present');
    }
    if (scope.visibility_expansion_requested !== false) {
      invalidFields.push('workflowEnvelope.scope.visibility_expansion_requested');
    }
    if (steps.requested_count < 1 || steps.operations.length < 1) {
      invalidFields.push('workflowEnvelope.steps.operations');
    }
  }

  if (decision === 'deny') {
    if (client.client_id_present === true && scope.workspace_scope_present === true) {
      invalidFields.push('workflowEnvelope.decision');
    }
  }

  if (decision === 'stop_l4') {
    if (client.other_client_private_access_requested !== true && envelope.report.raw_private_output_allowed !== true) {
      invalidFields.push('workflowEnvelope.decision');
    }
    if (envelope.aborts.cross_client_leakage_abort !== true) {
      invalidFields.push('workflowEnvelope.aborts.cross_client_leakage_abort');
    }
  }

  return invalidFields;
}

function validateVcpMemoryCodexClaudeSustainedWorkflowEnvelopeContract(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_ENVELOPE_FIELDS, input.workflowEnvelope, 'workflowEnvelope'),
    ...missingFields(REQUIRED_CLIENT_FIELDS, input.workflowEnvelope?.client, 'workflowEnvelope.client'),
    ...missingFields(REQUIRED_SCOPE_FIELDS, input.workflowEnvelope?.scope, 'workflowEnvelope.scope'),
    ...missingFields(REQUIRED_STEPS_FIELDS, input.workflowEnvelope?.steps, 'workflowEnvelope.steps'),
    ...missingFields(REQUIRED_CHECKPOINT_FIELDS, input.workflowEnvelope?.checkpoint, 'workflowEnvelope.checkpoint'),
    ...missingFields(REQUIRED_HANDOFF_FIELDS, input.workflowEnvelope?.handoff, 'workflowEnvelope.handoff'),
    ...missingFields(REQUIRED_REPORT_FIELDS, input.workflowEnvelope?.report, 'workflowEnvelope.report'),
    ...missingFields(REQUIRED_ABORT_FIELDS, input.workflowEnvelope?.aborts, 'workflowEnvelope.aborts'),
    ...missingFields(REQUIRED_RECEIPT_PLAN_FIELDS, input.receiptPlan, 'receiptPlan')
  ];
  if (missing.length > 0) {
    return rejected('missing_required_fields', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_secret_runtime_or_overclaim_fields', input, { forbiddenFields });
  }

  const forbiddenCounters = collectPositiveCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('forbidden_positive_side_effect_counters', input, { forbiddenCounters });
  }

  const invalidFields = [];
  if (input.schemaVersion !== SCHEMA_VERSION) invalidFields.push('schemaVersion');
  invalidFields.push(...validateEnvelopeShape(input.workflowEnvelope));
  invalidFields.push(...validateReceiptPlanShape(input.receiptPlan));
  invalidFields.push(...validateCrossFieldConsistency(input.workflowEnvelope, input.receiptPlan));

  if (invalidFields.length > 0) {
    return rejected('invalid_codex_claude_sustained_workflow_envelope_contract', input, { invalidFields });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    envelopeId: input.workflowEnvelope.envelope_id,
    receiptPlanId: input.receiptPlan.receipt_plan_id,
    decision: input.workflowEnvelope.decision,
    clientFamily: input.workflowEnvelope.client.requesting_client_family,
    visibility: input.workflowEnvelope.scope.visibility,
    evidenceType: input.workflowEnvelope.evidence_type,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: [],
    forbiddenFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    nextAction: 'fixture_workflow_envelope_validated_no_runtime',
    fixtureWorkflowEnvelopeOnly: true,
    runtimeWiringExecuted: false,
    workflowHarnessStarted: false,
    workflowStepsExecuted: 0,
    liveVcpToolBoxCalled: false,
    mcpToolCalled: false,
    fallbackExecuted: false,
    memoryRead: false,
    memoryWritten: false,
    checkpointMemoryWritten: false,
    handoffMemoryWritten: false,
    durableAuditWritten: false,
    durableMemoryWritten: false,
    providerApiCalled: false,
    approvalRequestSubmitted: false,
    approvalLineGenerated: false,
    publicMcpExpanded: false,
    readinessClaimAllowed: false
  };
}

module.exports = {
  ALLOWED_CLIENT_FAMILIES,
  ALLOWED_DECISIONS,
  ALLOWED_EVIDENCE_TYPES,
  ALLOWED_VISIBILITIES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_ENVELOPE_FIELDS,
  REQUIRED_RECEIPT_PLAN_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryCodexClaudeSustainedWorkflowEnvelopeContract
};
