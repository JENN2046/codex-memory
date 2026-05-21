const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const {
  collectAutopilotControllerSummary,
  inferLaneDecision
} = require('../src/core/AutopilotControllerReadOnly');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'src', 'cli', 'autopilot-controller.js');

function runCli(args = []) {
  return childProcess.spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('controller core emits read-only noop cycle summary', () => {
  const summary = collectAutopilotControllerSummary({ workspaceRoot: repoRoot });

  assert.equal(summary.mode, 'autopilot-controller-v0-read-only-noop');
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.evidenceClass, 'read_only_local_filesystem_summary');
  assert.equal(typeof summary.goal_id, 'string');
  assert.equal(typeof summary.controller_cycle_id, 'string');
  assert.equal(typeof summary.current_state, 'string');
  assert.equal(typeof summary.next_safe_task, 'string');
  assert.equal(typeof summary.lane_decision.decision, 'string');
  assert.equal(summary.execution_boundary.mode, 'read_only_noop_executor');
  assert.equal(summary.execution_boundary.dry_run_only, true);
  assert.equal(summary.execution_boundary.executes_tasks, false);
  assert.equal(summary.execution_boundary.writes_runtime_state, false);
  assert.equal(summary.repair_once_available, true);
  assert.equal(typeof summary.receipt_requirement.required, 'boolean');
  assert.equal(summary.checkpoint_requirement.required, true);
  assert.equal(summary.red_gate_status.status, 'active');
  assert.equal(summary.readiness_claim_allowed, false);
  assert.equal(summary.mutated, false);
  assert.equal(summary.provider_calls_performed, false);
  assert.equal(summary.mcp_calls_performed, false);
  assert.equal(summary.real_memory_access_performed, false);
  assert.equal(summary.remote_actions_performed, false);
});

test('controller lane inference stays fail-closed for red and exact for amber', () => {
  assert.equal(inferLaneDecision(null).decision, 'NO_EXECUTABLE_TASK_AVAILABLE');
  assert.equal(inferLaneDecision({ risk: 'A2', task: 'local docs task', notes: '' }).lane, 'Green');
  assert.equal(inferLaneDecision({ risk: 'Amber', task: 'bounded provider smoke', notes: '' }).lane, 'Amber');
  assert.equal(inferLaneDecision({ risk: 'A5', task: 'push release', notes: 'Red hard stop' }).lane, 'Red');
});

test('controller CLI outputs json summary', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.mode, 'autopilot-controller-v0-read-only-noop');
  assert.equal(payload.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.execution_boundary.mode, 'read_only_noop_executor');
  assert.equal(payload.readiness_claim_allowed, false);
  assert.equal(payload.mutated, false);
});

test('controller CLI renders text summary', () => {
  const result = runCli([]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /\[autopilot-controller-v0\]/);
  assert.match(result.stdout, /decision: NOT_READY_BLOCKED/);
  assert.match(result.stdout, /execution_boundary: read_only_noop_executor/);
  assert.match(result.stdout, /readiness_claim_allowed: false/);
});

test('controller CLI rejects side-effectful flags', () => {
  for (const flag of ['--write', '--run-task', '--provider', '--mcp-call', '--record-memory', '--push', '--cutover', '--readiness-claim']) {
    const result = runCli([flag]);
    assert.equal(result.status, 2, `${flag} should be rejected`);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'error');
    assert.equal(payload.rejectedFlag, flag);
    assert.equal(payload.reason, 'red_or_side_effect_flag_rejected_by_read_only_noop_controller');
  }
});

test('controller CLI rejects unknown flags', () => {
  const result = runCli(['--definitely-unknown']);
  assert.equal(result.status, 2, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'error');
  assert.equal(payload.rejectedFlag, '--definitely-unknown');
  assert.equal(payload.reason, 'unknown_flag_rejected_by_read_only_noop_controller');
});

test('controller CLI help exits 0', () => {
  const result = runCli(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: node src\/cli\/autopilot-controller\.js/);
});
