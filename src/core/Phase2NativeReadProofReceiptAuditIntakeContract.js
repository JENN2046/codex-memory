'use strict';

const {
  REQUIRED_PREREQUISITE_FIELDS: REQUIRED_BUNDLE_REVIEW_CHAIN_PREREQUISITE_FIELDS
} = require('./Phase2NativeReadProofReceiptBundleContract');

const CONTRACT_NAME = 'Phase2NativeReadProofReceiptAuditIntakeContract';
const CONTRACT_MODE = 'local_phase2_receipt_bundle_audit_intake_preflight_only';
const SCHEMA_VERSION = 1;

const ALLOWED_MODES = Object.freeze(['local-receipt-audit-intake-preflight']);
const ALLOWED_DECISIONS = Object.freeze([
  'phase2_receipt_audit_intake_ready_for_future_exact_receipts',
  'phase2_receipt_audit_intake_blocked',
  'stop_l4'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'mode',
  'prerequisites',
  'receiptBundleContract',
  'auditIntake',
  'proposedAuditEvidence',
  'expectedDecision',
  'counters'
]);

const REQUIRED_PREREQUISITE_FIELDS = Object.freeze([
  'cm2019EvidenceGateAccepted',
  'cm2020ReadinessGateAccepted',
  'cm2021ApprovalPacketContractAccepted',
  'cm2022ReceiptBundleContractAccepted',
  'cm2023CompletionAuditRequiresReceiptApplication',
  'cm2024TraceMatrixRequiresExactReceiptEvidence'
]);

const REQUIRED_RECEIPT_BUNDLE_CONTRACT_FIELDS = Object.freeze([
  'decision',
  'futureReceiptBundleShapeAccepted',
  'requiredReceiptCategory',
  'prerequisiteChecksRequired',
  'currentPhase2Completed',
  'approvalAcceptedByThisContract',
  'receiptBundleAppliedToCompletionAudit',
  'liveNativeReadExecuted',
  'receiptContentRead',
  'realMemoryRead',
  'rawPrivateStateRead',
  'providerApiCalled',
  'nativeWriteExecuted',
  'durableMutationPerformed',
  'publicMcpExpanded',
  'readinessClaimed'
]);

const REQUIRED_AUDIT_INTAKE_FIELDS = Object.freeze([
  'intakePrepared',
  'categoryOnly',
  'lowDisclosureOnly',
  'exactAuthorizedReceiptsRequiredBeforePatch',
  'completionAuditPatchPrepared',
  'completionAuditPatchApplied',
  'phase2CompletionClaimed',
  'localContractsAllowedToSatisfyExactReceipts'
]);

const PHASE2_RECEIPT_AUDIT_FIELDS = Object.freeze([
  'nativeTargetBindingPassed',
  'nativeReadProofPassed',
  'fallbackDistinctionPassed',
  'lowDisclosureProofPassed',
  'auditReceiptPassed',
  'scopeVisibilityIsolationPassed',
  'wslLinuxProofPassed',
  'windowsWslSmokePassed',
  'phase2ReceiptBundleAppliedToCompletionAudit'
]);

const REQUIRED_EVIDENCE_MARKER = 'requires_future_exact_authorized_receipt';
const REQUIRED_RECEIPT_CATEGORY = 'present_low_disclosure_category_only';
const REQUIRED_RECEIPT_BUNDLE_DECISION =
  'native_read_proof_receipt_bundle_contract_ready_for_future_evidence';

const COUNTER_FIELDS = Object.freeze([
  'approvalGrantsAccepted',
  'approvalLineOperations',
  'receiptBundleApplications',
  'completionAuditPatchApplications',
  'runtimeCalls',
  'liveVcpToolBoxCalls',
  'nativeTargetBindings',
  'nativeReadAttempts',
  'memoryReads',
  'realMemoryReads',
  'rawPrivateReads',
  'serviceStartStopActions',
  'processInspections',
  'providerApiCalls',
  'nativeWriteAttempts',
  'durableMutations',
  'publicMcpExpansions',
  'releaseDeployCutoverActions',
  'readinessClaims'
]);

