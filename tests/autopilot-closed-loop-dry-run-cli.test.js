const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const {
  FAILURE_TYPES,
  LOOP_STATES,
  collectAutopilotClosedLoopSummary
} = require('../src/core/AutopilotClosedLoopDryRun');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'src', 'cli', 'autopilot-closed-loop-dry-run.js');

function runCli(args = []) {
  return childProcess.spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('closed-loop core exposes local read-only status and required fields', () => {
  const summary = collectAutopilotClosedLoopSummary({ workspaceRoot: repoRoot });

  assert.equal(summary.mode, 'autopilot-closed-loop-dry-run');
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.evidenceClass, 'read_only_local_filesystem_summary');
  assert.deepEqual(summary.required_states, LOOP_STATES);
  assert.deepEqual(summary.failure_matrix_types, FAILURE_TYPES);
  assert.equal(summary.readiness_claim_allowed, false);
  assert.equal(summary.dry_run_only, true);
  assert.equal(summary.writes_performed, false);
  assert.equal(summary.provider_calls_performed, false);
  assert.equal(summary.mcp_calls_performed, false);
  assert.equal(summary.real_memory_access_performed, false);
  assert.equal(summary.dependency_changes_performed, false);
  assert.equal(summary.config_changes_performed, false);
});

test('closed-loop core reports coverage objects for completed tasks', () => {
  const summary = collectAutopilotClosedLoopSummary({ workspaceRoot: repoRoot });

  assert.equal(typeof summary.latest_task, 'string');
  assert.equal(typeof summary.next_safe_task, 'string');
  assert.equal(typeof summary.receipt_coverage.completed_tasks, 'number');
  assert.equal(typeof summary.receipt_coverage.covered_tasks, 'number');
  assert.ok(Array.isArray(summary.receipt_coverage.missing_tasks));
  assert.equal(typeof summary.validation_coverage.completed_tasks, 'number');
  assert.equal(typeof summary.validation_coverage.covered_tasks, 'number');
  assert.ok(Array.isArray(summary.validation_coverage.missing_tasks));
  assert.equal(typeof summary.repair_once_remaining, 'boolean');
  assert.equal(summary.blocked_red_count >= 1, true);
});

test('closed-loop dry-run CLI outputs json summary', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.mode, 'autopilot-closed-loop-dry-run');
  assert.equal(payload.decision, 'NOT_READY_BLOCKED');
  assert.equal(payload.readiness_claim_allowed, false);
  assert.equal(payload.dry_run_only, true);
  assert.equal(payload.writes_performed, false);
});

test('closed-loop dry-run CLI renders text summary', () => {
  const result = runCli([]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /\[autopilot-closed-loop-dry-run\]/);
  assert.match(result.stdout, /decision: NOT_READY_BLOCKED/);
  assert.match(result.stdout, /readiness_claim_allowed: false/);
});

test('closed-loop dry-run CLI rejects side-effectful flags', () => {
  for (const flag of ['--write', '--provider', '--mcp-call', '--record-memory', '--push', '--readiness-claim']) {
    const result = runCli([flag]);
    assert.equal(result.status, 2, `${flag} should be rejected`);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'error');
    assert.equal(payload.rejectedFlag, flag);
    assert.equal(payload.reason, 'red_or_side_effect_flag_rejected_by_read_only_dry_run');
  }
});

test('closed-loop dry-run CLI help exits 0', () => {
  const result = runCli(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: node src\/cli\/autopilot-closed-loop-dry-run\.js/);
});
