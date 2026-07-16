'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  ADAPTER_MODE,
  INPUT_SCHEMA_VERSION,
  OUTPUT_SCHEMA_VERSION,
  createTagMemoSidecarPersistenceDryRunPlan
} = require('../src/tagmemo/sidecar-persistence-dry-run-adapter');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'tagmemo-sidecar-persistence-dry-run-sprint-e-v1.json'
);
const sourcePath = path.join(__dirname, '..', 'src', 'tagmemo', 'sidecar-persistence-dry-run-adapter.js');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function sorted(values) {
  return [...values].sort();
}

function collectKeys(value, keys = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      keys.push(key);
      collectKeys(nested, keys);
    }
  }
  return keys;
}

function assertNoForbiddenFragments(value, fragments) {
  const serialized = JSON.stringify(value);
  for (const fragment of fragments) {
    assert.equal(serialized.includes(fragment), false, fragment);
  }
}

function assertDryRunPlan(output) {
  assert.equal(output.schemaVersion, OUTPUT_SCHEMA_VERSION);
  assert.equal(output.adapterMode, ADAPTER_MODE);
  assert.equal(output.lowDisclosure, true);
  assert.equal(output.providerCalls, 0);
  assert.equal(output.effectiveRecordMemoryWrites, 0);
  assert.equal(output.persistentTagWrites, 0);
  assert.equal(output.publicMcpExpansion, 0);
  assert.equal(output.dryRunWritePlan.wouldPersist, false);
  assert.equal(output.dryRunWritePlan.persisted, false);
  assert.equal(output.dryRunWritePlan.publicResponse, false);
  assert.equal(output.dryRunWritePlan.publicMcpExpansion, 0);
  assert.equal(output.dryRunWritePlan.rollbackPlan.dryRunOnly, true);
  assert.equal(output.dryRunWritePlan.rollbackPlan.destructiveCleanupApproved, false);
  assert.equal(output.dryRunWritePlan.cleanupPlan.dryRunOnly, true);
  assert.equal(output.dryRunWritePlan.cleanupPlan.wouldDeleteRows, false);
  assert.equal(output.dryRunWritePlan.tombstoneSyncPlan.writeAllowedInContract, false);
}

test('CM1596 dry-run adapter fixture declares no-persistence boundaries', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'tagmemo-sidecar-persistence-dry-run-sprint-e-v1');
  assert.equal(fixture.boundaries.dryRunOnly, true);
  assert.equal(fixture.boundaries.noOpOnly, true);
  assert.equal(fixture.boundaries.persistentTagEnrichment, false);
  assert.equal(fixture.boundaries.persistentTagWrite, false);
  assert.equal(fixture.boundaries.effectiveRecordMemoryWrites, 0);
  assert.equal(fixture.boundaries.providerApiCalls, 0);
  assert.equal(fixture.boundaries.bearerTokenUse, 0);
  assert.equal(fixture.boundaries.rawScan, false);
  assert.equal(fixture.boundaries.broadMemoryScan, false);
  assert.equal(fixture.boundaries.publicMcpExpansion, false);
  assert.equal(fixture.boundaries.productionReleaseCutoverReady, false);
  assert.equal(fixture.boundaries.completeV8Claimed, false);
});

test('CM1596 dry-run adapter preserves seven-tool public MCP surface', () => {
  const fixture = loadFixture();

  assert.deepEqual(sorted(TOOL_DEFINITIONS.map(tool => tool.name)), sorted(fixture.expectedPublicTools));
  assert.equal(TOOL_DEFINITIONS.length, 9);
});

test('CM1596 dry-run adapter produces deterministic plans for fixture cases', () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    const first = createTagMemoSidecarPersistenceDryRunPlan(testCase.input);
    const second = createTagMemoSidecarPersistenceDryRunPlan(testCase.input);

    assert.deepEqual(first, second, testCase.id);
    assertDryRunPlan(first);
    assert.equal(first.rejected, testCase.expected.rejected, testCase.id);
    assert.equal(first.reason, testCase.expected.reason, testCase.id);
    assert.deepEqual(first.dryRunWritePlan.acceptedRows, testCase.expected.acceptedRows, testCase.id);
    assert.deepEqual(first.dryRunWritePlan.rejectedRows, testCase.expected.rejectedRows, testCase.id);
    assert.deepEqual(first.dryRunWritePlan.rejectionReasons, testCase.expected.rejectionReasons, testCase.id);
    assert.equal(
      first.dryRunWritePlan.tombstoneSyncPlan.failClosed,
      testCase.expected.tombstoneFailClosed,
      testCase.id
    );
    assertNoForbiddenFragments(first, fixture.forbiddenFragments);
  }
});

test('CM1596 accepted dry-run plan is reproducible from bounded input metadata', () => {
  const fixture = loadFixture();
  const testCase = fixture.cases.find(item => item.id === 'valid-active-dry-run-plan');
  const output = createTagMemoSidecarPersistenceDryRunPlan(testCase.input);

  assert.equal(testCase.input.schemaVersion, INPUT_SCHEMA_VERSION);
  assert.deepEqual(output.dryRunWritePlan.rollbackPlan.selector, {
    sourceVersion: testCase.input.sourceVersion,
    rollbackToken: testCase.input.rollbackToken,
    cleanupPlanRef: testCase.input.cleanupPlanRef
  });
  assert.equal(output.dryRunWritePlan.cleanupPlan.cleanupPlanRef, testCase.input.cleanupPlanRef);
  assert.equal(output.dryRunWritePlan.tombstoneSyncPlan.tombstoneSyncState, testCase.input.tombstoneSyncState);
});

test('CM1596 forbidden raw/private fields do not enter plan output', () => {
  const fixture = loadFixture();
  const unsafe = fixture.cases.find(item => item.id === 'forbidden-raw-provider-token-rejected');
  const output = createTagMemoSidecarPersistenceDryRunPlan(unsafe.input);
  const keys = collectKeys(output);

  assert.equal(output.rejected, true);
  assert.equal(output.reason, 'forbidden_raw_private_field');
  assert.equal(keys.includes('rawText'), false);
  assert.equal(keys.includes('authorization'), false);
  assert.equal(keys.includes('providerEndpoint'), false);
  assertNoForbiddenFragments(output, fixture.forbiddenFragments);
});

test('CM1596 dry-run adapter source has no persistence or provider imports', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');

  assert.equal(source.includes("require('node:fs')"), false);
  assert.equal(source.includes('MemoryWriteService'), false);
  assert.equal(/require\(['"].*storage/.test(source), false);
  assert.equal(/require\(['"].*sqlite/i.test(source), false);
  assert.equal(/new\s+\w*(?:Store|Database|Client)\b/.test(source), false);
  assert.equal(source.includes('record_memory'), false);
  assert.equal(source.includes('fetch('), false);
  assert.equal(source.includes('axios'), false);
});

test('CM1596 fixture test does not rewrite its fixture file', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');
  loadFixture();
  const after = fs.readFileSync(fixturePath, 'utf8');

  assert.equal(after, before);
});
