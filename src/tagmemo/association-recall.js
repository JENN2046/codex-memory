'use strict';

const INPUT_SCHEMA_VERSION = 'tagmemo-association-recall-input-v1';
const OUTPUT_SCHEMA_VERSION = 'tagmemo-association-recall-output-v1';
const ASSOCIATION_VERSION = 'deterministic_v1';

const ALLOWED_INPUT_KEYS = new Set(['schemaVersion', 'seedMemoryId', 'seedProjection', 'candidates']);
const ALLOWED_SEED_KEYS = new Set(['tagProjection', 'queryExpansionHints', 'safeEvidenceHints']);
const ALLOWED_CANDIDATE_KEYS = new Set(['memoryId', 'tagProjection', 'queryExpansionHints', 'importanceScore', 'safeEvidenceHints']);
const ALLOWED_TAG_PROJECTION_KEYS = new Set(['tags']);
const ALLOWED_TAG_KEYS = new Set(['tagLabel', 'tagSource', 'confidenceScore']);
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
const EVIDENCE_TERMS = new Set(['decision', 'proof', 'route', 'blocker', 'receipt']);

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

function isUnsafeText(value) {
  return typeof value === 'string' && (
    /[\\/]/.test(value)
    || /^[A-Za-z]:/.test(value)
    || UNSAFE_VALUE_PATTERN.test(value)
  );
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

function lowDisclosureResult(reason) {
  return {
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    associationVersion: ASSOCIATION_VERSION,
    associatedCandidates: [],
    rejected: true,
    reason,
    lowDisclosure: true,
    mutated: false,
    providerCalls: 0,
    publicMcpExpansion: 0
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
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

function validateProjection(value, allowedKeys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, reason: 'invalid_projection' };
  for (const key of objectKeys(value)) {
    if (!allowedKeys.has(key)) return { ok: false, reason: 'unsupported_projection_field' };
  }
  const tagValidation = validateTagProjection(value.tagProjection);
  if (!tagValidation.ok) return tagValidation;
  if (!Array.isArray(value.queryExpansionHints) || value.queryExpansionHints.some(hint => typeof hint !== 'string')) {
    return { ok: false, reason: 'invalid_query_expansion_hints' };
  }
  if (!Array.isArray(value.safeEvidenceHints) || value.safeEvidenceHints.some(hint => typeof hint !== 'string')) {
    return { ok: false, reason: 'invalid_safe_evidence_hints' };
  }
  return { ok: true };
}

function validateCandidate(candidate) {
  const projection = validateProjection(candidate, ALLOWED_CANDIDATE_KEYS);
  if (!projection.ok) return projection;
  if (!isBoundedId(candidate.memoryId, 'memory')) return { ok: false, reason: 'invalid_memory_id' };
  if (!Number.isFinite(candidate.importanceScore) || candidate.importanceScore < 0 || candidate.importanceScore > 1) {
    return { ok: false, reason: 'invalid_importance_score' };
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
  if (!isBoundedId(input.seedMemoryId, 'memory')) return { ok: false, reason: 'invalid_seed_memory_id' };

  const seedValidation = validateProjection(input.seedProjection, ALLOWED_SEED_KEYS);
  if (!seedValidation.ok) return seedValidation;
  if (!Array.isArray(input.candidates)) return { ok: false, reason: 'invalid_candidates' };
  if (input.candidates.length === 0) return { ok: false, reason: 'empty_candidates' };
  for (const candidate of input.candidates) {
    const candidateValidation = validateCandidate(candidate);
    if (!candidateValidation.ok) return candidateValidation;
  }
  if (hasUnsafeString(input)) return { ok: false, reason: 'forbidden_raw_private_value' };
  return { ok: true };
}

function normalizedSet(values) {
  return new Set(values.map(normalizeText).filter(Boolean));
}

function tagSet(projection) {
  return normalizedSet(projection.tagProjection.tags.map(tag => tag.tagLabel));
}

function evidenceSet(projection) {
  return new Set(projection.safeEvidenceHints.map(normalizeText).filter(term => EVIDENCE_TERMS.has(term)));
}

function intersectionSize(left, right) {
  let count = 0;
  for (const value of left) {
    if (right.has(value)) count += 1;
  }
  return count;
}

function scoreCandidate(seedProjection, candidate) {
  const reasons = [];
  let score = 0;
  const sharedTags = intersectionSize(tagSet(seedProjection), tagSet(candidate));
  if (sharedTags > 0) {
    score += 0.42 + Math.min(sharedTags * 0.08, 0.18);
    reasons.push('shared_tag');
  }
  const queryOverlap = intersectionSize(
    normalizedSet(seedProjection.queryExpansionHints),
    normalizedSet(candidate.queryExpansionHints)
  );
  if (queryOverlap > 0) {
    score += Math.min(queryOverlap * 0.18, 0.28);
    reasons.push('query_expansion_overlap');
  }
  const evidenceOverlap = intersectionSize(evidenceSet(seedProjection), evidenceSet(candidate));
  if (evidenceOverlap > 0) {
    score += Math.min(evidenceOverlap * 0.08, 0.18);
    reasons.push('evidence_overlap');
  }
  if (candidate.importanceScore > 0) {
    score += candidate.importanceScore * 0.16;
    reasons.push('importance_score');
  }
  return {
    memoryId: candidate.memoryId,
    associationScore: clampScore(score),
    associationReasons: reasons,
    lowDisclosure: true
  };
}

function deriveTagMemoAssociations(input) {
  const validation = validateInput(input);
  if (!validation.ok) return lowDisclosureResult(validation.reason);

  const associatedCandidates = input.candidates
    .map(candidate => scoreCandidate(input.seedProjection, candidate))
    .sort((left, right) => {
      if (right.associationScore !== left.associationScore) return right.associationScore - left.associationScore;
      return left.memoryId.localeCompare(right.memoryId);
    });

  return {
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    associationVersion: ASSOCIATION_VERSION,
    seedMemoryId: input.seedMemoryId,
    associatedCandidates,
    rejected: false,
    reason: null,
    lowDisclosure: true,
    mutated: false,
    providerCalls: 0,
    publicMcpExpansion: 0
  };
}

module.exports = {
  ASSOCIATION_VERSION,
  deriveTagMemoAssociations
};
