'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');

const fixturePath = path.join(__dirname, 'fixtures', 'tag-extraction-deterministic-contract-cm1552-v1.json');

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

function isBoundedId(value, prefix) {
  return typeof value === 'string'
    && value.startsWith(`${prefix}:`)
    && /^[a-z]+:[a-z0-9:_-]+$/i.test(value)
    && !/[\\/]/.test(value)
    && !/^[A-Za-z]:[\\/]/.test(value);
}

function slugFor(value) {
  return value.replace(/\s+/g, '-');
}

function memoryFragment(memoryId) {
  return memoryId.replace(/^memory:/, '').replace(/:/g, '-');
}

function sourceFragment(tagSource) {
  return tagSource.replace(/_/g, '-');
}

function bucketFor(score) {
  if (score < 0.5) return 'low';
  if (score < 0.8) return 'medium';
  return 'high';
}

function isUnsafeText(value) {
  return typeof value === 'string' && (
    /[\\/]/.test(value)
    || /^[A-Za-z]:/.test(value)
    || /(provider|api[_ -]?(key|endpoint)|token|bearer|raw[_ -]?(scan|audit|text|content|body|memory)|jsonl|sqlite|vector|lifecycle)/i.test(value)
  );
}

function normalizeTagLabel(value) {
  if (typeof value !== 'string') return null;
  const normalized = value
    .trim()
    .replace(/^[*+#.\-\s]+/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  if (!normalized || isUnsafeText(normalized)) return null;
  return normalized;
}

function lowDisclosureResult(reason, memoryId) {
  const result = {
    schemaVersion: 'tagmemo-deterministic-extraction-output-v1',
    tags: [],
    rejected: true,
    reason,
    lowDisclosure: true,
    mutated: false,
    providerCalls: 0,
    publicMcpExpansion: 0
  };
  if (memoryId) result.memoryId = memoryId;
  return result;
}

function validateInput(input, contract) {
  const inputKeys = Object.keys(input);
  if (inputKeys.some(key => !contract.allowedInputKeys.includes(key))) {
    const forbiddenKey = inputKeys.find(key => contract.forbiddenRawPrivateKeys.includes(key));
    return { ok: false, reason: forbiddenKey ? 'forbidden_raw_private_field' : 'unsupported_input_field' };
  }

  assert.equal(input.schemaVersion, contract.inputSchemaVersion);

  if (!input.memoryId) {
    return { ok: false, reason: 'missing_memory_id' };
  }
  if (!isBoundedId(input.memoryId, 'memory')) {
    return { ok: false, reason: 'invalid_memory_id' };
  }

  const metadata = input.metadataProjection;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return { ok: false, reason: 'invalid_metadata_projection' };
  }

  const metadataKeys = Object.keys(metadata);
  if (metadataKeys.some(key => !contract.allowedMetadataKeys.includes(key))) {
    return { ok: false, reason: 'unsupported_metadata_field' };
  }
  if (!contract.allowedSourceKinds.includes(metadata.sourceKind)) {
    return { ok: false, reason: 'unsupported_source_kind' };
  }

  assert.equal(typeof input.boundedMemoryText, 'string');
  assert.equal(Array.isArray(metadata.explicitTags), true);
  assert.equal(Array.isArray(metadata.queryCoreTags), true);

  return { ok: true };
}

function extractFixtureTags(input, contract) {
  const inputValidation = validateInput(input, contract);
  if (!inputValidation.ok) {
    return lowDisclosureResult(inputValidation.reason, input.memoryId);
  }

  const serialized = JSON.stringify(input);
  if (contract.forbiddenValueFragments.some(fragment => serialized.includes(fragment))) {
    return lowDisclosureResult('forbidden_raw_private_value', input.memoryId);
  }

  const metadata = input.metadataProjection;
  const candidates = [
    ...metadata.explicitTags.map(label => ({ label, tagSource: 'explicit_record_tag' })),
    ...metadata.queryCoreTags.map(label => ({ label, tagSource: 'query_core_tag' }))
  ];

  const hasBoundedContent = Boolean(input.boundedMemoryText.trim()
    || metadata.title.trim()
    || metadata.summary.trim()
    || candidates.length);
  if (!hasBoundedContent) {
    return lowDisclosureResult('empty_input', input.memoryId);
  }

  const deduped = new Map();
  for (const candidate of candidates) {
    const tagLabel = normalizeTagLabel(candidate.label);
    if (!tagLabel) {
      return lowDisclosureResult('unsafe_candidate_label', input.memoryId);
    }
    if (!contract.allowedTagSources.includes(candidate.tagSource) || isUnsafeText(candidate.tagSource)) {
      return lowDisclosureResult('unsupported_tag_source', input.memoryId);
    }

    const existing = deduped.get(tagLabel);
    if (!existing) {
      deduped.set(tagLabel, { tagLabel, tagSource: candidate.tagSource });
      continue;
    }

    const existingTrust = contract.sourceTrustOrder.indexOf(existing.tagSource);
    const nextTrust = contract.sourceTrustOrder.indexOf(candidate.tagSource);
    if (nextTrust >= 0 && (existingTrust < 0 || nextTrust < existingTrust)) {
      deduped.set(tagLabel, { tagLabel, tagSource: candidate.tagSource });
    }
  }

  const memorySafe = memoryFragment(input.memoryId);
  const tags = [...deduped.values()]
    .sort((a, b) => a.tagLabel.localeCompare(b.tagLabel)
      || a.tagSource.localeCompare(b.tagSource)
      || slugFor(a.tagLabel).localeCompare(slugFor(b.tagLabel)))
    .map(({ tagLabel, tagSource }) => {
      const confidenceScore = contract.confidenceBySource[tagSource];
      return {
        schemaVersion: contract.tagSchemaVersion,
        tagId: `tag:${memorySafe}:${slugFor(tagLabel)}`,
        tagLabel,
        tagSource,
        confidenceScore,
        confidenceBucket: bucketFor(confidenceScore),
        evidenceSourceId: `evidence:${memorySafe}:${sourceFragment(tagSource)}`,
        memoryId: input.memoryId,
        rankingCompatibility: {
          mayContributeToTagMemoScore: true,
          mayContributeToStructuralSignal: true,
          runtimeWeightTuningApproved: false
        }
      };
    });

  return {
    schemaVersion: contract.outputSchemaVersion,
    memoryId: input.memoryId,
    tags,
    mutated: false,
    providerCalls: 0,
    publicMcpExpansion: 0
  };
}

function validateMinimalTagRecord(record, contract) {
  for (const field of contract.requiredTagFields) {
    assert.equal(Object.prototype.hasOwnProperty.call(record, field), true, field);
  }

  assert.equal(record.schemaVersion, contract.tagSchemaVersion);
  assert.equal(isBoundedId(record.tagId, 'tag'), true);
  assert.equal(isBoundedId(record.evidenceSourceId, 'evidence'), true);
  assert.equal(isBoundedId(record.memoryId, 'memory'), true);
  assert.equal(typeof record.tagLabel, 'string');
  assert.equal(record.tagLabel, normalizeTagLabel(record.tagLabel));
  assert.equal(contract.allowedTagSources.includes(record.tagSource), true);
  assert.doesNotMatch(record.tagSource, /(provider|api|token|bearer|raw|scan)/i);
  assert.equal(Number.isFinite(record.confidenceScore), true);
  assert.equal(record.confidenceScore >= 0, true);
  assert.equal(record.confidenceScore <= 1, true);
  assert.equal(record.confidenceBucket, bucketFor(record.confidenceScore));
  assert.equal(record.rankingCompatibility.runtimeWeightTuningApproved, false);
  assertNoForbiddenKeys(record, contract.forbiddenRawPrivateKeys);
  assertNoForbiddenValues(record, contract.forbiddenValueFragments);
}

function projectPublicTagRecord(record) {
  return {
    schemaVersion: record.schemaVersion,
    tagId: record.tagId,
    tagLabel: record.tagLabel,
    tagSource: record.tagSource,
    confidenceBucket: record.confidenceBucket,
    memoryLinkagePresent: Boolean(record.memoryId),
    rankingCompatible: Boolean(record.rankingCompatibility?.mayContributeToTagMemoScore
      || record.rankingCompatibility?.mayContributeToStructuralSignal)
  };
}

test('CM1552 fixture declares fixture-only boundaries and seven public tools', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'tag-extraction-deterministic-contract-cm1552-v1');
  assert.equal(fixture.source.kind, 'fixture-only');
  assert.equal(fixture.source.synthetic, true);
  assert.equal(fixture.source.runtimeTagExtractionImplemented, false);
  assert.equal(fixture.source.deterministicContractOnly, true);
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

test('CM1552 inputs use only bounded memory text and metadata projection', () => {
  const fixture = loadFixture();
  const contract = fixture.contract;
  const cases = [...fixture.validExtractionCases, ...fixture.rejectedInputCases];

  for (const caseDefinition of cases) {
    const keys = Object.keys(caseDefinition.input);
    const expectedAllowedOrForbidden = keys.every(key => contract.allowedInputKeys.includes(key)
      || contract.forbiddenRawPrivateKeys.includes(key));
    assert.equal(expectedAllowedOrForbidden, true, caseDefinition.id);
    if (caseDefinition.input.metadataProjection) {
      const metadataKeys = Object.keys(caseDefinition.input.metadataProjection);
      assert.equal(metadataKeys.every(key => contract.allowedMetadataKeys.includes(key)), true, caseDefinition.id);
    }
  }
});

test('CM1552 deterministic normalization and duplicate handling are reproducible', () => {
  const fixture = loadFixture();
  const contract = fixture.contract;

  for (const caseDefinition of fixture.normalizationCases) {
    assert.equal(normalizeTagLabel(caseDefinition.input), caseDefinition.expected, caseDefinition.id);
  }

  const expectedById = new Map(fixture.validExtractionCases.map(item => [
    item.id,
    item.expectedOutput ?? fixture.validExtractionCases.find(candidate => candidate.id === item.expectedOutputRef).expectedOutput
  ]));

  for (const caseDefinition of fixture.validExtractionCases) {
    const first = extractFixtureTags(caseDefinition.input, contract);
    const second = extractFixtureTags(caseDefinition.input, contract);
    const expected = expectedById.get(caseDefinition.id);

    assert.deepEqual(first, second, caseDefinition.id);
    assert.deepEqual(first, expected, caseDefinition.id);
  }
});

test('CM1552 outputs are TagMemo minimal schema compatible with valid confidence scores', () => {
  const fixture = loadFixture();
  const contract = fixture.contract;

  for (const caseDefinition of fixture.validExtractionCases) {
    const output = extractFixtureTags(caseDefinition.input, contract);
    assert.equal(output.schemaVersion, contract.outputSchemaVersion);
    assert.equal(output.mutated, false);
    assert.equal(output.providerCalls, 0);
    assert.equal(output.publicMcpExpansion, 0);

    for (const tag of output.tags) {
      validateMinimalTagRecord(tag, contract);
    }
  }
});

test('CM1552 empty and rejected inputs fail closed with low-disclosure output', () => {
  const fixture = loadFixture();
  const contract = fixture.contract;

  for (const caseDefinition of fixture.rejectedInputCases) {
    const output = extractFixtureTags(caseDefinition.input, contract);
    assert.equal(output.rejected, true, caseDefinition.id);
    assert.equal(output.reason, caseDefinition.expectedReason, caseDefinition.id);
    assert.equal(output.lowDisclosure, true, caseDefinition.id);
    assert.deepEqual(output.tags, [], caseDefinition.id);
    assert.equal(output.mutated, false, caseDefinition.id);
    assert.equal(output.providerCalls, 0, caseDefinition.id);
    assert.equal(output.publicMcpExpansion, 0, caseDefinition.id);
    assert.equal(JSON.stringify(output).includes(caseDefinition.forbiddenEcho), false, caseDefinition.id);
    assertNoForbiddenKeys(output, contract.forbiddenRawPrivateKeys);
    assertNoForbiddenValues(output, contract.forbiddenValueFragments);
  }
});

test('CM1552 bounded public projection excludes forbidden raw/private fields', () => {
  const fixture = loadFixture();
  const contract = fixture.contract;
  const outputByCaseId = new Map(fixture.validExtractionCases.map(item => [
    item.id,
    extractFixtureTags(item.input, contract)
  ]));

  for (const caseDefinition of fixture.publicProjectionCases) {
    const output = outputByCaseId.get(caseDefinition.sourceCaseId);
    const tag = output.tags.find(candidate => candidate.tagId === caseDefinition.sourceTagId);
    const projection = projectPublicTagRecord(tag);

    assert.deepEqual(sorted(Object.keys(projection)), sorted(caseDefinition.expectedKeys), caseDefinition.id);
    assertNoForbiddenKeys(projection, contract.forbiddenRawPrivateKeys);
    assertNoForbiddenValues(projection, contract.forbiddenValueFragments);
    assert.equal(Object.prototype.hasOwnProperty.call(projection, 'memoryId'), false, caseDefinition.id);
    assert.equal(Object.prototype.hasOwnProperty.call(projection, 'boundedMemoryText'), false, caseDefinition.id);
    assert.equal(Object.prototype.hasOwnProperty.call(projection, 'evidenceSourceId'), false, caseDefinition.id);
    assert.equal(Object.prototype.hasOwnProperty.call(projection, 'confidenceScore'), false, caseDefinition.id);
  }
});

test('CM1552 fixture test does not rewrite its fixture file', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');
  loadFixture();
  const after = fs.readFileSync(fixturePath, 'utf8');

  assert.equal(after, before);
});
