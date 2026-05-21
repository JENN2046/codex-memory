const fs = require('node:fs');
const path = require('node:path');
const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');
const {
  CM0615_ROUTING_OUTCOME_TEMPLATE_REF,
  EXPECTED_TARGET_BASELINE
} = require('./AuthorizedWritePathAutoAuthorizationPreflight');

const EXPECTED_ROUTING_OUTCOME_RECORD_SCHEMA_VERSION = 'cm615-routing-outcome-record-v1';
const CM0615_ALLOWED_DECISION_VALUES = Object.freeze([
  'CM0605_ROUTED_NO_AUTO_APPROVAL_ISSUED',
  'CM0605_ROUTED_AUTO_REUSE_CM0601_LINE_ONLY',
  'CM0605_ROUTED_ESCALATE_FOR_FUTURE_WIDENING_REVIEW',
  'CM0605_ROUTING_ABORTED_DRIFT'
]);
const ALLOWED_ROUTING_OUTCOME_VALUES = Object.freeze([
  'NO_AUTO_APPROVAL_ISSUED',
  'AUTO_REUSE_CM0601_LINE_ONLY',
  'ESCALATE_FOR_FUTURE_WIDENING_REVIEW',
  'ROUTING_ABORTED_DRIFT'
]);

const DECISION_TO_ROUTING_OUTCOME = Object.freeze({
  CM0605_ROUTED_NO_AUTO_APPROVAL_ISSUED: 'NO_AUTO_APPROVAL_ISSUED',
  CM0605_ROUTED_AUTO_REUSE_CM0601_LINE_ONLY: 'AUTO_REUSE_CM0601_LINE_ONLY',
  CM0605_ROUTED_ESCALATE_FOR_FUTURE_WIDENING_REVIEW: 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW',
  CM0605_ROUTING_ABORTED_DRIFT: 'ROUTING_ABORTED_DRIFT'
});

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

function normalizeRoutingOutcomeRecord(record = {}) {
  const safeRecord = isPlainObject(record) ? record : {};

  return {
    schemaVersion: normalizeString(safeRecord.schemaVersion),
    decision: normalizeString(safeRecord.decision),
    targetBaseline: normalizeString(safeRecord.targetBaseline),
    routingSource: normalizeString(safeRecord.routingSource),
    routingCase: normalizeString(safeRecord.routingCase),
    routingOutcome: normalizeString(safeRecord.routingOutcome),
    preRoutingEvidence: normalizeString(safeRecord.preRoutingEvidence),
    tokenPresenceResult: normalizeString(safeRecord.tokenPresenceResult),
    wideningGateSatisfied: normalizeBoolean(safeRecord.wideningGateSatisfied),
    wideningAdopted: normalizeBoolean(safeRecord.wideningAdopted),
    nextBoundary: normalizeString(safeRecord.nextBoundary),
    outOfScopeActionsExecuted: normalizeString(safeRecord.outOfScopeActionsExecuted),
    status: normalizeString(safeRecord.status),
    date: normalizeString(safeRecord.date),
    _sourceFormat: normalizeString(safeRecord._sourceFormat),
    _sourcePath: normalizeString(safeRecord._sourcePath)
  };
}

