const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p66-validation-aggregator-runtime-gap-plan-v1.json'
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const REMAINING_RUNTIME_GAPS = [
  'validation_aggregator_full_implementation_incomplete',
  'governance_review_approval_audit_runtime_loop_not_executed',
  'recall_isolation_runtime_proof_not_executed',
  'migration_import_export_backup_restore_approval_execution_blocked',
  'live_http_operation_readiness_not_claimed',
  'mainline_strict_gate_not_executed_for_cutover',
  'rc_cutover_not_executed'
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

test('P66.3 runtime gap plan parses as planning-only and blocked', () => {
  assert.equal(fixture.schemaVersion, 'p66-validation-aggregator-runtime-gap-plan-v1');
  assert.equal(fixture.policyVersion, 'p66-validation-aggregator-runtime-gap-plan-policy-v1');
  assert.equal(fixture.manifestVersion, 'p66-validation-aggregator-runtime-gap-plan-manifest-v1');
  assert.equal(fixture.phase, 'P66.3-validation-aggregator-runtime-gap-plan');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.planningOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('P66.3 preserves public MCP freeze and internal validate_memory status', () => {
  assert.deepEqual(fixture.publicTools, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.internalOnlyTools, ['validate_memory']);
});

test('P66.3 keeps all readiness and full implementation claims false', () => {
  assert.equal(fixture.validationAggregatorFullImplementation, false);
  assert.equal(fixture.runtimeReady, false);
  assert.equal(fixture.finalRcMatrixReady, false);
  assert.equal(fixture.v1RcReady, false);
  assert.equal(fixture.rcReady, false);
});

test('P66.3 preserves the exact seven remaining runtime gaps in priority order', () => {
  assert.deepEqual(fixture.remainingRuntimeGaps.map(gap => gap.id), REMAINING_RUNTIME_GAPS);
  assert.deepEqual(fixture.remainingRuntimeGaps.map(gap => gap.priority), [1, 2, 3, 4, 5, 6, 7]);
});

test('P66.3 only allows local-safe next work before runtime approval', () => {
  for (const gap of fixture.remainingRuntimeGaps) {
    assert.equal(gap.readinessAuthority, false, gap.id);
    assert.ok(gap.nextAllowedWork.includes('docs'), gap.id);
    assert.ok(gap.nextAllowedWork.includes('fixture'), gap.id);
    assert.ok(gap.nextAllowedWork.includes('test'), gap.id);
    assert.doesNotMatch(gap.nextAllowedWork.join(','), /runtime|provider|deploy|migration_apply/, gap.id);
  }
});

test('P66.3 marks high-risk runtime proof gaps as requiring A5 approval before runtime', () => {
  const byId = new Map(fixture.remainingRuntimeGaps.map(gap => [gap.id, gap]));

  assert.equal(byId.get('validation_aggregator_full_implementation_incomplete').requiresA5ApprovalBeforeRuntime, false);
  for (const gapId of REMAINING_RUNTIME_GAPS.slice(1)) {
    assert.equal(byId.get(gapId).requiresA5ApprovalBeforeRuntime, true, gapId);
  }
});

test('P66.3 keeps locally evidenced gaps separate from remaining gaps', () => {
  assert.deepEqual(fixture.locallyEvidencedRuntimeGaps, [
    'runtime_schema_version_enforcement_not_fully_proven',
    'final_rc_matrix_runner_not_executed_as_real_matrix'
  ]);

  for (const gapId of fixture.locallyEvidencedRuntimeGaps) {
    assert.ok(!REMAINING_RUNTIME_GAPS.includes(gapId), gapId);
  }
});

test('P66.3 records all sixteen A5 hard stops', () => {
  assert.deepEqual(fixture.a5HardStops, A5_HARD_STOPS);
});

test('P66.3 fail-closed rules cover missing, stale, unsafe, A5, MCP, and readiness cases', () => {
  for (const rule of [
    'missing_required_evidence_keeps_blocked',
    'stale_evidence_keeps_blocked',
    'unknown_source_keeps_blocked',
    'unsupported_runtime_claim_keeps_blocked',
    'a5_action_without_approval_keeps_blocked',
    'readiness_claim_without_authority_keeps_blocked',
    'secret_like_content_keeps_blocked',
    'public_mcp_expansion_keeps_blocked'
  ]) {
    assert.ok(fixture.failClosedRules.includes(rule), rule);
  }
});

test('P66.3 safety flags forbid runtime, provider, data, MCP, package, secret, remote, and release actions', () => {
  for (const [flag, value] of Object.entries(fixture.safety)) {
    assert.equal(value, flag === 'mutated' ? false : true, flag);
  }
});

test('P66.3 forbidden claims block runtime and RC_READY overclaims', () => {
  assert.ok(fixture.forbiddenClaims.includes('P66.3 executes runtime gap proof'));
  assert.ok(fixture.forbiddenClaims.includes('P66.3 completes ValidationAggregator full implementation'));
  assert.ok(fixture.forbiddenClaims.includes('P66.3 authorizes RC_READY'));
  assert.ok(fixture.forbiddenClaims.includes('P66.3 authorizes push tag release deploy'));
});

test('P66.3 fixture text does not expose raw secrets, raw workspace ids, URLs, or absolute paths', () => {
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

test('P66.3 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
