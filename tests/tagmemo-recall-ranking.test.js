'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  RANK_VERSION,
  rankTagMemoCandidates
} = require('../src/tagmemo/recall-ranking');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'tagmemo-recall-ranking-sprint-a-v1.json'
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

test('CM1566 recall ranking fixture declares no side-effect boundaries', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'tagmemo-recall-ranking-fixture-v1');
  assert.equal(fixture.boundaries.fixtureOnly, true);
  assert.equal(fixture.boundaries.liveSearch, false);
  assert.equal(fixture.boundaries.providerApiCalls, 0);
  assert.equal(fixture.boundaries.bearerTokenUse, 0);
  assert.equal(fixture.boundaries.rawScan, false);
  assert.equal(fixture.boundaries.persistentTagEnrichment, false);
  assert.equal(fixture.boundaries.publicMcpExpansion, false);
  assert.equal(fixture.boundaries.effectiveRecordMemoryWrites, 0);
  assert.equal(fixture.boundaries.completeV8Claimed, false);
  assert.equal(fixture.boundaries.productionReleaseCutoverReady, false);
});

test('CM1566 recall ranking fixture covers required ranking cases', () => {
  const fixture = loadFixture();
  const ids = fixture.cases.map(testCase => testCase.id);

  assert.deepEqual(sorted(ids), sorted([
    'tag-match-ranks-higher',
    'importance-participates-not-dominates',
    'safe-recency-deterministic',
    'empty-candidates-low-disclosure',
    'forbidden-provider-token-raw-rejected'
  ]));

  for (const testCase of fixture.cases) {
    assert.equal(testCase.input.schemaVersion, 'tagmemo-recall-ranking-input-v1');
    assert.equal(typeof testCase.input.boundedQueryText, 'string');
    assert.equal(Array.isArray(testCase.input.candidates), true);
    for (const candidate of testCase.input.candidates) {
      assert.match(candidate.memoryId, /^memory:[a-z0-9:_-]+$/i);
      assert.equal(typeof candidate.boundedMemoryText, 'string');
      assert.equal(Array.isArray(candidate.tagProjection.tags), true);
      assert.equal(Number.isFinite(candidate.importanceScore), true);
      assert.equal(candidate.importanceScore >= 0 && candidate.importanceScore <= 1, true);
      assert.equal(typeof candidate.safeRecency.bucket, 'string');
      assert.equal(Number.isInteger(candidate.safeRecency.sequence), true);
      assert.equal(Array.isArray(candidate.safeEvidenceHints), true);
    }
  }
});

test('CM1566 forbidden fixture values are represented only in rejected case input', () => {
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

test('CM1566 recall ranking fixture preserves public MCP surface', () => {
  const fixture = loadFixture();

  assert.deepEqual(sorted(TOOL_DEFINITIONS.map(tool => tool.name)), sorted(fixture.expectedPublicTools));
  assert.equal(TOOL_DEFINITIONS.length, 9);
});

test('CM1567 recall ranking output is deterministic and bounded', () => {
  const fixture = loadFixture();
  const input = fixture.cases.find(testCase => testCase.id === 'tag-match-ranks-higher').input;
  const first = rankTagMemoCandidates(input);
  const second = rankTagMemoCandidates(input);

  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, 'tagmemo-recall-ranking-output-v1');
  assert.equal(first.rankVersion, RANK_VERSION);
  assert.equal(first.rejected, false);
  assert.equal(first.lowDisclosure, true);
  assert.equal(first.mutated, false);
  assert.equal(first.providerCalls, 0);
  assert.equal(first.publicMcpExpansion, 0);
  assert.equal(first.rankedCandidates.length, input.candidates.length);
  for (const candidate of first.rankedCandidates) {
    assert.equal(candidate.rankScore >= 0 && candidate.rankScore <= 1, true);
    assert.equal(Array.isArray(candidate.rankReasons), true);
    assert.equal(candidate.lowDisclosure, true);
  }
});

test('CM1567 higher tag match ranks higher', () => {
  const fixture = loadFixture();
  const testCase = fixture.cases.find(item => item.id === 'tag-match-ranks-higher');
  const output = rankTagMemoCandidates(testCase.input);

  assert.equal(output.rankedCandidates[0].memoryId, testCase.expected.topMemoryId);
  for (const reason of testCase.expected.requiredReasons) {
    assert.equal(output.rankedCandidates[0].rankReasons.includes(reason), true, reason);
  }
});

test('CM1567 importance participates but does not dominate relevance', () => {
  const fixture = loadFixture();
  const testCase = fixture.cases.find(item => item.id === 'importance-participates-not-dominates');
  const output = rankTagMemoCandidates(testCase.input);

  assert.equal(output.rankedCandidates[0].memoryId, testCase.expected.topMemoryId);
  assert.equal(output.rankedCandidates[0].rankReasons.includes('importance_score'), true);
  assert.equal(output.rankedCandidates[1].rankReasons.includes('importance_score'), true);
});

test('CM1567 safe recency participates deterministically', () => {
  const fixture = loadFixture();
  const testCase = fixture.cases.find(item => item.id === 'safe-recency-deterministic');
  const first = rankTagMemoCandidates(testCase.input);
  const second = rankTagMemoCandidates(testCase.input);

  assert.deepEqual(first, second);
  assert.equal(first.rankedCandidates[0].memoryId, testCase.expected.topMemoryId);
  assert.equal(first.rankedCandidates[0].rankReasons.includes('safe_recency'), true);
});

test('CM1567 empty candidate list returns low-disclosure result', () => {
  const fixture = loadFixture();
  const empty = fixture.cases.find(testCase => testCase.id === 'empty-candidates-low-disclosure');
  const output = rankTagMemoCandidates(empty.input);

  assert.equal(output.rejected, true);
  assert.equal(output.reason, 'empty_candidates');
  assert.deepEqual(output.rankedCandidates, []);
  assert.equal(output.lowDisclosure, true);
});

test('CM1567 forbidden provider token raw shaped candidate is rejected without leakage', () => {
  const fixture = loadFixture();
  const rejected = fixture.cases.find(testCase => testCase.id === 'forbidden-provider-token-raw-rejected');
  const output = rankTagMemoCandidates(rejected.input);
  const serialized = JSON.stringify(output);

  assert.equal(output.rejected, true);
  assert.equal(output.reason, 'forbidden_raw_private_field');
  assert.deepEqual(output.rankedCandidates, []);
  for (const fragment of fixture.forbiddenFragments) {
    assert.equal(serialized.includes(fragment), false, fragment);
  }
});
