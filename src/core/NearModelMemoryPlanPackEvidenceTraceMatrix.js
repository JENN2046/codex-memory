'use strict';

const {
  OBJECTIVE_INVARIANTS,
  PHASE_REQUIREMENTS
} = require('./NearModelMemoryPlanPackCompletionAudit');

const CONTRACT_NAME = 'NearModelMemoryPlanPackEvidenceTraceMatrix';
const CONTRACT_MODE = 'local_plan_pack_evidence_trace_matrix_only';
const SCHEMA_VERSION = 1;

const ALLOWED_STATUSES = Object.freeze([
  'accepted',
  'missing',
  'future_required',
  'blocked'
]);

const ALLOWED_EVIDENCE_KINDS = Object.freeze([
  'local_source_test',
  'local_command_gate',
  'local_contract',
  'docs_status',
  'exact_authorized_receipt',
  'external_review',
  'future_exact_authorized_receipt',
  'future_external_review'
]);

const EXACT_RECEIPT_REQUIREMENTS = Object.freeze({
  phase2_readonly_realtime_native_memory: Object.freeze([
    'nativeTargetBindingPassed',
    'nativeReadProofPassed',
    'fallbackDistinctionPassed',
    'lowDisclosureProofPassed',
    'auditReceiptPassed',
    'scopeVisibilityIsolationPassed',
    'wslLinuxProofPassed',
    'windowsWslSmokePassed',
    'phase2ReceiptBundleAppliedToCompletionAudit'
  ]),
  phase8_native_write_production_proof: Object.freeze([
    'exactApprovalEnforcementPassed',
    'nativeSideEffectReceiptPassed',
    'realRootDurableWriteProofPassed',
    'vcpToolBoxOwnedRuntimeWritePassed',
    'actualTransportBindingPassed',
    'stableTargetStoreIdentityPassed',
    'verifyWritePassed',
    'rollbackDrillPassed',
    'failureRecoveryProofPassed',
    'outputDisclosureBudgetPassed',
    'auditReceiptPassed',
    'phase8ReceiptBundleAppliedToCompletionAudit'
  ])
});

const EXTERNAL_REVIEW_FIELDS = Object.freeze([
  'externalReviewPassed',
  'tagApprovalPacketPassed',
  'observationOrDogfoodReviewPassed',
  'externalReviewEvidenceBundleAppliedToCompletionAudit'
]);

const STOP_L4_FLAG_KEYS = Object.freeze([
  'actualReceiptApplied',
  'approvalAccepted',
  'approvalLineGenerated',
  'runtimeCalled',
  'liveNativeReadExecuted',
  'nativeWriteExecuted',
  'durableMutationPerformed',
  'providerApiCalled',
  'publicMcpExpanded',
  'tagCreated',
  'releasePublished',
  'deploymentTriggered',
  'cutoverPerformed',
  'readinessClaimed',
  'fullPlanPackCompletedClaimed'
]);

const COUNTER_FIELDS = Object.freeze([
  'approvalLineOperations',
  'runtimeCalls',
  'liveVcpToolBoxCalls',
  'nativeReadAttempts',
  'nativeWriteAttempts',
  'receiptApplications',
  'memoryReads',
  'realMemoryReads',
  'rawPrivateReads',
  'providerApiCalls',
  'durableMutations',
  'publicMcpExpansions',
  'releaseDeployCutoverActions',
  'readinessClaims'
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

function collectStopFlags(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectStopFlags(item, `${prefix}[${index}]`));
  }
  if (!isPlainObject(value)) return [];

  const found = [];
  for (const [key, nested] of Object.entries(value)) {
    const path = pathJoin(prefix, key);
    if (STOP_L4_FLAG_KEYS.includes(key) && nested === true) {
      found.push(path);
      continue;
    }
    found.push(...collectStopFlags(nested, path));
  }
  return found;
}

function buildRequiredTraceKeys() {
  const phaseKeys = PHASE_REQUIREMENTS.flatMap(phase => phase.requiredEvidence.map(evidenceField => ({
    scope: 'phase',
    requirementId: phase.id,
    evidenceField,
    traceKey: `phase:${phase.id}:${evidenceField}`
  })));
  const invariantKeys = OBJECTIVE_INVARIANTS.flatMap(invariant => invariant.requiredEvidence.map(evidenceField => ({
    scope: 'invariant',
    requirementId: invariant.id,
    evidenceField,
    traceKey: `invariant:${invariant.id}:${evidenceField}`
  })));
  return [...phaseKeys, ...invariantKeys];
}

function toTraceKey(entry) {
  return `${entry.scope}:${entry.requirementId}:${entry.evidenceField}`;
}

function isSafeSourceRef(sourceRef) {
  return typeof sourceRef === 'string' &&
    sourceRef.trim().length > 0 &&
    sourceRef.length <= 240 &&
    /^[A-Za-z0-9._/@:+-]+$/.test(sourceRef);
}

function buildCounterBlockers(counters) {
  if (!isPlainObject(counters)) return [];
  return COUNTER_FIELDS
    .filter(field => counters[field] !== undefined && counters[field] !== 0)
    .map(field => `counters.${field}`);
}

