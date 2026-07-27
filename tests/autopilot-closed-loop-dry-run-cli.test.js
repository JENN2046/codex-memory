const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  FAILURE_TYPES,
  LOOP_STATES,
  collectAutopilotClosedLoopSummary,
  parseMarkdownTable
} = require('../src/core/AutopilotClosedLoopDryRun');
const {
  collectAutopilotControllerSummary
} = require('../src/core/AutopilotControllerReadOnly');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'src', 'cli', 'autopilot-closed-loop-dry-run.js');

function runCli(args = []) {
  return childProcess.spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

function writeClosedLoopSurfaceFixtures(workspaceRoot) {
  for (const relativePath of [
    'docs/AUTOPILOT_CLOSED_LOOP_STATE_MACHINE.md',
    'docs/AUTOPILOT_FAILURE_RECOVERY_MATRIX.md',
    'src/core/AutopilotClosedLoopDryRun.js',
    'src/cli/autopilot-closed-loop-dry-run.js',
    'scripts/validate_autopilot_closed_loop.js',
    'schemas/autopilot_closed_loop_state.schema.yaml',
    'schemas/autopilot_failure_recovery_matrix.schema.yaml',
    'tests/schema_examples/autopilot_closed_loop_state.example.json',
    'tests/schema_examples/autopilot_failure_recovery_matrix.example.json'
  ]) {
    const target = path.join(workspaceRoot, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, '');
  }
}

function writeControllerSurfaceFixtures(workspaceRoot) {
  for (const relativePath of [
    'src/core/AutopilotControllerReadOnly.js',
    'src/cli/autopilot-controller.js',
    'schemas/autopilot_controller_cycle.schema.yaml',
    'tests/schema_examples/autopilot_controller_cycle.example.json',
    'scripts/validate_autopilot_controller.js'
  ]) {
    const target = path.join(workspaceRoot, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, '');
  }
  fs.writeFileSync(path.join(workspaceRoot, 'STATUS.md'), 'NOT_READY_BLOCKED\n');
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
  assert.deepEqual(summary.receipt_coverage, {
    completed_tasks: 1,
    covered_tasks: 1,
    missing_tasks: [],
    ratio: 1
  });
  assert.deepEqual(summary.validation_coverage, {
    completed_tasks: 1,
    covered_tasks: 1,
    missing_tasks: [],
    ratio: 1
  });
  assert.equal(typeof summary.repair_once_remaining, 'boolean');
  assert.equal(summary.blocked_red_count >= 1, true);
});

test('closed-loop parser keeps pipes inside inline code cells', () => {
  const rows = parseMarkdownTable([
    '| ID | Command / Check | Scope | Result | Summary |',
    '|---|---|---|---|---|',
    '| CMV-0001 | `rg -n "Chinese Task Summary Closeout|任务总结" AGENTS.md` | CM-0683 final summary rule | COMPLETED_VALIDATED | validation row should parse |'
  ].join('\n'));

  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'CMV-0001');
  assert.match(rows[0].scope, /CM-0683/);
  assert.match(rows[0]['command / check'], /Closeout\|任务总结/);
});

