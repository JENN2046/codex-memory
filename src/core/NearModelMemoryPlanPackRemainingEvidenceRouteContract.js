'use strict';

const {
  EXACT_RECEIPT_REQUIREMENTS,
  EXTERNAL_REVIEW_FIELDS
} = require('./NearModelMemoryPlanPackEvidenceTraceMatrix');

const CONTRACT_NAME = 'NearModelMemoryPlanPackRemainingEvidenceRouteContract';
const CONTRACT_MODE = 'local_plan_pack_remaining_evidence_route_only';
const SCHEMA_VERSION = 1;

const ALLOWED_MODES = Object.freeze(['local-plan-pack-remaining-evidence-route']);
const ALLOWED_DECISIONS = Object.freeze([
  'remaining_evidence_route_ready',
  'remaining_evidence_route_blocked',
  'stop_l4'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'mode',
  'completionAuditResult',
  'traceMatrixResult',
  'expectedDecision',
  'counters'
]);

const REQUIRED_COMPLETION_AUDIT_RESULT_FIELDS = Object.freeze([
  'schemaVersion',
  'accepted',
  'fullPlanPackCompleted',
  'status',
  'completedPhaseIds',
  'incompletePhaseIds',
  'phaseResults',
  'objectiveInvariants',
  'blockers',
  'stopReasons',
  'nonClaims',
  'sideEffects',
  'boundaries',
  'nextGate'
]);

const REQUIRED_TRACE_MATRIX_RESULT_FIELDS = Object.freeze([
  'accepted',
  'contractName',
  'contractMode',
  'decision',
  'requiredTraceCount',
  'providedTraceCount',
  'duplicateTraceKeys',
  'fullPlanPackTraceAccepted',
  'fullPlanPackCompleted',
  'blockers',
  'currentMissing',
  'traceSummary',
  'receiptAppliedByThisContract',
  'runtimeCalled',
  'liveNativeReadExecuted',
  'nativeWriteExecuted',
  'durableMutationPerformed',
  'providerApiCalled',
  'publicMcpExpanded',
  'readinessClaimed',
  'nextGate'
]);

const COUNTER_FIELDS = Object.freeze([
  'runtimeCalls',
  'liveVcpToolBoxCalls',
  'nativeReadAttempts',
  'nativeWriteAttempts',
  'memoryReads',
  'realMemoryReads',
  'rawPrivateReads',
  'providerApiCalls',
  'durableMutations',
  'publicMcpExpansions',
  'tagCreateActions',
  'tagPushActions',
  'releasePublishActions',
  'deployActions',
  'cutoverActions',
  'readinessClaims'
]);

const STOP_L4_TRUE_FIELDS = Object.freeze([
  ['completionAuditResult', 'accepted'],
  ['completionAuditResult', 'fullPlanPackCompleted'],
  ['traceMatrixResult', 'receiptAppliedByThisContract'],
  ['traceMatrixResult', 'runtimeCalled'],
  ['traceMatrixResult', 'liveNativeReadExecuted'],
  ['traceMatrixResult', 'nativeWriteExecuted'],
  ['traceMatrixResult', 'durableMutationPerformed'],
  ['traceMatrixResult', 'providerApiCalled'],
  ['traceMatrixResult', 'publicMcpExpanded'],
  ['traceMatrixResult', 'readinessClaimed']
]);

const COMPLETION_AUDIT_SIDE_EFFECT_FIELDS = Object.freeze([
  'actualTagCreated',
  'actualTagPushed',
  'releasePublished',
  'deploymentTriggered',
  'cutoverPerformed',
  'runtimeWriteExecuted',
  'nativeWriteExecuted',
  'durableMutationPerformed',
  'providerApiCalled',
  'publicMcpExpanded',
  'realMemoryRead',
  'rawPrivateStateRead'
]);

