const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p66-validation-aggregator-cutover-mainline-strict-gate-fixture-v1.json'
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const GATE_EVIDENCE = [
  'explicit_a5_cutover_gate_authorization',
  'target_commit_binding',
  'origin_main_freshness',
  'clean_worktree',
  'gate_command_contract',
  'strict_gate_execution_report',
  'strict_gate_json_report',
  'strict_gate_text_report',
  'failure_path_report',
  'no_git_state_change_report',
  'no_config_switch_report',
  'no_watchdog_startup_report',
  'no_provider_call_report',
  'no_release_action_report',
  'machine_readable_cutover_gate_report'
];

const GATE_CONTEXT_CASES = [
  'cutover_authorization_scope',
  'target_branch_main_bound',
  'origin_main_head_bound',
  'current_head_bound',
  'worktree_clean',
  'gate_exit_code_zero',
  'gate_output_machine_readable',
  'report_bound_to_commit',
  'stale_gate_rejected',
  'warning_only_rejected',
  'no_release_side_effects',
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

test('P66.54 cutover strict gate fixture locks top-level blocked posture', () => {
  assert.equal(fixture.schemaVersion, 'p66-validation-aggregator-cutover-mainline-strict-gate-fixture-v1');
  assert.equal(
    fixture.policyVersion,
    'p66-validation-aggregator-cutover-mainline-strict-gate-fixture-policy-v1'
  );
  assert.equal(
    fixture.manifestVersion,
    'p66-validation-aggregator-cutover-mainline-strict-gate-fixture-manifest-v1'
  );
  assert.equal(fixture.phase, 'P66.54-validation-aggregator-cutover-mainline-strict-gate-fixture-tests');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.acceptanceContractOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('P66.54 selects only the cutover mainline strict gate gap', () => {
  assert.equal(fixture.selectedGap.id, 'mainline_strict_gate_not_executed_for_cutover');
  assert.equal(fixture.selectedGap.priority, 6);
  assert.equal(fixture.selectedGap.currentStatus, 'open_cutover_gate_blocked');
  assert.equal(fixture.selectedGap.requiresA5ApprovalBeforeRuntime, true);
  assert.equal(fixture.selectedGap.remainsOpenAfterThisPhase, true);
  assert.equal(fixture.selectedGap.readinessAuthority, false);
});

test('P66.54 binds back to P66.53 without granting authority', () => {
  assert.equal(fixture.sourcePlan.phase, 'P66.53-validation-aggregator-cutover-mainline-strict-gate-gap-planning');
  assert.equal(
    fixture.sourcePlan.fixture,
    'tests/fixtures/p66-validation-aggregator-cutover-mainline-strict-gate-gap-plan-v1.json'
  );
  assert.equal(fixture.sourcePlan.runtimeAuthority, false);
  assert.equal(fixture.sourcePlan.readinessAuthority, false);
  assert.equal(fixture.sourcePlan.cutoverAuthority, false);
});

test('P66.54 preserves public MCP freeze and internal validate_memory status', () => {
  assert.deepEqual(fixture.publicTools, [
    'record_memory',
    'search_memory',
    'memory_overview',
    'audit_memory'
  ]);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.internalOnlyTools, ['validate_memory']);
});

test('P66.54 keeps cutover strict gate and readiness flags false', () => {
  for (const field of [
    'validationAggregatorFullImplementation',
    'mainlineStrictGateExecutedForCutover',
    'cutoverMainlineStrictGateReady',
    'cutoverContextAuthorized',
    'targetCommitBound',
    'originMainFresh',
    'cleanWorktreeVerified',
    'gateCommandContractReady',
    'strictGateReportReady',
    'failurePathReady',
    'gitStateMutationFree',
    'configSwitchReady',
    'watchdogReady',
    'startupReady',
    'providerValidationReady',
    'realMemoryScanned',
    'runtimeStoreScanned',
    'durableMemoryWritten',
    'durableAuditWritten',
    'runtimeReady',
    'finalRcMatrixReady',
    'v1RcReady',
    'rcReady',
    'cutoverReady'
  ]) {
    assert.equal(fixture[field], false, field);
  }
});

test('P66.54 source boundaries allow only synthetic or sanitized committed references', () => {
  assert.deepEqual(fixture.allowedSourceTypes, ALLOWED_SOURCE_TYPES);
  assert.deepEqual(fixture.deniedSourceTypes, DENIED_SOURCE_TYPES);
});

test('P66.54 gate evidence acceptance cases are exact and missing by default', () => {
  assert.deepEqual(ids(fixture.gateEvidenceAcceptanceCases), GATE_EVIDENCE);

  for (const row of fixture.gateEvidenceAcceptanceCases) {
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

test('P66.54 gate context acceptance cases are exact', () => {
  assert.deepEqual(fixture.gateContextAcceptanceCases, GATE_CONTEXT_CASES);
});

test('P66.54 execution readiness rules block gate execution until explicit A5 authorization', () => {
  assert.equal(fixture.executionReadinessRules.required, true);
  assert.equal(
    fixture.executionReadinessRules.status,
    'blocked_pending_explicit_a5_cutover_gate_authorization'
  );
  assert.equal(fixture.executionReadinessRules.gateMainlineStrictAllowed, false);
  assert.equal(fixture.executionReadinessRules.gateCiAllowed, false);
  assert.equal(fixture.executionReadinessRules.finalRcRunnerAllowed, false);
  assert.equal(fixture.executionReadinessRules.gitStateChangeAllowed, false);
  assert.equal(fixture.executionReadinessRules.configSwitchAllowed, false);
  assert.equal(fixture.executionReadinessRules.watchdogStartupOperationAllowed, false);
  assert.equal(fixture.executionReadinessRules.providerCallAllowed, false);
  assert.equal(fixture.executionReadinessRules.releaseActionAllowed, false);
  assert.equal(fixture.executionReadinessRules.runtimeAuthority, false);
  assert.equal(fixture.executionReadinessRules.readinessAuthority, false);
  assert.equal(fixture.executionReadinessRules.cutoverAuthority, false);
  assert.equal(fixture.executionReadinessRules.mustFailClosedWhenEvidenceMissing, true);
  assert.equal(fixture.executionReadinessRules.mustFailClosedWhenOnlyLocalGateExists, true);
  assert.equal(fixture.executionReadinessRules.mustFailClosedWhenA5ApprovalMissing, true);
});

test('P66.54 fail-closed cases cover gate evidence context git config release and readiness failures', () => {
  for (const failClosedCase of [
    'missing_gate_evidence',
    'duplicate_gate_evidence',
    'unknown_gate_evidence',
    'non_machine_readable_evidence',
    'unsupported_source_type',
    'denied_source_type',
    'missing_gate_context_case',
    'a5_cutover_gate_authorization_missing',
    'target_commit_unbound',
    'target_commit_mismatch',
    'origin_main_freshness_unknown',
    'worktree_unclean',
    'gate_command_contract_missing',
    'strict_gate_not_executed',
    'strict_gate_failed',
    'strict_gate_stale',
    'strict_gate_warning_only',
    'strict_gate_not_cutover_context',
    'strict_gate_report_missing',
    'failure_path_missing',
    'git_state_change_detected',
    'config_switch_requested',
    'watchdog_install_requested',
    'startup_install_requested',
    'provider_call_requested',
    'release_action_requested',
    'real_memory_scan_requested',
    'runtime_store_scan_requested',
    'durable_write_claim',
    'public_mcp_expansion_claim',
    'cutover_readiness_claim_without_authority',
    'readiness_claim_without_authority'
  ]) {
    assert.ok(fixture.failClosedCases.includes(failClosedCase), failClosedCase);
  }
});

test('P66.54 disallowed work covers gates runners git state config data durable MCP and release actions', () => {
  for (const disallowed of [
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
    'watchdog_install',
    'startup_install',
    'provider_call',
    'real_memory_read',
    'real_memory_scan',
    'runtime_store_scan',
    'durable_memory_writer',
    'durable_audit_writer',
    'public_mcp_expansion',
    'validate_memory_public_exposure',
    'push',
    'tag',
    'release',
    'deploy',
    'cutover',
    'rc_ready_claim'
  ]) {
    assert.ok(fixture.disallowedWork.includes(disallowed), disallowed);
  }
});

test('P66.54 records all sixteen A5 hard stops', () => {
  assert.deepEqual(fixture.a5HardStops, A5_HARD_STOPS);
});

test('P66.54 accepted future local work remains docs fixture and test only', () => {
  assert.deepEqual(fixture.acceptedFutureLocalWork, [
    'docs',
    'fixture',
    'test'
  ]);

  for (const disallowed of [
    'pure_explicit_input_helper',
    'static_report_shape_bridge',
    'gate_mainline_strict_execution',
    'final_rc_runner_execution',
    'git_fetch',
    'git_checkout',
    'config_switch'
  ]) {
    assert.equal(fixture.acceptedFutureLocalWork.includes(disallowed), false, disallowed);
  }
});

test('P66.54 safety flags forbid execution git state provider data config MCP package secret remote and cutover actions', () => {
  for (const [flag, value] of Object.entries(fixture.safety)) {
    assert.equal(value, flag === 'mutated' ? false : true, flag);
  }
});

test('P66.54 forbidden claims keep cutover gate execution and RC readiness blocked', () => {
  assert.ok(fixture.forbiddenClaims.includes('P66.54 runs gate:mainline:strict'));
  assert.ok(fixture.forbiddenClaims.includes('P66.54 runs gate:ci'));
  assert.ok(fixture.forbiddenClaims.includes('P66.54 executes final RC runner'));
  assert.ok(fixture.forbiddenClaims.includes('P66.54 executes cutover-context gate'));
  assert.ok(fixture.forbiddenClaims.includes('P66.54 changes Git state'));
  assert.ok(fixture.forbiddenClaims.includes('P66.54 switches Codex or Claude config'));
  assert.ok(fixture.forbiddenClaims.includes('P66.54 makes mainlineStrictGateExecutedForCutover true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.54 closes mainline_strict_gate_not_executed_for_cutover'));
  assert.ok(fixture.forbiddenClaims.includes('P66.54 makes validationAggregatorFullImplementation true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.54 authorizes RC_READY'));
  assert.ok(fixture.forbiddenClaims.includes('P66.54 authorizes push tag release deploy'));
});

test('P66.54 next phase remains local closeout and not helper bridge or gate execution', () => {
  assert.equal(
    fixture.nextRecommendedPhase,
    'P66.55-validation-aggregator-cutover-mainline-strict-gate-local-closeout'
  );
});

test('P66.54 fixture text does not expose raw secrets raw workspace ids URLs or absolute paths', () => {
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

test('P66.54 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
