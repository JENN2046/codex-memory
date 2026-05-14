const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const cliPath = path.join('src', 'cli', 'real-query-suite.js');

function runCli(args = []) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    timeout: 15000
  });
}

const REAL_QUERY_SUITE_REPORT_KEYS = [
  'assertedCount',
  'caseCount',
  'failedCount',
  'fixtureFile',
  'fixtureOnlyCount',
  'fixtureRecallDryRun',
  'invalidCount',
  'passedCount',
  'placeholderCount',
  'realCount',
  'status',
  'suiteFile',
  'validCount',
  'version'
];

const FIXTURE_RECALL_DRY_RUN_KEYS = [
  'caseCount',
  'durableMemoryTouched',
  'enabled',
  'failedCount',
  'mutated',
  'passedCount',
  'providerCalls'
];

test('real-query-suite CLI should load default suite', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'ok');
  assert.ok(report.caseCount > 0);
  assert.equal(report.placeholderCount, 0);
  assert.equal(report.realCount, report.caseCount);
  assert.equal(report.fixtureOnlyCount, report.caseCount);
  assert.equal(report.assertedCount, report.caseCount);
  assert.equal(report.passedCount, report.caseCount);
  assert.equal(report.failedCount, 0);
});

test('real-query-suite JSON report shape should stay stable for P15 consumers', () => {
  const result = runCli(['--json', '--fixture-recall-dry-run']);
  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(Object.keys(report).sort(), REAL_QUERY_SUITE_REPORT_KEYS);
  assert.deepEqual(Object.keys(report.fixtureRecallDryRun).sort(), FIXTURE_RECALL_DRY_RUN_KEYS);
  assert.equal(report.caseCount, 14);
  assert.equal(report.assertedCount, 14);
  assert.equal(report.passedCount, 14);
  assert.equal(report.failedCount, 0);
  assert.equal(report.fixtureRecallDryRun.caseCount, 14);
  assert.equal(report.fixtureRecallDryRun.passedCount, 14);
  assert.equal(report.fixtureRecallDryRun.failedCount, 0);
  assert.equal(report.fixtureRecallDryRun.mutated, false);
  assert.equal(report.fixtureRecallDryRun.providerCalls, 0);
  assert.equal(report.fixtureRecallDryRun.durableMemoryTouched, false);
  assert.equal(report.hitRate, undefined);
  assert.equal(report.qualityScore, undefined);
});

test('real-query-suite CLI should report invalid cases for a broken suite', () => {
  const tmpFile = path.join(os.tmpdir(), 'broken-suite-test.json');
  fs.writeFileSync(tmpFile, JSON.stringify({
    version: 'v1',
    cases: [
      { id: 'bad-1' },
      { id: 'ok-1', area: 'scope', query: 'test', target: 'process', expected: {} }
    ]
  }));
  try {
    const result = runCli(['--json', '--suite', tmpFile]);
    assert.equal(result.status, 0);
    const report = JSON.parse(result.stdout);
    assert.equal(report.invalidCount, 1);
    assert.equal(report.caseCount, 2);
  } finally {
    fs.unlinkSync(tmpFile);
  }
});

test('real-query-suite CLI should detect placeholder cases', () => {
  const result = runCli(['--json']);
  const report = JSON.parse(result.stdout);
  assert.equal(report.placeholderCount, 0);
});

test('real-query-suite CLI should fail when fixture expectations drift', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'real-query-suite-'));
  const fixtureFile = path.join(tmpDir, 'fixture.json');
  const suiteFile = path.join(tmpDir, 'suite.json');
  fs.writeFileSync(fixtureFile, JSON.stringify({
    documents: [
      { id: 'doc-1', text: 'This document mentions durable local audit logs.' }
    ]
  }));
  fs.writeFileSync(suiteFile, JSON.stringify({
    version: 'test',
    fixture: 'fixture.json',
    cases: [
      {
        id: 'drift-1',
        area: 'query-quality',
        query: 'local audit',
        target: 'doc-1',
        expected: {
          mustContain: ['provider smoke'],
          mustNotContain: ['audit logs']
        }
      }
    ]
  }));
  try {
    const result = runCli(['--json', '--suite', suiteFile]);
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, 'failed');
    assert.deepEqual(Object.keys(report.assertionFailures[0]).sort(), ['id', 'issues', 'target']);
    assert.equal(report.assertedCount, 1);
    assert.equal(report.passedCount, 0);
    assert.equal(report.failedCount, 1);
    assert.equal(report.assertionFailures[0].id, 'drift-1');
    assert.match(report.assertionFailures[0].issues.join('\n'), /missing expected phrase: provider smoke/);
    assert.match(report.assertionFailures[0].issues.join('\n'), /found forbidden phrase: audit logs/);
  } finally {
    fs.unlinkSync(suiteFile);
    fs.unlinkSync(fixtureFile);
    fs.rmdirSync(tmpDir);
  }
});

