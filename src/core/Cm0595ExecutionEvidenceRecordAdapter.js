const fs = require('node:fs');
const path = require('node:path');
const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_CM0595_EXECUTION_EVIDENCE_RECORD_SCHEMA_VERSION =
  'cm650-cm0595-execution-evidence-record-v1';
const CM0650_CM0595_EXECUTION_EVIDENCE_TEMPLATE_REF =
  'docs/CM-0650_AUTHORIZED_WRITE_PATH_CM0595_EXECUTION_EVIDENCE_TEMPLATE.md';

const ALLOWED_CM0595_EXECUTION_EVIDENCE_DECISIONS = Object.freeze([
  'CM0595_EXECUTED_EXACTLY_ONE_WRITE_ONLY',
  'CM0595_EXECUTED_FAIL_CLOSED_ZERO_WRITES',
  'CM0595_ABORTED_PREFLIGHT_DRIFT'
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

function normalizeCm0595ExecutionEvidenceRecord(record = {}) {
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
    observedTokenPresenceEvidenceSource: normalizeString(
      safeRecord.observedTokenPresenceEvidenceSource
    ),
    durableMemoryWriteCount: normalizeNumber(safeRecord.durableMemoryWriteCount),
    writePathAuditSideEffectCount: normalizeNumber(safeRecord.writePathAuditSideEffectCount),
    observedWriteOutcome: normalizeString(safeRecord.observedWriteOutcome),
    outOfScopeActionsExecuted: normalizeString(safeRecord.outOfScopeActionsExecuted),
    _sourceFormat: normalizeString(safeRecord._sourceFormat),
    _sourcePath: normalizeString(safeRecord._sourcePath)
  };
}

function parseCm0595ExecutionEvidenceRecordMarkdown(markdown = '', options = {}) {
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
    schemaVersion: EXPECTED_CM0595_EXECUTION_EVIDENCE_RECORD_SCHEMA_VERSION,
    status: normalizeMarkdownFieldValue(fieldMap.get('status')),
    decision: normalizeMarkdownFieldValue(fieldMap.get('decision')),
    date: normalizeMarkdownFieldValue(fieldMap.get('date')),
    targetBaseline: normalizeMarkdownFieldValue(fieldMap.get('target baseline')),
    executionRoute: normalizeMarkdownFieldValue(fieldMap.get('execution route')),
    issuanceRecord: normalizeMarkdownFieldValue(fieldMap.get('issuance record')),
    observedBranchHead: normalizeMarkdownFieldValue(fieldMap.get('observed branch head')),
    observedTokenPresenceEvidenceSource: normalizeMarkdownFieldValue(
      fieldMap.get('observed token-presence evidence source')
    ),
    durableMemoryWriteCount: normalizeMarkdownFieldValue(
      fieldMap.get('durable memory write count')
    ),
    writePathAuditSideEffectCount: normalizeMarkdownFieldValue(
      fieldMap.get('write-path audit side-effect count')
    ),
    observedWriteOutcome: normalizeMarkdownFieldValue(fieldMap.get('observed write outcome')),
    outOfScopeActionsExecuted: normalizeMarkdownFieldValue(
      fieldMap.get('out-of-scope actions executed')
    ),
    _sourceFormat: 'cm0650_markdown_record_v1',
    _sourcePath: typeof options.sourcePath === 'string'
      ? redactSensitiveFragments(options.sourcePath)
      : ''
  };
}

function loadCm0595ExecutionEvidenceRecordFile(cm0595ExecutionEvidenceRecordPath = '') {
  const resolvedPath = path.resolve(cm0595ExecutionEvidenceRecordPath || '');
  const raw = fs.readFileSync(resolvedPath, 'utf8');
  const extension = path.extname(resolvedPath).toLowerCase();

  if (extension === '.md') {
    return {
      sourceFormat: 'cm0650_markdown_record_v1',
      rawSourcePath: resolvedPath,
      sourcePath: redactSensitiveFragments(resolvedPath),
      sourceFileName: path.basename(resolvedPath),
      record: parseCm0595ExecutionEvidenceRecordMarkdown(raw, { sourcePath: resolvedPath })
    };
  }

  return {
    sourceFormat: 'json_cm0595_execution_evidence_record_v1',
    rawSourcePath: resolvedPath,
    sourcePath: redactSensitiveFragments(resolvedPath),
    sourceFileName: path.basename(resolvedPath),
    record: JSON.parse(raw)
  };
}

