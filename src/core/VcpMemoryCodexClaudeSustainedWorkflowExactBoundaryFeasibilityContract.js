'use strict';

const CONTRACT_NAME = 'VcpMemoryCodexClaudeSustainedWorkflowExactBoundaryFeasibilityContract';
const CONTRACT_MODE = 'fixture_exact_boundary_feasibility_only';
const SCHEMA_VERSION = 1;
const CONTRACT_VERSION = 'vcp_memory_codex_claude_m12_exact_boundary_feasibility_v1';

const ALLOWED_EVIDENCE_TYPES = Object.freeze([
  'fixture-only',
  'schema-only'
]);

const ALLOWED_DECISIONS = Object.freeze([
  'partial_blocked'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'feasibility',
  'counters'
]);

const REQUIRED_FEASIBILITY_FIELDS = Object.freeze([
  'packet_id',
  'contract_version',
  'evidence_type',
  'boundary_mode',
  'decision',
  'source_refs',
  'candidate_fields',
  'blocked_reasons',
  'authorization',
  'next_action_allowed'
]);

const REQUIRED_SOURCE_REF_FIELDS = Object.freeze([
  'm8_receipt_ref',
  'm11_blocker_ref',
  'm12_alignment_ref'
]);

const REQUIRED_CANDIDATE_FIELD_FLAGS = Object.freeze([
  'target_alias_field_required',
  'transport_route_field_required',
  'component_action_field_required',
  'codex_client_alias_field_required',
  'claude_client_alias_field_required',
  'workspace_scope_field_required',
  'project_scope_field_required',
  'owner_scope_field_required',
  'task_scope_field_required',
  'visibility_scope_field_required',
  'workflow_step_list_field_required',
  'workflow_step_cap_field_required',
  'route_call_cap_field_required',
  'duration_cap_field_required',
  'result_cap_field_required',
  'low_disclosure_receipt_budget_field_required',
  'checkpoint_receipt_rule_field_required',
  'handoff_receipt_rule_field_required',
  'checkpoint_handoff_write_authority_field_required',
  'abort_rule_field_required'
]);

const REQUIRED_AUTHORIZATION_FIELDS = Object.freeze([
  'concreteExactValuesBound',
  'liveExecutionPacketBound',
  'requestBodyPrepared',
  'approvalLineGenerated',
  'workflowHarnessStartAllowed',
  'workflowStepExecutionAllowed',
  'runtimeCallAllowed',
  'mcpMemoryToolCallAllowed',
  'memoryReadAllowed',
  'clientPrivateMemoryReadAllowed',
  'memoryWriteAllowed',
  'checkpointHandoffWriteAllowed',
  'durableWriteAllowed',
  'providerApiCallAllowed',
  'publicMcpExpansionAllowed',
  'configStartupWatchdogChangeAllowed',
  'm12UnlockAllowed',
  'm15UnlockAllowed',
  'readinessClaimAllowed'
]);

const REQUIRED_BLOCKED_REASONS = Object.freeze([
  'm11_live_evidence_absent',
  'checkpoint_handoff_write_authority_absent'
]);

const ALLOWED_NEXT_ACTIONS = Object.freeze([
  'cm1855_m12_exact_boundary_feasibility_fixture_contract',
  'cm1856_m12_exact_boundary_feasibility_contract_closeout'
]);

