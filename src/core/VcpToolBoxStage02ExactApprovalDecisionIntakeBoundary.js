'use strict';

const { isSafeReferenceName } = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpToolBoxStage02ExactApprovalDecisionIntakeBoundary';
const CONTRACT_MODE = 'fixture_stage_02_exact_approval_decision_intake_boundary_only';
const OPERATOR_DECISION = 'prepare_exact_approval_decision_intake_no_approval_no_runtime';

const DECISION_INTAKE_DECISIONS = Object.freeze({
  APPROVE_REQUEST_INTAKE_READY: 'exact_approval_approve_request_intake_ready',
  REJECT_INTAKE_READY: 'exact_approval_reject_intake_ready',
  NEEDS_ADJUSTMENT_INTAKE_READY: 'exact_approval_needs_adjustment_intake_ready',
  BLOCKED_NEEDS_REVIEW_BOUNDARY: 'blocked_needs_exact_approval_packet_review_boundary',
  BLOCKED_NEEDS_PACKET_PREFLIGHT: 'blocked_needs_exact_approval_packet_preflight',
  BLOCKED_NEEDS_DECISION_INTAKE_BOUNDARY: 'blocked_needs_exact_approval_decision_intake_boundary',
  BLOCKED_NEEDS_RECEIPT_PLAN: 'blocked_needs_receipt_plan',
  NEEDS_PLAN_ADJUSTMENT: 'needs_plan_adjustment'
});

const DECISION_OUTCOMES = Object.freeze({
  APPROVE_REQUESTED: 'approve_requested',
  REJECT: 'reject',
  NEEDS_ADJUSTMENT: 'needs_adjustment'
});

const ACCEPTED_STATUS_VALUES = Object.freeze([
  'PASSED',
  'COMPLETED_VALIDATED',
  'CM1704_RECEIPT_CONTRACT_PASSED',
  'CM-1704_RECEIPT_CONTRACT_PASSED',
  'CM1705_EXECUTION_BOUNDARY_PASSED',
  'CM-1705_EXECUTION_BOUNDARY_PASSED',
  'CM1707_PACKET_PREFLIGHT_PASSED',
  'CM-1707_PACKET_PREFLIGHT_PASSED',
  'CM1708_REVIEW_BOUNDARY_PASSED',
  'CM-1708_REVIEW_BOUNDARY_PASSED'
]);

const ACCEPTED_PROJECT_FINAL_GOAL_ANSWERS = Object.freeze([
  'serves_project_final_goal',
  'still_serves_project_final_goal',
  'yes'
]);

