const fs = require('node:fs');
const path = require('node:path');

const LOOP_STATES = Object.freeze([
  'intake',
  'grounding',
  'goal_compiled',
  'route_planned',
  'task_selected',
  'lane_classified',
  'executed',
  'validated',
  'repair_attempted_once',
  'receipted',
  'checkpointed',
  'continued_or_stopped'
]);

const FAILURE_TYPES = Object.freeze([
  'validation_fail',
  'scope_drift',
  'budget_exhausted',
  'red_gate',
  'dirty_worktree',
  'user_owned_change',
  'missing_evidence',
  'non_obvious_repair'
]);

const REJECTED_FLAGS = Object.freeze(new Set([
  '--write',
  '--append',
  '--execute',
  '--provider',
  '--api-call',
  '--mcp-call',
  '--record-memory',
  '--search-memory',
  '--runtime-probe',
  '--dependency-change',
  '--config-change',
  '--push',
  '--pr',
  '--deploy',
  '--release',
  '--tag',
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

function listMatching(workspaceRoot, relativeDir, pattern) {
  try {
    return fs.readdirSync(path.join(workspaceRoot, relativeDir)).filter(name => pattern.test(name)).sort();
  } catch {
    return [];
  }
}

function splitMarkdownRow(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  const cells = trimmed.slice(1, -1).split('|').map(cell => cell.trim());
  if (cells.every(cell => /^:?-{3,}:?$/.test(cell))) return null;
  return cells;
}

function parseMarkdownTable(markdownText = '') {
  const rows = [];
  let headers = null;
  for (const line of String(markdownText).split(/\r?\n/)) {
    const cells = splitMarkdownRow(line);
    if (!cells) continue;
    if (!headers) {
      headers = cells.map(cell => cell.toLowerCase());
      continue;
    }
    if (cells.length !== headers.length) continue;
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index];
    });
    rows.push(row);
  }
  return rows;
}

function parseTaskQueue(markdownText = '') {
  return parseMarkdownTable(markdownText)
    .filter(row => /^CM-\d{4}$/.test(row.id || ''))
    .map(row => ({
      id: row.id,
      status: row.status || '',
      area: row.area || '',
      risk: row.risk || '',
      task: row.task || '',
      requiredValidation: row['required validation'] || '',
      notes: row.notes || ''
    }));
}