const ZERO_COUNTER_FIELDS = Object.freeze([
  'concreteExactValuesBound',
  'liveExecutionPacketsBound',
  'requestBodiesGenerated',
  'requestSubmissions',
  'approvalLineOperations',
  'workflowHarnessStarts',
  'workflowStepsExecuted',
  'liveVcpToolBoxCalls',
  'mcpMemoryToolCalls',
  'memoryReads',
  'clientPrivateMemoryReads',
  'checkpointMemoryWrites',
  'handoffMemoryWrites',
  'memoryWrites',
  'durableWrites',
  'providerApiCalls',
  'publicMcpExpansions',
  'configStartupWatchdogChanges',
  'm12Unlocks',
  'm15Unlocks',
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
  'runtimeEndpoint',
  'runtimeTarget',
  'rawPath',
  'configEnvPath',
  'requestBody',
  'request_body',
  'approvalLine',
  'approvalLineValue',
  'approval_line_value',
  'approvalGrant',
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

function collectInvalidCounters(counters) {
  if (!isPlainObject(counters)) return ZERO_COUNTER_FIELDS;
  return ZERO_COUNTER_FIELDS.filter(field => counters[field] !== 0);
}

function lowDisclosureProjection(input) {
  const feasibility = isPlainObject(input) ? input.feasibility : null;
  return {
    packetId: isPlainObject(feasibility) && typeof feasibility.packet_id === 'string'
      ? feasibility.packet_id
      : null,
    decision: isPlainObject(feasibility) && typeof feasibility.decision === 'string'
      ? feasibility.decision
      : null,
    evidenceType: isPlainObject(feasibility) && typeof feasibility.evidence_type === 'string'
      ? feasibility.evidence_type
      : null,
    boundaryMode: isPlainObject(feasibility) && typeof feasibility.boundary_mode === 'string'
      ? feasibility.boundary_mode
      : null,
    nextActionAllowed: isPlainObject(feasibility) && typeof feasibility.next_action_allowed === 'string'
      ? feasibility.next_action_allowed
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
    forbiddenCounters: details.forbiddenCounters || [],
    invalidFields: details.invalidFields || [],
    nextAction: 'fix_fixture_or_stop',
    fixtureExactBoundaryFeasibilityOnly: true,
    exactBoundaryFeasibilityValidated: false,
    concreteExactValuesBound: false,
    liveExecutionPacketBound: false,
    requestBodyPrepared: false,
    approvalLineGenerated: false,
    runtimeWiringExecuted: false,
    workflowHarnessStarted: false,
    workflowStepsExecuted: 0,
    liveVcpToolBoxCalled: false,
    mcpMemoryToolCalled: false,
    memoryRead: false,
    clientPrivateMemoryRead: false,
    memoryWritten: false,
    checkpointHandoffMemoryWritten: false,
    durableWritePerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    configStartupWatchdogChanged: false,
    readinessClaimAllowed: false
  };
}

function validateSourceRefs(sourceRefs) {
  const invalidFields = [];
  if (!isPlainObject(sourceRefs)) return ['feasibility.source_refs'];

  for (const field of REQUIRED_SOURCE_REF_FIELDS) {
    if (typeof sourceRefs[field] !== 'string' || sourceRefs[field].trim() === '') {
      invalidFields.push(`feasibility.source_refs.${field}`);
    }
  }
  return invalidFields;
}

function validateCandidateFields(candidateFields) {
  const invalidFields = [];
  if (!isPlainObject(candidateFields)) return ['feasibility.candidate_fields'];

  for (const field of REQUIRED_CANDIDATE_FIELD_FLAGS) {
    if (candidateFields[field] !== true) {
      invalidFields.push(`feasibility.candidate_fields.${field}`);
    }
  }
  return invalidFields;
}

function validateBlockedReasons(blockedReasons) {
  if (!Array.isArray(blockedReasons)) return ['feasibility.blocked_reasons'];
  return REQUIRED_BLOCKED_REASONS
    .filter(reason => !blockedReasons.includes(reason))
    .map(reason => `feasibility.blocked_reasons.${reason}`);
}

function validateAuthorization(authorization) {
  const invalidFields = [];
  if (!isPlainObject(authorization)) return ['feasibility.authorization'];

  for (const field of REQUIRED_AUTHORIZATION_FIELDS) {
    if (authorization[field] !== false) {
      invalidFields.push(`feasibility.authorization.${field}`);
    }
  }
  return invalidFields;
}

function validateFeasibilityShape(feasibility) {
  const invalidFields = [];
  if (!isPlainObject(feasibility)) return ['feasibility'];

  if (typeof feasibility.packet_id !== 'string' || !feasibility.packet_id.startsWith('cm1854_m12_exact_boundary_feasibility_')) {
    invalidFields.push('feasibility.packet_id');
  }
  if (feasibility.contract_version !== CONTRACT_VERSION) invalidFields.push('feasibility.contract_version');
  if (!ALLOWED_EVIDENCE_TYPES.includes(feasibility.evidence_type)) invalidFields.push('feasibility.evidence_type');
  if (feasibility.boundary_mode !== 'feasibility-only') invalidFields.push('feasibility.boundary_mode');
  if (!ALLOWED_DECISIONS.includes(feasibility.decision)) invalidFields.push('feasibility.decision');
  if (!ALLOWED_NEXT_ACTIONS.includes(feasibility.next_action_allowed)) invalidFields.push('feasibility.next_action_allowed');

  invalidFields.push(...validateSourceRefs(feasibility.source_refs));
  invalidFields.push(...validateCandidateFields(feasibility.candidate_fields));
  invalidFields.push(...validateBlockedReasons(feasibility.blocked_reasons));
  invalidFields.push(...validateAuthorization(feasibility.authorization));

  return invalidFields;
}

function validateVcpMemoryCodexClaudeSustainedWorkflowExactBoundaryFeasibilityContract(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input);
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_FEASIBILITY_FIELDS, input.feasibility, 'feasibility'),
    ...missingFields(REQUIRED_SOURCE_REF_FIELDS, input.feasibility?.source_refs, 'feasibility.source_refs'),
    ...missingFields(REQUIRED_CANDIDATE_FIELD_FLAGS, input.feasibility?.candidate_fields, 'feasibility.candidate_fields'),
    ...missingFields(REQUIRED_AUTHORIZATION_FIELDS, input.feasibility?.authorization, 'feasibility.authorization'),
    ...missingFields(ZERO_COUNTER_FIELDS, input.counters, 'counters')
  ];
  if (missing.length > 0) {
    return rejected('m12_exact_boundary_feasibility_incomplete', input, { missingFields: missing });
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_raw_secret_request_approval_runtime_or_readiness_fields', input, { forbiddenFields });
  }

  const forbiddenCounters = collectInvalidCounters(input.counters);
  if (forbiddenCounters.length > 0) {
    return rejected('forbidden_nonzero_or_invalid_side_effect_counters', input, { forbiddenCounters });
  }

  const invalidFields = [];
  if (input.schemaVersion !== SCHEMA_VERSION) invalidFields.push('schemaVersion');
  invalidFields.push(...validateFeasibilityShape(input.feasibility));

  if (invalidFields.length > 0) {
    return rejected('invalid_m12_exact_boundary_feasibility_contract', input, { invalidFields });
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    schemaVersion: SCHEMA_VERSION,
    packetId: input.feasibility.packet_id,
    decision: input.feasibility.decision,
    evidenceType: input.feasibility.evidence_type,
    boundaryMode: input.feasibility.boundary_mode,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    missingFields: [],
    forbiddenFields: [],
    forbiddenCounters: [],
    invalidFields: [],
    nextAction: 'fixture_exact_boundary_feasibility_validated_no_runtime',
    fixtureExactBoundaryFeasibilityOnly: true,
    exactBoundaryFeasibilityValidated: true,
    concreteExactValuesBound: false,
    liveExecutionPacketBound: false,
    requestBodyPrepared: false,
    approvalLineGenerated: false,
    runtimeWiringExecuted: false,
    workflowHarnessStarted: false,
    workflowStepsExecuted: 0,
    liveVcpToolBoxCalled: false,
    mcpMemoryToolCalled: false,
    memoryRead: false,
    clientPrivateMemoryRead: false,
    memoryWritten: false,
    checkpointHandoffMemoryWritten: false,
    durableWritePerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    configStartupWatchdogChanged: false,
    readinessClaimAllowed: false
  };
}

module.exports = {
  CONTRACT_MODE,
  CONTRACT_NAME,
  CONTRACT_VERSION,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_CANDIDATE_FIELD_FLAGS,
  REQUIRED_FEASIBILITY_FIELDS,
  REQUIRED_SOURCE_REF_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryCodexClaudeSustainedWorkflowExactBoundaryFeasibilityContract
};