test('closed-loop receipt coverage starts at first ledger task while validation covers current tasks', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-loop-'));
  const boardDir = path.join(tempRoot, '.agent_board');
  fs.mkdirSync(boardDir, { recursive: true });
  fs.writeFileSync(path.join(boardDir, 'CURRENT_FACTS.json'), JSON.stringify({
    schemaVersion: 4
  }));
  fs.writeFileSync(path.join(boardDir, 'TASK_QUEUE.md'), [
    '| ID | Status | Area | Risk | Task | Required Validation | Notes |',
    '|---|---|---|---|---|---|---|',
    '| CM-0683 | done | P6 | A1 | Summary rule | docs validation | done |',
    '| CM-0684 | done | P6 | A2 | Kernel | docs validation | done |'
  ].join('\n'));
  fs.writeFileSync(path.join(boardDir, 'VALIDATION_LOG.md'), [
    '| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |',
    '|---|---|---|---|---|---|---|---|',
    '| CMV-0807 | `rg -n "Chinese Task Summary Closeout|任务总结" AGENTS.md` | P6 | CM-0683 final Simplified Chinese task-summary closeout rule | COMPLETED_VALIDATED | summary rule synced | none | 2026-05-21 |',
    '| CMV-0808 | `node scripts\\validate.js` | P6 | CM-0684 governance kernel | COMPLETED_VALIDATED | receipt not_required_no_amber_external_or_write_action | none | 2026-05-21 |'
  ].join('\n'));
  fs.writeFileSync(path.join(boardDir, 'AUTOPILOT_LEDGER.md'), [
    '| ID | Goal | Lane | Envelope | Action | Receipt | Validation | Budget Used | Red Stops | Result | Date |',
    '|---|---|---|---|---|---|---|---|---:|---|---|',
    '| CM-0684 | Kernel | Green | default | action | not_required_no_amber_external_or_write_action | CMV-0808 | provider=0 | 0 | completed_validated | 2026-05-21 |'
  ].join('\n'));
  fs.writeFileSync(path.join(boardDir, 'CHECKPOINT.md'), '');

  const summary = collectAutopilotClosedLoopSummary({ workspaceRoot: tempRoot });

  assert.equal(summary.validation_coverage.completed_tasks, 2);
  assert.deepEqual(summary.validation_coverage.missing_tasks, []);
  assert.equal(summary.receipt_coverage.completed_tasks, 1);
  assert.deepEqual(summary.receipt_coverage.missing_tasks, []);
});

