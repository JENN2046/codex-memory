const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');
const fs = require('node:fs');
const path = require('node:path');

const EXPECTED_ASSERTION_RECORD_SCHEMA_VERSION = 'cm61-external-token-assertion-record-v1';
const EXPECTED_UNIT = 'CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_001';
const CM0611_ASSERTION_RECORD_TEMPLATE_REF =
  'docs/CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md';
const ACCEPTED_DECISION = 'EXTERNAL_TOKEN_ASSERTION_ACCEPTED_FOR_C6_REVIEW';
const ACCEPTED_CONTRACT_VERDICT = 'accepted';
const ALLOWED_DECISIONS = Object.freeze([
  'EXTERNAL_TOKEN_ASSERTION_ACCEPTED_FOR_C6_REVIEW',
  'EXTERNAL_TOKEN_ASSERTION_REJECTED_FAIL_CLOSED',
  'EXTERNAL_TOKEN_ASSERTION_INSUFFICIENT_EVIDENCE'
]);
const ALLOWED_CONTRACT_VERDICTS = Object.freeze([
  'accepted',
  'rejected',
  'insufficient'
]);
const ALLOWED_LATEST_REBOUND_OUTCOME_CLASSES = Object.freeze([
  '',
  'token_missing',
  'stale_for_current_token_state',
  'token_present'
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

function normalizeAssertionRecord(record = {}) {
  const safeRecord = isPlainObject(record) ? record : {};

  return {
    schemaVersion: normalizeString(safeRecord.schemaVersion),
    unit: normalizeString(safeRecord.unit),
    decision: normalizeString(safeRecord.decision),
    contractVerdict: normalizeString(safeRecord.contractVerdict),
    assertionClass: normalizeString(safeRecord.assertionClass),
    assertedCurrentSessionOnly: normalizeBoolean(safeRecord.assertedCurrentSessionOnly),
    assertedIndependentOfPacket: normalizeBoolean(safeRecord.assertedIndependentOfPacket),
    assertedNoBindingRequested: normalizeBoolean(safeRecord.assertedNoBindingRequested),
    assertedNoPersistenceRequested: normalizeBoolean(safeRecord.assertedNoPersistenceRequested),
    assertedScopeStillCm0601Only: normalizeBoolean(safeRecord.assertedScopeStillCm0601Only),
    assertedNoStartupHealthWriteRecallRequested: normalizeBoolean(
      safeRecord.assertedNoStartupHealthWriteRecallRequested
    ),
    assertedAt: normalizeString(safeRecord.assertedAt)
  };
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

function parseAssertionRecordMarkdown(markdown = '', options = {}) {
  const text = typeof markdown === 'string' ? markdown : '';
  const lines = text.split(/\r?\n/);
  const fieldMap = new Map();

  for (const line of lines) {
    const match = /^([A-Za-z][A-Za-z0-9\- ]*?):\s*(.*)$/.exec(line.trim());
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
    schemaVersion: EXPECTED_ASSERTION_RECORD_SCHEMA_VERSION,
    unit: EXPECTED_UNIT,
    decision: normalizeMarkdownFieldValue(fieldMap.get('decision')),
    contractVerdict: normalizeMarkdownFieldValue(fieldMap.get('contract verdict')),
    assertionClass: normalizeMarkdownFieldValue(fieldMap.get('assertionclass')),
    assertedCurrentSessionOnly: normalizeMarkdownBoolean(fieldMap.get('assertedcurrentsessiononly')),
    assertedIndependentOfPacket: normalizeMarkdownBoolean(fieldMap.get('assertedindependentofpacket')),
    assertedNoBindingRequested: normalizeMarkdownBoolean(fieldMap.get('assertednobindingrequested')),
    assertedNoPersistenceRequested: normalizeMarkdownBoolean(fieldMap.get('assertednopersistencerequested')),
    assertedScopeStillCm0601Only: normalizeMarkdownBoolean(fieldMap.get('assertedscopestillcm0601only')),
    assertedNoStartupHealthWriteRecallRequested: normalizeMarkdownBoolean(
      fieldMap.get('assertednostartuphealthwriterecallrequested')
    ),
    assertedAt: normalizeMarkdownFieldValue(fieldMap.get('assertedat')),
    _sourceFormat: 'cm0611_markdown_record_v1',
    _sourcePath: typeof options.sourcePath === 'string' ? redactSensitiveFragments(options.sourcePath) : ''
  };
}

function loadAssertionRecordFile(assertionRecordPath = '') {
  const resolvedPath = path.resolve(assertionRecordPath || '');
  const raw = fs.readFileSync(resolvedPath, 'utf8');
  const extension = path.extname(resolvedPath).toLowerCase();

  if (extension === '.md') {
    return {
      sourceFormat: 'cm0611_markdown_record_v1',
      rawSourcePath: resolvedPath,
      sourcePath: redactSensitiveFragments(resolvedPath),
      sourceFileName: path.basename(resolvedPath),
      record: parseAssertionRecordMarkdown(raw, { sourcePath: resolvedPath })
    };
  }

  return {
    sourceFormat: 'json_assertion_record_v1',
    rawSourcePath: resolvedPath,
    sourcePath: redactSensitiveFragments(resolvedPath),
    sourceFileName: path.basename(resolvedPath),
    record: JSON.parse(raw)
  };
}

function buildAssertionRecordInputTrace({
  loadResult = null,
  normalizedAssertionRecord = null,
  assertionAcceptedForC6 = false,
  latestReboundOutcomeClass = ''
} = {}) {
  const sourcePath = normalizeString(
    loadResult?.sourcePath
      || normalizedAssertionRecord?._sourcePath
      || ''
  );
  const sourceFormat = normalizeString(
    loadResult?.sourceFormat
      || normalizedAssertionRecord?._sourceFormat
      || ''
  );
  const reboundOverride = normalizeString(latestReboundOutcomeClass);
  const sourceFileName = normalizeString(loadResult?.sourceFileName || '')
    || (sourcePath ? path.basename(sourcePath) : '');
  const isMarkdownRecord = sourceFormat === 'cm0611_markdown_record_v1';
  const sourceWorkspaceRelativePath = buildWorkspaceRelativePath(
    loadResult?.rawSourcePath
      || normalizedAssertionRecord?._sourcePath
      || ''
  );

  return {
    traceAvailable: true,
    sourceFormat: sourceFormat || 'unknown_assertion_record_source',
    sourcePath: sourcePath || '',
    sourceFileName: sourceFileName || '',
    sourceWorkspaceRelativePath,
    sourceArtifactRef: isMarkdownRecord ? CM0611_ASSERTION_RECORD_TEMPLATE_REF : '',
    sourceMode: 'explicit_assertion_record_input',
    unit: normalizeString(normalizedAssertionRecord?.unit || ''),
    decision: normalizeString(normalizedAssertionRecord?.decision || ''),
    contractVerdict: normalizeString(normalizedAssertionRecord?.contractVerdict || ''),
    assertionClass: normalizeString(normalizedAssertionRecord?.assertionClass || ''),
    assertedAt: normalizeString(normalizedAssertionRecord?.assertedAt || ''),
    assertionAcceptedForC6: assertionAcceptedForC6 === true,
    usedLatestReboundOutcomeOverride: Boolean(reboundOverride),
    latestReboundOutcomeOverride: reboundOverride || ''
  };
}

function validateAssertionRecord(record = {}) {
  const normalized = normalizeAssertionRecord(record);
  const failClosedReasons = [];

  if (!isPlainObject(record)) {
    failClosedReasons.push('malformed_assertion_record');
  }
  if (normalized.schemaVersion !== EXPECTED_ASSERTION_RECORD_SCHEMA_VERSION) {
    failClosedReasons.push('assertion_record_schema_version_mismatch');
  }
  if (normalized.unit !== EXPECTED_UNIT) {
    failClosedReasons.push('assertion_record_unit_mismatch');
  }
  if (!ALLOWED_DECISIONS.includes(normalized.decision)) {
    failClosedReasons.push('unsupported_assertion_record_decision');
  }
  if (!ALLOWED_CONTRACT_VERDICTS.includes(normalized.contractVerdict)) {
    failClosedReasons.push('unsupported_assertion_record_contract_verdict');
  }
  if (!normalized.assertedAt) {
    failClosedReasons.push('missing_assertion_timestamp');
  }

  return {
    normalized,
    valid: failClosedReasons.length === 0,
    failClosedReasons
  };
}

function applyAssertionRecordToPreflightInput(preflightInput = {}, assertionRecord = {}, options = {}) {
  const validation = validateAssertionRecord(assertionRecord);
  if (validation.valid !== true) {
    return {
      ok: false,
      failClosedReasons: validation.failClosedReasons,
      normalizedAssertionRecord: validation.normalized
    };
  }

  const reboundOutcomeClass = normalizeString(options.latestReboundOutcomeClass);
  if (!ALLOWED_LATEST_REBOUND_OUTCOME_CLASSES.includes(reboundOutcomeClass)) {
    return {
      ok: false,
      failClosedReasons: ['unsupported_latest_rebound_outcome_override'],
      normalizedAssertionRecord: validation.normalized
    };
  }

  const record = validation.normalized;
  const asserted =
    record.decision === ACCEPTED_DECISION &&
    record.contractVerdict === ACCEPTED_CONTRACT_VERDICT &&
    record.assertedNoStartupHealthWriteRecallRequested === true;

  const mergedInput = {
    ...preflightInput,
    externalAssertion: {
      asserted,
      assertionClass: record.assertionClass,
      assertedCurrentSessionOnly: record.assertedCurrentSessionOnly,
      assertedIndependentOfPacket: record.assertedIndependentOfPacket,
      assertedNoBindingRequested: record.assertedNoBindingRequested,
      assertedNoPersistenceRequested: record.assertedNoPersistenceRequested,
      assertedScopeStillCm0601Only: record.assertedScopeStillCm0601Only,
      assertedNoStartupHealthWriteRecallRequested:
        record.assertedNoStartupHealthWriteRecallRequested,
      assertedAt: record.assertedAt
    }
  };

  if (reboundOutcomeClass) {
    mergedInput.latestReboundOutcomeClass = reboundOutcomeClass;
  }

  return {
    ok: true,
    mergedInput,
    normalizedAssertionRecord: record,
    assertionAcceptedForC6: asserted
  };
}

module.exports = {
  ACCEPTED_CONTRACT_VERDICT,
  ACCEPTED_DECISION,
  ALLOWED_CONTRACT_VERDICTS,
  ALLOWED_DECISIONS,
  ALLOWED_LATEST_REBOUND_OUTCOME_CLASSES,
  CM0611_ASSERTION_RECORD_TEMPLATE_REF,
  EXPECTED_ASSERTION_RECORD_SCHEMA_VERSION,
  EXPECTED_UNIT,
  applyAssertionRecordToPreflightInput,
  buildAssertionRecordInputTrace,
  loadAssertionRecordFile,
  normalizeAssertionRecord,
  parseAssertionRecordMarkdown,
  validateAssertionRecord
};
