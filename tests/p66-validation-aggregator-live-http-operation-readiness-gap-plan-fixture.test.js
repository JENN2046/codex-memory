const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p66-validation-aggregator-live-http-operation-readiness-gap-plan-v1.json'
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const SOURCE_EVIDENCE = [
  'p59_http_runtime_observability_operation_boundary',
  'p46_http_no_token_mutation_redaction_tests',
  'p54_runner_allowlisted_execution_adapter',
  'p62_a5_runtime_authorization_precondition_matrix',
  'p66_runtime_gap_plan'
];

const OBSERVABILITY_SURFACES = [
  'http_health_endpoint',
  'mcp_initialize',
  'tools_list_public_mcp_freeze',
  'http_observe_cli',
  'no_token_mutation_guard',
  'bearer_mutation_guard',
  'failure_reporting',
  'safe_start_preflight',
  'safe_shutdown_preflight'
];

const REQUIRED_RUNTIME_EVIDENCE = [
  'http_health_evidence',
  'mcp_initialize_evidence',
  'tools_list_public_mcp_freeze_evidence',
  'no_token_mutation_rejection_evidence',
  'bearer_token_mutation_guard_evidence',
  'failure_reporting_evidence',
  'redaction_evidence',
  'no_service_install_evidence',
  'no_config_switch_evidence',
  'no_provider_call_evidence',
  'safe_start_preflight_evidence',
  'safe_shutdown_preflight_evidence',
  'machine_readable_operation_report'
];

