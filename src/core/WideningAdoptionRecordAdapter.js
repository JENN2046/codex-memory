const fs = require('node:fs');
const path = require('node:path');
const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');
const {
  CM0607_WIDENING_ADOPTION_RECORD_TEMPLATE_REF
} = require('./AuthorizedWritePathAutoAuthorizationPreflight');

const EXPECTED_WIDENING_ADOPTION_RECORD_SCHEMA_VERSION =
  'cm607-widening-adoption-record-v1';

const ALLOWED_WIDENING_ADOPTION_DECISIONS = Object.freeze([
  'WIDENING_ADOPTION_GRANTED',
  'WIDENING_ADOPTION_DENIED'
]);

const ALLOWED_ROUTING_OUTCOME_VALUES = Object.freeze([
  'ESCALATE_FOR_FUTURE_WIDENING_REVIEW',
  'AUTO_REUSE_CM0601_LINE_ONLY',
  'NO_AUTO_APPROVAL_ISSUED',
  'ROUTING_ABORTED_DRIFT'
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

function normalizeWideningAdoptionRecord(record = {}) {
  const safeRecord = isPlainObject(record) ? record : {};

  return {
    schemaVersion: normalizeString(safeRecord.schemaVersion),
    decision: normalizeString(safeRecord.decision),
    mapAuthority: normalizeString(safeRecord.mapAuthority),
    controllingState: normalizeString(safeRecord.controllingState),
    sameBaselineEndpointStartupEvidenceDoc: normalizeString(safeRecord.sameBaselineEndpointStartupEvidenceDoc),
    sameBaselineEndpointStartupEvidenceResult: normalizeString(safeRecord.sameBaselineEndpointStartupEvidenceResult),
    sameBaselineTokenPresenceEvidenceDoc: normalizeString(safeRecord.sameBaselineTokenPresenceEvidenceDoc),
    sameBaselineTokenPresenceEvidenceResult: normalizeString(safeRecord.sameBaselineTokenPresenceEvidenceResult),
    cm0604Satisfied: normalizeBoolean(safeRecord.cm0604Satisfied),
    cm0605RoutedOutcome: normalizeString(safeRecord.cm0605RoutedOutcome),
    writeUnitStillNarrowestNextProof: normalizeBoolean(safeRecord.writeUnitStillNarrowestNextProof),
    futureAutoAuthorizationWideningAdopted: normalizeBoolean(safeRecord.futureAutoAuthorizationWideningAdopted),
    scopeStillLimitedToCm0595: normalizeBoolean(safeRecord.scopeStillLimitedToCm0595),
    forbiddenActionsStillForbidden: normalizeBoolean(safeRecord.forbiddenActionsStillForbidden),
    resultingAllowance: normalizeString(safeRecord.resultingAllowance),
    status: normalizeString(safeRecord.status),
    date: normalizeString(safeRecord.date),
    _sourceFormat: normalizeString(safeRecord._sourceFormat),
    _sourcePath: normalizeString(safeRecord._sourcePath)
  };
}

function parseWideningAdoptionRecordMarkdown(markdown = '', options = {}) {
  const text = typeof markdown === 'string' ? markdown : '';
  const lines = text.split(/\r?\n/);
  const fieldMap = new Map();
  const sectionBullets = new Map();
  let currentSection = '';

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const headerMatch = /^([A-Za-z0-9][A-Za-z0-9\-\/() ]*?):\s*(.*)$/.exec(trimmed);
    if (headerMatch && !trimmed.startsWith('- ')) {
      currentSection = headerMatch[1].trim().toLowerCase();
      if (!fieldMap.has(currentSection)) {
        fieldMap.set(currentSection, headerMatch[2]);
      }
      if (!sectionBullets.has(currentSection)) {
        sectionBullets.set(currentSection, []);
      }
      continue;
    }

    if (currentSection && trimmed.startsWith('- ')) {
      const bullet = trimmed.slice(2).trim();
      const bullets = sectionBullets.get(currentSection) || [];
      bullets.push(bullet);
      sectionBullets.set(currentSection, bullets);
    }
  }

  const getSectionBullets = section => sectionBullets.get(section) || [];
  const getFirstSectionBulletValue = section => {
    const first = getSectionBullets(section)[0] || '';
    return normalizeMarkdownFieldValue(first.replace(/^([A-Za-z0-9\-\/() ]+?):\s*/, ''));
  };
  const getNamedBulletValue = (section, name) => {
    const prefix = `${name.toLowerCase()}:`;
    const bullet = getSectionBullets(section)
      .find(value => value.toLowerCase().startsWith(prefix));
    return normalizeMarkdownFieldValue(bullet ? bullet.slice(prefix.length) : '');
  };

  const sameBaselineEndpointStartupEvidenceDoc = getNamedBulletValue(
    'same-baseline endpoint/startup evidence',
    'doc'
  );
  const sameBaselineEndpointStartupEvidenceResult = getNamedBulletValue(
    'same-baseline endpoint/startup evidence',
    'result'
  );
  const sameBaselineTokenPresenceEvidenceDoc = getNamedBulletValue(
    'same-baseline token-presence evidence',
    'doc'
  );
  const sameBaselineTokenPresenceEvidenceResult = getNamedBulletValue(
    'same-baseline token-presence evidence',
    'result'
  );

  return {
    schemaVersion: EXPECTED_WIDENING_ADOPTION_RECORD_SCHEMA_VERSION,
    decision: normalizeMarkdownFieldValue(fieldMap.get('decision')),
    mapAuthority: normalizeMarkdownFieldValue(fieldMap.get('map authority')),
    controllingState: normalizeMarkdownFieldValue(fieldMap.get('controlling state')),
    sameBaselineEndpointStartupEvidenceDoc,
    sameBaselineEndpointStartupEvidenceResult,
    sameBaselineTokenPresenceEvidenceDoc,
    sameBaselineTokenPresenceEvidenceResult,
    cm0604Satisfied: normalizeMarkdownBoolean(getFirstSectionBulletValue('cm-0604 satisfied')),
    cm0605RoutedOutcome: getFirstSectionBulletValue('cm-0605 routed outcome'),
    writeUnitStillNarrowestNextProof: normalizeMarkdownBoolean(getFirstSectionBulletValue('write unit still narrowest next proof')),
    futureAutoAuthorizationWideningAdopted: normalizeMarkdownBoolean(getFirstSectionBulletValue('future auto-authorization widening adopted')),
    scopeStillLimitedToCm0595: normalizeMarkdownBoolean(getFirstSectionBulletValue('scope still limited to cm-0595')),
    forbiddenActionsStillForbidden: normalizeMarkdownBoolean(getFirstSectionBulletValue('forbidden actions still forbidden')),
    resultingAllowance: getFirstSectionBulletValue('resulting allowance'),
    status: normalizeMarkdownFieldValue(fieldMap.get('status')),
    date: normalizeMarkdownFieldValue(fieldMap.get('date')),
    _sourceFormat: 'cm0607_markdown_record_v1',
    _sourcePath: typeof options.sourcePath === 'string' ? redactSensitiveFragments(options.sourcePath) : ''
  };
}

function loadWideningAdoptionRecordFile(wideningAdoptionRecordPath = '') {
  const resolvedPath = path.resolve(wideningAdoptionRecordPath || '');
  const raw = fs.readFileSync(resolvedPath, 'utf8');
  const extension = path.extname(resolvedPath).toLowerCase();

  if (extension === '.md') {
    return {
      sourceFormat: 'cm0607_markdown_record_v1',
      rawSourcePath: resolvedPath,
      sourcePath: redactSensitiveFragments(resolvedPath),
      sourceFileName: path.basename(resolvedPath),
      record: parseWideningAdoptionRecordMarkdown(raw, { sourcePath: resolvedPath })
    };
  }

  return {
    sourceFormat: 'json_widening_adoption_record_v1',
    rawSourcePath: resolvedPath,
    sourcePath: redactSensitiveFragments(resolvedPath),
    sourceFileName: path.basename(resolvedPath),
    record: JSON.parse(raw)
  };
}

function validateWideningAdoptionRecord(record = {}) {
  const normalized = normalizeWideningAdoptionRecord(record);
  const failClosedReasons = [];

  if (!isPlainObject(record)) {
    failClosedReasons.push('malformed_widening_adoption_record');
  }
  if (normalized.schemaVersion !== EXPECTED_WIDENING_ADOPTION_RECORD_SCHEMA_VERSION) {
    failClosedReasons.push('widening_adoption_record_schema_version_mismatch');
  }
  if (!ALLOWED_WIDENING_ADOPTION_DECISIONS.includes(normalized.decision)) {
    failClosedReasons.push('unsupported_widening_adoption_decision');
  }
  if (!normalized.mapAuthority) {
    failClosedReasons.push('missing_widening_adoption_map_authority');
  }
  if (!normalized.controllingState) {
    failClosedReasons.push('missing_widening_adoption_controlling_state');
  }
  if (!normalized.sameBaselineEndpointStartupEvidenceDoc) {
    failClosedReasons.push('missing_widening_adoption_endpoint_evidence_doc');
  }
  if (!normalized.sameBaselineEndpointStartupEvidenceResult) {
    failClosedReasons.push('missing_widening_adoption_endpoint_evidence_result');
  }
  if (!normalized.sameBaselineTokenPresenceEvidenceDoc) {
    failClosedReasons.push('missing_widening_adoption_token_evidence_doc');
  }
  if (!normalized.sameBaselineTokenPresenceEvidenceResult) {
    failClosedReasons.push('missing_widening_adoption_token_evidence_result');
  }
  if (!ALLOWED_ROUTING_OUTCOME_VALUES.includes(normalized.cm0605RoutedOutcome)) {
    failClosedReasons.push('unsupported_widening_adoption_routing_outcome');
  }
  if (!normalized.resultingAllowance) {
    failClosedReasons.push('missing_widening_adoption_resulting_allowance');
  }

  const decisionGranted = normalized.decision === 'WIDENING_ADOPTION_GRANTED';
  if (decisionGranted && normalized.futureAutoAuthorizationWideningAdopted !== true) {
    failClosedReasons.push('widening_adoption_grant_decision_not_marked_adopted');
  }
  if (!decisionGranted && normalized.futureAutoAuthorizationWideningAdopted === true) {
    failClosedReasons.push('widening_adoption_denial_marked_as_adopted');
  }

  return {
    normalized,
    valid: failClosedReasons.length === 0,
    failClosedReasons
  };
}

function buildWideningAdoptionRecordInputTrace({
  loadResult = null,
  normalizedWideningAdoptionRecord = null
} = {}) {
  const sourcePath = normalizeString(
    loadResult?.sourcePath
      || normalizedWideningAdoptionRecord?._sourcePath
      || ''
  );
  const sourceFormat = normalizeString(
    loadResult?.sourceFormat
      || normalizedWideningAdoptionRecord?._sourceFormat
      || ''
  );
  const sourceFileName = normalizeString(loadResult?.sourceFileName || '')
    || (sourcePath ? path.basename(sourcePath) : '');
  const sourceWorkspaceRelativePath = buildWorkspaceRelativePath(
    loadResult?.rawSourcePath
      || normalizedWideningAdoptionRecord?._sourcePath
      || ''
  );

  return {
    traceAvailable: true,
    sourceFormat: sourceFormat || 'unknown_widening_adoption_record_source',
    sourcePath: sourcePath || '',
    sourceFileName: sourceFileName || '',
    sourceWorkspaceRelativePath,
    sourceArtifactRef: CM0607_WIDENING_ADOPTION_RECORD_TEMPLATE_REF,
    sourceMode: 'explicit_widening_adoption_record_input',
    decision: normalizeString(normalizedWideningAdoptionRecord?.decision || ''),
    resultingAllowance: normalizeString(normalizedWideningAdoptionRecord?.resultingAllowance || ''),
    futureAutoAuthorizationWideningAdopted:
      normalizedWideningAdoptionRecord?.futureAutoAuthorizationWideningAdopted === true,
    sameBaselineTokenPresenceEvidenceDoc: normalizeString(
      normalizedWideningAdoptionRecord?.sameBaselineTokenPresenceEvidenceDoc || ''
    ),
    sameBaselineTokenPresenceEvidenceResult: normalizeString(
      normalizedWideningAdoptionRecord?.sameBaselineTokenPresenceEvidenceResult || ''
    )
  };
}

function applyWideningAdoptionRecordToAdoptionInput(adoptionInput = {}, wideningAdoptionRecord = {}) {
  const validation = validateWideningAdoptionRecord(wideningAdoptionRecord);
  if (validation.valid !== true) {
    return {
      ok: false,
      failClosedReasons: validation.failClosedReasons,
      normalizedWideningAdoptionRecord: validation.normalized
    };
  }

  const record = validation.normalized;
  const endpointAccepted = record.sameBaselineEndpointStartupEvidenceResult.toLowerCase() === 'accepted';
  const tokenAccepted = record.sameBaselineTokenPresenceEvidenceResult.toLowerCase() === 'accepted';

  return {
    ok: true,
    mergedInput: {
      ...adoptionInput,
      sameBaselineEndpointStartupEvidenceAvailable: endpointAccepted,
      endpointStartupEvidenceId:
        record.sameBaselineEndpointStartupEvidenceDoc || adoptionInput.endpointStartupEvidenceId || '',
      sameBaselineTokenPresentEvidenceAvailable: tokenAccepted,
      tokenPresentEvidenceSameBaseline: tokenAccepted,
      latestTokenPresentEvidenceId:
        record.sameBaselineTokenPresenceEvidenceDoc || adoptionInput.latestTokenPresentEvidenceId || '',
      noBroadScanJsonlReadOrSecondWriteNeeded:
        record.writeUnitStillNarrowestNextProof === true
          ? true
          : adoptionInput.noBroadScanJsonlReadOrSecondWriteNeeded === true,
      writeUnitStillNarrowestNextProof: record.writeUnitStillNarrowestNextProof === true,
      scopeStillLimitedToCm0595: record.scopeStillLimitedToCm0595 === true,
      forbiddenActionsStillForbidden: record.forbiddenActionsStillForbidden === true,
      futureAutoAuthorizationWideningAdopted:
        record.futureAutoAuthorizationWideningAdopted === true
    },
    normalizedWideningAdoptionRecord: record
  };
}

module.exports = {
  ALLOWED_WIDENING_ADOPTION_DECISIONS,
  EXPECTED_WIDENING_ADOPTION_RECORD_SCHEMA_VERSION,
  applyWideningAdoptionRecordToAdoptionInput,
  buildWideningAdoptionRecordInputTrace,
  loadWideningAdoptionRecordFile,
  normalizeWideningAdoptionRecord,
  parseWideningAdoptionRecordMarkdown,
  validateWideningAdoptionRecord
};
