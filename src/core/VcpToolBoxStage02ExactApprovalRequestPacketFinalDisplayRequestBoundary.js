'use strict';

const { isSafeReferenceName } = require('./VcpToolBoxSafeReference');
const {
  ALLOWED_FUTURE_RUNTIME_ACTIONS,
  MAX_FUTURE_RUNTIME_CALLS,
  MAX_FUTURE_RUNTIME_PROBE_MINUTES,
  MAX_FUTURE_TARGET_SPECIFIC_RUNTIME_INSPECTIONS,
  ZERO_COUNTERS,
  buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary
} = require('./VcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary');

const CONTRACT_NAME = 'VcpToolBoxStage02ExactApprovalRequestPacketFinalDisplayRequestBoundary';
const CONTRACT_MODE = 'fixture_stage_02_exact_approval_request_packet_final_display_request_boundary_only';
const OPERATOR_DECISION = 'prepare_exact_approval_request_packet_display_request_no_submission_no_approval_no_runtime';

const DISPLAY_REQUEST_DECISIONS = Object.freeze({
  REQUEST_PACKET_DISPLAY_REQUEST_PREPARED: 'exact_approval_request_packet_display_request_prepared',
  BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY: 'blocked_needs_exact_approval_request_final_review_boundary',
  BLOCKED_NEEDS_DISPLAY_REQUEST_BOUNDARY: 'blocked_needs_exact_approval_request_display_request_boundary',
  NEEDS_PLAN_ADJUSTMENT: 'needs_plan_adjustment'
});

const ACCEPTED_CM1712_STATUS_VALUES = Object.freeze([
  'PASSED',
  'COMPLETED_VALIDATED',
  'CM1712_FINAL_REVIEW_ABORT_PASSED',
  'CM-1712_FINAL_REVIEW_ABORT_PASSED',
  'CM1712_REQUEST_FINAL_REVIEW_READY_PASSED',
  'CM-1712_REQUEST_FINAL_REVIEW_READY_PASSED',
  'COMPLETED_VALIDATED_STAGE_02_EXACT_APPROVAL_REQUEST_PACKET_FINAL_REVIEW_ABORT_BOUNDARY_FIXTURE_ONLY_NO_APPROVAL_LINE_NO_RUNTIME'
]);

const ACCEPTED_PROJECT_FINAL_GOAL_ANSWERS = Object.freeze([
  'serves_project_final_goal',
  'still_serves_project_final_goal',
  'yes'
]);

const ALLOWED_CURRENT_DISPLAY_REQUEST_ACTIONS = Object.freeze([
  'cm1712_final_review_ready_status_review',
  'non_authorizing_display_request_package_check',
  'safe_reference_display_surface_check',
  'no_submission_no_approval_no_runtime_display_request'
]);

const ALLOWED_DISPLAY_REQUEST_SECTIONS = Object.freeze([
  'master_stage_version_alignment',
  'sanitized_scope_summary',
  'future_runtime_boundary_summary',
  'low_disclosure_receipt_summary',
  'exact_approval_still_required_notice',
  'no_approval_line_no_runtime_notice',
  'abort_adjustment_context'
]);

const ALLOWED_REQUEST_SURFACE_MODES = Object.freeze([
  'display_only',
  'request_draft_only',
  'review_surface_only'
]);

const DISPLAY_REQUEST_ZERO_COUNTERS = Object.freeze({
  ...ZERO_COUNTERS,
  approvalRequestsSubmitted: 0,
  approvalRequestsDispatched: 0,
  approvalRequestPayloadsGenerated: 0,
  approvalRequestTemplatesIncluded: 0,
  realApprovalRequestSurfacesOpened: 0
});

