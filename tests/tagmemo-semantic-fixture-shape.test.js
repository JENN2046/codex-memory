const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { CompatibilitySyntaxAdapter } = require('../src/adapters/vcp-passive-memory/CompatibilitySyntaxAdapter');
const { VcpLightMemoryAdapter } = require('../src/adapters/vcp-light-memory');
const { TagMemoEngine } = require('../src/recall/TagMemoEngine');

const fixturePath = path.join(__dirname, 'fixtures', 'tagmemo-semantic-fixture-shape-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function createEngine(fixture) {
  return new TagMemoEngine({
    config: {
      tagMemoDynamicWeightRange: fixture.engineConfig.tagMemoDynamicWeightRange,
      tagMemoCoreBoostRange: fixture.engineConfig.tagMemoCoreBoostRange,
      metaThinkingAutoThreshold: fixture.engineConfig.metaThinkingAutoThreshold
    }
  });
}

function assertNoForbiddenKeys(object, forbiddenKeys) {
  const encoded = JSON.stringify(object);
  for (const key of forbiddenKeys) {
    assert.equal(encoded.includes(`"${key}"`), false, key);
  }
}

function telemetrySnapshot({ parsed, analysis, score }) {
  return {
    query: parsed.query,
    directives: parsed.directives,
    coreTags: analysis.coreTags,
    matchedTags: score.matchedTags,
    matchedCoreTags: score.matchedCoreTags,
    tagHitCount: score.tagHitCount,
    titleHitCount: score.titleHitCount,
    contentHitCount: score.contentHitCount,
    evidenceHitCount: score.evidenceHitCount,
    queryAxes: analysis.metrics.dominantAxes.map(axis => axis.label),
    terrainPrimaryAxis: analysis.metrics.terrainBasis.primaryAxis,
    residualLevelCount: analysis.pyramid.levels.length,
    metaThinkingScore: analysis.metaThinking.score,
    metaThinkingAuto: analysis.metaThinking.auto,
    metaThinkingReasons: analysis.metaThinking.reasons,
    rerankMode: parsed.directives.geodesicrerank ? 'local-rrf-geodesic' : 'local-rrf',
    semanticCandidateCount: 4
  };
}

test('P16.2 fixture declares no-side-effect safety boundaries', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'tagmemo-semantic-fixture-shape-v1');
  assert.equal(fixture.phase, 'P16.2-TagMemo-semantic-fixture-shape-tests');
  assert.equal(fixture.source.kind, 'fixture-only');
  assert.equal(fixture.source.synthetic, true);
  assert.equal(fixture.safety.mutated, false);
  assert.equal(fixture.safety.providerCalls, 0);
  assert.equal(fixture.safety.durableMemoryTouched, false);
  assert.equal(fixture.safety.runtimeTuning, false);
  assert.deepEqual(fixture.safety.publicMcpTools, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
  assert.equal(fixture.safety.validateMemoryPublicTool, false);
});

test('TagMemo directive fixture locks parse and analysis shape', () => {
  const fixture = loadFixture();
  const adapter = new CompatibilitySyntaxAdapter();
  const engine = createEngine(fixture);

  for (const caseDefinition of fixture.directiveCases) {
    const parsed = adapter.parse(caseDefinition.query);
    const analysis = engine.analyzeQuery(parsed);
    const expected = caseDefinition.expected;

    assert.equal(parsed.query, expected.query, caseDefinition.id);
    if (expected.passiveBlocks) {
      assert.deepEqual(parsed.passiveBlocks, expected.passiveBlocks, caseDefinition.id);
    }
    if (expected.modifiers) {
      assert.deepEqual(parsed.modifiers, expected.modifiers, caseDefinition.id);
    }
    assert.deepEqual(parsed.directives, expected.directives, caseDefinition.id);
    if (expected.geodesicRerank === false) {
      assert.equal(Object.hasOwn(parsed.directives, 'geodesicrerank'), false, caseDefinition.id);
    }

    assert.equal(analysis.queryText, expected.analysis.queryText || expected.query, caseDefinition.id);
    if (expected.analysis.coreTags) {
      assert.deepEqual(analysis.coreTags, expected.analysis.coreTags, caseDefinition.id);
    }
    assert.equal(analysis.tagMemoMode, expected.analysis.tagMemoMode, caseDefinition.id);
    assert.equal(analysis.dynamicTagWeight, expected.analysis.dynamicTagWeight, caseDefinition.id);
    assert.equal(analysis.dynamicCoreWeight, expected.analysis.dynamicCoreWeight, caseDefinition.id);
    assert.equal(analysis.metrics.terrainBasis.primaryAxis, expected.analysis.primaryAxis, caseDefinition.id);
    assert.equal(analysis.metaThinking.auto, expected.analysis.metaThinkingAuto, caseDefinition.id);
    assert.deepEqual(analysis.metaThinking.reasons, expected.analysis.metaThinkingReasons, caseDefinition.id);
    if (expected.analysis.residualLevelCount !== undefined) {
      assert.equal(analysis.pyramid.levels.length, expected.analysis.residualLevelCount, caseDefinition.id);
    }
    if (expected.analysis.residualCoverage !== undefined) {
      assert.equal(analysis.pyramid.features.coverage, expected.analysis.residualCoverage, caseDefinition.id);
    }
  }
});