const ALLOWED_CURRENT_INTAKE_ACTIONS = Object.freeze([
  'sanitized_human_review_outcome_intake',
  'decision_route_classification',
  'receipt_plan_review',
  'no_approval_no_runtime_intake'
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
  approvalLinesStored: 0,
  approvalLinesGenerated: 0,
  approvalLinesValidated: 0,
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
  approvaltext: 'approval_line_or_private_approval_material',

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
  'allowedcurrentintakeactions',
  'allowedfutureruntimeactions',
  'approvalgrantstillforbidden',
  'approvalissuanceforbidden',
  'approvallineconsumeallowed',
  'approvallinegenerationallowed',
  'approvallinegenerated',
  'approvallineissueallowed',
  'approvallinepresent',
  'approvallinestoreallowed',
  'approvallinestored',
  'approvallinevalidateallowed',
  'approvallinevalidated',
  'approvallinevalueomitted',
  'approvalpacketid',
  'approvalpacketintent',
  'cm1704receiptcontractstatus',
  'cm1705boundarystatus',
  'cm1707preflightstatus',
  'cm1708reviewboundarystatus',
  'decisionoutcome',
  'exactapprovalrequired',
  'exactapprovalstillrequired',
  'futureapprovalrequestmaybeprepared',
  'futureexactapprovalrequestonly',
  'futurepacketonly',
  'humanreviewcompleted',
  'humanexactapprovalstillrequired',
  'lowdisclosureoutputpolicy',
  'maxruntimecalls',
  'maxruntimeprobeminutes',
  'maxtargetspecificruntimeinspections',
  'memorybudget',
  'packetpreflightpassed',
  'packetpreflightready',
  'planadjustmentrequired',
  'providerbudget',
  'reviewboundarypassed',
  'reviewerdecisioncangrantapproval',
  'runtimeauthorizationgranted',
  'runtimerouteopened',
  'sanitizedoutcomeonly',
  'targetscopesummarypresent',
  'principalscopesummarypresent',
  'profilescopesummarypresent',
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
  'runtimeRouteOpened',
  'approvalLineIssued',
  'approvalLineConsumed',
  'approvalLineStored',
  'approvalLineGenerated',
  'approvalLineValidated',
  'approvalLineGenerationAllowed',
  'approvalLineIssueAllowed',
  'approvalLineConsumeAllowed',
  'approvalLineStoreAllowed',
  'approvalLineValidateAllowed',
  'approvalLinePresent',
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

function isAcceptedStatus(value) {
  return ACCEPTED_STATUS_VALUES.includes(String(value || '').trim());
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

function hasExactlyAllowedActions(actualActions, allowedActions) {
  if (!Array.isArray(actualActions)) return false;
  const actual = [...new Set(actualActions)].sort();
  const expected = [...allowedActions].sort();
  return actual.length === expected.length &&
    expected.every((value, index) => actual[index] === value);
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

function validateCurrentIntakeEnvelope(envelope = {}) {
  const violations = [];
  if (!hasExactlyAllowedActions(envelope.allowedCurrentIntakeActions, ALLOWED_CURRENT_INTAKE_ACTIONS)) {
    violations.push('allowedCurrentIntakeActions');
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

function validatePacketPreflight(preflight = {}) {
  const violations = [];
  if (!isAcceptedStatus(preflight.cm1707PreflightStatus || preflight.status)) {
    violations.push('cm1707PreflightStatus');
  }
  if (preflight.packetPreflightReady !== true) violations.push('packetPreflightReady');
  if (preflight.futurePacketOnly !== true) violations.push('futurePacketOnly');
  if (preflight.approvalLinePresent !== false) violations.push('approvalLinePresent');
  if (preflight.approvalLineValueOmitted !== true) violations.push('approvalLineValueOmitted');
  if (preflight.runtimeAuthorizationGranted !== false) violations.push('runtimeAuthorizationGranted');
  return violations;
}

function validateReviewBoundary(boundary = {}) {
  const violations = [];
  if (!isAcceptedStatus(boundary.cm1708ReviewBoundaryStatus || boundary.status)) {
    violations.push('cm1708ReviewBoundaryStatus');
  }
  if (boundary.reviewBoundaryPassed !== true) violations.push('reviewBoundaryPassed');
  if (boundary.humanExactApprovalStillRequired !== true) violations.push('humanExactApprovalStillRequired');
  if (boundary.approvalGrantStillForbidden !== true) violations.push('approvalGrantStillForbidden');
  if (boundary.approvalLineGenerationAllowed !== false) violations.push('approvalLineGenerationAllowed');
  if (boundary.runtimeAuthorizationGranted !== false) violations.push('runtimeAuthorizationGranted');
  if (boundary.reviewerDecisionCanGrantApproval !== false) violations.push('reviewerDecisionCanGrantApproval');
  return violations;
}

function validateApprovalPacketCandidate(candidate = {}) {
  const violations = [];
  const requiredTrueFields = [
    'futurePacketOnly',
    'exactApprovalRequired',
    'packetPreflightPassed',
    'approvalLineValueOmitted',
    'targetScopeSummaryPresent',
    'principalScopeSummaryPresent',
    'profileScopeSummaryPresent',
    'lowDisclosureOutputPolicy'
  ];
  for (const field of requiredTrueFields) {
    if (candidate[field] !== true) violations.push(field);
  }
  if (candidate.runtimeAuthorizationGranted !== false) {
    violations.push('runtimeAuthorizationGranted');
  }
  if (candidate.approvalLinePresent !== false) {
    violations.push('approvalLinePresent');
  }
  if (candidate.approvalLineGenerated !== false && candidate.approvalLineGenerated !== undefined) {
    violations.push('approvalLineGenerated');
  }
  if (candidate.approvalLineStored !== false && candidate.approvalLineStored !== undefined) {
    violations.push('approvalLineStored');
  }
  if (candidate.approvalLineValidated !== false && candidate.approvalLineValidated !== undefined) {
    violations.push('approvalLineValidated');
  }
  if (!isSafeReferenceName(candidate.approvalPacketId || 'CM1709-APPROVAL-DECISION-INTAKE')) {
    violations.push('approvalPacketId');
  }
  if (candidate.approvalPacketIntent !== 'future_exact_approval_decision_intake_candidate_only') {
    violations.push('approvalPacketIntent');
  }
  return violations;
}

function validateDecisionOutcome(outcome = {}) {
  const violations = [];
  const decisionOutcome = String(outcome.decisionOutcome || '').trim();
  const knownOutcome = Object.values(DECISION_OUTCOMES).includes(decisionOutcome);

  if (!knownOutcome) violations.push('decisionOutcome');
  if (outcome.humanReviewCompleted !== true) violations.push('humanReviewCompleted');
  if (outcome.sanitizedOutcomeOnly !== true) violations.push('sanitizedOutcomeOnly');
  if (outcome.exactApprovalStillRequired !== true) violations.push('exactApprovalStillRequired');
  if (outcome.approvalLinePresent !== false) violations.push('approvalLinePresent');
  if (outcome.approvalLineValueOmitted !== true) violations.push('approvalLineValueOmitted');
  if (outcome.approvalLineGenerated !== false && outcome.approvalLineGenerated !== undefined) {
    violations.push('approvalLineGenerated');
  }
  if (outcome.approvalLineStored !== false && outcome.approvalLineStored !== undefined) {
    violations.push('approvalLineStored');
  }
  if (outcome.approvalLineValidated !== false && outcome.approvalLineValidated !== undefined) {
    violations.push('approvalLineValidated');
  }
  if (outcome.runtimeAuthorizationGranted !== false) violations.push('runtimeAuthorizationGranted');
  if (outcome.reviewerDecisionCanGrantApproval !== false) violations.push('reviewerDecisionCanGrantApproval');
  if (outcome.runtimeRouteOpened !== false) violations.push('runtimeRouteOpened');

  if (decisionOutcome === DECISION_OUTCOMES.APPROVE_REQUESTED) {
    if (outcome.futureExactApprovalRequestOnly !== true) violations.push('futureExactApprovalRequestOnly');
    if (outcome.futureApprovalRequestMayBePrepared !== true) violations.push('futureApprovalRequestMayBePrepared');
    if (outcome.planAdjustmentRequired === true) violations.push('planAdjustmentRequired');
  }
  if (decisionOutcome === DECISION_OUTCOMES.REJECT) {
    if (outcome.futureApprovalRequestMayBePrepared !== false) violations.push('futureApprovalRequestMayBePrepared');
    if (outcome.planAdjustmentRequired === true) violations.push('planAdjustmentRequired');
  }
  if (decisionOutcome === DECISION_OUTCOMES.NEEDS_ADJUSTMENT) {
    if (outcome.futureApprovalRequestMayBePrepared !== false) violations.push('futureApprovalRequestMayBePrepared');
    if (outcome.planAdjustmentRequired !== true) violations.push('planAdjustmentRequired');
  }

  return { decisionOutcome, violations };
}

function validateReceiptPlan(plan = {}) {
  const violations = [];
  if (!isAcceptedStatus(plan.cm1704ReceiptContractStatus || plan.status)) {
    violations.push('cm1704ReceiptContractStatus');
  }
  if (plan.referencesCm1704 !== true) violations.push('referencesCm1704');
  if (plan.lowDisclosureOnly !== true) violations.push('lowDisclosureOnly');
  if (plan.rawRuntimeOutputAllowed !== false) violations.push('rawRuntimeOutputAllowed');
  if (plan.rawMemoryAllowed !== false) violations.push('rawMemoryAllowed');
  if (plan.secretOrTokenOutputAllowed !== false) violations.push('secretOrTokenOutputAllowed');
  if (plan.readinessClaimAllowed !== false) violations.push('readinessClaimAllowed');
  return violations;
}

function decisionForOutcome(decisionOutcome) {
  if (decisionOutcome === DECISION_OUTCOMES.APPROVE_REQUESTED) {
    return DECISION_INTAKE_DECISIONS.APPROVE_REQUEST_INTAKE_READY;
  }
  if (decisionOutcome === DECISION_OUTCOMES.REJECT) {
    return DECISION_INTAKE_DECISIONS.REJECT_INTAKE_READY;
  }
  return DECISION_INTAKE_DECISIONS.NEEDS_ADJUSTMENT_INTAKE_READY;
}

function routeForOutcome(decisionOutcome) {
  if (decisionOutcome === DECISION_OUTCOMES.APPROVE_REQUESTED) {
    return 'future_exact_approval_request_may_be_prepared_no_approval_line_no_runtime';
  }
  if (decisionOutcome === DECISION_OUTCOMES.REJECT) {
    return 'review_rejected_runtime_route_closed_no_approval_line';
  }
  return 'return_to_plan_adjustment_no_approval_line_no_runtime';
}

function buildRejectedResult(decision, reasonCode, details = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    operatorDecision: OPERATOR_DECISION,
    decision,
    reasonCode,
    decisionRoute: 'blocked_no_approval_line_no_runtime',
    boundaryStatus: 'blocked_no_approval_line_no_runtime',
    alignment: details.alignment || {},
    reviewBoundary: details.reviewBoundary || {},
    packetPreflight: details.packetPreflight || {},
    approvalPacketCandidate: details.approvalPacketCandidate || {},
    decisionOutcome: details.decisionOutcome || {},
    currentIntakeEnvelope: details.currentIntakeEnvelope || {},
    futureExecutionBoundary: details.futureExecutionBoundary || {},
    receiptPlan: details.receiptPlan || {},
    unsafeFieldCategories: details.unsafeFieldCategories || [],
    unsafeFieldCount: details.unsafeFieldCount || 0,
    forbiddenTrueFlags: details.forbiddenTrueFlags || [],
    reviewBoundaryViolations: details.reviewBoundaryViolations || [],
    packetPreflightViolations: details.packetPreflightViolations || [],
    packetCandidateViolations: details.packetCandidateViolations || [],
    decisionOutcomeViolations: details.decisionOutcomeViolations || [],
    envelopeViolations: details.envelopeViolations || [],
    futureBoundaryViolations: details.futureBoundaryViolations || [],
    receiptPlanViolations: details.receiptPlanViolations || [],
    counterViolations: details.counterViolations || [],
    localSafeCounters: details.localSafeCounters || ZERO_COUNTERS,
    approvalLineIssued: false,
    approvalLineConsumed: false,
    approvalLineStored: false,
    approvalLineGenerated: false,
    approvalLineValidated: false,
    approvalLineValueIncluded: false,
    runtimeAuthorizationGranted: false,
    runtimeRouteOpened: false,
    runtimeAlreadyExecuted: false,
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

function buildVcpToolBoxStage02ExactApprovalDecisionIntakeBoundary(input = {}) {
  const { unsafeFieldCategories, unsafeFieldCount } = collectUnsafeFieldCategories(input);
  const forbiddenTrueFlags = collectForbiddenTrueFlags(input);
  const counterResult = validateCounters(input.counters || {});
  const reviewBoundaryViolations = validateReviewBoundary(input.reviewBoundary || {});
  const packetPreflightViolations = validatePacketPreflight(input.packetPreflight || {});
  const packetCandidateViolations = validateApprovalPacketCandidate(input.approvalPacketCandidate || {});
  const decisionOutcomeResult = validateDecisionOutcome(input.decisionOutcome || {});
  const envelopeViolations = validateCurrentIntakeEnvelope(input.currentIntakeEnvelope || {});
  const futureBoundaryViolations = validateFutureExecutionBoundary(input.futureExecutionBoundary || {});
  const receiptPlanViolations = validateReceiptPlan(input.receiptPlan || {});

  const masterReference = firstSafeReference([
    input.masterTaskbookReference,
    input.masterTaskbookId
  ]);
  const stage02Reference = firstSafeReference([
    input.stage02Reference,
    input.stage02Id
  ]);
  const versionReference = firstSafeReference([
    input.versionReference,
    input.versionId
  ]);

  const stage02GoalAligned = input.stage02Alignment &&
    input.stage02Alignment.stageGoalServesMaster === true &&
    input.stage02Alignment.projectFinalGoalServed === true &&
    input.stage02Alignment.currentDecisionIntakeOnly === true;

  const reviewAnswer = input.review && input.review.projectFinalGoalAnswer;
  const reviewAccepted = input.review &&
    input.review.projectFinalGoalServed === true &&
    ACCEPTED_PROJECT_FINAL_GOAL_ANSWERS.includes(String(reviewAnswer || '').trim());

  const alignment = {
    masterReference,
    stage02Reference,
    versionReference,
    projectFinalGoalServed: input.projectFinalGoalServed === true,
    stage02GoalAligned,
    reviewBoundaryPassed: reviewBoundaryViolations.length === 0,
    packetPreflightPassed: packetPreflightViolations.length === 0,
    futureExecutionBoundaryReady: futureBoundaryViolations.length === 0,
    approvalPacketCandidateReady: packetCandidateViolations.length === 0,
    decisionOutcomeReady: decisionOutcomeResult.violations.length === 0,
    receiptPlanReady: receiptPlanViolations.length === 0,
    currentIntakeEnvelopeReady: envelopeViolations.length === 0,
    projectFinalGoalReviewAccepted: reviewAccepted,
    missingAlignmentFields: []
  };

  if (!masterReference) alignment.missingAlignmentFields.push('master_reference_or_id');
  if (!stage02Reference) alignment.missingAlignmentFields.push('stage02_reference_or_id');
  if (!versionReference) alignment.missingAlignmentFields.push('version_reference_or_id');
  if (input.projectFinalGoalServed !== true) alignment.missingAlignmentFields.push('projectFinalGoalServed');
  if (!stage02GoalAligned) alignment.missingAlignmentFields.push('stage02Alignment');
  if (!reviewAccepted) alignment.missingAlignmentFields.push('projectFinalGoalReview');

  const reviewBoundary = {
    statusPassed: reviewBoundaryViolations.length === 0,
    reviewBoundaryPassed: input.reviewBoundary && input.reviewBoundary.reviewBoundaryPassed === true,
    humanExactApprovalStillRequired: input.reviewBoundary && input.reviewBoundary.humanExactApprovalStillRequired === true,
    approvalGrantStillForbidden: input.reviewBoundary && input.reviewBoundary.approvalGrantStillForbidden === true,
    approvalLineGenerationAllowed: false,
    runtimeAuthorizationGranted: false,
    reviewerDecisionCanGrantApproval: false
  };

  const packetPreflight = {
    statusPassed: packetPreflightViolations.length === 0,
    packetPreflightReady: input.packetPreflight && input.packetPreflight.packetPreflightReady === true,
    futurePacketOnly: input.packetPreflight && input.packetPreflight.futurePacketOnly === true,
    approvalLinePresent: false,
    approvalLineValueIncluded: false,
    runtimeAuthorizationGranted: false
  };

  const approvalPacketCandidate = {
    futurePacketOnly: input.approvalPacketCandidate && input.approvalPacketCandidate.futurePacketOnly === true,
    exactApprovalRequired: input.approvalPacketCandidate && input.approvalPacketCandidate.exactApprovalRequired === true,
    packetPreflightPassed: input.approvalPacketCandidate && input.approvalPacketCandidate.packetPreflightPassed === true,
    approvalLinePresent: false,
    approvalLineValueIncluded: false,
    approvalLineGenerated: false,
    approvalLineStored: false,
    approvalLineValidated: false,
    runtimeAuthorizationGranted: false,
    targetScopeSummaryPresent: input.approvalPacketCandidate && input.approvalPacketCandidate.targetScopeSummaryPresent === true,
    principalScopeSummaryPresent: input.approvalPacketCandidate && input.approvalPacketCandidate.principalScopeSummaryPresent === true,
    profileScopeSummaryPresent: input.approvalPacketCandidate && input.approvalPacketCandidate.profileScopeSummaryPresent === true,
    lowDisclosureOutputPolicy: input.approvalPacketCandidate && input.approvalPacketCandidate.lowDisclosureOutputPolicy === true
  };

  const decisionOutcome = {
    decisionOutcome: Object.values(DECISION_OUTCOMES).includes(decisionOutcomeResult.decisionOutcome)
      ? decisionOutcomeResult.decisionOutcome
      : null,
    humanReviewCompleted: input.decisionOutcome && input.decisionOutcome.humanReviewCompleted === true,
    sanitizedOutcomeOnly: input.decisionOutcome && input.decisionOutcome.sanitizedOutcomeOnly === true,
    exactApprovalStillRequired: input.decisionOutcome && input.decisionOutcome.exactApprovalStillRequired === true,
    approvalLinePresent: false,
    approvalLineValueIncluded: false,
    approvalLineGenerated: false,
    approvalLineStored: false,
    approvalLineValidated: false,
    runtimeAuthorizationGranted: false,
    runtimeRouteOpened: false,
    reviewerDecisionCanGrantApproval: false,
    futureApprovalRequestMayBePrepared: input.decisionOutcome && input.decisionOutcome.futureApprovalRequestMayBePrepared === true,
    planAdjustmentRequired: input.decisionOutcome && input.decisionOutcome.planAdjustmentRequired === true
  };

  const commonDetails = {
    alignment,
    reviewBoundary,
    packetPreflight,
    approvalPacketCandidate,
    decisionOutcome,
    currentIntakeEnvelope: {
      allowedCurrentIntakeActions: Array.isArray(input.currentIntakeEnvelope && input.currentIntakeEnvelope.allowedCurrentIntakeActions)
        ? input.currentIntakeEnvelope.allowedCurrentIntakeActions.filter(action => ALLOWED_CURRENT_INTAKE_ACTIONS.includes(action))
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
    receiptPlan: {
      referencesCm1704: input.receiptPlan && input.receiptPlan.referencesCm1704 === true,
      lowDisclosureOnly: input.receiptPlan && input.receiptPlan.lowDisclosureOnly === true,
      rawRuntimeOutputAllowed: false,
      rawMemoryAllowed: false,
      secretOrTokenOutputAllowed: false,
      readinessClaimAllowed: false
    },
    unsafeFieldCategories,
    unsafeFieldCount,
    forbiddenTrueFlags,
    reviewBoundaryViolations,
    packetPreflightViolations,
    packetCandidateViolations,
    decisionOutcomeViolations: decisionOutcomeResult.violations,
    envelopeViolations,
    futureBoundaryViolations,
    receiptPlanViolations,
    counterViolations: counterResult.violations,
    localSafeCounters: counterResult.normalized
  };

  if (unsafeFieldCount > 0) {
    return buildRejectedResult(
      DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE_BOUNDARY,
      'unsafe_sensitive_or_raw_fields_present',
      commonDetails
    );
  }

  if (alignment.missingAlignmentFields.length > 0) {
    return buildRejectedResult(
      DECISION_INTAKE_DECISIONS.NEEDS_PLAN_ADJUSTMENT,
      'master_stage_version_or_project_final_goal_review_missing',
      commonDetails
    );
  }

  if (reviewBoundaryViolations.length > 0) {
    return buildRejectedResult(
      DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_REVIEW_BOUNDARY,
      'cm1708_review_boundary_missing_or_unverified',
      commonDetails
    );
  }

  if (packetPreflightViolations.length > 0) {
    return buildRejectedResult(
      DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_PACKET_PREFLIGHT,
      'cm1707_packet_preflight_missing_or_unverified',
      commonDetails
    );
  }

  if (futureBoundaryViolations.length > 0) {
    return buildRejectedResult(
      DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE_BOUNDARY,
      'cm1705_future_execution_boundary_missing_or_expanded',
      commonDetails
    );
  }

  if (receiptPlanViolations.length > 0) {
    return buildRejectedResult(
      DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_RECEIPT_PLAN,
      'cm1704_receipt_plan_missing_or_unsafe',
      commonDetails
    );
  }

  if (packetCandidateViolations.length > 0) {
    return buildRejectedResult(
      DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE_BOUNDARY,
      'approval_packet_candidate_missing_or_unsafe',
      commonDetails
    );
  }

  if (decisionOutcomeResult.violations.length > 0) {
    return buildRejectedResult(
      DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE_BOUNDARY,
      'decision_outcome_missing_unknown_or_unsafe',
      commonDetails
    );
  }

  if (envelopeViolations.length > 0) {
    return buildRejectedResult(
      DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE_BOUNDARY,
      'current_decision_intake_envelope_expanded_or_incomplete',
      commonDetails
    );
  }

  if (forbiddenTrueFlags.length > 0) {
    return buildRejectedResult(
      DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE_BOUNDARY,
      'forbidden_execution_authorization_or_claim_present',
      commonDetails
    );
  }

  if (counterResult.violations.length > 0) {
    return buildRejectedResult(
      DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE_BOUNDARY,
      'pre_intake_counter_violation',
      commonDetails
    );
  }

  const acceptedDecision = decisionForOutcome(decisionOutcomeResult.decisionOutcome);
  const decisionRoute = routeForOutcome(decisionOutcomeResult.decisionOutcome);

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    operatorDecision: OPERATOR_DECISION,
    decision: acceptedDecision,
    reasonCode: `${decisionOutcomeResult.decisionOutcome}_intake_ready_no_approval_line_no_runtime`,
    decisionRoute,
    boundaryStatus: 'decision_intake_ready_no_approval_line_no_runtime_execution',
    alignment,
    reviewBoundary,
    packetPreflight,
    approvalPacketCandidate,
    decisionOutcome,
    currentIntakeEnvelope: commonDetails.currentIntakeEnvelope,
    futureExecutionBoundary: commonDetails.futureExecutionBoundary,
    receiptPlan: commonDetails.receiptPlan,
    unsafeFieldCategories,
    unsafeFieldCount,
    forbiddenTrueFlags,
    reviewBoundaryViolations,
    packetPreflightViolations,
    packetCandidateViolations,
    decisionOutcomeViolations: decisionOutcomeResult.violations,
    envelopeViolations,
    futureBoundaryViolations,
    receiptPlanViolations,
    counterViolations: counterResult.violations,
    localSafeCounters: counterResult.normalized,
    approvalLineIssued: false,
    approvalLineConsumed: false,
    approvalLineStored: false,
    approvalLineGenerated: false,
    approvalLineValidated: false,
    approvalLineValueIncluded: false,
    runtimeAuthorizationGranted: false,
    runtimeRouteOpened: false,
    runtimeAlreadyExecuted: false,
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
  ALLOWED_CURRENT_INTAKE_ACTIONS,
  ALLOWED_FUTURE_RUNTIME_ACTIONS,
  CONTRACT_MODE,
  CONTRACT_NAME,
  DECISION_INTAKE_DECISIONS,
  DECISION_OUTCOMES,
  MAX_FUTURE_RUNTIME_CALLS,
  MAX_FUTURE_RUNTIME_PROBE_MINUTES,
  MAX_FUTURE_TARGET_SPECIFIC_RUNTIME_INSPECTIONS,
  OPERATOR_DECISION,
  ZERO_COUNTERS,
  buildVcpToolBoxStage02ExactApprovalDecisionIntakeBoundary
};
