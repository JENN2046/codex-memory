#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const failures = [];

function readText(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function readJson(relativePath) {
  const text = readText(relativePath);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    failures.push(`Invalid JSON: ${relativePath}: ${error.message}`);
    return null;
  }
}

function requireIncludes(relativePath, needles) {
  const text = readText(relativePath);
  for (const needle of needles) {
    if (!text.includes(needle)) {
      failures.push(`${relativePath} missing required text: ${needle}`);
    }
  }
}

function requireFalse(value, label) {
  if (value !== false) failures.push(`${label} must be false`);
}

function requireTrue(value, label) {
  if (value !== true) failures.push(`${label} must be true`);
}

const schemaFiles = [
  "schemas/autopilot_autonomy_envelope.schema.yaml",
  "schemas/autopilot_action_adapter_contract.schema.yaml",
  "schemas/autopilot_closed_loop_state.schema.yaml",
  "schemas/autopilot_controller_cycle.schema.yaml",
  "schemas/autopilot_execution_receipt.schema.yaml",
  "schemas/autopilot_failure_recovery_matrix.schema.yaml",
  "schemas/autopilot_receipt_registry.schema.yaml",
  "schemas/autopilot_structured_state_store.schema.yaml",
  "schemas/autopilot_goal.schema.yaml",
  "schemas/autopilot_route_plan.schema.yaml",
  "schemas/autopilot_task_queue.schema.yaml",
  "schemas/autopilot_validation_planner.schema.yaml",
  "schemas/autopilot_replay_harness.schema.yaml",
  "schemas/autopilot_operator_console.schema.yaml",
  "schemas/autopilot_controlled_green_executor_entry.schema.yaml",
  "schemas/autopilot_fixture_green_executor.schema.yaml",
  "schemas/autopilot_green_file_write_boundary.schema.yaml",
  "schemas/autopilot_green_file_write_executor_contract.schema.yaml",
];

const exampleFiles = [
  "tests/schema_examples/autopilot_autonomy_envelope.example.json",
  "tests/schema_examples/autopilot_action_adapter_contract.example.json",
  "tests/schema_examples/autopilot_closed_loop_state.example.json",
  "tests/schema_examples/autopilot_controller_cycle.example.json",
  "tests/schema_examples/autopilot_execution_receipt.example.json",
  "tests/schema_examples/autopilot_failure_recovery_matrix.example.json",
  "tests/schema_examples/autopilot_receipt_registry.example.json",
  "tests/schema_examples/autopilot_structured_state_store.example.json",
  "tests/schema_examples/autopilot_goal.example.json",
  "tests/schema_examples/autopilot_route_plan.example.json",
  "tests/schema_examples/autopilot_task_queue.example.json",
  "tests/schema_examples/autopilot_validation_planner.example.json",
  "tests/schema_examples/autopilot_replay_harness.example.json",
  "tests/schema_examples/autopilot_operator_console.example.json",
  "tests/schema_examples/autopilot_controlled_green_executor_entry.example.json",
  "tests/schema_examples/autopilot_fixture_green_executor.example.json",
  "tests/schema_examples/autopilot_green_file_write_boundary.example.json",
  "tests/schema_examples/autopilot_green_file_write_executor_contract.example.json",
];

for (const file of schemaFiles) readText(file);
for (const file of exampleFiles) readJson(file);

requireIncludes("schemas/autopilot_autonomy_envelope.schema.yaml", [
  "max_provider_calls",
  "max_plugin_calls",
  "max_api_calls",
  "max_image_candidates",
  "max_external_read_files",
  "max_write_files",
  "max_dependency_actions",
  "max_runtime_probe_minutes",
  "max_retry_per_transient_failure",
  "max_cost_amount",
  "max_cost_currency",
  "cost_tracking_required",
  "cost_unknown_is_red",
  "push_allowed",
  "secret_value_read_allowed",
  "destructive_action_allowed",
]);

requireIncludes("schemas/autopilot_action_adapter_contract.schema.yaml", [
  "file_edit_adapter",
  "validation_command_adapter",
  "provider_call_adapter",
  "mcp_tool_adapter",
  "memory_read_adapter",
  "memory_write_adapter",
  "dependency_action_adapter",
  "runtime_probe_adapter",
  "git_remote_adapter",
  "approval_packet_adapter",
  "budget_exhausted",
  "missing_receipt",
  "red_gate_attempted",
  "second_repair_attempted",
  "unknown_cost",
  "secret_access_attempted",
  "broad_memory_scan_attempted",
  "push_attempted",
  "readiness_claim_allowed",
]);

