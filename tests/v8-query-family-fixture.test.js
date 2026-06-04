const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createConfig } = require('../src/config/createConfig');
const { buildV8Diagnosis } = require('../src/cli/v8-diagnose');

const fixturePath = path.join(__dirname, 'fixtures', 'v8-query-family-v1.json');

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

function assertForbiddenKeysAbsent(report, forbiddenKeys) {
  for (const key of forbiddenKeys) {
    assert.equal(hasNestedKey(report, key), false, key);
  }
}

function assertFiniteMetric(value, label) {
  assert.equal(Number.isFinite(value), true, label);
}

function assertDiagnosticFamily(report, family, forbiddenKeys) {
  const expected = family.expected;

  assert.equal(report.mode, 'v8-diagnose', family.id);
  assert.equal(report.destructive, false, family.id);
  assert.equal(report.query.normalized, expected.normalized, family.id);
  assert.equal(report.tagMemo.mode, expected.tagMemoMode, family.id);
  assert.equal(report.geodesic.requested, expected.geodesicRequested, family.id);
  assert.equal(report.geodesic.willUse, expected.geodesicWillUse, family.id);

  for (const tag of expected.requiredCoreTags) {
    assert.ok(report.tagMemo.coreTags.includes(tag), `${family.id}:${tag}`);
  }

  assert.ok(expected.allowedPrimaryAxes.includes(report.terrain.terrainBasis.primaryAxis), family.id);
  assert.ok(report.terrain.dominantAxes.length >= 3, family.id);
  assert.ok(report.residualPyramid.levels.length >= 1, family.id);
  assert.ok(report.residualPyramid.levels[0].tags.length >= 1, family.id);

  assertFiniteMetric(report.terrain.energySignature.activation, `${family.id}:activation`);
  assertFiniteMetric(report.terrain.energySignature.tension, `${family.id}:tension`);
  assertFiniteMetric(report.terrain.logicDepth, `${family.id}:logicDepth`);
  assertFiniteMetric(report.terrain.resonance, `${family.id}:resonance`);
  assertFiniteMetric(report.terrain.semanticWidth, `${family.id}:semanticWidth`);
  assertFiniteMetric(report.terrain.entropy, `${family.id}:entropy`);
  assertFiniteMetric(report.residualPyramid.features.coverage, `${family.id}:coverage`);
  assertFiniteMetric(report.residualPyramid.features.novelty, `${family.id}:novelty`);
  assertFiniteMetric(report.metaThinking.score, `${family.id}:metaThinking`);
  assert.equal(Array.isArray(report.metaThinking.reasons), true, family.id);
  assertForbiddenKeysAbsent(report, forbiddenKeys);
}

test('P17.4 query-family fixture declares no-side-effect boundaries', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'v8-query-family-v1');
  assert.equal(fixture.phase, 'P17.4-v8-query-family-fixture-tests');
  assert.equal(fixture.source.kind, 'fixture-only');
  assert.equal(fixture.source.synthetic, true);
  assert.equal(fixture.safety.mutated, false);
  assert.equal(fixture.safety.providerCalls, 0);
  assert.equal(fixture.safety.durableMemoryTouched, false);
  assert.equal(fixture.safety.realMemoryPreview, false);
  assert.equal(fixture.safety.redactionApplied, true);
  assert.equal(fixture.safety.runtimeTuning, false);
  assert.deepEqual(fixture.safety.publicMcpTools, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
  assert.equal(fixture.safety.validateMemoryPublicTool, false);
});

test('P17.4 query-family fixture covers expected diagnostic categories', () => {
  const fixture = loadFixture();
  const categories = fixture.families.map(family => family.category);

  assert.deepEqual(categories, [
    'technical',
    'governance',
    'quality',
    'semantic',
    'safety'
  ]);
});

test('v8 diagnostic query families expose stable signal shape without quality claims', () => {
  const fixture = loadFixture();
  const config = createConfig();

  for (const family of fixture.families) {
    const report = buildV8Diagnosis(config, family.query);
    assertDiagnosticFamily(report, family, fixture.forbiddenOutputKeys);
  }
});

test('P17.4 query-family fixture test does not rewrite its fixture file', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');
  loadFixture();
  const after = fs.readFileSync(fixturePath, 'utf8');

  assert.equal(after, before);
});
