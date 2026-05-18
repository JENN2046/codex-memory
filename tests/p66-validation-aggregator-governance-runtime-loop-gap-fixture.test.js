const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p66-validation-aggregator-governance-runtime-loop-gap-fixture-v1.json'
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const STAGE_IDS = [
  'review_packet_intake',
  'approval_packet_evaluation',
  'audit_evidence_shape_evaluation',
  'execution_gate_evaluation',
  'durable_write_gate',
  'post_action_evidence_gate'
];

const RUNTIME_EVIDENCE_GROUPS = [
  'review_packet_intake_runtime_evidence',
  'approval_packet_evaluation_runtime_evidence',
  'audit_evidence_shape_runtime_evidence',
  'execution_gate_runtime_evidence',
  'durable_write_gate_runtime_evidence',
  'post_action_evidence_runtime_evidence',
  'governance_loop_no_touch_boundary_proof',
  'governance_loop_readiness_overclaim_rejection_proof'
];

const APPROVAL_STATES = [
  'reviewed_not_approved',
  'approval_missing',
  'approval_unknown',
  'approval_warning_only',
  'approval_expired_or_stale',
  'approval_scope_mismatch',
  'approval_without_a5_runtime_authority'
];

test('P66.38 fixture parses as governance runtime loop acceptance contract and remains blocked', () => {
  assert.equal(fixture.schemaVersion, 'p66-validation-aggregator-governance-runtime-loop-gap-fixture-v1');
  assert.equal(fixture.policyVersion, 'p66-validation-aggregator-governance-runtime-loop-gap-fixture-policy-v1');
  assert.equal(fixture.manifestVersion, 'p66-validation-aggregator-governance-runtime-loop-gap-fixture-manifest-v1');
  assert.equal(fixture.phase, 'P66.38-validation-aggregator-governance-runtime-loop-gap-fixture-tests');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.acceptanceContractOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('P66.38 keeps the selected governance runtime loop gap open', () => {
  assert.equal(fixture.selectedGap.id, 'governance_review_approval_audit_runtime_loop_not_executed');
  assert.equal(fixture.selectedGap.priority, 2);
  assert.equal(fixture.selectedGap.currentStatus, 'open');
  assert.equal(fixture.selectedGap.remainsOpenAfterThisPhase, true);
  assert.equal(fixture.selectedGap.readinessAuthority, false);
  assert.equal(fixture.selectedGap.requiresA5ApprovalBeforeRuntime, true);
});

test('P66.38 defines a non-runtime acceptance evidence group', () => {
  assert.equal(fixture.evidenceGroup.id, 'governance_runtime_loop_acceptance_contract');
  assert.equal(fixture.evidenceGroup.currentStatus, 'acceptance_defined');
  assert.equal(fixture.evidenceGroup.required, true);
  assert.equal(fixture.evidenceGroup.remainsNonRuntime, true);
  assert.equal(fixture.evidenceGroup.readinessAuthority, false);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenMissing, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenScopeMismatch, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenApprovalMissing, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenAuditRefsMissing, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenDurableWriteClaimed, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenRuntimeReadyClaimed, true);
});

test('P66.38 preserves public MCP freeze and internal validate_memory status', () => {
  assert.deepEqual(fixture.publicTools, [
    'record_memory',
    'search_memory',
    'memory_overview'
  ]);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.internalOnlyTools, ['validate_memory']);
});

test('P66.38 keeps implementation runtime final RC and cutover readiness false', () => {
  for (const field of [
    'validationAggregatorFullImplementation',
    'governanceRuntimeLoopReady',
    'governanceRuntimeLoopExecuted',
    'approvalExecutionReady',
    'auditWriterReady',
    'durableAuditWritten',
    'durableMemoryWritten',
    'runtimeReady',
    'finalRcMatrixReady',
    'v1RcReady',
    'rcReady',
    'cutoverReady'
  ]) {
    assert.equal(fixture[field], false, field);
  }
});

test('P66.38 loop identity contract requires stable ids across stages', () => {
  assert.equal(fixture.loopIdentityContract.allRequired, true);
  assert.equal(fixture.loopIdentityContract.mustRemainStableAcrossStages, true);
  assert.equal(fixture.loopIdentityContract.mustFailClosedWhenMissingOrMismatched, true);

  for (const field of [
    'loop_id',
    'action_id',
    'review_packet_id',
    'approval_packet_id',
    'pre_action_audit_event_id',
    'decision_audit_event_id',
    'post_action_audit_event_id',
    'correlation_id'
  ]) {
    assert.equal(typeof fixture.loopIdentityContract[field], 'string', field);
    assert.ok(fixture.loopIdentityContract[field].endsWith('_001'), field);
  }
});