requireIncludes("schemas/autopilot_execution_receipt.schema.yaml", [
  "task_id",
  "lane",
  "envelope_id",
  "action_performed",
  "target_systems",
  "calls_used",
  "files_read",
  "files_written",
  "dependency_actions_used",
  "cost",
  "validation_run",
  "validation_result",
  "rollback_or_cleanup_available",
  "rollback_or_cleanup_plan",
  "irreversible_actions_performed",
  "next_auto_step_allowed",
  "stop_reason",
]);

requireIncludes("schemas/autopilot_closed_loop_state.schema.yaml", [
  "intake",
  "grounding",
  "goal_compiled",
  "route_planned",
  "task_selected",
  "lane_classified",
  "repair_attempted_once",
  "continued_or_stopped",
]);

requireIncludes("schemas/autopilot_failure_recovery_matrix.schema.yaml", [
  "validation_fail",
  "scope_drift",
  "budget_exhausted",
  "red_gate",
  "dirty_worktree",
  "user_owned_change",
  "missing_evidence",
  "non_obvious_repair",
]);

requireIncludes("schemas/autopilot_controller_cycle.schema.yaml", [
  "goal_id",
  "controller_cycle_id",
  "lane_decision",
  "execution_boundary",
  "validation_plan",
  "receipt_requirement",
  "checkpoint_requirement",
  "red_gate_status",
  "readiness_claim_allowed",
]);

requireIncludes("schemas/autopilot_structured_state_store.schema.yaml", [
  "append_only",
  "database_created",
  "durable_write_enabled",
  "board_migration_performed",
  "goal",
  "route_plan",
  "task_queue_snapshot",
  "task_attempt",
  "lane_decision",
  "action_preflight",
  "budget_debit",
  "execution_receipt",
  "validation_run",
  "repair_attempt",
  "checkpoint",
  "approval_packet",
  "red_gate_event",
  "stop_reason",
  "resume_token",
  "readiness_claim_allowed",
]);

requireIncludes("schemas/autopilot_validation_planner.schema.yaml", [
  "docs_only_green",
  "schema_fixture_green",
  "dashboard_readonly_green",
  "source_helper_green",
  "adapter_contract_fixture",
  "amber_provider_planned_only",
  "red_git_remote_blocked",
  "obvious_local_reversible_once",
  "second_failure_stop",
  "non_obvious_repair_stop",
  "design_judgment_stop",
  "red_gate_stop",
  "user_owned_change_stop",
  "readiness_claim_allowed",
]);

const envelope = readJson("tests/schema_examples/autopilot_autonomy_envelope.example.json");
const adapterContract = readJson("tests/schema_examples/autopilot_action_adapter_contract.example.json");
const closedLoop = readJson("tests/schema_examples/autopilot_closed_loop_state.example.json");
const controllerCycle = readJson("tests/schema_examples/autopilot_controller_cycle.example.json");
const receipt = readJson("tests/schema_examples/autopilot_execution_receipt.example.json");
const failureRecovery = readJson("tests/schema_examples/autopilot_failure_recovery_matrix.example.json");
const registry = readJson("tests/schema_examples/autopilot_receipt_registry.example.json");
const stateStore = readJson("tests/schema_examples/autopilot_structured_state_store.example.json");
const validationPlanner = readJson("tests/schema_examples/autopilot_validation_planner.example.json");
const replayHarness = readJson("tests/schema_examples/autopilot_replay_harness.example.json");
const operatorConsole = readJson("tests/schema_examples/autopilot_operator_console.example.json");
const controlledGreenEntry = readJson("tests/schema_examples/autopilot_controlled_green_executor_entry.example.json");
const fixtureGreenExecutor = readJson("tests/schema_examples/autopilot_fixture_green_executor.example.json");
const greenFileWriteBoundary = readJson("tests/schema_examples/autopilot_green_file_write_boundary.example.json");
const greenFileWriteExecutorContract = readJson("tests/schema_examples/autopilot_green_file_write_executor_contract.example.json");

