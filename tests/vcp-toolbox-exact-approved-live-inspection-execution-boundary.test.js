'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_FUTURE_RUNTIME_ACTIONS,
  BOUNDARY_DECISIONS,
  CONTRACT_MODE,
  MAX_RUNTIME_CALLS,
  MAX_RUNTIME_PROBE_MINUTES,
  OPERATOR_DECISION,
  REQUIRED_ALIGNMENT_FIELDS,
  ZERO_COUNTERS,
  buildVcpToolBoxExactApprovedLiveInspectionExecutionBoundary
} = require('../src/core/VcpToolBoxExactApprovedLiveInspectionExecutionBoundary');

function baseInput(overrides = {}) {
  return {
    masterTaskbookReference: 'PROJECT_MASTER_TASKBOOK',
    masterTaskbookId: 'PROJECT-MASTER-TASKBOOK',
    stageReference: 'STAGE_01_VCPTOOLBOX_TARGET_BOUNDARY_GOVERNANCE',
    stageId: 'stage-01',
    versionReference: 'VERSION_STAGE_01_V1_4_CM1705_EXACT_APPROVED_LIVE_INSPECTION_EXECUTION_BOUNDARY',
    versionId: 'CM-1705',
    projectFinalGoalServed: true,
    priorReceiptContractStatus: 'CM1704_RECEIPT_CONTRACT_PASSED',
    exactApprovalBinding: {
      present: true,
      approvalPacketId: 'CM1699-TARGET-SPECIFIC-RUNTIME-INSPECTION-APPROVAL-001',
      executionApprovalDraftId: 'CM1700-TARGET-SPECIFIC-RUNTIME-INSPECTION-EXECUTION-APPROVAL-DRAFT-001',
      receiptContractId: 'CM1704-TARGET-SPECIFIC-RUNTIME-INSPECTION-RECEIPT-CONTRACT',
      approvalLinePresent: true,
      approvalLineValueOmitted: true
    },
    executionEnvelope: {
      allowedRuntimeActions: [...ALLOWED_FUTURE_RUNTIME_ACTIONS],
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

test('CM1705 prepares exact-approved live inspection execution boundary without runtime execution', () => {
  const result = buildVcpToolBoxExactApprovedLiveInspectionExecutionBoundary(baseInput());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, CONTRACT_MODE);
  assert.equal(result.operatorDecision, OPERATOR_DECISION);
  assert.equal(result.decision, BOUNDARY_DECISIONS.PREPARED_FOR_EXACT_APPROVED_EXECUTION);
  assert.equal(result.reasonCode, 'execution_boundary_prepared_no_runtime');
  assert.equal(result.boundaryStatus, 'prepared_no_runtime_execution');
  assert.equal(result.alignment.projectFinalGoalServed, true);
  assert.equal(result.alignment.priorReceiptContractPassed, true);
  assert.equal(result.alignment.exactApprovalBindingPresent, true);
  assert.equal(result.alignment.executionEnvelopeReady, true);
  assert.equal(result.exactApprovalBinding.approvalLineValueIncluded, false);
  assert.deepEqual(result.executionEnvelope.allowedRuntimeActions, ALLOWED_FUTURE_RUNTIME_ACTIONS);
  assert.equal(result.executionEnvelope.maxRuntimeCalls, MAX_RUNTIME_CALLS);
  assert.equal(result.executionEnvelope.maxRuntimeProbeMinutes, MAX_RUNTIME_PROBE_MINUTES);
  assert.deepEqual(result.localSafeCounters, ZERO_COUNTERS);
  assert.equal(result.runtimeAlreadyExecuted, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.completeV8Claimed, false);
});

test('CM1705 requires Master Stage Version receipt and project_final_goal review alignment', () => {
  const result = buildVcpToolBoxExactApprovedLiveInspectionExecutionBoundary(baseInput({
    masterTaskbookReference: undefined,
    masterTaskbookId: undefined,
    stageReference: undefined,
    stageId: undefined,
    versionReference: undefined,
    versionId: undefined,
    projectFinalGoalServed: false,
    priorReceiptContractStatus: 'MISSING',
    review: {
      projectFinalGoalServed: false,
      projectFinalGoalAnswer: 'uncertain'
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, BOUNDARY_DECISIONS.NEEDS_PLAN_ADJUSTMENT);
  assert.equal(result.reasonCode, 'alignment_receipt_or_review_missing');
  assert.ok(result.alignment.missingAlignmentFields.includes('master_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('stage_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('version_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('projectFinalGoalServed'));
  assert.ok(result.alignment.missingAlignmentFields.includes('priorReceiptContractStatus'));
  assert.ok(result.alignment.missingAlignmentFields.includes('projectFinalGoalReview'));
});

test('CM1705 blocks missing exact approval binding and never returns approval-line value', () => {
  const result = buildVcpToolBoxExactApprovedLiveInspectionExecutionBoundary(baseInput({
    exactApprovalBinding: {
      present: false,
      approvalPacketId: 'CM1699-TARGET-SPECIFIC-RUNTIME-INSPECTION-APPROVAL-001',
      executionApprovalDraftId: 'CM1700-TARGET-SPECIFIC-RUNTIME-INSPECTION-EXECUTION-APPROVAL-DRAFT-001',
      receiptContractId: 'CM1704-TARGET-SPECIFIC-RUNTIME-INSPECTION-RECEIPT-CONTRACT',
      approvalLinePresent: true,
      approvalLineValueOmitted: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, BOUNDARY_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL);
  assert.equal(result.reasonCode, 'exact_approval_binding_missing_or_unsafe');
  assert.equal(result.exactApprovalBinding.approvalLineValueIncluded, false);
});

test('CM1705 blocks approval-line value exposure without echoing the value', () => {
  const result = buildVcpToolBoxExactApprovedLiveInspectionExecutionBoundary(baseInput({
    exactApprovalBinding: {
      present: true,
      approvalPacketId: 'CM1699-TARGET-SPECIFIC-RUNTIME-INSPECTION-APPROVAL-001',
      executionApprovalDraftId: 'CM1700-TARGET-SPECIFIC-RUNTIME-INSPECTION-EXECUTION-APPROVAL-DRAFT-001',
      receiptContractId: 'CM1704-TARGET-SPECIFIC-RUNTIME-INSPECTION-RECEIPT-CONTRACT',
      approvalLinePresent: true,
      approvalLineValueOmitted: false,
      approvalLineValue: 'APPROVAL_LINE_VALUE_SHOULD_NOT_ECHO'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.decision, BOUNDARY_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL);
  assert.equal(result.reasonCode, 'unsafe_sensitive_or_raw_fields_present');
  assert.ok(result.unsafeFieldCategories.includes('approval_line_or_private_approval_material'));
  assert.equal(serialized.includes('APPROVAL_LINE_VALUE_SHOULD_NOT_ECHO'), false);
});

test('CM1705 blocks secret config target locator raw runtime and provider fields', () => {
  const result = buildVcpToolBoxExactApprovedLiveInspectionExecutionBoundary(baseInput({
    submittedEvidence: {
      targetPath: '/PRIVATE/VCPToolBox/path',
      endpoint: 'https://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
      configEnvPath: 'config.env',
      bearerToken: 'TOKEN_SHOULD_NOT_ECHO',
      rawRuntimeResponse: 'RAW_RUNTIME_SHOULD_NOT_ECHO',
      providerResponse: 'PROVIDER_SHOULD_NOT_ECHO'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.decision, BOUNDARY_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL);
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

test('CM1705 blocks runtime action expansion and missing required actions', () => {
  const result = buildVcpToolBoxExactApprovedLiveInspectionExecutionBoundary(baseInput({
    executionEnvelope: {
      allowedRuntimeActions: [
        'target_presence_probe',
        'memory_read_probe',
        'target_specific_no_memory_inspection'
      ],
      maxRuntimeCalls: 3,
      maxRuntimeProbeMinutes: 10,
      maxTargetSpecificRuntimeInspections: 1,
      memoryBudget: 0,
      providerBudget: 0,
      writeBudget: 0
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, BOUNDARY_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL);
  assert.equal(result.reasonCode, 'execution_envelope_expanded_or_incomplete');
  assert.ok(result.envelopeViolations.includes('allowedRuntimeActions'));
  assert.ok(result.envelopeViolations.includes('requiredRuntimeActions'));
  assert.equal(result.executionEnvelope.allowedRuntimeActions.includes('memory_read_probe'), false);
});

test('CM1705 blocks budget expansion and nonzero memory provider write budgets', () => {
  const result = buildVcpToolBoxExactApprovedLiveInspectionExecutionBoundary(baseInput({
    executionEnvelope: {
      allowedRuntimeActions: [...ALLOWED_FUTURE_RUNTIME_ACTIONS],
      maxRuntimeCalls: 4,
      maxRuntimeProbeMinutes: 11,
      maxTargetSpecificRuntimeInspections: 2,
      memoryBudget: 1,
      providerBudget: 1,
      writeBudget: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, BOUNDARY_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL);
  assert.equal(result.reasonCode, 'execution_envelope_expanded_or_incomplete');
  assert.ok(result.envelopeViolations.includes('maxRuntimeCalls'));
  assert.ok(result.envelopeViolations.includes('maxRuntimeProbeMinutes'));
  assert.ok(result.envelopeViolations.includes('maxTargetSpecificRuntimeInspections'));
  assert.ok(result.envelopeViolations.includes('memoryBudget'));
  assert.ok(result.envelopeViolations.includes('providerBudget'));
  assert.ok(result.envelopeViolations.includes('writeBudget'));
});

test('CM1705 blocks already-executed runtime evidence and readiness claims', () => {
  const result = buildVcpToolBoxExactApprovedLiveInspectionExecutionBoundary(baseInput({
    runtimeAlreadyExecuted: true,
    liveInspectionAlreadyExecuted: true,
    readinessClaimed: true,
    completeV8Claimed: true
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, BOUNDARY_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL);
  assert.equal(result.reasonCode, 'forbidden_execution_or_expansion_flag_present');
  assert.ok(result.forbiddenTrueFlags.includes('runtimeAlreadyExecuted'));
  assert.ok(result.forbiddenTrueFlags.includes('liveInspectionAlreadyExecuted'));
  assert.ok(result.forbiddenTrueFlags.includes('readinessClaimed'));
  assert.ok(result.forbiddenTrueFlags.includes('completeV8Claimed'));
  assert.equal(result.runtimeAlreadyExecuted, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.completeV8Claimed, false);
});

test('CM1705 blocks nonzero pre-execution counters', () => {
  const result = buildVcpToolBoxExactApprovedLiveInspectionExecutionBoundary(baseInput({
    counters: {
      runtimeCalls: 1,
      targetSpecificRuntimeInspections: 1,
      liveVcpToolBoxCalls: 1,
      memoryReads: 1,
      providerApiCalls: 1,
      publicMcpExpansions: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, BOUNDARY_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL);
  assert.equal(result.reasonCode, 'pre_execution_counter_violation');
  assert.ok(result.counterViolations.includes('runtimeCalls'));
  assert.ok(result.counterViolations.includes('targetSpecificRuntimeInspections'));
  assert.ok(result.counterViolations.includes('liveVcpToolBoxCalls'));
  assert.ok(result.counterViolations.includes('memoryReads'));
  assert.ok(result.counterViolations.includes('providerApiCalls'));
  assert.ok(result.counterViolations.includes('publicMcpExpansions'));
});

test('CM1705 locks exported vocabulary for future exact-approved execution boundary', () => {
  assert.equal(OPERATOR_DECISION, 'prepare_exact_approved_live_inspection_execution_boundary_no_runtime');
  assert.ok(REQUIRED_ALIGNMENT_FIELDS.includes('executionEnvelope'));
  assert.ok(ALLOWED_FUTURE_RUNTIME_ACTIONS.includes('target_presence_probe'));
  assert.ok(ALLOWED_FUTURE_RUNTIME_ACTIONS.includes('runtime_handshake_probe'));
  assert.ok(ALLOWED_FUTURE_RUNTIME_ACTIONS.includes('target_specific_no_memory_inspection'));
  assert.equal(ZERO_COUNTERS.runtimeCalls, 0);
});
