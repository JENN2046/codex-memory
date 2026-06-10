'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'tagmemo-importance-scoring-sprint-a-v1.json'
);

function sorted(values) {
  return [...values].sort();
}

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
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

test('CM1562 importance scoring fixture declares no side-effect boundaries', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'tagmemo-importance-scoring-fixture-v1');
  assert.equal(fixture.boundaries.fixtureOnly, true);
  assert.equal(fixture.boundaries.providerApiCalls, 0);
  assert.equal(fixture.boundaries.bearerTokenUse, 0);
  assert.equal(fixture.boundaries.rawScan, false);
  assert.equal(fixture.boundaries.persistentTagEnrichment, false);
  assert.equal(fixture.boundaries.publicMcpExpansion, false);
  assert.equal(fixture.boundaries.effectiveRecordMemoryWrites, 0);
  assert.equal(fixture.boundaries.completeV8Claimed, false);
  assert.equal(fixture.boundaries.productionReleaseCutoverReady, false);
});

test('CM1562 importance scoring fixture covers required scoring cases', () => {
  const fixture = loadFixture();
  const ids = fixture.cases.map(testCase => testCase.id);

  assert.deepEqual(sorted(ids), sorted([
    'explicit-decision-route-high',
    'duplicate-proof-merged',
    'temporary-status-noise-low',
    'empty-low-disclosure',
    'forbidden-provider-token-raw-rejected'
  ]));

  for (const testCase of fixture.cases) {
    assert.equal(testCase.input.schemaVersion, 'tagmemo-importance-scoring-input-v1');
    assert.match(testCase.input.memoryId, /^memory:[a-z0-9:_-]+$/i);
    assert.equal(typeof testCase.input.boundedMemoryText, 'string');
    assert.equal(typeof testCase.input.metadataProjection.title, 'string');
    assert.equal(typeof testCase.input.metadataProjection.summary, 'string');
    assert.equal(Array.isArray(testCase.input.tagProjection.tags), true);
    assert.equal(Array.isArray(testCase.input.safeEvidenceHints), true);
  }
});

test('CM1562 forbidden fixture values are represented only in rejected case input', () => {
  const fixture = loadFixture();
  const rejected = fixture.cases.find(testCase => testCase.id === 'forbidden-provider-token-raw-rejected');
  const safeCases = fixture.cases.filter(testCase => testCase.id !== rejected.id);

  for (const fragment of fixture.forbiddenFragments) {
    for (const testCase of safeCases) {
      assert.equal(JSON.stringify(testCase.input).includes(fragment), false, fragment);
    }
    assert.equal(JSON.stringify(rejected.input).includes(fragment), true, fragment);
  }

  assert.equal(collectKeys(rejected.input).includes('rawText'), true);
  assert.equal(collectKeys(rejected.input).includes('authorization'), true);
  assert.equal(collectKeys(rejected.input).includes('filePath'), true);
});

test('CM1562 importance scoring fixture preserves public MCP surface', () => {
  const fixture = loadFixture();

  assert.deepEqual(sorted(TOOL_DEFINITIONS.map(tool => tool.name)), sorted(fixture.expectedPublicTools));
  assert.equal(TOOL_DEFINITIONS.length, 7);
});
