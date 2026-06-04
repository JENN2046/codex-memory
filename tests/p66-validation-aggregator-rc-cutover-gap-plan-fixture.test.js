const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p66-validation-aggregator-rc-cutover-gap-plan-v1.json'
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const SOURCE_EVIDENCE = [
  'p61_mainline_strict_gate_rc_evidence_report_boundary',
  'p62_v1_rc_cutover_preflight_boundary',
  'p63_final_rc_runtime_evidence_bridge',
  'p64_runtime_schema_version_write_boundary_evidence',
  'p66_runtime_gap_plan',
  'p66_cutover_mainline_strict_gate_local_closeout'
];

const REQUIRED_RUNTIME_EVIDENCE = [
  'explicit_a5_rc_cutover_authorization',
  'objective_complete_evidence',
  'zero_remaining_runtime_gaps_evidence',
  'zero_a5_hard_stops_evidence',
  'final_rc_matrix_ready_evidence',
  'v1_rc_ready_evidence',
  'cutover_mainline_strict_gate_ready_evidence',
  'live_http_operation_readiness_evidence',
  'governance_runtime_loop_ready_evidence',
  'recall_isolation_runtime_proof_ready_evidence',
  'migration_approval_execution_ready_evidence',
  'release_target_binding_evidence',
  'rollback_plan_evidence',
  'no_config_switch_evidence',
  'no_watchdog_startup_evidence',
  'no_provider_call_evidence',
  'machine_readable_rc_cutover_report'
];

const BLOCKED_OPERATION_FAMILIES = [
  'rc_cutover_execution',
  'rc_ready_claim',
  'push',
  'tag',
  'release',
  'deploy',
  'gate_mainline_strict_execution',
  'gate_ci_execution',
  'final_rc_runner_execution',
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
  'public_mcp_expansion'
];