test('TagMemo fixture locks tag/title/body/evidence scoring contribution shape', () => {
  const fixture = loadFixture();
  const adapter = new CompatibilitySyntaxAdapter();
  const engine = createEngine(fixture);
  const sourceCase = fixture.directiveCases.find(item => item.id === fixture.scoringCase.sourceDirectiveCaseId);
  const parsed = adapter.parse(sourceCase.query);
  const analysis = engine.analyzeQuery(parsed);
  const scored = [];

  for (const record of fixture.scoringCase.records) {
    const score = engine.scoreRecord(record, analysis);
    const expected = record.expectedScore;

    assert.equal(score.boost, expected.boost, record.id);
    assert.equal(score.normalizedScore, expected.normalizedScore, record.id);
    assert.equal(score.surfaceScore, expected.surfaceScore, record.id);
    assert.deepEqual(score.matchedTags, expected.matchedTags, record.id);
    assert.deepEqual(score.matchedCoreTags, expected.matchedCoreTags, record.id);
    assert.equal(score.tagHitCount, expected.tagHitCount, record.id);
    assert.equal(score.titleHitCount, expected.titleHitCount, record.id);
    assert.equal(score.contentHitCount, expected.contentHitCount, record.id);
    assert.equal(score.evidenceHitCount, expected.evidenceHitCount, record.id);
    assert.equal(score.exactCoreTagCount, expected.exactCoreTagCount, record.id);
    scored.push({ id: record.id, score });
  }

  const actualOrdering = [...scored]
    .sort((left, right) => right.score.boost - left.score.boost)
    .map(item => item.id);
  assert.deepEqual(actualOrdering, fixture.scoringCase.expectedOrdering);
});

test('TagMemo telemetry fixture locks report keys and forbids fake quality fields', () => {
  const fixture = loadFixture();
  const adapter = new CompatibilitySyntaxAdapter();
  const engine = createEngine(fixture);
  const sourceCase = fixture.directiveCases.find(item => item.id === fixture.scoringCase.sourceDirectiveCaseId);
  const parsed = adapter.parse(sourceCase.query);
  const analysis = engine.analyzeQuery(parsed);
  const score = engine.scoreRecord(fixture.scoringCase.records[0], analysis);
  const snapshot = telemetrySnapshot({ parsed, analysis, score });

  assert.deepEqual(Object.keys(snapshot), fixture.telemetryShape.requiredKeys);
  assertNoForbiddenKeys(snapshot, fixture.telemetryShape.forbiddenKeys);
});

test('LightMemo TagMemo fixture locks option-to-compatibility-query mapping', async () => {
  const fixture = loadFixture();

  for (const caseDefinition of fixture.lightMemoCases) {
    const calls = [];
    const adapter = new VcpLightMemoryAdapter({
      config: {},
      vcpPassiveMemoryAdapter: {
        search: async (compatibilityQuery, options) => {
          calls.push({ compatibilityQuery, options });
          return { results: [] };
        }
      }
    });

    const response = await adapter.search(caseDefinition.input);

    assert.equal(response.mode, 'lightmemo', caseDefinition.id);
    assert.equal(response.target, caseDefinition.expected.target, caseDefinition.id);
    assert.equal(response.compatibilityQuery, caseDefinition.expected.compatibilityQuery, caseDefinition.id);
    assert.equal(calls.length, 1, caseDefinition.id);
    assert.equal(calls[0].compatibilityQuery, caseDefinition.expected.compatibilityQuery, caseDefinition.id);
    assert.equal(calls[0].options.target, caseDefinition.expected.target, caseDefinition.id);
    assert.equal(calls[0].options.limit, caseDefinition.expected.limit, caseDefinition.id);
    assert.deepEqual(response.results, [], caseDefinition.id);
  }
});

test('P16.2 fixture test does not rewrite its fixture file', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');
  loadFixture();
  const after = fs.readFileSync(fixturePath, 'utf8');

  assert.equal(after, before);
});
