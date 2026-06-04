const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p66-validation-aggregator-rc-cutover-fixture-v1.json'
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const RC_CUTOVER_EVIDENCE = [
  'explicit_a5_rc_cutover_authorization',
  'objective_complete',
  'zero_remaining_runtime_gaps',
  'zero_a5_hard_stops',
  'final_rc_matrix_ready',
  'v1_rc_ready',
  'cutover_mainline_strict_gate_ready',
  'live_http_operation_readiness',
  'governance_runtime_loop_ready',
  'recall_isolation_runtime_proof_ready',
  'migration_approval_execution_ready',
  'release_target_binding',
  'rollback_plan',
  'no_git_state_change_report',
  'no_config_switch_report',
  'no_watchdog_startup_report',
  'no_provider_call_report',
  'machine_readable_rc_cutover_report'
];

const RC_CUTOVER_CONTEXT_CASES = [
  'rc_authorization_scope',
  'target_branch_main_bound',
  'origin_main_head_bound',
  'current_head_bound',
  'worktree_clean',
  'objective_complete_bound',
  'runtime_gap_count_zero',
  'a5_hard_stop_count_zero',
  'final_matrix_ready_bound',
  'v1_rc_ready_bound',
  'release_target_bound',
  'rollback_plan_bound',
  'report_bound_to_commit',
  'stale_report_rejected',
  'warning_only_rejected',
  'no_unapproved_release_side_effects',
  'no_config_side_effects'
];

const ALLOWED_SOURCE_TYPES = [
  'synthetic_fixture',
  'sanitized_metadata',
  'committed_fixture_reference'
];

const DENIED_SOURCE_TYPES = [
  'raw_command_output',
  'raw_git_remote',
  'authorization_header',
  'bearer_token',
  'real_memory_content',
  'real_diary',
  'real_sqlite',
  'real_vector_index',
  'real_candidate_cache',
  'real_recall_audit',
  'provider_output',
  'release_artifact',
  'deployment_log',
  'config_mutation_output',
  'service_install_output',
  'operator_free_text'
];

const A5_HARD_STOPS = [
  'push',
  'tag_create',
  'release_create',
  'deploy',
  'config_switch',
  'watchdog_install',
  'startup_install',
  'provider_call',
  'real_memory_scan',
  'sqlite_migration_apply',
  'import_export_apply',
  'backup_restore_apply',
  'durable_memory_write',
  'durable_audit_write',
  'public_mcp_expansion',
  'rc_ready_claim'
];

function ids(rows) {
  return rows.map(row => row.id);
}