if (envelope) {
  const budgets = envelope.budgets || {};
  const permissions = envelope.permissions || {};
  requireTrue(budgets.cost_tracking_required, "budgets.cost_tracking_required");
  requireTrue(budgets.cost_unknown_is_red, "budgets.cost_unknown_is_red");
  if (budgets.max_cost_amount !== 0) failures.push("budgets.max_cost_amount must be 0 for the local-only example");
  requireFalse(permissions.push_allowed, "permissions.push_allowed");
  requireFalse(permissions.secret_value_read_allowed, "permissions.secret_value_read_allowed");
  requireFalse(permissions.destructive_action_allowed, "permissions.destructive_action_allowed");
  requireFalse(permissions.tag_release_deploy_allowed, "permissions.tag_release_deploy_allowed");
}

if (adapterContract) {
  const contract = adapterContract.action_adapter_contract || {};
  if (contract.runtime_actions_connected !== false) failures.push("adapter contract runtime_actions_connected must be false");
  if (contract.provider_calls_connected !== false) failures.push("adapter contract provider_calls_connected must be false");
  if (contract.mcp_calls_connected !== false) failures.push("adapter contract mcp_calls_connected must be false");
  if (contract.readiness_claim_allowed !== false) failures.push("adapter contract readiness_claim_allowed must be false");
  const adapterIds = new Set((contract.adapters || []).map((adapter) => adapter.adapter_id));
  for (const requiredAdapter of [
    "file_edit_adapter",
    "validation_command_adapter",
    "provider_call_adapter",
    "mcp_tool_adapter",
    "memory_read_adapter",
    "memory_write_adapter",
    "dependency_action_adapter",
    "runtime_probe_adapter",
    "git_remote_adapter",
    "approval_packet_adapter",
  ]) {
    if (!adapterIds.has(requiredAdapter)) failures.push(`adapter contract missing ${requiredAdapter}`);
  }
  const fixtureIds = new Set((contract.fail_closed_fixtures || []).map((fixture) => fixture.fixture_id));
  for (const requiredFixture of [
    "budget_exhausted",
    "missing_receipt",
    "red_gate_attempted",
    "second_repair_attempted",
    "unknown_cost",
    "secret_access_attempted",
    "broad_memory_scan_attempted",
    "push_attempted",
  ]) {
    if (!fixtureIds.has(requiredFixture)) failures.push(`adapter contract missing fail-closed fixture ${requiredFixture}`);
  }
}

if (receipt && envelope) {
  const budgets = envelope.budgets || {};
  const calls = receipt.calls_used || {};
  if ((calls.provider || 0) > budgets.max_provider_calls) failures.push("receipt provider calls exceed envelope budget");
  if ((calls.plugin || 0) > budgets.max_plugin_calls) failures.push("receipt plugin calls exceed envelope budget");
  if ((calls.api || 0) > budgets.max_api_calls) failures.push("receipt API calls exceed envelope budget");
  if ((receipt.files_written || []).length > budgets.max_write_files) failures.push("receipt files_written exceed envelope budget");
  if ((receipt.dependency_actions_used || 0) > budgets.max_dependency_actions) failures.push("receipt dependency actions exceed envelope budget");
  if (!receipt.cost || receipt.cost.amount !== 0 || receipt.cost.known !== true) failures.push("receipt cost must be known and zero");
  if (!receipt.rollback || receipt.rollback.rollback_or_cleanup_available !== true) failures.push("receipt rollback plan must be available");
  if (!receipt.rollback || !receipt.rollback.rollback_or_cleanup_plan) failures.push("receipt rollback plan text is required");
  if (receipt.rollback && receipt.rollback.irreversible_actions_performed !== false) failures.push("receipt must not record irreversible actions");
}

if (registry) {
  for (const item of registry.blocked_red_items || []) {
    if (item.lane !== "Red") failures.push(`blocked item ${item.id} must have lane Red`);
    if (item.executable !== false) failures.push(`blocked Red item ${item.id} must not be executable`);
  }
}

