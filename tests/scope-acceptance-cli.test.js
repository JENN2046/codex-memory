const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const cliPath = path.join('src', 'cli', 'scope-acceptance.js');

function runCli(args = []) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    timeout: 30000
  });
}

test('scope-acceptance CLI should output status=ok with --json', () => {
  const result = runCli(['--json', '--project-a', 'proj-alpha', '--project-b', 'proj-beta']);
  assert.equal(result.status, 0, `exit=${result.status} stderr=${result.stderr}`);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'ok');
  assert.equal(report.strictMode, true);
  assert.equal(report.projectA.written, true);
  assert.equal(report.projectA.found, true);
  assert.equal(report.projectA.leakedProjectB, false);
  assert.equal(report.projectB.written, true);
  assert.equal(report.projectB.found, true);
  assert.equal(report.projectB.leakedProjectA, false);
  assert.equal(report.recommendation, 'scope acceptance passed');
  assert.equal(report.tempWorkspace, undefined);
});

test('scope-acceptance CLI should prevent project-a from leaking into project-b', () => {
  const result = runCli(['--json', '--project-a', 'alpha-x', '--project-b', 'beta-y']);
  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.projectA.leakedProjectB, false);
  assert.equal(report.projectB.leakedProjectA, false);
});

test('scope-acceptance CLI should default to project-a / project-b ids', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'ok');
});

test('scope-acceptance CLI should report tempWorkspace with --keep-temp', () => {
  const result = runCli(['--json', '--keep-temp', '--project-a', 'keep-a', '--project-b', 'keep-b']);
  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'ok');
  assert.ok(typeof report.tempWorkspace === 'string' && report.tempWorkspace.length > 0);
});

test('scope-acceptance CLI should not retain temp workspace by default', () => {
  const result = runCli(['--json', '--project-a', 'no-keep-a', '--project-b', 'no-keep-b']);
  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.tempWorkspace, undefined);
});
