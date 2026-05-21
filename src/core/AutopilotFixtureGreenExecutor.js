const fs = require('node:fs');
const path = require('node:path');

const FIXTURE_GREEN_EXECUTOR_REJECTED_FLAGS = Object.freeze(new Set([
  '--write',
  '--execute',
  '--run-task',
  '--apply',
  '--repair',
  '--run-validation',
  '--provider',
  '--api-call',
  '--mcp-call',
  '--record-memory',
  '--search-memory',
  '--memory-overview',
  '--runtime-probe',
  '--dependency-change',
  '--config-change',
  '--push',
  '--pr',
  '--deploy',
  '--release',
  '--tag',
  '--cutover',
  '--readiness-claim'
]));

const REQUIRED_TASK_KINDS = Object.freeze([
  'docs_update_fixture',
  'schema_fixture_update',
  'test_fixture_update',
  'board_status_update',
  'validator_local_update',
  'dashboard_summary_update'
]);

const REQUIRED_ADAPTER_KINDS = Object.freeze([
  'file_edit_adapter_noop',
  'validation_command_adapter_noop',
  'checkpoint_adapter_noop',
  'receipt_adapter_noop'
]);

const REQUIRED_FAIL_CLOSED_CASES = Object.freeze([
  'amber_lane_requested',
  'red_lane_requested',
  'disallowed_path_requested',
  'unknown_task_kind',
  'missing_validation_plan',
  'missing_checkpoint_plan',
  'write_requested',
  'provider_requested',
  'mcp_requested',
  'real_memory_requested',
  'dependency_requested',
  'runtime_probe_requested',
  'push_requested',
  'readiness_claim_requested'
]);

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function exists(workspaceRoot, relativePath) {
  return fs.existsSync(path.join(workspaceRoot, relativePath));
}

function hasExecutableFixtureShape(task) {
  return task
    && task.lane === 'Green'
    && REQUIRED_TASK_KINDS.includes(task.task_kind)
    && Array.isArray(task.target_files)
    && task.target_files.length > 0
    && Array.isArray(task.forbidden_files)
    && Number.isInteger(task.expected_write_count)
    && task.expected_write_count >= 0
    && Array.isArray(task.validation_plan)
    && task.validation_plan.length > 0
    && task.checkpoint_required === true
    && typeof task.receipt_required === 'boolean'
    && Boolean(task.rollback_or_cleanup_path)
    && Array.isArray(task.hard_stop_conditions)
    && task.hard_stop_conditions.length > 0
    && task.expected_noop_result === 'NOOP_EXECUTION_PLAN_READY';
}

function collectAutopilotFixtureGreenExecutor(options = {}) {
  const workspaceRoot = options.workspaceRoot || process.cwd();
  const examplePath = path.join(workspaceRoot, 'tests', 'schema_examples', 'autopilot_fixture_green_executor.example.json');
  const example = readJsonSafe(examplePath) || {};
  const executor = example.fixture_green_executor || {};
  const taskKinds = Array.isArray(executor.allowed_task_kinds) ? executor.allowed_task_kinds : [];
  const adapterKinds = Array.isArray(executor.allowed_adapter_kinds) ? executor.allowed_adapter_kinds : [];
  const tasks = Array.isArray(executor.executable_task_fixtures) ? executor.executable_task_fixtures : [];
  const failClosed = Array.isArray(executor.fail_closed_fixtures) ? executor.fail_closed_fixtures : [];
  const taskKindSet = new Set(taskKinds);
  const adapterKindSet = new Set(adapterKinds);
  const failClosedSet = new Set(failClosed.map(item => item.case_id));
  const missingTaskKinds = REQUIRED_TASK_KINDS.filter(item => !taskKindSet.has(item));
  const missingAdapterKinds = REQUIRED_ADAPTER_KINDS.filter(item => !adapterKindSet.has(item));
  const missingFailClosedCases = REQUIRED_FAIL_CLOSED_CASES.filter(item => !failClosedSet.has(item));
  const executablePlanCount = tasks.filter(hasExecutableFixtureShape).length;
  const failClosedCoverageCount = failClosed.filter(item => item.expected_result === 'REJECTED_FAIL_CLOSED' && item.mutated === false).length;
  const filesPresent = exists(workspaceRoot, 'schemas/autopilot_fixture_green_executor.schema.yaml')
    && exists(workspaceRoot, 'tests/schema_examples/autopilot_fixture_green_executor.example.json')
    && exists(workspaceRoot, 'docs/AUTOPILOT_FIXTURE_BACKED_GREEN_EXECUTOR_SKELETON.md')
    && exists(workspaceRoot, 'scripts/validate_autopilot_fixture_green_executor.js');
  const status = filesPresent
    && executor.skeleton_decision === 'GREEN_EXECUTOR_SKELETON_NOOP_READY'
    && executor.fixture_backed === true
    && executor.noop_only === true
    && executor.executor_activated === false
    && executor.executes_tasks === false
    && executor.writes_files === false
    && executor.writes_runtime_state === false
    && executor.readiness_claim_allowed === false
    && missingTaskKinds.length === 0
    && missingAdapterKinds.length === 0
    && missingFailClosedCases.length === 0
    && executablePlanCount === tasks.length
    && failClosedCoverageCount === failClosed.length
      ? 'ok'
      : 'warn';

  return {
    mode: 'autopilot-fixture-green-executor-skeleton-noop',
    status,
    decision: 'NOT_READY_BLOCKED',
    evidenceClass: 'fixture_only_read_only_noop_local_filesystem_summary',
    executor_id: executor.executor_id || 'not_recorded',
    skeleton_decision: executor.skeleton_decision || 'not_recorded',
    allowed_task_kind_count: taskKinds.length,
    required_task_kind_count: REQUIRED_TASK_KINDS.length,
    missing_task_kinds: missingTaskKinds,
    allowed_adapter_kind_count: adapterKinds.length,
    required_adapter_kind_count: REQUIRED_ADAPTER_KINDS.length,
    missing_adapter_kinds: missingAdapterKinds,
    executable_task_fixture_count: tasks.length,
    noop_execution_plan_count: executablePlanCount,
    fail_closed_fixture_count: failClosed.length,
    required_fail_closed_fixture_count: REQUIRED_FAIL_CLOSED_CASES.length,
    missing_fail_closed_cases: missingFailClosedCases,
    fail_closed_coverage_count: failClosedCoverageCount,
    next_safe_action: executor.next_safe_action || 'not_recorded',
    fixture_backed: executor.fixture_backed === true,
    noop_only: executor.noop_only === true,
    executor_activated: executor.executor_activated === true,
    executes_tasks: executor.executes_tasks === true,
    writes_files: executor.writes_files === true,
    writes_runtime_state: executor.writes_runtime_state === true,
    readiness_claim_allowed: false,
    mutated: false,
    validators_run_by_executor: false,
    receipts_written_by_executor: false,
    checkpoints_written_by_executor: false,
    provider_calls_performed: false,
    mcp_calls_performed: false,
    real_memory_access_performed: false,
    dependency_changes_performed: false,
    config_changes_performed: false,
    runtime_probe_performed: false,
    remote_actions_performed: false,
    stop_reason: status === 'ok' ? 'none' : 'fixture_green_executor_surface_incomplete'
  };
}

module.exports = {
  FIXTURE_GREEN_EXECUTOR_REJECTED_FLAGS,
  REQUIRED_ADAPTER_KINDS,
  REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_TASK_KINDS,
  collectAutopilotFixtureGreenExecutor
};
