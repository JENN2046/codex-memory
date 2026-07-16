const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'schema-version-policy-v1.json');

const REQUIRED_FAMILIES = [
  'mcp_contract',
  'memory_record',
  'audit_event',
  'lifecycle_policy',
  'import_export_envelope',
  'migration_readiness_report',
  'validation_aggregator_report'
];

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function familyMap(fixture) {
  return new Map(fixture.schemaFamilies.map(family => [family.name, family]));
}

test('schema version policy fixture parses with no side effects', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'schema-version-policy-v1');
  assert.equal(fixture.version, 'v1');
  assert.equal(fixture.phase, 'P25.2-schema-version-policy-fixture-tests');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.runtimeEnforcementImplemented, false);
  assert.equal(fixture.sqliteMigrationImplemented, false);
  assert.equal(fixture.importExportApplyImplemented, false);
  assert.equal(fixture.mutated, false);
  assert.equal(fixture.durableMemoryTouched, false);
});

test('schema families are complete and unique', () => {
  const fixture = loadFixture();
  const names = fixture.schemaFamilies.map(family => family.name);

  assert.deepEqual(names, REQUIRED_FAMILIES);
  assert.equal(new Set(names).size, names.length);
});

test('current versions are accepted for every schema family', () => {
  const fixture = loadFixture();

  for (const family of fixture.schemaFamilies) {
    assert.ok(family.currentVersion, family.name);
    assert.ok(family.acceptedVersions.includes(family.currentVersion), family.name);
    assert.equal(family.requiresMigrationApply, false, family.name);
  }
});

test('public MCP tools remain frozen to the three-tool contract', () => {
  const fixture = loadFixture();

  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.publicTools, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);

  const families = familyMap(fixture);
  assert.equal(families.get('mcp_contract').fallbackSafe, false);
  assert.match(families.get('mcp_contract').unknownVersionReadPolicy, /reject/);
});

test('legacy durable records may read with fallback but new writes require versions', () => {
  const fixture = loadFixture();
  const cases = new Map(fixture.policyCases.map(policyCase => [policyCase.id, policyCase]));

  const legacyRead = cases.get('missing-memory-record-read-fallback');
  assert.equal(legacyRead.expectedDecision, 'allow_with_fallback');
  assert.equal(legacyRead.expectedFallbackVersion, 'v1');
  assert.equal(legacyRead.expectedMutated, false);

  const missingWrite = cases.get('missing-memory-record-new-write');
  assert.equal(missingWrite.expectedDecision, 'reject');
  assert.equal(missingWrite.expectedErrorCode, 'schema_version_required');
  assert.equal(missingWrite.expectedMutated, false);
});

test('unknown versions fail closed for writes and gate reports', () => {
  const fixture = loadFixture();
  const cases = new Map(fixture.policyCases.map(policyCase => [policyCase.id, policyCase]));

  const unknownWrite = cases.get('unknown-memory-record-new-write');
  assert.equal(unknownWrite.expectedDecision, 'reject');
  assert.equal(unknownWrite.expectedErrorCode, 'unsupported_schema_version');

  const gateReport = cases.get('unknown-validation-aggregator-report');
  assert.equal(gateReport.expectedDecision, 'reject');
  assert.equal(gateReport.expectedErrorCode, 'unsupported_schema_version');
});

test('unknown durable read remains non-mutating and does not require migration apply', () => {
  const fixture = loadFixture();
  const cases = new Map(fixture.policyCases.map(policyCase => [policyCase.id, policyCase]));

  const unknownRead = cases.get('unknown-memory-record-read');
  assert.equal(unknownRead.expectedDecision, 'warn_and_skip_unsafe_fields');
  assert.equal(unknownRead.expectedMutated, false);
  assert.equal(unknownRead.requiresMigrationApply, false);
});

test('import preview requires an explicit envelope version', () => {
  const fixture = loadFixture();
  const cases = new Map(fixture.policyCases.map(policyCase => [policyCase.id, policyCase]));
  const importPreview = cases.get('missing-import-envelope-preview');

  assert.equal(importPreview.operation, 'import_preview');
  assert.equal(importPreview.expectedDecision, 'reject');
  assert.equal(importPreview.expectedErrorCode, 'schema_version_required');
  assert.equal(importPreview.expectedMutated, false);
});

test('safety flags forbid side effects, exposure, and publication', () => {
  const fixture = loadFixture();
  const safety = fixture.safety;

  assert.equal(safety.mutated, false);
  assert.equal(safety.providerCalls, 0);
  assert.equal(safety.durableMemoryTouched, false);
  assert.equal(safety.serviceStarted, false);
  assert.equal(safety.sqliteMigrationApplied, false);
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
  assert.equal(safety.rawSecretExposed, false);
  assert.equal(safety.rawWorkspaceIdExposed, false);
});

test('fixture text does not expose raw secrets or raw workspace ids', () => {
  const fixtureText = fs.readFileSync(fixturePath, 'utf8');
  const fixture = JSON.parse(fixtureText);

  assert.equal(/password=|api[_-]?key|bearer\s+|raw_workspace_id|workspace-[a-z0-9-]{8,}/i.test(fixtureText), false);
  assert.equal(fixture.safety.rawSecretExposed, false);
  assert.equal(fixture.safety.rawWorkspaceIdExposed, false);
});
