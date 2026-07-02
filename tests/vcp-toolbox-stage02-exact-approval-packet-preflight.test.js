'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_CURRENT_PREFLIGHT_ACTIONS,
  ALLOWED_FUTURE_RUNTIME_ACTIONS,
  CONTRACT_MODE,
  MAX_FUTURE_RUNTIME_CALLS,
  MAX_FUTURE_RUNTIME_PROBE_MINUTES,
  OPERATOR_DECISION,
  PREFLIGHT_DECISIONS,
  ZERO_COUNTERS,
  buildVcpToolBoxStage02ExactApprovalPacketPreflight
} = require('../src/core/VcpToolBoxStage02ExactApprovalPacketPreflight');

function baseInput(overrides = {}) {
  return {
    masterTaskbookReference: 'PROJECT_MASTER_TASKBOOK',
    masterTaskbookId: 'PROJECT-MASTER-TASKBOOK',
    stage02Reference: 'STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS',
    stage02Id: 'stage-02',
    versionReference: 'VERSION_STAGE_02_V1_6_CM1707_EXACT_APPROVAL_PACKET_PREFLIGHT',
    versionId: 'CM-1707',
    projectFinalGoalServed: true,
    stage02Alignment: {
      stageGoalServesMaster: true,
      projectFinalGoalServed: true,
      currentPreflightOnly: true
    },
    readinessGate: {
      cm1706ReadinessGateStatus: 'CM1706_STAGE_02_GATE_PASSED',
      stage02GatePrepared: true,
      exactApprovalRequired: true,
      runtimeAuthorizationGranted: false
    },
    approvalPacketCandidate: {
      approvalPacketId: 'CM1707-APPROVAL-PACKET-PREFLIGHT',
      approvalPacketIntent: 'future_exact_approval_packet_candidate_only',
      futurePacketOnly: true,
      exactApprovalRequired: true,
      approvalLinePresent: false,
      approvalLineValueOmitted: true,
      approvalLineIssued: false,
      approvalLineConsumed: false,
      runtimeAuthorizationGranted: false,
      targetScopeSummaryPresent: true,
      principalScopeSummaryPresent: true,
      profileScopeSummaryPresent: true,
      lowDisclosureOutputPolicy: true
    },
    currentPreflightEnvelope: {
      allowedCurrentPreflightActions: [...ALLOWED_CURRENT_PREFLIGHT_ACTIONS],
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

test('CM1707 prepares exact approval packet preflight without approval or runtime execution', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketPreflight(baseInput());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, CONTRACT_MODE);
  assert.equal(result.operatorDecision, OPERATOR_DECISION);
  assert.equal(result.decision, PREFLIGHT_DECISIONS.PACKET_PREFLIGHT_READY);
  assert.equal(result.reasonCode, 'exact_approval_packet_preflight_ready_no_approval_no_runtime');
  assert.equal(result.boundaryStatus, 'packet_preflight_ready_no_approval_no_runtime_execution');
  assert.equal(result.alignment.readinessGatePassed, true);
  assert.equal(result.alignment.futureExecutionBoundaryReady, true);
  assert.equal(result.alignment.receiptPlanReady, true);
  assert.equal(result.alignment.approvalPacketCandidateReady, true);
  assert.deepEqual(result.currentPreflightEnvelope.allowedCurrentPreflightActions, ALLOWED_CURRENT_PREFLIGHT_ACTIONS);
  assert.deepEqual(result.futureExecutionBoundary.allowedFutureRuntimeActions, ALLOWED_FUTURE_RUNTIME_ACTIONS);
  assert.equal(result.futureExecutionBoundary.maxRuntimeCalls, MAX_FUTURE_RUNTIME_CALLS);
  assert.equal(result.futureExecutionBoundary.maxRuntimeProbeMinutes, MAX_FUTURE_RUNTIME_PROBE_MINUTES);
  assert.equal(result.approvalPacketCandidate.futurePacketOnly, true);
  assert.equal(result.approvalLineIssued, false);
  assert.equal(result.approvalLineConsumed, false);
  assert.equal(result.approvalLineValueIncluded, false);
  assert.equal(result.runtimeAuthorizationGranted, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.completeV8Claimed, false);
  assert.deepEqual(result.localSafeCounters, ZERO_COUNTERS);
});

test('CM1707 blocks missing CM1706 readiness gate', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketPreflight(baseInput({
    readinessGate: {
      cm1706ReadinessGateStatus: 'MISSING',
      stage02GatePrepared: false,
      exactApprovalRequired: true,
      runtimeAuthorizationGranted: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, PREFLIGHT_DECISIONS.BLOCKED_NEEDS_STAGE_02_READINESS_GATE);
  assert.equal(result.reasonCode, 'cm1706_readiness_gate_missing_or_unverified');
  assert.equal(result.readinessGate.statusPassed, false);
});

test('CM1707 blocks missing or expanded CM1705 future execution boundary', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketPreflight(baseInput({
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
  assert.equal(result.decision, PREFLIGHT_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL_PACKET_BOUNDARY);
  assert.equal(result.reasonCode, 'cm1705_future_execution_boundary_missing_or_expanded');
  assert.ok(result.futureBoundaryViolations.includes('cm1705BoundaryStatus'));
  assert.ok(result.futureBoundaryViolations.includes('exactApprovalRequired'));
  assert.ok(result.futureBoundaryViolations.includes('allowedFutureRuntimeActions'));
  assert.ok(result.futureBoundaryViolations.includes('maxRuntimeCalls'));
  assert.ok(result.futureBoundaryViolations.includes('memoryBudget'));
});

test('CM1707 blocks missing or unsafe CM1704 receipt plan', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketPreflight(baseInput({
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
  assert.equal(result.decision, PREFLIGHT_DECISIONS.BLOCKED_NEEDS_RECEIPT_PLAN);
  assert.equal(result.reasonCode, 'cm1704_receipt_plan_missing_or_unsafe');
  assert.ok(result.receiptPlanViolations.includes('cm1704ReceiptContractStatus'));
  assert.ok(result.receiptPlanViolations.includes('referencesCm1704'));
  assert.ok(result.receiptPlanViolations.includes('lowDisclosureOnly'));
  assert.ok(result.receiptPlanViolations.includes('rawRuntimeOutputAllowed'));
  assert.ok(result.receiptPlanViolations.includes('readinessClaimAllowed'));
});

test('CM1707 returns plan adjustment when Stage 02 alignment or project_final_goal review is missing', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketPreflight(baseInput({
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
      currentPreflightOnly: false
    },
    review: {
      projectFinalGoalServed: false,
      projectFinalGoalAnswer: 'uncertain'
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, PREFLIGHT_DECISIONS.NEEDS_PLAN_ADJUSTMENT);
  assert.equal(result.reasonCode, 'master_stage_version_or_project_final_goal_review_missing');
  assert.ok(result.alignment.missingAlignmentFields.includes('master_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('stage02_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('version_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('projectFinalGoalServed'));
  assert.ok(result.alignment.missingAlignmentFields.includes('stage02Alignment'));
  assert.ok(result.alignment.missingAlignmentFields.includes('projectFinalGoalReview'));
});

test('CM1707 blocks approval line value issue consume and runtime authorization in packet candidate', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketPreflight(baseInput({
    approvalPacketCandidate: {
      approvalPacketId: 'CM1707-APPROVAL-PACKET-PREFLIGHT',
      approvalPacketIntent: 'future_exact_approval_packet_candidate_only',
      futurePacketOnly: true,
      exactApprovalRequired: true,
      approvalLinePresent: true,
      approvalLineValueOmitted: false,
      approvalLineIssued: true,
      approvalLineConsumed: true,
      runtimeAuthorizationGranted: true,
      targetScopeSummaryPresent: true,
      principalScopeSummaryPresent: true,
      profileScopeSummaryPresent: true,
      lowDisclosureOutputPolicy: true,
      approvalLineValue: 'APPROVAL_LINE_SHOULD_NOT_ECHO'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.decision, PREFLIGHT_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL_PACKET_BOUNDARY);
  assert.equal(result.reasonCode, 'unsafe_sensitive_or_raw_fields_present');
  assert.ok(result.unsafeFieldCategories.includes('approval_line_or_private_approval_material'));
  assert.equal(serialized.includes('APPROVAL_LINE_SHOULD_NOT_ECHO'), false);
  assert.equal(result.approvalLineIssued, false);
  assert.equal(result.approvalLineConsumed, false);
  assert.equal(result.runtimeAuthorizationGranted, false);
});

test('CM1707 blocks unsafe locator config secret raw runtime and provider fields without echoing values', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketPreflight(baseInput({
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
  assert.equal(result.decision, PREFLIGHT_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL_PACKET_BOUNDARY);
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

test('CM1707 blocks current preflight action and budget expansion', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketPreflight(baseInput({
    currentPreflightEnvelope: {
      allowedCurrentPreflightActions: [
        'approval_packet_shape_preflight',
        'live_runtime_probe'
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
  assert.equal(result.decision, PREFLIGHT_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL_PACKET_BOUNDARY);
  assert.equal(result.reasonCode, 'current_preflight_envelope_expanded_or_incomplete');
  assert.ok(result.envelopeViolations.includes('allowedCurrentPreflightActions'));
  assert.ok(result.envelopeViolations.includes('maxRuntimeCalls'));
  assert.ok(result.envelopeViolations.includes('maxRuntimeProbeMinutes'));
  assert.ok(result.envelopeViolations.includes('maxTargetSpecificRuntimeInspections'));
  assert.ok(result.envelopeViolations.includes('memoryBudget'));
  assert.ok(result.envelopeViolations.includes('providerBudget'));
  assert.ok(result.envelopeViolations.includes('writeBudget'));
  assert.equal(result.currentPreflightEnvelope.allowedCurrentPreflightActions.includes('live_runtime_probe'), false);
});

test('CM1707 blocks missing packet scope summaries and unsafe packet intent', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketPreflight(baseInput({
    approvalPacketCandidate: {
      approvalPacketId: 'CM1707-APPROVAL-PACKET-PREFLIGHT',
      approvalPacketIntent: 'approve_now',
      futurePacketOnly: false,
      exactApprovalRequired: false,
      approvalLinePresent: false,
      approvalLineValueOmitted: true,
      approvalLineIssued: false,
      approvalLineConsumed: false,
      runtimeAuthorizationGranted: false,
      targetScopeSummaryPresent: false,
      principalScopeSummaryPresent: false,
      profileScopeSummaryPresent: false,
      lowDisclosureOutputPolicy: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, PREFLIGHT_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL_PACKET_BOUNDARY);
  assert.equal(result.reasonCode, 'approval_packet_candidate_missing_or_unsafe');
  assert.ok(result.packetViolations.includes('futurePacketOnly'));
  assert.ok(result.packetViolations.includes('exactApprovalRequired'));
  assert.ok(result.packetViolations.includes('targetScopeSummaryPresent'));
  assert.ok(result.packetViolations.includes('principalScopeSummaryPresent'));
  assert.ok(result.packetViolations.includes('profileScopeSummaryPresent'));
  assert.ok(result.packetViolations.includes('lowDisclosureOutputPolicy'));
  assert.ok(result.packetViolations.includes('approvalPacketIntent'));
});

test('CM1707 blocks readiness complete-V8 and runtime execution claims', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketPreflight(baseInput({
    readinessClaimed: true,
    completeV8Claimed: true,
    runtimeAlreadyExecuted: true,
    targetSpecificRuntimeInspectionExecuted: true
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, PREFLIGHT_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL_PACKET_BOUNDARY);
  assert.equal(result.reasonCode, 'forbidden_execution_authorization_or_claim_present');
  assert.ok(result.forbiddenTrueFlags.includes('readinessClaimed'));
  assert.ok(result.forbiddenTrueFlags.includes('completeV8Claimed'));
  assert.ok(result.forbiddenTrueFlags.includes('runtimeAlreadyExecuted'));
  assert.ok(result.forbiddenTrueFlags.includes('targetSpecificRuntimeInspectionExecuted'));
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.completeV8Claimed, false);
});

test('CM1707 blocks nonzero preflight counters', () => {
  const result = buildVcpToolBoxStage02ExactApprovalPacketPreflight(baseInput({
    counters: {
      runtimeCalls: 1,
      memoryReads: 1,
      providerApiCalls: 1,
      approvalLinesIssued: 1,
      approvalLinesConsumed: 1,
      completeV8Claims: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, PREFLIGHT_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL_PACKET_BOUNDARY);
  assert.equal(result.reasonCode, 'pre_execution_counter_violation');
  assert.ok(result.counterViolations.includes('runtimeCalls'));
  assert.ok(result.counterViolations.includes('memoryReads'));
  assert.ok(result.counterViolations.includes('providerApiCalls'));
  assert.ok(result.counterViolations.includes('approvalLinesIssued'));
  assert.ok(result.counterViolations.includes('approvalLinesConsumed'));
  assert.ok(result.counterViolations.includes('completeV8Claims'));
});

test('CM1707 locks exported vocabulary for exact approval packet preflight routing', () => {
  assert.deepEqual(ALLOWED_CURRENT_PREFLIGHT_ACTIONS, [
    'approval_packet_shape_preflight',
    'scope_summary_review',
    'receipt_plan_review',
    'no_runtime_review'
  ]);
  assert.deepEqual(ALLOWED_FUTURE_RUNTIME_ACTIONS, [
    'target_presence_probe',
    'runtime_handshake_probe',
    'target_specific_no_memory_inspection'
  ]);
  assert.equal(PREFLIGHT_DECISIONS.PACKET_PREFLIGHT_READY, 'exact_approval_packet_preflight_ready');
  assert.equal(PREFLIGHT_DECISIONS.BLOCKED_NEEDS_STAGE_02_READINESS_GATE, 'blocked_needs_stage_02_readiness_gate');
  assert.equal(PREFLIGHT_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL_PACKET_BOUNDARY, 'blocked_needs_exact_approval_packet_boundary');
  assert.equal(PREFLIGHT_DECISIONS.BLOCKED_NEEDS_RECEIPT_PLAN, 'blocked_needs_receipt_plan');
  assert.equal(PREFLIGHT_DECISIONS.NEEDS_PLAN_ADJUSTMENT, 'needs_plan_adjustment');
});