function requiresExactReceiptEvidence(required) {
  return (EXACT_RECEIPT_REQUIREMENTS[required.requirementId] || [])
    .includes(required.evidenceField);
}

function requiredAcceptedKindsForTrace(required) {
  if (requiresExactReceiptEvidence(required)) return ['exact_authorized_receipt'];
  const evidenceField = required.evidenceField;
  if (EXTERNAL_REVIEW_FIELDS.includes(evidenceField)) return ['external_review'];
  return ALLOWED_EVIDENCE_KINDS.filter(kind => !kind.startsWith('future_'));
}

function failure(reasonCode, extras = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    blockers: [],
    fullPlanPackTraceAccepted: false,
    fullPlanPackCompleted: false,
    receiptAppliedByThisContract: false,
    runtimeCalled: false,
    liveNativeReadExecuted: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    ...extras
  };
}

function evaluateNearModelMemoryPlanPackEvidenceTraceMatrix(input = {}) {
  if (!isPlainObject(input)) return failure('invalid_input');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_or_overclaim_fields', { forbiddenFields });
  }
  const stopFlags = collectStopFlags(input);
  const counterBlockers = buildCounterBlockers(input.counters);
  if (stopFlags.length > 0 || counterBlockers.length > 0) {
    return failure('stop_l4', { blockers: [...stopFlags, ...counterBlockers] });
  }

  if (input.schemaVersion !== SCHEMA_VERSION) return failure('invalid_schema_version');
  if (!Array.isArray(input.entries)) return failure('invalid_entries');

  const requiredKeys = buildRequiredTraceKeys();
  const requiredKeySet = new Set(requiredKeys.map(item => item.traceKey));
  const entriesByKey = new Map();
  const blockers = [];
  const duplicateTraceKeys = [];
  const sanitizedEntries = [];

  input.entries.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      blockers.push(`entries[${index}]`);
      return;
    }
    const traceKey = toTraceKey(entry);
    if (!requiredKeySet.has(traceKey)) blockers.push(`entries[${index}].traceKey`);
    if (!ALLOWED_STATUSES.includes(entry.status)) blockers.push(`entries[${index}].status`);
    if (!ALLOWED_EVIDENCE_KINDS.includes(entry.evidenceKind)) blockers.push(`entries[${index}].evidenceKind`);
    if (!isSafeSourceRef(entry.sourceRef)) blockers.push(`entries[${index}].sourceRef`);
    if (entriesByKey.has(traceKey)) {
      duplicateTraceKeys.push(traceKey);
    } else {
      entriesByKey.set(traceKey, entry);
    }
    sanitizedEntries.push({
      traceKey,
      status: ALLOWED_STATUSES.includes(entry.status) ? entry.status : 'invalid',
      evidenceKind: ALLOWED_EVIDENCE_KINDS.includes(entry.evidenceKind) ? entry.evidenceKind : 'invalid'
    });
  });

  for (const key of duplicateTraceKeys) blockers.push(`duplicate_${key}`);
  for (const required of requiredKeys) {
    if (!entriesByKey.has(required.traceKey)) blockers.push(`missing_trace_${required.traceKey}`);
  }

  for (const required of requiredKeys) {
    const entry = entriesByKey.get(required.traceKey);
    if (!entry) continue;
    if (entry.status !== 'accepted') {
      blockers.push(`unaccepted_${required.traceKey}_${entry.status}`);
      continue;
    }
    const requiredKinds = requiredAcceptedKindsForTrace(required);
    if (!requiredKinds.includes(entry.evidenceKind)) {
      blockers.push(`insufficient_evidence_kind_${required.traceKey}_${entry.evidenceKind}`);
    }
  }

  const accepted = blockers.length === 0;
  const currentMissing = sanitizedEntries
    .filter(entry => entry.status !== 'accepted')
    .map(entry => `${entry.traceKey}:${entry.status}`);

  return {
    accepted,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: accepted
      ? 'plan_pack_evidence_trace_matrix_accepted'
      : 'plan_pack_evidence_trace_matrix_incomplete',
    blockers,
    requiredTraceCount: requiredKeys.length,
    providedTraceCount: input.entries.length,
    duplicateTraceKeys,
    currentMissing,
    fullPlanPackTraceAccepted: accepted,
    fullPlanPackCompleted: false,
    traceSummary: sanitizedEntries,
    receiptAppliedByThisContract: false,
    runtimeCalled: false,
    liveNativeReadExecuted: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    nextGate: accepted
      ? 'feed_accepted_trace_matrix_into_completion_audit_without_side_effects'
      : 'close_missing_or_insufficient_trace_evidence_without_readiness_claims'
  };
}

module.exports = {
  ALLOWED_EVIDENCE_KINDS,
  ALLOWED_STATUSES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  COUNTER_FIELDS,
  EXACT_RECEIPT_REQUIREMENTS,
  EXTERNAL_REVIEW_FIELDS,
  SCHEMA_VERSION,
  buildRequiredTraceKeys,
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackEvidenceTraceMatrix
};
