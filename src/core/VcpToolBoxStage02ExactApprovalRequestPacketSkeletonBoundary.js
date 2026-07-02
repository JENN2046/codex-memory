'use strict';

const { isSafeReferenceName } = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpToolBoxStage02ExactApprovalRequestPacketSkeletonBoundary';
const CONTRACT_MODE = 'fixture_stage_02_exact_approval_request_packet_skeleton_boundary_only';
const OPERATOR_DECISION = 'prepare_exact_approval_request_packet_skeleton_no_approval_no_runtime';

const REQUEST_SKELETON_DECISIONS = Object.freeze({
  REQUEST_PACKET_SKELETON_READY: 'exact_approval_request_packet_skeleton_ready',
  BLOCKED_NEEDS_DECISION_INTAKE: 'blocked_needs_exact_approval_decision_intake',
  BLOCKED_NEEDS_REVIEW_BOUNDARY: 'blocked_needs_exact_approval_packet_review_boundary',
  BLOCKED_NEEDS_PACKET_PREFLIGHT: 'blocked_needs_exact_approval_packet_preflight',
  BLOCKED_NEEDS_REQUEST_SKELETON_BOUNDARY: 'blocked_needs_exact_approval_request_skeleton_boundary',
  BLOCKED_NEEDS_RECEIPT_PLAN: 'blocked_needs_receipt_plan',
  NEEDS_PLAN_ADJUSTMENT: 'needs_plan_adjustment'
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
  'CM-1708_REVIEW_BOUNDARY_PASSED',
  'CM1709_DECISION_INTAKE_PASSED',
  'CM-1709_DECISION_INTAKE_PASSED',
  'CM1709_APPROVE_REQUEST_INTAKE_PASSED',
  'CM-1709_APPROVE_REQUEST_INTAKE_PASSED'
]);

const ACCEPTED_PROJECT_FINAL_GOAL_ANSWERS = Object.freeze([
  'serves_project_final_goal',
  'still_serves_project_final_goal',
  'yes'
]);

