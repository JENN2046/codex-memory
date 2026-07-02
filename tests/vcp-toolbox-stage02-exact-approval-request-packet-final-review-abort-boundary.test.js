'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_CURRENT_FINAL_REVIEW_ACTIONS,
  ALLOWED_FUTURE_RUNTIME_ACTIONS,
  CONTRACT_MODE,
  FINAL_REVIEW_ABORT_DECISIONS,
  FINAL_REVIEW_OUTCOMES,
  MAX_FUTURE_RUNTIME_CALLS,
  MAX_FUTURE_RUNTIME_PROBE_MINUTES,
  MAX_FUTURE_TARGET_SPECIFIC_RUNTIME_INSPECTIONS,
  OPERATOR_DECISION,
  ZERO_COUNTERS,
  buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary
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

function baseInput(overrides = {}) {
  return {
    masterTaskbookReference: 'PROJECT_MASTER_TASKBOOK',
    masterTaskbookId: 'PROJECT-MASTER-TASKBOOK',
    stage02Reference: 'STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS',
    stage02Id: 'stage-02',
    versionReference: 'VERSION_STAGE_02_V1_11_CM1712_EXACT_APPROVAL_REQUEST_PACKET_FINAL_REVIEW_ABORT_BOUNDARY',
    versionId: 'CM-1712',
    projectFinalGoalServed: true,
    stage02Alignment: {
      stageGoalServesMaster: true,
      projectFinalGoalServed: true,
      currentFinalReviewAbortOnly: true
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
    currentFinalReviewEnvelope: {
      allowedCurrentFinalReviewActions: [...ALLOWED_CURRENT_FINAL_REVIEW_ACTIONS],
      maxRuntimeCalls: 0,
      maxRuntimeProbeMinutes: 0,
      maxTargetSpecificRuntimeInspections: 0,
      memoryBudget: 0,
      providerBudget: 0,
      writeBudget: 0
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

test('CM1712 accepts proceed route as future request preparation only', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary(baseInput());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, CONTRACT_MODE);
  assert.equal(result.operatorDecision, OPERATOR_DECISION);
  assert.equal(result.decision, FINAL_REVIEW_ABORT_DECISIONS.REQUEST_PACKET_FINAL_REVIEW_READY);
  assert.equal(result.reasonCode, 'exact_approval_request_packet_final_review_ready_no_approval_line_no_runtime');
  assert.equal(result.requestRoute, 'future_exact_approval_request_packet_final_review_ready_non_authorizing');
  assert.equal(result.finalReviewOutcome, 'proceed_to_future_exact_approval_request');
  assert.equal(result.futureApprovalRequestMayBePrepared, true);
  assert.equal(result.alignment.requestReviewReadinessPassed, true);
  assert.equal(result.alignment.finalReviewReady, true);
  assert.deepEqual(result.currentFinalReviewEnvelope.allowedCurrentFinalReviewActions, ALLOWED_CURRENT_FINAL_REVIEW_ACTIONS);
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
  assert.equal(result.runtimeAuthorizationGranted, false);
  assert.equal(result.runtimeRouteOpened, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.completeV8Claimed, false);
  assert.deepEqual(result.localSafeCounters, ZERO_COUNTERS);
});

test('CM1712 accepts abort route as closed and non-authorizing', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary(baseInput({
    finalReview: finalReview({
      finalReviewOutcome: 'abort_request_packet',
      futureApprovalRequestMayBePrepared: false,
      abortRequestPacket: true,
      abortReasonSummaryPresent: true,
      needsAdjustment: false
    })
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.decision, FINAL_REVIEW_ABORT_DECISIONS.REQUEST_PACKET_FINAL_REVIEW_ABORTED);
  assert.equal(result.reasonCode, 'exact_approval_request_packet_final_review_aborted_no_approval_line_no_runtime');
  assert.equal(result.requestRoute, 'future_exact_approval_request_packet_aborted_non_authorizing');
  assert.equal(result.finalReviewOutcome, 'abort_request_packet');
  assert.equal(result.futureApprovalRequestMayBePrepared, false);
  assert.equal(result.finalReview.abortRequestPacket, true);
  assert.equal(result.runtimeAuthorizationGranted, false);
});

test('CM1712 accepts needs_adjustment route as closed and non-authorizing', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary(baseInput({
    finalReview: finalReview({
      finalReviewOutcome: 'needs_adjustment',
      futureApprovalRequestMayBePrepared: false,
      abortRequestPacket: false,
      needsAdjustment: true,
      adjustmentSummaryPresent: true
    })
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.decision, FINAL_REVIEW_ABORT_DECISIONS.REQUEST_PACKET_FINAL_REVIEW_NEEDS_ADJUSTMENT);
  assert.equal(result.reasonCode, 'exact_approval_request_packet_final_review_needs_adjustment_no_approval_line_no_runtime');
  assert.equal(result.requestRoute, 'future_exact_approval_request_packet_needs_adjustment_non_authorizing');
  assert.equal(result.finalReviewOutcome, 'needs_adjustment');
  assert.equal(result.futureApprovalRequestMayBePrepared, false);
  assert.equal(result.finalReview.needsAdjustment, true);
  assert.equal(result.approvalLineTemplateIncluded, false);
});

test('CM1712 blocks missing CM1711 request review-readiness', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary(baseInput({
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
  assert.equal(result.decision, FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_REQUEST_REVIEW_READINESS);
  assert.equal(result.reasonCode, 'cm1711_request_review_readiness_missing_or_unverified');
  assert.ok(result.requestReviewReadinessViolations.includes('cm1711RequestReviewReadinessStatus'));
  assert.ok(result.requestReviewReadinessViolations.includes('requestReviewReady'));
  assert.ok(result.requestReviewReadinessViolations.includes('approvalLinePresent'));
  assert.equal(result.approvalLineValueIncluded, false);
  assert.equal(result.runtimeAuthorizationGranted, false);
});

test('CM1712 blocks missing CM1710 request skeleton', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary(baseInput({
    requestSkeleton: {
      cm1710RequestSkeletonStatus: 'MISSING',
      requestSkeletonReady: false,
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
  assert.equal(result.decision, FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_REQUEST_SKELETON);
  assert.equal(result.reasonCode, 'cm1710_request_packet_skeleton_missing_or_unverified');
  assert.ok(result.requestSkeletonViolations.includes('cm1710RequestSkeletonStatus'));
  assert.ok(result.requestSkeletonViolations.includes('requestSkeletonReady'));
});

test('CM1712 blocks reject and needs_adjustment decision intake outcomes', () => {
  for (const decisionOutcome of ['reject', 'needs_adjustment']) {
    const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary(baseInput({
      decisionIntake: {
        cm1709DecisionIntakeStatus: 'CM1709_DECISION_INTAKE_PASSED',
        decisionOutcome,
        futureApprovalRequestMayBePrepared: false,
        exactApprovalStillRequired: true,
        approvalLinePresent: false,
        approvalLineValueOmitted: true,
        runtimeAuthorizationGranted: false,
        runtimeRouteOpened: false
      }
    }));

    assert.equal(result.accepted, false);
    assert.equal(result.decision, FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE);
    assert.equal(result.reasonCode, 'cm1709_approve_requested_intake_missing_or_unverified');
    assert.ok(result.decisionIntakeViolations.includes('decisionOutcome'));
  }
});

test('CM1712 blocks missing CM1708 review boundary and CM1707 preflight separately', () => {
  const missingReview = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary(baseInput({
    reviewBoundary: {
      cm1708ReviewBoundaryStatus: 'MISSING',
      reviewBoundaryPassed: false,
      humanExactApprovalStillRequired: false,
      approvalGrantStillForbidden: false,
      approvalLineGenerationAllowed: true,
      runtimeAuthorizationGranted: true
    }
  }));
  assert.equal(missingReview.accepted, false);
  assert.equal(missingReview.decision, FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_REVIEW_BOUNDARY);
  assert.ok(missingReview.reviewBoundaryViolations.includes('cm1708ReviewBoundaryStatus'));

  const missingPreflight = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary(baseInput({
    packetPreflight: {
      cm1707PreflightStatus: 'MISSING',
      packetPreflightReady: false,
      approvalLinePresent: false,
      approvalLineValueOmitted: true,
      runtimeAuthorizationGranted: false
    }
  }));
  assert.equal(missingPreflight.accepted, false);
  assert.equal(missingPreflight.decision, FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_PACKET_PREFLIGHT);
  assert.ok(missingPreflight.packetPreflightViolations.includes('cm1707PreflightStatus'));
});

test('CM1712 blocks missing or unsafe CM1704 receipt plan', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary(baseInput({
    receiptPlan: {
      cm1704ReceiptContractStatus: 'MISSING',
      referencesCm1704: false,
      lowDisclosureOnly: false,
      rawRuntimeOutputAllowed: true,
      rawMemoryAllowed: true,
      secretOrTokenOutputAllowed: true,
      readinessClaimAllowed: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_RECEIPT_PLAN);
  assert.equal(result.reasonCode, 'cm1704_receipt_plan_missing_or_unsafe');
  assert.ok(result.receiptPlanViolations.includes('cm1704ReceiptContractStatus'));
  assert.ok(result.receiptPlanViolations.includes('readinessClaimAllowed'));
});

test('CM1712 returns plan adjustment when alignment or project_final_goal review is missing', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary(baseInput({
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
      currentFinalReviewAbortOnly: false
    },
    review: {
      projectFinalGoalServed: false,
      projectFinalGoalAnswer: 'uncertain'
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, FINAL_REVIEW_ABORT_DECISIONS.NEEDS_PLAN_ADJUSTMENT);
  assert.equal(result.reasonCode, 'master_stage_version_or_project_final_goal_review_missing');
  assert.ok(result.alignment.missingAlignmentFields.includes('master_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('stage02_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('version_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('projectFinalGoalReview'));
});

test('CM1712 blocks invalid or mismatched final review routes', () => {
  const unknown = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary(baseInput({
    finalReview: finalReview({ finalReviewOutcome: 'approve_now' })
  }));
  assert.equal(unknown.accepted, false);
  assert.equal(unknown.decision, FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY);
  assert.ok(unknown.finalReviewViolations.includes('finalReviewOutcome'));

  const mismatchedProceed = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary(baseInput({
    finalReview: finalReview({
      finalReviewOutcome: 'proceed_to_future_exact_approval_request',
      futureApprovalRequestMayBePrepared: false
    })
  }));
  assert.equal(mismatchedProceed.accepted, false);
  assert.ok(mismatchedProceed.finalReviewViolations.includes('futureApprovalRequestMayBePrepared'));

  const mismatchedAbort = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary(baseInput({
    finalReview: finalReview({
      finalReviewOutcome: 'abort_request_packet',
      futureApprovalRequestMayBePrepared: false,
      abortRequestPacket: true,
      needsAdjustment: false,
      abortReasonSummaryPresent: false
    })
  }));
  assert.equal(mismatchedAbort.accepted, false);
  assert.ok(mismatchedAbort.finalReviewViolations.includes('abortReasonSummaryPresent'));
});

test('CM1712 blocks approval line value template generation issue consume store and validate without echoing values', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary(baseInput({
    finalReview: finalReview({
      approvalLinePresent: true,
      approvalLineTemplateIncluded: true,
      approvalLineGenerated: true,
      approvalLineStored: true,
      approvalLineValidated: true,
      approvalLineTemplate: 'APPROVAL_TEMPLATE_SHOULD_NOT_ECHO',
      approvalLineValue: 'APPROVAL_LINE_SHOULD_NOT_ECHO'
    }),
    approvalLineIssued: true,
    approvalLineConsumed: true
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.decision, FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'unsafe_sensitive_or_raw_fields_present');
  assert.ok(result.unsafeFieldCategories.includes('approval_line_or_private_approval_material'));
  assert.equal(serialized.includes('APPROVAL_TEMPLATE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('APPROVAL_LINE_SHOULD_NOT_ECHO'), false);
  assert.equal(result.approvalLineTemplateIncluded, false);
  assert.equal(result.approvalLineIssued, false);
  assert.equal(result.approvalLineConsumed, false);
});

test('CM1712 blocks unsafe locator config secret raw runtime provider commit and branch fields without echoing values', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary(baseInput({
    submittedFinalReviewMaterial: {
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
  assert.equal(result.decision, FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'unsafe_sensitive_or_raw_fields_present');
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

test('CM1712 blocks current final-review action and budget expansion', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary(baseInput({
    currentFinalReviewEnvelope: {
      allowedCurrentFinalReviewActions: [
        'request_packet_review_readiness_status_review',
        'approval_line_template_generation'
      ],
      maxRuntimeCalls: 1,
      maxRuntimeProbeMinutes: 1,
      maxTargetSpecificRuntimeInspections: 1,
      memoryBudget: 1,
      providerBudget: 1,
      writeBudget: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'current_final_review_envelope_expanded_or_incomplete');
  assert.ok(result.envelopeViolations.includes('allowedCurrentFinalReviewActions'));
  assert.ok(result.envelopeViolations.includes('maxRuntimeCalls'));
  assert.ok(result.envelopeViolations.includes('memoryBudget'));
  assert.equal(result.currentFinalReviewEnvelope.allowedCurrentFinalReviewActions.includes('approval_line_template_generation'), false);
});

test('CM1712 blocks future runtime action and budget expansion', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary(baseInput({
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
  assert.equal(result.decision, FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'cm1705_future_execution_boundary_missing_or_expanded');
  assert.ok(result.futureBoundaryViolations.includes('cm1705BoundaryStatus'));
  assert.ok(result.futureBoundaryViolations.includes('exactApprovalRequired'));
  assert.ok(result.futureBoundaryViolations.includes('allowedFutureRuntimeActions'));
  assert.equal(result.futureExecutionBoundary.allowedFutureRuntimeActions.includes('memory_read_probe'), false);
});

test('CM1712 blocks readiness complete-V8 and runtime execution claims', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary(baseInput({
    readinessClaimed: true,
    completeV8Claimed: true,
    runtimeAlreadyExecuted: true,
    runtimeRouteOpened: true,
    targetSpecificRuntimeInspectionExecuted: true,
    approvalLineTemplateIncluded: true
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'forbidden_execution_authorization_or_claim_present');
  assert.ok(result.forbiddenTrueFlags.includes('readinessClaimed'));
  assert.ok(result.forbiddenTrueFlags.includes('completeV8Claimed'));
  assert.ok(result.forbiddenTrueFlags.includes('runtimeAlreadyExecuted'));
  assert.ok(result.forbiddenTrueFlags.includes('runtimeRouteOpened'));
  assert.ok(result.forbiddenTrueFlags.includes('targetSpecificRuntimeInspectionExecuted'));
  assert.ok(result.forbiddenTrueFlags.includes('approvalLineTemplateIncluded'));
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.completeV8Claimed, false);
});

test('CM1712 blocks nonzero final-review counters', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketFinalReviewAbortBoundary(baseInput({
    counters: {
      runtimeCalls: 1,
      memoryReads: 1,
      providerApiCalls: 1,
      approvalLinesIssued: 1,
      approvalLinesConsumed: 1,
      approvalLinesStored: 1,
      approvalLinesGenerated: 1,
      approvalLinesValidated: 1,
      approvalLineTemplatesIncluded: 1,
      runtimeAuthorizationsGranted: 1,
      completeV8Claims: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'pre_final_review_counter_violation');
  assert.ok(result.counterViolations.includes('runtimeCalls'));
  assert.ok(result.counterViolations.includes('memoryReads'));
  assert.ok(result.counterViolations.includes('providerApiCalls'));
  assert.ok(result.counterViolations.includes('approvalLinesIssued'));
  assert.ok(result.counterViolations.includes('approvalLineTemplatesIncluded'));
  assert.ok(result.counterViolations.includes('runtimeAuthorizationsGranted'));
  assert.ok(result.counterViolations.includes('completeV8Claims'));
});

test('CM1712 locks exported vocabulary for final review abort routing', () => {
  assert.deepEqual(ALLOWED_CURRENT_FINAL_REVIEW_ACTIONS, [
    'request_packet_review_readiness_status_review',
    'final_non_authorizing_route_check',
    'abort_or_adjustment_boundary_check',
    'no_approval_no_runtime_final_review'
  ]);
  assert.deepEqual(ALLOWED_FUTURE_RUNTIME_ACTIONS, [
    'target_presence_probe',
    'runtime_handshake_probe',
    'target_specific_no_memory_inspection'
  ]);
  assert.deepEqual(FINAL_REVIEW_OUTCOMES, [
    'proceed_to_future_exact_approval_request',
    'abort_request_packet',
    'needs_adjustment'
  ]);
  assert.equal(FINAL_REVIEW_ABORT_DECISIONS.REQUEST_PACKET_FINAL_REVIEW_READY, 'exact_approval_request_packet_final_review_ready');
  assert.equal(FINAL_REVIEW_ABORT_DECISIONS.REQUEST_PACKET_FINAL_REVIEW_ABORTED, 'exact_approval_request_packet_final_review_aborted');
  assert.equal(FINAL_REVIEW_ABORT_DECISIONS.REQUEST_PACKET_FINAL_REVIEW_NEEDS_ADJUSTMENT, 'exact_approval_request_packet_final_review_needs_adjustment');
  assert.equal(FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_REQUEST_REVIEW_READINESS, 'blocked_needs_exact_approval_request_review_readiness');
  assert.equal(FINAL_REVIEW_ABORT_DECISIONS.BLOCKED_NEEDS_FINAL_REVIEW_BOUNDARY, 'blocked_needs_exact_approval_request_final_review_boundary');
  assert.equal(FINAL_REVIEW_ABORT_DECISIONS.NEEDS_PLAN_ADJUSTMENT, 'needs_plan_adjustment');
});
