const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p66-validation-aggregator-gap-priority-v1.json'
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const REQUIRED_EVIDENCE_GROUPS = [
  'source_registry_exact_set_proof',
  'evidence_freshness_proof',
  'baseline_binding_proof',
  'runtime_evidence_summary_normalization_proof',
  'missing_or_stale_evidence_fail_closed_proof',
  'unsupported_source_fail_closed_proof',
  'no_touch_boundary_proof',
  'readiness_overclaim_rejection_proof'
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

test('P66.4 fixture parses as acceptance-contract-only and blocked', () => {
  assert.equal(fixture.schemaVersion, 'p66-validation-aggregator-gap-priority-v1');
  assert.equal(fixture.policyVersion, 'p66-validation-aggregator-gap-priority-policy-v1');
  assert.equal(fixture.manifestVersion, 'p66-validation-aggregator-gap-priority-manifest-v1');
  assert.equal(fixture.phase, 'P66.4-validation-aggregator-gap-priority-fixture-tests');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.acceptanceContractOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('P66.4 selects only the first remaining ValidationAggregator gap', () => {
  assert.equal(fixture.selectedGap.id, 'validation_aggregator_full_implementation_incomplete');
  assert.equal(fixture.selectedGap.priority, 1);
  assert.equal(fixture.selectedGap.currentStatus, 'open');
  assert.equal(fixture.selectedGap.remainsOpenAfterThisPhase, true);
  assert.equal(fixture.selectedGap.readinessAuthority, false);
});

test('P66.4 preserves public MCP freeze and internal validate_memory status', () => {
  assert.deepEqual(fixture.publicTools, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.internalOnlyTools, ['validate_memory']);
});

test('P66.4 keeps all readiness and full implementation claims false', () => {
  assert.equal(fixture.validationAggregatorFullImplementation, false);
  assert.equal(fixture.runtimeReady, false);
  assert.equal(fixture.finalRcMatrixReady, false);
  assert.equal(fixture.v1RcReady, false);
  assert.equal(fixture.rcReady, false);
});

test('P66.4 accepted future local work excludes runtime and side-effect actions', () => {
  assert.deepEqual(fixture.acceptedFutureLocalWork, [
    'docs',
    'fixture',
    'test',
    'pure_explicit_input_helper',
    'static_report_shape_bridge'
  ]);

  for (const disallowed of ['runtime_collector', 'command_execution', 'service_start', 'provider_call']) {
    assert.ok(!fixture.acceptedFutureLocalWork.includes(disallowed), disallowed);
  }
});

test('P66.4 disallowed work covers runtime, service, provider, data, migration, MCP, and release actions', () => {
  for (const disallowed of [
    'runtime_collector',
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

test('P66.4 required evidence groups are exact and fail closed when missing', () => {
  assert.deepEqual(fixture.requiredEvidenceGroups.map(group => group.id), REQUIRED_EVIDENCE_GROUPS);

  for (const group of fixture.requiredEvidenceGroups) {
    assert.equal(group.required, true, group.id);
    assert.equal(group.mustFailClosedWhenMissing, true, group.id);
    assert.ok(['missing', 'partial'].includes(group.currentStatus), group.id);
  }
});

test('P66.4 fail-closed cases cover evidence, baseline, source, side-effect, and readiness failures', () => {
  for (const failClosedCase of [
    'missing_required_evidence_group',
    'stale_evidence_group',
    'unknown_evidence_group',
    'unsupported_source_type',
    'unsupported_source_class',
    'ambiguous_baseline',
    'unsafe_summary_claim',
    'readiness_claim_without_authority',
    'runtime_execution_claim',
    'service_start_claim',
    'provider_call_claim',
    'real_memory_scan_claim',
    'durable_write_claim',
    'public_mcp_expansion_claim',
    'a5_action_without_approval'
  ]) {
    assert.ok(fixture.failClosedCases.includes(failClosedCase), failClosedCase);
  }
});

test('P66.4 records all sixteen A5 hard stops', () => {
  assert.deepEqual(fixture.a5HardStops, A5_HARD_STOPS);
});

test('P66.4 safety flags forbid runtime, provider, data, MCP, package, secret, remote, and release actions', () => {
  for (const [flag, value] of Object.entries(fixture.safety)) {
    assert.equal(value, flag === 'mutated' ? false : true, flag);
  }
});

test('P66.4 forbidden claims keep the selected gap open and readiness blocked', () => {
  assert.ok(fixture.forbiddenClaims.includes('P66.4 implements the ValidationAggregator full implementation'));
  assert.ok(fixture.forbiddenClaims.includes('P66.4 closes validation_aggregator_full_implementation_incomplete'));
  assert.ok(fixture.forbiddenClaims.includes('P66.4 makes validationAggregatorFullImplementation true'));
  assert.ok(fixture.forbiddenClaims.includes('P66.4 authorizes RC_READY'));
  assert.ok(fixture.forbiddenClaims.includes('P66.4 authorizes push tag release deploy'));
});

test('P66.4 fixture text does not expose raw secrets, raw workspace ids, URLs, or absolute paths', () => {
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

test('P66.4 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
