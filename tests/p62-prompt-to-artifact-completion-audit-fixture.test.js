const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p62-prompt-to-artifact-completion-audit-v1.json'
);

const expectedRouteIds = [
  'p51_post_p50_push_reconciliation',
  'p52_schema_version_runtime_enforcement_boundary',
  'p53_validation_aggregator_full_implementation_path',
  'p54_final_rc_matrix_runner_execution_chain',
  'p55_evidence_to_runtime_enforcement_bridge',
  'p56_governance_review_approval_audit_loop',
  'p57_recall_isolation_runtime_proof',
  'p58_migration_import_export_backup_restore_framework',
  'p59_http_runtime_observability_operation_hardening',
  'p60_no_touch_no_leak_redaction_regression',
  'p61_mainline_strict_gate_rc_evidence_report',
  'p62_v1_rc_cutover_preflight'
];

const expectedCompletionCriteriaIds = [
  'schema_version_runtime_enforcement_proven',
  'validation_aggregator_full_implementation_complete',
  'final_rc_matrix_runner_executed',
  'governance_runtime_loop_executed',
  'recall_isolation_runtime_proof_executed',
  'migration_import_export_backup_restore_execution_authorized',
  'http_runtime_operation_readiness_proven',
  'mainline_strict_gate_and_rc_report_passed',
  'v1_rc_cutover_preflight_passed'
];

function readFixtureText() {
  return fs.readFileSync(fixturePath, 'utf8');
}

function loadFixture() {
  return JSON.parse(readFixtureText());
}

test('P62 prompt-to-artifact audit locks blocked posture', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'p62-prompt-to-artifact-completion-audit-v1');
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

test('P62 prompt-to-artifact audit covers every route item exactly once', () => {
  const fixture = loadFixture();
  const routeIds = fixture.routeRequirements.map((requirement) => requirement.id);

  assert.deepEqual(routeIds, expectedRouteIds);
  assert.equal(new Set(routeIds).size, expectedRouteIds.length);

  for (const requirement of fixture.routeRequirements) {
    assert.equal(requirement.promptItem.length > 0, true, requirement.id);
    assert.equal(requirement.artifacts.length > 0, true, requirement.id);
    assert.equal(requirement.validationRefs.length > 0, true, requirement.id);
    assert.equal(requirement.runtimeAuthority, false, requirement.id);
  }
});

test('P62 prompt-to-artifact audit separates local evidence from goal completion criteria', () => {
  const fixture = loadFixture();
  const criteriaIds = fixture.completionCriteria.map((criterion) => criterion.id);

  assert.deepEqual(criteriaIds, expectedCompletionCriteriaIds);

  for (const criterion of fixture.completionCriteria) {
    assert.equal(criterion.requiredForGoalCompletion, true, criterion.id);
    assert.equal(criterion.currentStatus, 'blocked', criterion.id);
    assert.equal(criterion.evidence.length > 0, true, criterion.id);
    assert.equal(criterion.missingEvidence.length > 0, true, criterion.id);
  }
});

test('P62 prompt-to-artifact audit includes P62-T5 authorization helper evidence without runtime authority', () => {
  const fixture = loadFixture();
  const p62Route = fixture.routeRequirements.find((requirement) => requirement.id === 'p62_v1_rc_cutover_preflight');

  assert.ok(p62Route);
  assert.equal(p62Route.runtimeAuthority, false);
  assert.equal(p62Route.artifacts.includes('src/core/A5RuntimeAuthorizationPreconditionContract.js'), true);
  assert.equal(p62Route.artifacts.includes('docs/P62_A5_RUNTIME_AUTHORIZATION_PRECONDITION_MATRIX.md'), true);
  assert.equal(p62Route.validationRefs.includes('P62-T5 authorization precondition helper test'), true);
  assert.equal(p62Route.validationRefs.includes('P62-T6 completion audit refresh tests'), true);
  assert.equal(p62Route.validationRefs.includes('P62 audit wording reconciliation tests'), true);
});

test('P62 completion audit includes post-P62-T5 local audit and authorization items', () => {
  const fixture = loadFixture();
  const p62Route = fixture.routeRequirements.find((requirement) => requirement.id === 'p62_v1_rc_cutover_preflight');

  assert.ok(p62Route);
  assert.equal(p62Route.artifacts.includes('tests/fixtures/p62-completion-audit-gap-report-v1.json'), true);
  assert.equal(p62Route.artifacts.includes('tests/fixtures/p62-prompt-to-artifact-completion-audit-v1.json'), true);
  assert.equal(p62Route.artifacts.includes('tests/fixtures/p62-a5-runtime-authorization-precondition-matrix-v1.json'), true);
});

test('P62 prompt-to-artifact audit keeps public MCP frozen and A5 hard stops visible', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.publicMcpTools, [
    'record_memory',
    'search_memory',
    'memory_overview'
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

test('P62 prompt-to-artifact audit records validation commands without executing them', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.requiredValidationCommands, [
    'node --check tests/p62-prompt-to-artifact-completion-audit-fixture.test.js',
    'node --test tests/p62-prompt-to-artifact-completion-audit-fixture.test.js tests/p62-completion-audit-gap-report-fixture.test.js',
    'npm test',
    'git diff --check'
  ]);
  assert.equal(fixture.safety.executesCommands, false);
});

test('P62 prompt-to-artifact audit forbids readiness overclaims', () => {
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

  assert.equal(fixture.readiness.promptToArtifactAuditReady, true);
  assert.equal(fixture.readiness.objectiveComplete, false);
  assert.equal(fixture.readiness.runtimeReady, false);
  assert.equal(fixture.readiness.finalRcMatrixReady, false);
  assert.equal(fixture.readiness.v1RcReady, false);
  assert.equal(fixture.readiness.cutoverReady, false);
});

test('P62 prompt-to-artifact audit safety flags forbid side effects and real data access', () => {
  const fixture = loadFixture();

  assert.equal(fixture.safety.readsFilesImplicitly, false);
  assert.equal(fixture.safety.scansDirectories, false);
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

test('P62 prompt-to-artifact audit fixture does not expose raw sensitive fragments', () => {
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

test('reading the P62 prompt-to-artifact audit fixture does not rewrite it', () => {
  const before = readFixtureText();
  loadFixture();
  const after = readFixtureText();

  assert.equal(after, before);
});
