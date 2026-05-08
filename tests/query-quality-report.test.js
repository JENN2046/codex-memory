const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
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
  assert.ok(typeof report.placeholderCount === 'number');
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
