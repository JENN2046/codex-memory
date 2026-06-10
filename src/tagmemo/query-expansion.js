'use strict';

const INPUT_SCHEMA_VERSION = 'tagmemo-query-expansion-input-v1';
const OUTPUT_SCHEMA_VERSION = 'tagmemo-query-expansion-output-v1';
const EXPANSION_VERSION = 'deterministic_v1';

const ALLOWED_INPUT_KEYS = new Set([
  'schemaVersion',
  'boundedQueryText',
  'recallIntent',
  'importanceBand',
  'tagProjection',
  'safeEvidenceHints'
]);

const ALLOWED_TAG_PROJECTION_KEYS = new Set(['tags']);
const ALLOWED_TAG_KEYS = new Set(['tagLabel', 'tagSource', 'confidenceScore']);
const ALLOWED_TAG_SOURCES = new Set([
  'explicit_record_tag',
  'operator_reviewed',
  'fixture_expected',
  'query_core_tag',
  'derived_candidate'
]);
const ALLOWED_IMPORTANCE_BANDS = new Set(['low', 'medium', 'high']);
const ALLOWED_RECALL_INTENTS = new Set(['decision_support', 'route_review', 'proof_lookup', 'general_recall']);

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
const EXPANSION_LIMIT = 6;

const EVIDENCE_SYNONYMS = Object.freeze({
  decision: ['decision record', 'chosen route'],
  route: ['route selection', 'routing decision'],
  proof: ['validation proof', 'evidence receipt'],
  blocker: ['blocker status', 'hard stop']
});

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeText(value) {
  return normalizeString(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function boundedPhrase(value) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/i)
    .filter(term => term.length >= 2)
    .slice(0, 6)
    .join(' ');
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
    expansionVersion: EXPANSION_VERSION,
    expandedQueries: [],
    expansionReasons: [],
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

function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, reason: 'invalid_input' };
  if (hasForbiddenKey(input)) return { ok: false, reason: 'forbidden_raw_private_field' };
  for (const key of objectKeys(input)) {
    if (!ALLOWED_INPUT_KEYS.has(key)) return { ok: false, reason: 'unsupported_input_field' };
  }
  if (input.schemaVersion !== INPUT_SCHEMA_VERSION) return { ok: false, reason: 'invalid_schema_version' };
  if (typeof input.boundedQueryText !== 'string') return { ok: false, reason: 'invalid_bounded_query_text' };
  if (!ALLOWED_RECALL_INTENTS.has(input.recallIntent)) return { ok: false, reason: 'unsupported_recall_intent' };
  if (!ALLOWED_IMPORTANCE_BANDS.has(input.importanceBand)) return { ok: false, reason: 'unsupported_importance_band' };

  const tagValidation = validateTagProjection(input.tagProjection);
  if (!tagValidation.ok) return tagValidation;
  if (!Array.isArray(input.safeEvidenceHints) || input.safeEvidenceHints.some(hint => typeof hint !== 'string')) {
    return { ok: false, reason: 'invalid_safe_evidence_hints' };
  }
  if (hasUnsafeString(input)) return { ok: false, reason: 'forbidden_raw_private_value' };

  return { ok: true };
}

function addExpansion(expansions, reasons, query, reason) {
  const normalized = boundedPhrase(query);
  if (!normalized) return;
  const duplicate = expansions.includes(normalized);
  if (!duplicate && expansions.length < EXPANSION_LIMIT) {
    expansions.push(normalized);
  }
  if (!reasons.includes(reason)) reasons.push(reason);
  if (duplicate && !reasons.includes('duplicate_expansion_merged')) {
    reasons.push('duplicate_expansion_merged');
  }
}

function expandTagMemoQuery(input) {
  const validation = validateInput(input);
  if (!validation.ok) return lowDisclosureResult(validation.reason);

  const original = boundedPhrase(input.boundedQueryText);
  if (!original) return lowDisclosureResult('empty_query');

  const expandedQueries = [];
  const expansionReasons = [];
  addExpansion(expandedQueries, expansionReasons, original, 'original_query');

  for (const tag of input.tagProjection.tags) {
    if (tag.confidenceScore < 0.6) continue;
    const tagPhrase = boundedPhrase(tag.tagLabel);
    if (tagPhrase && !original.includes(tagPhrase)) {
      addExpansion(expandedQueries, expansionReasons, `${original} ${tagPhrase}`, 'tag_derived');
    } else {
      addExpansion(expandedQueries, expansionReasons, tagPhrase || original, 'tag_derived');
    }
  }

  const matchedSignals = [];
  for (const hint of input.safeEvidenceHints.map(normalizeText)) {
    for (const signal of Object.keys(EVIDENCE_SYNONYMS)) {
      if (hint.includes(signal) && !matchedSignals.includes(signal)) matchedSignals.push(signal);
    }
  }
  for (let index = 0; index < 2; index += 1) {
    for (const signal of matchedSignals) {
      const variant = EVIDENCE_SYNONYMS[signal][index];
      if (variant) addExpansion(expandedQueries, expansionReasons, `${original} ${variant}`, 'evidence_derived');
    }
  }

  if (input.importanceBand === 'high') {
    addExpansion(expandedQueries, expansionReasons, `${original} priority evidence`, 'importance_derived');
  }

  return {
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    expansionVersion: EXPANSION_VERSION,
    expandedQueries,
    expansionReasons,
    rejected: false,
    reason: null,
    lowDisclosure: true,
    mutated: false,
    providerCalls: 0,
    publicMcpExpansion: 0
  };
}

module.exports = {
  EXPANSION_VERSION,
  expandTagMemoQuery
};
