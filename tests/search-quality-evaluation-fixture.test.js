'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');

const fixturePath = path.join(__dirname, 'fixtures', 'search-quality-evaluation-cm1516-v1.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const FORBIDDEN_KEYS = Object.freeze([
  'memoryId',
  'memory_id',
  'title',
  'content',
  'snippet',
  'sourceFile',
  'filePath',
  'path',
  'rawText',
  'rawAudit',
  'providerPayload',
  'apiKey',
  'bearerToken',
  'token',
  'authorization',
  'clientPrivateField',
  'clientId',
  'fromStatus',
  'toStatus',
  'newFromStatus',
  'newToStatus',
  'mutationStatus',
  'lifecycleStatus'
]);

const FORBIDDEN_VALUES = Object.freeze([
  'cm1516-memory-id-must-not-leak',
  'cm1516-title-must-not-leak',
  'cm1516-content-must-not-leak',
  'cm1516-snippet-must-not-leak',
  'A:/cm1516/must/not/leak.md',
  'cm1516-client-private-must-not-leak',
  'cm1516-cross-client-content-must-not-leak'
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

function assertNoForbiddenSearchLeak(value) {
  const keys = collectKeys(value);
  for (const key of FORBIDDEN_KEYS) {
    assert.equal(keys.includes(key), false, key);
  }

  const serialized = JSON.stringify(value);
  for (const forbidden of FORBIDDEN_VALUES) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
}

function projectSearchQualityResult(result, query) {
  const sameClient = result?.clientId === query?.clientId;
  const publicOrAllowed = result?.visibility === 'public' || sameClient;
  const accepted = publicOrAllowed && result?.visibility !== 'private';

  if (!accepted) {
    return {
      resultId: String(result?.resultId || 'unknown'),
      filtered: true,
      reasonCode: sameClient ? 'private_result_low_disclosure' : 'client_boundary',
      target: String(query?.target || 'both')
    };
  }

  return {
    resultId: String(result.resultId),
    accepted: true,
    target: String(result.target || query.target || 'both'),
    score: Number(result.score),
    ranking: {
      baseScore: Number(result.ranking?.baseScore || 0),
      rerankScore: Number(result.ranking?.rerankScore || 0),
      matchCount: Number(result.ranking?.matchCount || 0),
      tagHitCount: Number(result.ranking?.tagHitCount || 0),
      recencyBucket: String(result.ranking?.recencyBucket || 'unknown'),
      reasonCodes: Array.isArray(result.ranking?.reasonCodes)
        ? result.ranking.reasonCodes.map(String).slice(0, 5)
        : []
    }
  };
}

test('CM1516 query match uses only bounded fixture projection', () => {
  const query = fixture.queries[0];
  const projected = fixture.results.map(result => projectSearchQualityResult(result, query));

  assert.equal(projected.length, 3);
  assert.equal(projected[0].accepted, true);
  assert.equal(projected[0].ranking.matchCount, 3);
  assertNoForbiddenSearchLeak(projected);
});

test('CM1516 filtered and private results do not echo sensitive fixture values', () => {
  const query = fixture.queries[0];
  const filtered = fixture.results.slice(1).map(result => projectSearchQualityResult(result, query));

  assert.deepEqual(filtered.map(result => result.filtered), [true, true]);
  assert.deepEqual(filtered.map(result => result.reasonCode), [
    'private_result_low_disclosure',
    'client_boundary'
  ]);
  assertNoForbiddenSearchLeak(filtered);
});

test('CM1516 ranking metadata remains bounded and excludes raw/private source fields', () => {
  const query = fixture.queries[0];
  const projected = projectSearchQualityResult(fixture.results[0], query);

  assert.deepEqual(Object.keys(projected.ranking).sort(), [
    'baseScore',
    'matchCount',
    'reasonCodes',
    'recencyBucket',
    'rerankScore',
    'tagHitCount'
  ].sort());
  assertNoForbiddenSearchLeak(projected);
});

test('CM1516 client boundary mismatch is handled as low-disclosure filtered output', () => {
  const query = fixture.queries[0];
  const projected = projectSearchQualityResult(fixture.results[2], query);

  assert.equal(projected.filtered, true);
  assert.equal(projected.reasonCode, 'client_boundary');
  assert.equal(Object.prototype.hasOwnProperty.call(projected, 'clientId'), false);
  assertNoForbiddenSearchLeak(projected);
});

test('CM1516 search quality fixture preserves the seven-tool public MCP surface', () => {
  assert.deepEqual(sorted(publicToolNames()), sorted(fixture.expectedPublicTools));
  assert.equal(publicToolNames().length, fixture.expectedPublicTools.length);
});
