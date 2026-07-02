'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_CURRENT_GATE_ACTIONS,
  ALLOWED_FUTURE_RUNTIME_ACTIONS,
  CONTRACT_MODE,
  MAX_FUTURE_RUNTIME_CALLS,
  MAX_FUTURE_RUNTIME_PROBE_MINUTES,
  OPERATOR_DECISION,
  READINESS_DECISIONS,
  REQUIRED_PRIOR_EVIDENCE_KEYS,
  REQUIRED_STAGE_01_VERSIONS,
  ZERO_COUNTERS,
  buildVcpToolBoxStageCloseoutLiveInspectionReadinessGate
} = require('../src/core/VcpToolBoxStageCloseoutLiveInspectionReadinessGate');

function baseInput(overrides = {}) {
  return {
    masterTaskbookReference: 'PROJECT_MASTER_TASKBOOK',
    masterTaskbookId: 'PROJECT-MASTER-TASKBOOK',
    stage01Reference: 'STAGE_01_VCPTOOLBOX_TARGET_BOUNDARY_GOVERNANCE',
    stage01Id: 'stage-01',
    stage02Reference: 'STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS',
    stage02Id: 'stage-02',
    versionReference: 'VERSION_STAGE_02_V1_5_CM1706_EXACT_APPROVED_LIVE_INSPECTION_READINESS_GATE',
    versionId: 'CM-1706',
    projectFinalGoalServed: true,
    stage01Closeout: {
      status: 'CM1706_STAGE_01_CLOSEOUT_PREPARED',
      versionStatuses: {
        'CM-1701': 'CM1701_BOUNDARY_REVIEW_PASSED',
        'CM-1702': 'CM1702_COMMANDER_GO_NO_GO_PASSED',
        'CM-1704': 'CM1704_RECEIPT_CONTRACT_PASSED',
        'CM-1705': 'CM1705_EXECUTION_BOUNDARY_PASSED'
      }
    },
    priorEvidenceStatuses: {
      'CM-1701': 'CM1701_BOUNDARY_REVIEW_PASSED',
      'CM-1702': 'CM1702_COMMANDER_GO_NO_GO_PASSED',
      'CM-1704': 'CM1704_RECEIPT_CONTRACT_PASSED',
      'CM-1705': 'CM1705_EXECUTION_BOUNDARY_PASSED'
    },
    stage02Readiness: {
      stageGoalServesMaster: true,
      projectFinalGoalServed: true,
      currentGateOnly: true,
      exactApprovalRequired: true,
      runtimeAuthorizationGranted: false,
      approvalLinePresent: false,
      approvalLineValueOmitted: true
    },
    currentGateEnvelope: {
      allowedCurrentGateActions: [...ALLOWED_CURRENT_GATE_ACTIONS],
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
    counters: {},
    review: {
      projectFinalGoalServed: true,
      projectFinalGoalAnswer: 'serves_project_final_goal'
    },
    ...overrides
  };
}

test('CM1706 prepares Stage 02 exact-approval readiness gate without runtime execution', () => {
  const result = buildVcpToolBoxStageCloseoutLiveInspectionReadinessGate(baseInput());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, CONTRACT_MODE);
  assert.equal(result.operatorDecision, OPERATOR_DECISION);
  assert.equal(result.decision, READINESS_DECISIONS.STAGE_02_GATE_PREPARED);
  assert.equal(result.reasonCode, 'stage_01_closed_stage_02_gate_prepared_no_runtime');
  assert.equal(result.boundaryStatus, 'stage_02_gate_prepared_no_runtime_execution');
  assert.equal(result.alignment.stage01CloseoutPassed, true);
  assert.equal(result.alignment.stage02GoalAligned, true);
  assert.equal(result.alignment.exactApprovalStillRequired, true);
  assert.equal(result.stage02Readiness.stage02RuntimeReady, false);
  assert.deepEqual(result.stage01Closeout.passedVersions, REQUIRED_STAGE_01_VERSIONS);
  assert.deepEqual(result.currentGateEnvelope.allowedCurrentGateActions, ALLOWED_CURRENT_GATE_ACTIONS);
  assert.deepEqual(result.futureExecutionBoundary.allowedFutureRuntimeActions, ALLOWED_FUTURE_RUNTIME_ACTIONS);
  assert.equal(result.futureExecutionBoundary.maxRuntimeCalls, MAX_FUTURE_RUNTIME_CALLS);
  assert.equal(result.futureExecutionBoundary.maxRuntimeProbeMinutes, MAX_FUTURE_RUNTIME_PROBE_MINUTES);
  assert.deepEqual(result.localSafeCounters, ZERO_COUNTERS);
  assert.equal(result.runtimeAuthorizationGranted, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.completeV8Claimed, false);
});