function parseRoutingOutcomeRecordMarkdown(markdown = '', options = {}) {
  const text = typeof markdown === 'string' ? markdown : '';
  const lines = text.split(/\r?\n/);
  const fieldMap = new Map();

  for (const line of lines) {
    const match = /^([A-Za-z0-9][A-Za-z0-9\- ]*?):\s*(.*)$/.exec(line.trim());
    if (!match) {
      continue;
    }
    const key = match[1].trim().toLowerCase();
    const value = match[2];
    if (!fieldMap.has(key)) {
      fieldMap.set(key, value);
    }
  }

  return {
    schemaVersion: EXPECTED_ROUTING_OUTCOME_RECORD_SCHEMA_VERSION,
    decision: normalizeMarkdownFieldValue(fieldMap.get('decision')),
    targetBaseline: normalizeMarkdownFieldValue(fieldMap.get('target baseline')),
    routingSource: normalizeMarkdownFieldValue(fieldMap.get('routing source')),
    routingCase: normalizeMarkdownFieldValue(fieldMap.get('routing case')),
    routingOutcome: normalizeMarkdownFieldValue(fieldMap.get('routing outcome')),
    preRoutingEvidence: normalizeMarkdownFieldValue(fieldMap.get('pre-routing evidence')),
    tokenPresenceResult: normalizeMarkdownFieldValue(fieldMap.get('token presence result')),
    wideningGateSatisfied: normalizeMarkdownBoolean(fieldMap.get('widening gate satisfied')),
    wideningAdopted: normalizeMarkdownBoolean(fieldMap.get('widening adopted')),
    nextBoundary: normalizeMarkdownFieldValue(fieldMap.get('next boundary')),
    outOfScopeActionsExecuted: normalizeMarkdownFieldValue(fieldMap.get('out-of-scope actions executed')),
    status: normalizeMarkdownFieldValue(fieldMap.get('status')),
    date: normalizeMarkdownFieldValue(fieldMap.get('date')),
    _sourceFormat: 'cm0615_markdown_record_v1',
    _sourcePath: typeof options.sourcePath === 'string' ? redactSensitiveFragments(options.sourcePath) : ''
  };
}

function loadRoutingOutcomeRecordFile(routingOutcomeRecordPath = '') {
  const resolvedPath = path.resolve(routingOutcomeRecordPath || '');
  const raw = fs.readFileSync(resolvedPath, 'utf8');
  const extension = path.extname(resolvedPath).toLowerCase();

  if (extension === '.md') {
    return {
      sourceFormat: 'cm0615_markdown_record_v1',
      rawSourcePath: resolvedPath,
      sourcePath: redactSensitiveFragments(resolvedPath),
      sourceFileName: path.basename(resolvedPath),
      record: parseRoutingOutcomeRecordMarkdown(raw, { sourcePath: resolvedPath })
    };
  }

  return {
    sourceFormat: 'json_routing_outcome_record_v1',
    rawSourcePath: resolvedPath,
    sourcePath: redactSensitiveFragments(resolvedPath),
    sourceFileName: path.basename(resolvedPath),
    record: JSON.parse(raw)
  };
}

function validateRoutingOutcomeRecord(record = {}) {
  const normalized = normalizeRoutingOutcomeRecord(record);
  const failClosedReasons = [];

  if (!isPlainObject(record)) {
    failClosedReasons.push('malformed_routing_outcome_record');
  }
  if (normalized.schemaVersion !== EXPECTED_ROUTING_OUTCOME_RECORD_SCHEMA_VERSION) {
    failClosedReasons.push('routing_outcome_record_schema_version_mismatch');
  }
  if (!CM0615_ALLOWED_DECISION_VALUES.includes(normalized.decision)) {
    failClosedReasons.push('unsupported_routing_outcome_record_decision');
  }
  if (!normalized.targetBaseline) {
    failClosedReasons.push('missing_routing_target_baseline');
  }
  if (!ALLOWED_ROUTING_OUTCOME_VALUES.includes(normalized.routingOutcome)) {
    failClosedReasons.push('unsupported_routing_outcome_value');
  }
  if (normalized.decision && normalized.routingOutcome) {
    const expectedRoutingOutcome = DECISION_TO_ROUTING_OUTCOME[normalized.decision] || '';
    if (expectedRoutingOutcome && expectedRoutingOutcome !== normalized.routingOutcome) {
      failClosedReasons.push('routing_decision_outcome_mismatch');
    }
  }
  if (!normalized.nextBoundary) {
    failClosedReasons.push('missing_routing_next_boundary');
  }

  return {
    normalized,
    valid: failClosedReasons.length === 0,
    failClosedReasons
  };
}

