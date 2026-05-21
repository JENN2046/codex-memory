const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const {
  REQUIRED_RECORD_TYPES,
  collectAutopilotStateStoreDraft
} = require('../src/core/AutopilotStateStoreDraft');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'src', 'cli', 'autopilot-state-store-draft.js');

function runCli(args = []) {
  return childProcess.spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('state store draft core emits read-only append-only summary', () => {
  const summary = collectAutopilotStateStoreDraft({ workspaceRoot: repoRoot });

  assert.equal(summary.mode, 'autopilot-structured-state-store-draft-read-only');
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.evidenceClass, 'fixture_only_read_only_local_filesystem_summary');
  assert.equal(summary.append_only, true);
  assert.equal(summary.no_migration, true);
  assert.equal(summary.database_created, false);
  assert.equal(summary.durable_write_enabled, false);
  assert.equal(summary.board_migration_performed, false);
  assert.equal(summary.record_type_count, REQUIRED_RECORD_TYPES.length);
  assert.equal(summary.missing_record_types.length, 0);
  assert.equal(summary.readiness_claim_allowed, false);
  assert.equal(summary.mutated, false);
  assert.equal(summary.real_database_created, false);
  assert.equal(summary.real_board_migration_performed, false);
  assert.equal(summary.provider_calls_performed, false);
  assert.equal(summary.mcp_calls_performed, false);
  assert.equal(summary.real_memory_access_performed, false);
});

test('state store draft CLI outputs json summary', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.mode, 'autopilot-structured-state-store-draft-read-only');
  assert.equal(payload.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.append_only, true);
  assert.equal(payload.no_migration, true);
  assert.equal(payload.readiness_claim_allowed, false);
  assert.equal(payload.mutated, false);
});

test('state store draft CLI renders text summary', () => {
  const result = runCli([]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /\[autopilot-state-store-draft\]/);
  assert.match(result.stdout, /decision: NOT_READY_BLOCKED/);
  assert.match(result.stdout, /append_only: true/);
  assert.match(result.stdout, /readiness_claim_allowed: false/);
});

test('state store draft CLI rejects side-effectful flags', () => {
  for (const flag of ['--write', '--migrate', '--create-db', '--durable-write', '--provider', '--mcp-call', '--push', '--readiness-claim']) {
    const result = runCli([flag]);
    assert.equal(result.status, 2, `${flag} should be rejected`);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'error');
    assert.equal(payload.rejectedFlag, flag);
    assert.equal(payload.reason, 'red_or_side_effect_flag_rejected_by_read_only_state_store_draft');
  }
});

test('state store draft CLI help exits 0', () => {
  const result = runCli(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: node src\/cli\/autopilot-state-store-draft\.js/);
});
