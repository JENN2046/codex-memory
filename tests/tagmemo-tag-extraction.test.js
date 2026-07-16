'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  extractDeterministicTags,
  normalizeTagLabel
} = require('../src/tagmemo/tag-extraction');

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

function assertNoForbiddenKeys(value) {
  const forbidden = [
    'rawText',
    'rawContent',
    'content',
    'rawBody',
    'transcript',
    'rawAudit',
    'rawJsonl',
    'sqliteRow',
    'vectorPayload',
    'candidateCachePayload',
    'sourceFile',
    'fullPath',
    'filePath',
    'relativePath',
    'provider',
    'apiKey',
    'token',
    'authorization',
    'bearer',
    'privateLifecycleState',
    'localPath',
    'providerEndpoint'
  ];
  const keys = collectKeys(value);
  for (const key of forbidden) {
    assert.equal(keys.includes(key), false, key);
  }
}

function assertNoForbiddenFragments(value) {
  const serialized = JSON.stringify(value);
  for (const fragment of [
    'cm1555-provider-endpoint',
    'cm1555-token-fragment',
    'cm1555-bearer-fragment',
    'cm1555-raw-memory-body',
    'cm1555-private-lifecycle',
    'cm1555-jsonl-row',
    'cm1555-sqlite-row'
  ]) {
    assert.equal(serialized.includes(fragment), false, fragment);
  }
}

function boundedInput(overrides = {}) {
  return {
    schemaVersion: 'tagmemo-deterministic-extraction-input-v1',
    memoryId: 'memory:cm1555:alpha-001',
    boundedMemoryText: 'Bounded TagMemo recall projection fixture text.',
    metadataProjection: {
      title: 'Deterministic Tag Extraction',
      summary: 'Low disclosure contract fixture',
      explicitTags: [
        ' Recall_Projection ',
        '- TagMemo-contract',
        'recall projection'
      ],
      queryCoreTags: [
        'bounded_projection',
        'schema candidate',
        'recall_projection'
      ],
      sourceKind: 'selected_projection'
    },
    ...overrides
  };
}

function byLabel(output) {
  return new Map(output.tags.map(tag => [tag.tagLabel, tag]));
}

function assertMinimalTag(tag) {
  assert.deepEqual(sorted(Object.keys(tag)), sorted([
    'schemaVersion',
    'tagId',
    'tagLabel',
    'tagSource',
    'confidenceScore',
    'confidenceBucket',
    'evidenceSourceId',
    'memoryId',
    'rankingCompatibility'
  ]));
  assert.equal(tag.schemaVersion, 'tagmemo-minimal-tag-v1');
  assert.match(tag.tagId, /^tag:[a-z0-9:_-]+$/i);
  assert.match(tag.evidenceSourceId, /^evidence:[a-z0-9:_-]+$/i);
  assert.match(tag.memoryId, /^memory:[a-z0-9:_-]+$/i);
  assert.equal(tag.tagLabel, normalizeTagLabel(tag.tagLabel));
  assert.doesNotMatch(tag.tagSource, /(provider|api|token|bearer|raw|scan)/i);
  assert.equal(Number.isFinite(tag.confidenceScore), true);
  assert.equal(tag.confidenceScore >= 0, true);
  assert.equal(tag.confidenceScore <= 1, true);
  if (tag.confidenceScore < 0.5) {
    assert.equal(tag.confidenceBucket, 'low');
  } else if (tag.confidenceScore < 0.8) {
    assert.equal(tag.confidenceBucket, 'medium');
  } else {
    assert.equal(tag.confidenceBucket, 'high');
  }
  assert.equal(tag.rankingCompatibility.runtimeWeightTuningApproved, false);
  assertNoForbiddenKeys(tag);
  assertNoForbiddenFragments(tag);
}

test('CM1555 normalizes labels deterministically', () => {
  assert.equal(normalizeTagLabel('  Recall_Projection  '), 'recall projection');
  assert.equal(normalizeTagLabel('- TagMemo-contract'), 'tagmemo contract');
  assert.equal(normalizeTagLabel('   '), null);
  assert.equal(normalizeTagLabel('A:/cm1555/should-not-leak'), null);
  assert.equal(normalizeTagLabel('cm1555-provider-endpoint'), null);
});

test('CM1555 deterministic output is stable and TagMemo minimal schema compatible', () => {
  const first = extractDeterministicTags(boundedInput());
  const second = extractDeterministicTags(boundedInput());

  assert.deepEqual(first, second);
  assert.equal(first.schemaVersion, 'tagmemo-deterministic-extraction-output-v1');
  assert.equal(first.memoryId, 'memory:cm1555:alpha-001');
  assert.equal(first.rejected, false);
  assert.equal(first.lowDisclosure, true);
  assert.equal(first.mutated, false);
  assert.equal(first.providerCalls, 0);
  assert.equal(first.publicMcpExpansion, 0);
  assert.equal(first.tags.length >= 4, true);

  for (const tag of first.tags) {
    assertMinimalTag(tag);
  }
});