const READINESS_STATES = [
  'not_requested',
  'a5_rc_cutover_authorization_missing',
  'objective_incomplete',
  'runtime_gaps_remaining',
  'a5_hard_stops_remaining',
  'final_rc_matrix_not_ready',
  'v1_rc_not_ready',
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

test('P66.56 RC cutover gap plan parses as planning-only and blocked', () => {
  assert.equal(fixture.schemaVersion, 'p66-validation-aggregator-rc-cutover-gap-plan-v1');
  assert.equal(fixture.policyVersion, 'p66-validation-aggregator-rc-cutover-gap-plan-policy-v1');
  assert.equal(fixture.manifestVersion, 'p66-validation-aggregator-rc-cutover-gap-plan-manifest-v1');
  assert.equal(fixture.phase, 'P66.56-validation-aggregator-rc-cutover-gap-planning');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.planningOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('P66.56 selects only the RC cutover gap', () => {
  assert.equal(fixture.selectedGap.id, 'rc_cutover_not_executed');
  assert.equal(fixture.selectedGap.priority, 7);
  assert.equal(fixture.selectedGap.currentStatus, 'a5_blocked');
  assert.equal(fixture.selectedGap.requiresA5ApprovalBeforeRuntime, true);
  assert.equal(fixture.selectedGap.remainsOpenAfterThisPhase, true);
  assert.equal(fixture.selectedGap.readinessAuthority, false);
});

test('P66.56 keeps cutover strict gate local proof complete while runtime gap remains open', () => {
  assert.equal(fixture.priorGapLocalProofReview.id, 'mainline_strict_gate_not_executed_for_cutover');
  assert.equal(fixture.priorGapLocalProofReview.localProofSlicesComplete, true);
  assert.equal(fixture.priorGapLocalProofReview.runtimeGapStillOpen, true);
  assert.equal(fixture.priorGapLocalProofReview.readinessAuthority, false);
});

test('P66.56 preserves public MCP freeze and internal validate_memory status', () => {
  assert.deepEqual(fixture.publicTools, [
    'record_memory',
    'search_memory',
    'memory_overview',
    'audit_memory'
  ]);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.internalOnlyTools, ['validate_memory']);
});

test('P66.56 keeps RC cutover and readiness false', () => {
  for (const field of [
    'validationAggregatorFullImplementation',
    'rcCutoverExecuted',
    'rcCutoverAuthorized',
    'releaseActionReady',
    'pushReady',
    'tagReady',
    'deployReady',
    'mainlineStrictGateExecutedForCutover',
    'cutoverMainlineStrictGateReady',
    'liveHttpOperationReadinessClaimed',
    'governanceRuntimeLoopReady',
    'recallIsolationRuntimeProofReady',
    'migrationApprovalExecutionReady',
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

test('P66.56 source evidence is exact and non-authoritative', () => {
  assert.deepEqual(ids(fixture.sourceEvidence), SOURCE_EVIDENCE);

  for (const source of fixture.sourceEvidence) {
    assert.equal(source.runtimeAuthority, false, source.id);
    assert.equal(source.readinessAuthority, false, source.id);
    assert.equal(source.cutoverAuthority, false, source.id);
    assert.equal(source.artifactRefs.length > 0, true, source.id);
  }
});

test('P66.56 required runtime evidence is exact and fully unsatisfied', () => {
  assert.deepEqual(fixture.requiredRuntimeEvidence, REQUIRED_RUNTIME_EVIDENCE);
  assert.deepEqual(fixture.unsatisfiedRuntimeEvidence, REQUIRED_RUNTIME_EVIDENCE);
});

test('P66.56 blocked operation families are exact', () => {
  assert.deepEqual(fixture.blockedOperationFamilies, BLOCKED_OPERATION_FAMILIES);
});

test('P66.56 readiness states never authorize readiness', () => {
  assert.deepEqual(ids(fixture.readinessStates), READINESS_STATES);

  for (const state of fixture.readinessStates) {
    assert.equal(state.readinessAllowed, false, state.id);
  }

  for (const state of fixture.readinessStates.filter(state =>
    !['not_requested', 'reviewed_not_ready'].includes(state.id)
  )) {
    assert.equal(state.acceptedForPlanning, false, state.id);
  }
});

test('P66.56 accepted future local work excludes helper bridge cutover execution and release actions', () => {
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

test('P66.56 disallowed work covers RC cutover gates runners git config data durable MCP and release actions', () => {
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
    'package_lockfile_change'
  ]) {
    assert.ok(fixture.disallowedWork.includes(disallowed), disallowed);
  }
});

test('P66.56 fail-closed cases cover objective runtime gaps hard stops readiness cutover and release failures', () => {
  for (const failClosedCase of [
    'missing_source_evidence',
    'duplicate_source_evidence',
    'unknown_source_evidence',
    'source_claims_cutover_authority',
    'missing_runtime_evidence',
    'a5_rc_cutover_authorization_missing',
    'objective_incomplete',
    'runtime_gaps_remaining',
    'a5_hard_stops_remaining',
    'final_rc_matrix_not_ready',
    'v1_rc_not_ready',
    'cutover_mainline_strict_gate_not_ready',
    'live_http_operation_not_ready',
    'governance_runtime_loop_not_ready',
    'recall_isolation_runtime_proof_not_ready',
    'migration_approval_execution_not_ready',
    'release_target_unbound',
    'rollback_plan_missing',
    'config_switch_requested',
    'watchdog_install_requested',
    'startup_install_requested',
    'provider_call_requested',
    'real_memory_scan_requested',
    'runtime_store_scan_requested',
    'durable_write_claim',
    'public_mcp_expansion_claim',
    'push_requested',
    'tag_requested',
    'release_requested',
    'deploy_requested',
    'rc_ready_claim_without_authority'
  ]) {
    assert.ok(fixture.failClosedCases.includes(failClosedCase), failClosedCase);
  }
});

test('P66.56 records all sixteen A5 hard stops', () => {
  assert.deepEqual(fixture.a5HardStops, A5_HARD_STOPS);
});

test('P66.56 safety flags forbid execution RC cutover provider data config MCP package secret remote and release actions', () => {
  for (const [flag, value] of Object.entries(fixture.safety)) {
    assert.equal(value, flag === 'mutated' ? false : true, flag);
  }
});

test('P66.56 forbidden claims keep RC cutover and RC readiness blocked', () => {
  assert.ok(fixture.forbiddenClaims.includes('P66.56 executes RC cutover'));
  assert.ok(fixture.forbiddenClaims.includes('P66.56 claims RC_READY'));
  assert.ok(fixture.forbiddenClaims.includes('P66.56 pushes main'));
  assert.ok(fixture.forbiddenClaims.includes('P66.56 creates tag release or deploy'));
  assert.ok(fixture.forbiddenClaims.includes('P66.56 runs gate:mainline:strict'));
  assert.ok(fixture.forbiddenClaims.includes('P66.56 executes final RC runner'));
  assert.ok(fixture.forbiddenClaims.includes('P66.56 changes Git state'));
  assert.ok(fixture.forbiddenClaims.includes('P66.56 switches Codex or Claude config'));
  assert.ok(fixture.forbiddenClaims.includes('P66.56 makes rcCutoverExecuted true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.56 closes rc_cutover_not_executed'));
  assert.ok(fixture.forbiddenClaims.includes('P66.56 makes validationAggregatorFullImplementation true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.56 makes rcReady true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.56 makes cutoverReady true'));
});

test('P66.56 fixture text does not expose raw secrets raw workspace ids URLs or absolute paths', () => {
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

test('P66.56 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});

test('P66.56 next phase remains local fixture tests and not helper bridge or RC cutover', () => {
  assert.equal(
    fixture.nextRecommendedPhase,
    'P66.57-validation-aggregator-rc-cutover-fixture-tests'
  );
});