test('schema v5 closeout coverage follows lastCompleted with an empty active queue', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-v5-closeout-'));
  const boardDir = path.join(tempRoot, '.agent_board');
  fs.mkdirSync(boardDir, { recursive: true });
  writeClosedLoopSurfaceFixtures(tempRoot);
  writeControllerSurfaceFixtures(tempRoot);
  fs.writeFileSync(path.join(boardDir, 'CURRENT_FACTS.json'), JSON.stringify({
    schemaVersion: 5,
    activeTask: null,
    lastCompleted: {
      taskId: 'CM-3001',
      validationId: 'CMV-3002'
    }
  }));
  fs.writeFileSync(path.join(boardDir, 'TASK_QUEUE.md'), [
    '| ID | Priority | Status | Area | Risk | Target Files | Task | Required Validation | Rollback Check | Gate Required | Notes |',
    '|---|---:|---|---|---|---|---|---|---|---|---|'
  ].join('\n'));
  fs.writeFileSync(path.join(boardDir, 'VALIDATION_LOG.md'), [
    '| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |',
    '|---|---|---|---|---|---|---|---|',
    '| CMV-3002 | tests | P6 | CM-3001 selected goal | COMPLETED_VALIDATED | current closeout | none | 2026-07-28 |'
  ].join('\n'));
  fs.writeFileSync(path.join(boardDir, 'AUTOPILOT_LEDGER.md'), [
    '| ID | Goal | Lane | Envelope | Action | Receipt | Validation | Budget Used | Red Stops | Result | Date |',
    '|---|---|---|---|---|---|---|---|---:|---|---|',
    '| CM-3001 | selected goal | Green | closeout | complete | receipt | CMV-3002 | zero | 0 | COMPLETED_VALIDATED | 2026-07-28 |'
  ].join('\n'));
  fs.writeFileSync(path.join(boardDir, 'CHECKPOINT.md'), '');

  const covered = collectAutopilotClosedLoopSummary({ workspaceRoot: tempRoot });
  const coveredController =
    collectAutopilotControllerSummary({ workspaceRoot: tempRoot });
  assert.equal(covered.status, 'ok');
  assert.equal(covered.stop_reason, 'none');
  assert.equal(covered.latest_goal, 'CM-3001');
  assert.equal(coveredController.status, 'ok');
  assert.equal(coveredController.goal_id, 'CM-3001');
  assert.equal(coveredController.stop_reason, 'none');
  assert.equal(covered.latest_task, 'not_recorded');
  assert.deepEqual(covered.validation_coverage, {
    completed_tasks: 1,
    covered_tasks: 1,
    missing_tasks: [],
    ratio: 1
  });
  assert.deepEqual(covered.receipt_coverage, {
    completed_tasks: 1,
    covered_tasks: 1,
    missing_tasks: [],
    ratio: 1
  });

  fs.appendFileSync(
    path.join(boardDir, 'VALIDATION_LOG.md'),
    '\n| `CMV-3003` | stale | P6 | CM-3004 stale closeout | COMPLETED_VALIDATED | stale | none | 2026-07-28 |'
  );
  fs.appendFileSync(
    path.join(boardDir, 'AUTOPILOT_LEDGER.md'),
    '\n| `CM-3004` | stale | Green | closeout | complete | receipt | CMV-3003 | zero | 0 | COMPLETED_VALIDATED | 2026-07-28 |'
  );
  const noncanonical = collectAutopilotClosedLoopSummary({ workspaceRoot: tempRoot });
  const noncanonicalController =
    collectAutopilotControllerSummary({ workspaceRoot: tempRoot });
  assert.deepEqual(noncanonical.validation_coverage.missing_tasks, ['CM-3001']);
  assert.deepEqual(noncanonical.receipt_coverage.missing_tasks, ['CM-3001']);
  assert.equal(noncanonical.status, 'warn');
  assert.equal(noncanonical.stop_reason, 'current_closeout_coverage_incomplete');
  assert.equal(noncanonical.latest_goal, 'not_recorded');
  assert.equal(noncanonicalController.status, 'warn');
  assert.equal(noncanonicalController.goal_id, 'not_recorded');
  assert.equal(
    noncanonicalController.stop_reason,
    'current_closeout_coverage_incomplete'
  );

  const stateMachinePath = path.join(
    tempRoot,
    'docs',
    'AUTOPILOT_CLOSED_LOOP_STATE_MACHINE.md'
  );
  fs.unlinkSync(stateMachinePath);
  const combinedFailure =
    collectAutopilotClosedLoopSummary({ workspaceRoot: tempRoot });
  assert.equal(combinedFailure.status, 'warn');
  assert.equal(
    combinedFailure.stop_reason,
    'current_closeout_coverage_incomplete'
  );
  fs.writeFileSync(stateMachinePath, '');

  fs.writeFileSync(path.join(boardDir, 'VALIDATION_LOG.md'), [
    '| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |',
    '|---|---|---|---|---|---|---|---|',
    '| CMV-3002 | tests | P6 | CM-3001 selected goal | COMPLETED_VALIDATED | current closeout | none | 2026-07-28 |',
    '| CMV-3003X | stale | P6 | CM-3004X stale closeout | COMPLETED_VALIDATED | stale | none | 2026-07-28 |'
  ].join('\n'));
  fs.writeFileSync(path.join(boardDir, 'AUTOPILOT_LEDGER.md'), [
    '| ID | Goal | Lane | Envelope | Action | Receipt | Validation | Budget Used | Red Stops | Result | Date |',
    '|---|---|---|---|---|---|---|---|---:|---|---|',
    '| CM-3001 | selected goal | Green | closeout | complete | receipt | CMV-3002 | zero | 0 | COMPLETED_VALIDATED | 2026-07-28 |',
    '| CM-3004X | stale | Green | closeout | complete | receipt | CMV-3003X | zero | 0 | COMPLETED_VALIDATED | 2026-07-28 |'
  ].join('\n'));
  const suffixed = collectAutopilotClosedLoopSummary({ workspaceRoot: tempRoot });
  assert.deepEqual(suffixed.validation_coverage.missing_tasks, ['CM-3001']);
  assert.deepEqual(suffixed.receipt_coverage.missing_tasks, ['CM-3001']);

  fs.writeFileSync(path.join(boardDir, 'VALIDATION_LOG.md'), [
    '| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |',
    '|---|---|---|---|---|---|---|---|',
    '| CMV-3002 | tests | P6 | CM-3001 selected goal | COMPLETED_VALIDATED | current closeout | none | 2026-07-28 |',
    'CMV-3003 | malformed | P6 | CM-3004 stale closeout | COMPLETED_VALIDATED | stale | none | 2026-07-28'
  ].join('\n'));
  fs.writeFileSync(path.join(boardDir, 'AUTOPILOT_LEDGER.md'), [
    '| ID | Goal | Lane | Envelope | Action | Receipt | Validation | Budget Used | Red Stops | Result | Date |',
    '|---|---|---|---|---|---|---|---|---:|---|---|',
    '| CM-3001 | selected goal | Green | closeout | complete | receipt | CMV-3002 | zero | 0 | COMPLETED_VALIDATED | 2026-07-28 |',
    'CM-3004 | malformed | Green | closeout | complete | receipt | CMV-3003 | zero | 0 | COMPLETED_VALIDATED | 2026-07-28'
  ].join('\n'));
  const malformed = collectAutopilotClosedLoopSummary({ workspaceRoot: tempRoot });
  assert.deepEqual(malformed.validation_coverage.missing_tasks, ['CM-3001']);
  assert.deepEqual(malformed.receipt_coverage.missing_tasks, ['CM-3001']);

  fs.writeFileSync(path.join(boardDir, 'VALIDATION_LOG.md'), [
    '| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |',
    '|---|---|---|---|---|---|---|---|',
    '| CMV-3002 | tests | P6 | CM-3001 selected goal | COMPLETED_VALIDATED_EXTRA | current closeout | none | 2026-07-28 |'
  ].join('\n'));
  fs.writeFileSync(path.join(boardDir, 'AUTOPILOT_LEDGER.md'), [
    '| ID | Goal | Lane | Envelope | Action | Receipt | Validation | Budget Used | Red Stops | Result | Date |',
    '|---|---|---|---|---|---|---|---|---:|---|---|',
    '| CM-3001 | selected goal | Green | closeout | complete | receipt | CMV-3002 | zero | 0 | completed_validated_suffix | 2026-07-28 |'
  ].join('\n'));

  const rejected = collectAutopilotClosedLoopSummary({ workspaceRoot: tempRoot });
  assert.deepEqual(rejected.validation_coverage.missing_tasks, ['CM-3001']);
  assert.deepEqual(rejected.receipt_coverage.missing_tasks, ['CM-3001']);
  assert.equal(rejected.validation_coverage.covered_tasks, 0);
  assert.equal(rejected.receipt_coverage.covered_tasks, 0);
});

