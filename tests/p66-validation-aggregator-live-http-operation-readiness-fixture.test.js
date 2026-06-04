const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p66-validation-aggregator-live-http-operation-readiness-fixture-v1.json'
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const OPERATION_EVIDENCE = [
  'http_health_probe',
  'mcp_initialize_probe',
  'tools_list_public_mcp_freeze_probe',
  'http_observe_cli_report',
  'no_token_mutation_rejection_probe',
  'bearer_token_mutation_guard_probe',
  'failure_reporting_probe',
  'sensitive_fragment_redaction_probe',
  'no_service_install_report',
  'no_config_switch_report',
  'no_provider_call_report',
  'safe_start_preflight_report',
  'safe_shutdown_preflight_report',
  'machine_readable_operation_report'
];

const HTTP_CONTRACT_CASES = [
  'loopback_scope_bound',
  'timeout_bound',
  'exit_code_semantics',
  'public_tools_exact',
  'internal_validate_memory_absent',
  'error_envelope_shape',
  'redaction_verified',
  'token_mutation_denied',
  'no_config_write',
  'no_watchdog_startup_install',
  'no_provider_call',
  'report_bound_to_commit'
];

const ALLOWED_SOURCE_TYPES = [
  'synthetic_fixture',
  'sanitized_metadata',
  'committed_fixture_reference'
];

