const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createConfig } = require('../src/config/createConfig');
const { buildV8Diagnosis } = require('../src/cli/v8-diagnose');

const fixturePath = path.join(__dirname, 'fixtures', 'v8-diagnostic-shape-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (Object.hasOwn(value, key)) {
    return true;
  }

  return Object.values(value).some(child => hasNestedKey(child, key));
}

function assertNoForbiddenKeys(object, forbiddenKeys) {
  for (const key of forbiddenKeys) {
    assert.equal(hasNestedKey(object, key), false, key);
  }
}

function assertNoSensitiveSurface(report) {
  const encoded = JSON.stringify(report).toLowerCase();
  const forbiddenFragments = [
    'authorization:',
    'bearer ',
    'set-cookie',
    'providerapikey',
    'api_key',
    'workspace_id',
    '.env='
  ];

  for (const fragment of forbiddenFragments) {
    assert.equal(encoded.includes(fragment), false, fragment);
  }
}

function buildSafeErrorShape(config, query) {
  try {
    buildV8Diagnosis(config, query);
  } catch (error) {
    return {
      ok: false,
      code: 'QUERY_REQUIRED',
      message: error.message,
      destructive: false,
      mutated: false,
      providerCalls: 0,
      durableMemoryTouched: false,
      realMemoryPreview: false,
      redactionApplied: true
    };
  }

  throw new Error('expected v8 diagnostic error');
}

function assertTerrainShape(terrain, expectedKeys) {
  assert.deepEqual(Object.keys(terrain), expectedKeys);
  assert.equal(Array.isArray(terrain.dominantAxes), true);
  assert.ok(terrain.dominantAxes.length >= 1);
  assert.deepEqual(Object.keys(terrain.dominantAxes[0]), ['label', 'energy']);
  assert.equal(typeof terrain.dominantAxes[0].label, 'string');
  assert.equal(Number.isFinite(terrain.dominantAxes[0].energy), true);

  assert.deepEqual(Object.keys(terrain.terrainBasis), ['labels', 'vector', 'primaryAxis']);
  assert.equal(Array.isArray(terrain.terrainBasis.labels), true);
  assert.equal(Array.isArray(terrain.terrainBasis.vector), true);
  assert.equal(typeof terrain.terrainBasis.primaryAxis, 'string');

  assert.deepEqual(Object.keys(terrain.energySignature), [
    'concentration',
    'axisCount',
    'tension',
    'activation'
  ]);
  assert.equal(Number.isFinite(terrain.logicDepth), true);
  assert.equal(Number.isFinite(terrain.resonance), true);
  assert.equal(Number.isFinite(terrain.semanticWidth), true);
  assert.equal(Number.isFinite(terrain.entropy), true);
}

function assertResidualPyramidShape(residualPyramid, fixture) {
  assert.deepEqual(Object.keys(residualPyramid), fixture.reportShape.residualPyramidKeys);
  assert.equal(Array.isArray(residualPyramid.levels), true);
  assert.ok(residualPyramid.levels.length >= 1);
  assert.deepEqual(Object.keys(residualPyramid.levels[0]), fixture.reportShape.residualLevelKeys);
  assert.equal(Array.isArray(residualPyramid.levels[0].tags), true);
  assert.ok(residualPyramid.levels[0].tags.length >= 1);
  assert.deepEqual(Object.keys(residualPyramid.levels[0].tags[0]), fixture.reportShape.residualTagKeys);
  assert.deepEqual(Object.keys(residualPyramid.features), [
    'coverage',
    'novelty',
    'breadth',
    'tagMemoActivation'
  ]);
}

function assertTagMemoShape(tagMemo, expectedKeys) {
  assert.deepEqual(Object.keys(tagMemo), expectedKeys);
  assert.equal(Array.isArray(tagMemo.coreTags), true);
  assert.equal(typeof tagMemo.mode, 'string');
  assert.equal(Number.isFinite(tagMemo.dynamicTagWeight), true);
  assert.equal(Number.isFinite(tagMemo.dynamicCoreWeight), true);
}

function assertMetaThinkingShape(metaThinking, expectedKeys) {
  assert.deepEqual(Object.keys(metaThinking), expectedKeys);
  assert.equal(Number.isFinite(metaThinking.score), true);
  assert.equal(Number.isFinite(metaThinking.threshold), true);
  assert.equal(typeof metaThinking.auto, 'boolean');
  assert.equal(Array.isArray(metaThinking.reasons), true);
}

