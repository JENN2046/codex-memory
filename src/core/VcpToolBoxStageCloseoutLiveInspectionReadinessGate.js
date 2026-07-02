'use strict';

const { isSafeReferenceName } = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpToolBoxStageCloseoutLiveInspectionReadinessGate';
const CONTRACT_MODE = 'fixture_stage_closeout_live_inspection_readiness_gate_only';
const OPERATOR_DECISION = 'prepare_stage_02_exact_approved_live_inspection_readiness_no_runtime';

const READINESS_DECISIONS = Object.freeze({
  STAGE_02_GATE_PREPARED: 'stage_02_exact_approval_readiness_gate_prepared',
  BLOCKED_NEEDS_STAGE_01_CLOSEOUT: 'blocked_needs_stage_01_closeout',
  BLOCKED_NEEDS_EXACT_APPROVAL_BOUNDARY: 'blocked_needs_exact_approval_boundary',
  NEEDS_PLAN_ADJUSTMENT: 'needs_plan_adjustment'
});

const REQUIRED_STAGE_01_VERSIONS = Object.freeze([
  'CM-1701',
  'CM-1702',
  'CM-1704',
  'CM-1705'
]);

const REQUIRED_PRIOR_EVIDENCE_KEYS = Object.freeze([
  'CM-1701',
  'CM-1702',
  'CM-1704',
  'CM-1705'
]);

const ACCEPTED_STATUS_VALUES = Object.freeze([
  'PASSED',
  'COMPLETED_VALIDATED',
  'CM1701_BOUNDARY_REVIEW_PASSED',
  'CM-1701_BOUNDARY_REVIEW_PASSED',
  'CM1702_COMMANDER_GO_NO_GO_PASSED',
  'CM-1702_COMMANDER_GO_NO_GO_PASSED',
  'CM1704_RECEIPT_CONTRACT_PASSED',
  'CM-1704_RECEIPT_CONTRACT_PASSED',
  'CM1705_EXECUTION_BOUNDARY_PASSED',
  'CM-1705_EXECUTION_BOUNDARY_PASSED'
]);

const ACCEPTED_STAGE_01_CLOSEOUT_STATUSES = Object.freeze([
  'PASSED',
  'STAGE_01_CLOSEOUT_PREPARED',
  'STAGE_01_CLOSED_OUT',
  'CM1706_STAGE_01_CLOSEOUT_PREPARED',
  'CM-1706_STAGE_01_CLOSEOUT_PREPARED'
]);

const ACCEPTED_PROJECT_FINAL_GOAL_ANSWERS = Object.freeze([
  'serves_project_final_goal',
  'still_serves_project_final_goal',
  'yes'
]);

const ALLOWED_CURRENT_GATE_ACTIONS = Object.freeze([
  'stage_01_closeout_review',
  'stage_02_exact_approval_readiness_gate',
  'no_runtime_review'
]);

const ALLOWED_FUTURE_RUNTIME_ACTIONS = Object.freeze([
  'target_presence_probe',
  'runtime_handshake_probe',
  'target_specific_no_memory_inspection'
]);

const MAX_FUTURE_RUNTIME_CALLS = 3;
const MAX_FUTURE_RUNTIME_PROBE_MINUTES = 10;
const MAX_FUTURE_TARGET_SPECIFIC_RUNTIME_INSPECTIONS = 1;

const ZERO_COUNTERS = Object.freeze({
  runtimeCalls: 0,
  targetSpecificRuntimeInspections: 0,
  liveVcpToolBoxCalls: 0,
  targetDiscoveryCalls: 0,
  processProbes: 0,
  portProbes: 0,
  memoryReads: 0,
  memoryWrites: 0,
  durableMemoryWrites: 0,
  providerApiCalls: 0,
  publicMcpExpansions: 0,
  startupWatchdogConfigMutations: 0,
  configEnvReads: 0,
  envFileReads: 0,
  secretReads: 0,
  rawRuntimeResponsesRead: 0,
  rawMemoryReads: 0,
  rawProviderResponsesRead: 0,
  approvalLinesIssued: 0,
  approvalLinesConsumed: 0,
  readinessClaims: 0,
  cutoverClaims: 0,
  pushes: 0,
  pullRequests: 0,
  releases: 0,
  deploys: 0,
  completeV8Claims: 0
});