const COMPLETION_AUDIT_NON_CLAIM_FIELDS = Object.freeze([
  'productionReadyClaimed',
  'releaseReadyClaimed',
  'deployReadyClaimed',
  'cutoverReadyClaimed',
  'rcReadyClaimed',
  'modelMemoryCompleteClaimed',
  'fullRealtimeMemoryClaimed',
  'codexMemoryIntelligenceOwnerClaimed'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'endpoint',
  'locator',
  'runtimeLocator',
  'targetValue',
  'queryText',
  'query_text',
  'requestBody',
  'request_body',
  'responseBody',
  'response_body',
  'rawRequest',
  'rawResponse',
  'rawOutput',
  'rawMemory',
  'memoryContent',
  'rawAudit',
  'rawJsonlRow',
  'rawSqliteRow',
  'token',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'secret',
  'credential',
  'approvalLine',
  'approvalLineValue',
  'providerPayload',
  'runtimeCommand',
  'reviewTranscript',
  'reviewerIdentity',
  'tagApprovalLine',
  'productionReady',
  'releaseReady',
  'deployReady',
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
    .map(field => pathJoin(prefix, field));
}

function collectUnexpectedKeys(value, allowedFields, prefix = '') {
  if (!isPlainObject(value)) return [];
  return Object.keys(value)
    .filter(key => !allowedFields.includes(key))
    .map(key => pathJoin(prefix, key));
}

function collectUnexpectedFields(input) {
  if (!isPlainObject(input)) return [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(
      input.completionAuditResult,
      REQUIRED_COMPLETION_AUDIT_RESULT_FIELDS,
      'completionAuditResult'
    ),
    ...collectUnexpectedKeys(
      input.traceMatrixResult,
      REQUIRED_TRACE_MATRIX_RESULT_FIELDS,
      'traceMatrixResult'
    ),
    ...collectUnexpectedKeys(input.counters, COUNTER_FIELDS, 'counters')
  ];
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

function invalidCounters(counters) {
  if (!isPlainObject(counters)) return [...COUNTER_FIELDS];
  return COUNTER_FIELDS.filter(field => !Number.isInteger(counters[field]) || counters[field] < 0);
}

function nonZeroCounters(counters) {
  if (!isPlainObject(counters)) return [...COUNTER_FIELDS];
  return COUNTER_FIELDS.filter(field => counters[field] !== 0);
}

function enabledStopFields(input) {
  const topLevel = STOP_L4_TRUE_FIELDS
    .filter(([section, field]) => input[section][field] === true)
    .map(([section, field]) => `${section}.${field}`);

  const sideEffects = COMPLETION_AUDIT_SIDE_EFFECT_FIELDS
    .filter(field => input.completionAuditResult.sideEffects[field] === true)
    .map(field => `completionAuditResult.sideEffects.${field}`);

  const nonClaims = COMPLETION_AUDIT_NON_CLAIM_FIELDS
    .filter(field => input.completionAuditResult.nonClaims[field] === true)
    .map(field => `completionAuditResult.nonClaims.${field}`);

  return [...topLevel, ...sideEffects, ...nonClaims];
}

function missingRequirementsFromAudit(completionAuditResult) {
  const phaseMissing = completionAuditResult.phaseResults.flatMap(phase =>
    phase.missingEvidence.map(evidenceField => ({
      scope: 'phase',
      requirementId: phase.id,
      evidenceField
    }))
  );
  const invariantMissing = completionAuditResult.objectiveInvariants.flatMap(invariant =>
    invariant.missingEvidence.map(evidenceField => ({
      scope: 'invariant',
      requirementId: invariant.id,
      evidenceField
    }))
  );
  return [...phaseMissing, ...invariantMissing];
}

function exactReceiptFieldsFor(requirementId) {
  return EXACT_RECEIPT_REQUIREMENTS[requirementId] || [];
}

function classifyRequirement(requirement) {
  if (
    requirement.scope === 'phase' &&
    exactReceiptFieldsFor(requirement.requirementId).includes(requirement.evidenceField)
  ) {
    return 'exact_authorized_receipt_required';
  }
  if (EXTERNAL_REVIEW_FIELDS.includes(requirement.evidenceField)) {
    return 'external_review_required';
  }
  if (['testAllPassed', 'gateCiPassed'].includes(requirement.evidenceField)) {
    return 'local_command_gate_required';
  }
  if (requirement.scope === 'invariant') return 'objective_invariant_required';
  return 'local_contract_or_source_evidence_required';
}

function summarizeRoutes(requirements) {
  const summary = {
    exact_authorized_receipt_required: [],
    external_review_required: [],
    local_command_gate_required: [],
    local_contract_or_source_evidence_required: [],
    objective_invariant_required: []
  };
  for (const requirement of requirements) {
    summary[classifyRequirement(requirement)].push(requirement);
  }
  return summary;
}

function countRoutes(routeSummary) {
  return Object.fromEntries(
    Object.entries(routeSummary).map(([key, value]) => [key, value.length])
  );
}

function nextGateFromCounts(counts) {
  if (counts.exact_authorized_receipt_required > 0) {
    return 'collect_exact_authorized_receipts_under_separate_approval_before_completion_claims';
  }
  if (counts.external_review_required > 0) {
    return 'collect_external_review_observation_and_tag_approval_evidence_before_completion_claims';
  }
  if (counts.local_command_gate_required > 0) {
    return 'run_required_local_command_gates_before_completion_claims';
  }
  if (counts.local_contract_or_source_evidence_required > 0) {
    return 'close_local_contract_or_source_evidence_gaps_before_completion_claims';
  }
  if (counts.objective_invariant_required > 0) {
    return 'close_objective_invariant_evidence_gaps_before_completion_claims';
  }
  return 'rerun_completion_audit_before_any_readiness_claim';
}

function computeDecision(input) {
  const stopBlockers = [
    ...enabledStopFields(input),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const blockers = [];
  if (input.completionAuditResult.status === 'near_model_memory_plan_pack_completion_audit_stop_l4') {
    blockers.push('completionAuditResult.status');
  }
  if (!Array.isArray(input.completionAuditResult.phaseResults)) {
    blockers.push('completionAuditResult.phaseResults');
  }
  if (!Array.isArray(input.completionAuditResult.objectiveInvariants)) {
    blockers.push('completionAuditResult.objectiveInvariants');
  }
  if (!Array.isArray(input.traceMatrixResult.traceSummary)) {
    blockers.push('traceMatrixResult.traceSummary');
  }

  if (blockers.length > 0) {
    return { decision: 'remaining_evidence_route_blocked', blockers };
  }

  return { decision: 'remaining_evidence_route_ready', blockers: [] };
}

function failure(reasonCode, extras = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    blockers: [],
    routeAccepted: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false,
    runtimeCalled: false,
    nativeReadExecuted: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    tagCreated: false,
    releasePublished: false,
    deploymentTriggered: false,
    cutoverPerformed: false,
    ...extras
  };
}

function evaluateNearModelMemoryPlanPackRemainingEvidenceRoute(input) {
  if (!isPlainObject(input)) return failure('invalid_input');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_or_overclaim_fields', { forbiddenFields });
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(
      REQUIRED_COMPLETION_AUDIT_RESULT_FIELDS,
      input.completionAuditResult,
      'completionAuditResult'
    ),
    ...missingFields(
      REQUIRED_TRACE_MATRIX_RESULT_FIELDS,
      input.traceMatrixResult,
      'traceMatrixResult'
    ),
    ...missingFields(COUNTER_FIELDS, input.counters, 'counters')
  ];
  if (missing.length > 0) return failure('missing_required_fields', { missingFields: missing });

  const unexpected = collectUnexpectedFields(input);
  if (unexpected.length > 0) return failure('unexpected_fields', { unexpectedFields: unexpected });
  if (input.schemaVersion !== SCHEMA_VERSION) return failure('invalid_schema_version');
  if (!/^CM-[0-9]{4}$/.test(input.taskId)) return failure('invalid_task_id');
  if (!ALLOWED_MODES.includes(input.mode)) return failure('invalid_mode');
  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) return failure('invalid_expected_decision');

  const invalidCounterFields = invalidCounters(input.counters);
  if (invalidCounterFields.length > 0) {
    return failure('invalid_counters', { invalidCounterFields });
  }

  const computed = computeDecision(input);
  if (computed.decision !== input.expectedDecision) {
    return failure('decision_mismatch', {
      expectedDecision: input.expectedDecision,
      computedDecision: computed.decision,
      blockers: computed.blockers
    });
  }

  if (computed.decision !== 'remaining_evidence_route_ready') {
    return {
      ...failure('remaining_evidence_route_not_ready'),
      decision: computed.decision,
      blockers: computed.blockers
    };
  }

  const missingRequirements = missingRequirementsFromAudit(input.completionAuditResult);
  const routeSummary = summarizeRoutes(missingRequirements);
  const routeCounts = countRoutes(routeSummary);

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: computed.decision,
    blockers: [],
    routeAccepted: true,
    routeSummary,
    routeCounts,
    totalMissingRequirements: missingRequirements.length,
    nextGate: nextGateFromCounts(routeCounts),
    fullPlanPackCompleted: false,
    readinessClaimed: false,
    runtimeCalled: false,
    nativeReadExecuted: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    tagCreated: false,
    releasePublished: false,
    deploymentTriggered: false,
    cutoverPerformed: false
  };
}

module.exports = {
  ALLOWED_DECISIONS,
  ALLOWED_MODES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  COUNTER_FIELDS,
  FORBIDDEN_FIELD_NAMES,
  SCHEMA_VERSION,
  classifyRequirement,
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackRemainingEvidenceRoute
};
