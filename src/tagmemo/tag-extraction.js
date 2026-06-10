'use strict';

const { contentTokens, pickCoreTokens } = require('../recall/text');

const INPUT_SCHEMA_VERSION = 'tagmemo-deterministic-extraction-input-v1';
const OUTPUT_SCHEMA_VERSION = 'tagmemo-deterministic-extraction-output-v1';
const TAG_SCHEMA_VERSION = 'tagmemo-minimal-tag-v1';

const ALLOWED_INPUT_KEYS = new Set([
  'schemaVersion',
  'memoryId',
  'boundedMemoryText',
  'metadataProjection'
]);

const ALLOWED_METADATA_KEYS = new Set([
  'title',
  'summary',
  'explicitTags',
  'queryCoreTags',
  'sourceKind'
]);

const ALLOWED_SOURCE_KINDS = new Set([
  'fixture',
  'selected_projection',
  'explicit_record_tag',
  'query_core',
  'operator_reviewed'
]);

const ALLOWED_TAG_SOURCES = new Set([
  'explicit_record_tag',
  'query_core_tag',
  'derived_candidate',
  'fixture_expected',
  'operator_reviewed'
]);

const SOURCE_TRUST_ORDER = [
  'explicit_record_tag',
  'operator_reviewed',
  'fixture_expected',
  'query_core_tag',
  'derived_candidate'
];

const CONFIDENCE_BY_SOURCE = {
  explicit_record_tag: 0.95,
  operator_reviewed: 0.9,
  fixture_expected: 0.85,
  query_core_tag: 0.75,
  derived_candidate: 0.65
};

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
  'providerEndpoint'
]);

const UNSAFE_VALUE_PATTERN = /(?:provider|api[ _-]?(?:key|endpoint)?|token|bearer|raw[ _-]?(?:scan|audit|text|content|body|memory)|jsonl|sqlite|vector|lifecycle)/i;

