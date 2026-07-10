const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p66-validation-aggregator-no-touch-boundary-proof-v1.json'
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

test('P66.28 fixture parses as no-touch boundary proof and remains blocked', () => {
  assert.equal(fixture.schemaVersion, 'p66-validation-aggregator-no-touch-boundary-proof-v1');
  assert.equal(fixture.policyVersion, 'p66-validation-aggregator-no-touch-boundary-proof-policy-v1');
  assert.equal(fixture.manifestVersion, 'p66-validation-aggregator-no-touch-boundary-proof-manifest-v1');
  assert.equal(fixture.phase, 'P66.28-validation-aggregator-no-touch-boundary-proof');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.acceptanceContractOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('P66.28 keeps the selected ValidationAggregator full-implementation gap open', () => {
  assert.equal(fixture.selectedGap.id, 'validation_aggregator_full_implementation_incomplete');
  assert.equal(fixture.selectedGap.currentStatus, 'open');
  assert.equal(fixture.selectedGap.remainsOpenAfterThisPhase, true);
  assert.equal(fixture.selectedGap.readinessAuthority, false);
});

test('P66.28 defines no-touch boundary proof without runtime authority', () => {
  assert.equal(fixture.evidenceGroup.id, 'no_touch_boundary_proof');
  assert.equal(fixture.evidenceGroup.priority, 7);
  assert.equal(fixture.evidenceGroup.currentStatus, 'acceptance_defined');
  assert.equal(fixture.evidenceGroup.required, true);
  assert.equal(fixture.evidenceGroup.remainsNonRuntime, true);
  assert.equal(fixture.evidenceGroup.readinessAuthority, false);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenMissing, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenUnsafeImportDetected, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenUnsafeRuntimeCallDetected, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenMutationClaimDetected, true);
  assert.equal(fixture.evidenceGroup.mustFailClosedWhenOverclaiming, true);
});

test('P66.28 preserves public MCP freeze and internal validate_memory status', () => {
  assert.deepEqual(fixture.publicTools, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.internalOnlyTools, ['validate_memory']);
});

test('P66.28 keeps all full implementation and readiness claims false', () => {
  assert.equal(fixture.validationAggregatorFullImplementation, false);
  assert.equal(fixture.runtimeReady, false);
  assert.equal(fixture.finalRcMatrixReady, false);
  assert.equal(fixture.v1RcReady, false);
  assert.equal(fixture.rcReady, false);
});

test('P66.28 names the no-touch target families without runtime execution', () => {
  assert.deepEqual(fixture.targetFamilies, [
    'validation_aggregator_service',
    'validation_aggregator_proof_helpers',
    'final_rc_runner_helpers',
    'governance_contract_helpers',
    'evidence_contract_helpers'
  ]);
});

test('P66.28 disallowed imports cover filesystem command network runtime store and project runtime layers', () => {
  for (const disallowedImport of [
    'fs',
    'node:fs',
    'child_process',
    'node:child_process',
    'http',
    'https',
    'node:sqlite',
    'sqlite3',
    'better-sqlite3',
    'src/storage',
    'src/recall',
    'src/adapters'
  ]) {
    assert.ok(fixture.disallowedImports.includes(disallowedImport), disallowedImport);
  }
});

test('P66.28 disallowed runtime calls cover file command network and mutation operations', () => {
  for (const disallowedCall of [
    'readFileSync',
    'readdirSync',
    'writeFileSync',
    'appendFileSync',
    'rmSync',
    'unlinkSync',
    'spawn',
    'exec',
    'execSync',
    'fork',
    'fetch',
    'request',
    'connect'
  ]) {
    assert.ok(fixture.disallowedRuntimeCalls.includes(disallowedCall), disallowedCall);
  }
});

test('P66.28 disallowed claim cases fail closed', () => {
  assert.equal(fixture.disallowedClaimCases.length, 4);
  for (const claimCase of fixture.disallowedClaimCases) {
    assert.match(claimCase.expectedStatus, /^blocked_/);
    assert.equal(claimCase.expectedDecision, 'NOT_READY_BLOCKED');
    assert.equal(claimCase.failClosed, true);
  }
});

test('P66.28 expected fail-closed report keeps readiness blocked', () => {
  assert.equal(fixture.expectedFailClosedReport.accepted, false);
  assert.equal(fixture.expectedFailClosedReport.rejected, true);
  assert.equal(fixture.expectedFailClosedReport.failClosed, true);
  assert.equal(fixture.expectedFailClosedReport.unsafeImportCount, 1);
  assert.equal(fixture.expectedFailClosedReport.unsafeRuntimeCallCount, 1);
  assert.equal(fixture.expectedFailClosedReport.mutationClaimCount, 1);
  assert.equal(fixture.expectedFailClosedReport.readinessOverclaimCount, 1);
  assert.equal(fixture.expectedFailClosedReport.validationAggregatorFullImplementationReady, false);
  assert.equal(fixture.expectedFailClosedReport.runtimeReady, false);
  assert.equal(fixture.expectedFailClosedReport.finalRcMatrixReady, false);
  assert.equal(fixture.expectedFailClosedReport.v1RcReady, false);
  assert.equal(fixture.expectedFailClosedReport.rcReady, false);
});

test('P66.28 fail-closed cases cover no-touch and A5 boundary failures', () => {
  for (const failClosedCase of [
    'missing_no_touch_proof',
    'unsafe_import_detected',
    'unsafe_runtime_call_detected',
    'fs_read_detected',
    'fs_write_detected',
    'command_execution_detected',
    'network_call_detected',
    'runtime_store_import_detected',
    'storage_recall_adapter_import_detected',
    'provider_call_claim',
    'service_start_claim',
    'real_memory_scan_claim',
    'durable_write_claim',
    'public_mcp_expansion_claim',
    'readiness_claim_without_authority',
    'a5_action_without_approval'
  ]) {
    assert.ok(fixture.failClosedCases.includes(failClosedCase), failClosedCase);
  }
});

test('P66.28 low-risk summary excludes raw workspace ids secrets paths URLs and payloads', () => {
  assert.equal(fixture.lowRiskSummary.rawWorkspaceIdExposed, false);
  assert.equal(fixture.lowRiskSummary.rawSecretExposed, false);
  assert.equal(fixture.lowRiskSummary.rawSourcePayloadExposed, false);
  assert.deepEqual(fixture.lowRiskSummary.allowedFields, [
    'status',
    'decision',
    'fail_closed',
    'unsafe_import_count',
    'unsafe_runtime_call_count',
    'mutation_claim_count',
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
    'durable_store_path',
    'raw_source_payload'
  ]) {
    assert.ok(fixture.lowRiskSummary.disallowedFields.includes(disallowed), disallowed);
  }
});

test('P66.28 disallowed work covers runtime provider data MCP and release actions', () => {
  for (const disallowed of [
    'runtime_collector',
    'implicit_fixture_read',
    'evidence_file_read',
    'command_execution',
    'gate_execution',
    'runner_execution',
    'service_start',
    'provider_call',
    'real_memory_scan',
    'runtime_store_scan',
    'durable_memory_write',
    'durable_audit_write',
    'migration_apply',
    'import_export_apply',
    'public_mcp_expansion',
    'push',
    'tag',
    'release',
    'deploy',
    'rc_ready_claim'
  ]) {
    assert.ok(fixture.disallowedWork.includes(disallowed), disallowed);
  }
});

test('P66.28 safety flags preserve no-touch and no-side-effect boundaries', () => {
  for (const [flag, value] of Object.entries(fixture.safety)) {
    assert.equal(value, flag === 'mutated' ? false : true, flag);
  }
});

test('P66.28 forbidden claims keep no-touch proof and readiness blocked', () => {
  assert.ok(fixture.forbiddenClaims.includes('P66.28 implements runtime evidence collection'));
  assert.ok(fixture.forbiddenClaims.includes('P66.28 scans source files at runtime'));
  assert.ok(fixture.forbiddenClaims.includes('P66.28 reads evidence files'));
  assert.ok(fixture.forbiddenClaims.includes('P66.28 executes commands'));
  assert.ok(fixture.forbiddenClaims.includes('P66.28 starts services'));
  assert.ok(fixture.forbiddenClaims.includes('P66.28 calls providers'));
  assert.ok(fixture.forbiddenClaims.includes('P66.28 writes durable memory'));
  assert.ok(fixture.forbiddenClaims.includes('P66.28 changes public MCP tools'));
  assert.ok(fixture.forbiddenClaims.includes('P66.28 makes ValidationAggregator a full implementation'));
  assert.ok(fixture.forbiddenClaims.includes('P66.28 makes validationAggregatorFullImplementation true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.28 authorizes RC_READY'));
});

test('P66.28 fixture text does not expose raw secrets raw workspace ids URLs or absolute paths', () => {
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

test('P66.28 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