test('unsupported current facts schemas fail closed instead of using stale done rows', () => {
  for (const schemaVersion of [3, 0, 6]) {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-schema-drift-'));
    const boardDir = path.join(tempRoot, '.agent_board');
    fs.mkdirSync(boardDir, { recursive: true });
    fs.writeFileSync(path.join(boardDir, 'CURRENT_FACTS.json'), JSON.stringify({
      schemaVersion,
      lastCompleted: {
        taskId: 'CM-3001',
        validationId: 'CMV-3002'
      }
    }));
    fs.writeFileSync(path.join(boardDir, 'TASK_QUEUE.md'), [
      '| ID | Status | Area | Risk | Task | Required Validation | Notes |',
      '|---|---|---|---|---|---|---|',
      '| CM-3001 | done | P6 | Green | stale | tests | stale |'
    ].join('\n'));
    fs.writeFileSync(path.join(boardDir, 'VALIDATION_LOG.md'), [
      '| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |',
      '|---|---|---|---|---|---|---|---|',
      '| CMV-3002 | tests | P6 | CM-3001 stale | COMPLETED_VALIDATED | stale | none | 2026-07-28 |'
    ].join('\n'));
    fs.writeFileSync(path.join(boardDir, 'AUTOPILOT_LEDGER.md'), [
      '| ID | Goal | Lane | Envelope | Action | Receipt | Validation | Budget Used | Red Stops | Result | Date |',
      '|---|---|---|---|---|---|---|---|---:|---|---|',
      '| CM-3001 | stale | Green | closeout | complete | receipt | CMV-3002 | zero | 0 | COMPLETED_VALIDATED | 2026-07-28 |'
    ].join('\n'));
    fs.writeFileSync(path.join(boardDir, 'CHECKPOINT.md'), '');

    const summary = collectAutopilotClosedLoopSummary({ workspaceRoot: tempRoot });
    assert.equal(summary.latest_task, 'not_recorded', `schema ${schemaVersion}`);
    assert.equal(summary.next_safe_task, 'none_local_queue_empty', `schema ${schemaVersion}`);
    assert.equal(summary.validation_coverage.completed_tasks, 1, `schema ${schemaVersion}`);
    assert.equal(summary.validation_coverage.covered_tasks, 0, `schema ${schemaVersion}`);
    assert.equal(summary.receipt_coverage.completed_tasks, 1, `schema ${schemaVersion}`);
    assert.equal(summary.receipt_coverage.covered_tasks, 0, `schema ${schemaVersion}`);
  }
});

