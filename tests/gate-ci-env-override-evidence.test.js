'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { detectUnsafeEnvOverrides } = require('../src/cli/gate-ci');

// Mock process.env for testing — we test the function directly
function withEnv(envOverrides, fn) {
  const originals = {};
  for (const key of Object.keys(envOverrides)) {
    originals[key] = process.env[key];
    if (envOverrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = envOverrides[key];
    }
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(originals)) {
      if (originals[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originals[key];
      }
    }
  }
}

test('detectUnsafeEnvOverrides returns detected=false when no override is set', () => {
  withEnv({
    CODEX_MEMORY_GATE_CI_COMPARE_COMMAND_JSON: undefined,
    CODEX_MEMORY_GATE_CI_ROLLBACK_COMMAND_JSON: undefined,
    CODEX_MEMORY_GATE_CI_TEST_COMMAND_JSON: undefined
  }, () => {
    const result = detectUnsafeEnvOverrides();
    assert.equal(result.detected, false);
    assert.deepEqual(result.keys, []);
  });
});

test('detectUnsafeEnvOverrides returns detected=true when compare override is set', () => {
  withEnv({
    CODEX_MEMORY_GATE_CI_COMPARE_COMMAND_JSON: '["node","--version"]'
  }, () => {
    const result = detectUnsafeEnvOverrides();
    assert.equal(result.detected, true);
    assert.ok(result.keys.includes('CODEX_MEMORY_GATE_CI_COMPARE_COMMAND_JSON'));
  });
});

test('detectUnsafeEnvOverrides returns detected=true when test override is set', () => {
  withEnv({
    CODEX_MEMORY_GATE_CI_TEST_COMMAND_JSON: '["node","--version"]'
  }, () => {
    const result = detectUnsafeEnvOverrides();
    assert.equal(result.detected, true);
    assert.ok(result.keys.includes('CODEX_MEMORY_GATE_CI_TEST_COMMAND_JSON'));
  });
});

test('detectUnsafeEnvOverrides returns multiple keys when several overrides are set', () => {
  withEnv({
    CODEX_MEMORY_GATE_CI_COMPARE_COMMAND_JSON: '["node","--version"]',
    CODEX_MEMORY_GATE_CI_ROLLBACK_COMMAND_JSON: '["node","--version"]',
    CODEX_MEMORY_GATE_CI_TEST_COMMAND_JSON: '["node","--version"]'
  }, () => {
    const result = detectUnsafeEnvOverrides();
    assert.equal(result.detected, true);
    assert.equal(result.keys.length, 3);
  });
});

test('gate-ci with env override produces unsafeEnvOverrideDetected in summary', async () => {
  // Test the gate-ci CLI behavior by spawning it
  const { spawn } = require('node:child_process');
  const result = await new Promise((resolve) => {
    const child = spawn(process.execPath, [
      path.join(process.cwd(), 'src', 'cli', 'gate-ci.js'),
      '--json'
    ], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        CODEX_MEMORY_GATE_CI_TEST_COMMAND_JSON: '["node","--version"]'
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      timeout: 120000
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('close', code => {
      try { resolve({ code, payload: JSON.parse(stdout || stderr) }); }
      catch { resolve({ code, payload: null }); }
    });
    child.on('error', () => resolve({ code: -1, payload: null }));
  });

  assert.ok(result.payload, 'should produce JSON output');
  assert.equal(result.payload.summary.unsafeEnvOverrideDetected, true);
  assert.equal(result.payload.summary.fixtureOnly, false);
  assert.equal(result.payload.summary.noNetwork, false);
  assert.equal(result.payload.summary.noProvider, false);
  assert.equal(result.payload.summary.checksExecuted, false);
  assert.notEqual(result.code, 0, 'should exit with non-zero code when override is detected');
});

test('gate:ci stops before executing unsafe env override commands', () => {
  const { spawnSync } = require('node:child_process');
  const os = require('node:os');
  const fs = require('node:fs');

  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-ci-override-test-'));
  const markerPath = path.join(tmpdir, 'override-executed.txt');

  try {
    const env = {
      ...process.env,
      CODEX_MEMORY_GATE_CI_TEST_COMMAND_JSON: JSON.stringify([
        process.execPath,
        '-e',
        `require('node:fs').writeFileSync(${JSON.stringify(markerPath)}, 'executed')`
      ])
    };

    const result = spawnSync(
      process.execPath,
      [path.join(process.cwd(), 'src', 'cli', 'gate-ci.js'), '--json'],
      { cwd: process.cwd(), env, encoding: 'utf8', timeout: 60000 }
    );

    assert.notEqual(result.status, 0, 'should exit non-zero');

    const payload = JSON.parse(result.stdout);
    assert.equal(payload.summary.unsafeEnvOverrideDetected, true);
    assert.equal(payload.summary.ok, false);
    assert.equal(payload.summary.fixtureOnly, false);
    assert.equal(payload.summary.noNetwork, false);
    assert.equal(payload.summary.noProvider, false);
    assert.equal(payload.summary.checksExecuted, false);

    // If the bug exists, the marker file would have been created.
    // With the fix, it must NOT exist.
    assert.equal(fs.existsSync(markerPath), false, 'override command must NOT be executed');
  } finally {
    try { fs.rmSync(tmpdir, { recursive: true, force: true }); } catch { /* ignore cleanup */ }
  }
});
