'use strict';

const crypto = require('node:crypto');

const OUTPUT_SAFETY_RECEIPT_SCHEMA_VERSION = 'output_safety_receipt_v2';
const C6_CONTRACT_ID = 'C6';
const FALLBACK_OBSERVED_AT = '1970-01-01T00:00:00.000Z';
const MAX_CONTEXT_ITEMS = 6;
const MAX_STATEMENT_CHARS = 420;
const MAX_CONTEXT_BYTES = 12 * 1024;
const MAX_REASON_CODES = 6;
const MAX_SOURCE_KINDS = 5;

const STATEMENT_TYPES = new Set([
  'fact_candidate',
  'decision_candidate',
  'risk_candidate'
]);
const RELEVANCE_VALUES = new Set(['high', 'medium', 'low', 'unknown']);
const FRESHNESS_VALUES = new Set(['recent', 'established', 'stale_candidate', 'unknown']);
const ALLOWED_STATEMENT_FIELDS = new Set([
  'statement',
  'statementType',
  'relevance',
  'freshness',
  'reasonCodes',
  'sourceKinds',
  'advisoryOnly'
]);
const FORBIDDEN_FIELD_NAMES = new Set([
  'secret',
  'token',
  'apikey',
  'password',
  'credential',
  'authorization',
  'memoryid',
  'path',
  'endpoint',
  'url',
  'providerpayload',
  'rawmemory',
  'rawaudit',
  'rawcontent',
  'approval',
  'config'
]);
const FORBIDDEN_VALUE_PATTERNS = Object.freeze([
  /https?:\/\//i,
  /\bBearer\s+[A-Za-z0-9._-]{12,}/i,
  /sk-(?:proj-)?[A-Za-z0-9_-]{12,}/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /(?:[A-Za-z]:[\\/]|(?:^|[\s"'=])\/(?:home|Users|mnt|tmp|var)\/)/
]);
const SAFE_REASON_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,79}$/;
const SAFE_SOURCE_KIND_PATTERN = /^[a-z][a-z0-9_-]{0,79}$/;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeObservedAt(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function stableUnique(values) {
  return [...new Set(values)];
}

function normalizeFieldName(value) {
  return typeof value === 'string'
    ? value.replaceAll('_', '').replaceAll('-', '').toLowerCase()
    : '';
}

function safelySerialize(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function digestValue(value) {
  const serialized = safelySerialize(value);
  return `sha256:${crypto
    .createHash('sha256')
    .update(serialized === null ? 'unserializable_input' : serialized, 'utf8')
    .digest('hex')}`;
}

function hasForbiddenValueShape(value) {
  return typeof value === 'string' &&
    FORBIDDEN_VALUE_PATTERNS.some(pattern => pattern.test(value));
}

function hasForbiddenReceiptField(receipt) {
  return Object.keys(receipt).some(key =>
    FORBIDDEN_FIELD_NAMES.has(normalizeFieldName(key))
  );
}

function validStringList(value, maxItems, pattern) {
  return Array.isArray(value) &&
    value.length <= maxItems &&
    value.every(item => typeof item === 'string' && pattern.test(item));
}

function inspectStatements(statements, evidenceMode) {
  const violationCategories = [];
  const failureCodes = [];
  const safeStatements = Array.isArray(statements) ? statements : [];
  const serializedStatements = safelySerialize(safeStatements);
  const totalPayloadBytes = serializedStatements === null
    ? MAX_CONTEXT_BYTES + 1
    : Buffer.byteLength(serializedStatements, 'utf8');

  if (evidenceMode !== 'synthetic_fixture' || !Array.isArray(statements)) {
    violationCategories.push('schema');
    failureCodes.push('OUTPUT_SCHEMA_REJECTED');
  }
  if (safeStatements.length > MAX_CONTEXT_ITEMS) {
    violationCategories.push('budget');
    failureCodes.push('OUTPUT_BUDGET_EXCEEDED');
  }
  if (serializedStatements === null || totalPayloadBytes > MAX_CONTEXT_BYTES) {
    if (serializedStatements === null) {
      violationCategories.push('schema');
      failureCodes.push('OUTPUT_SCHEMA_REJECTED');
    } else {
      violationCategories.push('budget');
      failureCodes.push('OUTPUT_BUDGET_EXCEEDED');
    }
  }

  for (const statement of safeStatements) {
    if (!isPlainObject(statement)) {
      violationCategories.push('schema');
      failureCodes.push('OUTPUT_SCHEMA_REJECTED');
      continue;
    }

    for (const key of Object.keys(statement)) {
      const normalizedKey = normalizeFieldName(key);
      if (FORBIDDEN_FIELD_NAMES.has(normalizedKey)) {
        violationCategories.push('forbidden_field');
        failureCodes.push('OUTPUT_FORBIDDEN_FIELD_DETECTED', 'PRIVACY_RAW_IDENTIFIER_BLOCKED');
      } else if (!ALLOWED_STATEMENT_FIELDS.has(key)) {
        violationCategories.push('schema');
        failureCodes.push('OUTPUT_SCHEMA_REJECTED');
      }
    }

    if (typeof statement.statement !== 'string' || statement.statement.length === 0) {
      violationCategories.push('schema');
      failureCodes.push('OUTPUT_SCHEMA_REJECTED');
    } else {
      if (statement.statement.length > MAX_STATEMENT_CHARS) {
        violationCategories.push('budget');
        failureCodes.push('OUTPUT_BUDGET_EXCEEDED');
      }
      if (hasForbiddenValueShape(statement.statement)) {
        violationCategories.push('forbidden_value');
        failureCodes.push('OUTPUT_FORBIDDEN_FIELD_DETECTED', 'PRIVACY_RAW_IDENTIFIER_BLOCKED');
      }
    }
    if (!STATEMENT_TYPES.has(statement.statementType)) {
      violationCategories.push('schema');
      failureCodes.push('OUTPUT_SCHEMA_REJECTED');
    }
    if (!RELEVANCE_VALUES.has(statement.relevance)) {
      violationCategories.push('schema');
      failureCodes.push('OUTPUT_SCHEMA_REJECTED');
    }
    if (!FRESHNESS_VALUES.has(statement.freshness)) {
      violationCategories.push('schema');
      failureCodes.push('OUTPUT_SCHEMA_REJECTED');
    }
    if (!validStringList(statement.reasonCodes, MAX_REASON_CODES, SAFE_REASON_CODE_PATTERN)) {
      violationCategories.push('schema');
      failureCodes.push('OUTPUT_SCHEMA_REJECTED');
    }
    if (statement.sourceKinds !== undefined &&
        !validStringList(statement.sourceKinds, MAX_SOURCE_KINDS, SAFE_SOURCE_KIND_PATTERN)) {
      violationCategories.push('schema');
      failureCodes.push('OUTPUT_SCHEMA_REJECTED');
    }
    if (statement.advisoryOnly !== true) {
      violationCategories.push('schema');
      failureCodes.push('OUTPUT_SCHEMA_REJECTED');
    }
  }

  return {
    statementCount: safeStatements.length,
    totalPayloadBytes,
    maxStatementCharacters: safeStatements.reduce((maximum, statement) =>
      Math.max(maximum, typeof statement?.statement === 'string' ? statement.statement.length : 0), 0),
    violationCategories: stableUnique(violationCategories),
    failureCodes: stableUnique(failureCodes)
  };
}

function buildOutputSafetyReceipt({
  statements,
  evidenceMode = 'synthetic_fixture',
  observedAt
} = {}) {
  const normalizedObservedAt = normalizeObservedAt(observedAt);
  const inspection = inspectStatements(statements, evidenceMode);
  const failureCodes = [...inspection.failureCodes];
  const violationCategories = [...inspection.violationCategories];

  if (!normalizedObservedAt) {
    failureCodes.push('OUTPUT_SCHEMA_REJECTED');
    violationCategories.push('schema');
  }

  const normalizedFailureCodes = stableUnique(failureCodes);
  const normalizedViolationCategories = stableUnique(violationCategories);
  const status = normalizedFailureCodes.length === 0 ? 'candidate' : 'blocked';
  const safeStatements = Array.isArray(statements) ? statements : [];

  return {
    schemaVersion: OUTPUT_SAFETY_RECEIPT_SCHEMA_VERSION,
    contractId: C6_CONTRACT_ID,
    status,
    decision: status === 'candidate' ? 'bounded_candidate' : 'blocked',
    observedAt: normalizedObservedAt || FALLBACK_OBSERVED_AT,
    evidenceMode: evidenceMode === 'synthetic_fixture' ? evidenceMode : 'unknown',
    lowDisclosure: true,
    secretMaterialIncluded: false,
    rawMemoryReturned: false,
    rawAuditReturned: false,
    rawIdentifiersReturned: false,
    endpointOrLocatorReturned: false,
    evidenceRefs: ['synthetic_statement_digest', 'output_budget_policy'],
    statementDigest: digestValue(safeStatements),
    contentTrust: 'untrusted_memory_data',
    advisoryOnly: true,
    statementCount: inspection.statementCount,
    maxStatementCharacters: inspection.maxStatementCharacters,
    totalPayloadBytes: inspection.totalPayloadBytes,
    budgets: {
      maxContextItems: MAX_CONTEXT_ITEMS,
      maxStatementCharacters: MAX_STATEMENT_CHARS,
      maxContextBytes: MAX_CONTEXT_BYTES,
      maxReasonCodes: MAX_REASON_CODES,
      maxSourceKinds: MAX_SOURCE_KINDS
    },
    providerApiCalls: 0,
    externalNetworkCallsFromMemoryTool: 0,
    durableMemoryMutationCount: 0,
    operationalAuditWriteCount: 0,
    openWorldHint: false,
    liveEvidenceVerified: false,
    runtimeProbePerformed: false,
    closeoutEligible: false,
    realMemoryReadAllowed: false,
    dataBoundaryReceiptRequiredForRealMemory: true,
    dataBoundaryReceiptBound: false,
    violationCategories: normalizedViolationCategories,
    failureCodes: normalizedFailureCodes
  };
}

function isBoundedOutputSafetyReceipt(receipt = {}) {
  return isPlainObject(receipt) &&
    receipt.schemaVersion === OUTPUT_SAFETY_RECEIPT_SCHEMA_VERSION &&
    receipt.status === 'candidate' &&
    receipt.lowDisclosure === true &&
    receipt.secretMaterialIncluded === false &&
    receipt.rawMemoryReturned === false &&
    receipt.rawAuditReturned === false &&
    receipt.rawIdentifiersReturned === false &&
    receipt.endpointOrLocatorReturned === false &&
    receipt.contentTrust === 'untrusted_memory_data' &&
    receipt.advisoryOnly === true &&
    receipt.providerApiCalls === 0 &&
    receipt.externalNetworkCallsFromMemoryTool === 0 &&
    receipt.durableMemoryMutationCount === 0 &&
    receipt.operationalAuditWriteCount === 0 &&
    receipt.openWorldHint === false &&
    receipt.liveEvidenceVerified === false &&
    receipt.runtimeProbePerformed === false &&
    receipt.closeoutEligible === false &&
    receipt.realMemoryReadAllowed === false &&
    receipt.dataBoundaryReceiptRequiredForRealMemory === true &&
    receipt.dataBoundaryReceiptBound === false &&
    receipt.evidenceMode === 'synthetic_fixture' &&
    hasForbiddenReceiptField(receipt) === false &&
    Number.isInteger(receipt.statementCount) &&
    receipt.statementCount >= 0 &&
    receipt.statementCount <= MAX_CONTEXT_ITEMS &&
    Number.isInteger(receipt.maxStatementCharacters) &&
    receipt.maxStatementCharacters >= 0 &&
    receipt.maxStatementCharacters <= MAX_STATEMENT_CHARS &&
    Number.isInteger(receipt.totalPayloadBytes) &&
    receipt.totalPayloadBytes >= 0 &&
    receipt.totalPayloadBytes <= MAX_CONTEXT_BYTES &&
    Array.isArray(receipt.evidenceRefs) &&
    receipt.evidenceRefs.length > 0 &&
    Array.isArray(receipt.violationCategories) &&
    receipt.violationCategories.length === 0 &&
    typeof receipt.statementDigest === 'string' &&
    /^sha256:[a-f0-9]{64}$/.test(receipt.statementDigest) &&
    Array.isArray(receipt.failureCodes) &&
    receipt.failureCodes.length === 0;
}

module.exports = {
  C6_CONTRACT_ID,
  MAX_CONTEXT_BYTES,
  MAX_CONTEXT_ITEMS,
  MAX_STATEMENT_CHARS,
  OUTPUT_SAFETY_RECEIPT_SCHEMA_VERSION,
  buildOutputSafetyReceipt,
  inspectStatements,
  isBoundedOutputSafetyReceipt
};
