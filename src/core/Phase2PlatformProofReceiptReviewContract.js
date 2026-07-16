'use strict';

const {
  REQUIRED_EVIDENCE_MARKER
} = require('./Phase2NativeReadProofReceiptAuditIntakeContract');
const { isSafeReferenceName } = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'Phase2PlatformProofReceiptReviewContract';
const CONTRACT_MODE = 'local_phase2_platform_proof_receipt_review_only';
const SCHEMA_VERSION = 1;

const REQUIRED_PREREQUISITES = Object.freeze([
  'cm2025ReceiptAuditIntakeAccepted',
  'cm2037ReceiptSchemaCompatibilityAccepted',
  'cm2038TargetBindingReceiptReviewAccepted',
  'cm2039NativeReadProofReceiptReviewAccepted',
  'cm2040FallbackDistinctionReceiptReviewAccepted',
  'cm2041LowDisclosureProofReceiptReviewAccepted',
  'cm2042AuditScopeReceiptReviewAccepted',
  'traceMatrixStillRequiresExactReceiptEvidence',
  'completionAuditStillRequiresWslLinuxProofPassed',
  'completionAuditStillRequiresWindowsWslSmokePassed',
  'localReviewDoesNotSatisfyPlatformProof'
]);

const REQUIRED_REVIEW_FIELDS = Object.freeze([
  'reviewPrepared',
  'targetReferenceName',
  'safeReferenceNameCategory',
  'wslLinuxReceiptField',
  'wslLinuxReceiptCategory',
  'wslLinuxObservedCategory',
  'windowsWslSmokeReceiptField',
  'windowsWslSmokeReceiptCategory',
  'windowsWslSmokeObservedCategory',
  'platformClassCategory',
  'wslLinuxProofCategory',
  'windowsWslSmokeCategory',
  'smokeCommandCategory',
  'categoryOnly',
  'lowDisclosureOnly',
  'endpointLocatorIncluded',
  'targetValueIncluded',
  'queryTextIncluded',
  'requestBodyIncluded',
  'responseBodyIncluded',
  'commandTextIncluded',
  'commandOutputIncluded',
  'environmentVariablesIncluded',
  'filePathsIncluded',
  'logLinesIncluded',
  'processDetailsIncluded',
  'memoryContentIncluded',
  'rawOutputIncluded',
  'rawAuditIncluded',
  'approvalLineIncluded',
  'acceptedAsCompletionEvidenceNow'
]);

const REQUIRED_WSL_LINUX_RECEIPT_FIELD = 'wslLinuxProofPassed';
const REQUIRED_WINDOWS_WSL_SMOKE_RECEIPT_FIELD = 'windowsWslSmokePassed';
const REQUIRED_WSL_LINUX_RECEIPT_CATEGORY = 'wslLinuxProofReceipt';
const REQUIRED_WINDOWS_WSL_SMOKE_RECEIPT_CATEGORY = 'windowsWslSmokeReceipt';
const REQUIRED_SAFE_REFERENCE_CATEGORY = 'safe_reference_name_only';
const REQUIRED_PLATFORM_CLASS_CATEGORY = 'platform_class_category_only';
const REQUIRED_WSL_LINUX_PROOF_CATEGORY = 'wsl_linux_proof_category_only';
const REQUIRED_WINDOWS_WSL_SMOKE_CATEGORY = 'windows_wsl_smoke_category_only';
const REQUIRED_SMOKE_COMMAND_CATEGORY = 'smoke_command_category_only';

const COUNTER_FIELDS = Object.freeze([
  'approvalGrantsAccepted',
  'approvalLineOperations',
  'receiptReviews',
  'receiptApplications',
  'completionAuditPatchApplications',
  'runtimeCalls',
  'liveVcpToolBoxCalls',
  'nativeTargetBindings',
  'nativeReadAttempts',
  'fallbackReads',
  'fallbackComparisons',
  'commandExecutions',
  'processInspections',
  'serviceStartStopActions',
  'responseBodyReads',
  'rawOutputReads',
  'rawAuditReads',
  'memoryReads',
  'realMemoryReads',
  'rawPrivateReads',
  'providerApiCalls',
  'nativeWriteAttempts',
  'durableMutations',
  'publicMcpExpansions',
  'releaseDeployCutoverActions',
  'readinessClaims'
]);

