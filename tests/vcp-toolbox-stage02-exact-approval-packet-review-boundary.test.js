'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_CURRENT_REVIEW_ACTIONS,
  ALLOWED_FUTURE_RUNTIME_ACTIONS,
  CONTRACT_MODE,
  MAX_FUTURE_RUNTIME_CALLS,
  MAX_FUTURE_RUNTIME_PROBE_MINUTES,
  MAX_FUTURE_TARGET_SPECIFIC_RUNTIME_INSPECTIONS,
  OPERATOR_DECISION,
  REVIEW_DECISIONS,
  ZERO_COUNTERS,
  buildVcpToolBoxStage02ExactApprovalPacketReviewBoundary
} = require('../src/core/VcpToolBoxStage02ExactApprovalPacketReviewBoundary');

function baseInput(overrides = {}) {
  return {
    masterTaskbookReference: 'PROJECT_MASTER_TASKBOOK',
    masterTaskbookId: 'PROJECT-MASTER-TASKBOOK',
    stage02Reference: 'STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS',
    stage02Id: 'stage-02',
    versionReference: 'VERSION_STAGE_02_V1_7_CM1708_EXACT_APPROVAL_PACKET_REVIEW_BOUNDARY',
    versionId: 'CM-1708',
    projectFinalGoalServed: true,
    stage02Alignment: {
      stageGoalServesMaster: true,
      projectFinalGoalServed: true,
      currentReviewBoundaryOnly: true
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
      approvalPacketId: 'CM1708-APPROVAL-PACKET-REVIEW',
      approvalPacketIntent: 'future_exact_approval_packet_review_candidate_only',
      futurePacketOnly: true,
      exactApprovalRequired: true,
      packetPreflightPassed: true,
      approvalLinePresent: false,
      approvalLineValueOmitted: true,
      approvalLineGenerated: false,
      approvalLineStored: false,
      runtimeAuthorizationGranted: false,
      targetScopeSummaryPresent: true,
      principalScopeSummaryPresent: true,
      profileScopeSummaryPresent: true,
      lowDisclosureOutputPolicy: true
    },
    reviewBoundary: {
      reviewBoundaryPresent: true,
      candidateMayEnterHumanReview: true,
      humanExactApprovalStillRequired: true,
      approvalGrantStillForbidden: true,
      approvalLineGenerationAllowed: false,
      approvalLineIssueAllowed: false,
      approvalLineConsumeAllowed: false,
      approvalLineStoreAllowed: false,
      runtimeAuthorizationGranted: false,
      reviewerDecisionCanGrantApproval: false,
      reviewQuestionsComplete: true,
      projectFinalGoalQuestionIncluded: true,
      abortConditionsIncluded: true,
      lowDisclosureReviewOnly: true,
      exactApprovalRequired: true
    },
    currentReviewEnvelope: {
      allowedCurrentReviewActions: [...ALLOWED_CURRENT_REVIEW_ACTIONS],
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

test('CM1708 prepares exact approval packet review boundary without approval line or runtime execution', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketReviewBoundary(baseInput());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, CONTRACT_MODE);
  assert.equal(result.operatorDecision, OPERATOR_DECISION);
  assert.equal(result.decision, REVIEW_DECISIONS.PACKET_REVIEW_READY);
  assert.equal(result.reasonCode, 'exact_approval_packet_review_ready_no_approval_no_runtime');
  assert.equal(result.boundaryStatus, 'packet_review_boundary_ready_no_approval_line_no_runtime_execution');
  assert.equal(result.alignment.packetPreflightPassed, true);
  assert.equal(result.alignment.approvalPacketCandidateReviewable, true);
  assert.equal(result.alignment.reviewBoundaryReady, true);
  assert.equal(result.alignment.receiptPlanReady, true);
  assert.deepEqual(result.currentReviewEnvelope.allowedCurrentReviewActions, ALLOWED_CURRENT_REVIEW_ACTIONS);
  assert.deepEqual(result.futureExecutionBoundary.allowedFutureRuntimeActions, ALLOWED_FUTURE_RUNTIME_ACTIONS);
  assert.equal(result.futureExecutionBoundary.maxRuntimeCalls, MAX_FUTURE_RUNTIME_CALLS);
  assert.equal(result.futureExecutionBoundary.maxRuntimeProbeMinutes, MAX_FUTURE_RUNTIME_PROBE_MINUTES);
  assert.equal(
    result.futureExecutionBoundary.maxTargetSpecificRuntimeInspections,
    MAX_FUTURE_TARGET_SPECIFIC_RUNTIME_INSPECTIONS
  );
  assert.equal(result.reviewBoundary.candidateMayEnterHumanReview, true);
  assert.equal(result.reviewBoundary.humanExactApprovalStillRequired, true);
  assert.equal(result.reviewBoundary.approvalLineGenerationAllowed, false);
  assert.equal(result.reviewBoundary.reviewerDecisionCanGrantApproval, false);
  assert.equal(result.approvalLineIssued, false);
  assert.equal(result.approvalLineConsumed, false);
  assert.equal(result.approvalLineStored, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.approvalLineValueIncluded, false);
  assert.equal(result.runtimeAuthorizationGranted, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.completeV8Claimed, false);
  assert.deepEqual(result.localSafeCounters, ZERO_COUNTERS);
});

test('CM1708 blocks missing CM1707 packet preflight', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketReviewBoundary(baseInput({
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
  assert.equal(result.decision, REVIEW_DECISIONS.BLOCKED_NEEDS_PACKET_PREFLIGHT);
  assert.equal(result.reasonCode, 'cm1707_packet_preflight_missing_or_unverified');
  assert.ok(result.packetPreflightViolations.includes('cm1707PreflightStatus'));
  assert.ok(result.packetPreflightViolations.includes('packetPreflightReady'));
});

test('CM1708 blocks missing or unsafe review boundary', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketReviewBoundary(baseInput({
    reviewBoundary: {
      reviewBoundaryPresent: false,
      candidateMayEnterHumanReview: false,
      humanExactApprovalStillRequired: false,
      approvalGrantStillForbidden: false,
      approvalLineGenerationAllowed: true,
      approvalLineIssueAllowed: true,
      approvalLineConsumeAllowed: true,
      approvalLineStoreAllowed: true,
      runtimeAuthorizationGranted: true,
      reviewerDecisionCanGrantApproval: true,
      reviewQuestionsComplete: false,
      projectFinalGoalQuestionIncluded: false,
      abortConditionsIncluded: false,
      lowDisclosureReviewOnly: false,
      exactApprovalRequired: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, REVIEW_DECISIONS.BLOCKED_NEEDS_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'exact_approval_review_boundary_missing_or_unsafe');
  assert.ok(result.reviewBoundaryViolations.includes('reviewBoundaryPresent'));
  assert.ok(result.reviewBoundaryViolations.includes('candidateMayEnterHumanReview'));
  assert.ok(result.reviewBoundaryViolations.includes('humanExactApprovalStillRequired'));
  assert.ok(result.reviewBoundaryViolations.includes('approvalGrantStillForbidden'));
  assert.ok(result.reviewBoundaryViolations.includes('approvalLineGenerationAllowed'));
  assert.ok(result.reviewBoundaryViolations.includes('reviewerDecisionCanGrantApproval'));
  assert.equal(result.reviewBoundary.approvalLineGenerationAllowed, false);
  assert.equal(result.runtimeAuthorizationGranted, false);
});

test('CM1708 blocks missing or unsafe CM1704 receipt plan', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketReviewBoundary(baseInput({
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
  assert.equal(result.decision, REVIEW_DECISIONS.BLOCKED_NEEDS_RECEIPT_PLAN);
  assert.equal(result.reasonCode, 'cm1704_receipt_plan_missing_or_unsafe');
  assert.ok(result.receiptPlanViolations.includes('cm1704ReceiptContractStatus'));
  assert.ok(result.receiptPlanViolations.includes('referencesCm1704'));
  assert.ok(result.receiptPlanViolations.includes('lowDisclosureOnly'));
  assert.ok(result.receiptPlanViolations.includes('rawRuntimeOutputAllowed'));
  assert.ok(result.receiptPlanViolations.includes('readinessClaimAllowed'));
});

test('CM1708 returns plan adjustment when Stage 02 alignment or project_final_goal review is missing', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketReviewBoundary(baseInput({
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
      currentReviewBoundaryOnly: false
    },
    review: {
      projectFinalGoalServed: false,
      projectFinalGoalAnswer: 'uncertain'
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, REVIEW_DECISIONS.NEEDS_PLAN_ADJUSTMENT);
  assert.equal(result.reasonCode, 'master_stage_version_or_project_final_goal_review_missing');
  assert.ok(result.alignment.missingAlignmentFields.includes('master_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('stage02_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('version_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('projectFinalGoalServed'));
  assert.ok(result.alignment.missingAlignmentFields.includes('stage02Alignment'));
  assert.ok(result.alignment.missingAlignmentFields.includes('projectFinalGoalReview'));
});

test('CM1708 blocks missing or unsafe packet candidate shape', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketReviewBoundary(baseInput({
    approvalPacketCandidate: {
      approvalPacketId: 'CM1708-APPROVAL-PACKET-REVIEW',
      approvalPacketIntent: 'approve_now',
      futurePacketOnly: false,
      exactApprovalRequired: false,
      packetPreflightPassed: false,
      approvalLinePresent: false,
      approvalLineValueOmitted: true,
      approvalLineGenerated: false,
      approvalLineStored: false,
      runtimeAuthorizationGranted: false,
      targetScopeSummaryPresent: false,
      principalScopeSummaryPresent: false,
      profileScopeSummaryPresent: false,
      lowDisclosureOutputPolicy: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, REVIEW_DECISIONS.BLOCKED_NEEDS_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'approval_packet_candidate_missing_or_unsafe');
  assert.ok(result.packetCandidateViolations.includes('futurePacketOnly'));
  assert.ok(result.packetCandidateViolations.includes('exactApprovalRequired'));
  assert.ok(result.packetCandidateViolations.includes('packetPreflightPassed'));
  assert.ok(result.packetCandidateViolations.includes('targetScopeSummaryPresent'));
  assert.ok(result.packetCandidateViolations.includes('profileScopeSummaryPresent'));
  assert.ok(result.packetCandidateViolations.includes('lowDisclosureOutputPolicy'));
  assert.ok(result.packetCandidateViolations.includes('approvalPacketIntent'));
});

test('CM1708 blocks approval line value generation issue consume and store without echoing values', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketReviewBoundary(baseInput({
    approvalPacketCandidate: {
      approvalPacketId: 'CM1708-APPROVAL-PACKET-REVIEW',
      approvalPacketIntent: 'future_exact_approval_packet_review_candidate_only',
      futurePacketOnly: true,
      exactApprovalRequired: true,
      packetPreflightPassed: true,
      approvalLinePresent: false,
      approvalLineValueOmitted: false,
      approvalLineGenerated: true,
      approvalLineStored: true,
      runtimeAuthorizationGranted: false,
      targetScopeSummaryPresent: true,
      principalScopeSummaryPresent: true,
      profileScopeSummaryPresent: true,
      lowDisclosureOutputPolicy: true,
      approvalLineValue: 'APPROVAL_LINE_SHOULD_NOT_ECHO'
    },
    approvalLineIssued: true,
    approvalLineConsumed: true
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.decision, REVIEW_DECISIONS.BLOCKED_NEEDS_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'unsafe_sensitive_or_raw_fields_present');
  assert.ok(result.unsafeFieldCategories.includes('approval_line_or_private_approval_material'));
  assert.equal(serialized.includes('APPROVAL_LINE_SHOULD_NOT_ECHO'), false);
  assert.equal(result.approvalLineIssued, false);
  assert.equal(result.approvalLineConsumed, false);
  assert.equal(result.approvalLineStored, false);
  assert.equal(result.approvalLineGenerated, false);
});

test('CM1708 blocks unsafe locator config secret raw runtime and provider fields without echoing values', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketReviewBoundary(baseInput({
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
  assert.equal(result.decision, REVIEW_DECISIONS.BLOCKED_NEEDS_REVIEW_BOUNDARY);
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

test('CM1708 blocks current review action and budget expansion', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketReviewBoundary(baseInput({
    currentReviewEnvelope: {
      allowedCurrentReviewActions: [
        'approval_packet_candidate_review',
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
  assert.equal(result.decision, REVIEW_DECISIONS.BLOCKED_NEEDS_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'current_review_envelope_expanded_or_incomplete');
  assert.ok(result.envelopeViolations.includes('allowedCurrentReviewActions'));
  assert.ok(result.envelopeViolations.includes('maxRuntimeCalls'));
  assert.ok(result.envelopeViolations.includes('maxRuntimeProbeMinutes'));
  assert.ok(result.envelopeViolations.includes('maxTargetSpecificRuntimeInspections'));
  assert.ok(result.envelopeViolations.includes('memoryBudget'));
  assert.ok(result.envelopeViolations.includes('providerBudget'));
  assert.ok(result.envelopeViolations.includes('writeBudget'));
  assert.equal(result.currentReviewEnvelope.allowedCurrentReviewActions.includes('approval_line_generation'), false);
});

test('CM1708 blocks future runtime action and budget expansion', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketReviewBoundary(baseInput({
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
  assert.equal(result.decision, REVIEW_DECISIONS.BLOCKED_NEEDS_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'cm1705_future_execution_boundary_missing_or_expanded');
  assert.ok(result.futureBoundaryViolations.includes('cm1705BoundaryStatus'));
  assert.ok(result.futureBoundaryViolations.includes('exactApprovalRequired'));
  assert.ok(result.futureBoundaryViolations.includes('allowedFutureRuntimeActions'));
  assert.ok(result.futureBoundaryViolations.includes('maxRuntimeCalls'));
  assert.ok(result.futureBoundaryViolations.includes('memoryBudget'));
  assert.equal(result.futureExecutionBoundary.allowedFutureRuntimeActions.includes('memory_read_probe'), false);
});

test('CM1708 blocks readiness complete-V8 and runtime execution claims', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketReviewBoundary(baseInput({
    readinessClaimed: true,
    completeV8Claimed: true,
    runtimeAlreadyExecuted: true,
    targetSpecificRuntimeInspectionExecuted: true
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, REVIEW_DECISIONS.BLOCKED_NEEDS_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'forbidden_execution_authorization_or_claim_present');
  assert.ok(result.forbiddenTrueFlags.includes('readinessClaimed'));
  assert.ok(result.forbiddenTrueFlags.includes('completeV8Claimed'));
  assert.ok(result.forbiddenTrueFlags.includes('runtimeAlreadyExecuted'));
  assert.ok(result.forbiddenTrueFlags.includes('targetSpecificRuntimeInspectionExecuted'));
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.completeV8Claimed, false);
});

test('CM1708 blocks nonzero review counters', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketReviewBoundary(baseInput({
    counters: {
      runtimeCalls: 1,
      memoryReads: 1,
      providerApiCalls: 1,
      approvalLinesIssued: 1,
      approvalLinesConsumed: 1,
      approvalLinesStored: 1,
      approvalLinesGenerated: 1,
      completeV8Claims: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, REVIEW_DECISIONS.BLOCKED_NEEDS_REVIEW_BOUNDARY);
  assert.equal(result.reasonCode, 'pre_review_counter_violation');
  assert.ok(result.counterViolations.includes('runtimeCalls'));
  assert.ok(result.counterViolations.includes('memoryReads'));
  assert.ok(result.counterViolations.includes('providerApiCalls'));
  assert.ok(result.counterViolations.includes('approvalLinesIssued'));
  assert.ok(result.counterViolations.includes('approvalLinesStored'));
  assert.ok(result.counterViolations.includes('approvalLinesGenerated'));
  assert.ok(result.counterViolations.includes('completeV8Claims'));
});

test('CM1708 locks exported vocabulary for exact approval packet review routing', () => {
  assert.deepEqual(ALLOWED_CURRENT_REVIEW_ACTIONS, [
    'approval_packet_candidate_review',
    'review_questions_check',
    'receipt_plan_review',
    'no_approval_no_runtime_review'
  ]);
  assert.deepEqual(ALLOWED_FUTURE_RUNTIME_ACTIONS, [
    'target_presence_probe',
    'runtime_handshake_probe',
    'target_specific_no_memory_inspection'
  ]);
  assert.equal(REVIEW_DECISIONS.PACKET_REVIEW_READY, 'exact_approval_packet_review_ready');
  assert.equal(REVIEW_DECISIONS.BLOCKED_NEEDS_PACKET_PREFLIGHT, 'blocked_needs_exact_approval_packet_preflight');
  assert.equal(REVIEW_DECISIONS.BLOCKED_NEEDS_REVIEW_BOUNDARY, 'blocked_needs_exact_approval_review_boundary');
  assert.equal(REVIEW_DECISIONS.BLOCKED_NEEDS_RECEIPT_PLAN, 'blocked_needs_receipt_plan');
  assert.equal(REVIEW_DECISIONS.NEEDS_PLAN_ADJUSTMENT, 'needs_plan_adjustment');
});