function taskNumber(taskId = '') {
  const match = String(taskId).match(/^CM-(\d{4})$/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function isCurrentAutopilotTask(task) {
  const idNumber = taskNumber(task.id);
  return idNumber >= 664;
}

function parseValidationRows(markdownText = '') {
  return parseMarkdownTable(markdownText)
    .filter(row => /^CMV-\d{4}$/.test(row.id || ''))
    .map(row => ({
      id: row.id,
      scope: row.scope || '',
      result: row.result || '',
      summary: row.summary || '',
      followUp: row['follow-up'] || ''
    }));
}

function parseLedgerRows(markdownText = '') {
  return parseMarkdownTable(markdownText)
    .filter(row => /^CM-\d{4}$/.test(row.id || ''))
    .map(row => ({
      id: row.id,
      goal: row.goal || '',
      lane: row.lane || '',
      receipt: row.receipt || '',
      validation: row.validation || '',
      result: row.result || ''
    }));
}

function taskHasValidation(task, validationRows) {
  return validationRows.some(row => `${row.scope} ${row.summary}`.includes(task.id));
}

function taskHasReceipt(task, ledgerRows, validationRows) {
  const ledger = ledgerRows.find(row => row.id === task.id);
  if (ledger && ledger.receipt) return true;
  return validationRows.some(row => {
    const text = `${row.scope} ${row.summary} ${row.followUp}`.toLowerCase();
    return text.includes(task.id.toLowerCase())
      && (text.includes('receipt') || text.includes('no amber') || text.includes('not_required_no_amber_external_or_write_action'));
  });
}

function countBlockedRedItems(markdownText = '') {
  const section = String(markdownText).split('## Blocked Red Lane Items')[1] || '';
  return section.split(/\r?\n/).filter(line => line.trim().startsWith('- ')).length;
}

function computeCoverage(tasks, predicate) {
  const completed = tasks.filter(task => task.status === 'done');
  if (completed.length === 0) {
    return {
      completed_tasks: 0,
      covered_tasks: 0,
      missing_tasks: [],
      ratio: 1
    };
  }
  const covered = completed.filter(predicate);
  return {
    completed_tasks: completed.length,
    covered_tasks: covered.length,
    missing_tasks: completed.filter(task => !predicate(task)).map(task => task.id),
    ratio: covered.length / completed.length
  };
}

function collectAutopilotClosedLoopSummary(options = {}) {
  const workspaceRoot = options.workspaceRoot || process.cwd();
  const taskQueueText = readFileSafe(path.join(workspaceRoot, '.agent_board', 'TASK_QUEUE.md'));
  const validationLogText = readFileSafe(path.join(workspaceRoot, '.agent_board', 'VALIDATION_LOG.md'));
  const ledgerText = readFileSafe(path.join(workspaceRoot, '.agent_board', 'AUTOPILOT_LEDGER.md'));
  const checkpointText = readFileSafe(path.join(workspaceRoot, '.agent_board', 'CHECKPOINT.md'));

  const tasks = parseTaskQueue(taskQueueText).filter(isCurrentAutopilotTask);
  const validationRows = parseValidationRows(validationLogText);
  const ledgerRows = parseLedgerRows(ledgerText);
  const latestTask = tasks[0] || null;
  const latestGoal = ledgerRows[ledgerRows.length - 1] || latestTask || null;
  const nextSafeTask = tasks.find(task => task.status === 'todo' || task.status === 'in_progress') || null;
  const validationCoverage = computeCoverage(tasks, task => taskHasValidation(task, validationRows));
  const receiptCoverage = computeCoverage(tasks, task => taskHasReceipt(task, ledgerRows, validationRows));

  const schemas = listMatching(workspaceRoot, 'schemas', /^autopilot_.*\.schema\.yaml$/);
  const examples = listMatching(workspaceRoot, path.join('tests', 'schema_examples'), /^autopilot_.*\.example\.json$/);
  const loopDocsPresent = exists(workspaceRoot, path.join('docs', 'AUTOPILOT_CLOSED_LOOP_STATE_MACHINE.md'))
    && exists(workspaceRoot, path.join('docs', 'AUTOPILOT_FAILURE_RECOVERY_MATRIX.md'));
  const helperPresent = exists(workspaceRoot, path.join('src', 'core', 'AutopilotClosedLoopDryRun.js'));
  const cliPresent = exists(workspaceRoot, path.join('src', 'cli', 'autopilot-closed-loop-dry-run.js'));
  const validatorPresent = exists(workspaceRoot, path.join('scripts', 'validate_autopilot_closed_loop.js'));
  const completedValidated = validationRows.some(row => row.scope.includes('CM-0691') && row.result === 'COMPLETED_VALIDATED');
  const status = loopDocsPresent
    && helperPresent
    && cliPresent
    && validatorPresent
    && schemas.includes('autopilot_closed_loop_state.schema.yaml')
    && schemas.includes('autopilot_failure_recovery_matrix.schema.yaml')
    && examples.includes('autopilot_closed_loop_state.example.json')
    && examples.includes('autopilot_failure_recovery_matrix.example.json')
      ? 'ok'
      : 'warn';

  return {
    mode: 'autopilot-closed-loop-dry-run',
    status,
    decision: 'NOT_READY_BLOCKED',
    evidenceClass: 'read_only_local_filesystem_summary',
    latest_goal: latestGoal ? latestGoal.id : 'not_recorded',
    latest_task: latestTask ? latestTask.id : 'not_recorded',
    next_safe_task: nextSafeTask ? nextSafeTask.id : 'none_local_queue_empty',
    loop_state_count: LOOP_STATES.length,
    required_states: [...LOOP_STATES],
    blocked_red_count: countBlockedRedItems(ledgerText),
    receipt_coverage: receiptCoverage,
    validation_coverage: validationCoverage,
    repair_once_remaining: !checkpointText.includes('repair_attempted_once=true'),
    readiness_claim_allowed: false,
    dry_run_only: true,
    writes_performed: false,
    provider_calls_performed: false,
    mcp_calls_performed: false,
    real_memory_access_performed: false,
    dependency_changes_performed: false,
    config_changes_performed: false,
    failure_matrix_types: [...FAILURE_TYPES],
    closed_loop_validation_recorded: completedValidated,
    stop_reason: status === 'ok' ? 'none' : 'autopilot_closed_loop_surface_incomplete'
  };
}

module.exports = {
  FAILURE_TYPES,
  LOOP_STATES,
  REJECTED_FLAGS,
  collectAutopilotClosedLoopSummary,
  isCurrentAutopilotTask,
  parseLedgerRows,
  parseMarkdownTable,
  parseTaskQueue,
  parseValidationRows
};
