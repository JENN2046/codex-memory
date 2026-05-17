const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'p56-governance-executable-loop-boundary-v1.json');

const expectedPublicMcpTools = [
  'record_memory',
  'search_memory',
  'memory_overview'
];

const expectedSourceEvidenceIds = [
  'p31_lifecycle_contract_helper',
  'p32_approval_packet_helper',
  'p33_audit_evidence_helper',
  'p34_review_surface_helper',
  'p55_evidence_runtime_trace_helper'
];

const expectedLoopStageIds = [
  'review_packet_intake',
  'approval_packet_evaluation',
  'audit_evidence_shape_evaluation',
  'execution_gate_evaluation',
  'durable_write_gate',
  'post_action_evidence_gate'
];

const expectedApprovalStateIds = [
  'reviewed_not_approved',
  'approval_missing',
  'approval_unknown',
  'approval_warning_only',
  'approval_expired_or_stale',
  'approval_scope_mismatch'
];

function readFixtureText() {
  return fs.readFileSync(fixturePath, 'utf8');
}

function loadFixture() {
  return JSON.parse(readFixtureText());
}

function ids(rows) {
  return rows.map(row => row.id);
}

test('P56 governance loop boundary fixture locks top-level blocked posture', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'p56-governance-executable-loop-boundary-v1');
  assert.equal(fixture.policyVersion, 'p56-governance-loop-policy-v1');
  assert.equal(fixture.manifestVersion, 'p56-governance-loop-manifest-v1');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.explicitInputOnly, true);
  assert.equal(fixture.dryRunOnly, true);
  assert.equal(fixture.localOnly, true);
  assert.equal(fixture.boundaryOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.acceptedForPlanning, true);
  assert.deepEqual(fixture.publicMcpTools, expectedPublicMcpTools);
});

test('P56 governance loop boundary fixture does not implement runtime execution or durable writes', () => {
  const fixture = loadFixture();

  assert.equal(fixture.runtimeIntegrated, false);
  assert.equal(fixture.governanceLoopImplemented, false);
  assert.equal(fixture.governedActionExecutionApproved, false);
  assert.equal(fixture.governedActionExecuted, false);
  assert.equal(fixture.approvalExecutionReady, false);
  assert.equal(fixture.auditWriterImplemented, false);
  assert.equal(fixture.durableAuditWritten, false);
  assert.equal(fixture.durableMemoryWritten, false);
  assert.equal(fixture.publicMcpExpanded, false);
  assert.equal(fixture.realMemoryScanned, false);
  assert.equal(fixture.providerCalls, 0);
});

test('P56 source evidence is exact and non-authoritative', () => {
  const fixture = loadFixture();

  assert.deepEqual(ids(fixture.sourceEvidence), expectedSourceEvidenceIds);

  for (const source of fixture.sourceEvidence) {
    assert.equal(source.runtimeAuthority, false, source.id);
    assert.equal(source.executionAuthority, false, source.id);
    assert.equal(source.readinessAuthority, false, source.id);
    assert.equal(source.artifactRefs.length > 0, true, source.id);
  }
});

test('P56 loop stages are exact, ordered, and non-executable', () => {
  const fixture = loadFixture();

  assert.deepEqual(ids(fixture.loopStages), expectedLoopStageIds);

  for (const stage of fixture.loopStages) {
    assert.equal(stage.inputMode, 'explicit_input', stage.id);
    assert.equal(stage.canExecute, false, stage.id);
    assert.equal(stage.durableWriteAllowed, false, stage.id);
    assert.notEqual(stage.status, 'ready', stage.id);
    assert.notEqual(stage.status, 'executed', stage.id);
  }
});

test('P56 approval states fail closed except reviewed-not-approved planning posture', () => {
  const fixture = loadFixture();

  assert.deepEqual(ids(fixture.approvalStates), expectedApprovalStateIds);

  for (const approvalState of fixture.approvalStates) {
    assert.equal(approvalState.executionAllowed, false, approvalState.id);
  }

  assert.equal(fixture.approvalStates[0].id, 'reviewed_not_approved');
  assert.equal(fixture.approvalStates[0].acceptedForPlanning, true);

  for (const approvalState of fixture.approvalStates.slice(1)) {
    assert.equal(approvalState.acceptedForPlanning, false, approvalState.id);
  }
});

test('P56 required runtime evidence remains unsatisfied by boundary contract', () => {
  const fixture = loadFixture();

  for (const required of [
    'runtime_schema_version_enforcement',
    'validation_aggregator_full_implementation',
    'final_rc_matrix_runner_execution',
    'governance_review_runtime_path',
    'approval_execution_runtime_path',
    'durable_audit_writer',
    'durable_memory_mutation_policy',
    'recall_isolation_runtime_proof'
  ]) {
    assert.equal(fixture.requiredRuntimeEvidence.includes(required), true, required);
  }
});

test('P56 fail-closed states and blockers preserve A5 hard stops', () => {
  const fixture = loadFixture();

  for (const state of [
    'missing',
    'unknown',
    'skipped',
    'warning_only',
    'stale',
    'unsupported',
    'scope_mismatch',
    'approval_missing',
    'approval_expired',
    'fixture_only',
    'dry_run_only'
  ]) {
    assert.equal(fixture.failClosedStates.includes(state), true, state);
  }

  for (const action of [
    'governed_action_execution',
    'approval_execution',
    'runtime_governance_integration',
    'durable_memory_write',
    'durable_audit_write',
    'audit_writer_implementation',
    'real_memory_scan',
    'sqlite_scan',
    'sqlite_migration_apply',
    'import_export_apply',
    'backup_restore_apply',
    'provider_call',
    'service_start',
    'config_switch',
    'watchdog_install',
    'public_mcp_expansion',
    'push_tag_release_deploy'
  ]) {
    assert.equal(fixture.blockedActions.includes(action), true, action);
  }
});

test('P56 readiness remains local boundary only', () => {
  const fixture = loadFixture();

  assert.equal(fixture.readiness.localBoundaryContractReady, true);
  assert.equal(fixture.readiness.governanceRuntimeReady, false);
  assert.equal(fixture.readiness.approvalExecutionReady, false);
  assert.equal(fixture.readiness.auditWriterReady, false);
  assert.equal(fixture.readiness.durableWriteReady, false);
  assert.equal(fixture.readiness.runtimeReady, false);
  assert.equal(fixture.readiness.finalRcMatrixReady, false);
  assert.equal(fixture.readiness.v1RcReady, false);
  assert.equal(fixture.readiness.pushReady, false);
  assert.equal(fixture.readiness.releaseReady, false);
  assert.equal(fixture.readiness.deployReady, false);
});

test('P56 safety flags forbid side effects', () => {
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

test('P56 fixture does not expose raw sensitive fragments', () => {
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

test('reading the P56 fixture does not rewrite it', () => {
  const before = readFixtureText();
  loadFixture();
  const after = readFixtureText();

  assert.equal(after, before);
});