test('P66.57 RC cutover fixture locks top-level blocked posture', () => {
  assert.equal(fixture.schemaVersion, 'p66-validation-aggregator-rc-cutover-fixture-v1');
  assert.equal(fixture.policyVersion, 'p66-validation-aggregator-rc-cutover-fixture-policy-v1');
  assert.equal(fixture.manifestVersion, 'p66-validation-aggregator-rc-cutover-fixture-manifest-v1');
  assert.equal(fixture.phase, 'P66.57-validation-aggregator-rc-cutover-fixture-tests');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.acceptanceContractOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('P66.57 selects only the RC cutover gap', () => {
  assert.equal(fixture.selectedGap.id, 'rc_cutover_not_executed');
  assert.equal(fixture.selectedGap.priority, 7);
  assert.equal(fixture.selectedGap.currentStatus, 'a5_blocked');
  assert.equal(fixture.selectedGap.requiresA5ApprovalBeforeRuntime, true);
  assert.equal(fixture.selectedGap.remainsOpenAfterThisPhase, true);
  assert.equal(fixture.selectedGap.readinessAuthority, false);
});

test('P66.57 binds back to P66.56 without granting authority', () => {
  assert.equal(fixture.sourcePlan.phase, 'P66.56-validation-aggregator-rc-cutover-gap-planning');
  assert.equal(fixture.sourcePlan.fixture, 'tests/fixtures/p66-validation-aggregator-rc-cutover-gap-plan-v1.json');
  assert.equal(fixture.sourcePlan.runtimeAuthority, false);
  assert.equal(fixture.sourcePlan.readinessAuthority, false);
  assert.equal(fixture.sourcePlan.cutoverAuthority, false);
});

test('P66.57 preserves public MCP freeze and internal validate_memory status', () => {
  assert.deepEqual(fixture.publicTools, [
    'record_memory',
    'search_memory',
    'memory_overview',
    'audit_memory'
  ]);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.internalOnlyTools, ['validate_memory']);
});

test('P66.57 keeps RC cutover and readiness flags false', () => {
  for (const field of [
    'validationAggregatorFullImplementation',
    'rcCutoverExecuted',
    'rcCutoverAuthorized',
    'rcCutoverReady',
    'releaseActionReady',
    'pushReady',
    'tagReady',
    'deployReady',
    'objectiveComplete',
    'zeroRemainingRuntimeGaps',
    'zeroA5HardStops',
    'runtimeReady',
    'finalRcMatrixReady',
    'v1RcReady',
    'rcReady',
    'cutoverReady'
  ]) {
    assert.equal(fixture[field], false, field);
  }
});

test('P66.57 source boundaries allow only synthetic or sanitized committed references', () => {
  assert.deepEqual(fixture.allowedSourceTypes, ALLOWED_SOURCE_TYPES);
  assert.deepEqual(fixture.deniedSourceTypes, DENIED_SOURCE_TYPES);
});

test('P66.57 RC cutover evidence acceptance cases are exact and missing by default', () => {
  assert.deepEqual(ids(fixture.rcCutoverEvidenceAcceptanceCases), RC_CUTOVER_EVIDENCE);

  for (const row of fixture.rcCutoverEvidenceAcceptanceCases) {
    assert.equal(row.required, true, row.id);
    assert.equal(row.currentStatus, 'missing', row.id);
    assert.equal(row.machineReadableRequired, true, row.id);
    assert.equal(row.syntheticOrSanitizedOnly, true, row.id);
    assert.equal(row.runtimeAuthority, false, row.id);
    assert.equal(row.readinessAuthority, false, row.id);
    assert.equal(row.cutoverAuthority, false, row.id);
    assert.equal(row.mustFailClosedWhenMissing, true, row.id);
  }
});

test('P66.57 RC cutover context acceptance cases are exact', () => {
  assert.deepEqual(fixture.rcCutoverContextAcceptanceCases, RC_CUTOVER_CONTEXT_CASES);
});

test('P66.57 execution readiness rules block RC cutover until explicit A5 authorization', () => {
  assert.equal(fixture.executionReadinessRules.required, true);
  assert.equal(
    fixture.executionReadinessRules.status,
    'blocked_pending_explicit_a5_rc_cutover_authorization'
  );
  assert.equal(fixture.executionReadinessRules.rcCutoverAllowed, false);
  assert.equal(fixture.executionReadinessRules.pushAllowed, false);
  assert.equal(fixture.executionReadinessRules.tagAllowed, false);
  assert.equal(fixture.executionReadinessRules.releaseAllowed, false);
  assert.equal(fixture.executionReadinessRules.deployAllowed, false);
  assert.equal(fixture.executionReadinessRules.gateMainlineStrictAllowed, false);
  assert.equal(fixture.executionReadinessRules.gateCiAllowed, false);
  assert.equal(fixture.executionReadinessRules.finalRcRunnerAllowed, false);
  assert.equal(fixture.executionReadinessRules.gitStateChangeAllowed, false);
  assert.equal(fixture.executionReadinessRules.configSwitchAllowed, false);
  assert.equal(fixture.executionReadinessRules.watchdogStartupOperationAllowed, false);
  assert.equal(fixture.executionReadinessRules.providerCallAllowed, false);
  assert.equal(fixture.executionReadinessRules.runtimeAuthority, false);
  assert.equal(fixture.executionReadinessRules.readinessAuthority, false);
  assert.equal(fixture.executionReadinessRules.cutoverAuthority, false);
  assert.equal(fixture.executionReadinessRules.mustFailClosedWhenEvidenceMissing, true);
  assert.equal(fixture.executionReadinessRules.mustFailClosedWhenRuntimeGapsRemain, true);
  assert.equal(fixture.executionReadinessRules.mustFailClosedWhenA5HardStopsRemain, true);
  assert.equal(fixture.executionReadinessRules.mustFailClosedWhenA5ApprovalMissing, true);
});

test('P66.57 fail-closed cases cover objective gaps hard stops release and readiness failures', () => {
  for (const failClosedCase of [
    'missing_rc_cutover_evidence',
    'duplicate_rc_cutover_evidence',
    'unknown_rc_cutover_evidence',
    'non_machine_readable_evidence',
    'unsupported_source_type',
    'denied_source_type',
    'missing_rc_cutover_context_case',
    'a5_rc_cutover_authorization_missing',
    'objective_incomplete',
    'remaining_runtime_gaps_nonzero',
    'a5_hard_stops_nonzero',
    'final_rc_matrix_not_ready',
    'v1_rc_not_ready',
    'release_target_unbound',
    'rollback_plan_missing',
    'report_not_bound_to_commit',
    'stale_report',
    'warning_only_report',
    'git_state_change_detected',
    'config_switch_requested',
    'provider_call_requested',
    'release_action_requested_without_authority',
    'push_requested',
    'tag_requested',
    'deploy_requested',
    'rc_ready_claim_without_authority'
  ]) {
    assert.ok(fixture.failClosedCases.includes(failClosedCase), failClosedCase);
  }
});

test('P66.57 disallowed work covers RC cutover gates runners git state config data durable MCP and release actions', () => {
  for (const disallowed of [
    'rc_cutover_execution',
    'rc_ready_claim',
    'push',
    'tag',
    'release',
    'deploy',
    'gate_mainline_strict_execution',
    'gate_ci_execution',
    'final_rc_runner_execution',
    'cutover_context_gate_execution',
    'command_execution',
    'runner_execution',
    'git_fetch',
    'git_merge',
    'git_rebase',
    'git_checkout',
    'git_reset',
    'git_detach_head',
    'config_switch',
    'config_mutation',
    'env_secret_edit',
    'provider_call',
    'real_memory_read',
    'real_memory_scan',
    'runtime_store_scan',
    'durable_memory_writer',
    'durable_audit_writer',
    'public_mcp_expansion',
    'validate_memory_public_exposure',
    'package_lockfile_change'
  ]) {
    assert.ok(fixture.disallowedWork.includes(disallowed), disallowed);
  }
});

test('P66.57 records all sixteen A5 hard stops', () => {
  assert.deepEqual(fixture.a5HardStops, A5_HARD_STOPS);
});

test('P66.57 accepted future local work remains docs fixture and test only', () => {
  assert.deepEqual(fixture.acceptedFutureLocalWork, [
    'docs',
    'fixture',
    'test'
  ]);

  for (const disallowed of [
    'pure_explicit_input_helper',
    'static_report_shape_bridge',
    'rc_cutover_execution',
    'final_rc_runner_execution',
    'push',
    'tag',
    'release',
    'deploy',
    'config_switch'
  ]) {
    assert.equal(fixture.acceptedFutureLocalWork.includes(disallowed), false, disallowed);
  }
});

test('P66.57 safety flags forbid execution RC cutover provider data config MCP package secret remote and release actions', () => {
  for (const [flag, value] of Object.entries(fixture.safety)) {
    assert.equal(value, flag === 'mutated' ? false : true, flag);
  }
});

test('P66.57 forbidden claims keep RC cutover and RC readiness blocked', () => {
  assert.ok(fixture.forbiddenClaims.includes('P66.57 executes RC cutover'));
  assert.ok(fixture.forbiddenClaims.includes('P66.57 claims RC_READY'));
  assert.ok(fixture.forbiddenClaims.includes('P66.57 pushes main'));
  assert.ok(fixture.forbiddenClaims.includes('P66.57 creates tag release or deploy'));
  assert.ok(fixture.forbiddenClaims.includes('P66.57 runs gate:mainline:strict'));
  assert.ok(fixture.forbiddenClaims.includes('P66.57 executes final RC runner'));
  assert.ok(fixture.forbiddenClaims.includes('P66.57 changes Git state'));
  assert.ok(fixture.forbiddenClaims.includes('P66.57 switches Codex or Claude config'));
  assert.ok(fixture.forbiddenClaims.includes('P66.57 makes rcCutoverExecuted true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.57 closes rc_cutover_not_executed'));
  assert.ok(fixture.forbiddenClaims.includes('P66.57 makes validationAggregatorFullImplementation true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.57 makes rcReady true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.57 makes cutoverReady true'));
});

test('P66.57 next phase remains local closeout and not helper bridge or RC cutover', () => {
  assert.equal(
    fixture.nextRecommendedPhase,
    'P66.58-validation-aggregator-rc-cutover-local-closeout'
  );
});

test('P66.57 fixture text does not expose raw secrets raw workspace ids URLs or absolute paths', () => {
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

test('P66.57 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
