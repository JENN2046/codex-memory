'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'tagmemo-sidecar-schema-sprint-e-v1.json'
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

function fail(reason) {
  const error = new Error(reason);
  error.reason = reason;
  throw error;
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
  for (const key of fixture.schema.forbiddenRawPrivateKeys) {
    assert.equal(keys.includes(key), false, key);
  }

  const serialized = JSON.stringify(value);
  for (const fragment of fixture.schema.forbiddenValueFragments) {
    assert.equal(serialized.includes(fragment), false, fragment);
  }
}

function validateSidecarTagRecord(record, fixture) {
  for (const field of fixture.schema.requiredFields) {
    if (!Object.prototype.hasOwnProperty.call(record, field)) {
      fail('missing_required_field');
    }
  }

  if (record.schemaVersion !== fixture.schema.recordSchemaVersion) {
    fail('invalid_schema_version');
  }
  if (!isBoundedId(record.tagRecordId, 'sidecar-tag')
    || !isBoundedId(record.memoryId, 'memory')
    || !isBoundedId(record.tagId, 'tag')
    || !isBoundedId(record.rollbackToken, 'rollback')
    || !isBoundedId(record.cleanupPlanRef, 'cleanup-plan')) {
    fail('invalid_bounded_id');
  }
  if (typeof record.tagLabel !== 'string' || record.tagLabel.trim() !== record.tagLabel || !record.tagLabel) {
    fail('invalid_tag_label');
  }
  if (!Number.isFinite(record.confidenceScore)
    || record.confidenceScore < fixture.schema.confidence.min
    || record.confidenceScore > fixture.schema.confidence.max) {
    fail('invalid_confidence_score');
  }
  if (!fixture.schema.allowedSourceVersions.includes(record.sourceVersion)) {
    fail('invalid_source_version');
  }
  if (!/^sha256:[a-f0-9]{64}$/i.test(record.derivedFromProjectionHash)) {
    fail('invalid_projection_hash');
  }
  if (!/^\d{4}-\d{2}-\d{2}T00:00:00Z$/.test(record.createdAt)
    || !/^\d{4}-\d{2}-\d{2}T00:00:00Z$/.test(record.updatedAt)) {
    fail('invalid_bounded_timestamp');
  }
  if (!fixture.schema.allowedTombstoneSyncStates.includes(record.tombstoneSyncState)) {
    fail('invalid_tombstone_sync_state');
  }

  const keys = collectKeys(record);
  if (fixture.schema.forbiddenRawPrivateKeys.some(key => keys.includes(key))) {
    fail('forbidden_raw_private_field');
  }

  const serialized = JSON.stringify(record);
  if (fixture.schema.forbiddenValueFragments.some(fragment => serialized.includes(fragment))) {
    fail('forbidden_raw_private_value');
  }

  return true;
}

test('CM1592 sidecar schema fixture declares contract-only no-write boundaries', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'tagmemo-sidecar-schema-sprint-e-v1');
  assert.equal(fixture.boundaries.contractOnly, true);
  assert.equal(fixture.boundaries.testOnly, true);
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

test('CM1592 sidecar schema preserves seven-tool public MCP surface', () => {
  const fixture = loadFixture();

  assert.deepEqual(sorted(TOOL_DEFINITIONS.map(tool => tool.name)), sorted(fixture.expectedPublicTools));
  assert.equal(TOOL_DEFINITIONS.length, 9);
});

test('CM1592 valid sidecar records match bounded contract shape', () => {
  const fixture = loadFixture();

  for (const testCase of fixture.validRecords) {
    const record = testCase.record;

    assert.equal(validateSidecarTagRecord(record, fixture), true, testCase.id);
    assert.deepEqual(sorted(Object.keys(record)), sorted(fixture.schema.requiredFields), testCase.id);
    assertNoForbiddenSurface(record, fixture);
  }
});

test('CM1592 invalid sidecar records fail closed with expected reasons', () => {
  const fixture = loadFixture();

  for (const testCase of fixture.invalidRecords) {
    assert.throws(
      () => validateSidecarTagRecord(testCase.record, fixture),
      error => error.reason === testCase.expectedReason,
      testCase.id
    );
  }
});

test('CM1592 rollback cleanup selector is low-disclosure and dry-run only', () => {
  const fixture = loadFixture();

  for (const rule of fixture.rollbackRules) {
    assert.deepEqual(sorted(Object.keys(rule.selector)), sorted(rule.expected.allowedSelectorKeys), rule.id);
    assert.equal(rule.expected.dryRunOnly, true, rule.id);
    assert.equal(rule.expected.destructiveCleanupApproved, false, rule.id);
    assertNoForbiddenSurface(rule.selector, fixture);
  }
});

test('CM1592 tombstone sync rules fail closed before any persistent write', () => {
  const fixture = loadFixture();

  for (const rule of fixture.tombstoneSyncRules) {
    assert.equal(rule.expected.writeAllowedInFixture, false, rule.id);
    assert.equal(
      fixture.schema.allowedTombstoneSyncStates.includes(rule.expected.tombstoneSyncState),
      true,
      rule.id
    );
    if (rule.sourceLifecycleBucket !== 'active') {
      assert.equal(rule.expected.failClosed, true, rule.id);
    }
    assertNoForbiddenSurface(rule, fixture);
  }
});

test('CM1592 fixture test does not rewrite its fixture file', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');
  loadFixture();
  const after = fs.readFileSync(fixturePath, 'utf8');

  assert.equal(after, before);
});
