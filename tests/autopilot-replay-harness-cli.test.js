const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const {
  REQUIRED_FAIL_CLOSED_REASONS,
  REQUIRED_REPLAY_SCENARIOS,
  collectAutopilotReplayHarness
} = require('../src/core/AutopilotReplayHarness');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'src', 'cli', 'autopilot-replay-harness.js');

function runCli(args = []) {
  return childProcess.spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('replay harness core emits read-only fixture summary', () => {
  const summary = collectAutopilotReplayHarness({ workspaceRoot: repoRoot });

  assert.equal(summary.mode, 'autopilot-checkpoint-resume-replay-read-only');
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.evidenceClass, 'fixture_only_read_only_local_filesystem_summary');
  assert.equal(summary.scenario_count, REQUIRED_REPLAY_SCENARIOS.length + 1);
  assert.equal(summary.missing_scenarios.length, 0);
  assert.equal(summary.missing_fail_closed_reasons.length, 0);
  assert.equal(summary.required_fail_closed_reason_count, REQUIRED_FAIL_CLOSED_REASONS.length);
  assert.equal(summary.read_only, true);
  assert.equal(summary.replays_real_actions, false);
  assert.equal(summary.writes_state, false);
  assert.equal(summary.resume_token_supported, true);
  assert.equal(summary.receipt_reconciliation_supported, true);
  assert.equal(summary.dirty_worktree_protection_supported, true);
  assert.equal(summary.readiness_claim_allowed, false);
  assert.equal(summary.mutated, false);
  assert.equal(summary.provider_calls_performed, false);
  assert.equal(summary.mcp_calls_performed, false);
  assert.equal(summary.real_memory_access_performed, false);
});

test('replay harness CLI outputs json summary', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.mode, 'autopilot-checkpoint-resume-replay-read-only');
  assert.equal(payload.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.scenario_count, REQUIRED_REPLAY_SCENARIOS.length + 1);
  assert.equal(payload.fail_closed_scenario_count, 5);
  assert.equal(payload.recovery_scenario_count, 1);
  assert.equal(payload.replays_real_actions, false);
  assert.equal(payload.writes_state, false);
  assert.equal(payload.readiness_claim_allowed, false);
});

test('replay harness CLI renders text summary', () => {
  const result = runCli([]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /\[autopilot-replay-harness\]/);
  assert.match(result.stdout, /decision: NOT_READY_BLOCKED/);
  assert.match(result.stdout, /scenarios: 9\/8/);
  assert.match(result.stdout, /replays_real_actions: false/);
  assert.match(result.stdout, /readiness_claim_allowed: false/);
});

test('replay harness CLI rejects side-effectful flags', () => {
  for (const flag of ['--write', '--execute', '--replay-actions', '--resume', '--provider', '--mcp-call', '--runtime-probe', '--push', '--readiness-claim']) {
    const result = runCli([flag]);
    assert.equal(result.status, 2, `${flag} should be rejected`);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'error');
    assert.equal(payload.rejectedFlag, flag);
    assert.equal(payload.reason, 'red_or_side_effect_flag_rejected_by_read_only_replay_harness');
  }
});

test('replay harness CLI help exits 0', () => {
  const result = runCli(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: node src\/cli\/autopilot-replay-harness\.js/);
});
