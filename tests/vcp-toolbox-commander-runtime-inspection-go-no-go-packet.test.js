'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  CONTRACT_MODE,
  DECISIONS,
  FORBIDDEN_NEXT_ACTION_FLAGS,
  OPERATOR_DECISION,
  REQUIRED_ALIGNMENT_FIELDS,
  ZERO_COUNTERS,
  buildVcpToolBoxCommanderRuntimeInspectionGoNoGoPacket
} = require('../src/core/VcpToolBoxCommanderRuntimeInspectionGoNoGoPacket');

function baseInput(overrides = {}) {
  return {
    masterTaskbookReference: 'PROJECT_MASTER_TASKBOOK.md',
    masterTaskbookId: 'PROJECT-MASTER-TASKBOOK',
    stageReference: 'docs/taskbooks/stages/STAGE_01_VCPTOOLBOX_TARGET_BOUNDARY_GOVERNANCE.md',
    stageId: 'stage-01',
    versionReference: 'docs/taskbooks/versions/stage-01/VERSION_STAGE_01_V1_2_CM1702_COMMANDER_GO_NO_GO.md',
    versionId: 'CM-1702',
    priorVersionId: 'CM-1701',
    projectFinalGoalServed: true,
    priorBoundaryReviewStatus: 'CM1701_BOUNDARY_REVIEW_PASSED',
    evidencePackets: [
      {
        evidenceId: 'CM-1701',
        status: 'CM1701_BOUNDARY_REVIEW_PASSED'
      },
      {
        evidenceId: 'CM-1700',
        status: 'draft_valid_not_approved'
      },
      {
        evidenceId: 'CM-1699',
        status: 'packet_valid_not_approved'
      },
      {
        evidenceId: 'CM-1698',
        status: 'preflight_valid_no_runtime'
      }
    ],
    requestedNextAction: {
      actionId: 'CM1703-LOCAL-SAFE-PACKET-HARDENING',
      actionKind: 'source_contract',
      flags: {}
    },
    ...overrides
  };
}

function blockedByFlags(flags) {
  return buildVcpToolBoxCommanderRuntimeInspectionGoNoGoPacket(baseInput({
    requestedNextAction: {
      actionId: 'CM1703-BLOCKED-NEXT-ACTION',
      actionKind: 'docs',
      flags
    }
  }));
}

