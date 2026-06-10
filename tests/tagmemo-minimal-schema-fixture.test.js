'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');

const fixturePath = path.join(__dirname, 'fixtures', 'tagmemo-minimal-schema-cm1549-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

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

function assertNoForbiddenKeys(value, forbiddenKeys) {
  const keys = collectKeys(value);
  for (const key of forbiddenKeys) {
    assert.equal(keys.includes(key), false, key);
  }
}

function assertNoForbiddenValues(value, forbiddenFragments) {
  const serialized = JSON.stringify(value);
  for (const fragment of forbiddenFragments) {
    assert.equal(serialized.includes(fragment), false, fragment);
  }
}

function fail(reason) {
  const error = new Error(reason);
  error.reason = reason;
  throw error;
}

function bucketFor(score) {
  if (score < 0.4) return 'low';
  if (score < 0.75) return 'medium';
  return 'high';
}

function isBoundedId(value, prefix) {
  return typeof value === 'string'
    && value.startsWith(`${prefix}:`)
    && /^[a-z]+:[a-z0-9:_-]+$/i.test(value)
    && !/[\\/]/.test(value)
    && !/^[A-Za-z]:[\\/]/.test(value);
}

function validateMinimalTagRecord(record, fixture) {
  const schema = fixture.schema;

  for (const field of schema.requiredTagFields) {
    if (!Object.prototype.hasOwnProperty.call(record, field)) {
      fail('missing_required_field');
    }
  }

  if (record.schemaVersion !== schema.tagSchemaVersion) {
    fail('invalid_schema_version');
  }
  if (!isBoundedId(record.tagId, 'tag')) {
    fail('invalid_tag_id');
  }
  if (typeof record.tagLabel !== 'string' || record.tagLabel.trim() !== record.tagLabel || !record.tagLabel) {
    fail('invalid_tag_label');
  }
  if (!schema.allowedTagSources.includes(record.tagSource)) {
    fail('unsupported_tag_source');
  }
  if (/(provider|api|token|bearer|raw|scan)/i.test(record.tagSource)) {
    fail('unsafe_tag_source');
  }
  if (!Number.isFinite(record.confidenceScore)
    || record.confidenceScore < schema.confidence.min
    || record.confidenceScore > schema.confidence.max) {
    fail('invalid_confidence_score');
  }
  if (record.confidenceBucket !== bucketFor(record.confidenceScore)) {
    fail('invalid_confidence_bucket');
  }
  if (!isBoundedId(record.evidenceSourceId, 'evidence')) {
    fail('invalid_evidence_source_id');
  }
  if (!isBoundedId(record.memoryId, 'memory')) {
    fail('invalid_memory_id');
  }
  if (!record.rankingCompatibility || typeof record.rankingCompatibility !== 'object') {
    fail('invalid_ranking_compatibility');
  }
  if (record.rankingCompatibility.runtimeWeightTuningApproved !== false) {
    fail('runtime_weight_tuning_not_allowed');
  }
  const keys = collectKeys(record);
  if (schema.forbiddenRawPrivateKeys.some(key => keys.includes(key))) {
    fail('forbidden_raw_private_field');
  }
  const serialized = JSON.stringify(record);
  if (schema.forbiddenValueFragments.some(fragment => serialized.includes(fragment))) {
    fail('forbidden_raw_private_value');
  }

  return true;
}

function projectPublicTagRecord(record, options = {}) {
  const projected = {
    schemaVersion: record.schemaVersion,
    tagId: record.tagId,
    tagLabel: record.tagLabel,
    tagSource: record.tagSource,
    confidenceBucket: record.confidenceBucket,
    memoryLinkagePresent: Boolean(record.memoryId),
    rankingCompatible: Boolean(record.rankingCompatibility?.mayContributeToTagMemoScore
      || record.rankingCompatibility?.mayContributeToStructuralSignal)
  };

  if (options.exposeMemoryId) {
    projected.memoryId = record.memoryId;
  }
  if (options.exposeConfidenceScore) {
    projected.confidenceScore = Number(record.confidenceScore.toFixed(2));
  }
  if (options.exposeEvidenceSourceId) {
    projected.evidenceSourceId = record.evidenceSourceId;
  }

  return projected;
}

test('CM1549 fixture declares no-side-effect safety boundaries and seven public tools', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'tagmemo-minimal-schema-cm1549-v1');
  assert.equal(fixture.source.kind, 'fixture-only');
  assert.equal(fixture.source.synthetic, true);
  assert.equal(fixture.source.runtimeTagExtractionImplemented, false);
  assert.equal(fixture.safety.mutated, false);
  assert.equal(fixture.safety.providerCalls, 0);
  assert.equal(fixture.safety.bearerTokenUse, false);
  assert.equal(fixture.safety.rawScan, false);
  assert.equal(fixture.safety.confirmedMutation, false);
  assert.equal(fixture.safety.publicMcpExpansion, false);
  assert.equal(fixture.safety.effectiveRecordMemoryWrites, 0);
  assert.equal(fixture.safety.releaseTagDeploy, false);
  assert.equal(fixture.safety.productionReady, false);
  assert.equal(fixture.safety.releaseReady, false);
  assert.equal(fixture.safety.cutoverReady, false);
  assert.equal(fixture.safety.completeV8Claimed, false);
  assert.equal(fixture.safety.runtimeRankingChanged, false);
  assert.deepEqual(sorted(publicToolNames()), sorted(fixture.safety.publicMcpTools));
  assert.equal(publicToolNames().length, 7);
});