if (closedLoop) {
  const machine = closedLoop.closed_loop_state_machine || {};
  const states = machine.states || [];
  if (states.length !== 12) failures.push("closed loop state machine must define 12 states");
  if (machine.readiness_claim_allowed !== false) failures.push("closed loop readiness_claim_allowed must be false");
  for (const state of states) {
    if (!state.input || !state.output || !state.allowed_local_action || !state.red_gate) {
      failures.push(`closed loop state ${state.id || "<unknown>"} is incomplete`);
    }
  }
}

if (failureRecovery) {
  const matrix = failureRecovery.failure_recovery_matrix || {};
  if (matrix.repair_attempt_limit !== 1) failures.push("failure recovery repair_attempt_limit must be 1");
  if (matrix.readiness_claim_allowed !== false) failures.push("failure recovery readiness_claim_allowed must be false");
  const failuresByType = new Set((matrix.failures || []).map((item) => item.failure_type));
  for (const requiredType of [
    "validation_fail",
    "scope_drift",
    "budget_exhausted",
    "red_gate",
    "dirty_worktree",
    "user_owned_change",
    "missing_evidence",
    "non_obvious_repair",
  ]) {
    if (!failuresByType.has(requiredType)) failures.push(`failure recovery missing ${requiredType}`);
  }
}

if (controllerCycle) {
  const cycle = controllerCycle.controller_cycle || {};
  if (!cycle.goal_id) failures.push("controller cycle goal_id is required");
  if (!cycle.controller_cycle_id) failures.push("controller cycle controller_cycle_id is required");
  if (cycle.readiness_claim_allowed !== false) failures.push("controller cycle readiness_claim_allowed must be false");
  if (cycle.mutated !== false) failures.push("controller cycle mutated must be false");
  if (!cycle.execution_boundary || cycle.execution_boundary.executes_tasks !== false) {
    failures.push("controller cycle must not execute tasks");
  }
}

if (stateStore) {
  const draft = stateStore.structured_state_store_draft || {};
  if (draft.append_only !== true) failures.push("state store draft append_only must be true");
  if (draft.no_migration !== true) failures.push("state store draft no_migration must be true");
  if (draft.database_created !== false) failures.push("state store draft database_created must be false");
  if (draft.durable_write_enabled !== false) failures.push("state store draft durable_write_enabled must be false");
  if (draft.board_migration_performed !== false) failures.push("state store draft board_migration_performed must be false");
  if (draft.readiness_claim_allowed !== false) failures.push("state store draft readiness_claim_allowed must be false");
  const records = Array.isArray(draft.records) ? draft.records : [];
  const recordTypes = new Set(records.map((record) => record.record_type));
  for (const requiredType of [
    "goal",
    "route_plan",
    "task_queue_snapshot",
    "task_attempt",
    "lane_decision",
    "action_preflight",
    "budget_debit",
    "execution_receipt",
    "validation_run",
    "repair_attempt",
    "checkpoint",
    "approval_packet",
    "red_gate_event",
    "stop_reason",
    "resume_token",
  ]) {
    if (!recordTypes.has(requiredType)) failures.push(`state store draft missing ${requiredType}`);
  }
  for (const record of records) {
    if (record.readiness_claim_allowed !== false) failures.push(`state store record ${record.id} readiness_claim_allowed must be false`);
    if (!record.mutation_boundary || record.mutation_boundary.mutated !== false) {
      failures.push(`state store record ${record.id} mutation_boundary.mutated must be false`);
    }
  }
}

if (validationPlanner) {
  const planner = validationPlanner.validation_planner || {};
  if (planner.executes_validation !== false) failures.push("validation planner executes_validation must be false");
  if (planner.applies_repair !== false) failures.push("validation planner applies_repair must be false");
  if (planner.repair_attempt_limit !== 1) failures.push("validation planner repair_attempt_limit must be 1");
  if (planner.readiness_claim_allowed !== false) failures.push("validation planner readiness_claim_allowed must be false");
  const caseIds = new Set((planner.validation_cases || []).map((item) => item.case_id));
  for (const requiredCase of [
    "docs_only_green",
    "schema_fixture_green",
    "dashboard_readonly_green",
    "source_helper_green",
    "adapter_contract_fixture",
    "amber_provider_planned_only",
    "red_git_remote_blocked",
  ]) {
    if (!caseIds.has(requiredCase)) failures.push(`validation planner missing ${requiredCase}`);
  }
  const ruleIds = new Set((planner.repair_once_rules || []).map((item) => item.rule_id));
  for (const requiredRule of [
    "obvious_local_reversible_once",
    "second_failure_stop",
    "non_obvious_repair_stop",
    "design_judgment_stop",
    "red_gate_stop",
    "user_owned_change_stop",
  ]) {
    if (!ruleIds.has(requiredRule)) failures.push(`validation planner missing ${requiredRule}`);
  }
}