const DENIED_SOURCE_TYPES = [
  'raw_http_response_body',
  'raw_http_headers',
  'bearer_token',
  'cookie_header',
  'authorization_header',
  'raw_auth_error',
  'real_memory_content',
  'real_diary',
  'real_sqlite',
  'real_vector_index',
  'real_candidate_cache',
  'real_recall_audit',
  'provider_output',
  'runtime_store_output',
  'service_install_output',
  'config_mutation_output',
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

test('P66.51 live HTTP readiness fixture locks top-level blocked posture', () => {
  assert.equal(fixture.schemaVersion, 'p66-validation-aggregator-live-http-operation-readiness-fixture-v1');
  assert.equal(
    fixture.policyVersion,
    'p66-validation-aggregator-live-http-operation-readiness-fixture-policy-v1'
  );
  assert.equal(
    fixture.manifestVersion,
    'p66-validation-aggregator-live-http-operation-readiness-fixture-manifest-v1'
  );
  assert.equal(fixture.phase, 'P66.51-validation-aggregator-live-http-operation-readiness-fixture-tests');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.acceptanceContractOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('P66.51 selects only the live HTTP operation readiness gap', () => {
  assert.equal(fixture.selectedGap.id, 'live_http_operation_readiness_not_claimed');
  assert.equal(fixture.selectedGap.priority, 5);
  assert.equal(fixture.selectedGap.currentStatus, 'open_live_start_blocked');
  assert.equal(fixture.selectedGap.requiresA5ApprovalBeforeRuntime, true);
  assert.equal(fixture.selectedGap.remainsOpenAfterThisPhase, true);
  assert.equal(fixture.selectedGap.readinessAuthority, false);
});

test('P66.51 binds back to P66.50 without granting authority', () => {
  assert.equal(fixture.sourcePlan.phase, 'P66.50-validation-aggregator-live-http-operation-readiness-gap-planning');
  assert.equal(
    fixture.sourcePlan.fixture,
    'tests/fixtures/p66-validation-aggregator-live-http-operation-readiness-gap-plan-v1.json'
  );
  assert.equal(fixture.sourcePlan.runtimeAuthority, false);
  assert.equal(fixture.sourcePlan.readinessAuthority, false);
  assert.equal(fixture.sourcePlan.operationAuthority, false);
});

test('P66.51 preserves public MCP freeze and internal validate_memory status', () => {
  assert.deepEqual(fixture.publicTools, [
    'record_memory',
    'search_memory',
    'memory_overview',
    'audit_memory'
  ]);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.internalOnlyTools, ['validate_memory']);
});

test('P66.51 keeps HTTP operation and readiness flags false', () => {
  for (const field of [
    'validationAggregatorFullImplementation',
    'httpRuntimeObserved',
    'liveHttpOperationReadinessClaimed',
    'httpHealthReady',
    'mcpInitializeReady',
    'toolsListReady',
    'publicMcpFreezeVerified',
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

test('P66.51 source boundaries allow only synthetic or sanitized committed references', () => {
  assert.deepEqual(fixture.allowedSourceTypes, ALLOWED_SOURCE_TYPES);
  assert.deepEqual(fixture.deniedSourceTypes, DENIED_SOURCE_TYPES);
});

test('P66.51 operation evidence acceptance cases are exact and missing by default', () => {
  assert.deepEqual(ids(fixture.operationEvidenceAcceptanceCases), OPERATION_EVIDENCE);

  for (const row of fixture.operationEvidenceAcceptanceCases) {
    assert.equal(row.required, true, row.id);
    assert.equal(row.currentStatus, 'missing', row.id);
    assert.equal(row.machineReadableRequired, true, row.id);
    assert.equal(row.syntheticOrSanitizedOnly, true, row.id);
    assert.equal(row.runtimeAuthority, false, row.id);
    assert.equal(row.readinessAuthority, false, row.id);
    assert.equal(row.mustFailClosedWhenMissing, true, row.id);
  }
});

test('P66.51 HTTP contract cases are exact and not executed by this phase', () => {
  assert.deepEqual(ids(fixture.httpContractAcceptanceCases), HTTP_CONTRACT_CASES);

  for (const row of fixture.httpContractAcceptanceCases) {
    assert.equal(row.required, true, row.id);
    assert.equal(row.currentStatus, 'not_verified', row.id);
    assert.equal(row.executionAllowedThisPhase, false, row.id);
    assert.equal(row.mustFailClosedWhenMissing, true, row.id);
  }
});

test('P66.51 operation readiness rules block live execution until explicit A5 authorization', () => {
  assert.equal(fixture.operationReadinessRules.required, true);
  assert.equal(
    fixture.operationReadinessRules.status,
    'blocked_pending_explicit_a5_runtime_authorization'
  );
  assert.equal(fixture.operationReadinessRules.liveServiceStartAllowed, false);
  assert.equal(fixture.operationReadinessRules.liveServiceStopAllowed, false);
  assert.equal(fixture.operationReadinessRules.observeHttpAllowed, false);
  assert.equal(fixture.operationReadinessRules.healthProbeAllowed, false);
  assert.equal(fixture.operationReadinessRules.mcpInitializeAllowed, false);
  assert.equal(fixture.operationReadinessRules.toolsListAllowed, false);
  assert.equal(fixture.operationReadinessRules.watchdogStartupOperationAllowed, false);
  assert.equal(fixture.operationReadinessRules.configSwitchAllowed, false);
  assert.equal(fixture.operationReadinessRules.providerCallAllowed, false);
  assert.equal(fixture.operationReadinessRules.runtimeAuthority, false);
  assert.equal(fixture.operationReadinessRules.readinessAuthority, false);
  assert.equal(fixture.operationReadinessRules.mustFailClosedWhenEvidenceMissing, true);
  assert.equal(fixture.operationReadinessRules.mustFailClosedWhenOnlyLoopbackHealthExists, true);
  assert.equal(fixture.operationReadinessRules.mustFailClosedWhenA5ApprovalMissing, true);
});

test('P66.51 fail-closed cases cover evidence source HTTP contract operation and readiness failures', () => {
  for (const failClosedCase of [
    'missing_operation_evidence',
    'duplicate_operation_evidence',
    'unknown_operation_evidence',
    'non_machine_readable_evidence',
    'unsupported_source_type',
    'denied_source_type',
    'raw_http_body_present',
    'raw_http_headers_present',
    'authorization_header_present',
    'bearer_token_present',
    'cookie_present',
    'missing_http_contract_case',
    'loopback_scope_unbound',
    'timeout_unbounded',
    'exit_code_semantics_missing',
    'public_tools_drift',
    'validate_memory_publicly_exposed',
    'redaction_missing',
    'token_mutation_allowed',
    'service_start_requested',
    'observe_http_requested',
    'health_probe_requested',
    'mcp_initialize_requested',
    'tools_list_requested',
    'watchdog_install_requested',
    'startup_install_requested',
    'config_switch_requested',
    'provider_call_requested',
    'real_memory_scan_requested',
    'runtime_store_scan_requested',
    'durable_write_claim',
    'public_mcp_expansion_claim',
    'loopback_health_only_readiness_claim',
    'readiness_claim_without_authority'
  ]) {
    assert.ok(fixture.failClosedCases.includes(failClosedCase), failClosedCase);
  }
});

test('P66.51 disallowed work covers HTTP execution config provider data durable MCP and release actions', () => {
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

test('P66.51 records all sixteen A5 hard stops', () => {
  assert.deepEqual(fixture.a5HardStops, A5_HARD_STOPS);
});

test('P66.51 accepted future local work remains docs fixture and test only', () => {
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

test('P66.51 safety flags forbid HTTP operation provider data config MCP package secret remote and release actions', () => {
  for (const [flag, value] of Object.entries(fixture.safety)) {
    assert.equal(value, flag === 'mutated' ? false : true, flag);
  }
});

test('P66.51 forbidden claims keep HTTP runtime observation operation readiness and RC readiness blocked', () => {
  assert.ok(fixture.forbiddenClaims.includes('P66.51 starts HTTP MCP'));
  assert.ok(fixture.forbiddenClaims.includes('P66.51 observes live HTTP runtime'));
  assert.ok(fixture.forbiddenClaims.includes('P66.51 runs observe:http'));
  assert.ok(fixture.forbiddenClaims.includes('P66.51 calls health endpoint'));
  assert.ok(fixture.forbiddenClaims.includes('P66.51 executes MCP initialize'));
  assert.ok(fixture.forbiddenClaims.includes('P66.51 executes tools/list'));
  assert.ok(fixture.forbiddenClaims.includes('P66.51 installs watchdog or startup'));
  assert.ok(fixture.forbiddenClaims.includes('P66.51 switches Codex or Claude config'));
  assert.ok(fixture.forbiddenClaims.includes('P66.51 calls providers'));
  assert.ok(fixture.forbiddenClaims.includes('P66.51 makes httpRuntimeObserved true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.51 closes live_http_operation_readiness_not_claimed'));
  assert.ok(fixture.forbiddenClaims.includes('P66.51 makes validationAggregatorFullImplementation true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.51 authorizes RC_READY'));
  assert.ok(fixture.forbiddenClaims.includes('P66.51 authorizes push tag release deploy'));
});

test('P66.51 next phase remains local closeout and not helper bridge or runtime execution', () => {
  assert.equal(
    fixture.nextRecommendedPhase,
    'P66.52-validation-aggregator-live-http-operation-readiness-local-closeout'
  );
});

test('P66.51 fixture text does not expose raw secrets raw workspace ids URLs or absolute paths', () => {
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

test('P66.51 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