const FIELD_CATEGORY_BY_NORMALIZED_NAME = Object.freeze({
  path: 'locator_endpoint_or_path',
  filepath: 'locator_endpoint_or_path',
  absolutepath: 'locator_endpoint_or_path',
  targetpath: 'locator_endpoint_or_path',
  locatorvalue: 'locator_endpoint_or_path',
  endpoint: 'locator_endpoint_or_path',
  url: 'locator_endpoint_or_path',
  baseurl: 'locator_endpoint_or_path',
  port: 'locator_endpoint_or_path',
  host: 'locator_endpoint_or_path',
  process: 'runtime_process_or_log_detail',
  processid: 'runtime_process_or_log_detail',
  pid: 'runtime_process_or_log_detail',
  processdetails: 'runtime_process_or_log_detail',
  runtimelog: 'runtime_process_or_log_detail',
  runtimelogs: 'runtime_process_or_log_detail',
  runtimeconfig: 'secret_config_private_state',

  env: 'secret_config_private_state',
  envfile: 'secret_config_private_state',
  configenv: 'secret_config_private_state',
  configenvpath: 'secret_config_private_state',
  privatestate: 'secret_config_private_state',
  privateruntimestate: 'secret_config_private_state',
  credential: 'secret_config_private_state',
  credentials: 'secret_config_private_state',
  cookie: 'secret_config_private_state',
  token: 'secret_config_private_state',
  bearertoken: 'secret_config_private_state',
  apikey: 'secret_config_private_state',
  providerapikey: 'secret_config_private_state',
  secret: 'secret_config_private_state',
  sharedsecret: 'secret_config_private_state',
  privatekey: 'secret_config_private_state',
  password: 'secret_config_private_state',

  exactapprovalline: 'approval_line_or_private_approval_material',
  approvalline: 'approval_line_or_private_approval_material',
  approvallinevalue: 'approval_line_or_private_approval_material',
  approvaltoken: 'approval_line_or_private_approval_material',
  approvaltokenvalue: 'approval_line_or_private_approval_material',
  approvalphrase: 'approval_line_or_private_approval_material',

  rawruntimeresponse: 'raw_memory_or_runtime_output',
  runtimeresponse: 'raw_memory_or_runtime_output',
  rawruntimeoutput: 'raw_memory_or_runtime_output',
  rawmemory: 'raw_memory_or_runtime_output',
  rawmemorycontent: 'raw_memory_or_runtime_output',
  rawdailynote: 'raw_memory_or_runtime_output',
  rawraginjectedcontext: 'raw_memory_or_runtime_output',
  rawvectorrows: 'raw_memory_or_runtime_output',
  rawprompt: 'raw_memory_or_runtime_output',
  rawconversation: 'raw_memory_or_runtime_output',
  sqlitecontent: 'raw_memory_or_runtime_output',
  jsonlcontent: 'raw_memory_or_runtime_output',
  cachecontent: 'raw_memory_or_runtime_output',

  providerresponse: 'provider_response',
  rawproviderresponse: 'provider_response',

  commit: 'commit_branch_or_expiry_value',
  commithash: 'commit_branch_or_expiry_value',
  branch: 'commit_branch_or_expiry_value',
  branchname: 'commit_branch_or_expiry_value',
  expiry: 'commit_branch_or_expiry_value',
  expiresat: 'commit_branch_or_expiry_value'
});

