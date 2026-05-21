const path = require('node:path');

const DEFAULT_MISSING_VALUE = 'not_recorded_in_validation_log';
const DEFAULT_BUDGET_USED = Object.freeze({
  provider: 0,
  api: 0,
  mcp_tool: 0,
  runtime_probe_minutes: 0,
  memory_queries: 0,
  memory_writes: 0,
  dependency_actions: 0
});

const FORBIDDEN_ACTION_MARKERS = Object.freeze([
  'provider',
  'api call',
  'mcp tool call',
  'mcp call',
  'runtime probe',
  'real memory',
  'dependency',
  'config',
  'public mcp expansion',
  'push',
  'tag',
  'release',
  'deploy',
  'readiness claim'
]);

const POSITIVE_READINESS_MARKERS = Object.freeze([
  'runtimeready=true',
  'rc_ready',
  'readiness achieved',
  'ready for production',
  'cutover authorized'
]);

function splitMarkdownRow(line) {
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
  if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) return null;
  return cells;
}

function parseValidationLogTable(markdownText = '') {
  const rows = [];
  let headers = null;

  for (const line of String(markdownText).split(/\r?\n/)) {
    const cells = splitMarkdownRow(line);
    if (!cells) continue;
    if (!headers) {
      headers = cells.map((cell) => cell.toLowerCase());
      continue;
    }
    if (cells.length !== headers.length) continue;
    const row = {};
    for (let index = 0; index < headers.length; index += 1) {
      row[headers[index]] = cells[index];
    }
    if (row.id && /^CMV-\d{4}$/.test(row.id)) {
      rows.push({
        id: row.id,
        command: row['command / check'] || '',
        area: row.area || '',
        scope: row.scope || '',
        result: row.result || '',
        summary: row.summary || '',
        followUp: row['follow-up'] || '',
        date: row.date || ''
      });
    }
  }

  return rows;
}

function extractTaskId(text = '') {
  const match = String(text).match(/\bCM-\d{4}\b/);
  return match ? match[0] : DEFAULT_MISSING_VALUE;
}