test('P66.38 scope contract preserves scope without exposing raw workspace id in summaries', () => {
  assert.equal(fixture.scopeContract.visibility, 'private');
  assert.equal(fixture.scopeContract.scopeMustMatchAcrossReviewApprovalAuditAndExecution, true);
  assert.equal(fixture.scopeContract.rawWorkspaceIdExposedInLowRiskSummary, false);
  assert.equal(fixture.scopeContract.mustFailClosedWhenScopeMissingOrMismatched, true);

  for (const field of ['project_ref', 'workspace_ref', 'client_ref', 'agent_ref', 'task_ref']) {
    assert.equal(typeof fixture.scopeContract[field], 'string', field);
    assert.match(fixture.scopeContract[field], /_ref_fixture_alpha$/);
  }
});

test('P66.38 authority contract blocks approval execution by default', () => {
  assert.equal(fixture.authorityContract.approvalRequired, true);
  assert.equal(fixture.authorityContract.approvalCurrentlyGranted, false);
  assert.equal(fixture.authorityContract.approvalStatus, 'NOT_APPROVED');
  assert.equal(fixture.authorityContract.a5ApprovalRequiredBeforeRuntime, true);
  assert.equal(fixture.authorityContract.approvalMustNameActionId, true);
  assert.equal(fixture.authorityContract.approvalMustMatchScope, true);
  assert.equal(fixture.authorityContract.approvalMustNameDurableWriteIntent, true);
  assert.equal(fixture.authorityContract.warningOnlyApprovalAllowed, false);
  assert.equal(fixture.authorityContract.staleApprovalAllowed, false);
  assert.equal(fixture.authorityContract.executionAllowedByFixture, false);
});

test('P66.38 audit ref contract requires audit identity without durable writes', () => {
  assert.equal(fixture.auditRefContract.preActionAuditRefRequired, true);
  assert.equal(fixture.auditRefContract.decisionAuditRefRequired, true);
  assert.equal(fixture.auditRefContract.postActionAuditRefRequired, true);
  assert.equal(fixture.auditRefContract.auditRefsMustPreserveEventIdentity, true);
  assert.equal(fixture.auditRefContract.durableAuditWriteAllowedInFixture, false);
  assert.equal(fixture.auditRefContract.rawAuditPayloadAllowedInLowRiskSummary, false);
  assert.equal(fixture.auditRefContract.mustFailClosedWhenAuditRefsMissingOrMismatched, true);
});

test('P66.38 stage acceptance cases are exact, ordered, and non-executable', () => {
  assert.deepEqual(fixture.stageAcceptanceCases.map(stage => stage.id), STAGE_IDS);

  for (const stage of fixture.stageAcceptanceCases) {
    assert.equal(stage.required, true, stage.id);
    assert.equal(stage.inputMode, 'explicit_input', stage.id);
    assert.match(stage.expectedStatus, /^blocked_/);
    assert.equal(stage.canExecute, false, stage.id);
    assert.equal(stage.durableWriteAllowed, false, stage.id);
  }
});

test('P66.38 required runtime evidence groups are exact and missing by default', () => {
  assert.deepEqual(fixture.requiredRuntimeEvidenceGroups.map(group => group.id), RUNTIME_EVIDENCE_GROUPS);

  for (const group of fixture.requiredRuntimeEvidenceGroups) {
    assert.equal(group.required, true, group.id);
    assert.equal(group.currentStatus, 'missing', group.id);
    assert.equal(group.mustFailClosedWhenMissing, true, group.id);
  }
});

test('P66.38 approval states fail closed except reviewed-not-approved planning posture', () => {
  assert.deepEqual(fixture.approvalStates.map(state => state.id), APPROVAL_STATES);

  assert.equal(fixture.approvalStates[0].id, 'reviewed_not_approved');
  assert.equal(fixture.approvalStates[0].acceptedForPlanning, true);
  assert.equal(fixture.approvalStates[0].executionAllowed, false);

  for (const state of fixture.approvalStates.slice(1)) {
    assert.equal(state.acceptedForPlanning, false, state.id);
    assert.equal(state.executionAllowed, false, state.id);
  }
});

test('P66.38 expected fail-closed report keeps readiness and execution blocked', () => {
  assert.equal(fixture.expectedFailClosedReport.status, 'blocked');
  assert.equal(fixture.expectedFailClosedReport.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.expectedFailClosedReport.accepted, false);
  assert.equal(fixture.expectedFailClosedReport.rejected, true);
  assert.equal(fixture.expectedFailClosedReport.failClosed, true);
  assert.equal(fixture.expectedFailClosedReport.selectedGapOpen, true);
  assert.equal(fixture.expectedFailClosedReport.stageCount, 6);
  assert.equal(fixture.expectedFailClosedReport.requiredRuntimeEvidenceGroupCount, 8);

  for (const field of [
    'approvalExecutionReady',
    'auditWriterReady',
    'durableWriteReady',
    'governanceRuntimeLoopReady',
    'governanceRuntimeLoopExecuted',
    'runtimeReady',
    'finalRcMatrixReady',
    'v1RcReady',
    'rcReady'
  ]) {
    assert.equal(fixture.expectedFailClosedReport[field], false, field);
  }
});

