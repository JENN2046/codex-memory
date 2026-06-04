const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_APPROVAL_STATES,
  REQUIRED_DISALLOWED_WORK,
  REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_FAIL_CLOSED_REASONS,
  REQUIRED_RUNTIME_EVIDENCE_GROUPS,
  REQUIRED_STAGE_IDS,
  evaluateValidationAggregatorGovernanceRuntimeLoopGap,
  normalizeValidationAggregatorGovernanceRuntimeLoopGapInput
} = require('../src/core/ValidationAggregatorGovernanceRuntimeLoopGapContract');

function buildStageCases(overrides = {}) {
  return REQUIRED_STAGE_IDS.map(stageId => ({
    id: stageId,
    required: true,
    inputMode: 'explicit_input',
    expectedStatus: `blocked_${stageId}`,
    canExecute: false,
    requiresA5Approval: stageId !== 'review_packet_intake',
    durableWriteAllowed: false,
    ...overrides[stageId]
  }));
}

function buildRuntimeEvidenceGroups(overrides = {}) {
  return REQUIRED_RUNTIME_EVIDENCE_GROUPS.map(groupId => ({
    id: groupId,
    required: true,
    currentStatus: 'missing',
    mustFailClosedWhenMissing: true,
    ...overrides[groupId]
  }));
}

function buildApprovalStates(overrides = {}) {
  return REQUIRED_APPROVAL_STATES.map(stateId => ({
    id: stateId,
    acceptedForPlanning: stateId === 'reviewed_not_approved',
    executionAllowed: false,
    ...overrides[stateId]
  }));
}