const FIELD_CATEGORY_BY_NORMALIZED_NAME = Object.freeze({
  path: 'locator_endpoint_or_path',
  filepath: 'locator_endpoint_or_path',
  absolutepath: 'locator_endpoint_or_path',
  targetpath: 'locator_endpoint_or_path',
  locatorvalue: 'locator_endpoint_or_path',
  endpoint: 'locator_endpoint_or_path',
  url: 'locator_endpoint_or_path',
  requesturl: 'locator_endpoint_or_path',
  approvalrequesturl: 'locator_endpoint_or_path',
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

  approvalrequestbody: 'approval_request_body_or_payload',
  approvalrequestpayload: 'approval_request_body_or_payload',
  approvalrequesttemplate: 'approval_request_body_or_payload',
  requestbody: 'approval_request_body_or_payload',
  requestpayload: 'approval_request_body_or_payload',
  submittedrequestpayload: 'approval_request_body_or_payload',
  displaypayload: 'approval_request_body_or_payload',
  payload: 'approval_request_body_or_payload',
  template: 'approval_request_body_or_payload',
  submissionline: 'approval_request_body_or_payload',

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
  'allowedcurrentdisplayrequestactions',
  'alloweddisplayrequestsections',
  'allowedfutureruntimeactions',
  'approvallineconsumeallowed',
  'approvallinegenerated',
  'approvallineissueallowed',
  'approvallinepresent',
  'approvallinestored',
  'approvallinetemplateincluded',
  'approvallinetemplateomitted',
  'approvallinevalidateallowed',
  'approvallinevalidated',
  'approvallinevalueincluded',
  'approvallinevalueomitted',
  'cm1712finalreviewabortstatus',
  'displayrequestonly',
  'displayrequestpackageprepared',
  'exactapprovalrequired',
  'exactapprovalstillrequired',
  'finalreviewoutcome',
  'fixtureonly',
  'futureapprovalrequestmaybedisplayed',
  'futureapprovalrequestmaybeprepared',
  'futureapprovalrequestmaybesubmitted',
  'futureexecutionboundaryreferencepresent',
  'futurehumanreviewonly',
  'humanexactapprovalstillrequired',
  'includesabortandadjustmentcontext',
  'includesexactapprovalstillrequirednotice',
  'includesfutureexecutionboundaryreference',
  'includesnoapprovallinenotice',
  'includesnoruntimeauthorizationnotice',
  'includesreceiptplanreference',
  'lowdisclosureonly',
  'lowdisclosureoutputpolicy',
  'maxapprovalrequestsubmissions',
  'maxruntimecalls',
  'maxruntimeprobeminutes',
  'maxtargetspecificruntimeinspections',
  'memorybudget',
  'nonauthorizing',
  'packageReference',
  'packagereference',
  'providerbudget',
  'realapprovalrequestsubmissionallowed',
  'realapprovalrequestsubmitted',
  'requestroute',
  'requestreviewready',
  'requestsurfacemode',
  'requestsurfacestatus',
  'runtimerouteopened',
  'runtimeauthorizationgranted',
  'safeReferenceOnly',
  'safereferenceonly',
  'sanitizedSummaryOnly',
  'sanitizedsummaryonly',
  'scopeboundarysummarypresent',
  'submissionstatus',
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
  'approvalLineValueIncluded',
  'approvalLineSimulated',
  'realApprovalRequestSubmitted',
  'approvalRequestSubmitted',
  'approvalRequestDispatched',
  'approvalRequestSent',
  'approvalRequestPayloadGenerated',
  'approvalRequestTemplateIncluded',
  'approvalRequestSimulationPerformed',
  'realApprovalRequestSurfaceOpened',
  'humanApprovalGranted',
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

function isAcceptedCm1712Status(value) {
  return ACCEPTED_CM1712_STATUS_VALUES.includes(String(value || '').trim());
}

function firstSafeReference(values) {
  for (const value of values) {
    if (isSafeReferenceName(value)) return value;
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

function hasExactlyAllowedValues(actualValues, allowedValues) {
  if (!Array.isArray(actualValues)) return false;
  const actual = [...new Set(actualValues)].sort();
  const expected = [...allowedValues].sort();
  return actual.length === expected.length &&
    expected.every((value, index) => actual[index] === value);
}

function validateCounters(counters = {}) {
  const normalized = {};
  const violations = [];
  for (const [key, expected] of Object.entries(DISPLAY_REQUEST_ZERO_COUNTERS)) {
    const value = counters[key] === undefined ? expected : counters[key];
    normalized[key] = value;
    if (value !== expected) violations.push(key);
  }
  return { normalized, violations };
}

function validateFinalReviewBoundary(boundary = {}) {
  const violations = [];
  if (!isAcceptedCm1712Status(boundary.cm1712FinalReviewAbortStatus || boundary.status)) {
    violations.push('cm1712FinalReviewAbortStatus');
  }
  if (boundary.finalReviewOutcome !== 'proceed_to_future_exact_approval_request') {
    violations.push('finalReviewOutcome');
  }
  if (boundary.futureApprovalRequestMayBePrepared !== true) {
    violations.push('futureApprovalRequestMayBePrepared');
  }
  if (boundary.nonAuthorizing !== true) violations.push('nonAuthorizing');
  if (boundary.exactApprovalStillRequired !== true) violations.push('exactApprovalStillRequired');
  if (boundary.humanExactApprovalStillRequired !== true) violations.push('humanExactApprovalStillRequired');
  if (boundary.approvalLinePresent !== false) violations.push('approvalLinePresent');
  if (boundary.approvalLineTemplateIncluded !== false && boundary.approvalLineTemplateIncluded !== undefined) {
    violations.push('approvalLineTemplateIncluded');
  }
  if (boundary.approvalLineValueIncluded !== false && boundary.approvalLineValueIncluded !== undefined) {
    violations.push('approvalLineValueIncluded');
  }
  if (boundary.approvalLineGenerated !== false && boundary.approvalLineGenerated !== undefined) {
    violations.push('approvalLineGenerated');
  }
  if (boundary.runtimeAuthorizationGranted !== false) violations.push('runtimeAuthorizationGranted');
  if (boundary.runtimeRouteOpened !== false) violations.push('runtimeRouteOpened');
  if (boundary.realApprovalRequestSubmitted !== false && boundary.realApprovalRequestSubmitted !== undefined) {
    violations.push('realApprovalRequestSubmitted');
  }
  if (boundary.lowDisclosureOutputPolicy !== true) violations.push('lowDisclosureOutputPolicy');
  return violations;
}

function validateDisplayRequestPackage(displayRequestPackage = {}) {
  const violations = [];
  for (const field of [
    'displayRequestOnly',
    'fixtureOnly',
    'nonAuthorizing',
    'futureHumanReviewOnly',
    'safeReferenceOnly',
    'sanitizedSummaryOnly',
    'lowDisclosureOnly',
    'exactApprovalStillRequired',
    'humanExactApprovalStillRequired',
    'includesExactApprovalStillRequiredNotice',
    'includesNoApprovalLineNotice',
    'includesNoRuntimeAuthorizationNotice',
    'includesReceiptPlanReference',
    'includesFutureExecutionBoundaryReference',
    'includesAbortAndAdjustmentContext'
  ]) {
    if (displayRequestPackage[field] !== true) violations.push(field);
  }

  if (!ALLOWED_REQUEST_SURFACE_MODES.includes(displayRequestPackage.requestSurfaceMode)) {
    violations.push('requestSurfaceMode');
  }
  if (!hasExactlyAllowedValues(displayRequestPackage.allowedDisplayRequestSections, ALLOWED_DISPLAY_REQUEST_SECTIONS)) {
    violations.push('allowedDisplayRequestSections');
  }
  if (
    displayRequestPackage.packageReference !== undefined &&
    !isSafeReferenceName(displayRequestPackage.packageReference)
  ) {
    violations.push('packageReference');
  }
  if (displayRequestPackage.futureApprovalRequestMayBeDisplayed !== true) {
    violations.push('futureApprovalRequestMayBeDisplayed');
  }
  if (displayRequestPackage.futureApprovalRequestMayBeSubmitted !== false) {
    violations.push('futureApprovalRequestMayBeSubmitted');
  }
  if (displayRequestPackage.realApprovalRequestSubmissionAllowed !== false) {
    violations.push('realApprovalRequestSubmissionAllowed');
  }
  if (displayRequestPackage.realApprovalRequestSubmitted !== false) {
    violations.push('realApprovalRequestSubmitted');
  }
  if (displayRequestPackage.approvalLinePresent !== false) violations.push('approvalLinePresent');
  if (displayRequestPackage.approvalLineTemplateIncluded !== false) {
    violations.push('approvalLineTemplateIncluded');
  }
  if (displayRequestPackage.approvalLineValueIncluded !== false) {
    violations.push('approvalLineValueIncluded');
  }
  if (displayRequestPackage.approvalLineGenerated !== false) {
    violations.push('approvalLineGenerated');
  }
  if (displayRequestPackage.runtimeAuthorizationGranted !== false) {
    violations.push('runtimeAuthorizationGranted');
  }
  if (displayRequestPackage.runtimeRouteOpened !== false) {
    violations.push('runtimeRouteOpened');
  }
  return violations;
}

function validateCurrentDisplayRequestEnvelope(envelope = {}) {
  const violations = [];
  if (!hasExactlyAllowedValues(envelope.allowedCurrentDisplayRequestActions, ALLOWED_CURRENT_DISPLAY_REQUEST_ACTIONS)) {
    violations.push('allowedCurrentDisplayRequestActions');
  }
  for (const field of [
    'maxRuntimeCalls',
    'maxRuntimeProbeMinutes',
    'maxTargetSpecificRuntimeInspections',
    'memoryBudget',
    'providerBudget',
    'writeBudget',
    'maxApprovalRequestSubmissions'
  ]) {
    if (envelope[field] !== 0) violations.push(field);
  }
  return violations;
}

function sanitizeFinalReviewBoundary(boundary = {}) {
  return {
    statusPassed: validateFinalReviewBoundary(boundary).length === 0,
    finalReviewOutcome: boundary.finalReviewOutcome === 'proceed_to_future_exact_approval_request'
      ? 'proceed_to_future_exact_approval_request'
      : null,
    futureApprovalRequestMayBePrepared: boundary.futureApprovalRequestMayBePrepared === true,
    nonAuthorizing: boundary.nonAuthorizing === true,
    exactApprovalStillRequired: boundary.exactApprovalStillRequired === true,
    approvalLinePresent: false,
    approvalLineTemplateIncluded: false,
    approvalLineValueIncluded: false,
    approvalLineGenerated: false,
    runtimeAuthorizationGranted: false,
    runtimeRouteOpened: false,
    realApprovalRequestSubmitted: false,
    lowDisclosureOutputPolicy: boundary.lowDisclosureOutputPolicy === true
  };
}

function sanitizeDisplayRequestPackage(displayRequestPackage = {}) {
  return {
    displayRequestOnly: displayRequestPackage.displayRequestOnly === true,
    fixtureOnly: displayRequestPackage.fixtureOnly === true,
    nonAuthorizing: displayRequestPackage.nonAuthorizing === true,
    futureHumanReviewOnly: displayRequestPackage.futureHumanReviewOnly === true,
    requestSurfaceMode: ALLOWED_REQUEST_SURFACE_MODES.includes(displayRequestPackage.requestSurfaceMode)
      ? displayRequestPackage.requestSurfaceMode
      : null,
    packageReference: firstSafeReference([displayRequestPackage.packageReference]),
    allowedDisplayRequestSections: Array.isArray(displayRequestPackage.allowedDisplayRequestSections)
      ? displayRequestPackage.allowedDisplayRequestSections.filter(section => ALLOWED_DISPLAY_REQUEST_SECTIONS.includes(section))
      : [],
    safeReferenceOnly: displayRequestPackage.safeReferenceOnly === true,
    sanitizedSummaryOnly: displayRequestPackage.sanitizedSummaryOnly === true,
    lowDisclosureOnly: displayRequestPackage.lowDisclosureOnly === true,
    exactApprovalStillRequired: displayRequestPackage.exactApprovalStillRequired === true,
    humanExactApprovalStillRequired: displayRequestPackage.humanExactApprovalStillRequired === true,
    includesExactApprovalStillRequiredNotice: displayRequestPackage.includesExactApprovalStillRequiredNotice === true,
    includesNoApprovalLineNotice: displayRequestPackage.includesNoApprovalLineNotice === true,
    includesNoRuntimeAuthorizationNotice: displayRequestPackage.includesNoRuntimeAuthorizationNotice === true,
    includesReceiptPlanReference: displayRequestPackage.includesReceiptPlanReference === true,
    includesFutureExecutionBoundaryReference: displayRequestPackage.includesFutureExecutionBoundaryReference === true,
    includesAbortAndAdjustmentContext: displayRequestPackage.includesAbortAndAdjustmentContext === true,
    futureApprovalRequestMayBeDisplayed: displayRequestPackage.futureApprovalRequestMayBeDisplayed === true,
    futureApprovalRequestMayBeSubmitted: false,
    realApprovalRequestSubmissionAllowed: false,
    realApprovalRequestSubmitted: false,
    approvalLinePresent: false,
    approvalLineTemplateIncluded: false,
    approvalLineValueIncluded: false,
    approvalLineGenerated: false,
    runtimeAuthorizationGranted: false,
    runtimeRouteOpened: false
  };
}

function buildRejectedResult(decision, reasonCode, details = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    operatorDecision: OPERATOR_DECISION,
    decision,
    reasonCode,
    displayRequestStatus: 'blocked_no_submission_no_approval_line_no_runtime',
    requestSubmissionStatus: 'not_submitted',
    futureApprovalRequestMayBeDisplayed: false,
    futureApprovalRequestMayBeSubmitted: false,
    priorFinalReviewBoundary: details.priorFinalReviewBoundary || {},
    finalReviewBoundary: details.finalReviewBoundary || {},
    displayRequestPackage: details.displayRequestPackage || {},
    currentDisplayRequestEnvelope: details.currentDisplayRequestEnvelope || {},
    futureExecutionBoundary: details.futureExecutionBoundary || {},
    alignment: details.alignment || {},
    priorFinalReviewAccepted: details.priorFinalReviewAccepted === true,
    priorFinalReviewDecision: details.priorFinalReviewDecision || null,
    unsafeFieldCategories: details.unsafeFieldCategories || [],
    unsafeFieldCount: details.unsafeFieldCount || 0,
    forbiddenTrueFlags: details.forbiddenTrueFlags || [],
    finalReviewBoundaryViolations: details.finalReviewBoundaryViolations || [],
    displayRequestPackageViolations: details.displayRequestPackageViolations || [],
    envelopeViolations: details.envelopeViolations || [],
    counterViolations: details.counterViolations || [],
    localSafeCounters: details.localSafeCounters || DISPLAY_REQUEST_ZERO_COUNTERS,
    approvalLineIssued: false,
    approvalLineConsumed: false,
    approvalLineStored: false,
    approvalLineGenerated: false,
    approvalLineValidated: false,
    approvalLineTemplateIncluded: false,
    approvalLineValueIncluded: false,
    approvalLineSimulated: false,
    realApprovalRequestSubmitted: false,
    approvalRequestDispatched: false,
    approvalRequestPayloadGenerated: false,
    approvalRequestTemplateIncluded: false,
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
      approvalRequestPayloadIncluded: false,
      rawRuntimeOutputIncluded: false,
      rawMemoryIncluded: false,
      providerResponsesIncluded: false
    }
  };
}

function buildPriorFinalReviewInput(input = {}) {
  const stage02Alignment = input.stage02Alignment || {};
  return {
    masterTaskbookReference: input.masterTaskbookReference,
    masterTaskbookId: input.masterTaskbookId,
    stage02Reference: input.stage02Reference,
    stage02Id: input.stage02Id,
    versionReference: input.versionReference,
    versionId: input.versionId,
    projectFinalGoalServed: input.projectFinalGoalServed,
    stage02Alignment: {
      stageGoalServesMaster: stage02Alignment.stageGoalServesMaster,
      projectFinalGoalServed: stage02Alignment.projectFinalGoalServed,
      currentFinalReviewAbortOnly: stage02Alignment.currentFinalReviewAbortOnly
    },
    requestReviewReadiness: input.requestReviewReadiness,
    requestSkeleton: input.requestSkeleton,
    decisionIntake: input.decisionIntake,
    reviewBoundary: input.reviewBoundary,
    packetPreflight: input.packetPreflight,
    finalReview: input.finalReview,
    currentFinalReviewEnvelope: input.currentFinalReviewEnvelope,
    futureExecutionBoundary: input.futureExecutionBoundary,
    receiptPlan: input.receiptPlan,
    counters: input.priorFinalReviewCounters || {},
    review: input.review
  };
}

function buildVcpToolBoxStage02ExactApprovalRequestPacketFinalDisplayRequestBoundary(input = {}) {
  const priorFinalReviewBoundary = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary(
    buildPriorFinalReviewInput(input)
  );
  const localUnsafe = collectUnsafeFieldCategories(input);
  const priorUnsafeCategories = Array.isArray(priorFinalReviewBoundary.unsafeFieldCategories)
    ? priorFinalReviewBoundary.unsafeFieldCategories
    : [];
  const unsafeFieldCategories = [...new Set([
    ...priorUnsafeCategories,
    ...localUnsafe.unsafeFieldCategories
  ])].sort();
  const unsafeFieldCount = (priorFinalReviewBoundary.unsafeFieldCount || 0) + localUnsafe.unsafeFieldCount;
  const forbiddenTrueFlags = collectForbiddenTrueFlags(input);
  const counterResult = validateCounters(input.counters || {});
  const finalReviewBoundaryViolations = validateFinalReviewBoundary(input.finalReviewBoundary || {});
  const displayRequestPackageViolations = validateDisplayRequestPackage(input.displayRequestPackage || {});
  const envelopeViolations = validateCurrentDisplayRequestEnvelope(input.currentDisplayRequestEnvelope || {});

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
    input.stage02Alignment.currentFinalDisplayRequestOnly === true;
  const reviewAnswer = input.review && input.review.projectFinalGoalAnswer;
  const projectFinalGoalReviewAccepted = input.review &&
    input.review.projectFinalGoalServed === true &&
    ACCEPTED_PROJECT_FINAL_GOAL_ANSWERS.includes(String(reviewAnswer || '').trim());
  const alignment = {
    masterReference,
    stage02Reference,
    versionReference,
    projectFinalGoalServed: input.projectFinalGoalServed === true,
    stage02GoalAligned,
    priorFinalReviewAccepted: priorFinalReviewBoundary.accepted === true,
    finalReviewBoundaryReady: finalReviewBoundaryViolations.length === 0,
    displayRequestPackageReady: displayRequestPackageViolations.length === 0,
    currentDisplayRequestEnvelopeReady: envelopeViolations.length === 0,
    projectFinalGoalReviewAccepted,
    missingAlignmentFields: []
  };

  if (!masterReference) alignment.missingAlignmentFields.push('master_reference_or_id');
  if (!stage02Reference) alignment.missingAlignmentFields.push('stage02_reference_or_id');
  if (!versionReference) alignment.missingAlignmentFields.push('version_reference_or_id');
  if (input.projectFinalGoalServed !== true) alignment.missingAlignmentFields.push('projectFinalGoalServed');
  if (!stage02GoalAligned) alignment.missingAlignmentFields.push('stage02Alignment');
  if (!projectFinalGoalReviewAccepted) alignment.missingAlignmentFields.push('projectFinalGoalReview');

  const commonDetails = {
    priorFinalReviewBoundary: {
      accepted: priorFinalReviewBoundary.accepted === true,
      decision: priorFinalReviewBoundary.decision || null,
      reasonCode: priorFinalReviewBoundary.reasonCode || null,
      finalReviewOutcome: priorFinalReviewBoundary.finalReviewOutcome || null,
      futureApprovalRequestMayBePrepared: priorFinalReviewBoundary.futureApprovalRequestMayBePrepared === true,
      approvalLinePresent: false,
      approvalLineTemplateIncluded: false,
      approvalLineValueIncluded: false,
      runtimeAuthorizationGranted: false,
      runtimeRouteOpened: false
    },
    finalReviewBoundary: sanitizeFinalReviewBoundary(input.finalReviewBoundary || {}),
    displayRequestPackage: sanitizeDisplayRequestPackage(input.displayRequestPackage || {}),
    currentDisplayRequestEnvelope: {
      allowedCurrentDisplayRequestActions: Array.isArray(input.currentDisplayRequestEnvelope && input.currentDisplayRequestEnvelope.allowedCurrentDisplayRequestActions)
        ? input.currentDisplayRequestEnvelope.allowedCurrentDisplayRequestActions.filter(action => ALLOWED_CURRENT_DISPLAY_REQUEST_ACTIONS.includes(action))
        : [],
      maxRuntimeCalls: 0,
      maxRuntimeProbeMinutes: 0,
      maxTargetSpecificRuntimeInspections: 0,
      memoryBudget: 0,
      providerBudget: 0,
      writeBudget: 0,
      maxApprovalRequestSubmissions: 0
    },
    futureExecutionBoundary: {
      allowedFutureRuntimeActions: Array.isArray(priorFinalReviewBoundary.futureExecutionBoundary && priorFinalReviewBoundary.futureExecutionBoundary.allowedFutureRuntimeActions)
        ? priorFinalReviewBoundary.futureExecutionBoundary.allowedFutureRuntimeActions.filter(action => ALLOWED_FUTURE_RUNTIME_ACTIONS.includes(action))
        : [],
      maxRuntimeCalls: MAX_FUTURE_RUNTIME_CALLS,
      maxRuntimeProbeMinutes: MAX_FUTURE_RUNTIME_PROBE_MINUTES,
      maxTargetSpecificRuntimeInspections: MAX_FUTURE_TARGET_SPECIFIC_RUNTIME_INSPECTIONS,
      memoryBudget: 0,
      providerBudget: 0,
      writeBudget: 0
    },
    alignment,
    priorFinalReviewAccepted: priorFinalReviewBoundary.accepted === true,
    priorFinalReviewDecision: priorFinalReviewBoundary.decision || null,
    unsafeFieldCategories,
    unsafeFieldCount,
    forbiddenTrueFlags,
    finalReviewBoundaryViolations,
    displayRequestPackageViolations,
    envelopeViolations,
    counterViolations: counterResult.violations,
    localSafeCounters: counterResult.normalized
  };

  if (unsafeFieldCount > 0) {
    return buildRejectedResult(
      DISPLAY_REQUEST_DECISIONS.BLOCKED_NEEDS_DISPLAY_REQUEST_BOUNDARY,
      'unsafe_sensitive_raw_or_request_payload_fields_present',
      commonDetails
    );
  }

  if (alignment.missingAlignmentFields.length > 0) {
    return buildRejectedResult(
      DISPLAY_REQUEST_DECISIONS.NEEDS_PLAN_ADJUSTMENT,
      'master_stage_version_or_project_final_goal_review_missing',
      commonDetails
    );
  }

  if (priorFinalReviewBoundary.accepted !== true) {
    return buildRejectedResult(
      DISPLAY_REQUEST_DECISIONS.BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY,
      'cm1712_prior_final_review_gate_rejected',
      commonDetails
    );
  }

  if (
    priorFinalReviewBoundary.finalReviewOutcome !== 'proceed_to_future_exact_approval_request' ||
    priorFinalReviewBoundary.futureApprovalRequestMayBePrepared !== true
  ) {
    return buildRejectedResult(
      DISPLAY_REQUEST_DECISIONS.BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY,
      'cm1712_final_review_not_proceed_route',
      commonDetails
    );
  }

  if (finalReviewBoundaryViolations.length > 0) {
    return buildRejectedResult(
      DISPLAY_REQUEST_DECISIONS.BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY,
      'cm1712_final_review_boundary_missing_or_not_proceed',
      commonDetails
    );
  }

  if (displayRequestPackageViolations.length > 0) {
    return buildRejectedResult(
      DISPLAY_REQUEST_DECISIONS.BLOCKED_NEEDS_DISPLAY_REQUEST_BOUNDARY,
      'display_request_package_missing_or_authorizing',
      commonDetails
    );
  }

  if (envelopeViolations.length > 0) {
    return buildRejectedResult(
      DISPLAY_REQUEST_DECISIONS.BLOCKED_NEEDS_DISPLAY_REQUEST_BOUNDARY,
      'current_display_request_envelope_expanded_or_incomplete',
      commonDetails
    );
  }

  if (forbiddenTrueFlags.length > 0) {
    return buildRejectedResult(
      DISPLAY_REQUEST_DECISIONS.BLOCKED_NEEDS_DISPLAY_REQUEST_BOUNDARY,
      'forbidden_submission_authorization_runtime_or_claim_present',
      commonDetails
    );
  }

  if (counterResult.violations.length > 0) {
    return buildRejectedResult(
      DISPLAY_REQUEST_DECISIONS.BLOCKED_NEEDS_DISPLAY_REQUEST_BOUNDARY,
      'pre_display_request_counter_violation',
      commonDetails
    );
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    operatorDecision: OPERATOR_DECISION,
    decision: DISPLAY_REQUEST_DECISIONS.REQUEST_PACKET_DISPLAY_REQUEST_PREPARED,
    reasonCode: 'exact_approval_request_packet_display_request_prepared_no_submission_no_approval_line_no_runtime',
    displayRequestStatus: 'future_exact_approval_request_packet_display_request_prepared_non_authorizing',
    requestSubmissionStatus: 'not_submitted',
    futureApprovalRequestMayBeDisplayed: true,
    futureApprovalRequestMayBeSubmitted: false,
    priorFinalReviewBoundary: commonDetails.priorFinalReviewBoundary,
    finalReviewBoundary: commonDetails.finalReviewBoundary,
    displayRequestPackage: commonDetails.displayRequestPackage,
    currentDisplayRequestEnvelope: commonDetails.currentDisplayRequestEnvelope,
    futureExecutionBoundary: commonDetails.futureExecutionBoundary,
    alignment,
    priorFinalReviewAccepted: true,
    priorFinalReviewDecision: priorFinalReviewBoundary.decision,
    unsafeFieldCategories,
    unsafeFieldCount,
    forbiddenTrueFlags,
    finalReviewBoundaryViolations,
    displayRequestPackageViolations,
    envelopeViolations,
    counterViolations: counterResult.violations,
    localSafeCounters: counterResult.normalized,
    approvalLineIssued: false,
    approvalLineConsumed: false,
    approvalLineStored: false,
    approvalLineGenerated: false,
    approvalLineValidated: false,
    approvalLineTemplateIncluded: false,
    approvalLineValueIncluded: false,
    approvalLineSimulated: false,
    realApprovalRequestSubmitted: false,
    approvalRequestDispatched: false,
    approvalRequestPayloadGenerated: false,
    approvalRequestTemplateIncluded: false,
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
      approvalRequestPayloadIncluded: false,
      rawRuntimeOutputIncluded: false,
      rawMemoryIncluded: false,
      providerResponsesIncluded: false
    }
  };
}

module.exports = {
  ALLOWED_CURRENT_DISPLAY_REQUEST_ACTIONS,
  ALLOWED_DISPLAY_REQUEST_SECTIONS,
  ALLOWED_FUTURE_RUNTIME_ACTIONS,
  ALLOWED_REQUEST_SURFACE_MODES,
  CONTRACT_MODE,
  CONTRACT_NAME,
  DISPLAY_REQUEST_DECISIONS,
  DISPLAY_REQUEST_ZERO_COUNTERS,
  MAX_FUTURE_RUNTIME_CALLS,
  MAX_FUTURE_RUNTIME_PROBE_MINUTES,
  MAX_FUTURE_TARGET_SPECIFIC_RUNTIME_INSPECTIONS,
  OPERATOR_DECISION,
  buildVcpToolBoxStage02ExactApprovalRequestPacketFinalDisplayRequestBoundary
};
