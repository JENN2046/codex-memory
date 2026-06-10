'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  ASSOCIATION_VERSION,
  deriveTagMemoAssociations
} = require('../src/tagmemo/association-recall');

const fixturePath = path.join(__dirname, 'fixtures', 'tagmemo-association-recall-sprint-b-v1.json');

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

test('CM1575 association recall fixture declares no side-effect boundaries', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'tagmemo-association-recall-fixture-v1');
  assert.equal(fixture.boundaries.fixtureOnly, true);
  assert.equal(fixture.boundaries.relationGraphPersistence, false);
  assert.equal(fixture.boundaries.liveSearch, false);
  assert.equal(fixture.boundaries.providerApiCalls, 0);
  assert.equal(fixture.boundaries.bearerTokenUse, 0);
  assert.equal(fixture.boundaries.rawScan, false);
  assert.equal(fixture.boundaries.broadMemoryScan, false);
  assert.equal(fixture.boundaries.publicMcpExpansion, false);
  assert.equal(fixture.boundaries.effectiveRecordMemoryWrites, 0);
  assert.equal(fixture.boundaries.completeV8Claimed, false);
});

test('CM1575 association recall fixture covers required cases', () => {
  const fixture = loadFixture();
  const ids = fixture.cases.map(testCase => testCase.id);

  assert.deepEqual(sorted(ids), sorted([
    'shared-tag-ranks-higher',
    'query-expansion-overlap-deterministic',
    'empty-candidates-low-disclosure',
    'forbidden-provider-token-raw-rejected'
  ]));

  for (const testCase of fixture.cases) {
    assert.equal(testCase.input.schemaVersion, 'tagmemo-association-recall-input-v1');
    assert.match(testCase.input.seedMemoryId, /^memory:[a-z0-9:_-]+$/i);
    assert.equal(Array.isArray(testCase.input.seedProjection.tagProjection.tags), true);
    assert.equal(Array.isArray(testCase.input.seedProjection.queryExpansionHints), true);
    assert.equal(Array.isArray(testCase.input.candidates), true);
  }
});

test('CM1575 forbidden fixture values are represented only in rejected case input', () => {
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

test('CM1575 association recall fixture preserves public MCP surface', () => {
  const fixture = loadFixture();

  assert.deepEqual(sorted(TOOL_DEFINITIONS.map(tool => tool.name)), sorted(fixture.expectedPublicTools));
  assert.equal(TOOL_DEFINITIONS.length, 7);
});

test('CM1576 association recall output is deterministic and bounded', () => {
  const fixture = loadFixture();
  const input = fixture.cases.find(testCase => testCase.id === 'shared-tag-ranks-higher').input;
  const first = deriveTagMemoAssociations(input);
  const second = deriveTagMemoAssociations(input);

  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, 'tagmemo-association-recall-output-v1');
  assert.equal(first.associationVersion, ASSOCIATION_VERSION);
  assert.equal(first.seedMemoryId, input.seedMemoryId);
  assert.equal(first.rejected, false);
  assert.equal(first.lowDisclosure, true);
  assert.equal(first.mutated, false);
  assert.equal(first.providerCalls, 0);
  assert.equal(first.publicMcpExpansion, 0);
  for (const candidate of first.associatedCandidates) {
    assert.equal(candidate.associationScore >= 0 && candidate.associationScore <= 1, true);
    assert.equal(Array.isArray(candidate.associationReasons), true);
  }
});

test('CM1576 shared tags rank higher than importance-only candidate', () => {
  const fixture = loadFixture();
  const testCase = fixture.cases.find(item => item.id === 'shared-tag-ranks-higher');
  const output = deriveTagMemoAssociations(testCase.input);

  assert.equal(output.associatedCandidates[0].memoryId, testCase.expected.topMemoryId);
  for (const reason of testCase.expected.requiredReasons) {
    assert.equal(output.associatedCandidates[0].associationReasons.includes(reason), true, reason);
  }
});

test('CM1576 query expansion overlap participates deterministically', () => {
  const fixture = loadFixture();
  const testCase = fixture.cases.find(item => item.id === 'query-expansion-overlap-deterministic');
  const output = deriveTagMemoAssociations(testCase.input);

  assert.equal(output.associatedCandidates[0].memoryId, testCase.expected.topMemoryId);
  for (const reason of testCase.expected.requiredReasons) {
    assert.equal(output.associatedCandidates[0].associationReasons.includes(reason), true, reason);
  }
});

test('CM1576 empty candidates return low-disclosure result', () => {
  const fixture = loadFixture();
  const empty = fixture.cases.find(testCase => testCase.id === 'empty-candidates-low-disclosure');
  const output = deriveTagMemoAssociations(empty.input);

  assert.equal(output.rejected, true);
  assert.equal(output.reason, 'empty_candidates');
  assert.deepEqual(output.associatedCandidates, []);
  assert.equal(output.lowDisclosure, true);
});

test('CM1576 forbidden provider token raw shaped candidate is rejected without leakage', () => {
  const fixture = loadFixture();
  const rejected = fixture.cases.find(testCase => testCase.id === 'forbidden-provider-token-raw-rejected');
  const output = deriveTagMemoAssociations(rejected.input);
  const serialized = JSON.stringify(output);

  assert.equal(output.rejected, true);
  assert.equal(output.reason, 'forbidden_raw_private_field');
  assert.deepEqual(output.associatedCandidates, []);
  for (const fragment of fixture.forbiddenFragments) {
    assert.equal(serialized.includes(fragment), false, fragment);
  }
});