function buildValidInput(overrides = {}) {
  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    policyVersion: EXPECTED_POLICY_VERSION,
    manifestVersion: EXPECTED_MANIFEST_VERSION,
    sourceMode: 'explicit_metadata_only',
    status: 'blocked',
    decision: 'NOT_READY_BLOCKED',
    selectedGap: {
      id: 'governance_review_approval_audit_runtime_loop_not_executed',
      priority: 2,
      currentStatus: 'open',
      remainsOpenAfterThisPhase: true,
      readinessAuthority: false,
      requiresA5ApprovalBeforeRuntime: true
    },
    evidenceGroup: {
      id: 'governance_runtime_loop_acceptance_contract',
      currentStatus: 'acceptance_defined',
      required: true,
      remainsNonRuntime: true,
      readinessAuthority: false,
      mustFailClosedWhenMissing: true,
      mustFailClosedWhenScopeMismatch: true,
      mustFailClosedWhenApprovalMissing: true,
      mustFailClosedWhenAuditRefsMissing: true,
      mustFailClosedWhenDurableWriteClaimed: true,
      mustFailClosedWhenRuntimeReadyClaimed: true
    },
    publicMcpTools: [...PUBLIC_MCP_TOOLS],
    loopIdentityContract: {
      loop_id: 'governance_loop_fixture_001',
      action_id: 'governed_action_fixture_001',
      review_packet_id: 'review_packet_fixture_001',
      approval_packet_id: 'approval_packet_fixture_001',
      pre_action_audit_event_id: 'audit_event_fixture_pre_001',
      decision_audit_event_id: 'audit_event_fixture_decision_001',
      post_action_audit_event_id: 'audit_event_fixture_post_001',
      correlation_id: 'governance_correlation_fixture_001',
      allRequired: true,
      mustRemainStableAcrossStages: true,
      mustFailClosedWhenMissingOrMismatched: true
    },
    scopeContract: {
      project_ref: 'project_ref_fixture_alpha',
      workspace_ref: 'workspace_ref_fixture_alpha',
      client_ref: 'client_ref_fixture_alpha',
      agent_ref: 'agent_ref_fixture_alpha',
      task_ref: 'task_ref_fixture_alpha',
      visibility: 'private',
      scopeMustMatchAcrossReviewApprovalAuditAndExecution: true,
      rawWorkspaceIdExposedInLowRiskSummary: false,
      mustFailClosedWhenScopeMissingOrMismatched: true
    },
    authorityContract: {
      approvalRequired: true,
      approvalCurrentlyGranted: false,
      approvalStatus: 'NOT_APPROVED',
      a5ApprovalRequiredBeforeRuntime: true,
      approvalMustNameActionId: true,
      approvalMustMatchScope: true,
      approvalMustNameDurableWriteIntent: true,
      warningOnlyApprovalAllowed: false,
      staleApprovalAllowed: false,
      executionAllowedByFixture: false
    },
    auditRefContract: {
      preActionAuditRefRequired: true,
      decisionAuditRefRequired: true,
      postActionAuditRefRequired: true,
      auditRefsMustPreserveEventIdentity: true,
      durableAuditWriteAllowedInFixture: false,
      rawAuditPayloadAllowedInLowRiskSummary: false,
      mustFailClosedWhenAuditRefsMissingOrMismatched: true
    },
    stageAcceptanceCases: buildStageCases(),
    requiredRuntimeEvidenceGroups: buildRuntimeEvidenceGroups(),
    approvalStates: buildApprovalStates(),
    failClosedCases: [...REQUIRED_FAIL_CLOSED_CASES],
    disallowedWork: [...REQUIRED_DISALLOWED_WORK],
    lowRiskSummary: {
      rawWorkspaceIdExposed: false,
      rawSecretExposed: false,
      rawGovernancePayloadExposed: false
    },
    safety: {
      noRuntimeImplementation: true,
      noGovernanceLoopExecution: true,
      noGovernedActionExecution: true,
      noApprovalExecution: true,
      noCommandExecution: true,
      noGateExecution: true,
      noRunnerExecution: true,
      noServiceStart: true,
      noProviderCall: true,
      noConfigMutation: true,
      noStartupWatchdogOperation: true,
      noRealMemoryPreview: true,
      noRealGovernancePacketRead: true,
      noRealAuditLogRead: true,
      noRuntimeStoreScan: true,
      noDurableMemoryWrite: true,
      noDurableAuditWrite: true,
      noMigrationApply: true,
      noImportExportApply: true,
      noPublicMcpExpansion: true,
      noPackageChange: true,
      noSecretChange: true,
      noRemoteWrite: true,
      noTagReleaseDeploy: true
    },
    readiness: {
      validationAggregatorFullImplementationReady: false,
      governanceRuntimeLoopReady: false,
      governanceRuntimeLoopExecuted: false,
      approvalExecutionReady: false,
      auditWriterReady: false,
      durableWriteReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false,
      cutoverReady: false
    },
    ...overrides
  };
}

test('P66.39 helper accepts explicit governance loop metadata while keeping runtime blocked', () => {
  const result = evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput());

  assert.equal(result.status, 'governance_runtime_loop_acceptance_contract_accepted_runtime_still_blocked');
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.acceptedForPlanning, true);
  assert.deepEqual(result.failClosedReasons, []);
  assert.equal(result.selectedGapOpen, true);
  assert.equal(result.summary.stageCount, REQUIRED_STAGE_IDS.length);
  assert.equal(result.summary.requiredRuntimeEvidenceGroupCount, REQUIRED_RUNTIME_EVIDENCE_GROUPS.length);
  assert.equal(result.summary.noRuntimeLoopExecution, true);
  assert.equal(result.governanceRuntimeLoopReady, false);
  assert.equal(result.approvalExecutionReady, false);
  assert.equal(result.durableWriteReady, false);
  assert.equal(result.rcReady, false);
});

