'use strict';

const INPUT_SCHEMA_VERSION = 'tagmemo-recall-ranking-input-v1';
const OUTPUT_SCHEMA_VERSION = 'tagmemo-recall-ranking-output-v1';
const RANK_VERSION = 'deterministic_v1';

const ALLOWED_INPUT_KEYS = new Set([
  'schemaVersion',
  'boundedQueryText',
  'candidates'
]);

const ALLOWED_CANDIDATE_KEYS = new Set([
  'memoryId',
  'boundedMemoryText',
  'tagProjection',
  'importanceScore',
  'safeRecency',
  'safeEvidenceHints'
]);

const ALLOWED_TAG_PROJECTION_KEYS = new Set(['tags']);
const ALLOWED_TAG_KEYS = new Set(['tagLabel', 'tagSource', 'confidenceScore']);
const ALLOWED_RECENCY_KEYS = new Set(['bucket', 'sequence']);
const ALLOWED_RECENCY_BUCKETS = new Set(['recent', 'stable', 'older']);
const ALLOWED_TAG_SOURCES = new Set([
  'explicit_record_tag',
  'operator_reviewed',
  'fixture_expected',
  'query_core_tag',
  'derived_candidate'
]);

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
  'clientSecret'
]);

const UNSAFE_VALUE_PATTERN = /(?:provider|api[ _-]?(?:key|endpoint)?|token|bearer|raw[ _-]?(?:scan|audit|text|content|body|memory)|jsonl|sqlite|vector|secret)/i;
const EVIDENCE_PATTERN = /\b(decision|proof|route|blocker)\b/i;

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeText(value) {
  return normalizeString(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function termsFor(value) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/i)
    .filter(term => term.length >= 2);
}

function isBoundedId(value, prefix) {
  return typeof value === 'string'
    && value.startsWith(`${prefix}:`)
    && /^[a-z]+:[a-z0-9:_-]+$/i.test(value)
    && !/[\\/]/.test(value)
    && !/^[A-Za-z]:[\\/]/.test(value);
}

function isUnsafeText(value) {
  return typeof value === 'string' && (
    /[\\/]/.test(value)
    || /^[A-Za-z]:/.test(value)
    || UNSAFE_VALUE_PATTERN.test(value)
  );
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
  if (typeof value === 'string') return isUnsafeText(value);
  if (Array.isArray(value)) return value.some(item => hasUnsafeString(item));
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).some(nested => hasUnsafeString(nested));
}

function clampScore(score) {
  return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}

function lowDisclosureResult(reason) {
  return {
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    rankVersion: RANK_VERSION,
    rankedCandidates: [],
    rejected: true,
    reason,
    lowDisclosure: true,
    mutated: false,
    providerCalls: 0,
    publicMcpExpansion: 0
  };
}

function validateTagProjection(tagProjection) {
  if (!tagProjection || typeof tagProjection !== 'object' || Array.isArray(tagProjection)) {
    return { ok: false, reason: 'invalid_tag_projection' };
  }
  for (const key of objectKeys(tagProjection)) {
    if (!ALLOWED_TAG_PROJECTION_KEYS.has(key)) return { ok: false, reason: 'unsupported_tag_projection_field' };
  }
  if (!Array.isArray(tagProjection.tags)) return { ok: false, reason: 'invalid_tag_projection' };

  for (const tag of tagProjection.tags) {
    if (!tag || typeof tag !== 'object' || Array.isArray(tag)) return { ok: false, reason: 'invalid_tag_projection' };
    for (const key of objectKeys(tag)) {
      if (!ALLOWED_TAG_KEYS.has(key)) return { ok: false, reason: 'unsupported_tag_field' };
    }
    if (typeof tag.tagLabel !== 'string' || !ALLOWED_TAG_SOURCES.has(tag.tagSource)) {
      return { ok: false, reason: 'invalid_tag_projection' };
    }
    if (!Number.isFinite(tag.confidenceScore) || tag.confidenceScore < 0 || tag.confidenceScore > 1) {
      return { ok: false, reason: 'invalid_tag_projection' };
    }
  }

  return { ok: true };
}

function validateCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { ok: false, reason: 'invalid_candidate' };
  }
  for (const key of objectKeys(candidate)) {
    if (!ALLOWED_CANDIDATE_KEYS.has(key)) return { ok: false, reason: 'unsupported_candidate_field' };
  }
  if (!isBoundedId(candidate.memoryId, 'memory')) return { ok: false, reason: 'invalid_memory_id' };
  if (typeof candidate.boundedMemoryText !== 'string') return { ok: false, reason: 'invalid_bounded_memory_text' };

  const tagValidation = validateTagProjection(candidate.tagProjection);
  if (!tagValidation.ok) return tagValidation;

  if (!Number.isFinite(candidate.importanceScore) || candidate.importanceScore < 0 || candidate.importanceScore > 1) {
    return { ok: false, reason: 'invalid_importance_score' };
  }

  const recency = candidate.safeRecency;
  if (!recency || typeof recency !== 'object' || Array.isArray(recency)) {
    return { ok: false, reason: 'invalid_safe_recency' };
  }
  for (const key of objectKeys(recency)) {
    if (!ALLOWED_RECENCY_KEYS.has(key)) return { ok: false, reason: 'unsupported_safe_recency_field' };
  }
  if (!ALLOWED_RECENCY_BUCKETS.has(recency.bucket) || !Number.isInteger(recency.sequence)) {
    return { ok: false, reason: 'invalid_safe_recency' };
  }

  if (!Array.isArray(candidate.safeEvidenceHints) || candidate.safeEvidenceHints.some(hint => typeof hint !== 'string')) {
    return { ok: false, reason: 'invalid_safe_evidence_hints' };
  }

  return { ok: true };
}

function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, reason: 'invalid_input' };
  if (hasForbiddenKey(input)) return { ok: false, reason: 'forbidden_raw_private_field' };
  for (const key of objectKeys(input)) {
    if (!ALLOWED_INPUT_KEYS.has(key)) return { ok: false, reason: 'unsupported_input_field' };
  }
  if (input.schemaVersion !== INPUT_SCHEMA_VERSION) return { ok: false, reason: 'invalid_schema_version' };
  if (typeof input.boundedQueryText !== 'string') return { ok: false, reason: 'invalid_bounded_query_text' };
  if (!Array.isArray(input.candidates)) return { ok: false, reason: 'invalid_candidates' };
  if (input.candidates.length === 0) return { ok: false, reason: 'empty_candidates' };

  for (const candidate of input.candidates) {
    const candidateValidation = validateCandidate(candidate);
    if (!candidateValidation.ok) return candidateValidation;
  }
  if (hasUnsafeString(input)) return { ok: false, reason: 'forbidden_raw_private_value' };

  return { ok: true };
}

function countTermMatches(terms, value) {
  const normalized = normalizeText(value);
  const matched = new Set();
  for (const term of terms) {
    if (normalized.includes(term)) matched.add(term);
  }
  return matched.size;
}

function tagMatchCount(terms, candidate) {
  let count = 0;
  for (const tag of candidate.tagProjection.tags) {
    count += countTermMatches(terms, tag.tagLabel);
  }
  return count;
}

function evidenceRelevance(candidate) {
  const values = [
    candidate.boundedMemoryText,
    ...candidate.tagProjection.tags.map(tag => tag.tagLabel),
    ...candidate.safeEvidenceHints
  ];
  return values.some(value => EVIDENCE_PATTERN.test(normalizeText(value)));
}

function recencyScore(recency) {
  const base = {
    recent: 0.12,
    stable: 0.06,
    older: 0.02
  }[recency.bucket] || 0;
  return base + Math.min(Math.max(recency.sequence, 0), 3) * 0.01;
}

function scoreCandidate(candidate, queryTerms) {
  const reasons = [];
  let score = 0;

  const tagMatches = tagMatchCount(queryTerms, candidate);
  if (tagMatches > 0) {
    score += 0.4 + Math.min(tagMatches * 0.06, 0.18);
    reasons.push('tag_match');
  }

  const queryMatches = countTermMatches(queryTerms, candidate.boundedMemoryText);
  if (queryMatches > 0) {
    score += Math.min(queryMatches * 0.08, 0.24);
    reasons.push('query_term_match');
  }

  if (evidenceRelevance(candidate)) {
    score += 0.12;
    reasons.push('evidence_relevance');
  }

  if (candidate.importanceScore > 0) {
    score += candidate.importanceScore * 0.18;
    reasons.push('importance_score');
  }

  const deterministicRecency = recencyScore(candidate.safeRecency);
  if (deterministicRecency > 0) {
    score += deterministicRecency;
    reasons.push('safe_recency');
  }

  return {
    memoryId: candidate.memoryId,
    rankScore: clampScore(score),
    rankReasons: reasons,
    lowDisclosure: true
  };
}

function rankTagMemoCandidates(input) {
  const validation = validateInput(input);
  if (!validation.ok) return lowDisclosureResult(validation.reason);

  const queryTerms = [...new Set(termsFor(input.boundedQueryText))];
  if (queryTerms.length === 0) return lowDisclosureResult('empty_query');

  const rankedCandidates = input.candidates
    .map(candidate => scoreCandidate(candidate, queryTerms))
    .sort((left, right) => {
      if (right.rankScore !== left.rankScore) return right.rankScore - left.rankScore;
      return left.memoryId.localeCompare(right.memoryId);
    });

  return {
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    rankVersion: RANK_VERSION,
    rankedCandidates,
    rejected: false,
    reason: null,
    lowDisclosure: true,
    mutated: false,
    providerCalls: 0,
    publicMcpExpansion: 0
  };
}

module.exports = {
  RANK_VERSION,
  rankTagMemoCandidates
};
