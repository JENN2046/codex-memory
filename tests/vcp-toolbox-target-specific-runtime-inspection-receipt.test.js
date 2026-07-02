'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  CONTRACT_MODE,
  MAX_RUNTIME_CALLS,
  OPERATOR_DECISION,
  RECEIPT_DECISIONS,
  REQUIRED_ALIGNMENT_FIELDS,
  ZERO_SIDE_EFFECT_COUNTERS,
  buildVcpToolBoxTargetSpecificRuntimeInspectionReceipt
} = require('../src/core/VcpToolBoxTargetSpecificRuntimeInspectionReceipt');

function baseInput(overrides = {}) {
  return {
    masterTaskbookReference: 'PROJECT_MASTER_TASKBOOK.md',
    masterTaskbookId: 'PROJECT-MASTER-TASKBOOK',
    stageReference: 'STAGE_01_VCPTOOLBOX_TARGET_BOUNDARY_GOVERNANCE',
    stageId: 'stage-01',
    versionReference: 'VERSION_STAGE_01_V1_3_CM1704_RUNTIME_INSPECTION_RECEIPT',
    versionId: 'CM-1704',
    projectFinalGoalServed: true,
    referencedCommanderDecision: 'blocked_needs_exact_approval',
    exactApprovalBinding: {
      present: true,
      approvalPacketId: 'CM1699-TARGET-SPECIFIC-RUNTIME-INSPECTION-APPROVAL-001',
      executionApprovalDraftId: 'CM1700-TARGET-SPECIFIC-RUNTIME-INSPECTION-EXECUTION-APPROVAL-DRAFT-001',
      approvalLinePresent: true,
      approvalLineValueOmitted: true
    },
    inspectionEvidence: {
      targetAlias: 'vcptoolbox-memory-target',
      runtimeProfileAlias: 'local-vcptoolbox-memory-profile',
      inspectionKind: 'target_specific_runtime_inspection',
      resultCategory: 'target_present_handshake_ok'
    },
    counters: {
      runtimeCalls: 2,
      targetSpecificRuntimeInspections: 1,
      liveVcpToolBoxCalls: 1
    },
    review: {
      projectFinalGoalServed: true,
      projectFinalGoalAnswer: 'serves_project_final_goal'
    },
    ...overrides
  };
}

test('CM1704 accepts sanitized exact-approved runtime inspection receipt as reviewable not ready', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionReceipt(baseInput());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, CONTRACT_MODE);
  assert.equal(result.operatorDecision, OPERATOR_DECISION);
  assert.equal(result.decision, RECEIPT_DECISIONS.ACCEPTED_FOR_REVIEW);
  assert.equal(result.reasonCode, 'receipt_reviewable_not_ready');
  assert.equal(result.receiptReviewStatus, 'reviewable_not_ready');
  assert.equal(result.alignment.projectFinalGoalServed, true);
  assert.equal(result.alignment.exactApprovalBindingPresent, true);
  assert.equal(result.exactApprovalBinding.approvalLineValueIncluded, false);
  assert.equal(result.inspectionEvidence.targetAlias, 'vcptoolbox-memory-target');
  assert.equal(result.runtimeBudget.maxRuntimeCalls, MAX_RUNTIME_CALLS);
  assert.deepEqual(result.sideEffectCounters, ZERO_SIDE_EFFECT_COUNTERS);
  assert.equal(result.review.projectFinalGoalAnswer, 'serves_project_final_goal');
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.completeV8Claimed, false);
});

