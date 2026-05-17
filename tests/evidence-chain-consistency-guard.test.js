const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  BLOCKED_ACTIONS: P41_BLOCKED_ACTIONS,
  CRITICAL_FAILURE_STATES,
  EXPECTED_SCHEMA_VERSION: P41_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_SOURCE_EVIDENCE_IDS,
  SAFE_SOURCE_TYPES: P41_SAFE_SOURCE_TYPES
} = require('../src/core/EvidenceManifestContract');
const {
  BLOCKED_ACTIONS: P45_BLOCKED_ACTIONS,
  EXPECTED_MODE: P45_EXPECTED_MODE,
  EXPECTED_SCHEMA_VERSION: P45_SCHEMA_VERSION,
  FAIL_CLOSED_STATES,
  REQUIRED_A5_BLOCKER_IDS,
  REQUIRED_EVIDENCE_IDS,
  SAFE_SOURCE_TYPES: P45_SAFE_SOURCE_TYPES
} = require('../src/core/FinalRcMatrixEvaluator');

const fixturesDir = path.join(__dirname, 'fixtures');

function loadFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, name), 'utf8'));
}

function unique(values) {
  return [...new Set(values)];
}

function assertExactSet(actual, expected, label) {
  assert.deepEqual([...actual].sort(), [...expected].sort(), label);
  assert.equal(unique(actual).length, actual.length, `${label} has duplicates`);
}

test('P48 guard keeps P41 source evidence aligned to committed P36-P40 fixtures', () => {
  const manifest = loadFixture('p41-evidence-manifest-contract-v1.json');
  const sourceIds = manifest.sourceEvidence.map(source => source.id);
  const artifactPaths = manifest.sourceEvidence.map(source => source.artifact);

  assert.equal(manifest.schemaVersion, P41_SCHEMA_VERSION);
  assertExactSet(sourceIds, REQUIRED_SOURCE_EVIDENCE_IDS, 'P41 source evidence ids');
  assertExactSet(manifest.safeSourceTypes, P41_SAFE_SOURCE_TYPES, 'P41 safe source types');
  assertExactSet(manifest.acceptedSourceTypes, P41_SAFE_SOURCE_TYPES, 'P41 accepted source types');
  assert.deepEqual(manifest.unsupportedSourceTypes, []);
  assert.deepEqual(manifest.publicTools, PUBLIC_MCP_TOOLS);
  assert.equal(manifest.publicToolsFrozen, true);
  assert.equal(manifest.decision, 'NOT_READY_BLOCKED');
  assert.equal(manifest.runtimeReady, false);
  assert.equal(manifest.rcReady, false);

  for (const artifactPath of artifactPaths) {
    assert.equal(artifactPath.startsWith('tests/fixtures/'), true, artifactPath);
    assert.equal(fs.existsSync(path.join(__dirname, '..', artifactPath)), true, artifactPath);
  }
});

test('P48 guard keeps P45 evidence matrix as exact extension of P41 evidence posture', () => {
  const manifest = loadFixture('p41-evidence-manifest-contract-v1.json');
  const evaluator = loadFixture('p45-final-rc-matrix-evaluator-v1.json');
  const p41SourceIds = manifest.sourceEvidence.map(source => source.id);
  const p45EvidenceIds = evaluator.evidence.map(evidence => evidence.id);
  const expectedExtension = [
    ...p41SourceIds,
    'p41_evidence_manifest_contract',
    'p42_explicit_input_evidence_helper',
    'p43_recall_migration_isolation_helper',
    'p44_validation_aggregator_evidence_map'
  ];

  assert.equal(evaluator.schemaVersion, P45_SCHEMA_VERSION);
  assert.equal(evaluator.mode, P45_EXPECTED_MODE);
  assert.equal(evaluator.manifest.schemaVersion, manifest.schemaVersion);
  assert.equal(evaluator.manifest.sourceMode, 'caller_provided');
  assert.equal(evaluator.manifest.evidenceCollectedByEvaluator, false);
  assert.equal(evaluator.manifest.helperExecutedByEvaluator, false);
  assertExactSet(p45EvidenceIds, REQUIRED_EVIDENCE_IDS, 'P45 required evidence ids');
  assertExactSet(p45EvidenceIds, expectedExtension, 'P45 evidence extends P41 ids');
  assert.equal(evaluator.evidence.every(evidence => evidence.sourceMode === 'caller_provided'), true);
  assert.equal(evaluator.evidence.every(evidence => evidence.observedFromRuntime === false), true);
  assert.equal(evaluator.evidence.every(evidence => P45_SAFE_SOURCE_TYPES.includes(evidence.sourceType)), true);
});

test('P48 guard keeps blocked actions and fail-closed states exact across P41/P45', () => {
  const manifest = loadFixture('p41-evidence-manifest-contract-v1.json');
  const evaluator = loadFixture('p45-final-rc-matrix-evaluator-v1.json');
  const p41FailClosedCaseIds = manifest.failClosedCases.map(entry => entry.id);

  assertExactSet(manifest.blockedActions, P41_BLOCKED_ACTIONS, 'P41 blocked actions');
  assertExactSet(evaluator.blockedActions, P45_BLOCKED_ACTIONS, 'P45 blocked actions');
  assertExactSet(Object.keys(manifest.criticalGateSemantics).filter(key => key !== 'pass'), CRITICAL_FAILURE_STATES, 'P41 critical failure states');
  assertExactSet(p41FailClosedCaseIds, REQUIRED_FAIL_CLOSED_CASES, 'P41 fail-closed cases');
  assertExactSet(evaluator.failClosedStates, FAIL_CLOSED_STATES, 'P45 fail-closed states');
  assert.equal(evaluator.failClosedStates.includes('warning_only'), true);
  assert.equal(evaluator.failClosedStates.includes('unknown'), true);
  assert.equal(evaluator.failClosedStates.includes('skipped'), true);
  assert.equal(evaluator.failClosedStates.includes('unsupported'), true);
});

test('P48 guard preserves A5 blockers, public MCP freeze, and no-readiness posture', () => {
  const evaluator = loadFixture('p45-final-rc-matrix-evaluator-v1.json');
  const blockerIds = evaluator.a5Blockers.map(blocker => blocker.id);

  assertExactSet(blockerIds, REQUIRED_A5_BLOCKER_IDS, 'P45 A5 blocker ids');
  assert.equal(evaluator.a5Blockers.every(blocker =>
    blocker.status === 'blocked_pending_a5' && blocker.unresolved === true
  ), true);
  assert.deepEqual(evaluator.publicMcpTools, PUBLIC_MCP_TOOLS);
  assert.equal(evaluator.decision, 'NOT_READY_BLOCKED');
  assert.equal(evaluator.runtimeReady, false);
  assert.equal(evaluator.finalRcMatrixReady, false);
  assert.equal(evaluator.fullFinalRcMatrixExecuted, false);
  assert.equal(evaluator.pushReady, false);
  assert.equal(evaluator.releaseReady, false);
  assert.equal(evaluator.deployReady, false);
  assert.equal(evaluator.configSwitchReady, false);
  assert.equal(evaluator.watchdogReady, false);
  assert.equal(evaluator.rcReady, false);
});
