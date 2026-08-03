'use strict';

const crypto = require('node:crypto');

const LINEAGE_RECEIPT_SCHEMA_VERSION = 'tunnel_lineage_receipt_v2';
const C5_CONTRACT_ID = 'C5';
const FALLBACK_OBSERVED_AT = '1970-01-01T00:00:00.000Z';
const SAFE_SHA256_DIGEST_PATTERN = /^(?:sha256:)?[a-f0-9]{64}$/i;

const LINEAGE_EVIDENCE_FIELDS = Object.freeze([
  'platformOrganizationFingerprint',
  'chatGptWorkspaceFingerprint',
  'tunnelFingerprint',
  'runtimeKeyReferenceFingerprint',
  'tunnelClientProfileFingerprint',
  'localUdsEndpointFingerprint',
  'mcpProfileFingerprint',
  'serverToolManifestDigest',
  'chatGptAppScanCoverageDigest'
]);

const ALLOWED_EVIDENCE_MODES = new Set([
  'synthetic_fixture',
  'external_observation'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(item => canonicalize(item));
  if (!isPlainObject(value)) return value;

  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      result[key] = canonicalize(value[key]);
      return result;
    }, {});
}

function normalizeSha256Digest(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!SAFE_SHA256_DIGEST_PATTERN.test(normalized)) return null;
  const rawDigest = normalized.replace(/^sha256:/i, '').toLowerCase();
  return `sha256:${rawDigest}`;
}

function normalizeObservedAt(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeEvidenceMode(value) {
  return typeof value === 'string' && ALLOWED_EVIDENCE_MODES.has(value)
    ? value
    : null;
}

function stableUnique(values) {
  return [...new Set(values)];
}

function buildReceiptDigest(receipt = {}) {
  return `sha256:${crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalize(receipt)), 'utf8')
    .digest('hex')}`;
}

function normalizeLineageEvidence(evidence = {}) {
  const safeEvidence = isPlainObject(evidence) ? evidence : {};
  const digests = {};
  const missingFields = [];

  for (const field of LINEAGE_EVIDENCE_FIELDS) {
    const digest = normalizeSha256Digest(safeEvidence[field]);
    if (!digest) {
      missingFields.push(field);
      continue;
    }
    digests[field] = digest;
  }

  const unexpectedFields = Object.keys(safeEvidence)
    .filter(field => field !== 'tunnelAppBindingMatched' && !LINEAGE_EVIDENCE_FIELDS.includes(field))
    .sort();
  const tunnelAppBindingMatched = safeEvidence.tunnelAppBindingMatched === true;

  return {
    digests,
    missingFields,
    unexpectedFields,
    tunnelAppBindingMatched
  };
}

function buildTunnelLineageReceipt({
  evidence,
  evidenceMode = 'synthetic_fixture',
  observedAt
} = {}) {
  const normalizedEvidence = normalizeLineageEvidence(evidence);
  const normalizedEvidenceMode = normalizeEvidenceMode(evidenceMode);
  const normalizedObservedAt = normalizeObservedAt(observedAt);
  const failureCodes = [];

  if (
    !normalizedEvidenceMode ||
    !normalizedObservedAt ||
    normalizedEvidence.missingFields.length > 0 ||
    normalizedEvidence.unexpectedFields.length > 0
  ) {
    failureCodes.push('LINEAGE_UNVERIFIED');
  }
  if (!normalizedEvidence.tunnelAppBindingMatched) {
    failureCodes.push('LINEAGE_TUNNEL_APP_MISMATCH');
  }

  const blockers = [];
  if (!normalizedEvidenceMode) blockers.push('evidence_mode_invalid');
  if (!normalizedObservedAt) blockers.push('observed_at_invalid');
  if (normalizedEvidence.missingFields.length > 0) {
    blockers.push('required_lineage_fingerprints_missing');
  }
  if (normalizedEvidence.unexpectedFields.length > 0) {
    blockers.push('unexpected_lineage_evidence_fields');
  }
  if (!normalizedEvidence.tunnelAppBindingMatched) {
    blockers.push('tunnel_app_binding_not_matched');
  }

  const lineageVerified = blockers.length === 0;
  const evidenceRefs = Object.keys(normalizedEvidence.digests).sort();

  return {
    schemaVersion: LINEAGE_RECEIPT_SCHEMA_VERSION,
    contractId: C5_CONTRACT_ID,
    status: lineageVerified ? 'candidate' : 'blocked',
    observedAt: normalizedObservedAt || FALLBACK_OBSERVED_AT,
    evidenceMode: normalizedEvidenceMode || 'unknown',
    lowDisclosure: true,
    secretMaterialIncluded: false,
    rawIdentifiersIncluded: false,
    endpointOrLocatorIncluded: false,
    evidenceRefs: evidenceRefs.length > 0 ? evidenceRefs : ['lineage_evidence_missing'],
    evidenceDigests: normalizedEvidence.digests,
    tunnelAppBindingMatched: normalizedEvidence.tunnelAppBindingMatched,
    lineageVerified,
    liveEvidenceVerified: false,
    runtimeProbePerformed: false,
    closeoutEligible: false,
    readinessClaimed: false,
    failureCodes: stableUnique(failureCodes),
    blockers,
    missingEvidenceFields: normalizedEvidence.missingFields,
    unexpectedEvidenceFields: normalizedEvidence.unexpectedFields
  };
}

function isBoundedLineageReceipt(receipt = {}) {
  return isPlainObject(receipt) &&
    receipt.schemaVersion === LINEAGE_RECEIPT_SCHEMA_VERSION &&
    receipt.status === 'candidate' &&
    receipt.lowDisclosure === true &&
    receipt.secretMaterialIncluded === false &&
    receipt.rawIdentifiersIncluded === false &&
    receipt.endpointOrLocatorIncluded === false &&
    receipt.lineageVerified === true &&
    receipt.liveEvidenceVerified === false &&
    receipt.closeoutEligible === false &&
    receipt.readinessClaimed === false &&
    receipt.tunnelAppBindingMatched === true &&
    isPlainObject(receipt.evidenceDigests) &&
    LINEAGE_EVIDENCE_FIELDS.every(field =>
      normalizeSha256Digest(receipt.evidenceDigests[field]) === receipt.evidenceDigests[field]
    ) &&
    Array.isArray(receipt.evidenceRefs) &&
    receipt.evidenceRefs.length === LINEAGE_EVIDENCE_FIELDS.length &&
    Array.isArray(receipt.blockers) &&
    receipt.blockers.length === 0 &&
    Array.isArray(receipt.missingEvidenceFields) &&
    receipt.missingEvidenceFields.length === 0 &&
    Array.isArray(receipt.unexpectedEvidenceFields) &&
    receipt.unexpectedEvidenceFields.length === 0 &&
    Array.isArray(receipt.failureCodes) &&
    receipt.failureCodes.length === 0;
}

module.exports = {
  ALLOWED_EVIDENCE_MODES,
  C5_CONTRACT_ID,
  LINEAGE_EVIDENCE_FIELDS,
  LINEAGE_RECEIPT_SCHEMA_VERSION,
  SAFE_SHA256_DIGEST_PATTERN,
  buildReceiptDigest,
  buildTunnelLineageReceipt,
  isBoundedLineageReceipt,
  normalizeSha256Digest
};