if (replayHarness) {
  const harness = replayHarness.replay_harness || {};
  if (harness.read_only !== true) failures.push("replay harness read_only must be true");
  if (harness.replays_real_actions !== false) failures.push("replay harness replays_real_actions must be false");
  if (harness.writes_state !== false) failures.push("replay harness writes_state must be false");
  if (harness.readiness_claim_allowed !== false) failures.push("replay harness readiness_claim_allowed must be false");
  const scenarioIds = new Set((harness.replay_scenarios || []).map((item) => item.scenario_id));
  for (const requiredScenario of [
    "cycle_checkpoint_ok",
    "attempt_replay_noop",
    "receipt_reconciliation_missing_receipt",
    "dirty_worktree_protection",
    "partial_attempt_recovery",
    "stale_board_detection",
    "resume_token_ok",
    "stop_reason_replay",
  ]) {
    if (!scenarioIds.has(requiredScenario)) failures.push(`replay harness missing ${requiredScenario}`);
  }
  const failClosedReasons = new Set((harness.replay_scenarios || []).map((item) => item.fail_closed_reason).filter(Boolean));
  for (const requiredReason of [
    "dirty_worktree_detected",
    "missing_receipt_evidence",
    "stale_board_snapshot",
    "partial_attempt_without_checkpoint",
    "red_gate_event_replayed",
    "second_repair_attempt_replayed",
  ]) {
    if (!failClosedReasons.has(requiredReason)) failures.push(`replay harness missing fail-closed reason ${requiredReason}`);
  }
}

if (operatorConsole) {
  const consoleSurface = operatorConsole.operator_console || {};
  if (consoleSurface.read_only !== true) failures.push("operator console read_only must be true");
  if (consoleSurface.executes_eval !== false) failures.push("operator console executes_eval must be false");
  if (consoleSurface.writes_state !== false) failures.push("operator console writes_state must be false");
  if (consoleSurface.readiness_claim_allowed !== false) failures.push("operator console readiness_claim_allowed must be false");
  const surfaceIds = new Set((consoleSurface.surfaces || []).map((item) => item.surface_id));
  for (const requiredSurface of [
    "controller",
    "state_store_draft",
    "adapter_contract",
    "validation_planner",
    "resume_replay",
    "red_gate_inbox",
    "next_safe_action",
    "coverage_gaps",
  ]) {
    if (!surfaceIds.has(requiredSurface)) failures.push(`operator console missing ${requiredSurface}`);
  }
  const evalIds = new Set((consoleSurface.eval_matrix || []).map((item) => item.case_id));
  for (const requiredCase of [
    "golden_trace",
    "failure_injection",
    "budget_exhaustion",
    "red_gate_bypass_rejection",
    "missing_evidence",
    "unknown_cost",
    "secret_access",
    "broad_memory_scan",
    "push_attempt",
    "readiness_overclaim_rejection",
  ]) {
    if (!evalIds.has(requiredCase)) failures.push(`operator console missing eval case ${requiredCase}`);
  }
}

