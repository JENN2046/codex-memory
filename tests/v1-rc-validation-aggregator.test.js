const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'v1-rc-validation-aggregator-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== 'object') return false;
  if (Object.hasOwn(value, key)) return true;
  if (Array.isArray(value)) return value.some(item => hasNestedKey(item, key));
  return Object.values(value).some(child => hasNestedKey(child, key));
}

function assertNoSensitiveSurface(fixture) {
  const {
    forbiddenFragments,
    forbiddenTopLevelKeys,
    ...scannedFixture
  } = fixture;
  const encoded = JSON.stringify(scannedFixture).toLowerCase();
  for (const fragment of fixture.forbiddenFragments) {
    assert.equal(encoded.includes(fragment), false, fragment);
  }
}

test('v1 RC validation aggregator fixture declares safe no-side-effect boundaries', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'v1-rc-validation-aggregator-v1');
  assert.equal(fixture.version, 'v1');
  assert.equal(fixture.phase, 'P24.1-validation-aggregator-fixture-shape-tests');
  assert.equal(fixture.mode, 'fixture-only');
  assert.equal(fixture.generated_at, '<generated-at-runtime>');
  assert.equal(fixture.source.kind, 'synthetic-fixture');
  assert.equal(fixture.source.synthetic, true);

  assert.equal(fixture.safety.mutated, false);
  assert.equal(fixture.safety.providerCalls, 0);
  assert.equal(fixture.safety.serviceStarted, false);
  assert.equal(fixture.safety.durableMemoryTouched, false);
  assert.equal(fixture.safety.realMemoryPreview, false);
  assert.equal(fixture.safety.redactionApplied, true);
  assert.equal(fixture.safety.rawWorkspaceIdExposed, false);
  assert.equal(fixture.safety.rawSecretExposed, false);
  assert.equal(fixture.safety.publicMcpExpanded, false);
  assert.equal(fixture.safety.mcpSchemaChanged, false);
  assert.equal(fixture.safety.runtimeCodeChanged, false);
  assert.equal(fixture.safety.packageChanged, false);
  assert.equal(fixture.safety.migrationApplied, false);
  assert.equal(fixture.safety.importExportApplied, false);
  assert.equal(fixture.safety.watchdogStartupInstalled, false);
  assert.equal(fixture.safety.configChanged, false);
  assert.equal(fixture.safety.pushed, false);
  assert.equal(fixture.safety.tagged, false);
  assert.equal(fixture.safety.released, false);
  assert.equal(fixture.safety.deployed, false);
});

test('v1 RC validation aggregator fixture locks required top-level shape', () => {
  const fixture = loadFixture();
  const expectedKeys = [
    'a4_safe',
    'a5_gated',
    'blockers',
    'checks',
    'conditional_live',
    'decision',
    'decisionContract',
    'evidence',
    'forbiddenFragments',
    'forbiddenTopLevelKeys',
    'generated_at',
    'mode',
    'phase',
    'public_mcp_tools',
    'recommendations',
    'runtime_required',
    'safety',
    'schemaVersion',
    'source',
    'summary',
    'version',
    'warnings'
  ];

  assert.deepEqual(Object.keys(fixture).sort(), expectedKeys.sort());
  assert.equal(typeof fixture.summary, 'object');
  assert.equal(typeof fixture.checks, 'object');
  assert.equal(Array.isArray(fixture.blockers), true);
  assert.equal(Array.isArray(fixture.a4_safe), true);
  assert.equal(Array.isArray(fixture.a5_gated), true);
  assert.equal(Array.isArray(fixture.runtime_required), true);
  assert.equal(Array.isArray(fixture.conditional_live), true);
  assert.equal(Array.isArray(fixture.evidence.p24Aggregator ? fixture.recommendations : []), true);
});

test('decision contract includes blocked, partial, and ready labels without overclaiming readiness', () => {
  const fixture = loadFixture();
  const allowed = fixture.decisionContract.allowed;

  for (const decision of [
    'READY_FOR_V1_0_RC',
    'READY_FOR_DOCS_ONLY_RC_REVIEW',
    'A4_SAFE_SLICE_PASSED',
    'BLOCKED_RUNTIME_REQUIRED',
    'BLOCKED_A5_REQUIRED',
    'NOT_READY_BLOCKED'
  ]) {
    assert.equal(allowed.includes(decision), true, decision);
  }

  assert.equal(allowed.includes(fixture.decision), true);
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.decisionContract.currentMustNotBe.includes('READY_FOR_V1_0_RC'), true);
  assert.notEqual(fixture.decision, 'READY_FOR_V1_0_RC');
});

