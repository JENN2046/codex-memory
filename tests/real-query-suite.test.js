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
