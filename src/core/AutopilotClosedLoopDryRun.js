const fs = require('node:fs');
const path = require('node:path');
const {
  ACTIVE_ROW_CANDIDATE_RE,
  ACTIVE_TABLE_HEADERS,
  containsExactIdToken,
  hasNonEmptyReceipt,
  isCanonicalCompletedResult
} = require('./AutopilotCloseoutContract');

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

const CURRENT_FACTS_SCHEMA_VERSION = 5;
const CM_ID_RE = /^CM-\d{4}$/;
const CMV_ID_RE = /^CMV-\d{4}$/;

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function readJsonSafe(filePath) {
  try {
    return {
      exists: true,
      value: JSON.parse(fs.readFileSync(filePath, 'utf8'))
    };
  } catch (error) {
    return {
      exists: error && error.code !== 'ENOENT',
      value: null
    };
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

function splitMarkdownRowCells(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  const body = trimmed.slice(1, -1);
  const cells = [];
  let current = '';
  let inCode = false;
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (char === '`') {
      inCode = !inCode;
      current += char;
      continue;
    }
    if (char === '|' && !inCode && body[index - 1] !== '\\') {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function isSeparatorRow(cells) {
  return Array.isArray(cells) &&
    cells.length > 0 &&
    cells.every(cell => /^:?-{3,}:?$/.test(cell));
}

function splitMarkdownRow(line) {
  const cells = splitMarkdownRowCells(line);
  return isSeparatorRow(cells) ? null : cells;
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
    .filter(row => CM_ID_RE.test(row.id || ''))
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
    .filter(row => CMV_ID_RE.test(row.id || ''))
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
    .filter(row => CM_ID_RE.test(row.id || ''))
    .map(row => ({
      id: row.id,
      goal: row.goal || '',
      lane: row.lane || '',
      receipt: row.receipt || '',
      validation: row.validation || '',
      result: row.result || ''
    }));
}

function inspectActiveTable(markdownText, expectedHeader) {
  const lines = String(markdownText || '').split(/\r?\n/);
  const headerIndexes = [];
  for (let index = 0; index < lines.length; index += 1) {
    const cells = splitMarkdownRowCells(lines[index]);
    if (cells &&
        cells.length === expectedHeader.length &&
        cells.every((cell, cellIndex) => cell === expectedHeader[cellIndex])) {
      headerIndexes.push(index);
    }
  }
  const headerIndex = headerIndexes.length === 1 ? headerIndexes[0] : -1;
  const separatorIndex = headerIndex >= 0 ? headerIndex + 1 : -1;
  const separatorCells = separatorIndex >= 0
    ? splitMarkdownRowCells(lines[separatorIndex])
    : null;
  const shapeValid = headerIndex >= 0 &&
    separatorCells &&
    separatorCells.length === expectedHeader.length &&
    isSeparatorRow(separatorCells);
  let rawDataRowCount = 0;
  for (let index = 0; index < lines.length; index += 1) {
    if (headerIndexes.includes(index) || index === separatorIndex) continue;
    const cells = splitMarkdownRowCells(lines[index]);
    if (cells || ACTIVE_ROW_CANDIDATE_RE.test(lines[index])) {
      rawDataRowCount += 1;
    }
  }
  return {
    rawDataRowCount,
    shapeValid: Boolean(shapeValid)
  };
}

function resolveCurrentCloseout(currentFacts) {
  if (!currentFacts.exists) {
    return {
      id: 'invalid_current_facts_last_completed',
      validationId: null,
      status: 'done',
      invalid: true
    };
  }
  const facts = currentFacts.value;
  if (facts && facts.schemaVersion === 4) return null;
  const closeout = facts && facts.lastCompleted;
  if (!facts || facts.schemaVersion !== CURRENT_FACTS_SCHEMA_VERSION ||
      !closeout || !CM_ID_RE.test(closeout.taskId || '') ||
      !CMV_ID_RE.test(closeout.validationId || '')) {
    return {
      id: 'invalid_current_facts_last_completed',
      validationId: null,
      status: 'done',
      invalid: true
    };
  }
  return {
    id: closeout.taskId,
    validationId: closeout.validationId,
    status: 'done',
    invalid: false
  };
}

function resolveCurrentQueueTasks(currentFacts, parsedTasks, tableInspection) {
  if (!currentFacts.exists) return [];
  const facts = currentFacts.value;
  if (facts && facts.schemaVersion === 4) return parsedTasks;
  if (!facts || facts.schemaVersion !== CURRENT_FACTS_SCHEMA_VERSION) return [];
  const activeTask = facts.activeTask;
  if (activeTask === null) return [];
  if (!CM_ID_RE.test(activeTask || '') ||
      !tableInspection.shapeValid ||
      tableInspection.rawDataRowCount !== 1 ||
      parsedTasks.length !== 1) {
    return [];
  }
  const selected = parsedTasks[0];
  if (selected.id !== activeTask ||
      !['todo', 'in_progress'].includes(selected.status)) {
    return [];
  }
  return parsedTasks;
}

function taskHasValidation(task, validationRows, tableInspection) {
  if (task.invalid) return false;
  if (task.validationId) {
    const matches = validationRows.filter(row =>
      row.id === task.validationId &&
      containsExactIdToken(row.scope, task.id) &&
      isCanonicalCompletedResult(row.result)
    );
    return tableInspection.shapeValid &&
      tableInspection.rawDataRowCount === 1 &&
      validationRows.length === 1 &&
      matches.length === 1;
  }
  return validationRows.some(row => `${row.scope} ${row.summary}`.includes(task.id));
}

function taskHasReceipt(task, ledgerRows, validationRows, tableInspection) {
  if (task.invalid) return false;
  if (task.validationId) {
    const matches = ledgerRows.filter(row =>
      row.id === task.id &&
      hasNonEmptyReceipt(row.receipt) &&
      containsExactIdToken(row.validation, task.validationId) &&
      isCanonicalCompletedResult(row.result)
    );
    return tableInspection.shapeValid &&
      tableInspection.rawDataRowCount === 1 &&
      ledgerRows.length === 1 &&
      matches.length === 1;
  }
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

function ledgerCoverageTasks(tasks, ledgerRows) {
  const ledgerTaskNumbers = ledgerRows
    .map(row => taskNumber(row.id))
    .filter(number => number > 0);
  if (ledgerTaskNumbers.length === 0) return tasks;
  const firstLedgerTaskNumber = Math.min(...ledgerTaskNumbers);
  return tasks.filter(task => taskNumber(task.id) >= firstLedgerTaskNumber);
}

function collectAutopilotClosedLoopSummary(options = {}) {
  const workspaceRoot = options.workspaceRoot || process.cwd();
  const currentFacts = readJsonSafe(path.join(workspaceRoot, '.agent_board', 'CURRENT_FACTS.json'));
  const taskQueueText = readFileSafe(path.join(workspaceRoot, '.agent_board', 'TASK_QUEUE.md'));
  const validationLogText = readFileSafe(path.join(workspaceRoot, '.agent_board', 'VALIDATION_LOG.md'));
  const ledgerText = readFileSafe(path.join(workspaceRoot, '.agent_board', 'AUTOPILOT_LEDGER.md'));
  const checkpointText = readFileSafe(path.join(workspaceRoot, '.agent_board', 'CHECKPOINT.md'));

  const queueTableInspection =
    inspectActiveTable(taskQueueText, ACTIVE_TABLE_HEADERS.taskQueue);
  const validationTableInspection =
    inspectActiveTable(validationLogText, ACTIVE_TABLE_HEADERS.validationLog);
  const ledgerTableInspection =
    inspectActiveTable(ledgerText, ACTIVE_TABLE_HEADERS.ledger);
  const parsedTasks = parseTaskQueue(taskQueueText);
  const tasks = resolveCurrentQueueTasks(
    currentFacts,
    parsedTasks,
    queueTableInspection
  ).filter(isCurrentAutopilotTask);
  const validationRows = parseValidationRows(validationLogText);
  const ledgerRows = parseLedgerRows(ledgerText);
  const currentCloseout = resolveCurrentCloseout(currentFacts);
  const latestTask = tasks[0] || null;
  const nextSafeTask = tasks.find(task => task.status === 'todo' || task.status === 'in_progress') || null;
  const validationCoverageTasks = currentCloseout ? [currentCloseout] : tasks;
  const receiptCoverageTasks = currentCloseout
    ? [currentCloseout]
    : ledgerCoverageTasks(tasks, ledgerRows);
  const validationCoverage = computeCoverage(
    validationCoverageTasks,
    task => taskHasValidation(task, validationRows, validationTableInspection)
  );
  const receiptCoverage = computeCoverage(
    receiptCoverageTasks,
    task => taskHasReceipt(
      task,
      ledgerRows,
      validationRows,
      ledgerTableInspection
    )
  );
  const currentCloseoutCovered = !currentCloseout || (
    !currentCloseout.invalid &&
    validationCoverage.completed_tasks === 1 &&
    validationCoverage.covered_tasks === 1 &&
    receiptCoverage.completed_tasks === 1 &&
    receiptCoverage.covered_tasks === 1
  );
  const legacyLatestGoal = ledgerRows[ledgerRows.length - 1] || latestTask || null;
  const latestGoal = currentCloseout
    ? (currentCloseoutCovered ? currentCloseout : null)
    : legacyLatestGoal;

  const schemas = listMatching(workspaceRoot, 'schemas', /^autopilot_.*\.schema\.yaml$/);
  const examples = listMatching(workspaceRoot, path.join('tests', 'schema_examples'), /^autopilot_.*\.example\.json$/);
  const loopDocsPresent = exists(workspaceRoot, path.join('docs', 'AUTOPILOT_CLOSED_LOOP_STATE_MACHINE.md'))
    && exists(workspaceRoot, path.join('docs', 'AUTOPILOT_FAILURE_RECOVERY_MATRIX.md'));
  const helperPresent = exists(workspaceRoot, path.join('src', 'core', 'AutopilotClosedLoopDryRun.js'));
  const cliPresent = exists(workspaceRoot, path.join('src', 'cli', 'autopilot-closed-loop-dry-run.js'));
  const validatorPresent = exists(workspaceRoot, path.join('scripts', 'validate_autopilot_closed_loop.js'));
  const completedValidated = validationRows.some(row => row.scope.includes('CM-0691') && row.result === 'COMPLETED_VALIDATED');
  const surfacesComplete = loopDocsPresent
    && helperPresent
    && cliPresent
    && validatorPresent
    && schemas.includes('autopilot_closed_loop_state.schema.yaml')
    && schemas.includes('autopilot_failure_recovery_matrix.schema.yaml')
    && examples.includes('autopilot_closed_loop_state.example.json')
    && examples.includes('autopilot_failure_recovery_matrix.example.json');
  const status = surfacesComplete && currentCloseoutCovered ? 'ok' : 'warn';
  const stopReason = !currentCloseoutCovered
    ? 'current_closeout_coverage_incomplete'
    : !surfacesComplete
      ? 'autopilot_closed_loop_surface_incomplete'
      : 'none';

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
    stop_reason: stopReason
  };
}

module.exports = {
  FAILURE_TYPES,
  LOOP_STATES,
  REJECTED_FLAGS,
  collectAutopilotClosedLoopSummary,
  containsExactIdToken,
  inspectActiveTable,
  isCurrentAutopilotTask,
  parseLedgerRows,
  parseMarkdownTable,
  parseTaskQueue,
  parseValidationRows
};