const SAFE_CONTROL_KEYS = new Set([
  'allowedcurrentgateactions',
  'allowedfutureruntimeactions',
  'approvalbindingpresent',
  'approvallinepresent',
  'approvallinevalueomitted',
  'exactapprovalrequired',
  'currentgateonly',
  'runtimeauthorizationgranted',
  'maxruntimecalls',
  'maxruntimeprobeminutes',
  'maxtargetspecificruntimeinspections',
  'memorybudget',
  'providerbudget',
  'writebudget'
]);

const FORBIDDEN_TRUE_FLAGS = Object.freeze([
  'runtimeAuthorizationGranted',
  'runtimeAlreadyExecuted',
  'liveInspectionAlreadyExecuted',
  'targetDiscoveryAlreadyExecuted',
  'targetPresenceProbeExecuted',
  'runtimeHandshakeProbeExecuted',
  'targetSpecificRuntimeInspectionExecuted',
  'approvalLineIssued',
  'approvalLineConsumed',
  'approvalLineValuesIncluded',
  'pathValuesIncluded',
  'endpointValuesIncluded',
  'tokenValuesIncluded',
  'secretValuesIncluded',
  'rawRuntimeOutputIncluded',
  'rawMemoryIncluded',
  'providerResponsesIncluded',
  'runtimeAuthorizationExpanded',
  'memoryReadAllowed',
  'memoryWriteAllowed',
  'providerApiAllowed',
  'publicMcpExpanded',
  'startupWatchdogConfigMutationAllowed',
  'readinessClaimed',
  'cutoverClaimed',
  'releaseClaimed',
  'deployClaimed',
  'pushPerformed',
  'pullRequestCreated',
  'completeV8Claimed'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeKey(value) {
  return String(value || '').replace(/[-_\s]/g, '').toLowerCase();
}

function isAcceptedStatus(value, acceptedValues = ACCEPTED_STATUS_VALUES) {
  return acceptedValues.includes(String(value || '').trim());
}

function safeReferenceOrNull(value) {
  return isSafeReferenceName(value) ? value : null;
}

function firstSafeReference(values) {
  for (const value of values) {
    const safe = safeReferenceOrNull(value);
    if (safe) return safe;
  }
  return null;
}

function collectUnsafeFieldCategories(value) {
  const categories = new Set();
  let unsafeFieldCount = 0;

  function visit(nested) {
    if (Array.isArray(nested)) {
      nested.forEach(visit);
      return;
    }
    if (!isPlainObject(nested)) return;

    for (const [key, nestedValue] of Object.entries(nested)) {
      const normalized = normalizeKey(key);
      if (!SAFE_CONTROL_KEYS.has(normalized)) {
        const category = FIELD_CATEGORY_BY_NORMALIZED_NAME[normalized];
        if (category) {
          categories.add(category);
          unsafeFieldCount += 1;
          continue;
        }
      }
      visit(nestedValue);
    }
  }

  visit(value);
  return {
    unsafeFieldCategories: [...categories].sort(),
    unsafeFieldCount
  };
}

function collectForbiddenTrueFlags(value) {
  const normalizedForbidden = new Map(
    FORBIDDEN_TRUE_FLAGS.map(flag => [normalizeKey(flag), flag])
  );
  const flags = new Set();

  function visit(nested) {
    if (Array.isArray(nested)) {
      nested.forEach(visit);
      return;
    }
    if (!isPlainObject(nested)) return;

    for (const [key, nestedValue] of Object.entries(nested)) {
      const canonical = normalizedForbidden.get(normalizeKey(key));
      if (canonical && nestedValue === true) {
        flags.add(canonical);
      }
      visit(nestedValue);
    }
  }

  visit(value);
  return [...flags].sort();
}

function extractVersionStatusMap(input) {
  const map = new Map();

  function setStatus(key, status) {
    const safeKey = safeReferenceOrNull(key);
    if (safeKey && typeof status === 'string') {
      map.set(safeKey, status);
    }
  }

  function visit(candidate) {
    if (Array.isArray(candidate)) {
      candidate.forEach(item => {
        if (isPlainObject(item)) {
          setStatus(item.id || item.versionId || item.version, item.status);
        }
      });
      return;
    }
    if (!isPlainObject(candidate)) return;

    for (const [key, value] of Object.entries(candidate)) {
      if (typeof value === 'string') {
        setStatus(key, value);
      } else if (isPlainObject(value)) {
        setStatus(value.id || value.versionId || key, value.status);
      }
    }
  }

  visit(input.stage01Closeout && input.stage01Closeout.versionStatuses);
  visit(input.stage01Closeout && input.stage01Closeout.versions);
  visit(input.priorEvidenceStatuses);
  return map;
}

function validateRequiredStatuses(statusMap, requiredKeys) {
  const missing = [];
  const failed = [];
  const passed = [];

  for (const requiredKey of requiredKeys) {
    const status = statusMap.get(requiredKey) || statusMap.get(requiredKey.replace('-', ''));
    if (!status) {
      missing.push(requiredKey);
    } else if (!isAcceptedStatus(status)) {
      failed.push(requiredKey);
    } else {
      passed.push(requiredKey);
    }
  }

  return { passed, missing, failed };
}

function hasExactlyAllowedActions(actualActions, allowedActions) {
  if (!Array.isArray(actualActions)) return false;
  const actual = [...new Set(actualActions)].sort();
  const expected = [...allowedActions].sort();
  return actual.length === expected.length &&
    expected.every((value, index) => actual[index] === value);
}

function validateCurrentGateEnvelope(envelope = {}) {
  const violations = [];
  if (!hasExactlyAllowedActions(envelope.allowedCurrentGateActions, ALLOWED_CURRENT_GATE_ACTIONS)) {
    violations.push('allowedCurrentGateActions');
  }

  const zeroBudgetFields = [
    'maxRuntimeCalls',
    'maxRuntimeProbeMinutes',
    'maxTargetSpecificRuntimeInspections',
    'memoryBudget',
    'providerBudget',
    'writeBudget'
  ];
  for (const field of zeroBudgetFields) {
    if (envelope[field] !== 0) violations.push(field);
  }

  return violations;
}

function validateFutureExecutionBoundary(boundary = {}) {
  const violations = [];
  if (!isAcceptedStatus(boundary.cm1705BoundaryStatus || boundary.status)) {
    violations.push('cm1705BoundaryStatus');
  }
  if (boundary.exactApprovalRequired !== true) {
    violations.push('exactApprovalRequired');
  }
  if (!hasExactlyAllowedActions(boundary.allowedFutureRuntimeActions, ALLOWED_FUTURE_RUNTIME_ACTIONS)) {
    violations.push('allowedFutureRuntimeActions');
  }
  if (boundary.maxRuntimeCalls !== MAX_FUTURE_RUNTIME_CALLS) {
    violations.push('maxRuntimeCalls');
  }
  if (boundary.maxRuntimeProbeMinutes !== MAX_FUTURE_RUNTIME_PROBE_MINUTES) {
    violations.push('maxRuntimeProbeMinutes');
  }
  if (boundary.maxTargetSpecificRuntimeInspections !== MAX_FUTURE_TARGET_SPECIFIC_RUNTIME_INSPECTIONS) {
    violations.push('maxTargetSpecificRuntimeInspections');
  }
  if (boundary.memoryBudget !== 0) violations.push('memoryBudget');
  if (boundary.providerBudget !== 0) violations.push('providerBudget');
  if (boundary.writeBudget !== 0) violations.push('writeBudget');
  return violations;
}

function validateCounters(counters = {}) {
  const normalized = {};
  const violations = [];
  for (const [key, expected] of Object.entries(ZERO_COUNTERS)) {
    const value = counters[key] === undefined ? expected : counters[key];
    normalized[key] = value;
    if (value !== expected) violations.push(key);
  }
  return { normalized, violations };
}

function buildRejectedResult(decision, reasonCode, details = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    operatorDecision: OPERATOR_DECISION,
    decision,
    reasonCode,
    boundaryStatus: 'blocked_no_runtime_execution',
    alignment: details.alignment || {},
    stage01Closeout: details.stage01Closeout || {},
    stage02Readiness: details.stage02Readiness || {},
    currentGateEnvelope: details.currentGateEnvelope || {},
    futureExecutionBoundary: details.futureExecutionBoundary || {},
    unsafeFieldCategories: details.unsafeFieldCategories || [],
    unsafeFieldCount: details.unsafeFieldCount || 0,
    forbiddenTrueFlags: details.forbiddenTrueFlags || [],
    envelopeViolations: details.envelopeViolations || [],
    futureBoundaryViolations: details.futureBoundaryViolations || [],
    counterViolations: details.counterViolations || [],
    localSafeCounters: details.localSafeCounters || ZERO_COUNTERS,
    runtimeAlreadyExecuted: false,
    runtimeAuthorizationGranted: false,
    approvalLineValueIncluded: false,
    readinessClaimed: false,
    completeV8Claimed: false,
    disclosurePolicy: {
      lowDisclosureOnly: true,
      locatorValuesIncluded: false,
      tokenValuesIncluded: false,
      secretValuesIncluded: false,
      approvalLineValueIncluded: false,
      rawRuntimeOutputIncluded: false,
      rawMemoryIncluded: false,
      providerResponsesIncluded: false
    }
  };
}

function buildVcpToolBoxStageCloseoutLiveInspectionReadinessGate(input = {}) {
  const { unsafeFieldCategories, unsafeFieldCount } = collectUnsafeFieldCategories(input);
  const forbiddenTrueFlags = collectForbiddenTrueFlags(input);
  const statusMap = extractVersionStatusMap(input);
  const stage01VersionStatus = validateRequiredStatuses(statusMap, REQUIRED_STAGE_01_VERSIONS);
  const priorEvidenceStatus = validateRequiredStatuses(statusMap, REQUIRED_PRIOR_EVIDENCE_KEYS);
  const counterResult = validateCounters(input.counters || {});
  const envelopeViolations = validateCurrentGateEnvelope(input.currentGateEnvelope || {});
  const futureBoundaryViolations = validateFutureExecutionBoundary(input.futureExecutionBoundary || {});

  const masterReference = firstSafeReference([
    input.masterTaskbookReference,
    input.masterTaskbookId
  ]);
  const stage01Reference = firstSafeReference([
    input.stage01Reference,
    input.stage01Id
  ]);
  const stage02Reference = firstSafeReference([
    input.stage02Reference,
    input.stage02Id
  ]);
  const versionReference = firstSafeReference([
    input.versionReference,
    input.versionId
  ]);

  const reviewAnswer = input.review && input.review.projectFinalGoalAnswer;
  const reviewAccepted = input.review &&
    input.review.projectFinalGoalServed === true &&
    ACCEPTED_PROJECT_FINAL_GOAL_ANSWERS.includes(String(reviewAnswer || '').trim());

  const stage01CloseoutStatus = input.stage01Closeout && input.stage01Closeout.status;
  const stage01CloseoutPassed = isAcceptedStatus(
    stage01CloseoutStatus,
    ACCEPTED_STAGE_01_CLOSEOUT_STATUSES
  );

  const stage02 = input.stage02Readiness || {};
  const stage02GoalAligned = stage02.stageGoalServesMaster === true &&
    stage02.projectFinalGoalServed === true &&
    stage02.currentGateOnly === true;
  const exactApprovalStillRequired = stage02.exactApprovalRequired === true &&
    stage02.approvalLineValueOmitted === true &&
    stage02.runtimeAuthorizationGranted === false;

  const alignment = {
    masterReference,
    stage01Reference,
    stage02Reference,
    versionReference,
    projectFinalGoalServed: input.projectFinalGoalServed === true,
    stage01CloseoutPassed,
    priorEvidencePassed: priorEvidenceStatus.missing.length === 0 && priorEvidenceStatus.failed.length === 0,
    stage02GoalAligned,
    exactApprovalStillRequired,
    currentGateEnvelopeReady: envelopeViolations.length === 0,
    futureExecutionBoundaryReady: futureBoundaryViolations.length === 0,
    projectFinalGoalReviewAccepted: reviewAccepted,
    missingAlignmentFields: []
  };

  if (!masterReference) alignment.missingAlignmentFields.push('master_reference_or_id');
  if (!stage01Reference) alignment.missingAlignmentFields.push('stage01_reference_or_id');
  if (!stage02Reference) alignment.missingAlignmentFields.push('stage02_reference_or_id');
  if (!versionReference) alignment.missingAlignmentFields.push('version_reference_or_id');
  if (input.projectFinalGoalServed !== true) alignment.missingAlignmentFields.push('projectFinalGoalServed');
  if (!reviewAccepted) alignment.missingAlignmentFields.push('projectFinalGoalReview');

  const stage01Closeout = {
    statusPassed: stage01CloseoutPassed,
    requiredVersions: [...REQUIRED_STAGE_01_VERSIONS],
    passedVersions: stage01VersionStatus.passed,
    missingVersions: stage01VersionStatus.missing,
    failedVersions: stage01VersionStatus.failed
  };

  const stage02Readiness = {
    stageGoalServesMaster: stage02.stageGoalServesMaster === true,
    projectFinalGoalServed: stage02.projectFinalGoalServed === true,
    currentGateOnly: stage02.currentGateOnly === true,
    exactApprovalRequired: stage02.exactApprovalRequired === true,
    runtimeAuthorizationGranted: false,
    approvalLineValueIncluded: false,
    stage02RuntimeReady: false
  };

  const commonDetails = {
    alignment,
    stage01Closeout,
    stage02Readiness,
    currentGateEnvelope: {
      allowedCurrentGateActions: Array.isArray(input.currentGateEnvelope && input.currentGateEnvelope.allowedCurrentGateActions)
        ? input.currentGateEnvelope.allowedCurrentGateActions.filter(action => ALLOWED_CURRENT_GATE_ACTIONS.includes(action))
        : [],
      maxRuntimeCalls: 0,
      maxRuntimeProbeMinutes: 0,
      maxTargetSpecificRuntimeInspections: 0,
      memoryBudget: 0,
      providerBudget: 0,
      writeBudget: 0
    },
    futureExecutionBoundary: {
      allowedFutureRuntimeActions: Array.isArray(input.futureExecutionBoundary && input.futureExecutionBoundary.allowedFutureRuntimeActions)
        ? input.futureExecutionBoundary.allowedFutureRuntimeActions.filter(action => ALLOWED_FUTURE_RUNTIME_ACTIONS.includes(action))
        : [],
      maxRuntimeCalls: MAX_FUTURE_RUNTIME_CALLS,
      maxRuntimeProbeMinutes: MAX_FUTURE_RUNTIME_PROBE_MINUTES,
      maxTargetSpecificRuntimeInspections: MAX_FUTURE_TARGET_SPECIFIC_RUNTIME_INSPECTIONS,
      memoryBudget: 0,
      providerBudget: 0,
      writeBudget: 0
    },
    unsafeFieldCategories,
    unsafeFieldCount,
    forbiddenTrueFlags,
    envelopeViolations,
    futureBoundaryViolations,
    counterViolations: counterResult.violations,
    localSafeCounters: counterResult.normalized
  };

  if (unsafeFieldCount > 0) {
    return buildRejectedResult(
      READINESS_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL_BOUNDARY,
      'unsafe_sensitive_or_raw_fields_present',
      commonDetails
    );
  }

  if (alignment.missingAlignmentFields.length > 0) {
    return buildRejectedResult(
      READINESS_DECISIONS.NEEDS_PLAN_ADJUSTMENT,
      'master_stage_version_or_project_final_goal_review_missing',
      commonDetails
    );
  }

  if (!stage01CloseoutPassed ||
      stage01VersionStatus.missing.length > 0 ||
      stage01VersionStatus.failed.length > 0) {
    return buildRejectedResult(
      READINESS_DECISIONS.BLOCKED_NEEDS_STAGE_01_CLOSEOUT,
      'stage_01_closeout_incomplete_or_unverified',
      commonDetails
    );
  }

  if (!alignment.priorEvidencePassed) {
    return buildRejectedResult(
      READINESS_DECISIONS.BLOCKED_NEEDS_STAGE_01_CLOSEOUT,
      'prior_stage_01_evidence_missing_or_failed',
      commonDetails
    );
  }

  if (!stage02GoalAligned || !exactApprovalStillRequired) {
    return buildRejectedResult(
      READINESS_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL_BOUNDARY,
      'stage_02_alignment_or_exact_approval_boundary_missing',
      commonDetails
    );
  }

  if (futureBoundaryViolations.length > 0) {
    return buildRejectedResult(
      READINESS_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL_BOUNDARY,
      'future_execution_boundary_missing_or_expanded',
      commonDetails
    );
  }

  if (envelopeViolations.length > 0) {
    return buildRejectedResult(
      READINESS_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL_BOUNDARY,
      'current_gate_envelope_expanded_or_incomplete',
      commonDetails
    );
  }

  if (forbiddenTrueFlags.length > 0) {
    return buildRejectedResult(
      READINESS_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL_BOUNDARY,
      'forbidden_execution_authorization_or_claim_present',
      commonDetails
    );
  }

  if (counterResult.violations.length > 0) {
    return buildRejectedResult(
      READINESS_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL_BOUNDARY,
      'pre_execution_counter_violation',
      commonDetails
    );
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    operatorDecision: OPERATOR_DECISION,
    decision: READINESS_DECISIONS.STAGE_02_GATE_PREPARED,
    reasonCode: 'stage_01_closed_stage_02_gate_prepared_no_runtime',
    boundaryStatus: 'stage_02_gate_prepared_no_runtime_execution',
    alignment,
    stage01Closeout,
    stage02Readiness,
    currentGateEnvelope: commonDetails.currentGateEnvelope,
    futureExecutionBoundary: commonDetails.futureExecutionBoundary,
    unsafeFieldCategories,
    unsafeFieldCount,
    forbiddenTrueFlags,
    envelopeViolations,
    futureBoundaryViolations,
    counterViolations: counterResult.violations,
    localSafeCounters: counterResult.normalized,
    runtimeAlreadyExecuted: false,
    runtimeAuthorizationGranted: false,
    approvalLineValueIncluded: false,
    readinessClaimed: false,
    completeV8Claimed: false,
    disclosurePolicy: {
      lowDisclosureOnly: true,
      locatorValuesIncluded: false,
      tokenValuesIncluded: false,
      secretValuesIncluded: false,
      approvalLineValueIncluded: false,
      rawRuntimeOutputIncluded: false,
      rawMemoryIncluded: false,
      providerResponsesIncluded: false
    }
  };
}

module.exports = {
  ACCEPTED_STAGE_01_CLOSEOUT_STATUSES,
  ALLOWED_CURRENT_GATE_ACTIONS,
  ALLOWED_FUTURE_RUNTIME_ACTIONS,
  CONTRACT_MODE,
  CONTRACT_NAME,
  MAX_FUTURE_RUNTIME_CALLS,
  MAX_FUTURE_RUNTIME_PROBE_MINUTES,
  OPERATOR_DECISION,
  READINESS_DECISIONS,
  REQUIRED_PRIOR_EVIDENCE_KEYS,
  REQUIRED_STAGE_01_VERSIONS,
  ZERO_COUNTERS,
  buildVcpToolBoxStageCloseoutLiveInspectionReadinessGate
};
