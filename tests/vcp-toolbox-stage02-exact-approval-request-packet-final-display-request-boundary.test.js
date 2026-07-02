'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_CURRENT_DISPLAY_REQUEST_ACTIONS,
  ALLOWED_DISPLAY_REQUEST_SECTIONS,
  ALLOWED_FUTURE_RUNTIME_ACTIONS,
  ALLOWED_REQUEST_SURFACE_MODES,
  CONTRACT_MODE,
  DISPLAY_REQUEST_DECISIONS,
  DISPLAY_REQUEST_ZERO_COUNTERS,
  MAX_FUTURE_RUNTIME_CALLS,
  MAX_FUTURE_RUNTIME_PROBE_MINUTES,
  MAX_FUTURE_TARGET_SPECIFIC_RUNTIME_INSPECTIONS,
  OPERATOR_DECISION,
  buildVcpToolBoxStage02ExactApprovalRequestPacketFinalDisplayRequestBoundary
} = require('../src/core/VcpToolBoxStage02ExactApprovalRequestPacketFinalDisplayRequestBoundary');

const {
  ALLOWED_CURRENT_FINAL_REVIEW_ACTIONS
} = require('../src/core/VcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary');

function finalReview(overrides = {}) {
  return {
    finalReviewOutcome: 'proceed_to_future_exact_approval_request',
    finalReviewOnly: true,
    nonAuthorizing: true,
    futureApprovalRequestMayBePrepared: true,
    abortRequestPacket: false,
    needsAdjustment: false,
    exactApprovalStillRequired: true,
    humanExactApprovalStillRequired: true,
    scopeBoundaryReviewed: true,
    scopeBoundarySummaryPresent: true,
    riskReviewed: true,
    abortConditionsReviewed: true,
    abortBoundaryPresent: true,
    adjustmentBoundaryPresent: true,
    validationPlanReviewed: true,
    receiptPlanReviewed: true,
    futureExecutionBoundaryReferencePresent: true,
    noRuntimeExecutionStatementPresent: true,
    noApprovalLineStatementPresent: true,
    lowDisclosureOutputPolicy: true,
    approvalLinePresent: false,
    approvalLineTemplateIncluded: false,
    approvalLineGenerated: false,
    approvalLineStored: false,
    approvalLineValidated: false,
    runtimeAuthorizationGranted: false,
    runtimeRouteOpened: false,
    ...overrides
  };
}

function finalReviewBoundary(overrides = {}) {
  return {
    cm1712FinalReviewAbortStatus: 'CM1712_FINAL_REVIEW_ABORT_PASSED',
    finalReviewOutcome: 'proceed_to_future_exact_approval_request',
    futureApprovalRequestMayBePrepared: true,
    nonAuthorizing: true,
    exactApprovalStillRequired: true,
    humanExactApprovalStillRequired: true,
    approvalLinePresent: false,
    approvalLineTemplateIncluded: false,
    approvalLineValueIncluded: false,
    approvalLineGenerated: false,
    runtimeAuthorizationGranted: false,
    runtimeRouteOpened: false,
    realApprovalRequestSubmitted: false,
    lowDisclosureOutputPolicy: true,
    ...overrides
  };
}

function displayRequestPackage(overrides = {}) {
  return {
    displayRequestOnly: true,
    fixtureOnly: true,
    nonAuthorizing: true,
    futureHumanReviewOnly: true,
    requestSurfaceMode: 'review_surface_only',
    packageReference: 'CM1713_DISPLAY_REQUEST_PACKET',
    allowedDisplayRequestSections: [...ALLOWED_DISPLAY_REQUEST_SECTIONS],
    safeReferenceOnly: true,
    sanitizedSummaryOnly: true,
    lowDisclosureOnly: true,
    exactApprovalStillRequired: true,
    humanExactApprovalStillRequired: true,
    includesExactApprovalStillRequiredNotice: true,
    includesNoApprovalLineNotice: true,
    includesNoRuntimeAuthorizationNotice: true,
    includesReceiptPlanReference: true,
    includesFutureExecutionBoundaryReference: true,
    includesAbortAndAdjustmentContext: true,
    futureApprovalRequestMayBeDisplayed: true,
    futureApprovalRequestMayBeSubmitted: false,
    realApprovalRequestSubmissionAllowed: false,
    realApprovalRequestSubmitted: false,
    approvalLinePresent: false,
    approvalLineTemplateIncluded: false,
    approvalLineValueIncluded: false,
    approvalLineGenerated: false,
    runtimeAuthorizationGranted: false,
    runtimeRouteOpened: false,
    ...overrides
  };
}

