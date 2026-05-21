const fs = require('node:fs');
const path = require('node:path');
const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');
const {
  CM0595_EXACT_APPROVAL_LINE
} = require('./AuthorizedWritePathWideningAdoptionReview');

const EXPECTED_CM0595_APPROVAL_ISSUANCE_RECORD_SCHEMA_VERSION =
  'cm649-cm0595-approval-issuance-record-v1';
const CM0649_CM0595_APPROVAL_ISSUANCE_RECORD_TEMPLATE_REF =
  'docs/CM-0649_AUTHORIZED_WRITE_PATH_CM0595_APPROVAL_ISSUANCE_RECORD_TEMPLATE.md';

const ALLOWED_CM0595_APPROVAL_ISSUANCE_DECISIONS = Object.freeze([
  'CM0595_AUTO_AUTHORIZATION_LINE_ISSUED_NOT_EXECUTED',
  'CM0595_AUTO_AUTHORIZATION_LINE_NOT_ISSUED',
  'CM0595_AUTO_AUTHORIZATION_LINE_ISSUANCE_ABORTED_DRIFT'
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

function normalizeCm0595ApprovalIssuanceRecord(record = {}) {
  const safeRecord = isPlainObject(record) ? record : {};

  return {
    schemaVersion: normalizeString(safeRecord.schemaVersion),
    status: normalizeString(safeRecord.status),
    decision: normalizeString(safeRecord.decision),
    date: normalizeString(safeRecord.date),
    targetBaseline: normalizeString(safeRecord.targetBaseline),
    issuanceRoute: normalizeString(safeRecord.issuanceRoute),
    wideningReviewRecord: normalizeString(safeRecord.wideningReviewRecord),
    wideningAdoptionRecord: normalizeString(safeRecord.wideningAdoptionRecord),
    sameBaselineTokenPresentEvidence: normalizeString(safeRecord.sameBaselineTokenPresentEvidence),
    issuedApprovalText: normalizeString(safeRecord.issuedApprovalText),
    issuedBy: normalizeString(safeRecord.issuedBy),
    runtimeExecutionStarted: normalizeBoolean(safeRecord.runtimeExecutionStarted),
    outOfScopeActionsExecuted: normalizeString(safeRecord.outOfScopeActionsExecuted),
    _sourceFormat: normalizeString(safeRecord._sourceFormat),
    _sourcePath: normalizeString(safeRecord._sourcePath)
  };
}

function parseCm0595ApprovalIssuanceRecordMarkdown(markdown = '', options = {}) {
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
    schemaVersion: EXPECTED_CM0595_APPROVAL_ISSUANCE_RECORD_SCHEMA_VERSION,
    status: normalizeMarkdownFieldValue(fieldMap.get('status')),
    decision: normalizeMarkdownFieldValue(fieldMap.get('decision')),
    date: normalizeMarkdownFieldValue(fieldMap.get('date')),
    targetBaseline: normalizeMarkdownFieldValue(fieldMap.get('target baseline')),
    issuanceRoute: normalizeMarkdownFieldValue(fieldMap.get('issuance route')),
    wideningReviewRecord: normalizeMarkdownFieldValue(fieldMap.get('widening review record')),
    wideningAdoptionRecord: normalizeMarkdownFieldValue(fieldMap.get('widening adoption record')),
    sameBaselineTokenPresentEvidence: normalizeMarkdownFieldValue(
      fieldMap.get('same-baseline token-present evidence')
    ),
    issuedApprovalText: normalizeMarkdownFieldValue(fieldMap.get('issued approval text')),
    issuedBy: normalizeMarkdownFieldValue(fieldMap.get('issued by')),
    runtimeExecutionStarted: normalizeMarkdownBoolean(fieldMap.get('runtime execution started')),
    outOfScopeActionsExecuted: normalizeMarkdownFieldValue(
      fieldMap.get('out-of-scope actions executed')
    ),
    _sourceFormat: 'cm0649_markdown_record_v1',
    _sourcePath: typeof options.sourcePath === 'string'
      ? redactSensitiveFragments(options.sourcePath)
      : ''
  };
}

function loadCm0595ApprovalIssuanceRecordFile(cm0595ApprovalIssuanceRecordPath = '') {
  const resolvedPath = path.resolve(cm0595ApprovalIssuanceRecordPath || '');
  const raw = fs.readFileSync(resolvedPath, 'utf8');
  const extension = path.extname(resolvedPath).toLowerCase();

  if (extension === '.md') {
    return {
      sourceFormat: 'cm0649_markdown_record_v1',
      rawSourcePath: resolvedPath,
      sourcePath: redactSensitiveFragments(resolvedPath),
      sourceFileName: path.basename(resolvedPath),
      record: parseCm0595ApprovalIssuanceRecordMarkdown(raw, { sourcePath: resolvedPath })
    };
  }

  return {
    sourceFormat: 'json_cm0595_approval_issuance_record_v1',
    rawSourcePath: resolvedPath,
    sourcePath: redactSensitiveFragments(resolvedPath),
    sourceFileName: path.basename(resolvedPath),
    record: JSON.parse(raw)
  };
}

function validateCm0595ApprovalIssuanceRecord(record = {}) {
  const normalized = normalizeCm0595ApprovalIssuanceRecord(record);
  const failClosedReasons = [];

  if (!isPlainObject(record)) {
    failClosedReasons.push('malformed_cm0595_approval_issuance_record');
  }
  if (normalized.schemaVersion !== EXPECTED_CM0595_APPROVAL_ISSUANCE_RECORD_SCHEMA_VERSION) {
    failClosedReasons.push('cm0595_approval_issuance_record_schema_version_mismatch');
  }
  if (!ALLOWED_CM0595_APPROVAL_ISSUANCE_DECISIONS.includes(normalized.decision)) {
    failClosedReasons.push('unsupported_cm0595_approval_issuance_decision');
  }
  if (!normalized.targetBaseline) {
    failClosedReasons.push('missing_cm0595_approval_target_baseline');
  }
  if (!normalized.issuanceRoute) {
    failClosedReasons.push('missing_cm0595_approval_issuance_route');
  }
  if (!normalized.wideningReviewRecord) {
    failClosedReasons.push('missing_cm0595_widening_review_record_ref');
  }
  if (!normalized.wideningAdoptionRecord) {
    failClosedReasons.push('missing_cm0595_widening_adoption_record_ref');
  }
  if (!normalized.sameBaselineTokenPresentEvidence) {
    failClosedReasons.push('missing_cm0595_token_present_evidence_ref');
  }
  if (!normalized.outOfScopeActionsExecuted) {
    failClosedReasons.push('missing_cm0595_out_of_scope_actions_summary');
  }

  const decisionIssued =
    normalized.decision === 'CM0595_AUTO_AUTHORIZATION_LINE_ISSUED_NOT_EXECUTED';
  if (decisionIssued && normalized.issuedApprovalText !== CM0595_EXACT_APPROVAL_LINE) {
    failClosedReasons.push('cm0595_issued_approval_text_mismatch');
  }
  if (decisionIssued && normalized.runtimeExecutionStarted === true) {
    failClosedReasons.push('cm0595_issuance_record_claims_runtime_started');
  }
  if (decisionIssued && normalized.outOfScopeActionsExecuted.toLowerCase() !== 'none') {
    failClosedReasons.push('cm0595_issuance_record_out_of_scope_actions_not_none');
  }

  return {
    normalized,
    valid: failClosedReasons.length === 0,
    failClosedReasons
  };
}

function buildCm0595ApprovalIssuanceRecordInputTrace({
  loadResult = null,
  normalizedCm0595ApprovalIssuanceRecord = null
} = {}) {
  const sourcePath = normalizeString(
    loadResult?.sourcePath
      || normalizedCm0595ApprovalIssuanceRecord?._sourcePath
      || ''
  );
  const sourceFormat = normalizeString(
    loadResult?.sourceFormat
      || normalizedCm0595ApprovalIssuanceRecord?._sourceFormat
      || ''
  );
  const sourceFileName = normalizeString(loadResult?.sourceFileName || '')
    || (sourcePath ? path.basename(sourcePath) : '');
  const sourceWorkspaceRelativePath = buildWorkspaceRelativePath(
    loadResult?.rawSourcePath
      || normalizedCm0595ApprovalIssuanceRecord?._sourcePath
      || ''
  );
  const exactLineIssued =
    normalizedCm0595ApprovalIssuanceRecord?.decision ===
      'CM0595_AUTO_AUTHORIZATION_LINE_ISSUED_NOT_EXECUTED' &&
    normalizedCm0595ApprovalIssuanceRecord?.issuedApprovalText === CM0595_EXACT_APPROVAL_LINE;

  return {
    traceAvailable: true,
    sourceFormat: sourceFormat || 'unknown_cm0595_approval_issuance_record_source',
    sourcePath: sourcePath || '',
    sourceFileName: sourceFileName || '',
    sourceWorkspaceRelativePath,
    sourceArtifactRef: CM0649_CM0595_APPROVAL_ISSUANCE_RECORD_TEMPLATE_REF,
    sourceMode: 'explicit_cm0595_approval_issuance_record_input',
    decision: normalizeString(normalizedCm0595ApprovalIssuanceRecord?.decision || ''),
    targetBaseline: normalizeString(normalizedCm0595ApprovalIssuanceRecord?.targetBaseline || ''),
    wideningReviewRecord: normalizeString(
      normalizedCm0595ApprovalIssuanceRecord?.wideningReviewRecord || ''
    ),
    wideningAdoptionRecord: normalizeString(
      normalizedCm0595ApprovalIssuanceRecord?.wideningAdoptionRecord || ''
    ),
    sameBaselineTokenPresentEvidence: normalizeString(
      normalizedCm0595ApprovalIssuanceRecord?.sameBaselineTokenPresentEvidence || ''
    ),
    exactLineIssued,
    runtimeExecutionStarted:
      normalizedCm0595ApprovalIssuanceRecord?.runtimeExecutionStarted === true
  };
}

module.exports = {
  EXPECTED_CM0595_APPROVAL_ISSUANCE_RECORD_SCHEMA_VERSION,
  CM0649_CM0595_APPROVAL_ISSUANCE_RECORD_TEMPLATE_REF,
  ALLOWED_CM0595_APPROVAL_ISSUANCE_DECISIONS,
  normalizeCm0595ApprovalIssuanceRecord,
  parseCm0595ApprovalIssuanceRecordMarkdown,
  loadCm0595ApprovalIssuanceRecordFile,
  validateCm0595ApprovalIssuanceRecord,
  buildCm0595ApprovalIssuanceRecordInputTrace
};
