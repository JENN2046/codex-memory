const fs = require('node:fs');
const path = require('node:path');
const {
  collectAutopilotClosedLoopSummary,
  isCurrentAutopilotTask,
  parseLedgerRows,
  parseTaskQueue,
  parseValidationRows
} = require('./AutopilotClosedLoopDryRun');
const {
  parseReceiptMarkdown
} = require('./SmartStandingAuthorizationV3ReceiptParser');

const CONTROLLER_REJECTED_FLAGS = Object.freeze(new Set([
  '--write',
  '--append',
  '--execute',
  '--run-task',
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

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function exists(workspaceRoot, relativePath) {
  return fs.existsSync(path.join(workspaceRoot, relativePath));
}

function normalizePath(relativePath) {
  return String(relativePath).split(path.sep).join('/');
}

function inferLaneDecision(task) {
  if (!task) {
    return {
      lane: 'none',
      decision: 'NO_EXECUTABLE_TASK_AVAILABLE',
      reason: 'local_queue_has_no_todo_or_in_progress_autopilot_task'
    };
  }

  const text = `${task.risk} ${task.task} ${task.notes}`.toLowerCase();
  if (text.includes('red') || text.includes('hard stop')) {
    return {
      lane: 'Red',
      decision: 'BLOCKED_RED_LANE',
      reason: 'task_text_contains_red_or_hard_stop_marker'
    };
  }
  if (text.includes('amber')) {
    return {
      lane: 'Amber',
      decision: 'AMBER_REQUIRES_EXACT_SCOPE_BUDGET_AND_RECEIPT',
      reason: 'task_text_contains_amber_marker'
    };
  }
  return {
    lane: 'Green',
    decision: 'GREEN_LOCAL_SAFE_NOOP_REVIEW_ONLY',
    reason: 'task_is_local_queue_item_without_red_or_amber_marker'
  };
}

function buildValidationPlan(task) {
  if (task?.requiredValidation) {
    return {
      source: '.agent_board/TASK_QUEUE.md',
      commands: task.requiredValidation.split(';').map(item => item.trim()).filter(Boolean),
      broader_validation_allowed: false,
      stop_on_non_obvious_failure: true
    };
  }
  return {
    source: 'controller_default_docs_gate',
    commands: [
      'node --check src\\core\\AutopilotControllerReadOnly.js',
      'node --check src\\cli\\autopilot-controller.js',
      'node --test tests\\autopilot-controller-cli.test.js',
      'powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\validate-local.ps1 -Area docs',
      'git diff --check'
    ],
    broader_validation_allowed: false,
    stop_on_non_obvious_failure: true
  };
}

function buildReceiptRequirement(laneDecision) {
  if (laneDecision.lane === 'Amber') {
    return {
      required: true,
      reason: 'meaningful_amber_external_or_write_action_requires_receipt',
      required_fields: [
        'task_id',
        'lane',
        'envelope_id',
        'action_performed',
        'target_systems',
        'calls_used',
        'files_read',
        'files_written',
        'validation_run',
        'validation_result',
        'rollback_or_cleanup_available',
        'next_auto_step_allowed',
        'stop_reason'
      ]
    };
  }
  return {
    required: false,
    reason: 'not_required_no_amber_external_or_write_action',
    required_fields: []
  };
}

function collectAutopilotControllerSummary(options = {}) {
  const workspaceRoot = options.workspaceRoot || process.cwd();
  const taskQueueText = readFileSafe(path.join(workspaceRoot, '.agent_board', 'TASK_QUEUE.md'));
  const ledgerText = readFileSafe(path.join(workspaceRoot, '.agent_board', 'AUTOPILOT_LEDGER.md'));
  const validationLogText = readFileSafe(path.join(workspaceRoot, '.agent_board', 'VALIDATION_LOG.md'));
  const statusText = readFileSafe(path.join(workspaceRoot, 'STATUS.md'));
  const closedLoop = collectAutopilotClosedLoopSummary({ workspaceRoot });
  const receiptSummary = parseReceiptMarkdown(validationLogText, {
    sourcePath: '.agent_board/VALIDATION_LOG.md',
    workspaceRoot
  });

  const tasks = parseTaskQueue(taskQueueText).filter(isCurrentAutopilotTask);
  const ledgerRows = parseLedgerRows(ledgerText);
  const validationRows = parseValidationRows(validationLogText);
  const selectedTask = tasks.find(task => task.status === 'todo' || task.status === 'in_progress') || null;
  const latestLedger = ledgerRows[ledgerRows.length - 1] || null;
  const latestValidation = validationRows[0] || null;
  const laneDecision = inferLaneDecision(selectedTask);
  const validationPlan = buildValidationPlan(selectedTask);
  const receiptRequirement = buildReceiptRequirement(laneDecision);

  const controllerFilesPresent = exists(workspaceRoot, path.join('src', 'core', 'AutopilotControllerReadOnly.js'))
    && exists(workspaceRoot, path.join('src', 'cli', 'autopilot-controller.js'))
    && exists(workspaceRoot, path.join('schemas', 'autopilot_controller_cycle.schema.yaml'))
    && exists(workspaceRoot, path.join('tests', 'schema_examples', 'autopilot_controller_cycle.example.json'))
    && exists(workspaceRoot, path.join('scripts', 'validate_autopilot_controller.js'));
  const validationRecorded = validationRows.some(row => row.scope.includes('CM-0692') && row.result === 'COMPLETED_VALIDATED');
  const noReadyClaim = statusText.includes('NOT_READY_BLOCKED') && !statusText.includes('RC_READY claim allowed');
  const status = controllerFilesPresent && noReadyClaim ? 'ok' : 'warn';

  return {
    mode: 'autopilot-controller-v0-read-only-noop',
    status,
    decision: 'NOT_READY_BLOCKED',
    evidenceClass: 'read_only_local_filesystem_summary',
    goal_id: latestLedger ? latestLedger.id : closedLoop.latest_goal,
    controller_cycle_id: `CTRL-${latestLedger ? latestLedger.id : closedLoop.latest_goal}-READONLY-001`,
    current_state: closedLoop.next_safe_task === 'none_local_queue_empty' ? 'continued_or_stopped' : 'task_selected',
    next_safe_task: selectedTask ? selectedTask.id : closedLoop.next_safe_task,
    lane_decision: laneDecision,
    execution_boundary: {
      mode: 'read_only_noop_executor',
      dry_run_only: true,
      executes_tasks: false,
      writes_runtime_state: false,
      allowed_reads: [
        'AGENTS.md',
        'STATUS.md',
        '.agent_board/TASK_QUEUE.md',
        '.agent_board/AUTOPILOT_LEDGER.md',
        '.agent_board/VALIDATION_LOG.md',
        'closed-loop dry-run summary',
        'v3 receipt parser summary',
        'dashboard local summaries'
      ],
      forbidden_actions: [
        'provider/API/MCP calls',
        'real memory scan/write',
        'dependency/config changes',
        'runtime probe',
        'push/PR/tag/release/deploy/cutover',
        'readiness claim'
      ]
    },
    validation_plan: validationPlan,
    repair_once_available: closedLoop.repair_once_remaining,
    receipt_requirement: receiptRequirement,
    checkpoint_requirement: {
      required: true,
      surface: '.agent_board/CHECKPOINT.md',
      mode: 'local_board_checkpoint_only'
    },
    red_gate_status: {
      status: 'active',
      blocked_red_count: closedLoop.blocked_red_count,
      hard_stop_required_for_red: true
    },
    source_surfaces: [
      'AGENTS.md',
      'STATUS.md',
      '.agent_board/TASK_QUEUE.md',
      '.agent_board/AUTOPILOT_LEDGER.md',
      '.agent_board/VALIDATION_LOG.md',
      'src/core/AutopilotClosedLoopDryRun.js',
      'src/core/SmartStandingAuthorizationV3ReceiptParser.js'
    ].map(normalizePath),
    observed: {
      latest_validation_id: latestValidation ? latestValidation.id : 'not_recorded',
      latest_v3_task_id: receiptSummary.latest_v3_task_id,
      latest_receipt_status: receiptSummary.latest_receipt_status,
      closed_loop_status: closedLoop.status
    },
    readiness_claim_allowed: false,
    runtime_readiness_claimed: false,
    cutover_readiness_claimed: false,
    production_readiness_claimed: false,
    rc_ready_claimed: false,
    mutated: false,
    provider_calls_performed: false,
    mcp_calls_performed: false,
    real_memory_access_performed: false,
    dependency_changes_performed: false,
    config_changes_performed: false,
    runtime_probe_performed: false,
    remote_actions_performed: false,
    controller_validation_recorded: validationRecorded,
    stop_reason: status === 'ok' ? 'none' : 'autopilot_controller_surface_incomplete'
  };
}

module.exports = {
  CONTROLLER_REJECTED_FLAGS,
  buildReceiptRequirement,
  buildValidationPlan,
  collectAutopilotControllerSummary,
  inferLaneDecision
};