const STOP_L4_FLAG_KEYS = Object.freeze([
  'actualReceiptAccepted',
  'actualReceiptApplied',
  'approvalAccepted',
  'approvalLineGenerated',
  'runtimeCalled',
  'liveVcpToolBoxCalled',
  'nativeTargetBindingPerformed',
  'nativeReadExecuted',
  'fallbackReadExecuted',
  'fallbackComparisonExecuted',
  'wslLinuxProofPassed',
  'windowsWslSmokePassed',
  'commandExecuted',
  'processInspected',
  'serviceStartedOrStopped',
  'responseBodyRead',
  'rawOutputRead',
  'rawAuditRead',
  'memoryRead',
  'realMemoryRead',
  'rawPrivateRead',
  'nativeWriteExecuted',
  'durableMutationPerformed',
  'providerApiCalled',
  'publicMcpExpanded',
  'completionAuditPatched',
  'phase2Completed',
  'tagCreated',
  'releasePublished',
  'deploymentTriggered',
  'cutoverPerformed',
  'readinessClaimed',
  'productionReadyClaimed',
  'releaseReadyClaimed',
  'deployReadyClaimed',
  'cutoverReadyClaimed',
  'fullPlanPackCompletedClaimed'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'endpoint',
  'locator',
  'runtimeLocator',
  'targetValue',
  'target_value',
  'queryText',
  'query_text',
  'requestBody',
  'request_body',
  'responseBody',
  'response_body',
  'commandText',
  'command_text',
  'commandOutput',
  'command_output',
  'environmentVariables',
  'environment_variables',
  'env',
  'filePath',
  'file_path',
  'filePaths',
  'file_paths',
  'path',
  'paths',
  'logLine',
  'log_line',
  'logLines',
  'log_lines',
  'processDetails',
  'process_details',
  'rawResponse',
  'raw_response',
  'rawOutput',
  'raw_output',
  'rawAudit',
  'raw_audit',
  'rawMemory',
  'raw_memory',
  'memoryContent',
  'memory_content',
  'fieldNames',
  'field_names',
  'memoryIds',
  'memory_ids',
  'rawJsonlRow',
  'rawSqliteRow',
  'providerPayload',
  'runtimeCommand',
  'token',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'secret',
  'credential',
  'approvalLine',
  'approvalLineValue',
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

function sortedUnique(values = []) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))].sort();
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

function missingTrueFlags(value, fields, prefix) {
  const actual = isPlainObject(value) ? value : {};
  return fields
    .filter(field => actual[field] !== true)
    .map(field => `${prefix}.${field}`);
}

function missingFields(value, fields, prefix) {
  const actual = isPlainObject(value) ? value : {};
  return fields
    .filter(field => !hasOwn(actual, field))
    .map(field => `${prefix}.${field}`);
}

function buildCounterBlockers(counters) {
  if (!isPlainObject(counters)) return COUNTER_FIELDS.map(field => `counters.${field}`);
  return COUNTER_FIELDS
    .filter(field => !Number.isInteger(counters[field]) || counters[field] !== 0)
    .map(field => `counters.${field}`);
}

function invalidPlatformReview(review) {
  if (!isPlainObject(review)) return ['platformReview'];
  const blockers = [];

  blockers.push(...missingFields(review, REQUIRED_REVIEW_FIELDS, 'platformReview'));

  if (review.reviewPrepared !== true) blockers.push('platformReview.reviewPrepared');
  if (!isSafeReferenceName(review.targetReferenceName)) blockers.push('platformReview.targetReferenceName');
  if (review.safeReferenceNameCategory !== REQUIRED_SAFE_REFERENCE_CATEGORY) {
    blockers.push('platformReview.safeReferenceNameCategory');
  }
  if (review.wslLinuxReceiptField !== REQUIRED_WSL_LINUX_RECEIPT_FIELD) {
    blockers.push('platformReview.wslLinuxReceiptField');
  }
  if (review.wslLinuxReceiptCategory !== REQUIRED_WSL_LINUX_RECEIPT_CATEGORY) {
    blockers.push('platformReview.wslLinuxReceiptCategory');
  }
  if (review.wslLinuxObservedCategory !== REQUIRED_EVIDENCE_MARKER) {
    blockers.push('platformReview.wslLinuxObservedCategory');
  }
  if (review.windowsWslSmokeReceiptField !== REQUIRED_WINDOWS_WSL_SMOKE_RECEIPT_FIELD) {
    blockers.push('platformReview.windowsWslSmokeReceiptField');
  }
  if (review.windowsWslSmokeReceiptCategory !== REQUIRED_WINDOWS_WSL_SMOKE_RECEIPT_CATEGORY) {
    blockers.push('platformReview.windowsWslSmokeReceiptCategory');
  }
  if (review.windowsWslSmokeObservedCategory !== REQUIRED_EVIDENCE_MARKER) {
    blockers.push('platformReview.windowsWslSmokeObservedCategory');
  }
  if (review.platformClassCategory !== REQUIRED_PLATFORM_CLASS_CATEGORY) {
    blockers.push('platformReview.platformClassCategory');
  }
  if (review.wslLinuxProofCategory !== REQUIRED_WSL_LINUX_PROOF_CATEGORY) {
    blockers.push('platformReview.wslLinuxProofCategory');
  }
  if (review.windowsWslSmokeCategory !== REQUIRED_WINDOWS_WSL_SMOKE_CATEGORY) {
    blockers.push('platformReview.windowsWslSmokeCategory');
  }
  if (review.smokeCommandCategory !== REQUIRED_SMOKE_COMMAND_CATEGORY) {
    blockers.push('platformReview.smokeCommandCategory');
  }
  for (const field of ['categoryOnly', 'lowDisclosureOnly']) {
    if (review[field] !== true) blockers.push(`platformReview.${field}`);
  }
  for (const field of [
    'endpointLocatorIncluded',
    'targetValueIncluded',
    'queryTextIncluded',
    'requestBodyIncluded',
    'responseBodyIncluded',
    'commandTextIncluded',
    'commandOutputIncluded',
    'environmentVariablesIncluded',
    'filePathsIncluded',
    'logLinesIncluded',
    'processDetailsIncluded',
    'memoryContentIncluded',
    'rawOutputIncluded',
    'rawAuditIncluded',
    'approvalLineIncluded',
    'acceptedAsCompletionEvidenceNow'
  ]) {
    if (review[field] !== false) blockers.push(`platformReview.${field}`);
  }

  return blockers;
}