test('schema v5 controller refuses a valid task beside a malformed queue candidate', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-v5-queue-drift-'));
  const boardDir = path.join(tempRoot, '.agent_board');
  fs.mkdirSync(boardDir, { recursive: true });
  fs.writeFileSync(path.join(boardDir, 'CURRENT_FACTS.json'), JSON.stringify({
    schemaVersion: 5,
    activeTask: 'CM-3005',
    lastCompleted: {
      taskId: 'CM-3001',
      validationId: 'CMV-3002'
    }
  }));
  fs.writeFileSync(path.join(boardDir, 'TASK_QUEUE.md'), [
    '| ID | Priority | Status | Area | Risk | Target Files | Task | Required Validation | Rollback Check | Gate Required | Notes |',
    '|---|---:|---|---|---|---|---|---|---|---|---|',
    '| CM-3005 | 3005 | todo | P6 | Green | docs | selected | tests | none | no | active |',
    '| CM-3006X | 3006 | todo | P6 | Green | docs | malformed | tests | none | no | stale |'
  ].join('\n'));
  fs.writeFileSync(path.join(boardDir, 'VALIDATION_LOG.md'), [
    '| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |',
    '|---|---|---|---|---|---|---|---|',
    '| CMV-3002 | tests | P6 | CM-3001 selected goal | COMPLETED_VALIDATED | current closeout | none | 2026-07-28 |'
  ].join('\n'));
  fs.writeFileSync(path.join(boardDir, 'AUTOPILOT_LEDGER.md'), [
    '| ID | Goal | Lane | Envelope | Action | Receipt | Validation | Budget Used | Red Stops | Result | Date |',
    '|---|---|---|---|---|---|---|---|---:|---|---|',
    '| CM-3001 | selected goal | Green | closeout | complete | receipt | CMV-3002 | zero | 0 | COMPLETED_VALIDATED | 2026-07-28 |'
  ].join('\n'));
  fs.writeFileSync(path.join(boardDir, 'CHECKPOINT.md'), '');
  fs.writeFileSync(path.join(tempRoot, 'STATUS.md'), 'NOT_READY_BLOCKED\n');

  const loop = collectAutopilotClosedLoopSummary({ workspaceRoot: tempRoot });
  const controller = collectAutopilotControllerSummary({ workspaceRoot: tempRoot });
  assert.equal(loop.latest_task, 'not_recorded');
  assert.equal(loop.next_safe_task, 'none_local_queue_empty');
  assert.equal(controller.next_safe_task, 'none_local_queue_empty');
  assert.equal(controller.lane_decision.decision, 'NO_EXECUTABLE_TASK_AVAILABLE');

  fs.writeFileSync(path.join(boardDir, 'TASK_QUEUE.md'), [
    '| ID | Priority | Status | Area | Risk | Target Files | Task | Required Validation | Rollback Check | Gate Required | Notes |',
    '| CM-3005 | 3005 | todo | P6 | Green | docs | selected | tests | none | no | active |'
  ].join('\n'));
  fs.writeFileSync(path.join(boardDir, 'VALIDATION_LOG.md'), [
    '| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |',
    '| CMV-3002 | tests | P6 | CM-3001 selected goal | COMPLETED_VALIDATED | current closeout | none | 2026-07-28 |'
  ].join('\n'));
  fs.writeFileSync(path.join(boardDir, 'AUTOPILOT_LEDGER.md'), [
    '| ID | Goal | Lane | Envelope | Action | Receipt | Validation | Budget Used | Red Stops | Result | Date |',
    '| CM-3001 | selected goal | Green | closeout | complete | receipt | CMV-3002 | zero | 0 | COMPLETED_VALIDATED | 2026-07-28 |'
  ].join('\n'));
  const missingSeparators = collectAutopilotClosedLoopSummary({ workspaceRoot: tempRoot });
  const missingSeparatorController =
    collectAutopilotControllerSummary({ workspaceRoot: tempRoot });
  assert.equal(missingSeparators.next_safe_task, 'none_local_queue_empty');
  assert.equal(missingSeparators.validation_coverage.covered_tasks, 0);
  assert.equal(missingSeparators.receipt_coverage.covered_tasks, 0);
  assert.equal(missingSeparatorController.next_safe_task, 'none_local_queue_empty');

  fs.writeFileSync(path.join(boardDir, 'TASK_QUEUE.md'), [
    '| id | Priority | Status | Area | Risk | Target Files | Task | Required Validation | Rollback Check | Gate Required | Notes |',
    '|---|---:|---|---|---|---|---|---|---|---|---|',
    '| CM-3005 | 3005 | todo | P6 | Green | docs | selected | tests | none | no | active |'
  ].join('\n'));
  fs.writeFileSync(path.join(boardDir, 'VALIDATION_LOG.md'), [
    '| id | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |',
    '|---|---|---|---|---|---|---|---|',
    '| CMV-3002 | tests | P6 | CM-3001 selected goal | COMPLETED_VALIDATED | current closeout | none | 2026-07-28 |'
  ].join('\n'));
  fs.writeFileSync(path.join(boardDir, 'AUTOPILOT_LEDGER.md'), [
    '| id | Goal | Lane | Envelope | Action | Receipt | Validation | Budget Used | Red Stops | Result | Date |',
    '|---|---|---|---|---|---|---|---|---:|---|---|',
    '| CM-3001 | selected goal | Green | closeout | complete | receipt | CMV-3002 | zero | 0 | COMPLETED_VALIDATED | 2026-07-28 |'
  ].join('\n'));
  const lowercaseHeaders = collectAutopilotClosedLoopSummary({ workspaceRoot: tempRoot });
  const lowercaseHeaderController =
    collectAutopilotControllerSummary({ workspaceRoot: tempRoot });
  assert.equal(lowercaseHeaders.next_safe_task, 'none_local_queue_empty');
  assert.equal(lowercaseHeaders.validation_coverage.covered_tasks, 0);
  assert.equal(lowercaseHeaders.receipt_coverage.covered_tasks, 0);
  assert.equal(lowercaseHeaderController.next_safe_task, 'none_local_queue_empty');
});

