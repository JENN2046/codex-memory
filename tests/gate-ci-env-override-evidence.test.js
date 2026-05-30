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
  assert.notEqual(result.code, 0, 'should exit with non-zero code when override is detected');
});