function invalidProposedCompletionEvidence(evidence) {
  if (!isPlainObject(evidence)) return ['proposedCompletionEvidence'];
  const blockers = [];
  if (evidence.phase2PlatformProofReceiptReviewPassed !== true) {
    blockers.push('proposedCompletionEvidence.phase2PlatformProofReceiptReviewPassed');
  }
  if (evidence.wslLinuxProofPassed !== REQUIRED_EVIDENCE_MARKER) {
    blockers.push('proposedCompletionEvidence.wslLinuxProofPassed');
  }
  if (evidence.windowsWslSmokePassed !== REQUIRED_EVIDENCE_MARKER) {
    blockers.push('proposedCompletionEvidence.windowsWslSmokePassed');
  }
  for (const field of Object.keys(evidence)) {
    if (![
      'phase2PlatformProofReceiptReviewPassed',
      'wslLinuxProofPassed',
      'windowsWslSmokePassed'
    ].includes(field)) {
      blockers.push(`proposedCompletionEvidence.${field}`);
    }
  }
  return blockers;
}

function failure(reasonCode, extras = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    blockers: [],
    forbiddenFields: [],
    stopReasons: [],
    phase2PlatformProofReceiptReviewPassed: false,
    wslLinuxProofPassed: false,
    windowsWslSmokePassed: false,
    actualReceiptAccepted: false,
    receiptAppliedByThisContract: false,
    completionAuditPatchApplied: false,
    phase2Completed: false,
    runtimeCalled: false,
    liveNativeReadExecuted: false,
    nativeTargetBindingPerformed: false,
    fallbackReadExecuted: false,
    fallbackComparisonExecuted: false,
    commandExecuted: false,
    processInspected: false,
    serviceStartedOrStopped: false,
    responseBodyRead: false,
    rawOutputRead: false,
    rawAuditRead: false,
    memoryRead: false,
    realMemoryRead: false,
    rawPrivateStateRead: false,
    providerApiCalled: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    fullPlanPackCompleted: false,
    ...extras
  };
}

