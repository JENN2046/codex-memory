'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  PROVIDER_DEPENDENT_FILES,
  DAEMON_DEPENDENT_FILES,
  SELF_REFERENTIAL_FILES,
  FIXTURE_DRIFT_FILES,
  buildSpawnOptions,
  resolveDefaultSafeFiles
} = require('../src/cli/run-default-tests');

test('default runner excludes all provider-dependent files', () => {
  const testsDir = path.join(process.cwd(), 'tests');
  const { excludedDetails } = resolveDefaultSafeFiles(testsDir);
  const providerExcluded = excludedDetails.filter(e => e.reason === 'provider_dependent');
  const expected = PROVIDER_DEPENDENT_FILES;
  for (const file of expected) {
    assert.ok(providerExcluded.some(e => e.file === file), `${file} should be excluded as provider_dependent`);
  }
});

test('default runner excludes all daemon-dependent files', () => {
  const testsDir = path.join(process.cwd(), 'tests');
  const { excludedDetails } = resolveDefaultSafeFiles(testsDir);
  const daemonExcluded = excludedDetails.filter(e => e.reason === 'daemon_dependent');
  const expected = DAEMON_DEPENDENT_FILES;
  for (const file of expected) {
    assert.ok(daemonExcluded.some(e => e.file === file), `${file} should be excluded as daemon_dependent`);
  }
});

test('default runner excludes all self-referential files', () => {
  const testsDir = path.join(process.cwd(), 'tests');
  const { excludedDetails } = resolveDefaultSafeFiles(testsDir);
  const selfExcluded = excludedDetails.filter(e => e.reason === 'self_referential');
  const expected = SELF_REFERENTIAL_FILES;
  for (const file of expected) {
    assert.ok(selfExcluded.some(e => e.file === file), `${file} should be excluded as self_referential`);
  }
});

test('default runner excludes all fixture-drift files', () => {
  const testsDir = path.join(process.cwd(), 'tests');
  const { excludedDetails } = resolveDefaultSafeFiles(testsDir);
  const driftExcluded = excludedDetails.filter(e => e.reason === 'fixture_drift');
  const expected = FIXTURE_DRIFT_FILES;
  for (const file of expected) {
    assert.ok(driftExcluded.some(e => e.file === file), `${file} should be excluded as fixture_drift`);
  }
});

test('default runner safe files are a subset of total test files', () => {
  const testsDir = path.join(process.cwd(), 'tests');
  const { safeFiles, totalFiles, excludedDetails } = resolveDefaultSafeFiles(testsDir);
  assert.ok(safeFiles.length > 0, 'should have at least some safe files');
  assert.ok(safeFiles.length + excludedDetails.length === totalFiles, 'safe + excluded = total');
});

test('default runner reports excluded details with correct reasons', () => {
  const testsDir = path.join(process.cwd(), 'tests');
  const { excludedDetails } = resolveDefaultSafeFiles(testsDir);
  const validReasons = ['provider_dependent', 'daemon_dependent', 'self_referential', 'fixture_drift'];
  for (const detail of excludedDetails) {
    assert.ok(validReasons.includes(detail.reason), `unexpected reason: ${detail.reason} for ${detail.file}`);
    assert.ok(typeof detail.file === 'string');
  }
});

test('buildSpawnOptions does not include wrapper-level timeout by default', () => {
  const options = buildSpawnOptions();
  assert.equal(options.hasOwnProperty('timeout'), false);
  assert.equal(options.cwd, process.cwd());
  assert.equal(options.windowsHide, true);
});

test('buildSpawnOptions does not include timeout when env has empty string', () => {
  const options = buildSpawnOptions({ env: { CODEX_MEMORY_DEFAULT_TEST_TIMEOUT_MS: '' } });
  assert.equal(options.hasOwnProperty('timeout'), false);
});

test('buildSpawnOptions does not include timeout for non-positive values', () => {
  const options = buildSpawnOptions({ env: { CODEX_MEMORY_DEFAULT_TEST_TIMEOUT_MS: '0' } });
  assert.equal(options.hasOwnProperty('timeout'), false);
});

test('buildSpawnOptions accepts custom cwd and env', () => {
  const options = buildSpawnOptions({ cwd: '/tmp', env: { PATH: '/usr/bin' } });
  assert.equal(options.cwd, '/tmp');
  assert.equal(options.env.PATH, '/usr/bin');
});

test("buildSpawnOptions forces provider gate off", () => {
  const options = buildSpawnOptions({
    env: {
      CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: "true",
      CODEX_MEMORY_LOCAL_EMBEDDING_URL: "http://example.invalid"
    }
  });

  assert.equal(options.hasOwnProperty("timeout"), false);
  assert.equal(options.env.CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER, "false");
});
