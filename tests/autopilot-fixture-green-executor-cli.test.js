const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const {
  REQUIRED_ADAPTER_KINDS,
  REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_TASK_KINDS,
  collectAutopilotFixtureGreenExecutor
} = require('../src/core/AutopilotFixtureGreenExecutor');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'src', 'cli', 'autopilot-fixture-green-executor.js');

function runCli(args = []) {
  return childProcess.spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('fixture Green executor core emits no-op skeleton summary', () => {
  const summary = collectAutopilotFixtureGreenExecutor({ workspaceRoot: repoRoot });

  assert.equal(summary.mode, 'autopilot-fixture-green-executor-skeleton-noop');
  assert.equal(summary.status, 'ok');
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.skeleton_decision, 'GREEN_EXECUTOR_SKELETON_NOOP_READY');
  assert.equal(summary.allowed_task_kind_count, REQUIRED_TASK_KINDS.length);
  assert.equal(summary.allowed_adapter_kind_count, REQUIRED_ADAPTER_KINDS.length);
  assert.equal(summary.fail_closed_fixture_count, REQUIRED_FAIL_CLOSED_CASES.length);
  assert.equal(summary.noop_execution_plan_count, summary.executable_task_fixture_count);
  assert.equal(summary.fixture_backed, true);
  assert.equal(summary.noop_only, true);
  assert.equal(summary.executor_activated, false);
  assert.equal(summary.executes_tasks, false);
  assert.equal(summary.writes_files, false);
  assert.equal(summary.writes_runtime_state, false);
  assert.equal(summary.readiness_claim_allowed, false);
  assert.equal(summary.mutated, false);
});

test('fixture Green executor CLI outputs json summary', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.mode, 'autopilot-fixture-green-executor-skeleton-noop');
  assert.equal(payload.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.skeleton_decision, 'GREEN_EXECUTOR_SKELETON_NOOP_READY');
  assert.equal(payload.allowed_task_kind_count, REQUIRED_TASK_KINDS.length);
  assert.equal(payload.executor_activated, false);
  assert.equal(payload.executes_tasks, false);
  assert.equal(payload.writes_files, false);
  assert.equal(payload.readiness_claim_allowed, false);
});

test('fixture Green executor CLI renders text summary', () => {
  const result = runCli([]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /\[autopilot-fixture-green-executor\]/);
  assert.match(result.stdout, /decision: NOT_READY_BLOCKED/);
  assert.match(result.stdout, /skeleton_decision: GREEN_EXECUTOR_SKELETON_NOOP_READY/);
  assert.match(result.stdout, /executor_activated: false/);
  assert.match(result.stdout, /writes_files: false/);
});

test('fixture Green executor CLI rejects side-effectful flags', () => {
  for (const flag of ['--write', '--execute', '--run-task', '--provider', '--mcp-call', '--runtime-probe', '--push', '--readiness-claim']) {
    const result = runCli([flag]);
    assert.equal(result.status, 2, `${flag} should be rejected`);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'error');
    assert.equal(payload.rejectedFlag, flag);
    assert.equal(payload.reason, 'red_or_side_effect_flag_rejected_by_read_only_fixture_green_executor');
  }
});

test('fixture Green executor CLI rejects unknown flags', () => {
  const result = runCli(['--unknown-fixture-green-flag']);
  assert.equal(result.status, 2);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'error');
  assert.equal(payload.rejectedFlag, '--unknown-fixture-green-flag');
  assert.equal(payload.reason, 'unknown_flag_rejected_by_read_only_fixture_green_executor');
});

test('fixture Green executor CLI help exits 0', () => {
  const result = runCli(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: node src\/cli\/autopilot-fixture-green-executor\.js/);
});
