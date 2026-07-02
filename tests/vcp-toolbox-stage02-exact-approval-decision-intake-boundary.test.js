'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_CURRENT_INTAKE_ACTIONS,
  ALLOWED_FUTURE_RUNTIME_ACTIONS,
  CONTRACT_MODE,
  DECISION_INTAKE_DECISIONS,
  DECISION_OUTCOMES,
  MAX_FUTURE_RUNTIME_CALLS,
  MAX_FUTURE_RUNTIME_PROBE_MINUTES,
  MAX_FUTURE_TARGET_SPECIFIC_RUNTIME_INSPECTIONS,
  OPERATOR_DECISION,
  ZERO_COUNTERS,
  buildVcpToolBoxStage02ExactApprovalDecisionIntakeBoundary
} = require('../src/core/VcpToolBoxStage02ExactApprovalDecisionIntakeBoundary');

function decisionOutcome(overrides = {}) {
  return {
    decisionOutcome: DECISION_OUTCOMES.APPROVE_REQUESTED,
    humanReviewCompleted: true,
    sanitizedOutcomeOnly: true,
    exactApprovalStillRequired: true,
    approvalLinePresent: false,
    approvalLineValueOmitted: true,
    approvalLineGenerated: false,
    approvalLineStored: false,
    approvalLineValidated: false,
    runtimeAuthorizationGranted: false,
    reviewerDecisionCanGrantApproval: false,
    runtimeRouteOpened: false,
    futureExactApprovalRequestOnly: true,
    futureApprovalRequestMayBePrepared: true,
    planAdjustmentRequired: false,
    ...overrides
  };
}

