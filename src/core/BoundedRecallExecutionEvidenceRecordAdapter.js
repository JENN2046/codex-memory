const fs = require('node:fs');
const path = require('node:path');
const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_BOUNDED_RECALL_EXECUTION_EVIDENCE_RECORD_SCHEMA_VERSION =
  'cm659-bounded-recall-execution-evidence-record-v1';
const CM0659_BOUNDED_RECALL_EXECUTION_EVIDENCE_TEMPLATE_REF =
  'docs/CM-0659_AUTHORIZED_WRITE_PATH_BOUNDED_RECALL_EXECUTION_EVIDENCE_TEMPLATE.md';

const ALLOWED_BOUNDED_RECALL_EXECUTION_EVIDENCE_DECISIONS = Object.freeze([
  'BOUNDED_RECALL_PREPARATION_EXECUTED_APPROVAL_LINE_ONLY',
  'BOUNDED_RECALL_PREPARATION_EXECUTED_FAIL_CLOSED_ZERO_PREPARES',
  'BOUNDED_RECALL_PREPARATION_ABORTED_PREFLIGHT_DRIFT'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
}

function normalizeNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeMarkdownFieldValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildWorkspaceRelativePath(sourcePath = '') {
  const normalizedSourcePath = typeof sourcePath === 'string' ? sourcePath.trim() : '';
  if (!normalizedSourcePath) {
    return '';
  }

  const workspaceRoot = process.cwd();
  const relativePath = path.relative(workspaceRoot, normalizedSourcePath);
  if (!relativePath) {
    return '.';
  }
  if (path.isAbsolute(relativePath)) {
    return '';
  }
  if (relativePath.startsWith('..') || relativePath.includes(`..${path.sep}`)) {
    return '';
  }

  const slashNormalized = relativePath.split(/[\\/]+/).join('\\');
  return `.\\${slashNormalized}`;
}

function normalizeBoundedRecallExecutionEvidenceRecord(record = {}) {
  const safeRecord = isPlainObject(record) ? record : {};

  return {
    schemaVersion: normalizeString(safeRecord.schemaVersion),
    status: normalizeString(safeRecord.status),
    decision: normalizeString(safeRecord.decision),
    date: normalizeString(safeRecord.date),
    targetBaseline: normalizeString(safeRecord.targetBaseline),
    executionRoute: normalizeString(safeRecord.executionRoute),
    issuanceRecord: normalizeString(safeRecord.issuanceRecord),
    observedBranchHead: normalizeString(safeRecord.observedBranchHead),
    preparedLaterApprovalLineCount: normalizeNumber(
      safeRecord.preparedLaterApprovalLineCount
    ),
    boundedRecallExecutionCount: normalizeNumber(safeRecord.boundedRecallExecutionCount),
    observedPreparationOutcome: normalizeString(safeRecord.observedPreparationOutcome),
    outOfScopeActionsExecuted: normalizeString(safeRecord.outOfScopeActionsExecuted),
    _sourceFormat: normalizeString(safeRecord._sourceFormat),
    _sourcePath: normalizeString(safeRecord._sourcePath)
  };
}

function parseBoundedRecallExecutionEvidenceRecordMarkdown(markdown = '', options = {}) {
  const text = typeof markdown === 'string' ? markdown : '';
  const lines = text.split(/\r?\n/);
  const fieldMap = new Map();

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const headerMatch = /^([A-Za-z0-9][A-Za-z0-9\-\/() ]*?):\s*(.*)$/.exec(trimmed);
    if (headerMatch && !trimmed.startsWith('- ')) {
      fieldMap.set(headerMatch[1].trim().toLowerCase(), headerMatch[2]);
    }
  }

  return {
    schemaVersion: EXPECTED_BOUNDED_RECALL_EXECUTION_EVIDENCE_RECORD_SCHEMA_VERSION,
    status: normalizeMarkdownFieldValue(fieldMap.get('status')),
    decision: normalizeMarkdownFieldValue(fieldMap.get('decision')),
    date: normalizeMarkdownFieldValue(fieldMap.get('date')),
    targetBaseline: normalizeMarkdownFieldValue(fieldMap.get('target baseline')),
    executionRoute: normalizeMarkdownFieldValue(fieldMap.get('execution route')),
    issuanceRecord: normalizeMarkdownFieldValue(fieldMap.get('issuance record')),
    observedBranchHead: normalizeMarkdownFieldValue(fieldMap.get('observed branch/head')),
    preparedLaterApprovalLineCount: normalizeMarkdownFieldValue(
      fieldMap.get('prepared later approval line count')
    ),
    boundedRecallExecutionCount: normalizeMarkdownFieldValue(
      fieldMap.get('bounded recall execution count')
    ),
    observedPreparationOutcome: normalizeMarkdownFieldValue(
      fieldMap.get('observed preparation outcome')
    ),
    outOfScopeActionsExecuted: normalizeMarkdownFieldValue(
      fieldMap.get('out-of-scope actions executed')
    ),
    _sourceFormat: 'cm0659_markdown_record_v1',
    _sourcePath: typeof options.sourcePath === 'string'
      ? redactSensitiveFragments(options.sourcePath)
      : ''
  };
}

