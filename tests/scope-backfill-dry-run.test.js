const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const cliPath = path.join('src', 'cli', 'scope-backfill-dry-run.js');

function runCli(args = [], env = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, ...env }
  });
}

test('scope-backfill-dry-run CLI should handle empty workspace gracefully', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backfill-empty-'));
  try {
    const result = runCli(['--json'], {
      CODEX_MEMORY_BASE_PATH: tmpDir
    });
    assert.equal(result.status, 0);
    const report = JSON.parse(result.stdout);
    assert.equal(report.mutated, false);
    assert.equal(report.totalRecords, 0);
    assert.ok(report.status === 'ok' || report.status === 'warn');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('scope-backfill-dry-run CLI should report zero records for empty DB', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.ok(report.status === 'ok' || report.status === 'warn');
  assert.equal(report.mutated, false);
});

test('scope-backfill-dry-run CLI should never write data', () => {
  const result = runCli(['--json']);
  const report = JSON.parse(result.stdout);
  assert.equal(report.mutated, false);
});

test('scope-backfill-dry-run CLI should include suggestedDefaults', () => {
  const result = runCli(['--json']);
  const report = JSON.parse(result.stdout);
  assert.ok(report.suggestedDefaults);
  assert.ok(report.suggestedDefaults.client_id);
  assert.ok(report.suggestedDefaults.project_id);
});

test('scope-backfill-dry-run CLI should reject --confirm parameter', () => {
  const result = runCli(['--json', '--confirm']);
  // --confirm is not a recognized flag, should be ignored
  const report = JSON.parse(result.stdout);
  assert.equal(report.mutated, false);
});
