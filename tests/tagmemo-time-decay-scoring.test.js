'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  DECAY_VERSION,
  scoreTimeDecay
} = require('../src/tagmemo/time-decay-scoring');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'tagmemo-time-decay-scoring-sprint-b-v1.json'
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

test('CM1578 time-decay fixture declares no side-effect boundaries', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'tagmemo-time-decay-scoring-fixture-v1');
  assert.equal(fixture.boundaries.fixtureOnly, true);
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

test('CM1578 time-decay fixture covers required scoring cases', () => {
  const fixture = loadFixture();
  const ids = fixture.cases.map(testCase => testCase.id);

  assert.deepEqual(sorted(ids), sorted([
    'recent-high',
    'older-durable-medium',
    'temporary-archival-low',
    'duplicate-signal-merged',
    'empty-low-disclosure',
    'forbidden-provider-token-raw-rejected'
  ]));

  for (const testCase of fixture.cases) {
    assert.equal(testCase.input.schemaVersion, 'tagmemo-time-decay-scoring-input-v1');
    assert.match(testCase.input.memoryId, /^memory:[a-z0-9:_-]+$/i);
    assert.equal(typeof testCase.input.safeRecency.bucket, 'string');
    assert.equal(Number.isInteger(testCase.input.safeRecency.sequence), true);
    assert.equal(Array.isArray(testCase.input.safeEvidenceHints), true);
  }
});

test('CM1578 forbidden fixture values are represented only in rejected case input', () => {
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
  assert.equal(collectKeys(rejected.input).includes('providerEndpoint'), true);
});

test('CM1578 time-decay fixture preserves public MCP surface', () => {
  const fixture = loadFixture();

  assert.deepEqual(sorted(TOOL_DEFINITIONS.map(tool => tool.name)), sorted(fixture.expectedPublicTools));
  assert.equal(TOOL_DEFINITIONS.length, 9);
});

test('CM1578 time-decay output is deterministic and bounded', () => {
  const fixture = loadFixture();
  const input = fixture.cases.find(testCase => testCase.id === 'recent-high').input;
  const first = scoreTimeDecay(input);
  const second = scoreTimeDecay(input);

  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, 'tagmemo-time-decay-scoring-output-v1');
  assert.equal(first.decayVersion, DECAY_VERSION);
  assert.equal(first.memoryId, input.memoryId);
  assert.equal(first.timeDecayScore >= 0 && first.timeDecayScore <= 1, true);
  assert.equal(first.timeDecayBand, 'high');
  assert.equal(first.rejected, false);
  assert.equal(first.lowDisclosure, true);
  assert.equal(first.mutated, false);
  assert.equal(first.providerCalls, 0);
  assert.equal(first.publicMcpExpansion, 0);
});

test('CM1578 time-decay bands and reasons are reproducible', () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases.filter(item => item.expected.rejected !== true)) {
    const output = scoreTimeDecay(testCase.input);
    assert.equal(output.timeDecayBand, testCase.expected.timeDecayBand, testCase.id);
    for (const reason of testCase.expected.requiredReasons) {
      assert.equal(output.decayReasons.includes(reason), true, `${testCase.id}:${reason}`);
    }
  }
});

test('CM1578 recent safe recency ranks above older durable baseline', () => {
  const fixture = loadFixture();
  const recent = scoreTimeDecay(fixture.cases.find(item => item.id === 'recent-high').input);
  const older = scoreTimeDecay(fixture.cases.find(item => item.id === 'older-durable-medium').input);

  assert.equal(recent.timeDecayScore > older.timeDecayScore, true);
});

test('CM1578 duplicate signals merge without blind multiplication', () => {
  const fixture = loadFixture();
  const duplicate = fixture.cases.find(testCase => testCase.id === 'duplicate-signal-merged');
  const single = JSON.parse(JSON.stringify(duplicate.input));
  single.safeEvidenceHints = ['proof', 'receipt'];

  const duplicateOutput = scoreTimeDecay(duplicate.input);
  const singleOutput = scoreTimeDecay(single);

  assert.equal(duplicateOutput.decayReasons.includes('duplicate_signal_merged'), true);
  assert.equal(duplicateOutput.timeDecayScore - singleOutput.timeDecayScore <= 0.03, true);
});

test('CM1578 empty input returns low-disclosure result', () => {
  const fixture = loadFixture();
  const empty = fixture.cases.find(testCase => testCase.id === 'empty-low-disclosure');
  const output = scoreTimeDecay(empty.input);

  assert.equal(output.rejected, true);
  assert.equal(output.reason, 'empty_input');
  assert.equal(output.timeDecayScore, 0);
  assert.equal(output.timeDecayBand, 'low');
  assert.deepEqual(output.decayReasons, []);
  assert.equal(output.lowDisclosure, true);
});

test('CM1578 forbidden provider token raw shaped input is rejected without leakage', () => {
  const fixture = loadFixture();
  const rejected = fixture.cases.find(testCase => testCase.id === 'forbidden-provider-token-raw-rejected');
  const output = scoreTimeDecay(rejected.input);
  const serialized = JSON.stringify(output);

  assert.equal(output.rejected, true);
  assert.equal(output.reason, 'forbidden_raw_private_field');
  assert.equal(output.timeDecayBand, 'low');
  for (const fragment of fixture.forbiddenFragments) {
    assert.equal(serialized.includes(fragment), false, fragment);
  }
  assert.deepEqual(output.decayReasons, []);
});