test('empty active queue stops safely and never falls back to a historical task', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-empty-queue-'));
  const boardDir = path.join(tempRoot, '.agent_board');
  fs.mkdirSync(boardDir, { recursive: true });
  fs.writeFileSync(path.join(boardDir, 'TASK_QUEUE.md'), [
    '| ID | Status | Area | Risk | Task | Required Validation | Notes |',
    '|---|---|---|---|---|---|---|'
  ].join('\n'));
  fs.writeFileSync(path.join(boardDir, 'VALIDATION_LOG.md'), [
    '| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |',
    '|---|---|---|---|---|---|---|---|',
    '| CMV-0808 | tests | P6 | CM-0684 historical validation | COMPLETED_VALIDATED | historical receipt only | none | 2026-05-21 |'
  ].join('\n'));
  fs.writeFileSync(path.join(boardDir, 'AUTOPILOT_LEDGER.md'), [
    '| ID | Goal | Lane | Envelope | Action | Receipt | Validation | Budget Used | Red Stops | Result | Date |',
    '|---|---|---|---|---|---|---|---|---:|---|---|',
    '| CM-0684 | historical goal | Green | default | action | receipt | CMV-0808 | zero | 0 | completed_validated | 2026-05-21 |'
  ].join('\n'));
  fs.writeFileSync(path.join(boardDir, 'CHECKPOINT.md'), '');
  fs.writeFileSync(path.join(tempRoot, 'STATUS.md'), 'NOT_READY_BLOCKED\n');

  const loop = collectAutopilotClosedLoopSummary({ workspaceRoot: tempRoot });
  const controller = collectAutopilotControllerSummary({ workspaceRoot: tempRoot });

  assert.equal(loop.latest_task, 'not_recorded');
  assert.equal(loop.latest_goal, 'not_recorded');
  assert.equal(loop.next_safe_task, 'none_local_queue_empty');
  assert.equal(controller.goal_id, 'not_recorded');
  assert.equal(controller.current_state, 'continued_or_stopped');
  assert.equal(controller.next_safe_task, 'none_local_queue_empty');
  assert.equal(controller.lane_decision.decision, 'NO_EXECUTABLE_TASK_AVAILABLE');
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