test('P66.39 helper normalizes allowlisted fields without arbitrary passthrough', () => {
  const normalized = normalizeValidationAggregatorGovernanceRuntimeLoopGapInput(buildValidInput({
    extra: 'ignored'
  }));

  assert.equal(normalized.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.deepEqual(normalized.publicMcpTools, PUBLIC_MCP_TOOLS);
  assert.deepEqual(normalized.failClosedCases, REQUIRED_FAIL_CLOSED_CASES);
  assert.deepEqual(normalized.disallowedWork, REQUIRED_DISALLOWED_WORK);
  assert.equal(normalized.extra, undefined);
  assert.equal(normalized.stageAcceptanceCases[0].extra, undefined);
});

test('P66.39 helper does not perform fs reads or command execution', () => {
  const source = require('node:fs').readFileSync(
    require('node:path').join(
      __dirname,
      '..',
      'src',
      'core',
      'ValidationAggregatorGovernanceRuntimeLoopGapContract.js'
    ),
    'utf8'
  );

  assert.doesNotMatch(source, /require\(['"](?:node:fs|fs|node:child_process|child_process|node:http|http|node:https|https|node:net|net|node:tls|tls|node:dgram|dgram|node:sqlite|sqlite3|better-sqlite3)['"]\)/);
  assert.doesNotMatch(source, /\breadFileSync\s*\(/);
  assert.doesNotMatch(source, /\breaddirSync\s*\(/);
  assert.doesNotMatch(source, /\bspawn(?:Sync)?\s*\(/);
  assert.doesNotMatch(source, /\bexec(?:File)?(?:Sync)?\s*\(/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
});

test('P66.39 helper fails closed for malformed or version drift', () => {
  assert.ok(
    evaluateValidationAggregatorGovernanceRuntimeLoopGap(null)
      .failClosedReasons.includes('malformed_input')
  );
  assert.ok(
    evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
      schemaVersion: 'wrong'
    })).failClosedReasons.includes('schema_version_mismatch')
  );
  assert.ok(
    evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
      policyVersion: 'wrong'
    })).failClosedReasons.includes('policy_version_mismatch')
  );
  assert.ok(
    evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
      manifestVersion: 'wrong'
    })).failClosedReasons.includes('manifest_version_mismatch')
  );
});

test('P66.39 helper fails closed for public MCP selected gap and evidence group drift', () => {
  assert.ok(
    evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
      publicMcpTools: [...PUBLIC_MCP_TOOLS, 'validate_memory']
    })).failClosedReasons.includes('public_mcp_tools_drift')
  );
  assert.ok(
    evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
      selectedGap: {
        ...buildValidInput().selectedGap,
        currentStatus: 'closed'
      }
    })).failClosedReasons.includes('selected_gap_drift')
  );
  assert.ok(
    evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
      evidenceGroup: {
        ...buildValidInput().evidenceGroup,
        remainsNonRuntime: false
      }
    })).failClosedReasons.includes('evidence_group_drift')
  );
});

test('P66.39 helper fails closed for identity scope authority and audit contract drift', () => {
  assert.ok(
    evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
      loopIdentityContract: {
        ...buildValidInput().loopIdentityContract,
        correlation_id: ''
      }
    })).failClosedReasons.includes('identity_contract_drift')
  );
  assert.ok(
    evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
      scopeContract: {
        ...buildValidInput().scopeContract,
        rawWorkspaceIdExposedInLowRiskSummary: true
      }
    })).failClosedReasons.includes('scope_contract_drift')
  );
  assert.ok(
    evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
      authorityContract: {
        ...buildValidInput().authorityContract,
        approvalCurrentlyGranted: true
      }
    })).failClosedReasons.includes('authority_contract_drift')
  );
  assert.ok(
    evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
      auditRefContract: {
        ...buildValidInput().auditRefContract,
        durableAuditWriteAllowedInFixture: true
      }
    })).failClosedReasons.includes('audit_ref_contract_drift')
  );
});

