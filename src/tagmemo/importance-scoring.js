'use strict';

const INPUT_SCHEMA_VERSION = 'tagmemo-importance-scoring-input-v1';
const OUTPUT_SCHEMA_VERSION = 'tagmemo-importance-scoring-output-v1';
const SCORE_VERSION = 'deterministic_v1';

const ALLOWED_INPUT_KEYS = new Set([
  'schemaVersion',
  'memoryId',
  'boundedMemoryText',
  'metadataProjection',
  'tagProjection',
  'safeEvidenceHints'
]);

const ALLOWED_METADATA_KEYS = new Set(['title', 'summary', 'sourceKind']);
const ALLOWED_TAG_PROJECTION_KEYS = new Set(['tags']);
const ALLOWED_TAG_KEYS = new Set(['tagLabel', 'tagSource', 'confidenceScore']);
const ALLOWED_SOURCE_KINDS = new Set(['fixture', 'selected_projection', 'operator_reviewed']);
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

const SIGNAL_DEFINITIONS = Object.freeze([
  { id: 'explicit_user_instruction', pattern: /\b(explicit user instruction|explicit_user_instruction|user instruction|required|must|preserve)\b/i, weight: 0.24 },
  { id: 'decision', pattern: /\b(decision|decided|go[- ]?no[- ]?go)\b/i, weight: 0.12 },
  { id: 'route', pattern: /\b(route|routing|next safe route)\b/i, weight: 0.1 },
  { id: 'blocker', pattern: /\b(blocker|blocked|hard stop|stop condition)\b/i, weight: 0.1 },
  { id: 'proof', pattern: /\b(proof|validated|validation|evidence)\b/i, weight: 0.12 },
  { id: 'receipt', pattern: /\b(receipt|audit|ledger|checkpoint)\b/i, weight: 0.1 },
  { id: 'temporary_status_noise', pattern: /\b(temporary|scratch|draft|transient|noise)\b/i, weight: -0.08 }
]);

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSignal(value) {
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

function bandFor(score) {
  if (score < 0.35) return 'low';
  if (score < 0.75) return 'medium';
  return 'high';
}

function lowDisclosureResult(reason, memoryId) {
  const importanceScore = 0;
  const result = {
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    scoreVersion: SCORE_VERSION,
    importanceScore,
    importanceBand: bandFor(importanceScore),
    scoringSignals: [],
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

function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, reason: 'invalid_input' };
  if (hasForbiddenKey(input)) return { ok: false, reason: 'forbidden_raw_private_field' };
  for (const key of objectKeys(input)) {
    if (!ALLOWED_INPUT_KEYS.has(key)) return { ok: false, reason: 'unsupported_input_field' };
  }
  if (input.schemaVersion !== INPUT_SCHEMA_VERSION) return { ok: false, reason: 'invalid_schema_version' };
  if (!isBoundedId(input.memoryId, 'memory')) return { ok: false, reason: 'invalid_memory_id' };
  if (typeof input.boundedMemoryText !== 'string') return { ok: false, reason: 'invalid_bounded_memory_text' };

  const metadata = input.metadataProjection;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return { ok: false, reason: 'invalid_metadata_projection' };
  for (const key of objectKeys(metadata)) {
    if (!ALLOWED_METADATA_KEYS.has(key)) return { ok: false, reason: 'unsupported_metadata_field' };
  }
  if (typeof metadata.title !== 'string' || typeof metadata.summary !== 'string') {
    return { ok: false, reason: 'invalid_metadata_projection' };
  }
  if (!ALLOWED_SOURCE_KINDS.has(metadata.sourceKind)) return { ok: false, reason: 'unsupported_source_kind' };

  const tagValidation = validateTagProjection(input.tagProjection);
  if (!tagValidation.ok) return tagValidation;
  if (!Array.isArray(input.safeEvidenceHints) || input.safeEvidenceHints.some(hint => typeof hint !== 'string')) {
    return { ok: false, reason: 'invalid_safe_evidence_hints' };
  }
  if (hasUnsafeString(input)) return { ok: false, reason: 'forbidden_raw_private_value' };

  return { ok: true };
}

function collectSignalInputs(input) {
  const tags = input.tagProjection.tags.map(tag => tag.tagLabel);
  return [
    input.boundedMemoryText,
    input.metadataProjection.title,
    input.metadataProjection.summary,
    ...tags,
    ...input.safeEvidenceHints
  ].map(normalizeSignal).filter(Boolean);
}

function signalOccurrences(values) {
  const occurrences = new Map();
  for (const value of values) {
    for (const definition of SIGNAL_DEFINITIONS) {
      if (definition.pattern.test(value)) {
        occurrences.set(definition.id, (occurrences.get(definition.id) || 0) + 1);
      }
    }
  }
  return occurrences;
}

function scoreMemoryImportance(input) {
  const validation = validateInput(input);
  if (!validation.ok) return lowDisclosureResult(validation.reason, input?.memoryId);

  const signalInput = collectSignalInputs(input);
  if (signalInput.length === 0) return lowDisclosureResult('empty_input', input.memoryId);

  const occurrences = signalOccurrences(signalInput);
  if (occurrences.size === 0) return lowDisclosureResult('empty_input', input.memoryId);

  const scoringSignals = [];
  let score = 0.1;
  for (const definition of SIGNAL_DEFINITIONS) {
    if (occurrences.has(definition.id)) {
      scoringSignals.push(definition.id);
      score += definition.weight;
    }
  }
  if ([...occurrences.values()].some(count => count > 1)) {
    scoringSignals.push('duplicate_signal_merged');
    score += 0.06;
  }

  const importanceScore = clampScore(score);
  return {
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    scoreVersion: SCORE_VERSION,
    memoryId: input.memoryId,
    importanceScore,
    importanceBand: bandFor(importanceScore),
    scoringSignals,
    rejected: false,
    reason: null,
    lowDisclosure: true,
    mutated: false,
    providerCalls: 0,
    publicMcpExpansion: 0
  };
}

module.exports = {
  SCORE_VERSION,
  scoreMemoryImportance
};