test('fixture honestly preserves current P23/P24 blocker state', () => {
  const fixture = loadFixture();

  assert.equal(fixture.summary.a4SafeSlice, 'A4_SAFE_SLICE_PASSED');
  assert.equal(fixture.summary.fullFinalRcMatrixExecuted, false);
  assert.equal(fixture.summary.liveMcpHttpEvidenceRefreshed, false);
  assert.equal(fixture.summary.validationAggregatorImplemented, false);
  assert.equal(fixture.summary.schemaVersionRuntimeEnforcementImplemented, false);
  assert.equal(fixture.summary.productionDeployPerformed, false);
  assert.equal(fixture.summary.startupWatchdogInstalled, false);
  assert.equal(fixture.summary.codexClaudeConfigSwitched, false);
  assert.equal(fixture.summary.providerExecuted, false);
  assert.equal(fixture.summary.migrationImportExportApplyPerformed, false);
  assert.equal(fixture.summary.durableMemoryMutationExpansionPerformed, false);
  assert.equal(fixture.summary.pushTagReleaseDeployPerformed, false);

  assert.equal(fixture.evidence.p23A4SafeSlice.status, 'A4_SAFE_SLICE_PASSED');
  assert.equal(fixture.evidence.p23A4SafeSlice.fullFinalRcMatrixExecuted, false);
  assert.equal(fixture.evidence.p23A4SafeSlice.liveMcpHttpEvidenceRefreshed, false);
  assert.equal(fixture.evidence.p24Aggregator.planned, true);
  assert.equal(fixture.evidence.p24Aggregator.implemented, false);
});

test('check groups classify A4-safe, A5-gated, runtime-required, and conditional live work', () => {
  const fixture = loadFixture();

  for (const key of ['gitHygiene', 'docsValidation', 'p2DocsWhitespace', 'mcpContract', 'publicMcpTools']) {
    assert.ok(fixture.checks[key], key);
  }

  assert.equal(fixture.checks.publicMcpTools.status, 'pass');
  assert.equal(fixture.checks.schemaVersionRuntimeEnforcement.status, 'planned_not_implemented');
  assert.equal(fixture.checks.validationAggregatorExecutable.status, 'planned_not_implemented');
  assert.equal(fixture.checks.conditionalLiveMcpHttp.status, 'not_executed_service_not_running');

  for (const key of [
    'migrationImportExportApply',
    'providerExecution',
    'startupWatchdog',
    'clientConfigSwitch',
    'productionDeploy',
    'pushTagReleaseDeploy'
  ]) {
    assert.equal(fixture.checks[key].status, 'blocked_pending_a5', key);
    assert.equal(fixture.checks[key].a5Gated, true, key);
  }

  assert.equal(fixture.a4_safe.includes('gitHygiene'), true);
  assert.equal(fixture.a5_gated.includes('providerExecution'), true);
  assert.equal(fixture.runtime_required.includes('validationAggregatorExecutable'), true);
  assert.equal(fixture.conditional_live.includes('health'), true);
});

test('public MCP tools remain exactly the frozen three-tool contract', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.public_mcp_tools, [
    'record_memory',
    'search_memory',
    'memory_overview'
  ]);
  assert.deepEqual(fixture.public_mcp_tools.slice().sort(), [
    'memory_overview',
    'record_memory',
    'search_memory'
  ]);
});

test('fixture forbids fake quality, provider latency, raw workspace, and secret surfaces', () => {
  const fixture = loadFixture();

  for (const key of fixture.forbiddenTopLevelKeys) {
    assert.equal(Object.hasOwn(fixture, key), false, key);
    assert.equal(hasNestedKey(fixture, key), false, key);
  }

  assertNoSensitiveSurface(fixture);
});

test('v1 RC validation aggregator fixture test does not rewrite fixture file', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');
  loadFixture();
  const after = fs.readFileSync(fixturePath, 'utf8');

  assert.equal(after, before);
});
