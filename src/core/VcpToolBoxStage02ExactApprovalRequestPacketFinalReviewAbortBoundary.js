'use strict';

const { isSafeReferenceName } = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary';
const CONTRACT_MODE = 'fixture_stage_02_exact_approval_request_packet_final_review_abort_boundary_only';
const OPERATOR_DECISION = 'prepare_exact_approval_request_packet_final_review_abort_no_approval_no_runtime';

const FINAL_REVIEW_ABORT_DECISIONS = Object.freeze({
  REQUEST_PACKET_FINAL_REVIEW_READY: 'exact_approval_request_packet_final_review_ready',
  REQUEST_PACKET_FINAL_REVIEW_ABORTED: 'exact_approval_request_packet_final_review_aborted',
  REQUEST_PACKET_FINAL_REVIEW_NEEDS_ADJUSTMENT: 'exact_approval_request_packet_final_review_needs_adjustment',
  BLOCKED_NEEDS_REQUEST_REVIEW_READINESS: 'blocked_needs_exact_approval_request_review_readiness',
  BLOCKED_NEEDS_REQUEST_SKELETON: 'blocked_needs_exact_approval_request_packet_skeleton',
  BLOCKED_NEEDS_DECISION_INTAKE: 'blocked_needs_exact_approval_decision_intake',
  BLOCKED_NEEDS_REVIEW_BOUNDARY: 'blocked_needs_exact_approval_packet_review_boundary',
  BLOCKED_NEEDS_PACKET_PREFLIGHT: 'blocked_needs_exact_approval_packet_preflight',
  BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY: 'blocked_needs_exact_approval_request_final_review_boundary',
  BLOCKED_NEEDS_RECEIPT_PLAN: 'blocked_needs_receipt_plan',
  NEEDS_PLAN_ADJUSTMENT: 'needs_plan_adjustment'
});

const FINAL_REVIEW_OUTCOMES = Object.freeze([
  'proceed_to_future_exact_approval_request',
  'abort_request_packet',
  'needs_adjustment'
]);

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
  'CM-1708_REVIEW_BOUNDARY_PASSED',
  'CM1709_DECISION_INTAKE_PASSED',
  'CM-1709_DECISION_INTAKE_PASSED',
  'CM1709_APPROVE_REQUEST_INTAKE_PASSED',
  'CM-1709_APPROVE_REQUEST_INTAKE_PASSED',
  'CM1710_REQUEST_PACKET_SKELETON_PASSED',
  'CM-1710_REQUEST_PACKET_SKELETON_PASSED',
  'CM1711_REQUEST_REVIEW_READINESS_PASSED',
  'CM-1711_REQUEST_REVIEW_READINESS_PASSED'
]);

const ACCEPTED_PROJECT_FINAL_GOAL_ANSWERS = Object.freeze([
  'serves_project_final_goal',
  'still_serves_project_final_goal',
  'yes'
]);