test('CM1549 valid TagMemo minimal records contain controlled required fields', () => {
  const fixture = loadFixture();

  for (const caseDefinition of fixture.validTags) {
    const record = caseDefinition.record;
    assert.equal(validateMinimalTagRecord(record, fixture), true, caseDefinition.id);
    assert.deepEqual(sorted(Object.keys(record)), sorted(fixture.schema.requiredTagFields), caseDefinition.id);
    assert.equal(record.memoryId.startsWith('memory:'), true, caseDefinition.id);
    assert.equal(record.evidenceSourceId.startsWith('evidence:'), true, caseDefinition.id);
  }
});

test('CM1549 invalid TagMemo minimal records fail closed with expected reasons', () => {
  const fixture = loadFixture();

  for (const caseDefinition of fixture.invalidTags) {
    assert.throws(
      () => validateMinimalTagRecord(caseDefinition.record, fixture),
      error => error.reason === caseDefinition.expectedReason,
      caseDefinition.id
    );
  }
});

test('CM1549 bounded public projection excludes forbidden raw/private fields', () => {
  const fixture = loadFixture();
  const tagById = new Map(fixture.validTags.map(item => [item.id, item.record]));

  for (const caseDefinition of fixture.publicProjectionCases) {
    const source = tagById.get(caseDefinition.sourceTagId);
    validateMinimalTagRecord(source, fixture);
    const projected = projectPublicTagRecord(source, caseDefinition.options);

    assert.deepEqual(sorted(Object.keys(projected)), sorted(caseDefinition.expectedKeys), caseDefinition.id);
    assertNoForbiddenKeys(projected, fixture.schema.forbiddenRawPrivateKeys);
    assertNoForbiddenValues(projected, fixture.schema.forbiddenValueFragments);

    if (!caseDefinition.options.exposeMemoryId) {
      assert.equal(Object.prototype.hasOwnProperty.call(projected, 'memoryId'), false, caseDefinition.id);
    }
    if (Object.prototype.hasOwnProperty.call(projected, 'memoryId')) {
      assert.equal(isBoundedId(projected.memoryId, 'memory'), true, caseDefinition.id);
    }
    assert.equal(Object.prototype.hasOwnProperty.call(projected, 'rawText'), false, caseDefinition.id);
    assert.equal(Object.prototype.hasOwnProperty.call(projected, 'provider'), false, caseDefinition.id);
    assert.equal(Object.prototype.hasOwnProperty.call(projected, 'token'), false, caseDefinition.id);
  }
});

test('CM1549 tag source and ranking compatibility cannot smuggle provider/raw/runtime changes', () => {
  const fixture = loadFixture();

  for (const caseDefinition of fixture.validTags) {
    const record = caseDefinition.record;
    assert.doesNotMatch(record.tagSource, /(provider|api|token|bearer|raw|scan)/i, caseDefinition.id);
    assert.equal(record.rankingCompatibility.runtimeWeightTuningApproved, false, caseDefinition.id);
  }

  const unsafeSourceCases = fixture.invalidTags
    .filter(item => /source/.test(item.id))
    .map(item => item.id)
    .sort();
  assert.deepEqual(unsafeSourceCases, [
    'provider-shaped-source',
    'raw-scan-source',
    'token-shaped-source'
  ]);
});

test('CM1549 fixture test does not rewrite its fixture file', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');
  loadFixture();
  const after = fs.readFileSync(fixturePath, 'utf8');

  assert.equal(after, before);
});