const ALLOWED_CURRENT_REQUEST_SKELETON_ACTIONS = Object.freeze([
  'request_packet_skeleton_shape_review',
  'scope_summary_reference_check',
  'receipt_plan_review',
  'no_approval_no_runtime_request_skeleton'
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
  'allowedcurrentrequestskeletonactions',
  'allowedfutureruntimeactions',
  'abortconditionspresent',
  'approvalgrantstillforbidden',
  'approvallineconsumeallowed',
  'approvallinegenerationallowed',
  'approvallinegenerated',
  'approvallineissueallowed',
  'approvallinepresent',
  'approvallinestoreallowed',
  'approvallinestored',
  'approvallinetemplateomitted',
  'approvallinevalidateallowed',
  'approvallinevalidated',
  'approvallinevalueomitted',
  'cm1704receiptcontractstatus',
  'cm1705boundarystatus',
  'cm1707preflightstatus',
  'cm1708reviewboundarystatus',
  'cm1709decisionintakestatus',
  'decisionoutcome',
  'exactapprovalrequired',
  'exactapprovalstillrequired',
  'futureapprovalrequestmaybeprepared',
  'futureexecutionboundaryreferencepresent',
  'futurepacketonly',
  'futurerequestonly',
  'humanexactapprovalstillrequired',
  'lowdisclosureoutputpolicy',
  'maxruntimecalls',
  'maxruntimeprobeminutes',
  'maxtargetspecificruntimeinspections',
  'memorybudget',
  'noapprovallinestatementpresent',
  'nonauthorizing',
  'noruntimeexecutionstatementpresent',
  'packetpreflightpassed',
  'packetpreflightready',
  'principalscopesummarypresent',
  'profilescopesummarypresent',
  'providerbudget',
  'receiptplanreferencepresent',
  'requestpacketid',
  'requestpacketintent',
  'requestskeletonready',
  'reviewboundarypassed',
  'risksummarypresent',
  'runtimeauthorizationgranted',
  'runtimerouteopened',
  'sanitizedoutcomeonly',
  'skeletononly',
  'targetscopesummarypresent',
  'validationplanreferencepresent',
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

function validateCurrentRequestSkeletonEnvelope(envelope = {}) {
  const violations = [];
  if (!hasExactlyAllowedActions(envelope.allowedCurrentRequestSkeletonActions, ALLOWED_CURRENT_REQUEST_SKELETON_ACTIONS)) {
    violations.push('allowedCurrentRequestSkeletonActions');
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
  if (preflight.futurePacketOnly !== true) violations.push('futurePacketOnly');
  if (preflight.approvalLinePresent !== false) violations.push('approvalLinePresent');
  if (preflight.approvalLineValueOmitted !== true) violations.push('approvalLineValueOmitted');
  if (preflight.runtimeAuthorizationGranted !== false) violations.push('runtimeAuthorizationGranted');
  return violations;
}

function validateRequestPacketSkeleton(skeleton = {}) {
  const violations = [];
  const requiredTrueFields = [
    'skeletonOnly',
    'nonAuthorizing',
    'futureRequestOnly',
    'exactApprovalStillRequired',
    'approvalLineValueOmitted',
    'approvalLineTemplateOmitted',
    'targetScopeSummaryPresent',
    'principalScopeSummaryPresent',
    'profileScopeSummaryPresent',
    'riskSummaryPresent',
    'abortConditionsPresent',
    'receiptPlanReferencePresent',
    'validationPlanReferencePresent',
    'futureExecutionBoundaryReferencePresent',
    'noRuntimeExecutionStatementPresent',
    'noApprovalLineStatementPresent',
    'lowDisclosureOutputPolicy'
  ];

  for (const field of requiredTrueFields) {
    if (skeleton[field] !== true) violations.push(field);
  }
  if (skeleton.approvalLinePresent !== false) violations.push('approvalLinePresent');
  if (skeleton.approvalLineGenerated !== false && skeleton.approvalLineGenerated !== undefined) {
    violations.push('approvalLineGenerated');
  }
  if (skeleton.approvalLineStored !== false && skeleton.approvalLineStored !== undefined) {
    violations.push('approvalLineStored');
  }
  if (skeleton.approvalLineValidated !== false && skeleton.approvalLineValidated !== undefined) {
    violations.push('approvalLineValidated');
  }
  if (skeleton.runtimeAuthorizationGranted !== false) violations.push('runtimeAuthorizationGranted');
  if (skeleton.runtimeRouteOpened !== false) violations.push('runtimeRouteOpened');
  if (!isSafeReferenceName(skeleton.requestPacketId || 'CM1710-REQUEST-PACKET-SKELETON')) {
    violations.push('requestPacketId');
  }
  if (skeleton.requestPacketIntent !== 'future_exact_approval_request_packet_skeleton_only') {
    violations.push('requestPacketIntent');
  }
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
    alignment: details.alignment || {},
    decisionIntake: details.decisionIntake || {},
    reviewBoundary: details.reviewBoundary || {},
    packetPreflight: details.packetPreflight || {},
    requestPacketSkeleton: details.requestPacketSkeleton || {},
    currentRequestSkeletonEnvelope: details.currentRequestSkeletonEnvelope || {},
    futureExecutionBoundary: details.futureExecutionBoundary || {},
    receiptPlan: details.receiptPlan || {},
    unsafeFieldCategories: details.unsafeFieldCategories || [],
    unsafeFieldCount: details.unsafeFieldCount || 0,
    forbiddenTrueFlags: details.forbiddenTrueFlags || [],
    decisionIntakeViolations: details.decisionIntakeViolations || [],
    reviewBoundaryViolations: details.reviewBoundaryViolations || [],
    packetPreflightViolations: details.packetPreflightViolations || [],
    requestSkeletonViolations: details.requestSkeletonViolations || [],
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

function buildVcpToolBoxStage02ExactApprovalRequestPacketSkeletonBoundary(input = {}) {
  const { unsafeFieldCategories, unsafeFieldCount } = collectUnsafeFieldCategories(input);
  const forbiddenTrueFlags = collectForbiddenTrueFlags(input);
  const counterResult = validateCounters(input.counters || {});
  const decisionIntakeViolations = validateDecisionIntake(input.decisionIntake || {});
  const reviewBoundaryViolations = validateReviewBoundary(input.reviewBoundary || {});
  const packetPreflightViolations = validatePacketPreflight(input.packetPreflight || {});
  const requestSkeletonViolations = validateRequestPacketSkeleton(input.requestPacketSkeleton || {});
  const envelopeViolations = validateCurrentRequestSkeletonEnvelope(input.currentRequestSkeletonEnvelope || {});
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
    input.stage02Alignment.currentRequestSkeletonOnly === true;

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
    decisionIntakePassed: decisionIntakeViolations.length === 0,
    reviewBoundaryPassed: reviewBoundaryViolations.length === 0,
    packetPreflightPassed: packetPreflightViolations.length === 0,
    requestSkeletonReady: requestSkeletonViolations.length === 0,
    futureExecutionBoundaryReady: futureBoundaryViolations.length === 0,
    receiptPlanReady: receiptPlanViolations.length === 0,
    currentRequestSkeletonEnvelopeReady: envelopeViolations.length === 0,
    projectFinalGoalReviewAccepted: reviewAccepted,
    missingAlignmentFields: []
  };

  if (!masterReference) alignment.missingAlignmentFields.push('master_reference_or_id');
  if (!stage02Reference) alignment.missingAlignmentFields.push('stage02_reference_or_id');
  if (!versionReference) alignment.missingAlignmentFields.push('version_reference_or_id');
  if (input.projectFinalGoalServed !== true) alignment.missingAlignmentFields.push('projectFinalGoalServed');
  if (!stage02GoalAligned) alignment.missingAlignmentFields.push('stage02Alignment');
  if (!reviewAccepted) alignment.missingAlignmentFields.push('projectFinalGoalReview');

  const decisionIntake = {
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
  };

  const reviewBoundary = {
    statusPassed: reviewBoundaryViolations.length === 0,
    reviewBoundaryPassed: input.reviewBoundary && input.reviewBoundary.reviewBoundaryPassed === true,
    humanExactApprovalStillRequired: input.reviewBoundary && input.reviewBoundary.humanExactApprovalStillRequired === true,
    approvalGrantStillForbidden: input.reviewBoundary && input.reviewBoundary.approvalGrantStillForbidden === true,
    approvalLineGenerationAllowed: false,
    runtimeAuthorizationGranted: false
  };

  const packetPreflight = {
    statusPassed: packetPreflightViolations.length === 0,
    packetPreflightReady: input.packetPreflight && input.packetPreflight.packetPreflightReady === true,
    futurePacketOnly: input.packetPreflight && input.packetPreflight.futurePacketOnly === true,
    approvalLinePresent: false,
    approvalLineValueIncluded: false,
    runtimeAuthorizationGranted: false
  };

  const requestPacketSkeleton = {
    skeletonOnly: input.requestPacketSkeleton && input.requestPacketSkeleton.skeletonOnly === true,
    nonAuthorizing: input.requestPacketSkeleton && input.requestPacketSkeleton.nonAuthorizing === true,
    futureRequestOnly: input.requestPacketSkeleton && input.requestPacketSkeleton.futureRequestOnly === true,
    exactApprovalStillRequired: input.requestPacketSkeleton && input.requestPacketSkeleton.exactApprovalStillRequired === true,
    approvalLinePresent: false,
    approvalLineTemplateOmitted: input.requestPacketSkeleton && input.requestPacketSkeleton.approvalLineTemplateOmitted === true,
    approvalLineValueIncluded: false,
    approvalLineGenerated: false,
    approvalLineStored: false,
    approvalLineValidated: false,
    runtimeAuthorizationGranted: false,
    runtimeRouteOpened: false,
    targetScopeSummaryPresent: input.requestPacketSkeleton && input.requestPacketSkeleton.targetScopeSummaryPresent === true,
    principalScopeSummaryPresent: input.requestPacketSkeleton && input.requestPacketSkeleton.principalScopeSummaryPresent === true,
    profileScopeSummaryPresent: input.requestPacketSkeleton && input.requestPacketSkeleton.profileScopeSummaryPresent === true,
    riskSummaryPresent: input.requestPacketSkeleton && input.requestPacketSkeleton.riskSummaryPresent === true,
    abortConditionsPresent: input.requestPacketSkeleton && input.requestPacketSkeleton.abortConditionsPresent === true,
    receiptPlanReferencePresent: input.requestPacketSkeleton && input.requestPacketSkeleton.receiptPlanReferencePresent === true,
    validationPlanReferencePresent: input.requestPacketSkeleton && input.requestPacketSkeleton.validationPlanReferencePresent === true,
    futureExecutionBoundaryReferencePresent: input.requestPacketSkeleton && input.requestPacketSkeleton.futureExecutionBoundaryReferencePresent === true,
    noRuntimeExecutionStatementPresent: input.requestPacketSkeleton && input.requestPacketSkeleton.noRuntimeExecutionStatementPresent === true,
    noApprovalLineStatementPresent: input.requestPacketSkeleton && input.requestPacketSkeleton.noApprovalLineStatementPresent === true,
    lowDisclosureOutputPolicy: input.requestPacketSkeleton && input.requestPacketSkeleton.lowDisclosureOutputPolicy === true
  };

  const commonDetails = {
    alignment,
    decisionIntake,
    reviewBoundary,
    packetPreflight,
    requestPacketSkeleton,
    currentRequestSkeletonEnvelope: {
      allowedCurrentRequestSkeletonActions: Array.isArray(input.currentRequestSkeletonEnvelope && input.currentRequestSkeletonEnvelope.allowedCurrentRequestSkeletonActions)
        ? input.currentRequestSkeletonEnvelope.allowedCurrentRequestSkeletonActions.filter(action => ALLOWED_CURRENT_REQUEST_SKELETON_ACTIONS.includes(action))
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
    decisionIntakeViolations,
    reviewBoundaryViolations,
    packetPreflightViolations,
    requestSkeletonViolations,
    envelopeViolations,
    futureBoundaryViolations,
    receiptPlanViolations,
    counterViolations: counterResult.violations,
    localSafeCounters: counterResult.normalized
  };

  if (unsafeFieldCount > 0) {
    return buildRejectedResult(
      REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_REQUEST_SKELETON_BOUNDARY,
      'unsafe_sensitive_or_raw_fields_present',
      commonDetails
    );
  }

  if (alignment.missingAlignmentFields.length > 0) {
    return buildRejectedResult(
      REQUEST_SKELETON_DECISIONS.NEEDS_PLAN_ADJUSTMENT,
      'master_stage_version_or_project_final_goal_review_missing',
      commonDetails
    );
  }

  if (decisionIntakeViolations.length > 0) {
    return buildRejectedResult(
      REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE,
      'cm1709_approve_requested_intake_missing_or_unverified',
      commonDetails
    );
  }

  if (reviewBoundaryViolations.length > 0) {
    return buildRejectedResult(
      REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_REVIEW_BOUNDARY,
      'cm1708_review_boundary_missing_or_unverified',
      commonDetails
    );
  }

  if (packetPreflightViolations.length > 0) {
    return buildRejectedResult(
      REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_PACKET_PREFLIGHT,
      'cm1707_packet_preflight_missing_or_unverified',
      commonDetails
    );
  }

  if (futureBoundaryViolations.length > 0) {
    return buildRejectedResult(
      REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_REQUEST_SKELETON_BOUNDARY,
      'cm1705_future_execution_boundary_missing_or_expanded',
      commonDetails
    );
  }

  if (receiptPlanViolations.length > 0) {
    return buildRejectedResult(
      REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_RECEIPT_PLAN,
      'cm1704_receipt_plan_missing_or_unsafe',
      commonDetails
    );
  }

  if (requestSkeletonViolations.length > 0) {
    return buildRejectedResult(
      REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_REQUEST_SKELETON_BOUNDARY,
      'request_packet_skeleton_missing_or_unsafe',
      commonDetails
    );
  }

  if (envelopeViolations.length > 0) {
    return buildRejectedResult(
      REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_REQUEST_SKELETON_BOUNDARY,
      'current_request_skeleton_envelope_expanded_or_incomplete',
      commonDetails
    );
  }

  if (forbiddenTrueFlags.length > 0) {
    return buildRejectedResult(
      REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_REQUEST_SKELETON_BOUNDARY,
      'forbidden_execution_authorization_or_claim_present',
      commonDetails
    );
  }

  if (counterResult.violations.length > 0) {
    return buildRejectedResult(
      REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_REQUEST_SKELETON_BOUNDARY,
      'pre_request_skeleton_counter_violation',
      commonDetails
    );
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    operatorDecision: OPERATOR_DECISION,
    decision: REQUEST_SKELETON_DECISIONS.REQUEST_PACKET_SKELETON_READY,
    reasonCode: 'exact_approval_request_packet_skeleton_ready_no_approval_line_no_runtime',
    requestRoute: 'future_exact_approval_request_packet_skeleton_ready_non_authorizing',
    boundaryStatus: 'request_packet_skeleton_ready_no_approval_line_no_runtime_execution',
    alignment,
    decisionIntake,
    reviewBoundary,
    packetPreflight,
    requestPacketSkeleton,
    currentRequestSkeletonEnvelope: commonDetails.currentRequestSkeletonEnvelope,
    futureExecutionBoundary: commonDetails.futureExecutionBoundary,
    receiptPlan: commonDetails.receiptPlan,
    unsafeFieldCategories,
    unsafeFieldCount,
    forbiddenTrueFlags,
    decisionIntakeViolations,
    reviewBoundaryViolations,
    packetPreflightViolations,
    requestSkeletonViolations,
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
  ALLOWED_CURRENT_REQUEST_SKELETON_ACTIONS,
  ALLOWED_FUTURE_RUNTIME_ACTIONS,
  CONTRACT_MODE,
  CONTRACT_NAME,
  MAX_FUTURE_RUNTIME_CALLS,
  MAX_FUTURE_RUNTIME_PROBE_MINUTES,
  MAX_FUTURE_TARGET_SPECIFIC_RUNTIME_INSPECTIONS,
  OPERATOR_DECISION,
  REQUEST_SKELETON_DECISIONS,
  ZERO_COUNTERS,
  buildVcpToolBoxStage02ExactApprovalRequestPacketSkeletonBoundary
};
