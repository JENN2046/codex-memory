const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  PUBLIC_MCP_TOOLS,
  SCHEMA_VERSION_POLICY_ERRORS,
  createSchemaVersionPolicy,
  evaluateSchemaVersionPolicyCase,
  isMissingVersion,
  isWriteOperation,
  normalizeSchemaVersionPolicy,
  summarizeSchemaVersionPolicy
} = require('../src/core/SchemaVersionPolicy');

const fixturePath = path.join(__dirname, 'fixtures', 'schema-version-policy-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function createPolicy() {
  return createSchemaVersionPolicy(loadFixture());
}

function assertNoSideEffects(result) {
  assert.equal(result.mutated, false);
  assert.equal(result.requiresMigrationApply, false);
  assert.equal(result.runtimeEnforcementImplemented, false);
  assert.equal(result.runtimeEnforcementChanged, false);
  assert.equal(result.durableMemoryTouched, false);
  assert.equal(result.realMemoryScanned, false);
  assert.equal(result.providerCalls, 0);
}

test('schema version policy helper summarizes explicit fixture input without side effects', () => {
  const fixture = loadFixture();
  const summary = summarizeSchemaVersionPolicy(fixture);

  assert.equal(summary.sourceMode, 'explicit_input');
  assert.equal(summary.runtimeEnforcementImplemented, false);
  assert.equal(summary.policyRuntimeEnforcementImplemented, false);
  assert.equal(summary.familyCount, fixture.schemaFamilies.length);
  assert.deepEqual(summary.publicMcpTools, {
    frozen: true,
    tools: PUBLIC_MCP_TOOLS
  });
  assert.equal(summary.mutated, false);
  assert.equal(summary.runtimeEnforcementChanged, false);
  assert.equal(summary.durableMemoryTouched, false);
  assert.equal(summary.realMemoryScanned, false);
  assert.equal(summary.providerCalls, 0);
  assert.equal(summary.publicMcpExpanded, false);
  assert.deepEqual(
    summary.families.map(family => family.name),
    fixture.schemaFamilies.map(family => family.name)
  );
});

test('schema version policy helper normalizes without mutating explicit input', () => {
  const fixture = loadFixture();
  const before = JSON.stringify(fixture);
  const normalized = normalizeSchemaVersionPolicy(fixture);
  const result = evaluateSchemaVersionPolicyCase(fixture, fixture.policyCases[0]);

  assert.equal(normalized.schemaFamilies.length, fixture.schemaFamilies.length);
  assert.equal(result.decision, fixture.policyCases[0].expectedDecision);
  assert.equal(JSON.stringify(fixture), before);
});

test('schema version policy helper accepts every declared current version', () => {
  const fixture = loadFixture();
  const policy = createSchemaVersionPolicy(fixture);

  for (const family of fixture.schemaFamilies) {
    const result = policy.evaluate({
      schemaFamily: family.name,
      operation: 'read',
      inputVersion: family.currentVersion
    });

    assert.equal(result.decision, 'allow', family.name);
    assert.equal(result.accepted, true, family.name);
    assert.equal(result.errorCode, null, family.name);
    assertNoSideEffects(result);
  }
});

test('schema version policy helper evaluation does not perform implicit fixture reads', () => {
  const fixture = loadFixture();
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    throw new Error('unexpected fs read during schema policy evaluation');
  };

  try {
    const result = evaluateSchemaVersionPolicyCase(fixture, {
      schemaFamily: 'memory_record',
      operation: 'read',
      inputVersion: 'v1'
    });

    assert.equal(result.decision, 'allow');
    assertNoSideEffects(result);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});

test('schema version policy helper evaluates committed policy cases', () => {
  const fixture = loadFixture();
  const policy = createSchemaVersionPolicy(fixture);

  for (const policyCase of fixture.policyCases) {
    const result = policy.evaluate(policyCase);

    assert.equal(result.schemaFamily, policyCase.schemaFamily, policyCase.id);
    assert.equal(result.operation, policyCase.operation, policyCase.id);
    assert.equal(result.decision, policyCase.expectedDecision, policyCase.id);
    assert.equal(result.errorCode || null, policyCase.expectedErrorCode || null, policyCase.id);
    assert.equal(result.fallbackVersion || null, policyCase.expectedFallbackVersion || null, policyCase.id);
    assertNoSideEffects(result);
  }
});

test('schema version policy helper fails closed for unknown schema families', () => {
  const policy = createPolicy();
  const result = policy.evaluate({
    schemaFamily: 'unknown_family',
    operation: 'read',
    inputVersion: 'v1'
  });

  assert.equal(result.decision, 'reject');
  assert.equal(result.accepted, false);
  assert.equal(result.errorCode, SCHEMA_VERSION_POLICY_ERRORS.UNKNOWN_SCHEMA_FAMILY);
  assertNoSideEffects(result);
});

test('schema version policy helper exposes pure operation predicates', () => {
  assert.equal(isMissingVersion(null), true);
  assert.equal(isMissingVersion(undefined), true);
  assert.equal(isMissingVersion(''), true);
  assert.equal(isMissingVersion('v1'), false);
  assert.equal(isWriteOperation('write'), true);
  assert.equal(isWriteOperation('policy_write'), true);
  assert.equal(isWriteOperation('read'), false);
  assert.equal(isWriteOperation('import_preview'), false);
});