const ALLOWED_CURRENT_FINAL_REVIEW_ACTIONS = Object.freeze([
  'request_packet_review_readiness_status_review',
  'final_non_authorizing_route_check',
  'abort_or_adjustment_boundary_check',
  'no_approval_no_runtime_final_review'
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
  approvalLineTemplatesIncluded: 0,
  runtimeAuthorizationsGranted: 0,
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
  approvallinetemplate: 'approval_line_or_private_approval_material',
  approvallinetemplatevalue: 'approval_line_or_private_approval_material',

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
  'abortboundarypresent',
  'abortconditionsreviewed',
  'abortrequestpacket',
  'abortreasonsummarypresent',
  'adjustmentboundarypresent',
  'adjustmentsummarypresent',
  'allowedcurrentfinalreviewactions',
  'allowedfutureruntimeactions',
  'approvalgrantstillforbidden',
  'approvallineconsumeallowed',
  'approvallinegenerationallowed',
  'approvallinegenerated',
  'approvallineissueallowed',
  'approvallinepresent',
  'approvallinestoreallowed',
  'approvallinestored',
  'approvallinetemplateincluded',
  'approvallinetemplateomitted',
  'approvallinevalidateallowed',
  'approvallinevalidated',
  'approvallinevalueomitted',
  'cm1704receiptcontractstatus',
  'cm1705boundarystatus',
  'cm1707preflightstatus',
  'cm1708reviewboundarystatus',
  'cm1709decisionintakestatus',
  'cm1710requestskeletonstatus',
  'cm1711requestreviewreadinessstatus',
  'decisionoutcome',
  'exactapprovalrequired',
  'exactapprovalstillrequired',
  'finalreviewonly',
  'finalreviewoutcome',
  'futureapprovalrequestmaybeprepared',
  'futureexecutionboundaryreferencepresent',
  'futurerequestonly',
  'humanexactapprovalstillrequired',
  'lowdisclosureoutputpolicy',
  'maxruntimecalls',
  'maxruntimeprobeminutes',
  'maxtargetspecificruntimeinspections',
  'memorybudget',
  'needsadjustment',
  'noapprovallinestatementpresent',
  'nonauthorizing',
  'noruntimeexecutionstatementpresent',
  'packetpreflightready',
  'principalscopesummarypresent',
  'profilescopesummarypresent',
  'providerbudget',
  'receiptplanreviewed',
  'receiptplanreferencepresent',
  'requestreviewready',
  'requestskeletonready',
  'reviewboundarypassed',
  'riskreviewed',
  'runtimeauthorizationgranted',
  'runtimerouteopened',
  'scopeboundaryreviewed',
  'scopeboundarysummarypresent',
  'scopefinalized',
  'skeletononly',
  'targetscopesummarypresent',
  'validationplanreviewed',
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
  'approvalLineTemplateIncluded',
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

function validateRequestReviewReadiness(readiness = {}) {
  const violations = [];
  if (!isAcceptedStatus(readiness.cm1711RequestReviewReadinessStatus || readiness.status)) {
    violations.push('cm1711RequestReviewReadinessStatus');
  }
  if (readiness.requestReviewReady !== true) violations.push('requestReviewReady');
  if (readiness.nonAuthorizing !== true) violations.push('nonAuthorizing');
  if (readiness.exactApprovalStillRequired !== true) violations.push('exactApprovalStillRequired');
  if (readiness.approvalLinePresent !== false) violations.push('approvalLinePresent');
  if (readiness.approvalLineValueOmitted !== true) violations.push('approvalLineValueOmitted');
  if (readiness.approvalLineTemplateOmitted !== true) violations.push('approvalLineTemplateOmitted');
  if (readiness.runtimeAuthorizationGranted !== false) violations.push('runtimeAuthorizationGranted');
  if (readiness.runtimeRouteOpened !== false) violations.push('runtimeRouteOpened');
  return violations;
}

function validateRequestSkeleton(skeleton = {}) {
  const violations = [];
  if (!isAcceptedStatus(skeleton.cm1710RequestSkeletonStatus || skeleton.status)) {
    violations.push('cm1710RequestSkeletonStatus');
  }
  if (skeleton.requestSkeletonReady !== true) violations.push('requestSkeletonReady');
  if (skeleton.nonAuthorizing !== true) violations.push('nonAuthorizing');
  if (skeleton.exactApprovalStillRequired !== true) violations.push('exactApprovalStillRequired');
  if (skeleton.approvalLinePresent !== false) violations.push('approvalLinePresent');
  if (skeleton.approvalLineValueOmitted !== true) violations.push('approvalLineValueOmitted');
  if (skeleton.approvalLineTemplateOmitted !== true) violations.push('approvalLineTemplateOmitted');
  if (skeleton.runtimeAuthorizationGranted !== false) violations.push('runtimeAuthorizationGranted');
  if (skeleton.runtimeRouteOpened !== false) violations.push('runtimeRouteOpened');
  return violations;
}

function validateDecisionIntake(intake = {}) {
  const violations = [];
  if (!isAcceptedStatus(intake.cm1709DecisionIntakeStatus || intake.status)) {
    violations.push('cm1709DecisionIntakeStatus');
  }
  if (intake.decisionOutcome !== 'approve_requested') violations.push('decisionOutcome');
  if (intake.futureApprovalRequestMayBePrepared !== true) violations.push('futureApprovalRequestMayBePrepared');
  if (intake.exactApprovalStillRequired !== true) violations.push('exactApprovalStillRequired');
  if (intake.approvalLinePresent !== false) violations.push('approvalLinePresent');
  if (intake.approvalLineValueOmitted !== true) violations.push('approvalLineValueOmitted');
  if (intake.runtimeAuthorizationGranted !== false) violations.push('runtimeAuthorizationGranted');
  if (intake.runtimeRouteOpened !== false) violations.push('runtimeRouteOpened');
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
  return violations;
}

function validatePacketPreflight(preflight = {}) {
  const violations = [];
  if (!isAcceptedStatus(preflight.cm1707PreflightStatus || preflight.status)) {
    violations.push('cm1707PreflightStatus');
  }
  if (preflight.packetPreflightReady !== true) violations.push('packetPreflightReady');
  if (preflight.approvalLinePresent !== false) violations.push('approvalLinePresent');
  if (preflight.approvalLineValueOmitted !== true) violations.push('approvalLineValueOmitted');
  if (preflight.runtimeAuthorizationGranted !== false) violations.push('runtimeAuthorizationGranted');
  return violations;
}

function validateFinalReview(finalReview = {}) {
  const violations = [];
  if (!FINAL_REVIEW_OUTCOMES.includes(finalReview.finalReviewOutcome)) {
    violations.push('finalReviewOutcome');
  }
  for (const field of [
    'finalReviewOnly',
    'nonAuthorizing',
    'exactApprovalStillRequired',
    'humanExactApprovalStillRequired',
    'scopeBoundaryReviewed',
    'scopeBoundarySummaryPresent',
    'riskReviewed',
    'abortConditionsReviewed',
    'abortBoundaryPresent',
    'adjustmentBoundaryPresent',
    'validationPlanReviewed',
    'receiptPlanReviewed',
    'futureExecutionBoundaryReferencePresent',
    'noRuntimeExecutionStatementPresent',
    'noApprovalLineStatementPresent',
    'lowDisclosureOutputPolicy'
  ]) {
    if (finalReview[field] !== true) violations.push(field);
  }
  if (finalReview.approvalLinePresent !== false) violations.push('approvalLinePresent');
  if (finalReview.approvalLineTemplateIncluded !== false && finalReview.approvalLineTemplateIncluded !== undefined) {
    violations.push('approvalLineTemplateIncluded');
  }
  if (finalReview.approvalLineGenerated !== false && finalReview.approvalLineGenerated !== undefined) {
    violations.push('approvalLineGenerated');
  }
  if (finalReview.approvalLineStored !== false && finalReview.approvalLineStored !== undefined) {
    violations.push('approvalLineStored');
  }
  if (finalReview.approvalLineValidated !== false && finalReview.approvalLineValidated !== undefined) {
    violations.push('approvalLineValidated');
  }
  if (finalReview.runtimeAuthorizationGranted !== false) violations.push('runtimeAuthorizationGranted');
  if (finalReview.runtimeRouteOpened !== false) violations.push('runtimeRouteOpened');

  if (finalReview.finalReviewOutcome === 'proceed_to_future_exact_approval_request') {
    if (finalReview.futureApprovalRequestMayBePrepared !== true) violations.push('futureApprovalRequestMayBePrepared');
    if (finalReview.abortRequestPacket !== false) violations.push('abortRequestPacket');
    if (finalReview.needsAdjustment !== false) violations.push('needsAdjustment');
  } else if (finalReview.finalReviewOutcome === 'abort_request_packet') {
    if (finalReview.futureApprovalRequestMayBePrepared !== false) violations.push('futureApprovalRequestMayBePrepared');
    if (finalReview.abortRequestPacket !== true) violations.push('abortRequestPacket');
    if (finalReview.abortReasonSummaryPresent !== true) violations.push('abortReasonSummaryPresent');
    if (finalReview.needsAdjustment !== false) violations.push('needsAdjustment');
  } else if (finalReview.finalReviewOutcome === 'needs_adjustment') {
    if (finalReview.futureApprovalRequestMayBePrepared !== false) violations.push('futureApprovalRequestMayBePrepared');
    if (finalReview.abortRequestPacket !== false) violations.push('abortRequestPacket');
    if (finalReview.needsAdjustment !== true) violations.push('needsAdjustment');
    if (finalReview.adjustmentSummaryPresent !== true) violations.push('adjustmentSummaryPresent');
  }

  return violations;
}

function validateCurrentFinalReviewEnvelope(envelope = {}) {
  const violations = [];
  if (!hasExactlyAllowedActions(envelope.allowedCurrentFinalReviewActions, ALLOWED_CURRENT_FINAL_REVIEW_ACTIONS)) {
    violations.push('allowedCurrentFinalReviewActions');
  }
  for (const field of [
    'maxRuntimeCalls',
    'maxRuntimeProbeMinutes',
    'maxTargetSpecificRuntimeInspections',
    'memoryBudget',
    'providerBudget',
    'writeBudget'
  ]) {
    if (envelope[field] !== 0) violations.push(field);
  }
  return violations;
}

function validateFutureExecutionBoundary(boundary = {}) {
  const violations = [];
  if (!isAcceptedStatus(boundary.cm1705BoundaryStatus || boundary.status)) {
    violations.push('cm1705BoundaryStatus');
  }
  if (boundary.exactApprovalRequired !== true) violations.push('exactApprovalRequired');
  if (!hasExactlyAllowedActions(boundary.allowedFutureRuntimeActions, ALLOWED_FUTURE_RUNTIME_ACTIONS)) {
    violations.push('allowedFutureRuntimeActions');
  }
  if (boundary.maxRuntimeCalls !== MAX_FUTURE_RUNTIME_CALLS) violations.push('maxRuntimeCalls');
  if (boundary.maxRuntimeProbeMinutes !== MAX_FUTURE_RUNTIME_PROBE_MINUTES) violations.push('maxRuntimeProbeMinutes');
  if (boundary.maxTargetSpecificRuntimeInspections !== MAX_FUTURE_TARGET_SPECIFIC_RUNTIME_INSPECTIONS) {
    violations.push('maxTargetSpecificRuntimeInspections');
  }
  if (boundary.memoryBudget !== 0) violations.push('memoryBudget');
  if (boundary.providerBudget !== 0) violations.push('providerBudget');
  if (boundary.writeBudget !== 0) violations.push('writeBudget');
  return violations;
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

function buildRejectedResult(decision, reasonCode, details = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    operatorDecision: OPERATOR_DECISION,
    decision,
    reasonCode,
    requestRoute: 'blocked_no_approval_line_no_runtime',
    boundaryStatus: 'blocked_no_approval_line_no_runtime',
    finalReviewOutcome: null,
    futureApprovalRequestMayBePrepared: false,
    alignment: details.alignment || {},
    requestReviewReadiness: details.requestReviewReadiness || {},
    requestSkeleton: details.requestSkeleton || {},
    decisionIntake: details.decisionIntake || {},
    reviewBoundary: details.reviewBoundary || {},
    packetPreflight: details.packetPreflight || {},
    finalReview: details.finalReview || {},
    currentFinalReviewEnvelope: details.currentFinalReviewEnvelope || {},
    futureExecutionBoundary: details.futureExecutionBoundary || {},
    receiptPlan: details.receiptPlan || {},
    unsafeFieldCategories: details.unsafeFieldCategories || [],
    unsafeFieldCount: details.unsafeFieldCount || 0,
    forbiddenTrueFlags: details.forbiddenTrueFlags || [],
    requestReviewReadinessViolations: details.requestReviewReadinessViolations || [],
    requestSkeletonViolations: details.requestSkeletonViolations || [],
    decisionIntakeViolations: details.decisionIntakeViolations || [],
    reviewBoundaryViolations: details.reviewBoundaryViolations || [],
    packetPreflightViolations: details.packetPreflightViolations || [],
    finalReviewViolations: details.finalReviewViolations || [],
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
    approvalLineTemplateIncluded: false,
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
      approvalLineTemplateIncluded: false,
      approvalLineValueIncluded: false,
      rawRuntimeOutputIncluded: false,
      rawMemoryIncluded: false,
      providerResponsesIncluded: false
    }
  };
}

function sanitizeFinalReview(finalReview = {}) {
  return {
    finalReviewOnly: finalReview.finalReviewOnly === true,
    nonAuthorizing: finalReview.nonAuthorizing === true,
    finalReviewOutcome: FINAL_REVIEW_OUTCOMES.includes(finalReview.finalReviewOutcome)
      ? finalReview.finalReviewOutcome
      : null,
    futureApprovalRequestMayBePrepared: finalReview.futureApprovalRequestMayBePrepared === true,
    abortRequestPacket: finalReview.abortRequestPacket === true,
    needsAdjustment: finalReview.needsAdjustment === true,
    exactApprovalStillRequired: finalReview.exactApprovalStillRequired === true,
    humanExactApprovalStillRequired: finalReview.humanExactApprovalStillRequired === true,
    scopeBoundaryReviewed: finalReview.scopeBoundaryReviewed === true,
    riskReviewed: finalReview.riskReviewed === true,
    abortBoundaryPresent: finalReview.abortBoundaryPresent === true,
    adjustmentBoundaryPresent: finalReview.adjustmentBoundaryPresent === true,
    receiptPlanReviewed: finalReview.receiptPlanReviewed === true,
    validationPlanReviewed: finalReview.validationPlanReviewed === true,
    approvalLinePresent: false,
    approvalLineTemplateIncluded: false,
    approvalLineGenerated: false,
    approvalLineStored: false,
    approvalLineValidated: false,
    runtimeAuthorizationGranted: false,
    runtimeRouteOpened: false,
    lowDisclosureOutputPolicy: finalReview.lowDisclosureOutputPolicy === true
  };
}

function buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary(input = {}) {
  const { unsafeFieldCategories, unsafeFieldCount } = collectUnsafeFieldCategories(input);
  const forbiddenTrueFlags = collectForbiddenTrueFlags(input);
  const counterResult = validateCounters(input.counters || {});
  const requestReviewReadinessViolations = validateRequestReviewReadiness(input.requestReviewReadiness || {});
  const requestSkeletonViolations = validateRequestSkeleton(input.requestSkeleton || {});
  const decisionIntakeViolations = validateDecisionIntake(input.decisionIntake || {});
  const reviewBoundaryViolations = validateReviewBoundary(input.reviewBoundary || {});
  const packetPreflightViolations = validatePacketPreflight(input.packetPreflight || {});
  const finalReviewViolations = validateFinalReview(input.finalReview || {});
  const envelopeViolations = validateCurrentFinalReviewEnvelope(input.currentFinalReviewEnvelope || {});
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
    input.stage02Alignment.currentFinalReviewAbortOnly === true;

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
    requestReviewReadinessPassed: requestReviewReadinessViolations.length === 0,
    requestSkeletonPassed: requestSkeletonViolations.length === 0,
    decisionIntakePassed: decisionIntakeViolations.length === 0,
    reviewBoundaryPassed: reviewBoundaryViolations.length === 0,
    packetPreflightPassed: packetPreflightViolations.length === 0,
    finalReviewReady: finalReviewViolations.length === 0,
    futureExecutionBoundaryReady: futureBoundaryViolations.length === 0,
    receiptPlanReady: receiptPlanViolations.length === 0,
    currentFinalReviewEnvelopeReady: envelopeViolations.length === 0,
    projectFinalGoalReviewAccepted: reviewAccepted,
    missingAlignmentFields: []
  };

  if (!masterReference) alignment.missingAlignmentFields.push('master_reference_or_id');
  if (!stage02Reference) alignment.missingAlignmentFields.push('stage02_reference_or_id');
  if (!versionReference) alignment.missingAlignmentFields.push('version_reference_or_id');
  if (input.projectFinalGoalServed !== true) alignment.missingAlignmentFields.push('projectFinalGoalServed');
  if (!stage02GoalAligned) alignment.missingAlignmentFields.push('stage02Alignment');
  if (!reviewAccepted) alignment.missingAlignmentFields.push('projectFinalGoalReview');

  const commonDetails = {
    alignment,
    requestReviewReadiness: {
      statusPassed: requestReviewReadinessViolations.length === 0,
      requestReviewReady: input.requestReviewReadiness && input.requestReviewReadiness.requestReviewReady === true,
      nonAuthorizing: input.requestReviewReadiness && input.requestReviewReadiness.nonAuthorizing === true,
      exactApprovalStillRequired: input.requestReviewReadiness && input.requestReviewReadiness.exactApprovalStillRequired === true,
      approvalLinePresent: false,
      approvalLineTemplateIncluded: false,
      approvalLineValueIncluded: false,
      runtimeAuthorizationGranted: false,
      runtimeRouteOpened: false
    },
    requestSkeleton: {
      statusPassed: requestSkeletonViolations.length === 0,
      requestSkeletonReady: input.requestSkeleton && input.requestSkeleton.requestSkeletonReady === true,
      nonAuthorizing: input.requestSkeleton && input.requestSkeleton.nonAuthorizing === true,
      exactApprovalStillRequired: input.requestSkeleton && input.requestSkeleton.exactApprovalStillRequired === true,
      approvalLinePresent: false,
      approvalLineTemplateIncluded: false,
      approvalLineValueIncluded: false,
      runtimeAuthorizationGranted: false,
      runtimeRouteOpened: false
    },
    decisionIntake: {
      statusPassed: decisionIntakeViolations.length === 0,
      decisionOutcome: input.decisionIntake && input.decisionIntake.decisionOutcome === 'approve_requested'
        ? 'approve_requested'
        : null,
      futureApprovalRequestMayBePrepared: input.decisionIntake && input.decisionIntake.futureApprovalRequestMayBePrepared === true,
      exactApprovalStillRequired: input.decisionIntake && input.decisionIntake.exactApprovalStillRequired === true,
      approvalLinePresent: false,
      approvalLineValueIncluded: false,
      runtimeAuthorizationGranted: false,
      runtimeRouteOpened: false
    },
    reviewBoundary: {
      statusPassed: reviewBoundaryViolations.length === 0,
      reviewBoundaryPassed: input.reviewBoundary && input.reviewBoundary.reviewBoundaryPassed === true,
      humanExactApprovalStillRequired: input.reviewBoundary && input.reviewBoundary.humanExactApprovalStillRequired === true,
      approvalGrantStillForbidden: input.reviewBoundary && input.reviewBoundary.approvalGrantStillForbidden === true,
      approvalLineGenerationAllowed: false,
      runtimeAuthorizationGranted: false
    },
    packetPreflight: {
      statusPassed: packetPreflightViolations.length === 0,
      packetPreflightReady: input.packetPreflight && input.packetPreflight.packetPreflightReady === true,
      approvalLinePresent: false,
      approvalLineValueIncluded: false,
      runtimeAuthorizationGranted: false
    },
    finalReview: sanitizeFinalReview(input.finalReview || {}),
    currentFinalReviewEnvelope: {
      allowedCurrentFinalReviewActions: Array.isArray(input.currentFinalReviewEnvelope && input.currentFinalReviewEnvelope.allowedCurrentFinalReviewActions)
        ? input.currentFinalReviewEnvelope.allowedCurrentFinalReviewActions.filter(action => ALLOWED_CURRENT_FINAL_REVIEW_ACTIONS.includes(action))
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
    requestReviewReadinessViolations,
    requestSkeletonViolations,
    decisionIntakeViolations,
    reviewBoundaryViolations,
    packetPreflightViolations,
    finalReviewViolations,
    envelopeViolations,
    futureBoundaryViolations,
    receiptPlanViolations,
    counterViolations: counterResult.violations,
    localSafeCounters: counterResult.normalized
  };

  if (unsafeFieldCount > 0) {
    return buildRejectedResult(
      FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY,
      'unsafe_sensitive_or_raw_fields_present',
      commonDetails
    );
  }

  if (alignment.missingAlignmentFields.length > 0) {
    return buildRejectedResult(
      FINAL_REVIEW_ABORT_DECISIONS.NEEDS_PLAN_ADJUSTMENT,
      'master_stage_version_or_project_final_goal_review_missing',
      commonDetails
    );
  }

  if (requestReviewReadinessViolations.length > 0) {
    return buildRejectedResult(
      FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_REQUEST_REVIEW_READINESS,
      'cm1711_request_review_readiness_missing_or_unverified',
      commonDetails
    );
  }

  if (requestSkeletonViolations.length > 0) {
    return buildRejectedResult(
      FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_REQUEST_SKELETON,
      'cm1710_request_packet_skeleton_missing_or_unverified',
      commonDetails
    );
  }

  if (decisionIntakeViolations.length > 0) {
    return buildRejectedResult(
      FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE,
      'cm1709_approve_requested_intake_missing_or_unverified',
      commonDetails
    );
  }

  if (reviewBoundaryViolations.length > 0) {
    return buildRejectedResult(
      FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_REVIEW_BOUNDARY,
      'cm1708_review_boundary_missing_or_unverified',
      commonDetails
    );
  }

  if (packetPreflightViolations.length > 0) {
    return buildRejectedResult(
      FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_PACKET_PREFLIGHT,
      'cm1707_packet_preflight_missing_or_unverified',
      commonDetails
    );
  }

  if (futureBoundaryViolations.length > 0) {
    return buildRejectedResult(
      FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY,
      'cm1705_future_execution_boundary_missing_or_expanded',
      commonDetails
    );
  }

  if (receiptPlanViolations.length > 0) {
    return buildRejectedResult(
      FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_RECEIPT_PLAN,
      'cm1704_receipt_plan_missing_or_unsafe',
      commonDetails
    );
  }

  if (finalReviewViolations.length > 0) {
    return buildRejectedResult(
      FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY,
      'final_review_route_missing_or_unsafe',
      commonDetails
    );
  }

  if (envelopeViolations.length > 0) {
    return buildRejectedResult(
      FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY,
      'current_final_review_envelope_expanded_or_incomplete',
      commonDetails
    );
  }

  if (forbiddenTrueFlags.length > 0) {
    return buildRejectedResult(
      FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY,
      'forbidden_execution_authorization_or_claim_present',
      commonDetails
    );
  }

  if (counterResult.violations.length > 0) {
    return buildRejectedResult(
      FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY,
      'pre_final_review_counter_violation',
      commonDetails
    );
  }

  const finalOutcome = input.finalReview.finalReviewOutcome;
  const finalDecisionByOutcome = {
    proceed_to_future_exact_approval_request: FINAL_REVIEW_ABORT_DECISIONS.REQUEST_PACKET_FINAL_REVIEW_READY,
    abort_request_packet: FINAL_REVIEW_ABORT_DECISIONS.REQUEST_PACKET_FINAL_REVIEW_ABORTED,
    needs_adjustment: FINAL_REVIEW_ABORT_DECISIONS.REQUEST_PACKET_FINAL_REVIEW_NEEDS_ADJUSTMENT
  };
  const requestRouteByOutcome = {
    proceed_to_future_exact_approval_request: 'future_exact_approval_request_packet_final_review_ready_non_authorizing',
    abort_request_packet: 'future_exact_approval_request_packet_aborted_non_authorizing',
    needs_adjustment: 'future_exact_approval_request_packet_needs_adjustment_non_authorizing'
  };
  const reasonCodeByOutcome = {
    proceed_to_future_exact_approval_request: 'exact_approval_request_packet_final_review_ready_no_approval_line_no_runtime',
    abort_request_packet: 'exact_approval_request_packet_final_review_aborted_no_approval_line_no_runtime',
    needs_adjustment: 'exact_approval_request_packet_final_review_needs_adjustment_no_approval_line_no_runtime'
  };

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    operatorDecision: OPERATOR_DECISION,
    decision: finalDecisionByOutcome[finalOutcome],
    reasonCode: reasonCodeByOutcome[finalOutcome],
    requestRoute: requestRouteByOutcome[finalOutcome],
    boundaryStatus: 'final_review_closed_no_approval_line_no_runtime_execution',
    finalReviewOutcome: finalOutcome,
    futureApprovalRequestMayBePrepared: finalOutcome === 'proceed_to_future_exact_approval_request',
    alignment,
    requestReviewReadiness: commonDetails.requestReviewReadiness,
    requestSkeleton: commonDetails.requestSkeleton,
    decisionIntake: commonDetails.decisionIntake,
    reviewBoundary: commonDetails.reviewBoundary,
    packetPreflight: commonDetails.packetPreflight,
    finalReview: commonDetails.finalReview,
    currentFinalReviewEnvelope: commonDetails.currentFinalReviewEnvelope,
    futureExecutionBoundary: commonDetails.futureExecutionBoundary,
    receiptPlan: commonDetails.receiptPlan,
    unsafeFieldCategories,
    unsafeFieldCount,
    forbiddenTrueFlags,
    requestReviewReadinessViolations,
    requestSkeletonViolations,
    decisionIntakeViolations,
    reviewBoundaryViolations,
    packetPreflightViolations,
    finalReviewViolations,
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
    approvalLineTemplateIncluded: false,
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
      approvalLineTemplateIncluded: false,
      approvalLineValueIncluded: false,
      rawRuntimeOutputIncluded: false,
      rawMemoryIncluded: false,
      providerResponsesIncluded: false
    }
  };
}

module.exports = {
  ALLOWED_CURRENT_FINAL_REVIEW_ACTIONS,
  ALLOWED_FUTURE_RUNTIME_ACTIONS,
  CONTRACT_MODE,
  CONTRACT_NAME,
  FINAL_REVIEW_ABORT_DECISIONS,
  FINAL_REVIEW_OUTCOMES,
  MAX_FUTURE_RUNTIME_CALLS,
  MAX_FUTURE_RUNTIME_PROBE_MINUTES,
  MAX_FUTURE_TARGET_SPECIFIC_RUNTIME_INSPECTIONS,
  OPERATOR_DECISION,
  ZERO_COUNTERS,
  buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary
};
