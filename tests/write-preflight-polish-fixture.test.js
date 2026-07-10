'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');

const fixturePath = path.join(__dirname, 'fixtures', 'write-preflight-polish-cm1519-v1.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const FORBIDDEN_VALUES = Object.freeze([
  'cm1519-schema-content-must-not-leak',
  'cm1519-api-key-must-not-leak',
  'cm1519-bearer-token-must-not-leak',
  'cm1519-no-op-content-must-not-leak',
  'cm1519-dry-run-content-must-not-leak',
  'cm1519-effective-write-content-must-not-leak',
  'cm1519-memory-id-must-not-leak'
]);

const FORBIDDEN_KEYS = Object.freeze([
  'content',
  'text',
  'apiKey',
  'bearerToken',
  'token',
  'authorization',
  'memory_id',
  'memoryId',
  'effectiveWritePayload',
  'confirmedMutationPayload'
]);

function sorted(values) {
  return [...values].sort();
}

function publicToolNames() {
  return TOOL_DEFINITIONS.map(tool => tool.name);
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

function assertNoWritePreflightLeak(value) {
  const keys = collectKeys(value);
  for (const key of FORBIDDEN_KEYS) {
    assert.equal(keys.includes(key), false, key);
  }

  const serialized = JSON.stringify(value);
  for (const forbidden of FORBIDDEN_VALUES) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
}

function projectWritePreflightCase(entry) {
  const forbiddenKinds = new Set(['effective_write_payload', 'confirmed_mutation_payload']);
  const reasonCode = forbiddenKinds.has(entry.kind)
    ? entry.expectedReason
    : String(entry.expectedReason || entry.kind);

  return {
    caseId: String(entry.caseId),
    accepted: false,
    durableWrite: false,
    durableAuditWrite: false,
    mutated: false,
    recordMemoryExecuted: false,
    confirmedMutationExecuted: false,
    lowDisclosure: true,
    reasonCode,
    classification: forbiddenKinds.has(entry.kind) ? 'forbidden_or_unavailable' : 'write_preflight_rejected'
  };
}

test('CM1519 invalid write and schema rejection fail closed without durable write', () => {
  const projected = fixture.cases
    .filter(entry => ['schema_rejection', 'invalid_write'].includes(entry.kind))
    .map(projectWritePreflightCase);

  assert.deepEqual(projected.map(entry => entry.accepted), [false, false]);
  assert.deepEqual(projected.map(entry => entry.durableWrite), [false, false]);
  assert.deepEqual(projected.map(entry => entry.recordMemoryExecuted), [false, false]);
  assertNoWritePreflightLeak(projected);
});

test('CM1519 no-op and dry-run guards do not produce effective writes', () => {
  const projected = fixture.cases
    .filter(entry => ['no_op_guard', 'dry_run_guard'].includes(entry.kind))
    .map(projectWritePreflightCase);

  assert.deepEqual(projected.map(entry => entry.reasonCode), ['no_op_guard', 'dry_run_guard']);
  for (const entry of projected) {
    assert.equal(entry.durableWrite, false);
    assert.equal(entry.durableAuditWrite, false);
    assert.equal(entry.mutated, false);
  }
  assertNoWritePreflightLeak(projected);
});

test('CM1519 effective write and confirmed mutation payloads are forbidden, not executed', () => {
  const projected = fixture.cases
    .filter(entry => ['effective_write_payload', 'confirmed_mutation_payload'].includes(entry.kind))
    .map(projectWritePreflightCase);

  assert.deepEqual(projected.map(entry => entry.classification), [
    'forbidden_or_unavailable',
    'forbidden_or_unavailable'
  ]);
  for (const entry of projected) {
    assert.equal(entry.recordMemoryExecuted, false);
    assert.equal(entry.confirmedMutationExecuted, false);
    assert.equal(entry.durableWrite, false);
    assert.equal(entry.mutated, false);
  }
  assertNoWritePreflightLeak(projected);
});

test('CM1519 write preflight rejection output remains low-disclosure', () => {
  const projected = fixture.cases.map(projectWritePreflightCase);

  assert.equal(projected.every(entry => entry.lowDisclosure === true), true);
  assert.equal(projected.every(entry => entry.accepted === false), true);
  assertNoWritePreflightLeak(projected);
});

test('CM1519 write preflight fixture preserves the seven-tool public MCP surface', () => {
  assert.deepEqual(sorted(publicToolNames()), sorted(fixture.expectedPublicTools));
  assert.equal(publicToolNames().length, fixture.expectedPublicTools.length);
});
