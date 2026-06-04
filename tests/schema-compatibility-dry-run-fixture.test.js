const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'schema-compatibility-dry-run-v1.json');

const PUBLIC_MCP_TOOLS = [
  'record_memory',
  'search_memory',
  'memory_overview',
  'audit_memory'
];

const REQUIRED_REPORT_FIELDS = [
  'schema',
  'phase',
  'decision',
  'source',
  'summary',
  'compatibility',
  'families',
  'blockers',
  'warnings',
  'rejectedFlags',
  'publicMcpTools',
  'safety',
  'next'
];

const REQUIRED_REJECTED_FLAGS = [
  'apply',
  'confirm',
  'migrate',
  'write',
  'mutate',
  'import',
  'export',
  'real-memory',
  'provider',
  'start-service',
  'deploy',
  'release',
  'push'
];

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function countByCategory(policyCases, category) {
  return policyCases.filter(policyCase => policyCase.category === category).length;
}

test('schema compatibility dry-run fixture parses as fixture-only contract', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'schema-compatibility-dry-run-v1');
  assert.equal(fixture.version, 'v1');
  assert.equal(fixture.phase, 'P25.5-schema-compatibility-dry-run-fixture-contract');
  assert.equal(fixture.mode, 'fixture-only');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.cliImplemented, false);
  assert.equal(fixture.packageScriptAdded, false);
  assert.equal(fixture.runtimeEnforcementImplemented, false);
  assert.equal(fixture.realMemoryScanned, false);
  assert.equal(fixture.mutated, false);
});

test('sample report exposes the planned output contract fields', () => {
  const fixture = loadFixture();
  const report = fixture.sampleReport;

  assert.deepEqual(fixture.outputContract.requiredTopLevelFields, REQUIRED_REPORT_FIELDS);
  assert.deepEqual(Object.keys(report), REQUIRED_REPORT_FIELDS);
  assert.equal(report.schema, fixture.outputContract.schema);
  assert.ok(fixture.outputContract.decisionLabels.includes(report.decision));
  assert.equal(report.source.mode, 'fixture');
  assert.equal(report.source.realMemoryScanned, false);
});

test('accepted, missing, and unknown policy counts match fixture cases', () => {
  const fixture = loadFixture();
  const report = fixture.sampleReport;

  assert.equal(report.summary.familiesChecked, report.families.length);
  assert.equal(report.summary.policyCaseCount, fixture.policyCases.length);
  assert.equal(report.summary.acceptedPolicyCount, countByCategory(fixture.policyCases, 'accepted_current_version'));
  assert.equal(report.summary.missingPolicyCount, countByCategory(fixture.policyCases, 'missing_version'));
  assert.equal(report.summary.unknownPolicyCount, countByCategory(fixture.policyCases, 'unknown_version'));
  assert.equal(report.summary.acceptedPolicyCount, 7);
  assert.equal(report.summary.missingPolicyCount, 7);
  assert.equal(report.summary.unknownPolicyCount, 7);
  assert.equal(report.summary.warningCount, report.warnings.length);
  assert.equal(report.summary.blockerCount, report.blockers.length);

  for (const policyCase of fixture.policyCases) {
    assert.equal(policyCase.expectedMutated, false, policyCase.id);
  }
});

test('sample report fails closed when blocker entries are present', () => {
  const report = loadFixture().sampleReport;

  assert.ok(report.summary.blockerCount > 0);
  assert.equal(report.decision, 'DRY_RUN_BLOCKED');
  assert.ok(report.blockers.some(blocker => blocker.id === 'runtime-enforcement-not-implemented'));
});

test('family policy covers accepted versions without migration apply', () => {
  const fixture = loadFixture();
  const report = fixture.sampleReport;

  for (const family of report.families) {
    assert.ok(family.currentVersion, family.name);
    assert.ok(family.acceptedVersions.includes(family.currentVersion), family.name);
    assert.equal(family.requiresMigrationApply, false, family.name);
    assert.ok(family.missingVersionPolicy, family.name);
    assert.ok(family.unknownVersionPolicy, family.name);
  }
});

test('safety flags stay dry-run and non-mutating', () => {
  const { safety } = loadFixture().sampleReport;

  assert.equal(safety.dryRun, true);
  assert.equal(safety.mutated, false);
  assert.equal(safety.providerCalls, 0);
  assert.equal(safety.durableMemoryTouched, false);
  assert.equal(safety.realMemoryScanned, false);
  assert.equal(safety.serviceStarted, false);
  assert.equal(safety.migrationApplied, false);
  assert.equal(safety.importExportApplied, false);
  assert.equal(safety.backupCreated, false);
  assert.equal(safety.runtimeEnforcementChanged, false);
  assert.equal(safety.packageChanged, false);
  assert.equal(safety.configChanged, false);
  assert.equal(safety.publicMcpExpanded, false);
  assert.equal(safety.pushed, false);
  assert.equal(safety.tagged, false);
  assert.equal(safety.released, false);
  assert.equal(safety.deployed, false);
  assert.equal(safety.credentialValuesExposed, false);
  assert.equal(safety.rawWorkspaceIdsExposed, false);
});

test('public MCP tools remain frozen to the three-tool contract', () => {
  const report = loadFixture().sampleReport;

  assert.equal(report.publicMcpTools.frozen, true);
  assert.deepEqual(report.publicMcpTools.tools, PUBLIC_MCP_TOOLS);
  assert.equal(report.safety.publicMcpExpanded, false);
});

test('dry-run contract rejects apply-like and remote side-effect flags', () => {
  const report = loadFixture().sampleReport;
  const rejectedFlags = report.rejectedFlags.map(flag => flag.replace(/^--/, ''));

  for (const requiredFlag of REQUIRED_REJECTED_FLAGS) {
    assert.ok(rejectedFlags.includes(requiredFlag), requiredFlag);
  }

  assert.equal(report.summary.rejectedFlagCount, report.rejectedFlags.length);
  assert.equal(report.rejectedFlags.length, REQUIRED_REJECTED_FLAGS.length);
});

test('fixture text does not expose raw secrets or raw workspace identifiers', () => {
  const fixtureText = fs.readFileSync(fixturePath, 'utf8');
  const fixture = JSON.parse(fixtureText);

  assert.equal(/password\s*[=:]/i.test(fixtureText), false);
  assert.equal(/bearer\s+[a-z0-9._-]+/i.test(fixtureText), false);
  assert.equal(/api[_-]?key\s*[=:]/i.test(fixtureText), false);
  assert.equal(/authorization\s*:/i.test(fixtureText), false);
  assert.equal(/raw_workspace_id/i.test(fixtureText), false);
  assert.equal(/workspace-[a-z0-9-]{8,}/i.test(fixtureText), false);
  assert.equal(/"workspace_id"\s*:/i.test(fixtureText), false);
  assert.equal(fixture.sampleReport.safety.credentialValuesExposed, false);
  assert.equal(fixture.sampleReport.safety.rawWorkspaceIdsExposed, false);
});