test('P66.39 helper fails closed for missing duplicate unknown or executable stages', () => {
  const missingResult = evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
    stageAcceptanceCases: buildStageCases().filter(stage => stage.id !== 'durable_write_gate')
  }));
  assert.ok(missingResult.failClosedReasons.includes('missing_required_stage'));
  assert.deepEqual(missingResult.missingRequiredStages, ['durable_write_gate']);

  const duplicateResult = evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
    stageAcceptanceCases: [
      ...buildStageCases(),
      buildStageCases()[0]
    ]
  }));
  assert.ok(duplicateResult.failClosedReasons.includes('duplicate_stage'));
  assert.deepEqual(duplicateResult.duplicateStages, ['review_packet_intake']);

  const unknownResult = evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
    stageAcceptanceCases: [
      ...buildStageCases(),
      {
        id: 'surprise_runtime_stage',
        required: true,
        inputMode: 'explicit_input',
        expectedStatus: 'blocked_surprise',
        canExecute: false,
        durableWriteAllowed: false
      }
    ]
  }));
  assert.ok(unknownResult.failClosedReasons.includes('unknown_stage'));
  assert.deepEqual(unknownResult.unknownStages, ['surprise_runtime_stage']);

  const executableResult = evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
    stageAcceptanceCases: buildStageCases({
      execution_gate_evaluation: {
        canExecute: true
      }
    })
  }));
  assert.ok(executableResult.failClosedReasons.includes('stage_allows_execution'));
  assert.deepEqual(executableResult.stagesAllowingExecution, ['execution_gate_evaluation']);
});

test('P66.39 helper fails closed for runtime evidence group drift', () => {
  const missingResult = evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
    requiredRuntimeEvidenceGroups: buildRuntimeEvidenceGroups()
      .filter(group => group.id !== 'post_action_evidence_runtime_evidence')
  }));
  assert.ok(missingResult.failClosedReasons.includes('missing_required_runtime_evidence_group'));
  assert.deepEqual(missingResult.missingRequiredRuntimeEvidenceGroups, ['post_action_evidence_runtime_evidence']);

  const duplicateResult = evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
    requiredRuntimeEvidenceGroups: [
      ...buildRuntimeEvidenceGroups(),
      buildRuntimeEvidenceGroups()[0]
    ]
  }));
  assert.ok(duplicateResult.failClosedReasons.includes('duplicate_runtime_evidence_group'));
  assert.deepEqual(duplicateResult.duplicateRuntimeEvidenceGroups, ['review_packet_intake_runtime_evidence']);

  const unknownResult = evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
    requiredRuntimeEvidenceGroups: [
      ...buildRuntimeEvidenceGroups(),
      {
        id: 'real_runtime_scan_evidence',
        required: true,
        currentStatus: 'missing',
        mustFailClosedWhenMissing: true
      }
    ]
  }));
  assert.ok(unknownResult.failClosedReasons.includes('unknown_runtime_evidence_group'));
  assert.deepEqual(unknownResult.unknownRuntimeEvidenceGroups, ['real_runtime_scan_evidence']);

  const presentResult = evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
    requiredRuntimeEvidenceGroups: buildRuntimeEvidenceGroups({
      durable_write_gate_runtime_evidence: {
        currentStatus: 'present'
      }
    })
  }));
  assert.ok(presentResult.failClosedReasons.includes('runtime_evidence_group_not_missing'));
  assert.deepEqual(presentResult.runtimeEvidenceGroupsNotMissing, ['durable_write_gate_runtime_evidence']);
});

test('P66.39 helper fails closed for approval state drift', () => {
  const missingResult = evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
    approvalStates: buildApprovalStates().filter(state => state.id !== 'approval_scope_mismatch')
  }));
  assert.ok(missingResult.failClosedReasons.includes('missing_required_approval_state'));
  assert.deepEqual(missingResult.missingRequiredApprovalStates, ['approval_scope_mismatch']);

  const duplicateResult = evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
    approvalStates: [
      ...buildApprovalStates(),
      buildApprovalStates()[0]
    ]
  }));
  assert.ok(duplicateResult.failClosedReasons.includes('duplicate_approval_state'));
  assert.deepEqual(duplicateResult.duplicateApprovalStates, ['reviewed_not_approved']);

  const unknownResult = evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
    approvalStates: [
      ...buildApprovalStates(),
      {
        id: 'approval_granted',
        acceptedForPlanning: true,
        executionAllowed: true
      }
    ]
  }));
  assert.ok(unknownResult.failClosedReasons.includes('unknown_approval_state'));
  assert.ok(unknownResult.failClosedReasons.includes('approval_state_allows_execution'));
  assert.deepEqual(unknownResult.unknownApprovalStates, ['approval_granted']);
  assert.deepEqual(unknownResult.approvalStatesAllowingExecution, ['approval_granted']);
});