function baseInput(overrides = {}) {
  return {
    masterTaskbookReference: 'PROJECT_MASTER_TASKBOOK',
    masterTaskbookId: 'PROJECT-MASTER-TASKBOOK',
    stage02Reference: 'STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS',
    stage02Id: 'stage-02',
    versionReference: 'VERSION_STAGE_02_V1_12_CM1713_EXACT_APPROVAL_REQUEST_PACKET_FINAL_DISPLAY_REQUEST_BOUNDARY',
    versionId: 'CM-1713',
    projectFinalGoalServed: true,
    stage02Alignment: {
      stageGoalServesMaster: true,
      projectFinalGoalServed: true,
      currentFinalReviewAbortOnly: true,
      currentFinalDisplayRequestOnly: true
    },
    requestReviewReadiness: {
      cm1711RequestReviewReadinessStatus: 'CM1711_REQUEST_REVIEW_READINESS_PASSED',
      requestReviewReady: true,
      nonAuthorizing: true,
      exactApprovalStillRequired: true,
      approvalLinePresent: false,
      approvalLineValueOmitted: true,
      approvalLineTemplateOmitted: true,
      runtimeAuthorizationGranted: false,
      runtimeRouteOpened: false
    },
    requestSkeleton: {
      cm1710RequestSkeletonStatus: 'CM1710_REQUEST_PACKET_SKELETON_PASSED',
      requestSkeletonReady: true,
      nonAuthorizing: true,
      exactApprovalStillRequired: true,
      approvalLinePresent: false,
      approvalLineValueOmitted: true,
      approvalLineTemplateOmitted: true,
      runtimeAuthorizationGranted: false,
      runtimeRouteOpened: false
    },
    decisionIntake: {
      cm1709DecisionIntakeStatus: 'CM1709_APPROVE_REQUEST_INTAKE_PASSED',
      decisionOutcome: 'approve_requested',
      futureApprovalRequestMayBePrepared: true,
      exactApprovalStillRequired: true,
      approvalLinePresent: false,
      approvalLineValueOmitted: true,
      runtimeAuthorizationGranted: false,
      runtimeRouteOpened: false
    },
    reviewBoundary: {
      cm1708ReviewBoundaryStatus: 'CM1708_REVIEW_BOUNDARY_PASSED',
      reviewBoundaryPassed: true,
      humanExactApprovalStillRequired: true,
      approvalGrantStillForbidden: true,
      approvalLineGenerationAllowed: false,
      runtimeAuthorizationGranted: false
    },
    packetPreflight: {
      cm1707PreflightStatus: 'CM1707_PACKET_PREFLIGHT_PASSED',
      packetPreflightReady: true,
      approvalLinePresent: false,
      approvalLineValueOmitted: true,
      runtimeAuthorizationGranted: false
    },
    finalReview: finalReview(),
    finalReviewBoundary: finalReviewBoundary(),
    displayRequestPackage: displayRequestPackage(),
    currentFinalReviewEnvelope: {
      allowedCurrentFinalReviewActions: [...ALLOWED_CURRENT_FINAL_REVIEW_ACTIONS],
      maxRuntimeCalls: 0,
      maxRuntimeProbeMinutes: 0,
      maxTargetSpecificRuntimeInspections: 0,
      memoryBudget: 0,
      providerBudget: 0,
      writeBudget: 0
    },
    currentDisplayRequestEnvelope: {
      allowedCurrentDisplayRequestActions: [...ALLOWED_CURRENT_DISPLAY_REQUEST_ACTIONS],
      maxRuntimeCalls: 0,
      maxRuntimeProbeMinutes: 0,
      maxTargetSpecificRuntimeInspections: 0,
      memoryBudget: 0,
      providerBudget: 0,
      writeBudget: 0,
      maxApprovalRequestSubmissions: 0
    },
    futureExecutionBoundary: {
      cm1705BoundaryStatus: 'CM1705_EXECUTION_BOUNDARY_PASSED',
      exactApprovalRequired: true,
      allowedFutureRuntimeActions: [...ALLOWED_FUTURE_RUNTIME_ACTIONS],
      maxRuntimeCalls: 3,
      maxRuntimeProbeMinutes: 10,
      maxTargetSpecificRuntimeInspections: 1,
      memoryBudget: 0,
      providerBudget: 0,
      writeBudget: 0
    },
    receiptPlan: {
      cm1704ReceiptContractStatus: 'CM1704_RECEIPT_CONTRACT_PASSED',
      referencesCm1704: true,
      lowDisclosureOnly: true,
      rawRuntimeOutputAllowed: false,
      rawMemoryAllowed: false,
      secretOrTokenOutputAllowed: false,
      readinessClaimAllowed: false
    },
    counters: {},
    review: {
      projectFinalGoalServed: true,
      projectFinalGoalAnswer: 'serves_project_final_goal'
    },
    ...overrides
  };
}