test('P66.38 fail-closed cases cover identity scope approval audit durable write provider MCP and readiness failures', () => {
  for (const failClosedCase of [
    'missing_loop_identity',
    'mismatched_loop_identity',
    'missing_review_packet',
    'missing_approval_packet',
    'missing_audit_refs',
    'missing_scope',
    'scope_mismatch_between_review_approval_audit_and_execution',
    'approval_missing',
    'approval_unknown',
    'approval_warning_only',
    'approval_expired_or_stale',
    'approval_without_a5_runtime_authority',
    'execution_attempt_without_authority',
    'durable_audit_write_claim',
    'durable_memory_write_claim',
    'real_packet_read_claim',
    'real_audit_log_read_claim',
    'provider_call_claim',
    'public_mcp_expansion_claim',
    'readiness_claim_without_authority'
  ]) {
    assert.ok(fixture.failClosedCases.includes(failClosedCase), failClosedCase);
  }
});

test('P66.38 low-risk summary excludes raw ids secrets paths URLs and governance payloads', () => {
  assert.equal(fixture.lowRiskSummary.rawWorkspaceIdExposed, false);
  assert.equal(fixture.lowRiskSummary.rawSecretExposed, false);
  assert.equal(fixture.lowRiskSummary.rawGovernancePayloadExposed, false);
  assert.deepEqual(fixture.lowRiskSummary.allowedFields, [
    'status',
    'decision',
    'fail_closed',
    'selected_gap',
    'stage_count',
    'required_runtime_evidence_group_count',
    'readiness_blocked'
  ]);

  for (const disallowed of [
    'raw_workspace_id',
    'raw_workspace_path',
    'raw_secret',
    'raw_token',
    'authorization_header',
    'provider_key',
    'absolute_path',
    'live_service_url',
    'real_memory_content',
    'real_review_packet',
    'real_approval_packet',
    'real_audit_payload',
    'durable_store_path'
  ]) {
    assert.ok(fixture.lowRiskSummary.disallowedFields.includes(disallowed), disallowed);
  }
});

test('P66.38 disallowed work covers runtime provider config data MCP package secret release and cutover actions', () => {
  for (const disallowed of [
    'runtime_governance_loop',
    'governed_action_execution',
    'approval_execution',
    'durable_audit_writer',
    'durable_memory_writer',
    'real_review_packet_read',
    'real_approval_packet_read',
    'real_audit_log_read',
    'real_memory_scan',
    'runtime_store_scan',
    'command_execution',
    'gate_execution',
    'runner_execution',
    'service_start',
    'provider_call',
    'config_mutation',
    'startup_watchdog_operation',
    'migration_apply',
    'import_export_apply',
    'public_mcp_expansion',
    'validate_memory_public_exposure',
    'package_lockfile_change',
    'env_secret_change',
    'push',
    'tag',
    'release',
    'deploy',
    'rc_ready_claim',
    'cutover_ready_claim'
  ]) {
    assert.ok(fixture.disallowedWork.includes(disallowed), disallowed);
  }
});

test('P66.38 safety flags preserve no-touch no-side-effect and no-release boundaries', () => {
  for (const [flag, value] of Object.entries(fixture.safety)) {
    assert.equal(value, flag === 'mutated' ? false : true, flag);
  }
});

test('P66.38 forbidden claims keep runtime loop and readiness blocked', () => {
  assert.ok(fixture.forbiddenClaims.includes('P66.38 executes governance runtime loop'));
  assert.ok(fixture.forbiddenClaims.includes('P66.38 closes governance_review_approval_audit_runtime_loop_not_executed'));
  assert.ok(fixture.forbiddenClaims.includes('P66.38 enables approval execution'));
  assert.ok(fixture.forbiddenClaims.includes('P66.38 enables governed action execution'));
  assert.ok(fixture.forbiddenClaims.includes('P66.38 enables durable audit writer'));
  assert.ok(fixture.forbiddenClaims.includes('P66.38 makes governanceRuntimeLoopReady true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.38 makes validationAggregatorFullImplementation true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.38 authorizes RC_READY'));
  assert.ok(fixture.forbiddenClaims.includes('P66.38 authorizes cutover'));
  assert.ok(fixture.forbiddenClaims.includes('P66.38 authorizes push tag release deploy'));
});

test('P66.38 fixture text does not expose raw secrets raw workspace ids URLs or absolute paths', () => {
  assert.doesNotMatch(fixtureText, /authorization\s*:/i);
  assert.doesNotMatch(fixtureText, /Bearer\s+[A-Za-z0-9._-]+/);
  assert.doesNotMatch(fixtureText, /api[_-]?key\s*[:=]/i);
  assert.doesNotMatch(fixtureText, /password\s*[:=]/i);
  assert.doesNotMatch(fixtureText, /token\s*[:=]/i);
  assert.doesNotMatch(fixtureText, /set-cookie/i);
  assert.doesNotMatch(fixtureText, /(^|[^A-Za-z])sk-[A-Za-z0-9_-]{12,}/);
  assert.doesNotMatch(fixtureText, /workspace-[A-Za-z0-9_-]{8,}/);
  assert.doesNotMatch(fixtureText, /[A-Z]:[\\/]/);
  assert.doesNotMatch(fixtureText, /https?:\/\//i);
});

test('P66.38 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
