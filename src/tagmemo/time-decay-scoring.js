'use strict';

const INPUT_SCHEMA_VERSION = 'tagmemo-time-decay-scoring-input-v1';
const OUTPUT_SCHEMA_VERSION = 'tagmemo-time-decay-scoring-output-v1';
const DECAY_VERSION = 'deterministic_v1';

const ALLOWED_INPUT_KEYS = new Set([
  'schemaVersion',
  'memoryId',
  'safeRecency',
  'safeEvidenceHints'
]);

const ALLOWED_RECENCY_KEYS = new Set(['bucket', 'sequence']);
const ALLOWED_RECENCY_BUCKETS = new Set(['current', 'recent', 'stable', 'older', 'archival', 'unknown']);
const DURABLE_EVIDENCE_TERMS = new Set(['decision', 'proof', 'route', 'blocker', 'receipt']);
const TEMPORARY_TERMS = new Set(['temporary', 'scratch', 'draft', 'transient', 'noise']);

const FORBIDDEN_RAW_PRIVATE_KEYS = new Set([
  'rawText',
  'rawContent',
  'content',
  'rawBody',
  'transcript',
  'rawAudit',
  'rawJsonl',
  'sqliteRow',
  'vectorPayload',
  'candidateCachePayload',
  'sourceFile',
  'fullPath',
  'filePath',
  'relativePath',
  'provider',
  'apiKey',
  'token',
  'authorization',
  'bearer',
  'privateLifecycleState',
  'localPath',
  'providerEndpoint',
  'clientSecret',
  'rawTimestamp',
  'createdAt',
  'updatedAt'
]);

const UNSAFE_VALUE_PATTERN = /(?:provider|api[ _-]?(?:key|endpoint)?|token|bearer|raw[ _-]?(?:scan|audit|text|content|body|memory|timestamp)|jsonl|sqlite|vector|secret|[a-z]:[\\/]|[\\/])/i;

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeText(value) {
  return normalizeString(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function isBoundedId(value, prefix) {
  return typeof value === 'string'
    && value.startsWith(`${prefix}:`)
    && /^[a-z]+:[a-z0-9:_-]+$/i.test(value)
    && !/[\\/]/.test(value)
    && !/^[A-Za-z]:[\\/]/.test(value);
}

function objectKeys(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? Object.keys(value)
    : [];
}

function hasForbiddenKey(value) {
  if (Array.isArray(value)) return value.some(item => hasForbiddenKey(item));
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, nested]) => (
    FORBIDDEN_RAW_PRIVATE_KEYS.has(key) || hasForbiddenKey(nested)
  ));
}

function hasUnsafeString(value) {
  if (typeof value === 'string') return UNSAFE_VALUE_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(item => hasUnsafeString(item));
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).some(nested => hasUnsafeString(nested));
}

function clampScore(score) {
  return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}

function bandFor(score) {
  if (score >= 0.75) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

function lowDisclosureResult(reason, memoryId) {
  const timeDecayScore = 0;
  const result = {
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    decayVersion: DECAY_VERSION,
    timeDecayScore,
    timeDecayBand: bandFor(timeDecayScore),
    decayReasons: [],
    rejected: true,
    reason,
    lowDisclosure: true,
    mutated: false,
    providerCalls: 0,
    publicMcpExpansion: 0
  };
  if (isBoundedId(memoryId, 'memory')) result.memoryId = memoryId;
  return result;
}

function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, reason: 'invalid_input' };
  if (hasForbiddenKey(input)) return { ok: false, reason: 'forbidden_raw_private_field' };
  for (const key of objectKeys(input)) {
    if (!ALLOWED_INPUT_KEYS.has(key)) return { ok: false, reason: 'unsupported_input_field' };
  }
  if (input.schemaVersion !== INPUT_SCHEMA_VERSION) return { ok: false, reason: 'invalid_schema_version' };
  if (!isBoundedId(input.memoryId, 'memory')) return { ok: false, reason: 'invalid_memory_id' };

  const recency = input.safeRecency;
  if (!recency || typeof recency !== 'object' || Array.isArray(recency)) {
    return { ok: false, reason: 'invalid_safe_recency' };
  }
  for (const key of objectKeys(recency)) {
    if (!ALLOWED_RECENCY_KEYS.has(key)) return { ok: false, reason: 'unsupported_safe_recency_field' };
  }
  if (!ALLOWED_RECENCY_BUCKETS.has(recency.bucket) || !Number.isInteger(recency.sequence)) {
    return { ok: false, reason: 'invalid_safe_recency' };
  }
  if (!Array.isArray(input.safeEvidenceHints) || input.safeEvidenceHints.some(hint => typeof hint !== 'string')) {
    return { ok: false, reason: 'invalid_safe_evidence_hints' };
  }
  if (hasUnsafeString(input)) return { ok: false, reason: 'forbidden_raw_private_value' };
  return { ok: true };
}

function uniqueNormalizedHints(hints) {
  return [...new Set(hints.map(normalizeText).filter(Boolean))];
}

function scoreFromBucket(bucket) {
  return {
    current: 0.92,
    recent: 0.78,
    stable: 0.56,
    older: 0.32,
    archival: 0.18,
    unknown: 0.22
  }[bucket];
}

function scoreTimeDecay(input) {
  const validation = validateInput(input);
  if (!validation.ok) return lowDisclosureResult(validation.reason, input?.memoryId);

  const hints = uniqueNormalizedHints(input.safeEvidenceHints);
  if (input.safeRecency.bucket === 'unknown' && hints.length === 0) {
    return lowDisclosureResult('empty_input', input.memoryId);
  }

  const reasons = [`recency_bucket_${input.safeRecency.bucket}`];
  let score = scoreFromBucket(input.safeRecency.bucket);
  score += Math.min(Math.max(input.safeRecency.sequence, 0), 3) * 0.02;

  const durableCount = hints.filter(hint => DURABLE_EVIDENCE_TERMS.has(hint)).length;
  if (durableCount > 0) {
    score += Math.min(durableCount * 0.06, 0.18);
    reasons.push('durable_evidence_retention');
  }

  if (hints.some(hint => TEMPORARY_TERMS.has(hint))) {
    score -= 0.12;
    reasons.push('temporary_status_decay');
  }

  if (input.safeEvidenceHints.length !== hints.length) {
    score += 0.02;
    reasons.push('duplicate_signal_merged');
  }

  const timeDecayScore = clampScore(score);
  return {
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    decayVersion: DECAY_VERSION,
    memoryId: input.memoryId,
    timeDecayScore,
    timeDecayBand: bandFor(timeDecayScore),
    decayReasons: reasons,
    rejected: false,
    reason: null,
    lowDisclosure: true,
    mutated: false,
    providerCalls: 0,
    publicMcpExpansion: 0
  };
}

module.exports = {
  DECAY_VERSION,
  scoreTimeDecay
};
