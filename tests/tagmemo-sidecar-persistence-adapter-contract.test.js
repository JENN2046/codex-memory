'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'tagmemo-sidecar-persistence-adapter-sprint-e-v1.json'
);

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

function isBoundedId(value, prefix) {
  return typeof value === 'string'
    && value.startsWith(`${prefix}:`)
    && /^[a-z-]+:[a-z0-9:_-]+$/i.test(value)
    && !/[\\/]/.test(value)
    && !/^[A-Za-z]:[\\/]/.test(value);
}

function assertNoForbiddenSurface(value, fixture) {
  const keys = collectKeys(value);
  for (const key of fixture.contract.forbiddenRawPrivateKeys) {
    assert.equal(keys.includes(key), false, key);
  }

  const serialized = JSON.stringify(value);
  for (const fragment of fixture.contract.forbiddenValueFragments) {
    assert.equal(serialized.includes(fragment), false, fragment);
  }
}

function hasForbiddenSurface(value, fixture) {
  const keys = collectKeys(value);
  if (fixture.contract.forbiddenRawPrivateKeys.some(key => keys.includes(key))) {
    return true;
  }

  const serialized = JSON.stringify(value);
  return fixture.contract.forbiddenValueFragments.some(fragment => serialized.includes(fragment));
}

function assertRequiredFields(value, fields, label) {
  for (const field of fields) {
    assert.equal(Object.prototype.hasOwnProperty.call(value, field), true, `${label}:${field}`);
  }
}

function validateAdapterInput(input, fixture) {
  assertRequiredFields(input, fixture.contract.requiredInputFields, 'input');
  assert.equal(input.schemaVersion, fixture.contract.inputSchemaVersion);
  assert.equal(input.adapterMode, fixture.contract.adapterMode);
  assert.equal(isBoundedId(input.rollbackToken, 'rollback'), true);
  assert.equal(isBoundedId(input.cleanupPlanRef, 'cleanup-plan'), true);
  assert.equal(fixture.contract.allowedTombstoneSyncStates.includes(input.tombstoneSyncState), true);

  const tag = input.boundedTagProjection;
  assert.equal(tag.schemaVersion, 'tagmemo-sidecar-tag-record-v1');
  assert.equal(isBoundedId(tag.tagRecordId, 'sidecar-tag'), true);
  assert.equal(isBoundedId(tag.memoryId, 'memory'), true);
  assert.equal(isBoundedId(tag.tagId, 'tag'), true);
  assert.equal(typeof tag.tagLabel, 'string');
  assert.equal(Number.isFinite(tag.confidenceScore), true);
  assert.equal(tag.confidenceScore >= 0 && tag.confidenceScore <= 1, true);
  assert.match(tag.derivedFromProjectionHash, /^sha256:[a-f0-9]{64}$/i);

  return true;
}

function validateAdapterOutput(output, fixture) {
  assertRequiredFields(output, fixture.contract.requiredOutputFields, 'output');
  assert.equal(output.schemaVersion, fixture.contract.outputSchemaVersion);
  assert.equal(output.adapterMode, fixture.contract.adapterMode);
  assert.equal(Array.isArray(output.acceptedRows), true);
  assert.equal(Array.isArray(output.rejectedRows), true);
  assert.equal(Array.isArray(output.rejectionReasons), true);
  assert.equal(output.rollbackPlan.dryRunOnly, true);
  assert.equal(output.rollbackPlan.destructiveCleanupApproved, false);
  assert.equal(output.cleanupPlan.dryRunOnly, true);
  assert.equal(output.cleanupPlan.wouldDeleteRows, false);
  assert.equal(output.tombstoneSyncPlan.writeAllowedInContract, false);
  assert.equal(output.wouldPersist, false);
  assert.equal(output.persisted, false);
  assert.equal(output.publicResponse, false);
  assert.equal(output.publicMcpExpansion, 0);
  assertNoForbiddenSurface(output, fixture);

  return true;
}