function validateCm0595ExecutionEvidenceRecord(record = {}) {
  const normalized = normalizeCm0595ExecutionEvidenceRecord(record);
  const failClosedReasons = [];

  if (!isPlainObject(record)) {
    failClosedReasons.push('malformed_cm0595_execution_evidence_record');
  }
  if (normalized.schemaVersion !== EXPECTED_CM0595_EXECUTION_EVIDENCE_RECORD_SCHEMA_VERSION) {
    failClosedReasons.push('cm0595_execution_evidence_record_schema_version_mismatch');
  }
  if (!ALLOWED_CM0595_EXECUTION_EVIDENCE_DECISIONS.includes(normalized.decision)) {
    failClosedReasons.push('unsupported_cm0595_execution_evidence_decision');
  }
  if (!normalized.targetBaseline) {
    failClosedReasons.push('missing_cm0595_execution_target_baseline');
  }
  if (!normalized.executionRoute) {
    failClosedReasons.push('missing_cm0595_execution_route');
  }
  if (!normalized.issuanceRecord) {
    failClosedReasons.push('missing_cm0595_execution_issuance_record_ref');
  }
  if (!normalized.observedBranchHead) {
    failClosedReasons.push('missing_cm0595_observed_branch_head');
  }
  if (!normalized.observedTokenPresenceEvidenceSource) {
    failClosedReasons.push('missing_cm0595_observed_token_presence_evidence_source');
  }
  if (!normalized.observedWriteOutcome) {
    failClosedReasons.push('missing_cm0595_observed_write_outcome');
  }
  if (!normalized.outOfScopeActionsExecuted) {
    failClosedReasons.push('missing_cm0595_execution_out_of_scope_actions_summary');
  }

  const decision = normalized.decision;
  if (
    decision === 'CM0595_EXECUTED_EXACTLY_ONE_WRITE_ONLY' &&
    normalized.durableMemoryWriteCount !== 1
  ) {
    failClosedReasons.push('cm0595_execution_expected_exactly_one_write');
  }
  if (
    decision === 'CM0595_EXECUTED_FAIL_CLOSED_ZERO_WRITES' &&
    normalized.durableMemoryWriteCount !== 0
  ) {
    failClosedReasons.push('cm0595_fail_closed_zero_write_count_mismatch');
  }
  if (
    decision === 'CM0595_ABORTED_PREFLIGHT_DRIFT' &&
    normalized.durableMemoryWriteCount !== 0
  ) {
    failClosedReasons.push('cm0595_aborted_drift_zero_write_count_mismatch');
  }
  if (normalized.outOfScopeActionsExecuted.toLowerCase() !== 'none') {
    failClosedReasons.push('cm0595_execution_out_of_scope_actions_not_none');
  }

  return {
    normalized,
    valid: failClosedReasons.length === 0,
    failClosedReasons
  };
}

function buildCm0595ExecutionEvidenceInputTrace({
  loadResult = null,
  normalizedCm0595ExecutionEvidenceRecord = null
} = {}) {
  const sourcePath = normalizeString(
    loadResult?.sourcePath || normalizedCm0595ExecutionEvidenceRecord?._sourcePath || ''
  );
  const sourceFormat = normalizeString(
    loadResult?.sourceFormat || normalizedCm0595ExecutionEvidenceRecord?._sourceFormat || ''
  );
  const sourceFileName = normalizeString(loadResult?.sourceFileName || '')
    || (sourcePath ? path.basename(sourcePath) : '');
  const sourceWorkspaceRelativePath = buildWorkspaceRelativePath(
    loadResult?.rawSourcePath || normalizedCm0595ExecutionEvidenceRecord?._sourcePath || ''
  );
  const durableMemoryWriteCount = normalizeNumber(
    normalizedCm0595ExecutionEvidenceRecord?.durableMemoryWriteCount
  );
  const writePathAuditSideEffectCount = normalizeNumber(
    normalizedCm0595ExecutionEvidenceRecord?.writePathAuditSideEffectCount
  );

  return {
    traceAvailable: true,
    sourceFormat: sourceFormat || 'unknown_cm0595_execution_evidence_record_source',
    sourcePath: sourcePath || '',
    sourceFileName: sourceFileName || '',
    sourceWorkspaceRelativePath,
    sourceArtifactRef: CM0650_CM0595_EXECUTION_EVIDENCE_TEMPLATE_REF,
    sourceMode: 'explicit_cm0595_execution_evidence_record_input',
    decision: normalizeString(normalizedCm0595ExecutionEvidenceRecord?.decision || ''),
    targetBaseline: normalizeString(normalizedCm0595ExecutionEvidenceRecord?.targetBaseline || ''),
    issuanceRecord: normalizeString(normalizedCm0595ExecutionEvidenceRecord?.issuanceRecord || ''),
    observedTokenPresenceEvidenceSource: normalizeString(
      normalizedCm0595ExecutionEvidenceRecord?.observedTokenPresenceEvidenceSource || ''
    ),
    durableMemoryWriteCount,
    writePathAuditSideEffectCount,
    executedExactlyOneWrite: durableMemoryWriteCount === 1,
    failedClosedWithZeroWrites: durableMemoryWriteCount === 0
  };
}

module.exports = {
  EXPECTED_CM0595_EXECUTION_EVIDENCE_RECORD_SCHEMA_VERSION,
  CM0650_CM0595_EXECUTION_EVIDENCE_TEMPLATE_REF,
  ALLOWED_CM0595_EXECUTION_EVIDENCE_DECISIONS,
  normalizeCm0595ExecutionEvidenceRecord,
  parseCm0595ExecutionEvidenceRecordMarkdown,
  loadCm0595ExecutionEvidenceRecordFile,
  validateCm0595ExecutionEvidenceRecord,
  buildCm0595ExecutionEvidenceInputTrace
};
