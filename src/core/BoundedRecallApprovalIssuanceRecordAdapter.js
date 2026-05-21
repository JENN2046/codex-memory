const fs = require('node:fs');
const path = require('node:path');
const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');
const {
  BOUNDED_RECALL_EXACT_APPROVAL_ID,
  buildBoundedRecallExactApprovalLine
} = require('./AuthorizedWritePathBoundedRecallPreparationReview');

const EXPECTED_BOUNDED_RECALL_APPROVAL_ISSUANCE_RECORD_SCHEMA_VERSION =
  'cm658-bounded-recall-approval-issuance-record-v1';
const CM0658_BOUNDED_RECALL_APPROVAL_ISSUANCE_RECORD_TEMPLATE_REF =
  'docs/CM-0658_AUTHORIZED_WRITE_PATH_BOUNDED_RECALL_APPROVAL_ISSUANCE_RECORD_TEMPLATE.md';

const ALLOWED_BOUNDED_RECALL_APPROVAL_ISSUANCE_DECISIONS = Object.freeze([
  'BOUNDED_RECALL_AUTO_AUTHORIZATION_LINE_ISSUED_NOT_EXECUTED',
  'BOUNDED_RECALL_AUTO_AUTHORIZATION_LINE_NOT_ISSUED',
  'BOUNDED_RECALL_AUTO_AUTHORIZATION_LINE_ISSUANCE_ABORTED_DRIFT'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeMarkdownFieldValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeMarkdownBoolean(value) {
  const normalized = normalizeMarkdownFieldValue(value).toLowerCase();
  return normalized === 'yes' || normalized === 'true';
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

function normalizeBoundedRecallApprovalIssuanceRecord(record = {}) {
  const safeRecord = isPlainObject(record) ? record : {};

  return {
    schemaVersion: normalizeString(safeRecord.schemaVersion),
    status: normalizeString(safeRecord.status),
    decision: normalizeString(safeRecord.decision),
    date: normalizeString(safeRecord.date),
    targetBaseline: normalizeString(safeRecord.targetBaseline),
    issuanceRoute: normalizeString(safeRecord.issuanceRoute),
    cm0595CloseoutRecord: normalizeString(safeRecord.cm0595CloseoutRecord),
    boundedRecallPreparationReview: normalizeString(
      safeRecord.boundedRecallPreparationReview
    ),
    issuedApprovalText: normalizeString(safeRecord.issuedApprovalText),
    issuedBy: normalizeString(safeRecord.issuedBy),
    boundedRecallExecutionStarted: normalizeBoolean(
      safeRecord.boundedRecallExecutionStarted
    ),
    outOfScopeActionsExecuted: normalizeString(safeRecord.outOfScopeActionsExecuted),
    _sourceFormat: normalizeString(safeRecord._sourceFormat),
    _sourcePath: normalizeString(safeRecord._sourcePath)
  };
}

function parseBoundedRecallApprovalIssuanceRecordMarkdown(markdown = '', options = {}) {
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
    schemaVersion: EXPECTED_BOUNDED_RECALL_APPROVAL_ISSUANCE_RECORD_SCHEMA_VERSION,
    status: normalizeMarkdownFieldValue(fieldMap.get('status')),
    decision: normalizeMarkdownFieldValue(fieldMap.get('decision')),
    date: normalizeMarkdownFieldValue(fieldMap.get('date')),
    targetBaseline: normalizeMarkdownFieldValue(fieldMap.get('target baseline')),
    issuanceRoute: normalizeMarkdownFieldValue(fieldMap.get('issuance route')),
    cm0595CloseoutRecord: normalizeMarkdownFieldValue(fieldMap.get('cm-0595 closeout record')),
    boundedRecallPreparationReview: normalizeMarkdownFieldValue(
      fieldMap.get('bounded-recall preparation review')
    ),
    issuedApprovalText: normalizeMarkdownFieldValue(fieldMap.get('issued approval text')),
    issuedBy: normalizeMarkdownFieldValue(fieldMap.get('issued by')),
    boundedRecallExecutionStarted: normalizeMarkdownBoolean(
      fieldMap.get('bounded recall execution started')
    ),
    outOfScopeActionsExecuted: normalizeMarkdownFieldValue(
      fieldMap.get('out-of-scope actions executed')
    ),
    _sourceFormat: 'cm0658_markdown_record_v1',
    _sourcePath: typeof options.sourcePath === 'string'
      ? redactSensitiveFragments(options.sourcePath)
      : ''
  };
}

function loadBoundedRecallApprovalIssuanceRecordFile(
  boundedRecallApprovalIssuanceRecordPath = ''
) {
  const resolvedPath = path.resolve(boundedRecallApprovalIssuanceRecordPath || '');
  const raw = fs.readFileSync(resolvedPath, 'utf8');
  const extension = path.extname(resolvedPath).toLowerCase();

  if (extension === '.md') {
    return {
      sourceFormat: 'cm0658_markdown_record_v1',
      rawSourcePath: resolvedPath,
      sourcePath: redactSensitiveFragments(resolvedPath),
      sourceFileName: path.basename(resolvedPath),
      record: parseBoundedRecallApprovalIssuanceRecordMarkdown(raw, {
        sourcePath: resolvedPath
      })
    };
  }

  return {
    sourceFormat: 'json_bounded_recall_approval_issuance_record_v1',
    rawSourcePath: resolvedPath,
    sourcePath: redactSensitiveFragments(resolvedPath),
    sourceFileName: path.basename(resolvedPath),
    record: JSON.parse(raw)
  };
}

function validateBoundedRecallApprovalIssuanceRecord(record = {}) {
  const normalized = normalizeBoundedRecallApprovalIssuanceRecord(record);
  const failClosedReasons = [];

  if (!isPlainObject(record)) {
    failClosedReasons.push('malformed_bounded_recall_approval_issuance_record');
  }
  if (
    normalized.schemaVersion !==
    EXPECTED_BOUNDED_RECALL_APPROVAL_ISSUANCE_RECORD_SCHEMA_VERSION
  ) {
    failClosedReasons.push(
      'bounded_recall_approval_issuance_record_schema_version_mismatch'
    );
  }
  if (
    !ALLOWED_BOUNDED_RECALL_APPROVAL_ISSUANCE_DECISIONS.includes(normalized.decision)
  ) {
    failClosedReasons.push('unsupported_bounded_recall_approval_issuance_decision');
  }
  if (!normalized.targetBaseline) {
    failClosedReasons.push('missing_bounded_recall_target_baseline');
  }
  if (!normalized.issuanceRoute) {
    failClosedReasons.push('missing_bounded_recall_issuance_route');
  }
  if (!normalized.cm0595CloseoutRecord) {
    failClosedReasons.push('missing_bounded_recall_cm0595_closeout_record_ref');
  }
  if (!normalized.boundedRecallPreparationReview) {
    failClosedReasons.push('missing_bounded_recall_preparation_review_ref');
  }
  if (!normalized.outOfScopeActionsExecuted) {
    failClosedReasons.push('missing_bounded_recall_out_of_scope_actions_summary');
  }

  const decisionIssued =
    normalized.decision === 'BOUNDED_RECALL_AUTO_AUTHORIZATION_LINE_ISSUED_NOT_EXECUTED';
  if (
    decisionIssued &&
    normalized.issuedApprovalText !==
      buildBoundedRecallExactApprovalLine(normalized.targetBaseline)
  ) {
    failClosedReasons.push('bounded_recall_issued_approval_text_mismatch');
  }
  if (decisionIssued && normalized.boundedRecallExecutionStarted === true) {
    failClosedReasons.push('bounded_recall_issuance_record_claims_execution_started');
  }
  if (
    decisionIssued &&
    normalized.outOfScopeActionsExecuted.toLowerCase() !== 'none'
  ) {
    failClosedReasons.push(
      'bounded_recall_issuance_record_out_of_scope_actions_not_none'
    );
  }

  return {
    normalized,
    valid: failClosedReasons.length === 0,
    failClosedReasons
  };
}

function buildBoundedRecallApprovalIssuanceRecordInputTrace({
  loadResult = null,
  normalizedBoundedRecallApprovalIssuanceRecord = null
} = {}) {
  const sourcePath = normalizeString(
    loadResult?.sourcePath
      || normalizedBoundedRecallApprovalIssuanceRecord?._sourcePath
      || ''
  );
  const sourceFormat = normalizeString(
    loadResult?.sourceFormat
      || normalizedBoundedRecallApprovalIssuanceRecord?._sourceFormat
      || ''
  );
  const sourceFileName = normalizeString(loadResult?.sourceFileName || '')
    || (sourcePath ? path.basename(sourcePath) : '');
  const sourceWorkspaceRelativePath = buildWorkspaceRelativePath(
    loadResult?.rawSourcePath
      || normalizedBoundedRecallApprovalIssuanceRecord?._sourcePath
      || ''
  );
  const exactLineIssued =
    normalizedBoundedRecallApprovalIssuanceRecord?.decision ===
      'BOUNDED_RECALL_AUTO_AUTHORIZATION_LINE_ISSUED_NOT_EXECUTED' &&
    normalizedBoundedRecallApprovalIssuanceRecord?.issuedApprovalText ===
      buildBoundedRecallExactApprovalLine(
        normalizedBoundedRecallApprovalIssuanceRecord?.targetBaseline
      );

  return {
    traceAvailable: true,
    sourceFormat: sourceFormat || 'unknown_bounded_recall_approval_issuance_record_source',
    sourcePath: sourcePath || '',
    sourceFileName: sourceFileName || '',
    sourceWorkspaceRelativePath,
    sourceArtifactRef: CM0658_BOUNDED_RECALL_APPROVAL_ISSUANCE_RECORD_TEMPLATE_REF,
    sourceMode: 'explicit_bounded_recall_approval_issuance_record_input',
    decision: normalizeString(
      normalizedBoundedRecallApprovalIssuanceRecord?.decision || ''
    ),
    targetBaseline: normalizeString(
      normalizedBoundedRecallApprovalIssuanceRecord?.targetBaseline || ''
    ),
    cm0595CloseoutRecord: normalizeString(
      normalizedBoundedRecallApprovalIssuanceRecord?.cm0595CloseoutRecord || ''
    ),
    boundedRecallPreparationReview: normalizeString(
      normalizedBoundedRecallApprovalIssuanceRecord?.boundedRecallPreparationReview || ''
    ),
    exactApprovalId: BOUNDED_RECALL_EXACT_APPROVAL_ID,
    exactLineIssued,
    boundedRecallExecutionStarted:
      normalizedBoundedRecallApprovalIssuanceRecord?.boundedRecallExecutionStarted ===
      true
  };
}

module.exports = {
  EXPECTED_BOUNDED_RECALL_APPROVAL_ISSUANCE_RECORD_SCHEMA_VERSION,
  CM0658_BOUNDED_RECALL_APPROVAL_ISSUANCE_RECORD_TEMPLATE_REF,
  ALLOWED_BOUNDED_RECALL_APPROVAL_ISSUANCE_DECISIONS,
  normalizeBoundedRecallApprovalIssuanceRecord,
  parseBoundedRecallApprovalIssuanceRecordMarkdown,
  loadBoundedRecallApprovalIssuanceRecordFile,
  validateBoundedRecallApprovalIssuanceRecord,
  buildBoundedRecallApprovalIssuanceRecordInputTrace
};