test('CM1555 duplicate labels merge by deterministic source trust and score', () => {
  const output = extractDeterministicTags(boundedInput({
    metadataProjection: {
      title: 'Duplicate merge',
      summary: 'Duplicate merge bounded summary',
      explicitTags: [
        'recall projection',
        ' Recall_Projection '
      ],
      queryCoreTags: [
        'recall_projection'
      ],
      sourceKind: 'fixture'
    }
  }));
  const tags = byLabel(output);

  assert.equal(tags.has('recall projection'), true);
  assert.equal(tags.get('recall projection').tagSource, 'explicit_record_tag');
  assert.equal(tags.get('recall projection').confidenceScore, 0.95);
  assert.equal(output.tags.filter(tag => tag.tagLabel === 'recall projection').length, 1);
});

test('CM1555 confidence scores and tag sources stay bounded and low risk', () => {
  const output = extractDeterministicTags(boundedInput());
  const tags = byLabel(output);

  assert.equal(tags.get('recall projection').confidenceBucket, 'high');
  assert.equal(tags.get('bounded projection').confidenceBucket, 'medium');
  for (const tag of output.tags) {
    assert.equal(tag.confidenceScore >= 0 && tag.confidenceScore <= 1, true);
    assert.equal([
      'explicit_record_tag',
      'query_core_tag',
      'derived_candidate'
    ].includes(tag.tagSource), true);
    assert.doesNotMatch(tag.tagSource, /(provider|api|token|bearer|raw|scan)/i);
  }
});

test('CM1555 empty input returns low-disclosure result', () => {
  const output = extractDeterministicTags(boundedInput({
    memoryId: 'memory:cm1555:empty-001',
    boundedMemoryText: '',
    metadataProjection: {
      title: '',
      summary: '',
      explicitTags: [],
      queryCoreTags: [],
      sourceKind: 'fixture'
    }
  }));

  assert.equal(output.rejected, true);
  assert.equal(output.reason, 'empty_input');
  assert.equal(output.lowDisclosure, true);
  assert.deepEqual(output.tags, []);
  assert.equal(output.mutated, false);
  assert.equal(output.providerCalls, 0);
  assert.equal(output.publicMcpExpansion, 0);
});

test('CM1555 rejected input is low-disclosure and does not echo forbidden values', () => {
  const cases = [
    {
      expectedReason: 'missing_memory_id',
      input: (() => {
        const value = boundedInput();
        delete value.memoryId;
        return value;
      })()
    },
    {
      expectedReason: 'forbidden_raw_private_field',
      input: {
        ...boundedInput({ memoryId: 'memory:cm1555:raw-field' }),
        rawText: 'cm1555-raw-memory-body'
      }
    },
    {
      expectedReason: 'forbidden_raw_private_value',
      input: boundedInput({
        memoryId: 'memory:cm1555:provider-value',
        metadataProjection: {
          title: 'Provider rejection',
          summary: 'Bounded summary',
          explicitTags: ['cm1555-provider-endpoint'],
          queryCoreTags: [],
          sourceKind: 'fixture'
        }
      })
    },
    {
      expectedReason: 'unsupported_source_kind',
      input: boundedInput({
        memoryId: 'memory:cm1555:unsupported-kind',
        metadataProjection: {
          title: 'Unsupported source',
          summary: 'Bounded summary',
          explicitTags: ['safe tag'],
          queryCoreTags: [],
          sourceKind: 'provider_signal'
        }
      })
    }
  ];

  for (const caseDefinition of cases) {
    const output = extractDeterministicTags(caseDefinition.input);
    assert.equal(output.rejected, true, caseDefinition.expectedReason);
    assert.equal(output.reason, caseDefinition.expectedReason);
    assert.equal(output.lowDisclosure, true);
    assert.deepEqual(output.tags, []);
    assert.equal(output.mutated, false);
    assert.equal(output.providerCalls, 0);
    assert.equal(output.publicMcpExpansion, 0);
    assertNoForbiddenKeys(output);
    assertNoForbiddenFragments(output);
  }
});

test('CM1555 implementation does not expand public MCP surface', () => {
  assert.deepEqual(sorted(publicToolNames()), sorted([
    'record_memory',
    'search_memory',
    'memory_overview',
    'audit_memory',
  'prepare_memory_context',
'propose_memory_delta',
'validate_memory',
    'tombstone_memory',
    'supersede_memory'
  ]));
  assert.equal(publicToolNames().length, 9);
});