if (controlledGreenEntry) {
  const entry = controlledGreenEntry.controlled_green_executor_entry || {};
  if (entry.entry_decision !== "GREEN_EXECUTOR_ENTRY_PACKET_PREPARED_NOT_ACTIVATED") failures.push("controlled Green entry must remain prepared-not-activated");
  if (entry.read_only !== true) failures.push("controlled Green entry read_only must be true");
  if (entry.executor_activated !== false) failures.push("controlled Green entry executor_activated must be false");
  if (entry.executes_tasks !== false) failures.push("controlled Green entry executes_tasks must be false");
  if (entry.writes_runtime_state !== false) failures.push("controlled Green entry writes_runtime_state must be false");
  if (entry.readiness_claim_allowed !== false) failures.push("controlled Green entry readiness_claim_allowed must be false");
  const conditionIds = new Set((entry.admission_conditions || []).map((item) => item.condition_id));
  for (const requiredCondition of [
    "v3_default_model_active",
    "read_only_controller_ok",
    "closed_loop_summary_ok",
    "operator_console_ok",
    "action_adapter_contract_ok",
    "validation_planner_ok",
    "replay_harness_ok",
    "receipt_parser_ok",
    "dashboard_rollup_ok",
    "red_gate_inbox_fail_closed",
    "readiness_claim_allowed_false",
    "executor_scope_green_only",
  ]) {
    if (!conditionIds.has(requiredCondition)) failures.push(`controlled Green entry missing ${requiredCondition}`);
  }
  const allowedScope = new Set(entry.allowed_scope || []);
  for (const requiredScope of [
    "docs",
    "fixtures",
    "tests",
    ".agent_board",
    "local_validators",
    "read_only_helpers",
    "dashboard_read_only_summaries",
  ]) {
    if (!allowedScope.has(requiredScope)) failures.push(`controlled Green entry missing allowed scope ${requiredScope}`);
  }
}

if (fixtureGreenExecutor) {
  const executor = fixtureGreenExecutor.fixture_green_executor || {};
  if (executor.skeleton_decision !== "GREEN_EXECUTOR_SKELETON_NOOP_READY") failures.push("fixture Green executor skeleton decision mismatch");
  if (executor.fixture_backed !== true) failures.push("fixture Green executor fixture_backed must be true");
  if (executor.noop_only !== true) failures.push("fixture Green executor noop_only must be true");
  if (executor.executor_activated !== false) failures.push("fixture Green executor executor_activated must be false");
  if (executor.executes_tasks !== false) failures.push("fixture Green executor executes_tasks must be false");
  if (executor.writes_files !== false) failures.push("fixture Green executor writes_files must be false");
  if (executor.writes_runtime_state !== false) failures.push("fixture Green executor writes_runtime_state must be false");
  if (executor.readiness_claim_allowed !== false) failures.push("fixture Green executor readiness_claim_allowed must be false");
  const taskKinds = new Set(executor.allowed_task_kinds || []);
  for (const requiredKind of [
    "docs_update_fixture",
    "schema_fixture_update",
    "test_fixture_update",
    "board_status_update",
    "validator_local_update",
    "dashboard_summary_update",
  ]) {
    if (!taskKinds.has(requiredKind)) failures.push(`fixture Green executor missing task kind ${requiredKind}`);
  }
  const failClosed = new Set((executor.fail_closed_fixtures || []).map((item) => item.case_id));
  for (const requiredCase of [
    "amber_lane_requested",
    "red_lane_requested",
    "disallowed_path_requested",
    "unknown_task_kind",
    "missing_validation_plan",
    "missing_checkpoint_plan",
    "write_requested",
    "provider_requested",
    "mcp_requested",
    "real_memory_requested",
    "dependency_requested",
    "runtime_probe_requested",
    "push_requested",
    "readiness_claim_requested",
  ]) {
    if (!failClosed.has(requiredCase)) failures.push(`fixture Green executor missing fail-closed case ${requiredCase}`);
  }
}

if (greenFileWriteBoundary) {
  const boundary = greenFileWriteBoundary.green_file_write_boundary || {};
  if (boundary.boundary_decision !== "GREEN_FILE_WRITE_EXECUTOR_DESIGN_ALLOWED_IMPLEMENTATION_BLOCKED") failures.push("green file-write boundary decision mismatch");
  if (boundary.design_allowed !== true) failures.push("green file-write boundary design_allowed must be true");
  if (boundary.implementation_allowed !== false) failures.push("green file-write boundary implementation_allowed must be false");
  if (boundary.executor_activation_allowed !== false) failures.push("green file-write boundary executor_activation_allowed must be false");
  if (boundary.read_only !== true) failures.push("green file-write boundary read_only must be true");
  if (boundary.readiness_claim_allowed !== false) failures.push("green file-write boundary readiness_claim_allowed must be false");
  const designGates = new Set(boundary.required_design_gates || []);
  for (const requiredGate of [
    "exact_green_lane_only",
    "workspace_root_write_only",
    "allowed_path_classes_only",
    "explicit_write_set",
    "write_file_count_limit",
    "user_owned_diff_detection",
    "file_lock_check",
    "pre_write_diff_snapshot",
    "post_write_diff_review",
    "validation_before_checkpoint",
    "receipt_before_completion",
    "checkpoint_after_validation",
    "rollback_plan_required",
    "second_repair_stop",
    "readiness_claim_blocked",
  ]) {
    if (!designGates.has(requiredGate)) failures.push(`green file-write boundary missing design gate ${requiredGate}`);
  }
  const hardStops = new Set(boundary.implementation_hard_stops || []);
  for (const requiredStop of [
    "amber_or_red_lane",
    "unknown_target_path",
    "disallowed_target_path",
    "dirty_worktree_ambiguity",
    "user_owned_change_conflict",
    "missing_file_lock_evidence",
    "missing_pre_write_diff_snapshot",
    "missing_validation_plan",
    "validation_failure_requiring_judgment",
    "second_repair_attempt",
    "missing_receipt_or_checkpoint_plan",
    "overwrite_without_explicit_allowance",
    "external_side_effect_requested",
    "readiness_or_cutover_claim",
  ]) {
    if (!hardStops.has(requiredStop)) failures.push(`green file-write boundary missing hard stop ${requiredStop}`);
  }
}

