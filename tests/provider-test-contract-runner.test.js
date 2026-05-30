'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const {
  PROVIDER_DEPENDENT_FILES,
  isProviderTestRequested
} = require('../src/cli/run-provider-tests');

test('provider runner lists provider-dependent files', () => {
  assert.ok(Array.isArray(PROVIDER_DEPENDENT_FILES));
  assert.ok(PROVIDER_DEPENDENT_FILES.length > 0);
});

test('isProviderTestRequested returns false without env', () => {
  // Save and unset env
  const origRun = process.env.CODEX_MEMORY_RUN_PROVIDER_TESTS;
  const origExt = process.env.CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER;
  delete process.env.CODEX_MEMORY_RUN_PROVIDER_TESTS;
  delete process.env.CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER;
  try {
    // Re-require to pick up fresh env state
    const result = require('../src/cli/run-provider-tests').isProviderTestRequested();
    assert.equal(result, false);
  } finally {
    if (origRun) process.env.CODEX_MEMORY_RUN_PROVIDER_TESTS = origRun;
    if (origExt) process.env.CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER = origExt;
  }
});

test('isProviderTestRequested returns false when only RUN_PROVIDER_TESTS is true', () => {
  const origRun = process.env.CODEX_MEMORY_RUN_PROVIDER_TESTS;
  const origExt = process.env.CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER;
  process.env.CODEX_MEMORY_RUN_PROVIDER_TESTS = 'true';
  delete process.env.CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER;
  try {
    assert.equal(isProviderTestRequested(), false);
  } finally {
    if (origRun) process.env.CODEX_MEMORY_RUN_PROVIDER_TESTS = origRun; else delete process.env.CODEX_MEMORY_RUN_PROVIDER_TESTS;
    if (origExt) process.env.CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER = origExt; else delete process.env.CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER;
  }
});

test('isProviderTestRequested returns true when both env vars are true', () => {
  const origRun = process.env.CODEX_MEMORY_RUN_PROVIDER_TESTS;
  const origExt = process.env.CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER;
  process.env.CODEX_MEMORY_RUN_PROVIDER_TESTS = 'true';
  process.env.CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER = 'true';
  try {
    assert.equal(isProviderTestRequested(), true);
  } finally {
    if (origRun) process.env.CODEX_MEMORY_RUN_PROVIDER_TESTS = origRun; else delete process.env.CODEX_MEMORY_RUN_PROVIDER_TESTS;
    if (origExt) process.env.CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER = origExt; else delete process.env.CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER;
  }
});

test('provider runner CLI defaults to skipped output with exit 0', () => {
  const runnerPath = path.join(process.cwd(), 'src', 'cli', 'run-provider-tests.js');
  const result = spawnSync(process.execPath, [runnerPath, '--json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 30000
  });

  assert.equal(result.status, 0, 'should exit 0 when skipped');
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'skipped');
  assert.equal(payload.note, 'skipped, not passed');
  assert.ok(payload.reason.length >= 2);
});
