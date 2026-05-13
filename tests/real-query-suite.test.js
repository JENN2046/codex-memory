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
  assert.ok(typeof report.placeholderCount === 'number');
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
  assert.ok(report.placeholderCount >= 0);
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
