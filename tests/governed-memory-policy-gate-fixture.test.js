const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'governed-memory-policy-gate-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const PUBLIC_MCP_TOOLS = [
  'record_memory',
  'search_memory',
  'memory_overview',
  'audit_memory'
];

const REQUIRED_SOURCES = [
  'p31_lifecycle_contract',
  'p32_approval_packet',
  'p33_audit_evidence',
  'p34_review_surface',
  'validation_aggregator_report_shape'
];

test('P35.1 governed memory policy gate fixture parses and locks top-level state', () => {
  assert.equal(fixture.schemaVersion, 'governed-memory-policy-gate-v1');
  assert.equal(fixture.version, 'v1');
  assert.equal(fixture.phase, 'P35.1-governed-memory-policy-gate-fixture-contract');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.sourceMode, 'fixture_only');
  assert.equal(fixture.acceptedForPlanning, true);
});

test('P35.1 fixture declares no runtime gate, execution, durable writes, or live review', () => {
  assert.equal(fixture.policyGateImplemented, false);
  assert.equal(fixture.runtimeIntegrated, false);
  assert.equal(fixture.governedActionApproved, false);
  assert.equal(fixture.durableMemoryTouched, false);
  assert.equal(fixture.durableAuditWritten, false);
  assert.equal(fixture.publicMcpExpanded, false);
  assert.equal(fixture.realMemoryScanned, false);
  assert.equal(fixture.realDbReviewed, false);
  assert.equal(fixture.providerCalled, false);
  assert.equal(fixture.providerCalls, 0);
  assert.equal(fixture.mutated, false);
});

test('public MCP tools remain frozen', () => {
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.publicTools, PUBLIC_MCP_TOOLS);
});

test('accepted source types are fully whitelisted', () => {
  const safe = new Set(fixture.safeSourceTypes);

  assert.deepEqual(fixture.unsupportedSourceTypes, []);

  for (const sourceType of fixture.acceptedSourceTypes) {
    assert.equal(safe.has(sourceType), true, `${sourceType} is not safe`);
  }

  assert.ok(fixture.acceptedSourceTypes.includes('local_validation_summary'));
  assert.equal(fixture.acceptedSourceTypes.includes('explicit_input'), false);
});

test('source evidence covers P31 through P34 and ValidationAggregator report shape', () => {
  assert.deepEqual(
    fixture.sourceEvidence.map(source => source.id),
    REQUIRED_SOURCES
  );

  for (const source of fixture.sourceEvidence) {
    assert.equal(fixture.safeSourceTypes.includes(source.sourceType), true, source.id);
    assert.equal(source.acceptedForPlanning, true, source.id);
    assert.ok(Array.isArray(source.artifacts), `${source.id} must list artifacts`);
    assert.ok(source.artifacts.length > 0, `${source.id} must have artifacts`);
  }
});

test('gate summary preserves required runtime work and A5 approvals', () => {
  assert.equal(fixture.gateSummary.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.gateSummary.readyForRuntime, false);
  assert.equal(fixture.gateSummary.readyForGovernedActionExecution, false);
  assert.equal(fixture.gateSummary.readyForDurableAuditWrite, false);
  assert.equal(fixture.gateSummary.readyForPublicMcpExpansion, false);
  assert.equal(fixture.gateSummary.readyForV1Rc, false);

  for (const work of [
    'schema_version_runtime_enforcement',
    'validation_aggregator_full_implementation',
    'final_rc_matrix_runner',
    'runtime_governance_review'
  ]) {
    assert.ok(fixture.gateSummary.requiredRuntimeWork.includes(work), work);
  }

  for (const approval of [
    'governed_action_execution',
    'durable_audit_write',
    'public_mcp_expansion',
    'real_memory_scan_or_preview',
    'real_db_review',
    'provider_or_model_call',
    'push_tag_release_deploy'
  ]) {
    assert.ok(fixture.gateSummary.requiredApprovals.includes(approval), approval);
  }
});

test('fail-closed cases reject unsafe readiness or execution claims', () => {
  const casesById = new Map(fixture.failClosedCases.map(entry => [entry.id, entry]));

  for (const id of [
    'runtime_policy_gate_executed_claim',
    'unsupported_source_type_claim',
    'governed_action_approved_claim',
    'durable_write_claim',
    'public_mcp_expansion_claim',
    'real_memory_scan_claim',
    'real_db_review_claim',
    'provider_called_claim',
    'v1_rc_ready_claim'
  ]) {
    const entry = casesById.get(id);
    assert.ok(entry, id);
    assert.equal(entry.acceptedForPlanning, false, id);
    assert.match(entry.reason, /blocked|not_approved|not_implemented|not_ready|unsupported_source_type/, id);
  }

  assert.deepEqual(
    casesById.get('unsupported_source_type_claim').claimedValue,
    ['external_runtime_scan']
  );
});

test('safety flags preserve no side effects and no sensitive output', () => {
  assert.equal(fixture.safety.noRuntimePolicyGate, true);
  assert.equal(fixture.safety.noGovernedActionExecution, true);
  assert.equal(fixture.safety.noDurableMemoryWrite, true);
  assert.equal(fixture.safety.noDurableAuditWrite, true);
  assert.equal(fixture.safety.noPublicMcpExpansion, true);
  assert.equal(fixture.safety.noRealMemoryScan, true);
  assert.equal(fixture.safety.noRealDbReview, true);
  assert.equal(fixture.safety.noProviderCall, true);
  assert.equal(fixture.safety.noServiceStart, true);
  assert.equal(fixture.safety.noConfigMutation, true);
  assert.equal(fixture.safety.noMigrationImportExportApply, true);
  assert.equal(fixture.safety.noBackupRestore, true);
  assert.equal(fixture.safety.noRemoteWrite, true);
  assert.equal(fixture.safety.rawSecretExposed, false);
  assert.equal(fixture.safety.rawWorkspaceIdExposed, false);
  assert.equal(fixture.safety.authorizationHeaderExposed, false);
  assert.equal(fixture.safety.apiKeyExposed, false);
});

test('required wording and forbidden claims prevent policy gate overclaims', () => {
  assert.ok(fixture.requiredWording.some(line => line.includes('synthetic fixture contract only')));
  assert.ok(fixture.requiredWording.some(line => line.includes('not implemented at runtime')));
  assert.ok(fixture.requiredWording.some(line => line.includes('Governed actions remain blocked')));
  assert.ok(fixture.requiredWording.some(line => line.includes('v1.0 RC remains NOT_READY_BLOCKED')));
  assert.ok(fixture.forbiddenClaims.includes('runtime policy gate is implemented'));
  assert.ok(fixture.forbiddenClaims.includes('governed action execution is approved'));
  assert.ok(fixture.forbiddenClaims.includes('v1.0 RC readiness is unblocked'));
});

test('fixture text does not expose raw secrets or concrete raw workspace ids', () => {
  assert.doesNotMatch(fixtureText, /authorization\s*:/i);
  assert.doesNotMatch(fixtureText, /Bearer\s+[A-Za-z0-9._-]+/);
  assert.doesNotMatch(fixtureText, /api[_-]?key\s*[:=]/i);
  assert.doesNotMatch(fixtureText, /sk-[A-Za-z0-9_-]{12,}/);
  assert.doesNotMatch(fixtureText, /workspace-[A-Za-z0-9_-]{8,}/);
  assert.doesNotMatch(fixtureText, /[A-Z]:[\\/]/);
});

test('reading the fixture does not rewrite it', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