function loadBoundedRecallExecutionEvidenceRecordFile(
  boundedRecallExecutionEvidenceRecordPath = ''
) {
  const resolvedPath = path.resolve(boundedRecallExecutionEvidenceRecordPath || '');
  const raw = fs.readFileSync(resolvedPath, 'utf8');
  const extension = path.extname(resolvedPath).toLowerCase();

  if (extension === '.md') {
    return {
      sourceFormat: 'cm0659_markdown_record_v1',
      rawSourcePath: resolvedPath,
      sourcePath: redactSensitiveFragments(resolvedPath),
      sourceFileName: path.basename(resolvedPath),
      record: parseBoundedRecallExecutionEvidenceRecordMarkdown(raw, {
        sourcePath: resolvedPath
      })
    };
  }

  return {
    sourceFormat: 'json_bounded_recall_execution_evidence_record_v1',
    rawSourcePath: resolvedPath,
    sourcePath: redactSensitiveFragments(resolvedPath),
    sourceFileName: path.basename(resolvedPath),
    record: JSON.parse(raw)
  };
}

function validateBoundedRecallExecutionEvidenceRecord(record = {}) {
  const normalized = normalizeBoundedRecallExecutionEvidenceRecord(record);
  const failClosedReasons = [];

  if (!isPlainObject(record)) {
    failClosedReasons.push('malformed_bounded_recall_execution_evidence_record');
  }
  if (
    normalized.schemaVersion !==
    EXPECTED_BOUNDED_RECALL_EXECUTION_EVIDENCE_RECORD_SCHEMA_VERSION
  ) {
    failClosedReasons.push(
      'bounded_recall_execution_evidence_record_schema_version_mismatch'
    );
  }
  if (
    !ALLOWED_BOUNDED_RECALL_EXECUTION_EVIDENCE_DECISIONS.includes(normalized.decision)
  ) {
    failClosedReasons.push('unsupported_bounded_recall_execution_evidence_decision');
  }
  if (!normalized.targetBaseline) {
    failClosedReasons.push('missing_bounded_recall_execution_target_baseline');
  }
  if (!normalized.executionRoute) {
    failClosedReasons.push('missing_bounded_recall_execution_route');
  }
  if (!normalized.issuanceRecord) {
    failClosedReasons.push('missing_bounded_recall_execution_issuance_record_ref');
  }
  if (!normalized.observedBranchHead) {
    failClosedReasons.push('missing_bounded_recall_observed_branch_head');
  }
  if (!normalized.observedPreparationOutcome) {
    failClosedReasons.push('missing_bounded_recall_observed_preparation_outcome');
  }
  if (!normalized.outOfScopeActionsExecuted) {
    failClosedReasons.push(
      'missing_bounded_recall_execution_out_of_scope_actions_summary'
    );
  }

  const decision = normalized.decision;
  if (
    decision === 'BOUNDED_RECALL_PREPARATION_EXECUTED_APPROVAL_LINE_ONLY' &&
    normalized.preparedLaterApprovalLineCount !== 1
  ) {
    failClosedReasons.push(
      'bounded_recall_execution_expected_exactly_one_prepared_later_approval'
    );
  }
  if (
    decision === 'BOUNDED_RECALL_PREPARATION_EXECUTED_FAIL_CLOSED_ZERO_PREPARES' &&
    normalized.preparedLaterApprovalLineCount !== 0
  ) {
    failClosedReasons.push('bounded_recall_fail_closed_zero_prepare_count_mismatch');
  }
  if (
    decision === 'BOUNDED_RECALL_PREPARATION_ABORTED_PREFLIGHT_DRIFT' &&
    normalized.preparedLaterApprovalLineCount !== 0
  ) {
    failClosedReasons.push('bounded_recall_aborted_drift_zero_prepare_count_mismatch');
  }
  if (normalized.boundedRecallExecutionCount !== 0) {
    failClosedReasons.push('bounded_recall_execution_count_not_zero');
  }
  if (normalized.outOfScopeActionsExecuted.toLowerCase() !== 'none') {
    failClosedReasons.push(
      'bounded_recall_execution_out_of_scope_actions_not_none'
    );
  }

  return {
    normalized,
    valid: failClosedReasons.length === 0,
    failClosedReasons
  };
}

