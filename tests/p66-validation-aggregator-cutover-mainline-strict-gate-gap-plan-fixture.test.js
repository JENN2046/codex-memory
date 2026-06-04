const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p66-validation-aggregator-cutover-mainline-strict-gate-gap-plan-v1.json'
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const SOURCE_EVIDENCE = [
  'p61_mainline_strict_gate_rc_evidence_report_boundary',
  'p62_v1_rc_cutover_preflight_boundary',
  'p63_final_rc_runtime_evidence_bridge',
  'p64_runtime_schema_version_write_boundary_evidence',
  'p66_runtime_gap_plan',
  'p66_live_http_operation_readiness_local_closeout'
];

const REQUIRED_RUNTIME_EVIDENCE = [
  'explicit_a5_cutover_gate_authorization',
  'target_commit_binding_evidence',
  'origin_main_freshness_evidence',
  'clean_worktree_evidence',
  'mainline_strict_gate_cutover_context_execution_evidence',
  'strict_gate_json_report',
  'strict_gate_text_report',
  'failure_path_report',
  'no_config_switch_evidence',
  'no_watchdog_startup_evidence',
  'no_provider_call_evidence',
  'no_release_action_evidence',
  'machine_readable_cutover_gate_report'
];

const BLOCKED_OPERATION_FAMILIES = [
  'gate_mainline_strict_execution',
  'gate_ci_execution',
  'final_rc_runner_execution',
  'cutover_context_gate_execution',
  'git_fetch_merge_rebase',
  'git_checkout_reset_detach',
  'config_switch',
  'watchdog_install',
  'startup_install',
  'provider_call',
  'real_memory_read',
  'runtime_store_scan',
  'durable_memory_write',
  'durable_audit_write',
  'public_mcp_expansion',
  'remote_release_action'
];