test('CM1594 adapter fixture declares contract-only no-write boundaries', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'tagmemo-sidecar-persistence-adapter-sprint-e-v1');
  assert.equal(fixture.boundaries.contractOnly, true);
  assert.equal(fixture.boundaries.testOnly, true);
  assert.equal(fixture.boundaries.adapterImplementationStarted, false);
  assert.equal(fixture.boundaries.persistentTagEnrichment, false);
  assert.equal(fixture.boundaries.persistentTagWrite, false);
  assert.equal(fixture.boundaries.providerApiCalls, 0);
  assert.equal(fixture.boundaries.bearerTokenUse, 0);
  assert.equal(fixture.boundaries.rawScan, false);
  assert.equal(fixture.boundaries.broadMemoryScan, false);
  assert.equal(fixture.boundaries.liveProof, false);
  assert.equal(fixture.boundaries.confirmedMutation, false);
  assert.equal(fixture.boundaries.publicMcpExpansion, false);
  assert.equal(fixture.boundaries.effectiveRecordMemoryWrites, 0);
  assert.equal(fixture.boundaries.productionReleaseCutoverReady, false);
  assert.equal(fixture.boundaries.completeV8Claimed, false);
});

test('CM1594 adapter contract preserves seven-tool public MCP surface', () => {
  const fixture = loadFixture();

  assert.deepEqual(sorted(TOOL_DEFINITIONS.map(tool => tool.name)), sorted(fixture.expectedPublicTools));
  assert.equal(TOOL_DEFINITIONS.length, 9);
});

test('CM1594 adapter inputs use bounded tag projection only', () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    assert.equal(validateAdapterInput(testCase.input, fixture), true, testCase.id);
    assert.equal(Object.prototype.hasOwnProperty.call(testCase.input, 'rawMemoryRecord'), false, testCase.id);
    assert.equal(Object.prototype.hasOwnProperty.call(testCase.input, 'providerPayload'), false, testCase.id);
    assert.equal(Object.prototype.hasOwnProperty.call(testCase.input, 'storageHandle'), false, testCase.id);
  }
});

test('CM1594 adapter outputs are dry-run contract plans only', () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    const output = testCase.expectedOutput;

    assert.equal(validateAdapterOutput(output, fixture), true, testCase.id);
    assert.deepEqual(
      sorted(Object.keys(output.rollbackPlan.selector)),
      sorted(['sourceVersion', 'rollbackToken', 'cleanupPlanRef']),
      testCase.id
    );
  }
});

test('CM1594 rollback and cleanup plans are reproducible from bounded input metadata', () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    const input = testCase.input;
    const output = testCase.expectedOutput;

    assert.deepEqual(output.rollbackPlan.selector, {
      sourceVersion: input.sourceVersion,
      rollbackToken: input.rollbackToken,
      cleanupPlanRef: input.cleanupPlanRef
    }, testCase.id);
    assert.equal(output.cleanupPlan.cleanupPlanRef, input.cleanupPlanRef, testCase.id);
  }
});

test('CM1594 tombstone sync state is deterministic and fail-closed when unsafe', () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    const input = testCase.input;
    const output = testCase.expectedOutput;

    assert.equal(output.tombstoneSyncPlan.tombstoneSyncState, input.tombstoneSyncState, testCase.id);
    if (input.tombstoneSyncState !== 'active' || output.rejectedRows.length > 0) {
      assert.equal(output.tombstoneSyncPlan.failClosed, true, testCase.id);
    }
    assert.equal(output.tombstoneSyncPlan.writeAllowedInContract, false, testCase.id);
  }
});

test('CM1594 forbidden raw/provider/token input is represented only in rejected input and stripped from output', () => {
  const fixture = loadFixture();
  const unsafe = fixture.cases.find(testCase => testCase.id === 'forbidden-raw-provider-token-rejected');
  const safeCases = fixture.cases.filter(testCase => testCase.id !== unsafe.id);

  assert.equal(hasForbiddenSurface(unsafe.input, fixture), true);
  assertNoForbiddenSurface(unsafe.expectedOutput, fixture);

  for (const testCase of safeCases) {
    assert.equal(hasForbiddenSurface(testCase.input, fixture), false, testCase.id);
    assertNoForbiddenSurface(testCase.expectedOutput, fixture);
  }
});

test('CM1594 fixture test does not rewrite its fixture file', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');
  loadFixture();
  const after = fs.readFileSync(fixturePath, 'utf8');

  assert.equal(after, before);
});