test('P66.39 helper fails closed for fail-closed case and disallowed work drift', () => {
  const missingCaseResult = evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
    failClosedCases: REQUIRED_FAIL_CLOSED_CASES.filter(item => item !== 'provider_call_claim')
  }));
  assert.ok(missingCaseResult.failClosedReasons.includes('missing_required_fail_closed_case'));
  assert.deepEqual(missingCaseResult.missingRequiredFailClosedCases, ['provider_call_claim']);

  const duplicateCaseResult = evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
    failClosedCases: [
      ...REQUIRED_FAIL_CLOSED_CASES,
      REQUIRED_FAIL_CLOSED_CASES[0]
    ]
  }));
  assert.ok(duplicateCaseResult.failClosedReasons.includes('duplicate_fail_closed_case'));
  assert.deepEqual(duplicateCaseResult.duplicateFailClosedCases, ['missing_loop_identity']);

  const disallowedWorkResult = evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
    disallowedWork: REQUIRED_DISALLOWED_WORK.filter(item => item !== 'provider_call')
  }));
  assert.ok(disallowedWorkResult.failClosedReasons.includes('disallowed_work_drift'));
  assert.deepEqual(disallowedWorkResult.missingRequiredDisallowedWork, ['provider_call']);
});

test('P66.39 helper fails closed for unsafe summaries safety flags sensitive fragments and readiness overclaims', () => {
  const syntheticBearerValue = ['Bearer', 'sk-test-value'].join(' ');

  assert.ok(
    evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
      lowRiskSummary: {
        rawWorkspaceIdExposed: true,
        rawSecretExposed: false,
        rawGovernancePayloadExposed: false
      }
    })).failClosedReasons.includes('unsafe_low_risk_summary')
  );
  assert.ok(
    evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
      safety: {
        ...buildValidInput().safety,
        noProviderCall: false
      }
    })).failClosedReasons.includes('unsafe_safety_flag')
  );
  assert.ok(
    evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
      status: syntheticBearerValue
    })).failClosedReasons.includes('sensitive_fragment_rejected')
  );
  assert.ok(
    evaluateValidationAggregatorGovernanceRuntimeLoopGap(buildValidInput({
      readiness: {
        rcReady: true
      }
    })).failClosedReasons.includes('readiness_overclaim')
  );
});

test('P66.39 helper redacts sensitive normalized output', () => {
  const syntheticBearerValue = ['Bearer', 'sk-test-value'].join(' ');
  const normalized = normalizeValidationAggregatorGovernanceRuntimeLoopGapInput(buildValidInput({
    status: syntheticBearerValue
  }));

  assert.doesNotMatch(normalized.status, /Bearer|sk-test-value/);
});

test('P66.39 helper exports required constants exactly', () => {
  assert.deepEqual(PUBLIC_MCP_TOOLS, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
  assert.deepEqual(REQUIRED_STAGE_IDS, [
    'review_packet_intake',
    'approval_packet_evaluation',
    'audit_evidence_shape_evaluation',
    'execution_gate_evaluation',
    'durable_write_gate',
    'post_action_evidence_gate'
  ]);
  assert.ok(REQUIRED_RUNTIME_EVIDENCE_GROUPS.includes('governance_loop_no_touch_boundary_proof'));
  assert.ok(REQUIRED_APPROVAL_STATES.includes('approval_without_a5_runtime_authority'));
  assert.ok(REQUIRED_FAIL_CLOSED_CASES.includes('durable_audit_write_claim'));
  assert.ok(REQUIRED_DISALLOWED_WORK.includes('validate_memory_public_exposure'));
  for (const reason of [
    'identity_contract_drift',
    'authority_contract_drift',
    'stage_allows_execution',
    'runtime_evidence_group_not_missing',
    'readiness_overclaim'
  ]) {
    assert.ok(REQUIRED_FAIL_CLOSED_REASONS.includes(reason), reason);
  }
});
