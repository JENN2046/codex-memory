'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_CURRENT_REQUEST_REVIEW_ACTIONS,
  ALLOWED_FUTURE_RUNTIME_ACTIONS,
  CONTRACT_MODE,
  MAX_FUTURE_RUNTIME_CALLS,
  MAX_FUTURE_RUNTIME_PROBE_MINUTES,
  MAX_FUTURE_TARGET_SPECIFIC_RUNTIME_INSPECTIONS,
  OPERATOR_DECISION,
  REQUEST_REVIEW_READINESS_DECISIONS,
  ZERO_COUNTERS,
  buildVcpToolBoxStage02ExactApprovalRequestPacketReviewReadinessBoundary
} = require('../src/core/VcpToolBoxStage02ExactApprovalRequestPacketReviewReadinessBoundary');

function baseInput(overrides = {}) {
  return {
    masterTaskbookReference: 'PROJECT_MASTER_TASKBOOK',
    masterTaskbookId: 'PROJECT-MASTER-TASKBOOK',
    stage02Reference: 'STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS',
    stage02Id: 'stage-02',
    versionReference: 'VERSION_STAGE_02_V1_10_CM1711_EXACT_APPROVAL_REQUEST_PACKET_REVIEW_READINESS_BOUNDARY',
    versionId: 'CM-1711',
    projectFinalGoalServed: true,
    stage02Alignment: {
      stageGoalServesMaster: true,
      projectFinalGoalServed: true,
      currentRequestReviewReadinessOnly: true
    },
    requestSkeleton: {
      cm1710RequestSkeletonStatus: 'CM1710_REQUEST_PACKET_SKELETON_PASSED',
      requestSkeletonReady: true,
      skeletonOnly: true,
      nonAuthorizing: true,
      futureRequestOnly: true,
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
    requestReviewPacket: {
      requestPacketIntent: 'future_exact_approval_request_review_readiness_only',
      requestReviewReadinessOnly: true,
      nonAuthorizing: true,
      exactApprovalStillRequired: true,
      exactApprovalRequired: true,
      reviewScopePresent: true,
      audienceSummaryPresent: true,
      scopeSummaryPresent: true,
      targetScopeSummaryPresent: true,
      principalScopeSummaryPresent: true,
      profileScopeSummaryPresent: true,
      riskSummaryPresent: true,
      abortConditionsPresent: true,
      validationPlanPresent: true,
      receiptPlanPresent: true,
      expiryPolicyPresent: true,
      singleUsePolicyPresent: true,
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
      runtimeRouteOpened: false
    },
    currentRequestReviewEnvelope: {
      allowedCurrentRequestReviewActions: [...ALLOWED_CURRENT_REQUEST_REVIEW_ACTIONS],
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

test('CM1711 marks request packet review-ready without approval line or runtime', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketReviewReadinessBoundary(baseInput());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, CONTRACT_MODE);
  assert.equal(result.operatorDecision, OPERATOR_DECISION);
  assert.equal(result.decision, REQUEST_REVIEW_READINESS_DECISIONS.REQUEST_PACKET_REVIEW_READY);
  assert.equal(result.reasonCode, 'exact_approval_request_packet_review_ready_no_approval_line_no_runtime');
  assert.equal(result.requestRoute, 'future_exact_approval_request_packet_review_ready_non_authorizing');
  assert.equal(result.alignment.requestSkeletonPassed, true);
  assert.equal(result.alignment.requestReviewReady, true);
  assert.equal(result.requestSkeleton.nonAuthorizing, true);
  assert.equal(result.requestReviewPacket.requestReviewReadinessOnly, true);
  assert.equal(result.requestReviewPacket.exactApprovalStillRequired, true);
  assert.equal(result.requestReviewPacket.approvalLineTemplateIncluded, false);
  assert.equal(result.requestReviewPacket.noRuntimeExecutionStatementPresent, true);
  assert.deepEqual(result.currentRequestReviewEnvelope.allowedCurrentRequestReviewActions, ALLOWED_CURRENT_REQUEST_REVIEW_ACTIONS);
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

test('CM1711 blocks missing or authorizing CM1710 request skeleton', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketReviewReadinessBoundary(baseInput({
    requestSkeleton: {
      cm1710RequestSkeletonStatus: 'MISSING',
      requestSkeletonReady: false,
      skeletonOnly: false,
      nonAuthorizing: false,
      futureRequestOnly: false,
      exactApprovalStillRequired: false,
      approvalLinePresent: true,
      approvalLineValueOmitted: false,
      approvalLineTemplateOmitted: false,
      runtimeAuthorizationGranted: true,
      runtimeRouteOpened: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, REQUEST_REVIEW_READINESS_DECISIONS.BLOCKED_NEEDS_REQUEST_SKELETON);
  assert.equal(result.reasonCode, 'cm1710_request_packet_skeleton_missing_or_unverified');
  assert.ok(result.requestSkeletonViolations.includes('cm1710RequestSkeletonStatus'));
  assert.ok(result.requestSkeletonViolations.includes('requestSkeletonReady'));
  assert.ok(result.requestSkeletonViolations.includes('nonAuthorizing'));
  assert.ok(result.requestSkeletonViolations.includes('approvalLinePresent'));
  assert.equal(result.approvalLineValueIncluded, false);
  assert.equal(result.runtimeAuthorizationGranted, false);
});

test('CM1711 blocks reject and needs_adjustment decision intake outcomes', () => {
  for (const decisionOutcome of ['reject', 'needs_adjustment']) {
    const result = buildVcpToolBoxStage02ExactApprovalRequestPacketReviewReadinessBoundary(baseInput({
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
    assert.equal(result.decision, REQUEST_REVIEW_READINESS_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE);
    assert.equal(result.reasonCode, 'cm1709_approve_requested_intake_missing_or_unverified');
    assert.ok(result.decisionIntakeViolations.includes('decisionOutcome'));
    assert.ok(result.decisionIntakeViolations.includes('futureApprovalRequestMayBePrepared'));
  }
});

test('CM1711 blocks missing CM1708 review boundary', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketReviewReadinessBoundary(baseInput({
    reviewBoundary: {
      cm1708ReviewBoundaryStatus: 'MISSING',
      reviewBoundaryPassed: false,
      humanExactApprovalStillRequired: false,
      approvalGrantStillForbidden: false,
      approvalLineGenerationAllowed: true,
      runtimeAuthorizationGranted: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, REQUEST_REVIEW_READINESS_DECISIONS.BLOCKED_NEEDS_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'cm1708_review_boundary_missing_or_unverified');
  assert.ok(result.reviewBoundaryViolations.includes('cm1708ReviewBoundaryStatus'));
  assert.ok(result.reviewBoundaryViolations.includes('approvalLineGenerationAllowed'));
});

test('CM1711 blocks missing CM1707 packet preflight', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketReviewReadinessBoundary(baseInput({
    packetPreflight: {
      cm1707PreflightStatus: 'MISSING',
      packetPreflightReady: false,
      approvalLinePresent: false,
      approvalLineValueOmitted: true,
      runtimeAuthorizationGranted: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, REQUEST_REVIEW_READINESS_DECISIONS.BLOCKED_NEEDS_PACKET_PREFLIGHT);
  assert.equal(result.reasonCode, 'cm1707_packet_preflight_missing_or_unverified');
  assert.ok(result.packetPreflightViolations.includes('cm1707PreflightStatus'));
  assert.ok(result.packetPreflightViolations.includes('packetPreflightReady'));
});

test('CM1711 blocks missing or unsafe CM1704 receipt plan', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketReviewReadinessBoundary(baseInput({
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
  assert.equal(result.decision, REQUEST_REVIEW_READINESS_DECISIONS.BLOCKED_NEEDS_RECEIPT_PLAN);
  assert.equal(result.reasonCode, 'cm1704_receipt_plan_missing_or_unsafe');
  assert.ok(result.receiptPlanViolations.includes('cm1704ReceiptContractStatus'));
  assert.ok(result.receiptPlanViolations.includes('referencesCm1704'));
  assert.ok(result.receiptPlanViolations.includes('readinessClaimAllowed'));
});

test('CM1711 returns plan adjustment when alignment or project_final_goal review is missing', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketReviewReadinessBoundary(baseInput({
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
      currentRequestReviewReadinessOnly: false
    },
    review: {
      projectFinalGoalServed: false,
      projectFinalGoalAnswer: 'uncertain'
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, REQUEST_REVIEW_READINESS_DECISIONS.NEEDS_PLAN_ADJUSTMENT);
  assert.equal(result.reasonCode, 'master_stage_version_or_project_final_goal_review_missing');
  assert.ok(result.alignment.missingAlignmentFields.includes('master_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('stage02_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('version_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('projectFinalGoalReview'));
});

test('CM1711 blocks incomplete or authorizing request review packet', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketReviewReadinessBoundary(baseInput({
    requestReviewPacket: {
      requestPacketIntent: 'approve_now',
      requestReviewReadinessOnly: false,
      nonAuthorizing: false,
      exactApprovalStillRequired: false,
      exactApprovalRequired: false,
      reviewScopePresent: false,
      audienceSummaryPresent: false,
      scopeSummaryPresent: false,
      targetScopeSummaryPresent: false,
      principalScopeSummaryPresent: false,
      profileScopeSummaryPresent: false,
      riskSummaryPresent: false,
      abortConditionsPresent: false,
      validationPlanPresent: false,
      receiptPlanPresent: false,
      expiryPolicyPresent: false,
      singleUsePolicyPresent: false,
      futureExecutionBoundaryReferencePresent: false,
      noRuntimeExecutionStatementPresent: false,
      noApprovalLineStatementPresent: false,
      lowDisclosureOutputPolicy: false,
      approvalLinePresent: false,
      runtimeAuthorizationGranted: false,
      runtimeRouteOpened: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, REQUEST_REVIEW_READINESS_DECISIONS.BLOCKED_NEEDS_REQUEST_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'request_packet_review_readiness_missing_or_unsafe');
  assert.ok(result.requestReviewPacketViolations.includes('requestPacketIntent'));
  assert.ok(result.requestReviewPacketViolations.includes('requestReviewReadinessOnly'));
  assert.ok(result.requestReviewPacketViolations.includes('audienceSummaryPresent'));
  assert.ok(result.requestReviewPacketViolations.includes('expiryPolicyPresent'));
  assert.ok(result.requestReviewPacketViolations.includes('singleUsePolicyPresent'));
});

test('CM1711 blocks approval line value template generation issue consume store and validate without echoing values', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketReviewReadinessBoundary(baseInput({
    requestReviewPacket: {
      ...baseInput().requestReviewPacket,
      approvalLinePresent: true,
      approvalLineTemplateIncluded: true,
      approvalLineGenerated: true,
      approvalLineStored: true,
      approvalLineValidated: true,
      approvalLineTemplate: 'APPROVAL_TEMPLATE_SHOULD_NOT_ECHO',
      approvalLineValue: 'APPROVAL_LINE_SHOULD_NOT_ECHO'
    },
    approvalLineIssued: true,
    approvalLineConsumed: true
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.decision, REQUEST_REVIEW_READINESS_DECISIONS.BLOCKED_NEEDS_REQUEST_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'unsafe_sensitive_or_raw_fields_present');
  assert.ok(result.unsafeFieldCategories.includes('approval_line_or_private_approval_material'));
  assert.equal(serialized.includes('APPROVAL_TEMPLATE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('APPROVAL_LINE_SHOULD_NOT_ECHO'), false);
  assert.equal(result.approvalLineTemplateIncluded, false);
  assert.equal(result.approvalLineIssued, false);
  assert.equal(result.approvalLineConsumed, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.approvalLineValidated, false);
});

test('CM1711 blocks unsafe locator config secret raw runtime and provider fields without echoing values', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketReviewReadinessBoundary(baseInput({
    submittedReviewMaterial: {
      targetPath: '/PRIVATE/VCPToolBox/path',
      endpoint: 'https://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
      host: 'PRIVATE_HOST_SHOULD_NOT_ECHO',
      port: '7605',
      runtimeLog: 'RUNTIME_LOG_SHOULD_NOT_ECHO',
      configEnvPath: 'config.env',
      bearerToken: 'TOKEN_SHOULD_NOT_ECHO',
      rawRuntimeResponse: 'RAW_RUNTIME_SHOULD_NOT_ECHO',
      rawMemory: 'RAW_MEMORY_SHOULD_NOT_ECHO',
      providerResponse: 'PROVIDER_SHOULD_NOT_ECHO'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.decision, REQUEST_REVIEW_READINESS_DECISIONS.BLOCKED_NEEDS_REQUEST_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'unsafe_sensitive_or_raw_fields_present');
  assert.ok(result.unsafeFieldCategories.includes('locator_endpoint_or_path'));
  assert.ok(result.unsafeFieldCategories.includes('runtime_process_or_log_detail'));
  assert.ok(result.unsafeFieldCategories.includes('secret_config_private_state'));
  assert.ok(result.unsafeFieldCategories.includes('raw_memory_or_runtime_output'));
  assert.ok(result.unsafeFieldCategories.includes('provider_response'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_RUNTIME_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_MEMORY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PROVIDER_SHOULD_NOT_ECHO'), false);
});

test('CM1711 blocks current request-review action and budget expansion', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketReviewReadinessBoundary(baseInput({
    currentRequestReviewEnvelope: {
      allowedCurrentRequestReviewActions: [
        'request_packet_skeleton_status_review',
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
  assert.equal(result.decision, REQUEST_REVIEW_READINESS_DECISIONS.BLOCKED_NEEDS_REQUEST_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'current_request_review_envelope_expanded_or_incomplete');
  assert.ok(result.envelopeViolations.includes('allowedCurrentRequestReviewActions'));
  assert.ok(result.envelopeViolations.includes('maxRuntimeCalls'));
  assert.ok(result.envelopeViolations.includes('memoryBudget'));
  assert.equal(result.currentRequestReviewEnvelope.allowedCurrentRequestReviewActions.includes('approval_line_template_generation'), false);
});

test('CM1711 blocks future runtime action and budget expansion', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketReviewReadinessBoundary(baseInput({
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
  assert.equal(result.decision, REQUEST_REVIEW_READINESS_DECISIONS.BLOCKED_NEEDS_REQUEST_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'cm1705_future_execution_boundary_missing_or_expanded');
  assert.ok(result.futureBoundaryViolations.includes('cm1705BoundaryStatus'));
  assert.ok(result.futureBoundaryViolations.includes('exactApprovalRequired'));
  assert.ok(result.futureBoundaryViolations.includes('allowedFutureRuntimeActions'));
  assert.equal(result.futureExecutionBoundary.allowedFutureRuntimeActions.includes('memory_read_probe'), false);
});

test('CM1711 blocks readiness complete-V8 and runtime execution claims', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketReviewReadinessBoundary(baseInput({
    readinessClaimed: true,
    completeV8Claimed: true,
    runtimeAlreadyExecuted: true,
    runtimeRouteOpened: true,
    targetSpecificRuntimeInspectionExecuted: true,
    approvalLineTemplateIncluded: true
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, REQUEST_REVIEW_READINESS_DECISIONS.BLOCKED_NEEDS_REQUEST_REVIEW_BOUNDARY);
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

test('CM1711 blocks nonzero request-review counters', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketReviewReadinessBoundary(baseInput({
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
  assert.equal(result.decision, REQUEST_REVIEW_READINESS_DECISIONS.BLOCKED_NEEDS_REQUEST_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'pre_request_review_counter_violation');
  assert.ok(result.counterViolations.includes('runtimeCalls'));
  assert.ok(result.counterViolations.includes('memoryReads'));
  assert.ok(result.counterViolations.includes('providerApiCalls'));
  assert.ok(result.counterViolations.includes('approvalLinesIssued'));
  assert.ok(result.counterViolations.includes('approvalLineTemplatesIncluded'));
  assert.ok(result.counterViolations.includes('runtimeAuthorizationsGranted'));
  assert.ok(result.counterViolations.includes('completeV8Claims'));
});

test('CM1711 locks exported vocabulary for exact approval request review-readiness routing', () => {
  assert.deepEqual(ALLOWED_CURRENT_REQUEST_REVIEW_ACTIONS, [
    'request_packet_skeleton_status_review',
    'request_packet_review_shape_check',
    'request_scope_and_risk_summary_check',
    'no_approval_no_runtime_review_readiness'
  ]);
  assert.deepEqual(ALLOWED_FUTURE_RUNTIME_ACTIONS, [
    'target_presence_probe',
    'runtime_handshake_probe',
    'target_specific_no_memory_inspection'
  ]);
  assert.equal(REQUEST_REVIEW_READINESS_DECISIONS.REQUEST_PACKET_REVIEW_READY, 'exact_approval_request_packet_review_ready');
  assert.equal(REQUEST_REVIEW_READINESS_DECISIONS.BLOCKED_NEEDS_REQUEST_SKELETON, 'blocked_needs_exact_approval_request_packet_skeleton');
  assert.equal(REQUEST_REVIEW_READINESS_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE, 'blocked_needs_exact_approval_decision_intake');
  assert.equal(REQUEST_REVIEW_READINESS_DECISIONS.BLOCKED_NEEDS_REVIEW_BOUNDARY, 'blocked_needs_exact_approval_packet_review_boundary');
  assert.equal(REQUEST_REVIEW_READINESS_DECISIONS.BLOCKED_NEEDS_PACKET_PREFLIGHT, 'blocked_needs_exact_approval_packet_preflight');
  assert.equal(REQUEST_REVIEW_READINESS_DECISIONS.BLOCKED_NEEDS_REQUEST_REVIEW_BOUNDARY, 'blocked_needs_exact_approval_request_review_boundary');
  assert.equal(REQUEST_REVIEW_READINESS_DECISIONS.BLOCKED_NEEDS_RECEIPT_PLAN, 'blocked_needs_receipt_plan');
  assert.equal(REQUEST_REVIEW_READINESS_DECISIONS.NEEDS_PLAN_ADJUSTMENT, 'needs_plan_adjustment');
});