test('CM1713 prepares final display request package as non-authorizing only', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalDisplayRequestBoundary(baseInput());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, CONTRACT_MODE);
  assert.equal(result.operatorDecision, OPERATOR_DECISION);
  assert.equal(result.decision, DISPLAY_REQUEST_DECISIONS.REQUEST_PACKET_DISPLAY_REQUEST_PREPARED);
  assert.equal(
    result.reasonCode,
    'exact_approval_request_packet_display_request_prepared_no_submission_no_approval_line_no_runtime'
  );
  assert.equal(
    result.displayRequestStatus,
    'future_exact_approval_request_packet_display_request_prepared_non_authorizing'
  );
  assert.equal(result.requestSubmissionStatus, 'not_submitted');
  assert.equal(result.futureApprovalRequestMayBeDisplayed, true);
  assert.equal(result.futureApprovalRequestMayBeSubmitted, false);
  assert.equal(result.priorFinalReviewAccepted, true);
  assert.equal(result.finalReviewBoundary.finalReviewOutcome, 'proceed_to_future_exact_approval_request');
  assert.equal(result.displayRequestPackage.requestSurfaceMode, 'review_surface_only');
  assert.equal(result.displayRequestPackage.packageReference, 'CM1713_DISPLAY_REQUEST_PACKET');
  assert.deepEqual(result.displayRequestPackage.allowedDisplayRequestSections, ALLOWED_DISPLAY_REQUEST_SECTIONS);
  assert.deepEqual(result.currentDisplayRequestEnvelope.allowedCurrentDisplayRequestActions, ALLOWED_CURRENT_DISPLAY_REQUEST_ACTIONS);
  assert.deepEqual(result.futureExecutionBoundary.allowedFutureRuntimeActions, ALLOWED_FUTURE_RUNTIME_ACTIONS);
  assert.equal(result.futureExecutionBoundary.maxRuntimeCalls, MAX_FUTURE_RUNTIME_CALLS);
  assert.equal(result.futureExecutionBoundary.maxRuntimeProbeMinutes, MAX_FUTURE_RUNTIME_PROBE_MINUTES);
  assert.equal(
    result.futureExecutionBoundary.maxTargetSpecificRuntimeInspections,
    MAX_FUTURE_TARGET_SPECIFIC_RUNTIME_INSPECTIONS
  );
  assert.equal(result.approvalLineIssued, false);
  assert.equal(result.approvalLineConsumed, false);
  assert.equal(result.approvalLineStored, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.approvalLineValidated, false);
  assert.equal(result.approvalLineTemplateIncluded, false);
  assert.equal(result.approvalLineValueIncluded, false);
  assert.equal(result.approvalLineSimulated, false);
  assert.equal(result.realApprovalRequestSubmitted, false);
  assert.equal(result.approvalRequestDispatched, false);
  assert.equal(result.approvalRequestPayloadGenerated, false);
  assert.equal(result.runtimeAuthorizationGranted, false);
  assert.equal(result.runtimeRouteOpened, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.completeV8Claimed, false);
  assert.deepEqual(result.localSafeCounters, DISPLAY_REQUEST_ZERO_COUNTERS);
});

