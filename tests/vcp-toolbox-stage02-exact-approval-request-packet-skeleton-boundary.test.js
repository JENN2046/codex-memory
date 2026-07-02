'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_CURRENT_REQUEST_SKELETON_ACTIONS,
  ALLOWED_FUTURE_RUNTIME_ACTIONS,
  CONTRACT_MODE,
  MAX_FUTURE_RUNTIME_CALLS,
  MAX_FUTURE_RUNTIME_PROBE_MINUTES,
  MAX_FUTURE_TARGET_SPECIFIC_RUNTIME_INSPECTIONS,
  OPERATOR_DECISION,
  REQUEST_SKELETON_DECISIONS,
  ZERO_COUNTERS,
  buildVcpToolBoxStage02ExactApprovalRequestPacketSkeletonBoundary
} = require('../src/core/VcpToolBoxStage02ExactApprovalRequestPacketSkeletonBoundary');

function baseInput(overrides = {}) {
  return {
    masterTaskbookReference: 'PROJECT_MASTER_TASKBOOK',
    masterTaskbookId: 'PROJECT-MASTER-TASKBOOK',
    stage02Reference: 'STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS',
    stage02Id: 'stage-02',
    versionReference: 'VERSION_STAGE_02_V1_9_CM1710_EXACT_APPROVAL_REQUEST_PACKET_SKELETON_BOUNDARY',
    versionId: 'CM-1710',
    projectFinalGoalServed: true,
    stage02Alignment: {
      stageGoalServesMaster: true,
      projectFinalGoalServed: true,
      currentRequestSkeletonOnly: true
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
      futurePacketOnly: true,
      approvalLinePresent: false,
      approvalLineValueOmitted: true,
      runtimeAuthorizationGranted: false
    },
    requestPacketSkeleton: {
      requestPacketId: 'CM1710-REQUEST-PACKET-SKELETON',
      requestPacketIntent: 'future_exact_approval_request_packet_skeleton_only',
      skeletonOnly: true,
      nonAuthorizing: true,
      futureRequestOnly: true,
      exactApprovalStillRequired: true,
      approvalLinePresent: false,
      approvalLineValueOmitted: true,
      approvalLineTemplateOmitted: true,
      approvalLineGenerated: false,
      approvalLineStored: false,
      approvalLineValidated: false,
      runtimeAuthorizationGranted: false,
      runtimeRouteOpened: false,
      targetScopeSummaryPresent: true,
      principalScopeSummaryPresent: true,
      profileScopeSummaryPresent: true,
      riskSummaryPresent: true,
      abortConditionsPresent: true,
      receiptPlanReferencePresent: true,
      validationPlanReferencePresent: true,
      futureExecutionBoundaryReferencePresent: true,
      noRuntimeExecutionStatementPresent: true,
      noApprovalLineStatementPresent: true,
      lowDisclosureOutputPolicy: true
    },
    currentRequestSkeletonEnvelope: {
      allowedCurrentRequestSkeletonActions: [...ALLOWED_CURRENT_REQUEST_SKELETON_ACTIONS],
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

test('CM1710 prepares non-authorizing exact approval request packet skeleton without approval line or runtime', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketSkeletonBoundary(baseInput());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, CONTRACT_MODE);
  assert.equal(result.operatorDecision, OPERATOR_DECISION);
  assert.equal(result.decision, REQUEST_SKELETON_DECISIONS.REQUEST_PACKET_SKELETON_READY);
  assert.equal(result.reasonCode, 'exact_approval_request_packet_skeleton_ready_no_approval_line_no_runtime');
  assert.equal(result.requestRoute, 'future_exact_approval_request_packet_skeleton_ready_non_authorizing');
  assert.equal(result.alignment.decisionIntakePassed, true);
  assert.equal(result.alignment.requestSkeletonReady, true);
  assert.equal(result.decisionIntake.decisionOutcome, 'approve_requested');
  assert.equal(result.requestPacketSkeleton.skeletonOnly, true);
  assert.equal(result.requestPacketSkeleton.nonAuthorizing, true);
  assert.equal(result.requestPacketSkeleton.approvalLineTemplateOmitted, true);
  assert.equal(result.requestPacketSkeleton.noRuntimeExecutionStatementPresent, true);
  assert.deepEqual(result.currentRequestSkeletonEnvelope.allowedCurrentRequestSkeletonActions, ALLOWED_CURRENT_REQUEST_SKELETON_ACTIONS);
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
  assert.equal(result.approvalLineValueIncluded, false);
  assert.equal(result.runtimeAuthorizationGranted, false);
  assert.equal(result.runtimeRouteOpened, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.completeV8Claimed, false);
  assert.deepEqual(result.localSafeCounters, ZERO_COUNTERS);
});

test('CM1710 blocks reject and needs_adjustment decision intake outcomes', () => {
  for (const decisionOutcome of ['reject', 'needs_adjustment']) {
    const result = buildVcpToolBoxStage02ExactApprovalRequestPacketSkeletonBoundary(baseInput({
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
    assert.equal(result.decision, REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE);
    assert.equal(result.reasonCode, 'cm1709_approve_requested_intake_missing_or_unverified');
    assert.ok(result.decisionIntakeViolations.includes('decisionOutcome'));
    assert.ok(result.decisionIntakeViolations.includes('futureApprovalRequestMayBePrepared'));
    assert.equal(result.runtimeRouteOpened, false);
  }
});

test('CM1710 blocks missing CM1709 decision intake', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketSkeletonBoundary(baseInput({
    decisionIntake: {
      cm1709DecisionIntakeStatus: 'MISSING',
      decisionOutcome: 'approve_requested',
      futureApprovalRequestMayBePrepared: true,
      exactApprovalStillRequired: true,
      approvalLinePresent: false,
      approvalLineValueOmitted: true,
      runtimeAuthorizationGranted: false,
      runtimeRouteOpened: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE);
  assert.equal(result.reasonCode, 'cm1709_approve_requested_intake_missing_or_unverified');
  assert.ok(result.decisionIntakeViolations.includes('cm1709DecisionIntakeStatus'));
});

test('CM1710 blocks missing CM1708 review boundary', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketSkeletonBoundary(baseInput({
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
  assert.equal(result.decision, REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'cm1708_review_boundary_missing_or_unverified');
  assert.ok(result.reviewBoundaryViolations.includes('cm1708ReviewBoundaryStatus'));
  assert.ok(result.reviewBoundaryViolations.includes('reviewBoundaryPassed'));
  assert.ok(result.reviewBoundaryViolations.includes('approvalLineGenerationAllowed'));
});

test('CM1710 blocks missing CM1707 packet preflight', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketSkeletonBoundary(baseInput({
    packetPreflight: {
      cm1707PreflightStatus: 'MISSING',
      packetPreflightReady: false,
      futurePacketOnly: true,
      approvalLinePresent: false,
      approvalLineValueOmitted: true,
      runtimeAuthorizationGranted: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_PACKET_PREFLIGHT);
  assert.equal(result.reasonCode, 'cm1707_packet_preflight_missing_or_unverified');
  assert.ok(result.packetPreflightViolations.includes('cm1707PreflightStatus'));
  assert.ok(result.packetPreflightViolations.includes('packetPreflightReady'));
});

test('CM1710 blocks missing or unsafe CM1704 receipt plan', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketSkeletonBoundary(baseInput({
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
  assert.equal(result.decision, REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_RECEIPT_PLAN);
  assert.equal(result.reasonCode, 'cm1704_receipt_plan_missing_or_unsafe');
  assert.ok(result.receiptPlanViolations.includes('cm1704ReceiptContractStatus'));
  assert.ok(result.receiptPlanViolations.includes('referencesCm1704'));
  assert.ok(result.receiptPlanViolations.includes('lowDisclosureOnly'));
  assert.ok(result.receiptPlanViolations.includes('readinessClaimAllowed'));
});

test('CM1710 returns plan adjustment when Stage 02 alignment or project_final_goal review is missing', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketSkeletonBoundary(baseInput({
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
      currentRequestSkeletonOnly: false
    },
    review: {
      projectFinalGoalServed: false,
      projectFinalGoalAnswer: 'uncertain'
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, REQUEST_SKELETON_DECISIONS.NEEDS_PLAN_ADJUSTMENT);
  assert.equal(result.reasonCode, 'master_stage_version_or_project_final_goal_review_missing');
  assert.ok(result.alignment.missingAlignmentFields.includes('master_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('stage02_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('version_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('projectFinalGoalServed'));
  assert.ok(result.alignment.missingAlignmentFields.includes('stage02Alignment'));
  assert.ok(result.alignment.missingAlignmentFields.includes('projectFinalGoalReview'));
});

test('CM1710 blocks incomplete or authorizing request packet skeleton', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketSkeletonBoundary(baseInput({
    requestPacketSkeleton: {
      requestPacketId: 'CM1710-REQUEST-PACKET-SKELETON',
      requestPacketIntent: 'approve_now',
      skeletonOnly: false,
      nonAuthorizing: false,
      futureRequestOnly: false,
      exactApprovalStillRequired: false,
      approvalLinePresent: false,
      approvalLineValueOmitted: true,
      approvalLineTemplateOmitted: false,
      approvalLineGenerated: false,
      approvalLineStored: false,
      approvalLineValidated: false,
      runtimeAuthorizationGranted: false,
      runtimeRouteOpened: false,
      targetScopeSummaryPresent: false,
      principalScopeSummaryPresent: false,
      profileScopeSummaryPresent: false,
      riskSummaryPresent: false,
      abortConditionsPresent: false,
      receiptPlanReferencePresent: false,
      validationPlanReferencePresent: false,
      futureExecutionBoundaryReferencePresent: false,
      noRuntimeExecutionStatementPresent: false,
      noApprovalLineStatementPresent: false,
      lowDisclosureOutputPolicy: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_REQUEST_SKELETON_BOUNDARY);
  assert.equal(result.reasonCode, 'request_packet_skeleton_missing_or_unsafe');
  assert.ok(result.requestSkeletonViolations.includes('skeletonOnly'));
  assert.ok(result.requestSkeletonViolations.includes('nonAuthorizing'));
  assert.ok(result.requestSkeletonViolations.includes('approvalLineTemplateOmitted'));
  assert.ok(result.requestSkeletonViolations.includes('requestPacketIntent'));
  assert.ok(result.requestSkeletonViolations.includes('riskSummaryPresent'));
});

test('CM1710 blocks approval line value generation issue consume store and validate without echoing values', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketSkeletonBoundary(baseInput({
    requestPacketSkeleton: {
      ...baseInput().requestPacketSkeleton,
      approvalLinePresent: true,
      approvalLineValueOmitted: false,
      approvalLineTemplateOmitted: false,
      approvalLineGenerated: true,
      approvalLineStored: true,
      approvalLineValidated: true,
      approvalLineValue: 'APPROVAL_LINE_SHOULD_NOT_ECHO'
    },
    approvalLineIssued: true,
    approvalLineConsumed: true
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.decision, REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_REQUEST_SKELETON_BOUNDARY);
  assert.equal(result.reasonCode, 'unsafe_sensitive_or_raw_fields_present');
  assert.ok(result.unsafeFieldCategories.includes('approval_line_or_private_approval_material'));
  assert.equal(serialized.includes('APPROVAL_LINE_SHOULD_NOT_ECHO'), false);
  assert.equal(result.approvalLineIssued, false);
  assert.equal(result.approvalLineConsumed, false);
  assert.equal(result.approvalLineStored, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.approvalLineValidated, false);
});

test('CM1710 blocks unsafe locator config secret raw runtime and provider fields without echoing values', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketSkeletonBoundary(baseInput({
    submittedEvidence: {
      targetPath: '/PRIVATE/VCPToolBox/path',
      endpoint: 'https://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
      port: '7605',
      runtimeConfig: 'RUNTIME_CONFIG_SHOULD_NOT_ECHO',
      configEnvPath: 'config.env',
      bearerToken: 'TOKEN_SHOULD_NOT_ECHO',
      rawRuntimeResponse: 'RAW_RUNTIME_SHOULD_NOT_ECHO',
      providerResponse: 'PROVIDER_SHOULD_NOT_ECHO'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.decision, REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_REQUEST_SKELETON_BOUNDARY);
  assert.equal(result.reasonCode, 'unsafe_sensitive_or_raw_fields_present');
  assert.ok(result.unsafeFieldCategories.includes('locator_endpoint_or_path'));
  assert.ok(result.unsafeFieldCategories.includes('secret_config_private_state'));
  assert.ok(result.unsafeFieldCategories.includes('raw_memory_or_runtime_output'));
  assert.ok(result.unsafeFieldCategories.includes('provider_response'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_RUNTIME_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PROVIDER_SHOULD_NOT_ECHO'), false);
});

test('CM1710 blocks current request-skeleton action and budget expansion', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketSkeletonBoundary(baseInput({
    currentRequestSkeletonEnvelope: {
      allowedCurrentRequestSkeletonActions: [
        'request_packet_skeleton_shape_review',
        'approval_line_generation'
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
  assert.equal(result.decision, REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_REQUEST_SKELETON_BOUNDARY);
  assert.equal(result.reasonCode, 'current_request_skeleton_envelope_expanded_or_incomplete');
  assert.ok(result.envelopeViolations.includes('allowedCurrentRequestSkeletonActions'));
  assert.ok(result.envelopeViolations.includes('maxRuntimeCalls'));
  assert.ok(result.envelopeViolations.includes('memoryBudget'));
  assert.equal(result.currentRequestSkeletonEnvelope.allowedCurrentRequestSkeletonActions.includes('approval_line_generation'), false);
});

test('CM1710 blocks future runtime action and budget expansion', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketSkeletonBoundary(baseInput({
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
  assert.equal(result.decision, REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_REQUEST_SKELETON_BOUNDARY);
  assert.equal(result.reasonCode, 'cm1705_future_execution_boundary_missing_or_expanded');
  assert.ok(result.futureBoundaryViolations.includes('cm1705BoundaryStatus'));
  assert.ok(result.futureBoundaryViolations.includes('exactApprovalRequired'));
  assert.ok(result.futureBoundaryViolations.includes('allowedFutureRuntimeActions'));
  assert.ok(result.futureBoundaryViolations.includes('maxRuntimeCalls'));
  assert.ok(result.futureBoundaryViolations.includes('memoryBudget'));
  assert.equal(result.futureExecutionBoundary.allowedFutureRuntimeActions.includes('memory_read_probe'), false);
});

test('CM1710 blocks readiness complete-V8 and runtime execution claims', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketSkeletonBoundary(baseInput({
    readinessClaimed: true,
    completeV8Claimed: true,
    runtimeAlreadyExecuted: true,
    runtimeRouteOpened: true,
    targetSpecificRuntimeInspectionExecuted: true
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_REQUEST_SKELETON_BOUNDARY);
  assert.equal(result.reasonCode, 'forbidden_execution_authorization_or_claim_present');
  assert.ok(result.forbiddenTrueFlags.includes('readinessClaimed'));
  assert.ok(result.forbiddenTrueFlags.includes('completeV8Claimed'));
  assert.ok(result.forbiddenTrueFlags.includes('runtimeAlreadyExecuted'));
  assert.ok(result.forbiddenTrueFlags.includes('runtimeRouteOpened'));
  assert.ok(result.forbiddenTrueFlags.includes('targetSpecificRuntimeInspectionExecuted'));
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.completeV8Claimed, false);
});

test('CM1710 blocks nonzero request-skeleton counters', () => {
  const result = buildVcpToolBoxStage02ExactApprovalRequestPacketSkeletonBoundary(baseInput({
    counters: {
      runtimeCalls: 1,
      memoryReads: 1,
      providerApiCalls: 1,
      approvalLinesIssued: 1,
      approvalLinesConsumed: 1,
      approvalLinesStored: 1,
      approvalLinesGenerated: 1,
      approvalLinesValidated: 1,
      runtimeAuthorizationsGranted: 1,
      completeV8Claims: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_REQUEST_SKELETON_BOUNDARY);
  assert.equal(result.reasonCode, 'pre_request_skeleton_counter_violation');
  assert.ok(result.counterViolations.includes('runtimeCalls'));
  assert.ok(result.counterViolations.includes('memoryReads'));
  assert.ok(result.counterViolations.includes('providerApiCalls'));
  assert.ok(result.counterViolations.includes('approvalLinesIssued'));
  assert.ok(result.counterViolations.includes('approvalLinesGenerated'));
  assert.ok(result.counterViolations.includes('approvalLinesValidated'));
  assert.ok(result.counterViolations.includes('runtimeAuthorizationsGranted'));
  assert.ok(result.counterViolations.includes('completeV8Claims'));
});

test('CM1710 locks exported vocabulary for exact approval request skeleton routing', () => {
  assert.deepEqual(ALLOWED_CURRENT_REQUEST_SKELETON_ACTIONS, [
    'request_packet_skeleton_shape_review',
    'scope_summary_reference_check',
    'receipt_plan_review',
    'no_approval_no_runtime_request_skeleton'
  ]);
  assert.deepEqual(ALLOWED_FUTURE_RUNTIME_ACTIONS, [
    'target_presence_probe',
    'runtime_handshake_probe',
    'target_specific_no_memory_inspection'
  ]);
  assert.equal(REQUEST_SKELETON_DECISIONS.REQUEST_PACKET_SKELETON_READY, 'exact_approval_request_packet_skeleton_ready');
  assert.equal(REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE, 'blocked_needs_exact_approval_decision_intake');
  assert.equal(REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_REVIEW_BOUNDARY, 'blocked_needs_exact_approval_packet_review_boundary');
  assert.equal(REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_PACKET_PREFLIGHT, 'blocked_needs_exact_approval_packet_preflight');
  assert.equal(REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_REQUEST_SKELETON_BOUNDARY, 'blocked_needs_exact_approval_request_skeleton_boundary');
  assert.equal(REQUEST_SKELETON_DECISIONS.BLOCKED_NEEDS_RECEIPT_PLAN, 'blocked_needs_receipt_plan');
  assert.equal(REQUEST_SKELETON_DECISIONS.NEEDS_PLAN_ADJUSTMENT, 'needs_plan_adjustment');
});