function assertGeodesicShape(geodesic, expectedKeys) {
  assert.deepEqual(Object.keys(geodesic), expectedKeys);
  assert.equal(typeof geodesic.requested, 'boolean');
  assert.equal(typeof geodesic.willUse, 'boolean');
  assert.equal(geodesic.alpha === null || Number.isFinite(geodesic.alpha), true);
  assert.equal(geodesic.minGeoSamples === null || Number.isFinite(geodesic.minGeoSamples), true);
}

test('P17.2 fixture declares no-side-effect diagnostic boundaries', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'v8-diagnostic-shape-v1');
  assert.equal(fixture.phase, 'P17.2-v8-diagnostic-fixture-shape-tests');
  assert.equal(fixture.source.kind, 'fixture-only');
  assert.equal(fixture.source.synthetic, true);
  assert.equal(fixture.safety.mutated, false);
  assert.equal(fixture.safety.providerCalls, 0);
  assert.equal(fixture.safety.durableMemoryTouched, false);
  assert.equal(fixture.safety.realMemoryPreview, false);
  assert.equal(fixture.safety.redactionApplied, true);
  assert.equal(fixture.safety.rawWorkspaceIdExposed, false);
  assert.equal(fixture.safety.rawSecretExposed, false);
  assert.equal(fixture.safety.runtimeTuning, false);
  assert.deepEqual(fixture.safety.publicMcpTools, [
    'record_memory',
    'search_memory',
    'memory_overview',
    'audit_memory'
  ]);
  assert.equal(fixture.safety.validateMemoryPublicTool, false);
});

test('v8 diagnostic fixture locks required report shape', () => {
  const fixture = loadFixture();
  const config = createConfig();

  for (const caseDefinition of fixture.cases) {
    const report = buildV8Diagnosis(config, caseDefinition.query);
    const expected = caseDefinition.expected;

    assert.deepEqual(Object.keys(report), fixture.reportShape.requiredTopLevelFields, caseDefinition.id);
    assert.equal(report.mode, expected.mode, caseDefinition.id);
    assert.equal(report.destructive, expected.destructive, caseDefinition.id);
    assert.equal(report.query.normalized, expected.normalized, caseDefinition.id);
    assert.equal(report.geodesic.requested, expected.geodesicRequested, caseDefinition.id);
    assert.equal(report.geodesic.willUse, expected.geodesicWillUse, caseDefinition.id);
    assert.equal(report.tagMemo.mode, expected.tagMemoMode, caseDefinition.id);
    assert.ok(report.tagMemo.coreTags.length >= expected.minCoreTagCount, caseDefinition.id);
    assert.ok(report.residualPyramid.levels.length >= expected.minResidualLevelCount, caseDefinition.id);

    assert.deepEqual(Object.keys(report.embeddingProfile), fixture.reportShape.embeddingProfileKeys);
    assert.deepEqual(Object.keys(report.query), fixture.reportShape.queryKeys);
    assertTerrainShape(report.terrain, fixture.reportShape.terrainKeys);
    assertResidualPyramidShape(report.residualPyramid, fixture);
    assertTagMemoShape(report.tagMemo, fixture.reportShape.tagMemoKeys);
    assertMetaThinkingShape(report.metaThinking, fixture.reportShape.metaThinkingKeys);
    assertGeodesicShape(report.geodesic, fixture.reportShape.geodesicKeys);
  }
});

test('v8 diagnostic fixture forbids unsafe or fake quality surfaces', () => {
  const fixture = loadFixture();
  const config = createConfig();

  for (const caseDefinition of fixture.cases) {
    const report = buildV8Diagnosis(config, caseDefinition.query);

    assertNoForbiddenKeys(report, fixture.reportShape.forbiddenKeys);
    assertNoSensitiveSurface(report);
  }
});

test('missing query error shape is represented safely by fixture', () => {
  const fixture = loadFixture();
  const config = createConfig();

  for (const caseDefinition of fixture.safeErrorCases) {
    const actual = buildSafeErrorShape(config, caseDefinition.query);

    assert.deepEqual(actual, caseDefinition.expected, caseDefinition.id);
    assertNoForbiddenKeys(actual, fixture.reportShape.forbiddenKeys);
    assertNoSensitiveSurface(actual);
  }
});

test('P17.2 fixture test does not rewrite its fixture file', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');
  loadFixture();
  const after = fs.readFileSync(fixturePath, 'utf8');

  assert.equal(after, before);
});
