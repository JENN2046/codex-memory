'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  EXPANSION_VERSION,
  expandTagMemoQuery
} = require('../src/tagmemo/query-expansion');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'tagmemo-query-expansion-sprint-b-v1.json'
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

test('CM1571 query expansion fixture declares no side-effect boundaries', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'tagmemo-query-expansion-fixture-v1');
  assert.equal(fixture.boundaries.fixtureOnly, true);
  assert.equal(fixture.boundaries.liveSearch, false);
  assert.equal(fixture.boundaries.providerApiCalls, 0);
  assert.equal(fixture.boundaries.bearerTokenUse, 0);
  assert.equal(fixture.boundaries.rawScan, false);
  assert.equal(fixture.boundaries.broadMemoryScan, false);
  assert.equal(fixture.boundaries.persistentTagEnrichment, false);
  assert.equal(fixture.boundaries.publicMcpExpansion, false);
  assert.equal(fixture.boundaries.effectiveRecordMemoryWrites, 0);
  assert.equal(fixture.boundaries.completeV8Claimed, false);
  assert.equal(fixture.boundaries.productionReleaseCutoverReady, false);
});

test('CM1571 query expansion fixture covers required cases', () => {
  const fixture = loadFixture();
  const ids = fixture.cases.map(testCase => testCase.id);

  assert.deepEqual(sorted(ids), sorted([
    'tag-derived-expansion',
    'duplicate-expansion-merged',
    'empty-query-low-disclosure',
    'forbidden-provider-token-raw-rejected'
  ]));

  for (const testCase of fixture.cases) {
    assert.equal(testCase.input.schemaVersion, 'tagmemo-query-expansion-input-v1');
    assert.equal(typeof testCase.input.boundedQueryText, 'string');
    assert.equal(typeof testCase.input.recallIntent, 'string');
    assert.equal(['low', 'medium', 'high'].includes(testCase.input.importanceBand), true);
    assert.equal(Array.isArray(testCase.input.tagProjection.tags), true);
    assert.equal(Array.isArray(testCase.input.safeEvidenceHints), true);
  }
});

test('CM1571 forbidden fixture values are represented only in rejected case input', () => {
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

test('CM1571 query expansion fixture preserves public MCP surface', () => {
  const fixture = loadFixture();

  assert.deepEqual(sorted(TOOL_DEFINITIONS.map(tool => tool.name)), sorted(fixture.expectedPublicTools));
  assert.equal(TOOL_DEFINITIONS.length, 7);
});

test('CM1572 query expansion output is deterministic and bounded', () => {
  const fixture = loadFixture();
  const input = fixture.cases.find(testCase => testCase.id === 'tag-derived-expansion').input;
  const first = expandTagMemoQuery(input);
  const second = expandTagMemoQuery(input);

  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, 'tagmemo-query-expansion-output-v1');
  assert.equal(first.expansionVersion, EXPANSION_VERSION);
  assert.equal(first.expandedQueries[0], input.boundedQueryText);
  assert.equal(first.expandedQueries.length <= 6, true);
  assert.equal(first.rejected, false);
  assert.equal(first.lowDisclosure, true);
  assert.equal(first.mutated, false);
  assert.equal(first.providerCalls, 0);
  assert.equal(first.publicMcpExpansion, 0);
});

test('CM1572 tag and evidence derived expansion reasons are reproducible', () => {
  const fixture = loadFixture();
  const testCase = fixture.cases.find(item => item.id === 'tag-derived-expansion');
  const output = expandTagMemoQuery(testCase.input);

  for (const reason of testCase.expected.requiredReasons) {
    assert.equal(output.expansionReasons.includes(reason), true, reason);
  }
  assert.equal(output.expandedQueries.some(query => query.includes('route blocker')), true);
  assert.equal(output.expandedQueries.some(query => query.includes('validation proof')), true);
});

test('CM1572 duplicate expansions merge without blind multiplication', () => {
  const fixture = loadFixture();
  const testCase = fixture.cases.find(item => item.id === 'duplicate-expansion-merged');
  const output = expandTagMemoQuery(testCase.input);

  assert.equal(output.expansionReasons.includes('duplicate_expansion_merged'), true);
  assert.equal(new Set(output.expandedQueries).size, output.expandedQueries.length);
});

test('CM1572 empty query returns low-disclosure result', () => {
  const fixture = loadFixture();
  const empty = fixture.cases.find(testCase => testCase.id === 'empty-query-low-disclosure');
  const output = expandTagMemoQuery(empty.input);

  assert.equal(output.rejected, true);
  assert.equal(output.reason, 'empty_query');
  assert.deepEqual(output.expandedQueries, []);
  assert.deepEqual(output.expansionReasons, []);
  assert.equal(output.lowDisclosure, true);
});

test('CM1572 forbidden provider token raw shaped input is rejected without leakage', () => {
  const fixture = loadFixture();
  const rejected = fixture.cases.find(testCase => testCase.id === 'forbidden-provider-token-raw-rejected');
  const output = expandTagMemoQuery(rejected.input);
  const serialized = JSON.stringify(output);

  assert.equal(output.rejected, true);
  assert.equal(output.reason, 'forbidden_raw_private_field');
  assert.deepEqual(output.expandedQueries, []);
  for (const fragment of fixture.forbiddenFragments) {
    assert.equal(serialized.includes(fragment), false, fragment);
  }
});
