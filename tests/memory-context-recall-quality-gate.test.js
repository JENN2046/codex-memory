'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_RECALL_QUALITY_SUITE,
  QUALITY_GATE_SCHEMA_VERSION,
  renderRecallQualityMarkdown,
  runMemoryContextRecallQualityGate
} = require('../src/core/MemoryContextRecallQualityGate');

test('memory context recall quality gate covers required Phase 5 scenarios', async () => {
  const report = await runMemoryContextRecallQualityGate();

  assert.equal(report.schemaVersion, QUALITY_GATE_SCHEMA_VERSION);
  assert.equal(report.status, 'PASS');
  assert.equal(report.summary.total, 9);
  assert.equal(report.summary.passed, 9);
  assert.deepEqual(report.coverage, [
    'project_fact_recall',
    'historical_decision_recall',
    'current_blocker_recall',
    'user_preference_recall',
    'stale_fact_filtering',
    'conflict_fact_surfacing',
    'private_isolation',
    'workspace_isolation',
    'fallback_distinction'
  ]);
});

test('memory context recall quality gate keeps side-effect and readiness counters false', async () => {
  const report = await runMemoryContextRecallQualityGate();

  assert.equal(report.access.fixtureOnly, true);
  assert.equal(report.access.readOnly, true);
  assert.equal(report.access.durableMutationPerformed, false);
  assert.equal(report.access.productionWritePerformed, false);
  assert.equal(report.access.providerApiCalled, false);
  assert.equal(report.access.vcpToolBoxRuntimeCalled, false);
  assert.equal(report.access.mcpMemoryToolCalled, false);
  assert.equal(report.access.rawMemoryRead, false);
  assert.equal(report.access.rawAuditRead, false);
  assert.equal(report.access.readinessClaimed, false);
  assert.equal(report.nonClaims.productionRecallQuality, false);
  assert.equal(report.nonClaims.liveRuntimeProof, false);
  assert.equal(report.nonClaims.nativeReadProof, false);
  assert.equal(report.nonClaims.nativeWriteProof, false);
  assert.equal(report.nonClaims.fullPlanPackCompletion, false);
});

test('memory context recall quality gate proves isolation and fallback distinction cases', async () => {
  const report = await runMemoryContextRecallQualityGate();
  const byId = Object.fromEntries(report.cases.map(testCase => [testCase.id, testCase]));

  assert.equal(byId.private_isolation.status, 'PASS');
  assert.equal(byId.private_isolation.observed.search_result_count, 1);
  assert.equal(byId.workspace_isolation.status, 'PASS');
  assert.equal(byId.workspace_isolation.observed.search_result_count, 1);
  assert.equal(byId.fallback_distinction.status, 'PASS');
  assert.equal(byId.fallback_distinction.observed.fallback_used, true);
  assert.equal(byId.fallback_distinction.observed.result_can_be_mistaken_for_native, false);
});

test('memory context recall quality gate reports stale and conflict as risk reasons', async () => {
  const report = await runMemoryContextRecallQualityGate();
  const byId = Object.fromEntries(report.cases.map(testCase => [testCase.id, testCase]));

  assert.equal(byId.stale_fact_filtering.status, 'PASS');
  assert.ok(byId.stale_fact_filtering.observed.bucketCounts.risks >= 1);
  assert.equal(byId.conflict_fact_surfacing.status, 'PASS');
  assert.ok(byId.conflict_fact_surfacing.observed.bucketCounts.risks >= 1);
});

test('memory context recall quality markdown is bounded and non-claiming', async () => {
  const report = await runMemoryContextRecallQualityGate();
  const markdown = renderRecallQualityMarkdown(report);

  assert.match(markdown, /Recall Quality Report/);
  assert.match(markdown, /fixture\/local dry-run/i);
  assert.match(markdown, /does not read real private memory/i);
  assert.match(markdown, /No durable mutation/);
  assert.equal(markdown.includes('PRIVATE_OTHER_CLIENT_SHOULD_NOT_LEAK'), false);
  assert.equal(markdown.includes('OTHER_WORKSPACE_SHOULD_NOT_LEAK'), false);
});

test('memory context recall quality suite has stable unique case ids', () => {
  const ids = DEFAULT_RECALL_QUALITY_SUITE.map(testCase => testCase.id);

  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, 9);
});

test('memory context recall quality report artifacts match generated gate summary', async () => {
  const report = await runMemoryContextRecallQualityGate();
  const reportPath = path.join(__dirname, '..', 'docs', 'near-model-memory-plan-pack', 'recall_quality_report.json');
  const markdownPath = path.join(__dirname, '..', 'docs', 'near-model-memory-plan-pack', 'recall_quality_report.md');
  const artifact = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const markdown = fs.readFileSync(markdownPath, 'utf8');

  assert.equal(artifact.schemaVersion, report.schemaVersion);
  assert.equal(artifact.status, report.status);
  assert.deepEqual(artifact.summary, report.summary);
  assert.deepEqual(artifact.coverage, report.coverage);
  assert.deepEqual(artifact.access, report.access);
  assert.deepEqual(artifact.nonClaims, report.nonClaims);
  assert.deepEqual(artifact.cases.map(testCase => testCase.id), report.cases.map(testCase => testCase.id));
  assert.match(markdown, /Status: `PASS`/);
  assert.match(markdown, /fixture\/local dry-run quality baseline/);
  assert.match(markdown, /does not read real private memory/);
  assert.match(markdown, /prove production recall quality/);
});