test('CM1704 requires Master Stage Version project goal commander and approval binding', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionReceipt(baseInput({
    masterTaskbookReference: undefined,
    masterTaskbookId: undefined,
    stageReference: undefined,
    stageId: undefined,
    versionReference: undefined,
    versionId: undefined,
    projectFinalGoalServed: false,
    review: {
      projectFinalGoalServed: false,
      projectFinalGoalAnswer: 'serves_project_final_goal'
    },
    referencedCommanderDecision: 'continue_local_safe',
    exactApprovalBinding: {
      present: true,
      approvalLinePresent: true,
      approvalLineValueOmitted: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, RECEIPT_DECISIONS.NEEDS_PLAN_ADJUSTMENT);
  assert.equal(result.reasonCode, 'alignment_or_exact_approval_binding_missing');
  assert.ok(result.alignment.missingAlignmentFields.includes('master_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('stage_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('version_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('projectFinalGoalServed'));
  assert.ok(result.alignment.missingAlignmentFields.includes('referencedCommanderDecision'));
  assert.ok(result.alignment.missingAlignmentFields.includes('exactApprovalBinding'));
});

test('CM1704 blocks approval-line value exposure without echoing the value', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionReceipt(baseInput({
    exactApprovalBinding: {
      present: true,
      approvalPacketId: 'CM1699-TARGET-SPECIFIC-RUNTIME-INSPECTION-APPROVAL-001',
      executionApprovalDraftId: 'CM1700-TARGET-SPECIFIC-RUNTIME-INSPECTION-EXECUTION-APPROVAL-DRAFT-001',
      approvalLinePresent: true,
      approvalLineValueOmitted: false,
      approvalLineValue: 'APPROVAL_LINE_VALUE_SHOULD_NOT_ECHO'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.decision, RECEIPT_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL);
  assert.equal(result.reasonCode, 'unsafe_sensitive_or_raw_fields_present');
  assert.ok(result.unsafeFieldCategories.includes('approval_line_or_private_approval_material'));
  assert.equal(serialized.includes('APPROVAL_LINE_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(result.exactApprovalBinding.approvalLineValueIncluded, false);
});

test('CM1704 blocks secret private runtime and raw output fields without echoing values', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionReceipt(baseInput({
    inspectionEvidence: {
      targetAlias: 'vcptoolbox-memory-target',
      runtimeProfileAlias: 'local-vcptoolbox-memory-profile',
      inspectionKind: 'target_specific_runtime_inspection',
      resultCategory: 'target_present_handshake_ok',
      endpoint: 'https://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
      rawRuntimeResponse: 'RAW_RUNTIME_RESPONSE_SHOULD_NOT_ECHO',
      providerResponse: 'PROVIDER_RESPONSE_SHOULD_NOT_ECHO',
      bearerToken: 'TOKEN_SHOULD_NOT_ECHO'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.decision, RECEIPT_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL);
  assert.equal(result.reasonCode, 'unsafe_sensitive_or_raw_fields_present');
  assert.ok(result.unsafeFieldCategories.includes('locator_endpoint_or_path'));
  assert.ok(result.unsafeFieldCategories.includes('raw_memory_or_runtime_output'));
  assert.ok(result.unsafeFieldCategories.includes('provider_response'));
  assert.ok(result.unsafeFieldCategories.includes('secret_config_private_state'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_RUNTIME_RESPONSE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PROVIDER_RESPONSE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('TOKEN_SHOULD_NOT_ECHO'), false);
});

test('CM1704 blocks runtime budget expansion and memory provider write side effects', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionReceipt(baseInput({
    counters: {
      runtimeCalls: 4,
      targetSpecificRuntimeInspections: 2,
      liveVcpToolBoxCalls: 4,
      memoryReads: 1,
      memoryWrites: 1,
      providerApiCalls: 1,
      publicMcpExpansions: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, RECEIPT_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL);
  assert.equal(result.reasonCode, 'runtime_budget_or_side_effect_counter_violation');
  assert.ok(result.counterViolations.includes('runtimeCalls'));
  assert.ok(result.counterViolations.includes('targetSpecificRuntimeInspections'));
  assert.ok(result.counterViolations.includes('liveVcpToolBoxCalls'));
  assert.ok(result.counterViolations.includes('memoryReads'));
  assert.ok(result.counterViolations.includes('memoryWrites'));
  assert.ok(result.counterViolations.includes('providerApiCalls'));
  assert.ok(result.counterViolations.includes('publicMcpExpansions'));
});

test('CM1704 blocks true output expansion and readiness or complete V8 claims', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionReceipt(baseInput({
    outputPolicy: {
      rawRuntimeOutputIncluded: true
    },
    readinessClaimed: true,
    completeV8Claimed: true
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, RECEIPT_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL);
  assert.equal(result.reasonCode, 'forbidden_output_or_expansion_flag_present');
  assert.ok(result.forbiddenTrueFlags.includes('rawRuntimeOutputIncluded'));
  assert.ok(result.forbiddenTrueFlags.includes('readinessClaimed'));
  assert.ok(result.forbiddenTrueFlags.includes('completeV8Claimed'));
  assert.equal(result.outputPolicy.rawRuntimeOutputIncluded, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.completeV8Claimed, false);
});

test('CM1704 requires exact sanitized inspection evidence fields', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionReceipt(baseInput({
    inspectionEvidence: {
      targetAlias: 'vcptoolbox-memory-target',
      runtimeProfileAlias: undefined,
      inspectionKind: 'generic_runtime_probe',
      resultCategory: undefined
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, RECEIPT_DECISIONS.NEEDS_PLAN_ADJUSTMENT);
  assert.equal(result.reasonCode, 'inspection_evidence_missing_or_ambiguous');
});

test('CM1704 requires a definite project_final_goal review answer', () => {
  const result = buildVcpToolBoxTargetSpecificRuntimeInspectionReceipt(baseInput({
    review: {
      projectFinalGoalServed: true,
      projectFinalGoalAnswer: 'uncertain'
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, RECEIPT_DECISIONS.NEEDS_PLAN_ADJUSTMENT);
  assert.equal(result.reasonCode, 'project_final_goal_review_uncertain');
});

test('CM1704 locks exported vocabulary for target-specific receipt review', () => {
  assert.equal(OPERATOR_DECISION, 'review_exact_approved_target_specific_runtime_inspection_receipt');
  assert.ok(REQUIRED_ALIGNMENT_FIELDS.includes('exactApprovalBinding'));
  assert.equal(ZERO_SIDE_EFFECT_COUNTERS.memoryReads, 0);
  assert.equal(ZERO_SIDE_EFFECT_COUNTERS.providerApiCalls, 0);
});
