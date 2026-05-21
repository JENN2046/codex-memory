const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const {
  REQUIRED_ADMISSION_CONDITIONS,
  REQUIRED_ALLOWED_SCOPE,
  REQUIRED_STOP_REASONS,
  collectAutopilotControlledGreenExecutorEntry
} = require('../src/core/AutopilotControlledGreenExecutorEntry');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'src', 'cli', 'autopilot-controlled-green-entry.js');

function runCli(args = []) {
  return childProcess.spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('controlled Green entry core emits prepared-not-activated summary', () => {
  const summary = collectAutopilotControlledGreenExecutorEntry({ workspaceRoot: repoRoot });

  assert.equal(summary.mode, 'autopilot-controlled-green-executor-entry-read-only');
  assert.equal(summary.status, 'ok');
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.entry_decision, 'GREEN_EXECUTOR_ENTRY_PACKET_PREPARED_NOT_ACTIVATED');
  assert.equal(summary.met_admission_condition_count, REQUIRED_ADMISSION_CONDITIONS.length);
  assert.equal(summary.allowed_scope_count, REQUIRED_ALLOWED_SCOPE.length);
  assert.equal(summary.fail_closed_stop_reason_count, REQUIRED_STOP_REASONS.length);
  assert.equal(summary.read_only, true);
  assert.equal(summary.executor_activated, false);
  assert.equal(summary.executes_tasks, false);
  assert.equal(summary.writes_runtime_state, false);
  assert.equal(summary.readiness_claim_allowed, false);
  assert.equal(summary.mutated, false);
});

test('controlled Green entry CLI outputs json summary', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.mode, 'autopilot-controlled-green-executor-entry-read-only');
  assert.equal(payload.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.entry_decision, 'GREEN_EXECUTOR_ENTRY_PACKET_PREPARED_NOT_ACTIVATED');
  assert.equal(payload.met_admission_condition_count, REQUIRED_ADMISSION_CONDITIONS.length);
  assert.equal(payload.executor_activated, false);
  assert.equal(payload.executes_tasks, false);
  assert.equal(payload.readiness_claim_allowed, false);
});

test('controlled Green entry CLI renders text summary', () => {
  const result = runCli([]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /\[autopilot-controlled-green-entry\]/);
  assert.match(result.stdout, /decision: NOT_READY_BLOCKED/);
  assert.match(result.stdout, /entry_decision: GREEN_EXECUTOR_ENTRY_PACKET_PREPARED_NOT_ACTIVATED/);
  assert.match(result.stdout, /executor_activated: false/);
  assert.match(result.stdout, /readiness_claim_allowed: false/);
});

test('controlled Green entry CLI rejects side-effectful flags', () => {
  for (const flag of ['--write', '--activate', '--execute', '--provider', '--mcp-call', '--runtime-probe', '--push', '--readiness-claim']) {
    const result = runCli([flag]);
    assert.equal(result.status, 2, `${flag} should be rejected`);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'error');
    assert.equal(payload.rejectedFlag, flag);
    assert.equal(payload.reason, 'red_or_side_effect_flag_rejected_by_read_only_green_entry_packet');
  }
});

test('controlled Green entry CLI rejects unknown flags', () => {
  const result = runCli(['--unknown-green-entry-flag']);
  assert.equal(result.status, 2);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'error');
  assert.equal(payload.rejectedFlag, '--unknown-green-entry-flag');
  assert.equal(payload.reason, 'unknown_flag_rejected_by_read_only_green_entry_packet');
});

test('controlled Green entry CLI help exits 0', () => {
  const result = runCli(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: node src\/cli\/autopilot-controlled-green-entry\.js/);
});