function bucketFor(score) {
  if (score < 0.5) return 'low';
  if (score < 0.8) return 'medium';
  return 'high';
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

function normalizeTagLabel(value) {
  if (typeof value !== 'string') return null;
  const normalized = value
    .trim()
    .replace(/^[*+#.\-\s]+/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  if (!normalized || isUnsafeText(normalized)) return null;
  return normalized;
}

function slugFor(value) {
  return String(value || '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9:-]/gi, '')
    .toLowerCase();
}

function memoryFragment(memoryId) {
  return String(memoryId || '').replace(/^memory:/, '').replace(/:/g, '-');
}

function sourceFragment(tagSource) {
  return String(tagSource || '').replace(/_/g, '-');
}

function lowDisclosureResult(reason, memoryId) {
  const result = {
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    tags: [],
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

function objectKeys(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? Object.keys(value)
    : [];
}

function hasForbiddenKey(value) {
  if (Array.isArray(value)) {
    return value.some(item => hasForbiddenKey(item));
  }
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

function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, reason: 'invalid_input' };
  }

  if (hasForbiddenKey(input)) {
    return { ok: false, reason: 'forbidden_raw_private_field' };
  }

  for (const key of objectKeys(input)) {
    if (!ALLOWED_INPUT_KEYS.has(key)) {
      return { ok: false, reason: 'unsupported_input_field' };
    }
  }

  if (input.schemaVersion !== INPUT_SCHEMA_VERSION) {
    return { ok: false, reason: 'invalid_schema_version' };
  }
  if (!input.memoryId) {
    return { ok: false, reason: 'missing_memory_id' };
  }
  if (!isBoundedId(input.memoryId, 'memory')) {
    return { ok: false, reason: 'invalid_memory_id' };
  }
  if (typeof input.boundedMemoryText !== 'string') {
    return { ok: false, reason: 'invalid_bounded_memory_text' };
  }

  const metadata = input.metadataProjection;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return { ok: false, reason: 'invalid_metadata_projection' };
  }
  for (const key of objectKeys(metadata)) {
    if (!ALLOWED_METADATA_KEYS.has(key)) {
      return { ok: false, reason: 'unsupported_metadata_field' };
    }
  }
  if (!ALLOWED_SOURCE_KINDS.has(metadata.sourceKind)) {
    return { ok: false, reason: 'unsupported_source_kind' };
  }
  if (typeof metadata.title !== 'string' || typeof metadata.summary !== 'string') {
    return { ok: false, reason: 'invalid_metadata_projection' };
  }
  if (!Array.isArray(metadata.explicitTags) || !Array.isArray(metadata.queryCoreTags)) {
    return { ok: false, reason: 'invalid_metadata_projection' };
  }
  if (hasUnsafeString(input)) {
    return { ok: false, reason: 'forbidden_raw_private_value' };
  }

  return { ok: true };
}

function sourceTrustRank(tagSource) {
  const rank = SOURCE_TRUST_ORDER.indexOf(tagSource);
  return rank === -1 ? SOURCE_TRUST_ORDER.length : rank;
}

function buildCandidates(input, options = {}) {
  const metadata = input.metadataProjection;
  const candidates = [
    ...metadata.explicitTags.map(label => ({ label, tagSource: 'explicit_record_tag' })),
    ...metadata.queryCoreTags.map(label => ({ label, tagSource: 'query_core_tag' }))
  ];

  const maxDerivedTags = Number.isInteger(options.maxDerivedTags) ? options.maxDerivedTags : 6;
  const derivedTokens = pickCoreTokens(contentTokens([
    input.boundedMemoryText,
    metadata.title,
    metadata.summary
  ].join(' ')), maxDerivedTags);

  for (const token of derivedTokens) {
    candidates.push({ label: token, tagSource: 'derived_candidate' });
  }

  return candidates;
}

function mergeCandidates(candidates, memoryId) {
  const merged = new Map();
  for (const candidate of candidates) {
    const tagLabel = normalizeTagLabel(candidate.label);
    if (!tagLabel) {
      return { ok: false, reason: 'unsafe_candidate_label' };
    }
    if (!ALLOWED_TAG_SOURCES.has(candidate.tagSource) || isUnsafeText(candidate.tagSource)) {
      return { ok: false, reason: 'unsupported_tag_source' };
    }

    const next = {
      tagLabel,
      tagSource: candidate.tagSource,
      confidenceScore: CONFIDENCE_BY_SOURCE[candidate.tagSource]
    };
    const existing = merged.get(`${memoryId}:${tagLabel}`);
    if (!existing
      || sourceTrustRank(next.tagSource) < sourceTrustRank(existing.tagSource)
      || (next.tagSource === existing.tagSource && next.confidenceScore > existing.confidenceScore)) {
      merged.set(`${memoryId}:${tagLabel}`, next);
    }
  }

  return { ok: true, candidates: [...merged.values()] };
}

function buildTagRecord({ tagLabel, tagSource, confidenceScore }, memoryId) {
  const memorySafe = memoryFragment(memoryId);
  return {
    schemaVersion: TAG_SCHEMA_VERSION,
    tagId: `tag:${memorySafe}:${slugFor(tagLabel)}`,
    tagLabel,
    tagSource,
    confidenceScore,
    confidenceBucket: bucketFor(confidenceScore),
    evidenceSourceId: `evidence:${memorySafe}:${sourceFragment(tagSource)}`,
    memoryId,
    rankingCompatibility: {
      mayContributeToTagMemoScore: true,
      mayContributeToStructuralSignal: true,
      runtimeWeightTuningApproved: false
    }
  };
}

function extractDeterministicTags(input, options = {}) {
  const inputValidation = validateInput(input);
  if (!inputValidation.ok) {
    return lowDisclosureResult(inputValidation.reason, input?.memoryId);
  }

  const candidates = buildCandidates(input, options);
  const hasBoundedContent = Boolean(input.boundedMemoryText.trim()
    || input.metadataProjection.title.trim()
    || input.metadataProjection.summary.trim()
    || candidates.length);
  if (!hasBoundedContent) {
    return lowDisclosureResult('empty_input', input.memoryId);
  }

  const merged = mergeCandidates(candidates, input.memoryId);
  if (!merged.ok) {
    return lowDisclosureResult(merged.reason, input.memoryId);
  }

  const tags = merged.candidates
    .sort((left, right) => left.tagLabel.localeCompare(right.tagLabel)
      || left.tagSource.localeCompare(right.tagSource)
      || slugFor(left.tagLabel).localeCompare(slugFor(right.tagLabel)))
    .map(candidate => buildTagRecord(candidate, input.memoryId));

  return {
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    memoryId: input.memoryId,
    tags,
    rejected: false,
    lowDisclosure: true,
    mutated: false,
    providerCalls: 0,
    publicMcpExpansion: 0
  };
}

module.exports = {
  extractDeterministicTags,
  normalizeTagLabel
};
