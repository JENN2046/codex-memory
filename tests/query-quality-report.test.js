const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const cliPath = path.join('src', 'cli', 'query-quality-report.js');

function runCli(args = []) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    timeout: 15000
  });
}

test('query-quality-report CLI should read default suite', () => {
  const result = runCli(['--json', '--dry-run']);
  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'ok');
  assert.ok(report.caseCount > 0);
  assert.equal(report.mutated, false);
});

test('query-quality-report CLI should expose placeholderCount', () => {
  const result = runCli(['--json', '--dry-run']);
  const report = JSON.parse(result.stdout);
  assert.equal(report.placeholderCount, 0);
  assert.equal(report.realCount, report.caseCount);
  assert.equal(report.fixtureOnlyCount, report.caseCount);
  assert.equal(report.assertedCount, report.caseCount);
  assert.equal(report.passedCount, report.caseCount);
  assert.equal(report.failedCount, 0);
});

test('query-quality-report CLI should never write data', () => {
  const result = runCli(['--json', '--dry-run']);
  const report = JSON.parse(result.stdout);
  assert.equal(report.mutated, false);
});

test('query-quality-report CLI should report error for missing suite', () => {
  const result = runCli(['--json', '--dry-run', '--suite', 'nonexistent/suite.json']);
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'error');
});

test('query-quality-report CLI should not generate fake hit rates', () => {
  const result = runCli(['--json', '--dry-run']);
  const report = JSON.parse(result.stdout);
  assert.equal(report.hitRate, undefined);
  assert.equal(report.qualityScore, undefined);
  assert.equal(report.mutated, false);
});

test('query-quality-report CLI should preserve dry-run behavior on fixture drift', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'query-quality-'));
  const fixtureFile = path.join(tmpDir, 'fixture.json');
  const suiteFile = path.join(tmpDir, 'suite.json');
  fs.writeFileSync(fixtureFile, JSON.stringify({
    documents: [
      { id: 'doc-1', text: 'Query quality remains fixture-only and local.' }
    ]
  }));
  fs.writeFileSync(suiteFile, JSON.stringify({
    version: 'test',
    fixture: 'fixture.json',
    cases: [
      {
        id: 'quality-drift-1',
        area: 'query-quality',
        query: 'quality report',
        target: 'doc-1',
        expected: {
          mustContain: ['remote provider'],
          mustNotContain: []
        }
      }
    ]
  }));
  try {
    const result = runCli(['--json', '--dry-run', '--suite', suiteFile]);
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, 'failed');
    assert.equal(report.mutated, false);
    assert.equal(report.assertedCount, 1);
    assert.equal(report.passedCount, 0);
    assert.equal(report.failedCount, 1);
  } finally {
    fs.unlinkSync(suiteFile);
    fs.unlinkSync(fixtureFile);
    fs.rmdirSync(tmpDir);
  }
});

test('query-quality-report supports fixture recall dry-run without durable memory', () => {
  const result = runCli(['--json', '--dry-run', '--fixture-recall-dry-run']);
  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'ok');
  assert.equal(report.mutated, false);
  assert.equal(report.fixtureRecallDryRun.enabled, true);
  assert.equal(report.fixtureRecallDryRun.providerCalls, 0);
  assert.equal(report.fixtureRecallDryRun.durableMemoryTouched, false);
  assert.equal(report.fixtureRecallDryRun.caseCount, report.caseCount);
  assert.equal(report.fixtureRecallDryRun.failedCount, 0);
});
