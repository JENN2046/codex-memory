const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p62-completion-audit-gap-report-v1.json'
);

const expectedCompletedLocalItems = [
  'p51_post_p50_board_status_reconciliation',
  'p52_schema_version_boundary_and_helper',
  'p53_validation_aggregator_inventory_posture_classification',
  'p54_final_rc_runner_local_contract_chain',
  'p55_evidence_to_runtime_trace',
  'p56_governance_loop_boundary_and_helper',
  'p57_recall_isolation_boundary_and_helper',
  'p58_migration_import_export_backup_restore_boundary_and_helper',
  'p59_http_observability_boundary_and_helper',
  'p60_no_touch_no_leak_redaction_regression',
  'p61_rc_evidence_report_boundary_and_helper',
  'p62_rc_cutover_preflight_boundary_inventory',
  'p62_completion_audit_and_authorization_preconditions',
  'p62_a5_runtime_authorization_precondition_helper',
  'p62_post_t6_audit_refinement_and_validation_refs'
];

const expectedRuntimeGaps = [
  'runtime_schema_version_enforcement_not_fully_proven',
  'validation_aggregator_full_implementation_incomplete',
  'final_rc_matrix_runner_not_executed_as_real_matrix',
  'governance_review_approval_audit_runtime_loop_not_executed',
  'recall_isolation_runtime_proof_not_executed',
  'migration_import_export_backup_restore_approval_execution_blocked',
  'live_http_operation_readiness_not_claimed',
  'mainline_strict_gate_not_executed_for_cutover',
  'rc_cutover_not_executed'
];

function readFixtureText() {
  return fs.readFileSync(fixturePath, 'utf8');
}

function loadFixture() {
  return JSON.parse(readFixtureText());
}

test('P62 completion audit locks blocked objective posture', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'p62-completion-audit-gap-report-v1');
  assert.equal(fixture.policyVersion, 'p62-completion-audit-policy-v1');
  assert.equal(fixture.manifestVersion, 'p62-completion-audit-manifest-v1');
  assert.equal(fixture.localOnly, true);
  assert.equal(fixture.readOnly, true);
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.auditOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.objectiveComplete, false);
  assert.equal(fixture.acceptedForPlanning, true);
});

test('P62 completion audit maps every local P51-P62 item exactly once', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.completedLocalItems, expectedCompletedLocalItems);
  assert.equal(new Set(fixture.completedLocalItems).size, expectedCompletedLocalItems.length);
});

test('P62 completion audit keeps critical runtime gaps explicit', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.requiredRuntimeCompletionGaps, expectedRuntimeGaps);
  assert.equal(fixture.requiredRuntimeCompletionGaps.length > 0, true);
  assert.equal(fixture.readiness.objectiveComplete, false);
  assert.equal(fixture.readiness.runtimeReady, false);
  assert.equal(fixture.readiness.finalRcMatrixReady, false);
  assert.equal(fixture.readiness.v1RcReady, false);
  assert.equal(fixture.readiness.cutoverReady, false);
});

test('P62 completion audit preserves A5 hard stops and public MCP freeze', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.publicMcpTools, [
    'record_memory',
    'search_memory',
    'memory_overview',
    'audit_memory'
  ]);

  for (const action of [
    'push',
    'tag_create',
    'release_create',
    'deploy',
    'config_switch',
    'watchdog_install',
    'provider_call',
    'real_memory_scan',
    'sqlite_migration_apply',
    'import_export_apply',
    'backup_restore_apply',
    'durable_memory_write',
    'durable_audit_write',
    'public_mcp_expansion',
    'rc_ready_claim'
  ]) {
    assert.equal(fixture.a5HardStops.includes(action), true, action);
  }
});

test('P62 completion audit forbids readiness overclaims', () => {
  const fixture = loadFixture();

  for (const claim of [
    'objective_complete',
    'runtime_ready',
    'final_rc_matrix_ready',
    'rc_ready',
    'v1_rc_ready',
    'cutover_ready',
    'release_ready',
    'deploy_ready',
    'config_switch_ready',
    'watchdog_ready'
  ]) {
    assert.equal(fixture.forbiddenClaims.includes(claim), true, claim);
  }
});

test('P62 completion audit safety flags forbid side effects and real data access', () => {
  const fixture = loadFixture();

  assert.equal(fixture.safety.readsFilesImplicitly, false);
  assert.equal(fixture.safety.scansDirectories, false);
  assert.equal(fixture.safety.executesCommands, false);
  assert.equal(fixture.safety.startsServices, false);
  assert.equal(fixture.safety.callsProviders, false);
  assert.equal(fixture.safety.readsRealMemory, false);
  assert.equal(fixture.safety.scansRuntimeStores, false);
  assert.equal(fixture.safety.writesDurableMemory, false);
  assert.equal(fixture.safety.writesDurableAudit, false);
  assert.equal(fixture.safety.expandsPublicMcp, false);
  assert.equal(fixture.safety.remoteWrites, false);
  assert.equal(fixture.safety.rawSensitiveOutputExposed, false);
});

test('P62 completion audit fixture does not expose raw sensitive fragments', () => {
  const text = readFixtureText().toLowerCase();

  for (const forbidden of [
    'authorization:',
    'bearer ',
    'api_key',
    'raw_workspace_id',
    'providerapikey',
    'set-cookie',
    'token=',
    'password=',
    '.env',
    'https://example.test',
    'a:\\'
  ]) {
    assert.equal(text.includes(forbidden), false, forbidden);
  }
});

test('reading the P62 completion audit fixture does not rewrite it', () => {
  const before = readFixtureText();
  loadFixture();
  const after = readFixtureText();

  assert.equal(after, before);
});