test('CM1713 blocks missing CM1712 final review boundary summary', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalDisplayRequestBoundary(baseInput({
    finalReviewBoundary: {
      cm1712FinalReviewAbortStatus: 'MISSING',
      finalReviewOutcome: 'proceed_to_future_exact_approval_request',
      futureApprovalRequestMayBePrepared: true,
      nonAuthorizing: true,
      exactApprovalStillRequired: true,
      humanExactApprovalStillRequired: true,
      approvalLinePresent: false,
      runtimeAuthorizationGranted: false,
      runtimeRouteOpened: false,
      lowDisclosureOutputPolicy: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, DISPLAY_REQUEST_DECISIONS.BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'cm1712_final_review_boundary_missing_or_not_proceed');
  assert.ok(result.finalReviewBoundaryViolations.includes('cm1712FinalReviewAbortStatus'));
  assert.equal(result.futureApprovalRequestMayBeSubmitted, false);
  assert.equal(result.realApprovalRequestSubmitted, false);
});

test('CM1713 blocks CM1712 abort and needs_adjustment routes before display request', () => {
  for (const finalReviewOutcome of ['abort_request_packet', 'needs_adjustment']) {
    const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalDisplayRequestBoundary(baseInput({
      finalReview: finalReview({
        finalReviewOutcome,
        futureApprovalRequestMayBePrepared: false,
        abortRequestPacket: finalReviewOutcome === 'abort_request_packet',
        abortReasonSummaryPresent: finalReviewOutcome === 'abort_request_packet',
        needsAdjustment: finalReviewOutcome === 'needs_adjustment',
        adjustmentSummaryPresent: finalReviewOutcome === 'needs_adjustment'
      }),
      finalReviewBoundary: finalReviewBoundary({
        finalReviewOutcome,
        futureApprovalRequestMayBePrepared: false
      })
    }));

    assert.equal(result.accepted, false);
    assert.equal(result.decision, DISPLAY_REQUEST_DECISIONS.BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY);
    assert.equal(result.reasonCode, 'cm1712_final_review_not_proceed_route');
    assert.equal(result.futureApprovalRequestMayBeDisplayed, false);
  }
});

test('CM1713 blocks if prior CM1711 request review-readiness is not accepted', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalDisplayRequestBoundary(baseInput({
    requestReviewReadiness: {
      cm1711RequestReviewReadinessStatus: 'MISSING',
      requestReviewReady: false,
      nonAuthorizing: false,
      exactApprovalStillRequired: false,
      approvalLinePresent: true,
      approvalLineValueOmitted: false,
      approvalLineTemplateOmitted: false,
      runtimeAuthorizationGranted: true,
      runtimeRouteOpened: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, DISPLAY_REQUEST_DECISIONS.BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'cm1712_prior_final_review_gate_rejected');
  assert.equal(result.priorFinalReviewAccepted, false);
  assert.equal(result.priorFinalReviewDecision, 'blocked_needs_exact_approval_request_review_readiness');
  assert.equal(result.approvalLineValueIncluded, false);
  assert.equal(result.runtimeAuthorizationGranted, false);
});

test('CM1713 returns plan adjustment when alignment or project_final_goal review is missing', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalDisplayRequestBoundary(baseInput({
    masterTaskbookReference: undefined,
    masterTaskbookId: undefined,
    stage02Reference: undefined,
    stage02Id: undefined,
    versionReference: undefined,
    versionId: undefined,
    projectFinalGoalServed: false,
    stage02Alignment: {
      stageGoalServesMaster: false,
      projectFinalGoalServed: false,
      currentFinalReviewAbortOnly: true,
      currentFinalDisplayRequestOnly: false
    },
    review: {
      projectFinalGoalServed: false,
      projectFinalGoalAnswer: 'uncertain'
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, DISPLAY_REQUEST_DECISIONS.NEEDS_PLAN_ADJUSTMENT);
  assert.equal(result.reasonCode, 'master_stage_version_or_project_final_goal_review_missing');
  assert.ok(result.alignment.missingAlignmentFields.includes('master_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('stage02_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('version_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('projectFinalGoalReview'));
});

test('CM1713 blocks incomplete or authorizing display request package', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalDisplayRequestBoundary(baseInput({
    displayRequestPackage: displayRequestPackage({
      displayRequestOnly: false,
      requestSurfaceMode: 'submit_now',
      allowedDisplayRequestSections: [
        'master_stage_version_alignment',
        'approval_line_template'
      ],
      futureApprovalRequestMayBeSubmitted: true,
      realApprovalRequestSubmissionAllowed: true,
      realApprovalRequestSubmitted: true,
      approvalLinePresent: true,
      approvalLineTemplateIncluded: true,
      approvalLineValueIncluded: true,
      runtimeAuthorizationGranted: true,
      runtimeRouteOpened: true
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, DISPLAY_REQUEST_DECISIONS.BLOCKED_NEEDS_DISPLAY_REQUEST_BOUNDARY);
  assert.equal(result.reasonCode, 'display_request_package_missing_or_authorizing');
  assert.ok(result.displayRequestPackageViolations.includes('displayRequestOnly'));
  assert.ok(result.displayRequestPackageViolations.includes('requestSurfaceMode'));
  assert.ok(result.displayRequestPackageViolations.includes('allowedDisplayRequestSections'));
  assert.ok(result.displayRequestPackageViolations.includes('futureApprovalRequestMayBeSubmitted'));
  assert.ok(result.displayRequestPackageViolations.includes('realApprovalRequestSubmitted'));
  assert.equal(result.displayRequestPackage.allowedDisplayRequestSections.includes('approval_line_template'), false);
  assert.equal(result.realApprovalRequestSubmitted, false);
});

test('CM1713 blocks unsafe package reference values', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalDisplayRequestBoundary(baseInput({
    displayRequestPackage: displayRequestPackage({
      packageReference: 'https://PRIVATE_REFERENCE_SHOULD_NOT_ECHO'
    })
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.decision, DISPLAY_REQUEST_DECISIONS.BLOCKED_NEEDS_DISPLAY_REQUEST_BOUNDARY);
  assert.equal(result.reasonCode, 'display_request_package_missing_or_authorizing');
  assert.ok(result.displayRequestPackageViolations.includes('packageReference'));
  assert.equal(serialized.includes('PRIVATE_REFERENCE_SHOULD_NOT_ECHO'), false);
  assert.equal(result.displayRequestPackage.packageReference, null);
});

test('CM1713 blocks approval line and approval request payload material without echoing values', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalDisplayRequestBoundary(baseInput({
    displayRequestPackage: displayRequestPackage({
      approvalLinePresent: true,
      approvalLineTemplateIncluded: true,
      approvalLineValueIncluded: true,
      approvalLineGenerated: true,
      approvalLineTemplate: 'APPROVAL_TEMPLATE_SHOULD_NOT_ECHO',
      approvalLineValue: 'APPROVAL_LINE_SHOULD_NOT_ECHO',
      approvalRequestPayload: 'REQUEST_PAYLOAD_SHOULD_NOT_ECHO'
    }),
    approvalLineIssued: true,
    approvalRequestSubmitted: true
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.decision, DISPLAY_REQUEST_DECISIONS.BLOCKED_NEEDS_DISPLAY_REQUEST_BOUNDARY);
  assert.equal(result.reasonCode, 'unsafe_sensitive_raw_or_request_payload_fields_present');
  assert.ok(result.unsafeFieldCategories.includes('approval_line_or_private_approval_material'));
  assert.ok(result.unsafeFieldCategories.includes('approval_request_body_or_payload'));
  assert.equal(serialized.includes('APPROVAL_TEMPLATE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('APPROVAL_LINE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('REQUEST_PAYLOAD_SHOULD_NOT_ECHO'), false);
  assert.equal(result.approvalLineTemplateIncluded, false);
  assert.equal(result.approvalRequestDispatched, false);
});

test('CM1713 blocks unsafe locator config secret raw runtime provider commit and branch fields without echoing values', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalDisplayRequestBoundary(baseInput({
    submittedDisplayRequestMaterial: {
      targetPath: '/PRIVATE/VCPToolBox/path',
      endpoint: 'https://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
      host: 'PRIVATE_HOST_SHOULD_NOT_ECHO',
      port: '7605',
      runtimeLog: 'RUNTIME_LOG_SHOULD_NOT_ECHO',
      configEnvPath: 'config.env',
      bearerToken: 'TOKEN_SHOULD_NOT_ECHO',
      rawRuntimeResponse: 'RAW_RUNTIME_SHOULD_NOT_ECHO',
      rawMemory: 'RAW_MEMORY_SHOULD_NOT_ECHO',
      providerResponse: 'PROVIDER_SHOULD_NOT_ECHO',
      commitHash: 'COMMIT_SHOULD_NOT_ECHO',
      branchName: 'BRANCH_SHOULD_NOT_ECHO'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.decision, DISPLAY_REQUEST_DECISIONS.BLOCKED_NEEDS_DISPLAY_REQUEST_BOUNDARY);
  assert.equal(result.reasonCode, 'unsafe_sensitive_raw_or_request_payload_fields_present');
  assert.ok(result.unsafeFieldCategories.includes('locator_endpoint_or_path'));
  assert.ok(result.unsafeFieldCategories.includes('runtime_process_or_log_detail'));
  assert.ok(result.unsafeFieldCategories.includes('secret_config_private_state'));
  assert.ok(result.unsafeFieldCategories.includes('raw_memory_or_runtime_output'));
  assert.ok(result.unsafeFieldCategories.includes('provider_response'));
  assert.ok(result.unsafeFieldCategories.includes('commit_branch_or_expiry_value'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_RUNTIME_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_MEMORY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PROVIDER_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('COMMIT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('BRANCH_SHOULD_NOT_ECHO'), false);
});

test('CM1713 blocks current display request envelope expansion', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalDisplayRequestBoundary(baseInput({
    currentDisplayRequestEnvelope: {
      allowedCurrentDisplayRequestActions: [
        'cm1712_final_review_ready_status_review',
        'real_approval_request_submission'
      ],
      maxRuntimeCalls: 1,
      maxRuntimeProbeMinutes: 1,
      maxTargetSpecificRuntimeInspections: 1,
      memoryBudget: 1,
      providerBudget: 1,
      writeBudget: 1,
      maxApprovalRequestSubmissions: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, DISPLAY_REQUEST_DECISIONS.BLOCKED_NEEDS_DISPLAY_REQUEST_BOUNDARY);
  assert.equal(result.reasonCode, 'current_display_request_envelope_expanded_or_incomplete');
  assert.ok(result.envelopeViolations.includes('allowedCurrentDisplayRequestActions'));
  assert.ok(result.envelopeViolations.includes('maxRuntimeCalls'));
  assert.ok(result.envelopeViolations.includes('maxApprovalRequestSubmissions'));
  assert.equal(result.currentDisplayRequestEnvelope.allowedCurrentDisplayRequestActions.includes('real_approval_request_submission'), false);
});

test('CM1713 blocks future runtime action expansion through prior final review gate', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalDisplayRequestBoundary(baseInput({
    futureExecutionBoundary: {
      cm1705BoundaryStatus: 'FAILED',
      exactApprovalRequired: false,
      allowedFutureRuntimeActions: [
        'target_presence_probe',
        'memory_read_probe'
      ],
      maxRuntimeCalls: 4,
      maxRuntimeProbeMinutes: 11,
      maxTargetSpecificRuntimeInspections: 2,
      memoryBudget: 1,
      providerBudget: 1,
      writeBudget: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, DISPLAY_REQUEST_DECISIONS.BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'cm1712_prior_final_review_gate_rejected');
  assert.equal(result.priorFinalReviewAccepted, false);
  assert.equal(result.futureExecutionBoundary.allowedFutureRuntimeActions.includes('memory_read_probe'), false);
});

test('CM1713 blocks readiness complete-V8 runtime and real request submission claims', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalDisplayRequestBoundary(baseInput({
    readinessClaimed: true,
    completeV8Claimed: true,
    runtimeAlreadyExecuted: true,
    runtimeRouteOpened: true,
    targetSpecificRuntimeInspectionExecuted: true,
    realApprovalRequestSubmitted: true,
    approvalRequestDispatched: true,
    approvalRequestPayloadGenerated: true,
    approvalRequestTemplateIncluded: true,
    approvalLineSimulated: true
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, DISPLAY_REQUEST_DECISIONS.BLOCKED_NEEDS_DISPLAY_REQUEST_BOUNDARY);
  assert.equal(result.reasonCode, 'forbidden_submission_authorization_runtime_or_claim_present');
  assert.ok(result.forbiddenTrueFlags.includes('readinessClaimed'));
  assert.ok(result.forbiddenTrueFlags.includes('completeV8Claimed'));
  assert.ok(result.forbiddenTrueFlags.includes('runtimeAlreadyExecuted'));
  assert.ok(result.forbiddenTrueFlags.includes('realApprovalRequestSubmitted'));
  assert.ok(result.forbiddenTrueFlags.includes('approvalRequestDispatched'));
  assert.ok(result.forbiddenTrueFlags.includes('approvalLineSimulated'));
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.completeV8Claimed, false);
  assert.equal(result.realApprovalRequestSubmitted, false);
});

test('CM1713 blocks nonzero display request counters', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalDisplayRequestBoundary(baseInput({
    counters: {
      runtimeCalls: 1,
      memoryReads: 1,
      providerApiCalls: 1,
      approvalLinesIssued: 1,
      approvalLinesGenerated: 1,
      approvalLineTemplatesIncluded: 1,
      approvalRequestsSubmitted: 1,
      approvalRequestsDispatched: 1,
      approvalRequestPayloadsGenerated: 1,
      approvalRequestTemplatesIncluded: 1,
      realApprovalRequestSurfacesOpened: 1,
      completeV8Claims: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, DISPLAY_REQUEST_DECISIONS.BLOCKED_NEEDS_DISPLAY_REQUEST_BOUNDARY);
  assert.equal(result.reasonCode, 'pre_display_request_counter_violation');
  assert.ok(result.counterViolations.includes('runtimeCalls'));
  assert.ok(result.counterViolations.includes('memoryReads'));
  assert.ok(result.counterViolations.includes('providerApiCalls'));
  assert.ok(result.counterViolations.includes('approvalLinesIssued'));
  assert.ok(result.counterViolations.includes('approvalRequestsSubmitted'));
  assert.ok(result.counterViolations.includes('approvalRequestPayloadsGenerated'));
  assert.ok(result.counterViolations.includes('realApprovalRequestSurfacesOpened'));
  assert.ok(result.counterViolations.includes('completeV8Claims'));
});

test('CM1713 locks exported vocabulary for final display request boundary', () => {
  assert.deepEqual(ALLOWED_CURRENT_DISPLAY_REQUEST_ACTIONS, [
    'cm1712_final_review_ready_status_review',
    'non_authorizing_display_request_package_check',
    'safe_reference_display_surface_check',
    'no_submission_no_approval_no_runtime_display_request'
  ]);
  assert.deepEqual(ALLOWED_DISPLAY_REQUEST_SECTIONS, [
    'master_stage_version_alignment',
    'sanitized_scope_summary',
    'future_runtime_boundary_summary',
    'low_disclosure_receipt_summary',
    'exact_approval_still_required_notice',
    'no_approval_line_no_runtime_notice',
    'abort_adjustment_context'
  ]);
  assert.deepEqual(ALLOWED_REQUEST_SURFACE_MODES, [
    'display_only',
    'request_draft_only',
    'review_surface_only'
  ]);
  assert.deepEqual(ALLOWED_FUTURE_RUNTIME_ACTIONS, [
    'target_presence_probe',
    'runtime_handshake_probe',
    'target_specific_no_memory_inspection'
  ]);
  assert.equal(
    DISPLAY_REQUEST_DECISIONS.REQUEST_PACKET_DISPLAY_REQUEST_PREPARED,
    'exact_approval_request_packet_display_request_prepared'
  );
  assert.equal(
    DISPLAY_REQUEST_DECISIONS.BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY,
    'blocked_needs_exact_approval_request_final_review_boundary'
  );
  assert.equal(
    DISPLAY_REQUEST_DECISIONS.BLOCKED_NEEDS_DISPLAY_REQUEST_BOUNDARY,
    'blocked_needs_exact_approval_request_display_request_boundary'
  );
  assert.equal(DISPLAY_REQUEST_DECISIONS.NEEDS_PLAN_ADJUSTMENT, 'needs_plan_adjustment');
});