const STOP_L4_TRUE_FIELDS = Object.freeze([
  ['receiptBundleContract', 'currentPhase2Completed'],
  ['receiptBundleContract', 'approvalAcceptedByThisContract'],
  ['receiptBundleContract', 'receiptBundleAppliedToCompletionAudit'],
  ['receiptBundleContract', 'liveNativeReadExecuted'],
  ['receiptBundleContract', 'receiptContentRead'],
  ['receiptBundleContract', 'realMemoryRead'],
  ['receiptBundleContract', 'rawPrivateStateRead'],
  ['receiptBundleContract', 'providerApiCalled'],
  ['receiptBundleContract', 'nativeWriteExecuted'],
  ['receiptBundleContract', 'durableMutationPerformed'],
  ['receiptBundleContract', 'publicMcpExpanded'],
  ['receiptBundleContract', 'readinessClaimed'],
  ['auditIntake', 'completionAuditPatchApplied'],
  ['auditIntake', 'phase2CompletionClaimed'],
  ['auditIntake', 'localContractsAllowedToSatisfyExactReceipts']
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
  'fullBridgeCompletion',
  'fullPlanPackCompleted'
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
    ...collectUnexpectedKeys(input.prerequisites, REQUIRED_PREREQUISITE_FIELDS, 'prerequisites'),
    ...collectUnexpectedKeys(
      input.receiptBundleContract,
      REQUIRED_RECEIPT_BUNDLE_CONTRACT_FIELDS,
      'receiptBundleContract'
    ),
    ...collectUnexpectedKeys(input.auditIntake, REQUIRED_AUDIT_INTAKE_FIELDS, 'auditIntake'),
    ...collectUnexpectedKeys(input.proposedAuditEvidence, PHASE2_RECEIPT_AUDIT_FIELDS, 'proposedAuditEvidence'),
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
  return STOP_L4_TRUE_FIELDS
    .filter(([section, field]) => input[section][field] === true)
    .map(([section, field]) => `${section}.${field}`);
}

function missingTrueFields(value, fields, prefix) {
  return fields
    .filter(field => value[field] !== true)
    .map(field => pathJoin(prefix, field));
}

function invalidFalseFields(value, fields, prefix) {
  return fields
    .filter(field => value[field] !== false)
    .map(field => pathJoin(prefix, field));
}

function invalidEvidenceMarkers(proposedAuditEvidence) {
  if (!isPlainObject(proposedAuditEvidence)) return [...PHASE2_RECEIPT_AUDIT_FIELDS];
  return PHASE2_RECEIPT_AUDIT_FIELDS
    .filter(field => proposedAuditEvidence[field] !== REQUIRED_EVIDENCE_MARKER)
    .map(field => `proposedAuditEvidence.${field}`);
}

function invalidReceiptBundlePrerequisiteSummary(receiptBundleContract) {
  const actual = receiptBundleContract.prerequisiteChecksRequired;
  if (!Array.isArray(actual)) return true;
  if (actual.length !== REQUIRED_BUNDLE_REVIEW_CHAIN_PREREQUISITE_FIELDS.length) return true;
  return REQUIRED_BUNDLE_REVIEW_CHAIN_PREREQUISITE_FIELDS
    .some((field, index) => actual[index] !== field);
}

function computeDecision(input) {
  const stopBlockers = [
    ...enabledStopFields(input),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
  if (stopBlockers.length > 0) return { decision: 'stop_l4', blockers: stopBlockers };

  const blockers = [
    ...missingTrueFields(input.prerequisites, REQUIRED_PREREQUISITE_FIELDS, 'prerequisites'),
    ...missingTrueFields(input.auditIntake, [
      'intakePrepared',
      'categoryOnly',
      'lowDisclosureOnly',
      'exactAuthorizedReceiptsRequiredBeforePatch',
      'completionAuditPatchPrepared'
    ], 'auditIntake'),
    ...invalidFalseFields(input.auditIntake, [
      'completionAuditPatchApplied',
      'phase2CompletionClaimed',
      'localContractsAllowedToSatisfyExactReceipts'
    ], 'auditIntake'),
    ...invalidEvidenceMarkers(input.proposedAuditEvidence)
  ];

  if (input.receiptBundleContract.decision !== REQUIRED_RECEIPT_BUNDLE_DECISION) {
    blockers.push('receiptBundleContract.decision');
  }
  if (input.receiptBundleContract.futureReceiptBundleShapeAccepted !== true) {
    blockers.push('receiptBundleContract.futureReceiptBundleShapeAccepted');
  }
  if (input.receiptBundleContract.requiredReceiptCategory !== REQUIRED_RECEIPT_CATEGORY) {
    blockers.push('receiptBundleContract.requiredReceiptCategory');
  }
  if (invalidReceiptBundlePrerequisiteSummary(input.receiptBundleContract)) {
    blockers.push('receiptBundleContract.prerequisiteChecksRequired');
  }

  if (blockers.length > 0) {
    return {
      decision: 'phase2_receipt_audit_intake_blocked',
      blockers
    };
  }

  return {
    decision: 'phase2_receipt_audit_intake_ready_for_future_exact_receipts',
    blockers: []
  };
}

function failure(reasonCode, extras = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    blockers: [],
    receiptAuditIntakeAccepted: false,
    completionAuditPatchApplied: false,
    currentPhase2Completed: false,
    fullPlanPackCompleted: false,
    approvalAcceptedByThisContract: false,
    liveNativeReadExecuted: false,
    receiptContentRead: false,
    realMemoryRead: false,
    rawPrivateStateRead: false,
    providerApiCalled: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    ...extras
  };
}

function evaluatePhase2NativeReadProofReceiptAuditIntakeContract(input) {
  if (!isPlainObject(input)) return failure('invalid_input');

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_or_overclaim_fields', { forbiddenFields });
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_PREREQUISITE_FIELDS, input.prerequisites, 'prerequisites'),
    ...missingFields(
      REQUIRED_RECEIPT_BUNDLE_CONTRACT_FIELDS,
      input.receiptBundleContract,
      'receiptBundleContract'
    ),
    ...missingFields(REQUIRED_AUDIT_INTAKE_FIELDS, input.auditIntake, 'auditIntake'),
    ...missingFields(PHASE2_RECEIPT_AUDIT_FIELDS, input.proposedAuditEvidence, 'proposedAuditEvidence'),
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

  const accepted = computed.decision ===
    'phase2_receipt_audit_intake_ready_for_future_exact_receipts';

  return {
    accepted,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: computed.decision,
    blockers: computed.blockers,
    receiptAuditIntakeAccepted: accepted,
    requiredEvidenceMarker: REQUIRED_EVIDENCE_MARKER,
    requiredAuditEvidenceFields: [...PHASE2_RECEIPT_AUDIT_FIELDS],
    proposedCompletionAuditEvidence: accepted
      ? PHASE2_RECEIPT_AUDIT_FIELDS.map(field => ({
        field,
        marker: REQUIRED_EVIDENCE_MARKER,
        acceptedAsCompletionEvidenceNow: false
      }))
      : [],
    currentPhase2Completed: false,
    fullPlanPackCompleted: false,
    nextGate: accepted
      ? 'await_future_exact_authorized_receipts_before_completion_audit_patch_application'
      : 'repair_phase2_receipt_audit_intake_preflight',
    approvalAcceptedByThisContract: false,
    completionAuditPatchApplied: false,
    liveNativeReadExecuted: false,
    receiptContentRead: false,
    realMemoryRead: false,
    rawPrivateStateRead: false,
    providerApiCalled: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    publicMcpExpanded: false,
    readinessClaimed: false
  };
}

module.exports = {
  ALLOWED_DECISIONS,
  ALLOWED_MODES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  COUNTER_FIELDS,
  FORBIDDEN_FIELD_NAMES,
  PHASE2_RECEIPT_AUDIT_FIELDS,
  REQUIRED_EVIDENCE_MARKER,
  REQUIRED_RECEIPT_BUNDLE_DECISION,
  REQUIRED_RECEIPT_CATEGORY,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluatePhase2NativeReadProofReceiptAuditIntakeContract
};