function extractTaskNumber(text = '') {
  const taskId = extractTaskId(text);
  if (taskId === DEFAULT_MISSING_VALUE) return null;
  const parsed = Number.parseInt(taskId.slice(3), 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function rowText(row) {
  return `${row.scope} ${row.summary} ${row.followUp}`.toLowerCase();
}

function isLocalDashboardReviewShape(row) {
  const text = rowText(row);
  return (
    text.includes('local dashboard') ||
    text.includes('dashboard text') ||
    text.includes('dashboard readiness') ||
    text.includes('dashboard validation') ||
    text.includes('dashboard output') ||
    text.includes('real dashboard') ||
    text.includes('targeted dashboard tests')
  );
}

function inferLane(row) {
  const text = rowText(row);
  const hasNoRedStopMarker = text.includes('no red stop') || text.includes('zero red stop');
  if (row.result === 'BLOCKED') return 'Red';
  if (!hasNoRedStopMarker && (text.includes('red stop') || text.includes('red gate stop'))) return 'Red';
  if (text.includes('green lane') || text.includes('no-amber') || text.includes('no amber')) return 'Green';
  if (
    text.includes('amber') ||
    text.includes('recall-audit append') ||
    text.includes('realmemoryreadquerycount') ||
    text.includes('real_memory_read_queries')
  ) {
    return 'Amber';
  }
  if (text.includes('amber lane action') || text.includes('amber external action') || text.includes('amber write action')) {
    return 'Amber';
  }
  if (isLocalDashboardReviewShape(row)) return 'Green';
  if (text.includes('green lane')) return 'Green';
  return DEFAULT_MISSING_VALUE;
}

function inferReceiptStatus(row) {
  const text = rowText(row);
  if (text.includes('not_required_no_amber_external_or_write_action')) {
    return 'not_required_no_amber_external_or_write_action';
  }
  if (text.includes('no amber receipt was required')) return 'not_required_no_amber_external_or_write_action';
  if (
    inferLane(row) === 'Amber' &&
    (
      text.includes('recall-audit append') ||
      text.includes('realmemoryreadquerycount') ||
      text.includes('real_memory_read_queries') ||
      text.includes('amber receipt')
    )
  ) {
    return 'amber_receipt_recorded';
  }
  if (text.includes('receipt rollup')) return 'receipt_rollup_only';
  if (text.includes('fixture drift changelog') || text.includes('changelog')) return 'fixture_changelog_only';
  if (text.includes('parser contract')) return 'parser_contract_only';
  if (isLocalDashboardReviewShape(row)) return 'local_review_shape_only';
  if (text.includes('dashboard receipt summary') || text.includes('dashboard summary')) {
    return 'local_review_shape_only';
  }
  if (text.includes('local closeout') || text.includes('commit-readiness')) {
    return 'local_review_shape_only';
  }
  if (text.includes('dashboard/recorder') || text.includes('recorder')) return 'local_review_shape_only';
  return DEFAULT_MISSING_VALUE;
}

function countMarkers(text, markers) {
  const lower = String(text || '').toLowerCase();
  return markers.reduce((count, marker) => count + (lower.includes(marker) ? 1 : 0), 0);
}

function classifyRow(row) {
  if (!row.result) return 'parser_blocked_missing_result';
  const text = rowText(row);
  if (POSITIVE_READINESS_MARKERS.some((marker) => text.includes(marker))) {
    return 'parser_blocked_readiness_overclaim';
  }
  if (inferLane(row) === 'Red') return 'parser_detected_red_stop';
  return 'parser_ok';
}

function isV3Row(row) {
  const text = rowText(row);
  const taskNumber = extractTaskNumber(row.scope);
  return (
    (Number.isInteger(taskNumber) && taskNumber >= 672) ||
    text.includes('smart standing authorization v3') ||
    text.includes('v3 receipt') ||
    text.includes('v3 dashboard') ||
    text.includes('green lane') ||
    ['CM-0673', 'CM-0674', 'CM-0675', 'CM-0676', 'CM-0677'].includes(extractTaskId(row.scope))
  );
}

function extractFirstInteger(text = '', patterns = []) {
  for (const pattern of patterns) {
    const match = String(text).match(pattern);
    if (!match) continue;
    const parsed = Number.parseInt(match[1], 10);
    if (Number.isInteger(parsed)) return parsed;
  }
  return null;
}

function inferBudgetUsed(row) {
  const text = `${row.scope} ${row.summary} ${row.followUp}`;
  const lower = text.toLowerCase();
  const budget = { ...DEFAULT_BUDGET_USED };

  if (lower.includes('provider/api/mcp=0') || lower.includes('provider/api/external mcp calls `0`')) {
    budget.provider = 0;
    budget.api = 0;
    budget.mcp_tool = 0;
  }

  const memoryQueries = extractFirstInteger(text, [
    /realMemoryReadQueryCount`?=?`?(\d+)/i,
    /real_memory_read_queries`?[:=]`?(\d+)/i,
    /memory_queries`?[:=]`?(\d+)/i
  ]);
  if (memoryQueries !== null) budget.memory_queries = memoryQueries;

  const memoryWrites = extractFirstInteger(text, [
    /memoryWrites`?=?`?(\d+)/i,
    /memory_writes`?[:=]`?(\d+)/i
  ]);
  if (memoryWrites !== null) budget.memory_writes = memoryWrites;

  const runtimeProbeMinutes = extractFirstInteger(text, [
    /runtime_probe_minutes`?[:=]`?(\d+)/i
  ]);
  if (runtimeProbeMinutes !== null) budget.runtime_probe_minutes = runtimeProbeMinutes;

  const dependencyActions = extractFirstInteger(text, [
    /dependency_actions`?[:=]`?(\d+)/i,
    /dependency actions`?:? `?(\d+)/i
  ]);
  if (dependencyActions !== null) budget.dependency_actions = dependencyActions;

  return budget;
}

function normalizeSourcePath(sourcePath, workspaceRoot = process.cwd()) {
  const absolute = path.resolve(workspaceRoot, sourcePath || '.agent_board/VALIDATION_LOG.md');
  const relative = path.relative(workspaceRoot, absolute);
  return {
    absolute,
    workspaceRelative: relative && !relative.startsWith('..') && !path.isAbsolute(relative)
      ? relative.split(path.sep).join('/')
      : DEFAULT_MISSING_VALUE
  };
}

function buildReceiptSummaryFromRows(rows = [], options = {}) {
  const source = normalizeSourcePath(options.sourcePath || '.agent_board/VALIDATION_LOG.md', options.workspaceRoot);
  const v3Rows = rows.filter(isV3Row);
  const latest = v3Rows[0] || null;
  const rowStatuses = v3Rows.map((row) => ({
    validation_id: row.id,
    task_id: extractTaskId(row.scope),
    result: row.result || DEFAULT_MISSING_VALUE,
    parser_status: classifyRow(row),
    lane: inferLane(row),
    receipt_status: inferReceiptStatus(row)
  }));
  const redStopCount = rowStatuses.filter((row) => row.lane === 'Red').length;
  const latestText = latest ? `${latest.scope} ${latest.summary} ${latest.followUp}` : '';
  const latestStatus = latest ? classifyRow(latest) : 'parser_blocked_no_v3_rows';
  const latestResult = latest ? latest.result || DEFAULT_MISSING_VALUE : DEFAULT_MISSING_VALUE;
  const budgetUsed = latest ? inferBudgetUsed(latest) : { ...DEFAULT_BUDGET_USED };
  const nextAutoStepAllowed =
    latestStatus === 'parser_ok' &&
    latestResult === 'COMPLETED_VALIDATED' &&
    redStopCount === 0;

  return {
    mode: 'smart-standing-authorization-v3-receipt-parser',
    decision: 'NOT_READY_BLOCKED',
    evidenceClass: 'read_only_local_markdown_parse',
    source_surface: source.workspaceRelative,
    source_row_count: rows.length,
    v3_row_count: v3Rows.length,
    latest_v3_task_id: latest ? extractTaskId(latest.scope) : DEFAULT_MISSING_VALUE,
    latest_validation_id: latest ? latest.id : DEFAULT_MISSING_VALUE,
    latest_lane: latest ? inferLane(latest) : DEFAULT_MISSING_VALUE,
    latest_envelope_id: DEFAULT_MISSING_VALUE,
    latest_receipt_status: latest ? inferReceiptStatus(latest) : DEFAULT_MISSING_VALUE,
    latest_validation_result: latestResult,
    latest_parser_status: latestStatus,
    budget_used: budgetUsed,
    forbidden_action_marker_count: countMarkers(latestText, FORBIDDEN_ACTION_MARKERS),
    red_stop_count: redStopCount,
    next_auto_step_allowed: nextAutoStepAllowed,
    stop_reason: nextAutoStepAllowed ? 'none' : latestStatus,
    row_statuses: rowStatuses,
    non_claims: [
      'runtime recorder implemented',
      'CLI writes performed',
      'live Amber action executed',
      'provider evidence captured',
      'real memory evidence captured',
      'readiness achieved'
    ]
  };
}

function parseReceiptMarkdown(markdownText = '', options = {}) {
  return buildReceiptSummaryFromRows(parseValidationLogTable(markdownText), options);
}

module.exports = {
  DEFAULT_MISSING_VALUE,
  FORBIDDEN_ACTION_MARKERS,
  POSITIVE_READINESS_MARKERS,
  buildReceiptSummaryFromRows,
  classifyRow,
  extractTaskId,
  extractTaskNumber,
  inferBudgetUsed,
  inferLane,
  inferReceiptStatus,
  parseReceiptMarkdown,
  parseValidationLogTable
};
