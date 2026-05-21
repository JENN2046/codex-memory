const fs = require('node:fs');
const path = require('node:path');
const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');
const {
  CM0616_WIDENING_REVIEW_OUTCOME_TEMPLATE_REF,
  EXPECTED_TARGET_BASELINE
} = require('./AuthorizedWritePathAutoAuthorizationPreflight');

const EXPECTED_WIDENING_REVIEW_RECORD_SCHEMA_VERSION = 'cm616-widening-review-outcome-record-v1';
const CM0616_ALLOWED_DECISION_VALUES = Object.freeze([
  'WIDENING_REVIEW_NOT_READY',
  'WIDENING_REVIEW_PASSED_ADOPTION_NOT_GRANTED',
  'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607',
  'WIDENING_REVIEW_ABORTED_DRIFT'
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

function normalizeWideningReviewOutcomeRecord(record = {}) {
  const safeRecord = isPlainObject(record) ? record : {};

  return {
    schemaVersion: normalizeString(safeRecord.schemaVersion),
    decision: normalizeString(safeRecord.decision),
    targetBaseline: normalizeString(safeRecord.targetBaseline),
    reviewSource: normalizeString(safeRecord.reviewSource),
    routingOutcomeRecord: normalizeString(safeRecord.routingOutcomeRecord),
    cm0604Satisfied: normalizeBoolean(safeRecord.cm0604Satisfied),
    cm0606BridgeActivated: normalizeBoolean(safeRecord.cm0606BridgeActivated),
    proceedToCm0607AdoptionRecord: normalizeBoolean(safeRecord.proceedToCm0607AdoptionRecord),
    nextBoundary: normalizeString(safeRecord.nextBoundary),
    outOfScopeActionsExecuted: normalizeString(safeRecord.outOfScopeActionsExecuted),
    status: normalizeString(safeRecord.status),
    date: normalizeString(safeRecord.date),
    _sourceFormat: normalizeString(safeRecord._sourceFormat),
    _sourcePath: normalizeString(safeRecord._sourcePath)
  };
}

function parseWideningReviewOutcomeRecordMarkdown(markdown = '', options = {}) {
  const text = typeof markdown === 'string' ? markdown : '';
  const lines = text.split(/\r?\n/);
  const fieldMap = new Map();

  for (const line of lines) {
    const match = /^([A-Za-z0-9][A-Za-z0-9\- ]*?):\s*(.*)$/.exec(line.trim());
    if (!match) {
      continue;
    }
    const key = match[1].trim().toLowerCase();
    if (!fieldMap.has(key)) {
      fieldMap.set(key, match[2]);
    }
  }

  return {
    schemaVersion: EXPECTED_WIDENING_REVIEW_RECORD_SCHEMA_VERSION,
    decision: normalizeMarkdownFieldValue(fieldMap.get('decision')),
    targetBaseline: normalizeMarkdownFieldValue(fieldMap.get('target baseline')),
    reviewSource: normalizeMarkdownFieldValue(fieldMap.get('review source')),
    routingOutcomeRecord: normalizeMarkdownFieldValue(fieldMap.get('routing outcome record')),
    cm0604Satisfied: normalizeMarkdownBoolean(fieldMap.get('cm-0604 satisfied')),
    cm0606BridgeActivated: normalizeMarkdownBoolean(fieldMap.get('cm-0606 bridge activated')),
    proceedToCm0607AdoptionRecord: normalizeMarkdownBoolean(fieldMap.get('proceed to cm-0607 adoption record')),
    nextBoundary: normalizeMarkdownFieldValue(fieldMap.get('next boundary')),
    outOfScopeActionsExecuted: normalizeMarkdownFieldValue(fieldMap.get('out-of-scope actions executed')),
    status: normalizeMarkdownFieldValue(fieldMap.get('status')),
    date: normalizeMarkdownFieldValue(fieldMap.get('date')),
    _sourceFormat: 'cm0616_markdown_record_v1',
    _sourcePath: typeof options.sourcePath === 'string' ? redactSensitiveFragments(options.sourcePath) : ''
  };
}

function loadWideningReviewOutcomeRecordFile(wideningReviewRecordPath = '') {
  const resolvedPath = path.resolve(wideningReviewRecordPath || '');
  const raw = fs.readFileSync(resolvedPath, 'utf8');
  const extension = path.extname(resolvedPath).toLowerCase();

  if (extension === '.md') {
    return {
      sourceFormat: 'cm0616_markdown_record_v1',
      rawSourcePath: resolvedPath,
      sourcePath: redactSensitiveFragments(resolvedPath),
      sourceFileName: path.basename(resolvedPath),
      record: parseWideningReviewOutcomeRecordMarkdown(raw, { sourcePath: resolvedPath })
    };
  }

  return {
    sourceFormat: 'json_widening_review_record_v1',
    rawSourcePath: resolvedPath,
    sourcePath: redactSensitiveFragments(resolvedPath),
    sourceFileName: path.basename(resolvedPath),
    record: JSON.parse(raw)
  };
}

function validateWideningReviewOutcomeRecord(record = {}) {
  const normalized = normalizeWideningReviewOutcomeRecord(record);
  const failClosedReasons = [];

  if (!isPlainObject(record)) {
    failClosedReasons.push('malformed_widening_review_record');
  }
  if (normalized.schemaVersion !== EXPECTED_WIDENING_REVIEW_RECORD_SCHEMA_VERSION) {
    failClosedReasons.push('widening_review_record_schema_version_mismatch');
  }
  if (!CM0616_ALLOWED_DECISION_VALUES.includes(normalized.decision)) {
    failClosedReasons.push('unsupported_widening_review_decision');
  }
  if (!normalized.targetBaseline) {
    failClosedReasons.push('missing_widening_review_target_baseline');
  }
  if (!normalized.nextBoundary) {
    failClosedReasons.push('missing_widening_review_next_boundary');
  }
  if (!normalized.routingOutcomeRecord) {
    failClosedReasons.push('missing_widening_review_routing_outcome_record');
  }

  return {
    normalized,
    valid: failClosedReasons.length === 0,
    failClosedReasons
  };
}

function buildWideningReviewRecordInputTrace({
  loadResult = null,
  normalizedWideningReviewRecord = null
} = {}) {
  const sourcePath = normalizeString(
    loadResult?.sourcePath
      || normalizedWideningReviewRecord?._sourcePath
      || ''
  );
  const sourceFormat = normalizeString(
    loadResult?.sourceFormat
      || normalizedWideningReviewRecord?._sourceFormat
      || ''
  );
  const sourceFileName = normalizeString(loadResult?.sourceFileName || '')
    || (sourcePath ? path.basename(sourcePath) : '');
  const sourceWorkspaceRelativePath = buildWorkspaceRelativePath(
    loadResult?.rawSourcePath
      || normalizedWideningReviewRecord?._sourcePath
      || ''
  );

  return {
    traceAvailable: true,
    sourceFormat: sourceFormat || 'unknown_widening_review_record_source',
    sourcePath: sourcePath || '',
    sourceFileName: sourceFileName || '',
    sourceWorkspaceRelativePath,
    sourceArtifactRef: CM0616_WIDENING_REVIEW_OUTCOME_TEMPLATE_REF,
    sourceMode: 'explicit_widening_review_record_input',
    decision: normalizeString(normalizedWideningReviewRecord?.decision || ''),
    targetBaseline: normalizeString(normalizedWideningReviewRecord?.targetBaseline || ''),
    routingOutcomeRecord: normalizeString(normalizedWideningReviewRecord?.routingOutcomeRecord || ''),
    cm0604Satisfied: normalizedWideningReviewRecord?.cm0604Satisfied === true,
    cm0606BridgeActivated: normalizedWideningReviewRecord?.cm0606BridgeActivated === true,
    proceedToCm0607AdoptionRecord: normalizedWideningReviewRecord?.proceedToCm0607AdoptionRecord === true
  };
}

function applyWideningReviewOutcomeRecordToAdoptionInput(adoptionInput = {}, wideningReviewRecord = {}) {
  const validation = validateWideningReviewOutcomeRecord(wideningReviewRecord);
  if (validation.valid !== true) {
    return {
      ok: false,
      failClosedReasons: validation.failClosedReasons,
      normalizedWideningReviewRecord: validation.normalized
    };
  }

  const record = validation.normalized;
  const wideningReviewRecordId = buildWorkspaceRelativePath(record._sourcePath || '')
    || record._sourcePath
    || CM0616_WIDENING_REVIEW_OUTCOME_TEMPLATE_REF;
  const targetBaseline = record.targetBaseline || adoptionInput.targetBaseline || EXPECTED_TARGET_BASELINE;
  const isAbortDrift = record.decision === 'WIDENING_REVIEW_ABORTED_DRIFT';

  return {
    ok: true,
    mergedInput: {
      ...adoptionInput,
      targetBaseline,
      reboundBaselineRecorded: Boolean(record.targetBaseline) && targetBaseline !== EXPECTED_TARGET_BASELINE,
      wideningReviewRecordAvailable: true,
      wideningReviewDecision: record.decision,
      wideningReviewRecordId,
      cm0604SatisfiedByWideningReview: record.cm0604Satisfied === true,
      cm0606BridgeActivatedByWideningReview: record.cm0606BridgeActivated === true,
      proceedToCm0607FromWideningReview: record.proceedToCm0607AdoptionRecord === true,
      packetFamilyDriftDetected: isAbortDrift === true
        ? true
        : adoptionInput.packetFamilyDriftDetected === true
    },
    normalizedWideningReviewRecord: record
  };
}

module.exports = {
  CM0616_ALLOWED_DECISION_VALUES,
  EXPECTED_WIDENING_REVIEW_RECORD_SCHEMA_VERSION,
  applyWideningReviewOutcomeRecordToAdoptionInput,
  buildWideningReviewRecordInputTrace,
  loadWideningReviewOutcomeRecordFile,
  normalizeWideningReviewOutcomeRecord,
  parseWideningReviewOutcomeRecordMarkdown,
  validateWideningReviewOutcomeRecord
};