const BLOCKED_OPERATION_FAMILIES = [
  'http_service_start',
  'http_service_stop',
  'http_health_observation',
  'mcp_initialize_observation',
  'tools_list_observation',
  'observe_http_cli_execution',
  'watchdog_once',
  'watchdog_install',
  'startup_install',
  'config_switch',
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
  'runtime_observation_missing',
  'health_unavailable',
  'mcp_contract_unverified',
  'watchdog_unknown',
  'config_switch_unknown',
  'loopback_health_only',
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

test('P66.50 live HTTP readiness gap plan parses as planning-only and blocked', () => {
  assert.equal(fixture.schemaVersion, 'p66-validation-aggregator-live-http-operation-readiness-gap-plan-v1');
  assert.equal(
    fixture.policyVersion,
    'p66-validation-aggregator-live-http-operation-readiness-gap-plan-policy-v1'
  );
  assert.equal(
    fixture.manifestVersion,
    'p66-validation-aggregator-live-http-operation-readiness-gap-plan-manifest-v1'
  );
  assert.equal(fixture.phase, 'P66.50-validation-aggregator-live-http-operation-readiness-gap-planning');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.planningOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('P66.50 selects only the live HTTP operation readiness gap', () => {
  assert.equal(fixture.selectedGap.id, 'live_http_operation_readiness_not_claimed');
  assert.equal(fixture.selectedGap.priority, 5);
  assert.equal(fixture.selectedGap.currentStatus, 'open_live_start_blocked');
  assert.equal(fixture.selectedGap.requiresA5ApprovalBeforeRuntime, true);
  assert.equal(fixture.selectedGap.remainsOpenAfterThisPhase, true);
  assert.equal(fixture.selectedGap.readinessAuthority, false);
});

test('P66.50 keeps migration approval local proof complete while runtime gap remains open', () => {
  assert.equal(
    fixture.priorGapLocalProofReview.id,
    'migration_import_export_backup_restore_approval_execution_blocked'
  );
  assert.equal(fixture.priorGapLocalProofReview.localProofSlicesComplete, true);
  assert.equal(fixture.priorGapLocalProofReview.runtimeGapStillOpen, true);
  assert.equal(fixture.priorGapLocalProofReview.readinessAuthority, false);
});

test('P66.50 preserves public MCP freeze and internal validate_memory status', () => {
  assert.deepEqual(fixture.publicTools, [
    'record_memory',
    'search_memory',
    'memory_overview'
  ]);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.internalOnlyTools, ['validate_memory']);
});

test('P66.50 keeps HTTP operation and readiness false', () => {
  for (const field of [
    'validationAggregatorFullImplementation',
    'httpRuntimeObserved',
    'liveHttpOperationReadinessClaimed',
    'operationHardeningReady',
    'safeStartPreflightReady',
    'safeShutdownPreflightReady',
    'watchdogReady',
    'startupReady',
    'configSwitchReady',
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

test('P66.50 source evidence is exact and non-authoritative', () => {
  assert.deepEqual(ids(fixture.sourceEvidence), SOURCE_EVIDENCE);

  for (const source of fixture.sourceEvidence) {
    assert.equal(source.runtimeAuthority, false, source.id);
    assert.equal(source.readinessAuthority, false, source.id);
    assert.equal(source.operationAuthority, false, source.id);
    assert.equal(source.artifactRefs.length > 0, true, source.id);
  }
});

test('P66.50 observability surfaces are exact and unexecuted by implication', () => {
  assert.deepEqual(fixture.observabilitySurfaces, OBSERVABILITY_SURFACES);
});

test('P66.50 required runtime evidence is exact and fully unsatisfied', () => {
  assert.deepEqual(fixture.requiredRuntimeEvidence, REQUIRED_RUNTIME_EVIDENCE);
  assert.deepEqual(fixture.unsatisfiedRuntimeEvidence, REQUIRED_RUNTIME_EVIDENCE);
});

test('P66.50 blocked operation families are exact', () => {
  assert.deepEqual(fixture.blockedOperationFamilies, BLOCKED_OPERATION_FAMILIES);
});

test('P66.50 readiness states never authorize readiness', () => {
  assert.deepEqual(ids(fixture.readinessStates), READINESS_STATES);

  for (const state of fixture.readinessStates) {
    assert.equal(state.readinessAllowed, false, state.id);
  }

  for (const state of fixture.readinessStates.filter(state =>
    !['not_requested', 'loopback_health_only', 'reviewed_not_ready'].includes(state.id)
  )) {
    assert.equal(state.acceptedForPlanning, false, state.id);
  }
});

test('P66.50 accepted future local work excludes helpers runtime observation and startup actions', () => {
  assert.deepEqual(fixture.acceptedFutureLocalWork, [
    'docs',
    'fixture',
    'test'
  ]);

  for (const disallowed of [
    'pure_explicit_input_helper',
    'static_report_shape_bridge',
    'http_service_start',
    'observe_http_execution',
    'watchdog_install',
    'config_switch'
  ]) {
    assert.equal(fixture.acceptedFutureLocalWork.includes(disallowed), false, disallowed);
  }
});

test('P66.50 disallowed work covers service startup observation config data durable MCP and release actions', () => {
  for (const disallowed of [
    'http_service_start',
    'http_service_stop',
    'start_http_ensure',
    'start_http_watchdog_once',
    'start_http_watchdog_install',
    'startup_install',
    'watchdog_install',
    'observe_http_execution',
    'health_check_execution',
    'mcp_initialize_execution',
    'tools_list_execution',
    'config_switch',
    'env_secret_edit',
    'provider_call',
    'real_memory_read',
    'real_memory_scan',
    'runtime_store_scan',
    'durable_memory_writer',
    'durable_audit_writer',
    'public_mcp_expansion',
    'validate_memory_public_exposure',
    'command_execution',
    'gate_execution',
    'runner_execution',
    'push',
    'tag',
    'release',
    'deploy',
    'rc_ready_claim'
  ]) {
    assert.ok(fixture.disallowedWork.includes(disallowed), disallowed);
  }
});

test('P66.50 fail-closed cases cover missing evidence service requests config drift and readiness failures', () => {
  for (const failClosedCase of [
    'missing_source_evidence',
    'duplicate_source_evidence',
    'unknown_source_evidence',
    'source_claims_runtime_authority',
    'source_claims_readiness_authority',
    'missing_observability_surface',
    'duplicate_observability_surface',
    'unknown_observability_surface',
    'missing_runtime_evidence',
    'runtime_observation_missing',
    'health_unavailable',
    'mcp_initialize_missing',
    'tools_list_missing',
    'public_mcp_drift',
    'token_mutation_guard_missing',
    'redaction_uncertain',
    'safe_start_preflight_missing',
    'safe_shutdown_preflight_missing',
    'service_start_requested',
    'watchdog_install_requested',
    'startup_install_requested',
    'config_switch_requested',
    'provider_call_requested',
    'real_memory_scan_requested',
    'runtime_store_scan_requested',
    'durable_write_claim',
    'public_mcp_expansion_claim',
    'readiness_claim_without_authority'
  ]) {
    assert.ok(fixture.failClosedCases.includes(failClosedCase), failClosedCase);
  }
});

test('P66.50 records all sixteen A5 hard stops', () => {
  assert.deepEqual(fixture.a5HardStops, A5_HARD_STOPS);
});

test('P66.50 safety flags forbid HTTP operation provider data config MCP package secret remote and release actions', () => {
  for (const [flag, value] of Object.entries(fixture.safety)) {
    assert.equal(value, flag === 'mutated' ? false : true, flag);
  }
});

test('P66.50 forbidden claims keep HTTP runtime observation operation readiness and RC readiness blocked', () => {
  assert.ok(fixture.forbiddenClaims.includes('P66.50 starts HTTP MCP'));
  assert.ok(fixture.forbiddenClaims.includes('P66.50 observes live HTTP runtime'));
  assert.ok(fixture.forbiddenClaims.includes('P66.50 runs observe:http'));
  assert.ok(fixture.forbiddenClaims.includes('P66.50 installs watchdog or startup'));
  assert.ok(fixture.forbiddenClaims.includes('P66.50 switches Codex or Claude config'));
  assert.ok(fixture.forbiddenClaims.includes('P66.50 makes httpRuntimeObserved true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.50 closes live_http_operation_readiness_not_claimed'));
  assert.ok(fixture.forbiddenClaims.includes('P66.50 makes validationAggregatorFullImplementation true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.50 authorizes RC_READY'));
  assert.ok(fixture.forbiddenClaims.includes('P66.50 authorizes push tag release deploy'));
});

test('P66.50 fixture text does not expose raw secrets raw workspace ids URLs or absolute paths', () => {
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

test('P66.50 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
