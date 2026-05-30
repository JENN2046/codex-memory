'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

function runGateCi(args = []) {
  const result = spawnSync(process.execPath, [
    path.join(process.cwd(), 'src', 'cli', 'gate-ci.js'),
    ...args
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 180000
  });
  let payload = null;
  try {
    const lines = (result.stdout || result.stderr || '').split('\n');
    const jsonLine = lines.find(l => l.startsWith('{'));
    if (jsonLine) payload = JSON.parse(jsonLine);
  } catch { /* ignore */ }
  return { code: result.status, payload, stdout: result.stdout, stderr: result.stderr };
}

test('gate:ci reports ok=true without env override', () => {
  const { code, payload } = runGateCi(['--json']);
  assert.ok(payload, 'should produce JSON output');
  assert.equal(payload.summary.ok, true, 'gate:ci should pass with default-safe tests');
  assert.equal(payload.summary.fixtureOnly, true);
  assert.equal(payload.summary.noNetwork, true);
  assert.equal(payload.summary.noDaemon, true);
  assert.equal(payload.summary.noProvider, true);
  assert.deepEqual(payload.summary.failedChecks, []);
  assert.equal(payload.summary.unsafeEnvOverrideDetected, false);
});

test('gate:ci reports env override fail-closed correctly', () => {
  const env = {
    ...process.env,
    CODEX_MEMORY_GATE_CI_TEST_COMMAND_JSON: '["node","--version"]'
  };
  const result = spawnSync(process.execPath, [
    path.join(process.cwd(), 'src', 'cli', 'gate-ci.js'),
    '--json'
  ], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
    timeout: 180000
  });
  const lines = (result.stdout || result.stderr || '').split('\n');
  const jsonLine = lines.find(l => l.startsWith('{'));
  const payload = jsonLine ? JSON.parse(jsonLine) : null;

  assert.ok(payload, 'should produce JSON output');
  assert.equal(payload.summary.ok, false);
  assert.equal(payload.summary.unsafeEnvOverrideDetected, true);
  assert.equal(payload.summary.fixtureOnly, false);
  assert.equal(payload.summary.noNetwork, false);
  assert.equal(payload.summary.noProvider, false);
  assert.ok(payload.summary.failedChecks.includes('unsafeEnvOverride'));
  assert.notEqual(result.status, 0, 'should exit non-zero');
});

test('gate:ci summary does not include provider test files in tests check', () => {
  const { payload } = runGateCi(['--json']);
  assert.ok(payload, 'should produce JSON output');
  // The tests check should report pass because default-safe tests exclude provider-dependent files
  assert.equal(payload.checks.tests.status, 'ok');
});

test('gate:ci retains all required checks', () => {
  const { payload } = runGateCi(['--json']);
  assert.ok(payload, 'should produce JSON output');
  const expectedChecks = ['compare', 'docs', 'lifecyclePolicy', 'policyPreflight', 'queries', 'rollback', 'tests'];
  const actualChecks = Object.keys(payload.checks).sort();
  assert.deepEqual(actualChecks, expectedChecks);
});