function baseInput(overrides = {}) {
  return {
    masterTaskbookReference: 'PROJECT_MASTER_TASKBOOK',
    masterTaskbookId: 'PROJECT-MASTER-TASKBOOK',
    stage02Reference: 'STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS',
    stage02Id: 'stage-02',
    versionReference: 'VERSION_STAGE_02_V1_8_CM1709_EXACT_APPROVAL_DECISION_INTAKE_BOUNDARY',
    versionId: 'CM-1709',
    projectFinalGoalServed: true,
    stage02Alignment: {
      stageGoalServesMaster: true,
      projectFinalGoalServed: true,
      currentDecisionIntakeOnly: true
    },
    reviewBoundary: {
      cm1708ReviewBoundaryStatus: 'CM1708_REVIEW_BOUNDARY_PASSED',
      reviewBoundaryPassed: true,
      humanExactApprovalStillRequired: true,
      approvalGrantStillForbidden: true,
      approvalLineGenerationAllowed: false,
      runtimeAuthorizationGranted: false,
      reviewerDecisionCanGrantApproval: false
    },
    packetPreflight: {
      cm1707PreflightStatus: 'CM1707_PACKET_PREFLIGHT_PASSED',
      packetPreflightReady: true,
      futurePacketOnly: true,
      approvalLinePresent: false,
      approvalLineValueOmitted: true,
      runtimeAuthorizationGranted: false
    },
    approvalPacketCandidate: {
      approvalPacketId: 'CM1709-APPROVAL-DECISION-INTAKE',
      approvalPacketIntent: 'future_exact_approval_decision_intake_candidate_only',
      futurePacketOnly: true,
      exactApprovalRequired: true,
      packetPreflightPassed: true,
      approvalLinePresent: false,
      approvalLineValueOmitted: true,
      approvalLineGenerated: false,
      approvalLineStored: false,
      approvalLineValidated: false,
      runtimeAuthorizationGranted: false,
      targetScopeSummaryPresent: true,
      principalScopeSummaryPresent: true,
      profileScopeSummaryPresent: true,
      lowDisclosureOutputPolicy: true
    },
    decisionOutcome: decisionOutcome(),
    currentIntakeEnvelope: {
      allowedCurrentIntakeActions: [...ALLOWED_CURRENT_INTAKE_ACTIONS],
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

test('CM1709 accepts approve_requested as future approval-request intake only', () => {
  const result = buildVcpToolBoxStage02ExactApprovalDecisionIntakeBoundary(baseInput());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, CONTRACT_MODE);
  assert.equal(result.operatorDecision, OPERATOR_DECISION);
  assert.equal(result.decision, DECISION_INTAKE_DECISIONS.APPROVE_REQUEST_INTAKE_READY);
  assert.equal(result.reasonCode, 'approve_requested_intake_ready_no_approval_line_no_runtime');
  assert.equal(result.decisionRoute, 'future_exact_approval_request_may_be_prepared_no_approval_line_no_runtime');
  assert.equal(result.alignment.reviewBoundaryPassed, true);
  assert.equal(result.alignment.packetPreflightPassed, true);
  assert.equal(result.decisionOutcome.decisionOutcome, DECISION_OUTCOMES.APPROVE_REQUESTED);
  assert.equal(result.decisionOutcome.futureApprovalRequestMayBePrepared, true);
  assert.equal(result.decisionOutcome.exactApprovalStillRequired, true);
  assert.equal(result.approvalLineIssued, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.approvalLineValidated, false);
  assert.equal(result.approvalLineValueIncluded, false);
  assert.equal(result.runtimeAuthorizationGranted, false);
  assert.equal(result.runtimeRouteOpened, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.completeV8Claimed, false);
  assert.deepEqual(result.localSafeCounters, ZERO_COUNTERS);
});

test('CM1709 accepts reject as closed runtime route without approval request', () => {
  const result = buildVcpToolBoxStage02ExactApprovalDecisionIntakeBoundary(baseInput({
    decisionOutcome: decisionOutcome({
      decisionOutcome: DECISION_OUTCOMES.REJECT,
      futureExactApprovalRequestOnly: false,
      futureApprovalRequestMayBePrepared: false,
      planAdjustmentRequired: false
    })
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.decision, DECISION_INTAKE_DECISIONS.REJECT_INTAKE_READY);
  assert.equal(result.reasonCode, 'reject_intake_ready_no_approval_line_no_runtime');
  assert.equal(result.decisionRoute, 'review_rejected_runtime_route_closed_no_approval_line');
  assert.equal(result.decisionOutcome.decisionOutcome, DECISION_OUTCOMES.REJECT);
  assert.equal(result.decisionOutcome.futureApprovalRequestMayBePrepared, false);
  assert.equal(result.runtimeRouteOpened, false);
  assert.equal(result.approvalLineGenerated, false);
});

test('CM1709 accepts needs_adjustment as plan-adjustment route without approval request', () => {
  const result = buildVcpToolBoxStage02ExactApprovalDecisionIntakeBoundary(baseInput({
    decisionOutcome: decisionOutcome({
      decisionOutcome: DECISION_OUTCOMES.NEEDS_ADJUSTMENT,
      futureExactApprovalRequestOnly: false,
      futureApprovalRequestMayBePrepared: false,
      planAdjustmentRequired: true
    })
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.decision, DECISION_INTAKE_DECISIONS.NEEDS_ADJUSTMENT_INTAKE_READY);
  assert.equal(result.reasonCode, 'needs_adjustment_intake_ready_no_approval_line_no_runtime');
  assert.equal(result.decisionRoute, 'return_to_plan_adjustment_no_approval_line_no_runtime');
  assert.equal(result.decisionOutcome.decisionOutcome, DECISION_OUTCOMES.NEEDS_ADJUSTMENT);
  assert.equal(result.decisionOutcome.planAdjustmentRequired, true);
  assert.equal(result.runtimeAuthorizationGranted, false);
});

test('CM1709 blocks missing CM1708 review boundary', () => {
  const result = buildVcpToolBoxStage02ExactApprovalDecisionIntakeBoundary(baseInput({
    reviewBoundary: {
      cm1708ReviewBoundaryStatus: 'MISSING',
      reviewBoundaryPassed: false,
      humanExactApprovalStillRequired: false,
      approvalGrantStillForbidden: false,
      approvalLineGenerationAllowed: true,
      runtimeAuthorizationGranted: true,
      reviewerDecisionCanGrantApproval: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'cm1708_review_boundary_missing_or_unverified');
  assert.ok(result.reviewBoundaryViolations.includes('cm1708ReviewBoundaryStatus'));
  assert.ok(result.reviewBoundaryViolations.includes('reviewBoundaryPassed'));
  assert.ok(result.reviewBoundaryViolations.includes('approvalLineGenerationAllowed'));
});

test('CM1709 blocks missing CM1707 packet preflight', () => {
  const result = buildVcpToolBoxStage02ExactApprovalDecisionIntakeBoundary(baseInput({
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
  assert.equal(result.decision, DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_PACKET_PREFLIGHT);
  assert.equal(result.reasonCode, 'cm1707_packet_preflight_missing_or_unverified');
  assert.ok(result.packetPreflightViolations.includes('cm1707PreflightStatus'));
  assert.ok(result.packetPreflightViolations.includes('packetPreflightReady'));
});

test('CM1709 blocks missing or unsafe CM1704 receipt plan', () => {
  const result = buildVcpToolBoxStage02ExactApprovalDecisionIntakeBoundary(baseInput({
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
  assert.equal(result.decision, DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_RECEIPT_PLAN);
  assert.equal(result.reasonCode, 'cm1704_receipt_plan_missing_or_unsafe');
  assert.ok(result.receiptPlanViolations.includes('cm1704ReceiptContractStatus'));
  assert.ok(result.receiptPlanViolations.includes('referencesCm1704'));
  assert.ok(result.receiptPlanViolations.includes('lowDisclosureOnly'));
  assert.ok(result.receiptPlanViolations.includes('rawRuntimeOutputAllowed'));
  assert.ok(result.receiptPlanViolations.includes('readinessClaimAllowed'));
});

test('CM1709 returns plan adjustment when Stage 02 alignment or project_final_goal review is missing', () => {
  const result = buildVcpToolBoxStage02ExactApprovalDecisionIntakeBoundary(baseInput({
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
      currentDecisionIntakeOnly: false
    },
    review: {
      projectFinalGoalServed: false,
      projectFinalGoalAnswer: 'uncertain'
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, DECISION_INTAKE_DECISIONS.NEEDS_PLAN_ADJUSTMENT);
  assert.equal(result.reasonCode, 'master_stage_version_or_project_final_goal_review_missing');
  assert.ok(result.alignment.missingAlignmentFields.includes('master_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('stage02_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('version_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('projectFinalGoalServed'));
  assert.ok(result.alignment.missingAlignmentFields.includes('stage02Alignment'));
  assert.ok(result.alignment.missingAlignmentFields.includes('projectFinalGoalReview'));
});

test('CM1709 blocks unknown or unsafe decision outcome', () => {
  const result = buildVcpToolBoxStage02ExactApprovalDecisionIntakeBoundary(baseInput({
    decisionOutcome: decisionOutcome({
      decisionOutcome: 'approve_now',
      humanReviewCompleted: false,
      sanitizedOutcomeOnly: false,
      exactApprovalStillRequired: false,
      futureApprovalRequestMayBePrepared: true,
      runtimeRouteOpened: true,
      reviewerDecisionCanGrantApproval: true
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE_BOUNDARY);
  assert.equal(result.reasonCode, 'decision_outcome_missing_unknown_or_unsafe');
  assert.ok(result.decisionOutcomeViolations.includes('decisionOutcome'));
  assert.ok(result.decisionOutcomeViolations.includes('humanReviewCompleted'));
  assert.ok(result.decisionOutcomeViolations.includes('sanitizedOutcomeOnly'));
  assert.ok(result.decisionOutcomeViolations.includes('runtimeRouteOpened'));
  assert.equal(result.runtimeRouteOpened, false);
});

test('CM1709 blocks missing or unsafe packet candidate shape', () => {
  const result = buildVcpToolBoxStage02ExactApprovalDecisionIntakeBoundary(baseInput({
    approvalPacketCandidate: {
      approvalPacketId: 'CM1709-APPROVAL-DECISION-INTAKE',
      approvalPacketIntent: 'approve_now',
      futurePacketOnly: false,
      exactApprovalRequired: false,
      packetPreflightPassed: false,
      approvalLinePresent: false,
      approvalLineValueOmitted: true,
      approvalLineGenerated: false,
      approvalLineStored: false,
      approvalLineValidated: false,
      runtimeAuthorizationGranted: false,
      targetScopeSummaryPresent: false,
      principalScopeSummaryPresent: false,
      profileScopeSummaryPresent: false,
      lowDisclosureOutputPolicy: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE_BOUNDARY);
  assert.equal(result.reasonCode, 'approval_packet_candidate_missing_or_unsafe');
  assert.ok(result.packetCandidateViolations.includes('futurePacketOnly'));
  assert.ok(result.packetCandidateViolations.includes('exactApprovalRequired'));
  assert.ok(result.packetCandidateViolations.includes('packetPreflightPassed'));
  assert.ok(result.packetCandidateViolations.includes('approvalPacketIntent'));
});

test('CM1709 blocks approval line value generation issue consume store and validate without echoing values', () => {
  const result = buildVcpToolBoxStage02ExactApprovalDecisionIntakeBoundary(baseInput({
    decisionOutcome: decisionOutcome({
      approvalLinePresent: true,
      approvalLineValueOmitted: false,
      approvalLineGenerated: true,
      approvalLineStored: true,
      approvalLineValidated: true,
      approvalLineValue: 'APPROVAL_LINE_SHOULD_NOT_ECHO'
    }),
    approvalLineIssued: true,
    approvalLineConsumed: true
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.decision, DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE_BOUNDARY);
  assert.equal(result.reasonCode, 'unsafe_sensitive_or_raw_fields_present');
  assert.ok(result.unsafeFieldCategories.includes('approval_line_or_private_approval_material'));
  assert.equal(serialized.includes('APPROVAL_LINE_SHOULD_NOT_ECHO'), false);
  assert.equal(result.approvalLineIssued, false);
  assert.equal(result.approvalLineConsumed, false);
  assert.equal(result.approvalLineStored, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.approvalLineValidated, false);
});

test('CM1709 blocks unsafe locator config secret raw runtime and provider fields without echoing values', () => {
  const result = buildVcpToolBoxStage02ExactApprovalDecisionIntakeBoundary(baseInput({
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
  assert.equal(result.decision, DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE_BOUNDARY);
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

test('CM1709 blocks current decision-intake action and budget expansion', () => {
  const result = buildVcpToolBoxStage02ExactApprovalDecisionIntakeBoundary(baseInput({
    currentIntakeEnvelope: {
      allowedCurrentIntakeActions: [
        'sanitized_human_review_outcome_intake',
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
  assert.equal(result.decision, DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE_BOUNDARY);
  assert.equal(result.reasonCode, 'current_decision_intake_envelope_expanded_or_incomplete');
  assert.ok(result.envelopeViolations.includes('allowedCurrentIntakeActions'));
  assert.ok(result.envelopeViolations.includes('maxRuntimeCalls'));
  assert.ok(result.envelopeViolations.includes('memoryBudget'));
  assert.equal(result.currentIntakeEnvelope.allowedCurrentIntakeActions.includes('approval_line_generation'), false);
});

test('CM1709 blocks future runtime action and budget expansion', () => {
  const result = buildVcpToolBoxStage02ExactApprovalDecisionIntakeBoundary(baseInput({
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
  assert.equal(result.decision, DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE_BOUNDARY);
  assert.equal(result.reasonCode, 'cm1705_future_execution_boundary_missing_or_expanded');
  assert.ok(result.futureBoundaryViolations.includes('cm1705BoundaryStatus'));
  assert.ok(result.futureBoundaryViolations.includes('exactApprovalRequired'));
  assert.ok(result.futureBoundaryViolations.includes('allowedFutureRuntimeActions'));
  assert.ok(result.futureBoundaryViolations.includes('maxRuntimeCalls'));
  assert.ok(result.futureBoundaryViolations.includes('memoryBudget'));
  assert.equal(result.futureExecutionBoundary.allowedFutureRuntimeActions.includes('memory_read_probe'), false);
});

test('CM1709 blocks readiness complete-V8 and runtime execution claims', () => {
  const result = buildVcpToolBoxStage02ExactApprovalDecisionIntakeBoundary(baseInput({
    readinessClaimed: true,
    completeV8Claimed: true,
    runtimeAlreadyExecuted: true,
    runtimeRouteOpened: true,
    targetSpecificRuntimeInspectionExecuted: true
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE_BOUNDARY);
  assert.equal(result.reasonCode, 'forbidden_execution_authorization_or_claim_present');
  assert.ok(result.forbiddenTrueFlags.includes('readinessClaimed'));
  assert.ok(result.forbiddenTrueFlags.includes('completeV8Claimed'));
  assert.ok(result.forbiddenTrueFlags.includes('runtimeAlreadyExecuted'));
  assert.ok(result.forbiddenTrueFlags.includes('runtimeRouteOpened'));
  assert.ok(result.forbiddenTrueFlags.includes('targetSpecificRuntimeInspectionExecuted'));
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.completeV8Claimed, false);
});

test('CM1709 blocks nonzero decision-intake counters', () => {
  const result = buildVcpToolBoxStage02ExactApprovalDecisionIntakeBoundary(baseInput({
    counters: {
      runtimeCalls: 1,
      memoryReads: 1,
      providerApiCalls: 1,
      approvalLinesIssued: 1,
      approvalLinesConsumed: 1,
      approvalLinesStored: 1,
      approvalLinesGenerated: 1,
      approvalLinesValidated: 1,
      completeV8Claims: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE_BOUNDARY);
  assert.equal(result.reasonCode, 'pre_intake_counter_violation');
  assert.ok(result.counterViolations.includes('runtimeCalls'));
  assert.ok(result.counterViolations.includes('memoryReads'));
  assert.ok(result.counterViolations.includes('providerApiCalls'));
  assert.ok(result.counterViolations.includes('approvalLinesIssued'));
  assert.ok(result.counterViolations.includes('approvalLinesStored'));
  assert.ok(result.counterViolations.includes('approvalLinesGenerated'));
  assert.ok(result.counterViolations.includes('approvalLinesValidated'));
  assert.ok(result.counterViolations.includes('completeV8Claims'));
});

test('CM1709 locks exported vocabulary for exact approval decision intake routing', () => {
  assert.deepEqual(ALLOWED_CURRENT_INTAKE_ACTIONS, [
    'sanitized_human_review_outcome_intake',
    'decision_route_classification',
    'receipt_plan_review',
    'no_approval_no_runtime_intake'
  ]);
  assert.deepEqual(ALLOWED_FUTURE_RUNTIME_ACTIONS, [
    'target_presence_probe',
    'runtime_handshake_probe',
    'target_specific_no_memory_inspection'
  ]);
  assert.deepEqual(DECISION_OUTCOMES, {
    APPROVE_REQUESTED: 'approve_requested',
    REJECT: 'reject',
    NEEDS_ADJUSTMENT: 'needs_adjustment'
  });
  assert.equal(DECISION_INTAKE_DECISIONS.APPROVE_REQUEST_INTAKE_READY, 'exact_approval_approve_request_intake_ready');
  assert.equal(DECISION_INTAKE_DECISIONS.REJECT_INTAKE_READY, 'exact_approval_reject_intake_ready');
  assert.equal(DECISION_INTAKE_DECISIONS.NEEDS_ADJUSTMENT_INTAKE_READY, 'exact_approval_needs_adjustment_intake_ready');
  assert.equal(DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_REVIEW_BOUNDARY, 'blocked_needs_exact_approval_packet_review_boundary');
  assert.equal(DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_PACKET_PREFLIGHT, 'blocked_needs_exact_approval_packet_preflight');
  assert.equal(DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_DECISION_INTAKE_BOUNDARY, 'blocked_needs_exact_approval_decision_intake_boundary');
  assert.equal(DECISION_INTAKE_DECISIONS.BLOCKED_NEEDS_RECEIPT_PLAN, 'blocked_needs_receipt_plan');
  assert.equal(DECISION_INTAKE_DECISIONS.NEEDS_PLAN_ADJUSTMENT, 'needs_plan_adjustment');
});
