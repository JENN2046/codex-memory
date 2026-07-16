'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  SCORE_VERSION,
  scoreMemoryImportance
} = require('../src/tagmemo/importance-scoring');

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
  assert.equal(TOOL_DEFINITIONS.length, 9);
});

test('CM1563 importance scoring output is deterministic and bounded', () => {
  const fixture = loadFixture();
  const input = fixture.cases.find(testCase => testCase.id === 'explicit-decision-route-high').input;
  const first = scoreMemoryImportance(input);
  const second = scoreMemoryImportance(input);

  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, 'tagmemo-importance-scoring-output-v1');
  assert.equal(first.scoreVersion, SCORE_VERSION);
  assert.equal(first.memoryId, input.memoryId);
  assert.equal(first.importanceScore >= 0 && first.importanceScore <= 1, true);
  assert.equal(first.importanceBand, 'high');
  assert.equal(first.rejected, false);
  assert.equal(first.lowDisclosure, true);
  assert.equal(first.mutated, false);
  assert.equal(first.providerCalls, 0);
  assert.equal(first.publicMcpExpansion, 0);
});

test('CM1563 importance scoring bands and required signals are reproducible', () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases.filter(item => item.expected.rejected !== true)) {
    const output = scoreMemoryImportance(testCase.input);
    assert.equal(output.importanceBand, testCase.expected.importanceBand, testCase.id);
    for (const signal of testCase.expected.requiredSignals) {
      assert.equal(output.scoringSignals.includes(signal), true, `${testCase.id}:${signal}`);
    }
  }
});

test('CM1563 duplicate signals merge without blind multiplication', () => {
  const fixture = loadFixture();
  const duplicate = fixture.cases.find(testCase => testCase.id === 'duplicate-proof-merged');
  const single = JSON.parse(JSON.stringify(duplicate.input));
  single.boundedMemoryText = 'Proof receipt.';
  single.safeEvidenceHints = ['proof', 'receipt'];
  single.tagProjection.tags = [
    {
      tagLabel: 'proof',
      tagSource: 'explicit_record_tag',
      confidenceScore: 0.95
    }
  ];

  const duplicateOutput = scoreMemoryImportance(duplicate.input);
  const singleOutput = scoreMemoryImportance(single);

  assert.equal(duplicateOutput.scoringSignals.includes('duplicate_signal_merged'), true);
  assert.equal(duplicateOutput.importanceBand, 'medium');
  assert.equal(singleOutput.importanceBand, 'medium');
  assert.equal(duplicateOutput.importanceScore - singleOutput.importanceScore <= 0.06, true);
});

test('CM1563 empty input returns low-disclosure result', () => {
  const fixture = loadFixture();
  const empty = fixture.cases.find(testCase => testCase.id === 'empty-low-disclosure');
  const output = scoreMemoryImportance(empty.input);

  assert.equal(output.rejected, true);
  assert.equal(output.reason, 'empty_input');
  assert.equal(output.importanceScore, 0);
  assert.equal(output.importanceBand, 'low');
  assert.deepEqual(output.scoringSignals, []);
  assert.equal(output.lowDisclosure, true);
});

test('CM1563 forbidden provider token raw shaped input is rejected without leakage', () => {
  const fixture = loadFixture();
  const rejected = fixture.cases.find(testCase => testCase.id === 'forbidden-provider-token-raw-rejected');
  const output = scoreMemoryImportance(rejected.input);
  const serialized = JSON.stringify(output);

  assert.equal(output.rejected, true);
  assert.equal(output.reason, 'forbidden_raw_private_field');
  assert.equal(output.importanceBand, 'low');
  for (const fragment of fixture.forbiddenFragments) {
    assert.equal(serialized.includes(fragment), false, fragment);
  }
  assert.deepEqual(output.scoringSignals, []);
});
