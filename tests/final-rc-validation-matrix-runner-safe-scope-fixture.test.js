const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'final-rc-validation-matrix-runner-safe-scope-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const PUBLIC_MCP_TOOLS = [
  'record_memory',
  'search_memory',
  'memory_overview'
];

const REQUIRED_TOP_LEVEL_FIELDS = [
  'allowedInputClasses',
  'blockers',
  'decision',
  'finalRcMatrixExecuted',
  'fixtureOnly',
  'forbiddenFragments',
  'matrixGroups',
  'mode',
  'next',
  'phase',
  'publicMcpTools',
  'rejectedActions',
  'requiredRejectionDefaults',
  'runnerExecuted',
  'runnerImplemented',
  'safety',
  'schemaVersion',
  'sourceContract',
  'synthetic',
  'version'
];

const REQUIRED_REJECTED_ACTIONS = [
  'start-service',
  'refresh-live',
  'provider',
  'real-memory-scan',
  'memory-preview',
  'import',
  'export',
  'migrate',
  'apply',
  'backup',
  'restore',
  'config-switch',
  'package-script',
  'public-mcp-expand',
  'push',
  'tag',
  'release',
  'deploy'
];

test('P30.1 fixture parses and locks the top-level manifest contract', () => {
  assert.equal(fixture.schemaVersion, 'final-rc-validation-matrix-runner-safe-scope-v1');
  assert.equal(fixture.version, 'v1');
  assert.equal(fixture.phase, 'P30.1-final-rc-validation-matrix-runner-fixture-contract');
  assert.equal(fixture.mode, 'fixture-only');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.deepEqual(Object.keys(fixture).sort(), REQUIRED_TOP_LEVEL_FIELDS.sort());
});

test('P30.1 fixture does not claim runner implementation or final matrix execution', () => {
  assert.equal(fixture.runnerImplemented, false);
  assert.equal(fixture.runnerExecuted, false);
  assert.equal(fixture.finalRcMatrixExecuted, false);
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.ok(fixture.blockers.some(blocker => blocker.id === 'full-final-rc-matrix-not-executed'));
  assert.ok(fixture.blockers.some(blocker => blocker.id === 'final-rc-matrix-runner-not-implemented'));
});

test('source contract accepts only explicit safe local or committed evidence', () => {
  assert.deepEqual(fixture.sourceContract.acceptedSourceTypes, [
    'committed_validation',
    'local_validation',
    'committed_fixture',
    'committed_report_shape'
  ]);
  assert.equal(fixture.sourceContract.mode, 'explicit_safe_inputs_only');
  assert.equal(fixture.sourceContract.readsFiles, false);
  assert.equal(fixture.sourceContract.executesCommands, false);
  assert.equal(fixture.sourceContract.startsServices, false);
  assert.equal(fixture.sourceContract.callsProviders, false);
  assert.equal(fixture.sourceContract.mutatesDurableState, false);
  assert.equal(fixture.sourceContract.acceptsRealMemoryPreview, false);
});

test('allowed input classes stay explicit, fixture-backed, or report-shape only', () => {
  const inputIds = fixture.allowedInputClasses.map(input => input.id);

  assert.deepEqual(inputIds, [
    'git-hygiene-summary',
    'docs-validation-summary',
    'p23-matrix-docs',
    'validation-aggregator-report',
    'p28-validation-evidence-reader',
    'p29-schema-version-boundary-evidence',
    'migration-import-export-fixture-evidence'
  ]);
  assert.equal(
    fixture.allowedInputClasses.every(input => input.source !== 'live_service' && input.source !== 'real_memory'),
    true
  );
});

test('matrix groups preserve A4, conditional live, runtime-required, and A5 split', () => {
  assert.ok(fixture.matrixGroups.a4Safe.includes('gitHygiene'));
  assert.ok(fixture.matrixGroups.a4Safe.includes('validationAggregatorReportShape'));
  assert.ok(fixture.matrixGroups.conditionalLive.includes('health'));
  assert.ok(fixture.matrixGroups.runtimeRequired.includes('schemaVersionRuntimeEnforcement'));
  assert.ok(fixture.matrixGroups.runtimeRequired.includes('finalRcMatrixRunnerImplementation'));
  assert.ok(fixture.matrixGroups.a5Gated.includes('providerExecution'));
  assert.ok(fixture.matrixGroups.a5Gated.includes('pushTagReleaseDeploy'));
});

test('P30.1 fixture requires fail-closed defaults for unsafe or insufficient evidence', () => {
  for (const reason of [
    'missing_explicit_evidence',
    'stale_evidence',
    'failed_or_blocked_evidence',
    'unsupported_source_type',
    'side_effect_evidence',
    'sensitive_fragment',
    'real_memory_preview',
    'durable_mutation',
    'public_mcp_expansion',
    'remote_write'
  ]) {
    assert.ok(fixture.requiredRejectionDefaults.includes(reason), reason);
  }
});

test('P30.1 fixture rejects live, provider, migration, config, package, MCP, and remote actions', () => {
  assert.deepEqual(fixture.rejectedActions, REQUIRED_REJECTED_ACTIONS);
});

test('safety flags prove the fixture has no side effects', () => {
  assert.equal(fixture.safety.mutated, false);
  assert.equal(fixture.safety.providerCalls, 0);
  assert.equal(fixture.safety.serviceStarted, false);
  assert.equal(fixture.safety.durableMemoryTouched, false);
  assert.equal(fixture.safety.realMemoryPreview, false);
  assert.equal(fixture.safety.realMemoryScanned, false);
  assert.equal(fixture.safety.migrationApplied, false);
  assert.equal(fixture.safety.importExportApplied, false);
  assert.equal(fixture.safety.backupCreated, false);
  assert.equal(fixture.safety.restorePerformed, false);
  assert.equal(fixture.safety.packageChanged, false);
  assert.equal(fixture.safety.configChanged, false);
  assert.equal(fixture.safety.publicMcpExpanded, false);
  assert.equal(fixture.safety.pushed, false);
  assert.equal(fixture.safety.tagged, false);
  assert.equal(fixture.safety.released, false);
  assert.equal(fixture.safety.deployed, false);
  assert.equal(fixture.safety.rawSecretExposed, false);
  assert.equal(fixture.safety.rawWorkspaceIdExposed, false);
});

test('public MCP tools remain frozen to the three-tool contract', () => {
  assert.deepEqual(fixture.publicMcpTools, PUBLIC_MCP_TOOLS);
});

test('fixture text does not expose raw secrets or raw workspace identifiers', () => {
  for (const fragment of fixture.forbiddenFragments) {
    assert.equal(fixtureText.toLowerCase().includes(fragment), true, `fixture should document forbidden fragment ${fragment}`);
  }

  const scannedText = JSON.stringify({
    ...fixture,
    forbiddenFragments: []
  }).toLowerCase();

  for (const fragment of fixture.forbiddenFragments) {
    assert.equal(scannedText.includes(fragment), false, fragment);
  }
  assert.equal(/workspace-[a-z0-9-]{8,}/i.test(scannedText), false);
  assert.equal(/"workspace_id"\s*:/i.test(scannedText), false);
});

test('reading the fixture does not rewrite it', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