function buildBoundedRecallExecutionEvidenceInputTrace({
  loadResult = null,
  normalizedBoundedRecallExecutionEvidenceRecord = null
} = {}) {
  const sourcePath = normalizeString(
    loadResult?.sourcePath
      || normalizedBoundedRecallExecutionEvidenceRecord?._sourcePath
      || ''
  );
  const sourceFormat = normalizeString(
    loadResult?.sourceFormat
      || normalizedBoundedRecallExecutionEvidenceRecord?._sourceFormat
      || ''
  );
  const sourceFileName = normalizeString(loadResult?.sourceFileName || '')
    || (sourcePath ? path.basename(sourcePath) : '');
  const sourceWorkspaceRelativePath = buildWorkspaceRelativePath(
    loadResult?.rawSourcePath
      || normalizedBoundedRecallExecutionEvidenceRecord?._sourcePath
      || ''
  );
  const preparedLaterApprovalLineCount = normalizeNumber(
    normalizedBoundedRecallExecutionEvidenceRecord?.preparedLaterApprovalLineCount
  );
  const boundedRecallExecutionCount = normalizeNumber(
    normalizedBoundedRecallExecutionEvidenceRecord?.boundedRecallExecutionCount
  );

  return {
    traceAvailable: true,
    sourceFormat: sourceFormat || 'unknown_bounded_recall_execution_evidence_record_source',
    sourcePath: sourcePath || '',
    sourceFileName: sourceFileName || '',
    sourceWorkspaceRelativePath,
    sourceArtifactRef: CM0659_BOUNDED_RECALL_EXECUTION_EVIDENCE_TEMPLATE_REF,
    sourceMode: 'explicit_bounded_recall_execution_evidence_record_input',
    decision: normalizeString(
      normalizedBoundedRecallExecutionEvidenceRecord?.decision || ''
    ),
    targetBaseline: normalizeString(
      normalizedBoundedRecallExecutionEvidenceRecord?.targetBaseline || ''
    ),
    issuanceRecord: normalizeString(
      normalizedBoundedRecallExecutionEvidenceRecord?.issuanceRecord || ''
    ),
    preparedLaterApprovalLineCount,
    boundedRecallExecutionCount,
    preparedExactlyOneLaterApproval: preparedLaterApprovalLineCount === 1,
    boundedRecallRuntimeStayedZero: boundedRecallExecutionCount === 0
  };
}

module.exports = {
  EXPECTED_BOUNDED_RECALL_EXECUTION_EVIDENCE_RECORD_SCHEMA_VERSION,
  CM0659_BOUNDED_RECALL_EXECUTION_EVIDENCE_TEMPLATE_REF,
  ALLOWED_BOUNDED_RECALL_EXECUTION_EVIDENCE_DECISIONS,
  normalizeBoundedRecallExecutionEvidenceRecord,
  parseBoundedRecallExecutionEvidenceRecordMarkdown,
  loadBoundedRecallExecutionEvidenceRecordFile,
  validateBoundedRecallExecutionEvidenceRecord,
  buildBoundedRecallExecutionEvidenceInputTrace
};