test('CM1706 blocks missing Stage 01 closeout and required Stage 01 version evidence', () => {
  const result = buildVcpToolBoxStageCloseoutLiveInspectionReadinessGate(baseInput({
    stage01Closeout: {
      status: 'MISSING',
      versionStatuses: {
        'CM-1701': 'CM1701_BOUNDARY_REVIEW_PASSED',
        'CM-1702': 'FAILED'
      }
    },
    priorEvidenceStatuses: {
      'CM-1701': 'CM1701_BOUNDARY_REVIEW_PASSED'
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, READINESS_DECISIONS.BLOCKED_NEEDS_STAGE_01_CLOSEOUT);
  assert.equal(result.reasonCode, 'stage_01_closeout_incomplete_or_unverified');
  assert.equal(result.stage01Closeout.statusPassed, false);
  assert.ok(result.stage01Closeout.missingVersions.includes('CM-1704'));
  assert.ok(result.stage01Closeout.missingVersions.includes('CM-1705'));
  assert.ok(result.stage01Closeout.failedVersions.includes('CM-1702'));
});

test('CM1706 returns plan adjustment when Master Stage Version or project_final_goal review is missing', () => {
  const result = buildVcpToolBoxStageCloseoutLiveInspectionReadinessGate(baseInput({
    masterTaskbookReference: undefined,
    masterTaskbookId: undefined,
    stage01Reference: undefined,
    stage01Id: undefined,
    stage02Reference: undefined,
    stage02Id: undefined,
    versionReference: undefined,
    versionId: undefined,
    projectFinalGoalServed: false,
    review: {
      projectFinalGoalServed: false,
      projectFinalGoalAnswer: 'uncertain'
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, READINESS_DECISIONS.NEEDS_PLAN_ADJUSTMENT);
  assert.equal(result.reasonCode, 'master_stage_version_or_project_final_goal_review_missing');
  assert.ok(result.alignment.missingAlignmentFields.includes('master_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('stage01_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('stage02_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('version_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('projectFinalGoalServed'));
  assert.ok(result.alignment.missingAlignmentFields.includes('projectFinalGoalReview'));
});

test('CM1706 blocks Stage 02 goal or exact approval boundary ambiguity', () => {
  const result = buildVcpToolBoxStageCloseoutLiveInspectionReadinessGate(baseInput({
    stage02Readiness: {
      stageGoalServesMaster: false,
      projectFinalGoalServed: true,
      currentGateOnly: false,
      exactApprovalRequired: false,
      runtimeAuthorizationGranted: false,
      approvalLineValueOmitted: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, READINESS_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL_BOUNDARY);
  assert.equal(result.reasonCode, 'stage_02_alignment_or_exact_approval_boundary_missing');
  assert.equal(result.alignment.stage02GoalAligned, false);
  assert.equal(result.alignment.exactApprovalStillRequired, false);
});

test('CM1706 blocks unsafe locator config secret approval-line raw runtime and provider fields without echoing values', () => {
  const result = buildVcpToolBoxStageCloseoutLiveInspectionReadinessGate(baseInput({
    submittedEvidence: {
      targetPath: '/PRIVATE/VCPToolBox/path',
      endpoint: 'https://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
      port: '7605',
      runtimeConfig: 'RUNTIME_CONFIG_SHOULD_NOT_ECHO',
      configEnvPath: 'config.env',
      bearerToken: 'TOKEN_SHOULD_NOT_ECHO',
      approvalLineValue: 'APPROVAL_LINE_SHOULD_NOT_ECHO',
      rawRuntimeResponse: 'RAW_RUNTIME_SHOULD_NOT_ECHO',
      providerResponse: 'PROVIDER_SHOULD_NOT_ECHO'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.decision, READINESS_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL_BOUNDARY);
  assert.equal(result.reasonCode, 'unsafe_sensitive_or_raw_fields_present');
  assert.ok(result.unsafeFieldCategories.includes('locator_endpoint_or_path'));
  assert.ok(result.unsafeFieldCategories.includes('secret_config_private_state'));
  assert.ok(result.unsafeFieldCategories.includes('approval_line_or_private_approval_material'));
  assert.ok(result.unsafeFieldCategories.includes('raw_memory_or_runtime_output'));
  assert.ok(result.unsafeFieldCategories.includes('provider_response'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('APPROVAL_LINE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_RUNTIME_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PROVIDER_SHOULD_NOT_ECHO'), false);
});

test('CM1706 blocks current gate action and budget expansion', () => {
  const result = buildVcpToolBoxStageCloseoutLiveInspectionReadinessGate(baseInput({
    currentGateEnvelope: {
      allowedCurrentGateActions: [
        'stage_01_closeout_review',
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
  assert.equal(result.decision, READINESS_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL_BOUNDARY);
  assert.equal(result.reasonCode, 'current_gate_envelope_expanded_or_incomplete');
  assert.ok(result.envelopeViolations.includes('allowedCurrentGateActions'));
  assert.ok(result.envelopeViolations.includes('maxRuntimeCalls'));
  assert.ok(result.envelopeViolations.includes('maxRuntimeProbeMinutes'));
  assert.ok(result.envelopeViolations.includes('maxTargetSpecificRuntimeInspections'));
  assert.ok(result.envelopeViolations.includes('memoryBudget'));
  assert.ok(result.envelopeViolations.includes('providerBudget'));
  assert.ok(result.envelopeViolations.includes('writeBudget'));
  assert.equal(result.currentGateEnvelope.allowedCurrentGateActions.includes('live_runtime_probe'), false);
});

test('CM1706 blocks future execution boundary expansion before any live stage proceeds', () => {
  const result = buildVcpToolBoxStageCloseoutLiveInspectionReadinessGate(baseInput({
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
  assert.equal(result.decision, READINESS_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL_BOUNDARY);
  assert.equal(result.reasonCode, 'future_execution_boundary_missing_or_expanded');
  assert.ok(result.futureBoundaryViolations.includes('cm1705BoundaryStatus'));
  assert.ok(result.futureBoundaryViolations.includes('exactApprovalRequired'));
  assert.ok(result.futureBoundaryViolations.includes('allowedFutureRuntimeActions'));
  assert.ok(result.futureBoundaryViolations.includes('memoryBudget'));
});

test('CM1706 blocks runtime authorization readiness complete-V8 and approval-line claims', () => {
  const result = buildVcpToolBoxStageCloseoutLiveInspectionReadinessGate(baseInput({
    stage02Readiness: {
      stageGoalServesMaster: true,
      projectFinalGoalServed: true,
      currentGateOnly: true,
      exactApprovalRequired: true,
      runtimeAuthorizationGranted: true,
      approvalLineValueOmitted: true
    },
    readinessClaimed: true,
    completeV8Claimed: true,
    approvalLineIssued: true,
    runtimeAlreadyExecuted: true
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, READINESS_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL_BOUNDARY);
  assert.equal(result.reasonCode, 'stage_02_alignment_or_exact_approval_boundary_missing');
  assert.equal(result.stage02Readiness.runtimeAuthorizationGranted, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.completeV8Claimed, false);
});

test('CM1706 blocks nonzero current execution counters', () => {
  const result = buildVcpToolBoxStageCloseoutLiveInspectionReadinessGate(baseInput({
    counters: {
      runtimeCalls: 1,
      targetSpecificRuntimeInspections: 1,
      memoryReads: 1,
      providerApiCalls: 1,
      approvalLinesIssued: 1,
      completeV8Claims: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, READINESS_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL_BOUNDARY);
  assert.equal(result.reasonCode, 'pre_execution_counter_violation');
  assert.ok(result.counterViolations.includes('runtimeCalls'));
  assert.ok(result.counterViolations.includes('targetSpecificRuntimeInspections'));
  assert.ok(result.counterViolations.includes('memoryReads'));
  assert.ok(result.counterViolations.includes('providerApiCalls'));
  assert.ok(result.counterViolations.includes('approvalLinesIssued'));
  assert.ok(result.counterViolations.includes('completeV8Claims'));
});

test('CM1706 locks exported vocabulary for Stage closeout readiness routing', () => {
  assert.deepEqual(REQUIRED_STAGE_01_VERSIONS, ['CM-1701', 'CM-1702', 'CM-1704', 'CM-1705']);
  assert.deepEqual(REQUIRED_PRIOR_EVIDENCE_KEYS, REQUIRED_STAGE_01_VERSIONS);
  assert.deepEqual(ALLOWED_CURRENT_GATE_ACTIONS, [
    'stage_01_closeout_review',
    'stage_02_exact_approval_readiness_gate',
    'no_runtime_review'
  ]);
  assert.deepEqual(ALLOWED_FUTURE_RUNTIME_ACTIONS, [
    'target_presence_probe',
    'runtime_handshake_probe',
    'target_specific_no_memory_inspection'
  ]);
  assert.equal(READINESS_DECISIONS.STAGE_02_GATE_PREPARED, 'stage_02_exact_approval_readiness_gate_prepared');
  assert.equal(READINESS_DECISIONS.BLOCKED_NEEDS_STAGE_01_CLOSEOUT, 'blocked_needs_stage_01_closeout');
  assert.equal(READINESS_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL_BOUNDARY, 'blocked_needs_exact_approval_boundary');
  assert.equal(READINESS_DECISIONS.NEEDS_PLAN_ADJUSTMENT, 'needs_plan_adjustment');
});
