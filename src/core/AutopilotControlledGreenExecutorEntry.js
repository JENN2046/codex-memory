const fs = require('node:fs');
const path = require('node:path');

const CONTROLLED_GREEN_ENTRY_REJECTED_FLAGS = Object.freeze(new Set([
  '--write',
  '--activate',
  '--execute',
  '--run-task',
  '--apply',
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

const REQUIRED_ADMISSION_CONDITIONS = Object.freeze([
  'v3_default_model_active',
  'read_only_controller_ok',
  'closed_loop_summary_ok',
  'operator_console_ok',
  'action_adapter_contract_ok',
  'validation_planner_ok',
  'replay_harness_ok',
  'receipt_parser_ok',
  'dashboard_rollup_ok',
  'red_gate_inbox_fail_closed',
  'readiness_claim_allowed_false',
  'executor_scope_green_only'
]);

const REQUIRED_ALLOWED_SCOPE = Object.freeze([
  'docs',
  'fixtures',
  'tests',
  '.agent_board',
  'local_validators',
  'read_only_helpers',
  'dashboard_read_only_summaries'
]);

const REQUIRED_STOP_REASONS = Object.freeze([
  'non_green_lane_requested',
  'unknown_file_scope',
  'disallowed_file_scope',
  'missing_validation_plan',
  'missing_checkpoint_plan',
  'receipt_ambiguity',
  'dirty_worktree_ambiguity',
  'user_owned_change_conflict',
  'second_repair_attempt',
  'hard_stop_boundary_detected',
  'readiness_overclaim_attempted'
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

function collectAutopilotControlledGreenExecutorEntry(options = {}) {
  const workspaceRoot = options.workspaceRoot || process.cwd();
  const examplePath = path.join(workspaceRoot, 'tests', 'schema_examples', 'autopilot_controlled_green_executor_entry.example.json');
  const example = readJsonSafe(examplePath) || {};
  const entry = example.controlled_green_executor_entry || {};
  const conditions = Array.isArray(entry.admission_conditions) ? entry.admission_conditions : [];
  const conditionIds = new Set(conditions.map(item => item.condition_id));
  const allowedScope = Array.isArray(entry.allowed_scope) ? entry.allowed_scope : [];
  const allowedScopeSet = new Set(allowedScope);
  const stopReasons = Array.isArray(entry.fail_closed_stop_reasons) ? entry.fail_closed_stop_reasons : [];
  const stopReasonSet = new Set(stopReasons);
  const missingConditions = REQUIRED_ADMISSION_CONDITIONS.filter(item => !conditionIds.has(item));
  const missingAllowedScope = REQUIRED_ALLOWED_SCOPE.filter(item => !allowedScopeSet.has(item));
  const missingStopReasons = REQUIRED_STOP_REASONS.filter(item => !stopReasonSet.has(item));
  const metConditions = conditions.filter(item => item.status === 'met' && item.evidence);
  const filesPresent = exists(workspaceRoot, 'schemas/autopilot_controlled_green_executor_entry.schema.yaml')
    && exists(workspaceRoot, 'tests/schema_examples/autopilot_controlled_green_executor_entry.example.json')
    && exists(workspaceRoot, 'docs/AUTOPILOT_CONTROLLED_GREEN_EXECUTOR_ENTRY_PACKET.md')
    && exists(workspaceRoot, 'scripts/validate_autopilot_controlled_green_executor_entry.js');
  const status = filesPresent
    && entry.entry_decision === 'GREEN_EXECUTOR_ENTRY_PACKET_PREPARED_NOT_ACTIVATED'
    && entry.read_only === true
    && entry.executor_activated === false
    && entry.executes_tasks === false
    && entry.writes_runtime_state === false
    && entry.readiness_claim_allowed === false
    && missingConditions.length === 0
    && missingAllowedScope.length === 0
    && missingStopReasons.length === 0
    && metConditions.length === REQUIRED_ADMISSION_CONDITIONS.length
      ? 'ok'
      : 'warn';

  return {
    mode: 'autopilot-controlled-green-executor-entry-read-only',
    status,
    decision: 'NOT_READY_BLOCKED',
    evidenceClass: 'fixture_only_read_only_local_filesystem_summary',
    packet_id: entry.packet_id || 'not_recorded',
    entry_decision: entry.entry_decision || 'not_recorded',
    admission_condition_count: conditions.length,
    required_admission_condition_count: REQUIRED_ADMISSION_CONDITIONS.length,
    met_admission_condition_count: metConditions.length,
    missing_admission_conditions: missingConditions,
    allowed_scope_count: allowedScope.length,
    required_allowed_scope_count: REQUIRED_ALLOWED_SCOPE.length,
    missing_allowed_scope: missingAllowedScope,
    fail_closed_stop_reason_count: stopReasons.length,
    required_stop_reason_count: REQUIRED_STOP_REASONS.length,
    missing_stop_reasons: missingStopReasons,
    next_safe_action: entry.next_safe_action || 'not_recorded',
    read_only: entry.read_only === true,
    executor_activated: entry.executor_activated === true,
    executes_tasks: entry.executes_tasks === true,
    writes_runtime_state: entry.writes_runtime_state === true,
    readiness_claim_allowed: false,
    mutated: false,
    provider_calls_performed: false,
    mcp_calls_performed: false,
    real_memory_access_performed: false,
    dependency_changes_performed: false,
    config_changes_performed: false,
    runtime_probe_performed: false,
    remote_actions_performed: false,
    stop_reason: status === 'ok' ? 'none' : 'controlled_green_executor_entry_incomplete'
  };
}

module.exports = {
  CONTROLLED_GREEN_ENTRY_REJECTED_FLAGS,
  REQUIRED_ADMISSION_CONDITIONS,
  REQUIRED_ALLOWED_SCOPE,
  REQUIRED_STOP_REASONS,
  collectAutopilotControlledGreenExecutorEntry
};