function evaluatePhase2PlatformProofReceiptReviewContract(input = {}) {
  if (!isPlainObject(input)) return failure('invalid_input');

  const forbiddenFields = sortedUnique(collectForbiddenFields(input));
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_or_overclaim_fields', { forbiddenFields });
  }

  const stopReasons = sortedUnique([
    ...collectStopFlags(input),
    ...buildCounterBlockers(input.counters)
  ]);
  if (stopReasons.length > 0) {
    return failure('stop_l4', { stopReasons });
  }

  if (input.schemaVersion !== SCHEMA_VERSION) return failure('invalid_schema_version');
  if (input.mode !== CONTRACT_MODE) return failure('invalid_mode');

  const blockers = [
    ...missingTrueFlags(input.prerequisites, REQUIRED_PREREQUISITES, 'prerequisites'),
    ...invalidPlatformReview(input.platformReview),
    ...invalidProposedCompletionEvidence(input.proposedCompletionEvidence)
  ];
  const accepted = blockers.length === 0;

  return {
    accepted,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: accepted
      ? 'phase2_platform_proof_receipt_review_accepted'
      : 'phase2_platform_proof_receipt_review_incomplete',
    blockers: sortedUnique(blockers),
    forbiddenFields: [],
    stopReasons: [],
    phase2PlatformProofReceiptReviewPassed: accepted,
    wslLinuxProofPassed: false,
    windowsWslSmokePassed: false,
    proposedCompletionEvidence: accepted
      ? {
        phase2PlatformProofReceiptReviewPassed: true,
        wslLinuxProofPassed: REQUIRED_EVIDENCE_MARKER,
        windowsWslSmokePassed: REQUIRED_EVIDENCE_MARKER,
        platformProofAcceptedAsCompletionEvidenceNow: false
      }
      : null,
    receiptReviewBoundary: {
      safeReferenceNameOnly: true,
      targetReferenceName: isSafeReferenceName(input.platformReview?.targetReferenceName)
        ? input.platformReview.targetReferenceName
        : null,
      exactAuthorizedWslLinuxProofStillRequired: true,
      exactAuthorizedWindowsWslSmokeStillRequired: true,
      localReviewSatisfiesWslLinuxProofPassed: false,
      localReviewSatisfiesWindowsWslSmokePassed: false,
      platformClassCategory: input.platformReview?.platformClassCategory || null,
      wslLinuxProofCategory: input.platformReview?.wslLinuxProofCategory || null,
      windowsWslSmokeCategory: input.platformReview?.windowsWslSmokeCategory || null,
      smokeCommandCategory: input.platformReview?.smokeCommandCategory || null,
      endpointLocatorDisclosed: false,
      targetValueDisclosed: false,
      queryTextDisclosed: false,
      requestBodyDisclosed: false,
      responseBodyConsumed: false,
      commandTextDisclosed: false,
      commandOutputConsumed: false,
      environmentVariablesDisclosed: false,
      filePathsDisclosed: false,
      logLinesDisclosed: false,
      processDetailsDisclosed: false,
      memoryContentDisclosed: false,
      rawOutputConsumed: false,
      rawAuditConsumed: false,
      approvalLineAccepted: false,
      callsRuntime: false,
      executesCommand: false,
      inspectsProcess: false,
      startsOrStopsService: false,
      executesNativeRead: false,
      executesFallbackRead: false,
      comparesFallbackWithNative: false,
      appliesReceiptToCompletionAudit: false,
      completesPhase2: false,
      claimsReadiness: false
    },
    actualReceiptAccepted: false,
    receiptAppliedByThisContract: false,
    completionAuditPatchApplied: false,
    phase2Completed: false,
    runtimeCalled: false,
    liveNativeReadExecuted: false,
    nativeTargetBindingPerformed: false,
    fallbackReadExecuted: false,
    fallbackComparisonExecuted: false,
    commandExecuted: false,
    processInspected: false,
    serviceStartedOrStopped: false,
    responseBodyRead: false,
    rawOutputRead: false,
    rawAuditRead: false,
    memoryRead: false,
    realMemoryRead: false,
    rawPrivateStateRead: false,
    providerApiCalled: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    fullPlanPackCompleted: false,
    nextGate: accepted
      ? 'collect_exact_authorized_wsl_linux_and_windows_wsl_smoke_receipts_before_marking_platform_proof_fields'
      : 'repair_platform_proof_receipt_review_without_command_output_paths_logs_or_runtime_values'
  };
}

module.exports = {
  CONTRACT_MODE,
  CONTRACT_NAME,
  COUNTER_FIELDS,
  REQUIRED_PLATFORM_CLASS_CATEGORY,
  REQUIRED_PREREQUISITES,
  REQUIRED_SAFE_REFERENCE_CATEGORY,
  REQUIRED_SMOKE_COMMAND_CATEGORY,
  REQUIRED_WINDOWS_WSL_SMOKE_CATEGORY,
  REQUIRED_WINDOWS_WSL_SMOKE_RECEIPT_CATEGORY,
  REQUIRED_WINDOWS_WSL_SMOKE_RECEIPT_FIELD,
  REQUIRED_WSL_LINUX_PROOF_CATEGORY,
  REQUIRED_WSL_LINUX_RECEIPT_CATEGORY,
  REQUIRED_WSL_LINUX_RECEIPT_FIELD,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluatePhase2PlatformProofReceiptReviewContract
};
