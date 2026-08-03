'use strict';

const crypto = require('node:crypto');

const SCHEMA_VERSION = 'layered_source_truth_receipt_v1';
const ALLOWED_MEMORY_SOURCES = new Set(['vcp_native', 'local_fallback', 'none']);
const ALLOWED_FALLBACK = new Set(['not_used', 'used_labeled', 'blocked']);

function digest(value) {
  let serialized;
  try {
    serialized = JSON.stringify(canonicalize(value ?? null));
  } catch {
    serialized = 'unserializable_input';
  }
  return `sha256:${crypto.createHash('sha256')
    .update(serialized, 'utf8').digest('hex')}`;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = canonicalize(value[key]);
      return result;
    }, {});
  }
  return value;
}

function normalizeTime(value) {
  const parsed = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function buildLayeredSourceTruthReceipt({
  memoryIntelligenceSource,
  fallbackStatus,
  observedFrom,
  observedTo,
  subReceiptDigests = [],
  providerApiCalls = 0,
  externalNetworkCalls = 0
} = {}) {
  const from = normalizeTime(observedFrom);
  const to = normalizeTime(observedTo);
  const safeDigests = Array.isArray(subReceiptDigests)
    ? subReceiptDigests.filter(value => /^sha256:[a-f0-9]{64}$/.test(value))
    : [];
  const blockers = [];
  if (!ALLOWED_MEMORY_SOURCES.has(memoryIntelligenceSource)) blockers.push('memory_source_invalid');
  if (!ALLOWED_FALLBACK.has(fallbackStatus)) blockers.push('fallback_status_invalid');
  if (!from || !to || Date.parse(to) < Date.parse(from)) blockers.push('observation_window_invalid');
  if (safeDigests.length !== subReceiptDigests.length) blockers.push('sub_receipt_digest_invalid');
  if (providerApiCalls !== 0 || externalNetworkCalls !== 0) blockers.push('external_call_counter_nonzero');
  if (memoryIntelligenceSource === 'vcp_native' && fallbackStatus !== 'not_used') {
    blockers.push('native_fallback_contradiction');
  }
  if (memoryIntelligenceSource === 'local_fallback' && fallbackStatus !== 'used_labeled') {
    blockers.push('fallback_unlabeled');
  }

  const status = blockers.length === 0 ? 'candidate' : 'blocked';
  const provenance = {
    memoryIntelligenceSource: ALLOWED_MEMORY_SOURCES.has(memoryIntelligenceSource)
      ? memoryIntelligenceSource
      : 'none',
    governanceSource: 'codex_memory',
    packagingSource: 'codex_memory',
    transportSource: 'secure_mcp_tunnel',
    fallbackStatus: ALLOWED_FALLBACK.has(fallbackStatus) ? fallbackStatus : 'blocked',
    resultCanBeMistakenForVcpNative: false,
    consistency: {
      model: 'non_atomic_read_bundle',
      observedFrom: from || '1970-01-01T00:00:00.000Z',
      observedTo: to || '1970-01-01T00:00:00.000Z'
    }
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    contractId: 'C7',
    status,
    decision: status === 'candidate' ? 'layered_source_bound' : 'blocked',
    provenance,
    subReceiptCount: safeDigests.length,
    aggregateReceiptDigest: digest({ provenance, subReceiptDigests: safeDigests }),
    providerApiCalls,
    externalNetworkCalls,
    lowDisclosure: true,
    rawMemoryReturned: false,
    rawAuditReturned: false,
    rawIdentifiersReturned: false,
    blockers
  };
}

module.exports = {
  LAYERED_SOURCE_TRUTH_RECEIPT_SCHEMA_VERSION: SCHEMA_VERSION,
  buildLayeredSourceTruthReceipt,
  digestLayeredSourceTruthValue: digest
};