const READINESS_STATES = [
  'not_requested',
  'a5_cutover_gate_authorization_missing',
  'target_commit_unbound',
  'origin_main_freshness_unknown',
  'worktree_unclean',
  'strict_gate_not_executed',
  'local_gate_not_cutover_context',
  'reviewed_not_ready'
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

test('P66.53 cutover strict gate gap plan parses as planning-only and blocked', () => {
  assert.equal(fixture.schemaVersion, 'p66-validation-aggregator-cutover-mainline-strict-gate-gap-plan-v1');
  assert.equal(
    fixture.policyVersion,
    'p66-validation-aggregator-cutover-mainline-strict-gate-gap-plan-policy-v1'
  );
  assert.equal(
    fixture.manifestVersion,
    'p66-validation-aggregator-cutover-mainline-strict-gate-gap-plan-manifest-v1'
  );
  assert.equal(fixture.phase, 'P66.53-validation-aggregator-cutover-mainline-strict-gate-gap-planning');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.planningOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('P66.53 selects only the cutover mainline strict gate gap', () => {
  assert.equal(fixture.selectedGap.id, 'mainline_strict_gate_not_executed_for_cutover');
  assert.equal(fixture.selectedGap.priority, 6);
  assert.equal(fixture.selectedGap.currentStatus, 'open_cutover_gate_blocked');
  assert.equal(fixture.selectedGap.requiresA5ApprovalBeforeRuntime, true);
  assert.equal(fixture.selectedGap.remainsOpenAfterThisPhase, true);
  assert.equal(fixture.selectedGap.readinessAuthority, false);
});

test('P66.53 keeps live HTTP local proof complete while runtime gap remains open', () => {
  assert.equal(fixture.priorGapLocalProofReview.id, 'live_http_operation_readiness_not_claimed');
  assert.equal(fixture.priorGapLocalProofReview.localProofSlicesComplete, true);
  assert.equal(fixture.priorGapLocalProofReview.runtimeGapStillOpen, true);
  assert.equal(fixture.priorGapLocalProofReview.readinessAuthority, false);
});

test('P66.53 preserves public MCP freeze and internal validate_memory status', () => {
  assert.deepEqual(fixture.publicTools, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.internalOnlyTools, ['validate_memory']);
});

test('P66.53 keeps cutover strict gate and readiness false', () => {
  for (const field of [
    'validationAggregatorFullImplementation',
    'mainlineStrictGateExecutedForCutover',
    'cutoverMainlineStrictGateReady',
    'cutoverContextAuthorized',
    'targetCommitBound',
    'originMainFresh',
    'cleanWorktreeVerified',
    'strictGateReportReady',
    'failurePathReady',
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

test('P66.53 source evidence is exact and non-authoritative', () => {
  assert.deepEqual(ids(fixture.sourceEvidence), SOURCE_EVIDENCE);

  for (const source of fixture.sourceEvidence) {
    assert.equal(source.runtimeAuthority, false, source.id);
    assert.equal(source.readinessAuthority, false, source.id);
    assert.equal(source.cutoverAuthority, false, source.id);
    assert.equal(source.artifactRefs.length > 0, true, source.id);
  }
});

test('P66.53 required runtime evidence is exact and fully unsatisfied', () => {
  assert.deepEqual(fixture.requiredRuntimeEvidence, REQUIRED_RUNTIME_EVIDENCE);
  assert.deepEqual(fixture.unsatisfiedRuntimeEvidence, REQUIRED_RUNTIME_EVIDENCE);
});

test('P66.53 blocked operation families are exact', () => {
  assert.deepEqual(fixture.blockedOperationFamilies, BLOCKED_OPERATION_FAMILIES);
});

test('P66.53 readiness states never authorize readiness', () => {
  assert.deepEqual(ids(fixture.readinessStates), READINESS_STATES);

  for (const state of fixture.readinessStates) {
    assert.equal(state.readinessAllowed, false, state.id);
  }

  for (const state of fixture.readinessStates.filter(state =>
    !['not_requested', 'local_gate_not_cutover_context', 'reviewed_not_ready'].includes(state.id)
  )) {
    assert.equal(state.acceptedForPlanning, false, state.id);
  }
});

test('P66.53 accepted future local work excludes helper bridge gate execution and git state changes', () => {
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

test('P66.53 disallowed work covers gates runners git state config data durable MCP and release actions', () => {
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

test('P66.53 fail-closed cases cover evidence gate freshness git config and readiness failures', () => {
  for (const failClosedCase of [
    'missing_source_evidence',
    'duplicate_source_evidence',
    'unknown_source_evidence',
    'source_claims_cutover_authority',
    'missing_runtime_evidence',
    'a5_cutover_gate_authorization_missing',
    'target_commit_unbound',
    'target_commit_mismatch',
    'origin_main_freshness_unknown',
    'worktree_unclean',
    'strict_gate_not_executed',
    'strict_gate_failed',
    'strict_gate_stale',
    'strict_gate_warning_only',
    'strict_gate_not_cutover_context',
    'strict_gate_report_missing',
    'failure_path_missing',
    'config_switch_requested',
    'watchdog_install_requested',
    'startup_install_requested',
    'provider_call_requested',
    'real_memory_scan_requested',
    'runtime_store_scan_requested',
    'durable_write_claim',
    'public_mcp_expansion_claim',
    'release_action_requested',
    'readiness_claim_without_authority'
  ]) {
    assert.ok(fixture.failClosedCases.includes(failClosedCase), failClosedCase);
  }
});

test('P66.53 records all sixteen A5 hard stops', () => {
  assert.deepEqual(fixture.a5HardStops, A5_HARD_STOPS);
});

test('P66.53 safety flags forbid execution git state provider data config MCP package secret remote and cutover actions', () => {
  for (const [flag, value] of Object.entries(fixture.safety)) {
    assert.equal(value, flag === 'mutated' ? false : true, flag);
  }
});

test('P66.53 forbidden claims keep cutover gate execution and RC readiness blocked', () => {
  assert.ok(fixture.forbiddenClaims.includes('P66.53 runs gate:mainline:strict'));
  assert.ok(fixture.forbiddenClaims.includes('P66.53 runs gate:ci'));
  assert.ok(fixture.forbiddenClaims.includes('P66.53 executes final RC runner'));
  assert.ok(fixture.forbiddenClaims.includes('P66.53 executes cutover-context gate'));
  assert.ok(fixture.forbiddenClaims.includes('P66.53 changes Git state'));
  assert.ok(fixture.forbiddenClaims.includes('P66.53 switches Codex or Claude config'));
  assert.ok(fixture.forbiddenClaims.includes('P66.53 makes mainlineStrictGateExecutedForCutover true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.53 closes mainline_strict_gate_not_executed_for_cutover'));
  assert.ok(fixture.forbiddenClaims.includes('P66.53 makes validationAggregatorFullImplementation true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.53 authorizes RC_READY'));
  assert.ok(fixture.forbiddenClaims.includes('P66.53 authorizes push tag release deploy'));
});

test('P66.53 fixture text does not expose raw secrets raw workspace ids URLs or absolute paths', () => {
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

test('P66.53 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});

test('P66.53 next phase remains local fixture tests and not helper bridge or gate execution', () => {
  assert.equal(
    fixture.nextRecommendedPhase,
    'P66.54-validation-aggregator-cutover-mainline-strict-gate-fixture-tests'
  );
});
