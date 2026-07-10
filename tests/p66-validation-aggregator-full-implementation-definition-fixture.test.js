const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p66-validation-aggregator-full-implementation-definition-v1.json'
);
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const REQUIRED_CRITERIA = [
  'safe_evidence_source_registry_complete',
  'evidence_freshness_and_baseline_binding_complete',
  'runtime_schema_version_boundary_evidence_ingested',
  'final_rc_matrix_runner_evidence_ingested_without_overclaim',
  'governance_review_approval_audit_runtime_loop_evidence_ingested',
  'recall_isolation_runtime_proof_evidence_ingested',
  'migration_import_export_backup_restore_approval_evidence_ingested',
  'live_http_operation_readiness_evidence_ingested',
  'cutover_context_mainline_strict_gate_evidence_ingested',
  'rc_cutover_authorization_and_execution_evidence_ingested',
  'a5_hard_stop_clearance_evidence_complete'
];

const REMAINING_RUNTIME_GAPS = [
  'validation_aggregator_full_implementation_incomplete',
  'governance_review_approval_audit_runtime_loop_not_executed',
  'recall_isolation_runtime_proof_not_executed',
  'migration_import_export_backup_restore_approval_execution_blocked',
  'live_http_operation_readiness_not_claimed',
  'mainline_strict_gate_not_executed_for_cutover',
  'rc_cutover_not_executed'
];

const LOCALLY_EVIDENCED_RUNTIME_GAPS = [
  'runtime_schema_version_enforcement_not_fully_proven',
  'final_rc_matrix_runner_not_executed_as_real_matrix'
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

test('P66.1 fixture parses as definition-only and blocked', () => {
  assert.equal(fixture.schemaVersion, 'p66-validation-aggregator-full-implementation-definition-v1');
  assert.equal(fixture.policyVersion, 'p66-validation-aggregator-full-implementation-policy-v1');
  assert.equal(fixture.manifestVersion, 'p66-validation-aggregator-full-implementation-manifest-v1');
  assert.equal(fixture.phase, 'P66.1-validation-aggregator-full-implementation-definition');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.definitionOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('P66.1 definition preserves public MCP freeze and internal validate_memory status', () => {
  assert.deepEqual(fixture.publicTools, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.internalOnlyTools, ['validate_memory']);
});

test('P66.1 keeps all readiness claims false', () => {
  assert.equal(fixture.validationAggregatorFullImplementation, false);
  assert.equal(fixture.runtimeReady, false);
  assert.equal(fixture.finalRcMatrixReady, false);
  assert.equal(fixture.v1RcReady, false);
  assert.equal(fixture.rcReady, false);
});

test('P66.1 required criteria are exact and fail closed when missing', () => {
  assert.deepEqual(fixture.requiredFullImplementationCriteria.map(item => item.id), REQUIRED_CRITERIA);

  for (const criterion of fixture.requiredFullImplementationCriteria) {
    assert.equal(criterion.required, true, criterion.id);
    assert.equal(criterion.mustFailClosedWhenMissing, true, criterion.id);
    assert.ok(['partial', 'locally_evidenced', 'missing', 'blocked'].includes(criterion.currentStatus), criterion.id);
  }
});

test('P66.1 records two locally evidenced gaps and seven remaining runtime gaps', () => {
  assert.deepEqual(fixture.locallyEvidencedRuntimeGapIds, LOCALLY_EVIDENCED_RUNTIME_GAPS);
  assert.deepEqual(fixture.requiredRuntimeGapIds, REMAINING_RUNTIME_GAPS);
  assert.equal(fixture.requiredRuntimeGapIds.length, 7);
  assert.equal(fixture.locallyEvidencedRuntimeGapIds.length, 2);
});

test('P66.1 records all sixteen A5 hard stops', () => {
  assert.deepEqual(fixture.a5HardStops, A5_HARD_STOPS);
});

test('P66.1 fail-closed cases cover readiness, side effects, unsafe evidence, and A5 gaps', () => {
  for (const failClosedCase of [
    'missing_required_evidence',
    'readiness_claim_without_authority',
    'full_matrix_execution_overclaim',
    'provider_call_detected',
    'service_start_detected',
    'real_memory_preview_detected',
    'durable_write_detected',
    'migration_or_import_export_apply_detected',
    'public_mcp_expansion_detected',
    'secret_like_content_detected',
    'a5_approval_missing'
  ]) {
    assert.ok(fixture.failClosedCases.includes(failClosedCase), failClosedCase);
  }
});

test('P66.1 definition rules prevent full implementation and RC_READY overclaims', () => {
  assert.equal(fixture.definitionRules.allRequiredCriteriaMustPass, true);
  assert.equal(fixture.definitionRules.anyMissingCriterionKeepsBlocked, true);
  assert.equal(fixture.definitionRules.anyA5HardStopKeepsBlockedUntilExplicitlyCleared, true);
  assert.equal(fixture.definitionRules.localRunnerEvidenceIsNotFullMatrixReadiness, true);
  assert.equal(fixture.definitionRules.fullImplementationDoesNotImplyRcReady, true);
  assert.equal(fixture.definitionRules.readinessRequiresSeparateCutoverApproval, true);
});

test('P66.1 safety flags forbid runtime, provider, data, MCP, package, secret, and remote actions', () => {
  for (const [flag, value] of Object.entries(fixture.safety)) {
    assert.equal(value, flag === 'mutated' ? false : true, flag);
  }
});

test('P66.1 forbidden claims and required wording keep the boundary visible', () => {
  assert.ok(fixture.forbiddenClaims.includes('P66.1 implements the full ValidationAggregator'));
  assert.ok(fixture.forbiddenClaims.includes('P66.1 authorizes RC_READY'));
  assert.ok(fixture.forbiddenClaims.includes('local allowlisted runner evidence equals full final RC matrix readiness'));
  assert.ok(fixture.requiredWording.some(line => line.includes('definition only')));
  assert.ok(fixture.requiredWording.some(line => line.includes('seven runtime gaps remain')));
  assert.ok(fixture.requiredWording.some(line => line.includes('sixteen A5 hard stops remain blocked')));
});

test('P66.1 fixture text does not expose raw secrets, raw workspace ids, or absolute paths', () => {
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

test('P66.1 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