function buildRoutingOutcomeRecordInputTrace({
  loadResult = null,
  normalizedRoutingOutcomeRecord = null
} = {}) {
  const sourcePath = normalizeString(
    loadResult?.sourcePath
      || normalizedRoutingOutcomeRecord?._sourcePath
      || ''
  );
  const sourceFormat = normalizeString(
    loadResult?.sourceFormat
      || normalizedRoutingOutcomeRecord?._sourceFormat
      || ''
  );
  const sourceFileName = normalizeString(loadResult?.sourceFileName || '')
    || (sourcePath ? path.basename(sourcePath) : '');
  const sourceWorkspaceRelativePath = buildWorkspaceRelativePath(
    loadResult?.rawSourcePath
      || normalizedRoutingOutcomeRecord?._sourcePath
      || ''
  );
  const sourceArtifactRef = sourceFormat === 'cm0615_markdown_record_v1'
    ? CM0615_ROUTING_OUTCOME_TEMPLATE_REF
    : '';

  return {
    traceAvailable: true,
    sourceFormat: sourceFormat || 'unknown_routing_outcome_record_source',
    sourcePath: sourcePath || '',
    sourceFileName: sourceFileName || '',
    sourceWorkspaceRelativePath,
    sourceArtifactRef,
    sourceMode: 'explicit_routing_outcome_record_input',
    decision: normalizeString(normalizedRoutingOutcomeRecord?.decision || ''),
    routingOutcome: normalizeString(normalizedRoutingOutcomeRecord?.routingOutcome || ''),
    targetBaseline: normalizeString(normalizedRoutingOutcomeRecord?.targetBaseline || ''),
    tokenPresenceResult: normalizeString(normalizedRoutingOutcomeRecord?.tokenPresenceResult || ''),
    wideningGateSatisfied: normalizedRoutingOutcomeRecord?.wideningGateSatisfied === true,
    wideningAdopted: normalizedRoutingOutcomeRecord?.wideningAdopted === true
  };
}

function applyRoutingOutcomeRecordToWideningReviewInput(wideningReviewInput = {}, routingOutcomeRecord = {}) {
  const validation = validateRoutingOutcomeRecord(routingOutcomeRecord);
  if (validation.valid !== true) {
    return {
      ok: false,
      failClosedReasons: validation.failClosedReasons,
      normalizedRoutingOutcomeRecord: validation.normalized
    };
  }

  const record = validation.normalized;
  const routingOutcomeRecordId = buildWorkspaceRelativePath(record._sourcePath || '')
    || record._sourcePath
    || CM0615_ROUTING_OUTCOME_TEMPLATE_REF;
  const targetBaseline = record.targetBaseline || wideningReviewInput.targetBaseline || EXPECTED_TARGET_BASELINE;
  const isAbortDrift = record.decision === 'CM0605_ROUTING_ABORTED_DRIFT'
    || record.routingOutcome === 'ROUTING_ABORTED_DRIFT';

  return {
    ok: true,
    mergedInput: {
      ...wideningReviewInput,
      targetBaseline,
      reboundBaselineRecorded: Boolean(record.targetBaseline) && targetBaseline !== EXPECTED_TARGET_BASELINE,
      routingOutcomeRecordAvailable: true,
      routingOutcomeDecision: record.decision,
      routingOutcomeRecordId,
      packetFamilyDriftDetected: isAbortDrift === true
        ? true
        : wideningReviewInput.packetFamilyDriftDetected === true
    },
    normalizedRoutingOutcomeRecord: record
  };
}

module.exports = {
  ALLOWED_ROUTING_OUTCOME_VALUES,
  DECISION_TO_ROUTING_OUTCOME,
  EXPECTED_ROUTING_OUTCOME_RECORD_SCHEMA_VERSION,
  applyRoutingOutcomeRecordToWideningReviewInput,
  buildRoutingOutcomeRecordInputTrace,
  loadRoutingOutcomeRecordFile,
  normalizeRoutingOutcomeRecord,
  parseRoutingOutcomeRecordMarkdown,
  validateRoutingOutcomeRecord
};
