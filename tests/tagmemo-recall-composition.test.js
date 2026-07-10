'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  COMPOSITION_VERSION,
  composeTagMemoRecall
} = require('../src/tagmemo/recall-composition');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'tagmemo-recall-composition-sprint-c-v1.json'
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

test('CM1582 recall composition fixture declares no side-effect boundaries', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'tagmemo-recall-composition-fixture-v1');
  assert.equal(fixture.boundaries.fixtureOnly, true);
  assert.equal(fixture.boundaries.providerApiCalls, 0);
  assert.equal(fixture.boundaries.bearerTokenUse, 0);
  assert.equal(fixture.boundaries.rawScan, false);
  assert.equal(fixture.boundaries.broadMemoryScan, false);
  assert.equal(fixture.boundaries.liveProof, false);
  assert.equal(fixture.boundaries.confirmedMutation, false);
  assert.equal(fixture.boundaries.persistentTagEnrichment, false);
  assert.equal(fixture.boundaries.publicMcpExpansion, false);
  assert.equal(fixture.boundaries.effectiveRecordMemoryWrites, 0);
  assert.equal(fixture.boundaries.completeV8Claimed, false);
  assert.equal(fixture.boundaries.productionReleaseCutoverReady, false);
});

test('CM1582 recall composition fixture covers required cases', () => {
  const fixture = loadFixture();
  const ids = fixture.cases.map(testCase => testCase.id);

  assert.deepEqual(sorted(ids), sorted([
    'bounded-composition-ranks-relevant-candidate',
    'empty-candidates-low-disclosure',
    'forbidden-provider-token-raw-rejected'
  ]));

  for (const testCase of fixture.cases) {
    assert.equal(testCase.input.schemaVersion, 'tagmemo-recall-composition-input-v1');
    assert.equal(typeof testCase.input.boundedQueryText, 'string');
    assert.match(testCase.input.seedMemoryId, /^memory:[a-z0-9:_-]+$/i);
    assert.equal(typeof testCase.input.metadataProjection.title, 'string');
    assert.equal(typeof testCase.input.metadataProjection.summary, 'string');
    assert.equal(Array.isArray(testCase.input.tagProjection.tags), true);
    assert.equal(Array.isArray(testCase.input.safeEvidenceHints), true);
    assert.equal(Array.isArray(testCase.input.candidates), true);
  }
});

test('CM1582 forbidden fixture values are represented only in rejected case input', () => {
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

test('CM1582 recall composition fixture preserves public MCP surface', () => {
  const fixture = loadFixture();

  assert.deepEqual(sorted(TOOL_DEFINITIONS.map(tool => tool.name)), sorted(fixture.expectedPublicTools));
  assert.equal(TOOL_DEFINITIONS.length, 9);
});

test('CM1583 recall composition output is deterministic and bounded', () => {
  const fixture = loadFixture();
  const input = fixture.cases.find(testCase => testCase.id === 'bounded-composition-ranks-relevant-candidate').input;
  const first = composeTagMemoRecall(input);
  const second = composeTagMemoRecall(input);

  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, 'tagmemo-recall-composition-output-v1');
  assert.equal(first.compositionVersion, COMPOSITION_VERSION);
  assert.equal(first.rejected, false);
  assert.equal(first.lowDisclosure, true);
  assert.equal(first.mutated, false);
  assert.equal(first.persisted, false);
  assert.equal(first.publicResponse, false);
  assert.equal(first.providerCalls, 0);
  assert.equal(first.publicMcpExpansion, 0);
  assert.equal(first.rankedCandidates.length, input.candidates.length);
  for (const score of first.candidateScores) {
    assert.equal(score.importanceScore >= 0 && score.importanceScore <= 1, true);
    assert.equal(score.timeDecayScore >= 0 && score.timeDecayScore <= 1, true);
  }
});

test('CM1583 composition executes required deterministic stages', () => {
  const fixture = loadFixture();
  const testCase = fixture.cases.find(item => item.id === 'bounded-composition-ranks-relevant-candidate');
  const output = composeTagMemoRecall(testCase.input);

  for (const stage of testCase.expected.requiredStages) {
    assert.equal(output.compositionReasons.includes(stage), true, stage);
  }
  assert.equal(output.expandedQueries.length > 0, true);
  assert.equal(output.associatedCandidates.length, testCase.input.candidates.length);
  assert.equal(output.candidateScores.length, testCase.input.candidates.length);
});

test('CM1583 composition ranks relevant candidate first', () => {
  const fixture = loadFixture();
  const testCase = fixture.cases.find(item => item.id === 'bounded-composition-ranks-relevant-candidate');
  const output = composeTagMemoRecall(testCase.input);

  assert.equal(output.rankedCandidates[0].memoryId, testCase.expected.topMemoryId);
});

test('CM1583 empty candidates return low-disclosure result', () => {
  const fixture = loadFixture();
  const empty = fixture.cases.find(testCase => testCase.id === 'empty-candidates-low-disclosure');
  const output = composeTagMemoRecall(empty.input);

  assert.equal(output.rejected, true);
  assert.equal(output.reason, 'empty_candidates');
  assert.deepEqual(output.expandedQueries, []);
  assert.deepEqual(output.associatedCandidates, []);
  assert.deepEqual(output.candidateScores, []);
  assert.deepEqual(output.rankedCandidates, []);
  assert.equal(output.lowDisclosure, true);
});

test('CM1583 forbidden provider token raw shaped input is rejected without leakage', () => {
  const fixture = loadFixture();
  const rejected = fixture.cases.find(testCase => testCase.id === 'forbidden-provider-token-raw-rejected');
  const output = composeTagMemoRecall(rejected.input);
  const serialized = JSON.stringify(output);

  assert.equal(output.rejected, true);
  assert.equal(output.reason, 'forbidden_raw_private_field');
  for (const fragment of fixture.forbiddenFragments) {
    assert.equal(serialized.includes(fragment), false, fragment);
  }
});