if (greenFileWriteExecutorContract) {
  const contract = greenFileWriteExecutorContract.green_file_write_executor_contract || {};
  if (contract.contract_decision !== "GREEN_FILE_WRITE_EXECUTOR_CONTRACT_READY_IMPLEMENTATION_BLOCKED") failures.push("green file-write executor contract decision mismatch");
  if (contract.implementation_allowed !== false) failures.push("green file-write executor contract implementation_allowed must be false");
  if (contract.executor_activation_allowed !== false) failures.push("green file-write executor contract executor_activation_allowed must be false");
  if (contract.real_writes_allowed !== false) failures.push("green file-write executor contract real_writes_allowed must be false");
  if (contract.read_only !== true) failures.push("green file-write executor contract read_only must be true");
  if (contract.readiness_claim_allowed !== false) failures.push("green file-write executor contract readiness_claim_allowed must be false");
  const preflightGates = new Set(contract.required_preflight_gates || []);
  for (const requiredGate of [
    "green_lane_confirmed",
    "workspace_root_confirmed",
    "explicit_write_set_present",
    "write_count_within_budget",
    "all_paths_workspace_relative",
    "all_paths_allowed_class",
    "forbidden_paths_absent",
    "file_locks_available",
    "user_owned_diff_absent_or_owned_by_task",
    "pre_write_snapshot_available",
    "validation_plan_present",
    "receipt_plan_present",
    "checkpoint_plan_present",
    "rollback_plan_present",
    "readiness_claim_blocked",
  ]) {
    if (!preflightGates.has(requiredGate)) failures.push(`green file-write executor contract missing preflight gate ${requiredGate}`);
  }
  const failClosed = new Set(contract.fail_closed_rejection_cases || []);
  for (const requiredCase of [
    "amber_lane_task",
    "red_lane_task",
    "unknown_lane_task",
    "mixed_lane_task",
    "missing_explicit_write_set",
    "write_count_exceeds_budget",
    "outside_workspace_path",
    "disallowed_path_class",
    "forbidden_path_requested",
    "file_lock_missing",
    "user_owned_diff_conflict",
    "validation_plan_missing",
    "receipt_plan_missing",
    "checkpoint_plan_missing",
    "overwrite_without_allowance",
    "second_repair_attempt",
    "external_side_effect_requested",
    "readiness_claim_requested",
  ]) {
    if (!failClosed.has(requiredCase)) failures.push(`green file-write executor contract missing fail-closed case ${requiredCase}`);
  }
}

requireIncludes(".agent_board/AUTOPILOT_LEDGER.md", [
  "CM-0684",
  "Blocked Red Lane Items",
  "push / PR / tag / release / deploy",
]);

requireIncludes("AGENTS.md", [
  "Smart Standing Authorization v3",
  "Red Lane",
  "receipt",
]);

if (failures.length > 0) {
  console.error("AUTOPILOT GOVERNANCE KERNEL VALIDATION FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("AUTOPILOT GOVERNANCE KERNEL VALIDATION PASSED");
console.log(`schemas=${schemaFiles.length} examples=${exampleFiles.length}`);
