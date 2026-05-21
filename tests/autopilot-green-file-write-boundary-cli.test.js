const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const { collectAutopilotGreenFileWriteBoundary } = require('../src/core/AutopilotGreenFileWriteBoundary');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'src', 'cli', 'autopilot-green-file-write-boundary.js');

function runCli(args = []) {
  return childProcess.spawnSync(process.execPath, [cliPath, ...args], { cwd: repoRoot, encoding: 'utf8' });
}

test('green file-write boundary core allows design but blocks implementation', () => {
  const summary = collectAutopilotGreenFileWriteBoundary({ workspaceRoot: repoRoot });
  assert.equal(summary.status, 'ok');
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.boundary_decision, 'GREEN_FILE_WRITE_EXECUTOR_DESIGN_ALLOWED_IMPLEMENTATION_BLOCKED');
  assert.equal(summary.design_allowed, true);
  assert.equal(summary.implementation_allowed, false);
  assert.equal(summary.executor_activation_allowed, false);
  assert.equal(summary.writes_files, false);
  assert.equal(summary.executes_tasks, false);
  assert.equal(summary.readiness_claim_allowed, false);
});

test('green file-write boundary CLI outputs json', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.boundary_decision, 'GREEN_FILE_WRITE_EXECUTOR_DESIGN_ALLOWED_IMPLEMENTATION_BLOCKED');
  assert.equal(payload.design_allowed, true);
  assert.equal(payload.implementation_allowed, false);
  assert.equal(payload.executor_activation_allowed, false);
});

test('green file-write boundary CLI rejects side-effectful flags', () => {
  for (const flag of ['--write', '--implement', '--activate', '--execute', '--provider', '--mcp-call', '--push', '--readiness-claim']) {
    const result = runCli([flag]);
    assert.equal(result.status, 2, `${flag} should be rejected`);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.reason, 'red_or_side_effect_flag_rejected_by_read_only_green_file_write_boundary');
  }
});

test('green file-write boundary CLI rejects unknown flags', () => {
  const result = runCli(['--surprise']);
  assert.equal(result.status, 2);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.reason, 'unknown_flag_rejected_by_read_only_green_file_write_boundary');
});