test('CM1702 accepts fixture-only local-safe next step and returns continue_local_safe', () => {
  const result = buildVcpToolBoxCommanderRuntimeInspectionGoNoGoPacket(baseInput({
    requestedNextAction: {
      actionId: 'CM1703-FIXTURE-ONLY-HARDENING',
      actionKind: 'fixture',
      flags: {}
    }
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, CONTRACT_MODE);
  assert.equal(result.operatorDecision, OPERATOR_DECISION);
  assert.equal(result.decision, DECISIONS.CONTINUE_LOCAL_SAFE);
  assert.equal(result.reasonCode, 'local_safe_next_step');
  assert.equal(result.alignment.projectFinalGoalServed, true);
  assert.equal(result.alignment.priorBoundaryReviewPassed, true);
  assert.equal(result.lowDisclosureProjection.requestedNextActionKind, 'fixture');
});

test('CM1702 blocks target-specific runtime inspection without exact approval', () => {
  const result = buildVcpToolBoxCommanderRuntimeInspectionGoNoGoPacket(baseInput({
    requestedNextAction: {
      actionId: 'CM1703-RUNTIME-INSPECTION',
      actionKind: 'target_specific_runtime_inspection',
      flags: {}
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL);
  assert.equal(result.reasonCode, 'forbidden_next_action_requested');
  assert.ok(result.forbiddenNextActionFlags.includes('targetSpecificRuntimeInspectionRequested'));
  assert.equal(result.targetSpecificRuntimeInspectionExecuted, false);
});

test('CM1702 blocks live VCPToolBox calls', () => {
  const result = blockedByFlags({
    liveVcpToolBoxCallRequested: true
  });

  assert.equal(result.decision, DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL);
  assert.ok(result.forbiddenNextActionFlags.includes('liveVcpToolBoxCallRequested'));
  assert.equal(result.liveVcpToolBoxCalled, false);
});

test('CM1702 blocks secret config private-state fields and does not echo values', () => {
  const result = buildVcpToolBoxCommanderRuntimeInspectionGoNoGoPacket(baseInput({
    sanitizedEvidence: {
      bearerToken: 'SECRET_TOKEN_SHOULD_NOT_ECHO',
      configEnvPath: 'A:/VCP/VCPToolBox/config.env',
      privateRuntimeState: 'PRIVATE_RUNTIME_STATE_SHOULD_NOT_ECHO'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.decision, DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL);
  assert.equal(result.reasonCode, 'unsafe_sensitive_or_raw_fields_present');
  assert.ok(result.unsafeFieldCategories.includes('secret_config_private_state'));
  assert.equal(serialized.includes('SECRET_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('VCPToolBox/config.env'), false);
  assert.equal(serialized.includes('PRIVATE_RUNTIME_STATE_SHOULD_NOT_ECHO'), false);
  assert.equal(result.configEnvRead, false);
  assert.equal(result.envFileRead, false);
});

test('CM1702 blocks raw memory and raw runtime output requests', () => {
  const result = blockedByFlags({
    rawMemoryOrRuntimeOutputRequested: true
  });

  assert.equal(result.decision, DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL);
  assert.ok(result.forbiddenNextActionFlags.includes('rawMemoryOrRuntimeOutputRequested'));
  assert.equal(result.rawMemoryRead, false);
  assert.equal(result.outputPolicy.rawRuntimeOutputIncluded, false);
  assert.equal(result.outputPolicy.rawMemoryIncluded, false);
});

test('CM1702 blocks durable memory write and provider/API calls', () => {
  const result = blockedByFlags({
    durableMemoryWriteRequested: true,
    providerApiCallRequested: true
  });

  assert.equal(result.decision, DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL);
  assert.ok(result.forbiddenNextActionFlags.includes('durableMemoryWriteRequested'));
  assert.ok(result.forbiddenNextActionFlags.includes('providerApiCallRequested'));
  assert.equal(result.memoryWritten, false);
  assert.equal(result.providerApiCalled, false);
});

test('CM1702 blocks public MCP expansion and startup watchdog config mutation', () => {
  const result = blockedByFlags({
    publicMcpExpansionRequested: true,
    startupWatchdogConfigMutationRequested: true
  });

  assert.equal(result.decision, DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL);
  assert.ok(result.forbiddenNextActionFlags.includes('publicMcpExpansionRequested'));
  assert.ok(result.forbiddenNextActionFlags.includes('startupWatchdogConfigMutationRequested'));
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.configEnvRead, false);
});

test('CM1702 blocks readiness cutover release deploy and push claims', () => {
  const result = buildVcpToolBoxCommanderRuntimeInspectionGoNoGoPacket(baseInput({
    requestedNextAction: {
      actionId: 'CM1703-PUSH-OR-RELEASE',
      actionKind: 'release',
      flags: {
        readinessCutoverReleaseDeployPushRequested: true
      }
    }
  }));

  assert.equal(result.decision, DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL);
  assert.ok(result.forbiddenNextActionFlags.includes('readinessCutoverReleaseDeployPushRequested'));
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.cutoverClaimed, false);
  assert.equal(result.releaseClaimed, false);
  assert.equal(result.deployClaimed, false);
  assert.equal(result.pushPerformed, false);
});

test('CM1702 returns needs_plan_adjustment when Master Stage Version alignment is missing', () => {
  const result = buildVcpToolBoxCommanderRuntimeInspectionGoNoGoPacket(baseInput({
    masterTaskbookReference: undefined,
    masterTaskbookId: undefined,
    stageReference: undefined,
    stageId: undefined,
    versionReference: undefined,
    versionId: undefined
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, DECISIONS.NEEDS_PLAN_ADJUSTMENT);
  assert.equal(result.reasonCode, 'alignment_missing_or_ambiguous');
  assert.ok(result.alignment.missingAlignmentFields.includes('master_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('stage_reference_or_id'));
  assert.ok(result.alignment.missingAlignmentFields.includes('version_reference_or_id'));
});

test('CM1702 requires passed CM1701-style boundary review status before go', () => {
  const result = buildVcpToolBoxCommanderRuntimeInspectionGoNoGoPacket(baseInput({
    priorBoundaryReviewStatus: 'NOT_REVIEWED',
    evidencePackets: [
      {
        evidenceId: 'CM-1701',
        status: 'REVIEW_NEEDS_PLAN_ADJUSTMENT'
      }
    ]
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.decision, DECISIONS.NEEDS_PLAN_ADJUSTMENT);
  assert.equal(result.reasonCode, 'prior_boundary_review_not_passed_or_missing');
  assert.ok(result.alignment.missingAlignmentFields.includes('priorBoundaryReviewStatus'));
});

test('CM1702 enforces zero counters and no approval-line issue or consume', () => {
  const result = buildVcpToolBoxCommanderRuntimeInspectionGoNoGoPacket(baseInput());

  assert.deepEqual(result.localSafeCounters, ZERO_COUNTERS);
  assert.equal(result.exactApprovalLineIssued, false);
  assert.equal(result.approvalLineConsumed, false);
  assert.equal(result.runtimeCallsMade, false);
  assert.equal(result.targetSpecificRuntimeInspectionExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.configEnvRead, false);
  assert.equal(result.envFileRead, false);
  assert.equal(result.rawMemoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.completeV8Claimed, false);
});

test('CM1702 keeps output low-disclosure and omits unsafe nested field names and values', () => {
  const result = buildVcpToolBoxCommanderRuntimeInspectionGoNoGoPacket(baseInput({
    evidencePackets: [
      {
        evidenceId: 'CM-1701',
        status: 'CM1701_BOUNDARY_REVIEW_PASSED',
        nested: {
          rawDailyNoteContent: 'RAW_DAILY_NOTE_SHOULD_NOT_ECHO',
          endpoint: 'https://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
          providerResponse: 'PROVIDER_RESPONSE_SHOULD_NOT_ECHO'
        }
      }
    ],
    requestedNextAction: {
      actionId: 'CM1703-DOCS',
      actionKind: 'docs',
      flags: {}
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.decision, DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL);
  assert.ok(result.unsafeFieldCategories.includes('raw_memory_or_runtime_output'));
  assert.ok(result.unsafeFieldCategories.includes('locator_endpoint_or_path'));
  assert.ok(result.unsafeFieldCategories.includes('provider_response'));
  assert.equal(serialized.includes('rawDailyNoteContent'), false);
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_DAILY_NOTE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PROVIDER_RESPONSE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('docs/taskbooks'), false);
});

test('CM1702 locks exported vocabulary for Commander go no-go routing', () => {
  assert.equal(OPERATOR_DECISION, 'commander_route_vcptoolbox_next_step_without_runtime_execution');
  assert.ok(REQUIRED_ALIGNMENT_FIELDS.includes('projectFinalGoalServed'));
  assert.ok(FORBIDDEN_NEXT_ACTION_FLAGS.includes('targetSpecificRuntimeInspectionRequested'));
  assert.ok(FORBIDDEN_NEXT_ACTION_FLAGS.includes('approvalLineIssueOrConsumeRequested'));
  assert.ok(FORBIDDEN_NEXT_ACTION_FLAGS.includes('completeV8ClaimRequested'));
});