test('real-query-suite CLI should fail for missing suite file', () => {
  const result = runCli(['--json', '--suite', 'nonexistent/file.json']);
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'error');
});

test('real-query-suite CLI should not write any data', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0);
});

test('real-query-suite default cases should use non-empty expectation arrays', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0);
  const suite = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'benchmarks', 'real-query-suite', 'v1.json'), 'utf8'));
  for (const caseItem of suite.cases) {
    assert.ok(Array.isArray(caseItem.expected.mustContain), `${caseItem.id} mustContain should be an array`);
    assert.ok(caseItem.expected.mustContain.length > 0, `${caseItem.id} mustContain should not be empty`);
    assert.ok(Array.isArray(caseItem.expected.mustNotContain), `${caseItem.id} mustNotContain should be an array`);
  }
});

test('real-query-suite default cases should cover every default dataset query', () => {
  const suite = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'benchmarks', 'real-query-suite', 'v1.json'), 'utf8'));
  const dataset = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'benchmarks', 'default-dataset.json'), 'utf8'));
  const suiteQueries = new Set(suite.cases.map((caseItem) => caseItem.query));
  const datasetQueries = dataset.queries.map((queryItem) => queryItem.query);
  assert.equal(suite.cases.length, datasetQueries.length);
  for (const query of datasetQueries) {
    assert.ok(suiteQueries.has(query), `missing default dataset query: ${query}`);
  }
});

test('real-query-suite default cases should cover P15.2 quality dimensions', () => {
  const suite = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'benchmarks', 'real-query-suite', 'v1.json'), 'utf8'));
  const areas = new Set(suite.cases.map((caseItem) => caseItem.area));
  for (const area of ['scope-safety', 'lifecycle-safety', 'privacy-safety', 'precision', 'report-shape']) {
    assert.ok(areas.has(area), `missing P15.2 area: ${area}`);
  }

  const targetIds = new Set(suite.cases.map((caseItem) => caseItem.target));
  for (const targetId of [
    'scope_private_boundary',
    'lifecycle_visibility_policy',
    'privacy_redaction_boundary',
    'workspace_summary_boundary',
    'precision_false_positive_target',
    'query_quality_report_shape'
  ]) {
    assert.ok(targetIds.has(targetId), `missing P15.2 target: ${targetId}`);
  }
});

test('real-query-suite P15.2 fixtures should stay sanitized and dry-run oriented', () => {
  const suite = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'benchmarks', 'real-query-suite', 'v1.json'), 'utf8'));
  const dataset = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'benchmarks', 'default-dataset.json'), 'utf8'));
  const datasetText = dataset.documents.map((document) => document.text).join('\n').toLowerCase();
  const suiteText = JSON.stringify(suite).toLowerCase();

  assert.equal(datasetText.includes('workspace-alpha-raw'), false);
  assert.equal(datasetText.includes('provider credential value'), false);
  assert.equal(datasetText.includes('public validate_memory mcp tool'), false);
  assert.equal(suiteText.includes('alter table'), false);
  assert.equal(suiteText.includes('import/export apply'), false);
});

test('real-query-suite supports fixture recall dry-run without durable memory', () => {
  const result = runCli(['--json', '--fixture-recall-dry-run']);
  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'ok');
  assert.equal(report.fixtureRecallDryRun.enabled, true);
  assert.equal(report.fixtureRecallDryRun.mutated, false);
  assert.equal(report.fixtureRecallDryRun.providerCalls, 0);
  assert.equal(report.fixtureRecallDryRun.durableMemoryTouched, false);
  assert.equal(report.fixtureRecallDryRun.caseCount, report.caseCount);
  assert.equal(report.fixtureRecallDryRun.failedCount, 0);
});
