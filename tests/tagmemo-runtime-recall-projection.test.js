'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  PROJECTION_SCHEMA_VERSION,
  createTagMemoRuntimeRecallProjection
} = require('../src/tagmemo/runtime-recall-projection');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'tagmemo-runtime-recall-projection-sprint-d-v1.json'
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

test('CM1587 runtime recall projection fixture declares no side-effect boundaries', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'tagmemo-runtime-recall-projection-fixture-v1');
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
  assert.equal(fixture.boundaries.publicMcpResponseChange, false);
  assert.equal(fixture.boundaries.searchMemoryPublicContractChange, false);
  assert.equal(fixture.boundaries.completeV8Claimed, false);
  assert.equal(fixture.boundaries.productionReleaseCutoverReady, false);
});

test('CM1587 runtime recall projection fixture covers required cases', () => {
  const fixture = loadFixture();
  const ids = fixture.cases.map(testCase => testCase.id);

  assert.deepEqual(sorted(ids), sorted([
    'bounded-runtime-recall-projection-ranks-relevant-candidate',
    'empty-candidates-low-disclosure-noop',
    'forbidden-provider-token-raw-rejected'
  ]));

  for (const testCase of fixture.cases) {
    assert.equal(testCase.input.schemaVersion, 'tagmemo-runtime-recall-projection-input-v1');
    assert.equal(typeof testCase.input.boundedQueryText, 'string');
    assert.match(testCase.input.seedProjection.memoryId, /^memory:[a-z0-9:_-]+$/i);
    assert.equal(typeof testCase.input.seedProjection.metadataProjection.title, 'string');
    assert.equal(typeof testCase.input.seedProjection.metadataProjection.summary, 'string');
    assert.equal(Array.isArray(testCase.input.seedProjection.tagProjection.tags), true);
    assert.equal(Array.isArray(testCase.input.seedProjection.safeEvidenceHints), true);
    assert.equal(Array.isArray(testCase.input.candidates), true);
  }
});

test('CM1587 forbidden fixture values are represented only in rejected case input', () => {
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

test('CM1587 runtime recall projection fixture preserves public MCP surface', () => {
  const fixture = loadFixture();

  assert.deepEqual(sorted(TOOL_DEFINITIONS.map(tool => tool.name)), sorted(fixture.expectedPublicTools));
  assert.equal(TOOL_DEFINITIONS.length, 9);
});

test('CM1588 runtime recall projection output is deterministic internal no-op', () => {
  const fixture = loadFixture();
  const testCase = fixture.cases.find(item => item.id === 'bounded-runtime-recall-projection-ranks-relevant-candidate');
  const first = createTagMemoRuntimeRecallProjection(testCase.input);
  const second = createTagMemoRuntimeRecallProjection(testCase.input);

  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, PROJECTION_SCHEMA_VERSION);
  assert.equal(first.projectionMode, testCase.expected.projectionMode);
  assert.equal(first.rejected, false);
  assert.equal(first.reason, null);
  assert.equal(first.lowDisclosure, true);
  assert.equal(first.mutated, testCase.expected.mutated);
  assert.equal(first.persisted, testCase.expected.persisted);
  assert.equal(first.publicResponse, testCase.expected.publicResponse);
  assert.equal(first.searchMemoryPublicResponse, false);
  assert.equal(first.searchMemoryPublicContractChanged, false);
  assert.equal(first.providerCalls, 0);
  assert.equal(first.publicMcpExpansion, 0);
  assert.equal(first.projectedCandidates[0].memoryId, testCase.expected.topMemoryId);
  assert.equal(first.projectedCandidates.length, testCase.input.candidates.length);
});

test('CM1588 runtime recall projection strips public rank reasons from output', () => {
  const fixture = loadFixture();
  const testCase = fixture.cases.find(item => item.id === 'bounded-runtime-recall-projection-ranks-relevant-candidate');
  const output = createTagMemoRuntimeRecallProjection(testCase.input);
  const keys = collectKeys(output);

  assert.equal(keys.includes('rankReasons'), false);
  assert.equal(keys.includes('boundedMemoryText'), false);
  assert.equal(keys.includes('metadataProjection'), false);
  assert.equal(keys.includes('tagProjection'), false);
});

test('CM1588 empty candidates return low-disclosure no-op projection', () => {
  const fixture = loadFixture();
  const empty = fixture.cases.find(testCase => testCase.id === 'empty-candidates-low-disclosure-noop');
  const output = createTagMemoRuntimeRecallProjection(empty.input);

  assert.equal(output.rejected, true);
  assert.equal(output.reason, empty.expected.reason);
  assert.deepEqual(output.projectedCandidates, []);
  assert.deepEqual(output.candidateScores, []);
  assert.deepEqual(output.projectionReasons, []);
  assert.equal(output.lowDisclosure, true);
  assert.equal(output.persisted, false);
  assert.equal(output.publicResponse, false);
});

test('CM1588 forbidden provider token raw shaped input is rejected without leakage', () => {
  const fixture = loadFixture();
  const rejected = fixture.cases.find(testCase => testCase.id === 'forbidden-provider-token-raw-rejected');
  const output = createTagMemoRuntimeRecallProjection(rejected.input);
  const serialized = JSON.stringify(output);

  assert.equal(output.rejected, true);
  assert.equal(output.reason, rejected.expected.reason);
  assert.equal(output.persisted, false);
  assert.equal(output.publicResponse, false);
  for (const fragment of fixture.forbiddenFragments) {
    assert.equal(serialized.includes(fragment), false, fragment);
  }
});

test('CM1588 recall composition failure returns low-disclosure no-op projection', () => {
  const fixture = loadFixture();
  const testCase = fixture.cases.find(item => item.id === 'bounded-runtime-recall-projection-ranks-relevant-candidate');
  const output = createTagMemoRuntimeRecallProjection(testCase.input, {
    composer() {
      throw new Error('simulated composition failure');
    }
  });

  assert.equal(output.rejected, true);
  assert.equal(output.reason, 'recall_composition_failed');
  assert.deepEqual(output.projectedCandidates, []);
  assert.equal(output.persisted, false);
  assert.equal(output.publicResponse, false);
  assert.equal(output.providerCalls, 0);
});
